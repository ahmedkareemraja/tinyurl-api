jest.mock('shared', () => {
  class BaseError extends Error {
    statusCode: number;
    data: unknown;

    constructor(message = 'Something went wrong', statusCode = 400, data: unknown = {}) {
      super(message);
      this.statusCode = statusCode;
      this.data = data;
    }
  }

  return {
    BaseError,
    logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
    redisClient: {
      lPop: jest.fn(),
      lLen: jest.fn(),
    },
    JOB_NAMES: { MARK_KEY_USED: 'mark-key-used', GENERATE_KEYS: 'generate-keys' },
    QUEUE_NAMES: { KEY_EVENTS: 'key-events', KEY_GENERATION: 'key-generation' },
    REDIS_KEY_POOL_NAME: 'kgs:available-keys',
    KEY_POOL_LOW_WATERMARK: 100,
    KEY_GENERATION_BATCH_SIZE: 500,
  };
});

jest.mock('../../../repositories/urls');

jest.mock('../../../queue', () => ({
  __esModule: true,
  default: { publish: jest.fn(), close: jest.fn() },
}));

jest.mock('../../../gateway/kgs', () => ({
  __esModule: true,
  default: { getNextKey: jest.fn() },
}));

import { BaseError, redisClient, JOB_NAMES, QUEUE_NAMES, KEY_GENERATION_BATCH_SIZE } from 'shared';

import UrlsService from '..';
import KgsGateway from '../../../gateway/kgs';
import { type IUrl } from '../../../models/urls/urls.model';
import messagePublisher from '../../../queue';
import UrlsRepository from '../../../repositories/urls';

const mockedRedisClient = jest.mocked(redisClient);
const mockedRepository = jest.mocked(UrlsRepository);
const mockedKgsGateway = jest.mocked(KgsGateway);
const publishMessage = (messagePublisher as unknown as { publish: jest.Mock }).publish;

function fakeUrl(overrides: Partial<{ key: string; longUrl: string; userId?: string }> = {}) {
  const { key = 'abc1234', longUrl = 'https://example.com', userId } = overrides;
  return {
    _id: { toString: () => 'url-id-1' },
    key,
    longUrl,
    userId: userId ? { toString: () => userId } : undefined,
    isDeleted: false,
  } as unknown as IUrl;
}

describe('UrlsService.shortenUrl', () => {
  it('pops a key from the redis pool and persists the shortened url', async () => {
    mockedRedisClient.lPop.mockResolvedValue('abc1234');
    mockedRedisClient.lLen.mockResolvedValue(500);
    mockedRepository.createUrl.mockResolvedValue(fakeUrl({ key: 'abc1234' }));

    const result = await UrlsService.shortenUrl({ longUrl: 'https://example.com' }, 'user-1');

    expect(result.key).toBe('abc1234');
    expect(mockedRepository.createUrl).toHaveBeenCalledWith({
      key: 'abc1234',
      longUrl: 'https://example.com',
      userId: 'user-1',
    });
  });

  it('never fails outright when the pool is empty: it asks kgs directly for a key after requesting replenishment', async () => {
    mockedRedisClient.lPop.mockResolvedValue(null);
    mockedRedisClient.lLen.mockResolvedValue(500);
    mockedKgsGateway.getNextKey.mockResolvedValue('freshKey');
    mockedRepository.createUrl.mockResolvedValue(fakeUrl({ key: 'freshKey' }));

    const result = await UrlsService.shortenUrl({ longUrl: 'https://example.com' });

    expect(publishMessage).toHaveBeenCalledWith(
      QUEUE_NAMES.KEY_GENERATION,
      JOB_NAMES.GENERATE_KEYS,
      {
        count: KEY_GENERATION_BATCH_SIZE,
      },
    );
    expect(mockedKgsGateway.getNextKey).toHaveBeenCalled();
    expect(result.key).toBe('freshKey');
    expect(mockedRepository.createUrl).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'freshKey' }),
    );
  });

  it('propagates the error kgs raises when it cannot provide a key on demand', async () => {
    mockedRedisClient.lPop.mockResolvedValue(null);
    mockedKgsGateway.getNextKey.mockRejectedValue(
      new BaseError('No short keys available right now, please try again shortly', 503),
    );

    await expect(UrlsService.shortenUrl({ longUrl: 'https://example.com' })).rejects.toThrow(
      BaseError,
    );
    await expect(UrlsService.shortenUrl({ longUrl: 'https://example.com' })).rejects.toMatchObject({
      statusCode: 503,
    });

    expect(mockedRepository.createUrl).not.toHaveBeenCalled();
  });

  it('always emits a mark-key-used event after successfully shortening a url', async () => {
    mockedRedisClient.lPop.mockResolvedValue('abc1234');
    mockedRedisClient.lLen.mockResolvedValue(500);
    mockedRepository.createUrl.mockResolvedValue(fakeUrl({ key: 'abc1234', userId: 'user-1' }));

    await UrlsService.shortenUrl({ longUrl: 'https://example.com' }, 'user-1');

    expect(publishMessage).toHaveBeenCalledWith(QUEUE_NAMES.KEY_EVENTS, JOB_NAMES.MARK_KEY_USED, {
      key: 'abc1234',
      userId: 'user-1',
    });
  });

  it('emits a mark-key-used event with no userId for anonymous requests', async () => {
    mockedRedisClient.lPop.mockResolvedValue('abc1234');
    mockedRedisClient.lLen.mockResolvedValue(500);
    mockedRepository.createUrl.mockResolvedValue(fakeUrl({ key: 'abc1234' }));

    await UrlsService.shortenUrl({ longUrl: 'https://example.com' });

    expect(publishMessage).toHaveBeenCalledWith(QUEUE_NAMES.KEY_EVENTS, JOB_NAMES.MARK_KEY_USED, {
      key: 'abc1234',
      userId: undefined,
    });
  });

  it('requests more keys when the pool drops below the low watermark after use', async () => {
    mockedRedisClient.lPop.mockResolvedValue('abc1234');
    mockedRedisClient.lLen.mockResolvedValue(50);
    mockedRepository.createUrl.mockResolvedValue(fakeUrl({ key: 'abc1234' }));

    await UrlsService.shortenUrl({ longUrl: 'https://example.com' });

    expect(publishMessage).toHaveBeenCalledWith(
      QUEUE_NAMES.KEY_GENERATION,
      JOB_NAMES.GENERATE_KEYS,
      {
        count: KEY_GENERATION_BATCH_SIZE,
      },
    );
  });

  it('does not request more keys when the pool is comfortably stocked after use', async () => {
    mockedRedisClient.lPop.mockResolvedValue('abc1234');
    mockedRedisClient.lLen.mockResolvedValue(500);
    mockedRepository.createUrl.mockResolvedValue(fakeUrl({ key: 'abc1234' }));

    await UrlsService.shortenUrl({ longUrl: 'https://example.com' });

    expect(publishMessage).not.toHaveBeenCalledWith(
      QUEUE_NAMES.KEY_GENERATION,
      JOB_NAMES.GENERATE_KEYS,
      expect.anything(),
    );
  });
});

describe('UrlsService.getUrlsForUser', () => {
  it('returns only the urls belonging to the given user', async () => {
    mockedRepository.getUrlsByUser.mockResolvedValue([
      fakeUrl({ key: 'key1', userId: 'user-1' }),
      fakeUrl({ key: 'key2', userId: 'user-1' }),
    ]);

    const result = await UrlsService.getUrlsForUser('user-1');

    expect(mockedRepository.getUrlsByUser).toHaveBeenCalledWith('user-1');
    expect(result.map((u) => u.key)).toEqual(['key1', 'key2']);
    expect(result.every((u) => u.userId === 'user-1')).toBe(true);
  });
});

describe('UrlsService.resolveUrl', () => {
  it('throws a 404 when the key does not exist', async () => {
    mockedRepository.getUrlByKey.mockResolvedValue(null);

    await expect(UrlsService.resolveUrl('missing')).rejects.toThrow(BaseError);
    await expect(UrlsService.resolveUrl('missing')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns the url document when the key exists', async () => {
    mockedRepository.getUrlByKey.mockResolvedValue(fakeUrl({ key: 'abc1234' }));

    const result = await UrlsService.resolveUrl('abc1234');

    expect(result.key).toBe('abc1234');
  });
});

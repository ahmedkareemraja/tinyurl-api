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
    createBullMQConnection: jest.fn(),
  };
});

jest.mock('../../../repositories/urls');

jest.mock('../../../queue', () => ({
  keyEventsQueue: { add: jest.fn() },
  keyGenerationQueue: { add: jest.fn() },
}));

jest.mock('../../../redis/blockingClient', () => jest.fn());

import { BaseError, redisClient, JOB_NAMES, KEY_GENERATION_BATCH_SIZE } from 'shared';

import UrlsService from '..';
import { type IUrl } from '../../../models/urls/urls.model';
import { keyEventsQueue, keyGenerationQueue } from '../../../queue';
import getBlockingRedisClient from '../../../redis/blockingClient';
import UrlsRepository from '../../../repositories/urls';

const mockedRedisClient = jest.mocked(redisClient);
const mockedRepository = jest.mocked(UrlsRepository);
const mockedGetBlockingRedisClient = jest.mocked(getBlockingRedisClient);
const addKeyEventsJob = (keyEventsQueue as unknown as { add: jest.Mock }).add;
const addKeyGenerationJob = (keyGenerationQueue as unknown as { add: jest.Mock }).add;

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

  it('never fails outright when the pool is empty: it commands kgs to generate more keys', async () => {
    mockedRedisClient.lPop.mockResolvedValue(null);
    mockedRedisClient.lLen.mockResolvedValue(500);
    const blPop = jest.fn().mockResolvedValue({ key: 'kgs:available-keys', element: 'freshKey' });
    mockedGetBlockingRedisClient.mockResolvedValue({ blPop } as never);
    mockedRepository.createUrl.mockResolvedValue(fakeUrl({ key: 'freshKey' }));

    const result = await UrlsService.shortenUrl({ longUrl: 'https://example.com' });

    expect(addKeyGenerationJob).toHaveBeenCalledWith(JOB_NAMES.GENERATE_KEYS, {
      count: KEY_GENERATION_BATCH_SIZE,
    });
    expect(blPop).toHaveBeenCalledWith('kgs:available-keys', expect.any(Number));
    expect(result.key).toBe('freshKey');
    expect(mockedRepository.createUrl).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'freshKey' }),
    );
  });

  it('throws a 503 as a last resort if kgs cannot replenish the pool in time', async () => {
    mockedRedisClient.lPop.mockResolvedValue(null);
    const blPop = jest.fn().mockResolvedValue(null);
    mockedGetBlockingRedisClient.mockResolvedValue({ blPop } as never);

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

    expect(addKeyEventsJob).toHaveBeenCalledWith(JOB_NAMES.MARK_KEY_USED, {
      key: 'abc1234',
      userId: 'user-1',
    });
  });

  it('emits a mark-key-used event with no userId for anonymous requests', async () => {
    mockedRedisClient.lPop.mockResolvedValue('abc1234');
    mockedRedisClient.lLen.mockResolvedValue(500);
    mockedRepository.createUrl.mockResolvedValue(fakeUrl({ key: 'abc1234' }));

    await UrlsService.shortenUrl({ longUrl: 'https://example.com' });

    expect(addKeyEventsJob).toHaveBeenCalledWith(JOB_NAMES.MARK_KEY_USED, {
      key: 'abc1234',
      userId: undefined,
    });
  });

  it('requests more keys when the pool drops below the low watermark after use', async () => {
    mockedRedisClient.lPop.mockResolvedValue('abc1234');
    mockedRedisClient.lLen.mockResolvedValue(50);
    mockedRepository.createUrl.mockResolvedValue(fakeUrl({ key: 'abc1234' }));

    await UrlsService.shortenUrl({ longUrl: 'https://example.com' });

    expect(addKeyGenerationJob).toHaveBeenCalledWith(JOB_NAMES.GENERATE_KEYS, {
      count: KEY_GENERATION_BATCH_SIZE,
    });
  });

  it('does not request more keys when the pool is comfortably stocked after use', async () => {
    mockedRedisClient.lPop.mockResolvedValue('abc1234');
    mockedRedisClient.lLen.mockResolvedValue(500);
    mockedRepository.createUrl.mockResolvedValue(fakeUrl({ key: 'abc1234' }));

    await UrlsService.shortenUrl({ longUrl: 'https://example.com' });

    expect(addKeyGenerationJob).not.toHaveBeenCalled();
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

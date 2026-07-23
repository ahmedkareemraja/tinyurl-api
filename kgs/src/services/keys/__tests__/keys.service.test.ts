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
  };
});

jest.mock('../../../repositories/keys');
jest.mock('../../../utils/keys');

import KeysService from '..';
import KeysRepository from '../../../repositories/keys';
import KeysUtils from '../../../utils/keys';

const mockedRepository = jest.mocked(KeysRepository);
const mockedUtils = jest.mocked(KeysUtils);

describe('KeysService.generateAndStoreKeys', () => {
  it('requests exactly the requested count of unique candidate keys', async () => {
    let counter = 0;
    mockedUtils.generateRandomKey.mockImplementation(() => `key${counter++}`);
    mockedRepository.insertKeys.mockImplementation((keys) => Promise.resolve(keys));

    await KeysService.generateAndStoreKeys(5);

    const insertedCandidates = mockedRepository.insertKeys.mock.calls[0]?.[0] ?? [];
    expect(insertedCandidates).toHaveLength(5);
    expect(new Set(insertedCandidates).size).toBe(5);
  });

  it('deduplicates candidates when the generator produces a collision', async () => {
    // Simulate the generator returning the same value twice in a row before
    // producing something new - the service must still end up with `count`
    // distinct candidates rather than silently persisting a duplicate.
    const sequence = ['dup', 'dup', 'unique1', 'unique2'];
    let i = 0;
    mockedUtils.generateRandomKey.mockImplementation(() => sequence[i++] ?? `extra${i}`);
    mockedRepository.insertKeys.mockImplementation((keys) => Promise.resolve(keys));

    await KeysService.generateAndStoreKeys(3);

    const insertedCandidates = mockedRepository.insertKeys.mock.calls[0]?.[0] ?? [];
    expect(insertedCandidates).toHaveLength(3);
    expect(new Set(insertedCandidates).size).toBe(3);
  });

  it('only pushes the keys the repository actually persisted, never candidates the db already had', async () => {
    mockedUtils.generateRandomKey
      .mockReturnValueOnce('a')
      .mockReturnValueOnce('b')
      .mockReturnValueOnce('c');
    // The db already contained "b", so only "a" and "c" were newly inserted.
    mockedRepository.insertKeys.mockResolvedValue(['a', 'c']);

    await KeysService.generateAndStoreKeys(3);

    expect(mockedRepository.pushKeysToRedisPool).toHaveBeenCalledWith(['a', 'c']);
  });
});

describe('KeysService.generateSingleKey', () => {
  it('returns the first candidate that persists successfully', async () => {
    mockedUtils.generateRandomKey.mockReturnValueOnce('abc1234');
    mockedRepository.insertKeys.mockResolvedValueOnce(['abc1234']);

    const key = await KeysService.generateSingleKey();

    expect(key).toBe('abc1234');
    expect(mockedRepository.insertKeys).toHaveBeenCalledWith(['abc1234']);
  });

  it('retries with a new candidate when one collides with an existing key', async () => {
    mockedUtils.generateRandomKey.mockReturnValueOnce('dup').mockReturnValueOnce('unique1');
    mockedRepository.insertKeys.mockResolvedValueOnce([]).mockResolvedValueOnce(['unique1']);

    const key = await KeysService.generateSingleKey();

    expect(key).toBe('unique1');
    expect(mockedRepository.insertKeys).toHaveBeenCalledTimes(2);
  });

  it('gives up after repeated collisions rather than retrying forever', async () => {
    mockedUtils.generateRandomKey.mockReturnValue('dup');
    mockedRepository.insertKeys.mockResolvedValue([]);

    await expect(KeysService.generateSingleKey()).rejects.toMatchObject({ statusCode: 503 });
  });
});

describe('KeysService.markKeyUsed', () => {
  it('delegates to the repository so the key is never generated again', async () => {
    await KeysService.markKeyUsed('abc1234', 'user-1');

    expect(mockedRepository.markKeyUsed).toHaveBeenCalledWith('abc1234', 'user-1');
  });
});

describe('KeysService.ensurePoolIsStocked', () => {
  it('generates more keys when the redis pool has dropped below the threshold', async () => {
    mockedRepository.getRedisPoolSize.mockResolvedValue(50);
    const generateSpy = jest
      .spyOn(KeysService, 'generateAndStoreKeys')
      .mockResolvedValue(undefined);

    await KeysService.ensurePoolIsStocked(100, 500);

    expect(generateSpy).toHaveBeenCalledWith(500);
  });

  it('does nothing when the redis pool already meets the threshold', async () => {
    mockedRepository.getRedisPoolSize.mockResolvedValue(100);
    const generateSpy = jest
      .spyOn(KeysService, 'generateAndStoreKeys')
      .mockResolvedValue(undefined);

    await KeysService.ensurePoolIsStocked(100, 500);

    expect(generateSpy).not.toHaveBeenCalled();
  });
});

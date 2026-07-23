jest.mock('../../../models/keys/keys.model', () => ({
  __esModule: true,
  default: {
    insertMany: jest.fn(),
    updateOne: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock('shared', () => ({
  redisClient: {
    rPush: jest.fn(),
    lLen: jest.fn(),
  },
  REDIS_KEY_POOL_NAME: 'kgs:available-keys',
}));

import { redisClient } from 'shared';

import KeysRepository from '..';
import Key from '../../../models/keys/keys.model';

const mockedKey = jest.mocked(Key);
const mockedRedisClient = jest.mocked(redisClient);

describe('KeysRepository.insertKeys', () => {
  it('returns [] and never touches the database for empty input', async () => {
    const result = await KeysRepository.insertKeys([]);

    expect(result).toEqual([]);
    expect(mockedKey.insertMany).not.toHaveBeenCalled();
  });

  it('returns every key when all inserts succeed', async () => {
    mockedKey.insertMany.mockResolvedValue([{ key: 'a' }, { key: 'b' }] as never);

    const result = await KeysRepository.insertKeys(['a', 'b']);

    expect(result).toEqual(['a', 'b']);
    expect(mockedKey.insertMany).toHaveBeenCalledWith([{ key: 'a' }, { key: 'b' }], {
      ordered: false,
    });
  });

  it('keeps generated keys globally unique: only newly inserted keys are returned when some already existed', async () => {
    // Mongo throws a bulk write error on the duplicate unique-index hit, but
    // still reports which docs it managed to insert before/around the clash.
    mockedKey.insertMany.mockRejectedValue({
      insertedDocs: [{ key: 'a' }],
    });

    const result = await KeysRepository.insertKeys(['a', 'b']);

    expect(result).toEqual(['a']);
  });

  it('rethrows errors that are not a partial-insert duplicate-key failure', async () => {
    mockedKey.insertMany.mockRejectedValue(new Error('connection lost'));

    await expect(KeysRepository.insertKeys(['a'])).rejects.toThrow('connection lost');
  });
});

describe('KeysRepository.markKeyUsed', () => {
  it('permanently flags the key as used so it is never generated again', async () => {
    mockedKey.updateOne.mockResolvedValue({} as never);

    await KeysRepository.markKeyUsed('abc1234', 'user-1');

    expect(mockedKey.updateOne).toHaveBeenCalledWith(
      { key: 'abc1234' },
      { isUsed: true, usedBy: 'user-1', usedAt: expect.any(Date) as Date },
    );
  });

  it('still marks anonymously-used keys as used, just without an owner', async () => {
    mockedKey.updateOne.mockResolvedValue({} as never);

    await KeysRepository.markKeyUsed('abc1234', undefined);

    expect(mockedKey.updateOne).toHaveBeenCalledWith(
      { key: 'abc1234' },
      { isUsed: true, usedBy: undefined, usedAt: expect.any(Date) as Date },
    );
  });
});

describe('KeysRepository redis pool helpers', () => {
  it('pushes keys onto the shared redis pool', async () => {
    await KeysRepository.pushKeysToRedisPool(['a', 'b']);

    expect(mockedRedisClient.rPush).toHaveBeenCalledWith('kgs:available-keys', ['a', 'b']);
  });

  it('skips the redis call when there are no keys to push', async () => {
    await KeysRepository.pushKeysToRedisPool([]);

    expect(mockedRedisClient.rPush).not.toHaveBeenCalled();
  });

  it('reports the current redis pool size', async () => {
    mockedRedisClient.lLen.mockResolvedValue(42);

    const size = await KeysRepository.getRedisPoolSize();

    expect(size).toBe(42);
    expect(mockedRedisClient.lLen).toHaveBeenCalledWith('kgs:available-keys');
  });
});

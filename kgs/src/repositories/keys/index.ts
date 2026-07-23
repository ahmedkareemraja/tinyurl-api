import { redisClient, REDIS_KEY_POOL_NAME } from 'shared';

import Key, { type IKey } from '../../models/keys/keys.model';

interface BulkWriteErrorWithInsertedDocs {
  insertedDocs: IKey[];
}

function hasInsertedDocs(err: unknown): err is BulkWriteErrorWithInsertedDocs {
  return (
    typeof err === 'object' &&
    err !== null &&
    Array.isArray((err as { insertedDocs?: unknown }).insertedDocs)
  );
}

export default class KeysRepository {
  // Inserts the given keys, silently skipping any that already exist, and
  // returns only the keys that were newly persisted.
  static async insertKeys(keys: string[]): Promise<string[]> {
    if (keys.length === 0) return [];

    try {
      const inserted = await Key.insertMany(
        keys.map((key) => ({ key })),
        { ordered: false },
      );
      return inserted.map((doc) => doc.key);
    } catch (err) {
      if (hasInsertedDocs(err)) {
        return err.insertedDocs.map((doc) => doc.key);
      }
      throw err;
    }
  }

  static async markKeyUsed(key: string, userId?: string): Promise<void> {
    await Key.updateOne({ key }, { isUsed: true, usedBy: userId, usedAt: new Date() });
  }

  static async getKeysUsedByUser(userId: string): Promise<IKey[]> {
    return await Key.find({ usedBy: userId }).sort({ usedAt: -1 }).lean();
  }

  static async pushKeysToRedisPool(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await redisClient.rPush(REDIS_KEY_POOL_NAME, keys);
  }

  static async getRedisPoolSize(): Promise<number> {
    return await redisClient.lLen(REDIS_KEY_POOL_NAME);
  }
}

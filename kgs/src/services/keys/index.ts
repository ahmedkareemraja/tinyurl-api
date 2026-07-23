import { BaseError, logger } from 'shared';

import KeysRepository from '../../repositories/keys';
import KeysUtils from '../../utils/keys';

// How many fresh candidates to try before giving up on a single on-demand key.
const SINGLE_KEY_MAX_ATTEMPTS = 5;

export default class KeysService {
  // Generates `count` unique keys, persists them, and pushes the newly
  // persisted ones onto the shared redis pool for the api to consume.
  static async generateAndStoreKeys(count: number): Promise<void> {
    const candidates = new Set<string>();
    const maxAttempts = count * 5;
    let attempts = 0;

    while (candidates.size < count && attempts < maxAttempts) {
      candidates.add(KeysUtils.generateRandomKey());
      attempts++;
    }

    const insertedKeys = await KeysRepository.insertKeys(Array.from(candidates));
    await KeysRepository.pushKeysToRedisPool(insertedKeys);

    logger.info(`Generated and stored ${insertedKeys.length} new keys`);
  }

  // Generates and persists exactly one key on demand, for the api to hand
  // out immediately when its redis pool is empty. Unlike
  // generateAndStoreKeys, this never touches the redis pool - the caller
  // consumes the key right away instead of pulling it from the pool later.
  static async generateSingleKey(): Promise<string> {
    for (let attempt = 0; attempt < SINGLE_KEY_MAX_ATTEMPTS; attempt++) {
      const candidate = KeysUtils.generateRandomKey();
      const [insertedKey] = await KeysRepository.insertKeys([candidate]);
      if (insertedKey) return insertedKey;
    }

    throw new BaseError('Unable to generate a unique key, please try again', 503);
  }

  static async markKeyUsed(key: string, userId?: string): Promise<void> {
    await KeysRepository.markKeyUsed(key, userId);
  }

  static async ensurePoolIsStocked(threshold: number, batchSize: number): Promise<void> {
    const currentSize = await KeysRepository.getRedisPoolSize();
    if (currentSize < threshold) {
      await KeysService.generateAndStoreKeys(batchSize);
    }
  }
}

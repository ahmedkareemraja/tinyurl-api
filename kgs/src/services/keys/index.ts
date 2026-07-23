import { logger } from 'shared';

import KeysRepository from '../../repositories/keys';
import KeysUtils from '../../utils/keys';

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

import {
  QUEUE_NAMES,
  JOB_NAMES,
  KEY_GENERATION_BATCH_SIZE,
  createMessageConsumer,
  type MessageConsumer,
  type MarkKeyUsedJobData,
  type GenerateKeysJobData,
} from 'shared';

import KeysService from '../services/keys';

// Consumes "a key was used" events from the api and marks the key as
// permanently spent so it is never generated again.
export function startKeyEventsWorker(
  consumer: MessageConsumer = createMessageConsumer(),
): MessageConsumer {
  consumer.registerHandler<MarkKeyUsedJobData>(QUEUE_NAMES.KEY_EVENTS, async (jobName, data) => {
    if (jobName !== JOB_NAMES.MARK_KEY_USED) return;
    await KeysService.markKeyUsed(data.key, data.userId);
  });

  return consumer;
}

// Consumes "the redis pool is running low" events from the api and tops up
// the pool with freshly generated keys.
export function startKeyGenerationWorker(
  consumer: MessageConsumer = createMessageConsumer(),
): MessageConsumer {
  consumer.registerHandler<GenerateKeysJobData>(
    QUEUE_NAMES.KEY_GENERATION,
    async (jobName, data) => {
      if (jobName !== JOB_NAMES.GENERATE_KEYS) return;
      const count = data.count > 0 ? data.count : KEY_GENERATION_BATCH_SIZE;
      await KeysService.generateAndStoreKeys(count);
    },
  );

  return consumer;
}

import { Worker, type Job } from 'bullmq';
import {
  QUEUE_NAMES,
  JOB_NAMES,
  KEY_GENERATION_BATCH_SIZE,
  createBullMQConnection,
  logger,
  type MarkKeyUsedJobData,
  type GenerateKeysJobData,
} from 'shared';

import KeysService from '../services/keys';

// Consumes "a key was used" events from the api and marks the key as
// permanently spent so it is never generated again.
export function startKeyEventsWorker(): Worker<MarkKeyUsedJobData> {
  const worker = new Worker<MarkKeyUsedJobData>(
    QUEUE_NAMES.KEY_EVENTS,
    async (job: Job<MarkKeyUsedJobData>) => {
      if (job.name !== JOB_NAMES.MARK_KEY_USED) return;
      await KeysService.markKeyUsed(job.data.key, job.data.userId);
    },
    { connection: createBullMQConnection() },
  );

  worker.on('failed', (job, err) => {
    logger.error(`Failed to process key event job ${job?.id ?? ''}:`, err);
  });

  return worker;
}

// Consumes "the redis pool is running low" events from the api and tops up
// the pool with freshly generated keys.
export function startKeyGenerationWorker(): Worker<GenerateKeysJobData> {
  const worker = new Worker<GenerateKeysJobData>(
    QUEUE_NAMES.KEY_GENERATION,
    async (job: Job<GenerateKeysJobData>) => {
      if (job.name !== JOB_NAMES.GENERATE_KEYS) return;
      const count = job.data.count > 0 ? job.data.count : KEY_GENERATION_BATCH_SIZE;
      await KeysService.generateAndStoreKeys(count);
    },
    { connection: createBullMQConnection() },
  );

  worker.on('failed', (job, err) => {
    logger.error(`Failed to process key generation job ${job?.id ?? ''}:`, err);
  });

  return worker;
}

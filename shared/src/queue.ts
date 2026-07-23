import IORedis from 'ioredis';

export const QUEUE_NAMES = {
  KEY_EVENTS: 'key-events',
  KEY_GENERATION: 'key-generation',
} as const;

export const JOB_NAMES = {
  MARK_KEY_USED: 'mark-key-used',
  GENERATE_KEYS: 'generate-keys',
} as const;

export interface MarkKeyUsedJobData {
  key: string;
  userId?: string;
}

export interface GenerateKeysJobData {
  count: number;
}

// Name of the redis list kgs pre-generates unused keys into, and the api pops keys from.
export const REDIS_KEY_POOL_NAME = 'kgs:available-keys';

// If the redis key pool drops below this size, the api requests kgs to generate more.
export const KEY_POOL_LOW_WATERMARK = 100;

// How many keys kgs generates per generation request.
export const KEY_GENERATION_BATCH_SIZE = 500;

export function createBullMQConnection(): IORedis {
  return new IORedis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });
}

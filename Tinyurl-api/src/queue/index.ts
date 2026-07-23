import { Queue } from 'bullmq';
import { QUEUE_NAMES, createBullMQConnection } from 'shared';

export const keyEventsQueue = new Queue(QUEUE_NAMES.KEY_EVENTS, {
  connection: createBullMQConnection(),
});

export const keyGenerationQueue = new Queue(QUEUE_NAMES.KEY_GENERATION, {
  connection: createBullMQConnection(),
});

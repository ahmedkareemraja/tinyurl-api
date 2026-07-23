import { Worker, type Job } from 'bullmq';

import logger from '../logger';

import { createBrokerConnection } from './connection';
import { type MessageConsumer, type MessageHandler } from './types';

export class BullMQMessageConsumer implements MessageConsumer {
  private readonly workers: Worker[] = [];

  registerHandler<T>(queueName: string, handler: MessageHandler<T>): void {
    const worker = new Worker(
      queueName,
      async (job: Job) => {
        await handler(job.name, job.data as T);
      },
      { connection: createBrokerConnection() },
    );

    worker.on('failed', (job, err) => {
      logger.error(`Failed to process job ${job?.id ?? ''} on queue ${queueName}:`, err);
    });

    this.workers.push(worker);
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()));
  }
}

import { Queue } from 'bullmq';

import { createBrokerConnection } from './connection';
import { type MessagePublisher } from './types';

export class BullMQMessagePublisher implements MessagePublisher {
  private readonly queues = new Map<string, Queue>();

  private getQueue(queueName: string): Queue {
    let queue = this.queues.get(queueName);
    if (!queue) {
      queue = new Queue(queueName, { connection: createBrokerConnection() });
      this.queues.set(queueName, queue);
    }
    return queue;
  }

  async publish<T>(queueName: string, jobName: string, data: T): Promise<void> {
    await this.getQueue(queueName).add(jobName, data);
  }

  async close(): Promise<void> {
    await Promise.all(Array.from(this.queues.values()).map((queue) => queue.close()));
  }
}

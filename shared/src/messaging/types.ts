export type MessageHandler<T> = (jobName: string, data: T) => Promise<void>;

// Ports the rest of the codebase depends on. Swapping the underlying broker
// (BullMQ, RabbitMQ, ...) means writing one new adapter that implements these
// two interfaces - nothing outside shared/messaging should import a
// broker-specific type (Queue, Worker, Job, channel, exchange, ...).
export interface MessagePublisher {
  publish<T>(queueName: string, jobName: string, data: T): Promise<void>;
  close(): Promise<void>;
}

export interface MessageConsumer {
  registerHandler<T>(queueName: string, handler: MessageHandler<T>): void;
  close(): Promise<void>;
}

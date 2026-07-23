import { BullMQMessageConsumer } from './bullmqConsumer';
import { BullMQMessagePublisher } from './bullmqPublisher';
import { type MessageConsumer, type MessageHandler, type MessagePublisher } from './types';

// The only place in the codebase that knows which broker backs the
// MessagePublisher/MessageConsumer ports. Swapping BullMQ for another broker
// means adding a new adapter next to bullmqPublisher.ts/bullmqConsumer.ts and
// changing what these two factories construct - callers never change.
export function createMessagePublisher(): MessagePublisher {
  return new BullMQMessagePublisher();
}

export function createMessageConsumer(): MessageConsumer {
  return new BullMQMessageConsumer();
}

export type { MessagePublisher, MessageConsumer, MessageHandler };

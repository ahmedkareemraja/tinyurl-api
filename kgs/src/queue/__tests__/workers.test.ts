type Handler = (jobName: string, data: unknown) => Promise<void>;

const capturedHandlers: Record<string, Handler> = {};

const mockConsumer = {
  registerHandler: jest.fn((queueName: string, handler: Handler) => {
    capturedHandlers[queueName] = handler;
  }),
  close: jest.fn(),
};

jest.mock('shared', () => ({
  QUEUE_NAMES: { KEY_EVENTS: 'key-events', KEY_GENERATION: 'key-generation' },
  JOB_NAMES: { MARK_KEY_USED: 'mark-key-used', GENERATE_KEYS: 'generate-keys' },
  KEY_GENERATION_BATCH_SIZE: 500,
  createMessageConsumer: jest.fn(() => mockConsumer),
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../services/keys');

import KeysService from '../../services/keys';
import { startKeyEventsWorker, startKeyGenerationWorker } from '../workers';

const mockedKeysService = jest.mocked(KeysService);

describe('key-events worker', () => {
  it('marks the used key so it is never generated again', async () => {
    startKeyEventsWorker();

    await capturedHandlers['key-events']?.('mark-key-used', { key: 'abc1234', userId: 'user-1' });

    expect(mockedKeysService.markKeyUsed).toHaveBeenCalledWith('abc1234', 'user-1');
  });

  it('ignores jobs from any other job name on the same queue', async () => {
    startKeyEventsWorker();

    await capturedHandlers['key-events']?.('some-other-job', { key: 'abc1234' });

    expect(mockedKeysService.markKeyUsed).not.toHaveBeenCalled();
  });
});

describe('key-generation worker', () => {
  it('tops up the pool with the requested count when the api signals low stock', async () => {
    startKeyGenerationWorker();

    await capturedHandlers['key-generation']?.('generate-keys', { count: 250 });

    expect(mockedKeysService.generateAndStoreKeys).toHaveBeenCalledWith(250);
  });

  it('falls back to the default batch size when no usable count is provided', async () => {
    startKeyGenerationWorker();

    await capturedHandlers['key-generation']?.('generate-keys', { count: 0 });

    expect(mockedKeysService.generateAndStoreKeys).toHaveBeenCalledWith(500);
  });
});

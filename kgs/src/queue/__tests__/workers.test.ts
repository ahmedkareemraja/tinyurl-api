interface CapturedJob {
  name: string;
  data: unknown;
}

type Processor = (job: CapturedJob) => Promise<void>;

const capturedProcessors: Record<string, Processor> = {};

jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation((queueName: string, processor: Processor) => {
    capturedProcessors[queueName] = processor;
    return { on: jest.fn() };
  }),
}));

jest.mock('shared', () => ({
  QUEUE_NAMES: { KEY_EVENTS: 'key-events', KEY_GENERATION: 'key-generation' },
  JOB_NAMES: { MARK_KEY_USED: 'mark-key-used', GENERATE_KEYS: 'generate-keys' },
  KEY_GENERATION_BATCH_SIZE: 500,
  createBullMQConnection: jest.fn(),
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../services/keys');

import KeysService from '../../services/keys';
import { startKeyEventsWorker, startKeyGenerationWorker } from '../workers';

const mockedKeysService = jest.mocked(KeysService);

describe('key-events worker', () => {
  it('marks the used key so it is never generated again', async () => {
    startKeyEventsWorker();

    await capturedProcessors['key-events']?.({
      name: 'mark-key-used',
      data: { key: 'abc1234', userId: 'user-1' },
    });

    expect(mockedKeysService.markKeyUsed).toHaveBeenCalledWith('abc1234', 'user-1');
  });

  it('ignores jobs from any other job name on the same queue', async () => {
    startKeyEventsWorker();

    await capturedProcessors['key-events']?.({
      name: 'some-other-job',
      data: { key: 'abc1234' },
    });

    expect(mockedKeysService.markKeyUsed).not.toHaveBeenCalled();
  });
});

describe('key-generation worker', () => {
  it('tops up the pool with the requested count when the api signals low stock', async () => {
    startKeyGenerationWorker();

    await capturedProcessors['key-generation']?.({
      name: 'generate-keys',
      data: { count: 250 },
    });

    expect(mockedKeysService.generateAndStoreKeys).toHaveBeenCalledWith(250);
  });

  it('falls back to the default batch size when no usable count is provided', async () => {
    startKeyGenerationWorker();

    await capturedProcessors['key-generation']?.({
      name: 'generate-keys',
      data: { count: 0 },
    });

    expect(mockedKeysService.generateAndStoreKeys).toHaveBeenCalledWith(500);
  });
});

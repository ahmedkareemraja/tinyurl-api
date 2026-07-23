import IORedis from 'ioredis';

// Internal to the BullMQ adapters in this folder - nothing outside
// shared/messaging should depend on this connection directly.
export function createBrokerConnection(): IORedis {
  return new IORedis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });
}

import { redisClient, logger } from 'shared';

// BLPOP occupies the connection for the duration of the wait, so it must run
// on its own connection rather than the shared multi-purpose redis client.
const blockingRedisClient = redisClient.duplicate();

blockingRedisClient.on('error', (err: unknown) => {
  logger.error('Blocking redis client error:', err);
});

const connectionPromise = blockingRedisClient.connect().catch((err: unknown) => {
  logger.error('Error connecting blocking redis client:', err);
});

export default async function getBlockingRedisClient() {
  await connectionPromise;
  return blockingRedisClient;
}

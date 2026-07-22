import { createClient } from 'redis';

import logger from './logger';

const redisClient = createClient({
  url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
});

redisClient.on('error', (err: unknown) => {
  logger.error('Redis client error:', err);
});

redisClient.connect().catch((err: unknown) => {
  logger.error('Error connecting to Redis:', err);
});

export default redisClient;

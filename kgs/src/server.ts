import 'dotenv/config';

import express from 'express';
import mongoose from 'mongoose';
import { logger, KEY_POOL_LOW_WATERMARK, KEY_GENERATION_BATCH_SIZE } from 'shared';

import errorHandler from './middlewares/errorHandler';
import { startKeyEventsWorker, startKeyGenerationWorker } from './queue/workers';
import routes from './routes';
import KeysService from './services/keys';

const app = express();

const { PORT, DB_CONNECTION_STRING } = process.env;

if (!PORT) {
  throw new Error('Missing PORT environment variable');
}
if (!DB_CONNECTION_STRING) {
  throw new Error('Missing DB_CONNECTION_STRING environment variable');
}

app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: true });
});

routes(app);

app.use(errorHandler);

mongoose
  .connect(DB_CONNECTION_STRING)
  .then(async () => {
    logger.info('Connected to MongoDB');

    startKeyEventsWorker();
    startKeyGenerationWorker();

    await KeysService.ensurePoolIsStocked(KEY_POOL_LOW_WATERMARK, KEY_GENERATION_BATCH_SIZE);

    app.listen(PORT, () => {
      logger.info(`KGS running on port ${PORT}`);
    });
  })
  .catch((err: unknown) => {
    logger.error('Error connecting to MongoDB:', err);
  });

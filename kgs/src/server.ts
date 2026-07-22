import 'dotenv/config';

import express from 'express';
import { logger } from 'shared';

const app = express();

const { PORT } = process.env;

if (!PORT) {
  throw new Error('Missing PORT environment variable');
}

app.listen(PORT, () => {
  logger.info(`KGS running on port ${PORT}`);
});

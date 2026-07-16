import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';

import errorHandler from './middlewares/errorHandler';
import routes from './routes';
import logger from './utils/logger';

dotenv.config();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

routes(app);

app.use(errorHandler);

const { PORT, DB_CONNECTION_STRING } = process.env;

if (!DB_CONNECTION_STRING) {
  throw new Error('Missing DB_CONNECTION_STRING environment variable');
}
if (!PORT) {
  throw new Error('Missing PORT environment variable');
}

mongoose
  .connect(DB_CONNECTION_STRING)
  .then(() => {
    logger.info('Connected to MongoDB');
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error('Error connecting to MongoDB:', err);
  });

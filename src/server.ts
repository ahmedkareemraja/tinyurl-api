import 'dotenv/config';

import express from 'express';
import { rateLimit, MINUTE } from 'express-rate-limit';
import mongoose from 'mongoose';

import passport from './config/passport';
import errorHandler from './middlewares/errorHandler';
import routes from './routes';
import logger from './utils/logger';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

const limiter = rateLimit({
  windowMs: 1 * MINUTE, // SECOND, MINUTE, HOUR, and DAY constants are available, or a use bare number for milliseconds
  limit: 5, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
  // store: ... , // Redis, Memcached, etc. See below.
});

// Apply the rate limiting middleware to all requests.
app.use(limiter);

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

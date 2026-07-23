import { type Express, Router } from 'express';

import keysRouter from './keys/keys.routes';

export default (app: Express) => {
  const router = Router();

  router.use('/api/v1/keys', keysRouter);

  app.use(router);
};

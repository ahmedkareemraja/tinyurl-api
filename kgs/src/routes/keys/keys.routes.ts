import { Router } from 'express';

import KeysController from '../../controllers/keys';

const keysRouter = Router();

keysRouter.get('/next', KeysController.getNextKey);

export default keysRouter;

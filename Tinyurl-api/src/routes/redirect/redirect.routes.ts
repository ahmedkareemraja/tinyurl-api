import { Router } from 'express';

import UrlsController from '../../controllers/urls';

const redirectRouter = Router();

redirectRouter.get('/:key', UrlsController.redirect);

export default redirectRouter;

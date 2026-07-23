import { Router } from 'express';

import UrlsController from '../../controllers/urls';
import { optionalToken, requireToken } from '../../middlewares';

const urlsRouterv1 = Router();

urlsRouterv1.post('/', optionalToken, UrlsController.shorten);

urlsRouterv1.get('/', requireToken, UrlsController.getUserUrls);

export default urlsRouterv1;

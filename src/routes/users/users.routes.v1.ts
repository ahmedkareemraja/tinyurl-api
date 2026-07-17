import { Router } from 'express';

import UsersController from '../../controllers/users';
import { requireToken, validateUser } from '../../middlewares';

const usersRouterv1 = Router();

usersRouterv1.get('/:userId', requireToken, validateUser, UsersController.getUserById);

export default usersRouterv1;

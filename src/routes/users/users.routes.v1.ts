import { Router } from 'express';

import UsersController from '../../controllers/users';

const usersRouterv1 = Router();

usersRouterv1.get('/:userId', UsersController.getUserById);

export default usersRouterv1;

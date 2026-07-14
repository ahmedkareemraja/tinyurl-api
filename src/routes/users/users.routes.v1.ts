import { Router } from 'express';

import UsersController from '../../controllers/users';

const usersRouter = Router();

usersRouter.get('/', UsersController.addUser);

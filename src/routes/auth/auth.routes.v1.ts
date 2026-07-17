import { Router } from 'express';

import AuthController from '../../controllers/auth';

const authRouterV1 = Router();

authRouterV1.post('/register', AuthController.register);

authRouterV1.post(
  '/login',
  AuthController.validateLogin,
  AuthController.authenticateLocal,
  AuthController.login,
);

export default authRouterV1;

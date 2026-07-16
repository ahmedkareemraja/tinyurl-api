import { type NextFunction, type Request, type Response } from 'express';

import UsersService from '../../services/users';
import UsersUtils from '../../utils/users';

export default class AuthController {
  static async register(this: void, req: Request, res: Response, next: NextFunction) {
    try {
      const validatedBody = UsersUtils.validateCreateUser(req.body);
      await UsersService.createUser(validatedBody);
      res
        .status(200)
        .json({ status: true, message: 'User added successfully', data: validatedBody });
    } catch (err) {
      next(err);
    }
  }

  static async login(this: void, req: Request, res: Response, next: NextFunction) {
    try {
      const validatedBody = UsersUtils.validateLoginRequest(req.body);
      const user = await UsersService.loginUser(validatedBody);
      res.status(200).json({ status: true, message: 'Login successful', data: user });
    } catch (err) {
      next(err);
    }
  }
}

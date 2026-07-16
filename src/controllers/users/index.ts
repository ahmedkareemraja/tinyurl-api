import { type Request, type Response, type NextFunction } from 'express';

import UsersService from '../../services/users';

import UsersUtils from './utils';

class UsersController {
  static async addUser(this: void, req: Request, res: Response, next: NextFunction) {
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

  static async getUserById(this: void, req: Request, res: Response, next: NextFunction) {
    try {
      //
      const { userId } = req.params;
      const validatedUserId = UsersUtils.validateUserId(userId);
      const user = await UsersService.getUserById(validatedUserId);
      res.status(200).json({ status: true, message: 'User fetched successfully', data: user });
    } catch (err) {
      next(err);
    }
  }
}

export default UsersController;

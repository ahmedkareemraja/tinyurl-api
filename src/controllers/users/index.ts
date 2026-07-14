import { type Request, type Response, type NextFunction } from 'express';

class UsersController {
  static addUser(this: void, _req: Request, _res: Response, next: NextFunction) {
    try {
      // to do
    } catch (err) {
      next(err);
    }
  }
}

export default UsersController;

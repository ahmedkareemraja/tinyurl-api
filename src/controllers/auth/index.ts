import { type NextFunction, type Request, type RequestHandler, type Response } from 'express';

import passport from '../../config/passport';
import UsersService from '../../services/users';
import BaseError from '../../utils/BaseError';
import UsersUtils from '../../utils/users';

function isMessageInfo(info: unknown): info is { message: string } {
  return (
    typeof info === 'object' &&
    info !== null &&
    typeof (info as { message?: unknown }).message === 'string'
  );
}

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

  static validateLogin(this: void, req: Request, _res: Response, next: NextFunction) {
    try {
      req.body = UsersUtils.validateLoginRequest(req.body);
      next();
    } catch (err) {
      next(err);
    }
  }

  static authenticateLocal(this: void, req: Request, res: Response, next: NextFunction) {
    const authenticate = passport.authenticate(
      'local',
      { session: false },
      (err: unknown, user: Express.User | false, info: unknown) => {
        if (err) {
          next(err);
          return;
        }
        if (!user) {
          const message = isMessageInfo(info) ? info.message : 'Invalid credentials';
          next(new BaseError(message, 401));
          return;
        }
        req.user = user;
        next();
      },
    ) as RequestHandler;
    authenticate(req, res, next);
  }

  static login(this: void, req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new BaseError('Invalid credentials', 401);
      }
      const user = UsersService.issueTokens(req.user);
      res.status(200).json({ status: true, message: 'Login successful', data: user });
    } catch (err) {
      next(err);
    }
  }

  static authenticateGoogle(this: void, req: Request, res: Response, next: NextFunction) {
    const authenticate = passport.authenticate('google', {
      session: false,
      scope: ['profile', 'email'],
    }) as RequestHandler;
    authenticate(req, res, next);
  }

  static authenticateGoogleCallback(this: void, req: Request, res: Response, next: NextFunction) {
    const authenticate = passport.authenticate(
      'google',
      { session: false },
      (err: unknown, user: Express.User | false, info: unknown) => {
        if (err) {
          next(err);
          return;
        }
        if (!user) {
          const message = isMessageInfo(info) ? info.message : 'Google authentication failed';
          next(new BaseError(message, 401));
          return;
        }
        req.user = user;
        next();
      },
    ) as RequestHandler;
    authenticate(req, res, next);
  }
}

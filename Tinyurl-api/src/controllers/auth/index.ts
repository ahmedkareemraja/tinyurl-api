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
      return next(err);
    }
  }

  static validateLogin(this: void, req: Request, _res: Response, next: NextFunction) {
    try {
      req.body = UsersUtils.validateLoginRequest(req.body);
      next();
    } catch (err) {
      return next(err);
    }
  }

  static authenticateLocal(this: void, req: Request, res: Response, next: NextFunction) {
    try {
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
    } catch (err) {
      return next(err);
    }
  }

  static async login(this: void, req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new BaseError('Invalid credentials', 401);
      }
      const user = await UsersService.issueTokens(req.user);
      res.status(200).json({ status: true, message: 'Login successful', data: user });
    } catch (err) {
      return next(err);
    }
  }

  static async refreshToken(this: void, req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = UsersUtils.validateRefreshTokenRequest(req.body);
      const user = await UsersService.refreshTokens(refreshToken);
      res.status(200).json({ status: true, message: 'Token refreshed successfully', data: user });
    } catch (err) {
      return next(err);
    }
  }

  static async logout(this: void, req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new BaseError('User not authenticated', 401);
      }
      await UsersService.logout(req.user._id);
      res.status(200).json({ status: true, message: 'Logout successful' });
    } catch (err) {
      return next(err);
    }
  }

  static authenticateGoogle(this: void, req: Request, res: Response, next: NextFunction) {
    try {
      const authenticate = passport.authenticate('google', {
        session: false,
        scope: ['profile', 'email'],
      }) as RequestHandler;
      authenticate(req, res, next);
    } catch (err) {
      return next(err);
    }
  }

  static authenticateGoogleCallback(this: void, req: Request, res: Response, next: NextFunction) {
    try {
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
    } catch (err) {
      return next(err);
    }
  }
}

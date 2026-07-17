import { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';

import { type UserResponse } from '../controllers/users/dto/response';
import { type IUser } from '../models/users/users.model';
import UsersService from '../services/users';
import { type TokenPayload } from '../utils/encryption';

function verifyToken(token: string, secret: string): TokenPayload | null {
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === 'string') {
    return null;
  }
  return decoded as TokenPayload;
}

function toUserResponse(user: IUser): UserResponse {
  return {
    _id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    isDeleted: user.isDeleted,
  };
}

export async function requireToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  const secret = process.env['JWT_KEY'];
  if (!secret) {
    res.status(500).json({ error: 'JWT_KEY is not configured' });
    return;
  }

  try {
    const payload = verifyToken(token, secret);
    if (!payload) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }

    const user = await UsersService.getUserById(payload.userid);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    req.user = toUserResponse(user);
    next();
  } catch {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }
}

export async function optionalToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    next();
    return;
  }

  const secret = process.env['JWT_KEY'];
  if (!secret) {
    res.status(500).json({ error: 'JWT_KEY is not configured' });
    return;
  }

  try {
    const payload = verifyToken(token, secret);
    if (!payload) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }

    const user = await UsersService.getUserById(payload.userid);
    req.user = user ? toUserResponse(user) : undefined;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }
}

export function validateUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }
  if (req.user._id !== req.params['userId']) {
    res.status(403).json({ error: 'User not authorized' });
    return;
  }
  next();
}

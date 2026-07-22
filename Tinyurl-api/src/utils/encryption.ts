import crypto from 'crypto';

import jwt from 'jsonwebtoken';
import { BaseError, logger } from 'shared';

export interface TokenPayload {
  userid: string;
  email: string;
  fullName: string;
}

class Encryption {
  static generateRandomKey(bytes = 8): void {
    const array = new Uint8Array(bytes);
    crypto.getRandomValues(array);

    const key = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    logger.info(`Generated random key: ${key}`);
  }

  static generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  static generateHash(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  }

  static createHashedPassword(password: string): { salt: string; hash: string } {
    const salt = Encryption.generateSalt();
    const hash = Encryption.generateHash(password, salt);
    return { salt, hash };
  }

  static comparePasswords(password: string, salt: string, hash: string): boolean {
    const hashedPassword = Encryption.generateHash(password, salt);
    return hashedPassword === hash;
  }

  static generateToken(payload: TokenPayload): string {
    const secret = process.env['JWT_KEY'];
    if (!secret) {
      throw new BaseError('JWT_KEY is not configured', 500);
    }
    return jwt.sign(payload, secret, { expiresIn: '1h' });
  }

  static generateRefreshToken(payload: TokenPayload): string {
    const secret = process.env['REFRESH_TOKEN_KEY'];
    if (!secret) {
      throw new BaseError('REFRESH_TOKEN_KEY is not configured', 500);
    }
    return jwt.sign(payload, secret, { expiresIn: '7d' });
  }

  static verifyRefreshToken(token: string): TokenPayload {
    const secret = process.env['REFRESH_TOKEN_KEY'];
    if (!secret) {
      throw new BaseError('REFRESH_TOKEN_KEY is not configured', 500);
    }
    try {
      const decoded = jwt.verify(token, secret);
      if (typeof decoded === 'string') {
        throw new BaseError('Invalid refresh token', 401);
      }
      return decoded as TokenPayload;
    } catch {
      throw new BaseError('Invalid or expired refresh token', 401);
    }
  }
}

export default Encryption;

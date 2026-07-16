import crypto from 'crypto';

import jwt from 'jsonwebtoken';

import BaseError from './BaseError';
import logger from './logger';

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

  static generateToken(payload: object): string {
    const secret = process.env['JWT_KEY'];
    if (!secret) {
      throw new BaseError('JWT_KEY is not configured', 500);
    }
    return jwt.sign(payload, secret, { expiresIn: '1h' });
  }

  static generateRefreshToken(payload: object): string {
    const secret = process.env['REFRESH_TOKEN_KEY'];
    if (!secret) {
      throw new BaseError('REFRESH_TOKEN_KEY is not configured', 500);
    }
    return jwt.sign(payload, secret, { expiresIn: '7d' });
  }
}

export default Encryption;

import crypto from 'crypto';

class Encryption {
  static generateRandomKey(bytes = 8): string {
    const array = new Uint8Array(bytes);
    crypto.getRandomValues(array);

    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
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
}

export default Encryption;

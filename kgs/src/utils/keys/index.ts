import crypto from 'crypto';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const KEY_LENGTH = 7;

class KeysUtils {
  static generateRandomKey(length: number = KEY_LENGTH): string {
    const bytes = crypto.randomBytes(length);
    let key = '';
    for (let i = 0; i < length; i++) {
      const byte = bytes[i] ?? 0;
      const char = ALPHABET[byte % ALPHABET.length] ?? '0';
      key += char;
    }
    return key;
  }
}

export default KeysUtils;

import { scryptSync, randomBytes } from 'crypto';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, hashed: string): boolean {
  const [salt, key] = hashed.split(':');
  const derivedKey = scryptSync(password, salt, 64);
  return derivedKey.toString('hex') === key;
}

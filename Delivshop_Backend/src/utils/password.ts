import bcrypt from 'bcryptjs';
import { ENV } from '../config/env.js';

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(ENV.BCRYPT_ROUNDS);
  return bcrypt.hash(plainText, salt);
}

export async function comparePassword(plainText: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plainText, hashed);
}

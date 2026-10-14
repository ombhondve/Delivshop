import { hash, verify, Algorithm } from '@node-rs/argon2';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Production Argon2id options conforming to OWASP recommendations:
 * - memoryCost: 19456 KiB (19 MiB)
 * - timeCost: 2 iterations
 * - parallelism: 1 lane
 * - algorithm: Argon2id
 */
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
  algorithm: Algorithm.Argon2id,
};

/**
 * Hash a plain password using Argon2id.
 */
export async function hashPassword(plainText: string): Promise<string> {
  return hash(plainText, ARGON2_OPTIONS);
}

/**
 * Verify a plain password against an Argon2id (or legacy bcrypt) hash.
 */
export async function comparePassword(plainText: string, hashed: string): Promise<boolean> {
  if (!hashed || !plainText) return false;

  // Check if hash is Argon2 format ($argon2id$ or $argon2i$)
  if (hashed.startsWith('$argon2')) {
    try {
      return await verify(hashed, plainText);
    } catch {
      return false;
    }
  }

  // Fallback for existing bcrypt hashes
  if (hashed.startsWith('$2a$') || hashed.startsWith('$2b$')) {
    try {
      return await bcrypt.compare(plainText, hashed);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Generate a cryptographically random, secure temporary password.
 * Format: 12-character high-entropy string containing uppercase, lowercase, digits, and safe special characters.
 */
export function generateTemporaryPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%^&*';
  const all = upper + lower + digits + special;

  // Ensure at least one character from each set
  let password = [
    upper[crypto.randomInt(upper.length)],
    lower[crypto.randomInt(lower.length)],
    digits[crypto.randomInt(digits.length)],
    special[crypto.randomInt(special.length)],
  ];

  for (let i = 4; i < 12; i++) {
    password.push(all[crypto.randomInt(all.length)]);
  }

  // Shuffle securely
  for (let i = password.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join('');
}

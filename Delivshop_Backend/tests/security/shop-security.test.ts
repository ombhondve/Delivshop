import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import {
  hashPassword,
  comparePassword,
  generateTemporaryPassword,
} from '../../src/utils/password.js';

describe('Shop Security, Passwords & Credentials', () => {
  it('should generate high-entropy temporary passwords meeting security policy', () => {
    const passwords = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const pwd = generateTemporaryPassword();
      expect(pwd.length).toBe(12);
      expect(/[A-Z]/.test(pwd)).toBe(true);
      expect(/[a-z]/.test(pwd)).toBe(true);
      expect(/[0-9]/.test(pwd)).toBe(true);
      expect(/[!@#$%^&*]/.test(pwd)).toBe(true);
      passwords.add(pwd);
    }
    // Ensure all 50 generated passwords are completely unique
    expect(passwords.size).toBe(50);
  });

  it('should hash passwords with Argon2id and verify correctly', async () => {
    const raw = generateTemporaryPassword();
    const hashed = await hashPassword(raw);

    // Verify format is Argon2id
    expect(hashed.startsWith('$argon2id$')).toBe(true);

    const matches = await comparePassword(raw, hashed);
    expect(matches).toBe(true);

    const fails = await comparePassword('IncorrectPassword123!', hashed);
    expect(fails).toBe(false);
  });

  it('should maintain backward compatibility with bcrypt password hashes', async () => {
    const salt = await bcrypt.genSalt(10);
    const bcryptHash = await bcrypt.hash('legacyPassword123!', salt);

    const isValid = await comparePassword('legacyPassword123!', bcryptHash);
    expect(isValid).toBe(true);

    const isInvalid = await comparePassword('wrongpass', bcryptHash);
    expect(isInvalid).toBe(false);
  });
});

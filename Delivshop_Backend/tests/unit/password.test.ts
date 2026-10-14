import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '../../src/utils/password.js';

describe('Password Utility', () => {
  it('should hash a plain password and verify correctly', async () => {
    const raw = 'StrongSecretPass123!';
    const hashed = await hashPassword(raw);

    expect(hashed).not.toBe(raw);
    expect(hashed.length).toBeGreaterThan(20);

    const isMatch = await comparePassword(raw, hashed);
    expect(isMatch).toBe(true);

    const isMismatch = await comparePassword('WrongPassword999', hashed);
    expect(isMismatch).toBe(false);
  });
});

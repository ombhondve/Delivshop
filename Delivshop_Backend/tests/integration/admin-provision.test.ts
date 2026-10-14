import { describe, it, expect, vi, beforeEach } from 'vitest';
import { provisionAdmin, validatePasswordStrength } from '../../src/database/provision-admin.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { authService } from '../../src/services/auth.service.js';
import { auditService } from '../../src/services/audit.service.js';

describe('Production Admin Account Provisioning', () => {
  let fakeDatabase: Map<string, any>;

  beforeEach(() => {
    fakeDatabase = new Map();

    vi.spyOn(userRepository, 'findByEmail').mockImplementation(async (email: string) => {
      return fakeDatabase.get(email.toLowerCase().trim()) || null;
    });

    vi.spyOn(userRepository, 'create').mockImplementation(async (data: any) => {
      const record = {
        id: 'mock-admin-uuid-provis',
        email: data.email.toLowerCase().trim(),
        password_hash: data.passwordHash,
        name: data.name,
        role: data.role,
        phone: data.phone || null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      fakeDatabase.set(record.email, record);
      return record;
    });

    vi.spyOn(auditService, 'log').mockResolvedValue();
  });

  describe('Password Strength Verification', () => {
    it('should reject passwords shorter than 10 characters', () => {
      const res = validatePasswordStrength('Ab1!short');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('at least 10 characters');
    });

    it('should reject passwords missing uppercase letters', () => {
      const res = validatePasswordStrength('alllowercase1!');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('uppercase letter');
    });

    it('should reject passwords missing lowercase letters', () => {
      const res = validatePasswordStrength('ALLLUPPERCASE1!');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('lowercase letter');
    });

    it('should reject passwords missing digits', () => {
      const res = validatePasswordStrength('AllLettersNoDigit!');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('numeric digit');
    });

    it('should reject passwords missing symbols', () => {
      const res = validatePasswordStrength('NoSymbolsInPass123');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('special symbol');
    });

    it('should reject weak default passwords like admin123', () => {
      const res = validatePasswordStrength('admin123');
      expect(res.valid).toBe(false);
    });

    it('should accept compliant, strong passwords', () => {
      const res = validatePasswordStrength('Strong#Secure99!');
      expect(res.valid).toBe(true);
    });
  });

  describe('Admin Provisioning Flow', () => {
    it('should reject invalid email format', async () => {
      await expect(
        provisionAdmin({
          email: 'not-an-email',
          password: 'Strong#Secure99!',
        })
      ).rejects.toThrow('A valid email address is required');
    });

    it('should successfully provision initial admin with Argon2id hash', async () => {
      const result = await provisionAdmin({
        email: 'sysadmin@delivshop.com',
        password: 'Super#SecretAdmin2026!',
        name: 'Chief Admin',
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('CREATED');
      expect(result.email).toBe('sysadmin@delivshop.com');
      expect(result.role).toBe('ADMIN');

      const savedUser = fakeDatabase.get('sysadmin@delivshop.com');
      expect(savedUser).toBeDefined();
      expect(savedUser.role).toBe('ADMIN');
      expect(savedUser.password_hash).toMatch(/^\$argon2id\$/);

      // Verify audit log call
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INITIAL_ADMIN_PROVISIONED',
          entityType: 'user',
        })
      );
    });

    it('should be idempotent: existing admin account is preserved without altering password', async () => {
      // First provision
      await provisionAdmin({
        email: 'sysadmin@delivshop.com',
        password: 'First#Password123!',
      });

      const initialHash = fakeDatabase.get('sysadmin@delivshop.com').password_hash;

      // Second provision with different password attempt
      const secondResult = await provisionAdmin({
        email: 'sysadmin@delivshop.com',
        password: 'Second#Password456!',
      });

      expect(secondResult.success).toBe(true);
      expect(secondResult.action).toBe('PRESERVED');

      // Verify hash was NOT overwritten
      const preservedHash = fakeDatabase.get('sysadmin@delivshop.com').password_hash;
      expect(preservedHash).toBe(initialHash);
    });

    it('should authenticate the provisioned admin through authService.login', async () => {
      await provisionAdmin({
        email: 'admin.auth@delivshop.com',
        password: 'Valid#AuthAdmin2026!',
      });

      // Login with correct credentials
      const loginRes = await authService.login({
        email: 'admin.auth@delivshop.com',
        password: 'Valid#AuthAdmin2026!',
      });

      expect(loginRes.user.email).toBe('admin.auth@delivshop.com');
      expect(loginRes.user.role).toBe('ADMIN');
      expect(loginRes.tokens.accessToken).toBeDefined();

      // Login with incorrect credentials fails
      await expect(
        authService.login({
          email: 'admin.auth@delivshop.com',
          password: 'WrongPassword#999!',
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });
});

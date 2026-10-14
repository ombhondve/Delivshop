import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seedDatabase } from '../../src/database/seed.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { comparePassword } from '../../src/utils/password.js';
import { authService } from '../../src/services/auth.service.js';
import { auditService } from '../../src/services/audit.service.js';
import { createApp } from '../../src/app.js';
import http from 'http';

describe('Default Admin Account Seeding & Authentication', () => {
  let fakeDatabase: Map<string, any>;
  let server: http.Server;
  let baseUrl: string;

  beforeEach(() => {
    fakeDatabase = new Map();

    vi.spyOn(userRepository, 'findByEmail').mockImplementation(async (email: string) => {
      const user = fakeDatabase.get(email.toLowerCase().trim());
      return user || null;
    });

    vi.spyOn(userRepository, 'create').mockImplementation(async (data: any) => {
      const record = {
        id: 'mock-admin-uuid-001',
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

    vi.spyOn(userRepository, 'findById').mockImplementation(async (id: string) => {
      for (const user of fakeDatabase.values()) {
        if (user.id === id) return user;
      }
      return null;
    });

    vi.spyOn(auditService, 'log').mockResolvedValue();
  });

  it('should seed default admin account with Argon2id hash when user does not exist', async () => {
    const result = await seedDatabase();

    expect(result.created).toBe(true);
    expect(result.email).toBe('admin@gmail.com');
    expect(result.role).toBe('ADMIN');

    const createdRecord = fakeDatabase.get('admin@gmail.com');
    expect(createdRecord).toBeDefined();
    expect(createdRecord.role).toBe('ADMIN');

    // Security Check: Password must NEVER be plaintext
    expect(createdRecord.password_hash).not.toContain('admin123');
    expect(createdRecord.password_hash.startsWith('$argon2id$')).toBe(true);

    // Cryptographic verification
    const isPasswordValid = await comparePassword('admin123', createdRecord.password_hash);
    expect(isPasswordValid).toBe(true);
  });

  it('should be completely idempotent: second seed call preserves account without error', async () => {
    // First run creates
    const firstRun = await seedDatabase();
    expect(firstRun.created).toBe(true);

    // Second run preserves
    const secondRun = await seedDatabase();
    expect(secondRun.created).toBe(false);
    expect(secondRun.email).toBe('admin@gmail.com');
    expect(secondRun.role).toBe('ADMIN');
    expect(secondRun.message).toContain('already exists');
  });

  it('should authenticate seeded admin account via authService.login', async () => {
    // Seed first
    await seedDatabase();

    // Authenticate with correct credentials
    const loginResult = await authService.login({
      email: 'admin@gmail.com',
      password: 'admin123',
    });

    expect(loginResult.user).toBeDefined();
    expect(loginResult.user.email).toBe('admin@gmail.com');
    expect(loginResult.user.role).toBe('ADMIN');
    expect(loginResult.tokens.accessToken).toBeDefined();
    expect(typeof loginResult.tokens.accessToken).toBe('string');
  });

  it('should reject invalid password for seeded admin account with generic error', async () => {
    await seedDatabase();

    await expect(
      authService.login({
        email: 'admin@gmail.com',
        password: 'wrong_password_999',
      })
    ).rejects.toThrow('Invalid email or password');
  });

  it('should authenticate seeded admin via HTTP POST /api/auth/login endpoint', async () => {
    await seedDatabase();

    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@gmail.com',
          password: 'admin123',
        }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.user.email).toBe('admin@gmail.com');
      expect(json.data.user.role).toBe('ADMIN');
      expect(json.data.tokens.accessToken).toBeDefined();

      // Verify Set-Cookie header is issued
      const cookieHeader = response.headers.get('set-cookie');
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader).toContain('delivshop_session_token');

      // Verify session verification using only the cookie on GET /api/auth/me
      const cookieValue = cookieHeader!.split(';')[0];
      const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieValue },
      });
      expect(meResponse.status).toBe(200);
      const meJson = await meResponse.json();
      expect(meJson.data.email).toBe('admin@gmail.com');
      expect(meJson.data.role).toBe('ADMIN');

      // Verify logout clears the session cookie
      const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { Cookie: cookieValue },
      });
      expect(logoutResponse.status).toBe(200);
      const logoutCookie = logoutResponse.headers.get('set-cookie');
      expect(logoutCookie).toContain('delivshop_session_token=;');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('should reject login if admin account is deactivated', async () => {
    await seedDatabase();
    const admin = fakeDatabase.get('admin@gmail.com');
    admin.is_active = false;

    await expect(
      authService.login({
        email: 'admin@gmail.com',
        password: 'admin123',
      })
    ).rejects.toThrow(/deactivated/i);
  });

  it('should block seeding predictable credentials in production without explicit override', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalAllow = process.env.ALLOW_PRODUCTION_SEED;

    try {
      // Temporarily mock ENV.NODE_ENV check
      const { ENV } = await import('../../src/config/env.js');
      const originalNodeEnv = ENV.NODE_ENV;
      (ENV as any).NODE_ENV = 'production';
      delete process.env.ALLOW_PRODUCTION_SEED;

      await expect(seedDatabase()).rejects.toThrow(
        /strictly prohibited in production/
      );

      (ENV as any).NODE_ENV = originalNodeEnv;
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalAllow) process.env.ALLOW_PRODUCTION_SEED = originalAllow;
    }
  });

  it('should strictly prohibit public registration with ADMIN role', async () => {
    await expect(
      authService.register({
        email: 'attacker@evil.com',
        password: 'Password123!',
        name: 'Attacker',
        role: 'ADMIN' as any,
      })
    ).rejects.toThrow(/prohibited via public API/i);
  });

  it('should reject CORS requests from untrusted third-party origins', async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'https://evil-unauthorized-app.vercel.app' },
      });

      // Untrusted origin should NOT receive access-control-allow-origin header
      const allowedOrigin = response.headers.get('access-control-allow-origin');
      expect(allowedOrigin).toBeNull();
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('should allow CORS requests from trusted frontend origin https://delivshop.vercel.app', async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'https://delivshop.vercel.app' },
      });

      const allowedOrigin = response.headers.get('access-control-allow-origin');
      expect(allowedOrigin).toBe('https://delivshop.vercel.app');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

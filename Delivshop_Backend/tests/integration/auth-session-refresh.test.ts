import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/app.js';
import { query } from '../../src/config/database.js';
import { hashPassword } from '../../src/utils/password.js';
import jwt from 'jsonwebtoken';
import { ENV } from '../../src/config/env.js';

describe('Auth Session & Token Refresh Integration Suite', () => {
  let server: http.Server;
  let baseUrl: string;
  const testEmail = `operator_session_${Date.now()}@delivshop.internal`;
  const testPassword = 'OperatorSecurePass123!';
  let userId: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // Create a verified test user
    const hash = await hashPassword(testPassword);
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ('Test Operator', $1, $2, 'ADMIN', true)
       RETURNING id`,
      [testEmail, hash]
    );
    userId = result.rows[0].id;
  });

  afterAll(async () => {
    try {
      if (userId) {
        await query(`DELETE FROM users WHERE id = $1`, [userId]);
      }
    } catch {
      // Cleanup best effort
    }

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should authenticate user and return both access and refresh tokens, setting secure cookies', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.tokens.accessToken).toBeDefined();
    expect(json.data.tokens.refreshToken).toBeDefined();

    const setCookieHeaders = res.headers.get('set-cookie');
    expect(setCookieHeaders).toBeDefined();
    expect(setCookieHeaders).toContain('delivshop_session_token=');
    expect(setCookieHeaders).toContain('delivshop_refresh_token=');
  });

  it('should successfully refresh session with valid refresh token via POST /api/auth/refresh', async () => {
    // 1. Login to get tokens
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const loginData = await loginRes.json();
    const refreshToken = loginData.data.tokens.refreshToken;

    // 2. Call /api/auth/refresh
    const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    expect(refreshRes.status).toBe(200);
    const refreshData = await refreshRes.json();
    expect(refreshData.success).toBe(true);
    expect(refreshData.data.tokens.accessToken).toBeDefined();
    expect(refreshData.data.tokens.refreshToken).toBeDefined();
    expect(refreshData.data.user.email).toBe(testEmail);

    // Verify the new access token is valid and can access /api/auth/me
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${refreshData.data.tokens.accessToken}` },
    });
    expect(meRes.status).toBe(200);
    const meData = await meRes.json();
    expect(meData.data.id).toBe(userId);
  });

  it('should reject refresh when refresh token is missing', async () => {
    const res = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.message).toContain('Refresh token required');
  });

  it('should reject refresh with forged or expired refresh token', async () => {
    const forgedToken = jwt.sign(
      { userId, email: testEmail, role: 'ADMIN' },
      'wrong-secret-key-123',
      { expiresIn: '1h' }
    );

    const res = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: forgedToken }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('should clear session and refresh cookies upon logout', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const loginData = await loginRes.json();
    const accessToken = loginData.data.tokens.accessToken;

    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(logoutRes.status).toBe(200);
    const setCookie = logoutRes.headers.get('set-cookie');
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain('delivshop_session_token=;');
    expect(setCookie).toContain('delivshop_refresh_token=;');
  });

  it('should return 401 with TokenExpiredError when an expired access token is presented', async () => {
    // Generate an expired access token
    const expiredToken = jwt.sign(
      { userId, email: testEmail, role: 'ADMIN' },
      ENV.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.message).toContain('Session expired: token has expired');
  });
});

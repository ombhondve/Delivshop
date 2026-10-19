import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/app.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { AuthUser } from '../../src/types/user.types.js';
import { dbPool } from '../../src/config/database.js';

describe('Driver Creation Flow Verification Suite (Add Driver Modal & Backend)', () => {
  let server: http.Server;
  let baseUrl: string;

  const adminUser: AuthUser = {
    id: 'eff88d78-5b73-448f-8e41-330c46923b79',
    email: 'admin@gmail.com',
    role: 'ADMIN',
  };
  const adminToken = generateAccessToken(adminUser);

  let generatedEmployeeId: string;
  let createdDriverId: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Self-contained cleanup: remove test driver created during test
    if (createdDriverId) {
      await dbPool.query('DELETE FROM users WHERE id = $1', [createdDriverId]);
    }
    if (generatedEmployeeId) {
      await dbPool.query('DELETE FROM users WHERE employee_id = $1', [generatedEmployeeId]);
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('1. GET /api/deliveries/drivers/generate-employee-id should generate unique EMP- format ID', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/generate-employee-id`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('employeeId');
    expect(body.data.employeeId).toMatch(/^EMP-\d{10}$/);

    generatedEmployeeId = body.data.employeeId;
  });

  it('2. POST /api/deliveries/drivers creates driver without birth date and without password field', async () => {
    // Note: No dateOfBirth, no password in payload (mirroring the new AddDriverModal)
    const res = await fetch(`${baseUrl}/api/deliveries/drivers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Sanjay Tukaram Jadhav',
        phone: '+91 98234 88771',
        alternatePhone: '+91 98234 88772',
        email: 'sanjay.jadhav.test@delivshop.com',
        employeeId: generatedEmployeeId,
        address: 'Gat No. 124, Near Grampanchayat',
        state: 'Maharashtra',
        city: 'Saswad (Purandar)', // typed/selected village location
        pincode: '412301',
        licenseNumber: 'MH-12-2023-0091823',
        licenseClass: 'LMV-TR',
        joiningDate: '2026-10-20',
        gender: 'MALE',
        emergencyContactName: 'Kavita Jadhav',
        emergencyContactPhone: '+91 98234 88773',
        emergencyContactRelation: 'Spouse',
        employmentStatus: 'ACTIVE',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.employee_id).toBe(generatedEmployeeId);
    expect(body.data.date_of_birth).toBeNull(); // Verified: null in DB
    expect(body.data.city).toBe('Saswad (Purandar)');
    expect(body.data.state).toBe('Maharashtra');
    expect(body.data.name).toBe('Sanjay Tukaram Jadhav');

    createdDriverId = body.data.id;
  });

  it('3. Driver mobile login succeeds using auto-generated Employee ID and default provisioned password', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: generatedEmployeeId, // Driver logs in with Employee ID
        password: 'Driver@12345',   // Standard secure provisioned password
      }),
    });

    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.success).toBe(true);
    expect(loginBody.data.user.role).toBe('DRIVER');
    expect(loginBody.data.user.employeeId).toBe(generatedEmployeeId);
  });

  it('4. POST /api/deliveries/drivers rejects duplicate Employee ID with 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Duplicate ID Driver',
        phone: '+91 98234 00000',
        employeeId: generatedEmployeeId, // already exists
        state: 'Maharashtra',
        city: 'Pune',
      }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain('already exists');
  });

  it('5. Successfully stores a custom typed rural village name not in static seed list', async () => {
    // Generate fresh employee ID
    const genRes = await fetch(`${baseUrl}/api/deliveries/drivers/generate-employee-id`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const { employeeId: customEmpId } = (await genRes.json()).data;

    const res = await fetch(`${baseUrl}/api/deliveries/drivers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Babu Shankar Shinde',
        phone: '+91 98555 12345',
        employeeId: customEmpId,
        state: 'Maharashtra',
        city: 'Khed Shivapur Khurd Village', // Custom typed village
        pincode: '412205',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.city).toBe('Khed Shivapur Khurd Village');
    expect(body.data.state).toBe('Maharashtra');

    // Clean up immediately
    await dbPool.query('DELETE FROM users WHERE id = $1', [body.data.id]);
  });
});

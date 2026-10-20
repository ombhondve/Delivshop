import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/app.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { AuthUser } from '../../src/types/user.types.js';
import { dbPool } from '../../src/config/database.js';

describe('Drivers Roster & Fleet Personnel API, Security & Operations Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  const adminUser: AuthUser = {
    id: 'eff88d78-5b73-448f-8e41-330c46923b79',
    email: 'admin@gmail.com',
    role: 'ADMIN',
  };

  const shopUser: AuthUser = {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'shop.owner@delivshop.com',
    role: 'SHOP',
  };

  const adminToken = generateAccessToken(adminUser);
  const shopToken = generateAccessToken(shopUser);

  let testDriverId: string;
  const testEmployeeId = `EMP-TEST-${Date.now().toString().slice(-4)}`;
  const testEmail = `driver.${Date.now()}@delivshop.internal`;

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
    if (testDriverId) {
      await dbPool.query('DELETE FROM users WHERE id = $1', [testDriverId]);
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should reject unauthenticated GET /api/deliveries/drivers/summary with 401', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/summary`);
    expect(res.status).toBe(401);
  });

  it('should return accurate roster summary metrics calculated from PostgreSQL', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('totalDrivers');
    expect(json.data).toHaveProperty('activeDrivers');
    expect(json.data).toHaveProperty('availableDrivers');
    expect(json.data).toHaveProperty('onDeliveryDrivers');
    expect(json.data).toHaveProperty('inactiveDrivers');
    expect(json.data).toHaveProperty('attentionRequired');
    expect(typeof json.data.totalDrivers).toBe('number');
  });

  it('should allow ADMIN to onboard a new driver with vehicle and license details', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Gajanan Kadam',
        email: testEmail,
        phone: '+91 98900 12345',
        employeeId: testEmployeeId,
        password: 'Password@123',
        vehicleNumber: 'MH-12-TK-9988',
        vehicleType: 'Refrigerated Cold-Van (2 Ton)',
        assignedRoute: 'Route 6 • Hadapsar Industrial Belt',
        licenseNumber: 'MH-12-2023-009988',
        licenseExpiry: '2028-12-31',
        emergencyContact: '+91 98900 99999 (Brother)',
        notes: 'Experienced refrigerated milk tanker operator',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('id');
    expect(json.data.name).toBe('Gajanan Kadam');
    expect(json.data.employee_id).toBe(testEmployeeId);
    expect(json.data.vehicle_number).toBe('MH-12-TK-9988');
    expect(json.data).not.toHaveProperty('password_hash');

    testDriverId = json.data.id;
  });

  it('should list all fleet drivers with operational status and metrics', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);

    const first = json.data[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('employee_id');
    expect(first).toHaveProperty('status');
    expect(first).not.toHaveProperty('password_hash'); // Critical security check: password hash must NEVER be exposed
  });

  it('should reject creating duplicate driver with same employee ID with 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Duplicate Test',
        email: `dup.${Date.now()}@delivshop.internal`,
        phone: '+91 99999 11111',
        employeeId: testEmployeeId,
        password: 'Password@123',
      }),
    });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.message).toMatch(/already exists/i);
  });

  it('should fetch single driver details with deliveries and audit history', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${testDriverId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.driver.id).toBe(testDriverId);
    expect(json.data.driver.employee_id).toBe(testEmployeeId);
    expect(Array.isArray(json.data.deliveries)).toBe(true);
    expect(Array.isArray(json.data.auditHistory)).toBe(true);
  });

  it('should allow ADMIN to update driver details and vehicle assignment', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${testDriverId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Gajanan M. Kadam',
        phone: '+91 98900 54321',
        assignedRoute: 'Route 6B • Magarpatta & Hadapsar Run',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.name).toBe('Gajanan M. Kadam');
    expect(json.data.assigned_route).toBe('Route 6B • Magarpatta & Hadapsar Run');
  });


  it('should allow driver to authenticate via Mobile Login using Employee ID', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmployeeId, // Entering Employee ID into the login credential field
        password: 'Password@123',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.user.role).toBe('DRIVER');
    expect(json.data.user.employeeId).toBe(testEmployeeId);
    expect(json.data.tokens).toHaveProperty('accessToken');
  });

  it('should allow ADMIN to reset driver password and authenticate with new password', async () => {
    const resetRes = await fetch(`${baseUrl}/api/deliveries/drivers/${testDriverId}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        password: 'NewDriverPassword@2026',
      }),
    });

    expect(resetRes.status).toBe(200);

    // Verify login with new password
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmployeeId,
        password: 'NewDriverPassword@2026',
      }),
    });

    expect(loginRes.status).toBe(200);
  });

  it('should enforce deactivation-first rule: Reject deleting active driver with 400', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${testDriverId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.message).toMatch(/deactivated before they can be deleted/i);
  });

  it('should allow deactivating driver and then deleting cleanly when safe', async () => {
    // 1. Deactivate
    const deactRes = await fetch(`${baseUrl}/api/deliveries/drivers/${testDriverId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: false }),
    });
    expect(deactRes.status).toBe(200);

    // 2. Delete
    const deleteRes = await fetch(`${baseUrl}/api/deliveries/drivers/${testDriverId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: 'Integration test cleanup' }),
    });

    expect(deleteRes.status).toBe(200);
    const json = await deleteRes.json();
    expect(json.success).toBe(true);
    testDriverId = ''; // Cleaned up
  });

  it('should enforce RBAC: Reject non-admin (SHOP) from creating driver with 403', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${shopToken}`,
      },
      body: JSON.stringify({
        name: 'Unauthorized Driver Creation',
        phone: '+91 90000 00000',
      }),
    });

    expect(res.status).toBe(403);
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/app.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { AuthUser } from '../../src/types/user.types.js';
import { dbPool } from '../../src/config/database.js';

describe('DELIVSHOP Driver Management System - End-to-End Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  const adminUser: AuthUser = {
    id: 'eff88d78-5b73-448f-8e41-330c46923b79',
    email: 'admin@gmail.com',
    role: 'ADMIN',
  };

  const adminToken = generateAccessToken(adminUser);

  let createdDriverId: string;
  let createdDriverEmpId: string;
  let driverToken: string;
  let testRunId: string;
  let testShopId: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // Clean up any previous test driver with same email
    const existing = await dbPool.query("SELECT id FROM users WHERE email = 'ganesh.patil.test@delivshop.com'");
    for (const row of existing.rows) {
      await dbPool.query('DELETE FROM driver_attendance WHERE driver_id = $1', [row.id]);
      await dbPool.query('DELETE FROM delivery_collections WHERE driver_id = $1', [row.id]);
      await dbPool.query('DELETE FROM delivery_runs WHERE driver_id = $1', [row.id]);
      await dbPool.query('DELETE FROM driver_documents WHERE driver_id = $1', [row.id]);
      await dbPool.query('DELETE FROM driver_salary_configs WHERE driver_id = $1', [row.id]);
      await dbPool.query('DELETE FROM users WHERE id = $1', [row.id]);
    }

    // Query a test shop
    const shopRes = await dbPool.query('SELECT id FROM shops WHERE deleted_at IS NULL LIMIT 1');
    testShopId = shopRes.rows[0]?.id;
  });

  afterAll(async () => {
    if (createdDriverId) {
      // Clean up test data safely
      await dbPool.query('DELETE FROM driver_attendance WHERE driver_id = $1', [createdDriverId]);
      await dbPool.query('DELETE FROM delivery_collections WHERE driver_id = $1', [createdDriverId]);
      await dbPool.query('DELETE FROM delivery_runs WHERE driver_id = $1', [createdDriverId]);
      await dbPool.query('DELETE FROM driver_documents WHERE driver_id = $1', [createdDriverId]);
      await dbPool.query('DELETE FROM driver_salary_configs WHERE driver_id = $1', [createdDriverId]);
      await dbPool.query('DELETE FROM users WHERE id = $1', [createdDriverId]);
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('1. Admin should create a driver with auto-generated sequential Employee ID and full profile', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Ganesh Patil',
        phone: '9876543210',
        alternatePhone: '9876543211',
        email: 'ganesh.patil.test@delivshop.com',
        licenseNumber: 'MH-14-2022-0099887',
        licenseExpiry: '2028-12-31',
        licenseClass: 'LMV-COMMERCIAL',
        address: 'Plot 44, Hadapsar Industrial Estate',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411028',
        dateOfBirth: '1992-06-15',
        gender: 'MALE',
        emergencyContactName: 'Sunita Patil',
        emergencyContactPhone: '9876543219',
        emergencyContactRelation: 'Spouse',
        employmentStatus: 'ACTIVE',
        password: 'PatilPassword@123',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.employee_id).toMatch(/^EMP-\d{10}$/);
    expect(json.data.city).toBe('Pune');
    expect(json.data.state).toBe('Maharashtra');
    expect(json.data.license_class).toBe('LMV-COMMERCIAL');

    createdDriverId = json.data.id;
    createdDriverEmpId = json.data.employee_id;
  });

  it('2. Should reject duplicate driver Employee ID', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Another Driver',
        phone: '9123456789',
        employeeId: createdDriverEmpId, // Intentionally duplicated
        password: 'SomePassword123',
      }),
    });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('3. Driver should authenticate using Employee ID and Password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: createdDriverEmpId, // Auth endpoint accepts email OR employee ID
        password: 'PatilPassword@123',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.user.role).toBe('DRIVER');
    expect(json.data.user.employeeId).toBe(createdDriverEmpId);
    expect(json.data.tokens.accessToken).toBeDefined();

    driverToken = json.data.tokens.accessToken;
  });

  it('4. Driver should record daily attendance check-in with GPS', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${createdDriverId}/attendance/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        latitude: 18.5204,
        longitude: 73.8567,
        notes: 'Arrived at Pune Central Depot',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.driver_id).toBe(createdDriverId);
    expect(json.data.check_in_time).toBeDefined();
    expect(json.data.status).toBe('PRESENT');
  });

  it('5. Should prevent duplicate attendance check-in on the same day', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${createdDriverId}/attendance/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        latitude: 18.5204,
        longitude: 73.8567,
      }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('6. Driver should record daily attendance check-out', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${createdDriverId}/attendance/check-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        latitude: 18.5204,
        longitude: 73.8567,
        notes: 'Shift completed, crates returned',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.check_out_time).toBeDefined();
  });

  it('7. Driver attendance summary and history should reflect completed shift', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${createdDriverId}/attendance/summary`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.daysPresentMonth).toBeGreaterThanOrEqual(1);
  });

  it('8. Driver should not be able to view another driver attendance', async () => {
    const otherDriverId = '00000000-0000-0000-0000-000000000001';
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${otherDriverId}/attendance`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });

    expect(res.status).toBe(403);
  });

  it('9. Driver can record cash/UPI collection for authorized stop and receipt is generated', async () => {
    // Create a temporary run for testing collections
    const veh = await dbPool.query("SELECT id FROM vehicles WHERE is_active = TRUE LIMIT 1");
    const route = await dbPool.query("SELECT id FROM routes WHERE status = 'ACTIVE' LIMIT 1");

    const runRes = await dbPool.query(
      `INSERT INTO delivery_runs (
        run_code, delivery_date, route_id, driver_id, vehicle_id, status
       ) VALUES ($1, CURRENT_DATE, $2, $3, $4, 'IN_PROGRESS')
       RETURNING id`,
      [`RUN-TEST-${Date.now()}`, route.rows[0].id, createdDriverId, veh.rows[0].id]
    );
    testRunId = runRes.rows[0].id;

    const res = await fetch(`${baseUrl}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        runId: testRunId,
        shopId: testShopId,
        amount: 2450.50,
        paymentMethod: 'UPI',
        transactionReference: 'UPI-REF-99887766',
        notes: 'Full payment received via QR',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.receipt_number).toMatch(/^RCP-\d{8}-\d{3,}$/);
    expect(parseFloat(json.data.amount)).toBe(2450.50);
    expect(json.data.driver_id).toBe(createdDriverId);

    // 10. Admin can reconcile collection
    const collectionId = json.data.id;
    const recRes = await fetch(`${baseUrl}/api/collections/${collectionId}/reconcile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'RECONCILED' }),
    });

    expect(recRes.status).toBe(200);
    const recJson = await recRes.json();
    expect(recJson.data.status).toBe('RECONCILED');
  });

  it('11. Driver full profile endpoint should return driver details, attendance, and runs', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${createdDriverId}/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.driver.employee_id).toBe(createdDriverEmpId);
    expect(json.data.attendanceSummary).toBeDefined();
    expect(json.data.recentAttendance.length).toBeGreaterThan(0);
  });

  it('12. Deactivating driver should preserve history and prevent further login', async () => {
    // 0. Ensure active runs are completed before deactivating driver
    if (testRunId) {
      await dbPool.query("UPDATE delivery_runs SET status = 'COMPLETED' WHERE id = $1", [testRunId]);
    }

    // 1. Admin deactivates driver
    const deactRes = await fetch(`${baseUrl}/api/deliveries/drivers/${createdDriverId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: false, reason: 'Seasonal leave' }),
    });
    expect(deactRes.status).toBe(200);

    // 2. Deactivated driver cannot log in
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: createdDriverEmpId,
        password: 'PatilPassword@123',
      }),
    });
    expect(loginRes.status).toBe(401);

    // 3. Operational records remain intact in database
    const attCheck = await dbPool.query('SELECT COUNT(*)::int as count FROM driver_attendance WHERE driver_id = $1', [createdDriverId]);
    expect(attCheck.rows[0].count).toBeGreaterThan(0);

    const colCheck = await dbPool.query('SELECT COUNT(*)::int as count FROM delivery_collections WHERE driver_id = $1', [createdDriverId]);
    expect(colCheck.rows[0].count).toBeGreaterThan(0);
  });
});

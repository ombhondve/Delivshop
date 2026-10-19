import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/app.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { AuthUser } from '../../src/types/user.types.js';
import { dbPool } from '../../src/config/database.js';

describe('Assignments & Daily Delivery Runs Dispatch Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  const adminUser: AuthUser = {
    id: 'eff88d78-5b73-448f-8e41-330c46923b79',
    email: 'admin@gmail.com',
    role: 'ADMIN',
  };

  const adminToken = generateAccessToken(adminUser);

  let driverId: string;
  let vehicleId: string;
  let routeId: string;
  let runId: string;
  const deliveryDate = '2026-11-05'; // safe future test date

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // Ensure test driver exists
    const drvRes = await dbPool.query("SELECT id FROM users WHERE role = 'DRIVER' AND is_active = TRUE AND deleted_at IS NULL LIMIT 1");
    if (drvRes.rows[0]) {
      driverId = drvRes.rows[0].id;
    } else {
      const createdDrv = await dbPool.query(`
        INSERT INTO users (email, password_hash, name, role, is_active, employee_id)
        VALUES ('test_dispatch_drv@delivshop.internal', 'hash', 'Test Dispatch Driver', 'DRIVER', TRUE, 'EMP-DRV-9999')
        RETURNING id;
      `);
      driverId = createdDrv.rows[0].id;
    }

    // Ensure test vehicle with valid documents exists
    const vehRes = await dbPool.query(`
      SELECT v.id FROM vehicles v 
      WHERE v.is_active = TRUE AND v.deleted_at IS NULL 
        AND v.status = 'AVAILABLE'
      LIMIT 1
    `);
    if (vehRes.rows[0]) {
      vehicleId = vehRes.rows[0].id;
    } else {
      const createdVeh = await dbPool.query(`
        INSERT INTO vehicles (vehicle_code, registration_number, vehicle_type, max_crate_capacity, status, is_active)
        VALUES ('VEH-TEST-99', 'MH-12-TEST-9999', 'REFRIGERATED_VAN', 100, 'AVAILABLE', TRUE)
        RETURNING id;
      `);
      vehicleId = createdVeh.rows[0].id;
      await dbPool.query(`
        INSERT INTO vehicle_documents (vehicle_id, document_type, document_number, expiry_date, verification_status)
        VALUES 
          ($1, 'RC', 'RC-TEST-99', '2028-12-31', 'VERIFIED'),
          ($1, 'INSURANCE', 'INS-TEST-99', '2028-12-31', 'VERIFIED'),
          ($1, 'PUC', 'PUC-TEST-99', '2028-12-31', 'VERIFIED')
        ON CONFLICT DO NOTHING;
      `, [vehicleId]);
    }

    // Ensure active test route exists
    const routeRes = await dbPool.query("SELECT id FROM routes WHERE status IN ('ACTIVE', 'PUBLISHED') AND deleted_at IS NULL LIMIT 1");
    if (routeRes.rows[0]) {
      routeId = routeRes.rows[0].id;
    } else {
      const createdRoute = await dbPool.query(`
        INSERT INTO routes (route_code, name, status)
        VALUES ('RT-TEST-99', 'Test Dispatch Route', 'ACTIVE')
        RETURNING id;
      `);
      routeId = createdRoute.rows[0].id;
    }
  });

  afterAll(async () => {
    if (runId) {
      await dbPool.query('DELETE FROM delivery_runs WHERE id = $1', [runId]);
    }
    await dbPool.query("DELETE FROM delivery_runs WHERE route_id IN (SELECT id FROM routes WHERE route_code = 'RT-TEST-99');");
    await dbPool.query("DELETE FROM routes WHERE route_code = 'RT-TEST-99';");
    await dbPool.query("DELETE FROM vehicle_documents WHERE vehicle_id IN (SELECT id FROM vehicles WHERE vehicle_code = 'VEH-TEST-99');");
    await dbPool.query("DELETE FROM vehicles WHERE vehicle_code = 'VEH-TEST-99';");
    await dbPool.query("DELETE FROM users WHERE email = 'test_dispatch_drv@delivshop.internal';");
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should validate assignment constraints via POST /api/assignments/validate', async () => {
    const res = await fetch(`${baseUrl}/api/assignments/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        driverId,
        vehicleId,
        routeId,
        deliveryDate,
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.isValid).toBe(true);
    expect(json.data.errors).toHaveLength(0);
  });

  it('should create and dispatch new daily delivery run assignment', async () => {
    const res = await fetch(`${baseUrl}/api/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        routeId,
        driverId,
        vehicleId,
        deliveryDate,
        notes: 'Priority early morning cold chain run',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('ASSIGNED');
    expect(json.data.stops.length).toBeGreaterThan(0);
    runId = json.data.id;
  });

  it('should prevent double-booking the driver on the same delivery date', async () => {
    // Attempting another assignment on the same date for the same driver must fail
    const res = await fetch(`${baseUrl}/api/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        routeId,
        driverId,
        vehicleId,
        deliveryDate,
      }),
    });

    expect(res.status).toBe(400);
  });

  it('should allow valid operational status progression on delivery run', async () => {
    // 1. Progress to READY
    const readyRes = await fetch(`${baseUrl}/api/assignments/${runId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'READY', notes: 'Vehicle loaded and refrigerated' }),
    });
    expect(readyRes.status).toBe(200);

    // 2. Progress to IN_PROGRESS (dispatched)
    const inProgressRes = await fetch(`${baseUrl}/api/assignments/${runId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'IN_PROGRESS', notes: 'Vehicle departed depot' }),
    });
    expect(inProgressRes.status).toBe(200);
    const inProgJson = await inProgressRes.json();
    expect(inProgJson.data.dispatch_time).toBeTruthy();

    // 3. Complete stop 1
    const stopRes = await fetch(`${baseUrl}/api/assignments/${runId}/stops/1/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'DELIVERED',
        notes: 'Delivered 20 crates, shop owner signed',
      }),
    });
    expect(stopRes.status).toBe(200);
  });

  it('should reject invalid status regression (e.g. IN_PROGRESS -> ASSIGNED)', async () => {
    const res = await fetch(`${baseUrl}/api/assignments/${runId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'ASSIGNED' }),
    });
    expect(res.status).toBe(400);
  });
});

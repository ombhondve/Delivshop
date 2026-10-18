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

    // Query active driver
    const drvRes = await dbPool.query("SELECT id FROM users WHERE role = 'DRIVER' AND is_active = TRUE AND deleted_at IS NULL LIMIT 1");
    driverId = drvRes.rows[0]?.id;

    // Query active available vehicle with valid documents
    const vehRes = await dbPool.query(`
      SELECT v.id FROM vehicles v 
      WHERE v.is_active = TRUE AND v.deleted_at IS NULL 
        AND v.status NOT IN ('UNDER_MAINTENANCE', 'INACTIVE')
        AND NOT EXISTS (
          SELECT 1 FROM vehicle_documents vd 
          WHERE vd.vehicle_id = v.id AND vd.document_type IN ('RC', 'INSURANCE', 'PUC') AND vd.expiry_date < '2026-11-05'::date
        )
      LIMIT 1
    `);
    vehicleId = vehRes.rows[0]?.id;
    if (!vehicleId) {
      const fallbackVeh = await dbPool.query("SELECT id FROM vehicles WHERE is_active = TRUE AND deleted_at IS NULL LIMIT 1");
      vehicleId = fallbackVeh.rows[0]?.id;
      if (vehicleId) {
        await dbPool.query("UPDATE vehicles SET status = 'AVAILABLE' WHERE id = $1", [vehicleId]);
        await dbPool.query("UPDATE vehicle_documents SET expiry_date = '2027-12-31' WHERE vehicle_id = $1", [vehicleId]);
      }
    }

    // Query active or published route
    const routeRes = await dbPool.query("SELECT id FROM routes WHERE status IN ('ACTIVE', 'PUBLISHED') AND deleted_at IS NULL LIMIT 1");
    routeId = routeRes.rows[0]?.id;
  });

  afterAll(async () => {
    if (runId) {
      await dbPool.query('DELETE FROM delivery_runs WHERE id = $1', [runId]);
    }
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

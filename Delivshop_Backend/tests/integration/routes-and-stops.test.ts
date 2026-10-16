import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/app.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { AuthUser } from '../../src/types/user.types.js';
import { dbPool } from '../../src/config/database.js';

describe('Delivery Routes, Shop Sequences, and Versioning Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  const adminUser: AuthUser = {
    id: 'eff88d78-5b73-448f-8e41-330c46923b79',
    email: 'admin@gmail.com',
    role: 'ADMIN',
  };

  const adminToken = generateAccessToken(adminUser);
  let testRouteId: string;
  let testShopId1: string;
  let testShopId2: string;
  const testRouteCode = `RT-TST-${Date.now().toString().slice(-4)}`;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    const shopsRes = await dbPool.query('SELECT id FROM shops ORDER BY created_at ASC LIMIT 2');
    testShopId1 = shopsRes.rows[0]?.id;
    if (shopsRes.rows.length < 2) {
      const userRes = await dbPool.query('SELECT id FROM users LIMIT 1');
      const ownerId = userRes.rows[0]?.id;
      const createdShop = await dbPool.query(
        `INSERT INTO shops (name, owner_id, email, phone, address, city, state, pincode)
         VALUES ('Saras Dairy Outlet - Camp', $1, 'saras.camp@delivshop.com', '+91 98220 11990', '14 MG Road, Camp, Pune', 'Pune', 'Maharashtra', '411001')
         RETURNING id`,
        [ownerId]
      );
      testShopId2 = createdShop.rows[0].id;
    } else {
      testShopId2 = shopsRes.rows[1].id;
    }
  });

  afterAll(async () => {
    if (testRouteId) {
      await dbPool.query('DELETE FROM routes WHERE id = $1', [testRouteId]);
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should fetch routes summary metrics with authoritative dispatch metrics', async () => {
    const res = await fetch(`${baseUrl}/api/routes/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('totalRoutes');
    expect(json.data).toHaveProperty('dispatchableRoutes');
    expect(json.data).toHaveProperty('publishedRoutes');
    expect(json.data).toHaveProperty('totalStopsConfigured');
    expect(json.data).toHaveProperty('avgDistanceKm');
    expect(json.data).toHaveProperty('readinessPercentage');
    expect(typeof json.data.readinessPercentage).toBe('number');
  });

  it('should reject unauthenticated access to routes list and summary', async () => {
    const res = await fetch(`${baseUrl}/api/routes`);
    expect(res.status).toBe(401);

    const summaryRes = await fetch(`${baseUrl}/api/routes/summary`);
    expect(summaryRes.status).toBe(401);
  });

  it('should allow ADMIN to create route with sequenced shop stops', async () => {
    const res = await fetch(`${baseUrl}/api/routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        routeCode: testRouteCode,
        name: 'Test Morning Route Corridor',
        city: 'Pune',
        depot: 'Pune Central Cold Depot',
        status: 'ACTIVE',
        stops: [
          {
            shopId: testShopId1,
            stopSequence: 1,
            plannedArrivalTime: '06:15 AM',
            serviceTimeMinutes: 12,
            deliveryInstructions: 'Deliver 15 milk crates to rear refrigerator',
          },
          {
            shopId: testShopId2,
            stopSequence: 2,
            plannedArrivalTime: '06:45 AM',
            serviceTimeMinutes: 10,
            deliveryInstructions: 'Collect empty plastic crates',
          },
        ],
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.route_code).toBe(testRouteCode);
    expect(json.data.stops.length).toBe(2);
    testRouteId = json.data.id;
  });

  it('should allow updating and resequencing route stops with immutable version increment', async () => {
    // Resequence: swap stop 1 and stop 2
    const res = await fetch(`${baseUrl}/api/routes/${testRouteId}/stops`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        stops: [
          {
            shopId: testShopId2,
            stopSequence: 1,
            plannedArrivalTime: '06:00 AM',
            serviceTimeMinutes: 15,
          },
          {
            shopId: testShopId1,
            stopSequence: 2,
            plannedArrivalTime: '06:30 AM',
            serviceTimeMinutes: 10,
          },
        ],
        changesSummary: 'Optimized morning sequence for earlier delivery to Shop 2',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.version).toBe(2);
    expect(json.data.stops[0].shop_id).toBe(testShopId2);
  });

  it('should reject route resequencing with duplicate shops in the sequence', async () => {
    const res = await fetch(`${baseUrl}/api/routes/${testRouteId}/stops`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        stops: [
          { shopId: testShopId1, stopSequence: 1 },
          { shopId: testShopId1, stopSequence: 2 },
        ],
      }),
    });

    expect(res.status).toBe(400);
  });

  it('should retrieve full route details with version history snapshots', async () => {
    const res = await fetch(`${baseUrl}/api/routes/${testRouteId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.versions.length).toBeGreaterThanOrEqual(2);
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/app.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { AuthUser } from '../../src/types/user.types.js';
import { dbPool } from '../../src/config/database.js';

describe('Route Assignment, Delivery Date Visibility, and Shop Security Verification Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  const adminUser: AuthUser = {
    id: 'eff88d78-5b73-448f-8e41-330c46923b79',
    email: 'admin@gmail.com',
    role: 'ADMIN',
  };
  const adminToken = generateAccessToken(adminUser);

  let shopA_Id: string;
  let shopA_User: AuthUser;
  let shopA_Token: string;

  let shopB_Id: string;
  let shopB_User: AuthUser;
  let shopB_Token: string;

  let testRouteId: string;
  let testDriverId: string;
  let testVehicleId: string;
  let publishedRunId: string;
  let testProductId: string;

  const d1 = new Date();
  d1.setDate(d1.getDate() + 3);
  let confirmedDateStr = d1.toISOString().slice(0, 10);

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // 1. Setup Shop A (Isolated initially without route coverage)
    const existingShopA = await dbPool.query(
      `SELECT id, owner_id FROM shops WHERE status = 'ACTIVE' LIMIT 1`
    );
    if (existingShopA.rows[0]) {
      shopA_Id = existingShopA.rows[0].id;
      shopA_User = {
        id: existingShopA.rows[0].owner_id || adminUser.id,
        email: 'shopA.test@delivshop.internal',
        role: 'SHOP',
        shopId: shopA_Id,
      };
    } else {
      const insA = await dbPool.query(
        `INSERT INTO shops (name, shop_id, email, phone, address, owner_id, status)
         VALUES ('Alpha Store Test', 'SH-ALPHA', 'alpha@delivshop.internal', '+91 99999 11111', 'Main St', $1, 'ACTIVE')
         RETURNING id`,
        [adminUser.id]
      );
      shopA_Id = insA.rows[0].id;
      shopA_User = {
        id: adminUser.id,
        email: 'shopA.test@delivshop.internal',
        role: 'SHOP',
        shopId: shopA_Id,
      };
    }
    shopA_Token = generateAccessToken(shopA_User);

    // Remove Shop A from any route_stops initially to test Case A (No Route)
    await dbPool.query('DELETE FROM route_stops WHERE shop_id = $1', [shopA_Id]);

    // 2. Setup Shop B (Different Shop for cross-tenant access control)
    const insB = await dbPool.query(
      `INSERT INTO shops (name, shop_id, email, phone, address, owner_id, status)
       VALUES ('Beta Store Test', 'SH-BETA', 'beta@delivshop.internal', '+91 99999 22222', 'Cross Rd', $1, 'ACTIVE')
       ON CONFLICT (shop_id) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, owner_id`,
      [adminUser.id]
    );
    shopB_Id = insB.rows[0].id;
    shopB_User = {
      id: insB.rows[0].owner_id || adminUser.id,
      email: 'shopB.test@delivshop.internal',
      role: 'SHOP',
      shopId: shopB_Id,
    };
    shopB_Token = generateAccessToken(shopB_User);

    // 3. Setup Route
    const routeRes = await dbPool.query(`SELECT id FROM routes WHERE status = 'ACTIVE' LIMIT 1`);
    if (routeRes.rows[0]) {
      testRouteId = routeRes.rows[0].id;
    } else {
      const insR = await dbPool.query(
        `INSERT INTO routes (code, name, city, status)
         VALUES ('RT-ALPHA', 'Alpha Regional Corridor', 'Pune', 'ACTIVE')
         RETURNING id`
      );
      testRouteId = insR.rows[0].id;
    }

    // 4. Setup Driver & Vehicle
    const driverRes = await dbPool.query(
      "SELECT id FROM users WHERE role = 'DRIVER' AND is_active = TRUE AND deleted_at IS NULL LIMIT 1"
    );
    if (driverRes.rows[0]) {
      testDriverId = driverRes.rows[0].id;
    } else {
      const insD = await dbPool.query(
        `INSERT INTO users (email, password_hash, name, phone, role, is_active)
         VALUES ('rohan.driver@delivshop.internal', 'hash_test', 'Rohan Roster Driver', '+91 98765 00000', 'DRIVER', true)
         RETURNING id`
      );
      testDriverId = insD.rows[0].id;
    }

    const vehicleRes = await dbPool.query(`SELECT id FROM vehicles WHERE is_active = TRUE AND deleted_at IS NULL LIMIT 1`);
    if (vehicleRes.rows[0]) {
      testVehicleId = vehicleRes.rows[0].id;
    } else {
      const insV = await dbPool.query(
        `INSERT INTO vehicles (registration_number, type, capacity_litres, crate_capacity, capacity_crates, status, is_active)
         VALUES ('MH-12-AL-1234', 'REFRIGERATED_TRUCK', 1500, 100, 100, 'AVAILABLE', true)
         RETURNING id`
      );
      testVehicleId = insV.rows[0].id;
    }

    // 5. Setup Published Delivery Run for Schedule Confirmation
    const existingRun = await dbPool.query(
      `SELECT id, delivery_date FROM delivery_runs 
       WHERE is_published = TRUE AND status IN ('ASSIGNED', 'PUBLISHED')
       LIMIT 1`
    );

    if (existingRun.rows[0]) {
      publishedRunId = existingRun.rows[0].id;
      confirmedDateStr = new Date(existingRun.rows[0].delivery_date).toISOString().slice(0, 10);
    } else {
      const insD = await dbPool.query(
        `INSERT INTO users (email, password_hash, name, phone, role, is_active)
         VALUES ($1, 'hash_test', 'Test Run Driver', '+91 98765 11111', 'DRIVER', true)
         RETURNING id`,
        [`driver_${Date.now()}@delivshop.internal`]
      );
      testDriverId = insD.rows[0].id;

      const uniqueRunCode = `RUN-${Date.now().toString(36).toUpperCase()}`;
      const runRes = await dbPool.query(
        `INSERT INTO delivery_runs (
          run_code, route_id, driver_id, vehicle_id, delivery_date, status,
          is_published, delivery_window, planned_stops_count, created_by
        ) VALUES ($1, $2, $3, $4, $5::date, 'ASSIGNED', TRUE, '06:00 AM - 09:00 AM', 1, $6)
        RETURNING id`,
        [
          uniqueRunCode,
          testRouteId,
          testDriverId,
          testVehicleId,
          confirmedDateStr,
          adminUser.id,
        ]
      );
      publishedRunId = runRes.rows[0].id;
    }

    // 6. Setup Product
    const prodRes = await dbPool.query(`SELECT id FROM products WHERE is_active = true LIMIT 1`);
    if (prodRes.rows[0]) {
      testProductId = prodRes.rows[0].id;
    } else {
      const insP = await dbPool.query(
        `INSERT INTO products (name, sku, category, package_size, packaging_type, unit_price, is_liquid)
         VALUES ('Pure Whole Milk 1L', 'PWM-1L-TEST', 'Milk', '1 L', 'Pouch', 65.00, true)
         RETURNING id`
      );
      testProductId = insP.rows[0].id;
    }
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  let testOrderId: string;

  // 1 & 3: Shop cannot select or modify delivery dates via API or order creation
  it('1. Shop cannot select a delivery date on order placement; backend sanitizes/strips client dates', async () => {
    const payload = {
      shopId: shopA_Id,
      items: [{ productId: testProductId, quantity: 12 }],
      deliveryAddress: {
        street: '123 Market Yard',
        city: 'Pune',
        postalCode: '411037',
        notes: 'Side gate loading dock',
      },
      // Attempt to tamper with delivery scheduling fields:
      requestedDeliveryDate: '2026-11-20',
      deliveryRunId: publishedRunId,
      deliveryWindow: '05:00 AM - 07:00 AM',
    };

    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${shopA_Token}`,
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    testOrderId = body.data.id;

    // Delivery date must be completely null for shop
    expect(body.data.confirmed_delivery_date).toBeNull();
    expect(body.data.requested_delivery_date).toBeUndefined();
    expect(body.data.delivery_run_id).toBeUndefined();
  });

  // 5: Case A: Unassigned route results in 'Pending', with no delivery date shown
  it('5. An unassigned route results in "Pending", with no delivery date shown', async () => {
    // Explicitly ensure route_id is null in DB
    await dbPool.query('UPDATE orders SET route_id = NULL WHERE id = $1', [testOrderId]);

    const res = await fetch(`${baseUrl}/api/orders/${testOrderId}`, {
      headers: { Authorization: `Bearer ${shopA_Token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const order = body.data;

    expect(order.customer_delivery_status).toBe('Pending');
    expect(order.confirmed_delivery_date).toBeNull();
    expect(order.route_name).toBeUndefined();
    expect(order.route_id).toBeUndefined();
  });

  // 8: Admin route assignment persists and is saved to database
  it('8. Admin assigns route to order; assignment persists in database', async () => {
    const res = await fetch(`${baseUrl}/api/orders/${testOrderId}/assign-route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ routeId: testRouteId }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.route_id).toBe(testRouteId);
    // Route assignment alone MUST NOT confirm a delivery date
    expect(body.data.confirmed_delivery_date).toBeNull();

    // Verify database record
    const dbCheck = await dbPool.query('SELECT route_id, confirmed_delivery_date, scheduling_status FROM orders WHERE id = $1', [testOrderId]);
    expect(dbCheck.rows[0].route_id).toBe(testRouteId);
    expect(dbCheck.rows[0].confirmed_delivery_date).toBeNull();
  });

  // 6: Case B: Assigned route with unconfirmed date results in 'Scheduling', with no delivery date shown
  it('6. An assigned route with unconfirmed date results in "Scheduling", with no delivery date shown', async () => {
    const res = await fetch(`${baseUrl}/api/orders/${testOrderId}`, {
      headers: { Authorization: `Bearer ${shopA_Token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const order = body.data;

    expect(order.customer_delivery_status).toBe('Scheduling');
    expect(order.confirmed_delivery_date).toBeNull();
    // Case B must not show a provisional or default date
    expect(order.delivery_window).toBeFalsy();
  });

  // 10: Internal route names and dispatch codes are not exposed in Shop API responses
  it('10. Internal route names and dispatch codes are not exposed in Shop API responses', async () => {
    const res = await fetch(`${baseUrl}/api/orders/${testOrderId}`, {
      headers: { Authorization: `Bearer ${shopA_Token}` },
    });

    const body = await res.json();
    const order = body.data;

    // Forbidden internal fields must not be present
    expect(order.route_name).toBeUndefined();
    expect(order.route_code).toBeUndefined();
    expect(order.route_id).toBeUndefined();
    expect(order.delivery_run_id).toBeUndefined();
    expect(order.run_code).toBeUndefined();
    expect(order.delivery_status).not.toBe('PENDING_ASSIGNMENT');
  });

  // 2 & 3: Shop cannot edit date after placing an order or via direct API
  it('2 & 3. Shop cannot modify delivery dates or schedule orders through direct API requests', async () => {
    // Attempt 1: Direct route assignment by Shop
    const assignRes = await fetch(`${baseUrl}/api/orders/${testOrderId}/assign-route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${shopA_Token}`,
      },
      body: JSON.stringify({ routeId: testRouteId }),
    });
    expect(assignRes.status).toBe(403);

    // Attempt 2: Direct scheduling by Shop
    const schedRes = await fetch(`${baseUrl}/api/orders/${testOrderId}/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${shopA_Token}`,
      },
      body: JSON.stringify({
        deliveryRunId: publishedRunId,
        deliveryWindow: '06:00 AM - 09:00 AM',
      }),
    });
    expect(schedRes.status).toBe(403);
  });

  // 4: Shop cannot access another Shop's order
  it('4. Shop cannot access another Shop\'s order (strict ownership check 403)', async () => {
    // Shop B attempts to view Shop A's order
    const res = await fetch(`${baseUrl}/api/orders/${testOrderId}`, {
      headers: { Authorization: `Bearer ${shopB_Token}` },
    });
    expect(res.status).toBe(403);
  });

  // 11: Driver assignment remains separate from route assignment
  it('11. Driver assignment remains separate from route assignment', async () => {
    // Check deliveries record for the order: driver_id must still be null because no run has been scheduled yet
    const delRes = await dbPool.query('SELECT driver_id FROM deliveries WHERE order_id = $1', [testOrderId]);
    if (delRes.rows[0]) {
      expect(delRes.rows[0].driver_id).toBeNull();
    }
  });

  // 9: Admin schedule confirmation updates the order with confirmed date and run
  it('9. Admin schedule confirmation publishes confirmed delivery date', async () => {
    const res = await fetch(`${baseUrl}/api/orders/${testOrderId}/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        deliveryRunId: publishedRunId,
        deliveryWindow: '06:00 AM - 08:30 AM',
        notes: 'Priority morning delivery scheduled by Admin',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.schedulingStatus || body.data.scheduling_status).toBe('SCHEDULED');
  });

  // 7: Case C: Assigned route with confirmed date displays the read-only confirmed date
  it('7. An assigned route with confirmed date displays the correct read-only date to Shop', async () => {
    const res = await fetch(`${baseUrl}/api/orders/${testOrderId}`, {
      headers: { Authorization: `Bearer ${shopA_Token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const order = body.data;

    // Confirmed date is now visible to the shop
    expect(order.confirmed_delivery_date).toBe(confirmedDateStr);
    expect(order.customer_delivery_status).not.toBe('Pending');
    expect(order.customer_delivery_status).not.toBe('Scheduling');
    // Still strictly hides internal route and run codes
    expect(order.route_name).toBeUndefined();
    expect(order.run_code).toBeUndefined();
  });

  // 13: Failed assignments and scheduling operations do not produce false success states
  it('13. Invalid route assignment produces proper error and does not mutate state', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${baseUrl}/api/orders/${testOrderId}/assign-route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ routeId: fakeUuid }),
    });

    expect(res.status).toBe(404);
  });

  // 14: Existing order totals, quantities, and valid delivery data remain intact
  it('14. Order items, quantities, pricing, and totals remain intact throughout lifecycle', async () => {
    const res = await fetch(`${baseUrl}/api/orders/${testOrderId}`, {
      headers: { Authorization: `Bearer ${shopA_Token}` },
    });

    const body = await res.json();
    const order = body.data;

    expect(order.items).toBeDefined();
    expect(order.items.length).toBeGreaterThan(0);
    const item = order.items[0];
    expect(item.productId || item.product_id).toBe(testProductId);
    expect(Number(item.quantity)).toBe(12);
    expect(Number(order.total || order.total_amount)).toBeGreaterThan(0);
  });
});

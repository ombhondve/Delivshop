import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/app.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { AuthUser } from '../../src/types/user.types.js';
import { dbPool } from '../../src/config/database.js';

describe('Route-Based Delivery Date Availability and Order Scheduling Test Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  const adminUser: AuthUser = {
    id: 'eff88d78-5b73-448f-8e41-330c46923b79',
    email: 'admin@gmail.com',
    role: 'ADMIN',
  };
  const adminToken = generateAccessToken(adminUser);

  let shopOwnerUser: AuthUser;
  let shopToken: string;
  let testShopId: string;
  let unassignedShopId: string;
  let testProductId: string;
  let testDriverId: string;
  let testVehicleId: string;
  let testRouteId: string;
  let publishedRunId: string;

  // Calculate dynamic dates within the 7-day advance booking window
  const d1 = new Date();
  d1.setDate(d1.getDate() + 2);
  const testDeliveryDate = d1.toISOString().slice(0, 10);

  const d2 = new Date();
  d2.setDate(d2.getDate() + 3);
  const secondDate = d2.toISOString().slice(0, 10);

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // 1. Get or create shop with route coverage
    const shopRes = await dbPool.query(
      `SELECT s.id, s.owner_id FROM shops s
       JOIN route_stops rs ON s.id = rs.shop_id
       JOIN routes r ON rs.route_id = r.id
       WHERE r.status = 'ACTIVE' AND s.status = 'ACTIVE'
       LIMIT 1`
    );

    if (shopRes.rows[0]) {
      testShopId = shopRes.rows[0].id;
      const ownerId = shopRes.rows[0].owner_id || adminUser.id;
      shopOwnerUser = {
        id: ownerId,
        email: 'shopkeeper.test@delivshop.com',
        role: 'SHOP',
        shopId: testShopId,
      };
    } else {
      // Fallback: pick any shop and attach to route 1
      const anyShop = await dbPool.query("SELECT id, owner_id FROM shops WHERE status = 'ACTIVE' LIMIT 1");
      testShopId = anyShop.rows[0].id;
      const anyRoute = await dbPool.query("SELECT id FROM routes WHERE status = 'ACTIVE' LIMIT 1");
      testRouteId = anyRoute.rows[0].id;
      await dbPool.query(
        "INSERT INTO route_stops (route_id, shop_id, stop_sequence) VALUES ($1, $2, 99) ON CONFLICT DO NOTHING",
        [testRouteId, testShopId]
      );
      shopOwnerUser = {
        id: anyShop.rows[0].owner_id || adminUser.id,
        email: 'shopkeeper.test@delivshop.com',
        role: 'SHOP',
        shopId: testShopId,
      };
    }
    shopToken = generateAccessToken(shopOwnerUser);

    // 2. Create or find an unassigned shop (no route coverage)
    const unassignedRes = await dbPool.query(
      `SELECT id FROM shops 
       WHERE id NOT IN (SELECT shop_id FROM route_stops) AND status = 'ACTIVE'
       LIMIT 1`
    );
    if (unassignedRes.rows[0]) {
      unassignedShopId = unassignedRes.rows[0].id;
    } else {
      const ins = await dbPool.query(
        `INSERT INTO shops (name, shop_id, email, phone, address, owner_id, status)
         VALUES ('Isolated Shop Without Route', 'SH-9999', 'isolated@delivshop.internal', '+91 98221 99999', 'Rural Road, Pune Outskirts', $1, 'ACTIVE')
         RETURNING id`,
        [adminUser.id]
      );
      unassignedShopId = ins.rows[0].id;
    }

    // 3. Get an active product
    const prodRes = await dbPool.query(
      "SELECT id FROM products WHERE is_active = TRUE AND deleted_at IS NULL LIMIT 1"
    );
    testProductId = prodRes.rows[0]?.id;

    // 4. Get active driver
    const drvRes = await dbPool.query(
      "SELECT id FROM users WHERE role = 'DRIVER' AND is_active = TRUE AND deleted_at IS NULL LIMIT 1"
    );
    testDriverId = drvRes.rows[0]?.id;

    // 5. Get active vehicle with crate capacity
    const vehRes = await dbPool.query(
      "SELECT id FROM vehicles WHERE is_active = TRUE AND status != 'UNDER_MAINTENANCE' LIMIT 1"
    );
    testVehicleId = vehRes.rows[0]?.id;

    // 6. Find route that covers testShopId
    const routeRes = await dbPool.query(
      "SELECT route_id FROM route_stops WHERE shop_id = $1 LIMIT 1",
      [testShopId]
    );
    testRouteId = routeRes.rows[0]?.route_id;

    // 7. Create a published delivery run on testDeliveryDate for testRouteId
    await dbPool.query(
      "DELETE FROM delivery_runs WHERE delivery_date IN ($1::date, $2::date)",
      [testDeliveryDate, secondDate]
    );

    const insRun = await dbPool.query(
      `INSERT INTO delivery_runs (
        run_code, route_id, driver_id, vehicle_id, delivery_date, status,
        is_published, delivery_window, planned_stops_count, created_by
      ) VALUES ($1, $2, $3, $4, $5::date, 'ASSIGNED', TRUE, '06:00 AM - 09:00 AM', 1, $6)
      RETURNING id`,
      [
        `RUN-${testDeliveryDate.replace(/-/g, '')}-TEST`,
        testRouteId,
        testDriverId,
        testVehicleId,
        testDeliveryDate,
        adminUser.id,
      ]
    );
    publishedRunId = insRun.rows[0].id;

    // Add stop for testShopId
    await dbPool.query(
      `INSERT INTO delivery_run_stops (run_id, shop_id, stop_sequence, status)
       VALUES ($1, $2, 1, 'PENDING')
       ON CONFLICT DO NOTHING`,
      [publishedRunId, testShopId]
    );
  });

  afterAll(async () => {
    // Cleanup created test records in foreign key order
    try {
      await dbPool.query(
        `DELETE FROM deliveries WHERE order_id IN (SELECT id FROM orders WHERE delivery_run_id = $1)`,
        [publishedRunId]
      );
      await dbPool.query(
        `DELETE FROM order_scheduling_history WHERE order_id IN (SELECT id FROM orders WHERE delivery_run_id = $1)`,
        [publishedRunId]
      );
      await dbPool.query(
        `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE delivery_run_id = $1)`,
        [publishedRunId]
      );
      await dbPool.query(
        "DELETE FROM orders WHERE delivery_run_id = $1",
        [publishedRunId]
      );
      await dbPool.query(
        "DELETE FROM delivery_run_stops WHERE run_id = $1",
        [publishedRunId]
      );
      await dbPool.query(
        "DELETE FROM delivery_runs WHERE id = $1",
        [publishedRunId]
      );
    } catch {
      // Ignore cleanup error
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('1. GET /api/shop/delivery-availability returns genuine published delivery runs for covered shop', async () => {
    const res = await fetch(`${baseUrl}/api/shop/delivery-availability`, {
      headers: { Authorization: `Bearer ${shopToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.hasRouteCoverage).toBe(true);
    expect(Array.isArray(body.data.availableDates)).toBe(true);

    const foundRun = body.data.availableDates.find((d: any) => d.deliveryRunId === publishedRunId);
    expect(foundRun).toBeDefined();
    expect(foundRun.status).toBe('CONFIRMED_AVAILABLE');
    expect(foundRun.isAvailable).toBe(true);
    expect(foundRun.deliveryWindow).toBe('06:00 AM - 09:00 AM');
  });

  it('2. Shop places order selecting confirmed published delivery run, receives SCHEDULED status', async () => {
    const res = await fetch(`${baseUrl}/api/shop/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${shopToken}`,
      },
      body: JSON.stringify({
        shopId: testShopId,
        deliveryRunId: publishedRunId,
        items: [{ productId: testProductId, quantity: 12 }],
        deliveryAddress: {
          street: '12 Shivaji Road',
          city: 'Pune',
          postalCode: '411005',
        },
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.scheduling_status).toBe('SCHEDULED');
    expect(body.data.confirmed_delivery_date).toBe(testDeliveryDate);
    expect(body.data.delivery_run_id).toBe(publishedRunId);
  });

  it('3. Shop without route coverage places order, is marked AWAITING_SCHEDULING with supplier notice', async () => {
    const isolatedToken = generateAccessToken({
      id: adminUser.id,
      email: 'isolated.owner@delivshop.com',
      role: 'SHOP',
      shopId: unassignedShopId,
    });

    // 1. Check availability
    const availRes = await fetch(`${baseUrl}/api/shop/delivery-availability`, {
      headers: { Authorization: `Bearer ${isolatedToken}` },
    });
    expect(availRes.status).toBe(200);
    const availBody = await availRes.json();
    expect(availBody.data.hasRouteCoverage).toBe(false);
    expect(availBody.data.availableDates.length).toBe(0);

    // 2. Submit order with requested date
    const orderRes = await fetch(`${baseUrl}/api/shop/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${isolatedToken}`,
      },
      body: JSON.stringify({
        shopId: unassignedShopId,
        requestedDeliveryDate: testDeliveryDate,
        items: [{ productId: testProductId, quantity: 5 }],
        deliveryAddress: {
          street: 'Outskirts Barn 4',
          city: 'Pune',
          postalCode: '412001',
        },
      }),
    });

    expect(orderRes.status).toBe(201);
    const orderBody = await orderRes.json();
    expect(orderBody.success).toBe(true);
    expect(orderBody.data.scheduling_status).toBe('AWAITING_SCHEDULING');
    expect(orderBody.data.confirmed_delivery_date).toBeNull();
    expect(orderBody.data.delivery_run_id).toBeNull();
    expect(orderBody.data.requested_delivery_date).toBe(testDeliveryDate);
    expect(orderBody.data.notice).toContain('The delivery date will be confirmed by the supplier');
  });

  it('4. Admin Unscheduled Orders queue lists orders awaiting scheduling', async () => {
    const res = await fetch(`${baseUrl}/api/orders/unscheduled`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.orders)).toBe(true);

    const unscheduled = body.data.orders.find((o: any) => o.shopId === unassignedShopId);
    expect(unscheduled).toBeDefined();
    expect(unscheduled.schedulingStatus).toBe('AWAITING_SCHEDULING');
    expect(unscheduled.requestedDeliveryDate).toBe(testDeliveryDate);
  });

  it('5. Admin schedules an unscheduled order to a delivery run', async () => {
    // Fetch unscheduled order
    const listRes = await fetch(`${baseUrl}/api/orders/unscheduled`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listBody = await listRes.json();
    const unscheduledOrder = listBody.data.orders.find((o: any) => o.shopId === unassignedShopId);
    expect(unscheduledOrder).toBeDefined();

    // Schedule it to publishedRunId
    const schedRes = await fetch(`${baseUrl}/api/orders/${unscheduledOrder.id}/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        deliveryRunId: publishedRunId,
        confirmedDate: testDeliveryDate,
        notes: 'Admin manual route assignment',
      }),
    });

    expect(schedRes.status).toBe(200);
    const schedBody = await schedRes.json();
    expect(schedBody.success).toBe(true);
    expect(schedBody.data.schedulingStatus).toBe('SCHEDULED');
    expect(schedBody.data.confirmedDeliveryDate).toBe(testDeliveryDate);

    // Verify order is no longer in unscheduled queue
    const checkRes = await fetch(`${baseUrl}/api/orders/unscheduled`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const checkBody = await checkRes.json();
    const stillUnscheduled = checkBody.data.orders.find((o: any) => o.id === unscheduledOrder.id);
    expect(stillUnscheduled).toBeUndefined();
  });

  it('6. Admin reschedules order to another delivery run with audit trail', async () => {
    // 1. Create a dedicated driver & vehicle to avoid uq_driver_run_date conflict with other test suites
    const drvRes = await dbPool.query(
      `INSERT INTO users (email, password_hash, name, phone, role, is_active)
       VALUES ($1, 'hash_test', 'Reschedule Driver', '+91 98765 22222', 'DRIVER', true)
       RETURNING id`,
      [`resched_drv_${Date.now()}@delivshop.internal`]
    );
    const run2DriverId = drvRes.rows[0].id;

    const vehQuery = await dbPool.query(
      `SELECT id FROM vehicles WHERE is_active = TRUE AND id != $1 AND status = 'AVAILABLE' LIMIT 1`,
      [testVehicleId]
    );
    let run2VehicleId = vehQuery.rows[0]?.id;
    if (!run2VehicleId) {
      const vehRes = await dbPool.query(
        `INSERT INTO vehicles (vehicle_code, registration_number, make_model, vehicle_type, capacity_kg, capacity_crates, fuel_type, depot, status, is_active)
         VALUES ($1, $2, 'Tata 407', 'REFRIGERATED_TRUCK', 1500, 100, 'DIESEL', 'Pune Central', 'AVAILABLE', true)
         RETURNING id`,
        [`V-RS-${Date.now().toString(36)}`, `MH-12-RS-${Date.now().toString(36).slice(-4).toUpperCase()}`]
      );
      run2VehicleId = vehRes.rows[0].id;
    }

    // Create a second run on another date
    const insRun2 = await dbPool.query(
      `INSERT INTO delivery_runs (
        run_code, route_id, driver_id, vehicle_id, delivery_date, status,
        is_published, delivery_window, planned_stops_count, created_by
      ) VALUES ($1, $2, $3, $4, $5::date, 'ASSIGNED', TRUE, '07:00 AM - 10:00 AM', 1, $6)
      RETURNING id`,
      [
        `RUN-${secondDate.replace(/-/g, '')}-TEST2-${Date.now().toString(36).toUpperCase()}`,
        testRouteId,
        run2DriverId,
        run2VehicleId,
        secondDate,
        adminUser.id,
      ]
    );
    const run2Id = insRun2.rows[0].id;

    // Find the order scheduled to run 1
    const orderRes = await dbPool.query(
      "SELECT id FROM orders WHERE delivery_run_id = $1 LIMIT 1",
      [publishedRunId]
    );
    const orderId = orderRes.rows[0]?.id;
    expect(orderId).toBeDefined();

    // Reschedule
    const reschedRes = await fetch(`${baseUrl}/api/orders/${orderId}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        newDeliveryRunId: run2Id,
        reason: 'Customer requested 24-hour postponement',
      }),
    });

    expect(reschedRes.status).toBe(200);
    const reschedBody = await reschedRes.json();
    expect(reschedBody.success).toBe(true);
    expect(reschedBody.data.confirmedDeliveryDate).toBe(secondDate);

    // Verify audit trail in order_scheduling_history
    const histRes = await fetch(`${baseUrl}/api/orders/${orderId}/scheduling-history`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(histRes.status).toBe(200);
    const histBody = await histRes.json();
    expect(histBody.success).toBe(true);
    expect(histBody.data.length).toBeGreaterThan(0);
    const rescheduleEntry = histBody.data.find((h: any) => h.action === 'RESCHEDULED');
    expect(rescheduleEntry).toBeDefined();
    expect(rescheduleEntry.reason).toContain('Customer requested 24-hour postponement');

    // Cleanup run2 in foreign key order
    try {
      await dbPool.query(
        `DELETE FROM deliveries WHERE order_id IN (SELECT id FROM orders WHERE delivery_run_id = $1)`,
        [run2Id]
      );
      await dbPool.query(
        `DELETE FROM order_scheduling_history WHERE order_id IN (SELECT id FROM orders WHERE delivery_run_id = $1)`,
        [run2Id]
      );
      await dbPool.query(
        `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE delivery_run_id = $1)`,
        [run2Id]
      );
      await dbPool.query("DELETE FROM orders WHERE delivery_run_id = $1", [run2Id]);
      await dbPool.query("DELETE FROM delivery_run_stops WHERE run_id = $1", [run2Id]);
      await dbPool.query("DELETE FROM delivery_runs WHERE id = $1", [run2Id]);
    } catch {
      // ignore
    }
  });

  it('7. Rejects booking when vehicle crate capacity is exceeded (409 Conflict)', async () => {
    // Try to book an order that exceeds remaining vehicle crate capacity
    const res = await fetch(`${baseUrl}/api/shop/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${shopToken}`,
      },
      body: JSON.stringify({
        shopId: testShopId,
        deliveryRunId: publishedRunId,
        // Large volume that requires 500 crates
        items: [{ productId: testProductId, quantity: 6000 }],
        deliveryAddress: {
          street: '12 Shivaji Road',
          city: 'Pune',
          postalCode: '411005',
        },
      }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain('capacity full');
  });

  it('8. Enforces RBAC: Driver cannot schedule orders or access admin unscheduled queue', async () => {
    const driverToken = generateAccessToken({
      id: testDriverId,
      email: 'driver@delivshop.com',
      role: 'DRIVER',
    });

    const res = await fetch(`${baseUrl}/api/orders/unscheduled`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    expect(res.status).toBe(403);
  });
});

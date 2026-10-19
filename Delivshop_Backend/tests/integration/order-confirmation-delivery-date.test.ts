import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/app.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { AuthUser } from '../../src/types/user.types.js';
import { dbPool } from '../../src/config/database.js';

describe('Delivery Date Display & Scheduling 8-Scenario Comprehensive Verification Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  const adminUser: AuthUser = {
    id: 'eff88d78-5b73-448f-8e41-330c46923b79',
    email: 'admin@delivshop.com',
    role: 'ADMIN',
  };
  const adminToken = generateAccessToken(adminUser);

  let testShopId: string;
  let testShopUser: AuthUser;
  let testShopToken: string;

  let isolatedShopId: string;
  let isolatedShopUser: AuthUser;
  let isolatedShopToken: string;

  let testRoute1Id: string;
  let testRoute2Id: string;
  let testDriverId: string;
  let testVehicleId: string;
  let testProductId: string;

  // Dates (Using day+5 and day+6 to avoid collision with other test suites)
  const today = new Date();
  const d1 = new Date(today);
  d1.setDate(d1.getDate() + 5);
  const dateStr1 = d1.toISOString().slice(0, 10);

  const d2 = new Date(today);
  d2.setDate(d2.getDate() + 6);
  const dateStr2 = d2.toISOString().slice(0, 10);

  async function createTestVehicle(): Promise<string> {
    const code = `VH-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const reg = `MH-12-SC-${Math.floor(1000 + Math.random() * 9000)}`;
    const ins = await dbPool.query(
      `INSERT INTO vehicles (vehicle_code, registration_number, make_model, vehicle_type, capacity_kg, capacity_crates, status, is_active, depot)
       VALUES ($1, $2, 'Tata Ace Gold', 'TEMPO', 1500, 100, 'AVAILABLE', true, 'Central Depot')
       RETURNING id`,
      [code, reg]
    );
    return ins.rows[0].id;
  }

  async function createTestDriver(): Promise<string> {
    const ins = await dbPool.query(
      `INSERT INTO users (email, password_hash, name, phone, role, is_active)
       VALUES ($1, 'hash_test', 'Driver ' || $2, '+91 98888 12345', 'DRIVER', true)
       RETURNING id`,
      [`driver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@delivshop.internal`, Math.floor(100 + Math.random() * 900)]
    );
    return ins.rows[0].id;
  }

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // 1. Setup Test Shop 1
    const s1 = await dbPool.query(
      `INSERT INTO shops (name, shop_id, email, phone, address, owner_id, status)
       VALUES ('Scenario Shop 1', 'SH-SCEN-1', 'scen1@delivshop.internal', '+91 91111 00001', '10 Market Rd', $1, 'ACTIVE')
       ON CONFLICT (shop_id) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, owner_id`,
      [adminUser.id]
    );
    testShopId = s1.rows[0].id;
    testShopUser = {
      id: s1.rows[0].owner_id || adminUser.id,
      email: 'scen1@delivshop.internal',
      role: 'SHOP',
      shopId: testShopId,
    };
    testShopToken = generateAccessToken(testShopUser);

    // 2. Setup Isolated Shop (No route coverage)
    const s2 = await dbPool.query(
      `INSERT INTO shops (name, shop_id, email, phone, address, owner_id, status)
       VALUES ('Isolated Scenario Shop', 'SH-SCEN-ISO', 'iso@delivshop.internal', '+91 91111 00002', 'Outskirts Farm', $1, 'ACTIVE')
       ON CONFLICT (shop_id) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, owner_id`,
      [adminUser.id]
    );
    isolatedShopId = s2.rows[0].id;
    isolatedShopUser = {
      id: s2.rows[0].owner_id || adminUser.id,
      email: 'iso@delivshop.internal',
      role: 'SHOP',
      shopId: isolatedShopId,
    };
    isolatedShopToken = generateAccessToken(isolatedShopUser);
    await dbPool.query('DELETE FROM route_stops WHERE shop_id = $1', [isolatedShopId]);

    // 3. Setup Routes
    const r1 = await dbPool.query(
      `INSERT INTO routes (route_code, name, description, city, status)
       VALUES ('RT-SCEN-1', 'Central Market Route', 'Main route', 'Pune', 'ACTIVE')
       ON CONFLICT (route_code) DO UPDATE SET status = 'ACTIVE'
       RETURNING id`
    );
    testRoute1Id = r1.rows[0].id;

    const r2 = await dbPool.query(
      `INSERT INTO routes (route_code, name, description, city, status)
       VALUES ('RT-SCEN-2', 'Eastern Highway Route', 'Eastern route', 'Pune', 'ACTIVE')
       ON CONFLICT (route_code) DO UPDATE SET status = 'ACTIVE'
       RETURNING id`
    );
    testRoute2Id = r2.rows[0].id;

    // Attach testShop1 to route 1
    await dbPool.query(
      `INSERT INTO route_stops (route_id, shop_id, stop_sequence)
       VALUES ($1, $2, 1)
       ON CONFLICT DO NOTHING`,
      [testRoute1Id, testShopId]
    );

    // 4. Setup Driver & Vehicle
    const dRes = await dbPool.query(
      `INSERT INTO users (email, password_hash, name, phone, role, is_active)
       VALUES ($1, 'hash_test', 'Suresh Logistics Driver', '+91 98888 12345', 'DRIVER', true)
       RETURNING id`,
      [`driver_scen_${Date.now()}@delivshop.internal`]
    );
    testDriverId = dRes.rows[0].id;

    // 5. Setup Product
    const pRes = await dbPool.query(`SELECT id FROM products WHERE is_active = true LIMIT 1`);
    testProductId = pRes.rows[0].id;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // SCENARIO 1: Assigned route, assigned driver, and confirmed delivery date (Case 1)
  it('Scenario 1: Order with assigned route, assigned driver, and confirmed delivery date displays actual date (Case 1)', async () => {
    // 1. Create a published run for testRoute1 with driver and dateStr1
    const vehicleId1 = await createTestVehicle();
    const runRes = await dbPool.query(
      `INSERT INTO delivery_runs (
        run_code, route_id, driver_id, vehicle_id, delivery_date, status,
        is_published, delivery_window, planned_stops_count, created_by
      ) VALUES ($1, $2, $3, $4, $5::date, 'ASSIGNED', TRUE, '06:00 AM - 09:00 AM', 1, $6)
      RETURNING id`,
      [`RUN-SCEN-1-${Date.now().toString(36).toUpperCase()}`, testRoute1Id, testDriverId, vehicleId1, dateStr1, adminUser.id]
    );
    const runId = runRes.rows[0].id;

    // Verify delivery-availability API returns Case 1
    const availRes = await fetch(`${baseUrl}/api/shop/delivery-availability`, {
      headers: { Authorization: `Bearer ${testShopToken}` },
    });
    expect(availRes.status).toBe(200);
    const availBody = await availRes.json();
    expect(availBody.data.schedulingCase).toBe('CASE_1');
    expect(availBody.data.schedulingTitle).toBe('Scheduled Delivery');
    expect(availBody.data.deliveryStatus).toBe('Scheduled');
    expect(availBody.data.scheduledDeliveryDate).toBe(dateStr1);

    // Place order selecting this published run
    const orderRes = await fetch(`${baseUrl}/api/shop/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testShopToken}`,
      },
      body: JSON.stringify({
        shopId: testShopId,
        deliveryRunId: runId,
        items: [{ productId: testProductId, quantity: 10 }],
        deliveryAddress: { street: '10 Market Rd', city: 'Pune', postalCode: '411001' },
      }),
    });
    expect(orderRes.status).toBe(201);
    const orderBody = await orderRes.json();
    const order = orderBody.data;

    expect(order.scheduling_case).toBe('CASE_1');
    expect(order.scheduling_title).toBe('Scheduled Delivery');
    expect(order.delivery_status).toBe('Scheduled');
    expect(order.confirmed_delivery_date).toBe(dateStr1);
    expect(order.scheduling_message).toBeNull();
  });

  // SCENARIO 2: No assigned route (Case 2)
  it('Scenario 2: Order with no assigned route displays Case 2 pending message', async () => {
    // Verify delivery-availability API for isolated shop
    const availRes = await fetch(`${baseUrl}/api/shop/delivery-availability`, {
      headers: { Authorization: `Bearer ${isolatedShopToken}` },
    });
    expect(availRes.status).toBe(200);
    const availBody = await availRes.json();
    expect(availBody.data.schedulingCase).toBe('CASE_2');
    expect(availBody.data.schedulingTitle).toBe('Delivery Scheduling');
    expect(availBody.data.schedulingMessage).toBe('Your delivery date will be confirmed after the supplier assigns a delivery route.');
    expect(availBody.data.scheduledDeliveryDate).toBeNull();

    // Place order
    const orderRes = await fetch(`${baseUrl}/api/shop/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${isolatedShopToken}`,
      },
      body: JSON.stringify({
        shopId: isolatedShopId,
        items: [{ productId: testProductId, quantity: 5 }],
        deliveryAddress: { street: 'Outskirts Farm', city: 'Pune', postalCode: '412001' },
      }),
    });
    expect(orderRes.status).toBe(201);
    const orderBody = await orderRes.json();
    const order = orderBody.data;

    expect(order.scheduling_case).toBe('CASE_2');
    expect(order.scheduling_title).toBe('Delivery Scheduling');
    expect(order.scheduling_message).toBe('Your delivery date will be confirmed after the supplier assigns a delivery route.');
    expect(order.confirmed_delivery_date).toBeNull();
  });

  // SCENARIO 3: Route assigned but delivery date missing (Case 3)
  it('Scenario 3: Order with route assigned but delivery date missing displays Case 3 message', async () => {
    // Create new route with shop attached, but NO delivery runs
    const r3 = await dbPool.query(
      `INSERT INTO routes (route_code, name, city, status)
       VALUES ('RT-SCEN-3', 'No Run Route', 'Pune', 'ACTIVE')
       ON CONFLICT (route_code) DO UPDATE SET status = 'ACTIVE'
       RETURNING id`
    );
    const route3Id = r3.rows[0].id;

    // Create a new shop on Route 3
    const s3 = await dbPool.query(
      `INSERT INTO shops (name, shop_id, email, phone, address, owner_id, status)
       VALUES ('Route 3 Shop', 'SH-SCEN-3', 'scen3@delivshop.internal', '+91 91111 00003', 'R3 Barn', $1, 'ACTIVE')
       ON CONFLICT (shop_id) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, owner_id`,
      [adminUser.id]
    );
    const shop3Id = s3.rows[0].id;
    const shop3Token = generateAccessToken({
      id: s3.rows[0].owner_id || adminUser.id,
      email: 'scen3@delivshop.internal',
      role: 'SHOP',
      shopId: shop3Id,
    });

    await dbPool.query(
      `INSERT INTO route_stops (route_id, shop_id, stop_sequence) VALUES ($1, $2, 1) ON CONFLICT DO NOTHING`,
      [route3Id, shop3Id]
    );

    // Verify delivery-availability API returns Case 3
    const availRes = await fetch(`${baseUrl}/api/shop/delivery-availability`, {
      headers: { Authorization: `Bearer ${shop3Token}` },
    });
    expect(availRes.status).toBe(200);
    const availBody = await availRes.json();
    expect(availBody.data.schedulingCase).toBe('CASE_3');
    expect(availBody.data.schedulingTitle).toBe('Delivery Scheduling');
    expect(availBody.data.schedulingMessage).toBe('Your delivery date is not confirmed yet.');
    expect(availBody.data.scheduledDeliveryDate).toBeNull();

    // Place order
    const orderRes = await fetch(`${baseUrl}/api/shop/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${shop3Token}`,
      },
      body: JSON.stringify({
        shopId: shop3Id,
        items: [{ productId: testProductId, quantity: 8 }],
        deliveryAddress: { street: 'R3 Barn', city: 'Pune', postalCode: '411005' },
      }),
    });
    expect(orderRes.status).toBe(201);
    const orderBody = await orderRes.json();
    const order = orderBody.data;

    expect(order.scheduling_case).toBe('CASE_3');
    expect(order.scheduling_title).toBe('Delivery Scheduling');
    expect(order.scheduling_message).toBe('Your delivery date is not confirmed yet.');
    expect(order.confirmed_delivery_date).toBeNull();
  });

  // SCENARIO 4: Route assigned but driver missing / unassigned (Case 4)
  it('Scenario 4: Route exists and has delivery date, but driver assignment is incomplete (Case 4)', async () => {
    // Create new route with run having a date, but driver is null or inactive
    const r4 = await dbPool.query(
      `INSERT INTO routes (route_code, name, city, status)
       VALUES ('RT-SCEN-4', 'Driver Missing Route', 'Pune', 'ACTIVE')
       ON CONFLICT (route_code) DO UPDATE SET status = 'ACTIVE'
       RETURNING id`
    );
    const route4Id = r4.rows[0].id;

    // Create inactive driver
    const inactDriver = await dbPool.query(
      `INSERT INTO users (email, password_hash, name, phone, role, is_active)
       VALUES ($1, 'hash_test', 'Inactive Driver', '+91 97777 00000', 'DRIVER', false)
       RETURNING id`,
      [`inactive_${Date.now()}@delivshop.internal`]
    );
    const inactiveDriverId = inactDriver.rows[0].id;

    const vehicleId4 = await createTestVehicle();
    // Run with inactive driver
    await dbPool.query(
      `INSERT INTO delivery_runs (
        run_code, route_id, driver_id, vehicle_id, delivery_date, status,
        is_published, delivery_window, planned_stops_count, created_by
      ) VALUES ($1, $2, $3, $4, $5::date, 'ASSIGNED', TRUE, '06:00 AM - 09:00 AM', 1, $6)`,
      [`RUN-SCEN-4-${Date.now().toString(36).toUpperCase()}`, route4Id, inactiveDriverId, vehicleId4, dateStr1, adminUser.id]
    );

    // Create Shop on Route 4
    const s4 = await dbPool.query(
      `INSERT INTO shops (name, shop_id, email, phone, address, owner_id, status)
       VALUES ('Route 4 Shop', 'SH-SCEN-4', 'scen4@delivshop.internal', '+91 91111 00004', 'R4 Barn', $1, 'ACTIVE')
       ON CONFLICT (shop_id) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, owner_id`,
      [adminUser.id]
    );
    const shop4Id = s4.rows[0].id;
    const shop4Token = generateAccessToken({
      id: s4.rows[0].owner_id || adminUser.id,
      email: 'scen4@delivshop.internal',
      role: 'SHOP',
      shopId: shop4Id,
    });
    await dbPool.query(
      `INSERT INTO route_stops (route_id, shop_id, stop_sequence) VALUES ($1, $2, 1) ON CONFLICT DO NOTHING`,
      [route4Id, shop4Id]
    );

    const availRes = await fetch(`${baseUrl}/api/shop/delivery-availability`, {
      headers: { Authorization: `Bearer ${shop4Token}` },
    });
    expect(availRes.status).toBe(200);
    const availBody = await availRes.json();
    expect(availBody.data.schedulingCase).toBe('CASE_4');
    expect(availBody.data.schedulingTitle).toBe('Delivery Scheduling');
    expect(availBody.data.schedulingMessage).toBe('Your delivery date is not confirmed yet.');
    expect(availBody.data.scheduledDeliveryDate).toBeNull();
  });

  // SCENARIO 5: Order receives route assignment after creation
  it('Scenario 5: Order receives route assignment after it was created (transitions from Case 2 -> Case 3 -> Case 1)', async () => {
    // 1. Isolated shop creates order without route (Case 2)
    const createRes = await fetch(`${baseUrl}/api/shop/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${isolatedShopToken}`,
      },
      body: JSON.stringify({
        shopId: isolatedShopId,
        items: [{ productId: testProductId, quantity: 4 }],
        deliveryAddress: { street: 'Post-Assign Lane', city: 'Pune', postalCode: '411030' },
      }),
    });
    expect(createRes.status).toBe(201);
    const order = (await createRes.json()).data;
    const orderId = order.id;
    expect(order.scheduling_case).toBe('CASE_2');

    // 2. Admin assigns Route 2 to the order
    const assignRes = await fetch(`${baseUrl}/api/orders/${orderId}/assign-route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ routeId: testRoute2Id }),
    });
    expect(assignRes.status).toBe(200);

    // 3. Shop checks order: now Route assigned, but delivery date not confirmed -> Case 3
    const check1 = await fetch(`${baseUrl}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${isolatedShopToken}` },
    });
    const orderAfterRoute = (await check1.json()).data;
    expect(orderAfterRoute.scheduling_case).toBe('CASE_3');
    expect(orderAfterRoute.scheduling_title).toBe('Delivery Scheduling');
    expect(orderAfterRoute.scheduling_message).toBe('Your delivery date is not confirmed yet.');
    expect(orderAfterRoute.confirmed_delivery_date).toBeNull();

    // 4. Create published run on Route 2 with driver and schedule the order
    const vehicleId5 = await createTestVehicle();
    const r2Run = await dbPool.query(
      `INSERT INTO delivery_runs (
        run_code, route_id, driver_id, vehicle_id, delivery_date, status,
        is_published, delivery_window, planned_stops_count, created_by
      ) VALUES ($1, $2, $3, $4, $5::date, 'ASSIGNED', TRUE, '06:00 AM - 09:00 AM', 1, $6)
      RETURNING id`,
      [`RUN-SCEN-5-${Date.now().toString(36).toUpperCase()}`, testRoute2Id, testDriverId, vehicleId5, dateStr2, adminUser.id]
    );
    const run2Id = r2Run.rows[0].id;

    const schedRes = await fetch(`${baseUrl}/api/orders/${orderId}/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ deliveryRunId: run2Id }),
    });
    expect(schedRes.status).toBe(200);

    // 5. Shop checks order again: now Case 1 (Scheduled Delivery with dateStr2)
    const check2 = await fetch(`${baseUrl}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${isolatedShopToken}` },
    });
    const orderFinal = (await check2.json()).data;
    expect(orderFinal.scheduling_case).toBe('CASE_1');
    expect(orderFinal.scheduling_title).toBe('Scheduled Delivery');
    expect(orderFinal.delivery_status).toBe('Scheduled');
    expect(orderFinal.confirmed_delivery_date).toBe(dateStr2);
  });

  // SCENARIO 6: Route whose delivery date is subsequently changed
  it('Scenario 6: Route whose delivery date is subsequently changed updates dynamically for shop', async () => {
    // Create run with dateStr1
    const vehicleId6 = await createTestVehicle();
    const driverId6 = await createTestDriver();
    const runRes = await dbPool.query(
      `INSERT INTO delivery_runs (
        run_code, route_id, driver_id, vehicle_id, delivery_date, status,
        is_published, delivery_window, planned_stops_count, created_by
      ) VALUES ($1, $2, $3, $4, $5::date, 'ASSIGNED', TRUE, '06:00 AM - 09:00 AM', 1, $6)
      RETURNING id`,
      [`RUN-SCEN-6-${Date.now().toString(36).toUpperCase()}`, testRoute1Id, driverId6, vehicleId6, dateStr1, adminUser.id]
    );
    const runId = runRes.rows[0].id;

    // Place order
    const orderRes = await fetch(`${baseUrl}/api/shop/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testShopToken}`,
      },
      body: JSON.stringify({
        shopId: testShopId,
        deliveryRunId: runId,
        items: [{ productId: testProductId, quantity: 6 }],
        deliveryAddress: { street: '10 Market Rd', city: 'Pune', postalCode: '411001' },
      }),
    });
    const order = (await orderRes.json()).data;
    expect(order.confirmed_delivery_date).toBe(dateStr1);

    // Supplier changes the run's delivery date to dateStr2
    await dbPool.query(`UPDATE delivery_runs SET delivery_date = $1::date WHERE id = $2`, [dateStr2, runId]);

    // Shop refreshes/re-fetches order
    const refreshRes = await fetch(`${baseUrl}/api/orders/${order.id}`, {
      headers: { Authorization: `Bearer ${testShopToken}` },
    });
    const refreshedOrder = (await refreshRes.json()).data;
    expect(refreshedOrder.confirmed_delivery_date).toBe(dateStr2);
    expect(refreshedOrder.scheduling_case).toBe('CASE_1');
  });

  // SCENARIO 7: Order associated with a cancelled or unpublished route/run
  it('Scenario 7: Order associated with a cancelled run safely hides date and reverts to pending', async () => {
    const vehicleId7 = await createTestVehicle();
    const driverId7 = await createTestDriver();
    const runRes = await dbPool.query(
      `INSERT INTO delivery_runs (
        run_code, route_id, driver_id, vehicle_id, delivery_date, status,
        is_published, delivery_window, planned_stops_count, created_by
      ) VALUES ($1, $2, $3, $4, $5::date, 'ASSIGNED', TRUE, '06:00 AM - 09:00 AM', 1, $6)
      RETURNING id`,
      [`RUN-SCEN-7-${Date.now().toString(36).toUpperCase()}`, testRoute1Id, driverId7, vehicleId7, dateStr1, adminUser.id]
    );
    const runId = runRes.rows[0].id;

    // Place order
    const orderRes = await fetch(`${baseUrl}/api/shop/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testShopToken}`,
      },
      body: JSON.stringify({
        shopId: testShopId,
        deliveryRunId: runId,
        items: [{ productId: testProductId, quantity: 3 }],
        deliveryAddress: { street: '10 Market Rd', city: 'Pune', postalCode: '411001' },
      }),
    });
    const order = (await orderRes.json()).data;
    expect(order.confirmed_delivery_date).toBe(dateStr1);

    // Supplier cancels the run
    await dbPool.query(`UPDATE delivery_runs SET status = 'CANCELLED' WHERE id = $1`, [runId]);

    // Shop views order: date is hidden safely, reverts to Case 3
    const checkRes = await fetch(`${baseUrl}/api/orders/${order.id}`, {
      headers: { Authorization: `Bearer ${testShopToken}` },
    });
    const updated = (await checkRes.json()).data;
    expect(updated.confirmed_delivery_date).toBeNull();
    expect(updated.scheduling_case).toBe('CASE_3');
    expect(updated.scheduling_title).toBe('Delivery Scheduling');
    expect(updated.scheduling_message).toBe('Your delivery date is not confirmed yet.');
  });

  // SCENARIO 8: Multiple orders assigned to different routes
  it('Scenario 8: Multiple orders assigned to different routes maintain distinct scheduling state without crosstalk', async () => {
    // Order 1 on Route 1 (Published Run with dateStr1)
    const vehicleId8A = await createTestVehicle();
    const driverId8A = await createTestDriver();
    const run1 = await dbPool.query(
      `INSERT INTO delivery_runs (
        run_code, route_id, driver_id, vehicle_id, delivery_date, status,
        is_published, delivery_window, planned_stops_count, created_by
      ) VALUES ($1, $2, $3, $4, $5::date, 'ASSIGNED', TRUE, '06:00 AM - 09:00 AM', 1, $6)
      RETURNING id`,
      [`RUN-SCEN-8A-${Date.now().toString(36).toUpperCase()}`, testRoute1Id, driverId8A, vehicleId8A, dateStr1, adminUser.id]
    );

    const o1Res = await fetch(`${baseUrl}/api/shop/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testShopToken}`,
      },
      body: JSON.stringify({
        shopId: testShopId,
        deliveryRunId: run1.rows[0].id,
        items: [{ productId: testProductId, quantity: 2 }],
        deliveryAddress: { street: 'Route 1 Stop', city: 'Pune', postalCode: '411001' },
      }),
    });
    const o1 = (await o1Res.json()).data;

    // Order 2 on Route 2 (Published Run with dateStr2)
    await dbPool.query(
      `INSERT INTO route_stops (route_id, shop_id, stop_sequence) VALUES ($1, $2, 2) ON CONFLICT DO NOTHING`,
      [testRoute2Id, testShopId]
    );
    const vehicleId8B = await createTestVehicle();
    const driverId8B = await createTestDriver();
    const run2 = await dbPool.query(
      `INSERT INTO delivery_runs (
        run_code, route_id, driver_id, vehicle_id, delivery_date, status,
        is_published, delivery_window, planned_stops_count, created_by
      ) VALUES ($1, $2, $3, $4, $5::date, 'ASSIGNED', TRUE, '07:00 AM - 10:00 AM', 1, $6)
      RETURNING id`,
      [`RUN-SCEN-8B-${Date.now().toString(36).toUpperCase()}`, testRoute2Id, driverId8B, vehicleId8B, dateStr2, adminUser.id]
    );

    const o2Res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        shopId: testShopId,
        deliveryRunId: run2.rows[0].id,
        items: [{ productId: testProductId, quantity: 5 }],
        deliveryAddress: { street: 'Route 2 Stop', city: 'Pune', postalCode: '411002' },
      }),
    });
    const o2 = (await o2Res.json()).data;

    // Fetch both via Shop API
    const check1 = await (await fetch(`${baseUrl}/api/orders/${o1.id}`, { headers: { Authorization: `Bearer ${testShopToken}` } })).json();
    const check2 = await (await fetch(`${baseUrl}/api/orders/${o2.id}`, { headers: { Authorization: `Bearer ${testShopToken}` } })).json();

    expect(check1.data.confirmed_delivery_date).toBe(dateStr1);
    expect(check1.data.scheduling_case).toBe('CASE_1');

    expect(check2.data.confirmed_delivery_date).toBe(dateStr2);
    expect(check2.data.scheduling_case).toBe('CASE_1');
  });
});

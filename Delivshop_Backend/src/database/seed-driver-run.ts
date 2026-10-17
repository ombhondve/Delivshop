import { dbPool } from '../config/database.js';
import { hashPassword } from '../utils/password.js';

async function seedDriverRun() {
  console.log('Seeding driver test environment...');
  
  // 1. Ensure driver Ramesh Kumar exists with known password
  const driverRes = await dbPool.query(
    "SELECT id, name, employee_id FROM users WHERE employee_id = 'EMP-DRV-1001'"
  );
  if (!driverRes.rows[0]) {
    console.error('Driver EMP-DRV-1001 not found');
    return;
  }
  const driver = driverRes.rows[0];
  const pwdHash = await hashPassword('Driver@123');
  await dbPool.query(
    "UPDATE users SET password_hash = $1, is_active = TRUE WHERE id = $2",
    [pwdHash, driver.id]
  );
  console.log(`✅ Driver ${driver.name} (EMP-DRV-1001) password set to: Driver@123`);

  // 2. Fetch vehicle & route & shops
  const vehRes = await dbPool.query(
    "SELECT id, vehicle_code, registration_number FROM vehicles WHERE is_active = TRUE ORDER BY created_at ASC LIMIT 1"
  );
  const vehicle = vehRes.rows[0];

  const routeRes = await dbPool.query(
    "SELECT id, route_code, name FROM routes WHERE status = 'ACTIVE' ORDER BY created_at ASC LIMIT 1"
  );
  const route = routeRes.rows[0];

  const shopsRes = await dbPool.query(
    "SELECT id, name, address, latitude, longitude FROM shops WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 3"
  );
  const shops = shopsRes.rows;

  if (!vehicle || !route || shops.length === 0) {
    console.error('Missing vehicle, route, or shops');
    return;
  }

  // 3. Ensure an active run for today or recent
  const today = new Date().toISOString().split('T')[0];
  let runRes = await dbPool.query(
    `SELECT id, run_code, status FROM delivery_runs 
     WHERE driver_id = $1 AND status NOT IN ('COMPLETED', 'CANCELLED') 
     ORDER BY created_at DESC LIMIT 1`,
    [driver.id]
  );

  let runId = runRes.rows[0]?.id;

  if (!runId) {
    const runCode = `RUN-${today.replace(/-/g, '')}-01`;
    const newRun = await dbPool.query(
      `INSERT INTO delivery_runs (
         run_code, route_id, driver_id, vehicle_id, delivery_date,
         status, planned_stops_count, completed_stops_count, notes
       ) VALUES ($1, $2, $3, $4, CURRENT_DATE, 'IN_PROGRESS', $5, 0, 'Morning Dairy Distribution Run')
       RETURNING id, run_code, status`,
      [runCode, route.id, driver.id, vehicle.id, shops.length]
    );
    runId = newRun.rows[0].id;
    console.log(`✅ Created active delivery run: ${runCode}`);
  } else {
    // Make sure status is IN_PROGRESS
    await dbPool.query(
      "UPDATE delivery_runs SET status = 'IN_PROGRESS', planned_stops_count = $1 WHERE id = $2",
      [shops.length, runId]
    );
    console.log(`✅ Using existing active run: ${runRes.rows[0].run_code}`);
  }

  // 4. Populate delivery_run_stops if missing
  const existingStops = await dbPool.query(
    "SELECT COUNT(*)::int as count FROM delivery_run_stops WHERE run_id = $1",
    [runId]
  );

  if (existingStops.rows[0].count === 0) {
    for (let i = 0; i < shops.length; i++) {
      const s = shops[i];
      await dbPool.query(
        `INSERT INTO delivery_run_stops (
           run_id, shop_id, stop_sequence, status, notes
         ) VALUES ($1, $2, $3, 'PENDING', $4)`,
        [
          runId,
          s.id,
          i + 1,
          `Deliver fresh crates to ${s.name}. Collect signature and empties.`,
        ]
      );
    }
    console.log(`✅ Inserted ${shops.length} stops for run`);
  }

  // 5. Ensure an active delivery order assigned to driver
  const orderRes = await dbPool.query(
    `SELECT o.id, o.order_number, d.id as delivery_id 
     FROM orders o 
     JOIN deliveries d ON o.id = d.order_id 
     WHERE d.driver_id = $1 AND d.status NOT IN ('DELIVERED', 'FAILED', 'CANCELLED')
     LIMIT 1`,
    [driver.id]
  );

  if (!orderRes.rows[0]) {
    // Check if there is an unassigned delivery
    const unassigned = await dbPool.query(
      `SELECT d.id, d.order_id FROM deliveries d WHERE d.driver_id IS NULL LIMIT 1`
    );
    if (unassigned.rows[0]) {
      await dbPool.query(
        "UPDATE deliveries SET driver_id = $1, status = 'ACCEPTED' WHERE id = $2",
        [driver.id, unassigned.rows[0].id]
      );
      console.log(`✅ Assigned order delivery ${unassigned.rows[0].id} to driver`);
    } else {
      // Create sample order + delivery
      const productsRes = await dbPool.query("SELECT id, name, price FROM products LIMIT 2");
      const sampleShop = shops[0];
      const orderNum = `ORD-${Date.now().toString().slice(-6)}`;
      
      const newOrder = await dbPool.query(
        `INSERT INTO orders (order_number, shop_id, total, status, delivery_address)
         VALUES ($1, $2, 1850.00, 'CONFIRMED', '{"street": "Camp Central", "city": "Pune"}')
         RETURNING id`,
        [orderNum, sampleShop.id]
      );
      const oId = newOrder.rows[0].id;

      for (const p of productsRes.rows) {
        await dbPool.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
           VALUES ($1, $2, 20, $3, $4)`,
          [oId, p.id, p.price || 45.0, (p.price || 45.0) * 20]
        );
      }

      await dbPool.query(
        `INSERT INTO deliveries (order_id, driver_id, status)
         VALUES ($1, $2, 'ACCEPTED')`,
        [oId, driver.id]
      );
      console.log(`✅ Created test delivery order ${orderNum} for driver`);
    }
  }

  // 6. Ensure driver attendance check-in for today
  const attRes = await dbPool.query(
    "SELECT id, check_in_time, check_out_time FROM driver_attendance WHERE driver_id = $1 AND attendance_date = CURRENT_DATE",
    [driver.id]
  );
  if (!attRes.rows[0]) {
    await dbPool.query(
      `INSERT INTO driver_attendance (driver_id, attendance_date, check_in_time, status, notes)
       VALUES ($1, CURRENT_DATE, NOW() - INTERVAL '2 hours', 'PRESENT', 'Morning Shift Check-in')`,
      [driver.id]
    );
    console.log('✅ Driver attendance checked in for today');
  } else if (attRes.rows[0].check_out_time) {
    // Reset check out so shift is active for testing
    await dbPool.query(
      "UPDATE driver_attendance SET check_out_time = NULL WHERE id = $1",
      [attRes.rows[0].id]
    );
    console.log('✅ Re-opened driver shift attendance');
  }

  console.log('🎉 Driver environment ready!');
  await dbPool.end();
}

seedDriverRun().catch(console.error);

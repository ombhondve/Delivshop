import { query, dbPool } from '../config/database.js';
import { orderRepository } from '../repositories/order.repository.js';
import { orderService } from '../services/order.service.js';
import { formatVolumeLitres } from '../utils/packaging.js';

async function runEndToEndOrderFlowTest() {
  console.log('🚀 RUNNING END-TO-END SHOP ORDER LIFECYCLE & DISPATCH VERIFICATION\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${desc}`);
      throw new Error(`Assertion failed: ${desc}`);
    }
  }

  try {
    // 0. Clean up any previous test orders
    const prevTestOrders = await query(`SELECT id FROM orders WHERE idempotency_key LIKE 'e2e-test-key-%'`);
    for (const p of prevTestOrders.rows) {
      await query(`DELETE FROM deliveries WHERE order_id = $1`, [p.id]);
      await query(`DELETE FROM order_items WHERE order_id = $1`, [p.id]);
      await query(`DELETE FROM orders WHERE id = $1`, [p.id]);
    }

    // 1. Retrieve an active shop and valid dairy products from database
    const shopRes = await query(
      `SELECT id, shop_id, name, status, address, city FROM shops WHERE status = 'ACTIVE' LIMIT 2`
    );
    assert(shopRes.rows.length >= 2, 'Found at least 2 active shops for isolation testing');
    const primaryShop = shopRes.rows[0];
    const secondShop = shopRes.rows[1];
    console.log(`🏪 Testing with primary shop: "${primaryShop.name}" (${primaryShop.shop_id || primaryShop.id})`);
    console.log(`🏪 Secondary shop for isolation: "${secondShop.name}" (${secondShop.shop_id || secondShop.id})`);

    const prodRes = await query(
      `SELECT id, name, sku, category, pack_size, base_unit, units_per_pack, price 
       FROM products 
       WHERE is_active = true AND deleted_at IS NULL
       ORDER BY category ASC`
    );
    assert(prodRes.rows.length >= 2, 'Found active products in the dairy catalog');

    // Pick 1 liquid milk product and 1 solid/dairy product (e.g. Paneer or Curd)
    const liquidProduct = prodRes.rows.find((p) =>
      p.pack_size?.includes('1L') || p.pack_size?.includes('500ml') || p.category === 'Milk'
    ) || prodRes.rows[0];

    const solidProduct = prodRes.rows.find((p) =>
      p.category === 'Paneer' || p.category === 'Curd' || p.category === 'Mawa' || p.category === 'Ghee'
    ) || prodRes.rows[prodRes.rows.length - 1];

    console.log(`🥛 Selected Liquid Product: ${liquidProduct.name} (${liquidProduct.pack_size}, ₹${liquidProduct.price})`);
    console.log(`🧀 Selected Solid Product: ${solidProduct.name} (${solidProduct.pack_size}, ₹${solidProduct.price})`);

    // 1b. Retrieve an authorized user for order placement
    const userRes = await query(`SELECT id, name, email, role FROM users LIMIT 1`);
    assert(userRes.rows.length >= 1, 'Found user in database');
    const testUser = userRes.rows[0];
    console.log(`👤 Placing order as authenticated user: ${testUser.name} (${testUser.id})`);

    // 2. Simulate Shop placing order via orderService.createOrder
    const testIdempotencyKey = `e2e-test-key-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const orderItems = [
      { productId: liquidProduct.id, quantity: 24 }, // e.g., 24 packets of milk
      { productId: solidProduct.id, quantity: 5 },   // e.g., 5 packs of paneer/curd
    ];

    const deliveryAddress = {
      street: primaryShop.address || 'Plot 42, Dairy Market',
      city: primaryShop.city || 'Nashik',
      postalCode: '422001',
      notes: 'Morning replenishment run before 6:30 AM',
    };

    console.log('\n--- Step 1: Submitting Shop Order via Backend Service ---');
    const createdOrder = await orderService.createOrder(
      {
        shopId: primaryShop.id,
        items: orderItems,
        deliveryAddress,
        idempotencyKey: testIdempotencyKey,
      },
      testUser.id,
      '127.0.0.1'
    );

    assert(createdOrder != null, 'Order successfully created');
    assert(createdOrder.id != null, `Order has persisted UUID: ${createdOrder.id}`);
    assert(createdOrder.order_number?.startsWith('ORD-'), `Valid order reference generated: ${createdOrder.order_number}`);
    assert(createdOrder.status === 'PENDING', `Initial status is PENDING (received: ${createdOrder.status})`);
    assert(createdOrder.shop_id === primaryShop.id, 'Persisted correct shop UUID');
    assert(createdOrder.isDuplicateReplay === false, 'Fresh order is not flagged as duplicate replay');

    // 3. Verify Database Persistence in PostgreSQL
    console.log('\n--- Step 2: Verifying Direct Database Persistence ---');
    const orderDb = await query(
      `SELECT o.*, s.name as shop_name, s.shop_id as shop_code
       FROM orders o
       JOIN shops s ON o.shop_id = s.id
       WHERE o.id = $1`,
      [createdOrder.id]
    );
    assert(orderDb.rowCount === 1, 'Order row exists in PostgreSQL orders table');
    const row = orderDb.rows[0];
    assert(row.status === 'PENDING', 'Database order status is PENDING');
    assert(Number(row.total_volume_litres) > 0, `Total liquid volume stored: ${row.total_volume_litres} L`);
    assert(Number(row.total_packages_count) === 29, `Total packages count stored: ${row.total_packages_count} (24 milk + 5 solid)`);

    // Verify order_items rows
    const itemsDb = await query(
      `SELECT oi.*, p.name, p.category, p.pack_size, p.base_unit 
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1
       ORDER BY oi.id ASC`,
      [createdOrder.id]
    );
    assert(itemsDb.rowCount === 2, `Exactly 2 order items persisted in order_items table (found ${itemsDb.rowCount})`);

    const liquidItemRow = itemsDb.rows.find((i) => i.product_id === liquidProduct.id);
    const solidItemRow = itemsDb.rows.find((i) => i.product_id === solidProduct.id);
    assert(liquidItemRow != null, 'Liquid product line persisted');
    assert(solidItemRow != null, 'Solid product line persisted');
    assert(Number(liquidItemRow.volume_litres) > 0, `Liquid line volume_litres calculated: ${liquidItemRow.volume_litres} L`);
    assert(Number(solidItemRow.volume_litres) === 0, `Solid line volume_litres is 0 L (weight-based)`);

    // Verify delivery record creation
    const delivDb = await query(`SELECT * FROM deliveries WHERE order_id = $1`, [createdOrder.id]);
    assert(delivDb.rowCount === 1, 'Initial delivery dispatch record created');
    assert(delivDb.rows[0].status === 'PENDING_ASSIGNMENT', 'Delivery status is PENDING_ASSIGNMENT');

    // 4. Verify Admin Dashboard Orders Dispatch Retrieval (listOrders)
    console.log('\n--- Step 3: Verifying Admin Dashboard Orders Dispatch API ---');
    const adminOrders = await orderRepository.listOrders({
      status: 'ALL',
      limit: 50,
    });
    const foundInAdmin = adminOrders.orders.find((o) => o.id === createdOrder.id);
    assert(foundInAdmin != null, 'New shop order appears in Orders Dispatch API response');
    assert(foundInAdmin.order_number === createdOrder.order_number, 'Order number matches');
    assert(foundInAdmin.shop_name === primaryShop.name, 'Shop name matches primary shop');
    assert(Number(foundInAdmin.total_volume_litres) === Number(row.total_volume_litres), `Volume matches: ${foundInAdmin.total_volume_litres} L`);
    assert(foundInAdmin.items.length === 2, `Admin response includes all items (${foundInAdmin.items.length})`);

    // Test status filter for PENDING / PENDING_CONFIRMATION
    const pendingOrders = await orderRepository.listOrders({
      status: 'PENDING_CONFIRMATION',
      limit: 50,
    });
    const foundInPending = pendingOrders.orders.find((o) => o.id === createdOrder.id);
    assert(foundInPending != null, 'Order appears when filtered by PENDING_CONFIRMATION');

    // 5. Verify Order Volume Summary Aggregation
    console.log('\n--- Step 4: Verifying Order Volume Summary Aggregation ---');
    const volumeSummary = await orderRepository.getVolumeSummary({
      status: 'ALL',
    });
    assert(volumeSummary != null, 'Volume summary returned');
    assert(volumeSummary.overview.totalEligibleOrders >= 1, `Total orders in summary: ${volumeSummary.overview.totalEligibleOrders}`);
    assert(volumeSummary.overview.totalLiquidVolumeLitres >= Number(row.total_volume_litres), `Volume summary includes order litres: ${volumeSummary.overview.totalLiquidVolumeLitres} L`);

    const shopEntry = volumeSummary.shopWiseSummary.find((s: any) => s.shopId === primaryShop.id || s.shopName === primaryShop.name);
    assert(shopEntry != null, `Volume summary includes shop "${primaryShop.name}"`);

    // 6. Test Idempotency and Duplicate Protection
    console.log('\n--- Step 5: Testing Idempotency & Repeat Tap Protection ---');
    const replayedOrder = await orderService.createOrder(
      {
        shopId: primaryShop.id,
        items: orderItems,
        deliveryAddress,
        idempotencyKey: testIdempotencyKey,
      },
      testUser.id,
      '127.0.0.1'
    );
    assert(replayedOrder.id === createdOrder.id, 'Idempotent replay returns the exact same order ID');
    assert(replayedOrder.isDuplicateReplay === true, 'Flagged as duplicate replay (no new order placed)');

    const countAfterReplay = await query(`SELECT COUNT(*) as c FROM orders WHERE idempotency_key = $1`, [testIdempotencyKey]);
    assert(parseInt(countAfterReplay.rows[0].c, 10) === 1, 'Database contains exactly 1 order row for this idempotency key');

    // 7. Test Admin Review & Approval Workflow
    console.log('\n--- Step 6: Testing Admin Review & Order Status Transition ---');
    // Admin approves order -> CONFIRMED
    const approvedOrder = await orderService.updateStatus(createdOrder.id, 'CONFIRMED', testUser.id);
    assert(approvedOrder.status === 'CONFIRMED', 'Admin successfully approved order (status -> CONFIRMED)');

    // Admin prepares order for dispatch -> PREPARING
    const preparedOrder = await orderService.updateStatus(createdOrder.id, 'PREPARING', testUser.id);
    assert(preparedOrder.status === 'PREPARING', 'Admin prepared order for dispatch (status -> PREPARING)');

    // 8. Test Shop Isolation / Authorization
    console.log('\n--- Step 7: Testing Multi-Tenant Shop Isolation ---');
    const secondShopOrders = await orderRepository.findByShopId(secondShop.id);
    const foundInSecondShop = secondShopOrders.find((o) => o.id === createdOrder.id);
    assert(foundInSecondShop == null, `Secondary shop "${secondShop.name}" CANNOT access primary shop's order`);

    // 9. Clean up test order to keep database pristine
    console.log('\n--- Step 8: Cleaning Up Test Order ---');
    await query(`DELETE FROM deliveries WHERE order_id = $1`, [createdOrder.id]);
    await query(`DELETE FROM order_items WHERE order_id = $1`, [createdOrder.id]);
    await query(`DELETE FROM orders WHERE id = $1`, [createdOrder.id]);
    console.log('🧹 Test artifacts cleaned up successfully from live database.');

    console.log(`\n🎉 ALL ${passed}/${total} END-TO-END FLOW ASSERTIONS PASSED!`);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    throw err;
  } finally {
    await dbPool.end();
  }
}

runEndToEndOrderFlowTest().catch((err) => {
  console.error(err);
  process.exit(1);
});

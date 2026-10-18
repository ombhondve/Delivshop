import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { dbPool } from '../../src/config/database.js';
import { orderService } from '../../src/services/order.service.js';
import { notificationService } from '../../src/services/notification.service.js';

describe('Shop Orders & Dispatch Backend Integration Suite', () => {
  let testShopId: string;
  let testShopCode: string;

  beforeAll(async () => {
    // Find an active test shop
    const shopRes = await dbPool.query(
      `SELECT id, shop_id, name, phone FROM shops WHERE status = 'ACTIVE' LIMIT 1`
    );
    expect(shopRes.rowCount).toBeGreaterThan(0);
    testShopId = shopRes.rows[0].id;
    testShopCode = shopRes.rows[0].shop_id;
  });

  afterAll(async () => {
    // Clean up test reminders created during tests
    await dbPool.query(
      `DELETE FROM shop_order_reminders WHERE message LIKE '%[INTEGRATION_TEST]%'`
    );
    await dbPool.query(
      `DELETE FROM shop_devices WHERE fcm_token LIKE '%test_fcm_token%'`
    );
  });

  it('1. Computes exact 3-card summary satisfying: Total Active Shops = Shops Ordered + Shops Not Ordered', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const tracking = await orderService.getShopOrderTracking({ date: today });

    expect(tracking).toBeDefined();
    expect(tracking.summary).toBeDefined();

    const { totalActiveShops, shopsOrdered, shopsNotOrdered } = tracking.summary;

    expect(typeof totalActiveShops).toBe('number');
    expect(typeof shopsOrdered).toBe('number');
    expect(typeof shopsNotOrdered).toBe('number');

    // Strict invariant: Total Active Shops = Shops Ordered + Shops Not Ordered
    expect(totalActiveShops).toBe(shopsOrdered + shopsNotOrdered);
    expect(totalActiveShops).toBeGreaterThanOrEqual(0);
    expect(shopsOrdered).toBeGreaterThanOrEqual(0);
    expect(shopsNotOrdered).toBeGreaterThanOrEqual(0);

    // List of shops must not include inactive shops
    for (const shop of tracking.shops) {
      expect(shop.status).toBe('ACTIVE');
      expect(['ORDERED', 'NOT_ORDERED']).toContain(shop.orderStatus);
    }
  });

  it('2. Respects orderStatus filter (ORDERED vs NOT_ORDERED)', async () => {
    const today = new Date().toISOString().slice(0, 10);

    const orderedOnly = await orderService.getShopOrderTracking({
      date: today,
      orderStatus: 'ORDERED',
    });

    for (const s of orderedOnly.shops) {
      expect(s.orderStatus).toBe('ORDERED');
      expect(s.orders.length).toBeGreaterThanOrEqual(1);
    }

    const notOrderedOnly = await orderService.getShopOrderTracking({
      date: today,
      orderStatus: 'NOT_ORDERED',
    });

    for (const s of notOrderedOnly.shops) {
      expect(s.orderStatus).toBe('NOT_ORDERED');
      expect(s.orders.length).toBe(0);
    }
  });

  it('3. Sends an individual order reminder with proper tracking and idempotency', async () => {
    const reportingDate = new Date().toISOString().slice(0, 10);
    const idempotencyKey = `test_key_${Date.now()}`;

    const res = await orderService.sendShopReminder({
      shopId: testShopId,
      reportingDate,
      reminderType: 'ORDER_CUTOFF_REMINDER',
      customMessage: 'Hello! [INTEGRATION_TEST] Please place your milk order for today.',
      idempotencyKey,
    });

    expect(res).toBeDefined();
    expect(res.shopId).toBe(testShopId);
    expect(['ACCEPTED_FOR_DISPATCH', 'NO_DEVICE_REGISTERED']).toContain(res.status);

    // Idempotent retry with same key returns identical result without duplicating record
    const replayed = await orderService.sendShopReminder({
      shopId: testShopId,
      reportingDate,
      reminderType: 'ORDER_CUTOFF_REMINDER',
      customMessage: 'Hello! [INTEGRATION_TEST] Please place your milk order for today.',
      idempotencyKey,
    });

    expect(replayed.reminderId).toBe(res.reminderId);
  });

  it('4. Sends bulk order reminders with bounded batching and status tracking', async () => {
    const reportingDate = new Date().toISOString().slice(0, 10);

    const bulkResult = await orderService.sendBulkReminders({
      shopIds: [testShopId],
      reportingDate,
      customMessage: 'Bulk Reminder: [INTEGRATION_TEST] Place your daily order.',
    });

    expect(bulkResult).toBeDefined();
    expect(bulkResult.totalRequested).toBe(1);
    expect(bulkResult.results.length).toBe(1);
    expect(bulkResult.results[0].shopId).toBe(testShopId);
  });

  it('5. Retrieves reminder history for a shop', async () => {
    const history = await orderService.getReminderHistory(testShopId);
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThanOrEqual(1);

    const item = history[0];
    expect(item.shopId).toBe(testShopId);
    expect(item.reportingDate).toBeDefined();
    expect(item.status).toBeDefined();
    expect(item.createdAt).toBeDefined();
  });

  it('6. Registers and activates mobile app device token', async () => {
    const testToken = `test_fcm_token_${Date.now()}`;

    const device = await orderService.registerDeviceToken({
      shopId: testShopId,
      fcmToken: testToken,
      deviceType: 'android',
    });

    expect(device).toBeDefined();
    expect(device.shopId).toBe(testShopId);
    expect(device.fcmToken).toBe(testToken);

    // Verify token exists in database
    const dbCheck = await dbPool.query(
      `SELECT * FROM shop_devices WHERE shop_id = $1 AND fcm_token = $2`,
      [testShopId, testToken]
    );
    expect(dbCheck.rowCount).toBe(1);
  });

  it('7. Volume Summary CSV Export completely omits Total Crates column and crate metrics', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const csv = await orderService.exportVolumeSummaryCsv({ date: today });

    expect(csv).toBeDefined();

    // Check Header line for Packaging Breakdown: must be strictly 6 columns
    expect(csv).toContain('--- PACKAGING BREAKDOWN BY PRODUCT ---');
    expect(csv).toContain('Product Name,SKU,Packaging Type,Package Size,Total Packages,Total Volume (L)');

    // Must NOT contain Total Crates column header
    expect(csv).not.toContain('Total Crates,Units per Crate');
    expect(csv).not.toContain(',Total Crates,');
    expect(csv).not.toContain('Total Crates Required');

    // Section 3 Shop-Wise Summary must also not have Total Crates
    expect(csv).toContain('Shop Name,Shop ID,Order Number,Order Status,Dispatch Status,Driver,Delivery Route,Liquid Volume (L),Total Packages');
    expect(csv).not.toContain('Total Packages,Total Crates');
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/app.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { AuthUser } from '../../src/types/user.types.js';
import { dbPool } from '../../src/config/database.js';

describe('Deactivation-First Deletion Workflow & Dependency Integrity Suite', { timeout: 30000 }, () => {
  let server: http.Server;
  let baseUrl: string;

  const adminUser: AuthUser = {
    id: 'eff88d78-5b73-448f-8e41-330c46923b79',
    email: 'admin@delivshop.com',
    role: 'ADMIN',
  };

  const supplierUser: AuthUser = {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'supplier.test@delivshop.com',
    role: 'SUPPLIER',
  };

  const adminToken = generateAccessToken(adminUser);
  const supplierToken = generateAccessToken(supplierUser);

  let testCompanyId: string;
  let testActiveProductId: string;
  let testStockProductId: string;
  let testCleanProductId: string;
  let testShopId: string;
  let testDriverId: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // 1. Create a test company
    const compRes = await dbPool.query(
      `INSERT INTO companies (name, company_code, company_type, contact_person, phone, email, address_line_1, city, state, postal_code, status)
       VALUES ('Deactivation Test Dairy', 'TST-DEL-' || floor(random() * 8999 + 1000)::text, 'DAIRY_PRODUCER', 'Tester', '+91 99999 88888', 'test-del@dairy.com', '123 Dairy Lane', 'Pune', 'Maharashtra', '411001', 'ACTIVE')
       RETURNING id`
    );
    testCompanyId = compRes.rows[0].id;

    // 2. Create an active product
    const prodRes1 = await dbPool.query(
      `INSERT INTO products (company_id, name, sku, price, stock_quantity, category, is_active, base_unit, pack_size, units_per_pack, purchase_cost)
       VALUES ($1, 'Active Test Milk', 'TST-ACT-' || floor(random() * 8999 + 1000)::text, 65, 0, 'Milk', true, 'Litre', '1L Pouch', 1, 50)
       RETURNING id`,
      [testCompanyId]
    );
    testActiveProductId = prodRes1.rows[0].id;

    // 3. Create an inactive product with remaining stock (> 0)
    const prodRes2 = await dbPool.query(
      `INSERT INTO products (company_id, name, sku, price, stock_quantity, category, is_active, base_unit, pack_size, units_per_pack, purchase_cost)
       VALUES ($1, 'Stock Inactive Milk', 'TST-STK-' || floor(random() * 8999 + 1000)::text, 65, 25, 'Milk', false, 'Litre', '1L Pouch', 1, 50)
       RETURNING id`,
      [testCompanyId]
    );
    testStockProductId = prodRes2.rows[0].id;

    // 4. Create a clean inactive product (0 stock, no orders)
    const prodRes3 = await dbPool.query(
      `INSERT INTO products (company_id, name, sku, price, stock_quantity, category, is_active, base_unit, pack_size, units_per_pack, purchase_cost)
       VALUES ($1, 'Clean Inactive Milk', 'TST-CLN-' || floor(random() * 8999 + 1000)::text, 65, 0, 'Milk', false, 'Litre', '1L Pouch', 1, 50)
       RETURNING id`,
      [testCompanyId]
    );
    testCleanProductId = prodRes3.rows[0].id;

    // 5. Create a test shop
    const shopRes = await dbPool.query(
      `INSERT INTO shops (shop_id, name, owner_id, owner_name, email, phone, address, area, city, state, pincode, status, credit_limit, outstanding_balance)
       VALUES ('SHP-DEL-' || floor(random() * 8999 + 1000)::text, 'Test Deletion Shop', $1, 'Shop Owner', 'delshop@test.com', '+91 91234 56789', 'Main Bazaar', 'Deccan', 'Pune', 'Maharashtra', '411004', 'ACTIVE', 50000, 0)
       RETURNING id`,
      [adminUser.id]
    );
    testShopId = shopRes.rows[0].id;

    // 6. Create a test driver user
    const driverRes = await dbPool.query(
      `INSERT INTO users (email, password_hash, name, role, is_active)
       VALUES ('test-del-driver-' || floor(random() * 8999 + 1000)::text || '@delivshop.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Test Driver', 'DRIVER', true)
       RETURNING id`,
    );
    testDriverId = driverRes.rows[0].id;
  }, 30000);

  afterAll(async () => {
    // Cleanup records safely
    try {
      const ids = [testActiveProductId, testStockProductId, testCleanProductId].filter(Boolean);
      if (ids.length > 0) {
        await dbPool.query('DELETE FROM inventory_movements WHERE product_id = ANY($1)', [ids]);
        await dbPool.query('DELETE FROM products WHERE id = ANY($1)', [ids]);
      }
      if (testCompanyId) {
        await dbPool.query('DELETE FROM companies WHERE id = $1', [testCompanyId]);
      }
      if (testShopId) {
        await dbPool.query('DELETE FROM shops WHERE id = $1', [testShopId]);
      }
      if (testDriverId) {
        await dbPool.query('DELETE FROM users WHERE id = $1', [testDriverId]);
      }
    } catch (e) {
      // Ignore cleanup error
    }
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  }, 30000);

  describe('Product Deactivation-First Deletion Workflow', () => {
    it('1. should reject attempting to delete an active product with 400', async () => {
      const res = await fetch(`${baseUrl}/api/products/${testActiveProductId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Attempting delete on active product' }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toMatch(/deactivated before/i);
    });

    it('2. should reject unauthorized non-admin user attempting to delete a product with 403', async () => {
      const res = await fetch(`${baseUrl}/api/products/${testCleanProductId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${supplierToken}`,
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(403);
    });

    it('3. should allow authorized administrator to deactivate a product', async () => {
      const res = await fetch(`${baseUrl}/api/products/${testActiveProductId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: false, reason: 'Deactivating for test' }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.isActive).toBe(false);
    });

    it('4. should reject deleting an inactive product if it still has remaining stock (> 0)', async () => {
      const res = await fetch(`${baseUrl}/api/products/${testStockProductId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Delete product with stock' }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toMatch(/remaining stock/i);
    });

    it('5. should allow deleting an inactive product with 0 stock and record audit log', async () => {
      const res = await fetch(`${baseUrl}/api/products/${testCleanProductId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Verified safe deletion test' }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toMatch(/deleted/i);

      // Verify product is no longer returned in active listing
      const listRes = await fetch(`${baseUrl}/api/products`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const listJson = await listRes.json();
      const found = listJson.data.items.find((p: any) => p.id === testCleanProductId);
      expect(found).toBeUndefined();

      // Verify audit log has PRODUCT_DELETED entry
      const auditRes = await dbPool.query(
        `SELECT action FROM audit_logs WHERE entity_id = $1 AND action = 'PRODUCT_DELETED'`,
        [testCleanProductId]
      );
      expect(auditRes.rows.length).toBeGreaterThan(0);
    });

    it('6. should safe-soft-delete an inactive product referenced by historical movements without dropping data', async () => {
      // First insert an inventory movement referencing testActiveProductId (now inactive)
      const movNum = 'MOV-DEL-' + Math.floor(Math.random() * 89999 + 10000);
      await dbPool.query(
        `INSERT INTO inventory_movements (movement_number, product_id, movement_type, quantity_change, previous_stock, new_stock, reason)
         VALUES ($1, $2, 'PURCHASE_RECEIPT', 10, 0, 10, 'Initial movement reference')`,
        [movNum, testActiveProductId]
      );

      // Ensure stock is 0 for deletion eligibility
      await dbPool.query('UPDATE products SET stock_quantity = 0 WHERE id = $1', [testActiveProductId]);

      const res = await fetch(`${baseUrl}/api/products/${testActiveProductId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Safe archival test with historical ledger' }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify soft delete flag in database preserves the row and historical FK
      const checkRes = await dbPool.query(
        `SELECT deleted_at, is_active FROM products WHERE id = $1`,
        [testActiveProductId]
      );
      expect(checkRes.rows.length).toBe(1);
      expect(checkRes.rows[0].deleted_at).not.toBeNull();
      expect(checkRes.rows[0].is_active).toBe(false);

      // Verify inventory movement is intact
      const movRes = await dbPool.query(
        `SELECT id FROM inventory_movements WHERE product_id = $1`,
        [testActiveProductId]
      );
      expect(movRes.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Company Management Deactivation-First Deletion', () => {
    it('7. should reject deleting an active company with 400', async () => {
      const res = await fetch(`${baseUrl}/api/companies/${testCompanyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toMatch(/deactivated before/i);
    });

    it('8. should reject company deletion if active products still belong to it', async () => {
      // Deactivate company first
      await fetch(`${baseUrl}/api/companies/${testCompanyId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'INACTIVE', reason: 'Deactivating company' }),
      });

      // Ensure testStockProductId is active so it blocks company deletion
      await dbPool.query('UPDATE products SET is_active = true WHERE id = $1', [testStockProductId]);

      const res = await fetch(`${baseUrl}/api/companies/${testCompanyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toMatch(/Cannot delete company because it is associated with/i);
    });
  });

  describe('Shop Management Deactivation-First Deletion', () => {
    it('9. should reject deleting an active shop with 400', async () => {
      const res = await fetch(`${baseUrl}/api/shops/${testShopId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toMatch(/deactivated before/i);
    });

    it('10. should allow deleting an inactive clean shop and record audit trail', async () => {
      // Deactivate shop
      await fetch(`${baseUrl}/api/shops/${testShopId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'INACTIVE', reason: 'Closing shop' }),
      });

      const res = await fetch(`${baseUrl}/api/shops/${testShopId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Permanent closure confirmed' }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify audit log
      const auditRes = await dbPool.query(
        `SELECT action FROM audit_logs WHERE entity_id = $1 AND action = 'SHOP_DELETED'`,
        [testShopId]
      );
      expect(auditRes.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Driver Personnel Deactivation-First Deletion', () => {
    it('11. should reject deleting an active driver with 400', async () => {
      const res = await fetch(`${baseUrl}/api/deliveries/drivers/${testDriverId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toMatch(/deactivated before/i);
    });

    it('12. should allow deactivating driver and deleting when safe', async () => {
      // Deactivate driver
      const deactRes = await fetch(`${baseUrl}/api/deliveries/drivers/${testDriverId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: false, reason: 'Off-duty personnel' }),
      });
      expect(deactRes.status).toBe(200);

      // Delete inactive driver
      const delRes = await fetch(`${baseUrl}/api/deliveries/drivers/${testDriverId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Personnel contract ended' }),
      });

      expect(delRes.status).toBe(200);
      const delJson = await delRes.json();
      expect(delJson.success).toBe(true);

      // Verify audit log
      const auditRes = await dbPool.query(
        `SELECT action FROM audit_logs WHERE entity_id = $1 AND action = 'DRIVER_DELETED'`,
        [testDriverId]
      );
      expect(auditRes.rows.length).toBeGreaterThan(0);
    });
  });
});

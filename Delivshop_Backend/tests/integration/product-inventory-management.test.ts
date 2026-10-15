import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/app.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { AuthUser } from '../../src/types/user.types.js';
import { dbPool } from '../../src/config/database.js';

describe('Products & Inventory Management API & Security Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  const adminUser: AuthUser = {
    id: 'eff88d78-5b73-448f-8e41-330c46923b79',
    email: 'admin@gmail.com',
    role: 'ADMIN',
  };

  const supplierUser: AuthUser = {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'supplier.prod@delivshop.com',
    role: 'SUPPLIER',
  };

  const driverUser: AuthUser = {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'driver.prod@delivshop.com',
    role: 'DRIVER',
  };

  const adminToken = generateAccessToken(adminUser);
  const supplierToken = generateAccessToken(supplierUser);
  const driverToken = generateAccessToken(driverUser);

  let activeCompanyId: string;
  let inactiveCompanyId: string;
  let createdProductId: string;
  let createdProductSku: string;
  let createdBatchId: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // Create an active and an inactive company for testing
    const activeRes = await dbPool.query(`
      INSERT INTO companies (
        company_code, name, company_type, contact_person, phone, email,
        address_line_1, city, state, postal_code, status
      ) VALUES (
        'CMP-TEST-' || FLOOR(RANDOM() * 10000), 'Active Test Dairy ' || FLOOR(RANDOM() * 10000),
        'Dairy Processor', 'Test Manager', '9822011111', 'manager.test@delivshop.com',
        'Plot 10, MIDC', 'Nashik', 'Maharashtra', '422007', 'ACTIVE'
      ) RETURNING id;
    `);
    activeCompanyId = activeRes.rows[0].id;

    const inactiveRes = await dbPool.query(`
      INSERT INTO companies (
        company_code, name, company_type, contact_person, phone, email,
        address_line_1, city, state, postal_code, status
      ) VALUES (
        'CMP-TEST-' || FLOOR(RANDOM() * 10000), 'Inactive Test Dairy ' || FLOOR(RANDOM() * 10000),
        'Dairy Processor', 'Inactive Manager', '9822022222', 'inactive.test@delivshop.com',
        'Plot 12, MIDC', 'Nashik', 'Maharashtra', '422007', 'INACTIVE'
      ) RETURNING id;
    `);
    inactiveCompanyId = inactiveRes.rows[0].id;
  });

  afterAll(async () => {
    if (createdProductId) {
      await dbPool.query('DELETE FROM inventory_movements WHERE product_id = $1;', [createdProductId]);
      await dbPool.query('DELETE FROM inventory_batches WHERE product_id = $1;', [createdProductId]);
      await dbPool.query('DELETE FROM products WHERE id = $1;', [createdProductId]);
    }
    if (activeCompanyId) {
      await dbPool.query('DELETE FROM companies WHERE id = $1;', [activeCompanyId]);
    }
    if (inactiveCompanyId) {
      await dbPool.query('DELETE FROM companies WHERE id = $1;', [inactiveCompanyId]);
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should reject unauthenticated GET /api/products with 401', async () => {
    const res = await fetch(`${baseUrl}/api/products`);
    expect(res.status).toBe(401);
  });

  it('should reject unauthorized role (DRIVER) with 403', async () => {
    const res = await fetch(`${baseUrl}/api/products`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('should reject product creation without companyId with 422', async () => {
    const res = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Missing Company Milk',
        price: 50,
        category: 'Milk',
        baseUnit: 'Litre',
        packSize: '1L Pouch',
      }),
    });
    expect(res.status).toBe(422);
  });

  it('should reject product assignment to an inactive supplier company with 400', async () => {
    const res = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        companyId: inactiveCompanyId,
        name: 'Inactive Supplier Milk',
        price: 55,
        category: 'Milk',
        baseUnit: 'Litre',
        packSize: '1L Pouch',
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('inactive');
  });

  it('should successfully create a new dairy product with opening stock, batch, and ledger entry', async () => {
    const testSku = `TEST-MLK-${Date.now()}`;
    const payload = {
      companyId: activeCompanyId,
      name: 'Sahyadri Gold Pasteurized Milk 1L',
      sku: testSku,
      category: 'Milk',
      brand: 'Sahyadri Dairy',
      description: 'Farm fresh whole cow milk pasteurized & homogenised',
      baseUnit: 'Litre',
      packSize: '1000 ml Pouch',
      unitsPerPack: 1,
      purchaseCost: 46.5,
      price: 62.0,
      minStockThreshold: 20,
      reorderQuantity: 60,
      taxRate: 5,
      isTaxInclusive: true,
      storageTemperature: '2°C to 4°C',
      shelfLifeDays: 5,
      fatPercentage: 4.5,
      snfPercentage: 8.5,
      initialStock: 150,
      initialBatchNumber: `BATCH-INIT-${Date.now()}`,
      initialExpiryDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    };

    const res = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.name).toBe(payload.name);
    expect(body.data.sku).toBe(testSku);
    expect(body.data.stockQuantity).toBe(150);
    expect(body.data.companyId).toBe(activeCompanyId);

    createdProductId = body.data.id;
    createdProductSku = body.data.sku;

    // Verify initial batch was created
    const batchesRes = await dbPool.query(
      'SELECT * FROM inventory_batches WHERE product_id = $1;',
      [createdProductId]
    );
    expect(batchesRes.rows.length).toBe(1);
    expect(Number(batchesRes.rows[0].quantity_remaining)).toBe(150);
    createdBatchId = batchesRes.rows[0].id;

    // Verify opening stock movement was appended to the inventory ledger
    const movementsRes = await dbPool.query(
      'SELECT * FROM inventory_movements WHERE product_id = $1;',
      [createdProductId]
    );
    expect(movementsRes.rows.length).toBe(1);
    expect(movementsRes.rows[0].movement_type).toBe('OPENING_STOCK');
    expect(Number(movementsRes.rows[0].quantity_change)).toBe(150);
    expect(movementsRes.rows[0].movement_number).toMatch(/^MOV-\d+$/);
  });

  it('should reject duplicate product SKU with 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        companyId: activeCompanyId,
        name: 'Duplicate SKU Attempt',
        sku: createdProductSku,
        category: 'Milk',
        baseUnit: 'Litre',
        packSize: '1L',
        price: 50,
      }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toContain('already exists');
  });

  it('should fetch product summary stats', async () => {
    const res = await fetch(`${baseUrl}/api/products/stats`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalProducts).toBeGreaterThan(0);
    expect(typeof body.data.activeProducts).toBe('number');
    expect(typeof body.data.lowStockItems).toBe('number');
    expect(typeof body.data.outOfStockItems).toBe('number');
    expect(typeof body.data.expiringSoonItems).toBe('number');
  });

  it('should list products with filters, search, and pagination', async () => {
    const res = await fetch(
      `${baseUrl}/api/products?search=Sahyadri&category=Milk&stockStatus=ALL&page=1&limit=10`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.items)).toBe(true);
    expect(body.data.total).toBeGreaterThanOrEqual(1);
    expect(body.data.items.some((p: any) => p.id === createdProductId)).toBe(true);
  });

  it('should retrieve single product by ID including active batches', async () => {
    const res = await fetch(`${baseUrl}/api/products/${createdProductId}`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdProductId);
    expect(Array.isArray(body.data.batches)).toBe(true);
    expect(body.data.batches.length).toBeGreaterThanOrEqual(1);
    expect(body.data.company).toBeDefined();
  });

  it('should allow ADMIN to update product details', async () => {
    const res = await fetch(`${baseUrl}/api/products/${createdProductId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        price: 65.0,
        reorderQuantity: 80,
        description: 'Updated pasteurized cow milk description',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.price).toBe(65.0);
    expect(body.data.reorderQuantity).toBe(80);
  });

  it('should process inward stock receipt and atomically increment stock and batch', async () => {
    const receiptPayload = {
      productId: createdProductId,
      companyId: activeCompanyId,
      quantity: 50,
      unitCost: 47.0,
      batchNumber: `BATCH-REC-${Date.now()}`,
      expiryDate: new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10),
      notes: 'Morning shipment from plant',
    };

    const res = await fetch(`${baseUrl}/api/inventory/receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(receiptPayload),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.movement).toBeDefined();
    expect(body.data.movement.movementType).toBe('PURCHASE_RECEIPT');
    expect(body.data.movement.quantityChange).toBe(50);
    expect(body.data.movement.newStock).toBe(200); // 150 previous + 50 received
    expect(body.data.product.stockQuantity).toBe(200);
  });

  it('should process stock adjustment and update inventory ledger', async () => {
    const adjustPayload = {
      productId: createdProductId,
      batchId: createdBatchId,
      adjustmentType: 'DAMAGE',
      quantityChange: -10,
      reason: '10 pouches punctured during cold-chain crate transit',
      referenceId: 'DAMAGE-REPORT-001',
    };

    const res = await fetch(`${baseUrl}/api/inventory/adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(adjustPayload),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.movement.movementType).toBe('DAMAGE_WRITE_OFF');
    expect(body.data.movement.quantityChange).toBe(-10);
    expect(body.data.movement.newStock).toBe(190); // 200 - 10
    expect(body.data.product.stockQuantity).toBe(190);
  });

  it('should prevent stock adjustment that would result in negative stock', async () => {
    const adjustPayload = {
      productId: createdProductId,
      adjustmentType: 'DECREASE',
      quantityChange: -99999, // Exceeds current stock (190)
      reason: 'Illegal reduction test',
    };

    const res = await fetch(`${baseUrl}/api/inventory/adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(adjustPayload),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('negative stock');
  });

  it('should fetch audit stock ledger movements', async () => {
    const res = await fetch(`${baseUrl}/api/inventory/movements?productId=${createdProductId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.items.length).toBeGreaterThanOrEqual(3); // OPENING_STOCK, PURCHASE_RECEIPT, DAMAGE_WRITE_OFF
  });

  it('should allow ADMIN to activate or deactivate product', async () => {
    const res = await fetch(`${baseUrl}/api/products/${createdProductId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        isActive: false,
        reason: 'Temporary line maintenance',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.isActive).toBe(false);
  });
});

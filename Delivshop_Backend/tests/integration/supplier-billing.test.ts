import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/app.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { AuthUser } from '../../src/types/user.types.js';
import { dbPool } from '../../src/config/database.js';

describe('Supplier Billing, Pickup Verification & PDF Integration Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  const adminUser: AuthUser = {
    id: 'eff88d78-5b73-448f-8e41-330c46923b79',
    email: 'admin@gmail.com',
    role: 'ADMIN',
  };

  const supplierUser: AuthUser = {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'supplier.company@delivshop.com',
    role: 'SUPPLIER',
  };

  const driverUser: AuthUser = {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'driver.company@delivshop.com',
    role: 'DRIVER',
  };

  const adminToken = generateAccessToken(adminUser);
  const supplierToken = generateAccessToken(supplierUser);
  const driverToken = generateAccessToken(driverUser);

  let testCompanyId: string;
  let testProductId: string;
  let testPickupId: string;
  let testPickupItemId: string;
  let testBillId: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // 1. Seed or fetch active company
    const compRes = await dbPool.query(
      `INSERT INTO companies (
         company_code, name, company_type, contact_person, phone, email,
         address_line_1, city, state, postal_code, status, payment_terms,
         latitude, longitude
       ) VALUES (
         'CMP-TEST-' || SUBSTRING(gen_random_uuid()::text, 1, 6),
         'Sahyadri Agro Processing Cooperative',
         'Dairy Processor',
         'Ramesh Patil',
         '+91 98230 11223',
         'ramesh.patil@sahyadriagro.in',
         'Plot 42, MIDC Ambad Industrial Area',
         'Nashik',
         'Maharashtra',
         '422010',
         'ACTIVE',
         'NET_15',
         19.9520000,
         73.7430000
       ) RETURNING id`
    );
    testCompanyId = compRes.rows[0].id;

    // 2. Seed assigned product with agreed purchase_cost
    const prodRes = await dbPool.query(
      `INSERT INTO products (
         name, sku, category, price, purchase_cost, tax_rate,
         base_unit, pack_size, company_id, stock_quantity, is_active
       ) VALUES (
         'Sahyadri Farm Fresh Cow Milk 500ml',
         'SKU-TEST-' || SUBSTRING(gen_random_uuid()::text, 1, 6),
         'Dairy',
         32.00,
         24.00,
         5.00,
         'Pouch',
         '500ml',
         $1,
         150,
         true
       ) RETURNING id`,
      [testCompanyId]
    );
    testProductId = prodRes.rows[0].id;
  });

  afterAll(async () => {
    if (testBillId) {
      await dbPool.query('DELETE FROM supplier_payments WHERE bill_id = $1', [testBillId]);
      await dbPool.query('DELETE FROM supplier_bill_items WHERE bill_id = $1', [testBillId]);
      await dbPool.query('DELETE FROM supplier_bills WHERE id = $1', [testBillId]);
    }
    if (testPickupId) {
      await dbPool.query('DELETE FROM delivery_run_pickup_items WHERE pickup_id = $1', [testPickupId]);
      await dbPool.query('DELETE FROM delivery_run_pickups WHERE id = $1', [testPickupId]);
    }
    if (testProductId) {
      await dbPool.query('DELETE FROM products WHERE id = $1', [testProductId]);
    }
    if (testCompanyId) {
      await dbPool.query('DELETE FROM companies WHERE id = $1', [testCompanyId]);
    }

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('1. GET /api/companies/:id retrieves company with payment terms and banking info', async () => {
    const res = await fetch(`${baseUrl}/api/companies/${testCompanyId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(testCompanyId);
    expect(body.data.name).toBe('Sahyadri Agro Processing Cooperative');
    expect(body.data.paymentTerms).toBe('NET_15');
    expect(body.data.latitude).toBe(19.952);
  });

  it('2. GET /api/products?companyId=... correctly returns assigned products with agreed purchase_cost', async () => {
    const res = await fetch(`${baseUrl}/api/products?companyId=${testCompanyId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.items.length).toBeGreaterThanOrEqual(1);

    const found = body.data.items.find((p: any) => p.id === testProductId);
    expect(found).toBeDefined();
    expect(found.purchaseCost).toBe(24.00); // Agreed purchase price
    expect(found.price).toBe(32.00); // Shop selling price
    expect(found.taxRate).toBe(5.00);
  });

  it('3. POST /api/companies/:id/pickups/schedule schedules a new supplier pickup', async () => {
    const payload = {
      scheduledDate: '2026-10-25',
      scheduledTimeWindow: '06:00 AM - 08:00 AM',
      items: [
        {
          productId: testProductId,
          requiredQuantity: 100,
          unit: 'Pouch',
        },
      ],
      notes: 'Morning intake for Pune route dispatch',
    };

    const res = await fetch(`${baseUrl}/api/companies/${testCompanyId}/pickups/schedule`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('SCHEDULED');
    expect(body.data.scheduledDate).toBe('2026-10-25');
    expect(body.data.pickupReference).toMatch(/^PCK-/);
    expect(body.data.items.length).toBe(1);

    testPickupId = body.data.id;
    testPickupItemId = body.data.items[0].id;
  });

  it('4. PATCH /api/companies/:id/pickups/:pickupId/verify records accepted vs rejected quantities with remarks', async () => {
    // 100 required, 90 collected, 88 accepted, 2 rejected, 10 shortage
    const verifyPayload = {
      items: [
        {
          itemId: testPickupItemId,
          acceptedQuantity: 88,
          rejectedQuantity: 2,
          shortageQuantity: 10,
          supplierPurchasePrice: 24.00,
          verificationRemarks: '2 units leaked, 88 verified in fresh chilled state at 3C',
        },
      ],
      verificationNotes: 'Inward verification completed by central quality officer',
      status: 'VERIFIED',
    };

    const res = await fetch(`${baseUrl}/api/companies/${testCompanyId}/pickups/${testPickupId}/verify`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verifyPayload),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('VERIFIED');
    expect(body.data.verifiedAt).toBeTruthy();

    const verifiedItem = body.data.items[0];
    expect(verifiedItem.acceptedQuantity).toBe(88);
    expect(verifiedItem.rejectedQuantity).toBe(2);
    expect(verifiedItem.shortageQuantity).toBe(10);
    expect(verifiedItem.lineTotal).toBe(88 * 24.00); // 2112.00
  });

  it('5. GET /api/companies/:id/pickups/:pickupId/summary-pdf generates quantity-only PDF without financial prices', async () => {
    const res = await fetch(`${baseUrl}/api/companies/${testCompanyId}/pickups/${testPickupId}/summary-pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    expect(buffer.length).toBeGreaterThan(1000);

    // Verify PDF magic bytes '%PDF'
    const magic = buffer.subarray(0, 4).toString('utf-8');
    expect(magic).toBe('%PDF');

    // Strict invariant: verify that supplier price amounts (e.g. '₹2112' or '2112.00') are not present in quantity-only summary
    const pdfText = buffer.toString('binary');
    expect(pdfText).not.toContain('2112.00');
  });

  it('6. POST /api/companies/:id/bills/generate calculates bill with accepted_quantity * supplier_purchase_price', async () => {
    const billPayload = {
      pickupIds: [testPickupId],
      billingPeriodStart: '2026-10-01',
      billingPeriodEnd: '2026-10-31',
      adjustmentsAmount: 50.00, // e.g. cold storage incentive
      adjustmentReason: 'Refrigerated transit bonus',
      notes: 'Monthly supplier settlement for October',
    };

    const res = await fetch(`${baseUrl}/api/companies/${testCompanyId}/bills/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(billPayload),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);

    const bill = body.data;
    testBillId = bill.id;

    expect(bill.billNumber).toMatch(/^BILL-/);
    expect(bill.status).toBe('FINALIZED');
    expect(bill.paymentStatus).toBe('UNPAID');

    // Mathematical verification:
    // 88 accepted units * ₹24.00 = ₹2112.00
    expect(bill.subtotalAmount).toBe(2112.00);
    // 5% tax on 2112.00 = 105.60
    expect(bill.taxAmount).toBe(105.60);
    // Adjustments = 50.00
    expect(bill.adjustmentsAmount).toBe(50.00);
    // Total = 2112.00 + 105.60 + 50.00 = 2267.60
    expect(bill.totalAmount).toBe(2267.60);
    expect(bill.outstandingBalance).toBe(2267.60);
    expect(bill.paidAmount).toBe(0.00);
  });

  it('7. Duplicate billing prevention: generating a bill for an already billed pickup must be rejected with 400', async () => {
    const res = await fetch(`${baseUrl}/api/companies/${testCompanyId}/bills/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pickupIds: [testPickupId],
        billingPeriodStart: '2026-10-01',
        billingPeriodEnd: '2026-10-31',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/already been billed|no eligible/i);
  });

  it('8. POST /api/companies/:id/bills/:billId/payments records partial payment and updates outstanding balance', async () => {
    // Record partial payment of ₹1000.00
    const payRes1 = await fetch(`${baseUrl}/api/companies/${testCompanyId}/bills/${testBillId}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 1000.00,
        paymentMethod: 'BANK_TRANSFER',
        transactionReference: 'NEFT928374829',
        notes: 'First tranche payment',
      }),
    });

    expect(payRes1.status).toBe(200);
    const body1 = await payRes1.json();
    expect(body1.success).toBe(true);
    expect(body1.data.bill.paidAmount).toBe(1000.00);
    expect(body1.data.bill.outstandingBalance).toBe(1267.60);
    expect(body1.data.bill.paymentStatus).toBe('PARTIALLY_PAID');

    // Reject overpayment (attempting to pay ₹2000 when balance is 1267.60)
    const overpayRes = await fetch(`${baseUrl}/api/companies/${testCompanyId}/bills/${testBillId}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 2000.00,
        paymentMethod: 'UPI',
      }),
    });
    expect(overpayRes.status).toBe(400);

    // Record remaining balance payment of ₹1267.60
    const payRes2 = await fetch(`${baseUrl}/api/companies/${testCompanyId}/bills/${testBillId}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 1267.60,
        paymentMethod: 'RTGS',
        transactionReference: 'RTGS10293847',
        notes: 'Final settlement payment',
      }),
    });

    expect(payRes2.status).toBe(200);
    const body2 = await payRes2.json();
    expect(body2.success).toBe(true);
    expect(body2.data.bill.paidAmount).toBe(2267.60);
    expect(body2.data.bill.outstandingBalance).toBe(0.00);
    expect(body2.data.bill.paymentStatus).toBe('PAID');
  });

  it('9. GET /api/companies/:id/bills/:billId/pdf generates detailed supplier bill PDF in INR', async () => {
    const res = await fetch(`${baseUrl}/api/companies/${testCompanyId}/bills/${testBillId}/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    expect(buffer.length).toBeGreaterThan(1500);

    const magic = buffer.subarray(0, 4).toString('utf-8');
    expect(magic).toBe('%PDF');
  });

  it('10. Security: Driver cannot access supplier financial endpoints', async () => {
    const res = await fetch(`${baseUrl}/api/companies/${testCompanyId}/bills`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    expect(res.status).toBe(403);
  });
});

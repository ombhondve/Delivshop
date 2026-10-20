import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/app.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { AuthUser } from '../../src/types/user.types.js';
import { dbPool } from '../../src/config/database.js';

describe('Employee Detailed Page Salary Management & Payment Security Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  const adminUser: AuthUser = {
    id: 'eff88d78-5b73-448f-8e41-330c46923b79',
    email: 'admin@gmail.com',
    role: 'ADMIN',
  };

  const shopUser: AuthUser = {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'shop.owner@delivshop.com',
    role: 'SHOP',
  };

  const adminToken = generateAccessToken(adminUser);
  const shopToken = generateAccessToken(shopUser);

  let driverId: string;
  let driverEmpId: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // Ensure a driver exists for salary testing
    const drvRes = await dbPool.query(
      "SELECT id, employee_id FROM users WHERE role = 'DRIVER' AND deleted_at IS NULL LIMIT 1"
    );

    if (drvRes.rows.length > 0) {
      driverId = drvRes.rows[0].id;
      driverEmpId = drvRes.rows[0].employee_id;
    } else {
      const insRes = await dbPool.query(
        `INSERT INTO users (name, email, password_hash, role, employee_id, is_active, city, state)
         VALUES ('Ramesh Tendulkar', 'ramesh.drv@delivshop.com', '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQ$testpasswordhash', 'DRIVER', 'EMP-DRV-9999', TRUE, 'Pune', 'Maharashtra')
         RETURNING id, employee_id`
      );
      driverId = insRes.rows[0].id;
      driverEmpId = insRes.rows[0].employee_id;
    }

    // Clean previous salary configs & payments for this driver
    await dbPool.query('DELETE FROM driver_salary_payments WHERE driver_id = $1', [driverId]);
    await dbPool.query('DELETE FROM driver_salary_configs WHERE driver_id = $1', [driverId]);
  });

  afterAll(async () => {
    await dbPool.query('DELETE FROM driver_salary_payments WHERE driver_id = $1', [driverId]);
    await dbPool.query('DELETE FROM driver_salary_configs WHERE driver_id = $1', [driverId]);
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('1. should restrict driver salary configuration endpoint to ADMIN only', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${driverId}/salary`, {
      headers: { Authorization: `Bearer ${shopToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('2. should reject invalid salary configurations (negative amounts or bad dates)', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${driverId}/salary`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        monthlySalary: -5000,
        effectiveFrom: 'invalid-date',
      }),
    });
    expect(res.status).toBe(422);
  });

  it('3. should allow ADMIN to configure monthly salary for the first time', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${driverId}/salary`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        monthlySalary: 31000,
        effectiveFrom: '2026-10-01',
        salaryType: 'Fixed Monthly Salary',
        notes: 'Initial salary agreement',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(parseFloat(json.data.base_monthly_salary)).toBe(31000);
    expect(json.data.salary_type).toBe('Fixed Monthly Salary');
    expect(json.data.summary.paymentStatus).toBe('UNPAID');
    expect(json.data.summary.salaryAmountDue).toBe(31000);
    expect(json.data.summary.remainingBalance).toBe(31000);
  });

  it('4. should allow revising salary mid-month and calculate obligation using effective rates', async () => {
    // Revise to ₹37,200 starting from October 16
    // October has 31 days.
    // Days 1-15: 15 * (31000 / 31) = 15,000
    // Days 16-31: 16 * (37200 / 31) = 19,200
    // Total obligation for Oct 2026 = 34,200
    const reviseRes = await fetch(`${baseUrl}/api/deliveries/drivers/${driverId}/salary`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        monthlySalary: 37200,
        effectiveFrom: '2026-10-16',
        salaryType: 'Fixed Monthly Salary',
        notes: 'Performance salary increase',
      }),
    });

    expect(reviseRes.status).toBe(200);

    // Verify historical rates are preserved
    const getRes = await fetch(`${baseUrl}/api/deliveries/drivers/${driverId}/salary?month=2026-10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(getRes.status).toBe(200);
    const json = await getRes.json();
    expect(json.success).toBe(true);
    expect(json.data.history.length).toBe(2);
    expect(json.data.summary.salaryAmountDue).toBe(34200);
    expect(json.data.summary.remainingBalance).toBe(34200);
    expect(json.data.summary.paymentStatus).toBe('UNPAID');
  });

  let firstPaymentId: string;

  it('5. should record a partial salary payment and update payment status to PARTIALLY_PAID', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${driverId}/salary/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        salaryMonth: '2026-10',
        paymentDate: '2026-10-10',
        amount: 15000,
        paymentMethod: 'BANK_TRANSFER',
        transactionReference: 'NEFT-OCT-1001',
        notes: 'First fortnight salary advance',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    firstPaymentId = json.data.payment.id;
    expect(parseFloat(json.data.payment.amount)).toBe(15000);
    expect(json.data.summary.totalPaid).toBe(15000);
    expect(json.data.summary.remainingBalance).toBe(19200); // 34200 - 15000
    expect(json.data.summary.paymentStatus).toBe('PARTIALLY_PAID');
  });

  it('6. should reject accidental duplicate transaction reference for same employee', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${driverId}/salary/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        salaryMonth: '2026-10',
        paymentDate: '2026-10-12',
        amount: 5000,
        paymentMethod: 'BANK_TRANSFER',
        transactionReference: 'NEFT-OCT-1001', // duplicate reference
        notes: 'Duplicate attempt',
      }),
    });

    expect(res.status).toBe(409);
  });

  it('7. should record another payment against the same month and mark status as PAID when settled', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${driverId}/salary/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        salaryMonth: '2026-10',
        paymentDate: '2026-10-31',
        amount: 19200,
        paymentMethod: 'UPI',
        transactionReference: 'UPI-OCT-2002',
        notes: 'Month-end salary settlement',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.summary.totalPaid).toBe(34200);
    expect(json.data.summary.remainingBalance).toBe(0);
    expect(json.data.summary.paymentStatus).toBe('PAID');
  });

  it('8. should allow reversing a mistaken payment with audit trail without silently deleting', async () => {
    const res = await fetch(
      `${baseUrl}/api/deliveries/drivers/${driverId}/salary/payments/${firstPaymentId}/reverse`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          reason: 'Erroneous bank account number entered by accounts officer',
        }),
      }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.payment.status).toBe('REVERSED');
    expect(json.data.payment.reversal_reason).toContain('Erroneous bank account');

    // Total paid drops back to 19200 and balance increases back to 15000 => PARTIALLY_PAID
    expect(json.data.summary.totalPaid).toBe(19200);
    expect(json.data.summary.remainingBalance).toBe(15000);
    expect(json.data.summary.paymentStatus).toBe('PARTIALLY_PAID');
  });

  it('9. should retrieve payments history with monthly summaries', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${driverId}/salary/payments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.monthsSummary.length).toBeGreaterThan(0);
    const octSummary = json.data.monthsSummary.find((m: any) => m.salaryMonth === '2026-10');
    expect(octSummary).toBeDefined();
    expect(octSummary.salaryAmountDue).toBe(34200);
    expect(octSummary.transactions.length).toBe(2); // One completed, one reversed
  });

  it('10. should retrieve full employee profile with salarySummary and without driver documents', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${driverId}/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('driver');
    expect(json.data).toHaveProperty('salarySummary');
    expect(json.data).toHaveProperty('salaryConfig');
    expect(json.data.salarySummary.paymentStatus).toBe('PARTIALLY_PAID');
    // Ensure driver documents section is not present
    expect(json.data).not.toHaveProperty('documents');
  });
});

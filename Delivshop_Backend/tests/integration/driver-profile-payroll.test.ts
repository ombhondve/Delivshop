import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/app.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { AuthUser } from '../../src/types/user.types.js';
import { dbPool } from '../../src/config/database.js';

describe('Driver Comprehensive Profile, Salary & Payroll Security Suite', () => {
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

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    const drvRes = await dbPool.query("SELECT id FROM users WHERE role = 'DRIVER' AND deleted_at IS NULL LIMIT 1");
    driverId = drvRes.rows[0]?.id;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should restrict driver salary configuration endpoint to ADMIN only', async () => {
    // Non-admin SHOP role must be rejected with 403 Forbidden
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${driverId}/salary`, {
      headers: { Authorization: `Bearer ${shopToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('should allow ADMIN to configure driver salary structure', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${driverId}/salary`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        baseMonthlySalary: 22000,
        dailyAllowance: 180,
        perDeliveryIncentive: 35,
        effectiveFrom: '2026-10-01',
        notes: 'Senior Logistics Specialist grade bump',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(parseFloat(json.data.base_monthly_salary)).toBe(22000);
  });

  it('should allow ADMIN to disburse monthly driver payroll', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${driverId}/payroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        paymentPeriod: '2026-10',
        baseSalary: 22000,
        allowances: 4500,
        incentives: 2100,
        deductions: 500,
        advances: 0,
        netAmount: 28100,
        status: 'PAID',
        paymentDate: '2026-10-15',
        paymentReference: 'NEFT-DLV-OCT26-091',
        notes: 'October 2026 payroll completed',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(parseFloat(json.data.net_amount)).toBe(28100);
  });

  it('should allow uploading and verifying driver documents', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${driverId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        documentType: 'POLICE_VERIFICATION',
        documentNumber: 'POL-PUN-2024-99812',
        issueDate: '2024-03-01',
        expiryDate: '2027-03-01',
        verificationStatus: 'VALID',
        notes: 'Verified clear background check with Pune Police Commissionerate',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.document_type).toBe('POLICE_VERIFICATION');
  });

  it('should retrieve full 10-section driver profile with salary, payroll, and documents', async () => {
    const res = await fetch(`${baseUrl}/api/deliveries/drivers/${driverId}/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('driver');
    expect(json.data).toHaveProperty('deliveries');
    expect(json.data).toHaveProperty('runs');
    expect(json.data).toHaveProperty('salaryConfig');
    expect(json.data).toHaveProperty('payrollRecords');
    expect(json.data).toHaveProperty('documents');
    expect(json.data).toHaveProperty('auditHistory');
    expect(json.data.documents.length).toBeGreaterThan(0);
    expect(json.data.payrollRecords.length).toBeGreaterThan(0);
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/app.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { AuthUser } from '../../src/types/user.types.js';
import { companyRepository } from '../../src/repositories/company.repository.js';
import { dbPool } from '../../src/config/database.js';

describe('Company Management API & RBAC Security Suite', () => {
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

  let createdCompanyId: string;
  let createdCompanyCode: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Clean up created company records
    if (createdCompanyId) {
      await dbPool.query('DELETE FROM companies WHERE id = $1', [createdCompanyId]);
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should reject unauthenticated GET /api/companies with 401', async () => {
    const res = await fetch(`${baseUrl}/api/companies`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should reject unauthenticated POST /api/companies with 401', async () => {
    const res = await fetch(`${baseUrl}/api/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Dairy Corp' }),
    });
    expect(res.status).toBe(401);
  });

  it('should forbid non-admin roles (DRIVER) from creating a company with 403', async () => {
    const res = await fetch(`${baseUrl}/api/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        name: 'Unauthorized Dairy',
        contactPerson: 'Driver John',
        phone: '9876543210',
        email: 'driver.john@delivshop.internal',
        addressLine1: 'Gangapur Road',
        postalCode: '422005',
      }),
    });
    expect(res.status).toBe(403);
  });

  it('should validate required fields and Indian postal code format with 400', async () => {
    const res = await fetch(`${baseUrl}/api/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'A', // too short
        contactPerson: 'Admin',
        phone: '123', // invalid phone
        email: 'not-an-email',
        addressLine1: 'No',
        postalCode: '999', // invalid PIN
      }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('should allow ADMIN to successfully create a new dairy company with auto-generated company code', async () => {
    const testName = `Sahyadri Dairy Farm ${Date.now()}`;
    const res = await fetch(`${baseUrl}/api/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        Origin: 'https://delivshop.vercel.app',
      },
      body: JSON.stringify({
        name: testName,
        companyType: 'Dairy Processor',
        description: 'Premium A2 cow and buffalo milk processing cooperative',
        contactPerson: 'Ramesh Patil',
        phone: '9822012345',
        email: `ramesh.patil.${Date.now()}@sahyadridairy.com`,
        addressLine1: 'Plot No. 45, MIDC Ambad',
        addressLine2: 'Near ITI Circle',
        city: 'Nashik',
        state: 'Maharashtra',
        postalCode: '422010',
        country: 'India',
        gstin: '27AAAAA0000A1Z5',
        pan: 'AAAAA0000A',
        notes: 'Authoritative supplier for North Nashik distribution',
      }),
    });

    expect(res.status).toBe(201);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://delivshop.vercel.app');
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.companyCode).toMatch(/^CMP-\d+$/);
    expect(body.data.name).toBe(testName);
    expect(body.data.status).toBe('ACTIVE');

    createdCompanyId = body.data.id;
    createdCompanyCode = body.data.companyCode;
  });

  it('should reject duplicate company name with 409 Conflict', async () => {
    const company = await companyRepository.findById(createdCompanyId);
    expect(company).toBeDefined();

    const res = await fetch(`${baseUrl}/api/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: company!.name, // duplicate name
        contactPerson: 'Another Person',
        phone: '9822099999',
        email: 'another@example.com',
        addressLine1: 'Some Address',
        postalCode: '422001',
      }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toContain('already exists');
  });

  it('should list companies with pagination, search, and sorting for ADMIN and SUPPLIER', async () => {
    const res = await fetch(`${baseUrl}/api/companies?page=1&limit=5&sortBy=created_at&sortOrder=DESC`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.items)).toBe(true);
    expect(body.data.total).toBeGreaterThanOrEqual(1);
    expect(body.data.items.some((c: any) => c.id === createdCompanyId)).toBe(true);
  });

  it('should search companies by name or company code', async () => {
    const res = await fetch(`${baseUrl}/api/companies?search=${createdCompanyCode}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items.length).toBe(1);
    expect(body.data.items[0].id).toBe(createdCompanyId);
  });

  it('should return company summary statistics with valid counts', async () => {
    const res = await fetch(`${baseUrl}/api/companies/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalCompanies).toBeGreaterThanOrEqual(1);
    expect(body.data.activeCompanies).toBeGreaterThanOrEqual(1);
    expect(typeof body.data.inactiveCompanies).toBe('number');
    expect(typeof body.data.recentCompanies).toBe('number');
  });

  it('should fetch company details by ID', async () => {
    const res = await fetch(`${baseUrl}/api/companies/${createdCompanyId}`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdCompanyId);
    expect(body.data.companyCode).toBe(createdCompanyCode);
    expect(typeof body.data.productsCount).toBe('number');
  });

  it('should allow ADMIN to edit permitted company fields', async () => {
    const updatedContact = 'Sunil Patil (Operations Head)';
    const res = await fetch(`${baseUrl}/api/companies/${createdCompanyId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        contactPerson: updatedContact,
        city: 'Nashik Industrial Zone',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.contactPerson).toBe(updatedContact);
    expect(body.data.city).toBe('Nashik Industrial Zone');
  });

  it('should allow ADMIN to deactivate and reactivate company status', async () => {
    // 1. Deactivate
    const deactRes = await fetch(`${baseUrl}/api/companies/${createdCompanyId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'INACTIVE',
        reason: 'Seasonal maintenance shutdown',
      }),
    });

    expect(deactRes.status).toBe(200);
    const deactBody = await deactRes.json();
    expect(deactBody.data.status).toBe('INACTIVE');

    // 2. Reactivate
    const actRes = await fetch(`${baseUrl}/api/companies/${createdCompanyId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'ACTIVE',
        reason: 'Maintenance complete, resuming processing',
      }),
    });

    expect(actRes.status).toBe(200);
    const actBody = await actRes.json();
    expect(actBody.data.status).toBe('ACTIVE');
  });
});

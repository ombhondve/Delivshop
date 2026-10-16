import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/app.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { AuthUser } from '../../src/types/user.types.js';
import { dbPool } from '../../src/config/database.js';

describe('Fleet Vehicles Management API & Invariants Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  const adminUser: AuthUser = {
    id: 'eff88d78-5b73-448f-8e41-330c46923b79',
    email: 'admin@gmail.com',
    role: 'ADMIN',
  };

  const adminToken = generateAccessToken(adminUser);
  let testVehicleId: string;
  const testReg = `MH-12-TEST-${Date.now().toString().slice(-4)}`;

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
    if (testVehicleId) {
      await dbPool.query('DELETE FROM vehicles WHERE id = $1', [testVehicleId]);
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should fetch fleet summary metrics', async () => {
    const res = await fetch(`${baseUrl}/api/vehicles/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('totalVehicles');
    expect(json.data).toHaveProperty('activeVehicles');
    expect(json.data).toHaveProperty('availableVehicles');
    expect(json.data).toHaveProperty('assignedVehicles');
  });

  it('should list all registered fleet vehicles', async () => {
    const res = await fetch(`${baseUrl}/api/vehicles`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
  });

  it('should allow ADMIN to register a new vehicle asset', async () => {
    const res = await fetch(`${baseUrl}/api/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        registrationNumber: testReg,
        makeModel: 'Tata Ace Gold Petrol/CNG',
        vehicleType: 'Insulated Delivery Van',
        capacityKg: 1200,
        capacityCrates: 65,
        fuelType: 'CNG',
        isRefrigerated: false,
        city: 'Pune',
        depot: 'Pune Central Cold Depot',
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.registration_number).toBe(testReg);
    testVehicleId = json.data.id;
  });

  it('should reject registering vehicle with duplicate registration number', async () => {
    const res = await fetch(`${baseUrl}/api/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        registrationNumber: testReg,
        makeModel: 'Tata Ace Gold EV',
        vehicleType: 'Electric Cargo Van',
      }),
    });
    expect(res.status).toBe(409);
  });

  it('should allow adding verified vehicle document (RC)', async () => {
    const res = await fetch(`${baseUrl}/api/vehicles/${testVehicleId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        documentType: 'RC',
        documentNumber: `RC-${testReg}`,
        issueDate: '2025-01-01',
        expiryDate: '2040-01-01',
        verificationStatus: 'VALID',
        notes: 'Verified against Maharashtra RTO portal',
      }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.document_type).toBe('RC');
  });

  it('should allow recording maintenance service log', async () => {
    const res = await fetch(`${baseUrl}/api/vehicles/${testVehicleId}/maintenance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        serviceType: '5,000 KM Periodic Checkup',
        odometerKm: 5120,
        cost: 2800,
        serviceCenter: 'Authorized Commercial Workshop, Swargate',
        description: 'Engine oil replacement, brake pad tuning, tyre balancing',
      }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.odometer_km).toBe(5120);
  });

  it('should retrieve vehicle details including documents and maintenance', async () => {
    const res = await fetch(`${baseUrl}/api/vehicles/${testVehicleId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.documents.length).toBeGreaterThan(0);
    expect(json.data.maintenance.length).toBeGreaterThan(0);
  });

  it('should enforce deactivation-first deletion invariant on vehicles', async () => {
    // 1. Trying to delete active vehicle must be rejected with 400
    const failRes = await fetch(`${baseUrl}/api/vehicles/${testVehicleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(failRes.status).toBe(400);

    // 2. Mark vehicle as INACTIVE
    const statusRes = await fetch(`${baseUrl}/api/vehicles/${testVehicleId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'INACTIVE' }),
    });
    expect(statusRes.status).toBe(200);

    // 3. Now delete vehicle succeeds
    const delRes = await fetch(`${baseUrl}/api/vehicles/${testVehicleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(delRes.status).toBe(200);
  });
});

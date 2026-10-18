import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../src/app.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import { AuthUser } from '../../src/types/user.types.js';
import { dbPool } from '../../src/config/database.js';

describe('Assignments Secure Deletion & Operational Lifecycle Test Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  const adminUser: AuthUser = {
    id: 'eff88d78-5b73-448f-8e41-330c46923b79',
    email: 'admin@gmail.com',
    role: 'ADMIN',
  };

  const driverUser: AuthUser = {
    id: 'd0000000-0000-0000-0000-000000000001',
    email: 'driver.ramesh@delivshop.com',
    role: 'DRIVER',
  };

  const adminToken = generateAccessToken(adminUser);
  const driverToken = generateAccessToken(driverUser);

  let driverId: string;
  let vehicleId: string;
  let routeId: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // Query active driver
    const drvRes = await dbPool.query("SELECT id FROM users WHERE role = 'DRIVER' AND is_active = TRUE AND deleted_at IS NULL LIMIT 1");
    driverId = drvRes.rows[0]?.id;

    // Query active vehicle without conflicting active runs from other dates
    const vehRes = await dbPool.query(
      `SELECT id FROM vehicles 
       WHERE is_active = TRUE AND deleted_at IS NULL 
       AND id NOT IN (
         SELECT vehicle_id FROM delivery_runs 
         WHERE status IN ('ASSIGNED', 'READY', 'IN_PROGRESS') AND deleted_at IS NULL AND delivery_date < '2026-12-01'
       ) 
       LIMIT 1`
    );
    vehicleId = vehRes.rows[0]?.id;
    if (!vehicleId) {
      const fallbackVeh = await dbPool.query("SELECT id FROM vehicles WHERE is_active = TRUE AND deleted_at IS NULL LIMIT 1");
      vehicleId = fallbackVeh.rows[0]?.id;
    }
    if (vehicleId) {
      await dbPool.query("UPDATE vehicles SET status = 'AVAILABLE' WHERE id = $1", [vehicleId]);
      await dbPool.query("UPDATE vehicle_documents SET expiry_date = '2028-12-31' WHERE vehicle_id = $1", [vehicleId]);
    }

    // Query active or published route
    const routeRes = await dbPool.query("SELECT id FROM routes WHERE status IN ('ACTIVE', 'PUBLISHED') AND deleted_at IS NULL LIMIT 1");
    routeId = routeRes.rows[0]?.id;

    // Clean up any test runs from previous test attempts
    await dbPool.query("DELETE FROM delivery_collections WHERE run_id IN (SELECT id FROM delivery_runs WHERE delivery_date >= '2026-12-01')");
    await dbPool.query("DELETE FROM delivery_run_stops WHERE run_id IN (SELECT id FROM delivery_runs WHERE delivery_date >= '2026-12-01')");
    await dbPool.query("DELETE FROM delivery_runs WHERE delivery_date >= '2026-12-01'");
  });

  afterAll(async () => {
    await dbPool.query("DELETE FROM delivery_collections WHERE run_id IN (SELECT id FROM delivery_runs WHERE delivery_date >= '2026-12-01')");
    await dbPool.query("DELETE FROM delivery_run_stops WHERE run_id IN (SELECT id FROM delivery_runs WHERE delivery_date >= '2026-12-01')");
    await dbPool.query("DELETE FROM delivery_runs WHERE delivery_date >= '2026-12-01'");
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('1. Rejects unauthenticated deletion attempts with 401', async () => {
    const dummyId = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${baseUrl}/api/assignments/${dummyId}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });

  it('2. Rejects unauthorized DRIVER deletion attempts with 403 Forbidden', async () => {
    const dummyId = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${baseUrl}/api/assignments/${dummyId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ reason: 'Unauthorized driver test' }),
    });
    expect(res.status).toBe(403);
  });

  it('3. Returns 404 when deleting a nonexistent assignment', async () => {
    const dummyId = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${baseUrl}/api/assignments/${dummyId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: 'Non-existent delete' }),
    });
    expect(res.status).toBe(404);
  });

  it('4. Allows authorized permanent deletion of an unused / scheduled assignment with no operational dependencies', async () => {
    const testDate = '2026-12-01';

    // Create an assignment
    const createRes = await fetch(`${baseUrl}/api/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        routeId,
        driverId,
        vehicleId,
        deliveryDate: testDate,
        notes: 'Unused assignment to test safe hard deletion',
      }),
    });

    expect(createRes.status).toBe(201);
    const createJson = await createRes.json();
    const runId = createJson.data.id;
    const runCode = createJson.data.run_code;

    // Verify vehicle was assigned
    const vehCheck1 = await dbPool.query('SELECT status FROM vehicles WHERE id = $1', [vehicleId]);
    expect(vehCheck1.rows[0]?.status).toBe('ASSIGNED');

    // Check dependencies API
    const depRes = await fetch(`${baseUrl}/api/assignments/${runId}/dependencies`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(depRes.status).toBe(200);
    const depJson = await depRes.json();
    expect(depJson.data.canHardDelete).toBe(true);
    expect(depJson.data.hasProtectedDependencies).toBe(false);

    // Delete assignment
    const delRes = await fetch(`${baseUrl}/api/assignments/${runId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        reason: 'Testing authorized deletion of unused schedule',
        confirmRunCode: runCode,
      }),
    });

    expect(delRes.status).toBe(200);
    const delJson = await delRes.json();
    expect(delJson.success).toBe(true);
    expect(delJson.data.action).toBe('HARD_DELETE');

    // Verify assignment no longer exists in database
    const dbCheck = await dbPool.query('SELECT id FROM delivery_runs WHERE id = $1', [runId]);
    expect(dbCheck.rows.length).toBe(0);

    // Verify vehicle is released back to AVAILABLE
    const vehCheck2 = await dbPool.query('SELECT status FROM vehicles WHERE id = $1', [vehicleId]);
    expect(vehCheck2.rows[0]?.status).toBe('AVAILABLE');

    // Verify audit log exists
    const auditRes = await dbPool.query(
      "SELECT * FROM audit_logs WHERE action = 'DELIVERY_RUN_DELETED' AND entity_id = $1",
      [runId]
    );
    expect(auditRes.rows.length).toBeGreaterThan(0);
  });

  it('5. Blocks deletion of an active dispatch in IN_PROGRESS status with 409 Conflict', async () => {
    const testDate = '2026-12-02';

    // Create an assignment
    const createRes = await fetch(`${baseUrl}/api/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        routeId,
        driverId,
        vehicleId,
        deliveryDate: testDate,
        notes: 'Run for in-progress deletion blocking test',
      }),
    });

    expect(createRes.status).toBe(201);
    const runId = (await createRes.json()).data.id;

    // Transition to READY then IN_PROGRESS
    await fetch(`${baseUrl}/api/assignments/${runId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'READY' }),
    });

    await fetch(`${baseUrl}/api/assignments/${runId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });

    // Check dependencies API reflects active dispatch
    const depRes = await fetch(`${baseUrl}/api/assignments/${runId}/dependencies`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(depRes.status).toBe(200);
    const depJson = await depRes.json();
    expect(depJson.data.canHardDelete).toBe(false);
    expect(depJson.data.run.status).toBe('IN_PROGRESS');

    // Attempting to delete must be blocked with 409 Conflict
    const delRes = await fetch(`${baseUrl}/api/assignments/${runId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: 'Attempting to delete active run' }),
    });

    expect(delRes.status).toBe(409);
    const delErr = await delRes.json();
    expect(delErr.message).toMatch(/currently in progress/i);

    // Clean up test run by cancelling it so subsequent tests are clean
    await fetch(`${baseUrl}/api/assignments/${runId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'CANCELLED', notes: 'Cleanup from test' }),
    });
  });

  it('6. Safely archives (soft-deletes) completed/historical runs or runs with protected dependencies preserving audit history', async () => {
    const testDate = '2026-12-03';

    // Create an assignment
    const createRes = await fetch(`${baseUrl}/api/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        routeId,
        driverId,
        vehicleId,
        deliveryDate: testDate,
        notes: 'Run for archival / financial dependency preservation test',
      }),
    });

    expect(createRes.status).toBe(201);
    const runId = (await createRes.json()).data.id;

    // Simulate an operational delivery collection record tied to this run
    const receiptNum = `REC-TEST-${Date.now()}`;
    await dbPool.query(
      `INSERT INTO delivery_collections (receipt_number, run_id, shop_id, driver_id, amount, payment_method, notes)
       VALUES ($1, $2, (SELECT id FROM shops LIMIT 1), $3, 450.00, 'CASH', 'Test delivery collection record')`,
      [receiptNum, runId, driverId]
    );

    // Dependencies API should detect the protected collection dependency
    const depRes = await fetch(`${baseUrl}/api/assignments/${runId}/dependencies`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(depRes.status).toBe(200);
    const depJson = await depRes.json();
    expect(depJson.data.dependencies.collectionsCount).toBe(1);
    expect(depJson.data.hasProtectedDependencies).toBe(true);
    expect(depJson.data.canHardDelete).toBe(false);

    // Delete request should gracefully ARCHIVE instead of destroying records
    const delRes = await fetch(`${baseUrl}/api/assignments/${runId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: 'Archiving run with financial collections' }),
    });

    expect(delRes.status).toBe(200);
    const delJson = await delRes.json();
    expect(delJson.success).toBe(true);
    expect(delJson.data.action).toBe('ARCHIVED');

    // Verify row still exists in database with deleted_at set (foreign keys intact)
    const dbCheck = await dbPool.query('SELECT deleted_at, deleted_by, deletion_reason FROM delivery_runs WHERE id = $1', [runId]);
    expect(dbCheck.rows.length).toBe(1);
    expect(dbCheck.rows[0].deleted_at).toBeTruthy();
    expect(dbCheck.rows[0].deletion_reason).toBe('Archiving run with financial collections');

    // Verify financial collection is still completely intact
    const colCheck = await dbPool.query('SELECT amount FROM delivery_collections WHERE run_id = $1', [runId]);
    expect(colCheck.rows.length).toBe(1);
    expect(Number(colCheck.rows[0].amount)).toBe(450.00);

    // Verify audit log was recorded for archival
    const auditRes = await dbPool.query(
      "SELECT * FROM audit_logs WHERE action = 'DELIVERY_RUN_ARCHIVED' AND entity_id = $1",
      [runId]
    );
    expect(auditRes.rows.length).toBeGreaterThan(0);

    // Verify standard listAll excludes archived run by default
    const listRes = await fetch(`${baseUrl}/api/assignments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    const foundInActive = listJson.data.some((r: any) => r.id === runId);
    expect(foundInActive).toBe(false);

    // Verify querying with includeArchived=true retrieves it
    const archivedListRes = await fetch(`${baseUrl}/api/assignments?includeArchived=true`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(archivedListRes.status).toBe(200);
    const archivedJson = await archivedListRes.json();
    const foundInArchived = archivedJson.data.some((r: any) => r.id === runId);
    expect(foundInArchived).toBe(true);
  });

  it('7. Allows cancellation of a scheduled assignment preserving operational history and releasing vehicle', async () => {
    const testDate = '2026-12-04';

    // Create an assignment
    const createRes = await fetch(`${baseUrl}/api/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        routeId,
        driverId,
        vehicleId,
        deliveryDate: testDate,
        notes: 'Run for cancellation workflow test',
      }),
    });

    expect(createRes.status).toBe(201);
    const runId = (await createRes.json()).data.id;

    // Call DELETE with actionType: 'CANCEL'
    const cancelRes = await fetch(`${baseUrl}/api/assignments/${runId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        actionType: 'CANCEL',
        reason: 'Customer cancelled route for this morning',
      }),
    });

    expect(cancelRes.status).toBe(200);
    const cancelJson = await cancelRes.json();
    expect(cancelJson.success).toBe(true);
    expect(cancelJson.data.action).toBe('CANCELLED');

    // Verify assignment status is CANCELLED
    const dbCheck = await dbPool.query('SELECT status, notes FROM delivery_runs WHERE id = $1', [runId]);
    expect(dbCheck.rows[0]?.status).toBe('CANCELLED');

    // Verify audit log
    const auditRes = await dbPool.query(
      "SELECT * FROM audit_logs WHERE action = 'DELIVERY_RUN_CANCELLED' AND entity_id = $1",
      [runId]
    );
    expect(auditRes.rows.length).toBeGreaterThan(0);
  });

  it('8. Enforces concurrency protection and handles duplicate deletion attempts cleanly', async () => {
    const testDate = '2026-12-05';

    // Create an assignment
    const createRes = await fetch(`${baseUrl}/api/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        routeId,
        driverId,
        vehicleId,
        deliveryDate: testDate,
        notes: 'Run for concurrency test',
      }),
    });

    expect(createRes.status).toBe(201);
    const runId = (await createRes.json()).data.id;

    // Send two parallel deletion requests simultaneously
    const [res1, res2] = await Promise.all([
      fetch(`${baseUrl}/api/assignments/${runId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ reason: 'Concurrent request 1' }),
      }),
      fetch(`${baseUrl}/api/assignments/${runId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ reason: 'Concurrent request 2' }),
      }),
    ]);

    // Exactly one must succeed (200), and the second must be rejected or gracefully handled
    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(200);
    const successRes = res1.status === 200 ? res1 : res2;
    const secondRes = res1.status === 200 ? res2 : res1;

    expect((await successRes.json()).success).toBe(true);
    expect([400, 404, 409]).toContain(secondRes.status);
  });
});

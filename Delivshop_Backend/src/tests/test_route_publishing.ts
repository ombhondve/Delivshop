import { query, dbPool } from '../config/database.js';
import { routeService } from '../services/route.service.js';
import { routeRepository } from '../repositories/route.repository.js';
import { updateRouteSchema, createRouteSchema, routeIdParamSchema } from '../schemas/route.schema.js';
import { AppError } from '../utils/errors.js';

async function runRoutePublishingTests() {
  console.log('🚀 RUNNING DELIVSHOP ROUTE PUBLISHING & VALIDATION TEST SUITE\n');

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

  let createdTestRouteId: string | null = null;
  let emptyTestRouteId: string | null = null;

  try {
    // 1. Retrieve an active shop from the database for route stop assignment
    const shopRes = await query(
      `SELECT id, name, status FROM shops WHERE status = 'ACTIVE' AND deleted_at IS NULL LIMIT 2`
    );
    assert(shopRes.rows.length > 0, 'Found active shops in database for route stops');
    const testShop1 = shopRes.rows[0];
    const testShop2 = shopRes.rows[1] || shopRes.rows[0];

    // 2. Test Zod Schema Validation for Route Statuses
    console.log('\n--- 1. Testing Route Zod Schema Validation ---');

    // Valid statuses must pass
    const validStatuses = ['DRAFT', 'ACTIVE', 'PUBLISHED', 'INACTIVE', 'ARCHIVED'];
    for (const status of validStatuses) {
      const parsedUpdate = updateRouteSchema.safeParse({
        body: { status },
      });
      assert(parsedUpdate.success, `updateRouteSchema allows valid status: "${status}"`);

      const parsedCreate = createRouteSchema.safeParse({
        body: {
          name: 'Test Corridor Schema',
          status,
        },
      });
      assert(parsedCreate.success, `createRouteSchema allows valid status: "${status}"`);
    }

    // Invalid status must be rejected with 422 schema error
    const invalidParsed = updateRouteSchema.safeParse({
      body: { status: 'UNKNOWN_STATUS_XYZ' },
    });
    assert(!invalidParsed.success, 'updateRouteSchema rejects invalid status "UNKNOWN_STATUS_XYZ"');

    // Invalid UUID param must be rejected
    const invalidIdParsed = routeIdParamSchema.safeParse({
      params: { id: 'not-a-uuid-123' },
    });
    assert(!invalidIdParsed.success, 'routeIdParamSchema rejects non-UUID parameter');

    const validIdParsed = routeIdParamSchema.safeParse({
      params: { id: '38c353b3-8c3b-4835-9830-4e50ebdbad7b' },
    });
    assert(validIdParsed.success, 'routeIdParamSchema accepts valid UUID parameter');

    // 3. Create a DRAFT route with 1 valid stop
    console.log('\n--- 2. Creating Draft Route With Stops ---');
    const draftRoute = await routeService.createRoute({
      name: 'E2E Publishing Test Route Corridor',
      city: 'Pune',
      state: 'Maharashtra',
      depot: 'Pune Central Cold Depot',
      status: 'DRAFT',
      stops: [
        {
          shopId: testShop1.id,
          stopSequence: 1,
          serviceTimeMinutes: 15,
          deliveryInstructions: 'Deliver to back entrance',
        },
      ],
    });
    createdTestRouteId = draftRoute.id;
    assert(!!createdTestRouteId, `Created test draft route with code "${draftRoute.route_code}"`);
    assert(draftRoute.status === 'DRAFT', 'Initial route status is DRAFT');
    assert((draftRoute.stops?.length || draftRoute.stops_count) === 1, 'Draft route has 1 assigned stop');

    // 4. Test Publishing the Draft Route
    console.log('\n--- 3. Publishing Draft Route ---');
    const published = await routeService.updateRoute(createdTestRouteId, {
      status: 'PUBLISHED',
    });
    assert(published.status === 'PUBLISHED', 'Route status successfully transitioned to PUBLISHED');

    // Verify database record directly
    const dbCheck = await query(`SELECT status, version FROM routes WHERE id = $1`, [createdTestRouteId]);
    assert(dbCheck.rows[0].status === 'PUBLISHED', 'Database record confirms status = PUBLISHED');

    // Verify audit log
    const auditCheck = await query(
      `SELECT action, details FROM audit_logs WHERE entity_id = $1 AND action = 'ROUTE_PUBLISHED' ORDER BY created_at DESC LIMIT 1`,
      [createdTestRouteId]
    );
    assert(auditCheck.rows.length > 0, 'Audit log recorded ROUTE_PUBLISHED event');

    // 5. Test Idempotent Repeated Publishing
    console.log('\n--- 4. Testing Idempotency (Repeated Publish Clicks) ---');
    const rePublished = await routeService.updateRoute(createdTestRouteId, {
      status: 'PUBLISHED',
    });
    assert(rePublished.status === 'PUBLISHED', 'Re-publishing an already published route succeeds idempotently');

    // 6. Test Publishing Route with 0 Stops (Incomplete Route Business Rule)
    console.log('\n--- 5. Testing Business Rule: Route with 0 Stops Cannot Publish ---');
    const emptyDraft = await routeService.createRoute({
      name: 'Empty Corridor With No Stops',
      city: 'Pune',
      state: 'Maharashtra',
      depot: 'Pune Central Cold Depot',
      status: 'DRAFT',
      stops: [],
    });
    emptyTestRouteId = emptyDraft.id;

    let zeroStopsPublishFailed = false;
    let zeroStopsErrorMessage = '';
    try {
      await routeService.updateRoute(emptyTestRouteId, { status: 'PUBLISHED' });
    } catch (err: any) {
      zeroStopsPublishFailed = true;
      zeroStopsErrorMessage = err?.message || '';
    }
    assert(
      zeroStopsPublishFailed && zeroStopsErrorMessage.includes('at least one assigned shop stop'),
      `Attempt to publish empty route properly rejected: "${zeroStopsErrorMessage}"`
    );

    // 7. Test Summary Metrics Reflect Published Status
    console.log('\n--- 6. Verifying Route Summary Metrics ---');
    const summary = await routeService.getSummary();
    assert(summary.publishedRoutes > 0, `Summary reports published routes count > 0 (${summary.publishedRoutes})`);
    assert(summary.dispatchableRoutes > 0, `Summary reports dispatchable routes count > 0 (${summary.dispatchableRoutes})`);

    console.log(`\n======================================================`);
    console.log(`🎉 ALL TESTS PASSED (${passed}/${total})! ROUTE PUBLISHING IS FULLY VERIFIED`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('\n❌ Test suite execution error:', err);
    throw err;
  } finally {
    // Cleanup test records
    if (createdTestRouteId) {
      await query(`DELETE FROM route_stops WHERE route_id = $1`, [createdTestRouteId]);
      await query(`DELETE FROM route_versions WHERE route_id = $1`, [createdTestRouteId]);
      await query(`DELETE FROM routes WHERE id = $1`, [createdTestRouteId]);
    }
    if (emptyTestRouteId) {
      await query(`DELETE FROM route_stops WHERE route_id = $1`, [emptyTestRouteId]);
      await query(`DELETE FROM route_versions WHERE route_id = $1`, [emptyTestRouteId]);
      await query(`DELETE FROM routes WHERE id = $1`, [emptyTestRouteId]);
    }
    await dbPool.end();
  }
}

runRoutePublishingTests();

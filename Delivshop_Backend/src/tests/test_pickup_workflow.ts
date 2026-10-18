import { dbPool } from '../config/database.js';
import { pickupService } from '../services/pickup.service.js';
import { calculateHaversineDistanceMeters } from '../services/map-resolver.service.js';
import { companyRepository } from '../repositories/company.repository.js';
import { createCompanySchema } from '../schemas/company.schema.js';

async function runPickupTests() {
  console.log('🧪 Starting Delivshop Pickup & Company Coordinates Test Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  try {
    // Test 1: Haversine distance accuracy
    const distanceClose = calculateHaversineDistanceMeters(20.0911000, 73.9168000, 20.0912000, 73.9169000);
    assert(distanceClose < 50 && distanceClose > 0, 'Haversine calculates accurate proximity for close points (~15m)', `Got ${distanceClose}m`);

    const distanceFar = calculateHaversineDistanceMeters(20.0911000, 73.9168000, 20.005882, 73.789764);
    assert(distanceFar > 10000, 'Haversine calculates accurate distance for distant points (>10km)', `Got ${distanceFar}m`);

    // Test 2: Schema validation for coordinates
    const validCoordsPayload = {
      body: {
        name: 'Validation Test Dairy',
        contactPerson: 'Tester',
        phone: '9876543210',
        email: 'test@dairy.internal',
        addressLine1: 'Test Facility Rd',
        city: 'Nashik',
        postalCode: '422001',
        latitude: 20.005882,
        longitude: 73.789764,
      },
    };
    const validParsed = createCompanySchema.safeParse(validCoordsPayload);
    assert(validParsed.success, 'createCompanySchema accepts valid coordinates within bounds');

    const invalidLatPayload = {
      body: {
        ...validCoordsPayload.body,
        latitude: 195.5, // Exceeds 90
      },
    };
    const invalidParsed = createCompanySchema.safeParse(invalidLatPayload);
    assert(!invalidParsed.success, 'createCompanySchema rejects latitude > 90');

    // Test 3: Company repository retrieves latitude and longitude
    const company = await companyRepository.findByCompanyCode('CMP-1005');
    assert(company !== null, 'Found seed company CMP-1005');
    if (company) {
      const dto = companyRepository ? await companyRepository.findById(company.id) : null;
      assert(Number(company.latitude) === 20.0911, 'Company CMP-1005 has saved latitude 20.0911', `Got ${company.latitude}`);
      assert(Number(company.longitude) === 73.9168, 'Company CMP-1005 has saved longitude 73.9168', `Got ${company.longitude}`);
    }

    // Test 4: Pickup requirements calculation for Route
    const routeRes = await dbPool.query('SELECT id, name FROM routes LIMIT 1');
    const routeId = routeRes.rows[0]?.id;
    if (routeId) {
      const adminReqs = await pickupService.getPickupRequirements({
        routeId,
        userRole: 'ADMIN',
      });
      assert(adminReqs !== null && typeof adminReqs.summary === 'object', 'Admin can query pickup requirements for route template');

      // Test 5: Driver role price sanitization
      const driverReqs = await pickupService.getPickupRequirements({
        routeId,
        userRole: 'DRIVER',
      });
      assert(driverReqs !== null, 'Driver can query pickup requirements');

      let hasPrices = false;
      for (const comp of driverReqs.companies) {
        for (const prod of comp.products) {
          if (prod.unitPrice !== undefined || prod.totalPrice !== undefined) {
            hasPrices = true;
          }
        }
      }
      assert(!hasPrices, 'Driver pickup requirements STRICTLY omit all pricing fields (unitPrice, totalPrice)');
    }

    // Test 6: Proximity verification (Within 300m pass, outside 300m rejection)
    const runRes = await dbPool.query('SELECT id, driver_id FROM delivery_runs LIMIT 1');
    const run = runRes.rows[0];
    if (run && company) {
      // 6a: Test distance outside 300m
      const farResult = await pickupService.verifyProximity(
        run.id,
        company.id,
        { latitude: 19.95, longitude: 73.80, accuracy: 10 },
        run.driver_id
      );
      assert(!farResult.verified && farResult.distanceMeters > 300, 'Proximity verification FAILS when driver is outside 300m radius', `Distance: ${farResult.distanceMeters}m`);

      // 6b: Test distance inside 300m
      const closeResult = await pickupService.verifyProximity(
        run.id,
        company.id,
        { latitude: 20.0912, longitude: 73.9169, accuracy: 5 },
        run.driver_id
      );
      assert(closeResult.verified && closeResult.distanceMeters <= 300, 'Proximity verification SUCCEEDS when driver is within 300m radius', `Distance: ${closeResult.distanceMeters}m`);
    }

    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runPickupTests();

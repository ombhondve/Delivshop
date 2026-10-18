import { dbPool, query } from '../config/database.js';

const PROD_BASE_URL = 'https://delivshop-vuw7.vercel.app/api';

async function verifyAll() {
  console.log('======================================================================');
  console.log('   DELIVSHOP PRODUCTION AUTHENTICATION & RBAC VERIFICATION SUITE   ');
  console.log('======================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(cond: boolean, label: string) {
    total++;
    if (cond) {
      console.log(`✅ [PASS] ${label}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${label}`);
      throw new Error(`Failed: ${label}`);
    }
  }

  try {
    // 1. Production Health & Neon DB check
    console.log('--- Step 1: Verify Production Backend & Intended Neon Database ---');
    const healthRes = await fetch(`${PROD_BASE_URL}/health`);
    assert(healthRes.status === 200, 'Production /health responds with 200 OK');
    const healthJson: any = await healthRes.json();
    assert(healthJson.status === 'HEALTHY', 'Production health status is HEALTHY');
    assert(healthJson.components.database === 'UP', 'Production database status is UP');
    assert(healthJson.components.schemaInitialized === true, 'Database schema initialized');
    assert(healthJson.components.appliedMigrations.length === 19, 'All 19 PostgreSQL migrations applied');

    // 2. Correct Admin Credentials Login
    console.log('\n--- Step 2: Correct Credentials for Provisioned Admin ---');
    const adminLoginRes = await fetch(`${PROD_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gmail.com', password: 'Admin@Delivshop2026!' }),
    });
    assert(adminLoginRes.status === 200, `Admin login returns 200 OK (got ${adminLoginRes.status})`);
    const adminJson: any = await adminLoginRes.json();
    assert(adminJson.success === true, 'Admin login response has success = true');
    assert(adminJson.data.user.email === 'admin@gmail.com', 'User email is admin@gmail.com');
    assert(adminJson.data.user.role === 'ADMIN', 'User role is ADMIN');
    const adminToken = adminJson.data.tokens.accessToken;
    assert(!!adminToken && adminToken.length > 50, 'Valid JWT access token returned');

    // 3. Protected Admin Endpoint Access
    console.log('\n--- Step 3: Protected Admin Endpoints Access ---');
    const shopsRes = await fetch(`${PROD_BASE_URL}/shops`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(shopsRes.status === 200, `Admin token can access protected GET /shops (status: ${shopsRes.status})`);

    // 4. Unauthenticated Access Blocked
    console.log('\n--- Step 4: Unauthenticated Access Rejection ---');
    const unauthRes = await fetch(`${PROD_BASE_URL}/shops`);
    assert(unauthRes.status === 401, `Unauthenticated GET /shops returns 401 Unauthorized (got ${unauthRes.status})`);

    // 5. Incorrect Credentials Rejection
    console.log('\n--- Step 5: Incorrect Credentials Rejection ---');
    const wrongPassRes = await fetch(`${PROD_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gmail.com', password: 'WrongPassword999!' }),
    });
    assert(wrongPassRes.status === 401, `Wrong password returns 401 Unauthorized (got ${wrongPassRes.status})`);
    const wrongPassJson: any = await wrongPassRes.json();
    assert(wrongPassJson.message.includes('Invalid email or password'), 'Uniform error message returned for wrong password');

    // 6. Non-existent Account Rejection
    console.log('\n--- Step 6: Non-existent Account Rejection ---');
    const noUserRes = await fetch(`${PROD_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent.user.999@delivshop.com', password: 'SomePassword123!' }),
    });
    assert(noUserRes.status === 401, `Unknown email returns 401 Unauthorized (got ${noUserRes.status})`);

    // 7. Inactive Account Login Blocked
    console.log('\n--- Step 7: Inactive Account Rejection ---');
    const inactiveRes = await fetch(`${PROD_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'anil.jadhav@delivshop.com', password: 'SomePassword123!' }),
    });
    assert(inactiveRes.status === 401, `Inactive/unauthorized account rejected with 401 (got ${inactiveRes.status})`);
    const inactiveJson: any = await inactiveRes.json();
    assert(inactiveJson.success === false, 'Inactive/unauthorized account returns success: false');

    // 8. Driver Authentication & RBAC Check
    console.log('\n--- Step 8: Driver Authentication & RBAC Enforcement ---');
    const driverRes = await fetch(`${PROD_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ramesh.kumar@delivshop.com', password: 'Driver@123' }),
    });
    assert(driverRes.status === 200, `Driver login returns 200 OK (got ${driverRes.status})`);
    const driverJson: any = await driverRes.json();
    assert(driverJson.data.user.role === 'DRIVER', 'Driver role is DRIVER');
    const driverToken = driverJson.data.tokens.accessToken;

    const driverRbRes = await fetch(`${PROD_BASE_URL}/shops`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    assert(driverRbRes.status === 403, `Driver denied access to admin GET /shops with 403 (got ${driverRbRes.status})`);

    // 9. Driver Login via Employee ID
    console.log('\n--- Step 9: Driver Login via Employee ID ---');
    const driverEmpRes = await fetch(`${PROD_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'emp-drv-1001', password: 'Driver@123' }),
    });
    assert(driverEmpRes.status === 200, `Driver login via employee ID returns 200 OK (got ${driverEmpRes.status})`);

    // 10. Shop Owner Authentication & RBAC Check
    console.log('\n--- Step 10: Shop Owner Authentication & RBAC Enforcement ---');
    const shopRes = await fetch(`${PROD_BASE_URL}/auth/shop/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId: '20261014001', password: 'Password@123' }),
    });
    assert(shopRes.status === 200, `Shop owner login returns 200 OK (got ${shopRes.status})`);
    const shopJson: any = await shopRes.json();
    assert(shopJson.data.user.role === 'SHOP', 'Shop user role is SHOP');
    const shopToken = shopJson.data.tokens.accessToken;

    const shopRbRes = await fetch(`${PROD_BASE_URL}/shops`, {
      headers: { Authorization: `Bearer ${shopToken}` },
    });
    assert(shopRbRes.status === 403, `Shop owner denied access to admin GET /shops with 403 (got ${shopRbRes.status})`);

    console.log('\n======================================================================');
    console.log(`   🎉 ALL ${passed}/${total} LIVE VERIFICATION TESTS PASSED SUCCESSFULLY!   `);
    console.log('======================================================================');
  } catch (err: any) {
    console.error('\nVerification failed:', err.message);
    process.exit(1);
  } finally {
    await dbPool.end();
  }
}

verifyAll();

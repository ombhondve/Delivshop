import { createApp } from '../app.js';
import { dbPool, query } from '../config/database.js';
import http from 'http';

async function runAuthAuditSuite() {
  console.log('🚀 RUNNING COMPLETE DELIVSHOP AUTHENTICATION & RBAC AUDIT SUITE\n');

  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

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

  try {
    // 1. Health check
    console.log('--- Test 1: Health Endpoint ---');
    const healthRes = await fetch(`${baseUrl}/health`);
    assert(healthRes.status === 200, 'Health responds with 200');
    const healthJson: any = await healthRes.json();
    assert(healthJson.status === 'HEALTHY', 'Health status is HEALTHY');

    // 2. Admin Login with Email & Password
    console.log('\n--- Test 2: Admin Login with Credentials ---');
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gmail.com', password: adminPassword }),
    });
    assert(adminLoginRes.status === 200, `Admin login status is 200 (got ${adminLoginRes.status})`);
    const adminLoginJson: any = await adminLoginRes.json();
    assert(adminLoginJson.success === true, 'Admin login success is true');
    assert(adminLoginJson.data.user.role === 'ADMIN', 'User role is ADMIN');
    const adminAccessToken = adminLoginJson.data.tokens.accessToken;
    const adminRefreshToken = adminLoginJson.data.tokens.refreshToken;
    assert(!!adminAccessToken, 'Admin access token exists');
    assert(!!adminRefreshToken, 'Admin refresh token exists');

    // 3. Admin Access to Protected GET /shops
    console.log('\n--- Test 3: Admin Protected GET /shops ---');
    const shopsRes = await fetch(`${baseUrl}/shops`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    assert(shopsRes.status === 200, `Admin can access GET /shops (status: ${shopsRes.status})`);
    const shopsJson: any = await shopsRes.json();
    assert(Array.isArray(shopsJson.data?.items || shopsJson.data), 'GET /shops returns list of shops');

    // 4. Unauthenticated GET /shops Rejected with 401
    console.log('\n--- Test 4: Unauthenticated GET /shops ---');
    const unauthShopsRes = await fetch(`${baseUrl}/shops`);
    assert(unauthShopsRes.status === 401, `Unauthenticated /shops returns 401 (got ${unauthShopsRes.status})`);
    const unauthJson: any = await unauthShopsRes.json();
    assert(unauthJson.success === false, 'Unauthenticated request returns success: false');
    assert(unauthJson.message.includes('Authentication required'), 'Returns appropriate 401 message');

    // 5. Driver Login with Email
    console.log('\n--- Test 5: Driver Login with Email ---');
    const driverEmailRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ramesh.kumar@delivshop.com', password: 'Driver@123' }),
    });
    assert(driverEmailRes.status === 200, `Driver email login status 200 (got ${driverEmailRes.status})`);
    const driverEmailJson: any = await driverEmailRes.json();
    assert(driverEmailJson.data.user.role === 'DRIVER', 'Driver role is DRIVER');
    const driverAccessToken = driverEmailJson.data.tokens.accessToken;
    const driverRefreshToken = driverEmailJson.data.tokens.refreshToken;

    // 6. Driver Login with Employee ID (Case Insensitive)
    console.log('\n--- Test 6: Driver Login with Employee ID (emp-drv-1001) ---');
    const driverEmpRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'emp-drv-1001', password: 'Driver@123' }),
    });
    assert(driverEmpRes.status === 200, `Driver employee ID login status 200 (got ${driverEmpRes.status})`);
    const driverEmpJson: any = await driverEmpRes.json();
    assert(driverEmpJson.data.user.employeeId === 'EMP-DRV-1001', 'Driver employee ID correctly resolved');

    // 7. Driver Login with Phone Number
    console.log('\n--- Test 7: Driver Login with Phone Number (+91 98234 11223) ---');
    const driverPhoneRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '9823411223', password: 'Driver@123' }),
    });
    assert(driverPhoneRes.status === 200, `Driver phone login status 200 (got ${driverPhoneRes.status})`);

    // 8. Driver Accessing Admin Endpoint GET /shops Rejected with 403 Forbidden
    console.log('\n--- Test 8: Driver Access to GET /shops (RBAC check) ---');
    const driverShopsRes = await fetch(`${baseUrl}/shops`, {
      headers: { Authorization: `Bearer ${driverAccessToken}` },
    });
    assert(driverShopsRes.status === 403, `Driver denied access to GET /shops with 403 (got ${driverShopsRes.status})`);

    // 9. Shop Owner Login with Shop ID
    console.log('\n--- Test 9: Shop Owner Login with Shop ID (20261014001) ---');
    const shopLoginRes = await fetch(`${baseUrl}/auth/shop/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId: '20261014001', password: 'Password@123' }),
    });
    assert(shopLoginRes.status === 200, `Shop login status 200 (got ${shopLoginRes.status})`);
    const shopJson: any = await shopLoginRes.json();
    assert(shopJson.data.user.role === 'SHOP', 'User role is SHOP');
    const shopAccessToken = shopJson.data.tokens.accessToken;
    const shopRefreshToken = shopJson.data.tokens.refreshToken;

    // 10. Shop Owner Accessing Shop Portal Profile GET /shop/me
    console.log('\n--- Test 10: Shop Owner Access to GET /shop/me ---');
    const shopProfileRes = await fetch(`${baseUrl}/shop/me`, {
      headers: { Authorization: `Bearer ${shopAccessToken}` },
    });
    assert(shopProfileRes.status === 200, `Shop profile fetched successfully (got ${shopProfileRes.status})`);
    const shopProfileJson: any = await shopProfileRes.json();
    assert(shopProfileJson.data.shop_id === '20261014001', 'Shop ID matches in profile');

    // 11. Shop Owner Accessing Admin GET /shops Rejected with 403 Forbidden
    console.log('\n--- Test 11: Shop Owner Access to GET /shops (RBAC check) ---');
    const shopShopsRes = await fetch(`${baseUrl}/shops`, {
      headers: { Authorization: `Bearer ${shopAccessToken}` },
    });
    assert(shopShopsRes.status === 403, `Shop denied access to GET /shops with 403 (got ${shopShopsRes.status})`);

    // 12. Valid Token Refresh via POST /auth/refresh
    console.log('\n--- Test 12: Token Refresh with Valid Refresh Token ---');
    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: adminRefreshToken }),
    });
    assert(refreshRes.status === 200, `Refresh responds with 200 (got ${refreshRes.status})`);
    const refreshJson: any = await refreshRes.json();
    assert(!!refreshJson.data.tokens.accessToken, 'New access token generated on refresh');

    // 13. Invalid Token Refresh Rejected with 401
    console.log('\n--- Test 13: Token Refresh with Invalid Refresh Token ---');
    const badRefreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'invalid.jwt.token.string' }),
    });
    assert(badRefreshRes.status === 401, `Invalid refresh token rejected with 401 (got ${badRefreshRes.status})`);

    // 14. Empty Token Refresh Rejected with 401
    console.log('\n--- Test 14: Token Refresh with Empty Body ---');
    const emptyRefreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(emptyRefreshRes.status === 401, `Empty refresh rejected with 401 (got ${emptyRefreshRes.status})`);

    // 15. Invalid Login Credentials Rejected with 401
    console.log('\n--- Test 15: Invalid Login Credentials ---');
    const badCredsRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gmail.com', password: 'WrongPassword999!' }),
    });
    assert(badCredsRes.status === 401, `Wrong password rejected with 401 (got ${badCredsRes.status})`);

    // 16. Malformed Login Payload Rejected with 422
    console.log('\n--- Test 16: Malformed Login Payload (Empty Object) ---');
    const malformedRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(malformedRes.status === 422, `Malformed body rejected with 422 (got ${malformedRes.status})`);

    console.log(`\n🎉 ALL ${passed}/${total} AUTHENTICATION & RBAC AUDIT SUITE TESTS PASSED!`);
  } catch (err) {
    console.error('❌ Audit suite failed:', err);
    throw err;
  } finally {
    server.close();
    await dbPool.end();
  }
}

runAuthAuditSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});

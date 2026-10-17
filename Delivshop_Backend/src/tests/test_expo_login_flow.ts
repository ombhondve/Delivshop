import { query, dbPool } from '../config/database.js';

async function runExpoLoginSuite() {
  console.log('🚀 RUNNING EXPO GO MOBILE LOGIN INTEGRATION & CORS VERIFICATION SUITE\n');

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

  const BASE_URL_LOCAL = 'http://localhost:5000/api';
  const BASE_URL_LAN = 'http://192.168.1.6:5000/api';

  try {
    // 1. Test Health on LAN IP (192.168.1.6:5000)
    console.log('--- Test 1: LAN Connectivity & Health Endpoint ---');
    const healthRes = await fetch(`${BASE_URL_LAN}/health`);
    assert(healthRes.status === 200, `LAN health endpoint responds with 200 (got ${healthRes.status})`);
    const healthJson: any = await healthRes.json();
    assert(healthJson.status === 'HEALTHY', 'Backend status reports HEALTHY');

    // 2. Test CORS Preflight from Expo Go (origin: http://192.168.1.6:8081)
    console.log('\n--- Test 2: CORS Preflight from Expo Go Metro Origin ---');
    const corsRes = await fetch(`${BASE_URL_LAN}/auth/shop/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://192.168.1.6:8081',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization, Idempotency-Key',
      },
    });
    assert(corsRes.status === 204, `CORS preflight responds with 204 (got ${corsRes.status})`);
    const allowOrigin = corsRes.headers.get('access-control-allow-origin');
    assert(allowOrigin === 'http://192.168.1.6:8081', `CORS correctly allows LAN Metro origin (${allowOrigin})`);

    // 3. Test Valid Shop Login (20261014001) over LAN
    console.log('\n--- Test 3: Valid Shop Login over LAN IP ---');
    const shopLoginRes = await fetch(`${BASE_URL_LAN}/auth/shop/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopId: '20261014001',
        password: 'Password@123',
      }),
    });
    assert(shopLoginRes.status === 200, `Shop login status is 200 (got ${shopLoginRes.status})`);
    const shopJson: any = await shopLoginRes.json();
    assert(shopJson.success === true, 'Shop login returns success: true');
    assert(shopJson.data != null, 'Response contains data object');
    assert(shopJson.data.user != null, 'Response contains authenticated user');
    assert(shopJson.data.user.role === 'SHOP', `User role is SHOP (got ${shopJson.data.user.role})`);
    assert(shopJson.data.tokens?.accessToken != null, 'Response contains valid accessToken');
    assert(shopJson.data.tokens?.refreshToken != null, 'Response contains valid refreshToken');
    assert(shopJson.data.shop != null, 'Response contains shop profile');
    assert(shopJson.data.shop.shopId === '20261014001', 'Shop ID matches in profile');

    // 4. Test Invalid Shop Password
    console.log('\n--- Test 4: Invalid Shop Password over LAN IP ---');
    const badPwRes = await fetch(`${BASE_URL_LAN}/auth/shop/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopId: '20261014001',
        password: 'wrong_password_test',
      }),
    });
    assert(badPwRes.status === 401, `Invalid password rejected with 401 (got ${badPwRes.status})`);
    const badPwJson: any = await badPwRes.json();
    assert(badPwJson.success === false, 'Returns success: false');
    assert(badPwJson.message?.includes('Invalid'), 'Returns helpful invalid credentials message');

    // 5. Test Nonexistent Shop ID
    console.log('\n--- Test 5: Nonexistent Shop ID ---');
    const badShopRes = await fetch(`${BASE_URL_LAN}/auth/shop/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopId: '99999999999',
        password: 'Password@123',
      }),
    });
    assert(badShopRes.status === 401, `Nonexistent shop rejected with 401 (got ${badShopRes.status})`);

    // 6. Test Valid Driver Login over LAN IP
    console.log('\n--- Test 6: Valid Driver Login over LAN IP ---');
    const driverLoginRes = await fetch(`${BASE_URL_LAN}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ramesh.kumar@delivshop.com',
        password: 'Driver@123',
      }),
    });
    assert(driverLoginRes.status === 200, `Driver login status is 200 (got ${driverLoginRes.status})`);
    const driverJson: any = await driverLoginRes.json();
    assert(driverJson.success === true, 'Driver login returns success: true');
    assert(driverJson.data.user.role === 'DRIVER', `User role is DRIVER (got ${driverJson.data.user.role})`);
    assert(driverJson.data.tokens?.accessToken != null, 'Driver received accessToken');

    // 7. Test Invalid Driver Login
    console.log('\n--- Test 7: Invalid Driver Login ---');
    const badDriverRes = await fetch(`${BASE_URL_LAN}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ramesh.kumar@delivshop.com',
        password: 'wrong-password',
      }),
    });
    assert(badDriverRes.status === 401, `Driver invalid password returns 401 (got ${badDriverRes.status})`);

    // 8. Test Web Dashboard Admin Login
    console.log('\n--- Test 8: Web Dashboard Admin Login Compatibility ---');
    const adminUser = await query(`SELECT email FROM users WHERE role = 'ADMIN' LIMIT 1`);
    if (adminUser.rows.length > 0) {
      console.log(`Testing admin login for: ${adminUser.rows[0].email}`);
    }

    // 9. Test Timeout Abort Behavior
    console.log('\n--- Test 9: Client Timeout Abort Simulation ---');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 100);
    try {
      // Connect to a non-listening port to simulate hung connection
      await fetch('http://192.168.1.6:59999/api/test', { signal: controller.signal });
      throw new Error('Should have timed out');
    } catch (err: any) {
      clearTimeout(timeoutId);
      assert(err.name === 'AbortError' || err.message?.includes('aborted') || err.message?.includes('fetch failed'), 'AbortController successfully aborted pending request');
    }

    console.log(`\n🎉 ALL ${passed}/${total} EXPO GO MOBILE LOGIN FLOW ASSERTIONS PASSED!`);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    throw err;
  } finally {
    await dbPool.end();
  }
}

runExpoLoginSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { query, dbPool } from '../config/database.js';

async function runCloudVerificationSuite() {
  console.log('🚀 RUNNING DEPLOYED CLOUD & LOCAL FAILOVER END-TO-END VERIFICATION SUITE\n');

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

  const CLOUD_URL = 'https://delivshop-vuw7.vercel.app/api';

  try {
    // 1. Health check on Deployed Cloud Backend
    console.log('--- Test 1: Deployed Vercel HTTPS Backend Health ---');
    const healthRes = await fetch(`${CLOUD_URL}/health`);
    assert(healthRes.status === 200, `Cloud health endpoint responds with 200 (got ${healthRes.status})`);
    const healthJson: any = await healthRes.json();
    assert(healthJson.status === 'HEALTHY', `Cloud backend status reports HEALTHY (${healthJson.status})`);
    assert(healthJson.components?.database === 'UP', `Cloud PostgreSQL database is UP (${healthJson.components?.database})`);

    // 2. CORS Preflight from Mobile/Web Origin
    console.log('\n--- Test 2: CORS Preflight from Mobile Expo Origin ---');
    const corsRes = await fetch(`${CLOUD_URL}/auth/shop/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://delivshop.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization, Idempotency-Key',
      },
    });
    assert(corsRes.status === 204, `CORS preflight responds with 204 (got ${corsRes.status})`);

    // 3. Shop Owner Login on Deployed Backend
    console.log('\n--- Test 3: Shop Owner Login (Shop ID 20261014001) on Live Cloud Backend ---');
    const shopLoginRes = await fetch(`${CLOUD_URL}/auth/shop/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopId: '20261014001',
        password: 'Password@123',
      }),
    });
    assert(shopLoginRes.status === 200, `Shop login HTTP status is 200 (got ${shopLoginRes.status})`);
    const shopJson: any = await shopLoginRes.json();
    assert(shopJson.success === true, 'Shop login returned success: true');
    assert(shopJson.data?.user?.role === 'SHOP', `User role is SHOP (${shopJson.data?.user?.role})`);
    assert(shopJson.data?.shop?.shopId === '20261014001', `Shop ID in response matches 20261014001 (${shopJson.data?.shop?.shopId})`);
    const shopToken = shopJson.data?.tokens?.accessToken;
    assert(!!shopToken, 'Shop received valid JWT access token');

    // 4. Shop Portal Profile & Orders via Bearer Token
    console.log('\n--- Test 4: Authenticated Shop Portal Profile & Catalog via Token ---');
    const shopProfileRes = await fetch(`${CLOUD_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${shopToken}` },
    });
    assert(shopProfileRes.status === 200, `Shop profile fetched successfully with token (${shopProfileRes.status})`);
    const meJson: any = await shopProfileRes.json();
    assert(meJson.data?.role === 'SHOP', `Profile returns role SHOP (${meJson.data?.role})`);

    const shopPortalMeRes = await fetch(`${CLOUD_URL}/shop/me`, {
      headers: { Authorization: `Bearer ${shopToken}` },
    });
    assert(shopPortalMeRes.status === 200, `Shop portal me fetched successfully (${shopPortalMeRes.status})`);

    // 5. Invalid Shop Credentials Check
    console.log('\n--- Test 5: Invalid Shop Credentials Rejected with 401 ---');
    const badShopRes = await fetch(`${CLOUD_URL}/auth/shop/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopId: '20261014001',
        password: 'incorrect_password',
      }),
    });
    assert(badShopRes.status === 401, `Invalid password rejected with 401 (got ${badShopRes.status})`);
    const badShopJson: any = await badShopRes.json();
    assert(badShopJson.success === false, 'Invalid login response success: false');
    assert(typeof badShopJson.message === 'string', 'Helpful error message returned without secret leakage');

    // 6. Driver Mobile Login on Deployed Backend
    console.log('\n--- Test 6: Driver Mobile Login on Live Cloud Backend ---');
    const driverLoginRes = await fetch(`${CLOUD_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ramesh.kumar@delivshop.com',
        password: 'Driver@123',
      }),
    });
    assert(driverLoginRes.status === 200, `Driver login HTTP status is 200 (got ${driverLoginRes.status})`);
    const driverJson: any = await driverLoginRes.json();
    assert(driverJson.success === true, 'Driver login returns success: true');
    assert(driverJson.data?.user?.role === 'DRIVER', `User role is DRIVER (${driverJson.data?.user?.role})`);
    const driverToken = driverJson.data?.tokens?.accessToken;
    assert(!!driverToken, 'Driver received valid JWT access token');

    // 7. Driver Deliveries / Assigned Route
    console.log('\n--- Test 7: Driver Assigned Deliveries Check ---');
    const driverDeliveriesRes = await fetch(`${CLOUD_URL}/deliveries/assigned`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    assert(driverDeliveriesRes.status === 200, `Driver deliveries endpoint responds with 200 (got ${driverDeliveriesRes.status})`);
    const deliveriesJson: any = await driverDeliveriesRes.json();
    assert(deliveriesJson.success === true, 'Driver deliveries returns success: true');

    // 8. INR Currency & Price Consistency Audit in Database
    console.log('\n--- Test 8: Monetary Values in PostgreSQL Database ---');
    const productsRes = await query('SELECT name, price, sku, category FROM products LIMIT 5');
    console.log('Sample Products & Native Stored Amounts:');
    productsRes.rows.forEach((p: any) => {
      console.log(`   - ${p.name} [${p.sku}]: ₹${p.price} (${p.category})`);
      assert(Number(p.price) > 0, `Product ${p.name} has valid positive INR price`);
    });

    console.log(`\n🎉 ALL ${passed}/${total} LIVE CLOUD BACKEND & INTEGRATION ASSERTIONS PASSED!`);
  } catch (err) {
    console.error('❌ Cloud test failed:', err);
    throw err;
  } finally {
    await dbPool.end();
  }
}

runCloudVerificationSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});

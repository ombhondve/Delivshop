import { query, dbPool } from '../config/database.js';
import { shopAuthService } from '../services/shop-auth.service.js';
import { authService } from '../services/auth.service.js';

async function testMobileAuth() {
  console.log('🧪 VERIFYING MOBILE AUTHENTICATION CAPABILITIES\n');

  try {
    // 1. Check shop accounts
    const shops = await query(
      `SELECT s.id, s.shop_id, s.name, s.email, u.email as user_email, sa.must_change_password
       FROM shops s
       JOIN users u ON s.owner_id = u.id
       JOIN shop_accounts sa ON s.id = sa.shop_id
       LIMIT 5`
    );
    console.log('Existing Shops with Accounts:', shops.rows);

    // 2. Check drivers
    const drivers = await query(
      `SELECT id, name, email, role, is_active FROM users WHERE role = 'DRIVER' LIMIT 5`
    );
    console.log('Existing Drivers:', drivers.rows);

    // 3. Test shop login with invalid credentials
    try {
      await shopAuthService.login({ shopId: 'INVALID-SHOP', password: 'password123' });
      console.error('❌ Shop login should have failed for invalid shop');
    } catch (err: any) {
      console.log('✅ [PASS] Shop login correctly rejected invalid shop:', err.message);
    }

    // 4. Test driver login with invalid credentials
    try {
      await authService.login({ email: 'nonexistent@delivshop.com', password: 'password123' });
      console.error('❌ Driver login should have failed for nonexistent email');
    } catch (err: any) {
      console.log('✅ [PASS] Driver login correctly rejected invalid driver:', err.message);
    }
  } catch (err) {
    console.error('Database query error:', err);
  } finally {
    await dbPool.end();
  }
}

testMobileAuth();

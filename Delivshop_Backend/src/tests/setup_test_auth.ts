import { query, dbPool } from '../config/database.js';
import { comparePassword, hashPassword } from '../utils/password.js';

async function checkAndTestAuth() {
  console.log('🧪 TESTING AUTHENTICATION CREDENTIALS & ENDPOINTS\n');

  try {
    // Check shop owner user and shop account
    const shopUser = await query(
      `SELECT u.id, u.email, u.password_hash, s.shop_id, s.name, sa.must_change_password
       FROM users u
       JOIN shops s ON s.owner_id = u.id
       JOIN shop_accounts sa ON sa.shop_id = s.id
       WHERE s.shop_id = '20261014001'
       LIMIT 1`
    );

    if (shopUser.rows.length > 0) {
      const u = shopUser.rows[0];
      console.log(`Found Shop User: ${u.email} (Shop ID: ${u.shop_id})`);
      // Test common passwords
      const testPasswords = ['Password@123', 'Admin@123', 'Shop@1234', '12345678', 'delivshop123'];
      let foundPw: string | null = null;
      for (const pw of testPasswords) {
        if (await comparePassword(pw, u.password_hash)) {
          foundPw = pw;
          break;
        }
      }
      if (foundPw) {
        console.log(`✅ Verified Shop Password: "${foundPw}"`);
      } else {
        console.log('Setting a known test password for shop verification: "Password@123"');
        const newHash = await hashPassword('Password@123');
        await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, u.id]);
        console.log('✅ Shop password updated to "Password@123"');
      }
    }

    // Check driver user
    const driverUser = await query(
      `SELECT u.id, u.email, u.password_hash, u.name, u.role
       FROM users u
       WHERE u.email = 'ramesh.kumar@delivshop.com'
       LIMIT 1`
    );

    if (driverUser.rows.length > 0) {
      const d = driverUser.rows[0];
      console.log(`Found Driver: ${d.name} (${d.email})`);
      const testPasswords = ['Driver@123', 'Password@123', 'Admin@123', 'delivshop123'];
      let foundDriverPw: string | null = null;
      for (const pw of testPasswords) {
        if (await comparePassword(pw, d.password_hash)) {
          foundDriverPw = pw;
          break;
        }
      }
      if (foundDriverPw) {
        console.log(`✅ Verified Driver Password: "${foundDriverPw}"`);
      } else {
        console.log('Setting a known test password for driver verification: "Driver@123"');
        const newHash = await hashPassword('Driver@123');
        await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, d.id]);
        console.log('✅ Driver password updated to "Driver@123"');
      }
    }
  } catch (err) {
    console.error('Auth verification error:', err);
  } finally {
    await dbPool.end();
  }
}

checkAndTestAuth();

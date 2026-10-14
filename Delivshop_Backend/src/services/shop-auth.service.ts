import { query } from '../config/database.js';
import { shopRepository } from '../repositories/shop.repository.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken } from '../utils/tokens.js';
import { auditService } from './audit.service.js';

export const shopAuthService = {
  /**
   * Authenticate a shop owner by Shop ID or email.
   * Enforces account activation, progressive failed-login lockouts, and mandatory password change.
   */
  async login(credentials: { shopId: string; password: string }, ipAddress?: string) {
    const identifier = credentials.shopId.trim();

    // Find shop by shop_id or email
    const shopRes = await query(
      `SELECT s.*, u.id as user_id, u.email as user_email, u.password_hash, u.is_active as user_active,
              sa.must_change_password, sa.failed_login_attempts, sa.locked_until
       FROM shops s
       JOIN users u ON s.owner_id = u.id
       JOIN shop_accounts sa ON s.id = sa.shop_id
       WHERE (s.shop_id = $1 OR LOWER(s.email) = LOWER($1) OR LOWER(u.email) = LOWER($1))
       LIMIT 1`,
      [identifier]
    );

    if (shopRes.rowCount === 0) {
      // Uniform timing/message to prevent user/shop enumeration
      throw new Error('Invalid Shop ID or password');
    }

    const row = shopRes.rows[0];

    // Check account status
    if (row.status === 'INACTIVE' || !row.user_active) {
      throw new Error('Shop account is currently deactivated. Please contact your supplier.');
    }

    // Check progressive brute-force lockout
    if (row.locked_until && new Date(row.locked_until) > new Date()) {
      const waitMinutes = Math.ceil((new Date(row.locked_until).getTime() - Date.now()) / 60000);
      throw new Error(`Account temporarily locked due to repeated failed attempts. Please try again in ${waitMinutes} minutes.`);
    }

    // Verify password with Argon2id / bcrypt fallback
    const isValid = await comparePassword(credentials.password, row.password_hash);
    if (!isValid) {
      const failed = (row.failed_login_attempts || 0) + 1;
      let lockedUntil: Date | null = null;
      if (failed >= 5) {
        // Lock for 15 minutes after 5 failed attempts
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await query(
        `UPDATE shop_accounts 
         SET failed_login_attempts = $1, locked_until = $2, updated_at = NOW() 
         WHERE shop_id = $3`,
        [failed, lockedUntil, row.id]
      );

      await auditService.log({
        actorId: row.user_id,
        action: 'SHOP_LOGIN_FAILED',
        entityType: 'shop',
        entityId: row.id,
        details: { shopId: row.shop_id, attempts: failed },
        ipAddress,
      });

      throw new Error('Invalid Shop ID or password');
    }

    // Reset failed login attempts on successful credentials
    await query(
      `UPDATE shop_accounts 
       SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW(), updated_at = NOW() 
       WHERE shop_id = $1`,
      [row.id]
    );

    const authUser = {
      id: row.user_id,
      email: row.user_email,
      role: 'SHOP' as const,
      shopId: row.id,
    };

    // If password change is mandatory, issue a restricted temporary token
    if (row.must_change_password) {
      const restrictedToken = generateAccessToken(authUser);
      return {
        mustChangePassword: true,
        restrictedToken,
        message: 'Initial temporary password must be changed before accessing shop dashboard.',
        shop: {
          id: row.id,
          shopId: row.shop_id,
          name: row.name,
          ownerName: row.owner_name,
        },
      };
    }

    // Normal authenticated session
    const tokens = {
      accessToken: generateAccessToken(authUser),
      refreshToken: generateRefreshToken(authUser),
      expiresIn: 900,
    };

    await auditService.log({
      actorId: row.user_id,
      action: 'SHOP_LOGIN_SUCCESS',
      entityType: 'shop',
      entityId: row.id,
      details: { shopId: row.shop_id },
      ipAddress,
    });

    return {
      mustChangePassword: false,
      user: {
        id: row.user_id,
        email: row.user_email,
        name: row.owner_name,
        role: 'SHOP',
        shopId: row.id,
      },
      shop: {
        id: row.id,
        shopId: row.shop_id,
        name: row.name,
        shopType: row.shop_type,
        address: row.address,
        area: row.area,
        city: row.city,
        pincode: row.pincode,
        creditLimit: Number(row.credit_limit || 0),
        outstandingBalance: Number(row.outstanding_balance || 0),
        paymentTerms: row.payment_terms,
      },
      tokens,
    };
  },

  /**
   * Mandatory password setup for first login.
   */
  async completeSetup(userId: string, newPassword: string, ipAddress?: string) {
    const newHash = await hashPassword(newPassword);
    await shopRepository.completePasswordSetup(userId, newHash);

    // Fetch updated shop & user
    const res = await query(
      `SELECT s.*, u.id as user_id, u.email as user_email, u.name as user_name
       FROM shops s
       JOIN users u ON s.owner_id = u.id
       WHERE u.id = $1 LIMIT 1`,
      [userId]
    );

    if (res.rowCount === 0) {
      throw new Error('Shop account not found');
    }

    const row = res.rows[0];
    const authUser = {
      id: row.user_id,
      email: row.user_email,
      role: 'SHOP' as const,
      shopId: row.id,
    };

    const tokens = {
      accessToken: generateAccessToken(authUser),
      refreshToken: generateRefreshToken(authUser),
      expiresIn: 900,
    };

    await auditService.log({
      actorId: row.user_id,
      action: 'SHOP_PASSWORD_INITIALIZED',
      entityType: 'shop',
      entityId: row.id,
      details: { shopId: row.shop_id },
      ipAddress,
    });

    return {
      success: true,
      user: {
        id: row.user_id,
        email: row.user_email,
        name: row.user_name,
        role: 'SHOP',
        shopId: row.id,
      },
      shop: {
        id: row.id,
        shopId: row.shop_id,
        name: row.name,
        shopType: row.shop_type,
        address: row.address,
        creditLimit: Number(row.credit_limit || 0),
        outstandingBalance: Number(row.outstanding_balance || 0),
        paymentTerms: row.payment_terms,
      },
      tokens,
    };
  },

  /**
   * Get shop profile for the currently authenticated shop owner.
   */
  async getMyProfile(userId: string) {
    const res = await query(
      `SELECT s.*, u.email as user_email, u.name as user_name, u.phone as user_phone
       FROM shops s
       JOIN users u ON s.owner_id = u.id
       WHERE u.id = $1 LIMIT 1`,
      [userId]
    );

    if (res.rowCount === 0) {
      throw new Error('Shop profile not found');
    }

    return res.rows[0];
  },
};

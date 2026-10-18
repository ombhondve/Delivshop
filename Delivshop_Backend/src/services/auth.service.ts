import { query } from '../config/database.js';
import { userRepository } from '../repositories/user.repository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokens.js';
import { auditService } from './audit.service.js';
import { UserRole } from '../types/user.types.js';
import { logger } from '../utils/logger.js';

export const authService = {
  async register(
    data: { email: string; password: string; name: string; role: UserRole; phone?: string },
    ipAddress?: string
  ) {
    // Privilege escalation protection: Administrator accounts must never be created via public registration
    if (data.role === 'ADMIN') {
      throw new Error('Registration with administrator privileges is prohibited via public API');
    }

    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new Error('An account with this email address already exists');
    }

    const passwordHash = await hashPassword(data.password);
    const user = await userRepository.create({
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role,
      phone: data.phone,
    });

    await auditService.log({
      actorId: user.id,
      action: 'USER_REGISTERED',
      entityType: 'user',
      entityId: user.id,
      details: { email: user.email, role: user.role },
      ipAddress,
    });

    const authUser = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const tokens = {
      accessToken: generateAccessToken(authUser),
      refreshToken: generateRefreshToken(authUser),
      expiresIn: 900, // 15 mins
    };

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        createdAt: user.created_at,
      },
      tokens,
    };
  },

  async login(credentials: { email: string; password: string }, ipAddress?: string) {
    const rawIdentifier = credentials?.email ? String(credentials.email).trim() : '';
    const safeIp = ipAddress || 'unknown';

    let user: any = null;
    try {
      user = await userRepository.findByEmail(rawIdentifier);
      if (!user) {
        user = await userRepository.findByIdentifier(rawIdentifier);
      }
    } catch (dbErr: any) {
      logger.error(`[Auth Diagnostic] Database query error during account lookup for "${rawIdentifier}" (IP: ${safeIp}):`, dbErr);
      throw new Error('Security database service temporarily unreachable.');
    }

    if (!user) {
      // Safe internal diagnostic logging: account lookup failure (uniform error prevents enumeration)
      logger.warn(`[Auth Diagnostic] Login failed: No user account found for identifier "${rawIdentifier}" (IP: ${safeIp})`);
      throw new Error('Invalid email or password');
    }

    let validPassword = false;
    try {
      validPassword = await comparePassword(credentials.password, user.password_hash);
    } catch (hashErr: any) {
      logger.error(`[Auth Diagnostic] Error during password comparison for user ID "${user.id}" (IP: ${safeIp}):`, hashErr);
      throw new Error('Invalid email or password');
    }

    if (!validPassword) {
      // Safe internal diagnostic logging: password verification failed without leaking password or hash
      const hashAlgo = user.password_hash?.startsWith('$argon2')
        ? 'Argon2id'
        : user.password_hash?.startsWith('$2')
        ? 'bcrypt'
        : 'unknown';
      logger.warn(
        `[Auth Diagnostic] Login failed: Password verification mismatch for user ID "${user.id}" (Role: ${user.role}, HashAlgo: ${hashAlgo}, IP: ${safeIp})`
      );
      throw new Error('Invalid email or password');
    }

    if (!user.is_active) {
      // Safe internal diagnostic logging: account deactivated
      logger.warn(
        `[Auth Diagnostic] Login blocked: Account is deactivated for user ID "${user.id}" (Role: ${user.role}, IP: ${safeIp})`
      );
      throw new Error('Account has been deactivated. Please contact support.');
    }

    await auditService.log({
      actorId: user.id,
      action: 'USER_LOGIN',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
    });

    let shopRecord: any = null;
    if (user.role === 'SHOP') {
      try {
        const shopRes = await query(
          `SELECT s.id, s.shop_id, s.name, s.shop_type, s.address, s.credit_limit, s.payment_terms
           FROM shops s WHERE s.owner_id = $1 AND s.deleted_at IS NULL LIMIT 1`,
          [user.id]
        );
        shopRecord = shopRes.rows[0] || null;
      } catch (shopErr: any) {
        logger.error(`[Auth Diagnostic] Database error querying shop record for user ID "${user.id}":`, shopErr);
      }
    }

    const authUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      driverId: user.role === 'DRIVER' ? user.id : undefined,
      employeeId: user.employee_id,
      shopId: shopRecord?.shop_id,
    };

    const tokens = {
      accessToken: generateAccessToken(authUser),
      refreshToken: generateRefreshToken(authUser),
      expiresIn: 900,
    };

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        employeeId: user.employee_id,
        shopId: shopRecord?.shop_id,
        createdAt: user.created_at,
      },
      tokens,
      shop: shopRecord,
    };
  },

  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    let shopRecord: any = null;
    if (user.role === 'SHOP') {
      const shopRes = await query(
        `SELECT s.id, s.shop_id, s.name, s.shop_type, s.address, s.credit_limit, s.payment_terms
         FROM shops s WHERE s.owner_id = $1 AND s.deleted_at IS NULL LIMIT 1`,
        [user.id]
      );
      shopRecord = shopRes.rows[0] || null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      employeeId: user.employee_id,
      shopId: shopRecord?.shop_id,
      shop: shopRecord,
      createdAt: user.created_at,
    };
  },

  async refreshToken(token: string) {
    if (!token) {
      throw new Error('Refresh token is required');
    }
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new Error('Invalid or expired refresh token');
    }

    const user = await userRepository.findById(payload.userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (!user.is_active) {
      throw new Error('Account has been deactivated');
    }

    let shopRecord: any = null;
    if (user.role === 'SHOP') {
      const shopRes = await query(
        `SELECT s.id, s.shop_id, s.name, s.shop_type, s.address, s.credit_limit, s.payment_terms
         FROM shops s WHERE s.owner_id = $1 AND s.deleted_at IS NULL LIMIT 1`,
        [user.id]
      );
      shopRecord = shopRes.rows[0] || null;
    }

    const authUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      driverId: user.role === 'DRIVER' ? user.id : undefined,
      employeeId: user.employee_id,
      shopId: shopRecord?.shop_id,
    };

    const tokens = {
      accessToken: generateAccessToken(authUser),
      refreshToken: generateRefreshToken(authUser),
      expiresIn: 900,
    };

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        employeeId: user.employee_id,
        shopId: shopRecord?.shop_id,
        createdAt: user.created_at,
      },
      tokens,
      shop: shopRecord,
    };
  },
};

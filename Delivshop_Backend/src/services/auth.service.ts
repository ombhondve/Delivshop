import { userRepository } from '../repositories/user.repository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokens.js';
import { auditService } from './audit.service.js';
import { UserRole } from '../types/user.types.js';

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
    let user = await userRepository.findByEmail(credentials.email);
    if (!user) {
      user = await userRepository.findByEmployeeId(credentials.email);
    }
    if (!user) {
      // Intentionally uniform error to prevent email enumeration
      throw new Error('Invalid email or password');
    }

    const validPassword = await comparePassword(credentials.password, user.password_hash);
    if (!validPassword) {
      throw new Error('Invalid email or password');
    }

    if (!user.is_active) {
      throw new Error('Account has been deactivated. Please contact support.');
    }

    await auditService.log({
      actorId: user.id,
      action: 'USER_LOGIN',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
    });

    const authUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      driverId: user.role === 'DRIVER' ? user.id : undefined,
      employeeId: user.employee_id,
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
        createdAt: user.created_at,
      },
      tokens,
    };
  },

  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
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

    const authUser = {
      id: user.id,
      email: user.email,
      role: user.role,
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
        createdAt: user.created_at,
      },
      tokens,
    };
  },
};

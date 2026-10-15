import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body, req.ip);
      sendSuccess(res, result, 'User registered successfully', 201);
    } catch (err: any) {
      if (err.message.includes('already exists')) {
        sendError(res, err.message, 409);
        return;
      }
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body, req.ip);

      // Set secure session cookie and refresh cookie
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('delivshop_session_token', result.tokens.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });
      res.cookie('delivshop_refresh_token', result.tokens.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      });

      sendSuccess(res, result, 'Authentication successful', 200);
    } catch (err: any) {
      if (err.message.includes('Invalid email') || err.message.includes('deactivated')) {
        sendError(res, err.message, 401);
        return;
      }
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token =
        (req as any).cookies?.delivshop_refresh_token ||
        req.body?.refreshToken ||
        (req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.substring(7).trim()
          : undefined);

      if (!token) {
        sendError(res, 'Refresh token required', 401);
        return;
      }

      const result = await authService.refreshToken(token);

      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('delivshop_session_token', result.tokens.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });
      res.cookie('delivshop_refresh_token', result.tokens.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      sendSuccess(res, result, 'Token refreshed successfully', 200);
    } catch (err: any) {
      sendError(res, err.message || 'Failed to refresh token', 401);
    }
  },

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 401);
        return;
      }
      const profile = await authService.getProfile(req.user.id);
      sendSuccess(res, profile);
    } catch (err) {
      next(err);
    }
  },

  async logout(_req: Request, res: Response): Promise<void> {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('delivshop_session_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });
    res.clearCookie('delivshop_refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });
    sendSuccess(res, { loggedOut: true }, 'Signed out successfully');
  },
};

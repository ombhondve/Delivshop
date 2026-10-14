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

      // Set secure session cookie
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('delivshop_session_token', result.tokens.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
    sendSuccess(res, { loggedOut: true }, 'Signed out successfully');
  },
};

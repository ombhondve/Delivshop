import { Request, Response, NextFunction } from 'express';
import { shopAuthService } from '../services/shop-auth.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const shopAuthController = {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await shopAuthService.login(req.body, req.ip);

      if ('tokens' in result && result.tokens?.accessToken) {
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('delivshop_session_token', result.tokens.accessToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? 'none' : 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/',
        });
      }

      sendSuccess(res, result);
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode, err.details);
        return;
      }
      if (
        err.message?.includes('Invalid Shop ID') ||
        err.message?.includes('Invalid credentials') ||
        err.message?.includes('Invalid password')
      ) {
        sendError(res, 'Invalid Shop ID or security access key', 401);
        return;
      }
      if (err.message?.includes('deactivated')) {
        sendError(res, err.message, 403);
        return;
      }
      if (err.message?.includes('temporarily locked')) {
        sendError(res, err.message, 429);
        return;
      }
      next(err);
    }
  },

  async completeSetup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        sendError(res, 'Authentication required to complete account setup', 401);
        return;
      }
      const result = await shopAuthService.completeSetup(
        req.user.id,
        req.body.newPassword,
        req.ip
      );
      sendSuccess(res, result);
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      if (err.message?.includes('Password must be') || err.message?.includes('Password contains')) {
        sendError(res, err.message, 400);
        return;
      }
      next(err);
    }
  },

  async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        sendError(res, 'Authentication required', 401);
        return;
      }
      const profile = await shopAuthService.getMyProfile(req.user.id);
      sendSuccess(res, profile);
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      if (err.message?.includes('not found')) {
        sendError(res, 'Shop profile not found', 404);
        return;
      }
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
    sendSuccess(res, { message: 'Shop session successfully logged out' });
  },
};

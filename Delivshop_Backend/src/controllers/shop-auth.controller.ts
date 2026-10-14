import { Request, Response, NextFunction } from 'express';
import { shopAuthService } from '../services/shop-auth.service.js';
import { sendSuccess } from '../utils/response.js';

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
    } catch (err) {
      next(err);
    }
  },

  async completeSetup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new Error('Authentication required');
      }
      const result = await shopAuthService.completeSetup(
        req.user.id,
        req.body.newPassword,
        req.ip
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new Error('Authentication required');
      }
      const profile = await shopAuthService.getMyProfile(req.user.id);
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
    sendSuccess(res, { message: 'Shop session successfully logged out' });
  },
};

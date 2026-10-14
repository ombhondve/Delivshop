import { Request, Response, NextFunction } from 'express';
import { shopAuthService } from '../services/shop-auth.service.js';
import { sendSuccess } from '../utils/response.js';

export const shopAuthController = {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await shopAuthService.login(req.body, req.ip);
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
    // Invalidate client tokens safely
    sendSuccess(res, { message: 'Shop session successfully logged out' });
  },
};

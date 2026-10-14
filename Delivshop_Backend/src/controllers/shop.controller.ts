import { Request, Response, NextFunction } from 'express';
import { shopService } from '../services/shop.service.js';
import { sendSuccess } from '../utils/response.js';

export const shopController = {
  async getShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shop = await shopService.getShop(req.params.shopId);
      sendSuccess(res, shop);
    } catch (err) {
      next(err);
    }
  },

  async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const products = await shopService.getProducts(req.params.shopId);
      sendSuccess(res, products);
    } catch (err) {
      next(err);
    }
  },

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await shopService.getStats(req.params.shopId);
      sendSuccess(res, stats);
    } catch (err) {
      next(err);
    }
  },
};

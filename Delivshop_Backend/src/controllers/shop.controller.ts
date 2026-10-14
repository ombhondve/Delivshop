import { Request, Response, NextFunction } from 'express';
import { shopService } from '../services/shop.service.js';
import { sendSuccess } from '../utils/response.js';
import { ShopFilterParams } from '../types/shop.types.js';

export const shopController = {
  async createShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await shopService.createShop(req.body, req.user?.id, req.ip);
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  },

  async listShops(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params: ShopFilterParams = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
        search: req.query.search as string,
        shopType: req.query.shopType as any,
        status: req.query.status as any,
        city: req.query.city as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };
      const result = await shopService.listShops(params);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await shopService.getShopWithAccount(req.params.shopId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async updateShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await shopService.updateShop(
        req.params.shopId,
        req.body,
        req.user?.id,
        req.ip
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await shopService.updateStatus(
        req.params.shopId,
        req.body.status,
        req.user?.id,
        req.ip
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async reissueCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await shopService.reissueCredentials(
        req.params.shopId,
        req.user?.id,
        req.ip
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async resolveMapLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await shopService.resolveMapLink(req.body.mapUrl);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoices = await shopService.getInvoices(req.params.shopId);
      sendSuccess(res, invoices);
    } catch (err) {
      next(err);
    }
  },

  async getPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payments = await shopService.getPayments(req.params.shopId);
      sendSuccess(res, payments);
    } catch (err) {
      next(err);
    }
  },

  async getDeliveries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deliveries = await shopService.getDeliveries(req.params.shopId);
      sendSuccess(res, deliveries);
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

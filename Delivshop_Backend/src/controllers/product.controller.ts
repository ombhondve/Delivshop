import { Request, Response, NextFunction } from 'express';
import { productService } from '../services/product.service.js';
import { sendSuccess } from '../utils/response.js';
import { ProductFilterParams } from '../types/product.types.js';

export const productController = {
  async listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params: ProductFilterParams = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
        search: req.query.search as string,
        companyId: req.query.companyId as string,
        category: req.query.category as string,
        status: req.query.status as any,
        stockStatus: req.query.stockStatus as any,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const result = await productService.listProducts(params);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getSummaryStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await productService.getSummaryStats();
      sendSuccess(res, stats);
    } catch (err) {
      next(err);
    }
  },

  async getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productService.getProduct(req.params.id);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productService.createProduct(req.body, req.user?.id, req.ip);
      sendSuccess(res, result, 'Product created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productService.updateProduct(
        req.params.id,
        req.body,
        req.user?.id,
        req.ip
      );
      sendSuccess(res, result, 'Product updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async updateProductStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { isActive, reason } = req.body;
      const result = await productService.updateProductStatus(
        req.params.id,
        isActive,
        reason,
        req.user?.id,
        req.ip
      );
      sendSuccess(
        res,
        result,
        `Product ${isActive ? 'activated' : 'deactivated'} successfully`
      );
    } catch (err) {
      next(err);
    }
  },
};

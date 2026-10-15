import { Request, Response, NextFunction } from 'express';
import { inventoryService } from '../services/inventory.service.js';
import { sendSuccess } from '../utils/response.js';
import { InventoryFilterParams } from '../types/product.types.js';

export const inventoryController = {
  async receiveStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await inventoryService.receiveStock(req.body, req.user?.id, req.ip);
      sendSuccess(res, result, 'Stock receipt processed successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async adjustStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await inventoryService.adjustStock(req.body, req.user?.id, req.ip);
      sendSuccess(res, result, 'Stock adjustment recorded successfully');
    } catch (err) {
      next(err);
    }
  },

  async listMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params: InventoryFilterParams = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        productId: req.query.productId as string,
        movementType: req.query.movementType as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        search: req.query.search as string,
      };

      const result = await inventoryService.getMovements(params);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getProductBatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batches = await inventoryService.getProductBatches(req.params.productId);
      sendSuccess(res, batches);
    } catch (err) {
      next(err);
    }
  },
};

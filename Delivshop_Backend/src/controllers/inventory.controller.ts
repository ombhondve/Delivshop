import { Request, Response, NextFunction } from 'express';
import { inventoryService } from '../services/inventory.service.js';
import { sendSuccess } from '../utils/response.js';
import { InventoryFilterParams } from '../types/product.types.js';
import { AppError } from '../utils/errors.js';

export const inventoryController = {
  async receiveStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      throw new AppError(
        'Warehouse inward stock receipts are retired. Delivshop operates on a direct supplier-to-shop distribution model without warehouse inventory stock balances. Products are collected directly from suppliers for scheduled delivery runs.',
        400
      );
    } catch (err) {
      next(err);
    }
  },

  async adjustStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      throw new AppError(
        'Warehouse stock adjustments are retired. Delivshop operates on a direct supplier-to-shop distribution model without warehouse inventory stock balances. Operational discrepancies must be recorded through supplier pickup verification or shop delivery reconciliation.',
        400
      );
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

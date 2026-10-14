import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service.js';
import { sendSuccess } from '../utils/response.js';

export const orderController = {
  async getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await orderService.getOrder(req.params.orderId);
      sendSuccess(res, order);
    } catch (err) {
      next(err);
    }
  },

  async getShopOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orders = await orderService.getShopOrders(req.params.shopId);
      sendSuccess(res, orders);
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await orderService.updateStatus(
        req.params.orderId,
        req.body.status,
        req.user!.id,
        req.ip
      );
      sendSuccess(res, updated, 'Order status updated');
    } catch (err) {
      next(err);
    }
  },
};

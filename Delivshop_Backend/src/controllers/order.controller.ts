import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const orderController = {
  async getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await orderService.getOrder(req.params.orderId);
      sendSuccess(res, order);
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },

  async getShopOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orders = await orderService.getShopOrders(req.params.shopId);
      sendSuccess(res, orders);
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },

  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const idempotencyKey =
        (req.headers['idempotency-key'] as string) ||
        req.body.idempotencyKey ||
        undefined;

      const shopId = req.user?.role === 'SHOP' && req.user.shopId ? req.user.shopId : req.body.shopId;

      const order = await orderService.createOrder(
        {
          shopId,
          items: req.body.items,
          deliveryAddress: req.body.deliveryAddress,
          idempotencyKey,
        },
        req.user!.id,
        req.ip
      );

      const statusCode = order.isDuplicateReplay ? 200 : 201;
      sendSuccess(
        res,
        order,
        order.isDuplicateReplay ? 'Order already registered (idempotent replay)' : 'Order successfully placed',
        statusCode
      );
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
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
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },
};

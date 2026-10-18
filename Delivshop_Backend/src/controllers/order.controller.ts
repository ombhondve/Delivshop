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
          requestedDeliveryDate: req.body.requestedDeliveryDate,
          deliveryRunId: req.body.deliveryRunId,
          deliveryWindow: req.body.deliveryWindow,
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

  async listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = (page - 1) * limit;

      const filters = {
        status: req.query.status as string,
        schedulingStatus: req.query.schedulingStatus as string,
        search: req.query.search as string,
        shopId: (req.user?.role === 'SHOP' && req.user.shopId ? req.user.shopId : req.query.shopId) as string,
        driverId: req.query.driverId as string,
        routeId: req.query.routeId as string,
        date: req.query.date as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        limit,
        offset,
      };

      const result = await orderService.listOrders(filters);
      sendSuccess(res, {
        orders: result.orders,
        total: result.total,
        page,
        limit,
      });
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },

  async getVolumeSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        status: req.query.status as string,
        deliveryDate: (req.query.deliveryDate || req.query.date) as string,
        date: req.query.date as string,
        shopId: (req.user?.role === 'SHOP' && req.user.shopId ? req.user.shopId : req.query.shopId) as string,
        productId: req.query.productId as string,
        packagingSize: req.query.packagingSize as string,
      };

      const summary = await orderService.getVolumeSummary(filters);
      sendSuccess(res, summary);
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },

  async exportVolumeSummaryCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        status: req.query.status as string,
        deliveryDate: (req.query.deliveryDate || req.query.date) as string,
        date: req.query.date as string,
        shopId: (req.user?.role === 'SHOP' && req.user.shopId ? req.user.shopId : req.query.shopId) as string,
        productId: req.query.productId as string,
        packagingSize: req.query.packagingSize as string,
      };

      const csv = await orderService.exportVolumeSummaryCsv(filters);
      const filename = `order-volume-summary-${new Date().toISOString().slice(0, 10)}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },
};

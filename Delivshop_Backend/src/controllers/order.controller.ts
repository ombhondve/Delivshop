import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const orderController = {
  async getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await orderService.getOrder(req.params.orderId, req.user?.role, req.user?.shopId);
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

  async assignRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await orderService.assignRoute(
        req.params.orderId,
        req.body.routeId,
        req.user?.id,
        req.ip
      );
      sendSuccess(res, order, 'Route successfully assigned to order');
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

      const isShop = req.user?.role === 'SHOP';
      const shopId = (isShop && req.user?.shopId) ? req.user.shopId : req.body.shopId;

      const order = await orderService.createOrder(
        {
          shopId,
          items: req.body.items,
          deliveryAddress: req.body.deliveryAddress,
          idempotencyKey,
          requestedDeliveryDate: req.body.requestedDeliveryDate,
          deliveryRunId: req.body.deliveryRunId,
          deliveryWindow: req.body.deliveryWindow,
          isShopRole: isShop,
          isShopPortal: Boolean(req.body.isShopPortal || req.baseUrl.includes('/api/shop') || req.path.includes('/shop') || (req.originalUrl && req.originalUrl.includes('/api/shop'))),
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

  async getShopOrderTracking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        date: (req.query.date as string) || (req.query.deliveryDate as string),
        search: req.query.search as string,
        orderStatus: req.query.orderStatus as string,
        reminderStatus: req.query.reminderStatus as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      };

      const result = await orderService.getShopOrderTracking(filters);
      sendSuccess(res, result);
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },

  async sendShopReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shopId } = req.params;
      const { reportingDate, reminderType, customMessage, idempotencyKey } = req.body;

      const result = await orderService.sendShopReminder({
        shopId,
        reportingDate: reportingDate || new Date().toISOString().slice(0, 10),
        reminderType,
        customMessage,
        sentBy: req.user?.id,
        idempotencyKey: idempotencyKey || (req.headers['idempotency-key'] as string),
      });

      sendSuccess(res, result, 'Order reminder processed successfully');
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },

  async sendBulkReminders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shopIds, reportingDate, reminderType, customMessage } = req.body;

      if (!Array.isArray(shopIds) || shopIds.length === 0) {
        sendError(res, 'shopIds array is required and must contain at least one shop ID', 400);
        return;
      }

      const result = await orderService.sendBulkReminders({
        shopIds,
        reportingDate: reportingDate || new Date().toISOString().slice(0, 10),
        reminderType,
        customMessage,
        sentBy: req.user?.id,
      });

      sendSuccess(res, result, `Bulk reminders processed for ${result.totalRequested} shops`);
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },

  async getReminderHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shopId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const history = await orderService.getReminderHistory(shopId, limit);
      sendSuccess(res, history);
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },

  async registerDeviceToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shopId, fcmToken, deviceType } = req.body;
      const effectiveShopId = req.user?.role === 'SHOP' && req.user.shopId ? req.user.shopId : shopId;

      if (!effectiveShopId || !fcmToken) {
        sendError(res, 'shopId and fcmToken are required', 400);
        return;
      }

      const registered = await orderService.registerDeviceToken({
        shopId: effectiveShopId,
        userId: req.user?.id,
        fcmToken,
        deviceType,
      });

      sendSuccess(res, registered, 'Device token registered successfully', 201);
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },
};


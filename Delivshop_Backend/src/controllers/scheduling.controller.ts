import { Request, Response, NextFunction } from 'express';
import { schedulingService } from '../services/scheduling.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const schedulingController = {
  /**
   * Shop Owner or Admin queries genuine route-based delivery availability.
   * Considers shop location, route coverage, published runs, order cutoff, and remaining capacity.
   */
  async getDeliveryAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shopId = (req.user?.role === 'SHOP' && req.user.shopId)
        ? req.user.shopId
        : (req.params.shopId || req.query.shopId as string);

      if (!shopId) {
        sendError(res, 'Shop identifier is required', 400);
        return;
      }

      const orderCrates = req.query.crates ? parseFloat(req.query.crates as string) : 1;
      const availability = await schedulingService.getDeliveryAvailability(shopId, orderCrates);

      if (req.user?.role === 'SHOP') {
        const sanitized = {
          shopId: availability.shopId,
          shopName: availability.shopName,
          hasRouteCoverage: availability.hasRouteCoverage,
          hasRouteAssigned: availability.hasRouteAssigned,
          hasDriverAssigned: availability.hasDriverAssigned,
          scheduledDeliveryDate: availability.scheduledDeliveryDate,
          schedulingCase: availability.schedulingCase,
          schedulingTitle: availability.schedulingTitle,
          deliveryStatus: availability.deliveryStatus,
          schedulingMessage: availability.schedulingMessage,
          hasConfirmedDate: availability.hasConfirmedDate,
          deliveryRunId: availability.deliveryRunId,
          coveredRoutes: availability.coveredRoutes,
          availableDates: availability.availableDates,
          allowUnscheduledOrders: availability.allowUnscheduledOrders,
          policyMessage: availability.policyMessage,
          defaultDeliveryWindow: availability.defaultDeliveryWindow,
        };
        sendSuccess(res, sanitized);
        return;
      }

      sendSuccess(res, availability);
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },

  /**
   * Admin lists unscheduled orders queue awaiting route assignment.
   */
  async getUnscheduledOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = (page - 1) * limit;

      const result = await schedulingService.getUnscheduledOrders({
        search: req.query.search as string,
        limit,
        offset,
      });

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

  /**
   * Admin schedules an unscheduled order to an eligible delivery run.
   */
  async scheduleOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await schedulingService.scheduleOrder({
        orderId: req.params.orderId,
        deliveryRunId: req.body.deliveryRunId,
        confirmedDate: req.body.confirmedDate,
        deliveryWindow: req.body.deliveryWindow,
        adminId: req.user?.id,
        notes: req.body.notes,
      });

      sendSuccess(res, result, 'Order successfully scheduled to delivery run');
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },

  /**
   * Admin reschedules an order to another run with full audit trail.
   */
  async rescheduleOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await schedulingService.rescheduleOrder({
        orderId: req.params.orderId,
        newDeliveryRunId: req.body.newDeliveryRunId,
        reason: req.body.reason,
        adminId: req.user?.id,
        notes: req.body.notes,
      });

      sendSuccess(res, result, 'Order successfully rescheduled to new delivery run');
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },

  /**
   * Admin publishes a delivery run, creating an immutable route version snapshot.
   */
  async publishRun(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await schedulingService.publishRun(req.params.id, req.user?.id);
      sendSuccess(res, result, 'Delivery run successfully published');
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },

  /**
   * Get operational scheduling settings.
   */
  async getSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await schedulingService.getSettings();
      sendSuccess(res, settings);
    } catch (err: any) {
      next(err);
    }
  },

  /**
   * Update operational scheduling settings.
   */
  async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await schedulingService.updateSettings(req.body);
      sendSuccess(res, updated, 'Operational scheduling settings updated');
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },

  /**
   * Retrieve order scheduling history & audit trail.
   */
  async getOrderSchedulingHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await schedulingService.getOrderSchedulingHistory(req.params.orderId);
      sendSuccess(res, history);
    } catch (err: any) {
      if (err.statusCode && err.statusCode < 500) {
        sendError(res, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  },
};

import { Request, Response, NextFunction } from 'express';
import { deliveryService } from '../services/delivery.service.js';
import { sendSuccess } from '../utils/response.js';

export const deliveryController = {
  async getDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const delivery = await deliveryService.getDelivery(req.params.deliveryId);
      sendSuccess(res, delivery);
    } catch (err) {
      next(err);
    }
  },

  async getAssignedDeliveries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deliveries = await deliveryService.getAssignedDeliveries(req.user!.id);
      sendSuccess(res, deliveries);
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, currentLatitude, currentLongitude, notes } = req.body;
      const updated = await deliveryService.updateStatus(
        req.params.deliveryId,
        status,
        req.user!.id,
        currentLatitude,
        currentLongitude,
        notes,
        req.ip
      );
      sendSuccess(res, updated, 'Delivery status updated');
    } catch (err) {
      next(err);
    }
  },

  async assignDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId, driverId } = req.body;
      const result = await deliveryService.assignDriver(
        orderId,
        driverId,
        req.user?.id,
        req.ip
      );
      sendSuccess(res, result, 'Driver assigned to order');
    } catch (err) {
      next(err);
    }
  },

  async listDrivers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const drivers = await deliveryService.listDrivers();
      sendSuccess(res, drivers);
    } catch (err) {
      next(err);
    }
  },
};

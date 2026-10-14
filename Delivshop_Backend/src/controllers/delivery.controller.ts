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
      const updated = await deliveryService.updateStatus(
        req.params.deliveryId,
        req.body.status,
        req.user!.id,
        req.body.currentLatitude,
        req.body.currentLongitude,
        req.body.notes,
        req.ip
      );
      sendSuccess(res, updated, 'Delivery status updated');
    } catch (err) {
      next(err);
    }
  },

  async updateLocation(req: Request, res: Response): Promise<void> {
    // In production, update real-time driver coordinates
    sendSuccess(res, { updated: true });
  },
};

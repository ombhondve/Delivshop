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

  async listAllDrivers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, status, vehicle, sortBy, sortOrder } = req.query;
      const drivers = await deliveryService.listAllDrivers({
        search: typeof search === 'string' ? search : undefined,
        status: typeof status === 'string' ? status : undefined,
        vehicle: typeof vehicle === 'string' ? vehicle : undefined,
        sortBy: typeof sortBy === 'string' ? sortBy : undefined,
        sortOrder: sortOrder === 'DESC' ? 'DESC' : 'ASC',
      });
      sendSuccess(res, drivers);
    } catch (err) {
      next(err);
    }
  },

  async getRosterSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await deliveryService.getRosterSummary();
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  },

  async getDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driver = await deliveryService.getDriver(req.params.id);
      sendSuccess(res, driver);
    } catch (err) {
      next(err);
    }
  },

  async getDriverDeliveries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deliveries = await deliveryService.getDriverDeliveries(req.params.id);
      sendSuccess(res, deliveries);
    } catch (err) {
      next(err);
    }
  },

  async createDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driver = await deliveryService.createDriver(
        req.body,
        req.user?.id,
        req.ip
      );
      sendSuccess(res, driver, 'Driver successfully onboarded to fleet', 201);
    } catch (err) {
      next(err);
    }
  },

  async updateDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await deliveryService.updateDriver(
        req.params.id,
        req.body,
        req.user?.id,
        req.ip
      );
      sendSuccess(res, updated, 'Driver profile updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async assignVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await deliveryService.assignVehicle(
        req.params.id,
        req.body,
        req.user?.id,
        req.ip
      );
      sendSuccess(res, updated, 'Vehicle allocated to driver successfully');
    } catch (err) {
      next(err);
    }
  },

  async resetDriverPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await deliveryService.resetDriverPassword(
        req.params.id,
        req.body.password,
        req.user?.id,
        req.ip
      );
      sendSuccess(res, result, 'Driver password reset successfully');
    } catch (err) {
      next(err);
    }
  },

  async updateDriverStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { isActive } = req.body;
      const updated = await deliveryService.updateDriverStatus(
        req.params.id,
        Boolean(isActive),
        req.user?.id,
        req.ip
      );
      sendSuccess(res, updated, `Driver successfully ${isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      next(err);
    }
  },

  async deleteDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reason = req.body?.reason || (req.query.reason as string) || undefined;
      const result = await deliveryService.deleteDriver(
        req.params.id,
        req.user?.id,
        req.ip,
        reason
      );
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  },

  async getSalaryConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = await deliveryService.getSalaryConfig(req.params.id);
      sendSuccess(res, config);
    } catch (err) {
      next(err);
    }
  },

  async upsertSalaryConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = await deliveryService.upsertSalaryConfig(
        req.params.id,
        req.body,
        req.user?.id,
        req.ip
      );
      sendSuccess(res, config, 'Driver salary configuration updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async getPayrollRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const records = await deliveryService.getPayrollRecords(req.params.id);
      sendSuccess(res, records);
    } catch (err) {
      next(err);
    }
  },

  async addPayrollRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await deliveryService.addPayrollRecord(
        req.params.id,
        req.body,
        req.user?.id,
        req.ip
      );
      sendSuccess(res, record, 'Driver payroll disbursement recorded', 201);
    } catch (err) {
      next(err);
    }
  },

  async getDriverDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const docs = await deliveryService.getDriverDocuments(req.params.id);
      sendSuccess(res, docs);
    } catch (err) {
      next(err);
    }
  },

  async upsertDriverDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doc = await deliveryService.upsertDriverDocument(
        req.params.id,
        req.body,
        req.user?.id,
        req.ip
      );
      sendSuccess(res, doc, 'Driver document verified and saved');
    } catch (err) {
      next(err);
    }
  },

  async downloadDriverDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: driverId, docId } = req.params;
      const { filePath, filename, mimeType } = await deliveryService.downloadDriverDocument(
        driverId,
        docId,
        req.user!
      );

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  },

  async getFullProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await deliveryService.getFullProfile(req.params.id);
      sendSuccess(res, profile);
    } catch (err) {
      next(err);
    }
  },
};

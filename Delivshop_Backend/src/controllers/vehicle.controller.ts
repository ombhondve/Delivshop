import { Request, Response, NextFunction } from 'express';
import { vehicleService } from '../services/vehicle.service.js';

export const vehicleController = {
  async listVehicles(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, status, vehicleType, city, sortBy, sortOrder } = req.query;
      const vehicles = await vehicleService.listVehicles({
        search: search as string,
        status: status as string,
        vehicleType: vehicleType as string,
        city: city as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC',
      });
      res.json({ success: true, data: vehicles });
    } catch (err) {
      next(err);
    }
  },

  async getSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await vehicleService.getSummary();
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  },

  async getVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const vehicle = await vehicleService.getVehicleDetails(id);
      res.json({ success: true, data: vehicle });
    } catch (err) {
      next(err);
    }
  },

  async createVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const vehicle = await vehicleService.createVehicle(req.body, req.user?.id, req.ip);
      res.status(201).json({
        success: true,
        message: 'Vehicle asset successfully registered to fleet',
        data: vehicle,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await vehicleService.updateVehicle(id, req.body, req.user?.id, req.ip);
      res.json({
        success: true,
        message: 'Vehicle specifications updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const updated = await vehicleService.updateStatus(id, status, notes, req.user?.id, req.ip);
      res.json({
        success: true,
        message: `Vehicle status changed to ${status}`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  async upsertDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const doc = await vehicleService.upsertDocument(id, req.body, req.user?.id, req.ip);
      res.json({
        success: true,
        message: 'Vehicle document verified and saved',
        data: doc,
      });
    } catch (err) {
      next(err);
    }
  },

  async addMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const log = await vehicleService.addMaintenance(id, req.body, req.user?.id, req.ip);
      res.status(201).json({
        success: true,
        message: 'Maintenance service log recorded',
        data: log,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      await vehicleService.deleteVehicle(id, req.user?.id, reason, req.ip);
      res.json({
        success: true,
        message: 'Vehicle successfully archived from fleet',
      });
    } catch (err) {
      next(err);
    }
  },
};

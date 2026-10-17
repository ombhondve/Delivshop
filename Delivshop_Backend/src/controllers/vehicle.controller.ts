import { Request, Response, NextFunction } from 'express';
import { vehicleService } from '../services/vehicle.service.js';

export const vehicleController = {
  async listVehicles(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        search,
        status,
        vehicleType,
        depot,
        city,
        compliance,
        sortBy,
        sortOrder,
        page,
        limit,
      } = req.query;

      const result = await vehicleService.listVehicles({
        search: search as string,
        status: status as string,
        vehicleType: vehicleType as string,
        depot: depot as string,
        city: city as string,
        compliance: compliance as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC',
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page || 1,
          limit: result.limit || result.total,
          totalPages: result.totalPages || 1,
        },
      });
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

  async downloadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: vehicleId, docId } = req.params;
      const { filePath, filename, mimeType } = await vehicleService.downloadDocument(vehicleId, docId);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  },

  async deleteDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: vehicleId, docId } = req.params;
      await vehicleService.deleteDocument(vehicleId, docId, req.user?.id, req.ip);
      res.json({
        success: true,
        message: 'Document deleted successfully',
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

  async checkDispatchEligibility(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { targetDate, requiresRefrigeration, excludeRunId } = req.query;
      const result = await vehicleService.checkDispatchEligibility(id, {
        targetDate: targetDate as string,
        requiresRefrigeration: requiresRefrigeration === 'true',
        excludeRunId: excludeRunId as string,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getActivityHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const activity = await vehicleService.getActivityHistory(id);
      res.json({ success: true, data: activity });
    } catch (err) {
      next(err);
    }
  },

  async exportVehicles(_req: Request, res: Response, next: NextFunction) {
    try {
      const csv = await vehicleService.exportVehiclesCsv();
      const filename = `delivshop_fleet_export_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  },

  async deleteVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      const result = await vehicleService.deleteVehicle(id, req.user?.id, reason, req.ip);
      res.json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};

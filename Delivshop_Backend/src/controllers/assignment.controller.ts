import { Request, Response, NextFunction } from 'express';
import { assignmentService } from '../services/assignment.service.js';
import { AppError } from '../utils/errors.js';

export const assignmentController = {
  async listAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, deliveryDate, status, vehicleId, routeId, city, sortBy, sortOrder } = req.query;
      
      // Security: DRIVER role can ONLY view their own assigned runs
      const targetDriverId = req.user?.role === 'DRIVER' 
        ? req.user.id 
        : (req.query.driverId as string);

      const assignments = await assignmentService.listAssignments({
        search: search as string,
        deliveryDate: deliveryDate as string,
        status: status as string,
        driverId: targetDriverId,
        vehicleId: vehicleId as string,
        routeId: routeId as string,
        city: city as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC',
      });
      res.json({ success: true, data: assignments });
    } catch (err) {
      next(err);
    }
  },

  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { date } = req.query;
      const summary = await assignmentService.getSummary(date as string);
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  },

  async validateConstraints(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await assignmentService.validateConstraints(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const assignment = await assignmentService.getAssignmentDetails(id);
      
      // Security: Driver can only inspect their own assigned run
      if (req.user?.role === 'DRIVER' && assignment.driver_id !== req.user.id) {
        throw new AppError('Access forbidden: You can only view your own delivery assignments.', 403);
      }

      res.json({ success: true, data: assignment });
    } catch (err) {
      next(err);
    }
  },

  async createAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role === 'DRIVER') {
        throw new AppError('Drivers are not permitted to dispatch or assign runs.', 403);
      }
      const run = await assignmentService.createAssignment(req.body, req.user?.id, req.ip);
      res.status(201).json({
        success: true,
        message: 'Daily delivery run successfully created and dispatched',
        data: run,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (req.user?.role === 'DRIVER') {
        const assignment = await assignmentService.getAssignmentDetails(id);
        if (assignment.driver_id !== req.user.id) {
          throw new AppError('Access forbidden: You cannot update status of another driver\'s assignment.', 403);
        }
      }

      const updated = await assignmentService.updateStatus(id, status, notes, req.user?.id, req.ip);
      res.json({
        success: true,
        message: `Delivery run status transitioned to ${status}`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateStopStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, sequence } = req.params;

      if (req.user?.role === 'DRIVER') {
        const assignment = await assignmentService.getAssignmentDetails(id);
        if (assignment.driver_id !== req.user.id) {
          throw new AppError('Access forbidden: You cannot update stops of another driver\'s assignment.', 403);
        }
      }

      const stop = await assignmentService.updateStopStatus(
        id,
        parseInt(sequence, 10),
        req.body,
        req.user?.id,
        req.ip
      );
      res.json({
        success: true,
        message: `Delivery run stop #${sequence} updated`,
        data: stop,
      });
    } catch (err) {
      next(err);
    }
  },
};

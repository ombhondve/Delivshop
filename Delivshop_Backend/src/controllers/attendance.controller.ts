import { Request, Response, NextFunction } from 'express';
import { attendanceService } from '../services/attendance.service.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/errors.js';

export const attendanceController = {
  async checkIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driverId = req.params.id;
      if (req.user?.role === 'DRIVER' && req.user.id !== driverId) {
        throw new AppError('Forbidden: Drivers can only record attendance for themselves.', 403);
      }
      const record = await attendanceService.checkIn(driverId, req.body, req.user?.id, req.ip);
      sendSuccess(res, record, 'Driver check-in recorded successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async checkOut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driverId = req.params.id;
      if (req.user?.role === 'DRIVER' && req.user.id !== driverId) {
        throw new AppError('Forbidden: Drivers can only record attendance for themselves.', 403);
      }
      const record = await attendanceService.checkOut(driverId, req.body, req.user?.id, req.ip);
      sendSuccess(res, record, 'Driver check-out recorded successfully');
    } catch (err) {
      next(err);
    }
  },

  async getToday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driverId = req.params.id;
      if (req.user?.role === 'DRIVER' && req.user.id !== driverId) {
        throw new AppError('Forbidden: You can only view your own attendance.', 403);
      }
      const record = await attendanceService.getToday(driverId);
      sendSuccess(res, record);
    } catch (err) {
      next(err);
    }
  },

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driverId = req.params.id;
      if (req.user?.role === 'DRIVER' && req.user.id !== driverId) {
        throw new AppError('Forbidden: You can only view your own attendance history.', 403);
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
      const history = await attendanceService.getHistory(driverId, limit);
      sendSuccess(res, history);
    } catch (err) {
      next(err);
    }
  },

  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const driverId = req.params.id;
      if (req.user?.role === 'DRIVER' && req.user.id !== driverId) {
        throw new AppError('Forbidden: You can only view your own attendance summary.', 403);
      }
      const now = new Date();
      const year = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string, 10) : now.getMonth() + 1;
      const summary = await attendanceService.getMonthlySummary(driverId, year, month);
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  },

  async correctAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const attendanceId = req.params.id;
      const record = await attendanceService.correctAttendance(
        attendanceId,
        req.body,
        req.user!.id,
        req.ip
      );
      sendSuccess(res, record, 'Attendance record corrected successfully');
    } catch (err) {
      next(err);
    }
  },
};

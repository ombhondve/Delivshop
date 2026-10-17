import { attendanceRepository, DriverAttendanceRecord } from '../repositories/attendance.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { auditService } from './audit.service.js';
import { AppError } from '../utils/errors.js';

export function getTodayDateString(timeZone = 'Asia/Kolkata'): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date()); // YYYY-MM-DD
}

export const attendanceService = {
  async checkIn(
    driverId: string,
    data: { latitude?: number; longitude?: number; notes?: string },
    actorId?: string,
    ipAddress?: string
  ): Promise<DriverAttendanceRecord> {
    const driver = await userRepository.findById(driverId);
    if (!driver || driver.role !== 'DRIVER') {
      throw new AppError('Driver not found', 404);
    }
    if (!driver.is_active) {
      throw new AppError('Inactive or deactivated driver cannot record attendance.', 403);
    }

    const todayStr = getTodayDateString();
    const existing = await attendanceRepository.findTodayByDriver(driverId, todayStr);
    if (existing && existing.check_in_time) {
      throw new AppError(`Driver has already checked in for today (${todayStr}).`, 400);
    }

    const now = new Date();
    // Calculate if late: scheduled start is 07:00 AM IST. Check-in after 07:30 is late.
    const hour = parseInt(
      new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(now),
      10
    );
    const minute = parseInt(
      new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', minute: 'numeric' }).format(now),
      10
    );
    const isLate = hour > 7 || (hour === 7 && minute > 30);

    const record = await attendanceRepository.recordCheckIn({
      driverId,
      date: todayStr,
      checkInTime: now,
      latitude: data.latitude,
      longitude: data.longitude,
      isLate,
      notes: data.notes,
    });

    await auditService.log({
      actorId: actorId || driverId,
      action: 'DRIVER_CHECK_IN',
      entityType: 'DRIVER_ATTENDANCE',
      entityId: record.id,
      details: {
        driverId,
        date: todayStr,
        isLate,
        latitude: data.latitude,
        longitude: data.longitude,
      },
      ipAddress,
    });

    return record;
  },

  async checkOut(
    driverId: string,
    data: { latitude?: number; longitude?: number; notes?: string },
    actorId?: string,
    ipAddress?: string
  ): Promise<DriverAttendanceRecord> {
    const driver = await userRepository.findById(driverId);
    if (!driver || driver.role !== 'DRIVER') {
      throw new AppError('Driver not found', 404);
    }

    const todayStr = getTodayDateString();
    const existing = await attendanceRepository.findTodayByDriver(driverId, todayStr);
    if (!existing || !existing.check_in_time) {
      throw new AppError('Cannot check out: No active check-in record found for today.', 400);
    }

    const now = new Date();
    const record = await attendanceRepository.recordCheckOut({
      driverId,
      date: todayStr,
      checkOutTime: now,
      latitude: data.latitude,
      longitude: data.longitude,
      notes: data.notes,
    });

    if (!record) {
      throw new AppError('Failed to record check-out', 500);
    }

    await auditService.log({
      actorId: actorId || driverId,
      action: 'DRIVER_CHECK_OUT',
      entityType: 'DRIVER_ATTENDANCE',
      entityId: record.id,
      details: {
        driverId,
        date: todayStr,
        latitude: data.latitude,
        longitude: data.longitude,
      },
      ipAddress,
    });

    return record;
  },

  async getToday(driverId: string): Promise<DriverAttendanceRecord | null> {
    const todayStr = getTodayDateString();
    return attendanceRepository.findTodayByDriver(driverId, todayStr);
  },

  async getHistory(driverId: string, limit = 30): Promise<DriverAttendanceRecord[]> {
    return attendanceRepository.getDriverHistory(driverId, limit);
  },

  async getMonthlySummary(driverId: string, _year?: number, _month?: number): Promise<{
    daysPresentMonth: number;
    daysAbsentMonth: number;
    daysOnLeave: number;
    currentShift: string;
  }> {
    return attendanceRepository.getMonthlySummary(driverId);
  },

  async getDriverAttendance(driverId: string): Promise<{
    history: DriverAttendanceRecord[];
    summary: {
      daysPresentMonth: number;
      daysAbsentMonth: number;
      daysOnLeave: number;
      currentShift: string;
    };
    todayStatus: DriverAttendanceRecord | null;
  }> {
    const driver = await userRepository.findById(driverId);
    if (!driver || driver.role !== 'DRIVER') {
      throw new AppError('Driver not found', 404);
    }

    const todayStr = getTodayDateString();
    const [history, summary, todayStatus] = await Promise.all([
      attendanceRepository.getDriverHistory(driverId),
      attendanceRepository.getMonthlySummary(driverId),
      attendanceRepository.findTodayByDriver(driverId, todayStr),
    ]);

    return { history, summary, todayStatus };
  },

  async correctAttendance(
    id: string,
    data: {
      status?: 'PRESENT' | 'ABSENT' | 'ON_LEAVE' | 'HALF_DAY';
      checkInTime?: string;
      checkOutTime?: string;
      correctionReason?: string;
      reason?: string;
    },
    actorId: string,
    ipAddress?: string
  ): Promise<DriverAttendanceRecord> {
    const reason = data.correctionReason || data.reason;
    if (!reason || reason.trim().length < 5) {
      throw new AppError('Correction reason is mandatory (minimum 5 characters) for audit compliance.', 400);
    }

    const updated = await attendanceRepository.correctAttendance(id, {
      ...data,
      correctionReason: reason.trim(),
      correctedBy: actorId,
    });

    if (!updated) {
      throw new AppError('Attendance record not found', 404);
    }

    await auditService.log({
      actorId,
      action: 'DRIVER_ATTENDANCE_CORRECTED',
      entityType: 'DRIVER_ATTENDANCE',
      entityId: id,
      details: {
        correctionReason: reason.trim(),
        status: data.status,
      },
      ipAddress,
    });

    return updated;
  },
};

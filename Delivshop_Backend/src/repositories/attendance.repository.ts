import { query } from '../config/database.js';

export interface DriverAttendanceRecord {
  id: string;
  driver_id: string;
  driver_name?: string;
  employee_id?: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: 'PRESENT' | 'ABSENT' | 'ON_LEAVE' | 'HALF_DAY';
  is_late: boolean;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  notes: string | null;
  correction_reason: string | null;
  corrected_by: string | null;
  created_at: string;
  updated_at: string;
}

export const attendanceRepository = {
  async findTodayByDriver(driverId: string, dateStr: string): Promise<DriverAttendanceRecord | null> {
    const res = await query<DriverAttendanceRecord>(
      `SELECT * FROM driver_attendance WHERE driver_id = $1 AND attendance_date = $2 LIMIT 1`,
      [driverId, dateStr]
    );
    return res.rows[0] || null;
  },

  async recordCheckIn(data: {
    driverId: string;
    date: string;
    checkInTime: Date;
    latitude?: number;
    longitude?: number;
    isLate?: boolean;
    notes?: string;
  }): Promise<DriverAttendanceRecord> {
    const res = await query<DriverAttendanceRecord>(
      `INSERT INTO driver_attendance (
        driver_id, attendance_date, check_in_time, status, is_late,
        check_in_latitude, check_in_longitude, notes
      )
      VALUES ($1, $2, $3, 'PRESENT', $4, $5, $6, $7)
      ON CONFLICT (driver_id, attendance_date) DO UPDATE
      SET check_in_time = COALESCE(driver_attendance.check_in_time, EXCLUDED.check_in_time),
          check_in_latitude = COALESCE(driver_attendance.check_in_latitude, EXCLUDED.check_in_latitude),
          check_in_longitude = COALESCE(driver_attendance.check_in_longitude, EXCLUDED.check_in_longitude),
          status = 'PRESENT',
          updated_at = NOW()
      RETURNING *`,
      [
        data.driverId,
        data.date,
        data.checkInTime.toISOString(),
        data.isLate || false,
        data.latitude || null,
        data.longitude || null,
        data.notes || null,
      ]
    );
    return res.rows[0];
  },

  async recordCheckOut(data: {
    driverId: string;
    date: string;
    checkOutTime: Date;
    latitude?: number;
    longitude?: number;
    notes?: string;
  }): Promise<DriverAttendanceRecord | null> {
    const res = await query<DriverAttendanceRecord>(
      `UPDATE driver_attendance
       SET check_out_time = $1,
           check_out_latitude = $2,
           check_out_longitude = $3,
           notes = COALESCE($4, notes),
           updated_at = NOW()
       WHERE driver_id = $5 AND attendance_date = $6
       RETURNING *`,
      [
        data.checkOutTime.toISOString(),
        data.latitude || null,
        data.longitude || null,
        data.notes || null,
        data.driverId,
        data.date,
      ]
    );
    return res.rows[0] || null;
  },

  async getDriverHistory(driverId: string, limit = 60): Promise<DriverAttendanceRecord[]> {
    const res = await query<DriverAttendanceRecord>(
      `SELECT da.*, u.name as driver_name, u.employee_id
       FROM driver_attendance da
       JOIN users u ON da.driver_id = u.id
       WHERE da.driver_id = $1
       ORDER BY da.attendance_date DESC
       LIMIT $2`,
      [driverId, limit]
    );
    return res.rows;
  },

  async getMonthlySummary(driverId: string): Promise<{
    daysPresentMonth: number;
    daysAbsentMonth: number;
    daysOnLeave: number;
    currentShift: string;
  }> {
    const res = await query<{
      present_count: string;
      absent_count: string;
      leave_count: string;
    }>(
      `SELECT
        COUNT(CASE WHEN status = 'PRESENT' THEN 1 END)::text as present_count,
        COUNT(CASE WHEN status = 'ABSENT' THEN 1 END)::text as absent_count,
        COUNT(CASE WHEN status = 'ON_LEAVE' THEN 1 END)::text as leave_count
       FROM driver_attendance
       WHERE driver_id = $1
         AND attendance_date >= date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'))::date
         AND attendance_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date`,
      [driverId]
    );

    const r = res.rows[0] || { present_count: '0', absent_count: '0', leave_count: '0' };
    return {
      daysPresentMonth: parseInt(r.present_count, 10) || 0,
      daysAbsentMonth: parseInt(r.absent_count, 10) || 0,
      daysOnLeave: parseInt(r.leave_count, 10) || 0,
      currentShift: 'MORNING (05:30 AM - 02:00 PM)',
    };
  },

  async correctAttendance(
    id: string,
    data: {
      status?: 'PRESENT' | 'ABSENT' | 'ON_LEAVE' | 'HALF_DAY';
      checkInTime?: string;
      checkOutTime?: string;
      correctionReason: string;
      correctedBy: string;
    }
  ): Promise<DriverAttendanceRecord | null> {
    const fields: string[] = ['correction_reason = $1', 'corrected_by = $2', 'updated_at = NOW()'];
    const values: any[] = [data.correctionReason, data.correctedBy];

    if (data.status) {
      values.push(data.status);
      fields.push(`status = $${values.length}`);
    }
    if (data.checkInTime) {
      values.push(data.checkInTime);
      fields.push(`check_in_time = $${values.length}`);
    }
    if (data.checkOutTime) {
      values.push(data.checkOutTime);
      fields.push(`check_out_time = $${values.length}`);
    }

    values.push(id);
    const res = await query<DriverAttendanceRecord>(
      `UPDATE driver_attendance
       SET ${fields.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );
    return res.rows[0] || null;
  },
};

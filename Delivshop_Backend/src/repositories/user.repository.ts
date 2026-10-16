import { query } from '../config/database.js';
import { UserRecord, UserRole } from '../types/user.types.js';

export const userRepository = {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const res = await query<UserRecord>(
      `SELECT id, email, password_hash, name, role, phone, employee_id, vehicle_number, vehicle_type, 
              assigned_route, license_number, license_expiry, joining_date, emergency_contact, notes, 
              is_active, created_at, updated_at, deleted_at, deleted_by, deletion_reason 
       FROM users 
       WHERE email = $1 AND deleted_at IS NULL 
       LIMIT 1`,
      [email.toLowerCase().trim()]
    );
    return res.rows[0] || null;
  },

  async findByEmailOrEmployeeId(identifier: string): Promise<UserRecord | null> {
    const clean = identifier.trim();
    const res = await query<UserRecord>(
      `SELECT id, email, password_hash, name, role, phone, employee_id, vehicle_number, vehicle_type, 
              assigned_route, license_number, license_expiry, joining_date, emergency_contact, notes, 
              is_active, created_at, updated_at, deleted_at, deleted_by, deletion_reason 
       FROM users 
       WHERE (LOWER(email) = LOWER($1) OR UPPER(employee_id) = UPPER($1)) AND deleted_at IS NULL 
       LIMIT 1`,
      [clean]
    );
    return res.rows[0] || null;
  },

  async findByEmployeeId(employeeId: string): Promise<UserRecord | null> {
    const res = await query<UserRecord>(
      `SELECT id, email, password_hash, name, role, phone, employee_id, vehicle_number, vehicle_type, 
              assigned_route, license_number, license_expiry, joining_date, emergency_contact, notes, 
              is_active, created_at, updated_at, deleted_at 
       FROM users 
       WHERE UPPER(employee_id) = UPPER($1) AND deleted_at IS NULL 
       LIMIT 1`,
      [employeeId.trim()]
    );
    return res.rows[0] || null;
  },

  async findById(id: string): Promise<UserRecord | null> {
    const res = await query<UserRecord>(
      `SELECT id, email, password_hash, name, role, phone, employee_id, vehicle_number, vehicle_type, 
              assigned_route, license_number, license_expiry, joining_date, emergency_contact, notes, 
              is_active, created_at, updated_at, deleted_at, deleted_by, deletion_reason 
       FROM users 
       WHERE id = $1 AND deleted_at IS NULL 
       LIMIT 1`,
      [id]
    );
    return res.rows[0] || null;
  },

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
    phone?: string;
    employeeId?: string;
    vehicleNumber?: string;
    vehicleType?: string;
    assignedRoute?: string;
    licenseNumber?: string;
    licenseExpiry?: string | Date;
    joiningDate?: string | Date;
    emergencyContact?: string;
    notes?: string;
  }): Promise<UserRecord> {
    const res = await query<UserRecord>(
      `INSERT INTO users (
        email, password_hash, name, role, phone, 
        employee_id, vehicle_number, vehicle_type, assigned_route, 
        license_number, license_expiry, joining_date, emergency_contact, notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, email, name, role, phone, employee_id, vehicle_number, vehicle_type, 
                 assigned_route, license_number, license_expiry, joining_date, emergency_contact, 
                 notes, is_active, created_at, updated_at`,
      [
        data.email.toLowerCase().trim(),
        data.passwordHash,
        data.name,
        data.role,
        data.phone || null,
        data.employeeId || null,
        data.vehicleNumber || null,
        data.vehicleType || null,
        data.assignedRoute || null,
        data.licenseNumber || null,
        data.licenseExpiry || null,
        data.joiningDate || null,
        data.emergencyContact || null,
        data.notes || null,
      ]
    );
    return res.rows[0];
  },
};

export type UserRole = 'ADMIN' | 'SUPPLIER' | 'SHOP' | 'DRIVER';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  shopId?: string;
  driverId?: string;
  employeeId?: string;
}

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  phone?: string;
  shop_id?: string;
  driver_id?: string;
  employee_id?: string;
  vehicle_number?: string;
  vehicle_type?: string;
  assigned_route?: string;
  license_number?: string;
  license_expiry?: string | Date;
  joining_date?: string | Date;
  emergency_contact?: string;
  notes?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
  deleted_by?: string | null;
  deletion_reason?: string | null;
}

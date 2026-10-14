export type UserRole = 'ADMIN' | 'SUPPLIER' | 'SHOP' | 'DRIVER';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  shopId?: string;
  driverId?: string;
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
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

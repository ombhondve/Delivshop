export type UserRole = 'ADMIN' | 'SUPPLIER' | 'SHOP' | 'DRIVER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  shopId?: string;
  driverId?: string;
  employeeId?: string;
  employee_id?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  assignedRoute?: string;
  licenseNumber?: string;
  accountStatus?: string;
  employmentStatus?: string;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginCredentials {
  email?: string;
  shopId?: string;
  password: string;
}

export interface ShopLoginResponse {
  mustChangePassword: boolean;
  restrictedToken?: string;
  message?: string;
  user?: User;
  shop?: {
    id: string;
    shopId: string;
    name: string;
    shopType?: string;
    address?: string;
    creditLimit?: number;
    outstandingBalance?: number;
    paymentTerms?: string;
  };
  tokens?: AuthTokens;
}

export interface CompleteSetupPayload {
  newPassword: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string;
}

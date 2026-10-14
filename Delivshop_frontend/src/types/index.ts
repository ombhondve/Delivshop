export type UserRole = 'ADMIN' | 'SUPPLIER' | 'SHOP' | 'DRIVER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  shopId?: string;
  driverId?: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface Shop {
  id: string;
  name: string;
  ownerId: string;
  email: string;
  phone: string;
  address: string;
  isOpen: boolean;
  rating?: number;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  sku: string;
  price: number;
  stockQuantity: number;
  category: string;
  isActive: boolean;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

export interface Order {
  id: string;
  orderNumber: string;
  shopId: string;
  shopName: string;
  driverId?: string;
  driverName?: string;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: {
    street: string;
    city: string;
    postalCode: string;
  };
  createdAt: string;
}

export type DeliveryStatus =
  | 'PENDING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'EN_ROUTE_DROPOFF'
  | 'DELIVERED'
  | 'FAILED';

export interface Delivery {
  id: string;
  orderId: string;
  orderNumber: string;
  driverId: string;
  driverName?: string;
  shopName: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: DeliveryStatus;
  estimatedMinutes?: number;
  createdAt: string;
}

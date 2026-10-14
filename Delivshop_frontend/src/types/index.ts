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
  details?: Record<string, string[]>;
}

export type ShopType = 'Retail Shop' | 'Wholesale Shop' | 'Distributor';
export type ShopStatus = 'ACTIVE' | 'INACTIVE';
export type PaymentTerms = 'Advance Payment' | 'Credit Allowed';

export interface Shop {
  id: string;
  shop_id: string;
  name: string;
  shop_type: ShopType;
  owner_id: string;
  owner_name: string;
  email: string;
  phone: string;
  address: string;
  area: string;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  map_link?: string | null;
  is_location_verified: boolean;
  delivery_contact_name?: string | null;
  delivery_contact_phone?: string | null;
  delivery_instructions?: string | null;
  delivery_window?: string | null;
  gstin?: string | null;
  billing_address?: string | null;
  payment_terms: PaymentTerms;
  credit_limit: number;
  outstanding_balance: number;
  notes?: string | null;
  status: ShopStatus;
  is_open: boolean;
  rating?: number;
  created_at: string;
  updated_at: string;
}

export interface ShopAccountStatus {
  shopId: string;
  isActive: boolean;
  mustChangePassword: boolean;
  tempPasswordIssuedAt: string | null;
  lastLoginAt: string | null;
  failedAttempts: number;
  isLocked: boolean;
}

export interface ShopDetailsResponse {
  shop: Shop;
  accountStatus: ShopAccountStatus;
}

export interface ProvisionedShopResponse {
  shop: Shop;
  credentials: {
    shopId: string;
    temporaryPassword: string;
    loginUrlNotice: string;
    mustChangePassword: true;
  };
}

export interface Product {
  id: string;
  shop_id?: string;
  shopId?: string;
  name: string;
  sku: string;
  price: number;
  stock_quantity?: number;
  stockQuantity?: number;
  category: string;
  is_active?: boolean;
  isActive?: boolean;
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
  order_number?: string;
  orderNumber?: string;
  shop_id?: string;
  shopId?: string;
  shop_name?: string;
  shopName?: string;
  driver_id?: string;
  driverId?: string;
  driver_name?: string;
  driverName?: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee?: number;
  deliveryFee?: number;
  total: number;
  delivery_address?: any;
  deliveryAddress?: {
    street: string;
    city: string;
    postalCode: string;
  };
  created_at?: string;
  createdAt?: string;
}

export type DeliveryStatus =
  | 'PENDING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'EN_ROUTE_PICKUP'
  | 'ARRIVED_PICKUP'
  | 'PICKED_UP'
  | 'EN_ROUTE_DROPOFF'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export interface Delivery {
  id: string;
  order_id?: string;
  orderId?: string;
  order_number?: string;
  orderNumber?: string;
  driver_id?: string;
  driverId?: string;
  driver_name?: string;
  driverName?: string;
  shop_name?: string;
  shopName?: string;
  shop_address?: string;
  pickupAddress?: string;
  shop_latitude?: number | null;
  shop_longitude?: number | null;
  dropoffAddress?: string;
  status: DeliveryStatus;
  estimatedMinutes?: number;
  current_latitude?: number | null;
  current_longitude?: number | null;
  notes?: string | null;
  created_at?: string;
  createdAt?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  shop_id: string;
  order_id?: string | null;
  amount: number;
  due_date: string;
  status: 'UNPAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  notes?: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  payment_number: string;
  shop_id: string;
  invoice_id?: string | null;
  amount: number;
  payment_method: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  transaction_ref?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface DriverUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'DRIVER';
  is_active: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

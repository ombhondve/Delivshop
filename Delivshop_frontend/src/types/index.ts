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
  shop_id?: string | null;
  shopId?: string | null;
  company_id?: string | null;
  companyId?: string | null;
  name: string;
  sku: string;
  price: number;
  stock_quantity?: number;
  stockQuantity: number;
  category: string;
  is_active?: boolean;
  isActive: boolean;
  brand?: string | null;
  description?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  base_unit?: string;
  baseUnit?: string;
  pack_size?: string;
  packSize?: string;
  units_per_pack?: number;
  unitsPerPack?: number;
  purchase_unit?: string | null;
  purchaseUnit?: string | null;
  selling_unit?: string | null;
  sellingUnit?: string | null;
  purchase_cost?: number;
  purchaseCost?: number;
  min_stock_threshold?: number;
  minStockThreshold?: number;
  reorder_quantity?: number;
  reorderQuantity?: number;
  tax_rate?: number;
  taxRate?: number;
  is_tax_inclusive?: boolean;
  isTaxInclusive?: boolean;
  min_selling_price?: number | null;
  minSellingPrice?: number | null;
  track_inventory?: boolean;
  trackInventory?: boolean;
  track_batches?: boolean;
  trackBatches?: boolean;
  storage_temperature?: string | null;
  storageTemperature?: string | null;
  shelf_life_days?: number | null;
  shelfLifeDays?: number | null;
  fat_percentage?: number | null;
  fatPercentage?: number | null;
  snf_percentage?: number | null;
  snfPercentage?: number | null;
  fssai_license?: string | null;
  fssaiLicense?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  company?: {
    id: string;
    name: string;
    code: string;
    status: string;
  } | null;
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  batchesCount?: number;
  nearestExpiry?: string | null;
  isExpiringSoon?: boolean;
  batches?: InventoryBatch[];
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

export type CompanyType =
  | 'DAIRY_PRODUCER'
  | 'DISTRIBUTOR'
  | 'PROCESSOR'
  | 'LOGISTICS_PARTNER'
  | 'OTHER'
  | 'Dairy Processor'
  | 'Milk Producer Cooperative'
  | 'Wholesale Dairy Supplier'
  | 'Packaging & Feed Supplier'
  | 'Logistics Partner'
  | 'Other'
  | (string & {});

export type CompanyStatus = 'ACTIVE' | 'INACTIVE';

export interface Company {
  id: string;
  companyCode: string;
  name: string;
  companyType: CompanyType;
  description?: string | null;
  logoUrl?: string | null;
  contactPerson: string;
  phone: string;
  email: string;
  altPhone?: string | null;
  alternatePhone?: string | null;
  gstin?: string | null;
  pan?: string | null;
  registrationNumber?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  status: CompanyStatus;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  productsCount?: number;
}

export interface CompanySummaryStats {
  totalCompanies: number;
  activeCompanies: number;
  inactiveCompanies: number;
  recentCompanies: number;
}

export interface CreateCompanyPayload {
  name: string;
  companyCode?: string;
  companyType?: CompanyType;
  description?: string;
  logoUrl?: string;
  contactPerson: string;
  phone: string;
  email: string;
  altPhone?: string;
  alternatePhone?: string;
  gstin?: string;
  pan?: string;
  registrationNumber?: string;
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode: string;
  country?: string;
  notes?: string;
  status?: CompanyStatus;
}

export interface UpdateCompanyPayload {
  name?: string;
  companyType?: CompanyType;
  description?: string | null;
  logoUrl?: string | null;
  contactPerson?: string;
  phone?: string;
  email?: string;
  altPhone?: string | null;
  alternatePhone?: string | null;
  gstin?: string | null;
  pan?: string | null;
  registrationNumber?: string | null;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  notes?: string | null;
  status?: CompanyStatus;
}

export interface CompanyFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  companyType?: string;
  city?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ProductSummaryStats {
  totalProducts: number;
  activeProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  expiringSoonItems: number;
}

export interface ProductFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  category?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  stockStatus?: 'ALL' | 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRING_SOON';
  sortBy?: 'name' | 'sku' | 'price' | 'stock_quantity' | 'created_at' | 'updated_at';
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateProductPayload {
  companyId: string;
  name: string;
  sku?: string;
  category: string;
  description?: string;
  brand?: string;
  imageUrl?: string;
  isActive?: boolean;
  baseUnit: string;
  packSize: string;
  unitsPerPack?: number;
  purchaseUnit?: string;
  sellingUnit?: string;
  purchaseCost?: number;
  price: number;
  minStockThreshold?: number;
  reorderQuantity?: number;
  taxRate?: number;
  isTaxInclusive?: boolean;
  minSellingPrice?: number;
  trackInventory?: boolean;
  trackBatches?: boolean;
  storageTemperature?: string;
  shelfLifeDays?: number;
  fatPercentage?: number;
  snfPercentage?: number;
  fssaiLicense?: string;
  initialStock?: number;
  initialBatchNumber?: string;
  initialExpiryDate?: string;
  initialManufacturingDate?: string;
}

export interface UpdateProductPayload {
  name?: string;
  companyId?: string;
  category?: string;
  description?: string | null;
  brand?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
  baseUnit?: string;
  packSize?: string;
  unitsPerPack?: number;
  purchaseUnit?: string | null;
  sellingUnit?: string | null;
  purchaseCost?: number;
  price?: number;
  minStockThreshold?: number;
  reorderQuantity?: number;
  taxRate?: number;
  isTaxInclusive?: boolean;
  minSellingPrice?: number | null;
  trackInventory?: boolean;
  trackBatches?: boolean;
  storageTemperature?: string | null;
  shelfLifeDays?: number | null;
  fatPercentage?: number | null;
  snfPercentage?: number | null;
  fssaiLicense?: string | null;
}

export interface InventoryBatch {
  id: string;
  productId: string;
  companyId?: string | null;
  batchNumber: string;
  manufacturingDate?: string | null;
  expiryDate: string;
  quantityReceived: number;
  quantityRemaining: number;
  purchaseCost: number;
  status: 'ACTIVE' | 'EXPIRED' | 'DEPLETED';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  movementNumber: string;
  productId: string;
  productName?: string;
  productSku?: string;
  batchId?: string | null;
  batchNumber?: string | null;
  movementType: string;
  quantityChange: number;
  previousStock: number;
  newStock: number;
  unitCost: number;
  referenceType: string;
  referenceId?: string | null;
  reason?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  createdAt: string;
}

export interface StockReceiptPayload {
  productId: string;
  companyId: string;
  quantity: number;
  unitCost?: number;
  batchNumber?: string;
  manufacturingDate?: string;
  expiryDate: string;
  referenceId?: string;
  notes?: string;
}

export interface StockAdjustmentPayload {
  productId: string;
  batchId?: string;
  adjustmentType: 'INCREASE' | 'DECREASE' | 'CORRECTION' | 'DAMAGE' | 'EXPIRY';
  quantityChange: number;
  reason: string;
  referenceId?: string;
  notes?: string;
}

export interface InventoryFilterQuery {
  page?: number;
  limit?: number;
  productId?: string;
  movementType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}


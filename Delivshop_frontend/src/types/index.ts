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
  alternate_phone?: string | null;
  role: 'DRIVER';
  is_active: boolean;
  employee_id?: string;
  vehicle_number?: string | null;
  vehicle_type?: string | null;
  assigned_route?: string | null;
  license_number?: string | null;
  license_expiry?: string | null;
  license_class?: string | null;
  joining_date?: string | null;
  emergency_contact?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relation?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  employment_status?: string | null;
  account_status?: string | null;
  must_change_password?: boolean | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  active_deliveries?: number;
  completed_deliveries?: number;
  today_deliveries?: number;
  current_delivery_status?: string | null;
  current_order_number?: string | null;
  current_shop_name?: string | null;
  status?: 'AVAILABLE' | 'ON_DELIVERY' | 'OFF_DUTY' | 'INACTIVE';
  rating?: number;
}

export interface DriverRosterSummary {
  totalDrivers: number;
  activeDrivers: number;
  availableDrivers: number;
  onDeliveryDrivers: number;
  inactiveDrivers: number;
  attentionRequired: number;
}

export interface DriverDeliveryRecord {
  id: string;
  order_id: string;
  order_number: string;
  driver_id: string;
  status: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  order_status: string;
  shop_name: string;
  shop_address: string;
  shop_phone: string;
  delivery_contact_name?: string | null;
  delivery_contact_phone?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
}

export interface DriverAuditRecord {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: any;
  ip_address?: string | null;
  created_at: string;
  actor_name?: string | null;
  actor_role?: string | null;
}

export interface CreateDriverPayload {
  name: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  employeeId?: string;
  password?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  licenseClass?: string;
  joiningDate?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  dateOfBirth?: string;
  gender?: string;
  employmentStatus?: string;
  accountStatus?: string;
  notes?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  assignedRoute?: string;
}

export interface UpdateDriverPayload {
  name?: string;
  phone?: string;
  alternatePhone?: string | null;
  email?: string;
  employeeId?: string;
  licenseNumber?: string | null;
  licenseExpiry?: string | null;
  licenseClass?: string | null;
  joiningDate?: string | null;
  emergencyContact?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  employmentStatus?: string | null;
  accountStatus?: string | null;
  notes?: string | null;
  vehicleNumber?: string | null;
  vehicleType?: string | null;
  assignedRoute?: string | null;
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
  latitude?: number | null;
  longitude?: number | null;
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
  latitude?: number | null;
  longitude?: number | null;
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
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  status?: CompanyStatus;
}

export interface PickupShopContribution {
  shopId: string;
  shopCode: string;
  shopName: string;
  orderId: string;
  orderNumber: string;
  quantity: number;
}

export interface PickupProductItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  packSize: string;
  requiredQuantity: number;
  collectedQuantity: number;
  outstandingQuantity: number;
  unitPrice?: number;
  totalPrice?: number;
  status: 'PENDING' | 'COLLECTED' | 'SHORTAGE' | 'PARTIAL';
  shortageReason?: string | null;
  shopBreakdown: PickupShopContribution[];
}

export interface CompanyPickupStop {
  companyId: string;
  companyCode: string;
  companyName: string;
  companyType: string;
  contactPerson: string;
  phone: string;
  email: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  hasCoordinates: boolean;
  hasGpsCoordinates?: boolean;
  stopSequence: number;
  status: 'PENDING' | 'ARRIVED' | 'COLLECTED' | 'SHORTAGE' | 'SKIPPED';
  pickupStatus?: 'PENDING' | 'ARRIVED' | 'COLLECTED' | 'SHORTAGE' | 'SKIPPED' | 'DISCREPANCY';
  companyAddress?: string;
  arrivalTime?: string | null;
  completedTime?: string | null;
  verifiedDistanceMeters?: number | null;
  discrepancyReason?: string | null;
  totalRequiredUnits: number;
  totalCollectedUnits: number;
  products: PickupProductItem[];
}

export interface AggregatedPickupProduct {
  productId: string;
  productName: string;
  productSku?: string;
  unit: string;
  totalRequiredQuantity: number;
  totalCollectedQuantity: number;
  totalOutstandingQuantity: number;
  suppliersCount: number;
}

export interface PickupRequirementsResponse {
  runId?: string;
  runCode?: string;
  routeId?: string;
  routeName?: string;
  deliveryDate?: string;
  driverId?: string;
  driverName?: string;
  vehicleRegistration?: string;
  totalPickups: number;
  completedPickups: number;
  totalProductsCount: number;
  totalRequiredUnits: number;
  totalCollectedUnits: number;
  supplierPickups: CompanyPickupStop[];
  aggregatedProducts: AggregatedPickupProduct[];
  summary: {
    totalCompanies: number;
    totalProducts: number;
    totalRequiredUnits: number;
    totalCollectedUnits: number;
    progressPercent: number;
    totalShopsCount: number;
  };
  companies: CompanyPickupStop[];
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
  stockStatus?: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRING_SOON' | 'ARCHIVED';
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

// ----------------------------------------------------
// VEHICLES MANAGEMENT MODULE TYPES
// ----------------------------------------------------
export interface Vehicle {
  id: string;
  vehicle_code: string;
  registration_number: string;
  registrationNumber?: string;
  make_model?: string | null;
  makeModel?: string | null;
  vehicle_type: string;
  type?: string;
  capacity_kg: number;
  capacityKg?: number;
  capacity_crates: number;
  capacityCrates?: number;
  fuel_type: 'DIESEL' | 'ELECTRIC' | 'CNG' | 'PETROL' | string;
  fuelType?: string;
  is_refrigerated: boolean;
  isRefrigerated?: boolean;
  nickname?: string | null;
  manufacturing_year?: number | null;
  manufacturingYear?: number | null;
  temperature_min_c?: number | null;
  temperature_max_c?: number | null;
  city?: string | null;
  state?: string | null;
  depot: string;
  depotName?: string | null;
  status: 'AVAILABLE' | 'ASSIGNED' | 'UNDER_MAINTENANCE' | 'MAINTENANCE' | 'INACTIVE';
  is_active: boolean;
  isActive?: boolean;
  current_odometer_km: number;
  odometerKm?: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  active_run_id?: string | null;
  active_run_code?: string | null;
  active_driver_name?: string | null;
  active_driver_phone?: string | null;
  active_route_name?: string | null;
  compliance_status?: 'COMPLIANT' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING_DOCS';
  nearest_expiry_date?: string | null;
  is_dispatch_eligible?: boolean;
  total_documents_count?: number;
  expiring_documents_count?: number;
  expired_documents_count?: number;
  documents?: VehicleDocument[];
  maintenance?: VehicleMaintenance[];
  assignments?: any[];
  eligibility?: {
    isEligible: boolean;
    reasons: string[];
    warnings: string[];
    conditions: {
      isActive: boolean;
      notInMaintenance: boolean;
      noConflictingAssignment: boolean;
      mandatoryDocumentsValid: boolean;
      refrigerationCompatible: boolean;
    };
  };
  activity?: Array<{
    id: string;
    action: string;
    details: any;
    created_at: string;
    ip_address?: string;
    actor_name?: string;
    actor_role?: string;
    actor_email?: string;
  }>;
}

export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  document_type: 'RC' | 'INSURANCE' | 'PUC' | 'FITNESS' | 'PERMIT' | 'TEMPERATURE_CALIBRATION' | 'OTHER' | string;
  documentType?: string;
  document_number: string;
  documentNumber?: string;
  issue_date?: string | null;
  issueDate?: string | null;
  expiry_date?: string | null;
  expiryDate?: string | null;
  verification_status: 'VALID' | 'EXPIRING' | 'EXPIRED' | 'PENDING' | 'REJECTED' | 'VERIFIED' | string;
  verificationStatus?: string;
  file_url?: string | null;
  fileUrl?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  verifier_name?: string | null;
  verified_at?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface VehicleMaintenance {
  id: string;
  vehicle_id: string;
  service_date: string;
  serviceDate?: string;
  service_type: string;
  serviceType?: string;
  odometer_km: number;
  odometerKm?: number;
  cost: number;
  service_center?: string | null;
  serviceCenter?: string | null;
  description?: string | null;
  next_service_date?: string | null;
  nextServiceDate?: string | null;
  recorder_name?: string | null;
  created_at: string;
}

export interface VehicleSummary {
  totalVehicles: number;
  activeVehicles: number;
  availableVehicles: number;
  assignedVehicles: number;
  underMaintenanceVehicles: number;
  inactiveVehicles: number;
  attentionRequired: number;
  depots?: string[];
  vehicleTypes?: string[];
}

// ----------------------------------------------------
// ROUTES MANAGEMENT MODULE TYPES
// ----------------------------------------------------
export interface RouteStop {
  id: string;
  route_id?: string;
  routeId?: string;
  shop_id: string;
  shopId?: string;
  stop_sequence: number;
  sequenceIndex?: number;
  planned_arrival_time?: string | null;
  timeWindowStart?: string | null;
  timeWindowEnd?: string | null;
  service_time_minutes: number;
  serviceTimeMinutes?: number;
  delivery_instructions?: string | null;
  shop_name?: string;
  shopName?: string;
  shop_address?: string;
  address?: string;
  shop_area?: string;
  shop_city?: string;
  shop_latitude?: number | null;
  latitude?: number | null;
  shop_longitude?: number | null;
  longitude?: number | null;
  is_location_verified?: boolean;
  delivery_contact_name?: string | null;
  delivery_contact_phone?: string | null;
}

export interface RouteVersion {
  id: string;
  route_id: string;
  version_number: number;
  version?: number;
  stops_snapshot: any[];
  stopsSnapshot?: any[];
  changes_summary?: string | null;
  changeReason?: string | null;
  created_by_name?: string | null;
  created_at: string;
  createdAt?: string;
  estimatedDistanceKm?: number;
  estimatedDurationMinutes?: number;
}

export interface Route {
  id: string;
  route_code: string;
  code?: string;
  name: string;
  city: string;
  state: string;
  depot: string;
  depotName?: string;
  depotAddress?: string;
  description?: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'PUBLISHED' | 'ARCHIVED';
  total_distance_km: number;
  estimatedDistanceKm?: number;
  estimated_duration_minutes: number;
  estimatedDurationMinutes?: number;
  version: number;
  returnToDepot?: boolean;
  stops_count?: number;
  stopsCount?: number;
  active_runs_count?: number;
  created_at: string;
  updated_at: string;
  stops?: RouteStop[];
  versions?: RouteVersion[];
  assignments?: any[];
}

export interface RouteSummary {
  totalRoutes: number;
  dispatchableRoutes?: number;
  publishedRoutes?: number;
  activeRoutes: number;
  draftRoutes: number;
  inactiveRoutes: number;
  totalStopsConfigured: number;
  totalStops?: number;
  avgDistanceKm?: number;
  measuredRoutesCount?: number;
  readinessPercentage?: number;
}

// ----------------------------------------------------
// ASSIGNMENTS & DAILY DELIVERY RUNS TYPES
// ----------------------------------------------------
export interface DeliveryRunStop {
  id: string;
  run_id: string;
  shop_id: string;
  shopId?: string;
  stop_sequence: number;
  sequenceIndex?: number;
  status: 'PENDING' | 'ARRIVED' | 'DELIVERED' | 'FAILED' | 'SKIPPED';
  arrival_time?: string | null;
  delivery_time?: string | null;
  recipientName?: string | null;
  notes?: string | null;
  proof_of_delivery_url?: string | null;
  failure_reason?: string | null;
  failureReason?: string | null;
  shop_name?: string;
  shopName?: string;
  shop_address?: string;
  address?: string;
  shop_area?: string;
  shop_city?: string;
  shop_latitude?: number | null;
  shop_longitude?: number | null;
  delivery_contact_name?: string | null;
  delivery_contact_phone?: string | null;
}

export interface DeliveryRun {
  id: string;
  run_code: string;
  runCode?: string;
  route_id: string;
  routeId?: string;
  driver_id: string;
  driverId?: string;
  vehicle_id: string;
  vehicleId?: string;
  delivery_date: string;
  deliveryDate?: string;
  status: 'DRAFT' | 'VALIDATED' | 'ASSIGNED' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  planned_stops_count: number;
  totalStopsCount?: number;
  completed_stops_count: number;
  completedStopsCount?: number;
  dispatch_time?: string | null;
  completion_time?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  route_code?: string;
  routeCode?: string;
  route_name?: string;
  routeName?: string;
  route_city?: string;
  route_depot?: string;
  total_distance_km?: number;
  estimated_duration_minutes?: number;
  driver_name?: string;
  driverName?: string;
  driver_employee_id?: string;
  driver_phone?: string;
  driverPhone?: string;
  driver_license?: string;
  vehicle_registration?: string;
  registrationNumber?: string;
  vehicle_code?: string;
  vehicle_type?: string;
  vehicleType?: string;
  capacity_crates?: number;
  is_refrigerated?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deletion_reason?: string | null;
  stops?: DeliveryRunStop[];
}

export interface AssignmentSummary {
  totalAssignments: number;
  inProgress: number;
  readyToDispatch: number;
  completed: number;
  cancelled: number;
  todayAssignments: number;
}

// ----------------------------------------------------
// EXTENDED DRIVER PROFILE, SALARY & PAYROLL TYPES
// ----------------------------------------------------
export interface DriverSalaryConfig {
  id: string;
  driver_id: string;
  base_monthly_salary: number;
  baseSalary?: number;
  daily_allowance: number;
  per_delivery_incentive: number;
  effective_from: string;
  effectiveFromDate?: string;
  paymentCycle?: string;
  allowances?: { hra?: number; fuel?: number; [key: string]: any };
  deductions?: { pf?: number; [key: string]: any };
  effective_to?: string | null;
  is_current: boolean;
  notes?: string | null;
}

export interface DriverPayrollRecord {
  id: string;
  driver_id: string;
  payment_period: string;
  periodStartDate?: string;
  periodEndDate?: string;
  base_salary: number;
  baseSalary?: number;
  allowances: number;
  totalAllowances?: number;
  incentives: number;
  deductions: number;
  totalDeductions?: number;
  advances: number;
  advancesDeducted?: number;
  net_amount: number;
  netAmount?: number;
  status: 'DRAFT' | 'APPROVED' | 'PAID' | 'CANCELLED';
  paymentStatus?: string;
  payment_date?: string | null;
  paidAt?: string | null;
  paymentMethod?: string;
  payment_reference?: string | null;
  paymentReference?: string | null;
  processor_name?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface DriverDocument {
  id: string;
  driver_id: string;
  document_type: 'DRIVING_LICENSE' | 'AADHAAR' | 'PAN' | 'POLICE_VERIFICATION' | 'MEDICAL_FITNESS' | string;
  documentType?: string;
  document_number: string;
  documentNumber?: string;
  issue_date?: string | null;
  issueDate?: string | null;
  expiry_date?: string | null;
  expiryDate?: string | null;
  verification_status: 'VALID' | 'EXPIRING' | 'EXPIRED' | 'PENDING' | 'REJECTED' | 'VERIFIED' | string;
  verificationStatus?: string;
  file_url?: string | null;
  fileUrl?: string | null;
  verifier_name?: string | null;
  verified_at?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface DriverFullProfile {
  driver: DriverUser;
  employment?: {
    employeeId?: string;
    employmentType?: string;
    joinedDate?: string;
    city?: string;
    depot?: string;
  };
  salaryConfig?: DriverSalaryConfig | null;
  payrollRecords?: DriverPayrollRecord[];
  documents?: DriverDocument[];
  attendance?: {
    daysPresentMonth?: number;
    daysAbsentMonth?: number;
    currentShift?: string;
  };
  deliveryHistory?: any[];
  deliveries?: DriverDeliveryRecord[];
  runs?: DeliveryRun[];
  performance?: {
    totalRuns?: number;
    onTimePercentage?: number;
    completedDrops?: number;
  };
  accessStatus?: {
    isDriverAppActive?: boolean;
    lastLoginAt?: string | null;
  };
  auditHistory?: DriverAuditRecord[];
}

export interface OrderVolumeSummaryOverview {
  totalEligibleOrders: number;
  totalLiquidVolumeLitres: number;
  totalPackagesRequired: number;
  totalCratesRequired: number | null;
  distinctProductsCount: number;
  includedShopsCount: number;
  includedStatuses: string[];
  hasIncompletePackaging: boolean;
}

export interface PackagingProductBreakdown {
  productId: string;
  productName: string;
  sku: string;
  packagingType: string;
  packageSize: string;
  category: string;
  isLiquid: boolean;
  totalPackages: number;
  totalVolumeLitres: number | null;
  totalWeightKg: number | null;
  totalCrates: number | null;
  crateCapacity: number | null;
  isCrateCapacityKnown: boolean;
  missingConfigReason?: string;
}

export interface ShopWiseOrderItem {
  itemId: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  packageSize: string;
  packagingType: string;
  isLiquid: boolean;
  quantity: number;
  cratesCount: number | null;
  isCrateCapacityKnown: boolean;
  volumeLitres: number | null;
  weightKg: number | null;
  unitPrice: number;
  totalPrice: number;
}

export interface ShopWiseOrderSummary {
  orderId: string;
  orderNumber: string;
  shopId: string;
  shopCode: string;
  shopName: string;
  shopPhone: string;
  shopAddress: string;
  orderStatus: string;
  dispatchStatus: string;
  driverName: string;
  routeName: string;
  totalLiquidVolumeLitres: number;
  totalPackages: number;
  totalCrates: number | null;
  isCrateCapacityKnown: boolean;
  createdAt: string;
  deliveredAt?: string | null;
  items: ShopWiseOrderItem[];
}

export interface OrderVolumeSummaryResponse {
  overview: OrderVolumeSummaryOverview;
  packagingBreakdown: PackagingProductBreakdown[];
  shopWiseSummary: ShopWiseOrderSummary[];
  metadata: {
    generatedAt: string;
    appliedFilters: {
      status?: string;
      deliveryDate?: string;
      date?: string;
      shopId?: string;
      productId?: string;
      packagingSize?: string;
    };
  };
}

export interface OrderDispatchRecord {
  id: string;
  order_number: string;
  shop_id: string;
  shop_code: string;
  shop_name: string;
  shop_phone?: string;
  shop_address?: any;
  delivery_status: string;
  driver_id?: string;
  driver_name: string;
  driver_phone?: string;
  route_name: string;
  route_code?: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  total_volume_litres: number;
  total_crates_count: number;
  total_packages_count: number;
  has_unknown_crates?: boolean;
  created_at: string;
  delivered_at?: string;
  notes?: string;
  requested_delivery_date?: string | null;
  confirmed_delivery_date?: string | null;
  delivery_window?: string | null;
  scheduling_status?: 'AWAITING_SCHEDULING' | 'SCHEDULED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  delivery_run_id?: string | null;
  delivery_run_code?: string | null;
  vehicle_registration?: string | null;
  scheduled_at?: string | null;
  scheduled_by_name?: string | null;
  items: Array<{
    id: string;
    productId: string;
    name: string;
    sku: string;
    category: string;
    packSize: string;
    packageSize?: string;
    packagingType?: string;
    baseUnit: string;
    unitsPerPack: number | null;
    isLiquid: boolean;
    isCrateCapacityKnown: boolean;
    quantity: number;
    cratesCount: number | null;
    deliveredQuantity?: number;
    volumeLitres: number;
    calculatedVolumeLitres?: number;
    calculatedWeightKg?: number;
    calculatedCrates?: number | null;
    unitPrice: number;
    totalPrice: number;
    unitType?: string;
  }>;
}

export interface UnscheduledOrderRecord {
  id: string;
  order_number: string;
  shop_id: string;
  shop_name: string;
  shop_address?: any;
  shop_phone?: string;
  created_at: string;
  requested_delivery_date: string | null;
  delivery_window: string | null;
  scheduling_status: string;
  awaiting_time_hours: number;
  total: number;
  total_crates: number;
  total_volume_litres: number;
  total_packages: number;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    crates: number;
    volume_litres: number;
  }>;
  eligible_runs: Array<{
    delivery_run_id: string;
    run_code: string;
    route_name: string;
    delivery_date: string;
    delivery_window: string;
    driver_name: string;
    vehicle_registration: string;
    is_published: boolean;
    available_crate_capacity: number;
    fits_order: boolean;
    is_on_route: boolean;
  }>;
}

export interface OrderSchedulingAuditRecord {
  id: string;
  order_id: string;
  previous_status: string | null;
  new_status: string;
  previous_delivery_run_id: string | null;
  new_delivery_run_id: string | null;
  previous_delivery_date: string | null;
  new_delivery_date: string | null;
  reason: string | null;
  performed_by_name: string | null;
  created_at: string;
}




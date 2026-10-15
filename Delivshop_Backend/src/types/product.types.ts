export type DairyCategory =
  | 'Milk'
  | 'Curd / Yogurt'
  | 'Buttermilk'
  | 'Paneer'
  | 'Butter'
  | 'Ghee'
  | 'Cheese'
  | 'Cream'
  | 'Flavoured Milk'
  | 'Other Dairy Products'
  | string;

export type StockFilterStatus = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRING_SOON';

export type MovementType =
  | 'OPENING_STOCK'
  | 'PURCHASE_RECEIPT'
  | 'STOCK_ADJUSTMENT_INCREASE'
  | 'STOCK_ADJUSTMENT_DECREASE'
  | 'ORDER_DISPATCH'
  | 'RETURN_RESTOCK'
  | 'DAMAGE_WRITE_OFF'
  | 'EXPIRY_DISPOSAL'
  | 'REVERSAL';

export interface ProductRecord {
  id: string;
  shop_id?: string | null;
  company_id: string;
  name: string;
  description?: string | null;
  sku: string;
  price: string | number;
  stock_quantity: number;
  category: string;
  is_active: boolean;
  brand?: string | null;
  image_url?: string | null;
  base_unit: string;
  pack_size: string;
  units_per_pack: string | number;
  purchase_unit?: string | null;
  selling_unit?: string | null;
  purchase_cost: string | number;
  min_stock_threshold: number;
  reorder_quantity: number;
  tax_rate: string | number;
  is_tax_inclusive: boolean;
  min_selling_price?: string | number | null;
  track_inventory: boolean;
  track_batches: boolean;
  storage_temperature?: string | null;
  shelf_life_days?: number | null;
  fat_percentage?: string | number | null;
  snf_percentage?: string | number | null;
  fssai_license?: string | null;
  created_at: string;
  updated_at: string;
  // Joined supplier company fields
  company_name?: string;
  company_code?: string;
  company_status?: string;
  batches_count?: number;
  nearest_expiry?: string | null;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  sku: string;
  price: number;
  stockQuantity: number;
  category: string;
  isActive: boolean;
  brand?: string | null;
  imageUrl?: string | null;
  baseUnit: string;
  packSize: string;
  unitsPerPack: number;
  purchaseUnit?: string | null;
  sellingUnit?: string | null;
  purchaseCost: number;
  minStockThreshold: number;
  reorderQuantity: number;
  taxRate: number;
  isTaxInclusive: boolean;
  minSellingPrice?: number | null;
  trackInventory: boolean;
  trackBatches: boolean;
  storageTemperature?: string | null;
  shelfLifeDays?: number | null;
  fatPercentage?: number | null;
  snfPercentage?: number | null;
  fssaiLicense?: string | null;
  createdAt: string;
  updatedAt: string;
  // Supplier company summary
  company?: {
    id: string;
    name: string;
    code: string;
    status: string;
  } | null;
  // Stock & Expiry computation
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  batchesCount?: number;
  nearestExpiry?: string | null;
  isExpiringSoon?: boolean;
}

export interface ProductSummaryStats {
  totalProducts: number;
  activeProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  expiringSoonItems: number;
}

export interface ProductFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  category?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  stockStatus?: StockFilterStatus;
  sortBy?: 'name' | 'sku' | 'price' | 'stock_quantity' | 'created_at' | 'updated_at';
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateProductInput {
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

export interface UpdateProductInput {
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
  movementType: MovementType;
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

export interface StockReceiptInput {
  productId: string;
  companyId: string;
  quantity: number;
  unitCost?: number;
  batchNumber?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  referenceId?: string;
  notes?: string;
}

export interface StockAdjustmentInput {
  productId: string;
  batchId?: string;
  adjustmentType: 'INCREASE' | 'DECREASE' | 'CORRECTION' | 'DAMAGE' | 'EXPIRY';
  quantityChange: number;
  reason: string;
  referenceId?: string;
  notes?: string;
}

export interface InventoryFilterParams {
  page?: number;
  limit?: number;
  productId?: string;
  movementType?: MovementType;
  startDate?: string;
  endDate?: string;
  search?: string;
}

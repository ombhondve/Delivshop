import { apiClient, tokenStore } from './client';
import {
  User,
  Shop,
  ShopDetailsResponse,
  ProvisionedShopResponse,
  Product,
  Order,
  Delivery,
  Invoice,
  Payment,
  DriverUser,
  PaginatedResult,
  AuthTokens,
  Company,
  CompanySummaryStats,
  CreateCompanyPayload,
  UpdateCompanyPayload,
  CompanyFilterQuery,
  CompanyStatus,
  ProductSummaryStats,
  ProductFilterQuery,
  CreateProductPayload,
  UpdateProductPayload,
  InventoryBatch,
  InventoryMovement,
  StockReceiptPayload,
  StockAdjustmentPayload,
  InventoryFilterQuery,
} from '../../types';

export interface ShopFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  shopType?: string;
  status?: string;
  city?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export const api = {
  companies: {
    async list(params: CompanyFilterQuery = {}): Promise<PaginatedResult<Company>> {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.search) query.set('search', params.search);
      if (params.companyType) query.set('companyType', params.companyType);
      if (params.status) query.set('status', params.status);
      if (params.city) query.set('city', params.city);
      if (params.sortBy) query.set('sortBy', params.sortBy);
      if (params.sortOrder) query.set('sortOrder', params.sortOrder);

      const qs = query.toString();
      return apiClient<PaginatedResult<Company>>(`companies${qs ? `?${qs}` : ''}`);
    },

    async getStats(): Promise<CompanySummaryStats> {
      return apiClient<CompanySummaryStats>('companies/stats');
    },

    async get(id: string): Promise<Company> {
      return apiClient<Company>(`companies/${id}`);
    },

    async create(payload: CreateCompanyPayload): Promise<Company> {
      return apiClient<Company>('companies', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async update(id: string, payload: UpdateCompanyPayload): Promise<Company> {
      return apiClient<Company>(`companies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },

    async updateStatus(id: string, status: CompanyStatus, reason?: string): Promise<Company> {
      return apiClient<Company>(`companies/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      });
    },

    async delete(id: string, reason?: string): Promise<{ success: boolean; message: string; softDeleted?: boolean }> {
      return apiClient<{ success: boolean; message: string; softDeleted?: boolean }>(`companies/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      });
    },
  },

  products: {
    async list(params: ProductFilterQuery = {}): Promise<PaginatedResult<Product>> {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.search) query.set('search', params.search);
      if (params.companyId) query.set('companyId', params.companyId);
      if (params.category) query.set('category', params.category);
      if (params.status) query.set('status', params.status);
      if (params.stockStatus) query.set('stockStatus', params.stockStatus);
      if (params.sortBy) query.set('sortBy', params.sortBy);
      if (params.sortOrder) query.set('sortOrder', params.sortOrder);

      const qs = query.toString();
      return apiClient<PaginatedResult<Product>>(`products${qs ? `?${qs}` : ''}`);
    },

    async getStats(): Promise<ProductSummaryStats> {
      return apiClient<ProductSummaryStats>('products/stats');
    },

    async get(id: string): Promise<Product & { batches: InventoryBatch[] }> {
      return apiClient<Product & { batches: InventoryBatch[] }>(`products/${id}`);
    },

    async create(payload: CreateProductPayload): Promise<Product> {
      return apiClient<Product>('products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async update(id: string, payload: UpdateProductPayload): Promise<Product> {
      return apiClient<Product>(`products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },

    async updateStatus(id: string, isActive: boolean, reason?: string): Promise<Product> {
      return apiClient<Product>(`products/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive, reason }),
      });
    },

    async delete(id: string, reason?: string): Promise<{ success: boolean; message: string; softDeleted?: boolean }> {
      return apiClient<{ success: boolean; message: string; softDeleted?: boolean }>(`products/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      });
    },
  },

  inventory: {
    async getMovements(params: InventoryFilterQuery = {}): Promise<PaginatedResult<InventoryMovement>> {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.productId) query.set('productId', params.productId);
      if (params.movementType) query.set('movementType', params.movementType);
      if (params.startDate) query.set('startDate', params.startDate);
      if (params.endDate) query.set('endDate', params.endDate);
      if (params.search) query.set('search', params.search);

      const qs = query.toString();
      return apiClient<PaginatedResult<InventoryMovement>>(`inventory/movements${qs ? `?${qs}` : ''}`);
    },

    async getProductBatches(productId: string): Promise<InventoryBatch[]> {
      return apiClient<InventoryBatch[]>(`inventory/products/${productId}/batches`);
    },

    async receiveStock(payload: StockReceiptPayload): Promise<{ product: Product; batch: InventoryBatch; movement: InventoryMovement }> {
      return apiClient<{ product: Product; batch: InventoryBatch; movement: InventoryMovement }>('inventory/receipts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async adjustStock(payload: StockAdjustmentPayload): Promise<{ product: Product; movement: InventoryMovement }> {
      return apiClient<{ product: Product; movement: InventoryMovement }>('inventory/adjustments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },
  auth: {
    async login(credentials: { email: string; password: string }): Promise<{ user: User; tokens: AuthTokens }> {
      const data = await apiClient<{ user: User; tokens: AuthTokens }>('auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
        requiresAuth: false,
      });
      if (data.tokens?.accessToken) {
        tokenStore.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      }
      return data;
    },

    async register(payload: {
      email: string;
      password: string;
      name: string;
      role: string;
      phone?: string;
    }): Promise<{ user: User; tokens: AuthTokens }> {
      const data = await apiClient<{ user: User; tokens: AuthTokens }>('auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
        requiresAuth: false,
      });
      if (data.tokens?.accessToken) {
        tokenStore.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      }
      return data;
    },

    async refresh(): Promise<{ user: User; tokens: AuthTokens }> {
      return apiClient<{ user: User; tokens: AuthTokens }>('auth/refresh', {
        method: 'POST',
        requiresAuth: false,
      });
    },

    async getMe(): Promise<User> {
      return apiClient<User>('auth/me');
    },

    async logout(): Promise<void> {
      try {
        await apiClient('auth/logout', { method: 'POST' });
      } finally {
        tokenStore.clear();
      }
    },
  },

  health: {
    async check(): Promise<{ status: string; healthy: boolean }> {
      return apiClient<{ status: string; healthy: boolean }>('health', { requiresAuth: false });
    },
  },

  shops: {
    async list(params: ShopFilterQuery = {}): Promise<PaginatedResult<Shop>> {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.search) query.set('search', params.search);
      if (params.shopType) query.set('shopType', params.shopType);
      if (params.status) query.set('status', params.status);
      if (params.city) query.set('city', params.city);
      if (params.sortBy) query.set('sortBy', params.sortBy);
      if (params.sortOrder) query.set('sortOrder', params.sortOrder);

      const qs = query.toString();
      return apiClient<PaginatedResult<Shop>>(`shops${qs ? `?${qs}` : ''}`);
    },

    async create(payload: any): Promise<ProvisionedShopResponse> {
      return apiClient<ProvisionedShopResponse>('shops', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async get(shopId: string): Promise<ShopDetailsResponse> {
      return apiClient<ShopDetailsResponse>(`shops/${shopId}`);
    },

    async update(shopId: string, payload: any): Promise<Shop> {
      return apiClient<Shop>(`shops/${shopId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },

    async updateStatus(shopId: string, status: 'ACTIVE' | 'INACTIVE', reason?: string): Promise<Shop> {
      return apiClient<Shop>(`shops/${shopId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      });
    },

    async delete(shopId: string, reason?: string): Promise<{ success: boolean; message: string; softDeleted?: boolean }> {
      return apiClient<{ success: boolean; message: string; softDeleted?: boolean }>(`shops/${shopId}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      });
    },

    async reissueCredentials(shopId: string): Promise<{
      shopId: string;
      temporaryPassword: string;
      mustChangePassword: true;
    }> {
      return apiClient<{ shopId: string; temporaryPassword: string; mustChangePassword: true }>(
        `shops/${shopId}/reissue-credentials`,
        { method: 'POST' }
      );
    },

    async resolveMapLink(mapUrl: string): Promise<{
      latitude: number;
      longitude: number;
      canonicalUrl?: string;
      source: string;
    }> {
      return apiClient<{ latitude: number; longitude: number; canonicalUrl?: string; source: string }>(
        'shops/resolve-map-link',
        {
          method: 'POST',
          body: JSON.stringify({ mapUrl }),
        }
      );
    },

    async getProducts(shopId: string): Promise<Product[]> {
      return apiClient<Product[]>(`shops/${shopId}/products`, { requiresAuth: false });
    },

    async getStats(shopId: string): Promise<any> {
      return apiClient<any>(`shops/${shopId}/stats`);
    },

    async getOrders(shopId: string): Promise<Order[]> {
      return apiClient<Order[]>(`shops/${shopId}/orders`);
    },

    async getInvoices(shopId: string): Promise<Invoice[]> {
      return apiClient<Invoice[]>(`shops/${shopId}/invoices`);
    },

    async getPayments(shopId: string): Promise<Payment[]> {
      return apiClient<Payment[]>(`shops/${shopId}/payments`);
    },

    async getDeliveries(shopId: string): Promise<Delivery[]> {
      return apiClient<Delivery[]>(`shops/${shopId}/deliveries`);
    },
  },

  deliveries: {
    async getAssigned(): Promise<Delivery[]> {
      return apiClient<Delivery[]>('deliveries/assigned');
    },

    async getDrivers(): Promise<DriverUser[]> {
      return apiClient<DriverUser[]>('deliveries/drivers');
    },

    async listAllDrivers(): Promise<DriverUser[]> {
      return apiClient<DriverUser[]>('deliveries/drivers/all');
    },

    async updateDriverStatus(driverId: string, isActive: boolean, reason?: string): Promise<{ success: boolean; message: string; is_active: boolean }> {
      return apiClient<{ success: boolean; message: string; is_active: boolean }>(`deliveries/drivers/${driverId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive, reason }),
      });
    },

    async deleteDriver(driverId: string, reason?: string): Promise<{ success: boolean; message: string; softDeleted?: boolean }> {
      return apiClient<{ success: boolean; message: string; softDeleted?: boolean }>(`deliveries/drivers/${driverId}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      });
    },

    async assignDriver(orderId: string, driverId: string): Promise<Delivery> {
      return apiClient<Delivery>('deliveries/assign', {
        method: 'POST',
        body: JSON.stringify({ orderId, driverId }),
      });
    },

    async updateStatus(deliveryId: string, status: string, lat?: number, lng?: number, notes?: string): Promise<Delivery> {
      return apiClient<Delivery>(`deliveries/${deliveryId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, currentLatitude: lat, currentLongitude: lng, notes }),
      });
    },
  },
};

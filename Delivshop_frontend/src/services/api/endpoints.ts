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
  },
  auth: {
    async login(credentials: { email: string; password: string }): Promise<{ user: User; tokens: AuthTokens }> {
      const data = await apiClient<{ user: User; tokens: AuthTokens }>('auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
        requiresAuth: false,
      });
      if (data.tokens?.accessToken) {
        tokenStore.set(data.tokens.accessToken);
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
        tokenStore.set(data.tokens.accessToken);
      }
      return data;
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

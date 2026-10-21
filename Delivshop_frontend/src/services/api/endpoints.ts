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
  DriverRosterSummary,
  DriverDeliveryRecord,
  DriverAuditRecord,
  CreateDriverPayload,
  UpdateDriverPayload,
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
  OrderVolumeSummaryResponse,
  OrderDispatchRecord,
  UnscheduledOrderRecord,
  OrderSchedulingAuditRecord,
  PickupRequirementsResponse,
  ShopOrderTrackingResponse,
  BulkReminderResponse,
  ReminderHistoryItem,
  CreateAdminOrderPayload,
  PickupRecord,
  SupplierBill,
  SupplierPayment,
  SupplierFinancialSummary,
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

    async getFinancialSummary(companyId: string): Promise<SupplierFinancialSummary> {
      return apiClient<SupplierFinancialSummary>(`companies/${companyId}/financial-summary`);
    },

    async listPickups(companyId: string, params: any = {}): Promise<PaginatedResult<PickupRecord>> {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.status) query.set('status', params.status);
      if (params.startDate) query.set('startDate', params.startDate);
      if (params.endDate) query.set('endDate', params.endDate);
      if (params.routeId) query.set('routeId', params.routeId);
      if (params.isBilled !== undefined) query.set('isBilled', String(params.isBilled));
      const qs = query.toString();
      return apiClient<PaginatedResult<PickupRecord>>(`companies/${companyId}/pickups${qs ? `?${qs}` : ''}`);
    },

    async verifyPickup(companyId: string, pickupId: string, payload: any): Promise<PickupRecord> {
      return apiClient<PickupRecord>(`companies/${companyId}/pickups/${pickupId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },

    async listBills(companyId: string, params: any = {}): Promise<PaginatedResult<SupplierBill>> {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.status) query.set('status', params.status);
      if (params.paymentStatus) query.set('paymentStatus', params.paymentStatus);
      if (params.startDate) query.set('startDate', params.startDate);
      if (params.endDate) query.set('endDate', params.endDate);
      const qs = query.toString();
      return apiClient<PaginatedResult<SupplierBill>>(`companies/${companyId}/bills${qs ? `?${qs}` : ''}`);
    },

    async getBill(companyId: string, billId: string): Promise<SupplierBill> {
      return apiClient<SupplierBill>(`companies/${companyId}/bills/${billId}`);
    },

    async generateBill(companyId: string, payload: any): Promise<SupplierBill> {
      return apiClient<SupplierBill>(`companies/${companyId}/bills/generate`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async recordPayment(companyId: string, billId: string, payload: any): Promise<{ payment: SupplierPayment; bill: SupplierBill }> {
      return apiClient<{ payment: SupplierPayment; bill: SupplierBill }>(`companies/${companyId}/bills/${billId}/payments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async downloadPickupSummaryPdf(companyId: string, pickupId: string, pickupReference = 'pickup'): Promise<void> {
      const token = tokenStore.getAccessToken();
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const url = `${apiUrl.replace(/\/+$/, '')}/companies/${companyId}/pickups/${pickupId}/summary-pdf`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error(`Failed to generate Pickup Summary PDF (${res.status} ${res.statusText})`);
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `pickup_summary_${pickupReference}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    },

    async downloadSupplierBillPdf(companyId: string, billId: string, billNumber = 'bill'): Promise<void> {
      const token = tokenStore.getAccessToken();
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const url = `${apiUrl.replace(/\/+$/, '')}/companies/${companyId}/bills/${billId}/pdf`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error(`Failed to generate Supplier Bill PDF (${res.status} ${res.statusText})`);
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `supplier_bill_${billNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
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

    async listAllDrivers(params?: {
      search?: string;
      status?: string;
      vehicle?: string;
      sortBy?: string;
      sortOrder?: string;
      page?: number;
      limit?: number;
    }): Promise<any> {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.status) query.set('status', params.status);
      if (params?.vehicle) query.set('vehicle', params.vehicle);
      if (params?.sortBy) query.set('sortBy', params.sortBy);
      if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
      if (typeof params?.page === 'number') query.set('page', String(params.page));
      if (typeof params?.limit === 'number') query.set('limit', String(params.limit));

      const qs = query.toString();
      return apiClient<any>(`deliveries/drivers/all${qs ? `?${qs}` : ''}`);
    },

    async getRosterSummary(): Promise<DriverRosterSummary> {
      return apiClient<DriverRosterSummary>('deliveries/drivers/summary');
    },

    async getDriver(driverId: string): Promise<{
      driver: DriverUser;
      deliveries: DriverDeliveryRecord[];
      auditHistory: DriverAuditRecord[];
    }> {
      return apiClient<{
        driver: DriverUser;
        deliveries: DriverDeliveryRecord[];
        auditHistory: DriverAuditRecord[];
      }>(`deliveries/drivers/${driverId}`);
    },

    async generateEmployeeId(): Promise<{ employeeId: string }> {
      return apiClient<{ employeeId: string }>('deliveries/drivers/generate-employee-id');
    },

    async createDriver(payload: CreateDriverPayload): Promise<DriverUser> {
      return apiClient<DriverUser>('deliveries/drivers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async updateDriver(driverId: string, payload: UpdateDriverPayload): Promise<DriverUser> {
      return apiClient<DriverUser>(`deliveries/drivers/${driverId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    async resetDriverPassword(driverId: string, password: string): Promise<{ message: string }> {
      return apiClient<{ message: string }>(`deliveries/drivers/${driverId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
    },

    async getDriverDeliveries(driverId: string): Promise<DriverDeliveryRecord[]> {
      return apiClient<DriverDeliveryRecord[]>(`deliveries/drivers/${driverId}/deliveries`);
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

    async getFullProfile(driverId: string): Promise<any> {
      return apiClient<any>(`deliveries/drivers/${driverId}/profile`);
    },

    async getSalaryConfig(driverId: string, month?: string): Promise<any> {
      const q = month ? `?month=${encodeURIComponent(month)}` : '';
      return apiClient<any>(`deliveries/drivers/${driverId}/salary${q}`);
    },

    async setMonthlySalary(driverId: string, payload: {
      monthlySalary: number;
      effectiveFrom: string;
      salaryType?: string;
      notes?: string;
    }): Promise<any> {
      return apiClient<any>(`deliveries/drivers/${driverId}/salary`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    async upsertSalaryConfig(driverId: string, payload: any): Promise<any> {
      return this.setMonthlySalary(driverId, payload);
    },

    async getSalaryPayments(driverId: string, month?: string): Promise<{ monthsSummary: any[]; payments: any[] }> {
      const q = month ? `?month=${encodeURIComponent(month)}` : '';
      return apiClient<{ monthsSummary: any[]; payments: any[] }>(`deliveries/drivers/${driverId}/salary/payments${q}`);
    },

    async recordSalaryPayment(driverId: string, payload: {
      salaryMonth: string;
      paymentDate: string;
      amount: number;
      paymentMethod: string;
      transactionReference?: string;
      notes?: string;
    }): Promise<any> {
      return apiClient<any>(`deliveries/drivers/${driverId}/salary/payments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async reverseSalaryPayment(driverId: string, paymentId: string, reason: string): Promise<any> {
      return apiClient<any>(`deliveries/drivers/${driverId}/salary/payments/${paymentId}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },

    async getPayrollRecords(driverId: string): Promise<any[]> {
      return apiClient<any[]>(`deliveries/drivers/${driverId}/payroll`);
    },

    async addPayrollRecord(driverId: string, payload: any): Promise<any> {
      return apiClient<any>(`deliveries/drivers/${driverId}/payroll`, {
        method: 'POST',
        body: JSON.stringify(payload),
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

  vehicles: {
    async list(params?: {
      search?: string;
      status?: string;
      vehicleType?: string;
      depot?: string;
      city?: string;
      sortBy?: string;
      sortOrder?: string;
      page?: number;
      limit?: number;
    }): Promise<{ data: any[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.status) query.set('status', params.status);
      if (params?.vehicleType) query.set('vehicleType', params.vehicleType);
      if (params?.depot) query.set('depot', params.depot);
      if (params?.city) query.set('city', params.city);
      if (params?.sortBy) query.set('sortBy', params.sortBy);
      if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));

      const qs = query.toString();
      return apiClient<any>(`vehicles${qs ? `?${qs}` : ''}`);
    },

    async getSummary(): Promise<any> {
      return apiClient<any>('vehicles/summary');
    },

    async get(id: string): Promise<any> {
      return apiClient<any>(`vehicles/${id}`);
    },

    async create(payload: any): Promise<any> {
      return apiClient<any>('vehicles', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async update(id: string, payload: any): Promise<any> {
      return apiClient<any>(`vehicles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },

    async updateStatus(id: string, status: string, notes?: string): Promise<any> {
      return apiClient<any>(`vehicles/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes }),
      });
    },

    async delete(id: string, reason?: string): Promise<{ success: boolean; message: string; softDeleted?: boolean }> {
      return apiClient<{ success: boolean; message: string; softDeleted?: boolean }>(`vehicles/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      });
    },

    async getDispatchEligibility(id: string, options?: { targetDate?: string; requiresRefrigeration?: boolean; excludeRunId?: string }): Promise<any> {
      const query = new URLSearchParams();
      if (options?.targetDate) query.set('targetDate', options.targetDate);
      if (options?.requiresRefrigeration !== undefined) query.set('requiresRefrigeration', String(options.requiresRefrigeration));
      if (options?.excludeRunId) query.set('excludeRunId', options.excludeRunId);
      const qs = query.toString();
      return apiClient<any>(`vehicles/${id}/dispatch-eligibility${qs ? `?${qs}` : ''}`);
    },

    async getActivity(id: string): Promise<any> {
      return apiClient<any>(`vehicles/${id}/activity`);
    },

    async addMaintenance(id: string, payload: any): Promise<any> {
      return apiClient<any>(`vehicles/${id}/maintenance`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },

  routes: {
    async list(params?: {
      search?: string;
      status?: string;
      city?: string;
      depot?: string;
      sortBy?: string;
      sortOrder?: string;
    }, options?: any): Promise<any[]> {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.status) query.set('status', params.status);
      if (params?.city) query.set('city', params.city);
      if (params?.depot) query.set('depot', params.depot);
      if (params?.sortBy) query.set('sortBy', params.sortBy);
      if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

      const qs = query.toString();
      return apiClient<any[]>(`routes${qs ? `?${qs}` : ''}`, options);
    },

    async getSummary(options?: any): Promise<any> {
      return apiClient<any>('routes/summary', options);
    },

    async get(id: string): Promise<any> {
      return apiClient<any>(`routes/${id}`);
    },

    async create(payload: any): Promise<any> {
      return apiClient<any>('routes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async update(id: string, payload: any): Promise<any> {
      return apiClient<any>(`routes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },

    async publish(id: string): Promise<any> {
      return apiClient<any>(`routes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });
    },

    async updateStops(id: string, stops: any[], changesSummary?: string): Promise<any> {
      return apiClient<any>(`routes/${id}/stops`, {
        method: 'PUT',
        body: JSON.stringify({ stops, changesSummary }),
      });
    },

    async delete(id: string, reason?: string): Promise<any> {
      return apiClient<any>(`routes/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      });
    },

    async getPickupRequirements(id: string, date?: string): Promise<PickupRequirementsResponse> {
      const qs = date ? `?date=${encodeURIComponent(date)}` : '';
      return apiClient<PickupRequirementsResponse>(`routes/${id}/pickup-requirements${qs}`);
    },

    async recalculateDistance(id: string): Promise<any> {
      return apiClient<any>(`routes/${id}/recalculate-distance`, {
        method: 'POST',
      });
    },

    async getRoutingMetrics(): Promise<any> {
      return apiClient<any>(`routes/routing/metrics`);
    },
  },

  assignments: {
    async list(params?: {
      search?: string;
      deliveryDate?: string;
      status?: string;
      driverId?: string;
      vehicleId?: string;
      routeId?: string;
      city?: string;
      sortBy?: string;
      sortOrder?: string;
    }): Promise<any[]> {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.deliveryDate) query.set('deliveryDate', params.deliveryDate);
      if (params?.status) query.set('status', params.status);
      if (params?.driverId) query.set('driverId', params.driverId);
      if (params?.vehicleId) query.set('vehicleId', params.vehicleId);
      if (params?.routeId) query.set('routeId', params.routeId);
      if (params?.city) query.set('city', params.city);
      if (params?.sortBy) query.set('sortBy', params.sortBy);
      if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

      const qs = query.toString();
      return apiClient<any[]>(`assignments${qs ? `?${qs}` : ''}`);
    },

    async getSummary(date?: string): Promise<any> {
      const query = date ? `?date=${encodeURIComponent(date)}` : '';
      return apiClient<any>(`assignments/summary${query}`);
    },

    async validate(payload: {
      driverId: string;
      vehicleId: string;
      routeId: string;
      deliveryDate: string;
      excludeRunId?: string;
    }): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
      return apiClient<{ isValid: boolean; errors: string[]; warnings: string[] }>('assignments/validate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async get(id: string): Promise<any> {
      return apiClient<any>(`assignments/${id}`);
    },

    async getPickupRequirements(id: string): Promise<PickupRequirementsResponse> {
      return apiClient<PickupRequirementsResponse>(`assignments/${id}/pickup-requirements`);
    },

    async create(payload: any): Promise<any> {
      return apiClient<any>('assignments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async updateStatus(id: string, status: string, notes?: string): Promise<any> {
      return apiClient<any>(`assignments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes }),
      });
    },

    async updateStopStatus(runId: string, sequence: number, payload: any): Promise<any> {
      return apiClient<any>(`assignments/${runId}/stops/${sequence}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },

    async getDependencies(id: string): Promise<any> {
      return apiClient<any>(`assignments/${id}/dependencies`);
    },

    async delete(
      id: string,
      options?: {
        reason?: string;
        actionType?: 'DELETE' | 'ARCHIVE' | 'CANCEL';
      }
    ): Promise<any> {
      return apiClient<any>(`assignments/${id}`, {
        method: 'DELETE',
        body: JSON.stringify(options || {}),
      });
    },

    async publishRun(id: string): Promise<any> {
      return apiClient<any>(`assignments/${id}/publish`, {
        method: 'POST',
      });
    },

    async getSchedulingSettings(): Promise<any> {
      return apiClient<any>('assignments/scheduling-settings');
    },

    async updateSchedulingSettings(payload: any): Promise<any> {
      return apiClient<any>('assignments/scheduling-settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
  },

  orders: {
    async list(params: {
      status?: string;
      search?: string;
      shopId?: string;
      driverId?: string;
      routeId?: string;
      date?: string;
      page?: number;
      limit?: number;
    } = {}): Promise<{ orders: OrderDispatchRecord[]; total: number; page: number; limit: number }> {
      const query = new URLSearchParams();
      if (params.status) query.set('status', params.status);
      if (params.search) query.set('search', params.search);
      if (params.shopId) query.set('shopId', params.shopId);
      if (params.driverId) query.set('driverId', params.driverId);
      if (params.routeId) query.set('routeId', params.routeId);
      if (params.date) query.set('date', params.date);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));

      const qs = query.toString();
      return apiClient<{ orders: OrderDispatchRecord[]; total: number; page: number; limit: number }>(`orders${qs ? `?${qs}` : ''}`);
    },

    async listUnscheduled(params: {
      search?: string;
      routeId?: string;
      requestedDate?: string;
    } = {}): Promise<{ orders: UnscheduledOrderRecord[]; count: number }> {
      const query = new URLSearchParams();
      if (params.search) query.set('search', params.search);
      if (params.routeId) query.set('routeId', params.routeId);
      if (params.requestedDate) query.set('requestedDate', params.requestedDate);
      const qs = query.toString();
      return apiClient<{ orders: UnscheduledOrderRecord[]; count: number }>(`orders/unscheduled${qs ? `?${qs}` : ''}`);
    },

    async assignRoute(orderId: string, routeId: string): Promise<any> {
      return apiClient<any>(`orders/${orderId}/assign-route`, {
        method: 'POST',
        body: JSON.stringify({ routeId }),
      });
    },

    async schedule(
      orderId: string,
      payload: {
        deliveryRunId: string;
        deliveryWindow?: string;
        notes?: string;
      }
    ): Promise<any> {
      return apiClient<any>(`orders/${orderId}/schedule`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async reschedule(
      orderId: string,
      payload: {
        deliveryRunId: string;
        deliveryWindow?: string;
        reason: string;
      }
    ): Promise<any> {
      return apiClient<any>(`orders/${orderId}/reschedule`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async getSchedulingHistory(orderId: string): Promise<OrderSchedulingAuditRecord[]> {
      return apiClient<OrderSchedulingAuditRecord[]>(`orders/${orderId}/scheduling-history`);
    },

    async get(orderId: string): Promise<any> {
      return apiClient<any>(`orders/${orderId}`);
    },

    async getVolumeSummary(params: {
      status?: string;
      deliveryDate?: string;
      date?: string;
      shopId?: string;
      productId?: string;
      packagingSize?: string;
    } = {}): Promise<OrderVolumeSummaryResponse> {
      const query = new URLSearchParams();
      if (params.status) query.set('status', params.status);
      if (params.deliveryDate) query.set('deliveryDate', params.deliveryDate);
      if (params.date) query.set('date', params.date);
      if (params.shopId) query.set('shopId', params.shopId);
      if (params.productId) query.set('productId', params.productId);
      if (params.packagingSize) query.set('packagingSize', params.packagingSize);

      const qs = query.toString();
      return apiClient<OrderVolumeSummaryResponse>(`orders/volume-summary${qs ? `?${qs}` : ''}`);
    },

    async exportVolumeSummary(params: {
      status?: string;
      deliveryDate?: string;
      date?: string;
      shopId?: string;
      productId?: string;
      packagingSize?: string;
    } = {}): Promise<string> {
      const query = new URLSearchParams();
      if (params.status) query.set('status', params.status);
      if (params.deliveryDate) query.set('deliveryDate', params.deliveryDate);
      if (params.date) query.set('date', params.date);
      if (params.shopId) query.set('shopId', params.shopId);
      if (params.productId) query.set('productId', params.productId);
      if (params.packagingSize) query.set('packagingSize', params.packagingSize);

      const qs = query.toString();
      const token = tokenStore.get();
      const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
      const url = `${API_BASE_URL.replace(/\/$/, '')}/orders/volume-summary/export${qs ? `?${qs}` : ''}`;

      const res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to export summary: ${res.statusText}`);
      }
      return res.text();
    },

    async updateStatus(orderId: string, status: string, notes?: string): Promise<any> {
      return apiClient<any>(`orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes }),
      });
    },

    async create(payload: CreateAdminOrderPayload): Promise<any> {
      return apiClient<any>('orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async getShopOrderTracking(params: {
      date?: string;
      search?: string;
      orderStatus?: string;
      reminderStatus?: string;
      page?: number;
      limit?: number;
    } = {}): Promise<ShopOrderTrackingResponse> {
      const query = new URLSearchParams();
      if (params.date) query.set('date', params.date);
      if (params.search) query.set('search', params.search);
      if (params.orderStatus) query.set('orderStatus', params.orderStatus);
      if (params.reminderStatus) query.set('reminderStatus', params.reminderStatus);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));

      const qs = query.toString();
      return apiClient<ShopOrderTrackingResponse>(`orders/shop-tracking${qs ? `?${qs}` : ''}`);
    },

    async sendShopReminder(
      shopId: string,
      payload: {
        reportingDate: string;
        reminderType?: string;
        customMessage?: string;
        idempotencyKey?: string;
      }
    ): Promise<any> {
      return apiClient<any>(`orders/reminders/shop/${shopId}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async sendBulkReminders(payload: {
      shopIds: string[];
      reportingDate: string;
      reminderType?: string;
      customMessage?: string;
    }): Promise<BulkReminderResponse> {
      return apiClient<BulkReminderResponse>('orders/reminders/send', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async getReminderHistory(shopId: string, limit?: number): Promise<ReminderHistoryItem[]> {
      const qs = limit ? `?limit=${limit}` : '';
      return apiClient<ReminderHistoryItem[]>(`orders/reminders/history/${shopId}${qs}`);
    },
  },
};

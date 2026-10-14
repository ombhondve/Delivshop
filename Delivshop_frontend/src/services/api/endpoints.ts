import { apiClient, tokenStore } from './client';
import { User, Shop, Product, Order, Delivery, AuthTokens } from '../../types';

export const api = {
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

    async register(payload: { email: string; password: string; name: string; role: string; phone?: string }): Promise<{ user: User; tokens: AuthTokens }> {
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
    async get(shopId: string): Promise<Shop> {
      return apiClient<Shop>(`shops/${shopId}`, { requiresAuth: false });
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
  },

  deliveries: {
    async getAssigned(): Promise<Delivery[]> {
      return apiClient<Delivery[]>('deliveries/assigned');
    },
    async updateStatus(deliveryId: string, status: string): Promise<Delivery> {
      return apiClient<Delivery>(`deliveries/${deliveryId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
  },
};

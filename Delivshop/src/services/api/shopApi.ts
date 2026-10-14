import { apiClient } from './client';
import { Shop, ShopStats } from '@/types/shop';
import { Product } from '@/types/product';
import { Order, OrderStatus } from '@/types/order';

export const shopApi = {
  async getShopDetails(shopId: string): Promise<Shop> {
    return apiClient<Shop>(`shops/${shopId}`);
  },

  async getShopStats(shopId: string): Promise<ShopStats> {
    return apiClient<ShopStats>(`shops/${shopId}/stats`);
  },

  async getMyProfile(): Promise<any> {
    return apiClient<any>('shop/me');
  },

  async getMyOrders(): Promise<Order[]> {
    return apiClient<Order[]>('shop/orders');
  },

  async getMyInvoices(): Promise<any[]> {
    return apiClient<any[]>('shop/invoices');
  },

  async getMyPayments(): Promise<any[]> {
    return apiClient<any[]>('shop/payments');
  },

  async getMyDeliveries(): Promise<any[]> {
    return apiClient<any[]>('shop/deliveries');
  },

  async getProducts(shopId: string): Promise<Product[]> {
    return apiClient<Product[]>(`shops/${shopId}/products`);
  },

  async getOrders(shopId: string): Promise<Order[]> {
    return apiClient<Order[]>(`shops/${shopId}/orders`);
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    return apiClient<Order>(`orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

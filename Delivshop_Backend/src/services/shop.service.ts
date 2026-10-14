import { shopRepository } from '../repositories/shop.repository.js';
import { orderRepository } from '../repositories/order.repository.js';

export const shopService = {
  async getShop(shopId: string) {
    const shop = await shopRepository.findById(shopId);
    if (!shop) throw new Error('Shop not found');
    return shop;
  },

  async getProducts(shopId: string) {
    return shopRepository.listProducts(shopId);
  },

  async getStats(shopId: string) {
    const orders = await orderRepository.findByShopId(shopId);
    const todayRevenue = orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    return {
      totalOrders: orders.length,
      todayRevenue,
      activeProducts: (await shopRepository.listProducts(shopId)).length,
    };
  },
};

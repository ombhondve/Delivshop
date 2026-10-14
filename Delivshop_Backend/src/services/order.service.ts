import { orderRepository } from '../repositories/order.repository.js';
import { auditService } from './audit.service.js';

export const orderService = {
  async getOrder(orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new Error('Order not found');
    return order;
  },

  async getShopOrders(shopId: string) {
    return orderRepository.findByShopId(shopId);
  },

  async updateStatus(orderId: string, status: string, actorId: string, ipAddress?: string) {
    const updated = await orderRepository.updateStatus(orderId, status);
    if (!updated) throw new Error('Order not found or update failed');

    await auditService.log({
      actorId,
      action: 'ORDER_STATUS_UPDATED',
      entityType: 'order',
      entityId: orderId,
      details: { status },
      ipAddress,
    });

    return updated;
  },
};

import { orderRepository } from '../repositories/order.repository.js';
import { auditService } from './audit.service.js';
import { AppError } from '../utils/errors.js';

export const orderService = {
  async getOrder(orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new AppError('Order not found', 404);
    return order;
  },

  async getShopOrders(shopId: string) {
    return orderRepository.findByShopId(shopId);
  },

  async createOrder(
    data: {
      shopId: string;
      items: Array<{ productId: string; quantity: number }>;
      deliveryAddress: any;
      idempotencyKey?: string;
    },
    userId: string,
    ipAddress?: string
  ) {
    const order = await orderRepository.createOrder({
      shopId: data.shopId,
      userId,
      items: data.items,
      deliveryAddress: data.deliveryAddress,
      idempotencyKey: data.idempotencyKey,
    });

    if (!order.isDuplicateReplay) {
      await auditService.log({
        actorId: userId,
        action: 'ORDER_CREATED',
        entityType: 'order',
        entityId: order.id,
        details: {
          orderNumber: order.order_number,
          itemCount: data.items.length,
          total: order.total,
          idempotencyKey: data.idempotencyKey,
        },
        ipAddress,
      });
    }

    return order;
  },

  async updateStatus(orderId: string, status: string, actorId: string, ipAddress?: string) {
    const updated = await orderRepository.updateStatus(orderId, status);
    if (!updated) throw new AppError('Order not found or update failed', 404);

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

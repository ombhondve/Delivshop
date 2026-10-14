import { deliveryRepository } from '../repositories/delivery.repository.js';
import { auditService } from './audit.service.js';

export const deliveryService = {
  async getDelivery(deliveryId: string) {
    const delivery = await deliveryRepository.findById(deliveryId);
    if (!delivery) throw new Error('Delivery not found');
    return delivery;
  },

  async getAssignedDeliveries(driverId: string) {
    return deliveryRepository.findAssignedToDriver(driverId);
  },

  async updateStatus(
    deliveryId: string,
    status: string,
    driverId: string,
    lat?: number,
    lng?: number,
    notes?: string,
    ipAddress?: string
  ) {
    const updated = await deliveryRepository.updateStatus(deliveryId, status, lat, lng, notes);
    if (!updated) throw new Error('Delivery not found or status update failed');

    await auditService.log({
      actorId: driverId,
      action: 'DELIVERY_STATUS_UPDATED',
      entityType: 'delivery',
      entityId: deliveryId,
      details: { status, lat, lng },
      ipAddress,
    });

    return updated;
  },

  async assignDriver(
    orderId: string,
    driverId: string,
    actorId?: string,
    ipAddress?: string
  ) {
    const assigned = await deliveryRepository.assignDriverToOrder(orderId, driverId);

    await auditService.log({
      actorId,
      action: 'ORDER_DRIVER_ASSIGNED',
      entityType: 'order',
      entityId: orderId,
      details: { driverId, deliveryId: assigned.id },
      ipAddress,
    });

    return assigned;
  },

  async listDrivers() {
    return deliveryRepository.listAvailableDrivers();
  },
};

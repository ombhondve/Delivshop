import { deliveryRepository } from '../repositories/delivery.repository.js';
import { auditService } from './audit.service.js';
import { AppError } from '../utils/errors.js';

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

  async listAllDrivers() {
    return deliveryRepository.listAllDrivers();
  },

  async updateDriverStatus(driverId: string, isActive: boolean, actorId?: string, ipAddress?: string) {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    const updated = await deliveryRepository.updateDriverStatus(driverId, isActive);

    await auditService.log({
      actorId,
      action: 'DRIVER_STATUS_UPDATED',
      entityType: 'user',
      entityId: driverId,
      details: { fromStatus: driver.is_active, toStatus: isActive },
      ipAddress,
    });

    return updated;
  },

  async deleteDriver(
    driverId: string,
    actorId?: string,
    ipAddress?: string,
    reason?: string
  ): Promise<{ message: string; softDeleted: boolean; driver: { id: string; name: string } }> {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    // CORE BUSINESS RULE: Driver MUST be deactivated before deletion is permitted!
    if (driver.is_active) {
      throw new AppError(
        'Driver must be deactivated before they can be deleted. Please deactivate this driver first.',
        400
      );
    }

    // Dependency check: Cannot delete driver assigned to active deliveries
    const deps = await deliveryRepository.checkDriverDependencies(driverId);
    if (deps.activeDeliveriesCount > 0) {
      throw new AppError(
        `Cannot delete driver because they are currently assigned to ${deps.activeDeliveriesCount} active delivery task(s). Reassign or complete those deliveries first.`,
        400
      );
    }

    // Perform deletion / archival
    const { softDeleted } = await deliveryRepository.deleteDriver(driverId, actorId, reason);

    await auditService.log({
      actorId,
      action: 'DRIVER_DELETED',
      entityType: 'user',
      entityId: driverId,
      details: {
        driverName: driver.name,
        softDeleted,
        reason: reason || 'Administrative deactivation-first deletion',
        historicalDeliveriesPreserved: deps.historicalDeliveriesCount,
      },
      ipAddress,
    });

    return {
      message: softDeleted
        ? 'Driver successfully archived. Historical delivery attribution records have been preserved.'
        : 'Driver permanently deleted.',
      softDeleted,
      driver: {
        id: driver.id,
        name: driver.name,
      },
    };
  },
};

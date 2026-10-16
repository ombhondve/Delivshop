import { deliveryRepository } from '../repositories/delivery.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { auditService } from './audit.service.js';
import { AppError } from '../utils/errors.js';
import { hashPassword } from '../utils/password.js';

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
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }
    if (!driver.is_active) {
      throw new AppError('Cannot assign inactive driver to delivery order', 400);
    }

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

  async listAllDrivers(params?: {
    search?: string;
    status?: string;
    vehicle?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) {
    return deliveryRepository.listAllDrivers(params);
  },

  async getRosterSummary() {
    return deliveryRepository.getRosterSummary();
  },

  async getDriver(driverId: string) {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    const [deliveries, auditHistory] = await Promise.all([
      deliveryRepository.getDriverDeliveries(driverId),
      deliveryRepository.getDriverAuditHistory(driverId),
    ]);

    return {
      driver,
      deliveries,
      auditHistory,
    };
  },

  async getDriverDeliveries(driverId: string) {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }
    return deliveryRepository.getDriverDeliveries(driverId);
  },

  async createDriver(
    data: {
      name: string;
      email?: string;
      phone: string;
      employeeId?: string;
      password?: string;
      vehicleNumber?: string;
      vehicleType?: string;
      assignedRoute?: string;
      licenseNumber?: string;
      licenseExpiry?: string;
      joiningDate?: string;
      emergencyContact?: string;
      notes?: string;
    },
    actorId?: string,
    ipAddress?: string
  ) {
    // 1. Employee ID formatting and uniqueness check
    let empId = data.employeeId?.trim().toUpperCase();
    if (!empId) {
      const stamp = Date.now().toString().slice(-4);
      empId = `EMP-DRV-${stamp}`;
    }

    const existingEmp = await userRepository.findByEmployeeId(empId);
    if (existingEmp) {
      throw new AppError(`A driver with Employee ID "${empId}" already exists.`, 409);
    }

    // 2. Email format / fallback
    const targetEmail = data.email?.trim().toLowerCase() || `${empId.toLowerCase()}@delivshop.internal`;
    const existingEmail = await userRepository.findByEmail(targetEmail);
    if (existingEmail) {
      throw new AppError(`An account with email "${targetEmail}" already exists.`, 409);
    }

    // 3. Password handling
    const rawPassword = data.password || 'Driver@12345';
    const passwordHash = await hashPassword(rawPassword);

    const created = await deliveryRepository.createDriver({
      name: data.name,
      email: targetEmail,
      phone: data.phone,
      employeeId: empId,
      passwordHash,
      vehicleNumber: data.vehicleNumber,
      vehicleType: data.vehicleType,
      assignedRoute: data.assignedRoute,
      licenseNumber: data.licenseNumber,
      licenseExpiry: data.licenseExpiry,
      joiningDate: data.joiningDate,
      emergencyContact: data.emergencyContact,
      notes: data.notes,
    });

    await auditService.log({
      actorId,
      action: 'DRIVER_CREATED',
      entityType: 'user',
      entityId: created.id,
      details: {
        driverName: created.name,
        employeeId: created.employee_id,
        vehicleNumber: created.vehicle_number,
        assignedRoute: created.assigned_route,
      },
      ipAddress,
    });

    return created;
  },

  async updateDriver(
    driverId: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      employeeId?: string;
      vehicleNumber?: string;
      vehicleType?: string;
      assignedRoute?: string;
      licenseNumber?: string;
      licenseExpiry?: string;
      joiningDate?: string;
      emergencyContact?: string;
      notes?: string;
    },
    actorId?: string,
    ipAddress?: string
  ) {
    const existing = await deliveryRepository.findDriverById(driverId);
    if (!existing) {
      throw new AppError('Driver not found', 404);
    }

    if (data.employeeId && data.employeeId.toUpperCase() !== existing.employee_id?.toUpperCase()) {
      const empConflict = await userRepository.findByEmployeeId(data.employeeId);
      if (empConflict && empConflict.id !== driverId) {
        throw new AppError(`Employee ID "${data.employeeId}" is already taken by another driver.`, 409);
      }
    }

    if (data.email && data.email.toLowerCase() !== existing.email?.toLowerCase()) {
      const emailConflict = await userRepository.findByEmail(data.email);
      if (emailConflict && emailConflict.id !== driverId) {
        throw new AppError(`Email "${data.email}" is already in use by another user account.`, 409);
      }
    }

    const payload: any = { ...data };
    if (data.employeeId) payload.employee_id = data.employeeId.toUpperCase();
    if (data.vehicleNumber !== undefined) payload.vehicle_number = data.vehicleNumber?.toUpperCase() || null;
    if (data.vehicleType !== undefined) payload.vehicle_type = data.vehicleType || null;
    if (data.assignedRoute !== undefined) payload.assigned_route = data.assignedRoute || null;
    if (data.licenseNumber !== undefined) payload.license_number = data.licenseNumber || null;
    if (data.licenseExpiry !== undefined) payload.license_expiry = data.licenseExpiry || null;
    if (data.joiningDate !== undefined) payload.joining_date = data.joiningDate || null;
    if (data.emergencyContact !== undefined) payload.emergency_contact = data.emergencyContact || null;
    delete payload.employeeId;
    delete payload.vehicleNumber;
    delete payload.vehicleType;
    delete payload.assignedRoute;
    delete payload.licenseNumber;
    delete payload.licenseExpiry;
    delete payload.joiningDate;
    delete payload.emergencyContact;

    const updated = await deliveryRepository.updateDriver(driverId, payload);

    await auditService.log({
      actorId,
      action: 'DRIVER_UPDATED',
      entityType: 'user',
      entityId: driverId,
      details: {
        updatedFields: Object.keys(data),
      },
      ipAddress,
    });

    return updated;
  },

  async assignVehicle(
    driverId: string,
    data: {
      vehicleNumber: string;
      vehicleType?: string;
      assignedRoute?: string;
    },
    actorId?: string,
    ipAddress?: string
  ) {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    const updated = await deliveryRepository.updateDriver(driverId, {
      vehicle_number: data.vehicleNumber.trim().toUpperCase(),
      vehicle_type: data.vehicleType?.trim() || null,
      assigned_route: data.assignedRoute?.trim() || null,
    });

    await auditService.log({
      actorId,
      action: 'DRIVER_VEHICLE_ASSIGNED',
      entityType: 'user',
      entityId: driverId,
      details: {
        driverName: driver.name,
        vehicleNumber: data.vehicleNumber,
        assignedRoute: data.assignedRoute,
      },
      ipAddress,
    });

    return updated;
  },

  async resetDriverPassword(
    driverId: string,
    newPassword: string,
    actorId?: string,
    ipAddress?: string
  ) {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    if (!newPassword || newPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters in length', 400);
    }

    const passwordHash = await hashPassword(newPassword);
    await deliveryRepository.resetDriverPassword(driverId, passwordHash);

    await auditService.log({
      actorId,
      action: 'DRIVER_PASSWORD_RESET',
      entityType: 'user',
      entityId: driverId,
      details: {
        driverName: driver.name,
        employeeId: driver.employee_id,
      },
      ipAddress,
    });

    return { message: 'Driver password reset successfully' };
  },

  async updateDriverStatus(driverId: string, isActive: boolean, actorId?: string, ipAddress?: string) {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    // Safety rule: Cannot deactivate driver while on active delivery run
    if (!isActive) {
      const deps = await deliveryRepository.checkDriverDependencies(driverId);
      if (deps.activeDeliveriesCount > 0) {
        throw new AppError(
          `Cannot deactivate driver while they are assigned to ${deps.activeDeliveriesCount} active delivery task(s). Complete or reassign those deliveries first.`,
          400
        );
      }
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

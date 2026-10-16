import { vehicleRepository, VehicleRecord } from '../repositories/vehicle.repository.js';
import { auditService } from './audit.service.js';
import { AppError } from '../utils/errors.js';

export const vehicleService = {
  async listVehicles(params?: {
    search?: string;
    status?: string;
    vehicleType?: string;
    city?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<VehicleRecord[]> {
    return vehicleRepository.listAll(params);
  },

  async getSummary(): Promise<any> {
    return vehicleRepository.getSummary();
  },

  async getVehicleDetails(id: string): Promise<any> {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    const [documents, maintenance, assignments] = await Promise.all([
      vehicleRepository.getDocuments(id),
      vehicleRepository.getMaintenanceRecords(id),
      vehicleRepository.getAssignmentHistory(id),
    ]);

    return {
      ...vehicle,
      documents,
      maintenance,
      assignments,
    };
  },

  async createVehicle(data: any, actorId?: string, ipAddress?: string): Promise<VehicleRecord> {
    const existing = await vehicleRepository.findByRegistration(data.registrationNumber);
    if (existing) {
      throw new AppError(`A vehicle with registration number "${data.registrationNumber}" is already registered.`, 409);
    }

    const vehicle = await vehicleRepository.create(data);

    await auditService.log({
      actorId: actorId || undefined,
      action: 'VEHICLE_CREATED',
      entityType: 'VEHICLE',
      entityId: vehicle.id,
      details: {
        registrationNumber: vehicle.registration_number,
        vehicleCode: vehicle.vehicle_code,
        vehicleType: vehicle.vehicle_type,
        depot: vehicle.depot,
      },
      ipAddress,
    });

    return vehicle;
  },

  async updateVehicle(id: string, data: any, actorId?: string, ipAddress?: string): Promise<VehicleRecord> {
    const existing = await vehicleRepository.findById(id);
    if (!existing) {
      throw new AppError('Vehicle not found', 404);
    }

    if (data.registrationNumber && data.registrationNumber.toUpperCase() !== existing.registration_number.toUpperCase()) {
      const duplicate = await vehicleRepository.findByRegistration(data.registrationNumber);
      if (duplicate && duplicate.id !== id) {
        throw new AppError(`Registration number "${data.registrationNumber}" is already used by another vehicle.`, 409);
      }
    }

    const updated = await vehicleRepository.update(id, data);
    if (!updated) {
      throw new AppError('Failed to update vehicle', 500);
    }

    await auditService.log({
      actorId: actorId || undefined,
      action: 'VEHICLE_UPDATED',
      entityType: 'VEHICLE',
      entityId: id,
      details: { changes: data },
      ipAddress,
    });

    return updated;
  },

  async updateStatus(id: string, status: 'AVAILABLE' | 'ASSIGNED' | 'UNDER_MAINTENANCE' | 'INACTIVE', notes?: string, actorId?: string, ipAddress?: string): Promise<VehicleRecord> {
    const existing = await vehicleRepository.findById(id);
    if (!existing) {
      throw new AppError('Vehicle not found', 404);
    }

    if (status === 'INACTIVE' || status === 'UNDER_MAINTENANCE') {
      const deps = await vehicleRepository.checkDependencies(id);
      if (deps.activeRunsCount > 0) {
        throw new AppError(
          `Cannot mark vehicle ${status}: It is currently assigned to ${deps.activeRunsCount} active delivery run(s). Please reassign or complete those runs first.`,
          400
        );
      }
    }

    const isActive = status !== 'INACTIVE';
    const updated = await vehicleRepository.update(id, {
      status,
      is_active: isActive,
      notes: notes || existing.notes,
    });

    if (!updated) {
      throw new AppError('Failed to update vehicle status', 500);
    }

    await auditService.log({
      actorId: actorId || undefined,
      action: 'VEHICLE_STATUS_CHANGED',
      entityType: 'VEHICLE',
      entityId: id,
      details: { oldStatus: existing.status, newStatus: status, notes },
      ipAddress,
    });

    return updated;
  },

  async upsertDocument(vehicleId: string, data: any, actorId?: string, ipAddress?: string): Promise<any> {
    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    const doc = await vehicleRepository.upsertDocument({
      ...data,
      vehicleId,
      verifiedBy: actorId,
    });

    await auditService.log({
      actorId: actorId || undefined,
      action: 'VEHICLE_DOCUMENT_VERIFIED',
      entityType: 'VEHICLE',
      entityId: vehicleId,
      details: {
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        expiryDate: data.expiryDate,
        verificationStatus: data.verificationStatus,
      },
      ipAddress,
    });

    return doc;
  },

  async addMaintenance(vehicleId: string, data: any, actorId?: string, ipAddress?: string): Promise<any> {
    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    const log = await vehicleRepository.addMaintenanceRecord({
      ...data,
      vehicleId,
      recordedBy: actorId,
    });

    await auditService.log({
      actorId: actorId || undefined,
      action: 'VEHICLE_MAINTENANCE_RECORDED',
      entityType: 'VEHICLE',
      entityId: vehicleId,
      details: {
        serviceType: data.serviceType,
        odometerKm: data.odometerKm,
        cost: data.cost,
        serviceCenter: data.serviceCenter,
      },
      ipAddress,
    });

    return log;
  },

  async deleteVehicle(vehicleId: string, actorId?: string, reason?: string, ipAddress?: string): Promise<void> {
    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    if (vehicle.is_active && vehicle.status !== 'INACTIVE') {
      throw new AppError('Vehicle must be deactivated before it can be deleted. Please mark the vehicle as Inactive first.', 400);
    }

    const deps = await vehicleRepository.checkDependencies(vehicleId);
    if (deps.activeRunsCount > 0) {
      throw new AppError(
        `Cannot delete vehicle: Associated with ${deps.activeRunsCount} active delivery run(s).`,
        400
      );
    }

    await vehicleRepository.softDelete(vehicleId, actorId, reason);

    await auditService.log({
      actorId: actorId || undefined,
      action: 'VEHICLE_DELETED',
      entityType: 'VEHICLE',
      entityId: vehicleId,
      details: {
        registrationNumber: vehicle.registration_number,
        historicalRunsCount: deps.historicalRunsCount,
        reason,
      },
      ipAddress,
    });
  },
};

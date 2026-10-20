import { vehicleRepository, VehicleRecord, ListVehiclesResult } from '../repositories/vehicle.repository.js';
import { auditService } from './audit.service.js';
import { AppError } from '../utils/errors.js';

export const vehicleService = {
  async listVehicles(params?: {
    search?: string;
    status?: string;
    vehicleType?: string;
    depot?: string;
    city?: string;
    compliance?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<ListVehiclesResult> {
    return vehicleRepository.listAll(params);
  },

  async getSummary(): Promise<any> {
    return vehicleRepository.getSummary();
  },

  async getVehicleDetails(id: string): Promise<any> {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) {
      throw new AppError('Vehicle asset not found in fleet', 404);
    }

    const [maintenance, assignments, eligibility, activity] = await Promise.all([
      vehicleRepository.getMaintenanceRecords(id),
      vehicleRepository.getAssignmentHistory(id),
      vehicleRepository.checkDispatchEligibility(id),
      vehicleRepository.getActivityHistory(id),
    ]);

    return {
      ...vehicle,
      maintenance,
      assignments,
      eligibility,
      activity,
    };
  },

  async createVehicle(data: any, actorId?: string, ipAddress?: string): Promise<VehicleRecord> {
    const normReg = data.registrationNumber ? data.registrationNumber.trim().toUpperCase() : '';
    const existing = await vehicleRepository.findByRegistration(normReg);
    if (existing) {
      throw new AppError(`A vehicle with registration number "${normReg}" is already registered.`, 409);
    }

    const vehicle = await vehicleRepository.create({
      ...data,
      registrationNumber: normReg,
    });

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
        capacityKg: vehicle.capacity_kg,
        fuelType: vehicle.fuel_type,
        isRefrigerated: vehicle.is_refrigerated,
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

    if (data.registrationNumber) {
      const normReg = data.registrationNumber.trim().toUpperCase();
      if (normReg !== existing.registration_number.toUpperCase()) {
        const duplicate = await vehicleRepository.findByRegistration(normReg);
        if (duplicate && duplicate.id !== id) {
          throw new AppError(`Registration number "${normReg}" is already used by another vehicle asset.`, 409);
        }
      }
    }

    const updated = await vehicleRepository.update(id, data);
    if (!updated) {
      throw new AppError('Failed to update vehicle asset', 500);
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

  async updateStatus(
    id: string,
    status: 'AVAILABLE' | 'ASSIGNED' | 'UNDER_MAINTENANCE' | 'INACTIVE',
    notes?: string,
    actorId?: string,
    ipAddress?: string
  ): Promise<VehicleRecord> {
    const existing = await vehicleRepository.findById(id);
    if (!existing) {
      throw new AppError('Vehicle not found', 404);
    }

    if (status === 'INACTIVE' || status === 'UNDER_MAINTENANCE') {
      const deps = await vehicleRepository.checkDependencies(id);
      if (deps.activeRunsCount > 0) {
        throw new AppError(
          `Cannot mark vehicle as ${status}: It is currently assigned to ${deps.activeRunsCount} active delivery run(s). Please reassign or complete those runs first.`,
          400
        );
      }
    }

    const isActive = status !== 'INACTIVE';
    const updated = await vehicleRepository.update(id, {
      status,
      is_active: isActive,
      notes: notes !== undefined ? notes : existing.notes,
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
        nextServiceDate: data.nextServiceDate,
      },
      ipAddress,
    });

    return log;
  },

  async checkDispatchEligibility(vehicleId: string, options?: any) {
    return vehicleRepository.checkDispatchEligibility(vehicleId, options);
  },

  async getActivityHistory(vehicleId: string) {
    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) throw new AppError('Vehicle not found', 404);
    return vehicleRepository.getActivityHistory(vehicleId);
  },

  async deleteVehicle(
    vehicleId: string,
    actorId?: string,
    reason?: string,
    ipAddress?: string
  ): Promise<{ message: string; softDeleted: boolean; vehicle: { id: string; registrationNumber: string; vehicleCode: string } }> {
    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    if (vehicle.is_active && vehicle.status !== 'INACTIVE') {
      throw new AppError(
        'Vehicle must be deactivated before it can be deleted. Please mark the vehicle as Inactive first.',
        400
      );
    }

    const deps = await vehicleRepository.checkDependencies(vehicleId);
    if (deps.activeRunsCount > 0) {
      throw new AppError(
        `Cannot delete vehicle: Associated with ${deps.activeRunsCount} active delivery run(s). Please complete or reassign those runs first.`,
        409
      );
    }

    let softDeleted = false;
    if (deps.canPhysicalDelete) {
      await vehicleRepository.permanentDelete(vehicleId);
      softDeleted = false;
    } else {
      await vehicleRepository.softDelete(vehicleId, actorId, reason);
      softDeleted = true;
    }

    await auditService.log({
      actorId: actorId || undefined,
      action: 'VEHICLE_DELETED',
      entityType: 'VEHICLE',
      entityId: vehicleId,
      details: {
        registrationNumber: vehicle.registration_number,
        vehicleCode: vehicle.vehicle_code,
        softDeleted,
        historicalRunsCount: deps.historicalRunsCount,
        inspectionsCount: deps.inspectionsCount,
        maintenanceCount: deps.maintenanceCount,
        reason,
      },
      ipAddress,
    });

    return {
      message: softDeleted
        ? 'Vehicle successfully archived. Historical dispatch records and maintenance history have been preserved.'
        : 'Vehicle permanently deleted from fleet.',
      softDeleted,
      vehicle: {
        id: vehicle.id,
        registrationNumber: vehicle.registration_number,
        vehicleCode: vehicle.vehicle_code,
      },
    };
  },

  async exportVehiclesCsv(): Promise<string> {
    const result = await vehicleRepository.listAll({ limit: 10000 });
    const vehicles = result.items;

    const headers = [
      'Registration Number',
      'Vehicle Code',
      'Make / Model',
      'Classification',
      'Depot',
      'City',
      'State',
      'Capacity (KG)',
      'Capacity (Crates)',
      'Fuel Type',
      'Refrigerated',
      'Status',
      'Active Status',
      'Current Odometer (KM)',
      'Compliance Status',
      'Active Run Code',
      'Active Driver',
      'Registered Date',
    ];

    const rows = vehicles.map((v) => [
      `"${v.registration_number}"`,
      `"${v.vehicle_code}"`,
      `"${v.make_model}"`,
      `"${v.vehicle_type}"`,
      `"${v.depot}"`,
      `"${v.city || ''}"`,
      `"${v.state || ''}"`,
      v.capacity_kg,
      v.capacity_crates,
      `"${v.fuel_type}"`,
      v.is_refrigerated ? 'YES' : 'NO',
      `"${v.status}"`,
      v.is_active ? 'ACTIVE' : 'INACTIVE',
      v.current_odometer_km,
      `"${v.compliance_status || 'COMPLIANT'}"`,
      `"${v.active_run_code || ''}"`,
      `"${v.active_driver_name || ''}"`,
      `"${new Date(v.created_at).toISOString().split('T')[0]}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },
};

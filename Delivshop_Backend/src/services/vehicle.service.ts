import fs from 'fs';
import path from 'path';
import { vehicleRepository, VehicleRecord, ListVehiclesResult } from '../repositories/vehicle.repository.js';
import { auditService } from './audit.service.js';
import { fileService, getStorageDir } from './file.service.js';
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

    const [documents, maintenance, assignments, eligibility, activity] = await Promise.all([
      vehicleRepository.getDocuments(id),
      vehicleRepository.getMaintenanceRecords(id),
      vehicleRepository.getAssignmentHistory(id),
      vehicleRepository.checkDispatchEligibility(id),
      vehicleRepository.getActivityHistory(id),
    ]);

    return {
      ...vehicle,
      documents,
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

  async upsertDocument(vehicleId: string, data: any, actorId?: string, ipAddress?: string): Promise<any> {
    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    let storagePath: string | undefined = undefined;
    let fileSizeBytes: number | undefined = undefined;
    let mimeType = data.mimeType || 'application/pdf';
    let fileName = data.fileName || data.originalFilename || undefined;

    // Secure file processing if fileData (base64 string) is provided
    if (data.fileData) {
      let base64Content = data.fileData;
      if (base64Content.includes(',')) {
        base64Content = base64Content.split(',')[1];
      }

      const buffer = Buffer.from(base64Content, 'base64');
      fileSizeBytes = buffer.length;

      if (buffer.length > 5 * 1024 * 1024) {
        throw new AppError('File size exceeds the 5MB maximum allowed limit.', 400);
      }

      const allowedMimes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
      if (!allowedMimes.has(mimeType)) {
        throw new AppError(`Disallowed document file type "${mimeType}". Allowed: PDF, JPEG, PNG, WebP.`, 400);
      }

      if (!fileService.validateFileSignature(buffer, mimeType)) {
        throw new AppError('File content does not match declared MIME signature. Corrupted or disallowed file rejected.', 400);
      }

      const ext =
        mimeType === 'application/pdf'
          ? '.pdf'
          : mimeType === 'image/jpeg'
          ? '.jpg'
          : mimeType === 'image/png'
          ? '.png'
          : '.webp';

      const storageFilename = `veh_${vehicleId.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      const storageDir = getStorageDir();
      storagePath = path.join(storageDir, storageFilename);

      await fs.promises.writeFile(storagePath, buffer);
      fileName = fileName ? path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_') : storageFilename;
    }

    const payload = {
      ...data,
      vehicleId,
      fileName,
      storagePath,
      mimeType,
      fileSizeBytes,
      verifiedBy: actorId,
    };

    const doc = await vehicleRepository.upsertDocument(payload);

    // If storage file was created, generate authenticated download URL
    if (doc.id && storagePath) {
      const fileUrl = `/api/vehicles/${vehicleId}/documents/${doc.id}/download`;
      await vehicleRepository.upsertDocument({
        ...payload,
        fileUrl,
      });
      doc.file_url = fileUrl;
    }

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
        hasAttachment: Boolean(storagePath || data.fileUrl),
      },
      ipAddress,
    });

    return doc;
  },

  async downloadDocument(vehicleId: string, docId: string): Promise<{
    filePath: string;
    filename: string;
    mimeType: string;
  }> {
    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) throw new AppError('Vehicle asset not found', 404);

    const doc = await vehicleRepository.getDocumentById(vehicleId, docId);
    if (!doc) throw new AppError('Vehicle document not found', 404);

    if (!doc.storage_path || !fs.existsSync(doc.storage_path)) {
      throw new AppError('Document binary file is not available on storage disk.', 404);
    }

    return {
      filePath: doc.storage_path,
      filename: doc.file_name || `vehicle_${doc.document_type.toLowerCase()}_${doc.document_number}.pdf`,
      mimeType: doc.mime_type || 'application/pdf',
    };
  },

  async deleteDocument(vehicleId: string, docId: string, actorId?: string, ipAddress?: string): Promise<void> {
    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) throw new AppError('Vehicle asset not found', 404);

    const doc = await vehicleRepository.getDocumentById(vehicleId, docId);
    if (!doc) throw new AppError('Vehicle document not found', 404);

    // If physical file exists, delete it
    if (doc.storage_path && fs.existsSync(doc.storage_path)) {
      try {
        await fs.promises.unlink(doc.storage_path);
      } catch (err: any) {
        console.warn(`[VehicleService] Could not unlink document file: ${err.message}`);
      }
    }

    await vehicleRepository.deleteDocument(vehicleId, docId);

    await auditService.log({
      actorId: actorId || undefined,
      action: 'VEHICLE_DOCUMENT_DELETED',
      entityType: 'VEHICLE',
      entityId: vehicleId,
      details: {
        documentType: doc.document_type,
        documentNumber: doc.document_number,
      },
      ipAddress,
    });
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

  async deleteVehicle(vehicleId: string, actorId?: string, reason?: string, ipAddress?: string): Promise<void> {
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

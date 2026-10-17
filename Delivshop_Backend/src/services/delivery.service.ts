import fs from 'fs';
import path from 'path';
import { deliveryRepository } from '../repositories/delivery.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { auditService } from './audit.service.js';
import { AppError } from '../utils/errors.js';
import { hashPassword } from '../utils/password.js';
import { generateDriverEmployeeId } from './driver-employee-id.service.js';
import { attendanceService } from './attendance.service.js';
import { fileService, getStorageDir } from './file.service.js';

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
      alternatePhone?: string;
      employeeId?: string;
      password?: string;
      vehicleNumber?: string;
      vehicleType?: string;
      assignedRoute?: string;
      licenseNumber?: string;
      licenseExpiry?: string;
      licenseClass?: string;
      joiningDate?: string;
      emergencyContact?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      emergencyContactRelation?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      dateOfBirth?: string;
      gender?: string;
      employmentStatus?: string;
      accountStatus?: string;
      notes?: string;
    },
    actorId?: string,
    ipAddress?: string
  ) {
    // 1. Employee ID formatting and uniqueness check
    let empId = data.employeeId?.trim().toUpperCase();
    if (!empId) {
      empId = await generateDriverEmployeeId();
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
      alternatePhone: data.alternatePhone,
      employeeId: empId,
      passwordHash,
      vehicleNumber: data.vehicleNumber,
      vehicleType: data.vehicleType,
      assignedRoute: data.assignedRoute,
      licenseNumber: data.licenseNumber,
      licenseExpiry: data.licenseExpiry,
      licenseClass: data.licenseClass,
      joiningDate: data.joiningDate,
      emergencyContact: data.emergencyContact,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      emergencyContactRelation: data.emergencyContactRelation,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      employmentStatus: data.employmentStatus,
      accountStatus: data.accountStatus,
      mustChangePassword: true,
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
      alternatePhone?: string;
      employeeId?: string;
      vehicleNumber?: string;
      vehicleType?: string;
      assignedRoute?: string;
      licenseNumber?: string;
      licenseExpiry?: string;
      licenseClass?: string;
      joiningDate?: string;
      emergencyContact?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      emergencyContactRelation?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      dateOfBirth?: string;
      gender?: string;
      employmentStatus?: string;
      accountStatus?: string;
      mustChangePassword?: boolean;
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
    if (data.licenseClass !== undefined) payload.license_class = data.licenseClass || null;
    if (data.joiningDate !== undefined) payload.joining_date = data.joiningDate || null;
    if (data.emergencyContact !== undefined) payload.emergency_contact = data.emergencyContact || null;
    if (data.emergencyContactName !== undefined) payload.emergency_contact_name = data.emergencyContactName || null;
    if (data.emergencyContactPhone !== undefined) payload.emergency_contact_phone = data.emergencyContactPhone || null;
    if (data.emergencyContactRelation !== undefined) payload.emergency_contact_relation = data.emergencyContactRelation || null;
    if (data.alternatePhone !== undefined) payload.alternate_phone = data.alternatePhone || null;
    if (data.address !== undefined) payload.address = data.address || null;
    if (data.city !== undefined) payload.city = data.city || null;
    if (data.state !== undefined) payload.state = data.state || null;
    if (data.pincode !== undefined) payload.pincode = data.pincode || null;
    if (data.dateOfBirth !== undefined) payload.date_of_birth = data.dateOfBirth || null;
    if (data.gender !== undefined) payload.gender = data.gender || null;
    if (data.employmentStatus !== undefined) payload.employment_status = data.employmentStatus;
    if (data.accountStatus !== undefined) payload.account_status = data.accountStatus;
    if (data.mustChangePassword !== undefined) payload.must_change_password = data.mustChangePassword;

    delete payload.employeeId;
    delete payload.vehicleNumber;
    delete payload.vehicleType;
    delete payload.assignedRoute;
    delete payload.licenseNumber;
    delete payload.licenseExpiry;
    delete payload.licenseClass;
    delete payload.joiningDate;
    delete payload.emergencyContact;
    delete payload.emergencyContactName;
    delete payload.emergencyContactPhone;
    delete payload.emergencyContactRelation;
    delete payload.alternatePhone;
    delete payload.dateOfBirth;
    delete payload.employmentStatus;
    delete payload.accountStatus;
    delete payload.mustChangePassword;

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

    // Safety rule: Cannot deactivate driver while on active delivery task or assigned to active delivery run
    if (!isActive) {
      const deps = await deliveryRepository.checkDriverDependencies(driverId);
      if (deps.activeDeliveriesCount > 0 || deps.activeRunsCount > 0) {
        throw new AppError(
          `Cannot deactivate driver: Assigned to ${deps.activeDeliveriesCount} active delivery task(s) and ${deps.activeRunsCount} active run assignment(s). Please reassign or complete those runs first.`,
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

    // Dependency check: Cannot delete driver assigned to active deliveries or runs
    const deps = await deliveryRepository.checkDriverDependencies(driverId);
    if (deps.activeDeliveriesCount > 0 || deps.activeRunsCount > 0) {
      throw new AppError(
        `Cannot delete driver because they are currently assigned to ${deps.activeDeliveriesCount} active delivery task(s) and ${deps.activeRunsCount} active run(s). Reassign or complete those first.`,
        409
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

  async getSalaryConfig(driverId: string) {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) throw new AppError('Driver not found', 404);
    return deliveryRepository.getSalaryConfig(driverId);
  },

  async upsertSalaryConfig(driverId: string, data: any, actorId?: string, ipAddress?: string) {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) throw new AppError('Driver not found', 404);

    const config = await deliveryRepository.upsertSalaryConfig(driverId, data);

    await auditService.log({
      actorId,
      action: 'DRIVER_SALARY_CONFIG_UPDATED',
      entityType: 'user',
      entityId: driverId,
      details: { baseMonthlySalary: data.baseMonthlySalary, effectiveFrom: data.effectiveFrom },
      ipAddress,
    });

    return config;
  },

  async getPayrollRecords(driverId: string) {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) throw new AppError('Driver not found', 404);
    return deliveryRepository.getPayrollRecords(driverId);
  },

  async addPayrollRecord(driverId: string, data: any, actorId?: string, ipAddress?: string) {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) throw new AppError('Driver not found', 404);

    const record = await deliveryRepository.addPayrollRecord(driverId, data, actorId);

    await auditService.log({
      actorId,
      action: 'DRIVER_PAYROLL_RECORDED',
      entityType: 'user',
      entityId: driverId,
      details: {
        paymentPeriod: data.paymentPeriod,
        netAmount: data.netAmount,
        paymentReference: data.paymentReference,
      },
      ipAddress,
    });

    return record;
  },

  async getDriverDocuments(driverId: string) {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) throw new AppError('Driver not found', 404);
    return deliveryRepository.getDriverDocuments(driverId);
  },

  async upsertDriverDocument(driverId: string, data: any, actorId?: string, ipAddress?: string) {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) throw new AppError('Driver not found', 404);

    let storagePath: string | undefined = undefined;
    let fileSizeBytes: number | undefined = undefined;
    let mimeType = data.mimeType || 'application/pdf';
    let fileName = data.fileName || data.originalFilename || undefined;

    if (data.fileData) {
      // Decode base64 file data
      let base64Content = data.fileData;
      if (base64Content.includes(',')) {
        base64Content = base64Content.split(',')[1];
      }

      const buffer = Buffer.from(base64Content, 'base64');
      fileSizeBytes = buffer.length;

      if (buffer.length > 5 * 1024 * 1024) {
        throw new AppError('File size exceeds the 5MB maximum limit.', 400);
      }

      const allowedMimes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
      if (!allowedMimes.has(mimeType)) {
        throw new AppError(`Disallowed file MIME type "${mimeType}". Allowed: PDF, JPEG, PNG, WebP.`, 400);
      }

      if (!fileService.validateFileSignature(buffer, mimeType)) {
        throw new AppError('File signature does not match declared type. Corrupted or disallowed file rejected.', 400);
      }

      const ext = mimeType === 'application/pdf' ? '.pdf' : mimeType === 'image/jpeg' ? '.jpg' : mimeType === 'image/png' ? '.png' : '.webp';
      const storageFilename = `driver_${driverId.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      const storageDir = getStorageDir();
      storagePath = path.join(storageDir, storageFilename);

      await fs.promises.writeFile(storagePath, buffer);
      fileName = fileName ? path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_') : storageFilename;
    }

    const payload = {
      ...data,
      fileName,
      storagePath,
      mimeType,
      fileSizeBytes,
    };

    const doc = await deliveryRepository.upsertDriverDocument(driverId, payload, actorId);

    // If document has storagePath, assign authenticated download URL
    if (doc.id && storagePath) {
      const fileUrl = `/api/deliveries/drivers/${driverId}/documents/${doc.id}/download`;
      await deliveryRepository.upsertDriverDocument(driverId, { ...payload, fileUrl }, actorId);
      doc.file_url = fileUrl;
    }

    await auditService.log({
      actorId,
      action: 'DRIVER_DOCUMENT_VERIFIED',
      entityType: 'user',
      entityId: driverId,
      details: {
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        verificationStatus: data.verificationStatus,
        fileName,
      },
      ipAddress,
    });

    return doc;
  },

  async downloadDriverDocument(driverId: string, docId: string, requestingUser: any) {
    if (requestingUser.role !== 'ADMIN' && requestingUser.role !== 'MANAGER' && requestingUser.id !== driverId) {
      throw new AppError('Forbidden: You do not have permission to view this document.', 403);
    }

    const doc = await deliveryRepository.getDriverDocumentById(driverId, docId);
    if (!doc) {
      throw new AppError('Document not found', 404);
    }

    if (!doc.storage_path || !fs.existsSync(doc.storage_path)) {
      throw new AppError('Document file not found on storage server', 404);
    }

    return {
      filePath: doc.storage_path,
      filename: doc.file_name || `${doc.document_type.toLowerCase()}.pdf`,
      mimeType: doc.mime_type || 'application/pdf',
    };
  },

  async getFullProfile(driverId: string) {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    const now = new Date();
    const [deliveries, auditHistory, salaryConfig, payrollRecords, documents, runs, attendanceSummary, recentAttendance] =
      await Promise.all([
        deliveryRepository.getDriverDeliveries(driverId),
        deliveryRepository.getDriverAuditHistory(driverId),
        deliveryRepository.getSalaryConfig(driverId),
        deliveryRepository.getPayrollRecords(driverId),
        deliveryRepository.getDriverDocuments(driverId),
        deliveryRepository.getDriverRunsHistory(driverId),
        attendanceService.getMonthlySummary(driverId, now.getFullYear(), now.getMonth() + 1),
        attendanceService.getHistory(driverId, 15),
      ]);

    return {
      driver,
      deliveries,
      runs,
      salaryConfig,
      payrollRecords,
      documents,
      auditHistory,
      attendanceSummary,
      recentAttendance,
    };
  },

  async completeDelivery(params: any, ipAddress?: string) {
    const result = await deliveryRepository.completeDelivery(params);
    await auditService.log({
      actorId: params.driverId,
      action: 'DELIVERY_COMPLETED',
      entityType: 'delivery',
      entityId: params.deliveryId,
      details: {
        status: params.status,
        deliveredCrates: params.deliveredCratesCount,
        returnedCrates: params.returnedCratesCount,
        collectedAmount: params.collectedAmount,
      },
      ipAddress,
    });
    return result;
  },

  async recordVehicleInspection(params: any, ipAddress?: string) {
    const inspection = await deliveryRepository.recordVehicleInspection(params);
    await auditService.log({
      actorId: params.driverId,
      action: 'VEHICLE_INSPECTION_RECORDED',
      entityType: 'vehicle_inspection',
      entityId: inspection.id,
      details: {
        vehicleId: params.vehicleId,
        passed: params.passed,
        odometerKm: params.odometerKm,
      },
      ipAddress,
    });
    return inspection;
  },

  async getRecentVehicleInspections(driverId: string) {
    return deliveryRepository.getRecentVehicleInspections(driverId);
  },

  async recordIncident(params: any, ipAddress?: string) {
    const incident = await deliveryRepository.recordIncident(params);
    await auditService.log({
      actorId: params.driverId,
      action: 'DRIVER_INCIDENT_REPORTED',
      entityType: 'driver_incident',
      entityId: incident.id,
      details: {
        category: params.category,
        severity: params.severity,
        title: params.title,
      },
      ipAddress,
    });
    return incident;
  },

  async getDriverIncidents(driverId: string) {
    return deliveryRepository.getDriverIncidents(driverId);
  },

  async recordReconciliation(params: any, ipAddress?: string) {
    const reconciliation = await deliveryRepository.recordReconciliation(params);
    await auditService.log({
      actorId: params.driverId,
      action: 'SHIFT_RECONCILIATION_COMPLETED',
      entityType: 'delivery_reconciliation',
      entityId: reconciliation.id,
      details: {
        runId: params.runId,
        totalStopsCompleted: params.totalStopsCompleted,
        totalCratesDelivered: params.totalCratesDelivered,
        totalCashCollected: params.totalCashCollected,
      },
      ipAddress,
    });
    return reconciliation;
  },
};

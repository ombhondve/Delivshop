import fs from 'fs';
import path from 'path';
import { deliveryRepository } from '../repositories/delivery.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { auditService } from './audit.service.js';
import { AppError } from '../utils/errors.js';
import { hashPassword, generateTemporaryPassword } from '../utils/password.js';
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

  async generateEmployeeId(): Promise<string> {
    return generateDriverEmployeeId();
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

    // 3. Password handling (reuses shop account-provisioning workflow)
    const rawPassword = data.password?.trim() || generateTemporaryPassword();
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

    return {
      ...created,
      credentials: {
        employeeId: created.employee_id,
        temporaryPassword: rawPassword,
        mustChangePassword: true,
      },
    };
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

  /**
   * Calculates monthly salary obligation based on effective-dated rates.
   * If a salary rate is revised mid-month, prorates using the applicable rates for each day.
   */
  calculateSalaryObligation(
    configs: Array<{ base_monthly_salary: string | number; effective_from: string | Date; effective_to?: string | Date | null }>,
    year: number,
    month: number // 1-12
  ): number {
    if (!configs || configs.length === 0) return 0;

    const daysInMonth = new Date(year, month, 0).getDate();
    const sortedConfigs = [...configs].sort((a, b) => {
      const da = new Date(a.effective_from).getTime();
      const db = new Date(b.effective_from).getTime();
      return db - da; // newest first
    });

    let totalObligation = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayDate = new Date(`${dayDateStr}T12:00:00Z`);

      const activeConfig = sortedConfigs.find((c) => {
        const fromStr = typeof c.effective_from === 'string' ? c.effective_from.slice(0, 10) : new Date(c.effective_from).toISOString().slice(0, 10);
        const fromDate = new Date(`${fromStr}T00:00:00Z`);
        let toDate: Date | null = null;
        if (c.effective_to) {
          const toStr = typeof c.effective_to === 'string' ? c.effective_to.slice(0, 10) : new Date(c.effective_to).toISOString().slice(0, 10);
          toDate = new Date(`${toStr}T23:59:59Z`);
        }
        return fromDate <= dayDate && (!toDate || toDate >= dayDate);
      });

      if (activeConfig) {
        const rate = parseFloat(String(activeConfig.base_monthly_salary)) || 0;
        totalObligation += rate / daysInMonth;
      }
    }

    return Math.round(totalObligation * 100) / 100;
  },

  async getSalarySummary(driverId: string, monthStr?: string) {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) throw new AppError('Driver not found', 404);

    const now = new Date();
    const activeMonth = monthStr && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthStr)
      ? monthStr
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [yearStr, mStr] = activeMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(mStr, 10);

    const [currentConfig, allConfigs, payments] = await Promise.all([
      deliveryRepository.getSalaryConfig(driverId),
      deliveryRepository.getAllSalaryConfigs(driverId),
      deliveryRepository.getSalaryPayments(driverId, activeMonth),
    ]);

    const completedPayments = payments.filter((p: any) => p.status === 'COMPLETED');
    const totalPaid = Math.round(completedPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0) * 100) / 100;
    const salaryAmountDue = this.calculateSalaryObligation(allConfigs, year, month);
    const remainingBalance = Math.max(0, Math.round((salaryAmountDue - totalPaid) * 100) / 100);

    let paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'NOT_SET' = 'NOT_SET';
    if (allConfigs.length === 0) {
      paymentStatus = 'NOT_SET';
    } else if (salaryAmountDue === 0 && totalPaid === 0) {
      paymentStatus = 'NOT_SET';
    } else if (totalPaid === 0 && salaryAmountDue > 0) {
      paymentStatus = 'UNPAID';
    } else if (totalPaid > 0 && totalPaid < salaryAmountDue) {
      paymentStatus = 'PARTIALLY_PAID';
    } else if (totalPaid >= salaryAmountDue && salaryAmountDue > 0) {
      paymentStatus = 'PAID';
    } else if (salaryAmountDue === 0 && totalPaid > 0) {
      paymentStatus = 'PAID';
    }

    return {
      currentMonthlySalary: currentConfig ? parseFloat(currentConfig.base_monthly_salary) : null,
      salaryEffectiveDate: currentConfig?.effective_from ? (typeof currentConfig.effective_from === 'string' ? currentConfig.effective_from.slice(0, 10) : new Date(currentConfig.effective_from).toISOString().slice(0, 10)) : null,
      selectedSalaryMonth: activeMonth,
      salaryAmountDue,
      totalPaid,
      remainingBalance,
      paymentStatus,
      isConfigured: allConfigs.length > 0,
      currentConfig,
      allConfigs,
      monthPayments: payments,
    };
  },

  async getSalaryConfig(driverId: string, monthStr?: string) {
    const summary = await this.getSalarySummary(driverId, monthStr);
    return {
      ...summary.currentConfig,
      summary,
      history: summary.allConfigs,
    };
  },

  async setMonthlySalary(driverId: string, data: any, actorId?: string, ipAddress?: string) {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) throw new AppError('Driver not found', 404);

    const monthlySalary = parseFloat(data.monthlySalary ?? data.baseMonthlySalary ?? data.baseSalary);
    if (isNaN(monthlySalary) || monthlySalary <= 0) {
      throw new AppError('Monthly salary must be a positive numeric amount', 400);
    }

    const effectiveFrom = data.effectiveFrom || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
      throw new AppError('Valid effective date (YYYY-MM-DD) is required', 400);
    }

    const config = await deliveryRepository.setMonthlySalary(driverId, {
      monthlySalary,
      effectiveFrom,
      salaryType: data.salaryType || 'Fixed Monthly Salary',
      notes: data.notes,
    });

    await auditService.log({
      actorId,
      action: 'DRIVER_SALARY_CONFIG_UPDATED',
      entityType: 'user',
      entityId: driverId,
      details: {
        monthlySalary,
        effectiveFrom,
        salaryType: config.salary_type,
        notes: config.notes,
      },
      ipAddress,
    });

    const summary = await this.getSalarySummary(driverId);
    return {
      ...config,
      summary,
    };
  },

  async upsertSalaryConfig(driverId: string, data: any, actorId?: string, ipAddress?: string) {
    return this.setMonthlySalary(driverId, data, actorId, ipAddress);
  },

  async getSalaryPayments(driverId: string, monthStr?: string) {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) throw new AppError('Driver not found', 404);

    const [allConfigs, allPayments] = await Promise.all([
      deliveryRepository.getAllSalaryConfigs(driverId),
      deliveryRepository.getSalaryPayments(driverId),
    ]);

    // Gather unique months across payments and salary revisions
    const monthsSet = new Set<string>();
    allPayments.forEach((p: any) => {
      if (p.salary_month) monthsSet.add(p.salary_month);
    });

    // Also include current month and prior 2 months
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const monthsSummary = Array.from(monthsSet)
      .sort((a, b) => b.localeCompare(a))
      .map((month) => {
        const [yStr, mStr] = month.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10);
        const monthTx = allPayments.filter((p: any) => p.salary_month === month);
        const completedTx = monthTx.filter((p: any) => p.status === 'COMPLETED');
        const totalPaid = Math.round(completedTx.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0) * 100) / 100;
        const due = this.calculateSalaryObligation(allConfigs, y, m);
        const balance = Math.max(0, Math.round((due - totalPaid) * 100) / 100);

        const latestPaymentDate = completedTx.length > 0
          ? completedTx[0].payment_date
          : null;

        let status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'NOT_SET' = 'NOT_SET';
        if (allConfigs.length === 0 || (due === 0 && totalPaid === 0)) {
          status = 'NOT_SET';
        } else if (totalPaid === 0 && due > 0) {
          status = 'UNPAID';
        } else if (totalPaid > 0 && totalPaid < due) {
          status = 'PARTIALLY_PAID';
        } else if (totalPaid >= due && due > 0) {
          status = 'PAID';
        } else if (due === 0 && totalPaid > 0) {
          status = 'PAID';
        }

        return {
          salaryMonth: month,
          salaryAmountDue: due,
          totalPaid,
          remainingBalance: balance,
          latestPaymentDate,
          paymentStatus: status,
          paymentsCount: monthTx.length,
          transactions: monthTx,
        };
      });

    const filteredPayments = monthStr
      ? allPayments.filter((p: any) => p.salary_month === monthStr)
      : allPayments;

    return {
      monthsSummary,
      payments: filteredPayments,
    };
  },

  async recordSalaryPayment(driverId: string, data: any, actorId?: string, ipAddress?: string) {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) throw new AppError('Driver not found', 404);

    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new AppError('Payment amount must be a positive number', 400);
    }

    if (!data.salaryMonth || !/^\d{4}-(0[1-9]|1[0-2])$/.test(data.salaryMonth)) {
      throw new AppError('Valid salary month (YYYY-MM) is required', 400);
    }

    if (!data.paymentDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.paymentDate)) {
      throw new AppError('Valid payment date (YYYY-MM-DD) is required', 400);
    }

    const allowedMethods = new Set(['BANK_TRANSFER', 'UPI', 'CASH']);
    const method = String(data.paymentMethod || '').toUpperCase().trim();
    if (!allowedMethods.has(method)) {
      throw new AppError('Payment method must be Bank Transfer, UPI, or Cash', 400);
    }

    let record: any;
    try {
      record = await deliveryRepository.recordSalaryPayment(
        driverId,
        {
          salaryMonth: data.salaryMonth,
          paymentDate: data.paymentDate,
          amount,
          paymentMethod: method,
          transactionReference: data.transactionReference,
          notes: data.notes,
        },
        actorId
      );
    } catch (err: any) {
      if (err.message && err.message.includes('already exists')) {
        throw new AppError(err.message, 409);
      }
      throw err;
    }

    // Keep legacy payroll records synchronized for backward compatibility
    try {
      await deliveryRepository.addPayrollRecord(driverId, {
        paymentPeriod: data.salaryMonth,
        baseSalary: amount,
        netAmount: amount,
        status: 'PAID',
        paymentDate: data.paymentDate,
        paymentReference: data.transactionReference,
        notes: data.notes,
      }, actorId);
    } catch {
      // Non-blocking sync
    }

    await auditService.log({
      actorId,
      action: 'DRIVER_SALARY_PAYMENT_RECORDED',
      entityType: 'user',
      entityId: driverId,
      details: {
        paymentId: record.id,
        salaryMonth: data.salaryMonth,
        amount,
        paymentMethod: method,
        paymentDate: data.paymentDate,
        transactionReference: data.transactionReference,
      },
      ipAddress,
    });

    const summary = await this.getSalarySummary(driverId, data.salaryMonth);
    return {
      payment: record,
      summary,
    };
  },

  async reverseSalaryPayment(
    driverId: string,
    paymentId: string,
    reason: string,
    actorId?: string,
    ipAddress?: string
  ) {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) throw new AppError('Driver not found', 404);

    if (!reason || reason.trim().length < 3) {
      throw new AppError('Reversal reason must be at least 3 characters long', 400);
    }

    const reversed = await deliveryRepository.reverseSalaryPayment(
      driverId,
      paymentId,
      reason.trim(),
      actorId
    );

    if (!reversed) {
      throw new AppError('Payment record not found or already reversed', 404);
    }

    await auditService.log({
      actorId,
      action: 'DRIVER_SALARY_PAYMENT_REVERSED',
      entityType: 'user',
      entityId: driverId,
      details: {
        paymentId,
        salaryMonth: reversed.salary_month,
        amount: reversed.amount,
        reversalReason: reason.trim(),
      },
      ipAddress,
    });

    const summary = await this.getSalarySummary(driverId, reversed.salary_month);
    return {
      payment: reversed,
      summary,
    };
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

  async getFullProfile(driverId: string) {
    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    const now = new Date();
    const [deliveries, auditHistory, salarySummary, runs, attendanceSummary, recentAttendance] =
      await Promise.all([
        deliveryRepository.getDriverDeliveries(driverId),
        deliveryRepository.getDriverAuditHistory(driverId),
        this.getSalarySummary(driverId),
        deliveryRepository.getDriverRunsHistory(driverId),
        attendanceService.getMonthlySummary(driverId, now.getFullYear(), now.getMonth() + 1),
        attendanceService.getHistory(driverId, 15),
      ]);

    return {
      driver,
      deliveries,
      runs,
      salaryConfig: salarySummary.currentConfig,
      salarySummary,
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

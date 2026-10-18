import { supplierBillingRepository } from '../repositories/supplier-billing.repository.js';
import { companyRepository, toCompanyDTO } from '../repositories/company.repository.js';
import { pdfGeneratorService } from './pdf-generator.service.js';
import { auditService } from './audit.service.js';
import { AppError } from '../utils/errors.js';
import {
  PickupRecord,
  SupplierBill,
  SupplierPayment,
  SupplierFinancialSummary,
  PickupStatus,
  PaymentMethod,
} from '../types/supplier-billing.types.js';

export const supplierBillingService = {
  /**
   * List pickups for a supplier company or route
   */
  async listPickups(params: {
    companyId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    routeId?: string;
    isBilled?: boolean;
    page?: number;
    limit?: number;
  }) {
    return supplierBillingRepository.listPickups(params);
  },

  /**
   * Get single pickup by ID
   */
  async getPickupById(pickupId: string): Promise<PickupRecord> {
    const pickup = await supplierBillingRepository.getPickupById(pickupId);
    if (!pickup) {
      throw new AppError('Supplier pickup record not found', 404);
    }
    return pickup;
  },

  /**
   * Verify collected quantities and record accepted vs rejected items
   */
  async verifyPickup(
    pickupId: string,
    data: {
      items: Array<{
        itemId: string;
        acceptedQuantity: number;
        rejectedQuantity: number;
        shortageQuantity?: number;
        supplierPurchasePrice?: number;
        verificationRemarks?: string;
      }>;
      verificationNotes?: string;
      status?: PickupStatus;
    },
    userId: string
  ): Promise<PickupRecord> {
    const updated = await supplierBillingRepository.verifyPickupQuantities(pickupId, data, userId);

    await auditService.log({
      actorId: userId,
      action: 'SUPPLIER_PICKUP_VERIFIED',
      entityType: 'delivery_run_pickups',
      entityId: pickupId,
      details: {
        pickupReference: updated.pickupReference,
        status: updated.status,
        itemCount: updated.items.length,
        totalAcceptedUnits: updated.totalAcceptedUnits,
        totalRejectedUnits: updated.totalRejectedUnits,
      },
    });

    return updated;
  },

  /**
   * Create or update scheduled pickup
   */
  async schedulePickup(
    data: {
      companyId: string;
      runId?: string;
      routeId?: string;
      driverId?: string;
      scheduledDate: string;
      scheduledTimeWindow?: string;
      items: Array<{ productId: string; requiredQuantity: number; unit?: string }>;
      notes?: string;
    },
    userId: string
  ): Promise<PickupRecord> {
    const record = await supplierBillingRepository.schedulePickup(data, userId);

    await auditService.log({
      actorId: userId,
      action: 'SUPPLIER_PICKUP_SCHEDULED',
      entityType: 'delivery_run_pickups',
      entityId: record.id,
      details: {
        pickupReference: record.pickupReference,
        companyId: data.companyId,
        scheduledDate: data.scheduledDate,
        itemCount: data.items.length,
      },
    });

    return record;
  },

  /**
   * Generate finalized supplier bill
   */
  async generateBill(
    companyId: string,
    data: {
      pickupIds?: string[];
      billingPeriodStart: string;
      billingPeriodEnd: string;
      dueDate?: string;
      adjustmentsAmount?: number;
      adjustmentReason?: string;
      notes?: string;
    },
    userId: string
  ): Promise<SupplierBill> {
    const bill = await supplierBillingRepository.generateSupplierBill(companyId, data, userId);

    await auditService.log({
      actorId: userId,
      action: 'SUPPLIER_BILL_GENERATED',
      entityType: 'supplier_bills',
      entityId: bill.id,
      details: {
        billNumber: bill.billNumber,
        companyId: bill.companyId,
        totalAmount: bill.totalAmount,
        subtotalAmount: bill.subtotalAmount,
        taxAmount: bill.taxAmount,
        pickupCount: bill.pickupReferences.length,
      },
    });

    return bill;
  },

  /**
   * List supplier bills
   */
  async listBills(params: {
    companyId?: string;
    status?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    return supplierBillingRepository.listBills(params);
  },

  /**
   * Get bill by ID
   */
  async getBillById(billId: string): Promise<SupplierBill> {
    const bill = await supplierBillingRepository.getBillById(billId);
    if (!bill) {
      throw new AppError('Supplier bill not found', 404);
    }
    return bill;
  },

  /**
   * Record payment against supplier bill
   */
  async recordPayment(
    billId: string,
    data: {
      amount: number;
      paymentMethod: PaymentMethod;
      transactionReference?: string;
      notes?: string;
    },
    userId: string
  ): Promise<{ payment: SupplierPayment; bill: SupplierBill }> {
    const result = await supplierBillingRepository.recordPayment(billId, data, userId);

    await auditService.log({
      actorId: userId,
      action: 'SUPPLIER_PAYMENT_RECORDED',
      entityType: 'supplier_payments',
      entityId: result.payment.id,
      details: {
        paymentNumber: result.payment.paymentNumber,
        billId,
        amount: data.amount,
        remainingBalance: result.bill.outstandingBalance,
        paymentStatus: result.bill.paymentStatus,
      },
    });

    return result;
  },

  /**
   * Get supplier company financial and operational summary
   */
  async getSupplierFinancialSummary(companyId: string): Promise<SupplierFinancialSummary> {
    return supplierBillingRepository.getSupplierFinancialSummary(companyId);
  },

  /**
   * Generate quantity-only Supplier Pickup Summary PDF
   */
  async getPickupSummaryPdf(pickupId: string): Promise<{ buffer: Buffer; filename: string }> {
    const pickup = await this.getPickupById(pickupId);
    const companyRecord = await companyRepository.findById(pickup.companyId);
    const companyDTO = companyRecord ? toCompanyDTO(companyRecord) : {};

    const buffer = await pdfGeneratorService.generatePickupSummaryPdf(pickup, companyDTO);
    const filename = `pickup_summary_${pickup.pickupReference}.pdf`;
    return { buffer, filename };
  },

  /**
   * Generate detailed financial Supplier Payment Bill PDF in INR
   */
  async getSupplierBillPdf(billId: string): Promise<{ buffer: Buffer; filename: string }> {
    const bill = await this.getBillById(billId);
    const companyRecord = await companyRepository.findById(bill.companyId);
    const companyDTO = companyRecord ? toCompanyDTO(companyRecord) : {};

    const buffer = await pdfGeneratorService.generateSupplierBillPdf(bill, companyDTO);
    const filename = `supplier_bill_${bill.billNumber}.pdf`;
    return { buffer, filename };
  },
};

import { Request, Response, NextFunction } from 'express';
import { supplierBillingService } from '../services/supplier-billing.service.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/errors.js';

export const supplierBillingController = {
  /**
   * GET /api/companies/:companyId/pickups
   * List pickup records for a specific supplier company
   */
  async listCompanyPickups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.params;
      const { status, startDate, endDate, routeId, isBilled, page, limit } = req.query;

      const result = await supplierBillingService.listPickups({
        companyId,
        status: status as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        routeId: routeId as string | undefined,
        isBilled: isBilled !== undefined ? isBilled === 'true' : undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/companies/:companyId/pickups/:pickupId
   * Get single pickup details
   */
  async getPickup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pickupId } = req.params;
      const pickup = await supplierBillingService.getPickupById(pickupId);
      sendSuccess(res, pickup);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/companies/:companyId/pickups/schedule
   * Schedule or create a supplier pickup
   */
  async schedulePickup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.params;
      const { runId, routeId, driverId, scheduledDate, scheduledTimeWindow, items, notes } = req.body;

      if (!scheduledDate || !Array.isArray(items) || items.length === 0) {
        throw new AppError('scheduledDate and at least one item are required to schedule a pickup', 400);
      }

      const result = await supplierBillingService.schedulePickup(
        {
          companyId,
          runId,
          routeId,
          driverId,
          scheduledDate,
          scheduledTimeWindow,
          items,
          notes,
        },
        req.user!.id
      );

      sendSuccess(res, result, 'Supplier pickup scheduled successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/companies/:companyId/pickups/:pickupId/verify
   * Verify collected quantities and record accepted vs rejected units
   */
  async verifyPickup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pickupId } = req.params;
      const { items, verificationNotes, status } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        throw new AppError('Verification requires an items array with accepted and rejected quantities', 400);
      }

      const result = await supplierBillingService.verifyPickup(
        pickupId,
        { items, verificationNotes, status },
        req.user!.id
      );

      sendSuccess(res, result, 'Pickup quantities verified and saved successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/companies/:companyId/pickups/:pickupId/summary-pdf
   * Generate quantity-only physical pickup summary PDF (STRICTLY NO PRICES)
   */
  async downloadPickupSummaryPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pickupId } = req.params;
      const { buffer, filename } = await supplierBillingService.getPickupSummaryPdf(pickupId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/companies/:companyId/bills/generate
   * Generate finalized supplier bill from verified pickups
   */
  async generateBill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.params;
      const { pickupIds, billingPeriodStart, billingPeriodEnd, dueDate, adjustmentsAmount, adjustmentReason, notes } = req.body;

      if (!billingPeriodStart || !billingPeriodEnd) {
        throw new AppError('billingPeriodStart and billingPeriodEnd are required to generate a bill', 400);
      }

      const bill = await supplierBillingService.generateBill(
        companyId,
        {
          pickupIds,
          billingPeriodStart,
          billingPeriodEnd,
          dueDate,
          adjustmentsAmount: adjustmentsAmount ? Number(adjustmentsAmount) : 0,
          adjustmentReason,
          notes,
        },
        req.user!.id
      );

      sendSuccess(res, bill, 'Supplier payment bill generated and finalized successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/companies/:companyId/bills
   * List supplier bills
   */
  async listBills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.params;
      const { status, paymentStatus, startDate, endDate, page, limit } = req.query;

      const result = await supplierBillingService.listBills({
        companyId,
        status: status as string | undefined,
        paymentStatus: paymentStatus as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/companies/:companyId/bills/:billId
   * Get single supplier bill details
   */
  async getBill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { billId } = req.params;
      const bill = await supplierBillingService.getBillById(billId);
      sendSuccess(res, bill);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/companies/:companyId/bills/:billId/payments
   * Record payment against a supplier bill
   */
  async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { billId } = req.params;
      const { amount, paymentMethod, transactionReference, notes } = req.body;

      if (!amount || Number(amount) <= 0) {
        throw new AppError('Valid positive payment amount is required', 400);
      }
      if (!paymentMethod) {
        throw new AppError('Payment method is required', 400);
      }

      const result = await supplierBillingService.recordPayment(
        billId,
        {
          amount: Number(amount),
          paymentMethod,
          transactionReference,
          notes,
        },
        req.user!.id
      );

      sendSuccess(res, result, 'Payment recorded and supplier bill reconciled successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/companies/:companyId/bills/:billId/pdf
   * Generate detailed financial Supplier Payment Bill PDF in INR (₹)
   */
  async downloadSupplierBillPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { billId } = req.params;
      const { buffer, filename } = await supplierBillingService.getSupplierBillPdf(billId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/companies/:companyId/financial-summary
   * Get summary of total payable, paid, balance, and pickup counts
   */
  async getFinancialSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.params;
      const summary = await supplierBillingService.getSupplierFinancialSummary(companyId);
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  },
};

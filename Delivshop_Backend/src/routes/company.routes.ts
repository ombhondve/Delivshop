import { Router } from 'express';
import { companyController } from '../controllers/company.controller.js';
import { supplierBillingController } from '../controllers/supplier-billing.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import {
  createCompanySchema,
  updateCompanySchema,
  updateCompanyStatusSchema,
} from '../schemas/company.schema.js';

const router = Router();

// 1. Summary Statistics (mounted before /:id)
router.get(
  '/stats',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  companyController.getSummaryStats
);

// 2. Collection Operations
router.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(createCompanySchema),
  companyController.createCompany
);

router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  companyController.listCompanies
);

// 3. Supplier Pickups, Verification & Quantity Summary PDF
router.get(
  '/:companyId/pickups',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  supplierBillingController.listCompanyPickups
);

router.post(
  '/:companyId/pickups/schedule',
  authenticate,
  authorizeRoles('ADMIN'),
  supplierBillingController.schedulePickup
);

router.get(
  '/:companyId/pickups/:pickupId',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  supplierBillingController.getPickup
);

router.patch(
  '/:companyId/pickups/:pickupId/verify',
  authenticate,
  authorizeRoles('ADMIN'),
  supplierBillingController.verifyPickup
);

router.get(
  '/:companyId/pickups/:pickupId/summary-pdf',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  supplierBillingController.downloadPickupSummaryPdf
);

// 4. Supplier Billing, Reconciled Financials, Payment & Bill PDF
router.get(
  '/:companyId/financial-summary',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  supplierBillingController.getFinancialSummary
);

router.get(
  '/:companyId/bills',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  supplierBillingController.listBills
);

router.post(
  '/:companyId/bills/generate',
  authenticate,
  authorizeRoles('ADMIN'),
  supplierBillingController.generateBill
);

router.get(
  '/:companyId/bills/:billId',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  supplierBillingController.getBill
);

router.post(
  '/:companyId/bills/:billId/payments',
  authenticate,
  authorizeRoles('ADMIN'),
  supplierBillingController.recordPayment
);

router.get(
  '/:companyId/bills/:billId/pdf',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  supplierBillingController.downloadSupplierBillPdf
);

// 5. Single Resource CRUD Operations
router.get(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  companyController.getCompany
);

router.patch(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(updateCompanySchema),
  companyController.updateCompany
);

router.patch(
  '/:id/status',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(updateCompanyStatusSchema),
  companyController.updateCompanyStatus
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  companyController.deleteCompany
);

export default router;

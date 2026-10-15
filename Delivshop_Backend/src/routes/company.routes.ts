import { Router } from 'express';
import { companyController } from '../controllers/company.controller.js';
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

// 3. Single Resource Operations
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

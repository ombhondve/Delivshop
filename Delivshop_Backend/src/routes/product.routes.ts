import { Router } from 'express';
import { productController } from '../controllers/product.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
} from '../schemas/product.schema.js';

const router = Router();

// 1. Summary Statistics (Mounted before /:id)
router.get(
  '/stats',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  productController.getSummaryStats
);

// 2. Collection Operations
router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  productController.listProducts
);

router.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(createProductSchema),
  productController.createProduct
);

// 3. Single Resource Operations
router.get(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  productController.getProduct
);

router.patch(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(updateProductSchema),
  productController.updateProduct
);

router.patch(
  '/:id/status',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(updateProductStatusSchema),
  productController.updateProductStatus
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  productController.deleteProduct
);

export default router;

import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import {
  stockReceiptSchema,
  stockAdjustmentSchema,
} from '../schemas/product.schema.js';

const router = Router();

// 1. Audit Stock Ledger Movements
router.get(
  '/movements',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  inventoryController.listMovements
);

// 2. Product Batches
router.get(
  '/products/:productId/batches',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  inventoryController.getProductBatches
);

// 3. Inward Stock Receipt
router.post(
  '/receipts',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(stockReceiptSchema),
  inventoryController.receiveStock
);

// 4. Stock Adjustment
router.post(
  '/adjustments',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(stockAdjustmentSchema),
  inventoryController.adjustStock
);

export default router;

import { Router } from 'express';
import { orderController } from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { requireShopOrderOwnership } from '../middleware/ownership.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { updateOrderStatusSchema } from '../schemas/order.schema.js';

const router = Router();

router.get(
  '/:orderId',
  authenticate,
  authorizeRoles('SHOP', 'ADMIN', 'DRIVER'),
  requireShopOrderOwnership,
  orderController.getOrder
);

router.patch(
  '/:orderId/status',
  authenticate,
  authorizeRoles('SHOP', 'ADMIN'),
  requireShopOrderOwnership,
  validateRequest(updateOrderStatusSchema),
  orderController.updateStatus
);

export default router;

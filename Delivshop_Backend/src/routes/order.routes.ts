import { Router } from 'express';
import { orderController } from '../controllers/order.controller.js';
import { deliveryController } from '../controllers/delivery.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { requireShopOrderOwnership } from '../middleware/ownership.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { updateOrderStatusSchema } from '../schemas/order.schema.js';

const router = Router();

router.get(
  '/:orderId',
  authenticate,
  authorizeRoles('SHOP', 'ADMIN', 'DRIVER', 'SUPPLIER'),
  requireShopOrderOwnership,
  orderController.getOrder
);

router.patch(
  '/:orderId/status',
  authenticate,
  authorizeRoles('SHOP', 'ADMIN', 'SUPPLIER'),
  requireShopOrderOwnership,
  validateRequest(updateOrderStatusSchema),
  orderController.updateStatus
);

router.post(
  '/:orderId/assign-driver',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN'),
  (req, res, next) => {
    req.body.orderId = req.params.orderId;
    return deliveryController.assignDriver(req, res, next);
  }
);

export default router;

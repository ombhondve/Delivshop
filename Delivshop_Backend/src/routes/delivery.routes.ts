import { Router } from 'express';
import { deliveryController } from '../controllers/delivery.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { requireDriverDeliveryAssignment } from '../middleware/ownership.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { updateDeliveryStatusSchema } from '../schemas/delivery.schema.js';

const router = Router();

// Driver only can retrieve their assigned deliveries
router.get(
  '/assigned',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN'),
  deliveryController.getAssignedDeliveries
);

router.get(
  '/:deliveryId',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN', 'SHOP'),
  requireDriverDeliveryAssignment,
  deliveryController.getDelivery
);

router.patch(
  '/:deliveryId/status',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN'),
  requireDriverDeliveryAssignment,
  validateRequest(updateDeliveryStatusSchema),
  deliveryController.updateStatus
);

export default router;

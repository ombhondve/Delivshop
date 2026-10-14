import { Router } from 'express';
import { deliveryController } from '../controllers/delivery.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { requireDriverDeliveryAssignment } from '../middleware/ownership.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { updateDeliveryStatusSchema } from '../schemas/delivery.schema.js';

const router = Router();

// Driver delivery routes
router.get(
  '/assigned',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN'),
  deliveryController.getAssignedDeliveries
);

// Supplier / Admin driver assignment & management routes
router.get(
  '/drivers',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN'),
  deliveryController.listDrivers
);

router.post(
  '/assign',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN'),
  deliveryController.assignDriver
);

router.get(
  '/:deliveryId',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN', 'SHOP', 'SUPPLIER'),
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

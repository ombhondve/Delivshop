import { Router } from 'express';
import { deliveryController } from '../controllers/delivery.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { requireDriverDeliveryAssignment } from '../middleware/ownership.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import {
  updateDeliveryStatusSchema,
  createDriverSchema,
  updateDriverSchema,
  assignVehicleSchema,
  resetDriverPasswordSchema,
} from '../schemas/delivery.schema.js';

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

router.get(
  '/drivers/all',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN'),
  deliveryController.listAllDrivers
);

router.get(
  '/drivers/summary',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN'),
  deliveryController.getRosterSummary
);

router.post(
  '/drivers',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(createDriverSchema),
  deliveryController.createDriver
);

router.get(
  '/drivers/:id',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN', 'DRIVER'),
  deliveryController.getDriver
);

router.put(
  '/drivers/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(updateDriverSchema),
  deliveryController.updateDriver
);

router.patch(
  '/drivers/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(updateDriverSchema),
  deliveryController.updateDriver
);

router.patch(
  '/drivers/:id/status',
  authenticate,
  authorizeRoles('ADMIN'),
  deliveryController.updateDriverStatus
);

router.patch(
  '/drivers/:id/vehicle',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(assignVehicleSchema),
  deliveryController.assignVehicle
);

router.post(
  '/drivers/:id/reset-password',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(resetDriverPasswordSchema),
  deliveryController.resetDriverPassword
);

router.get(
  '/drivers/:id/deliveries',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN', 'DRIVER'),
  deliveryController.getDriverDeliveries
);

router.delete(
  '/drivers/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  deliveryController.deleteDriver
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

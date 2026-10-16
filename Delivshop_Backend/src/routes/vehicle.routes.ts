import { Router } from 'express';
import { vehicleController } from '../controllers/vehicle.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import {
  createVehicleSchema,
  updateVehicleSchema,
  updateVehicleStatusSchema,
  upsertVehicleDocumentSchema,
  addVehicleMaintenanceSchema,
} from '../schemas/vehicle.schema.js';

const router = Router();

// Summary & list endpoints
router.get(
  '/summary',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  vehicleController.getSummary
);

router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER', 'DRIVER'),
  vehicleController.listVehicles
);

// Create new vehicle
router.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(createVehicleSchema),
  vehicleController.createVehicle
);

// Individual vehicle details
router.get(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER', 'DRIVER'),
  vehicleController.getVehicle
);

// Update vehicle specifications
router.put(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(updateVehicleSchema),
  vehicleController.updateVehicle
);

router.patch(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(updateVehicleSchema),
  vehicleController.updateVehicle
);

// Update vehicle operational status
router.patch(
  '/:id/status',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  validateRequest(updateVehicleStatusSchema),
  vehicleController.updateStatus
);

// Upsert/verify vehicle document
router.post(
  '/:id/documents',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(upsertVehicleDocumentSchema),
  vehicleController.upsertDocument
);

// Add maintenance record
router.post(
  '/:id/maintenance',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(addVehicleMaintenanceSchema),
  vehicleController.addMaintenance
);

// Deactivation-first safe delete
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  vehicleController.deleteVehicle
);

export default router;

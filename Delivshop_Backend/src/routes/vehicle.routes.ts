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
  listVehiclesQuerySchema,
} from '../schemas/vehicle.schema.js';

const router = Router();

// Summary & fleet metrics
router.get(
  '/summary',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  vehicleController.getSummary
);

// CSV Export (Must be declared before :id route)
router.get(
  '/export',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  vehicleController.exportVehicles
);

// List vehicles with search, filtering, and pagination
router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER', 'DRIVER'),
  validateRequest(listVehiclesQuerySchema),
  vehicleController.listVehicles
);

// Create new vehicle asset
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

// Dispatch eligibility check
router.get(
  '/:id/dispatch-eligibility',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  vehicleController.checkDispatchEligibility
);

// Activity audit history
router.get(
  '/:id/activity',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  vehicleController.getActivityHistory
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

// Upsert/verify vehicle document (supports base64 file upload)
router.post(
  '/:id/documents',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(upsertVehicleDocumentSchema),
  vehicleController.upsertDocument
);

// Stream authenticated private vehicle document download
router.get(
  '/:id/documents/:docId/download',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER', 'DRIVER'),
  vehicleController.downloadDocument
);

// Delete vehicle document
router.delete(
  '/:id/documents/:docId',
  authenticate,
  authorizeRoles('ADMIN'),
  vehicleController.deleteDocument
);

// Add maintenance service log
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

import { Router } from 'express';
import { assignmentController } from '../controllers/assignment.controller.js';
import { schedulingController } from '../controllers/scheduling.controller.js';
import { pickupController } from '../controllers/pickup.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import {
  validateAssignmentSchema,
  createAssignmentSchema,
  updateAssignmentStatusSchema,
  updateRunStopStatusSchema,
  deleteAssignmentSchema,
} from '../schemas/assignment.schema.js';

const router = Router();

router.get(
  '/summary',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  assignmentController.getSummary
);

router.post(
  '/validate',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  validateRequest(validateAssignmentSchema),
  assignmentController.validateConstraints
);

router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER', 'DRIVER'),
  assignmentController.listAssignments
);

router.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  validateRequest(createAssignmentSchema),
  assignmentController.createAssignment
);

router.get(
  '/:id/dependencies',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  assignmentController.getDependencies
);

router.get(
  '/:id/pickup-requirements',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER', 'DRIVER'),
  pickupController.getRunPickupRequirements
);

router.get(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER', 'DRIVER'),
  assignmentController.getAssignment
);

router.patch(
  '/:id/status',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER', 'DRIVER'),
  validateRequest(updateAssignmentStatusSchema),
  assignmentController.updateStatus
);

router.patch(
  '/:id/stops/:sequence/status',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER', 'DRIVER'),
  validateRequest(updateRunStopStatusSchema),
  assignmentController.updateStopStatus
);

router.post(
  '/:id/publish',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  schedulingController.publishRun
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  validateRequest(deleteAssignmentSchema),
  assignmentController.deleteAssignment
);

export default router;


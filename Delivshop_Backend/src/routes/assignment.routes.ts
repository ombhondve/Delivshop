import { Router } from 'express';
import { assignmentController } from '../controllers/assignment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import {
  validateAssignmentSchema,
  createAssignmentSchema,
  updateAssignmentStatusSchema,
  updateRunStopStatusSchema,
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

export default router;

import { Router } from 'express';
import { collectionController } from '../controllers/collection.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import {
  createCollectionSchema,
  reconcileCollectionSchema,
} from '../schemas/delivery.schema.js';

const router = Router();

router.post(
  '/',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN', 'SUPPLIER'),
  validateRequest(createCollectionSchema),
  collectionController.recordCollection
);

router.get(
  '/',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN', 'SUPPLIER'),
  collectionController.listCollections
);

router.get(
  '/summary',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN', 'SUPPLIER'),
  collectionController.getSummary
);

router.patch(
  '/:id/reconcile',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  validateRequest(reconcileCollectionSchema),
  collectionController.reconcile
);

export default router;

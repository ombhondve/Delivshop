import { Router } from 'express';
import { routeController } from '../controllers/route.controller.js';
import { pickupController } from '../controllers/pickup.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import {
  createRouteSchema,
  updateRouteSchema,
  updateRouteStopsSchema,
  routeIdParamSchema,
} from '../schemas/route.schema.js';

const router = Router();

router.get(
  '/summary',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  routeController.getSummary
);

router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER', 'DRIVER'),
  routeController.listRoutes
);

router.get(
  '/routing/metrics',
  authenticate,
  authorizeRoles('ADMIN'),
  routeController.getRoutingMetrics
);

router.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(createRouteSchema),
  routeController.createRoute
);

router.get(
  '/:id/pickup-requirements',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  validateRequest(routeIdParamSchema),
  pickupController.getRoutePickupRequirements
);

router.get(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER', 'DRIVER'),
  validateRequest(routeIdParamSchema),
  routeController.getRoute
);

router.put(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(updateRouteSchema),
  routeController.updateRoute
);

router.patch(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(updateRouteSchema),
  routeController.updateRoute
);

router.post(
  '/:id/publish',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(routeIdParamSchema),
  routeController.publishRoute
);

router.put(
  '/:id/stops',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(updateRouteStopsSchema),
  routeController.updateStops
);

router.post(
  '/:id/recalculate-distance',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  validateRequest(routeIdParamSchema),
  routeController.recalculateDistance
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(routeIdParamSchema),
  routeController.deleteRoute
);

export default router;

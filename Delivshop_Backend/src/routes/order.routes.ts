import { Router } from 'express';
import { orderController } from '../controllers/order.controller.js';
import { deliveryController } from '../controllers/delivery.controller.js';
import { schedulingController } from '../controllers/scheduling.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { requireShopOrderOwnership } from '../middleware/ownership.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import {
  updateOrderStatusSchema,
  createOrderSchema,
  scheduleOrderSchema,
  rescheduleOrderSchema,
  updateSchedulingSettingsSchema,
  assignRouteSchema,
} from '../schemas/order.schema.js';

const router = Router();

router.post(
  '/',
  authenticate,
  authorizeRoles('SHOP', 'ADMIN'),
  validateRequest(createOrderSchema),
  orderController.createOrder
);

router.get(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER', 'SHOP', 'DRIVER'),
  orderController.listOrders
);

// Unscheduled Orders Queue (Admin & Supplier)
router.get(
  '/unscheduled',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  schedulingController.getUnscheduledOrders
);

// Operational Scheduling Settings
router.get(
  '/scheduling-settings',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER', 'SHOP'),
  schedulingController.getSettings
);

router.patch(
  '/scheduling-settings',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(updateSchedulingSettingsSchema),
  schedulingController.updateSettings
);

// Route-Based Delivery Availability Check
router.get(
  '/availability/:shopId',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER', 'SHOP'),
  schedulingController.getDeliveryAvailability
);

router.get(
  '/volume-summary',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  orderController.getVolumeSummary
);

router.get(
  '/volume-summary/export',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  orderController.exportVolumeSummaryCsv
);

// Shop Order Tracking Summary & Filtered Shop List
router.get(
  '/shop-tracking',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  orderController.getShopOrderTracking
);

// Individual & Bulk Reminders
router.post(
  '/reminders/send',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  orderController.sendBulkReminders
);

router.post(
  '/reminders/shop/:shopId',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  orderController.sendShopReminder
);

router.get(
  '/reminders/history/:shopId',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER', 'SHOP'),
  orderController.getReminderHistory
);

// Mobile App FCM Device Token Registration
router.post(
  '/devices/register',
  authenticate,
  authorizeRoles('SHOP', 'ADMIN'),
  orderController.registerDeviceToken
);


// Order Route Assignment Operation (Admin & Supplier)
router.post(
  '/:orderId/assign-route',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  validateRequest(assignRouteSchema),
  orderController.assignRoute
);

// Order Scheduling & Rescheduling Operations
router.post(
  '/:orderId/schedule',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  validateRequest(scheduleOrderSchema),
  schedulingController.scheduleOrder
);

router.post(
  '/:orderId/reschedule',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  validateRequest(rescheduleOrderSchema),
  schedulingController.rescheduleOrder
);

router.get(
  '/:orderId/scheduling-history',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER', 'SHOP'),
  requireShopOrderOwnership,
  schedulingController.getOrderSchedulingHistory
);

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


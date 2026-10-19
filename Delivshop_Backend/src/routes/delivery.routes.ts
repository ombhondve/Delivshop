import { Router } from 'express';
import { deliveryController } from '../controllers/delivery.controller.js';
import { attendanceController } from '../controllers/attendance.controller.js';
import { pickupController } from '../controllers/pickup.controller.js';
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
  attendanceCheckInSchema,
  attendanceCheckOutSchema,
  correctAttendanceSchema,
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

router.get(
  '/drivers/generate-employee-id',
  authenticate,
  authorizeRoles('ADMIN', 'SUPPLIER'),
  deliveryController.getNextEmployeeId
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

router.get(
  '/drivers/:id/profile',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN'),
  deliveryController.getFullProfile
);

router.get(
  '/drivers/:id/salary',
  authenticate,
  authorizeRoles('ADMIN'),
  deliveryController.getSalaryConfig
);

router.put(
  '/drivers/:id/salary',
  authenticate,
  authorizeRoles('ADMIN'),
  deliveryController.upsertSalaryConfig
);

router.get(
  '/drivers/:id/payroll',
  authenticate,
  authorizeRoles('ADMIN'),
  deliveryController.getPayrollRecords
);

router.post(
  '/drivers/:id/payroll',
  authenticate,
  authorizeRoles('ADMIN'),
  deliveryController.addPayrollRecord
);

router.get(
  '/drivers/:id/documents',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN'),
  deliveryController.getDriverDocuments
);

router.post(
  '/drivers/:id/documents',
  authenticate,
  authorizeRoles('ADMIN'),
  deliveryController.upsertDriverDocument
);

router.get(
  '/drivers/:id/documents/:docId/download',
  authenticate,
  authorizeRoles('SUPPLIER', 'ADMIN', 'DRIVER'),
  deliveryController.downloadDriverDocument
);

// Attendance routes
router.post(
  '/drivers/:id/attendance/check-in',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN'),
  validateRequest(attendanceCheckInSchema),
  attendanceController.checkIn
);

router.post(
  '/drivers/:id/attendance/check-out',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN'),
  validateRequest(attendanceCheckOutSchema),
  attendanceController.checkOut
);

router.get(
  '/drivers/:id/attendance/today',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN', 'SUPPLIER'),
  attendanceController.getToday
);

router.get(
  '/drivers/:id/attendance',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN', 'SUPPLIER'),
  attendanceController.getHistory
);

router.get(
  '/drivers/:id/attendance/summary',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN', 'SUPPLIER'),
  attendanceController.getSummary
);

router.patch(
  '/attendance/:id/correct',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(correctAttendanceSchema),
  attendanceController.correctAttendance
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

// Driver Operational Routes (Inspections, Incidents, Reconciliation)
router.post(
  '/inspection',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN'),
  deliveryController.recordVehicleInspection
);

router.get(
  '/inspection/history',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN', 'SUPPLIER'),
  deliveryController.getRecentVehicleInspections
);

router.post(
  '/incidents',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN'),
  deliveryController.recordIncident
);

router.get(
  '/incidents',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN', 'SUPPLIER'),
  deliveryController.getDriverIncidents
);

router.post(
  '/reconciliation',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN'),
  deliveryController.recordReconciliation
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

router.post(
  '/:deliveryId/complete',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN'),
  requireDriverDeliveryAssignment,
  deliveryController.completeDelivery
);

// Driver Supplier Pickup Routes
router.get(
  '/runs/:id/pickups',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN', 'SUPPLIER'),
  pickupController.getDriverPickupStops
);

router.post(
  '/runs/:id/pickups/:companyId/verify-proximity',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN'),
  pickupController.verifyProximity
);

router.post(
  '/runs/:id/pickups/:companyId/confirm',
  authenticate,
  authorizeRoles('DRIVER', 'ADMIN'),
  pickupController.confirmPickup
);

export default router;

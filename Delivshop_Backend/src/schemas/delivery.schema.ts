import { z } from 'zod';

export const updateDeliveryStatusSchema = z.object({
  params: z.object({
    deliveryId: z.string().uuid('Invalid delivery ID'),
  }),
  body: z.object({
    status: z.enum([
      'ACCEPTED',
      'EN_ROUTE_PICKUP',
      'ARRIVED_PICKUP',
      'PICKED_UP',
      'EN_ROUTE_DROPOFF',
      'DELIVERED',
      'FAILED',
    ]),
    currentLatitude: z.number().min(-90).max(90).optional(),
    currentLongitude: z.number().min(-180).max(180).optional(),
    notes: z.string().max(500).optional(),
  }),
});

export const updateDriverLocationSchema = z.object({
  body: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});

export const createDriverSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Driver name must be at least 2 characters').max(100),
    phone: z.string().min(8, 'Phone number must be at least 8 digits').max(25),
    alternatePhone: z.string().max(25).optional().or(z.literal('')),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    employeeId: z.string().min(2).max(50).optional().or(z.literal('')),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    vehicleNumber: z.string().max(50).optional().or(z.literal('')),
    vehicleType: z.string().max(100).optional().or(z.literal('')),
    assignedRoute: z.string().max(255).optional().or(z.literal('')),
    licenseNumber: z.string().max(100).optional().or(z.literal('')),
    licenseExpiry: z.string().optional().or(z.literal('')),
    licenseClass: z.string().max(50).optional().or(z.literal('')),
    joiningDate: z.string().optional().or(z.literal('')),
    emergencyContact: z.string().max(100).optional().or(z.literal('')),
    emergencyContactName: z.string().max(100).optional().or(z.literal('')),
    emergencyContactPhone: z.string().max(25).optional().or(z.literal('')),
    emergencyContactRelation: z.string().max(50).optional().or(z.literal('')),
    address: z.string().max(255).optional().or(z.literal('')),
    city: z.string().max(100).optional().or(z.literal('')),
    state: z.string().max(100).optional().or(z.literal('')),
    pincode: z.string().max(10).optional().or(z.literal('')),
    dateOfBirth: z.string().optional().or(z.literal('')),
    gender: z.string().max(20).optional().or(z.literal('')),
    employmentStatus: z.enum(['ACTIVE', 'PROBATION', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']).optional(),
    accountStatus: z.enum(['PENDING', 'ACTIVE', 'LOCKED', 'DEACTIVATED']).optional(),
    notes: z.string().max(1000).optional().or(z.literal('')),
  }),
});

export const updateDriverSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid driver ID'),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().min(8).max(25).optional(),
    alternatePhone: z.string().max(25).optional().nullable(),
    email: z.string().email().optional().or(z.literal('')),
    employeeId: z.string().min(2).max(50).optional(),
    vehicleNumber: z.string().max(50).optional().nullable(),
    vehicleType: z.string().max(100).optional().nullable(),
    assignedRoute: z.string().max(255).optional().nullable(),
    licenseNumber: z.string().max(100).optional().nullable(),
    licenseExpiry: z.string().optional().nullable(),
    licenseClass: z.string().max(50).optional().nullable(),
    joiningDate: z.string().optional().nullable(),
    emergencyContact: z.string().max(100).optional().nullable(),
    emergencyContactName: z.string().max(100).optional().nullable(),
    emergencyContactPhone: z.string().max(25).optional().nullable(),
    emergencyContactRelation: z.string().max(50).optional().nullable(),
    address: z.string().max(255).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    pincode: z.string().max(10).optional().nullable(),
    dateOfBirth: z.string().optional().nullable(),
    gender: z.string().max(20).optional().nullable(),
    employmentStatus: z.enum(['ACTIVE', 'PROBATION', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']).optional(),
    accountStatus: z.enum(['PENDING', 'ACTIVE', 'LOCKED', 'DEACTIVATED']).optional(),
    notes: z.string().max(1000).optional().nullable(),
  }),
});

export const attendanceCheckInSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid driver ID'),
  }),
  body: z.object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    notes: z.string().max(500).optional(),
  }),
});

export const attendanceCheckOutSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid driver ID'),
  }),
  body: z.object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    notes: z.string().max(500).optional(),
  }),
});

export const correctAttendanceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attendance ID'),
  }),
  body: z.object({
    checkInTime: z.string().optional(),
    checkOutTime: z.string().optional(),
    status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE']).optional(),
    reason: z.string().min(5, 'Correction reason must be at least 5 characters').max(500),
  }),
});

export const createCollectionSchema = z.object({
  body: z.object({
    runId: z.string().uuid('Invalid delivery run ID'),
    shopId: z.string().uuid('Invalid shop ID'),
    amount: z.number().positive('Collection amount must be positive'),
    paymentMethod: z.enum(['CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER']),
    transactionReference: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
  }),
});

export const reconcileCollectionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid collection ID'),
  }),
  body: z.object({
    status: z.enum(['RECONCILED', 'DEPOSITED']).default('RECONCILED'),
  }),
});

export const assignVehicleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid driver ID'),
  }),
  body: z.object({
    vehicleNumber: z.string().min(2, 'Vehicle registration number is required').max(50),
    vehicleType: z.string().max(100).optional().nullable(),
    assignedRoute: z.string().max(255).optional().nullable(),
  }),
});

export const resetDriverPasswordSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid driver ID'),
  }),
  body: z.object({
    password: z.string().min(8, 'Password must be at least 8 characters long'),
  }),
});

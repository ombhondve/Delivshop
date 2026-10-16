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
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    employeeId: z.string().min(2).max(50).optional().or(z.literal('')),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    vehicleNumber: z.string().max(50).optional().or(z.literal('')),
    vehicleType: z.string().max(100).optional().or(z.literal('')),
    assignedRoute: z.string().max(255).optional().or(z.literal('')),
    licenseNumber: z.string().max(100).optional().or(z.literal('')),
    licenseExpiry: z.string().optional().or(z.literal('')),
    joiningDate: z.string().optional().or(z.literal('')),
    emergencyContact: z.string().max(100).optional().or(z.literal('')),
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
    email: z.string().email().optional().or(z.literal('')),
    employeeId: z.string().min(2).max(50).optional(),
    vehicleNumber: z.string().max(50).optional().nullable(),
    vehicleType: z.string().max(100).optional().nullable(),
    assignedRoute: z.string().max(255).optional().nullable(),
    licenseNumber: z.string().max(100).optional().nullable(),
    licenseExpiry: z.string().optional().nullable(),
    joiningDate: z.string().optional().nullable(),
    emergencyContact: z.string().max(100).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
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

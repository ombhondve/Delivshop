import { z } from 'zod';

export const createVehicleSchema = z.object({
  body: z.object({
    registrationNumber: z
      .string()
      .trim()
      .min(3, 'Registration number must be at least 3 characters')
      .max(50, 'Registration number exceeds 50 characters')
      .regex(/^[A-Z0-9 -]+$/i, 'Invalid registration number format (e.g. MH-12-DV-4421)'),
    makeModel: z.string().trim().min(2, 'Make/model is required').max(100),
    vehicleType: z.string().trim().min(2, 'Vehicle type is required').max(100),
    capacityKg: z.number().positive('Capacity must be greater than 0').default(1000),
    capacityCrates: z.number().int().min(0, 'Capacity crates cannot be negative').default(60),
    fuelType: z.enum(['DIESEL', 'ELECTRIC', 'CNG', 'PETROL']).default('DIESEL'),
    isRefrigerated: z.boolean().default(false),
    depot: z.string().trim().max(150).optional().default('Pune Central Cold Depot'),
    status: z.enum(['AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'INACTIVE']).default('AVAILABLE'),
    currentOdometerKm: z.number().int().min(0).default(0),
    notes: z.string().trim().max(1000).optional().nullable(),
  }),
});

export const updateVehicleSchema = z.object({
  body: z.object({
    registrationNumber: z.string().trim().min(3).max(50).optional(),
    makeModel: z.string().trim().min(2).max(100).optional(),
    vehicleType: z.string().trim().min(2).max(100).optional(),
    capacityKg: z.number().positive().optional(),
    capacityCrates: z.number().int().min(0).optional(),
    fuelType: z.enum(['DIESEL', 'ELECTRIC', 'CNG', 'PETROL']).optional(),
    isRefrigerated: z.boolean().optional(),
    depot: z.string().trim().max(150).optional(),
    status: z.enum(['AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'INACTIVE']).optional(),
    currentOdometerKm: z.number().int().min(0).optional(),
    notes: z.string().trim().max(1000).optional().nullable(),
  }),
});

export const updateVehicleStatusSchema = z.object({
  body: z.object({
    status: z.enum(['AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'INACTIVE']),
    notes: z.string().trim().max(500).optional(),
  }),
});

export const upsertVehicleDocumentSchema = z.object({
  body: z.object({
    documentType: z.enum(['RC', 'INSURANCE', 'PUC', 'FITNESS', 'PERMIT']),
    documentNumber: z.string().trim().min(2, 'Document number is required').max(100),
    issueDate: z.string().optional().nullable(),
    expiryDate: z.string().optional().nullable(),
    verificationStatus: z.enum(['VALID', 'EXPIRING', 'EXPIRED', 'PENDING', 'REJECTED']).default('VALID'),
    fileUrl: z.string().trim().url().optional().nullable().or(z.literal('')),
    notes: z.string().trim().max(500).optional().nullable(),
  }),
});

export const addVehicleMaintenanceSchema = z.object({
  body: z.object({
    serviceDate: z.string().optional(),
    serviceType: z.string().trim().min(2, 'Service type is required').max(100),
    odometerKm: z.number().int().min(0, 'Odometer cannot be negative'),
    cost: z.number().min(0, 'Cost cannot be negative').default(0),
    serviceCenter: z.string().trim().max(200).optional().nullable(),
    description: z.string().trim().max(1000).optional().nullable(),
    nextServiceDate: z.string().optional().nullable(),
  }),
});

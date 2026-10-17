import { z } from 'zod';

export const createVehicleSchema = z.object({
  body: z.object({
    registrationNumber: z
      .string()
      .trim()
      .min(3, 'Registration number must be at least 3 characters')
      .max(50, 'Registration number exceeds 50 characters')
      .regex(/^[A-Z0-9 -]+$/i, 'Invalid registration number format (e.g. MH-12-DV-4421)')
      .transform((val) => val.toUpperCase()),
    makeModel: z.string().trim().min(2, 'Make and model are required').max(100),
    vehicleType: z.string().trim().min(2, 'Vehicle type is required').max(100),
    capacityKg: z.number().positive('Capacity must be greater than 0').default(1000),
    capacityCrates: z.number().int().min(0, 'Capacity crates cannot be negative').default(60),
    fuelType: z.enum(['DIESEL', 'ELECTRIC', 'CNG', 'PETROL']).default('DIESEL'),
    isRefrigerated: z.boolean().default(false),
    nickname: z.string().trim().max(100).optional().nullable(),
    manufacturingYear: z
      .number()
      .int()
      .min(1990, 'Year must be 1990 or newer')
      .max(2100, 'Invalid year')
      .optional()
      .nullable(),
    temperatureMinC: z.number().min(-50).max(50).optional().nullable(),
    temperatureMaxC: z.number().min(-50).max(50).optional().nullable(),
    depot: z.string().trim().max(150).optional().default('Pune Central Cold Depot'),
    city: z.string().trim().max(100).optional().nullable().default('Pune'),
    state: z.string().trim().max(100).optional().nullable().default('Maharashtra'),
    status: z.enum(['AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'INACTIVE']).default('AVAILABLE'),
    currentOdometerKm: z.number().int().min(0, 'Odometer cannot be negative').default(0),
    notes: z.string().trim().max(1000).optional().nullable(),
  }),
});

export const updateVehicleSchema = z.object({
  body: z.object({
    registrationNumber: z
      .string()
      .trim()
      .min(3)
      .max(50)
      .regex(/^[A-Z0-9 -]+$/i, 'Invalid registration number format')
      .transform((val) => val.toUpperCase())
      .optional(),
    makeModel: z.string().trim().min(2).max(100).optional(),
    vehicleType: z.string().trim().min(2).max(100).optional(),
    capacityKg: z.number().positive().optional(),
    capacityCrates: z.number().int().min(0).optional(),
    fuelType: z.enum(['DIESEL', 'ELECTRIC', 'CNG', 'PETROL']).optional(),
    isRefrigerated: z.boolean().optional(),
    nickname: z.string().trim().max(100).optional().nullable(),
    manufacturingYear: z
      .number()
      .int()
      .min(1990)
      .max(2100)
      .optional()
      .nullable(),
    temperatureMinC: z.number().min(-50).max(50).optional().nullable(),
    temperatureMaxC: z.number().min(-50).max(50).optional().nullable(),
    depot: z.string().trim().max(150).optional(),
    city: z.string().trim().max(100).optional().nullable(),
    state: z.string().trim().max(100).optional().nullable(),
    status: z.enum(['AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'INACTIVE']).optional(),
    currentOdometerKm: z.number().int().min(0).optional(),
    notes: z.string().trim().max(1000).optional().nullable(),
  }),
});

export const updateVehicleStatusSchema = z.object({
  body: z.object({
    status: z.enum(['AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'INACTIVE']),
    notes: z.string().trim().max(500).optional().nullable(),
  }),
});

export const upsertVehicleDocumentSchema = z.object({
  body: z.object({
    documentType: z.enum([
      'RC',
      'INSURANCE',
      'PUC',
      'FITNESS',
      'PERMIT',
      'TEMPERATURE_CALIBRATION',
      'OTHER',
    ]),
    documentNumber: z.string().trim().min(2, 'Document reference number is required').max(100),
    issueDate: z.string().optional().nullable(),
    expiryDate: z.string().optional().nullable(),
    verificationStatus: z.enum(['VALID', 'EXPIRING', 'EXPIRED', 'PENDING', 'REJECTED']).default('VALID'),
    fileUrl: z.string().trim().optional().nullable().or(z.literal('')),
    fileName: z.string().trim().max(255).optional().nullable(),
    fileData: z.string().optional().nullable(), // Base64 uploaded document
    mimeType: z.string().trim().optional().nullable(),
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

export const listVehiclesQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    vehicleType: z.string().optional(),
    depot: z.string().optional(),
    city: z.string().optional(),
    compliance: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['ASC', 'DESC']).optional(),
  }).optional(),
});

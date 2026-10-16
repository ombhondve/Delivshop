import { z } from 'zod';

export const validateAssignmentSchema = z.object({
  body: z.object({
    driverId: z.string().uuid('Invalid driver ID'),
    vehicleId: z.string().uuid('Invalid vehicle ID'),
    routeId: z.string().uuid('Invalid route ID'),
    deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
    excludeRunId: z.string().uuid().optional(),
  }),
});

export const createAssignmentSchema = z.object({
  body: z.object({
    routeId: z.string().uuid('Invalid route ID'),
    driverId: z.string().uuid('Invalid driver ID'),
    vehicleId: z.string().uuid('Invalid vehicle ID'),
    deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
    notes: z.string().trim().max(1000).optional().nullable(),
  }),
});

export const updateAssignmentStatusSchema = z.object({
  body: z.object({
    status: z.enum(['DRAFT', 'VALIDATED', 'ASSIGNED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    notes: z.string().trim().max(500).optional(),
  }),
});

export const updateRunStopStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'ARRIVED', 'DELIVERED', 'FAILED', 'SKIPPED']),
    notes: z.string().trim().max(500).optional(),
    proofOfDeliveryUrl: z.string().trim().url().optional().nullable().or(z.literal('')),
    failureReason: z.string().trim().max(500).optional(),
  }),
});

import { z } from 'zod';

export const createRouteSchema = z.object({
  body: z.object({
    routeCode: z.string().trim().max(50).optional(),
    name: z.string().trim().min(3, 'Route name must be at least 3 characters').max(255),
    city: z.string().trim().max(100).default('Pune'),
    state: z.string().trim().max(100).default('Maharashtra'),
    depot: z.string().trim().max(150).default('Pune Central Cold Depot'),
    description: z.string().trim().max(1000).optional().nullable(),
    status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']).default('DRAFT'),
    totalDistanceKm: z.number().min(0).optional(),
    estimatedDurationMinutes: z.number().int().min(0).optional(),
    stops: z
      .array(
        z.object({
          shopId: z.string().uuid('Invalid shop identifier'),
          stopSequence: z.number().int().positive(),
          plannedArrivalTime: z.string().optional().nullable(),
          serviceTimeMinutes: z.number().int().min(1).default(10),
          deliveryInstructions: z.string().trim().max(500).optional().nullable(),
        })
      )
      .optional(),
  }),
});

export const updateRouteSchema = z.object({
  body: z.object({
    name: z.string().trim().min(3).max(255).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    depot: z.string().trim().max(150).optional(),
    description: z.string().trim().max(1000).optional().nullable(),
    status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']).optional(),
    totalDistanceKm: z.number().min(0).optional(),
    estimatedDurationMinutes: z.number().int().min(0).optional(),
  }),
});

export const updateRouteStopsSchema = z.object({
  body: z.object({
    stops: z.array(
      z.object({
        shopId: z.string().uuid('Invalid shop identifier'),
        stopSequence: z.number().int().positive(),
        plannedArrivalTime: z.string().optional().nullable(),
        serviceTimeMinutes: z.number().int().min(1).default(10),
        deliveryInstructions: z.string().trim().max(500).optional().nullable(),
      })
    ),
    changesSummary: z.string().trim().max(500).optional(),
  }),
});

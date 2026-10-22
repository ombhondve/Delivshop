import { z } from 'zod';

export const routeIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid route identifier UUID format'),
  }),
});

export const locationCoordinateSchema = z.object({
  name: z.string().trim().max(255).optional().nullable(),
  latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
  address: z.string().trim().max(1000).optional().nullable(),
  placeId: z.string().trim().max(255).optional().nullable(),
});

export const createRouteSchema = z.object({
  body: z.object({
    routeCode: z.string().trim().max(50).optional(),
    name: z.string().trim().min(3, 'Route name must be at least 3 characters').max(255),
    city: z.string().trim().max(100).default('Pune'),
    state: z.string().trim().max(100).default('Maharashtra'),
    depot: z.string().trim().max(150).default('Pune Central Cold Depot'),
    description: z.string().trim().max(1000).optional().nullable(),
    startLocation: locationCoordinateSchema.optional(),
    returnLocation: locationCoordinateSchema.optional(),
    startLocationName: z.string().trim().max(255).optional().nullable(),
    startLatitude: z.number().min(-90).max(90).optional().nullable(),
    startLongitude: z.number().min(-180).max(180).optional().nullable(),
    startAddress: z.string().trim().max(1000).optional().nullable(),
    returnLocationName: z.string().trim().max(255).optional().nullable(),
    returnLatitude: z.number().min(-90).max(90).optional().nullable(),
    returnLongitude: z.number().min(-180).max(180).optional().nullable(),
    returnAddress: z.string().trim().max(1000).optional().nullable(),
    status: z
      .enum(['DRAFT', 'ACTIVE', 'PUBLISHED', 'INACTIVE', 'ARCHIVED'], {
        errorMap: () => ({
          message: 'Status must be one of: DRAFT, ACTIVE, PUBLISHED, INACTIVE, ARCHIVED',
        }),
      })
      .default('DRAFT'),
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
  params: z
    .object({
      id: z.string().uuid('Invalid route identifier UUID format').optional(),
    })
    .optional(),
  body: z.object({
    name: z.string().trim().min(3).max(255).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    depot: z.string().trim().max(150).optional(),
    description: z.string().trim().max(1000).optional().nullable(),
    startLocation: locationCoordinateSchema.optional(),
    returnLocation: locationCoordinateSchema.optional(),
    startLocationName: z.string().trim().max(255).optional().nullable(),
    startLatitude: z.number().min(-90).max(90).optional().nullable(),
    startLongitude: z.number().min(-180).max(180).optional().nullable(),
    startAddress: z.string().trim().max(1000).optional().nullable(),
    returnLocationName: z.string().trim().max(255).optional().nullable(),
    returnLatitude: z.number().min(-90).max(90).optional().nullable(),
    returnLongitude: z.number().min(-180).max(180).optional().nullable(),
    returnAddress: z.string().trim().max(1000).optional().nullable(),
    status: z
      .enum(['DRAFT', 'ACTIVE', 'PUBLISHED', 'INACTIVE', 'ARCHIVED'], {
        errorMap: () => ({
          message: 'Status must be one of: DRAFT, ACTIVE, PUBLISHED, INACTIVE, ARCHIVED',
        }),
      })
      .optional(),
    totalDistanceKm: z.number().min(0).optional(),
    estimatedDurationMinutes: z.number().int().min(0).optional(),
  }),
});

export const updateRouteStopsSchema = z.object({
  params: z
    .object({
      id: z.string().uuid('Invalid route identifier UUID format').optional(),
    })
    .optional(),
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


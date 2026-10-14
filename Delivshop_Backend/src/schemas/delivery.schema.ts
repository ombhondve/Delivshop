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

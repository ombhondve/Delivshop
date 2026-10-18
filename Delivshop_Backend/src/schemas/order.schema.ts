import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    shopId: z.string().uuid('Invalid shop ID format'),
    items: z
      .array(
        z.object({
          productId: z.string().uuid('Invalid product ID format'),
          quantity: z.number().int().positive('Quantity must be greater than zero'),
        })
      )
      .min(1, 'Order must contain at least one item'),
    deliveryAddress: z.object({
      street: z.string().min(5),
      city: z.string().min(2),
      postalCode: z.string().min(3),
      notes: z.string().optional(),
    }),
    requestedDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
    deliveryRunId: z.string().uuid('Invalid delivery run ID').optional(),
    deliveryWindow: z.string().optional(),
  }),
});

export const updateOrderStatusSchema = z.object({
  params: z.object({
    orderId: z.string().uuid('Invalid order ID'),
  }),
  body: z.object({
    status: z.enum([
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'READY_FOR_PICKUP',
      'IN_TRANSIT',
      'DELIVERED',
      'CANCELLED',
    ]),
  }),
});

export const scheduleOrderSchema = z.object({
  params: z.object({
    orderId: z.string().uuid('Invalid order ID'),
  }),
  body: z.object({
    deliveryRunId: z.string().uuid('Invalid delivery run ID'),
    confirmedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
    deliveryWindow: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const rescheduleOrderSchema = z.object({
  params: z.object({
    orderId: z.string().uuid('Invalid order ID'),
  }),
  body: z.object({
    newDeliveryRunId: z.string().uuid('Invalid delivery run ID'),
    reason: z.string().min(3, 'Reschedule reason is required'),
    notes: z.string().optional(),
  }),
});

export const updateSchedulingSettingsSchema = z.object({
  body: z.object({
    orderCutoffTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Cutoff time must be HH:MM format').optional(),
    minLeadDays: z.number().int().min(0).optional(),
    maxAdvanceBookingDays: z.number().int().min(1).max(30).optional(),
    defaultDeliveryWindow: z.string().min(3).optional(),
    allowOrderingWithoutPublishedRun: z.boolean().optional(),
    operatingDays: z.array(z.number().int().min(1).max(7)).optional(),
    holidays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  }),
});


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

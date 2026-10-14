import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(255),
    description: z.string().max(1000).optional(),
    sku: z.string().min(3).max(100),
    price: z.number().positive('Price must be greater than zero'),
    stockQuantity: z.number().int().nonnegative('Stock cannot be negative'),
    category: z.string().min(2).max(100),
  }),
});

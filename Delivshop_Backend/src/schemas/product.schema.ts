import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    companyId: z.string().uuid({ message: 'A valid supplier company ID is required' }),
    name: z
      .string()
      .trim()
      .min(2, { message: 'Product name must be at least 2 characters' })
      .max(255, { message: 'Product name cannot exceed 255 characters' }),
    sku: z
      .string()
      .trim()
      .min(2, { message: 'SKU must be at least 2 characters' })
      .max(100, { message: 'SKU cannot exceed 100 characters' })
      .regex(/^[A-Za-z0-9\-_.]+$/, { message: 'SKU must only contain alphanumeric characters, hyphens, and dots' })
      .optional()
      .or(z.literal(''))
      .nullable(),
    category: z
      .string()
      .trim()
      .min(2, { message: 'Category must be at least 2 characters' })
      .max(100, { message: 'Category cannot exceed 100 characters' }),
    description: z.string().max(2000).optional().or(z.literal('')).nullable(),
    brand: z.string().max(100).optional().or(z.literal('')).nullable(),
    imageUrl: z.string().url({ message: 'Image URL must be a valid URL' }).optional().or(z.literal('')).nullable(),
    isActive: z.boolean().default(true),
    baseUnit: z
      .string()
      .trim()
      .min(1, { message: 'Base unit is required (e.g. Litre, ml, kg, g, Piece, Pack, Carton, Crate)' })
      .max(50),
    packSize: z
      .string()
      .trim()
      .min(1, { message: 'Pack size description is required (e.g. 1000 ml Pouch, 500 g Tub)' })
      .max(100),
    unitsPerPack: z.coerce.number().positive({ message: 'Units per pack must be greater than 0' }).default(1),
    purchaseUnit: z.string().max(50).optional().or(z.literal('')).nullable(),
    sellingUnit: z.string().max(50).optional().or(z.literal('')).nullable(),
    purchaseCost: z.coerce.number().nonnegative({ message: 'Purchase cost cannot be negative' }).default(0),
    price: z.coerce.number().nonnegative({ message: 'Selling price cannot be negative' }),
    minStockThreshold: z.coerce.number().int().nonnegative({ message: 'Minimum stock threshold must be 0 or more' }).default(10),
    reorderQuantity: z.coerce.number().int().nonnegative({ message: 'Reorder quantity must be 0 or more' }).default(50),
    taxRate: z.coerce.number().min(0).max(100, { message: 'Tax rate must be between 0% and 100%' }).default(0),
    isTaxInclusive: z.boolean().default(true),
    minSellingPrice: z.coerce.number().nonnegative().optional().nullable(),
    trackInventory: z.boolean().default(true),
    trackBatches: z.boolean().default(true),
    storageTemperature: z.string().max(100).optional().or(z.literal('')).nullable(),
    shelfLifeDays: z.coerce.number().int().positive().optional().nullable(),
    fatPercentage: z.coerce.number().min(0).max(100).optional().nullable(),
    snfPercentage: z.coerce.number().min(0).max(100).optional().nullable(),
    fssaiLicense: z.string().max(100).optional().or(z.literal('')).nullable(),
    // Initial stock configuration
    initialStock: z.coerce.number().int().nonnegative().default(0),
    initialBatchNumber: z.string().max(100).optional().or(z.literal('')).nullable(),
    initialExpiryDate: z.string().optional().or(z.literal('')).nullable(),
    initialManufacturingDate: z.string().optional().or(z.literal('')).nullable(),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(255).optional(),
    companyId: z.string().uuid({ message: 'Valid supplier company ID is required' }).optional(),
    category: z.string().trim().min(2).max(100).optional(),
    description: z.string().max(2000).optional().or(z.literal('')).nullable(),
    brand: z.string().max(100).optional().or(z.literal('')).nullable(),
    imageUrl: z.string().url().optional().or(z.literal('')).nullable(),
    isActive: z.boolean().optional(),
    baseUnit: z.string().trim().min(1).max(50).optional(),
    packSize: z.string().trim().min(1).max(100).optional(),
    unitsPerPack: z.coerce.number().positive().optional(),
    purchaseUnit: z.string().max(50).optional().or(z.literal('')).nullable(),
    sellingUnit: z.string().max(50).optional().or(z.literal('')).nullable(),
    purchaseCost: z.coerce.number().nonnegative().optional(),
    price: z.coerce.number().nonnegative().optional(),
    minStockThreshold: z.coerce.number().int().nonnegative().optional(),
    reorderQuantity: z.coerce.number().int().nonnegative().optional(),
    taxRate: z.coerce.number().min(0).max(100).optional(),
    isTaxInclusive: z.boolean().optional(),
    minSellingPrice: z.coerce.number().nonnegative().optional().nullable(),
    trackInventory: z.boolean().optional(),
    trackBatches: z.boolean().optional(),
    storageTemperature: z.string().max(100).optional().or(z.literal('')).nullable(),
    shelfLifeDays: z.coerce.number().int().positive().optional().nullable(),
    fatPercentage: z.coerce.number().min(0).max(100).optional().nullable(),
    snfPercentage: z.coerce.number().min(0).max(100).optional().nullable(),
    fssaiLicense: z.string().max(100).optional().or(z.literal('')).nullable(),
  }),
});

export const updateProductStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean({ required_error: 'isActive status is required' }),
    reason: z.string().max(500).optional(),
  }),
});

export const stockReceiptSchema = z.object({
  body: z.object({
    productId: z.string().uuid({ message: 'Valid product ID is required' }),
    companyId: z.string().uuid({ message: 'Valid supplier company ID is required' }),
    quantity: z.coerce.number().int().positive({ message: 'Received quantity must be greater than zero' }),
    unitCost: z.coerce.number().nonnegative().optional(),
    batchNumber: z.string().trim().min(2).max(100).optional(),
    manufacturingDate: z.string().optional().or(z.literal('')).nullable(),
    expiryDate: z.string().min(4, { message: 'Expiry date is required for dairy receipts' }),
    referenceId: z.string().max(100).optional().or(z.literal('')).nullable(),
    notes: z.string().max(1000).optional().or(z.literal('')).nullable(),
  }),
});

export const stockAdjustmentSchema = z.object({
  body: z
    .object({
      productId: z.string().uuid({ message: 'Valid product ID is required' }),
      batchId: z.string().uuid().optional().or(z.literal('')).nullable(),
      adjustmentType: z.enum(['INCREASE', 'DECREASE', 'CORRECTION', 'DAMAGE', 'EXPIRY'], {
        errorMap: () => ({ message: 'Valid adjustment reason type is required' }),
      }),
      quantityChange: z.coerce.number().int({ message: 'Quantity change must be an integer' }),
      reason: z.string().min(3, { message: 'A specific explanation for the stock adjustment is required' }).max(500),
      referenceId: z.string().max(100).optional().or(z.literal('')).nullable(),
      notes: z.string().max(1000).optional().or(z.literal('')).nullable(),
    })
    .refine((data) => data.quantityChange !== 0, {
      message: 'Quantity change cannot be zero',
      path: ['quantityChange'],
    }),
});

import { z } from 'zod';

const INDIAN_PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const INDIAN_GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PHONE_REGEX = /^[+]?[0-9\s-]{10,15}$/;

const shopBodySchema = z
  .object({
    name: z.string().min(2, 'Shop name must be at least 2 characters').max(255),
    shopType: z.enum(['Retail Shop', 'Wholesale Shop', 'Distributor'], {
      errorMap: () => ({ message: 'Shop type must be Retail Shop, Wholesale Shop, or Distributor' }),
    }),
    ownerName: z.string().min(2, 'Owner name must be at least 2 characters').max(255),
    phone: z.string().regex(PHONE_REGEX, 'Valid mobile number with at least 10 digits is required'),
    email: z.string().email('Invalid email address format').optional().or(z.literal('')).nullable(),
    address: z.string().min(5, 'Full address must be at least 5 characters'),
    area: z.string().min(2, 'Area/Locality is required'),
    landmark: z.string().max(255).optional().or(z.literal('')).nullable(),
    city: z.string().min(2).default('Nashik'),
    state: z.string().min(2).default('Maharashtra'),
    pincode: z.string().regex(INDIAN_PINCODE_REGEX, 'PIN code must be a valid 6-digit Indian postal code'),
    latitude: z
      .number()
      .min(-90.0, 'Latitude must be between -90 and 90')
      .max(90.0, 'Latitude must be between -90 and 90')
      .optional()
      .nullable(),
    longitude: z
      .number()
      .min(-180.0, 'Longitude must be between -180 and 180')
      .max(180.0, 'Longitude must be between -180 and 180')
      .optional()
      .nullable(),
    mapLink: z.string().url('Map link must be a valid URL').optional().or(z.literal('')).nullable(),
    deliveryContactName: z.string().max(255).optional().or(z.literal('')).nullable(),
    deliveryContactPhone: z.string().regex(PHONE_REGEX, 'Invalid contact phone').optional().or(z.literal('')).nullable(),
    deliveryInstructions: z.string().max(1000).optional().or(z.literal('')).nullable(),
    deliveryWindow: z.string().max(100).optional().or(z.literal('')).nullable(),
    gstin: z
      .string()
      .toUpperCase()
      .regex(INDIAN_GSTIN_REGEX, 'Invalid GSTIN format (e.g. 27AAAAA0000A1Z5)')
      .optional()
      .or(z.literal(''))
      .nullable(),
    billingAddress: z.string().max(1000).optional().or(z.literal('')).nullable(),
    paymentTerms: z.enum(['Advance Payment', 'Credit Allowed']).default('Advance Payment'),
    creditLimit: z.number().min(0, 'Credit limit must be a non-negative amount').default(0.0),
    notes: z.string().max(2000).optional().or(z.literal('')).nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  })
  .refine(
    (data) => {
      const hasLat = data.latitude !== undefined && data.latitude !== null;
      const hasLng = data.longitude !== undefined && data.longitude !== null;
      return (hasLat && hasLng) || (!hasLat && !hasLng);
    },
    {
      message: 'Both Latitude and Longitude must be provided together',
      path: ['latitude'],
    }
  );

export const createShopSchema = z.object({
  body: shopBodySchema,
});

const updateShopBodySchema = z
  .object({
    name: z.string().min(2, 'Shop name must be at least 2 characters').max(255).optional(),
    shopType: z.enum(['Retail Shop', 'Wholesale Shop', 'Distributor'], {
      errorMap: () => ({ message: 'Shop type must be Retail Shop, Wholesale Shop, or Distributor' }),
    }).optional(),
    ownerName: z.string().min(2, 'Owner name must be at least 2 characters').max(255).optional(),
    phone: z.string().regex(PHONE_REGEX, 'Valid mobile number with at least 10 digits is required').optional(),
    email: z.string().email('Invalid email address format').optional().or(z.literal('')).nullable(),
    address: z.string().min(5, 'Full address must be at least 5 characters').optional(),
    area: z.string().min(2, 'Area/Locality is required').optional(),
    landmark: z.string().max(255).optional().or(z.literal('')).nullable(),
    city: z.string().min(2).optional(),
    state: z.string().min(2).optional(),
    pincode: z.string().regex(INDIAN_PINCODE_REGEX, 'PIN code must be a valid 6-digit Indian postal code').optional(),
    latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90').optional().nullable(),
    longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180').optional().nullable(),
    mapLink: z.string().url('Map link must be a valid URL').optional().or(z.literal('')).nullable(),
    deliveryContactName: z.string().max(255).optional().or(z.literal('')).nullable(),
    deliveryContactPhone: z.string().regex(PHONE_REGEX, 'Invalid contact phone').optional().or(z.literal('')).nullable(),
    deliveryInstructions: z.string().max(1000).optional().or(z.literal('')).nullable(),
    deliveryWindow: z.string().max(100).optional().or(z.literal('')).nullable(),
    gstin: z.string().toUpperCase().regex(INDIAN_GSTIN_REGEX, 'Invalid GSTIN format (e.g. 27AAAAA0000A1Z5)').optional().or(z.literal('')).nullable(),
    billingAddress: z.string().max(1000).optional().or(z.literal('')).nullable(),
    paymentTerms: z.enum(['Advance Payment', 'Credit Allowed'], {
      errorMap: () => ({ message: 'Payment terms must be Advance Payment or Credit Allowed' }),
    }).optional(),
    creditLimit: z.number().min(0, 'Credit limit must be a non-negative amount').optional(),
    notes: z.string().max(2000).optional().or(z.literal('')).nullable(),
    isOpen: z.boolean().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  })
  .refine(
    (data) => {
      const hasLat = data.latitude !== undefined && data.latitude !== null;
      const hasLng = data.longitude !== undefined && data.longitude !== null;
      return (hasLat && hasLng) || (!hasLat && !hasLng);
    },
    {
      message: 'Both Latitude and Longitude must be provided together',
      path: ['latitude'],
    }
  );

export const updateShopSchema = z.object({
  params: z.object({
    shopId: z.string().min(1),
  }),
  body: updateShopBodySchema,
});

export const updateShopStatusSchema = z.object({
  params: z.object({
    shopId: z.string().min(1),
  }),
  body: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE'], {
      errorMap: () => ({ message: 'Status must be ACTIVE or INACTIVE' }),
    }),
    reason: z.string().max(500).optional(),
  }),
});

export const resolveMapLinkSchema = z.object({
  body: z.object({
    mapUrl: z.string().url('A valid URL is required'),
  }),
});

export const shopLoginSchema = z.object({
  body: z.object({
    shopId: z.string().min(3, 'Shop ID or email is required').trim(),
    password: z.string().min(6, 'Password is required'),
  }),
});

export const completeSetupSchema = z.object({
  body: z.object({
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'New password must contain at least one digit')
      .regex(/[^A-Za-z0-9]/, 'New password must contain at least one special character'),
  }),
});

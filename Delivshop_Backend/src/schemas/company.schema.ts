import { z } from 'zod';

const INDIAN_PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const INDIAN_GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const INDIAN_PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const PHONE_REGEX = /^[+]?[0-9\s-]{10,15}$/;

const COMPANY_TYPES = [
  'Dairy Processor',
  'Milk Producer Cooperative',
  'Wholesale Dairy Supplier',
  'Packaging & Feed Supplier',
  'Logistics Partner',
  'Other',
] as const;

export const createCompanySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Company name must be at least 2 characters').max(255),
    companyCode: z
      .string()
      .trim()
      .max(50)
      .regex(/^[A-Z0-9_-]+$/i, 'Company code can only contain letters, numbers, hyphens, and underscores')
      .optional()
      .or(z.literal(''))
      .nullable(),
    companyType: z.enum(COMPANY_TYPES).default('Dairy Processor'),
    description: z.string().max(2000).optional().or(z.literal('')).nullable(),
    logoUrl: z.string().url('Logo must be a valid URL').optional().or(z.literal('')).nullable(),
    contactPerson: z.string().trim().min(2, 'Contact person must be at least 2 characters').max(255),
    phone: z.string().regex(PHONE_REGEX, 'Valid phone number with at least 10 digits is required'),
    email: z.string().trim().email('Invalid email address format'),
    altPhone: z.string().regex(PHONE_REGEX, 'Invalid alternative phone number').optional().or(z.literal('')).nullable(),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(INDIAN_GSTIN_REGEX, 'Invalid GSTIN format (e.g. 27AAAAA0000A1Z5)')
      .optional()
      .or(z.literal(''))
      .nullable(),
    pan: z
      .string()
      .trim()
      .toUpperCase()
      .regex(INDIAN_PAN_REGEX, 'Invalid PAN format (e.g. ABCDE1234F)')
      .optional()
      .or(z.literal(''))
      .nullable(),
    registrationNumber: z.string().trim().max(100).optional().or(z.literal('')).nullable(),
    addressLine1: z.string().trim().min(3, 'Address Line 1 is required').max(255),
    addressLine2: z.string().trim().max(255).optional().or(z.literal('')).nullable(),
    city: z.string().trim().min(2).default('Nashik'),
    state: z.string().trim().min(2).default('Maharashtra'),
    postalCode: z.string().regex(INDIAN_PINCODE_REGEX, 'PIN code must be a valid 6-digit Indian postal code'),
    country: z.string().trim().default('India'),
    notes: z.string().max(2000).optional().or(z.literal('')).nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  }),
});

export const updateCompanySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(255).optional(),
    companyType: z.enum(COMPANY_TYPES).optional(),
    description: z.string().max(2000).optional().nullable(),
    logoUrl: z.string().url().optional().nullable(),
    contactPerson: z.string().trim().min(2).max(255).optional(),
    phone: z.string().regex(PHONE_REGEX).optional(),
    email: z.string().trim().email().optional(),
    altPhone: z.string().regex(PHONE_REGEX).optional().nullable(),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(INDIAN_GSTIN_REGEX)
      .optional()
      .nullable(),
    pan: z
      .string()
      .trim()
      .toUpperCase()
      .regex(INDIAN_PAN_REGEX)
      .optional()
      .nullable(),
    registrationNumber: z.string().trim().max(100).optional().nullable(),
    addressLine1: z.string().trim().min(3).max(255).optional(),
    addressLine2: z.string().trim().max(255).optional().nullable(),
    city: z.string().trim().min(2).optional(),
    state: z.string().trim().min(2).optional(),
    postalCode: z.string().regex(INDIAN_PINCODE_REGEX).optional(),
    country: z.string().trim().optional(),
    notes: z.string().max(2000).optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

export const updateCompanyStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE'], {
      errorMap: () => ({ message: 'Status must be ACTIVE or INACTIVE' }),
    }),
    reason: z.string().max(500).optional(),
  }),
});

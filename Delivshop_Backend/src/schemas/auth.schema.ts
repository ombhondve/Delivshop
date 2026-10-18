import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').max(255),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100)
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    role: z.enum(['SUPPLIER', 'SHOP', 'DRIVER']),
    phone: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.preprocess(
    (raw: any) => {
      if (raw && typeof raw === 'object') {
        const id = raw.email ?? raw.identifier ?? raw.shopId ?? raw.username ?? raw.employeeId;
        return {
          ...raw,
          email: typeof id === 'string' ? id.trim() : id,
        };
      }
      return raw;
    },
    z.object({
      email: z
        .string({ required_error: 'Email, Shop ID, or Employee ID is required' })
        .min(2, 'Email, Shop ID, or Employee ID must be at least 2 characters')
        .max(255),
      password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
    })
  ),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

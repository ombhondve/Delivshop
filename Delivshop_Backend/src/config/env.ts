import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

// Helper to trim and convert empty or whitespace-only strings to undefined
const sanitizeString = (val: unknown): string | undefined => {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
};

// Normalize NODE_ENV
const normalizedNodeEnv = (
  sanitizeString(process.env.NODE_ENV) ||
  sanitizeString(process.env.VERCEL_ENV) ||
  'development'
).toLowerCase() as 'development' | 'production' | 'test' | 'preview' | 'staging';

const isProduction = normalizedNodeEnv === 'production';

// Resolve database URL from primary name or cloud provider aliases (e.g. Neon POSTGRES_URL)
const resolvedDbUrl =
  sanitizeString(process.env.DATABASE_URL) ||
  sanitizeString(process.env.POSTGRES_URL) ||
  sanitizeString(process.env.POSTGRES_PRISMA_URL);

// Build and validate configuration
const validationErrors: { key: string; message: string }[] = [];

if (isProduction) {
  // 1. DATABASE_URL validation in production: must be provided, non-empty, and not localhost
  if (!resolvedDbUrl) {
    validationErrors.push({
      key: 'DATABASE_URL',
      message: 'Required in production. Please set DATABASE_URL or POSTGRES_URL in Vercel environment variables.',
    });
  } else if (resolvedDbUrl.includes('localhost') || resolvedDbUrl.includes('127.0.0.1')) {
    validationErrors.push({
      key: 'DATABASE_URL',
      message: 'Cannot point to localhost in production. Please configure your Neon PostgreSQL connection string.',
    });
  }

  // 2. JWT_SECRET validation in production: must be explicitly provided and at least 32 characters
  const jwtSecret = sanitizeString(process.env.JWT_SECRET);
  if (!jwtSecret) {
    validationErrors.push({
      key: 'JWT_SECRET',
      message: 'Required in production. Please set JWT_SECRET in Vercel environment variables.',
    });
  } else if (jwtSecret.length < 32) {
    validationErrors.push({
      key: 'JWT_SECRET',
      message: `Must be at least 32 characters long in production (current length: ${jwtSecret.length}).`,
    });
  }

  // 3. JWT_REFRESH_SECRET validation in production: must be explicitly provided and at least 32 characters
  const jwtRefreshSecret = sanitizeString(process.env.JWT_REFRESH_SECRET);
  if (!jwtRefreshSecret) {
    validationErrors.push({
      key: 'JWT_REFRESH_SECRET',
      message: 'Required in production. Please set JWT_REFRESH_SECRET in Vercel environment variables.',
    });
  } else if (jwtRefreshSecret.length < 32) {
    validationErrors.push({
      key: 'JWT_REFRESH_SECRET',
      message: `Must be at least 32 characters long in production (current length: ${jwtRefreshSecret.length}).`,
    });
  }
}

export const ENV_CONFIG_ERRORS: { key: string; message: string }[] = validationErrors;

if (validationErrors.length > 0) {
  const missingKeys = validationErrors.map((e) => e.key);
  console.warn('⚠️ WARNING: Incomplete backend environment configuration:');
  console.warn(`Missing or invalid required environment variables: ${missingKeys.join(', ')}`);
  for (const err of validationErrors) {
    console.warn(` - ${err.key}: ${err.message}`);
  }
}

const envSchema = z.object({
  NODE_ENV: z.preprocess(
    (v) => (typeof v === 'string' && v.trim().length > 0 ? v.trim().toLowerCase() : normalizedNodeEnv),
    z.enum(['development', 'production', 'test', 'preview', 'staging']).default(normalizedNodeEnv)
  ),
  PORT: z.preprocess((v) => sanitizeString(v), z.coerce.number().default(5000)),
  DATABASE_URL: z.preprocess(
    (v) => sanitizeString(v) || resolvedDbUrl || 'postgresql://postgres:postgres@localhost:5432/delivshop_db',
    z.string().default('postgresql://postgres:postgres@localhost:5432/delivshop_db')
  ),
  ALLOWED_ORIGINS: z.preprocess(
    (v) => sanitizeString(v),
    z.string().default('https://delivshop.vercel.app,http://localhost:5173,http://localhost:8081,http://localhost:19006')
  ),
  JWT_SECRET: z.preprocess(
    (v) => sanitizeString(v) || 'development_jwt_secret_key_at_least_32_characters_long_123',
    z.string().min(16).default('development_jwt_secret_key_at_least_32_characters_long_123')
  ),
  JWT_REFRESH_SECRET: z.preprocess(
    (v) => sanitizeString(v) || 'development_jwt_refresh_secret_key_at_least_32_characters_123',
    z.string().min(16).default('development_jwt_refresh_secret_key_at_least_32_characters_123')
  ),
  JWT_EXPIRES_IN: z.preprocess((v) => sanitizeString(v), z.string().default('15m')),
  JWT_REFRESH_EXPIRES_IN: z.preprocess((v) => sanitizeString(v), z.string().default('7d')),
  BCRYPT_ROUNDS: z.preprocess((v) => sanitizeString(v), z.coerce.number().default(12)),
  RATE_LIMIT_WINDOW_MS: z.preprocess((v) => sanitizeString(v), z.coerce.number().default(900000)),
  RATE_LIMIT_MAX_REQUESTS: z.preprocess((v) => sanitizeString(v), z.coerce.number().default(100)),
  GOOGLE_ROUTES_API_KEY: z.preprocess(
    (v) => sanitizeString(v) || sanitizeString(process.env.GOOGLE_MAPS_API_KEY) || sanitizeString(process.env.VITE_GOOGLE_MAPS_API_KEY),
    z.string().optional()
  ),
});

const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  console.warn('⚠️ Environment schema parsing warnings:', parsedEnv.error.format());
  for (const issue of parsedEnv.error.issues) {
    validationErrors.push({
      key: issue.path.join('.'),
      message: issue.message,
    });
  }
}

export const ENV = parsedEnv.success ? parsedEnv.data : envSchema.parse({});
export const ALLOWED_ORIGIN_LIST = ENV.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

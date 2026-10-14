import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Helper to treat empty or whitespace-only strings as undefined so defaults trigger
const emptyToUndefined = (val: unknown) => {
  if (typeof val === 'string' && val.trim() === '') return undefined;
  return val;
};

// Normalize NODE_ENV string
const normalizeNodeEnv = (val: unknown) => {
  if (typeof val === 'string') {
    const trimmed = val.trim().toLowerCase();
    if (trimmed) return trimmed;
  }
  return undefined;
};

// Resolve DATABASE_URL from common provider aliases (e.g. Vercel Neon POSTGRES_URL)
const resolvedDefaultDatabaseUrl =
  (typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.trim()) ||
  (typeof process.env.POSTGRES_URL === 'string' && process.env.POSTGRES_URL.trim()) ||
  (typeof process.env.POSTGRES_PRISMA_URL === 'string' && process.env.POSTGRES_PRISMA_URL.trim()) ||
  'postgresql://postgres:postgres@localhost:5432/delivshop_db';

const envSchema = z.object({
  NODE_ENV: z.preprocess(
    normalizeNodeEnv,
    z.enum(['development', 'production', 'test', 'preview', 'staging']).default('development')
  ),
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().default(5000)),
  DATABASE_URL: z.preprocess(emptyToUndefined, z.string().default(resolvedDefaultDatabaseUrl)),
  ALLOWED_ORIGINS: z.preprocess(
    emptyToUndefined,
    z.string().default('http://localhost:5173,http://localhost:8081')
  ),
  JWT_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(16).default('development_jwt_secret_key_at_least_32_characters_long_123')
  ),
  JWT_REFRESH_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(16).default('development_jwt_refresh_secret_key_at_least_32_characters_123')
  ),
  JWT_EXPIRES_IN: z.preprocess(emptyToUndefined, z.string().default('15m')),
  JWT_REFRESH_EXPIRES_IN: z.preprocess(emptyToUndefined, z.string().default('7d')),
  BCRYPT_ROUNDS: z.preprocess(emptyToUndefined, z.coerce.number().default(10)),
  RATE_LIMIT_WINDOW_MS: z.preprocess(emptyToUndefined, z.coerce.number().default(900000)),
  RATE_LIMIT_MAX_REQUESTS: z.preprocess(emptyToUndefined, z.coerce.number().default(100)),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  console.error('❌ FATAL: Invalid backend environment configuration:', issues);
  if (process.env.VERCEL !== '1') {
    process.exit(1);
  }
  throw new Error(`Invalid backend environment configuration: ${issues.join(', ')}`);
}

export const ENV = parsedEnv.data;
export const ALLOWED_ORIGIN_LIST = ENV.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

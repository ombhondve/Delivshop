import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('5000'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/delivshop_db'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:8081'),
  JWT_SECRET: z.string().min(16).default('development_jwt_secret_key_at_least_32_characters_long_123'),
  JWT_REFRESH_SECRET: z.string().min(16).default('development_jwt_refresh_secret_key_at_least_32_characters_123'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.string().transform(Number).default('10'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ FATAL: Invalid backend environment configuration:', parsedEnv.error.format());
  process.exit(1);
}

export const ENV = parsedEnv.data;
export const ALLOWED_ORIGIN_LIST = ENV.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

import { ENV } from '../config/env.js';

export const logger = {
  info: (msg: string, meta?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, meta ? JSON.stringify(meta) : '');
  },
  warn: (msg: string, meta?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, meta ? JSON.stringify(meta) : '');
  },
  error: (msg: string, err?: any) => {
    // In production, avoid leaking internal exception details to logs if sensitive
    const sanitizedError =
      ENV.NODE_ENV === 'production'
        ? err?.message || 'Internal error'
        : err;
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, sanitizedError);
  },
};

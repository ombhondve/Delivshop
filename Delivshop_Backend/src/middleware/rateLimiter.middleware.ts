import { rateLimit } from 'express-rate-limit';
import { ENV } from '../config/env.js';

export const generalRateLimiter = rateLimit({
  windowMs: ENV.RATE_LIMIT_WINDOW_MS,
  limit: ENV.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
  },
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // strict limit for authentication attempts
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
  },
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});


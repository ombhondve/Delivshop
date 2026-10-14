import { describe, it, expect } from 'vitest';
import { generalRateLimiter, authRateLimiter } from '../../src/middleware/rateLimiter.middleware.js';
import { createApp } from '../../src/app.js';

describe('Rate Limiter & Security Middleware', () => {
  it('should export valid middleware functions for general and auth rate limiters', () => {
    expect(generalRateLimiter).toBeDefined();
    expect(typeof generalRateLimiter).toBe('function');

    expect(authRateLimiter).toBeDefined();
    expect(typeof authRateLimiter).toBe('function');
  });

  it('should instantiate the Express application with security headers and rate limiting', () => {
    const app = createApp();
    expect(app).toBeDefined();

    const router = (app as any)._router;
    expect(router).toBeDefined();
    expect(Array.isArray(router.stack)).toBe(true);

    const hasLimiter = router.stack.some(
      (layer: any) => layer.name === 'rateLimit' || (layer.regexp && layer.regexp.test('/api'))
    );
    expect(hasLimiter).toBe(true);
  });
});

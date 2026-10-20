import { beforeAll, afterAll } from 'vitest';
import { ENV } from '../src/config/env.js';
import { logger } from '../src/utils/logger.js';

/**
 * Strict Data Preservation Safeguard:
 * Automated tests must NEVER execute blanket table deletions (e.g. DELETE FROM shops, DELETE FROM users)
 * or truncations against the database. Real user-created business records (shops, drivers, products,
 * orders, delivery routes, salary records, expenses) must remain permanently intact.
 */
beforeAll(() => {
  if (ENV.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    throw new Error('CRITICAL SAFETY ERROR: Automated integration tests cannot run against production!');
  }
  logger.info('[TEST SAFEGUARD] Test suite initialized with strict data preservation active.');
});

afterAll(async () => {
  // Blanket database wipes are strictly prohibited.
  // Tests must only clean up their specific test-scoped identifiers if necessary.
});


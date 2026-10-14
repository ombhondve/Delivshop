import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/app.js';

describe('Health & Server Initialization', () => {
  it('should create an express application instance properly', () => {
    const app = createApp();
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });
});

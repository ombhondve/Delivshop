import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 25000,
    hookTimeout: 25000,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    fileParallelism: false,
  },
});

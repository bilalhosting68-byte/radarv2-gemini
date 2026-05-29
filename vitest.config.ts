import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./tests/setupEnv.ts'],
    globals: true,
    environment: 'node',
  },
});

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: fileURLToPath(new URL('./', import.meta.url)),
      },
    ],
  },
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    globalSetup: ['./vitest.global-setup.ts'],
    // One SQLite file, so the test files take turns.
    fileParallelism: false,
    env: {
      DATABASE_URL: 'file:./test.db',
      TOKEN_ENCRYPTION_KEY: '00'.repeat(32),
      WEBHOOK_SECRET: 'whsec-test',
      ORBIT_API_URL: 'https://api.test.invalid',
    },
  },
});

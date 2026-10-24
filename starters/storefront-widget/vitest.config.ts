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
    // plugin-ui's ESM build imports @orbitcommerce/sdk/embed, a folder entry that only a
    // bundler resolves (Next does); Vitest bundles plugin-ui too, instead of handing it to Node.
    server: { deps: { inline: ['@orbitcommerce/plugin-ui'] } },
    env: {
      DATABASE_URL: 'file:./test.db',
      TOKEN_ENCRYPTION_KEY: '00'.repeat(32),
      WEBHOOK_SECRET: 'whsec-test',
      ORBIT_API_URL: 'https://api.test.invalid',
    },
  },
});

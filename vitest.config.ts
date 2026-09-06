import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', 'tests/e2e/**', 'spike/**', 'apps/**'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: [
        'lib/assignment-cache.ts',
        'lib/drive-file-url.ts',
        'lib/internalPageLinks.ts',
        'lib/richText.ts',
        'lib/server/drive-file-content.ts',
        'lib/server/drive-file-token.ts',
        'lib/server/reviewer-auth.ts',
        'lib/server/supabase-auth.ts',
        'lib/server/tenant-client.ts',
        'supabase/functions/_shared/tenant-fetch.ts',
        'app/api/drive-file-token/route.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 65,
        functions: 70,
        lines: 80,
      },
    },
  },
});

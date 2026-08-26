import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Pure services only (no React Native imports) — see docs/02 §2.2.
    include: ['src/services/**/__tests__/**/*.test.ts', 'scripts/**/__tests__/**/*.test.ts'],
  },
});

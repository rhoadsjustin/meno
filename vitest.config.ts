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
    include: [
      'src/services/**/__tests__/**/*.test.ts',
      'src/i18n/**/__tests__/**/*.test.ts',
      // palette.ts is pure data: the contrast pairs the shared buttons use.
      'src/theme/**/__tests__/**/*.test.ts',
      // window-layout.ts is pure: which window sizes split into two panes.
      'src/components/**/__tests__/**/*.test.ts',
      // The Reader's pagination, chapter stepping and text size are pure.
      'src/features/reader/__tests__/**/*.test.ts',
      'scripts/**/__tests__/**/*.test.ts'],
  },
});

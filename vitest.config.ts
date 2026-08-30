import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirrors the `@/*` path alias in tsconfig.json. Set manually rather than via
    // vite-tsconfig-paths, which is ESM-only and cannot be loaded from this CJS
    // config — a whole dependency for one line was not worth the workaround.
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    // Playwright specs live in tests/e2e and are run by `npm run test:e2e`.
    // Without this, Vitest would try to collect them and fail on the
    // @playwright/test imports.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'tests/e2e'],
  },
})

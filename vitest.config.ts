import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Separate from vite.config.ts on purpose: that one is rooted at the
 * playground, and inheriting its root sends vitest looking for tests in the
 * wrong tree entirely.
 *
 * Two environments in one run. `core/` is deliberately free of any DOM
 * dependency and its tests are much faster without one, so only the React
 * layer pays for jsdom — selected by file extension, since every React test
 * is a .tsx and every core test is a .ts.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    root: '.',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    environmentMatchGlobs: [['src/**/*.test.tsx', 'jsdom']],
    setupFiles: ['./src/test/setup.ts'],
  },
})

import { defineConfig } from 'vitest/config'

/**
 * Separate from vite.config.ts on purpose: that one is rooted at the
 * playground, and inheriting its root sends vitest looking for tests in the
 * wrong tree entirely.
 */
export default defineConfig({
  test: {
    root: '.',
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})

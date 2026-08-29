import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5180',
    trace: 'retain-on-failure',
  },
  /**
   * Two projects, because the visual suite is not portable.
   *
   * Screenshot baselines are platform-specific — font rasterisation and
   * scrollbar metrics differ enough between macOS and Linux that a macOS
   * baseline fails on a Linux runner for reasons that have nothing to do with
   * the change under test.
   *
   * Playwright suffixes snapshots with the platform, so `-linux.png` files
   * can be committed next to the `-darwin.png` ones without either
   * invalidating the other. CI runs the two projects as separate jobs: the
   * functional one always, and the visual one as soon as Linux baselines
   * exist. See `.github/workflows/visual-baselines.yml` for generating them.
   */
  projects: [
    {
      name: 'functional',
      testIgnore: /visual\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'visual',
      testMatch: /visual\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm vite',
    url: 'http://localhost:5180',
    reuseExistingServer: !process.env.CI,
  },
})

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
   * the change under test. The committed baselines are `-darwin`, so CI runs
   * `--project=functional` only.
   *
   * To put the visual suite in CI, generate Linux baselines from a runner
   * (or the matching Playwright container) and commit those alongside; the
   * split here is what makes that possible without touching the specs.
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

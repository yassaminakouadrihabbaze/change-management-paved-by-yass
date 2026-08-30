import { defineConfig, devices } from '@playwright/test'

/**
 * Port 3456, not 3000, deliberately.
 *
 * Other Next.js projects on this machine already listen on 3000 and 3100. With
 * `reuseExistingServer` enabled, Playwright would happily attach to whatever is
 * already there and run this suite against the wrong application — reporting a
 * pass or a failure that has nothing to do with this repo. A dedicated port
 * makes that impossible.
 *
 * Override with E2E_PORT if 3456 is also taken.
 */
const PORT = Number(process.env.E2E_PORT ?? 3456)
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'list' : 'html',

  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
    // Never reuse: this suite must run against a server it started itself.
    reuseExistingServer: false,
    timeout: 120_000,
  },
})

import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

/** Where the authenticated browser session is cached by tests/auth.setup.ts. */
export const STORAGE_STATE = path.resolve(__dirname, 'playwright/.auth/user.json');

/**
 * The Agnos dashboard is a client-rendered SPA hosted on a shared dev environment.
 * A cold load was measured at 25-30 s before the login form is interactive, so the
 * default 30 s timeouts are not survivable here - every timeout below is raised
 * deliberately rather than papered over with waitForTimeout in the specs.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,

  timeout: 180_000,
  expect: { timeout: 20_000 },

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
  ],

  use: {
    baseURL: process.env.BASE_URL ?? 'https://dev.app.agnoshealth.com',
    navigationTimeout: 120_000,
    actionTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Logs in once and writes the session to STORAGE_STATE. Everything else depends on it.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
  ],
});

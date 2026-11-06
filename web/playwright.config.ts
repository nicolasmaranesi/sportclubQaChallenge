import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.spec.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['junit', { outputFile: './reports/e2e-results.xml' }],
    ['html', { outputFolder: './playwright-report', open: 'never' }],
  ],

  outputDir: './test-results/artifacts',
  use: {
    baseURL: process.env.SPORTCLUB_URL || 'https://www.sportclub.com.ar',
    actionTimeout: 15_000,
    navigationTimeout: 40_000,
    locale: 'es-AR',

    
    trace: process.env.PW_TRACE === 'on' ? 'on' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});

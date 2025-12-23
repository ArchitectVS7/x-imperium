import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Solar Realms Elite e2e tests
 *
 * Run with: npx playwright test
 * Run headed: npx playwright test --headed
 * Run specific test: npx playwright test e2e/game-flow.spec.ts --headed
 */
export default defineConfig({
  testDir: './e2e',

  // Run tests sequentially since they share game state
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Single worker to ensure sequential execution
  workers: 1,

  // Reporter to use
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],

  // Shared settings for all projects
  use: {
    // Base URL for the Docker container
    baseURL: 'http://localhost:8080',

    // Collect trace when retrying a failed test
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',

    // Slow down actions for visibility in headed mode
    // launchOptions: { slowMo: 100 },
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Timeout for each test
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },
});

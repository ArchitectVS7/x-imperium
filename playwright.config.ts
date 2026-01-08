import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for Nexus Dominion E2E Tests
 *
 * Flaky Test Detection Strategy:
 * - trace: "retain-on-failure" captures traces for debugging failed/flaky tests
 * - retries: 2 in CI allows identifying flaky tests (pass on retry = flaky)
 * - video: "retain-on-failure" captures video for failed tests
 * - screenshots on failure for quick visual debugging
 *
 * Run with --reporter=json to get machine-readable flaky test data
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,

  // Flaky test detection: retry tests to identify inconsistent behavior
  // A test that fails then passes on retry is flagged as "flaky"
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,

  // Timeouts
  globalTimeout: 15 * 60 * 1000, // 15 minutes max for ALL tests (increased for retries)
  timeout: 90 * 1000, // 90 seconds per test (increased for game loading)
  expect: {
    timeout: 10000, // 10 seconds for expect assertions (increased for network delays)
  },

  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    // JSON reporter for CI pipelines to detect flaky tests programmatically
    ...(process.env.CI ? [["json", { outputFile: "playwright-results.json" }] as const] : []),
  ],
  use: {
    baseURL: "http://localhost:3000",

    // Flaky test debugging: capture traces on all failures (including retries)
    // This creates .zip files in test-results/ with full execution timeline
    trace: "retain-on-failure",

    // Capture screenshots on failure for visual debugging
    screenshot: "only-on-failure",

    // Capture video on failure to see what happened before the failure
    video: "retain-on-failure",

    actionTimeout: 15000, // 15 seconds for actions like click (increased)
    navigationTimeout: 20000, // 20 seconds for navigation (increased for game loading)
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000, // 1 minute to start dev server
    // Disable LLM bot calls to avoid rate limits during testing
    env: {
      DISABLE_LLM_BOTS: "true",
    },
  },
  // Cleanup test data after all tests complete
  globalTeardown: "./e2e/global-teardown.ts",
});

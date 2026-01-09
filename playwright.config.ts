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
 *
 * Debugging Options (via environment variables):
 * - PLAYWRIGHT_TRACE_ALL=true  - Capture traces for ALL tests (not just failures)
 * - PLAYWRIGHT_VIDEO_ALL=true  - Capture video for ALL tests
 * - PLAYWRIGHT_HEADED=true     - Run in headed mode (visible browser)
 *
 * Example: PLAYWRIGHT_TRACE_ALL=true npm run test:e2e
 */

// Environment-based configuration
const TRACE_ALL = process.env.PLAYWRIGHT_TRACE_ALL === "true";
const VIDEO_ALL = process.env.PLAYWRIGHT_VIDEO_ALL === "true";
const HEADED = process.env.PLAYWRIGHT_HEADED === "true";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,

  // Flaky test detection: retry tests to identify inconsistent behavior
  // A test that fails then passes on retry is flagged as "flaky"
  retries: process.env.CI ? 2 : 1,
  // Limit workers to prevent OOM - each test creates a game with bots
  // CI: 1 worker (sequential), Local: 2 workers max to balance speed vs memory
  workers: process.env.CI ? 1 : 2,

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

    // Trace configuration: "on" for all tests, "retain-on-failure" for failures only
    // Set PLAYWRIGHT_TRACE_ALL=true to capture traces for debugging
    trace: TRACE_ALL ? "on" : "retain-on-failure",

    // Screenshot configuration
    screenshot: TRACE_ALL ? "on" : "only-on-failure",

    // Video configuration: "on" for all tests, "retain-on-failure" for failures only
    // Set PLAYWRIGHT_VIDEO_ALL=true to capture video for debugging
    video: VIDEO_ALL ? "on" : "retain-on-failure",

    // Headed mode for visual debugging
    headless: !HEADED,

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
    env: {
      // Disable LLM bot calls to avoid rate limits during testing
      DISABLE_LLM_BOTS: "true",
      // Enable admin functions for test cleanup (teardown)
      ADMIN_SECRET: "e2e-test-secret",
      // Increase Node.js memory limit for game creation
      NODE_OPTIONS: "--max-old-space-size=4096",
    },
  },
  // Cleanup test data after all tests complete
  globalTeardown: "./e2e/global-teardown.ts",
});

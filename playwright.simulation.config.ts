import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for full game simulation test
 * Runs without webServer, assumes dev server is running on port 3005
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: ["full-game-simulation.spec.ts", "game-controls-validation.spec.ts"],
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,

  // Extended timeouts for long simulation
  globalTimeout: 0, // No global timeout
  timeout: 600000, // 10 minutes per test
  expect: {
    timeout: 10000, // 10 seconds for expect assertions
  },

  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3005",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 15000, // 15 seconds for actions
    navigationTimeout: 30000, // 30 seconds for navigation
    video: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // No webServer - assumes server is already running
});

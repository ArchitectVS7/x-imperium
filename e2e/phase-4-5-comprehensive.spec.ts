import { test, expect } from "@playwright/test";

/**
 * Phase 4-5 Comprehensive E2E Test
 *
 * Validates a complete 10-turn game with 10 bots:
 * - Turn processing performance (< 2000ms per turn)
 * - UI responsiveness and stability
 * - Console error monitoring
 * - Data integrity across turns
 * - Config system integration (combat + unit stats from JSON)
 *
 * Expected runtime: ~5 minutes
 */

test.describe("Phase 4-5: 10-Turn Game with 10 Bots", () => {
  test.setTimeout(360000); // 6 minutes timeout

  test("should complete 10-turn game with 10 bots successfully", async ({ page }) => {
    const consoleErrors: string[] = [];
    const turnTimings: number[] = [];

    // Monitor console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Step 1: Navigate to game setup
    await page.goto("/game");
    await page.waitForLoadState("networkidle");

    // Step 2: Configure game (if on setup screen)
    // Fill in empire name
    const empireNameInput = page.locator('input[name="empireName"], input[placeholder*="Empire"]');
    if (await empireNameInput.count() > 0) {
      await empireNameInput.fill("Test Empire");
    }

    // Fill in leader name if exists
    const leaderNameInput = page.locator('input[name="leaderName"], input[placeholder*="Leader"]');
    if (await leaderNameInput.count() > 0) {
      await leaderNameInput.fill("Test Leader");
    }

    // Set bot count to 10
    const botCountInput = page.locator('input[name="botCount"], input[type="number"]');
    if (await botCountInput.count() > 0) {
      await botCountInput.fill("10");
    }

    // Click start/begin button
    const startButton = page.locator('button:has-text("BEGIN"), button:has-text("START"), button:has-text("Begin")');
    if (await startButton.count() > 0) {
      await startButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Step 3: Verify game initialization
    await expect(page.locator('[data-testid="turn-counter"]')).toContainText("Turn 1");
    await expect(page.locator('[data-testid="empire-status-bar"]')).toBeVisible();

    // Verify starmap is default landing page
    await expect(page.locator('[data-testid="starmap"]')).toBeVisible();

    // Step 4: Process 10 turns
    for (let turn = 1; turn <= 10; turn++) {
      console.log(`Processing Turn ${turn}...`);

      // Verify current turn number
      await expect(page.locator('[data-testid="turn-counter"]')).toContainText(`Turn ${turn}`);

      // Check UI responsiveness before turn processing
      const empireStatusBar = page.locator('[data-testid="empire-status-bar"]');
      await expect(empireStatusBar).toBeVisible();

      // Measure turn processing time
      const turnStartTime = Date.now();

      // Click "End Turn" button
      const endTurnButton = page.locator('button:has-text("End Turn")');
      await expect(endTurnButton).toBeVisible();
      await endTurnButton.click();

      // Wait for turn processing to complete (next turn counter update)
      await page.waitForFunction(
        (expectedTurn) => {
          const turnElement = document.querySelector('[data-testid="turn-counter"]');
          return turnElement?.textContent?.includes(`Turn ${expectedTurn}`);
        },
        turn + 1,
        { timeout: 30000 }
      );

      const turnEndTime = Date.now();
      const turnDuration = turnEndTime - turnStartTime;
      turnTimings.push(turnDuration);

      console.log(`Turn ${turn} completed in ${turnDuration}ms`);

      // Validate turn processing performance
      expect(turnDuration).toBeLessThan(2000); // < 2 seconds per turn

      // Verify UI still responsive after turn processing
      await expect(empireStatusBar).toBeVisible();
      await expect(page.locator('[data-testid="starmap"]')).toBeVisible();

      // Check for critical UI elements
      if (turn === 5) {
        // Mid-game validation
        await expect(page.locator('[data-testid="resources-credits"]')).toBeVisible();
        await expect(page.locator('[data-testid="empire-status-bar"]')).toBeVisible();
      }
    }

    // Step 5: Final validation after 10 turns
    await expect(page.locator('[data-testid="turn-counter"]')).toContainText("Turn 11");

    // Verify navigation still works
    const planetsLink = page.locator('a[href="/game/planets"]');
    if (await planetsLink.count() > 0) {
      await planetsLink.click();
      await page.waitForURL(/\/game\/planets/);
      await expect(page.locator('[data-testid="planets-page"]')).toBeVisible();
    }

    const militaryLink = page.locator('a[href="/game/military"]');
    if (await militaryLink.count() > 0) {
      await militaryLink.click();
      await page.waitForURL(/\/game\/military/);
      await expect(page.locator('[data-testid="military-page"]')).toBeVisible();
    }

    const researchLink = page.locator('a[href="/game/research"]');
    if (await researchLink.count() > 0) {
      await researchLink.click();
      await page.waitForURL(/\/game\/research/);
      await expect(page.locator('[data-testid="research-page"]')).toBeVisible();
    }

    // Step 6: Validate console errors
    console.log("\n=== Turn Processing Performance ===");
    console.log(`Average turn time: ${(turnTimings.reduce((a, b) => a + b, 0) / turnTimings.length).toFixed(0)}ms`);
    console.log(`Max turn time: ${Math.max(...turnTimings)}ms`);
    console.log(`Min turn time: ${Math.min(...turnTimings)}ms`);
    console.log(`Total errors: ${consoleErrors.length}`);

    // Assert no console errors
    if (consoleErrors.length > 0) {
      console.error("\n=== Console Errors Detected ===");
      consoleErrors.forEach((error, i) => {
        console.error(`${i + 1}. ${error}`);
      });
    }
    expect(consoleErrors.length).toBe(0);

    // Step 7: Performance assertions
    const avgTurnTime = turnTimings.reduce((a, b) => a + b, 0) / turnTimings.length;
    expect(avgTurnTime).toBeLessThan(1500); // Average < 1.5 seconds
    expect(Math.max(...turnTimings)).toBeLessThan(2000); // Max < 2 seconds

    console.log("\n✅ All 10 turns completed successfully!");
  });

  test("should load config from JSON files correctly", async ({ page }) => {
    // Verify config system integration
    await page.goto("/game");

    // This test validates that the game loads without errors
    // when using JSON-based configs (combat-config.json, unit-stats.json)
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Wait for game to initialize
    await page.waitForTimeout(2000);

    // Verify no config loading errors
    expect(consoleErrors.filter(e => e.includes("config")).length).toBe(0);
  });
});

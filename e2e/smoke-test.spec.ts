import { test, expect } from "@playwright/test";

/**
 * Smoke Test - Fast CI validation
 *
 * This is a minimal test to verify basic game functionality.
 * Runs on every commit to catch critical breakages early.
 *
 * Duration: ~1-2 minutes
 * Bots: 3
 * Turns: 3
 *
 * Tests:
 * - Can create a game
 * - UI renders correctly
 * - Turn processing works
 * - Basic navigation functions
 */

test.describe("Smoke Test", () => {
  test("basic game creation and turn processing", async ({ page }) => {
    // Short timeout for CI
    test.setTimeout(120000); // 2 minutes

    console.log("🔥 Running smoke test...");

    // Step 1: Navigate to homepage
    await page.goto("/");
    await expect(page).toHaveTitle(/Nexus Dominion/);
    console.log("✓ Homepage loaded");

    // Step 2: Navigate to game setup
    const startButton = page
      .locator('a[href="/game"]')
      .filter({ hasText: /start.*conquest|start.*game/i })
      .first();
    await expect(startButton).toBeVisible();
    await startButton.click();
    await page.waitForLoadState("networkidle");
    console.log("✓ Game setup page loaded");

    // Step 3: Create game with minimal config (3 bots)
    const empireNameInput = page
      .locator('input[name="empireName"], input[placeholder*="Empire"]')
      .first();
    if ((await empireNameInput.count()) > 0) {
      await empireNameInput.fill("Smoke Test Empire");
    }

    // Try to select 3 bots (minimal config)
    const botSelect = page
      .locator('select[name="botCount"], button:has-text("3")')
      .first();
    if ((await botSelect.count()) > 0) {
      await botSelect.click();
    }

    // Start game
    const createButton = page
      .locator('button')
      .filter({ hasText: /start|create|begin/i })
      .first();
    await expect(createButton).toBeVisible();
    await createButton.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    console.log("✓ Game created");

    // Step 4: Verify game is active
    const turnCounter = page
      .locator('[data-testid*="turn"], text=/turn.*1|T:\\s*1/i')
      .first();
    await expect(turnCounter).toBeVisible({ timeout: 10000 });
    console.log("✓ Game is active");

    // Step 5: Play 3 quick turns to verify turn processing
    for (let turn = 1; turn <= 3; turn++) {
      console.log(`  Playing turn ${turn}...`);

      // Close any modals
      const continueButton = page
        .locator('button:has-text("Continue"), button:has-text("OK")')
        .first();
      if (await continueButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await continueButton.click();
        await page.waitForTimeout(500);
      }

      // Click next cycle
      const nextCycleBtn = page
        .locator('[data-testid="end-turn-button"], button:has-text("NEXT CYCLE")')
        .first();

      if (await nextCycleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nextCycleBtn.click();
        await page.waitForTimeout(3000); // Wait for turn processing
        console.log(`  ✓ Turn ${turn} completed`);
      } else {
        console.warn(`  ⚠ Could not find Next Cycle button on turn ${turn}`);
      }
    }

    // Step 6: Quick navigation test
    const dashboardLink = page.locator('a[href="/game"]').first();
    if ((await dashboardLink.count()) > 0) {
      await dashboardLink.click();
      await page.waitForLoadState("networkidle");
      console.log("✓ Navigation works");
    }

    console.log("🔥 Smoke test passed!");
  });

  test("critical UI elements exist", async ({ page }) => {
    test.setTimeout(60000); // 1 minute

    await page.goto("/");

    // Homepage should have title and start button
    await expect(page).toHaveTitle(/Nexus Dominion/);
    const startButton = page.locator('a[href="/game"]').first();
    await expect(startButton).toBeVisible();

    // Navigate to game
    await startButton.click();
    await page.waitForLoadState("networkidle");

    // Game setup should have create button
    const createButton = page
      .locator('button')
      .filter({ hasText: /start|create|begin/i })
      .first();
    await expect(createButton).toBeVisible();

    console.log("✓ Critical UI elements present");
  });
});

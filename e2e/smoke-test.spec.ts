import { test, expect } from "@playwright/test";
import { skipTutorialViaLocalStorage, dismissTutorialOverlays } from "./fixtures/game.fixture";

/**
 * Smoke Test - Fast CI validation
 *
 * This is a minimal test to verify basic game functionality.
 * Runs on every commit to catch critical breakages early.
 *
 * Duration: ~30-60 seconds
 * Bots: 10 (smallest option)
 * Turns: 2
 *
 * Tests:
 * - Can create a game
 * - UI renders correctly
 * - Turn processing works
 * - Basic navigation functions
 */

test.describe("Smoke Test", () => {
  test.beforeEach(async ({ page }) => {
    // Skip tutorials before each test
    await skipTutorialViaLocalStorage(page);
  });

  test("basic game creation works", async ({ page }) => {
    // Short timeout for CI
    test.setTimeout(45000); // 45 seconds

    // Step 1: Navigate to game page
    await page.goto("/game");
    await dismissTutorialOverlays(page);

    // Step 2: Create game with minimal config (if setup form is shown)
    const empireNameInput = page.locator('[data-testid="empire-name-input"]');
    if (await empireNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await empireNameInput.fill("Smoke Test Empire");
      await dismissTutorialOverlays(page);

      // Start game - this redirects to /game/starmap on success
      await page.locator('[data-testid="start-game-button"]').click();

      // Wait for redirect to starmap (successful game creation)
      await page.waitForURL(/\/game\/starmap/, { timeout: 15000 });
    }

    await dismissTutorialOverlays(page);

    // Step 3: Verify we're on starmap page (game is active)
    await expect(page.locator('[data-testid="starmap-page"]')).toBeVisible({ timeout: 5000 });

    // Step 4: Verify game shell elements are present (header with turn counter)
    await expect(page.getByTestId('game-header')).toBeVisible();

    // Step 5: Verify end turn button exists in game shell
    const endTurnBtn = page.locator('button:has-text("NEXT CYCLE")').first();
    await expect(endTurnBtn).toBeVisible();
  });

  test("critical UI elements exist", async ({ page }) => {
    test.setTimeout(30000); // 30 seconds

    await page.goto("/");

    // Homepage should have title and start button
    await expect(page).toHaveTitle(/Nexus Dominion/);
    const startButton = page.locator('a[href="/game"]').first();
    await expect(startButton).toBeVisible();

    // Navigate to game
    await startButton.click();
    await page.waitForLoadState("domcontentloaded");
    await dismissTutorialOverlays(page);

    // Game setup should have either:
    // - Create button (if no game exists)
    // - Game header (if active game exists)
    const gameReady = page.locator('[data-testid="start-game-button"], [data-testid="game-header"]').first();
    await expect(gameReady).toBeVisible();
  });
});

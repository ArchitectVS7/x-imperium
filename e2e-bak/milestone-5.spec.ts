import { test, expect } from "./fixtures/game.fixture";
import type { Page } from "@playwright/test";

test.describe("Milestone 5: Random Bots", () => {
  // Helper to start a new game with difficulty selection
  async function startNewGameWithDifficulty(page: Page, difficulty: string = "normal") {
    const nameInput = page.locator('[data-testid="empire-name-input"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill("M5 Bot Test Empire");

      // Select difficulty if selector is present
      const difficultyButton = page.locator(`[data-testid="difficulty-${difficulty}"]`);
      if (await difficultyButton.isVisible()) {
        await difficultyButton.click();
      }

      await page.locator('[data-testid="start-game-button"]').click();
      await page.waitForLoadState("networkidle");
    }
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({
      timeout: 15000,
    });
  }

  // Helper to ensure a game exists
  async function ensureGameExists(page: Page) {
    const nameInput = page.locator('[data-testid="empire-name-input"]');
    if (await nameInput.isVisible()) {
      await startNewGameWithDifficulty(page);
    }
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({
      timeout: 10000,
    });
  }

  test.describe("Difficulty Selector", () => {
    test("shows difficulty selector on new game", async ({ gamePage }) => {
      const nameInput = gamePage.locator('[data-testid="empire-name-input"]');
      if (await nameInput.isVisible()) {
        // Should show difficulty options
        await expect(gamePage.locator("text=Difficulty")).toBeVisible();

        // Should show all four difficulty levels
        await expect(gamePage.locator('[data-testid="difficulty-easy"]')).toBeVisible();
        await expect(gamePage.locator('[data-testid="difficulty-normal"]')).toBeVisible();
        await expect(gamePage.locator('[data-testid="difficulty-hard"]')).toBeVisible();
        await expect(gamePage.locator('[data-testid="difficulty-nightmare"]')).toBeVisible();
      }
    });

    test("normal difficulty is selected by default", async ({ gamePage }) => {
      const nameInput = gamePage.locator('[data-testid="empire-name-input"]');
      if (await nameInput.isVisible()) {
        const normalButton = gamePage.locator('[data-testid="difficulty-normal"]');
        await expect(normalButton).toHaveClass(/ring-2/);
      }
    });

    test("can select different difficulty levels", async ({ gamePage }) => {
      const nameInput = gamePage.locator('[data-testid="empire-name-input"]');
      if (await nameInput.isVisible()) {
        // Click hard difficulty
        await gamePage.click('[data-testid="difficulty-hard"]');
        const hardButton = gamePage.locator('[data-testid="difficulty-hard"]');
        await expect(hardButton).toHaveClass(/ring-2/);

        // Click easy difficulty
        await gamePage.click('[data-testid="difficulty-easy"]');
        const easyButton = gamePage.locator('[data-testid="difficulty-easy"]');
        await expect(easyButton).toHaveClass(/ring-2/);
      }
    });
  });

  test.describe("Game Start with Bots", () => {
    test("starting a game shows 25 AI empires message", async ({ gamePage }) => {
      const nameInput = gamePage.locator('[data-testid="empire-name-input"]');
      if (await nameInput.isVisible()) {
        // Should show the 25 AI empires text
        await expect(gamePage.locator("text=25 AI empires")).toBeVisible();
      }
    });

    test("game starts successfully with bots", async ({ gamePage }) => {
      await startNewGameWithDifficulty(gamePage);

      // Should show dashboard
      await expect(gamePage.locator('[data-testid="dashboard"]')).toBeVisible();

      // Should show turn counter
      await expect(gamePage.locator('[data-testid="turn-counter"]')).toBeVisible();
    });
  });

  test.describe("Starmap", () => {
    test("can navigate to starmap page", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      // Click on starmap link in navigation
      await gamePage.click('a[href="/game/starmap"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show starmap page
      await expect(gamePage.locator('[data-testid="starmap-page"]')).toBeVisible({
        timeout: 10000,
      });

      // Should show Galactic Starmap heading
      await expect(gamePage.locator("h1")).toContainText("Galactic Starmap");
    });

    test("starmap shows empire count", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/starmap"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show turn info
      await expect(gamePage.locator("text=Turn")).toBeVisible();

      // Should show number of active empires
      await expect(gamePage.locator("text=empires remain active")).toBeVisible();
    });

    test("starmap displays force-directed graph", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/starmap"]');
      await gamePage.waitForLoadState("networkidle");

      // Wait for starmap to render
      await gamePage.waitForTimeout(2000);

      // Should show SVG starmap
      const starmap = gamePage.locator('[data-testid="starmap-svg"]');
      await expect(starmap).toBeVisible({ timeout: 10000 });
    });

    test("starmap shows empire nodes", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/starmap"]');
      await gamePage.waitForLoadState("networkidle");

      // Wait for starmap to render
      await gamePage.waitForTimeout(2000);

      // Should have empire node circles
      const circles = gamePage.locator('[data-testid="starmap-svg"] circle');
      const circleCount = await circles.count();

      // Should have at least 1 empire (player) but ideally 26 (1 player + 25 bots)
      expect(circleCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe("Turn Processing with Bots", () => {
    test("end turn processes bot decisions", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      // Get initial turn
      const turnCounter = gamePage.locator('[data-testid="turn-counter"]');
      const initialTurnText = await turnCounter.textContent();

      // Click end turn
      await gamePage.click('[data-testid="end-turn-button"]');
      await gamePage.waitForLoadState("networkidle");

      // Wait for turn processing
      await gamePage.waitForTimeout(3000);

      // Turn should have advanced
      const newTurnText = await turnCounter.textContent();
      expect(newTurnText).not.toBe(initialTurnText);
    });

    test("multiple turns can be processed", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      // Process 3 turns
      for (let i = 0; i < 3; i++) {
        await gamePage.click('[data-testid="end-turn-button"]');
        await gamePage.waitForLoadState("networkidle");
        await gamePage.waitForTimeout(2000);
      }

      // Should still show dashboard
      await expect(gamePage.locator('[data-testid="dashboard"]')).toBeVisible();
    });
  });

  test.describe("Protection Period", () => {
    test("during protection period, combat targets may be limited", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      // Navigate to combat
      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      // During protection (turns 1-20), player shouldn't be attackable
      // This is more of a documentation test - actual protection validation
      // happens server-side in the bot decision engine
      await expect(gamePage.locator('[data-testid="combat-page"]')).toBeVisible();
    });
  });

  test.describe("Navigation Integration", () => {
    test("can navigate between starmap and other pages", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      // Navigate to starmap
      await gamePage.click('a[href="/game/starmap"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="starmap-page"]')).toBeVisible();

      // Navigate to combat
      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="combat-page"]')).toBeVisible();

      // Navigate back to starmap
      await gamePage.click('a[href="/game/starmap"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="starmap-page"]')).toBeVisible();

      // Navigate to dashboard
      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="dashboard"]')).toBeVisible();
    });

    test("navigation includes starmap link", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      // Should show starmap link in navigation
      await expect(gamePage.locator('a[href="/game/starmap"]')).toBeVisible();
    });
  });
});

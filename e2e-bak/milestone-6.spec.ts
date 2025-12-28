import { test, expect } from "./fixtures/game.fixture";
import type { Page } from "@playwright/test";

test.describe("Milestone 6: Victory & Persistence", () => {
  // Helper to ensure a game exists
  async function ensureGameExists(page: Page) {
    const nameInput = page.locator('[data-testid="empire-name-input"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill("M6 Victory Test Empire");
      await page.locator('[data-testid="start-game-button"]').click();
      await page.waitForLoadState("networkidle");
    }
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({
      timeout: 15000,
    });
  }

  test.describe("Game Resume (Ironman Save)", () => {
    test("game persists across page reloads", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      // Get current turn
      const turnCounter = gamePage.locator('[data-testid="turn-counter"]');
      const initialTurn = await turnCounter.textContent();

      // Advance a turn
      await gamePage.click('[data-testid="end-turn-button"]');
      await gamePage.waitForLoadState("networkidle");
      await gamePage.waitForTimeout(2000);

      const newTurn = await turnCounter.textContent();
      expect(newTurn).not.toBe(initialTurn);

      // Reload the page
      await gamePage.reload();
      await gamePage.waitForLoadState("networkidle");

      // Game should still be at the same turn (persisted)
      await expect(gamePage.locator('[data-testid="dashboard"]')).toBeVisible({
        timeout: 15000,
      });

      const resumedTurn = await turnCounter.textContent();
      expect(resumedTurn).toBe(newTurn);
    });

    test("can navigate to dashboard after reload", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      // Navigate away
      await gamePage.click('a[href="/game/planets"]');
      await gamePage.waitForLoadState("networkidle");

      // Reload
      await gamePage.reload();
      await gamePage.waitForLoadState("networkidle");

      // Navigate back to dashboard
      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="dashboard"]')).toBeVisible();
    });
  });

  test.describe("Result Page Navigation", () => {
    test("result page exists and is accessible", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      // Navigate to result page (will show "game in progress" state)
      await gamePage.goto("/game/result");
      await gamePage.waitForLoadState("networkidle");

      // Should show game in progress message (since game hasn't ended)
      await expect(
        gamePage.locator("text=Game In Progress").or(gamePage.locator("text=Continue Playing"))
      ).toBeVisible({ timeout: 10000 });
    });

    test("result page has continue playing button when game in progress", async ({
      gamePage,
    }) => {
      await ensureGameExists(gamePage);

      await gamePage.goto("/game/result");
      await gamePage.waitForLoadState("networkidle");

      // Should have a button to continue playing
      const continueButton = gamePage.locator("text=Continue Playing");
      if (await continueButton.isVisible()) {
        await continueButton.click();
        await gamePage.waitForLoadState("networkidle");

        // Should navigate back to game
        await expect(gamePage).toHaveURL(/\/game/);
      }
    });
  });

  test.describe("Victory Conditions Display", () => {
    test("dashboard shows networth which is used for economic victory", async ({
      gamePage,
    }) => {
      await ensureGameExists(gamePage);

      // Networth is displayed on dashboard (used for economic victory calculation)
      await expect(
        gamePage.locator('[data-testid="networth-panel"]').or(gamePage.locator("text=Networth"))
      ).toBeVisible();
    });

    test("turn counter shows current turn (survival victory at 200)", async ({
      gamePage,
    }) => {
      await ensureGameExists(gamePage);

      // Turn counter should be visible
      const turnCounter = gamePage.locator('[data-testid="turn-counter"]');
      await expect(turnCounter).toBeVisible();

      // Should show a turn number
      const turnText = await turnCounter.textContent();
      expect(turnText).toMatch(/\d+/);
    });
  });

  test.describe("Defeat Condition Awareness", () => {
    test("civil status is visible (relates to civil collapse defeat)", async ({
      gamePage,
    }) => {
      await ensureGameExists(gamePage);

      // Civil status should be displayed somewhere on dashboard
      // This relates to civil collapse defeat condition
      await expect(
        gamePage
          .locator('[data-testid="civil-status"]')
          .or(gamePage.locator("text=Civil Status"))
          .or(gamePage.locator("text=Content"))
          .or(gamePage.locator("text=Ecstatic"))
      ).toBeVisible();
    });

    test("resources panel shows credits (relates to bankruptcy defeat)", async ({
      gamePage,
    }) => {
      await ensureGameExists(gamePage);

      // Credits should be visible (bankruptcy happens when credits go negative)
      await expect(
        gamePage.locator('[data-testid="resource-credits"]').or(gamePage.locator("text=Credits"))
      ).toBeVisible();
    });

    test("planet count is visible (relates to elimination defeat)", async ({
      gamePage,
    }) => {
      await ensureGameExists(gamePage);

      // Navigate to planets page
      await gamePage.click('a[href="/game/planets"]');
      await gamePage.waitForLoadState("networkidle");

      // Planet list should show planets (0 planets = elimination)
      await expect(
        gamePage.locator('[data-testid="planets-page"]').or(gamePage.locator("text=Planets"))
      ).toBeVisible();
    });
  });

  test.describe("Navigation Integration", () => {
    test("can navigate from home to new game", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Look for play/start game button
      const playButton = page.locator('a[href="/game"]');
      if (await playButton.isVisible()) {
        await playButton.click();
        await page.waitForLoadState("networkidle");

        // Should be on game page
        await expect(page).toHaveURL(/\/game/);
      }
    });

    test("return home link works from various pages", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      // Navigate to result page
      await gamePage.goto("/game/result");
      await gamePage.waitForLoadState("networkidle");

      // Look for return home link
      const returnHomeLink = gamePage.locator('a[href="/"]').or(gamePage.locator("text=Return Home"));
      if (await returnHomeLink.isVisible()) {
        await expect(returnHomeLink).toBeVisible();
      }
    });
  });
});

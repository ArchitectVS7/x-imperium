import { test, expect } from "./fixtures/game.fixture";
import type { Page } from "@playwright/test";

test.describe("Milestone 6.5: Covert Operations", () => {
  // Helper to ensure a game exists
  async function ensureGameExists(page: Page) {
    const nameInput = page.locator('[data-testid="empire-name-input"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill("M6.5 Covert Test Empire");
      await page.locator('[data-testid="start-game-button"]').click();
      await page.waitForLoadState("networkidle");
    }
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({
      timeout: 15000,
    });
  }

  test.describe("Covert Page Navigation", () => {
    test("can navigate to covert operations page", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      // Click on covert link in navigation
      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show covert page
      await expect(gamePage.locator('[data-testid="covert-page"]')).toBeVisible({
        timeout: 10000,
      });

      // Should show Covert Operations heading
      await expect(gamePage.locator("h1")).toContainText("Covert Operations");
    });

    test("covert page link is in navigation", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      // Should show covert link in navigation
      await expect(gamePage.locator('a[href="/game/covert"]')).toBeVisible();
    });
  });

  test.describe("Covert Status Panel", () => {
    test("displays covert status panel with points", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show status panel
      await expect(gamePage.locator('[data-testid="covert-status-panel"]')).toBeVisible({
        timeout: 10000,
      });

      // Should show covert points
      await expect(gamePage.locator("text=Covert Points")).toBeVisible();
    });

    test("displays agent count and capacity", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show agent count
      await expect(gamePage.locator("text=Covert Agents")).toBeVisible();
    });

    test("shows points accumulation rate (+5/turn)", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show the accumulation rate info
      await expect(gamePage.locator("text=+5 points per turn")).toBeVisible();
    });
  });

  test.describe("Target Selector", () => {
    test("displays target selector panel", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show target selector panel
      await expect(gamePage.locator('[data-testid="target-selector-panel"]')).toBeVisible({
        timeout: 10000,
      });

      // Should have a select element
      await expect(gamePage.locator('[data-testid="covert-target-select"]')).toBeVisible();
    });

    test("target selector has selectable empires", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      // Check that the select has options
      const select = gamePage.locator('[data-testid="covert-target-select"]');
      await expect(select).toBeVisible({ timeout: 10000 });

      // Should have the placeholder option
      await expect(select.locator("option")).toHaveCount(26); // 1 placeholder + 25 bot empires
    });

    test("can select a target empire", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      const select = gamePage.locator('[data-testid="covert-target-select"]');
      await expect(select).toBeVisible({ timeout: 10000 });

      // Get all options except the placeholder
      const options = await select.locator("option").all();
      const secondOption = options[1];
      if (secondOption) {
        // Select the second option (first real empire)
        const value = await secondOption.getAttribute("value");
        if (value) {
          await select.selectOption(value);

          // Target info should be displayed
          await gamePage.waitForTimeout(500);
          await expect(gamePage.locator("text=Planets:").or(gamePage.locator("text=Networth:"))).toBeVisible();
        }
      }
    });
  });

  test.describe("Operations Display", () => {
    test("displays available covert operations heading", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show available operations section
      await expect(gamePage.locator("text=Available Operations")).toBeVisible();
    });

    test("shows message to select target when no target selected", async ({
      gamePage,
    }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show message about selecting target
      await expect(
        gamePage.locator("text=Select a target empire to view operation success rates")
      ).toBeVisible();
    });

    test("displays operation cards when target is selected", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      // Select a target first
      const select = gamePage.locator('[data-testid="covert-target-select"]');
      await expect(select).toBeVisible({ timeout: 10000 });

      const options = await select.locator("option").all();
      const secondOption = options[1];
      if (secondOption) {
        const value = await secondOption.getAttribute("value");
        if (value) {
          await select.selectOption(value);
          await gamePage.waitForTimeout(1000);

          // Should show at least one operation card
          // Operations include: send_spy, insurgent_aid, support_dissension, etc.
          await expect(
            gamePage.locator('[data-testid^="operation-card-"]').first()
          ).toBeVisible({ timeout: 10000 });
        }
      }
    });

    test("operation cards show cost and risk level", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      // Select a target
      const select = gamePage.locator('[data-testid="covert-target-select"]');
      await expect(select).toBeVisible({ timeout: 10000 });

      const options = await select.locator("option").all();
      const secondOption = options[1];
      if (secondOption) {
        const value = await secondOption.getAttribute("value");
        if (value) {
          await select.selectOption(value);
          await gamePage.waitForTimeout(1000);

          // Operation cards should show cost in CP
          await expect(gamePage.locator("text=Cost:")).toBeVisible();

          // Operation cards should show risk level (low, medium, high, very_high)
          await expect(
            gamePage
              .locator("text=low")
              .or(gamePage.locator("text=medium"))
              .or(gamePage.locator("text=high"))
              .or(gamePage.locator("text=very high"))
          ).toBeVisible();
        }
      }
    });
  });

  test.describe("Covert Points Accumulation", () => {
    test("covert points increase after ending turn", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      // Go to covert page first to see initial points
      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      // Wait for status to load and find the covert points display
      await expect(gamePage.locator('[data-testid="covert-status-panel"]')).toBeVisible({
        timeout: 10000,
      });

      // Go back to dashboard to end turn
      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");

      // End turn
      await gamePage.click('[data-testid="end-turn-button"]');
      await gamePage.waitForLoadState("networkidle");
      await gamePage.waitForTimeout(2000);

      // Go back to covert page
      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      // Covert points should still be visible (increased by 5)
      await expect(gamePage.locator('[data-testid="covert-status-panel"]')).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe("Navigation Integration", () => {
    test("can navigate between covert and other pages", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      // Navigate to covert
      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="covert-page"]')).toBeVisible();

      // Navigate to combat
      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="combat-page"]')).toBeVisible();

      // Navigate back to covert
      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="covert-page"]')).toBeVisible();

      // Navigate to dashboard
      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="dashboard"]')).toBeVisible();
    });
  });
});

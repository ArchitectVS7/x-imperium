import { test, expect } from "./fixtures/game.fixture";
import type { Page } from "@playwright/test";

test.describe("Milestone 4: Combat System", () => {
  // Helper to ensure a game exists before testing
  async function ensureGameExists(page: Page) {
    const nameInput = page.locator('[data-testid="empire-name-input"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill("M4 Combat Test Empire");
      await page.locator('[data-testid="start-game-button"]').click();
      await page.waitForLoadState("networkidle");
    }
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({
      timeout: 10000,
    });
  }

  test.describe("Combat Page Navigation", () => {
    test("can navigate to combat page", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      // Click on combat link in navigation
      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show combat page
      await expect(gamePage.locator('[data-testid="combat-page"]')).toBeVisible({
        timeout: 10000,
      });

      // Should show Combat heading
      await expect(gamePage.locator("h1")).toContainText("Combat");
    });

    test("combat page loads without errors", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      // Wait for page to fully load
      await gamePage.waitForTimeout(2000);

      // Should not show error state
      const pageContent = await gamePage.locator('[data-testid="combat-page"]').textContent();
      expect(pageContent).not.toContain("Error:");
    });
  });

  test.describe("Combat UI Elements", () => {
    test("shows target selection panel", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show "Select Target" heading
      await expect(gamePage.locator("text=Select Target")).toBeVisible();
    });

    test("shows attack type options", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show Attack Type section
      await expect(gamePage.locator("text=Attack Type")).toBeVisible();

      // Should show Invasion option
      await expect(gamePage.locator('[data-testid="attack-type-invasion"]')).toBeVisible();

      // Should show Guerilla option
      await expect(gamePage.locator('[data-testid="attack-type-guerilla"]')).toBeVisible();
    });

    test("attack type buttons are interactive", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      // Click guerilla button
      await gamePage.click('[data-testid="attack-type-guerilla"]');

      // Should show guerilla as selected (orange background)
      const guerillaButton = gamePage.locator('[data-testid="attack-type-guerilla"]');
      await expect(guerillaButton).toHaveClass(/bg-orange-600/);

      // Click invasion button
      await gamePage.click('[data-testid="attack-type-invasion"]');

      // Should show invasion as selected (red background)
      const invasionButton = gamePage.locator('[data-testid="attack-type-invasion"]');
      await expect(invasionButton).toHaveClass(/bg-red-600/);
    });

    test("shows launch attack button", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show launch attack button
      const attackButton = gamePage.locator('[data-testid="launch-attack-button"]');
      await expect(attackButton).toBeVisible();
      await expect(attackButton).toContainText("LAUNCH ATTACK");
    });

    test("launch attack button disabled without target", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      // Button should be disabled when no target selected
      const attackButton = gamePage.locator('[data-testid="launch-attack-button"]');
      await expect(attackButton).toBeDisabled();
    });

    test("shows combat info panel", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show Combat System info section
      await expect(gamePage.locator("text=Combat System")).toBeVisible();

      // Should explain invasion
      await expect(gamePage.locator("text=3-phase combat")).toBeVisible();

      // Should explain guerilla
      await expect(gamePage.locator("text=Hit-and-run")).toBeVisible();

      // Should explain carriers
      await expect(gamePage.locator("text=Each carrier holds 100 soldiers")).toBeVisible();
    });

    test("shows recent battles section", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show Recent Battles heading
      await expect(gamePage.locator("text=Recent Battles")).toBeVisible();

      // For a new game, should show "No battles yet"
      await expect(gamePage.locator("text=No battles yet")).toBeVisible();
    });
  });

  test.describe("Force Selection", () => {
    test("shows force selection inputs", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show Select Forces heading
      await expect(gamePage.locator("text=Select Forces")).toBeVisible();

      // Should show soldiers input
      await expect(gamePage.locator('[data-testid="force-soldiers"]')).toBeVisible();
    });

    test("force inputs show available count", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      // Wait for forces to load
      await gamePage.waitForTimeout(1000);

      // Should show "Available:" text with soldier count
      const soldiersSection = gamePage.locator('[data-testid="force-soldiers"]').locator("..");
      await expect(soldiersSection).toContainText("Available:");
    });

    test("guerilla mode disables non-soldier inputs", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      // Select guerilla attack type
      await gamePage.click('[data-testid="attack-type-guerilla"]');

      // Wait for UI to update
      await gamePage.waitForTimeout(500);

      // Soldiers should still be enabled
      const soldiersInput = gamePage.locator('[data-testid="force-soldiers"]');
      await expect(soldiersInput).not.toBeDisabled();

      // Fighters should be disabled
      const fightersInput = gamePage.locator('[data-testid="force-fighters"]');
      await expect(fightersInput).toBeDisabled();

      // Carriers should be disabled
      const carriersInput = gamePage.locator('[data-testid="force-carriers"]');
      await expect(carriersInput).toBeDisabled();
    });
  });

  test.describe("Target Display", () => {
    test("shows message when no targets available", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      // Wait for targets to load
      await gamePage.waitForTimeout(2000);

      // For a single-player game without bots, should show no targets message
      // or display available bot targets
      const targetSection = gamePage.locator("text=Select Target").locator("..");
      const hasNoTargets = await targetSection.locator("text=No targets available").isVisible();
      const hasTargets = await gamePage.locator('[data-testid^="target-"]').count();

      // Either we have targets or we show the no-targets message
      expect(hasNoTargets || hasTargets > 0).toBe(true);
    });
  });

  test.describe("Navigation Integration", () => {
    test("can navigate from combat to other pages", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      // Navigate to combat
      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="combat-page"]')).toBeVisible();

      // Navigate to military
      await gamePage.click('a[href="/game/military"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator("h1")).toContainText("Military");

      // Navigate back to combat
      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="combat-page"]')).toBeVisible();
    });

    test("can navigate between all main game pages including combat", async ({ gamePage }) => {
      await ensureGameExists(gamePage);

      // Test navigation flow including combat
      const pages = [
        { href: "/game/combat", identifier: '[data-testid="combat-page"]' },
        { href: "/game/planets", identifier: '[data-testid="planets-page"]' },
        { href: "/game/military", identifier: "h1:has-text('Military')" },
        { href: "/game/research", identifier: "h1:has-text('Research')" },
        { href: "/game", identifier: '[data-testid="dashboard"]' },
      ];

      for (const pageInfo of pages) {
        await gamePage.click(`a[href="${pageInfo.href}"]`);
        await gamePage.waitForLoadState("networkidle");
        await expect(gamePage.locator(pageInfo.identifier).first()).toBeVisible({ timeout: 5000 });
      }
    });
  });
});

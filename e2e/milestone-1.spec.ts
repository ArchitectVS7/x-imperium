/**
 * Milestone 1: Static Empire View - E2E Tests
 *
 * Tests verify that:
 * - New game creation works and sets up correct initial state
 * - Dashboard displays accurate resource values
 * - Planet distribution matches PRD specifications
 * - Networth calculation is correct
 * - Navigation works between game pages
 *
 * FUNCTIONAL ASSERTIONS: Tests verify actual state values, not just visibility.
 */

import {
  test,
  expect,
  getEmpireState,
  ensureGameExists,
  navigateToGamePage,
  advanceTurn,
  type EmpireState,
} from "./fixtures/game.fixture";

// =============================================================================
// CONSTANTS - Expected starting values from PRD
// =============================================================================

const EXPECTED_STARTING_STATE = {
  credits: 100000,
  food: 1000,
  ore: 500,
  petroleum: 200,
  researchPoints: 0,
  sectorCount: 5, // Reduced from 9 for faster eliminations
  population: 10000,
  soldiers: 100,
  civilStatus: "Content",
  // Networth: 5 sectors × 10 + 100 soldiers × 0.0005 = 50.05 (stored as 50)
  networth: 50,
};

// Updated sector distribution: 5 sectors (down from 9)
// Research sector removed - players must purchase it
const EXPECTED_SECTOR_DISTRIBUTION = {
  food: 1,      // Reduced from 2
  ore: 1,       // Reduced from 2
  petroleum: 1,
  tourism: 1,
  government: 1, // Keeps covert ops capacity
};

// =============================================================================
// TEST SUITE
// =============================================================================

test.describe("Milestone 1: Static Empire View", () => {
  test.describe("Game Creation", () => {
    test("shows new game prompt when no game exists", async ({ gamePage }) => {
      const prompt = gamePage.locator('[data-testid="new-game-prompt"]');
      await expect(prompt).toBeVisible();

      const nameInput = gamePage.locator('[data-testid="empire-name-input"]');
      await expect(nameInput).toBeVisible();

      const startButton = gamePage.locator('[data-testid="start-game-button"]');
      await expect(startButton).toBeVisible();
      await expect(startButton).toHaveText("BEGIN CONQUEST");
    });

    test("can create a new game and verify initial state", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Creation Test Empire");

      // FUNCTIONAL: Verify actual state values match PRD
      const state = await getEmpireState(gamePage);

      expect(state.credits).toBe(EXPECTED_STARTING_STATE.credits);
      expect(state.food).toBe(EXPECTED_STARTING_STATE.food);
      expect(state.ore).toBe(EXPECTED_STARTING_STATE.ore);
      expect(state.petroleum).toBe(EXPECTED_STARTING_STATE.petroleum);
      expect(state.researchPoints).toBe(EXPECTED_STARTING_STATE.researchPoints);
      expect(state.sectorCount).toBe(EXPECTED_STARTING_STATE.sectorCount);
      expect(state.turn).toBe(1);
    });
  });

  test.describe("Resource Display", () => {
    test("dashboard displays correct starting resources with exact values", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Resource Test Empire");

      const state = await getEmpireState(gamePage);

      // FUNCTIONAL: Verify exact resource values
      expect(state.credits).toBe(100000);
      expect(state.food).toBe(1000);
      expect(state.ore).toBe(500);
      expect(state.petroleum).toBe(200);
      expect(state.researchPoints).toBe(0);
    });

    test("resource panel shows all resource types", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Resource Panel Test Empire");

      const resourcePanel = gamePage.locator('[data-testid="resource-panel"]');
      await expect(resourcePanel).toBeVisible();

      // Verify all resource data-testids exist
      await expect(resourcePanel.locator('[data-testid="credits"]')).toBeVisible();
      await expect(resourcePanel.locator('[data-testid="food"]')).toBeVisible();
      await expect(resourcePanel.locator('[data-testid="ore"]')).toBeVisible();
      await expect(resourcePanel.locator('[data-testid="petroleum"]')).toBeVisible();
      await expect(resourcePanel.locator('[data-testid="research-points"]')).toBeVisible();
    });
  });

  test.describe("Sector System", () => {
    test("sector list shows exactly 5 sectors", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Sector Count Test Empire");

      const state = await getEmpireState(gamePage);
      expect(state.sectorCount).toBe(5);

      const sectorList = gamePage.locator('[data-testid="sector-list"]');
      await expect(sectorList).toContainText("Sectors (5)");
    });

    test("sector distribution matches PRD specification", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Sector Distribution Test Empire");

      const sectorList = gamePage.locator('[data-testid="sector-list"]');
      await expect(sectorList).toBeVisible();

      // FUNCTIONAL: Verify exact sector type counts
      for (const [type, count] of Object.entries(EXPECTED_SECTOR_DISTRIBUTION)) {
        const sectorTypeLocator = sectorList.locator(`[data-testid="sector-type-${type}"]`);
        await expect(sectorTypeLocator).toContainText(String(count));
      }
    });

    test("can navigate to sectors page and see all sector cards", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Sectors Page Test Empire");

      await navigateToGamePage(gamePage, "sectors");

      // FUNCTIONAL: Verify exactly 5 sector cards exist (reduced from 9)
      const sectorCards = gamePage.locator('[data-testid^="sector-card-"]');
      await expect(sectorCards).toHaveCount(5);
    });
  });

  test.describe("Networth Calculation", () => {
    test("networth displays using correct formula from PRD", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Networth Test Empire");

      const state = await getEmpireState(gamePage);

      // FUNCTIONAL: Networth = 5 sectors × 10 + 100 soldiers × 0.0005 = 50.05 → 50
      // Allow small tolerance for floating point
      expect(state.networth).toBeGreaterThanOrEqual(49);
      expect(state.networth).toBeLessThanOrEqual(51);
    });

    test("networth panel is visible and shows value", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Networth Panel Test Empire");

      const networthPanel = gamePage.locator('[data-testid="networth-panel"]');
      await expect(networthPanel).toBeVisible();

      const networthValue = gamePage.locator('[data-testid="networth-value"]');
      await expect(networthValue).toBeVisible();
      await expect(networthValue).toContainText("90");
    });
  });

  test.describe("Population & Civil Status", () => {
    test("population count is exactly 10,000 at game start", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Population Test Empire");

      const state = await getEmpireState(gamePage);

      // FUNCTIONAL: Verify exact population
      expect(state.population).toBe(10000);
    });

    test("civil status starts as Content", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Civil Status Test Empire");

      const state = await getEmpireState(gamePage);

      // FUNCTIONAL: Verify starting civil status
      expect(state.civilStatus).toBe("Content");
    });

    test("population panel displays correctly", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Population Panel Test Empire");

      const populationPanel = gamePage.locator('[data-testid="population-panel"]');
      await expect(populationPanel).toBeVisible();

      await expect(populationPanel.locator('[data-testid="population-count"]')).toContainText("10,000");
      await expect(populationPanel.locator('[data-testid="civil-status"]')).toContainText("Content");
    });
  });

  test.describe("Military Panel", () => {
    test("military panel shows exactly 100 starting soldiers", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Military Test Empire");

      const state = await getEmpireState(gamePage);

      // FUNCTIONAL: Verify starting military
      expect(state.soldiers).toBe(100);
    });

    test("military panel is visible on dashboard", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Military Panel Test Empire");

      const militaryPanel = gamePage.locator('[data-testid="military-panel"]');
      await expect(militaryPanel).toBeVisible();
      await expect(militaryPanel).toContainText("Soldiers");
      await expect(militaryPanel).toContainText("100");
    });
  });

  test.describe("Turn System", () => {
    test("game starts at turn 1", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Turn Counter Test Empire");

      const state = await getEmpireState(gamePage);
      expect(state.turn).toBe(1);
    });

    test("end turn button is visible and clickable", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "End Turn Button Test Empire");

      const endTurnButton = gamePage.locator('[data-testid="end-turn-button"]');
      await expect(endTurnButton).toBeVisible();
      await expect(endTurnButton).toBeEnabled();
    });

    test("ending turn increments turn counter and updates resources", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Turn Increment Test Empire");

      // FUNCTIONAL: Capture state, advance turn, verify changes
      const { before, after } = await advanceTurn(gamePage);

      // Turn should increment
      expect(after.turn).toBe(before.turn + 1);

      // Resources should change (production minus maintenance)
      // Food sectors produce food, research sectors produce RP, etc.
      // At minimum, some resource should change
      const resourcesChanged =
        after.credits !== before.credits ||
        after.food !== before.food ||
        after.ore !== before.ore ||
        after.petroleum !== before.petroleum ||
        after.researchPoints !== before.researchPoints;

      expect(resourcesChanged).toBe(true);
    });
  });

  test.describe("Navigation", () => {
    test("can navigate to all main game pages", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Navigation Test Empire");

      // Test navigation to sectors page
      await gamePage.click('a[href="/game/sectors"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="sectors-page"]')).toBeVisible({ timeout: 10000 });

      // Return to dashboard
      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
    });
  });
});

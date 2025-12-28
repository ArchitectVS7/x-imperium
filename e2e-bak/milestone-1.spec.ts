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
  planetCount: 9,
  population: 10000,
  soldiers: 100,
  civilStatus: "Content",
  // Networth: 9 planets × 10 + 100 soldiers × 0.0005 = 90.05 (stored as 90)
  networth: 90,
};

const EXPECTED_PLANET_DISTRIBUTION = {
  food: 2,
  ore: 2,
  petroleum: 1,
  tourism: 1,
  urban: 1,
  government: 1,
  research: 1,
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
      expect(state.planetCount).toBe(EXPECTED_STARTING_STATE.planetCount);
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

  test.describe("Planet System", () => {
    test("planet list shows exactly 9 planets", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Planet Count Test Empire");

      const state = await getEmpireState(gamePage);
      expect(state.planetCount).toBe(9);

      const planetList = gamePage.locator('[data-testid="planet-list"]');
      await expect(planetList).toContainText("Planets (9)");
    });

    test("planet distribution matches PRD specification", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Planet Distribution Test Empire");

      const planetList = gamePage.locator('[data-testid="planet-list"]');
      await expect(planetList).toBeVisible();

      // FUNCTIONAL: Verify exact planet type counts
      for (const [type, count] of Object.entries(EXPECTED_PLANET_DISTRIBUTION)) {
        const planetTypeLocator = planetList.locator(`[data-testid="planet-type-${type}"]`);
        await expect(planetTypeLocator).toContainText(String(count));
      }
    });

    test("can navigate to planets page and see all planet cards", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Planets Page Test Empire");

      await navigateToGamePage(gamePage, "planets");

      // FUNCTIONAL: Verify exactly 9 planet cards exist
      const planetCards = gamePage.locator('[data-testid^="planet-card-"]');
      await expect(planetCards).toHaveCount(9);
    });
  });

  test.describe("Networth Calculation", () => {
    test("networth displays using correct formula from PRD", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "Networth Test Empire");

      const state = await getEmpireState(gamePage);

      // FUNCTIONAL: Networth = 9 planets × 10 + 100 soldiers × 0.0005 = 90.05 → 90
      // Allow small tolerance for floating point
      expect(state.networth).toBeGreaterThanOrEqual(89);
      expect(state.networth).toBeLessThanOrEqual(91);
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
      // Food planets produce food, research planets produce RP, etc.
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

      // Test navigation to planets page
      await gamePage.click('a[href="/game/planets"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="planets-page"]')).toBeVisible({ timeout: 10000 });

      // Return to dashboard
      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
    });
  });
});

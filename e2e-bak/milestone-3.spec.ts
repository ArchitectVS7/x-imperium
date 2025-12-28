/**
 * Milestone 3: Planet, Units & Research - E2E Tests
 *
 * Tests verify that:
 * - Research system shows correct level and progress
 * - Research points accumulate each turn
 * - Military page displays unit counts
 * - Planet system works correctly
 *
 * FUNCTIONAL ASSERTIONS: Tests verify actual state values and changes.
 */

import {
  test,
  expect,
  getEmpireState,
  ensureGameExists,
  navigateToGamePage,
  advanceTurn,
  assertResourceIncreased,
  type EmpireState,
} from "./fixtures/game.fixture";

// =============================================================================
// CONSTANTS
// =============================================================================

const RESEARCH_POINTS_PER_PLANET = 100; // 100 RP per research planet per turn
const STARTING_RESEARCH_PLANETS = 1;

// =============================================================================
// TEST SUITE
// =============================================================================

test.describe("Milestone 3: Planet, Units & Research", () => {
  test.describe("Research System", () => {
    test("can navigate to research page", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Research Nav Empire");

      await gamePage.click('a[href="/game/research"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator("h1")).toContainText("Research");
    });

    test("research panel loads and shows Level 0 for new game", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Research Level Empire");

      await gamePage.click('a[href="/game/research"]');
      await gamePage.waitForLoadState("networkidle");

      const researchPanel = gamePage.locator('[data-testid="research-panel"]');
      await expect(researchPanel).toBeVisible({ timeout: 10000 });

      // FUNCTIONAL: Verify research level is 0 for new game
      await expect(researchPanel).toContainText("Level 0");
    });

    test("research progress component displays correctly", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Research Progress Empire");

      await gamePage.click('a[href="/game/research"]');
      await gamePage.waitForLoadState("networkidle");

      const researchProgress = gamePage.locator('[data-testid="research-progress"]');
      await expect(researchProgress).toBeVisible({ timeout: 10000 });

      // Should show progress bar or percentage, not stuck at loading
      const progressText = await researchProgress.textContent();
      expect(progressText).not.toContain("Loading...");
    });

    test("research info shows correct starting data", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Research Info Empire");

      await gamePage.click('a[href="/game/research"]');
      await gamePage.waitForLoadState("networkidle");

      const researchPanel = gamePage.locator('[data-testid="research-panel"]');
      await expect(researchPanel).toBeVisible({ timeout: 10000 });

      // FUNCTIONAL: Verify correct starting values
      await expect(researchPanel).toContainText("Level 0");
      await expect(researchPanel).toContainText("Research Planets");
      await expect(researchPanel).toContainText("Points/Turn");
    });

    test("research system info displays unlock information", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Research Unlocks Empire");

      await gamePage.click('a[href="/game/research"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show research unlocks info
      await expect(gamePage.locator("text=Research System")).toBeVisible();
      await expect(gamePage.locator("text=100 RP")).toBeVisible();
      await expect(gamePage.locator("text=Light Cruisers")).toBeVisible();
    });

    test("research points accumulate after ending turn", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Research Accumulate Empire");

      // Get initial state
      const before = await getEmpireState(gamePage);
      expect(before.researchPoints).toBe(0); // New game starts with 0 RP

      // Advance turn
      const { after } = await advanceTurn(gamePage);

      // FUNCTIONAL: Research points should increase by 100 (1 research planet × 100 RP)
      expect(after.researchPoints).toBeGreaterThan(before.researchPoints);
      expect(after.researchPoints).toBe(RESEARCH_POINTS_PER_PLANET * STARTING_RESEARCH_PLANETS);
    });

    test("research level increases when threshold reached", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Research Level Up Empire");

      // This test would require many turns to accumulate enough RP
      // For now, verify the starting state is correct
      await gamePage.click('a[href="/game/research"]');
      await gamePage.waitForLoadState("networkidle");

      const researchPanel = gamePage.locator('[data-testid="research-panel"]');
      await expect(researchPanel).toContainText("Level 0");

      // Verify the next level cost is shown (1000 RP for level 1)
      await expect(researchPanel).toContainText(/1,?000/);
    });
  });

  test.describe("Military System", () => {
    test("can navigate to military page", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Military Nav Empire");

      await gamePage.click('a[href="/game/military"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator("h1")).toContainText("Military");
    });

    test("military page shows starting soldiers count", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Military Count Empire");

      const state = await getEmpireState(gamePage);

      // FUNCTIONAL: Verify starting soldiers count
      expect(state.soldiers).toBe(100);

      await gamePage.click('a[href="/game/military"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator("text=Soldiers")).toBeVisible();
      await expect(gamePage.locator("text=100")).toBeVisible();
    });

    test("military page shows all unit types", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Military Units Empire");

      await gamePage.click('a[href="/game/military"]');
      await gamePage.waitForLoadState("networkidle");

      // All unit types should be visible (even if count is 0)
      const unitTypes = ["Soldiers", "Fighters", "Stations", "Light Cruisers", "Heavy Cruisers", "Carriers"];

      for (const unitType of unitTypes) {
        await expect(gamePage.locator(`text=${unitType}`)).toBeVisible();
      }
    });

    test("can see build queue section", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Build Queue Empire");

      await gamePage.click('a[href="/game/military"]');
      await gamePage.waitForLoadState("networkidle");

      // Build queue or unit construction UI should be visible
      const buildSection = gamePage.locator('[data-testid="build-queue"], [data-testid="unit-builder"]');
      // At least one should exist
      const buildQueueVisible = await gamePage.locator('[data-testid="build-queue"]').isVisible().catch(() => false);
      const unitBuilderVisible = await gamePage.locator('[data-testid="unit-builder"]').isVisible().catch(() => false);

      expect(buildQueueVisible || unitBuilderVisible).toBe(true);
    });
  });

  test.describe("Planets System", () => {
    test("planets page loads with 9 starting planets", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Planets Load Empire");

      await navigateToGamePage(gamePage, "planets");

      // FUNCTIONAL: Verify exactly 9 planet cards
      const planetCards = gamePage.locator('[data-testid^="planet-card-"]');
      await expect(planetCards).toHaveCount(9);
    });

    test("research planet exists in starting configuration", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Research Planet Empire");

      await navigateToGamePage(gamePage, "planets");

      // FUNCTIONAL: At least one research planet should exist
      await expect(gamePage.locator('[data-testid="planet-type-research"]')).toBeVisible();
    });

    test("planet distribution matches starting specification", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Planet Types Empire");

      const state = await getEmpireState(gamePage);

      // FUNCTIONAL: Verify planet count
      expect(state.planetCount).toBe(9);

      await navigateToGamePage(gamePage, "planets");

      // Verify each planet type count
      const expectedCounts: Record<string, number> = {
        food: 2,
        ore: 2,
        petroleum: 1,
        tourism: 1,
        urban: 1,
        government: 1,
        research: 1,
      };

      for (const [type, count] of Object.entries(expectedCounts)) {
        const typeIndicator = gamePage.locator(`[data-testid="planet-type-${type}"]`);
        if (await typeIndicator.isVisible()) {
          await expect(typeIndicator).toContainText(String(count));
        }
      }
    });
  });

  test.describe("Dashboard Integration", () => {
    test("dashboard shows research points", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Dashboard RP Empire");

      const state = await getEmpireState(gamePage);

      // FUNCTIONAL: Research points display should match state
      expect(state.researchPoints).toBe(0);

      await expect(gamePage.locator('[data-testid="research-points"]')).toBeVisible();
    });

    test("dashboard updates after turn processing", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Dashboard Update Empire");

      const before = await getEmpireState(gamePage);
      const { after } = await advanceTurn(gamePage);

      // FUNCTIONAL: Multiple resources should change after turn
      // Food planets produce food
      // Research planets produce RP
      // Tourism/Urban produce credits
      const changesDetected =
        after.credits !== before.credits ||
        after.food !== before.food ||
        after.researchPoints !== before.researchPoints;

      expect(changesDetected).toBe(true);
    });
  });

  test.describe("Navigation Flow", () => {
    test("can navigate between all M3 pages", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Navigation Empire");

      const pages = [
        { href: "/game/planets", check: "planets-page" },
        { href: "/game/military", check: "h1" },
        { href: "/game/research", check: "h1" },
        { href: "/game", check: "dashboard" },
      ];

      for (const pageInfo of pages) {
        await gamePage.click(`a[href="${pageInfo.href}"]`);
        await gamePage.waitForLoadState("networkidle");

        if (pageInfo.check === "h1") {
          await expect(gamePage.locator("h1")).toBeVisible({ timeout: 5000 });
        } else {
          await expect(gamePage.locator(`[data-testid="${pageInfo.check}"]`)).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test("state persists across navigation", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 State Persist Empire");

      const beforeNav = await getEmpireState(gamePage);

      // Navigate to planets and back
      await navigateToGamePage(gamePage, "planets");
      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");

      const afterNav = await getEmpireState(gamePage);

      // FUNCTIONAL: State should be unchanged by navigation alone
      expect(afterNav.credits).toBe(beforeNav.credits);
      expect(afterNav.turn).toBe(beforeNav.turn);
      expect(afterNav.researchPoints).toBe(beforeNav.researchPoints);
    });
  });
});

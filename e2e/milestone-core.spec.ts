/**
 * Core Milestones E2E Tests (M1-M4)
 *
 * Consolidated tests for foundational game features:
 * - M1: Static Empire View (game creation, resources, sectors, population)
 * - M3: Sectors, Units & Research (research system, military, sector management)
 * - M4: Combat System (combat UI, attack types, force selection, targets)
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
  sectorCount: 5,
  population: 10000,
  soldiers: 100,
  civilStatus: "Content",
  networth: 50,
};

const EXPECTED_SECTOR_DISTRIBUTION = {
  food: 1,
  ore: 1,
  petroleum: 1,
  tourism: 1,
  government: 1,
};

const RESEARCH_POINTS_PER_SECTOR = 100;
const PROTECTION_PERIOD = 20;

// =============================================================================
// MILESTONE 1: STATIC EMPIRE VIEW
// =============================================================================

test.describe("M1: Static Empire View", () => {
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
      await ensureGameExists(gamePage, "M1 Creation Test Empire");

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
    test("dashboard displays correct starting resources", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M1 Resource Test Empire");

      const state = await getEmpireState(gamePage);

      expect(state.credits).toBe(100000);
      expect(state.food).toBe(1000);
      expect(state.ore).toBe(500);
      expect(state.petroleum).toBe(200);
      expect(state.researchPoints).toBe(0);
    });

    test("resource panel shows all resource types", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M1 Resource Panel Test Empire");

      const resourcePanel = gamePage.locator('[data-testid="resource-panel"]');
      await expect(resourcePanel).toBeVisible();

      await expect(resourcePanel.locator('[data-testid="credits"]')).toBeVisible();
      await expect(resourcePanel.locator('[data-testid="food"]')).toBeVisible();
      await expect(resourcePanel.locator('[data-testid="ore"]')).toBeVisible();
      await expect(resourcePanel.locator('[data-testid="petroleum"]')).toBeVisible();
      await expect(resourcePanel.locator('[data-testid="research-points"]')).toBeVisible();
    });
  });

  test.describe("Sector System", () => {
    test("sector list shows exactly 5 sectors", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M1 Sector Count Test Empire");

      const state = await getEmpireState(gamePage);
      expect(state.sectorCount).toBe(5);

      const sectorList = gamePage.locator('[data-testid="sector-list"]');
      await expect(sectorList).toContainText("Sectors (5)");
    });

    test("can navigate to sectors page and see all sector cards", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M1 Sectors Page Test Empire");

      await navigateToGamePage(gamePage, "sectors");

      const sectorCards = gamePage.locator('[data-testid^="sector-card-"]');
      await expect(sectorCards).toHaveCount(5);
    });
  });

  test.describe("Population & Civil Status", () => {
    test("population count is exactly 10,000 at game start", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M1 Population Test Empire");

      const state = await getEmpireState(gamePage);
      expect(state.population).toBe(10000);
    });

    test("civil status starts as Content", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M1 Civil Status Test Empire");

      const state = await getEmpireState(gamePage);
      expect(state.civilStatus).toBe("Content");
    });
  });

  test.describe("Military Panel", () => {
    test("military panel shows exactly 100 starting soldiers", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M1 Military Test Empire");

      const state = await getEmpireState(gamePage);
      expect(state.soldiers).toBe(100);
    });
  });

  test.describe("Turn System", () => {
    test("game starts at turn 1", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M1 Turn Counter Test Empire");

      const state = await getEmpireState(gamePage);
      expect(state.turn).toBe(1);
    });

    test("ending turn increments turn counter and updates resources", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M1 Turn Increment Test Empire");

      const { before, after } = await advanceTurn(gamePage);

      expect(after.turn).toBe(before.turn + 1);

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
    test("can navigate to sectors page and back to dashboard", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M1 Navigation Test Empire");

      await gamePage.click('a[href="/game/sectors"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="sectors-page"]')).toBeVisible({ timeout: 10000 });

      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
    });
  });
});

// =============================================================================
// MILESTONE 3: SECTORS, UNITS & RESEARCH
// =============================================================================

test.describe("M3: Sectors, Units & Research", () => {
  test.describe("Research System", () => {
    test("can navigate to research page", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Research Nav Empire");

      await gamePage.click('a[href="/game/research"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator("h1")).toContainText("Research");
    });

    test("research panel shows Level 0 for new game", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Research Level Empire");

      await gamePage.click('a[href="/game/research"]');
      await gamePage.waitForLoadState("networkidle");

      const researchPanel = gamePage.locator('[data-testid="research-panel"]');
      await expect(researchPanel).toBeVisible({ timeout: 10000 });
      await expect(researchPanel).toContainText("Level 0");
    });

    test("research progress component displays correctly", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Research Progress Empire");

      await gamePage.click('a[href="/game/research"]');
      await gamePage.waitForLoadState("networkidle");

      const researchProgress = gamePage.locator('[data-testid="research-progress"]');
      await expect(researchProgress).toBeVisible({ timeout: 10000 });

      const progressText = await researchProgress.textContent();
      expect(progressText).not.toContain("Loading...");
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

      const unitTypes = ["Soldiers", "Fighters", "Stations", "Light Cruisers", "Heavy Cruisers", "Carriers"];

      for (const unitType of unitTypes) {
        await expect(gamePage.locator(`text=${unitType}`)).toBeVisible();
      }
    });
  });

  test.describe("Sectors System", () => {
    test("sectors page loads with 5 starting sectors", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Sectors Load Empire");

      await navigateToGamePage(gamePage, "sectors");

      const sectorCards = gamePage.locator('[data-testid^="sector-card-"]');
      await expect(sectorCards).toHaveCount(5);
    });

    test("sector count matches starting specification", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Sector Types Empire");

      const state = await getEmpireState(gamePage);
      expect(state.sectorCount).toBe(5);
    });
  });

  test.describe("Dashboard Integration", () => {
    test("dashboard shows research points", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Dashboard RP Empire");

      const state = await getEmpireState(gamePage);
      expect(state.researchPoints).toBe(0);

      await expect(gamePage.locator('[data-testid="research-points"]')).toBeVisible();
    });

    test("dashboard updates after turn processing", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M3 Dashboard Update Empire");

      const before = await getEmpireState(gamePage);
      const { after } = await advanceTurn(gamePage);

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
        { href: "/game/sectors", check: "sectors-page" },
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

      await navigateToGamePage(gamePage, "sectors");
      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");

      const afterNav = await getEmpireState(gamePage);

      expect(afterNav.credits).toBe(beforeNav.credits);
      expect(afterNav.turn).toBe(beforeNav.turn);
      expect(afterNav.researchPoints).toBe(beforeNav.researchPoints);
    });
  });
});

// =============================================================================
// MILESTONE 4: COMBAT SYSTEM
// =============================================================================

test.describe("M4: Combat System", () => {
  test.describe("Combat Page Navigation", () => {
    test("can navigate to combat page", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M4 Combat Nav Empire");

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="combat-page"]')).toBeVisible({
        timeout: 10000,
      });
      await expect(gamePage.locator("h1")).toContainText("Combat");
    });

    test("combat page loads without errors", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M4 Combat Load Empire");

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      const pageContent = await gamePage.locator('[data-testid="combat-page"]').textContent();
      expect(pageContent).not.toContain("Error:");
    });
  });

  test.describe("Combat UI Elements", () => {
    test("shows target selection panel", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M4 Target Panel Empire");

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator("text=Select Target")).toBeVisible();
    });

    test("shows attack type options (invasion and guerilla)", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M4 Attack Types Empire");

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator("text=Attack Type")).toBeVisible();
      await expect(gamePage.locator('[data-testid="attack-type-invasion"]')).toBeVisible();
      await expect(gamePage.locator('[data-testid="attack-type-guerilla"]')).toBeVisible();
    });

    test("attack type buttons toggle correctly", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M4 Attack Toggle Empire");

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      await gamePage.click('[data-testid="attack-type-guerilla"]');
      const guerillaButton = gamePage.locator('[data-testid="attack-type-guerilla"]');
      await expect(guerillaButton).toHaveClass(/bg-orange-600/);

      await gamePage.click('[data-testid="attack-type-invasion"]');
      const invasionButton = gamePage.locator('[data-testid="attack-type-invasion"]');
      await expect(invasionButton).toHaveClass(/bg-red-600/);
    });

    test("shows launch attack button", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M4 Attack Button Empire");

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      const attackButton = gamePage.locator('[data-testid="launch-attack-button"]');
      await expect(attackButton).toBeVisible();
      await expect(attackButton).toContainText("LAUNCH ATTACK");
    });

    test("launch attack button disabled without target selection", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M4 Button Disabled Empire");

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      const attackButton = gamePage.locator('[data-testid="launch-attack-button"]');
      await expect(attackButton).toBeDisabled();
    });
  });

  test.describe("Force Selection", () => {
    test("shows force selection inputs with correct starting soldiers", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M4 Force Selection Empire");

      const state = await getEmpireState(gamePage);
      expect(state.soldiers).toBe(100);

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator("text=Select Forces")).toBeVisible();
      await expect(gamePage.locator('[data-testid="force-soldiers"]')).toBeVisible();
    });

    test("guerilla mode disables non-soldier force inputs", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M4 Guerilla Mode Empire");

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      await gamePage.click('[data-testid="attack-type-guerilla"]');

      await expect(gamePage.locator('[data-testid="force-soldiers"]')).not.toBeDisabled();
      await expect(gamePage.locator('[data-testid="force-fighters"]')).toBeDisabled();
      await expect(gamePage.locator('[data-testid="force-carriers"]')).toBeDisabled();
    });

    test("invasion mode enables all force inputs", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M4 Invasion Mode Empire");

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      await gamePage.click('[data-testid="attack-type-invasion"]');

      await expect(gamePage.locator('[data-testid="force-soldiers"]')).not.toBeDisabled();
      await expect(gamePage.locator('[data-testid="force-fighters"]')).not.toBeDisabled();
    });
  });

  test.describe("Target Display", () => {
    test("displays bot empires as potential targets", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M4 Targets Empire");

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      const targetCount = await gamePage.locator('[data-testid^="target-"]').count();
      expect(targetCount).toBeGreaterThan(0);
    });

    test("can select a target empire", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M4 Select Target Empire");

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      const firstTarget = gamePage.locator('[data-testid^="target-"]').first();
      await expect(firstTarget).toBeVisible({ timeout: 10000 });
      await firstTarget.click();

      await expect(firstTarget).toHaveClass(/border-lcars-amber|ring-2|selected/);
    });
  });

  test.describe("Combat State Verification", () => {
    test("state is preserved after visiting combat page", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M4 State Preserve Empire");

      const before = await getEmpireState(gamePage);

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");

      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");

      const after = await getEmpireState(gamePage);

      expect(after.credits).toBe(before.credits);
      expect(after.soldiers).toBe(before.soldiers);
      expect(after.turn).toBe(before.turn);
    });

    test("turn advances without error when no combat initiated", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M4 Turn No Combat Empire");

      const { before, after } = await advanceTurn(gamePage);

      expect(after.turn).toBe(before.turn + 1);
      expect(after.soldiers).toBe(before.soldiers);
    });
  });

  test.describe("Navigation Integration", () => {
    test("can navigate between combat and military pages", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M4 Nav Military Empire");

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="combat-page"]')).toBeVisible();

      await gamePage.click('a[href="/game/military"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator("h1")).toContainText("Military");

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="combat-page"]')).toBeVisible();
    });

    test("can navigate between all game pages including combat", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M4 Nav All Empire");

      const pages = [
        { href: "/game/combat", selector: '[data-testid="combat-page"]' },
        { href: "/game/sectors", selector: '[data-testid="sectors-page"]' },
        { href: "/game/military", selector: "h1" },
        { href: "/game/research", selector: "h1" },
        { href: "/game", selector: '[data-testid="dashboard"]' },
      ];

      for (const pageConfig of pages) {
        await gamePage.click(`a[href="${pageConfig.href}"]`);
        await gamePage.waitForLoadState("networkidle");
        await expect(gamePage.locator(pageConfig.selector).first()).toBeVisible({ timeout: 5000 });
      }
    });
  });
});

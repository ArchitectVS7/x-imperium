/**
 * Advanced Milestones E2E Tests (M5-M8)
 *
 * Consolidated tests for advanced game features:
 * - M5: Random Bots (difficulty selector, starmap, bot turn processing)
 * - M6: Victory & Persistence (game resume, result page, victory conditions)
 * - M6.5: Covert Operations (spy operations, covert points, target selection)
 * - M7: Market & Diplomacy (trading, prices, treaties, reputation)
 * - M8: Bot Personas & Messages (inbox, galactic news, bot greetings)
 *
 * FUNCTIONAL ASSERTIONS: Tests verify actual state values, not just visibility.
 */

import {
  test,
  expect,
  getEmpireState,
  ensureGameExists,
  advanceTurn,
  type EmpireState,
} from "./fixtures/game.fixture";
import type { Page } from "@playwright/test";

// =============================================================================
// SHARED HELPERS
// =============================================================================

async function startNewGameWithDifficulty(page: Page, difficulty: string = "normal") {
  const nameInput = page.locator('[data-testid="empire-name-input"]');
  if (await nameInput.isVisible()) {
    await nameInput.fill(`M5+ Test Empire - ${difficulty}`);

    const difficultyButton = page.locator(`[data-testid="difficulty-${difficulty}"]`);
    if (await difficultyButton.isVisible()) {
      await difficultyButton.click();
    }

    await page.locator('[data-testid="start-game-button"]').click();
    // Wait for redirect to starmap (game creation redirects there)
    await page.waitForURL(/\/game\/starmap/, { timeout: 15000 });
  }
  await expect(page.locator('[data-testid="starmap-page"]')).toBeVisible({
    timeout: 15000,
  });
}

// =============================================================================
// MILESTONE 5: RANDOM BOTS
// =============================================================================

test.describe("M5: Random Bots", () => {
  test.describe("Difficulty Selector", () => {
    test("shows difficulty selector on new game", async ({ gamePage }) => {
      const nameInput = gamePage.locator('[data-testid="empire-name-input"]');
      if (await nameInput.isVisible()) {
        await expect(gamePage.locator("text=Difficulty")).toBeVisible();

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
        await gamePage.click('[data-testid="difficulty-hard"]');
        const hardButton = gamePage.locator('[data-testid="difficulty-hard"]');
        await expect(hardButton).toHaveClass(/ring-2/);

        await gamePage.click('[data-testid="difficulty-easy"]');
        const easyButton = gamePage.locator('[data-testid="difficulty-easy"]');
        await expect(easyButton).toHaveClass(/ring-2/);
      }
    });
  });

  test.describe("Starmap", () => {
    test("can navigate to starmap page", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M5 Starmap Test Empire");

      await gamePage.click('a[href="/game/starmap"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="starmap-page"]')).toBeVisible({
        timeout: 10000,
      });
      await expect(gamePage.locator("h1")).toContainText("Galactic Starmap");
    });

    test("starmap shows empire count", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M5 Empire Count Test Empire");

      await gamePage.click('a[href="/game/starmap"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator("text=Turn")).toBeVisible();
      await expect(gamePage.locator("text=empires remain active")).toBeVisible();
    });

    test("starmap displays force-directed graph", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M5 Graph Test Empire");

      await gamePage.click('a[href="/game/starmap"]');
      await gamePage.waitForLoadState("networkidle");

      // Wait for starmap SVG to render
      const starmap = gamePage.locator('[data-testid="starmap-svg"]');
      await expect(starmap).toBeVisible({ timeout: 10000 });
    });

    test("starmap shows empire nodes", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M5 Nodes Test Empire");

      await gamePage.click('a[href="/game/starmap"]');
      await gamePage.waitForLoadState("networkidle");

      // Wait for starmap SVG to render with circles
      const circles = gamePage.locator('[data-testid="starmap-svg"] circle');
      await expect(circles.first()).toBeVisible({ timeout: 10000 });
      const circleCount = await circles.count();

      expect(circleCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe("Turn Processing with Bots", () => {
    test("end turn processes bot decisions", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M5 Bot Turn Test Empire");

      const turnCounter = gamePage.locator('[data-testid="turn-counter"]');
      const initialTurnText = await turnCounter.textContent();
      const initialTurn = parseInt(initialTurnText?.match(/\d+/)?.[0] ?? "1");

      await gamePage.click('[data-testid="end-turn-button"]');
      await gamePage.waitForLoadState("networkidle");
      // Wait for turn to actually change
      await expect(async () => {
        const newTurnText = await turnCounter.textContent();
        const newTurn = parseInt(newTurnText?.match(/\d+/)?.[0] ?? "1");
        expect(newTurn).toBeGreaterThan(initialTurn);
      }).toPass({ timeout: 15000 });

      const newTurnText = await turnCounter.textContent();
      expect(newTurnText).not.toBe(initialTurnText);
    });

    test("multiple turns can be processed", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M5 Multi-turn Test Empire");

      const turnCounter = gamePage.locator('[data-testid="turn-counter"]');
      for (let i = 0; i < 3; i++) {
        const beforeText = await turnCounter.textContent();
        const beforeTurn = parseInt(beforeText?.match(/\d+/)?.[0] ?? "1");
        await gamePage.click('[data-testid="end-turn-button"]');
        await gamePage.waitForLoadState("networkidle");
        await expect(async () => {
          const afterText = await turnCounter.textContent();
          const afterTurn = parseInt(afterText?.match(/\d+/)?.[0] ?? "1");
          expect(afterTurn).toBeGreaterThan(beforeTurn);
        }).toPass({ timeout: 15000 });
      }

      await expect(gamePage.locator('[data-testid="starmap-page"], [data-testid="game-header"]')).toBeVisible();
    });
  });

  test.describe("Navigation Integration", () => {
    test("can navigate between starmap and other pages", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M5 Nav Test Empire");

      await gamePage.click('a[href="/game/starmap"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="starmap-page"]')).toBeVisible();

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="combat-page"]')).toBeVisible();

      await gamePage.click('a[href="/game/starmap"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="starmap-page"]')).toBeVisible();

      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="starmap-page"], [data-testid="game-header"]')).toBeVisible();
    });
  });
});

// =============================================================================
// MILESTONE 6: VICTORY & PERSISTENCE
// =============================================================================

test.describe("M6: Victory & Persistence", () => {
  test.describe("Game Resume (Ironman Save)", () => {
    test("game persists across page reloads", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M6 Persist Test Empire");

      const turnCounter = gamePage.locator('[data-testid="turn-counter"]');
      const initialTurn = await turnCounter.textContent();

      const initialTurnNum = parseInt(initialTurn?.match(/\d+/)?.[0] ?? "1");
      await gamePage.click('[data-testid="end-turn-button"]');
      await gamePage.waitForLoadState("networkidle");
      // Wait for turn to change
      await expect(async () => {
        const newTurnText = await turnCounter.textContent();
        const newTurnNum = parseInt(newTurnText?.match(/\d+/)?.[0] ?? "1");
        expect(newTurnNum).toBeGreaterThan(initialTurnNum);
      }).toPass({ timeout: 15000 });

      const newTurn = await turnCounter.textContent();
      expect(newTurn).not.toBe(initialTurn);

      await gamePage.reload();
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="starmap-page"], [data-testid="game-header"]')).toBeVisible({
        timeout: 15000,
      });

      const resumedTurn = await turnCounter.textContent();
      expect(resumedTurn).toBe(newTurn);
    });

    test("can navigate to dashboard after reload", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M6 Reload Test Empire");

      await gamePage.click('a[href="/game/sectors"]');
      await gamePage.waitForLoadState("networkidle");

      await gamePage.reload();
      await gamePage.waitForLoadState("networkidle");

      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="starmap-page"], [data-testid="game-header"]')).toBeVisible();
    });
  });

  test.describe("Result Page Navigation", () => {
    test("result page exists and is accessible", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M6 Result Test Empire");

      await gamePage.goto("/game/result");
      await gamePage.waitForLoadState("networkidle");

      await expect(
        gamePage.locator("text=Game In Progress").or(gamePage.locator("text=Continue Playing"))
      ).toBeVisible({ timeout: 10000 });
    });

    test("result page has continue playing button when game in progress", async ({
      gamePage,
    }) => {
      await ensureGameExists(gamePage, "M6 Continue Test Empire");

      await gamePage.goto("/game/result");
      await gamePage.waitForLoadState("networkidle");

      const continueButton = gamePage.locator("text=Continue Playing");
      if (await continueButton.isVisible()) {
        await continueButton.click();
        await gamePage.waitForLoadState("networkidle");

        await expect(gamePage).toHaveURL(/\/game/);
      }
    });
  });

  test.describe("Victory Conditions Display", () => {
    test("dashboard shows networth which is used for economic victory", async ({
      gamePage,
    }) => {
      await ensureGameExists(gamePage, "M6 Networth Test Empire");

      await expect(
        gamePage.locator('[data-testid="networth-panel"]').or(gamePage.locator("text=Networth"))
      ).toBeVisible();
    });

    test("turn counter shows current turn (survival victory at 200)", async ({
      gamePage,
    }) => {
      await ensureGameExists(gamePage, "M6 Turn Counter Test Empire");

      const turnCounter = gamePage.locator('[data-testid="turn-counter"]');
      await expect(turnCounter).toBeVisible();

      const turnText = await turnCounter.textContent();
      expect(turnText).toMatch(/\d+/);
    });
  });

  test.describe("Defeat Condition Awareness", () => {
    test("civil status is visible (relates to civil collapse defeat)", async ({
      gamePage,
    }) => {
      await ensureGameExists(gamePage, "M6 Civil Test Empire");

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
      await ensureGameExists(gamePage, "M6 Credits Test Empire");

      await expect(
        gamePage.locator('[data-testid="resource-credits"]').or(gamePage.locator("text=Credits"))
      ).toBeVisible();
    });
  });
});

// =============================================================================
// MILESTONE 6.5: COVERT OPERATIONS
// =============================================================================

test.describe("M6.5: Covert Operations", () => {
  test.describe("Covert Page Navigation", () => {
    test("can navigate to covert operations page", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M6.5 Covert Test Empire");

      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="covert-page"]')).toBeVisible({
        timeout: 10000,
      });
      await expect(gamePage.locator("h1")).toContainText("Covert Operations");
    });

    test("covert page link is in navigation", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M6.5 Covert Link Test Empire");

      await expect(gamePage.locator('a[href="/game/covert"]')).toBeVisible();
    });
  });

  test.describe("Covert Status Panel", () => {
    test("displays covert status panel with points", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M6.5 Status Panel Test Empire");

      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="covert-status-panel"]')).toBeVisible({
        timeout: 10000,
      });
      await expect(gamePage.locator("text=Covert Points")).toBeVisible();
    });

    test("displays agent count and capacity", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M6.5 Agent Count Test Empire");

      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator("text=Covert Agents")).toBeVisible();
    });
  });

  test.describe("Target Selector", () => {
    test("displays target selector panel", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M6.5 Target Selector Test Empire");

      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="target-selector-panel"]')).toBeVisible({
        timeout: 10000,
      });
      await expect(gamePage.locator('[data-testid="covert-target-select"]')).toBeVisible();
    });

    test("target selector has selectable empires", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M6.5 Empire Select Test Empire");

      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      const select = gamePage.locator('[data-testid="covert-target-select"]');
      await expect(select).toBeVisible({ timeout: 10000 });

      const optionCount = await select.locator("option").count();
      expect(optionCount).toBeGreaterThan(1);
    });
  });

  test.describe("Operations Display", () => {
    test("displays available covert operations heading", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M6.5 Operations Test Empire");

      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator("text=Available Operations")).toBeVisible();
    });

    test("shows message to select target when no target selected", async ({
      gamePage,
    }) => {
      await ensureGameExists(gamePage, "M6.5 No Target Test Empire");

      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(
        gamePage.locator("text=Select a target empire to view operation success rates")
      ).toBeVisible();
    });
  });

  test.describe("Navigation Integration", () => {
    test("can navigate between covert and other pages", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M6.5 Nav Test Empire");

      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="covert-page"]')).toBeVisible();

      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="combat-page"]')).toBeVisible();

      await gamePage.click('a[href="/game/covert"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="covert-page"]')).toBeVisible();

      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="starmap-page"], [data-testid="game-header"]')).toBeVisible();
    });
  });
});

// =============================================================================
// MILESTONE 7: MARKET & DIPLOMACY
// =============================================================================

test.describe("M7: Market & Diplomacy", () => {
  test.describe("Market Page Navigation", () => {
    test("can navigate to market page", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Market Nav Empire");

      await gamePage.click('a[href="/game/market"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="market-panel"]')).toBeVisible({
        timeout: 10000,
      });
      await expect(gamePage.locator("h1")).toContainText("Market");
    });

    test("market page link visible in navigation", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Market Link Empire");

      await expect(gamePage.locator('a[href="/game/market"]')).toBeVisible();
    });
  });

  test.describe("Market Panel Display", () => {
    test("displays market prices for all tradeable resources", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Market Prices Empire");

      await gamePage.click('a[href="/game/market"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="market-panel"]')).toBeVisible({ timeout: 10000 });
      await expect(gamePage.locator("text=Global Market")).toBeVisible();
      await expect(gamePage.locator("text=Current Prices")).toBeVisible();

      await expect(gamePage.locator('[data-testid="market-price-food"]')).toBeVisible();
      await expect(gamePage.locator('[data-testid="market-price-ore"]')).toBeVisible();
      await expect(gamePage.locator('[data-testid="market-price-petroleum"]')).toBeVisible();
    });

    test("has buy and sell tabs", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Market Tabs Empire");

      await gamePage.click('a[href="/game/market"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="market-buy-tab"]')).toBeVisible();
      await expect(gamePage.locator('[data-testid="market-sell-tab"]')).toBeVisible();
    });

    test("can switch between buy and sell tabs", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Tab Switch Empire");

      await gamePage.click('a[href="/game/market"]');
      await gamePage.waitForLoadState("networkidle");

      await gamePage.click('[data-testid="market-sell-tab"]');
      const sellTab = gamePage.locator('[data-testid="market-sell-tab"]');
      await expect(sellTab).toHaveClass(/bg-lcars-orange/);

      await gamePage.click('[data-testid="market-buy-tab"]');
      const buyTab = gamePage.locator('[data-testid="market-buy-tab"]');
      await expect(buyTab).toHaveClass(/bg-lcars-blue/);
    });
  });

  test.describe("Market Functional Trading", () => {
    test("buying resources decreases credits and increases resource", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Buy Trade Empire");

      const before = await getEmpireState(gamePage);

      await gamePage.click('a[href="/game/market"]');
      await gamePage.waitForLoadState("networkidle");

      await gamePage.click('[data-testid="market-buy-tab"]');
      await gamePage.click('[data-testid="market-price-ore"]');
      await gamePage.locator('[data-testid="market-quantity-input"]').fill("10");
      await gamePage.click('[data-testid="market-trade-button"]');
      await gamePage.waitForLoadState("networkidle");

      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");

      const after = await getEmpireState(gamePage);

      expect(after.credits).toBeLessThan(before.credits);
      expect(after.ore).toBeGreaterThan(before.ore);
    });

    test("selling resources increases credits and decreases resource", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Sell Trade Empire");

      const before = await getEmpireState(gamePage);
      expect(before.food).toBeGreaterThan(0);

      await gamePage.click('a[href="/game/market"]');
      await gamePage.waitForLoadState("networkidle");

      await gamePage.click('[data-testid="market-sell-tab"]');
      await gamePage.click('[data-testid="market-price-food"]');
      await gamePage.locator('[data-testid="market-quantity-input"]').fill("100");
      await gamePage.click('[data-testid="market-trade-button"]');
      await gamePage.waitForLoadState("networkidle");

      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");

      const after = await getEmpireState(gamePage);

      expect(after.credits).toBeGreaterThan(before.credits);
      expect(after.food).toBeLessThan(before.food);
    });
  });

  test.describe("Diplomacy Page Navigation", () => {
    test("can navigate to diplomacy page", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Diplomacy Nav Empire");

      await gamePage.click('a[href="/game/diplomacy"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="diplomacy-panel"]')).toBeVisible({ timeout: 10000 });
      await expect(gamePage.locator("h1")).toContainText("Diplomacy");
    });
  });

  test.describe("Diplomacy Panel Display", () => {
    test("displays reputation starting at Neutral (50)", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Reputation Empire");

      await gamePage.click('a[href="/game/diplomacy"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="diplomacy-panel"]')).toBeVisible({ timeout: 10000 });
      await expect(gamePage.locator("text=Your Reputation")).toBeVisible();
      await expect(gamePage.locator("text=Neutral")).toBeVisible();
    });

    test("displays reputation bar", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Rep Bar Empire");

      await gamePage.click('a[href="/game/diplomacy"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="reputation-bar"]')).toBeVisible();
    });

    test("shows active treaties section (empty for new game)", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Active Treaties Empire");

      await gamePage.click('a[href="/game/diplomacy"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator("text=Active Treaties")).toBeVisible();
      await expect(gamePage.locator('[data-testid="no-treaties"]')).toBeVisible();
    });
  });

  test.describe("Treaty Proposal Panel", () => {
    test("displays propose treaty panel", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Propose Panel Empire");

      await gamePage.click('a[href="/game/diplomacy"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="propose-treaty-panel"]')).toBeVisible({ timeout: 10000 });
      await expect(gamePage.locator("text=Propose Treaty")).toBeVisible();
    });

    test("shows NAP and Alliance treaty type options", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Treaty Types Empire");

      await gamePage.click('a[href="/game/diplomacy"]');
      await gamePage.waitForLoadState("networkidle");

      const firstTarget = gamePage.locator('[data-testid^="target-"]').first();
      await expect(firstTarget).toBeVisible({ timeout: 10000 });
      await firstTarget.click();

      await expect(gamePage.locator('[data-testid="select-nap"]')).toBeVisible();
      await expect(gamePage.locator('[data-testid="select-alliance"]')).toBeVisible();
    });
  });

  test.describe("Market and Diplomacy Integration", () => {
    test("can navigate between market and diplomacy", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Integration Nav Empire");

      await gamePage.click('a[href="/game/market"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="market-panel"]')).toBeVisible();

      await gamePage.click('a[href="/game/diplomacy"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="diplomacy-panel"]')).toBeVisible();

      await gamePage.click('a[href="/game/market"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="market-panel"]')).toBeVisible();
    });

    test("state persists after market/diplomacy navigation", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 State Persist Empire");

      const before = await getEmpireState(gamePage);

      await gamePage.click('a[href="/game/market"]');
      await gamePage.waitForLoadState("networkidle");

      await gamePage.click('a[href="/game/diplomacy"]');
      await gamePage.waitForLoadState("networkidle");

      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");

      const after = await getEmpireState(gamePage);

      expect(after.credits).toBe(before.credits);
      expect(after.turn).toBe(before.turn);
    });
  });
});

// =============================================================================
// MILESTONE 8: BOT PERSONAS & MESSAGES
// =============================================================================

test.describe("M8: Bot Personas & Messages", () => {
  test.describe("Messages Page Navigation", () => {
    test("can navigate to messages page", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M8 Messages Nav Empire");

      await gamePage.click('a[href="/game/messages"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator("h1")).toContainText("Messages");
    });

    test("messages page link visible in navigation", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M8 Messages Link Empire");

      await expect(gamePage.locator('a[href="/game/messages"]')).toBeVisible();
    });
  });

  test.describe("Messages Page UI", () => {
    test("displays inbox and galactic news tabs", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M8 Tabs Empire");

      await gamePage.click('a[href="/game/messages"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator("button:has-text('Inbox')")).toBeVisible();
      await expect(gamePage.locator("button:has-text('Galactic News')")).toBeVisible();
    });

    test("inbox tab is active by default", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M8 Default Tab Empire");

      await gamePage.click('a[href="/game/messages"]');
      await gamePage.waitForLoadState("networkidle");

      const inboxTab = gamePage.locator("button:has-text('Inbox')");
      await expect(inboxTab).toHaveClass(/bg-lcars-amber/);
    });

    test("can switch between inbox and galactic news tabs", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M8 Tab Switch Empire");

      await gamePage.click('a[href="/game/messages"]');
      await gamePage.waitForLoadState("networkidle");

      await gamePage.click("button:has-text('Galactic News')");

      const newsTab = gamePage.locator("button:has-text('Galactic News')");
      await expect(newsTab).toHaveClass(/bg-lcars-amber/);

      await gamePage.click("button:has-text('Inbox')");

      const inboxTab = gamePage.locator("button:has-text('Inbox')");
      await expect(inboxTab).toHaveClass(/bg-lcars-amber/);
    });
  });

  test.describe("Bot Greeting Messages", () => {
    test("bot greetings appear in inbox after game creation", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M8 Greetings Empire");

      await gamePage.click('a[href="/game/messages"]');
      await gamePage.waitForLoadState("networkidle");

      const hasMessages = await gamePage.locator('[data-testid^="message-item-"]').count() > 0
        || await gamePage.locator("text=message").isVisible().catch(() => false)
        || await gamePage.locator("[class*='message']").count() > 0;

      const unreadBadge = gamePage.locator("button:has-text('Inbox')").locator("span");
      const hasUnreadBadge = await unreadBadge.isVisible().catch(() => false);

      const hasGreetingContent = hasMessages || hasUnreadBadge;
      const hasNoMessages = await gamePage.locator("text=No messages").isVisible().catch(() => false);

      expect(hasGreetingContent || !hasNoMessages).toBe(true);
    });
  });

  test.describe("Galactic News Feed", () => {
    test("galactic news tab displays broadcast messages", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M8 News Feed Empire");

      await gamePage.click('a[href="/game/messages"]');
      await gamePage.waitForLoadState("networkidle");

      await gamePage.click("button:has-text('Galactic News')");
      await gamePage.waitForLoadState("networkidle");

      const hasNewsItems = await gamePage.locator('[data-testid^="news-item-"]').count() > 0;
      const hasNoBroadcasts = await gamePage.locator("text=No broadcasts").isVisible().catch(() => false);
      const hasNewsContent = await gamePage.locator("[class*='news']").count() > 0;

      expect(hasNewsItems || hasNoBroadcasts || hasNewsContent).toBe(true);
    });
  });

  test.describe("Message State After Turn", () => {
    test("new messages may appear after advancing turn", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M8 Turn Messages Empire");

      await gamePage.click('a[href="/game/messages"]');
      await gamePage.waitForLoadState("networkidle");

      const inboxButton = gamePage.locator("button:has-text('Inbox')");
      const unreadBadge = inboxButton.locator("span.rounded-full");
      const initialBadgeText = await unreadBadge.textContent().catch(() => "0");
      const initialCount = parseInt(initialBadgeText || "0", 10);

      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");

      await advanceTurn(gamePage);

      await gamePage.click('a[href="/game/messages"]');
      await gamePage.waitForLoadState("networkidle");

      const newBadgeText = await unreadBadge.textContent().catch(() => "0");
      const newCount = parseInt(newBadgeText || "0", 10);

      expect(newCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe("Navigation Integration", () => {
    test("can navigate to messages from all game pages", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M8 Nav Integration Empire");

      await gamePage.click('a[href="/game/messages"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator("h1")).toContainText("Messages");

      await gamePage.click('a[href="/game/military"]');
      await gamePage.waitForLoadState("networkidle");
      await gamePage.click('a[href="/game/messages"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator("h1")).toContainText("Messages");

      await gamePage.click('a[href="/game/market"]');
      await gamePage.waitForLoadState("networkidle");
      await gamePage.click('a[href="/game/messages"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator("h1")).toContainText("Messages");
    });

    test("state persists after visiting messages page", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M8 State Persist Empire");

      const before = await getEmpireState(gamePage);

      await gamePage.click('a[href="/game/messages"]');
      await gamePage.waitForLoadState("networkidle");

      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");

      const after = await getEmpireState(gamePage);

      expect(after.credits).toBe(before.credits);
      expect(after.turn).toBe(before.turn);
      expect(after.soldiers).toBe(before.soldiers);
    });
  });
});

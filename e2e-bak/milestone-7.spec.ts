/**
 * Milestone 7: Market & Diplomacy - E2E Tests
 *
 * Tests verify that:
 * - Market UI displays correctly with prices
 * - Trading resources changes state (credits, resources)
 * - Diplomacy panel shows reputation and treaties
 * - Treaty proposals can be sent
 *
 * FUNCTIONAL ASSERTIONS: Tests verify actual state changes after trades.
 */

import {
  test,
  expect,
  getEmpireState,
  ensureGameExists,
  verifyResourceChange,
  assertCreditsSpent,
  waitForResourceChange,
  type EmpireState,
} from "./fixtures/game.fixture";

// =============================================================================
// CONSTANTS - Base market prices from PRD
// =============================================================================

const BASE_PRICES = {
  food: 10,
  ore: 15,
  petroleum: 25,
};

// =============================================================================
// TEST SUITE
// =============================================================================

test.describe("Milestone 7: Market & Diplomacy", () => {
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

      // All tradeable resources should have price rows
      await expect(gamePage.locator('[data-testid="market-price-food"]')).toBeVisible();
      await expect(gamePage.locator('[data-testid="market-price-ore"]')).toBeVisible();
      await expect(gamePage.locator('[data-testid="market-price-petroleum"]')).toBeVisible();
    });

    test("displays player resources in market context", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Market Resources Empire");

      const state = await getEmpireState(gamePage);

      await gamePage.click('a[href="/game/market"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator("text=Your Resources")).toBeVisible();
      await expect(gamePage.locator("text=Credits")).toBeVisible();
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

      // Click sell tab
      await gamePage.click('[data-testid="market-sell-tab"]');
      const sellTab = gamePage.locator('[data-testid="market-sell-tab"]');
      await expect(sellTab).toHaveClass(/bg-lcars-orange/);

      // Click buy tab
      await gamePage.click('[data-testid="market-buy-tab"]');
      const buyTab = gamePage.locator('[data-testid="market-buy-tab"]');
      await expect(buyTab).toHaveClass(/bg-lcars-blue/);
    });
  });

  test.describe("Market Trading UI", () => {
    test("has quantity input field", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Quantity Input Empire");

      await gamePage.click('a[href="/game/market"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="market-quantity-input"]')).toBeVisible();
    });

    test("can enter quantity and see cost preview", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Cost Preview Empire");

      await gamePage.click('a[href="/game/market"]');
      await gamePage.waitForLoadState("networkidle");

      // Select food for trading
      await gamePage.click('[data-testid="market-price-food"]');

      // Enter quantity
      const quantityInput = gamePage.locator('[data-testid="market-quantity-input"]');
      await quantityInput.fill("50");

      // Should show price information
      await expect(
        gamePage.locator("text=Price per unit")
          .or(gamePage.locator("text=Total Cost"))
          .or(gamePage.locator("text=Total"))
      ).toBeVisible();
    });

    test("has trade button", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Trade Button Empire");

      await gamePage.click('a[href="/game/market"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="market-trade-button"]')).toBeVisible();
    });

    test("can select different resources to trade", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Select Resource Empire");

      await gamePage.click('a[href="/game/market"]');
      await gamePage.waitForLoadState("networkidle");

      // Click ore resource row
      await gamePage.click('[data-testid="market-price-ore"]');

      // Ore row should be highlighted
      await expect(gamePage.locator('[data-testid="market-price-ore"]')).toHaveClass(/border-lcars-amber/);
    });
  });

  test.describe("Market Functional Trading", () => {
    test("buying resources decreases credits and increases resource", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Buy Trade Empire");

      const before = await getEmpireState(gamePage);

      await gamePage.click('a[href="/game/market"]');
      await gamePage.waitForLoadState("networkidle");

      // Ensure buy tab is selected
      await gamePage.click('[data-testid="market-buy-tab"]');

      // Select ore (price ~15 credits)
      await gamePage.click('[data-testid="market-price-ore"]');

      // Enter quantity (buy 10 ore = ~150 credits with fees)
      await gamePage.locator('[data-testid="market-quantity-input"]').fill("10");

      // Execute trade
      await gamePage.click('[data-testid="market-trade-button"]');
      await gamePage.waitForLoadState("networkidle");

      // Return to dashboard to check state
      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");

      const after = await getEmpireState(gamePage);

      // FUNCTIONAL: Credits should decrease, ore should increase
      expect(after.credits).toBeLessThan(before.credits);
      expect(after.ore).toBeGreaterThan(before.ore);
    });

    test("selling resources increases credits and decreases resource", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Sell Trade Empire");

      const before = await getEmpireState(gamePage);
      expect(before.food).toBeGreaterThan(0); // Should have food to sell

      await gamePage.click('a[href="/game/market"]');
      await gamePage.waitForLoadState("networkidle");

      // Switch to sell tab
      await gamePage.click('[data-testid="market-sell-tab"]');

      // Select food
      await gamePage.click('[data-testid="market-price-food"]');

      // Enter quantity to sell
      await gamePage.locator('[data-testid="market-quantity-input"]').fill("100");

      // Execute trade
      await gamePage.click('[data-testid="market-trade-button"]');
      await gamePage.waitForLoadState("networkidle");

      // Return to dashboard
      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");

      const after = await getEmpireState(gamePage);

      // FUNCTIONAL: Credits should increase, food should decrease
      expect(after.credits).toBeGreaterThan(before.credits);
      expect(after.food).toBeLessThan(before.food);
    });

    test("cannot buy more than credits allow", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Insufficient Credits Empire");

      const state = await getEmpireState(gamePage);

      await gamePage.click('a[href="/game/market"]');
      await gamePage.waitForLoadState("networkidle");

      // Try to buy a huge amount
      await gamePage.click('[data-testid="market-buy-tab"]');
      await gamePage.click('[data-testid="market-price-petroleum"]');
      await gamePage.locator('[data-testid="market-quantity-input"]').fill("999999");

      // Should show error or disable button
      const tradeButton = gamePage.locator('[data-testid="market-trade-button"]');
      const isDisabled = await tradeButton.isDisabled();
      const hasError = await gamePage.locator('[data-testid="market-validation-error"]').isVisible().catch(() => false);
      const hasInsufficientMsg = await gamePage.locator("text=Insufficient").isVisible().catch(() => false);

      expect(isDisabled || hasError || hasInsufficientMsg).toBe(true);
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

    test("diplomacy page link visible in navigation", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Diplomacy Link Empire");

      await expect(gamePage.locator('a[href="/game/diplomacy"]')).toBeVisible();
    });
  });

  test.describe("Diplomacy Panel Display", () => {
    test("displays reputation starting at Neutral (50)", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Reputation Empire");

      await gamePage.click('a[href="/game/diplomacy"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator('[data-testid="diplomacy-panel"]')).toBeVisible({ timeout: 10000 });
      await expect(gamePage.locator("text=Your Reputation")).toBeVisible();

      // Should show reputation level (Neutral for new game)
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

    test("displays list of empires for treaty proposals", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Empire List Empire");

      await gamePage.click('a[href="/game/diplomacy"]');
      await gamePage.waitForLoadState("networkidle");

      await expect(gamePage.locator("text=Select Empire")).toBeVisible();

      // Should have bot empires as targets
      const targetCount = await gamePage.locator('[data-testid^="target-"]').count();
      expect(targetCount).toBeGreaterThan(0);
    });

    test("can select an empire for treaty proposal", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Select Empire Empire");

      await gamePage.click('a[href="/game/diplomacy"]');
      await gamePage.waitForLoadState("networkidle");

      // Select first empire
      const firstTarget = gamePage.locator('[data-testid^="target-"]').first();
      await expect(firstTarget).toBeVisible({ timeout: 10000 });
      await firstTarget.click();

      // Treaty type selection should appear
      await expect(gamePage.locator("text=Treaty Type")).toBeVisible();
    });

    test("shows NAP and Alliance treaty type options", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Treaty Types Empire");

      await gamePage.click('a[href="/game/diplomacy"]');
      await gamePage.waitForLoadState("networkidle");

      // Select an empire first
      const firstTarget = gamePage.locator('[data-testid^="target-"]').first();
      await expect(firstTarget).toBeVisible({ timeout: 10000 });
      await firstTarget.click();

      // Both treaty types should be available
      await expect(gamePage.locator('[data-testid="select-nap"]')).toBeVisible();
      await expect(gamePage.locator('[data-testid="select-alliance"]')).toBeVisible();
    });

    test("shows treaty benefits when target selected", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Treaty Benefits Empire");

      await gamePage.click('a[href="/game/diplomacy"]');
      await gamePage.waitForLoadState("networkidle");

      const firstTarget = gamePage.locator('[data-testid^="target-"]').first();
      await expect(firstTarget).toBeVisible({ timeout: 10000 });
      await firstTarget.click();

      await expect(gamePage.locator("text=Benefits")).toBeVisible();
    });

    test("has send proposal button with correct state", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Send Button Empire");

      await gamePage.click('a[href="/game/diplomacy"]');
      await gamePage.waitForLoadState("networkidle");

      const sendButton = gamePage.locator('[data-testid="send-proposal-button"]');
      await expect(sendButton).toBeVisible();

      // Without target, should prompt to select empire
      await expect(sendButton).toContainText("Select an empire");
    });

    test("can send treaty proposal", async ({ gamePage }) => {
      await ensureGameExists(gamePage, "M7 Send Proposal Empire");

      await gamePage.click('a[href="/game/diplomacy"]');
      await gamePage.waitForLoadState("networkidle");

      // Select target empire
      const firstTarget = gamePage.locator('[data-testid^="target-"]').first();
      await expect(firstTarget).toBeVisible({ timeout: 10000 });
      await firstTarget.click();

      // Select NAP treaty type
      await gamePage.click('[data-testid="select-nap"]');

      // Send proposal
      const sendButton = gamePage.locator('[data-testid="send-proposal-button"]');
      await expect(sendButton).toBeEnabled();
      await sendButton.click();

      // Should show some confirmation or state change
      // Either success message or proposal pending state
      await expect(
        gamePage.locator("text=Proposal sent")
          .or(gamePage.locator("text=Pending"))
          .or(gamePage.locator('[data-testid="proposal-success"]'))
      ).toBeVisible({ timeout: 5000 });
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

      // Navigate to market
      await gamePage.click('a[href="/game/market"]');
      await gamePage.waitForLoadState("networkidle");

      // Navigate to diplomacy
      await gamePage.click('a[href="/game/diplomacy"]');
      await gamePage.waitForLoadState("networkidle");

      // Return to dashboard
      await gamePage.click('a[href="/game"]');
      await gamePage.waitForLoadState("networkidle");

      const after = await getEmpireState(gamePage);

      // FUNCTIONAL: State unchanged by navigation alone
      expect(after.credits).toBe(before.credits);
      expect(after.turn).toBe(before.turn);
    });
  });
});

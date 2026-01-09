/**
 * Functional E2E Test Template for X-Imperium
 *
 * This template demonstrates the REQUIRED pattern for all E2E tests:
 * 1. Setup: Create game and navigate to relevant page
 * 2. Capture State BEFORE: Use getEmpireState() to capture pre-action state
 * 3. Perform Action: Click buttons, submit forms, etc.
 * 4. Capture State AFTER: Use getEmpireState() to capture post-action state
 * 5. Verify Change: Assert that state changed as expected
 *
 * ANTI-PATTERN (DO NOT DO):
 * - Testing only visibility (toBeVisible) without verifying data
 * - Using waitForTimeout() with arbitrary values
 * - Not capturing before/after state
 *
 * CORRECT PATTERN:
 * - Always verify actual values, not just visibility
 * - Use condition-based waits (waitForTurnChange, waitForResourceChange)
 * - Assert state deltas match expected changes
 */

import {
  test,
  expect,
  getEmpireState,
  ensureGameExists,
  navigateToGamePage,
  advanceTurn,
  verifyResourceChange,
  assertCreditsSpent,
  waitForResourceChange,
  waitForTurnChange,
  type EmpireState,
  type ResourceDelta,
} from "../fixtures/game.fixture";

// =============================================================================
// EXAMPLE: Testing a Purchase Action
// =============================================================================

test.describe("Template: Purchase Action Test Pattern", () => {
  test("buying something decreases credits and increases the purchased item", async ({ gamePage }) => {
    // 1. SETUP: Ensure game exists
    await ensureGameExists(gamePage, "Template Test Empire");

    // 2. CAPTURE STATE BEFORE
    const before = await getEmpireState(gamePage);

    // 3. PERFORM ACTION
    // Example: Navigate to market and buy ore
    // await navigateToGamePage(gamePage, "market");
    // await gamePage.click('[data-testid="buy-ore-100"]');
    // await gamePage.waitForLoadState("networkidle");

    // 4. CAPTURE STATE AFTER
    const after = await getEmpireState(gamePage);

    // 5. VERIFY CHANGE
    // Credits should decrease
    // assertCreditsSpent(before, after);

    // OR verify specific delta
    // verifyResourceChange(before, after, { credits: -1500, ore: 100 });
  });
});

// =============================================================================
// EXAMPLE: Testing Turn Processing
// =============================================================================

test.describe("Template: Turn Processing Test Pattern", () => {
  test("ending turn processes resources correctly", async ({ gamePage }) => {
    // 1. SETUP
    await ensureGameExists(gamePage, "Turn Test Empire");

    // 2-4. CAPTURE BEFORE, ACTION, CAPTURE AFTER (all in advanceTurn)
    const { before, after } = await advanceTurn(gamePage);

    // 5. VERIFY CHANGES
    // Turn incremented
    expect(after.turn).toBe(before.turn + 1);

    // Resources changed (production happened)
    // With 2 food sectors (100 food/turn each) and 1000 starting food:
    // after.food should be greater (production) or lower (if consumption > production)
    const resourceDelta = after.food - before.food;
    expect(resourceDelta).not.toBe(0); // Something changed

    // Research points should increase (1 research sector = 100 RP/turn)
    expect(after.researchPoints).toBeGreaterThan(before.researchPoints);
  });
});

// =============================================================================
// EXAMPLE: Testing with Wait Conditions (NOT arbitrary timeouts)
// =============================================================================

test.describe("Template: Conditional Wait Pattern", () => {
  test("waiting for resource change instead of arbitrary timeout", async ({ gamePage }) => {
    await ensureGameExists(gamePage, "Wait Test Empire");

    const before = await getEmpireState(gamePage);

    // Perform action that will change credits
    // await gamePage.click('[data-testid="buy-something"]');

    // CORRECT: Wait for the resource to actually change
    // await waitForResourceChange(gamePage, "credits", before.credits);

    // INCORRECT (do not do this):
    // await gamePage.waitForTimeout(3000); // Arbitrary wait

    const after = await getEmpireState(gamePage);
    // Verify the change
  });
});

// =============================================================================
// EXAMPLE: Testing Navigation with State Preservation
// =============================================================================

test.describe("Template: Navigation Test Pattern", () => {
  test("state persists after navigation", async ({ gamePage }) => {
    await ensureGameExists(gamePage, "Navigation Test Empire");

    // Get initial state on dashboard
    const dashboardState = await getEmpireState(gamePage);

    // Navigate to another page
    await navigateToGamePage(gamePage, "sectors");

    // Navigate back to dashboard
    await gamePage.click('a[href="/game"]');
    await gamePage.waitForLoadState("networkidle");

    // Get state after navigation
    const afterNavState = await getEmpireState(gamePage);

    // State should be preserved (no phantom changes)
    expect(afterNavState.credits).toBe(dashboardState.credits);
    expect(afterNavState.turn).toBe(dashboardState.turn);
  });
});

// =============================================================================
// EXAMPLE: Testing Error States
// =============================================================================

test.describe("Template: Error State Test Pattern", () => {
  test("insufficient credits shows error, does not complete purchase", async ({ gamePage }) => {
    await ensureGameExists(gamePage, "Error Test Empire");

    const before = await getEmpireState(gamePage);

    // Try to buy something that costs more than we have
    // (This is hypothetical - adapt to actual UI)
    // await gamePage.click('[data-testid="buy-expensive-item"]');

    // Wait for error message
    // await expect(gamePage.locator('[data-testid="error-message"]')).toBeVisible();

    const after = await getEmpireState(gamePage);

    // Credits should NOT have changed (purchase failed)
    expect(after.credits).toBe(before.credits);
  });
});

// =============================================================================
// CHECKLIST FOR NEW E2E TESTS
// =============================================================================

/**
 * Before submitting a new E2E test, verify:
 *
 * [ ] Uses ensureGameExists() from fixtures (not local copy)
 * [ ] Uses getEmpireState() to capture before/after state
 * [ ] Uses verifyResourceChange() or manual assertions on state deltas
 * [ ] Does NOT use waitForTimeout() with arbitrary values
 * [ ] Uses waitForTurnChange() or waitForResourceChange() for async operations
 * [ ] Tests actual state changes, not just element visibility
 * [ ] Has clear test description explaining what is being verified
 * [ ] Handles both success and failure paths where applicable
 */

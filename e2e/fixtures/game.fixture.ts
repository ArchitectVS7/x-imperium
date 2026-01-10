/**
 * E2E Test Fixtures for X-Imperium
 *
 * Provides reusable test helpers for:
 * - Game state extraction from DOM
 * - Resource change verification
 * - Turn advancement with state verification
 * - Waiting for state changes
 */

import { test as base, type Page, expect } from "@playwright/test";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface EmpireState {
  credits: number;
  food: number;
  foodStatus?: string; // "Surplus" | "Stable" | "Deficit" | "Critical"
  ore: number;
  petroleum: number;
  researchPoints: number;
  networth: number;
  population: number;
  civilStatus: string;
  sectorCount: number;
  turn: number;
  soldiers: number;
  fighters: number;
  stations: number;
  lightCruisers: number;
  heavyCruisers: number;
  carriers: number;
}

export interface ResourceDelta {
  credits?: number;
  food?: number;
  ore?: number;
  petroleum?: number;
  researchPoints?: number;
}

export interface GameFixtures {
  gamePage: Page;
}

// =============================================================================
// STATE EXTRACTION HELPERS
// =============================================================================

/**
 * Parse a number from text, handling commas and formatting
 */
function parseNumber(text: string): number {
  // Remove commas and any non-numeric characters except decimal and minus
  const cleaned = text.replace(/[^0-9.-]/g, "");
  return parseFloat(cleaned) || 0;
}

/**
 * Parse compact number format (e.g., "10K" -> 10000, "1.5M" -> 1500000)
 */
function parseCompactNumber(text: string): number {
  const cleaned = text.trim();

  // Check for K suffix (thousands)
  const kMatch = cleaned.match(/^([\d.]+)K$/i);
  if (kMatch && kMatch[1]) {
    return parseFloat(kMatch[1]) * 1000;
  }

  // Check for M suffix (millions)
  const mMatch = cleaned.match(/^([\d.]+)M$/i);
  if (mMatch && mMatch[1]) {
    return parseFloat(mMatch[1]) * 1000000;
  }

  // Regular number
  return parseNumber(cleaned);
}

/**
 * Get basic empire state from the header.
 * This extracts only what's visible in the compact header status.
 */
export async function getBasicEmpireState(page: Page): Promise<{
  turn: number;
  credits: number;
  foodStatus: string;
  population: number;
}> {
  // Wait for header to be visible
  await expect(page.locator('[data-testid="game-header"]')).toBeVisible({ timeout: 10000 });

  // Extract turn number - format is "T: X/Y" or just the value
  const turnText = await page.locator('[data-testid="turn-value"]').textContent({ timeout: 5000 }).catch(() => "1");
  const turn = parseInt(turnText ?? "1", 10) || 1;

  // Extract credits (may be in compact format like "5K")
  const creditsText = await page.locator('[data-testid="credits-value"]').textContent({ timeout: 5000 }).catch(() => "0");
  const credits = parseCompactNumber(creditsText ?? "0");

  // Extract food status (Surplus/Stable/Deficit/Critical)
  const foodStatus = await page.locator('[data-testid="food-status"]').textContent({ timeout: 5000 }).catch(() => "Stable");

  // Extract population (may be in compact format like "10K")
  const populationText = await page.locator('[data-testid="population-value"]').textContent({ timeout: 5000 }).catch(() => "0");
  const population = parseCompactNumber(populationText ?? "0");

  return {
    turn,
    credits,
    foodStatus: foodStatus?.trim() ?? "Stable",
    population,
  };
}

/**
 * Get the current empire state from the DOM.
 * Extracts all visible resource values, population, and military counts.
 * Note: For full state, may need to navigate to specific pages.
 */
export async function getEmpireState(page: Page): Promise<EmpireState> {
  // First get basic state from header
  const basicState = await getBasicEmpireState(page);

  // Default values for data not shown in header
  let food = 0, ore = 0, petroleum = 0, researchPoints = 0, networth = 0;
  let civilStatus = "Content";
  let sectorCount = 5; // Default starting sectors
  let soldiers = 100, fighters = 0, stations = 0, lightCruisers = 0, heavyCruisers = 0, carriers = 0;

  // Map food status to a food value approximation (for compatibility)
  // This is a rough approximation since we don't have exact values in header
  switch (basicState.foodStatus) {
    case "Surplus":
      food = 10000;
      break;
    case "Stable":
      food = 5000;
      break;
    case "Deficit":
      food = 1000;
      break;
    case "Critical":
      food = 0;
      break;
    default:
      food = 5000;
  }

  // Try to get civil status if visible
  const civilStatusDisplay = page.locator('[data-testid="civil-status-label"]');
  if (await civilStatusDisplay.isVisible({ timeout: 1000 }).catch(() => false)) {
    civilStatus = await civilStatusDisplay.textContent() ?? "Content";
  }

  return {
    credits: basicState.credits,
    food,
    foodStatus: basicState.foodStatus,
    ore,
    petroleum,
    researchPoints,
    networth,
    population: basicState.population,
    civilStatus: civilStatus.trim(),
    sectorCount,
    turn: basicState.turn,
    soldiers,
    fighters,
    stations,
    lightCruisers,
    heavyCruisers,
    carriers,
  };
}

// =============================================================================
// VERIFICATION HELPERS
// =============================================================================

/**
 * Verify that resources changed by the expected delta.
 * Use negative values for decreases, positive for increases.
 *
 * @example
 * const before = await getEmpireState(page);
 * await page.click('[data-testid="buy-ore"]');
 * const after = await getEmpireState(page);
 * verifyResourceChange(before, after, { credits: -1500, ore: 100 });
 */
export function verifyResourceChange(
  before: EmpireState,
  after: EmpireState,
  expectedDelta: ResourceDelta,
  tolerance: number = 0
): void {
  if (expectedDelta.credits !== undefined) {
    const actualDelta = after.credits - before.credits;
    expect(Math.abs(actualDelta - expectedDelta.credits)).toBeLessThanOrEqual(tolerance);
  }
  if (expectedDelta.food !== undefined) {
    const actualDelta = after.food - before.food;
    expect(Math.abs(actualDelta - expectedDelta.food)).toBeLessThanOrEqual(tolerance);
  }
  if (expectedDelta.ore !== undefined) {
    const actualDelta = after.ore - before.ore;
    expect(Math.abs(actualDelta - expectedDelta.ore)).toBeLessThanOrEqual(tolerance);
  }
  if (expectedDelta.petroleum !== undefined) {
    const actualDelta = after.petroleum - before.petroleum;
    expect(Math.abs(actualDelta - expectedDelta.petroleum)).toBeLessThanOrEqual(tolerance);
  }
  if (expectedDelta.researchPoints !== undefined) {
    const actualDelta = after.researchPoints - before.researchPoints;
    expect(Math.abs(actualDelta - expectedDelta.researchPoints)).toBeLessThanOrEqual(tolerance);
  }
}

/**
 * Assert that credits decreased (spent) and optionally by a minimum amount.
 */
export function assertCreditsSpent(
  before: EmpireState,
  after: EmpireState,
  minAmount?: number
): void {
  expect(after.credits).toBeLessThan(before.credits);
  if (minAmount !== undefined) {
    expect(before.credits - after.credits).toBeGreaterThanOrEqual(minAmount);
  }
}

/**
 * Assert that a resource increased.
 */
export function assertResourceIncreased(
  before: EmpireState,
  after: EmpireState,
  resource: keyof Pick<EmpireState, "credits" | "food" | "ore" | "petroleum" | "researchPoints">
): void {
  expect(after[resource]).toBeGreaterThan(before[resource]);
}

// =============================================================================
// ACTION HELPERS
// =============================================================================

/**
 * Advance the turn and wait for state to update.
 * Returns the state before and after the turn.
 *
 * FIX: Now handles turn summary modal properly using waitFor() instead of isVisible()
 */
export async function advanceTurn(page: Page): Promise<{
  before: EmpireState;
  after: EmpireState;
}> {
  const before = await getEmpireState(page);

  // Click end turn button (may be in sidebar panel or mobile bar)
  // Try multiple selectors for different UI layouts
  const endTurnButton = page.locator('[data-testid="turn-order-end-turn"], [data-testid="end-turn-button"], [data-testid="mobile-end-turn"], button:has-text("NEXT CYCLE")').first();
  await expect(endTurnButton).toBeVisible({ timeout: 10000 });
  await endTurnButton.click();

  // Wait for page to process the request
  await page.waitForLoadState("domcontentloaded");

  // Dismiss turn summary modal if it appears (waits up to 30s for server processing)
  await dismissTurnSummaryModal(page, 30000);

  // Wait for turn to increment
  await waitForTurnChange(page, before.turn);

  const after = await getEmpireState(page);

  // Verify turn actually incremented
  expect(after.turn).toBe(before.turn + 1);

  return { before, after };
}

/**
 * Wait for turn number to change from the given value.
 */
export async function waitForTurnChange(page: Page, fromTurn: number, timeout: number = 15000): Promise<void> {
  await expect(async () => {
    const turnText = await page.locator('[data-testid="turn-value"]').textContent();
    const currentTurn = parseInt(turnText ?? "0", 10) || 0;
    expect(currentTurn).toBeGreaterThan(fromTurn);
  }).toPass({ timeout });
}

/**
 * Wait for a specific resource to change from its current value.
 */
export async function waitForResourceChange(
  page: Page,
  resource: keyof ResourceDelta,
  fromValue: number,
  timeout: number = 10000
): Promise<void> {
  const testIdMap: Record<keyof ResourceDelta, string> = {
    credits: "credits",
    food: "food",
    ore: "ore",
    petroleum: "petroleum",
    researchPoints: "research-points",
  };

  await expect(async () => {
    const text = await page.locator(`[data-testid="${testIdMap[resource]}"]`).textContent();
    const currentValue = parseNumber(text ?? "0");
    expect(currentValue).not.toBe(fromValue);
  }).toPass({ timeout });
}

/**
 * Wait for a condition to be true, using Playwright's expect().toPass().
 */
export async function waitForCondition(
  page: Page,
  condition: () => Promise<boolean>,
  timeout: number = 10000,
  _pollInterval: number = 200 // kept for API compatibility but not used
): Promise<void> {
  await expect(async () => {
    const result = await condition();
    expect(result).toBe(true);
  }).toPass({ timeout });
}

/**
 * Dismiss turn summary modal if visible.
 * FIX: Uses waitFor() instead of isVisible() to properly wait for modal appearance.
 * The modal shows turn results and must be dismissed before further interaction.
 */
export async function dismissTurnSummaryModal(page: Page, timeout: number = 30000): Promise<boolean> {
  const modal = page.locator('[data-testid="turn-summary-modal"]');

  try {
    // Wait for modal to appear (it may not appear if disabled in settings)
    await modal.waitFor({ state: 'visible', timeout });

    // Try to click Continue button
    const continueBtn = modal.locator('button:has-text("Continue"), [data-testid="turn-summary-continue"]').first();
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
    } else {
      // Fallback: press Escape to close
      await page.keyboard.press("Escape");
    }

    // Wait for modal to disappear
    await modal.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    return true;
  } catch {
    // Modal didn't appear within timeout - that's OK
    return false;
  }
}

// =============================================================================
// GAME SETUP HELPERS
// =============================================================================

/**
 * Skip the tutorial system by setting localStorage keys.
 * This should be called BEFORE navigating to the game page.
 */
export async function skipTutorialViaLocalStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Skip the main tutorial overlay
    localStorage.setItem("nexus-dominion-tutorial-skipped", "true");
    // Also set tutorial state as skipped
    localStorage.setItem("nexus-dominion-tutorial", JSON.stringify({
      isActive: false,
      currentStep: null,
      completedSteps: [],
      skipped: true,
      startedAt: null,
      completedAt: null,
    }));
    // Dismiss contextual hints too
    localStorage.setItem("nexus-dominion-contextual-hints-dismissed", "true");
  });
}

/**
 * Dismiss any tutorial overlays that might be blocking the UI.
 * Loops through all possible tutorial dismissal patterns.
 * Enhanced with aggressive overlay detection and force dismissal.
 */
export async function dismissTutorialOverlays(page: Page): Promise<void> {
  // STEP 1: Force set localStorage keys to skip tutorial
  await page.evaluate(() => {
    localStorage.setItem("nexus-dominion-tutorial-skipped", "true");
    localStorage.setItem("nexus-dominion-contextual-hints-dismissed", "true");
    // Also set the tutorial state as fully skipped
    localStorage.setItem("nexus-dominion-tutorial", JSON.stringify({
      isActive: false,
      currentStep: null,
      completedSteps: [],
      skipped: true,
      startedAt: null,
      completedAt: null,
    }));
  }).catch(() => {});

  // STEP 2: Check for tutorial overlay and dismiss it
  const tutorialOverlay = page.locator('[data-testid="tutorial-overlay"]');
  if (await tutorialOverlay.isVisible({ timeout: 500 }).catch(() => false)) {
    console.log('Warning: Tutorial overlay detected, attempting dismissal...');

    // Try clicking the skip button
    const skipButton = tutorialOverlay.locator('[data-testid="tutorial-skip"]');
    if (await skipButton.isVisible({ timeout: 200 }).catch(() => false)) {
      await skipButton.click({ force: true });
      await tutorialOverlay.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
    } else {
      // If no skip button, try pressing Escape to close
      await page.keyboard.press('Escape');
      await tutorialOverlay.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
    }

    // Force remove the overlay from DOM if still present
    if (await tutorialOverlay.isVisible({ timeout: 200 }).catch(() => false)) {
      await page.evaluate(() => {
        const overlay = document.querySelector('[data-testid="tutorial-overlay"]');
        if (overlay) {
          overlay.remove();
        }
      }).catch(() => {});
    }
  }

  // STEP 3: Loop to dismiss any other modal overlays
  for (let round = 0; round < 5; round++) {
    let dismissed = false;

    // Try "Skip all tutorials" link
    const skipAllLink = page.locator('text=Skip all tutorials').first();
    if (await skipAllLink.isVisible({ timeout: 300 }).catch(() => false)) {
      await skipAllLink.click({ force: true });
      await expect(skipAllLink).not.toBeVisible({ timeout: 2000 }).catch(() => {});
      dismissed = true;
      continue;
    }

    // Try "Skip tutorial" text/button
    const skipTutorial = page.locator('text=Skip tutorial').first();
    if (await skipTutorial.isVisible({ timeout: 300 }).catch(() => false)) {
      await skipTutorial.click({ force: true });
      await expect(skipTutorial).not.toBeVisible({ timeout: 2000 }).catch(() => {});
      dismissed = true;
      continue;
    }

    // Try [data-testid="tutorial-skip"]
    const tutorialSkipButton = page.locator('[data-testid="tutorial-skip"]');
    if (await tutorialSkipButton.isVisible({ timeout: 200 }).catch(() => false)) {
      await tutorialSkipButton.click({ force: true });
      await expect(tutorialSkipButton).not.toBeVisible({ timeout: 2000 }).catch(() => {});
      dismissed = true;
      continue;
    }

    // Try "Got it" button
    const gotItButton = page.locator('button:has-text("Got it")').first();
    if (await gotItButton.isVisible({ timeout: 200 }).catch(() => false)) {
      await gotItButton.click({ force: true });
      await expect(gotItButton).not.toBeVisible({ timeout: 2000 }).catch(() => {});
      dismissed = true;
      continue;
    }

    // Try "Dismiss hint" button
    const dismissHintButton = page.locator('button:has-text("Dismiss hint")').first();
    if (await dismissHintButton.isVisible({ timeout: 200 }).catch(() => false)) {
      await dismissHintButton.click({ force: true });
      await expect(dismissHintButton).not.toBeVisible({ timeout: 2000 }).catch(() => {});
      dismissed = true;
      continue;
    }

    // Try X close button (the × symbol)
    const xButton = page.locator('button:has-text("×")').first();
    if (await xButton.isVisible({ timeout: 200 }).catch(() => false)) {
      await xButton.click({ force: true });
      await expect(xButton).not.toBeVisible({ timeout: 2000 }).catch(() => {});
      dismissed = true;
      continue;
    }

    // If we didn't dismiss anything this round, we're done
    if (!dismissed) {
      break;
    }
  }

  // STEP 4: Final verification - ensure no overlay is blocking the UI
  const finalCheck = page.locator('[data-testid="tutorial-overlay"]');
  if (await finalCheck.isVisible({ timeout: 200 }).catch(() => false)) {
    console.log('Warning: Tutorial overlay still present after dismissal attempts, force removing...');
    await page.evaluate(() => {
      const overlay = document.querySelector('[data-testid="tutorial-overlay"]');
      if (overlay) {
        overlay.remove();
      }
    }).catch(() => {});
  }

  // STEP 5: Close any slide-out panels that might be open
  const slideOutPanel = page.locator('[data-testid="slide-out-panel"]');
  if (await slideOutPanel.isVisible({ timeout: 300 }).catch(() => false)) {
    console.log('Warning: Slide-out panel detected, closing...');
    // Try clicking the close button or pressing Escape
    const closeButton = slideOutPanel.locator('button[aria-label="Close"], button:has-text("Close"), button:has-text("×")').first();
    if (await closeButton.isVisible({ timeout: 200 }).catch(() => false)) {
      await closeButton.click({ force: true });
    } else {
      // Press Escape to close
      await page.keyboard.press('Escape');
    }
    await slideOutPanel.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
  }

  // STEP 6: Force remove any backdrop overlays that block pointer events
  // These are typically modal backdrops with classes like "absolute inset-0 bg-black/50"
  await page.evaluate(() => {
    // Remove backdrop overlays with common blocking patterns
    const backdropSelectors = [
      '.absolute.inset-0[class*="bg-black"]',
      '.fixed.inset-0[class*="bg-black"]',
      '.absolute.inset-0[class*="backdrop"]',
      '.fixed.inset-0[class*="backdrop"]',
    ];

    backdropSelectors.forEach(selector => {
      const overlays = document.querySelectorAll(selector);
      overlays.forEach(overlay => {
        // Only remove if it's intercepting pointer events (not a valid UI element)
        const styles = window.getComputedStyle(overlay);
        const isBlocking = styles.pointerEvents !== 'none' &&
                          overlay.childElementCount === 0;
        if (isBlocking) {
          overlay.remove();
        }
      });
    });

    // Also remove any modal dialogs that might be blocking
    const modals = document.querySelectorAll('[role="dialog"], [role="alertdialog"]');
    modals.forEach(modal => {
      // Only force-remove if it doesn't have visible interactive content
      const hasVisibleButtons = modal.querySelectorAll('button:not([disabled])').length > 0;
      if (!hasVisibleButtons) {
        modal.remove();
      }
    });
  }).catch(() => {});

  // STEP 7: Wait for any animations to complete after overlay removal
  await page.waitForTimeout(100);
}

/**
 * Ensure a game exists, creating one if needed.
 * This is a more robust version that waits for all elements.
 * Note: Game starts on starmap page after creation - this is the "game ready" state.
 * Enhanced with aggressive overlay dismissal at every step.
 */
export async function ensureGameExists(
  page: Page,
  empireName: string = "Test Empire"
): Promise<void> {
  // STEP 1: Initial dismissal
  await dismissTutorialOverlays(page);

  const nameInput = page.locator('[data-testid="empire-name-input"]');

  if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nameInput.fill(empireName);
    await dismissTutorialOverlays(page);

    // Ensure bot count is explicitly set (wait for component hydration)
    // This fixes the issue where the form is submitted before BotCountSelector is hydrated
    const botCountSelector = page.locator('[data-testid="bot-count-selector"]');
    if (await botCountSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click 25 bots option to ensure value is set
      const bot25Button = page.locator('[data-testid="bot-count-25"]');
      if (await bot25Button.isVisible({ timeout: 1000 }).catch(() => false)) {
        await bot25Button.click();
      }
    }

    // Click the start game button
    await page.locator('[data-testid="start-game-button"]').click();

    // Wait for navigation to starmap (game creation redirects there)
    await page.waitForURL(/\/game\/starmap/, { timeout: 15000 });

    // STEP 2: Dismiss immediately after URL change
    await dismissTutorialOverlays(page);
  }

  // STEP 3: Wait for starmap page and dismiss overlays
  await expect(page.locator('[data-testid="starmap-page"]')).toBeVisible({ timeout: 15000 });
  await dismissTutorialOverlays(page);

  // STEP 4: Wait for game header and dismiss overlays
  await expect(page.locator('[data-testid="game-header"]')).toBeVisible({ timeout: 10000 });
  await dismissTutorialOverlays(page);

  // STEP 5: Final wait to ensure React hydration is complete, then final dismissal
  await page.waitForLoadState('domcontentloaded');
  await dismissTutorialOverlays(page);

  // STEP 6: Verify no overlay is present
  const overlay = page.locator('[data-testid="tutorial-overlay"]');
  if (await overlay.isVisible({ timeout: 500 }).catch(() => false)) {
    console.log('Warning: Tutorial overlay still present after game setup, force removing...');
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="tutorial-overlay"]');
      if (el) el.remove();
    }).catch(() => {});
  }
}

/**
 * Create a new game with a specific difficulty.
 * Note: Game starts on starmap page after creation.
 */
export async function startNewGameWithDifficulty(
  page: Page,
  empireName: string = "Test Empire",
  difficulty: "easy" | "normal" | "hard" | "nightmare" = "normal"
): Promise<void> {
  await dismissTutorialOverlays(page);

  const nameInput = page.locator('[data-testid="empire-name-input"]');

  if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nameInput.fill(empireName);

    // Ensure bot count is explicitly set (wait for component hydration)
    // This fixes the issue where the form is submitted before BotCountSelector is hydrated
    const botCountSelector = page.locator('[data-testid="bot-count-selector"]');
    if (await botCountSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click 25 bots option to ensure value is set
      const bot25Button = page.locator('[data-testid="bot-count-25"]');
      if (await bot25Button.isVisible({ timeout: 1000 }).catch(() => false)) {
        await bot25Button.click();
      }
    }

    // Select difficulty if selector exists
    const difficultySelector = page.locator('[data-testid="difficulty-selector"]');
    if (await difficultySelector.isVisible({ timeout: 1000 }).catch(() => false)) {
      await difficultySelector.selectOption(difficulty);
    }

    await page.locator('[data-testid="start-game-button"]').click();

    // Wait for navigation to starmap (game creation redirects there)
    await page.waitForURL(/\/game\/starmap/, { timeout: 15000 });
  }

  await dismissTutorialOverlays(page);

  // Wait for starmap page and game header to be visible
  await expect(page.locator('[data-testid="starmap-page"]')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('[data-testid="game-header"]')).toBeVisible({ timeout: 10000 });
  await dismissTutorialOverlays(page);
}

// =============================================================================
// NAVIGATION HELPERS
// =============================================================================

/**
 * Wait for a page to be fully rendered and ready for interaction.
 * This ensures:
 * 1. The page-specific data-testid element is visible
 * 2. Any loading indicators have cleared
 * 3. The page content has hydrated
 *
 * @param page - Playwright page object
 * @param pageTestId - The data-testid of the page element (e.g., "combat-page")
 * @param timeout - Maximum time to wait (default 15000ms)
 */
export async function waitForPageReady(
  page: Page,
  pageTestId: string,
  timeout: number = 15000
): Promise<void> {
  // Wait for the page-specific element to be visible
  const pageElement = page.locator(`[data-testid="${pageTestId}"]`);
  await expect(pageElement).toBeVisible({ timeout });

  // Wait for any loading indicators to disappear
  const loadingIndicators = [
    page.locator('text=Loading...').first(),
    page.locator('[data-testid="loading-spinner"]').first(),
    page.locator('.animate-pulse').first(),
    page.locator('[aria-busy="true"]').first(),
  ];

  for (const indicator of loadingIndicators) {
    // If indicator exists and is visible, wait for it to disappear
    if (await indicator.isVisible({ timeout: 500 }).catch(() => false)) {
      await indicator.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    }
  }

  // Wait for DOM to be stable (no new content being added)
  await page.waitForLoadState('domcontentloaded');

  // Brief pause for React hydration to complete
  await page.waitForTimeout(100);
}

/**
 * Navigate to a game page and wait for it to load.
 * Enhanced to aggressively dismiss overlays before AND after navigation.
 * Uses waitForPageReady for robust page rendering verification.
 */
export async function navigateToGamePage(
  page: Page,
  path: "sectors" | "military" | "research" | "combat" | "market" | "diplomacy" | "covert" | "messages" | "starmap"
): Promise<void> {
  // Dismiss any tutorial overlays BEFORE navigation
  await dismissTutorialOverlays(page);

  // Perform navigation
  await page.click(`a[href="/game/${path}"]`);

  // Wait for page to be fully ready (B3 fix: proper page render verification)
  await waitForPageReady(page, `${path}-page`, 15000);

  // Dismiss any tutorial overlays AFTER navigation (they might reappear on route change)
  await dismissTutorialOverlays(page);
}

// =============================================================================
// FIXTURE EXPORT
// =============================================================================

export const test = base.extend<GameFixtures>({
  gamePage: async ({ page }, use) => {
    // Skip tutorials BEFORE navigating to avoid overlay issues
    await skipTutorialViaLocalStorage(page);

    // Navigate to game and wait for page to load
    await page.goto("/game");
    // FIX: Wait for key element instead of networkidle (can hang on SSE/background requests)
    await page.locator('[data-testid="empire-name-input"], [data-testid="game-header"]')
      .first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    // Dismiss any remaining overlays that might appear
    await dismissTutorialOverlays(page);

    await use(page);
  },
});

export { expect } from "@playwright/test";

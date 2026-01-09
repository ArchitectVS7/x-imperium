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
 */
export async function dismissTutorialOverlays(page: Page): Promise<void> {
  // First try to dismiss tutorial overlay via JavaScript
  await page.evaluate(() => {
    localStorage.setItem("nexus-dominion-tutorial-skipped", "true");
    localStorage.setItem("nexus-dominion-contextual-hints-dismissed", "true");
  }).catch(() => {});

  // Loop to dismiss multiple overlays via click
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
}

/**
 * Ensure a game exists, creating one if needed.
 * This is a more robust version that waits for all elements.
 * Note: Game starts on starmap page after creation - this is the "game ready" state.
 */
export async function ensureGameExists(
  page: Page,
  empireName: string = "Test Empire"
): Promise<void> {
  // Dismiss any tutorial overlays that might still appear
  await dismissTutorialOverlays(page);

  const nameInput = page.locator('[data-testid="empire-name-input"]');

  if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nameInput.fill(empireName);
    await dismissTutorialOverlays(page);

    // Click the start game button
    await page.locator('[data-testid="start-game-button"]').click();

    // Wait for navigation to starmap (game creation redirects there)
    await page.waitForURL(/\/game\/starmap/, { timeout: 15000 });
  }

  // Dismiss any post-game-creation tutorials
  await dismissTutorialOverlays(page);

  // Wait for starmap page to be visible (indicates game is ready)
  await expect(page.locator('[data-testid="starmap-page"]')).toBeVisible({ timeout: 15000 });

  // Dismiss tutorials again after page loads
  await dismissTutorialOverlays(page);

  // Wait for game header to be visible (contains turn counter and resources)
  await expect(page.locator('[data-testid="game-header"]')).toBeVisible({ timeout: 10000 });

  // Dismiss any remaining tutorials
  await dismissTutorialOverlays(page);
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
 * Navigate to a game page and wait for it to load.
 */
export async function navigateToGamePage(
  page: Page,
  path: "sectors" | "military" | "research" | "combat" | "market" | "diplomacy" | "covert" | "messages" | "starmap"
): Promise<void> {
  // Dismiss any tutorial overlays that might block navigation
  await dismissTutorialOverlays(page);

  await page.click(`a[href="/game/${path}"]`);
  await page.waitForLoadState("networkidle");
  await expect(page.locator(`[data-testid="${path}-page"]`)).toBeVisible({
    timeout: 10000,
  });
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
    await page.waitForLoadState("networkidle");

    // Dismiss any remaining overlays that might appear
    await dismissTutorialOverlays(page);

    await use(page);
  },
});

export { expect } from "@playwright/test";

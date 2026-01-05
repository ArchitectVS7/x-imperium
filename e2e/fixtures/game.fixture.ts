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
 * Get the current empire state from the DOM.
 * Extracts all visible resource values, population, and military counts.
 */
export async function getEmpireState(page: Page): Promise<EmpireState> {
  await page.waitForLoadState("networkidle");

  // Extract resources
  const creditsText = await page.locator('[data-testid="credits"]').textContent() ?? "0";
  const foodText = await page.locator('[data-testid="food"]').textContent() ?? "0";
  const oreText = await page.locator('[data-testid="ore"]').textContent() ?? "0";
  const petroleumText = await page.locator('[data-testid="petroleum"]').textContent() ?? "0";
  const researchText = await page.locator('[data-testid="research-points"]').textContent() ?? "0";

  // Extract networth
  const networthText = await page.locator('[data-testid="networth-value"]').textContent() ?? "0";

  // Extract population and civil status
  const populationText = await page.locator('[data-testid="population-count"]').textContent() ?? "0";
  const civilStatusText = await page.locator('[data-testid="civil-status"]').textContent() ?? "Unknown";

  // Extract sector count from sector list header
  const sectorHeaderText = await page.locator('[data-testid="sector-list"]').textContent() ?? "Sectors (0)";
  const sectorMatch = sectorHeaderText.match(/Sectors\s*\((\d+)\)/);
  const sectorCount = sectorMatch && sectorMatch[1] ? parseInt(sectorMatch[1], 10) : 0;

  // Extract turn number
  const turnText = await page.locator('[data-testid="turn-counter"]').textContent() ?? "Turn 1";
  const turnMatch = turnText.match(/Turn\s*(\d+)/i);
  const turn = turnMatch && turnMatch[1] ? parseInt(turnMatch[1], 10) : 1;

  // Extract military (may need to navigate or expand panel)
  const militaryPanel = page.locator('[data-testid="military-panel"]');
  let soldiers = 0, fighters = 0, stations = 0, lightCruisers = 0, heavyCruisers = 0, carriers = 0;

  if (await militaryPanel.isVisible()) {
    const militaryText = await militaryPanel.textContent() ?? "";

    // Try to extract individual unit counts from military panel
    const soldierMatch = militaryText.match(/Soldiers[:\s]*(\d+)/i);
    const fighterMatch = militaryText.match(/Fighters[:\s]*(\d+)/i);
    const stationMatch = militaryText.match(/Stations[:\s]*(\d+)/i);
    const lightCruiserMatch = militaryText.match(/Light Cruisers?[:\s]*(\d+)/i);
    const heavyCruiserMatch = militaryText.match(/Heavy Cruisers?[:\s]*(\d+)/i);
    const carrierMatch = militaryText.match(/Carriers?[:\s]*(\d+)/i);

    soldiers = soldierMatch?.[1] ? parseInt(soldierMatch[1], 10) : 0;
    fighters = fighterMatch?.[1] ? parseInt(fighterMatch[1], 10) : 0;
    stations = stationMatch?.[1] ? parseInt(stationMatch[1], 10) : 0;
    lightCruisers = lightCruiserMatch?.[1] ? parseInt(lightCruiserMatch[1], 10) : 0;
    heavyCruisers = heavyCruiserMatch?.[1] ? parseInt(heavyCruiserMatch[1], 10) : 0;
    carriers = carrierMatch?.[1] ? parseInt(carrierMatch[1], 10) : 0;
  }

  return {
    credits: parseNumber(creditsText),
    food: parseNumber(foodText),
    ore: parseNumber(oreText),
    petroleum: parseNumber(petroleumText),
    researchPoints: parseNumber(researchText),
    networth: parseNumber(networthText),
    population: parseNumber(populationText),
    civilStatus: civilStatusText.trim(),
    sectorCount,
    turn,
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

  // Click end turn button
  const endTurnButton = page.locator('[data-testid="end-turn-button"]');
  await expect(endTurnButton).toBeEnabled({ timeout: 5000 });
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
    const turnText = await page.locator('[data-testid="turn-counter"]').textContent();
    const match = turnText?.match(/Turn\s*(\d+)/i);
    const currentTurn = match?.[1] ? parseInt(match[1], 10) : fromTurn;
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
 * Wait for a condition to be true, polling at intervals.
 */
export async function waitForCondition(
  page: Page,
  condition: () => Promise<boolean>,
  timeout: number = 10000,
  pollInterval: number = 200
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await page.waitForTimeout(pollInterval);
  }
  throw new Error(`Condition not met within ${timeout}ms`);
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
      await page.waitForTimeout(200);
      dismissed = true;
      continue;
    }

    // Try "Skip tutorial" text/button
    const skipTutorial = page.locator('text=Skip tutorial').first();
    if (await skipTutorial.isVisible({ timeout: 300 }).catch(() => false)) {
      await skipTutorial.click({ force: true });
      await page.waitForTimeout(200);
      dismissed = true;
      continue;
    }

    // Try [data-testid="tutorial-skip"]
    const tutorialSkipButton = page.locator('[data-testid="tutorial-skip"]');
    if (await tutorialSkipButton.isVisible({ timeout: 200 }).catch(() => false)) {
      await tutorialSkipButton.click({ force: true });
      await page.waitForTimeout(200);
      dismissed = true;
      continue;
    }

    // Try "Got it" button
    const gotItButton = page.locator('button:has-text("Got it")').first();
    if (await gotItButton.isVisible({ timeout: 200 }).catch(() => false)) {
      await gotItButton.click({ force: true });
      await page.waitForTimeout(150);
      dismissed = true;
      continue;
    }

    // Try "Dismiss hint" button
    const dismissHintButton = page.locator('button:has-text("Dismiss hint")').first();
    if (await dismissHintButton.isVisible({ timeout: 200 }).catch(() => false)) {
      await dismissHintButton.click({ force: true });
      await page.waitForTimeout(150);
      dismissed = true;
      continue;
    }

    // Try X close button (the × symbol)
    const xButton = page.locator('button:has-text("×")').first();
    if (await xButton.isVisible({ timeout: 200 }).catch(() => false)) {
      await xButton.click({ force: true });
      await page.waitForTimeout(150);
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

    // Wait for navigation to complete (redirects to starmap)
    await page.waitForURL(/\/game\/(starmap)?/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");
  }

  // Dismiss any post-game-creation tutorials
  await dismissTutorialOverlays(page);

  // Wait for either dashboard or starmap (game may start on starmap)
  const dashboardOrGamePage = page.locator('[data-testid="dashboard"], [data-testid="starmap-page"]');
  await expect(dashboardOrGamePage.first()).toBeVisible({ timeout: 15000 });

  // Dismiss tutorials again after page loads
  await dismissTutorialOverlays(page);

  // If not on dashboard, navigate there
  const dashboard = page.locator('[data-testid="dashboard"]');
  if (!await dashboard.isVisible({ timeout: 1000 }).catch(() => false)) {
    // Navigate to dashboard
    await page.goto("/game");
    await page.waitForLoadState("networkidle");
    await dismissTutorialOverlays(page);
  }

  // Wait for dashboard to be visible
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({
    timeout: 10000,
  });

  // Dismiss any remaining tutorials
  await dismissTutorialOverlays(page);

  // Wait for resources to be loaded
  await expect(page.locator('[data-testid="credits"]')).toBeVisible();
}

/**
 * Create a new game with a specific difficulty.
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

    // Wait for navigation to complete
    await page.waitForURL(/\/game\/(starmap)?/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");
  }

  await dismissTutorialOverlays(page);

  // Navigate to dashboard if on starmap
  const dashboard = page.locator('[data-testid="dashboard"]');
  if (!await dashboard.isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.goto("/game");
    await page.waitForLoadState("networkidle");
    await dismissTutorialOverlays(page);
  }

  await expect(dashboard).toBeVisible({ timeout: 10000 });
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

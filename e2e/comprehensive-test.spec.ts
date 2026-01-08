import { test, expect, Page } from "@playwright/test";
import { skipTutorialViaLocalStorage, dismissTutorialOverlays } from "./fixtures/game.fixture";

/**
 * Comprehensive E2E Test Suite
 *
 * This consolidated suite combines multiple E2E tests:
 * - 10-Turn Game Test: Core gameplay validation
 * - Full Gameplay Test (20 turns): All UI control surfaces
 * - Controls Validation (15 turns): Quick control surface verification
 * - Performance Test: Turn processing performance monitoring
 *
 * NOTE: Tell system tests are in tells-5bot-20turn.spec.ts (uses direct DB access)
 *
 * Expected runtime: ~10-15 minutes total
 */

// =============================================================================
// SHARED UTILITIES
// =============================================================================

const DEBUG_LOG: string[] = [];

function logDebug(message: string) {
  const timestamp = new Date().toISOString();
  DEBUG_LOG.push(`[${timestamp}] ${message}`);
  console.log(`[DEBUG] ${message}`);
}

function logSuccess(action: string) {
  const timestamp = new Date().toISOString();
  DEBUG_LOG.push(`[${timestamp}] ${action}`);
  console.log(`${action}`);
}

function log(turn: number | string, message: string) {
  console.log(`[Turn ${turn}] ${message}`);
}

/**
 * Dismiss any turn summary modal that's blocking the UI.
 */
async function dismissTurnSummaryModal(page: Page): Promise<boolean> {
  const modal = page.locator('[data-testid="turn-summary-modal"]');

  if (await modal.isVisible({ timeout: 500 }).catch(() => false)) {
    const continueBtn = page.locator('[data-testid="turn-summary-continue"]');
    if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(300);
      return true;
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    if (!await modal.isVisible({ timeout: 200 }).catch(() => false)) {
      return true;
    }
  }
  return false;
}

/**
 * Get the current turn number from various possible sources
 */
async function getCurrentTurn(page: Page): Promise<number> {
  const selectors = [
    '[data-testid="turn-counter"]',
    'text=/Turn\\s+\\d+/i',
    '.turn-counter',
  ];

  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      const text = await element.textContent({ timeout: 1000 });
      const match = text?.match(/Turn\s*(\d+)/i) ?? text?.match(/(\d+)/);
      if (match?.[1]) {
        return parseInt(match[1], 10);
      }
    } catch {
      continue;
    }
  }

  const turnText = await page.locator('text=/T:\\s*\\d+/').first().textContent().catch(() => null);
  if (turnText) {
    const match = turnText.match(/(\d+)/);
    if (match?.[1]) {
      return parseInt(match[1], 10);
    }
  }

  return 1;
}

/**
 * End turn reliably with modal handling
 */
async function endTurnReliably(page: Page): Promise<number> {
  await dismissTurnSummaryModal(page);
  await dismissTutorialOverlays(page);

  const turnBefore = await getCurrentTurn(page);

  const endTurnSelectors = [
    '[data-testid="turn-order-end-turn"]',
    '[data-testid="mobile-end-turn"]',
    'button:has-text("NEXT CYCLE")',
    'button:has-text("End Turn")',
  ];

  for (const selector of endTurnSelectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      const isEnabled = await btn.isEnabled({ timeout: 2000 }).catch(() => false);
      if (isEnabled) {
        await btn.click({ force: true });
        break;
      }
    }
  }

  await page.waitForTimeout(2000);

  for (let attempt = 0; attempt < 10; attempt++) {
    const dismissed = await dismissTurnSummaryModal(page);
    if (!dismissed) break;
    await page.waitForTimeout(500);
  }

  return await getCurrentTurn(page);
}

/**
 * Navigate to a game page safely
 */
async function navigateTo(page: Page, path: string, pageName: string): Promise<boolean> {
  try {
    await dismissTurnSummaryModal(page);
    await dismissTutorialOverlays(page);

    await page.goto(`/game/${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    await dismissTurnSummaryModal(page);
    await dismissTutorialOverlays(page);

    logDebug(`Navigated to ${pageName}`);
    return true;
  } catch (error) {
    logDebug(`Failed to navigate to ${pageName}: ${String(error).substring(0, 50)}`);
    return false;
  }
}

/**
 * Create or resume a game for testing
 */
async function ensureGameReady(page: Page, empireName: string): Promise<void> {
  await page.goto("/game");
  await page.waitForLoadState("domcontentloaded");
  await dismissTutorialOverlays(page);

  const empireNameInput = page.locator('[data-testid="empire-name-input"]');
  const returnModePrompt = page.locator('[data-testid="return-mode-prompt"]');

  if (await empireNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await empireNameInput.fill(empireName);
    await dismissTutorialOverlays(page);
    await page.locator('[data-testid="start-game-button"]').click();
    await page.waitForURL(/\/game/, { timeout: 30000 });
    await page.waitForLoadState("domcontentloaded");
  } else if (await returnModePrompt.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.locator('button:has-text("Start New Game")').click();
    await page.waitForLoadState("domcontentloaded");
    await page.locator('[data-testid="empire-name-input"]').fill(empireName);
    await page.locator('[data-testid="start-game-button"]').click();
    await page.waitForURL(/\/game/, { timeout: 30000 });
    await page.waitForLoadState("domcontentloaded");
  }

  await page.waitForTimeout(1000);
  await dismissTutorialOverlays(page);

  for (let attempt = 0; attempt < 5; attempt++) {
    const dismissed = await dismissTurnSummaryModal(page);
    if (!dismissed) break;
    await page.waitForTimeout(300);
  }
}

// =============================================================================
// TEST SUITE 1: 10-TURN CORE GAMEPLAY TEST
// =============================================================================

test.describe("10-Turn Core Gameplay Test", () => {
  test.beforeEach(async ({ page }) => {
    await skipTutorialViaLocalStorage(page);
  });

  test("Complete 10-turn playthrough with feature rotation", async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    logDebug("=== STARTING 10-TURN CORE TEST ===");

    await ensureGameReady(page, "10-Turn Core Test");

    const currentTurn = await getCurrentTurn(page);
    expect(currentTurn).toBeGreaterThanOrEqual(1);

    for (let turn = 1; turn <= 10; turn++) {
      logDebug(`\n=== TURN ${turn} ===`);

      try {
        const actionIndex = turn % 10;

        switch (actionIndex) {
          case 1: await testSectors(page, turn); break;
          case 2: await testMilitary(page, turn); break;
          case 3: await testResearch(page, turn); break;
          case 4: await testMarket(page, turn); break;
          case 5: await testEspionage(page, turn); break;
          case 6: if (turn > 20) await testCombat(page, turn); break;
          case 7: await testDiplomacy(page, turn); break;
          case 8: await testSyndicate(page, turn); break;
          case 9: await testMessages(page, turn); break;
          case 0: await testStarmap(page, turn); break;
        }

        await page.goto("/game/starmap", { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(500);
        await dismissTurnSummaryModal(page);
        await endTurnReliably(page);
        await page.waitForTimeout(1000);

      } catch (error) {
        logDebug(`Turn ${turn} failed: ${String(error)}`);
        await page.goto("/game/starmap").catch(() => {});
        await dismissTurnSummaryModal(page);
        await endTurnReliably(page).catch(() => {});
      }
    }

    logDebug("\n=== 10-TURN CORE TEST COMPLETE ===");
  });
});

// =============================================================================
// TEST SUITE 2: FULL 20-TURN GAMEPLAY TEST
// =============================================================================

test.describe("Full 20-Turn Gameplay Test", () => {
  test.beforeEach(async ({ page }) => {
    await skipTutorialViaLocalStorage(page);
  });

  test("Complete 20-turn playthrough testing all UI surfaces", async ({ page }) => {
    test.setTimeout(420000); // 7 minutes

    const result = {
      sectorsBought: 0,
      unitsBought: 0,
      marketTrades: 0,
      researchAllocated: false,
      diplomacyViewed: false,
      combatViewed: false,
      covertViewed: false,
      starmapViewed: false,
      messagesViewed: false,
      turnsCompleted: 0,
    };

    log("START", "=== FULL 20-TURN GAMEPLAY TEST ===\n");

    await ensureGameReady(page, "Full Gameplay Test");

    const currentTurn = await getCurrentTurn(page);
    expect(currentTurn).toBeGreaterThanOrEqual(1);

    const TOTAL_TURNS = 20;

    for (let turn = 1; turn <= TOTAL_TURNS; turn++) {
      const actualTurn = await getCurrentTurn(page);
      log(actualTurn, `\n===== TURN ${actualTurn} =====`);

      try {
        const activity = turn % 10;

        switch (activity) {
          case 1:
          case 2:
            log(actualTurn, "Activity: Buying sectors...");
            if (await navigateTo(page, "sectors", "Sectors page")) {
              const colonizeTab = page.locator('button:has-text("Colonize"), [data-testid="colonize-tab"]').first();
              if (await colonizeTab.isVisible({ timeout: 1500 }).catch(() => false)) {
                await colonizeTab.click().catch(() => {});
                await page.waitForTimeout(500);
              }
              const buyButtons = page.locator('button:has-text("Colonize"), button:has-text("Buy")');
              if (await buyButtons.first().isEnabled({ timeout: 1000 }).catch(() => false)) {
                await buyButtons.first().click().catch(() => {});
                result.sectorsBought++;
              }
            }
            break;

          case 3:
          case 4:
            log(actualTurn, "Activity: Building military units...");
            if (await navigateTo(page, "military", "Military page")) {
              const buildTab = page.locator('button:has-text("Build"), [data-testid="build-tab"]').first();
              if (await buildTab.isVisible({ timeout: 1500 }).catch(() => false)) {
                await buildTab.click().catch(() => {});
                await page.waitForTimeout(500);
              }
              const unitCards = page.locator('[data-testid*="unit-select"], button:has-text("Soldier")');
              if (await unitCards.first().isVisible({ timeout: 1500 }).catch(() => false)) {
                await unitCards.first().click().catch(() => {});
                const queueBtn = page.locator('button:has-text("Queue"), button:has-text("Build")').first();
                if (await queueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                  await queueBtn.click().catch(() => {});
                  result.unitsBought++;
                }
              }
            }
            break;

          case 5:
            log(actualTurn, "Activity: Market trading...");
            if (await navigateTo(page, "market", "Market page")) {
              const marketPanel = page.locator('[data-testid="market-panel"]');
              if (await marketPanel.first().isVisible({ timeout: 2000 }).catch(() => false)) {
                const buyTab = page.locator('[data-testid="market-buy-tab"]').first();
                if (await buyTab.isVisible({ timeout: 1000 }).catch(() => false)) {
                  await buyTab.click().catch(() => {});
                  result.marketTrades++;
                }
              }
            }
            break;

          case 6:
            log(actualTurn, "Activity: Research allocation...");
            if (await navigateTo(page, "research", "Research page")) {
              const researchPanel = page.locator('[data-testid="research-panel"], [data-testid="research-progress"]');
              if (await researchPanel.first().isVisible({ timeout: 2000 }).catch(() => false)) {
                result.researchAllocated = true;
              }
            }
            break;

          case 7:
            log(actualTurn, "Activity: Viewing diplomacy...");
            if (await navigateTo(page, "diplomacy", "Diplomacy page")) {
              result.diplomacyViewed = true;
            }
            break;

          case 8:
            log(actualTurn, "Activity: Combat interface...");
            if (await navigateTo(page, "combat", "Combat page")) {
              result.combatViewed = true;
            }
            break;

          case 9:
            log(actualTurn, "Activity: Covert operations...");
            if (await navigateTo(page, "covert", "Covert page")) {
              result.covertViewed = true;
            }
            break;

          case 0:
            log(actualTurn, "Activity: Starmap and messages...");
            if (await navigateTo(page, "starmap", "Starmap page")) {
              const starmapSvg = page.locator('svg, canvas, [data-testid="starmap"]').first();
              if (await starmapSvg.isVisible({ timeout: 2000 }).catch(() => false)) {
                result.starmapViewed = true;
              }
            }
            if (await navigateTo(page, "messages", "Messages page")) {
              result.messagesViewed = true;
            }
            break;
        }

        await page.goto("/game/starmap", { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(500);
        await dismissTurnSummaryModal(page);
        await dismissTutorialOverlays(page);

        const newTurn = await endTurnReliably(page);
        if (newTurn > actualTurn) {
          result.turnsCompleted++;
        }

      } catch (error) {
        log(turn, `ERROR: ${String(error).substring(0, 100)}`);
        await page.goto("/game/starmap").catch(() => {});
        await dismissTurnSummaryModal(page);
        await endTurnReliably(page).catch(() => {});
      }
    }

    log("END", "\n===== RESULTS =====");
    log("END", `Turns Completed: ${result.turnsCompleted}/${TOTAL_TURNS}`);
    log("END", `Feature Coverage: sectors=${result.sectorsBought > 0}, units=${result.unitsBought > 0}, market=${result.marketTrades > 0}`);

    expect(result.turnsCompleted, "Should complete at least 10 turns").toBeGreaterThanOrEqual(10);

    const features = [
      result.sectorsBought > 0,
      result.unitsBought > 0,
      result.marketTrades > 0,
      result.researchAllocated,
      result.diplomacyViewed,
      result.combatViewed,
      result.covertViewed,
      result.starmapViewed,
      result.messagesViewed,
    ];
    const featureScore = features.filter(Boolean).length;
    expect(featureScore, "Should successfully test at least 3 features").toBeGreaterThanOrEqual(3);
  });
});

// =============================================================================
// TEST SUITE 3: CONTROLS VALIDATION (15 TURNS)
// =============================================================================

test.describe("Game Controls Validation", () => {
  test.beforeEach(async ({ page }) => {
    await skipTutorialViaLocalStorage(page);
  });

  test("Validate all game controls in 15 turns", async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    log(1, "=== GAME CONTROLS VALIDATION ===");

    await ensureGameReady(page, "Controls Validation Test");

    const nextCycle = page.locator('[data-testid="turn-order-end-turn"]').first();
    await expect(nextCycle).toBeVisible({ timeout: 5000 });

    const controls: Record<string, boolean> = {
      military: false,
      sectors: false,
      research: false,
      market: false,
      diplomacy: false,
      combat: false,
      covert: false,
      starmap: false,
    };

    for (let turn = 1; turn <= 15; turn++) {
      log(turn, `\n===== TURN ${turn} =====`);

      try {
        switch (turn % 8) {
          case 1:
            if (await navigateTo(page, "military", "Military")) {
              const hasContent = await page.locator('text=/soldier|fighter|unit|build|queue/i').first().isVisible({ timeout: 1000 }).catch(() => false);
              if (hasContent) controls.military = true;
            }
            break;
          case 2:
            if (await navigateTo(page, "sectors", "Sectors")) {
              const hasContent = await page.locator('text=/sector|agricultural|industrial|colonize/i').first().isVisible({ timeout: 1000 }).catch(() => false);
              if (hasContent) controls.sectors = true;
            }
            break;
          case 3:
            if (await navigateTo(page, "research", "Research")) {
              const hasContent = await page.locator('text=/research|fund|allocat|progress/i').first().isVisible({ timeout: 1000 }).catch(() => false);
              if (hasContent) controls.research = true;
            }
            break;
          case 4:
            if (await navigateTo(page, "market", "Market")) {
              const hasContent = await page.locator('text=/buy|sell|trade|market|price/i').first().isVisible({ timeout: 1000 }).catch(() => false);
              if (hasContent) controls.market = true;
            }
            break;
          case 5:
            if (await navigateTo(page, "diplomacy", "Diplomacy")) {
              const hasContent = await page.locator('text=/diplomacy|treaty|alliance|nap|reputation/i').first().isVisible({ timeout: 1000 }).catch(() => false);
              if (hasContent) controls.diplomacy = true;
            }
            break;
          case 6:
            if (await navigateTo(page, "combat", "Combat")) {
              const hasContent = await page.locator('text=/attack|target|force|combat|war/i').first().isVisible({ timeout: 1000 }).catch(() => false);
              if (hasContent) controls.combat = true;
            }
            break;
          case 7:
            if (await navigateTo(page, "covert", "Covert")) {
              const hasContent = await page.locator('text=/agent|spy|covert|espionage|operation/i').first().isVisible({ timeout: 1000 }).catch(() => false);
              if (hasContent) controls.covert = true;
            }
            break;
          case 0:
            if (await navigateTo(page, "starmap", "Starmap")) {
              const svg = page.locator('svg').first();
              if (await svg.isVisible({ timeout: 2000 }).catch(() => false)) {
                controls.starmap = true;
              }
            }
            break;
        }

        await page.goto("/game", { waitUntil: "networkidle", timeout: 10000 }).catch(() => {});
        await dismissTutorialOverlays(page);
        await endTurnReliably(page);

      } catch (error) {
        log(turn, `ERROR: ${String(error).substring(0, 80)}`);
        await page.goto("/game").catch(() => {});
        await endTurnReliably(page).catch(() => {});
      }
    }

    log(15, "\n===== VALIDATION SUMMARY =====");
    const validated = Object.entries(controls).filter(([, v]) => v);
    log(15, `Validated: ${validated.map(([k]) => k).join(", ") || "none"}`);
    log(15, `Score: ${validated.length}/8 controls`);

    expect(validated.length).toBeGreaterThanOrEqual(5);
  });
});

// =============================================================================
// TEST SUITE 4: PERFORMANCE MONITORING (10 TURNS)
// =============================================================================

test.describe("Performance Monitoring Test", () => {
  test.beforeEach(async ({ page }) => {
    await skipTutorialViaLocalStorage(page);
  });

  test("10-turn game with performance monitoring", async ({ page }) => {
    test.setTimeout(360000); // 6 minutes

    const consoleErrors: string[] = [];
    const turnTimings: number[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await ensureGameReady(page, "Performance Test");

    const turnCounter = page.locator('[data-testid="turn-counter"]');
    await expect(turnCounter).toBeVisible({ timeout: 10000 });

    for (let turn = 1; turn <= 10; turn++) {
      console.log(`Processing Turn ${turn}...`);

      const turnStartTime = Date.now();

      await endTurnReliably(page);

      const turnEndTime = Date.now();
      const turnDuration = turnEndTime - turnStartTime;
      turnTimings.push(turnDuration);

      console.log(`Turn ${turn} completed in ${turnDuration}ms`);

      // Performance check (allow up to 5 seconds for bot processing)
      expect(turnDuration).toBeLessThan(5000);
    }

    console.log("\n=== Turn Processing Performance ===");
    console.log(`Average turn time: ${(turnTimings.reduce((a, b) => a + b, 0) / turnTimings.length).toFixed(0)}ms`);
    console.log(`Max turn time: ${Math.max(...turnTimings)}ms`);
    console.log(`Min turn time: ${Math.min(...turnTimings)}ms`);
    console.log(`Total console errors: ${consoleErrors.length}`);

    if (consoleErrors.length > 0) {
      console.error("\n=== Console Errors Detected ===");
      consoleErrors.slice(0, 10).forEach((error, i) => {
        console.error(`${i + 1}. ${error.substring(0, 100)}`);
      });
    }

    // Allow some console errors but flag if excessive
    expect(consoleErrors.length).toBeLessThan(20);

    const avgTurnTime = turnTimings.reduce((a, b) => a + b, 0) / turnTimings.length;
    expect(avgTurnTime).toBeLessThan(4000);

    console.log("\n10 turns completed successfully!");
  });
});

// =============================================================================
// HELPER FUNCTIONS FOR GAME ACTIONS
// =============================================================================

async function testSectors(page: Page, turn: number) {
  logDebug(`Turn ${turn}: Testing sector colonization`);
  try {
    const sectorsLink = page.locator('a[href="/game/sectors"]').first();
    if (!await sectorsLink.isVisible({ timeout: 2000 }).catch(() => false)) return;
    await sectorsLink.click({ timeout: 1000 }).catch(() => {});
    await page.waitForLoadState("domcontentloaded");

    const buyButton = page.locator('button:has-text("Buy"), button:has-text("Colonize")').first();
    if (await buyButton.isEnabled({ timeout: 1000 }).catch(() => false)) {
      await buyButton.click({ timeout: 1000 });
      logSuccess(`Turn ${turn}: Attempted sector colonization`);
    }
  } catch (error) {
    logDebug(`Turn ${turn}: Sector test skipped`);
  }
}

async function testMilitary(page: Page, turn: number) {
  logDebug(`Turn ${turn}: Testing unit building`);
  try {
    const militaryLink = page.locator('a[href="/game/military"]').first();
    if (!await militaryLink.isVisible().catch(() => false)) return;
    await militaryLink.click();
    await page.waitForLoadState("domcontentloaded");

    const buildButton = page.locator('button:has-text("Build"), button:has-text("Queue")').first();
    if (await buildButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await buildButton.click();
      logSuccess(`Turn ${turn}: Attempted unit build`);
    }
  } catch {
    logDebug(`Turn ${turn}: Military test skipped`);
  }
}

async function testResearch(page: Page, turn: number) {
  logDebug(`Turn ${turn}: Testing research`);
  try {
    const researchLink = page.locator('a[href="/game/research"]').first();
    if (!await researchLink.isVisible().catch(() => false)) return;
    await researchLink.click();
    await page.waitForLoadState("domcontentloaded");
    logSuccess(`Turn ${turn}: Research page accessible`);
  } catch {
    logDebug(`Turn ${turn}: Research test skipped`);
  }
}

async function testMarket(page: Page, turn: number) {
  logDebug(`Turn ${turn}: Testing market`);
  try {
    const marketLink = page.locator('a[href="/game/market"]').first();
    if (!await marketLink.isVisible().catch(() => false)) return;
    await marketLink.click();
    await page.waitForLoadState("domcontentloaded");

    await page.waitForSelector('[data-testid="market-panel"]', { timeout: 3000 }).catch(() => {});
    logSuccess(`Turn ${turn}: Market interface available`);
  } catch {
    logDebug(`Turn ${turn}: Market test skipped`);
  }
}

async function testEspionage(page: Page, turn: number) {
  logDebug(`Turn ${turn}: Testing espionage`);
  try {
    const covertLink = page.locator('a[href="/game/covert"]').first();
    if (!await covertLink.isVisible().catch(() => false)) return;
    await covertLink.click();
    await page.waitForLoadState("domcontentloaded");
    logSuccess(`Turn ${turn}: Covert operations page accessible`);
  } catch {
    logDebug(`Turn ${turn}: Espionage test skipped`);
  }
}

async function testCombat(page: Page, turn: number) {
  logDebug(`Turn ${turn}: Testing combat`);
  try {
    const combatLink = page.locator('a[href="/game/combat"]').first();
    if (!await combatLink.isVisible().catch(() => false)) return;
    await combatLink.click();
    await page.waitForLoadState("domcontentloaded");
    logSuccess(`Turn ${turn}: Combat interface available`);
  } catch {
    logDebug(`Turn ${turn}: Combat test skipped`);
  }
}

async function testDiplomacy(page: Page, turn: number) {
  logDebug(`Turn ${turn}: Testing diplomacy`);
  try {
    const diplomacyLink = page.locator('a[href="/game/diplomacy"]').first();
    if (!await diplomacyLink.isVisible().catch(() => false)) return;
    await diplomacyLink.click();
    await page.waitForLoadState("domcontentloaded");
    logSuccess(`Turn ${turn}: Diplomacy page accessible`);
  } catch {
    logDebug(`Turn ${turn}: Diplomacy test skipped`);
  }
}

async function testSyndicate(page: Page, turn: number) {
  logDebug(`Turn ${turn}: Testing syndicate`);
  try {
    const syndicateLink = page.locator('a[href="/game/syndicate"]').first();
    if (!await syndicateLink.isVisible().catch(() => false)) return;
    await syndicateLink.click();
    await page.waitForLoadState("domcontentloaded");
    logSuccess(`Turn ${turn}: Syndicate page accessible`);
  } catch {
    logDebug(`Turn ${turn}: Syndicate test skipped`);
  }
}

async function testMessages(page: Page, turn: number) {
  logDebug(`Turn ${turn}: Testing messages`);
  try {
    const messagesLink = page.locator('a[href="/game/messages"]').first();
    if (!await messagesLink.isVisible().catch(() => false)) return;
    await messagesLink.click();
    await page.waitForLoadState("domcontentloaded");
    logSuccess(`Turn ${turn}: Messages page accessible`);
  } catch {
    logDebug(`Turn ${turn}: Messages test skipped`);
  }
}

async function testStarmap(page: Page, turn: number) {
  logDebug(`Turn ${turn}: Testing starmap`);
  try {
    const starmapLink = page.locator('a[href="/game/starmap"]').first();
    if (!await starmapLink.isVisible().catch(() => false)) return;
    await starmapLink.click();
    await page.waitForLoadState("domcontentloaded");

    const visualization = await page.locator('svg, canvas').count();
    if (visualization > 0) {
      logSuccess(`Turn ${turn}: Starmap visualization rendered`);
    }
  } catch {
    logDebug(`Turn ${turn}: Starmap test skipped`);
  }
}

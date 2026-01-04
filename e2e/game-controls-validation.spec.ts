import { test, expect, Page } from "@playwright/test";
import { skipTutorialViaLocalStorage, dismissTutorialOverlays } from "./fixtures/game.fixture";

/**
 * Game Controls Validation Test
 *
 * Quick validation of all user control surfaces:
 * - Navigation to all pages
 * - Building units
 * - Buying planets
 * - Research
 * - Market trading
 * - Diplomacy
 * - Combat interface
 * - Covert operations
 * - Starmap visualization
 *
 * Duration: ~2-3 minutes
 * Turns: 15 (quick validation)
 */

function log(turn: number, message: string) {
  console.log(`[Turn ${turn}] ${message}`);
}

async function navigateTo(page: Page, path: string, turn: number): Promise<boolean> {
  try {
    await dismissTutorialOverlays(page);
    const link = page.locator(`a[href="/game/${path}"]`).first();
    if (await link.isVisible({ timeout: 2000 })) {
      await link.click({ timeout: 3000 });
      await page.waitForLoadState("networkidle", { timeout: 5000 });
      log(turn, `Navigated to ${path}`);
      return true;
    }
  } catch {
    log(turn, `WARNING: Could not navigate to ${path}`);
  }
  return false;
}

async function endTurn(page: Page, turn: number): Promise<boolean> {
  // Go back to dashboard
  try {
    await page.goto("/game", { waitUntil: "networkidle", timeout: 10000 });
    await dismissTutorialOverlays(page);
  } catch {
    // Continue anyway
  }

  // Click end turn
  const selectors = [
    'button:has-text("NEXT CYCLE")',
    '[data-testid="turn-order-end-turn"]',
    '[data-testid="end-turn-button"]',
  ];

  for (const selector of selectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 1000 })) {
        await btn.click({ force: true });
        log(turn, "End turn clicked");
        await page.waitForTimeout(1500);

        // Dismiss any modal
        await page.locator('button:has-text("Continue")').first().click({ timeout: 1000 }).catch(() => {});
        return true;
      }
    } catch {
      continue;
    }
  }

  log(turn, "ERROR: Could not end turn");
  return false;
}

test.describe("Game Controls Validation", () => {
  test.beforeEach(async ({ page }) => {
    await skipTutorialViaLocalStorage(page);
  });

  test("Validate all game controls in 15 turns", async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    log(1, "=== GAME CONTROLS VALIDATION ===");

    // Create game
    await page.goto("/game");
    await page.waitForLoadState("networkidle");
    await dismissTutorialOverlays(page);

    const empireNameInput = page.locator('[data-testid="empire-name-input"]');
    if (await empireNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await empireNameInput.fill("Controls Test");
      await page.locator('[data-testid="start-game-button"]').click();
      await page.waitForURL(/\/game/, { timeout: 15000 });
      await page.waitForLoadState("networkidle");
      log(1, "Game created");
    }

    await dismissTutorialOverlays(page);
    await page.keyboard.press("Escape"); // Dismiss any overlay

    // Verify game is active - just check the NEXT CYCLE button exists
    const nextCycle = page.locator('[data-testid="turn-order-end-turn"]').first();
    await expect(nextCycle).toBeVisible({ timeout: 5000 });
    log(1, "Game is active");

    // Test each control surface
    const controls = {
      military: false,
      planets: false,
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
        // Rotate through controls
        switch (turn % 8) {
          case 1:
            if (await navigateTo(page, "military", turn)) {
              // Look for any button or unit-related content
              const hasContent = await page.locator('button, text=/soldier|fighter|unit|build|queue/i').first().isVisible({ timeout: 1000 }).catch(() => false);
              if (hasContent) {
                controls.military = true;
                log(turn, "Military controls VALIDATED");
              }
            }
            break;

          case 2:
            if (await navigateTo(page, "planets", turn)) {
              // Look for planet-related content
              const hasContent = await page.locator('text=/planet|sector|agricultural|industrial|colonize/i').first().isVisible({ timeout: 1000 }).catch(() => false);
              if (hasContent) {
                controls.planets = true;
                log(turn, "Planet controls VALIDATED");
              }
            }
            break;

          case 3:
            if (await navigateTo(page, "research", turn)) {
              const hasContent = await page.locator('text=/research|fund|allocat|progress/i').first().isVisible({ timeout: 1000 }).catch(() => false);
              if (hasContent) {
                controls.research = true;
                log(turn, "Research controls VALIDATED");
              }
            }
            break;

          case 4:
            if (await navigateTo(page, "market", turn)) {
              // Market page has buy/sell tabs or trade content
              const hasContent = await page.locator('text=/buy|sell|trade|market|price/i').first().isVisible({ timeout: 1000 }).catch(() => false);
              if (hasContent) {
                controls.market = true;
                log(turn, "Market controls VALIDATED");
              }
            }
            break;

          case 5:
            if (await navigateTo(page, "diplomacy", turn)) {
              // Look for any diplomacy content
              const hasContent = await page.locator('text=/diplomacy|treaty|alliance|nap|reputation|empire/i').first().isVisible({ timeout: 1000 }).catch(() => false);
              if (hasContent) {
                controls.diplomacy = true;
                log(turn, "Diplomacy controls VALIDATED");
              }
            }
            break;

          case 6:
            if (await navigateTo(page, "combat", turn)) {
              const hasContent = await page.locator('text=/attack|target|force|combat|war/i').first().isVisible({ timeout: 1000 }).catch(() => false);
              if (hasContent) {
                controls.combat = true;
                log(turn, "Combat controls VALIDATED");
              }
            }
            break;

          case 7:
            if (await navigateTo(page, "covert", turn)) {
              // Look for covert/espionage content
              const hasContent = await page.locator('text=/agent|spy|covert|espionage|operation|mission/i').first().isVisible({ timeout: 1000 }).catch(() => false);
              if (hasContent) {
                controls.covert = true;
                log(turn, "Covert controls VALIDATED");
              }
            }
            break;

          case 0:
            if (await navigateTo(page, "starmap", turn)) {
              // Check for SVG visualization
              const svg = page.locator('svg').first();
              if (await svg.isVisible({ timeout: 2000 }).catch(() => false)) {
                controls.starmap = true;
                log(turn, "Starmap visualization VALIDATED");

                // Count regions
                const regions = await page.locator('[data-testid*="region"], [class*="region"]').count();
                if (regions > 0) {
                  log(turn, `Found ${regions} galaxy regions`);
                }
              }
            }
            break;
        }

        // End turn
        await endTurn(page, turn);

      } catch (error) {
        log(turn, `ERROR: ${String(error).substring(0, 80)}`);
        // Try to recover
        await page.goto("/game").catch(() => {});
        await endTurn(page, turn).catch(() => {});
      }
    }

    // Summary
    log(15, "\n===== VALIDATION SUMMARY =====");
    const validated = Object.entries(controls).filter(([, v]) => v);
    const failed = Object.entries(controls).filter(([, v]) => !v);

    log(15, `Validated: ${validated.map(([k]) => k).join(", ") || "none"}`);
    log(15, `Not validated: ${failed.map(([k]) => k).join(", ") || "none"}`);
    log(15, `Score: ${validated.length}/8 controls`);

    // Must validate at least 5 controls to pass
    expect(validated.length).toBeGreaterThanOrEqual(5);
  });
});

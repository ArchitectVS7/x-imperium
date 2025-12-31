import { test, expect } from "./fixtures/game.fixture";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";

/**
 * Bot Scaling Tests
 *
 * Tests game stability with various bot counts:
 * - 10 bots (standard)
 * - 25 bots (medium)
 * - 50 bots (large)
 * - 100 bots (stress test)
 *
 * Tests run serially to avoid interference.
 */

async function createGameWithBots(page: any, botCount: number, testName: string) {
  console.log(`\n=== ${testName}: Testing with ${botCount} bots ===`);

  // Delete any existing games to force new game creation
  try {
    await db.delete(games);
    console.log("  Cleaned existing games");
  } catch (err) {
    console.log("  Database cleanup skipped");
  }

  // Navigate to game page
  await page.goto("/game?newGame=true");
  await page.waitForLoadState("networkidle");

  // Check if we need to create a new game
  const dashboard = page.locator('[data-testid="dashboard"]');
  const isDashboardVisible = await dashboard.isVisible().catch(() => false);

  if (!isDashboardVisible) {
    console.log("  Creating new game...");

    // Wait for and fill setup form
    const nameInput = page.locator('[data-testid="empire-name-input"]');
    await nameInput.waitFor({ state: "visible", timeout: 10000 });
    await nameInput.fill(`Bot Test ${botCount}`);

    // Select bot count
    const botCountButton = page.locator(`[data-testid="bot-count-${botCount}"]`);
    await botCountButton.waitFor({ state: "visible", timeout: 5000 });
    await botCountButton.click();
    console.log(`  Selected ${botCount} bots`);

    // Submit form
    const startButton = page.locator('[data-testid="start-game-button"]');
    await startButton.click();
    console.log(`  Form submitted, waiting for game creation...`);

    // Wait for dashboard to appear
    await expect(dashboard).toBeVisible({ timeout: 60000 });
  } else {
    console.log("  Dashboard already visible - game exists");
  }

  console.log(`✅ Game ready with ${botCount} bots`);
  return true;
}

async function processTurns(page: any, turns: number, botCount: number) {
  console.log(`Processing ${turns} turns with ${botCount} bots...`);
  const startTime = Date.now();

  for (let i = 0; i < turns; i++) {
    const turnStart = Date.now();

    // Click end turn
    const endTurnButton = page.locator('[data-testid="end-turn-button"]');
    await endTurnButton.click();

    // Wait for turn processing
    await page.waitForLoadState("networkidle", { timeout: 60000 });

    // Wait for modal and close it
    const modal = page.locator('[data-testid="turn-summary-modal"]');
    if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
      const continueBtn = modal.locator('button:has-text("Continue")').first();
      await continueBtn.click();
    }

    const turnTime = Date.now() - turnStart;
    console.log(`  Turn ${i + 1}/${turns}: ${turnTime}ms`);

    // Small delay between turns
    await page.waitForTimeout(500);
  }

  const totalTime = Date.now() - startTime;
  const avgTime = totalTime / turns;
  console.log(`✅ ${turns} turns completed in ${totalTime}ms (avg: ${Math.round(avgTime)}ms/turn)`);

  return { totalTime, avgTime };
}

test.describe.serial("Bot Scaling Tests", () => {
  test("10 bots - 5 turns", async ({ gamePage }) => {
    test.setTimeout(180000); // 3 minutes
    await createGameWithBots(gamePage, 10, "10 bots test");
    const stats = await processTurns(gamePage, 5, 10);

    expect(stats.avgTime).toBeLessThan(15000); // Less than 15s per turn
    console.log(`\n✅ 10 bots: Average ${Math.round(stats.avgTime)}ms per turn`);
  });

  test("25 bots - 5 turns", async ({ gamePage }) => {
    test.setTimeout(240000); // 4 minutes
    await createGameWithBots(gamePage, 25, "25 bots test");
    const stats = await processTurns(gamePage, 5, 25);

    expect(stats.avgTime).toBeLessThan(20000); // Less than 20s per turn
    console.log(`\n✅ 25 bots: Average ${Math.round(stats.avgTime)}ms per turn`);
  });

  test("50 bots - 5 turns", async ({ gamePage }) => {
    test.setTimeout(300000); // 5 minutes
    await createGameWithBots(gamePage, 50, "50 bots test");
    const stats = await processTurns(gamePage, 5, 50);

    expect(stats.avgTime).toBeLessThan(25000); // Less than 25s per turn
    console.log(`\n✅ 50 bots: Average ${Math.round(stats.avgTime)}ms per turn`);
  });

  test("100 bots - 5 turns", async ({ gamePage }) => {
    test.setTimeout(420000); // 7 minutes
    await createGameWithBots(gamePage, 100, "100 bots test");
    const stats = await processTurns(gamePage, 5, 100);

    expect(stats.avgTime).toBeLessThan(35000); // Less than 35s per turn
    console.log(`\n✅ 100 bots: Average ${Math.round(stats.avgTime)}ms per turn`);
  });
});

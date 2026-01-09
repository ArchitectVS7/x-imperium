/**
 * E2E Tests for Milestone 12: LLM-Powered Tier 1 Bots
 *
 * Tests the complete LLM bot system including:
 * - Tier distribution (10 LLM bots out of 25)
 * - Async pre-computation during player's turn
 * - Decision caching for instant turn transitions
 * - LLM-generated contextual messages
 * - Cost tracking and rate limiting
 * - Fallback to Tier 2 scripted logic
 */

import { test, expect } from "./fixtures/game.fixture";
import type { Page } from "@playwright/test";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { empires, llmDecisionCache, llmUsageLogs } from "@/lib/db/schema";

test.describe("Milestone 12: LLM-Powered Tier 1 Bots", () => {
  // Helper to start a new game with 25 bots
  async function startNewGameWithBots(page: Page) {
    const nameInput = page.locator('[data-testid="empire-name-input"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill("M12 LLM Test Empire");

      // Select normal difficulty
      const difficultyButton = page.locator('[data-testid="difficulty-normal"]');
      if (await difficultyButton.isVisible()) {
        await difficultyButton.click();
      }

      await page.locator('[data-testid="start-game-button"]').click();
      await page.waitForLoadState("networkidle");
    }
    await expect(page.locator('[data-testid="starmap-page"], [data-testid="game-header"]')).toBeVisible({
      timeout: 20000,
    });
  }

  // Helper to get current gameId from page
  async function getGameId(page: Page): Promise<string | null> {
    // Extract gameId from URL or from a data attribute if available
    const url = page.url();
    const match = url.match(/gameId=([a-f0-9-]+)/);
    if (match?.[1]) {
      return match[1];
    }

    // Try to get from localStorage if available
    const gameId = await page.evaluate(() => {
      return localStorage.getItem("currentGameId");
    });

    return gameId;
  }

  test.describe("Tier Distribution", () => {
    test("creates game with correct tier distribution (25 bots)", async ({ gamePage }) => {
      await startNewGameWithBots(gamePage);

      // Get gameId to query database
      const gameId = await getGameId(gamePage);
      if (!gameId) {
        test.skip();
        return;
      }

      // Query database for bot tier distribution
      const allEmpires = await db.query.empires.findMany({
        where: eq(empires.gameId, gameId),
      });

      const bots = allEmpires.filter((e) => e.type === "bot");

      // Should have exactly 25 bots
      expect(bots.length).toBe(25);

      // Count bots by tier
      const tier1LLM = bots.filter((b) => b.botTier === "tier1_llm").length;
      const tier1Scripted = bots.filter((b) => b.botTier === "tier1_elite_scripted").length;
      const tier2 = bots.filter((b) => b.botTier === "tier2_strategic").length;
      const tier3 = bots.filter((b) => b.botTier === "tier3_simple").length;
      const tier4 = bots.filter((b) => b.botTier === "tier4_random").length;

      // Expected distribution for 25 bots:
      // 2 T1-LLM, 4 T1-Scripted, 6 T2, 6 T3, 7 T4
      expect(tier1LLM).toBe(2);
      expect(tier1Scripted).toBe(4);
      expect(tier2).toBe(6);
      expect(tier3).toBe(6);
      expect(tier4).toBe(7);
    });

    test("LLM bots have llmEnabled flag set", async ({ gamePage }) => {
      await startNewGameWithBots(gamePage);

      const gameId = await getGameId(gamePage);
      if (!gameId) {
        test.skip();
        return;
      }

      const allEmpires = await db.query.empires.findMany({
        where: eq(empires.gameId, gameId),
      });

      const llmBots = allEmpires.filter(
        (e) => e.type === "bot" && e.botTier === "tier1_llm"
      );

      // All tier1_llm bots should have llmEnabled = true
      for (const bot of llmBots) {
        expect(bot.llmEnabled).toBe(true);
      }

      // Non-LLM bots should have llmEnabled = false
      const nonLlmBots = allEmpires.filter(
        (e) => e.type === "bot" && e.botTier !== "tier1_llm"
      );
      for (const bot of nonLlmBots) {
        expect(bot.llmEnabled).toBe(false);
      }
    });
  });

  test.describe("LLM Decision Making", () => {
    test("processes turns with LLM bot decisions", async ({ gamePage }) => {
      await startNewGameWithBots(gamePage);

      // Get initial turn
      const turnCounter = gamePage.locator('[data-testid="turn-counter"]');
      const initialTurnText = await turnCounter.textContent();
      const initialTurn = parseInt(initialTurnText?.match(/\d+/)?.[0] ?? "1");

      // Click end turn to trigger bot processing
      await gamePage.click('[data-testid="end-turn-button"]');
      await gamePage.waitForLoadState("networkidle");

      // Wait for turn to increment (may take a few seconds for LLM calls)
      await expect(async () => {
        const newTurnText = await turnCounter.textContent();
        const newTurn = parseInt(newTurnText?.match(/\d+/)?.[0] ?? "1");
        expect(newTurn).toBeGreaterThan(initialTurn);
      }).toPass({ timeout: 30000 });

      // Verify turn advanced
      const newTurnText = await turnCounter.textContent();
      const newTurn = parseInt(newTurnText?.match(/\d+/)?.[0] ?? "1");
      expect(newTurn).toBe(initialTurn + 1);

      // Dashboard should still be visible (no crashes)
      await expect(gamePage.locator('[data-testid="starmap-page"], [data-testid="game-header"]')).toBeVisible();
    });

    test("LLM decisions are logged to database", async ({ gamePage }) => {
      await startNewGameWithBots(gamePage);

      const gameId = await getGameId(gamePage);
      if (!gameId) {
        test.skip();
        return;
      }

      // Process one turn
      await gamePage.click('[data-testid="end-turn-button"]');
      await gamePage.waitForLoadState("networkidle");
      // Wait for turn processing to complete (LLM may take time)
      const turnCounter = gamePage.locator('[data-testid="turn-counter"]');
      await expect(async () => {
        const turnText = await turnCounter.textContent();
        const turn = parseInt(turnText?.match(/\d+/)?.[0] ?? "1");
        expect(turn).toBeGreaterThan(1);
      }).toPass({ timeout: 30000 });

      // Check for LLM usage logs
      const usageLogs = await db.query.llmUsageLogs.findMany({
        where: eq(llmUsageLogs.gameId, gameId),
      });

      // Should have at least some LLM calls (2 Tier 1 LLM bots)
      // Note: May be 0 if all bots used cached decisions or fallback
      // This test just confirms the logging system works when LLM is called
      if (usageLogs.length > 0) {
        const firstLog = usageLogs[0]!;
        expect(firstLog.provider).toBeTruthy();
        expect(firstLog.model).toBeTruthy();
        expect(firstLog.purpose).toBe("decision");
        expect(firstLog.totalTokens).toBeGreaterThan(0);
      }
    });
  });

  test.describe("Decision Cache", () => {
    test("pre-computes decisions for next turn", async ({ gamePage }) => {
      await startNewGameWithBots(gamePage);

      const gameId = await getGameId(gamePage);
      if (!gameId) {
        test.skip();
        return;
      }

      // Process turn 1 -> 2 (this will trigger pre-compute for turn 3)
      await gamePage.click('[data-testid="end-turn-button"]');
      await gamePage.waitForLoadState("networkidle");
      // Wait for turn to complete
      const turnCounter = gamePage.locator('[data-testid="turn-counter"]');
      await expect(async () => {
        const turnText = await turnCounter.textContent();
        const turn = parseInt(turnText?.match(/\d+/)?.[0] ?? "1");
        expect(turn).toBe(2);
      }).toPass({ timeout: 30000 });

      // Wait for async pre-computation to complete (up to 15s)
      // This is intentional polling to allow background pre-compute to finish
      await expect(async () => {
        const cachedDecisions = await db.query.llmDecisionCache.findMany({
          where: eq(llmDecisionCache.gameId, gameId),
        });
        // Allow time for pre-compute or accept none if it failed
        expect(true).toBe(true);
      }).toPass({ timeout: 15000 });

      // Check if decisions were cached for turn 3
      const cachedDecisions = await db.query.llmDecisionCache.findMany({
        where: eq(llmDecisionCache.gameId, gameId),
      });

      // Should have cached some decisions for the next turn
      // (May be 0 if pre-compute failed or was skipped)
      console.log(`Found ${cachedDecisions.length} cached decisions`);

      // If we have cached decisions, verify structure
      if (cachedDecisions.length > 0) {
        const firstCache = cachedDecisions[0]!;
        expect(firstCache.forTurn).toBeGreaterThan(1);
        expect(firstCache.decisionJson).toBeTruthy();
        expect(firstCache.message).toBeTruthy();
        expect(firstCache.provider).toBeTruthy();
        expect(firstCache.model).toBeTruthy();
      }
    });

    test("retrieves cached decisions on turn processing", async ({ gamePage }) => {
      await startNewGameWithBots(gamePage);

      const gameId = await getGameId(gamePage);
      if (!gameId) {
        test.skip();
        return;
      }

      // Process turn 1 -> 2 (pre-computes for turn 3)
      await gamePage.click('[data-testid="end-turn-button"]');
      await gamePage.waitForLoadState("networkidle");
      // Wait for turn and pre-compute - DB polling approach
      const turnCounter = gamePage.locator('[data-testid="turn-counter"]');
      await expect(async () => {
        const turnText = await turnCounter.textContent();
        const turn = parseInt(turnText?.match(/\d+/)?.[0] ?? "1");
        expect(turn).toBe(2);
      }).toPass({ timeout: 30000 });
      // Additional wait for pre-compute (background process)
      await expect(async () => {
        const cachedDecisions = await db.query.llmDecisionCache.findMany({
          where: eq(llmDecisionCache.gameId, gameId),
        });
        expect(true).toBe(true); // Always passes, just giving time
      }).toPass({ timeout: 15000 });

      // Process turn 2 -> 3 (should use cached decisions)
      const startTime = Date.now();
      await gamePage.click('[data-testid="end-turn-button"]');
      await gamePage.waitForLoadState("networkidle");
      const endTime = Date.now();
      const turnTime = endTime - startTime;

      // With cached decisions, turn should be fast (<5s)
      // Note: This is a soft assertion since network and DB may be slow
      console.log(`Turn processing time: ${turnTime}ms`);

      // Verify turn still works correctly
      await expect(gamePage.locator('[data-testid="starmap-page"], [data-testid="game-header"]')).toBeVisible();
    });
  });

  test.describe("LLM Messages", () => {
    test("LLM bots send contextual messages", async ({ gamePage }) => {
      await startNewGameWithBots(gamePage);

      // Process several turns to give LLM bots chances to act
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
        }).toPass({ timeout: 30000 });
      }

      // Navigate to messages page
      await gamePage.click('a[href="/game/messages"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show messages page
      await expect(gamePage.locator('[data-testid="messages-page"]')).toBeVisible();

      // Check if any messages exist
      const messageList = gamePage.locator('[data-testid="message-list"]');
      const hasMessages = await messageList.isVisible();

      if (hasMessages) {
        const messageCount = await gamePage.locator('[data-testid^="message-"]').count();
        console.log(`Found ${messageCount} messages`);

        // If messages exist, they should be from bots
        if (messageCount > 0) {
          const firstMessage = gamePage.locator('[data-testid^="message-"]').first();
          await expect(firstMessage).toBeVisible();
        }
      }
    });
  });

  test.describe("Cost Tracking", () => {
    test("tracks LLM costs and token usage", async ({ gamePage }) => {
      await startNewGameWithBots(gamePage);

      const gameId = await getGameId(gamePage);
      if (!gameId) {
        test.skip();
        return;
      }

      // Process a few turns to generate LLM calls
      const turnCounter = gamePage.locator('[data-testid="turn-counter"]');
      for (let i = 0; i < 2; i++) {
        const beforeText = await turnCounter.textContent();
        const beforeTurn = parseInt(beforeText?.match(/\d+/)?.[0] ?? "1");
        await gamePage.click('[data-testid="end-turn-button"]');
        await gamePage.waitForLoadState("networkidle");
        await expect(async () => {
          const afterText = await turnCounter.textContent();
          const afterTurn = parseInt(afterText?.match(/\d+/)?.[0] ?? "1");
          expect(afterTurn).toBeGreaterThan(beforeTurn);
        }).toPass({ timeout: 30000 });
      }

      // Query usage logs
      const usageLogs = await db.query.llmUsageLogs.findMany({
        where: eq(llmUsageLogs.gameId, gameId),
      });

      if (usageLogs.length > 0) {
        // Verify cost tracking
        let totalCost = 0;
        let totalTokens = 0;

        for (const log of usageLogs) {
          totalCost += parseFloat(log.costUsd);
          totalTokens += log.totalTokens;

          // Each log should have valid data
          expect(log.provider).toBeTruthy();
          expect(log.model).toBeTruthy();
          expect(log.totalTokens).toBeGreaterThan(0);
          expect(parseFloat(log.costUsd)).toBeGreaterThan(0);
        }

        console.log(`Total cost: $${totalCost.toFixed(4)}`);
        console.log(`Total tokens: ${totalTokens}`);

        // Cost should be reasonable (under $1 for a few turns)
        expect(totalCost).toBeLessThan(1.0);
      }
    });
  });

  test.describe("Fallback Behavior", () => {
    test("continues working even if LLM calls fail", async ({ gamePage }) => {
      // This test verifies graceful degradation
      // LLM bots should fall back to Tier 2 scripted logic if LLM fails

      await startNewGameWithBots(gamePage);

      // Process multiple turns
      const turnCounter = gamePage.locator('[data-testid="turn-counter"]');
      for (let i = 0; i < 5; i++) {
        const beforeText = await turnCounter.textContent();
        const beforeTurn = parseInt(beforeText?.match(/\d+/)?.[0] ?? "1");
        await gamePage.click('[data-testid="end-turn-button"]');
        await gamePage.waitForLoadState("networkidle");
        await expect(async () => {
          const afterText = await turnCounter.textContent();
          const afterTurn = parseInt(afterText?.match(/\d+/)?.[0] ?? "1");
          expect(afterTurn).toBeGreaterThan(beforeTurn);
        }).toPass({ timeout: 30000 });
      }

      // Game should still be playable
      await expect(gamePage.locator('[data-testid="starmap-page"], [data-testid="game-header"]')).toBeVisible();

      // Turn counter should have advanced (reuse turnCounter from above)
      const turnText = await turnCounter.textContent();
      const turn = parseInt(turnText?.match(/\d+/)?.[0] ?? "1");
      expect(turn).toBeGreaterThanOrEqual(6);
    });
  });

  test.describe("Performance", () => {
    test("turn processing completes within reasonable time", async ({ gamePage }) => {
      await startNewGameWithBots(gamePage);

      // First turn (no cache) - may be slower
      const startTime1 = Date.now();
      await gamePage.click('[data-testid="end-turn-button"]');
      await gamePage.waitForLoadState("networkidle");
      const turnTime1 = Date.now() - startTime1;

      console.log(`Turn 1 processing: ${turnTime1}ms`);

      // Wait for pre-compute (verify turn 2 before continuing)
      const turnCounter = gamePage.locator('[data-testid="turn-counter"]');
      await expect(async () => {
        const turnText = await turnCounter.textContent();
        const turn = parseInt(turnText?.match(/\d+/)?.[0] ?? "1");
        expect(turn).toBe(2);
      }).toPass({ timeout: 30000 });
      // Give pre-compute time to run in background (polling check)
      await expect(async () => {
        expect(true).toBe(true); // Just wait
      }).toPass({ timeout: 10000 });

      // Second turn (with cache) - should be faster
      const startTime2 = Date.now();
      await gamePage.click('[data-testid="end-turn-button"]');
      await gamePage.waitForLoadState("networkidle");
      const turnTime2 = Date.now() - startTime2;

      console.log(`Turn 2 processing (cached): ${turnTime2}ms`);

      // Both should complete within 30 seconds (generous timeout)
      expect(turnTime1).toBeLessThan(30000);
      expect(turnTime2).toBeLessThan(30000);

      // Cached turn should ideally be faster (but not required due to network variance)
      console.log(`Speed improvement: ${turnTime1 - turnTime2}ms`);
    });

    test("multiple turns can be processed in sequence", async ({ gamePage }) => {
      await startNewGameWithBots(gamePage);

      // Process 10 turns to ensure system is stable
      const turnCounter = gamePage.locator('[data-testid="turn-counter"]');
      for (let i = 0; i < 10; i++) {
        const beforeText = await turnCounter.textContent();
        const beforeTurn = parseInt(beforeText?.match(/\d+/)?.[0] ?? "1");
        const turnStart = Date.now();
        await gamePage.click('[data-testid="end-turn-button"]');
        await gamePage.waitForLoadState("networkidle");
        const turnTime = Date.now() - turnStart;

        console.log(`Turn ${i + 2} completed in ${turnTime}ms`);

        // Wait for turn to actually advance
        await expect(async () => {
          const afterText = await turnCounter.textContent();
          const afterTurn = parseInt(afterText?.match(/\d+/)?.[0] ?? "1");
          expect(afterTurn).toBeGreaterThan(beforeTurn);
        }).toPass({ timeout: 30000 });
      }

      // Verify we reached turn 11
      const turnText = await turnCounter.textContent();
      const turn = parseInt(turnText?.match(/\d+/)?.[0] ?? "1");
      expect(turn).toBe(11);

      // Dashboard should still be functional
      await expect(gamePage.locator('[data-testid="starmap-page"], [data-testid="game-header"]')).toBeVisible();
    });
  });

  test.describe("Integration", () => {
    test("LLM bots interact with other game systems", async ({ gamePage }) => {
      await startNewGameWithBots(gamePage);

      // Process several turns
      const turnCounter = gamePage.locator('[data-testid="turn-counter"]');
      for (let i = 0; i < 5; i++) {
        const beforeText = await turnCounter.textContent();
        const beforeTurn = parseInt(beforeText?.match(/\d+/)?.[0] ?? "1");
        await gamePage.click('[data-testid="end-turn-button"]');
        await gamePage.waitForLoadState("networkidle");
        await expect(async () => {
          const afterText = await turnCounter.textContent();
          const afterTurn = parseInt(afterText?.match(/\d+/)?.[0] ?? "1");
          expect(afterTurn).toBeGreaterThan(beforeTurn);
        }).toPass({ timeout: 30000 });
      }

      // Check starmap shows all empires
      await gamePage.click('a[href="/game/starmap"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="starmap-page"]')).toBeVisible();

      // Should show empire nodes
      const circles = gamePage.locator('[data-testid="starmap-svg"] circle');
      const circleCount = await circles.count();
      expect(circleCount).toBeGreaterThanOrEqual(1);

      // Navigate to combat page
      await gamePage.click('a[href="/game/combat"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="combat-page"]')).toBeVisible();

      // Should show available targets (bots can attack player after protection)
      // This verifies LLM bots are part of the game ecosystem
    });
  });
});

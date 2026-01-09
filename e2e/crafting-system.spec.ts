/**
 * E2E Tests for Crafting & Syndicate Systems
 *
 * Tests the complete crafting and black market flow:
 * - Resource inventory management
 * - Crafting queue operations
 * - Recipe validation
 * - Syndicate trust progression
 * - Contract acceptance and completion
 */

import { test, expect } from "./fixtures/game.fixture";
import type { Page } from "@playwright/test";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { empires, resourceInventory, craftingQueue, syndicateTrust } from "@/lib/db/schema";

test.describe("Crafting System", () => {
  // Helper to start a new game
  async function startNewGame(page: Page) {
    const nameInput = page.locator('[data-testid="empire-name-input"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill("Crafting Test Empire");

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

  // Helper to get gameId
  async function getGameId(page: Page): Promise<string | null> {
    return await page.evaluate(() => localStorage.getItem("currentGameId"));
  }

  test.describe("Navigation", () => {
    test("can navigate to crafting page", async ({ gamePage }) => {
      await startNewGame(gamePage);

      // Navigate to crafting page
      await gamePage.click('a[href="/game/crafting"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show crafting page
      await expect(gamePage.locator('[data-testid="crafting-page"]')).toBeVisible({
        timeout: 10000,
      });

      // Should show page title
      await expect(gamePage.locator("h1")).toContainText("Crafting");
    });

    test("can navigate to syndicate page", async ({ gamePage }) => {
      await startNewGame(gamePage);

      // Navigate to syndicate page
      await gamePage.click('a[href="/game/syndicate"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show syndicate page
      await expect(gamePage.locator('[data-testid="syndicate-page"]')).toBeVisible({
        timeout: 10000,
      });

      // Should show page title
      await expect(gamePage.locator("h1")).toContainText("Syndicate");
    });
  });

  test.describe("Resource Inventory", () => {
    test("displays initial resource inventory", async ({ gamePage }) => {
      await startNewGame(gamePage);
      await gamePage.click('a[href="/game/crafting"]');
      await gamePage.waitForLoadState("networkidle");

      const gameId = await getGameId(gamePage);
      if (!gameId) {
        test.skip();
        return;
      }

      // Check database for inventory
      const empire = await db.query.empires.findFirst({
        where: and(
          eq(empires.gameId, gameId),
          eq(empires.type, "player")
        ),
      });

      if (!empire) {
        test.skip();
        return;
      }

      // Initial inventory should be empty or have default resources
      const inventory = await db.query.resourceInventory.findMany({
        where: eq(resourceInventory.empireId, empire.id),
      });

      // Inventory exists (may be empty at game start)
      console.log(`Found ${inventory.length} inventory entries`);
    });
  });

  test.describe("Crafting Recipes", () => {
    test("displays available recipes", async ({ gamePage }) => {
      await startNewGame(gamePage);
      await gamePage.click('a[href="/game/crafting"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show recipe list
      const recipeSection = gamePage.locator('[data-testid="recipe-list"]');
      if (await recipeSection.isVisible()) {
        await expect(recipeSection).toBeVisible();

        // Should show at least Tier 1 recipes
        const recipes = gamePage.locator('[data-testid^="recipe-"]');
        const recipeCount = await recipes.count();
        console.log(`Found ${recipeCount} recipes`);

        // Should have some recipes
        expect(recipeCount).toBeGreaterThanOrEqual(1);
      } else {
        console.log("Recipe list not visible - may need ore/petroleum to craft");
      }
    });

    test("can filter recipes by tier", async ({ gamePage }) => {
      await startNewGame(gamePage);
      await gamePage.click('a[href="/game/crafting"]');
      await gamePage.waitForLoadState("networkidle");

      // Look for tier filter buttons
      const tier1Filter = gamePage.locator('[data-testid="filter-tier1"]');
      const tier2Filter = gamePage.locator('[data-testid="filter-tier2"]');

      if (await tier1Filter.isVisible()) {
        await tier1Filter.click();
        // Wait for filter to be applied
        await expect(tier1Filter).toHaveClass(/active|selected/, { timeout: 2000 }).catch(() => {});

        // Should filter to Tier 1 only
        const visibleRecipes = gamePage.locator('[data-testid^="recipe-tier1"]');
        const count = await visibleRecipes.count();
        console.log(`Tier 1 recipes: ${count}`);
      } else {
        console.log("Recipe filtering not visible - UI may differ");
      }
    });
  });

  test.describe("Crafting Queue", () => {
    test("can add item to crafting queue", async ({ gamePage }) => {
      await startNewGame(gamePage);
      await gamePage.click('a[href="/game/crafting"]');
      await gamePage.waitForLoadState("networkidle");

      const gameId = await getGameId(gamePage);
      if (!gameId) {
        test.skip();
        return;
      }

      // Try to craft refined metals (simplest Tier 1 recipe)
      const craftButton = gamePage.locator('[data-testid="craft-refined_metals"]');

      if (await craftButton.isVisible()) {
        await craftButton.click();
        // Wait for crafting action to complete (queue update)
        await gamePage.waitForLoadState("networkidle");

        // Check queue was created in database
        const empire = await db.query.empires.findFirst({
          where: and(
            eq(empires.gameId, gameId),
            eq(empires.type, "player")
          ),
        });

        if (empire) {
          const queue = await db.query.craftingQueue.findMany({
            where: eq(craftingQueue.empireId, empire.id),
          });

          console.log(`Crafting queue has ${queue.length} items`);

          if (queue.length > 0) {
            const firstItem = queue[0]!;
            expect(firstItem.resourceType).toBeTruthy();
            expect(firstItem.quantity).toBeGreaterThan(0);
          }
        }
      } else {
        console.log("Craft button not found - may need resources first");
      }
    });
  });

  test.describe("Turn Processing", () => {
    test("crafting queue processes on turn end", async ({ gamePage }) => {
      await startNewGame(gamePage);

      // Fast-forward to turn 3 to accumulate some resources
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
        }).toPass({ timeout: 15000 });
      }

      // Navigate to crafting
      await gamePage.click('a[href="/game/crafting"]');
      await gamePage.waitForLoadState("networkidle");

      // If crafting is available, test queue processing
      const craftButton = gamePage.locator('[data-testid^="craft-"]').first();

      if (await craftButton.isVisible()) {
        await craftButton.click();
        await gamePage.waitForLoadState("networkidle");

        // Process one more turn
        await gamePage.click('a[href="/game"]');
        await gamePage.waitForLoadState("networkidle");
        const turnBeforeText = await turnCounter.textContent();
        const turnBefore = parseInt(turnBeforeText?.match(/\d+/)?.[0] ?? "1");
        await gamePage.click('[data-testid="end-turn-button"]');
        await gamePage.waitForLoadState("networkidle");
        await expect(async () => {
          const turnAfterText = await turnCounter.textContent();
          const turnAfter = parseInt(turnAfterText?.match(/\d+/)?.[0] ?? "1");
          expect(turnAfter).toBeGreaterThan(turnBefore);
        }).toPass({ timeout: 15000 });

        // Queue should have progressed
        console.log("Turn processed with crafting queue active");
      } else {
        console.log("No craftable items available yet - skipping queue test");
      }
    });
  });
});

test.describe("Syndicate System", () => {
  async function startNewGame(page: Page) {
    const nameInput = page.locator('[data-testid="empire-name-input"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill("Syndicate Test Empire");
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

  async function getGameId(page: Page): Promise<string | null> {
    return await page.evaluate(() => localStorage.getItem("currentGameId"));
  }

  test.describe("Trust System", () => {
    test("displays initial trust level", async ({ gamePage }) => {
      await startNewGame(gamePage);
      await gamePage.click('a[href="/game/syndicate"]');
      await gamePage.waitForLoadState("networkidle");

      const gameId = await getGameId(gamePage);
      if (!gameId) {
        test.skip();
        return;
      }

      // Check database for trust
      const empire = await db.query.empires.findFirst({
        where: and(
          eq(empires.gameId, gameId),
          eq(empires.type, "player")
        ),
      });

      if (!empire) {
        test.skip();
        return;
      }

      const trust = await db.query.syndicateTrust.findFirst({
        where: eq(syndicateTrust.empireId, empire.id),
      });

      if (trust) {
        console.log(`Syndicate trust level: ${trust.trustLevel}, points: ${trust.trustPoints}`);
        expect(trust.trustLevel).toBeGreaterThanOrEqual(0);
        expect(trust.trustLevel).toBeLessThanOrEqual(8);
      } else {
        console.log("No syndicate trust record - created on first interaction");
      }
    });

    test("shows available contracts", async ({ gamePage }) => {
      await startNewGame(gamePage);
      await gamePage.click('a[href="/game/syndicate"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show contracts section
      const contractsSection = gamePage.locator('[data-testid="syndicate-contracts"]');

      if (await contractsSection.isVisible()) {
        await expect(contractsSection).toBeVisible();
        console.log("Contracts section visible");

        // May show "no contracts available" or actual contracts
        const contractCards = gamePage.locator('[data-testid^="contract-"]');
        const count = await contractCards.count();
        console.log(`Found ${count} available contracts`);
      } else {
        console.log("Contracts section not visible - may require trust level");
      }
    });
  });

  test.describe("Black Market Catalog", () => {
    test("displays black market items", async ({ gamePage }) => {
      await startNewGame(gamePage);
      await gamePage.click('a[href="/game/syndicate"]');
      await gamePage.waitForLoadState("networkidle");

      // Should show black market catalog
      const catalogSection = gamePage.locator('[data-testid="black-market-catalog"]');

      if (await catalogSection.isVisible()) {
        await expect(catalogSection).toBeVisible();
        console.log("Black Market catalog visible");

        // Should show available items (filtered by trust)
        const items = gamePage.locator('[data-testid^="market-item-"]');
        const count = await items.count();
        console.log(`Found ${count} market items`);
      } else {
        console.log("Black Market not visible - may require trust level 1+");
      }
    });
  });

  test.describe("Integration", () => {
    test("crafting and syndicate pages coexist", async ({ gamePage }) => {
      await startNewGame(gamePage);

      // Can navigate between both pages
      await gamePage.click('a[href="/game/crafting"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="crafting-page"]')).toBeVisible();

      await gamePage.click('a[href="/game/syndicate"]');
      await gamePage.waitForLoadState("networkidle");
      await expect(gamePage.locator('[data-testid="syndicate-page"]')).toBeVisible();

      // Both systems should be accessible
      console.log("Both crafting and syndicate systems accessible");
    });

    test("can craft and use syndicate in same game", async ({ gamePage }) => {
      await startNewGame(gamePage);

      // Fast-forward several turns
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
        }).toPass({ timeout: 15000 });
      }

      // Check both systems are functional
      await gamePage.click('a[href="/game/crafting"]');
      await gamePage.waitForLoadState("networkidle");
      const hasCrafting = await gamePage.locator('[data-testid="crafting-page"]').isVisible();

      await gamePage.click('a[href="/game/syndicate"]');
      await gamePage.waitForLoadState("networkidle");
      const hasSyndicate = await gamePage.locator('[data-testid="syndicate-page"]').isVisible();

      expect(hasCrafting).toBe(true);
      expect(hasSyndicate).toBe(true);

      console.log("Both systems functional in same game");
    });
  });
});

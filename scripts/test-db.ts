/**
 * CRUD Test Script for X-Imperium Database
 *
 * Run with: npx tsx scripts/test-db.ts
 *
 * Prerequisites:
 * 1. Set DATABASE_URL in .env.local
 * 2. Run `npm run db:push` to deploy schema
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { games, empires, sectors } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function testCRUD() {
  console.log("=== X-Imperium Database CRUD Test ===\n");

  try {
    // CREATE
    console.log("1. CREATE: Creating test game...");
    const [newGame] = await db
      .insert(games)
      .values({
        name: "Test Game - CRUD Verification",
        status: "setup",
        difficulty: "normal",
      })
      .returning();

    if (!newGame) {
      throw new Error("Failed to create game");
    }
    console.log(`   ✓ Created game: ${newGame.id}`);

    // READ
    console.log("\n2. READ: Reading game...");
    const readGame = await db.query.games.findFirst({
      where: eq(games.id, newGame.id),
    });

    if (!readGame) {
      throw new Error("Failed to read game");
    }
    console.log(`   ✓ Read game: "${readGame.name}"`);

    // UPDATE
    console.log("\n3. UPDATE: Updating game name...");
    await db
      .update(games)
      .set({ name: "Updated Test Game" })
      .where(eq(games.id, newGame.id));

    const updatedGame = await db.query.games.findFirst({
      where: eq(games.id, newGame.id),
    });

    if (!updatedGame || updatedGame.name !== "Updated Test Game") {
      throw new Error("Failed to update game");
    }
    console.log(`   ✓ Updated name to: "${updatedGame.name}"`);

    // DELETE
    console.log("\n4. DELETE: Deleting game...");
    await db.delete(games).where(eq(games.id, newGame.id));

    const deletedGame = await db.query.games.findFirst({
      where: eq(games.id, newGame.id),
    });

    if (deletedGame) {
      throw new Error("Failed to delete game");
    }
    console.log("   ✓ Game deleted successfully");

    console.log("\n=== All CRUD operations successful! ===");
    console.log("\n✓ Database connection works");
    console.log("✓ Can CRUD test records");
    console.log("\nMilestone 0 database criteria: PASSED");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ CRUD test failed:", error);
    process.exit(1);
  }
}

testCRUD();

/**
 * Database Cleanup Script
 * Clears all game data to fix stuck/corrupted games
 */

import "dotenv/config";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";

async function cleanupDatabase() {
  console.log("🧹 Starting database cleanup...");

  try {
    // Delete all games (cascades to all related tables)
    const result = await db.delete(games);
    console.log("✅ Successfully deleted all games");
    console.log("   All related data (empires, planets, etc.) also cleared via CASCADE");

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to cleanup database:", error);
    process.exit(1);
  }
}

cleanupDatabase();

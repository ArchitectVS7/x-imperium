/**
 * Database Statistics Script
 *
 * Shows current database usage and record counts.
 * Run with: npm run db:stats
 */

import { config } from "dotenv";
import { getDatabaseStatsAction } from "../src/app/actions/admin-actions";

// Load environment variables
config({ path: ".env.local" });

async function main() {
  console.log("📊 Fetching database statistics...\n");

  const result = await getDatabaseStatsAction();

  if (result.success && result.stats) {
    console.log("=".repeat(50));
    console.log("DATABASE STATISTICS");
    console.log("=".repeat(50));
    console.log(`Total Games:       ${result.stats.gameCount}`);
    console.log(`  Active:          ${result.stats.activeGames}`);
    console.log(`  Completed:       ${result.stats.completedGames}`);
    console.log(`Empires:           ${result.stats.empireCount}`);
    console.log(`Planets:           ${result.stats.planetCount}`);
    console.log(`Bot Memories:      ${result.stats.memoryCount}`);
    console.log(`Messages:          ${result.stats.messageCount}`);
    console.log(`Attacks:           ${result.stats.attackCount}`);
    console.log(`Combat Logs:       ${result.stats.combatLogCount}`);
    console.log("=".repeat(50));

    // Calculate approximate storage per game
    if (result.stats.gameCount > 0) {
      const recordsPerGame = Math.round(
        (result.stats.empireCount +
          result.stats.planetCount +
          result.stats.memoryCount +
          result.stats.messageCount +
          result.stats.attackCount +
          result.stats.combatLogCount) /
          result.stats.gameCount
      );
      console.log(`\nAvg Records/Game:  ~${recordsPerGame}`);
    }

    // Warnings
    if (result.stats.memoryCount > 10000) {
      console.log("\n⚠️  WARNING: Bot memories are high. Consider pruning old games.");
    }
    if (result.stats.combatLogCount > 5000) {
      console.log("\n⚠️  WARNING: Combat logs are high. Consider cleaning test data.");
    }
    if (result.stats.gameCount > 50) {
      console.log("\n⚠️  WARNING: Many games in database. Run 'npm run db:clean' to free space.");
    }

    console.log("\n💡 TIP: Run 'npm run db:clean' to remove all test data\n");
  } else {
    console.error(`❌ Failed to get database stats: ${result.error}`);
    process.exit(1);
  }
}

main();

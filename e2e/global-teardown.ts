/**
 * Global teardown for E2E tests
 * Cleans up all test data from the database after test suite completes
 */
import { config } from "dotenv";
import { deleteAllGamesAction } from "../src/app/actions/admin-actions";

// Load environment variables
config({ path: ".env.local" });

async function globalTeardown() {
  console.log("\n🧹 Cleaning up test data from database...");

  try {
    const result = await deleteAllGamesAction();

    if (result.success) {
      console.log(`✅ Successfully deleted ${result.deletedCount} test games and all related data`);
      console.log("💾 Database cleanup complete!");
    } else {
      console.error(`❌ Cleanup failed: ${result.error}`);
      // Don't fail the build if cleanup fails - just warn
      console.warn("⚠️  Warning: Test data may still be in database. Run 'npx tsx scripts/clear-db.ts' to clean manually.");
    }
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    console.warn("⚠️  Warning: Test data may still be in database. Run 'npx tsx scripts/clear-db.ts' to clean manually.");
  }
}

export default globalTeardown;

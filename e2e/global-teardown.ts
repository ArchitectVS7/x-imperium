/**
 * Global teardown for E2E tests
 * Cleans up all test data from the database after test suite completes
 */
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

// Set test admin secret for cleanup (matches playwright.config.ts webServer env)
process.env.ADMIN_SECRET = process.env.ADMIN_SECRET || "e2e-test-secret";

// Import after setting env
import { deleteAllGamesAction } from "../src/app/actions/admin-actions";

async function globalTeardown() {
  console.log("\nCleaning up test data from database...");

  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    console.error("Error: ADMIN_SECRET not available for cleanup");
    console.warn("Warning: Test data may still be in database. Run 'npx tsx scripts/clear-db.ts' to clean manually.");
    return;
  }

  try {
    const result = await deleteAllGamesAction(adminSecret);

    if (result.success) {
      console.log(`Successfully deleted ${result.deletedCount} test games and all related data`);
      console.log("Database cleanup complete!");
    } else {
      console.error(`Cleanup failed: ${result.error}`);
      // Don't fail the build if cleanup fails - just warn
      console.warn("Warning: Test data may still be in database. Run 'npx tsx scripts/clear-db.ts' to clean manually.");
    }
  } catch (error) {
    console.error("Error during cleanup:", error);
    console.warn("Warning: Test data may still be in database. Run 'npx tsx scripts/clear-db.ts' to clean manually.");
  }
}

export default globalTeardown;

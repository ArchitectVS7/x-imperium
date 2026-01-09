import { config } from "dotenv";
import { deleteAllGamesAction } from "../src/app/actions/admin-actions";

// Load .env.local
config({ path: ".env.local" });

async function main() {
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    console.error("Error: ADMIN_SECRET environment variable is not set.");
    console.error("Please set ADMIN_SECRET in your .env.local file.");
    process.exit(1);
  }

  console.log("Clearing database...");
  const result = await deleteAllGamesAction(adminSecret);

  if (result.success) {
    console.log(`Successfully deleted ${result.deletedCount} games and all related data`);
  } else {
    console.error(`Failed: ${result.error}`);
    process.exit(1);
  }
}

main();

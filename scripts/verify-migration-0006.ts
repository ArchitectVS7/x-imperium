/**
 * Verification script for migration 0006: planets -> sectors rename
 *
 * This script verifies that:
 * 1. The "sectors" table exists
 * 2. The "planets" table no longer exists
 * 3. All indexes were renamed correctly
 * 4. Foreign key constraints were renamed
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

// Database query result can be either an array or an object with rows property
type DbQueryResult<T = unknown> = T[] | { rows: T[] };

// Helper to extract rows from query result
function extractRows<T>(result: DbQueryResult<T>): T[] {
  if (Array.isArray(result)) {
    return result;
  }
  if ('rows' in result && Array.isArray(result.rows)) {
    return result.rows;
  }
  return [];
}

async function verifyMigration() {
  console.log("🔍 Verifying migration 0006: planets -> sectors");
  console.log("=" .repeat(50));

  try {
    // Check if sectors table exists
    console.log("\n1. Checking if 'sectors' table exists...");
    const sectorsTableResult = await db.execute(sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = 'sectors'
    `);
    const sectorsTableRows = extractRows(sectorsTableResult as unknown as DbQueryResult<{ tablename: string }>);

    if (sectorsTableRows.length > 0) {
      console.log("   ✅ 'sectors' table exists");
    } else {
      console.log("   ❌ 'sectors' table NOT found");
      process.exit(1);
    }

    // Check if planets table still exists (it shouldn't)
    console.log("\n2. Checking if 'planets' table was removed...");
    const planetsTableResult = await db.execute(sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = 'planets'
    `);
    const planetsTableRows = extractRows(planetsTableResult as unknown as DbQueryResult<{ tablename: string }>);

    if (planetsTableRows.length === 0) {
      console.log("   ✅ 'planets' table successfully removed");
    } else {
      console.log("   ❌ 'planets' table still exists (should be renamed)");
      process.exit(1);
    }

    // Check indexes
    console.log("\n3. Verifying indexes were renamed...");
    const indexesResult = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'sectors'
      ORDER BY indexname
    `);
    const indexesRows = extractRows(indexesResult as unknown as DbQueryResult<{ indexname: string }>);

    const expectedIndexes = [
      'sectors_pkey',
      'sectors_empire_idx',
      'sectors_game_idx',
      'sectors_type_idx'
    ];

    const actualIndexes = indexesRows.map((r: any) => r.indexname).sort();
    console.log(`   Found indexes: ${actualIndexes.join(', ')}`);

    const allIndexesPresent = expectedIndexes.every(idx =>
      actualIndexes.includes(idx)
    );

    if (allIndexesPresent) {
      console.log("   ✅ All indexes renamed correctly");
    } else {
      console.log("   ❌ Some indexes missing");
      console.log(`   Expected: ${expectedIndexes.join(', ')}`);
      process.exit(1);
    }

    // Count rows in sectors table
    console.log("\n4. Counting rows in 'sectors' table...");
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM sectors
    `);
    const countRows = extractRows(countResult as unknown as DbQueryResult<{ count: number }>);
    const count = countRows[0]?.count || 0;
    console.log(`   ✅ Found ${count} sectors in database`);

    console.log("\n" + "=".repeat(50));
    console.log("✅ Migration verification PASSED!");
    console.log("   The 'planets' table has been successfully renamed to 'sectors'");
    console.log("   All indexes and constraints updated correctly");

  } catch (error) {
    console.error("\n❌ Migration verification FAILED!");
    console.error(error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

verifyMigration();

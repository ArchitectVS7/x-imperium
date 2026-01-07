import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { sectors } from "../src/lib/db/schema";
import { eq, count } from "drizzle-orm";

async function testQueries() {
  console.log("Testing database queries after migration...\n");

  try {
    // Test 1: Query using new 'sectors' table
    console.log("1. Testing query with 'sectors' table:");
    const sectorCount = await db.select({ count: count() }).from(sectors);
    console.log(`   ✅ Found ${sectorCount[0]?.count || 0} sectors`);

    // Test 2: Query a specific sector
    console.log("\n2. Testing detailed sector query:");
    const firstSector = await db.select().from(sectors).limit(1);
    if (firstSector[0]) {
      console.log(`   ✅ Retrieved sector: ${firstSector[0].id}`);
      console.log(`      Type: ${firstSector[0].type}`);
      console.log(`      Empire ID: ${firstSector[0].empireId || 'unowned'}`);
    }

    // Test 3: Query with where clause
    console.log("\n3. Testing filtered query:");
    const ownedSectors = await db
      .select({ count: count() })
      .from(sectors)
      .where(eq(sectors.empireId, firstSector[0]?.empireId || ''));
    console.log(`   ✅ Found ${ownedSectors[0]?.count || 0} sectors for empire`);

    console.log("\n" + "=".repeat(50));
    console.log("✅ All database queries passed!");
    console.log("   Schema migration completed successfully");
    console.log("   All 'sector' terminology functioning correctly");

  } catch (error) {
    console.error("\n❌ Database query test FAILED!");
    console.error(error);
    process.exit(1);
  }
}

testQueries().then(() => process.exit(0));

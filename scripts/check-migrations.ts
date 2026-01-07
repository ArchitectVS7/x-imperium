import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

type DbQueryResult<T = unknown> = T[] | { rows: T[] };

function extractRows<T>(result: DbQueryResult<T>): T[] {
  if (Array.isArray(result)) return result;
  if ('rows' in result && Array.isArray(result.rows)) return result.rows;
  return [];
}

async function checkMigrations() {
  const result = await db.execute(sql`
    SELECT * FROM drizzle.__drizzle_migrations
    ORDER BY created_at
  `);

  const rows = extractRows(result as DbQueryResult<any>);
  console.log("Applied migrations:");
  rows.forEach((row) => {
    console.log(`  ${row.id} - ${row.hash} - ${row.created_at}`);
  });
  console.log(`\nTotal: ${rows.length} migrations applied`);
}

checkMigrations().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

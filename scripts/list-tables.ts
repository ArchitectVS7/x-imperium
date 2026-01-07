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

async function listTables() {
  const result = await db.execute(sql`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  const rows = extractRows(result as unknown as DbQueryResult<{ tablename: string }>);
  console.log("Tables in database:");
  rows.forEach((row) => console.log(`  - ${row.tablename}`));
}

listTables().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

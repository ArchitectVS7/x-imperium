import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";

type DbQueryResult<T = unknown> = T[] | { rows: T[] };

function extractRows<T>(result: DbQueryResult<T>): T[] {
  if (Array.isArray(result)) return result;
  if ('rows' in result && Array.isArray(result.rows)) return result.rows;
  return [];
}

async function applyMigrations() {
  // Check which migrations have been applied
  const result = await db.execute(sql`
    SELECT id FROM drizzle.__drizzle_migrations ORDER BY id
  `);
  const applied = extractRows(result as DbQueryResult<{ id: number }>).map(r => r.id);
  console.log(`Applied migrations: ${applied.join(', ')}`);

  // Migrations to apply
  const migrations = [
    { id: 4, file: '0004_add_game_configs.sql', timestamp: 1735928400000 },
    { id: 5, file: '0005_add_composite_indexes.sql', timestamp: 1736211600000 },
    { id: 6, file: '0006_rename_planets_to_sectors.sql', timestamp: 1736212800000 },
  ];

  for (const migration of migrations) {
    if (applied.includes(migration.id)) {
      console.log(`\nSkipping migration ${migration.id} (already applied)`);
      continue;
    }

    console.log(`\nApplying migration ${migration.id}: ${migration.file}`);

    // Read the SQL file
    const sqlPath = join(process.cwd(), 'drizzle', 'migrations', migration.file);
    const sqlContent = readFileSync(sqlPath, 'utf-8');

    try {
      // Apply the migration
      await db.execute(sql.raw(sqlContent));

      // Record it in the migrations table
      await db.execute(sql`
        INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at)
        VALUES (${migration.id}, ${migration.file.replace('.sql', '')}, ${migration.timestamp})
      `);

      console.log(`  ✅ Migration ${migration.id} applied successfully`);
    } catch (error) {
      console.error(`  ❌ Failed to apply migration ${migration.id}:`);
      console.error(error);
      process.exit(1);
    }
  }

  console.log('\n✅ All pending migrations applied successfully');
}

applyMigrations().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

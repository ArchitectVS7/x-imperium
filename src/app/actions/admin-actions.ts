"use server";

import { db } from "@/lib/db";
import {
  games,
  botMemories,
  performanceLogs,
} from "@/lib/db/schema";
import { eq, lt, and, or, sql } from "drizzle-orm";

// =============================================================================
// SECURITY: Admin Authentication
// =============================================================================

/**
 * Verify admin access using environment variable.
 *
 * For alpha: Uses ADMIN_SECRET env var
 * For production: Should implement proper role-based access control
 *
 * Set ADMIN_SECRET in your .env.local file to enable admin functions.
 */
function verifyAdminAccess(): { authorized: boolean; error?: string } {
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return {
      authorized: false,
      error: "Admin functions are disabled. Set ADMIN_SECRET environment variable to enable.",
    };
  }

  // In production, this should verify:
  // 1. User session/authentication
  // 2. User has admin role in database
  // 3. Optional: Require re-authentication for destructive operations

  return { authorized: true };
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface TableRow {
  table_name: string;
}

interface GameStatsRow {
  total: number;
  active: number;
  completed: number;
}

interface CountRow {
  count: number;
  total?: number;
}

// Database query result can be either an array or an object with rows property
type DbQueryResult<T = unknown> = T[] | { rows: T[] };

/**
 * Check which tables actually exist in the database.
 * Useful for diagnosing migration issues.
 */
export async function checkDatabaseTablesAction(): Promise<{
  success: boolean;
  tables?: string[];
  error?: string;
}> {
  const authCheck = verifyAdminAccess();
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  try {
    const result = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log("Check tables result:", JSON.stringify(result, null, 2));

    // Handle different possible result formats
    let rows: TableRow[] = [];
    const typedResult = result as unknown as DbQueryResult<TableRow>;
    if (Array.isArray(typedResult)) {
      rows = typedResult;
    } else if ('rows' in typedResult && Array.isArray(typedResult.rows)) {
      rows = typedResult.rows;
    }

    const tables = rows.map((row) => row.table_name);

    return {
      success: true,
      tables,
    };
  } catch (error) {
    console.error("Failed to check database tables:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Clean up old games to free up database space.
 * Deletes games that are:
 * - Completed or abandoned
 * - OR older than 7 days and inactive
 *
 * Due to cascade deletes, this also removes all related:
 * - empires, planets, attacks, combat logs
 * - messages, treaties, bot memories
 * - market orders, research progress, etc.
 */
export async function cleanupOldGamesAction(): Promise<{
  success: boolean;
  deletedCount: number;
  error?: string;
}> {
  const authCheck = verifyAdminAccess();
  if (!authCheck.authorized) {
    return { success: false, deletedCount: 0, error: authCheck.error };
  }

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find games to delete
    const gamesToDelete = await db.query.games.findMany({
      where: or(
        // Completed or abandoned games
        eq(games.status, "completed"),
        eq(games.status, "abandoned"),
        // Old inactive games (setup status and older than 7 days)
        and(eq(games.status, "setup"), lt(games.createdAt, sevenDaysAgo)),
        // Old active games (older than 7 days with no recent activity)
        and(lt(games.updatedAt, sevenDaysAgo))
      ),
      columns: { id: true, name: true, status: true },
    });

    if (gamesToDelete.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    // Delete games (cascade will handle related records)
    for (const game of gamesToDelete) {
      await db.delete(games).where(eq(games.id, game.id));
    }

    return {
      success: true,
      deletedCount: gamesToDelete.length,
    };
  } catch (error) {
    console.error("Failed to cleanup old games:", error);
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get detailed database storage statistics.
 */
export async function getDatabaseStatsAction(): Promise<{
  success: boolean;
  stats?: {
    gameCount: number;
    empireCount: number;
    activeGames: number;
    completedGames: number;
    planetCount: number;
    memoryCount: number;
    messageCount: number;
    attackCount: number;
    combatLogCount: number;
  };
  error?: string;
}> {
  const authCheck = verifyAdminAccess();
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  try {
    // Helper to safely get count from result
    const getCount = (result: DbQueryResult<CountRow>): number => {
      if (!result) return 0;
      // Try rows array first
      if (Array.isArray(result)) {
        return Number(result[0]?.total ?? 0);
      }
      if ('rows' in result && Array.isArray(result.rows)) {
        return Number(result.rows[0]?.total ?? 0);
      }
      return 0;
    };

    const getGameStats = (result: DbQueryResult<GameStatsRow>): GameStatsRow => {
      if (!result) return { total: 0, active: 0, completed: 0 };
      // Try rows array first
      if (Array.isArray(result)) {
        return result[0] ?? { total: 0, active: 0, completed: 0 };
      }
      if ('rows' in result && Array.isArray(result.rows)) {
        return result.rows[0] ?? { total: 0, active: 0, completed: 0 };
      }
      return { total: 0, active: 0, completed: 0 };
    };

    // Use raw SQL to be more resilient to missing tables
    const gameStatsResult = await db.execute(sql`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'active')::int as active,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed
      FROM games
    `);
    const gameStats = getGameStats(gameStatsResult as unknown as DbQueryResult<GameStatsRow>);

    const empireStatsResult = await db.execute(sql`SELECT COUNT(*)::int as total FROM empires`) as unknown as DbQueryResult<CountRow>;
    const planetStatsResult = await db.execute(sql`SELECT COUNT(*)::int as total FROM planets`) as unknown as DbQueryResult<CountRow>;
    const memoryStatsResult = await db.execute(sql`SELECT COUNT(*)::int as total FROM bot_memories`) as unknown as DbQueryResult<CountRow>;
    const messageStatsResult = await db.execute(sql`SELECT COUNT(*)::int as total FROM messages`) as unknown as DbQueryResult<CountRow>;
    const attackStatsResult = await db.execute(sql`SELECT COUNT(*)::int as total FROM attacks`) as unknown as DbQueryResult<CountRow>;
    const combatLogStatsResult = await db.execute(sql`SELECT COUNT(*)::int as total FROM combat_logs`) as unknown as DbQueryResult<CountRow>;

    return {
      success: true,
      stats: {
        gameCount: Number(gameStats?.total ?? 0),
        empireCount: getCount(empireStatsResult),
        activeGames: Number(gameStats?.active ?? 0),
        completedGames: Number(gameStats?.completed ?? 0),
        planetCount: getCount(planetStatsResult),
        memoryCount: getCount(memoryStatsResult),
        messageCount: getCount(messageStatsResult),
        attackCount: getCount(attackStatsResult),
        combatLogCount: getCount(combatLogStatsResult),
      },
    };
  } catch (error) {
    console.error("Failed to get database stats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete ALL games using TRUNCATE CASCADE for efficiency.
 * WARNING: This deletes everything instantly!
 */
export async function deleteAllGamesAction(): Promise<{
  success: boolean;
  deletedCount: number;
  error?: string;
}> {
  const authCheck = verifyAdminAccess();
  if (!authCheck.authorized) {
    return { success: false, deletedCount: 0, error: authCheck.error };
  }

  try {
    // Count games before deletion
    const countResult = await db.execute(sql`SELECT COUNT(*)::int as count FROM games`) as unknown as DbQueryResult<CountRow>;
    const gameCount = Array.isArray(countResult)
      ? Number((countResult[0])?.count ?? 0)
      : Number((countResult.rows[0])?.count ?? 0);

    console.log("Games before truncate:", gameCount);

    // Use raw SQL TRUNCATE CASCADE for efficiency
    await db.execute(sql`TRUNCATE games CASCADE`);
    console.log("TRUNCATE games CASCADE executed");

    // Also clean up performance logs
    await db.execute(sql`TRUNCATE performance_logs CASCADE`);
    console.log("TRUNCATE performance_logs CASCADE executed");

    // Verify it worked
    const verifyResult = await db.execute(sql`SELECT COUNT(*)::int as count FROM games`) as unknown as DbQueryResult<CountRow>;
    const remainingGames = Array.isArray(verifyResult)
      ? Number((verifyResult[0])?.count ?? 0)
      : Number((verifyResult.rows[0])?.count ?? 0);

    console.log("Games after truncate:", remainingGames);

    if (remainingGames > 0) {
      return {
        success: false,
        deletedCount: 0,
        error: `TRUNCATE failed! Still ${remainingGames} games in database.`,
      };
    }

    return {
      success: true,
      deletedCount: gameCount,
    };
  } catch (error) {
    console.error("Failed to delete all games:", error);
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Nuclear option: TRUNCATE all major tables individually.
 * Use this if CASCADE isn't working as expected.
 *
 * SECURITY NOTE: This function uses sql.raw() for table names, which is safe because:
 * 1. Table names come from the hardcoded `tablesToTruncate` array below (NOT user input)
 * 2. No external input is interpolated into the SQL query
 * 3. This is an admin-only function for database maintenance
 *
 * Do NOT modify this pattern to accept dynamic table names from user input.
 */
export async function truncateAllTablesAction(): Promise<{
  success: boolean;
  tablesCleared: string[];
  error?: string;
}> {
  const authCheck = verifyAdminAccess();
  if (!authCheck.authorized) {
    return { success: false, tablesCleared: [], error: authCheck.error };
  }

  try {
    // Order matters! Truncate child tables before parents to avoid FK constraint issues
    // SECURITY: These are hardcoded table names - NOT user input
    const tablesToTruncate = [
      // Child tables first (have foreign keys to other tables)
      "bot_memories",
      "bot_emotional_states",
      "attacks",
      "combat_logs",
      "messages",
      "treaties",
      "build_queue",
      "reputation_log",
      "unit_upgrades",
      "research_branch_allocations",
      "resource_inventory",
      "crafting_queue",
      "covert_operations",
      "research_progress",
      "market_orders",
      "planets",
      // Then parent tables
      "empires",
      "market_prices",
      "galactic_events",
      "coalitions",
      "syndicate_contracts",
      "performance_logs",
      "games", // Games last since everything references it
    ];

    const succeeded: string[] = [];
    const failed: string[] = [];

    console.log("Starting nuclear cleanup - truncating all tables...");

    for (const table of tablesToTruncate) {
      try {
        console.log(`Truncating ${table}...`);

        // Try TRUNCATE first
        try {
          await db.execute(sql.raw(`TRUNCATE TABLE ${table} CASCADE`));
        } catch (truncateErr) {
          console.warn(`TRUNCATE failed for ${table}, trying DELETE...`, truncateErr);
          // If TRUNCATE fails, use DELETE (slower but more reliable)
          await db.execute(sql.raw(`DELETE FROM ${table}`));
        }

        // Verify it worked
        const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`)) as unknown as DbQueryResult<CountRow>;
        const count = Array.isArray(countResult)
          ? Number((countResult[0])?.count ?? 0)
          : Number((countResult.rows[0])?.count ?? 0);

        if (count === 0) {
          console.log(`✓ ${table} cleared`);
          succeeded.push(table);
        } else {
          console.warn(`✗ ${table} still has ${count} rows after cleanup`);
          failed.push(table);
        }
      } catch (err) {
        console.error(`Failed to clear ${table}:`, err);
        failed.push(table);
      }
    }

    if (failed.length > 0) {
      return {
        success: false,
        tablesCleared: succeeded,
        error: `Failed to clear ${failed.length} tables: ${failed.join(", ")}. Check console logs.`,
      };
    }

    console.log(`✓ Successfully cleared all ${succeeded.length} tables`);
    return {
      success: true,
      tablesCleared: succeeded,
    };
  } catch (error) {
    console.error("Failed to truncate all tables:", error);
    return {
      success: false,
      tablesCleared: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Prune bot memories to free up space without deleting games.
 * Useful when the memory table is the main bloat.
 */
export async function pruneAllMemoriesAction(): Promise<{
  success: boolean;
  deletedCount: number;
  error?: string;
}> {
  const authCheck = verifyAdminAccess();
  if (!authCheck.authorized) {
    return { success: false, deletedCount: 0, error: authCheck.error };
  }

  try {
    // Count memories before deletion
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(botMemories);
    const memoryCount = Number(countResult?.count ?? 0);

    // Delete all non-permanent-scar memories
    await db.execute(
      sql`DELETE FROM bot_memories WHERE is_permanent_scar = false`
    );

    // Count remaining
    const [afterCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(botMemories);
    const remaining = Number(afterCount?.count ?? 0);

    return {
      success: true,
      deletedCount: memoryCount - remaining,
    };
  } catch (error) {
    console.error("Failed to prune memories:", error);
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Prune performance logs older than 24 hours.
 */
export async function prunePerformanceLogsAction(): Promise<{
  success: boolean;
  deletedCount: number;
  error?: string;
}> {
  const authCheck = verifyAdminAccess();
  if (!authCheck.authorized) {
    return { success: false, deletedCount: 0, error: authCheck.error };
  }

  try {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Count logs before deletion
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(performanceLogs);
    const totalCount = Number(countResult?.count ?? 0);

    // Delete old logs
    await db
      .delete(performanceLogs)
      .where(lt(performanceLogs.createdAt, oneDayAgo));

    // Count remaining
    const [afterCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(performanceLogs);
    const remaining = Number(afterCount?.count ?? 0);

    return {
      success: true,
      deletedCount: totalCount - remaining,
    };
  } catch (error) {
    console.error("Failed to prune performance logs:", error);
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

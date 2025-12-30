"use server";

import { db } from "@/lib/db";
import {
  games,
  botMemories,
  performanceLogs,
} from "@/lib/db/schema";
import { eq, lt, and, or, sql } from "drizzle-orm";

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

/**
 * Check which tables actually exist in the database.
 * Useful for diagnosing migration issues.
 */
export async function checkDatabaseTablesAction(): Promise<{
  success: boolean;
  tables?: string[];
  error?: string;
}> {
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
    if (result && typeof result === 'object') {
      // Try direct rows property
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ('rows' in result && Array.isArray((result as any).rows)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rows = (result as any).rows;
      }
      // Try if result itself is an array
      else if (Array.isArray(result)) {
        rows = result as unknown as TableRow[];
      }
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
  try {
    // Helper to safely get count from result
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getCount = (result: any): number => {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getGameStats = (result: any): GameStatsRow => {
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
    const gameStats = getGameStats(gameStatsResult);

    const empireStatsResult = await db.execute(sql`SELECT COUNT(*)::int as total FROM empires`);
    const planetStatsResult = await db.execute(sql`SELECT COUNT(*)::int as total FROM planets`);
    const memoryStatsResult = await db.execute(sql`SELECT COUNT(*)::int as total FROM bot_memories`);
    const messageStatsResult = await db.execute(sql`SELECT COUNT(*)::int as total FROM messages`);
    const attackStatsResult = await db.execute(sql`SELECT COUNT(*)::int as total FROM attacks`);
    const combatLogStatsResult = await db.execute(sql`SELECT COUNT(*)::int as total FROM combat_logs`);

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
  try {
    // Count games before deletion
    const countResult = await db.execute(sql`SELECT COUNT(*)::int as count FROM games`);
    const gameCount = Array.isArray(countResult)
      ? Number((countResult[0] as CountRow | undefined)?.count ?? 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : Number(((countResult as any).rows?.[0] as CountRow | undefined)?.count ?? 0);

    console.log("Games before truncate:", gameCount);

    // Use raw SQL TRUNCATE CASCADE for efficiency
    await db.execute(sql`TRUNCATE games CASCADE`);
    console.log("TRUNCATE games CASCADE executed");

    // Also clean up performance logs
    await db.execute(sql`TRUNCATE performance_logs CASCADE`);
    console.log("TRUNCATE performance_logs CASCADE executed");

    // Verify it worked
    const verifyResult = await db.execute(sql`SELECT COUNT(*)::int as count FROM games`);
    const remainingGames = Array.isArray(verifyResult)
      ? Number((verifyResult[0] as CountRow | undefined)?.count ?? 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : Number(((verifyResult as any).rows?.[0] as CountRow | undefined)?.count ?? 0);

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
 */
export async function truncateAllTablesAction(): Promise<{
  success: boolean;
  tablesCleared: string[];
  error?: string;
}> {
  try {
    const tablesToTruncate = [
      "games",
      "empires",
      "planets",
      "research_progress",
      "market_prices",
      "market_orders",
      "attacks",
      "combat_logs",
      "messages",
      "treaties",
      "bot_memories",
      "bot_emotional_states",
      "build_queue",
      "reputation_log",
      "unit_upgrades",
      "research_branch_allocations",
      "performance_logs",
      "resource_inventory",
      "crafting_queue",
      "syndicate_contracts",
      "galactic_events",
      "coalitions",
      "covert_operations",
    ];

    const succeeded: string[] = [];
    const failed: string[] = [];

    for (const table of tablesToTruncate) {
      try {
        console.log(`Truncating ${table}...`);
        await db.execute(sql.raw(`TRUNCATE TABLE ${table} CASCADE`));

        // Verify it worked
        const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
        const count = Array.isArray(countResult)
          ? Number((countResult[0] as CountRow | undefined)?.count ?? 0)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          : Number(((countResult as any).rows?.[0] as CountRow | undefined)?.count ?? 0);

        if (count === 0) {
          console.log(`✓ ${table} cleared`);
          succeeded.push(table);
        } else {
          console.warn(`✗ ${table} still has ${count} rows`);
          failed.push(table);
        }
      } catch (err) {
        console.warn(`Failed to truncate ${table}:`, err);
        failed.push(table);
      }
    }

    if (failed.length > 0) {
      return {
        success: false,
        tablesCleared: succeeded,
        error: `Failed to clear ${failed.length} tables: ${failed.join(", ")}`,
      };
    }

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

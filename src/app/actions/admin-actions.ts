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
  total: number;
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

    const tables = (result as unknown as { rows: TableRow[] }).rows.map((row) => row.table_name);

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
    // Use raw SQL to be more resilient to missing tables
    const gameStatsResult = await db.execute(sql`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'active')::int as active,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed
      FROM games
    `);
    const gameStats = (gameStatsResult as unknown as { rows: GameStatsRow[] }).rows[0];

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
        empireCount: Number(((empireStatsResult as unknown as { rows: CountRow[] }).rows[0])?.total ?? 0),
        activeGames: Number(gameStats?.active ?? 0),
        completedGames: Number(gameStats?.completed ?? 0),
        planetCount: Number(((planetStatsResult as unknown as { rows: CountRow[] }).rows[0])?.total ?? 0),
        memoryCount: Number(((memoryStatsResult as unknown as { rows: CountRow[] }).rows[0])?.total ?? 0),
        messageCount: Number(((messageStatsResult as unknown as { rows: CountRow[] }).rows[0])?.total ?? 0),
        attackCount: Number(((attackStatsResult as unknown as { rows: CountRow[] }).rows[0])?.total ?? 0),
        combatLogCount: Number(((combatLogStatsResult as unknown as { rows: CountRow[] }).rows[0])?.total ?? 0),
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
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(games);
    const gameCount = Number(countResult?.count ?? 0);

    // Use raw SQL TRUNCATE CASCADE for efficiency
    // This is much faster than deleting row by row
    await db.execute(sql`TRUNCATE games CASCADE`);

    // Also clean up performance logs (not cascade-deleted)
    await db.execute(sql`TRUNCATE performance_logs CASCADE`);

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

    for (const table of tablesToTruncate) {
      try {
        await db.execute(sql.raw(`TRUNCATE ${table} CASCADE`));
      } catch (err) {
        console.warn(`Failed to truncate ${table}:`, err);
      }
    }

    return {
      success: true,
      tablesCleared: tablesToTruncate,
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

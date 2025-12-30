"use server";

import { db } from "@/lib/db";
import {
  games,
  empires,
  planets,
  botMemories,
  messages,
  attacks,
  combatLogs,
  performanceLogs,
} from "@/lib/db/schema";
import { eq, lt, and, or, sql } from "drizzle-orm";

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
    // Get game counts
    const [gameStats] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where status = 'active')`,
        completed: sql<number>`count(*) filter (where status = 'completed')`,
      })
      .from(games);

    // Get record counts for major tables
    const [empireStats] = await db
      .select({ total: sql<number>`count(*)` })
      .from(empires);
    const [planetStats] = await db
      .select({ total: sql<number>`count(*)` })
      .from(planets);
    const [memoryStats] = await db
      .select({ total: sql<number>`count(*)` })
      .from(botMemories);
    const [messageStats] = await db
      .select({ total: sql<number>`count(*)` })
      .from(messages);
    const [attackStats] = await db
      .select({ total: sql<number>`count(*)` })
      .from(attacks);
    const [combatLogStats] = await db
      .select({ total: sql<number>`count(*)` })
      .from(combatLogs);

    return {
      success: true,
      stats: {
        gameCount: Number(gameStats?.total ?? 0),
        empireCount: Number(empireStats?.total ?? 0),
        activeGames: Number(gameStats?.active ?? 0),
        completedGames: Number(gameStats?.completed ?? 0),
        planetCount: Number(planetStats?.total ?? 0),
        memoryCount: Number(memoryStats?.total ?? 0),
        messageCount: Number(messageStats?.total ?? 0),
        attackCount: Number(attackStats?.total ?? 0),
        combatLogCount: Number(combatLogStats?.total ?? 0),
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
    await db.execute(sql`TRUNCATE performance_logs`);

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

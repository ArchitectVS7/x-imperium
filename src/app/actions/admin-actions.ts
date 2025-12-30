"use server";

import { db } from "@/lib/db";
import { games, empires } from "@/lib/db/schema";
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
        and(
          eq(games.status, "setup"),
          lt(games.createdAt, sevenDaysAgo)
        ),
        // Old active games (older than 7 days with no recent activity)
        and(
          lt(games.updatedAt, sevenDaysAgo)
        )
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
 * Get database storage statistics.
 */
export async function getDatabaseStatsAction(): Promise<{
  success: boolean;
  stats?: {
    gameCount: number;
    empireCount: number;
    activeGames: number;
    completedGames: number;
  };
  error?: string;
}> {
  try {
    const [gameStats] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where status = 'active')`,
        completed: sql<number>`count(*) filter (where status = 'completed')`,
      })
      .from(games);

    const [empireStats] = await db
      .select({
        total: sql<number>`count(*)`,
      })
      .from(empires);

    return {
      success: true,
      stats: {
        gameCount: Number(gameStats?.total ?? 0),
        empireCount: Number(empireStats?.total ?? 0),
        activeGames: Number(gameStats?.active ?? 0),
        completedGames: Number(gameStats?.completed ?? 0),
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
 * Delete ALL games - nuclear option for testing/development.
 * WARNING: This deletes everything!
 */
export async function deleteAllGamesAction(): Promise<{
  success: boolean;
  deletedCount: number;
  error?: string;
}> {
  try {
    const allGames = await db.query.games.findMany({
      columns: { id: true },
    });

    for (const game of allGames) {
      await db.delete(games).where(eq(games.id, game.id));
    }

    return {
      success: true,
      deletedCount: allGames.length,
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

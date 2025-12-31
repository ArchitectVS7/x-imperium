"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { games, empires } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  getCurrentSession,
  getSessionSummary,
  type SessionSummary,
} from "@/lib/game/services/session-service";

// =============================================================================
// TYPES
// =============================================================================

export interface EmpireRanking {
  id: string;
  name: string;
  emperorName: string | null;
  networth: number;
  planetCount: number;
  isPlayer: boolean;
  isEliminated: boolean;
}

export interface SessionData {
  summary: SessionSummary;
  empireRankings: EmpireRanking[];
  currentTurn: number;
  gameId: string;
}

// =============================================================================
// COOKIE HELPERS
// =============================================================================

async function getGameCookies(): Promise<{
  gameId: string | undefined;
  empireId: string | undefined;
}> {
  const cookieStore = await cookies();
  return {
    gameId: cookieStore.get("gameId")?.value,
    empireId: cookieStore.get("empireId")?.value,
  };
}

// =============================================================================
// SESSION DATA ACTION
// =============================================================================

/**
 * Get session summary data including statistics and empire rankings.
 */
export async function getSessionDataAction(): Promise<SessionData | null> {
  const { gameId, empireId } = await getGameCookies();

  if (!gameId || !empireId) {
    return null;
  }

  try {
    // Get current session
    const session = await getCurrentSession(gameId);
    if (!session) {
      return null;
    }

    // Get session summary
    const summary = getSessionSummary(session);

    // Get game data
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });

    if (!game) {
      return null;
    }

    // Get all empires ranked by networth (top 10)
    const allEmpires = await db.query.empires.findMany({
      where: eq(empires.gameId, gameId),
      orderBy: [desc(empires.networth)],
      limit: 10,
    });

    const empireRankings: EmpireRanking[] = allEmpires.map((empire) => ({
      id: empire.id,
      name: empire.name,
      emperorName: empire.emperorName,
      networth: Number(empire.networth),
      planetCount: empire.planetCount,
      isPlayer: empire.type === "player",
      isEliminated: empire.isEliminated,
    }));

    return {
      summary,
      empireRankings,
      currentTurn: game.currentTurn,
      gameId,
    };
  } catch (error) {
    console.error("Failed to get session data:", error);
    return null;
  }
}

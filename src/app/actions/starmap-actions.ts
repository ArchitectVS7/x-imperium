"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { games, empires, treaties } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { EmpireMapData, TreatyConnection } from "@/components/game/starmap/types";

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
// STARMAP DATA
// =============================================================================

export interface StarmapData {
  empires: EmpireMapData[];
  playerEmpireId: string;
  currentTurn: number;
  protectionTurns: number;
  treaties: TreatyConnection[];
}

/**
 * Fetch starmap data for the current game.
 * Returns all empires in the game for visualization.
 */
export async function getStarmapDataAction(): Promise<StarmapData | null> {
  const { gameId, empireId } = await getGameCookies();

  if (!gameId || !empireId) {
    return null;
  }

  try {
    // Fetch game info
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });

    if (!game) {
      return null;
    }

    // Fetch all empires in the game
    const allEmpires = await db.query.empires.findMany({
      where: eq(empires.gameId, gameId),
    });

    // Fetch active treaties in the game
    const activeTreaties = await db.query.treaties.findMany({
      where: and(eq(treaties.gameId, gameId), eq(treaties.status, "active")),
    });

    // Map to EmpireMapData
    const empireData: EmpireMapData[] = allEmpires.map((empire) => ({
      id: empire.id,
      name: empire.name,
      type: empire.type as "player" | "bot",
      planetCount: empire.planetCount,
      networth: empire.networth,
      isEliminated: empire.isEliminated,
    }));

    // Map to TreatyConnection
    const treatyData: TreatyConnection[] = activeTreaties.map((treaty) => ({
      empire1Id: treaty.proposerId,
      empire2Id: treaty.recipientId,
      type: treaty.treatyType as "alliance" | "nap",
    }));

    return {
      empires: empireData,
      playerEmpireId: empireId,
      currentTurn: game.currentTurn,
      protectionTurns: game.protectionTurns,
      treaties: treatyData,
    };
  } catch (error) {
    console.error("Failed to fetch starmap data:", error);
    return null;
  }
}

/**
 * Get all empires for the current game.
 */
export async function getAllEmpiresAction(): Promise<EmpireMapData[]> {
  const { gameId } = await getGameCookies();

  if (!gameId) {
    return [];
  }

  try {
    const allEmpires = await db.query.empires.findMany({
      where: eq(empires.gameId, gameId),
    });

    return allEmpires.map((empire) => ({
      id: empire.id,
      name: empire.name,
      type: empire.type as "player" | "bot",
      planetCount: empire.planetCount,
      networth: empire.networth,
      isEliminated: empire.isEliminated,
    }));
  } catch (error) {
    console.error("Failed to fetch empires:", error);
    return [];
  }
}

"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  assessThreats,
  type ThreatAssessmentResult,
} from "@/lib/game/services/military/threat-service";

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
// THREAT ASSESSMENT ACTION
// =============================================================================

/**
 * Get threat assessment for the current player.
 */
export async function getThreatAssessmentAction(): Promise<ThreatAssessmentResult | null> {
  const { gameId, empireId } = await getGameCookies();

  if (!gameId || !empireId) {
    return null;
  }

  try {
    // Get current turn
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });

    if (!game) {
      return null;
    }

    return await assessThreats(gameId, empireId, game.currentTurn);
  } catch (error) {
    console.error("Failed to get threat assessment:", error);
    return null;
  }
}

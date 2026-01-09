"use server";

import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  assessThreats,
  type ThreatAssessmentResult,
} from "@/lib/game/services/military/threat-service";
import { getGameSession } from "@/lib/session";

// =============================================================================
// THREAT ASSESSMENT ACTION
// =============================================================================

/**
 * Get threat assessment for the current player.
 */
export async function getThreatAssessmentAction(): Promise<ThreatAssessmentResult | null> {
  const { gameId, empireId } = await getGameSession();

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

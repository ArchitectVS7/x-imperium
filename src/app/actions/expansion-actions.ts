"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getExpansionOptions,
  type ExpansionOptionsResult,
} from "@/lib/game/services/geography/expansion-service";

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
// EXPANSION OPTIONS ACTION
// =============================================================================

/**
 * Get expansion options for the current player.
 */
export async function getExpansionOptionsAction(): Promise<ExpansionOptionsResult | null> {
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

    return await getExpansionOptions(gameId, empireId, game.currentTurn);
  } catch (error) {
    console.error("Failed to get expansion options:", error);
    return null;
  }
}

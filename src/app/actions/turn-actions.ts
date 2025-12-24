"use server";

/**
 * Turn Server Actions
 *
 * Server actions for turn processing, accessible from the game dashboard.
 * Handles end turn requests and turn status queries.
 */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { processTurn } from "@/lib/game/services/turn-processor";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { TurnActionResult, TurnStatus, TurnEvent } from "@/lib/game/types/turn-types";

// Cookie names (must match game-actions.ts)
const GAME_ID_COOKIE = "gameId";

// =============================================================================
// END TURN ACTION
// =============================================================================

/**
 * Process the end of a turn
 *
 * Called when the player clicks the "END TURN" button.
 * Processes all phases for all empires and returns the result.
 *
 * @returns TurnActionResult with success/failure status
 */
export async function endTurnAction(): Promise<TurnActionResult> {
  try {
    // Get current game ID from cookies
    const cookieStore = await cookies();
    const gameId = cookieStore.get(GAME_ID_COOKIE)?.value;

    if (!gameId) {
      return {
        success: false,
        error: "No active game found. Please start a new game.",
      };
    }

    // Verify game exists and is active
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });

    if (!game) {
      return {
        success: false,
        error: "Game not found. Please start a new game.",
      };
    }

    if (game.status !== "active") {
      return {
        success: false,
        error: `Cannot process turn: game is ${game.status}`,
      };
    }

    // Check turn limit (allow processing up to and including the final turn)
    if (game.currentTurn > game.turnLimit) {
      return {
        success: false,
        error: `Game has ended. Turn ${game.turnLimit} was the final turn.`,
      };
    }

    // Process the turn
    const result = await processTurn(gameId);

    if (!result.success) {
      return {
        success: false,
        error: result.error ?? "Turn processing failed",
      };
    }

    // Revalidate the game dashboard to show updated data
    revalidatePath("/game");

    // Extract player events (assuming single player for now)
    const firstEmpire = result.empireResults[0];
    const playerEvents: TurnEvent[] = firstEmpire?.events ?? [];

    return {
      success: true,
      data: {
        turn: result.turn,
        processingMs: result.processingMs,
        events: playerEvents,
      },
    };
  } catch (error) {
    console.error("End turn action failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

// =============================================================================
// TURN STATUS ACTION
// =============================================================================

/**
 * Get current turn status
 *
 * Returns information about the current turn state.
 *
 * @returns TurnStatus with current turn info
 */
export async function getTurnStatusAction(): Promise<TurnStatus | null> {
  try {
    const cookieStore = await cookies();
    const gameId = cookieStore.get(GAME_ID_COOKIE)?.value;

    if (!gameId) {
      return null;
    }

    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });

    if (!game) {
      return null;
    }

    return {
      currentTurn: game.currentTurn,
      turnLimit: game.turnLimit,
      isProcessing: false, // Would need state management for real processing indicator
      lastProcessingMs: game.lastTurnProcessingMs,
    };
  } catch (error) {
    console.error("Get turn status failed:", error);
    return null;
  }
}

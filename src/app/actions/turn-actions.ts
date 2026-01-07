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
import { games, empires, messages } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { TurnActionResult, TurnStatus, TurnEvent, ResourceDelta } from "@/lib/game/types/turn-types";
import { GAME_SETTINGS } from "@/lib/game/constants";
import { verifyEmpireOwnership } from "@/lib/security/validation";
import { checkRateLimit } from "@/lib/security/rate-limiter";

// Cookie names (must match game-actions.ts)
const GAME_ID_COOKIE = "gameId";
const EMPIRE_ID_COOKIE = "empireId";

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
    // Get current game ID and empire ID from cookies
    const cookieStore = await cookies();
    const gameId = cookieStore.get(GAME_ID_COOKIE)?.value;
    const empireId = cookieStore.get(EMPIRE_ID_COOKIE)?.value;

    if (!gameId || !empireId) {
      return {
        success: false,
        error: "No active game found. Please start a new game.",
      };
    }

    // Verify empire ownership
    const ownership = await verifyEmpireOwnership(empireId, gameId);
    if (!ownership.valid) {
      return {
        success: false,
        error: ownership.error ?? "Authorization failed",
      };
    }

    // Check rate limit
    const rateLimit = checkRateLimit(empireId, "GAME_ACTION");
    if (!rateLimit.allowed) {
      const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return {
        success: false,
        error: `Rate limit exceeded. Please wait ${waitSeconds} seconds before ending turn again.`,
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

    // M12: Trigger async pre-computation for next turn's LLM decisions
    // This runs in the background while the player plans their next move
    const nextTurn = result.turn + 1;
    if (nextTurn <= game.turnLimit) {
      import("@/lib/llm/pre-compute")
        .then(({ preComputeNextTurnDecisions }) => {
          return preComputeNextTurnDecisions(gameId, nextTurn);
        })
        .then((precomputeResult) => {
          console.log(
            `[M12 Pre-Compute] Completed for turn ${nextTurn}:`,
            precomputeResult
          );
        })
        .catch((error) => {
          console.warn("[M12 Pre-Compute] Failed (non-critical):", error);
        });
    }

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

// =============================================================================
// TURN ORDER PANEL STATUS
// =============================================================================

export type FoodStatus = "surplus" | "stable" | "deficit" | "critical";
export type ArmyStrength = "strong" | "moderate" | "weak" | "critical";

export interface TurnOrderPanelData {
  currentTurn: number;
  turnLimit: number;
  foodStatus: FoodStatus;
  armyStrength: ArmyStrength;
  threatCount: number;
  unreadMessages: number;
  protectionTurnsLeft: number;
}

/**
 * Get data needed for the TurnOrderPanel sidebar
 */
export async function getTurnOrderPanelDataAction(): Promise<TurnOrderPanelData | null> {
  try {
    const cookieStore = await cookies();
    const gameId = cookieStore.get(GAME_ID_COOKIE)?.value;
    const empireId = cookieStore.get("empireId")?.value;

    if (!gameId || !empireId) {
      return null;
    }

    // Get game and player empire with sectors
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });

    if (!game) return null;

    const playerEmpire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
      with: {
        sectors: true,
      },
    });

    if (!playerEmpire) return null;

    // Calculate food status
    const foodPlanets = playerEmpire.sectors.filter(p => p.type === "food").length;
    const foodProduction = foodPlanets * 160; // PLANET_PRODUCTION.food
    const foodConsumption = playerEmpire.population * 0.05;
    const foodBalance = foodProduction - foodConsumption;

    let foodStatus: FoodStatus = "stable";
    if (foodBalance > foodConsumption * 0.5) {
      foodStatus = "surplus";
    } else if (foodBalance < 0) {
      foodStatus = foodBalance < -foodConsumption * 0.5 ? "critical" : "deficit";
    }

    // Calculate army strength (simplified - based on total military power)
    const totalMilitary =
      playerEmpire.soldiers +
      playerEmpire.fighters * 3 +
      (playerEmpire.stations ?? 0) * 50 +
      (playerEmpire.lightCruisers ?? 0) * 10 +
      (playerEmpire.heavyCruisers ?? 0) * 25 +
      (playerEmpire.carriers ?? 0) * 12;

    // Get average bot military power for comparison
    const botEmpires = await db.query.empires.findMany({
      where: and(
        eq(empires.gameId, gameId),
        eq(empires.type, "bot")
      ),
    });

    const avgBotPower = botEmpires.reduce((sum, bot) => {
      return sum + bot.soldiers + bot.fighters * 3 +
        (bot.stations ?? 0) * 50 +
        (bot.lightCruisers ?? 0) * 10 +
        (bot.heavyCruisers ?? 0) * 25 +
        (bot.carriers ?? 0) * 12;
    }, 0) / (botEmpires.length || 1);

    let armyStrength: ArmyStrength = "moderate";
    if (totalMilitary > avgBotPower * 1.5) {
      armyStrength = "strong";
    } else if (totalMilitary < avgBotPower * 0.5) {
      armyStrength = totalMilitary < avgBotPower * 0.25 ? "critical" : "weak";
    }

    // Count threats (bots stronger than player)
    const threatCount = botEmpires.filter(bot => {
      const botPower = bot.soldiers + bot.fighters * 3 +
        (bot.stations ?? 0) * 50 +
        (bot.lightCruisers ?? 0) * 10 +
        (bot.heavyCruisers ?? 0) * 25 +
        (bot.carriers ?? 0) * 12;
      return botPower > totalMilitary * 1.2;
    }).length;

    // Count unread messages
    const unreadCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.recipientId, empireId),
          eq(messages.isRead, false)
        )
      );

    const unreadMessages = Number(unreadCount[0]?.count ?? 0);

    // Calculate protection turns left
    const protectionTurnsLeft = Math.max(0, GAME_SETTINGS.protectionTurns - game.currentTurn + 1);

    return {
      currentTurn: game.currentTurn,
      turnLimit: game.turnLimit,
      foodStatus,
      armyStrength,
      threatCount,
      unreadMessages,
      protectionTurnsLeft,
    };
  } catch (error) {
    console.error("Get turn order panel data failed:", error);
    return null;
  }
}

// =============================================================================
// GAME LAYOUT DATA (combined for header, sidebar, and status bar)
// =============================================================================

export interface GameLayoutData extends TurnOrderPanelData {
  // Resources for header/status bar
  credits: number;
  food: number;
  ore: number;
  petroleum: number;
  researchPoints: number;
  // Empire stats
  population: number;
  sectorCount: number;
  militaryPower: number;
  networth: number;
  rank: number;
  civilStatus: string;
}

/**
 * Get all data needed for the game layout (header + sidebar + status bar)
 */
export async function getGameLayoutDataAction(): Promise<GameLayoutData | null> {
  try {
    const cookieStore = await cookies();
    const gameId = cookieStore.get(GAME_ID_COOKIE)?.value;
    const empireId = cookieStore.get("empireId")?.value;

    if (!gameId || !empireId) {
      return null;
    }

    // Get game
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });

    if (!game) return null;

    // Get player empire with sectors
    const playerEmpire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
      with: {
        sectors: true,
      },
    });

    if (!playerEmpire) return null;

    // Calculate food status
    const foodPlanets = playerEmpire.sectors.filter(p => p.type === "food").length;
    const foodProduction = foodPlanets * 160;
    const foodConsumption = playerEmpire.population * 0.05;
    const foodBalance = foodProduction - foodConsumption;

    let foodStatus: FoodStatus = "stable";
    if (foodBalance > foodConsumption * 0.5) {
      foodStatus = "surplus";
    } else if (foodBalance < 0) {
      foodStatus = foodBalance < -foodConsumption * 0.5 ? "critical" : "deficit";
    }

    // Calculate military power
    const militaryPower =
      playerEmpire.soldiers +
      playerEmpire.fighters * 3 +
      (playerEmpire.stations ?? 0) * 50 +
      (playerEmpire.lightCruisers ?? 0) * 10 +
      (playerEmpire.heavyCruisers ?? 0) * 25 +
      (playerEmpire.carriers ?? 0) * 12;

    // PERFORMANCE: Get all empires once instead of separate queries for bots and rank calculation
    const allEmpires = await db.query.empires.findMany({
      where: eq(empires.gameId, gameId),
      columns: {
        id: true,
        type: true,
        networth: true,
        soldiers: true,
        fighters: true,
        stations: true,
        lightCruisers: true,
        heavyCruisers: true,
        carriers: true,
      },
    });

    // Filter bot empires for military comparison
    const botEmpires = allEmpires.filter(e => e.type === "bot");

    // Calculate army strength relative to bots
    const avgBotPower = botEmpires.reduce((sum, bot) => {
      return sum + bot.soldiers + bot.fighters * 3 +
        (bot.stations ?? 0) * 50 +
        (bot.lightCruisers ?? 0) * 10 +
        (bot.heavyCruisers ?? 0) * 25 +
        (bot.carriers ?? 0) * 12;
    }, 0) / (botEmpires.length || 1);

    let armyStrength: ArmyStrength = "moderate";
    if (militaryPower > avgBotPower * 1.5) {
      armyStrength = "strong";
    } else if (militaryPower < avgBotPower * 0.5) {
      armyStrength = militaryPower < avgBotPower * 0.25 ? "critical" : "weak";
    }

    // Count threats
    const threatCount = botEmpires.filter(bot => {
      const botPower = bot.soldiers + bot.fighters * 3 +
        (bot.stations ?? 0) * 50 +
        (bot.lightCruisers ?? 0) * 10 +
        (bot.heavyCruisers ?? 0) * 25 +
        (bot.carriers ?? 0) * 12;
      return botPower > militaryPower * 1.2;
    }).length;

    // Count unread messages
    const unreadCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.recipientId, empireId),
          eq(messages.isRead, false)
        )
      );
    const unreadMessages = Number(unreadCount[0]?.count ?? 0);

    // Calculate rank (by networth) using the same empire data
    const sortedByNetworth = allEmpires.sort((a, b) => b.networth - a.networth);
    const rank = sortedByNetworth.findIndex(e => e.id === empireId) + 1;

    const protectionTurnsLeft = Math.max(0, GAME_SETTINGS.protectionTurns - game.currentTurn + 1);

    return {
      // Turn order panel data
      currentTurn: game.currentTurn,
      turnLimit: game.turnLimit,
      foodStatus,
      armyStrength,
      threatCount,
      unreadMessages,
      protectionTurnsLeft,
      // Resources
      credits: playerEmpire.credits,
      food: playerEmpire.food,
      ore: playerEmpire.ore,
      petroleum: playerEmpire.petroleum,
      researchPoints: playerEmpire.researchPoints,
      // Empire stats
      population: playerEmpire.population,
      sectorCount: playerEmpire.sectors.length,
      militaryPower,
      networth: playerEmpire.networth,
      rank,
      civilStatus: playerEmpire.civilStatus,
    };
  } catch (error) {
    console.error("Get game layout data failed:", error);
    return null;
  }
}

// =============================================================================
// ENHANCED END TURN (with full result for modal)
// =============================================================================

export interface EnhancedTurnResult {
  success: true;
  turn: number;
  processingMs: number;
  resourceChanges: ResourceDelta;
  populationBefore: number;
  populationAfter: number;
  events: TurnEvent[];
  messagesReceived: number;
  botBattles: number;
  empiresEliminated: string[];
  victoryResult?: {
    type: string;
    message: string;
  };
}

export type EnhancedTurnActionResult =
  | EnhancedTurnResult
  | { success: false; error: string };

/**
 * Enhanced end turn action that returns full data for the turn summary modal
 */
export async function endTurnEnhancedAction(): Promise<EnhancedTurnActionResult> {
  try {
    const cookieStore = await cookies();
    const gameId = cookieStore.get(GAME_ID_COOKIE)?.value;
    const empireId = cookieStore.get("empireId")?.value;

    if (!gameId || !empireId) {
      return { success: false, error: "No active game found" };
    }

    // Get population before turn
    const empireBefore = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (!empireBefore) {
      return { success: false, error: "Empire not found" };
    }

    const populationBefore = empireBefore.population;

    // Process the turn
    const result = await processTurn(gameId);

    if (!result.success) {
      return { success: false, error: result.error ?? "Turn processing failed" };
    }

    // Find player's result
    const playerResult = result.empireResults.find(r => r.empireId === empireId);

    // Get messages received this turn
    const turnMessages = await db.query.messages.findMany({
      where: and(
        eq(messages.recipientId, empireId),
        eq(messages.turn, result.turn)
      ),
    });

    // Count bot battles (from global events mentioning "battle" or "attack")
    const botBattles = result.globalEvents.filter(
      e => e.message.toLowerCase().includes("battle") ||
           e.message.toLowerCase().includes("attack")
    ).length;

    // Find eliminated empires
    const eliminatedEmpires = result.empireResults
      .filter(r => !r.isAlive && r.empireId !== empireId)
      .map(r => r.empireName);

    // Get updated population
    const empireAfter = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    // Revalidate paths
    revalidatePath("/game");

    return {
      success: true,
      turn: result.turn,
      processingMs: result.processingMs,
      resourceChanges: playerResult?.resourceChanges ?? {
        credits: 0,
        food: 0,
        ore: 0,
        petroleum: 0,
        researchPoints: 0,
      },
      populationBefore,
      populationAfter: empireAfter?.population ?? populationBefore,
      events: playerResult?.events ?? [],
      messagesReceived: turnMessages.length,
      botBattles,
      empiresEliminated: eliminatedEmpires,
      victoryResult: result.victoryResult ? {
        type: result.victoryResult.type,
        message: result.victoryResult.message,
      } : undefined,
    };
  } catch (error) {
    console.error("Enhanced end turn failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Turn processing failed",
    };
  }
}

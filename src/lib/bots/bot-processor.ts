/**
 * Bot Processor
 *
 * Orchestrates parallel processing of all bot decisions each turn.
 * Uses Promise.all for concurrent execution with performance tracking.
 *
 * M5: Base bot processing
 * M9: Archetype-based decisions
 * M10: Emotional state integration
 *
 * Performance target: <1.5s for 25 bots
 */

import { db } from "@/lib/db";
import { games, type Empire, type Planet } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { perfLogger } from "@/lib/performance/logger";
import type {
  BotDecisionContext,
  BotProcessingResult,
  BotTurnResult,
  Difficulty,
  EmpireTarget,
} from "./types";
import { generateBotDecision } from "./decision-engine";
import { executeBotDecision } from "./bot-actions";
import { applyNightmareBonus } from "./difficulty";
// M10: Emotional state imports
import {
  getEmotionalStateWithGrudges,
  processEmotionalEventForBot,
  applyEmotionalDecay,
} from "@/lib/game/repositories/bot-emotional-state-repository";
import { getPermanentGrudges } from "@/lib/game/repositories/bot-memory-repository";
import type { EmotionalStateName, GameEventType } from "./emotions";

// =============================================================================
// BOT TURN PROCESSING
// =============================================================================

/**
 * Process all bot decisions for a turn in parallel.
 * Uses Promise.all for concurrent execution.
 *
 * @param gameId - Game to process
 * @param currentTurn - Current turn number
 * @returns Results for all bot processing
 */
export async function processBotTurn(
  gameId: string,
  currentTurn: number
): Promise<BotTurnResult> {
  const startTime = performance.now();

  try {
    // Load game with all empires and their planets
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
      with: {
        empires: {
          with: {
            planets: true,
          },
        },
      },
    });

    if (!game) {
      return createErrorResult(gameId, currentTurn, startTime, "Game not found");
    }

    // Filter to active bot empires (not eliminated)
    const botEmpires = game.empires.filter(
      (e) => e.type === "bot" && !e.isEliminated
    );

    if (botEmpires.length === 0) {
      return {
        gameId,
        turn: currentTurn,
        botResults: [],
        totalDurationMs: Math.round(performance.now() - startTime),
        success: true,
      };
    }

    // Build target list for attack decisions
    const allEmpires = game.empires.filter((e) => !e.isEliminated);
    const targetList = buildTargetList(allEmpires);

    // Get game settings
    const difficulty = (game.difficulty as Difficulty) ?? "normal";
    const protectionTurns = game.protectionTurns ?? 20;

    // Process all bots in parallel
    const results = await Promise.all(
      botEmpires.map((bot) =>
        processSingleBot(bot, bot.planets, {
          gameId,
          currentTurn,
          protectionTurns,
          difficulty,
          targetList,
        })
      )
    );

    const totalDurationMs = Math.round(performance.now() - startTime);

    // Log performance
    await perfLogger.log({
      operation: "bot_processing",
      durationMs: totalDurationMs,
      gameId,
      metadata: {
        turn: currentTurn,
        botCount: botEmpires.length,
        successCount: results.filter((r) => r.executed).length,
      },
    });

    return {
      gameId,
      turn: currentTurn,
      botResults: results,
      totalDurationMs,
      success: true,
    };
  } catch (error) {
    console.error("Bot processing failed:", error);
    return createErrorResult(
      gameId,
      currentTurn,
      startTime,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

// =============================================================================
// SINGLE BOT PROCESSING
// =============================================================================

interface ProcessingContext {
  gameId: string;
  currentTurn: number;
  protectionTurns: number;
  difficulty: Difficulty;
  targetList: EmpireTarget[];
}

/**
 * Process a single bot's turn.
 * M5: Generates decision and executes it
 * M10: Loads emotional state, applies to decisions, updates based on outcome
 */
async function processSingleBot(
  empire: Empire,
  empirePlanets: Planet[],
  context: ProcessingContext
): Promise<BotProcessingResult> {
  const startTime = performance.now();

  try {
    // M10: Load emotional state and grudges
    let emotionalState: { state: EmotionalStateName | "neutral"; intensity: number } | undefined;
    let permanentGrudges: string[] | undefined;

    try {
      const emotionData = await getEmotionalStateWithGrudges(empire.id, context.gameId);
      emotionalState = {
        state: emotionData.state as EmotionalStateName | "neutral",
        intensity: parseFloat(emotionData.intensity),
      };
      permanentGrudges = emotionData.permanentGrudges;
    } catch {
      // If emotional state doesn't exist yet, continue without it
      emotionalState = undefined;
      permanentGrudges = undefined;
    }

    // Build decision context with emotional state
    const decisionContext: BotDecisionContext = {
      empire,
      planets: empirePlanets,
      gameId: context.gameId,
      currentTurn: context.currentTurn,
      protectionTurns: context.protectionTurns,
      difficulty: context.difficulty,
      availableTargets: context.targetList.filter((t) => t.id !== empire.id),
      emotionalState,
      permanentGrudges,
    };

    // Generate decision
    const decision = generateBotDecision(decisionContext);

    // Execute decision
    const result = await executeBotDecision(decision, decisionContext);

    // M10: Process emotional event based on decision outcome
    try {
      await processEmotionalOutcome(
        empire.id,
        context.gameId,
        context.currentTurn,
        decision,
        result.success
      );
    } catch {
      // Emotional update failure shouldn't break bot processing
    }

    return {
      empireId: empire.id,
      empireName: empire.name,
      decision,
      executed: result.success,
      error: result.error,
      durationMs: Math.round(performance.now() - startTime),
    };
  } catch (error) {
    return {
      empireId: empire.id,
      empireName: empire.name,
      decision: { type: "do_nothing" },
      executed: false,
      error: error instanceof Error ? error.message : "Unknown error",
      durationMs: Math.round(performance.now() - startTime),
    };
  }
}

/**
 * M10: Process emotional outcome based on bot's decision result.
 * Updates emotional state based on what happened.
 */
async function processEmotionalOutcome(
  empireId: string,
  gameId: string,
  currentTurn: number,
  decision: { type: string; action?: string; targetId?: string },
  success: boolean
): Promise<void> {
  // Map decision types to emotional events
  let event: GameEventType | null = null;

  switch (decision.type) {
    case "attack":
      // Will be updated more accurately when combat results come in
      // For now, just planning an attack gives slight confidence
      if (success) {
        event = "battle_won"; // Optimistic - actual result comes from combat
      }
      break;

    case "diplomacy":
      if (success) {
        if (decision.action === "propose_alliance") {
          event = "alliance_formed";
        } else {
          event = "treaty_offered";
        }
      } else {
        event = "treaty_rejected";
      }
      break;

    case "trade":
      if (success) {
        event = "trade_success";
      }
      break;

    case "buy_planet":
      if (success) {
        // Economic expansion gives slight confidence boost
        event = "economic_boom";
      } else {
        event = "resource_shortage";
      }
      break;

    // Other decision types don't trigger emotional events directly
  }

  if (event) {
    await processEmotionalEventForBot(
      empireId,
      gameId,
      event,
      currentTurn
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build a list of potential attack targets.
 */
function buildTargetList(allEmpires: Empire[]): EmpireTarget[] {
  return allEmpires.map((e) => ({
    id: e.id,
    name: e.name,
    networth: e.networth,
    planetCount: e.planetCount,
    isBot: e.type === "bot",
    isEliminated: e.isEliminated,
    militaryPower: calculateMilitaryPower(e),
  }));
}

/**
 * Calculate a simple military power estimate for targeting.
 */
function calculateMilitaryPower(empire: Empire): number {
  return (
    empire.soldiers +
    empire.fighters * 3 +
    empire.lightCruisers * 5 +
    empire.heavyCruisers * 8 +
    empire.carriers * 12 +
    empire.stations * 50
  );
}

/**
 * Create an error result for the bot turn.
 */
function createErrorResult(
  gameId: string,
  turn: number,
  startTime: number,
  error: string
): BotTurnResult {
  return {
    gameId,
    turn,
    botResults: [],
    totalDurationMs: Math.round(performance.now() - startTime),
    success: false,
    error,
  };
}

// =============================================================================
// NIGHTMARE BONUS APPLICATION
// =============================================================================

/**
 * Apply nightmare difficulty bonus to bot resource production.
 * Called during turn processing for nightmare mode.
 *
 * @param empire - Bot empire to apply bonus to
 * @param difficulty - Current difficulty level
 * @returns Modified resource values
 */
export function applyBotNightmareBonus(
  credits: number,
  difficulty: Difficulty
): number {
  if (difficulty !== "nightmare") {
    return credits;
  }
  return applyNightmareBonus(credits, difficulty);
}

// =============================================================================
// BOT STATISTICS
// =============================================================================

/**
 * Get statistics about bot processing performance.
 */
export interface BotProcessingStats {
  totalBots: number;
  activeBots: number;
  eliminatedBots: number;
  avgDecisionTimeMs: number;
}

/**
 * Calculate bot processing statistics from results.
 */
export function calculateBotStats(results: BotProcessingResult[]): BotProcessingStats {
  if (results.length === 0) {
    return {
      totalBots: 0,
      activeBots: 0,
      eliminatedBots: 0,
      avgDecisionTimeMs: 0,
    };
  }

  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);
  const executed = results.filter((r) => r.executed);

  return {
    totalBots: results.length,
    activeBots: executed.length,
    eliminatedBots: results.length - executed.length,
    avgDecisionTimeMs: Math.round(totalDuration / results.length),
  };
}

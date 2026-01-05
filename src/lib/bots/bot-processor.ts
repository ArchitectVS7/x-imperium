/**
 * Bot Processor
 *
 * Orchestrates bot decision processing each turn with weak-first initiative.
 *
 * M5: Base bot processing
 * M9: Archetype-based decisions
 * M10: Emotional state integration
 * M4: Weak-first initiative (attacks sorted by networth ascending)
 *
 * Turn Order:
 * 1. Generate all decisions in parallel (for speed)
 * 2. Execute non-attack decisions in parallel
 * 3. Execute attack decisions sequentially, weakest empire first
 *
 * Weak-first initiative prevents stronger empires from always striking first,
 * giving weaker empires a chance to react before being eliminated.
 *
 * Performance target: <1.5s for 25 bots
 */

import { db } from "@/lib/db";
import { games, botTells, type Empire, type Planet } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { perfLogger } from "@/lib/performance/logger";
import type {
  BotDecision,
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
} from "@/lib/game/repositories/bot-emotional-state-repository";
// Note: applyEmotionalDecay is called in turn-processor.ts Phase 5.5
// Note: getPermanentGrudges is passed via BotDecisionContext.permanentGrudges
import type { EmotionalStateName, GameEventType } from "./emotions";
// M9: Tell system imports
import { triggerThreatWarning, type TriggerContext, type BotInfo } from "@/lib/messages";
// Tell generation system (PRD 7.10)
import { generateTellsForTurn, type TellGenerationContext } from "@/lib/tells";
import type { ArchetypeName } from "./archetypes/types";

// =============================================================================
// BOT TURN PROCESSING
// =============================================================================

/**
 * Process all bot decisions for a turn with weak-first initiative.
 *
 * Implementation:
 * 1. Generate all decisions in parallel (for speed)
 * 2. Execute non-attack decisions in parallel
 * 3. Sort attack decisions by empire networth (ascending - weakest first)
 * 4. Execute attack decisions sequentially in weak-first order
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

    // ==========================================================================
    // M4: WEAK-FIRST INITIATIVE
    // ==========================================================================
    // Step 1: Generate all decisions in parallel (for speed)
    const decisionResults = await Promise.all(
      botEmpires.map((bot) =>
        generateBotDecisionWithContext(bot, bot.planets, {
          gameId,
          currentTurn,
          protectionTurns,
          difficulty,
          targetList,
        })
      )
    );

    // ==========================================================================
    // PRD 7.10: TELL GENERATION
    // ==========================================================================
    // Generate and store tells for each bot based on their decisions
    const tellInserts: Array<typeof botTells.$inferInsert> = [];

    for (const result of decisionResults) {
      if (!result.bot.botArchetype) continue;

      const tellContext: TellGenerationContext = {
        archetype: result.bot.botArchetype as ArchetypeName,
        currentTurn,
        emotionalState: result.context.emotionalState,
      };

      // Generate tells for this bot's decision
      const tellResults = generateTellsForTurn(
        [result.decision],
        result.bot.id,
        gameId,
        tellContext
      );

      // Collect tells for batch insert
      for (const tellResult of tellResults) {
        if (tellResult.generated && tellResult.tell) {
          const tell = tellResult.tell;
          tellInserts.push({
            gameId: tell.gameId,
            empireId: tell.empireId,
            targetEmpireId: tell.targetEmpireId ?? null,
            tellType: tell.tellType,
            isBluff: tell.isBluff,
            trueIntention: tell.trueIntention ?? null,
            confidence: tell.confidence.toFixed(2),
            createdAtTurn: tell.createdAtTurn,
            expiresAtTurn: tell.expiresAtTurn,
          });
        }
      }
    }

    // Batch insert all tells
    if (tellInserts.length > 0) {
      try {
        await db.insert(botTells).values(tellInserts);
      } catch (error) {
        // Tell generation failure shouldn't break bot processing
        console.error("Failed to insert bot tells:", error);
      }
    }

    // Step 2: Separate attack vs non-attack decisions
    const attackDecisions: Array<{
      bot: Empire;
      planets: Planet[];
      decision: BotDecision;
      context: BotDecisionContext;
      networth: number;
    }> = [];
    const nonAttackDecisions: Array<{
      bot: Empire;
      planets: Planet[];
      decision: BotDecision;
      context: BotDecisionContext;
    }> = [];

    for (const result of decisionResults) {
      if (result.decision.type === "attack") {
        attackDecisions.push({
          ...result,
          networth: result.bot.networth,
        });
      } else {
        nonAttackDecisions.push(result);
      }
    }

    // Step 3: Execute non-attack decisions in parallel (they don't conflict)
    const nonAttackResults = await Promise.all(
      nonAttackDecisions.map(({ bot, decision, context }) =>
        executeAndRecordDecision(bot, decision, context)
      )
    );

    // Step 4: Sort attack decisions by networth ascending (weakest first)
    attackDecisions.sort((a, b) => a.networth - b.networth);

    // Step 5: Execute attack decisions sequentially in weak-first order
    const attackResults: BotProcessingResult[] = [];
    for (const { bot, decision, context } of attackDecisions) {
      const result = await executeAndRecordDecision(bot, decision, context);
      attackResults.push(result);
    }

    // Combine all results
    const results = [...nonAttackResults, ...attackResults];

    const totalDurationMs = Math.round(performance.now() - startTime);

    // M9: Trigger threat warnings for attack decisions against player (tell system)
    const playerEmpire = game.empires.find((e) => e.type === "player");
    if (playerEmpire) {
      const triggerCtx: TriggerContext = {
        gameId,
        currentTurn,
        playerId: playerEmpire.id,
        playerEmpireName: playerEmpire.name,
      };

      // Check each bot result for attacks against the player
      for (const result of results) {
        if (
          result.executed &&
          result.decision.type === "attack" &&
          "targetId" in result.decision &&
          result.decision.targetId === playerEmpire.id
        ) {
          // Find the bot empire to get archetype info
          const bot = botEmpires.find((b) => b.id === result.empireId);
          if (bot && bot.botArchetype) {
            const botInfo: BotInfo = {
              id: bot.id,
              name: bot.name,
              personaId: `${bot.id.slice(0, 8)}-persona`, // Fallback if no persona
              archetype: bot.botArchetype as BotInfo["archetype"],
            };
            // Trigger threat warning (internally checks archetype tell rate)
            await triggerThreatWarning(triggerCtx, botInfo).catch(() => {
              // Don't fail bot processing if threat warning fails
            });
          }
        }
      }
    }

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
// WEAK-FIRST INITIATIVE HELPERS (M4)
// =============================================================================

interface ProcessingContext {
  gameId: string;
  currentTurn: number;
  protectionTurns: number;
  difficulty: Difficulty;
  targetList: EmpireTarget[];
}

/**
 * Generate a bot decision and return it with context.
 * Used in the first phase of weak-first initiative to collect all decisions.
 */
async function generateBotDecisionWithContext(
  empire: Empire,
  empirePlanets: Planet[],
  context: ProcessingContext
): Promise<{
  bot: Empire;
  planets: Planet[];
  decision: BotDecision;
  context: BotDecisionContext;
}> {
  // Load emotional state and grudges
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

  // Build decision context
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

  // Generate decision (M12: Route Tier 1 LLM bots to LLM decision engine)
  let decision: BotDecision;

  if (empire.botTier === "tier1_llm" && empire.llmEnabled) {
    // Tier 1: Use LLM-powered decision (with cache + fallback)
    const { generateTier1Decision } = await import("./decision-engine");
    decision = await generateTier1Decision(decisionContext);
  } else {
    // Tier 2-4: Use scripted decision
    decision = generateBotDecision(decisionContext);
  }

  return {
    bot: empire,
    planets: empirePlanets,
    decision,
    context: decisionContext,
  };
}

/**
 * Execute a bot decision and record the result.
 * Used after decisions are sorted for weak-first initiative.
 */
async function executeAndRecordDecision(
  empire: Empire,
  decision: BotDecision,
  decisionContext: BotDecisionContext
): Promise<BotProcessingResult> {
  const startTime = performance.now();

  try {
    // Execute decision
    const result = await executeBotDecision(decision, decisionContext);

    // Process emotional event based on decision outcome
    try {
      await processEmotionalOutcome(
        empire.id,
        decisionContext.gameId,
        decisionContext.currentTurn,
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

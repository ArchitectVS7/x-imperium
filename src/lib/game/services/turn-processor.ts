/**
 * Turn Processor Service
 *
 * Orchestrates the 6-phase turn processing pipeline for all empires in a game.
 * Handles resource production, population mechanics, civil status, and maintenance.
 *
 * PRD References:
 * - PRD 3: Turn Processing Order
 * - Performance target: <500ms per turn (no bots)
 *
 * Turn Processing Order:
 * 1. Income collection (with civil status multiplier)
 * 2. Population update (growth/starvation)
 * 3. Civil status evaluation
 * 4. Market processing (stub for M3)
 * 5. Bot decisions (stub for M3)
 * 6. Actions (stub for M3)
 * 7. Maintenance (applied in Phase 1 via resource engine)
 * 8. Victory check (stub for M6)
 */

import { db } from "@/lib/db";
import { games, empires, type Empire, type Planet } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type {
  TurnResult,
  EmpireResult,
  TurnEvent,
  ResourceDelta,
  CivilStatusUpdate,
} from "../types/turn-types";
import type { CivilStatusLevel } from "../constants";
import { getIncomeMultiplier, evaluateCivilStatus, logStatusChange, type CivilStatusEvent } from "./civil-status";
import { processPopulation } from "./population";
import { processTurnResources, calculateMaintenanceCost } from "./resource-engine";
import { processBuildQueue } from "./build-queue-service";
import { calculateUnitMaintenance, type UnitCounts } from "./unit-service";
import { processResearchProduction } from "./research-service";
import { perfLogger } from "@/lib/performance/logger";
import { processBotTurn, applyBotNightmareBonus } from "@/lib/bots";
import type { Difficulty } from "@/lib/bots/types";
import {
  checkVictoryConditions,
  getConsecutiveRevoltingTurns,
  calculateRevoltConsequences,
  applyRevoltConsequences,
  completeGame,
  checkStalemateWarning,
} from "./victory-service";
import { createAutoSave } from "./save-service";
import { processCovertPointGeneration } from "./covert-service";
import { updateMarketPrices } from "@/lib/market";
import {
  triggerCasualMessages,
  triggerRandomBroadcast,
  triggerEndgame,
  type TriggerContext,
} from "@/lib/messages";

// =============================================================================
// TURN PROCESSOR
// =============================================================================

/**
 * Process a single turn for a game
 *
 * Orchestrates all 8 phases of turn processing for each empire.
 * Returns comprehensive results including performance metrics.
 *
 * @param gameId - Game UUID to process
 * @returns TurnResult with all empire results and global events
 *
 * @example
 * const result = await processTurn('game-uuid');
 * if (result.success) {
 *   console.log(`Turn ${result.turn} completed in ${result.processingMs}ms`);
 * }
 */
export async function processTurn(gameId: string): Promise<TurnResult> {
  const startTime = performance.now();
  const globalEvents: TurnEvent[] = [];
  const empireResults: EmpireResult[] = [];

  try {
    // Load game with all empires and planets
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
      return createErrorResult(gameId, 0, startTime, "Game not found");
    }

    if (game.status !== "active") {
      return createErrorResult(gameId, game.currentTurn, startTime, `Game is not active (status: ${game.status})`);
    }

    // Validate game state
    if (game.empires.length === 0) {
      return createErrorResult(gameId, game.currentTurn, startTime, "No empires in game");
    }

    if (game.currentTurn > game.turnLimit) {
      return createErrorResult(gameId, game.currentTurn, startTime, "Game has reached turn limit");
    }

    const currentTurn = game.currentTurn;
    const nextTurn = currentTurn + 1;

    // Process each empire
    for (const empire of game.empires) {
      try {
        const empireResult = await processEmpireTurn(
          empire,
          empire.planets,
          gameId,
          nextTurn,
          game.difficulty as Difficulty
        );
        empireResults.push(empireResult);
      } catch (error) {
        // Log error but continue processing other empires
        console.error(`Error processing empire ${empire.id}:`, error);
        empireResults.push(createErrorEmpireResult(empire, error));
      }
    }

    // ==========================================================================
    // PHASE 5: BOT DECISIONS (M5)
    // ==========================================================================

    // Process bot decisions in parallel after all empires have their resources updated
    const botResults = await processBotTurn(gameId, nextTurn);
    if (botResults.success && botResults.botResults.length > 0) {
      const executedCount = botResults.botResults.filter(r => r.executed).length;
      globalEvents.push({
        type: "other",
        message: `${executedCount}/${botResults.botResults.length} bots made decisions (${botResults.totalDurationMs}ms)`,
        severity: "info",
      });
    }

    // ==========================================================================
    // PHASE 6: MARKET PRICE UPDATE (M7)
    // ==========================================================================

    // Update market prices based on supply/demand from trades this turn
    await updateMarketPrices(gameId, nextTurn);

    // ==========================================================================
    // PHASE 7: BOT MESSAGES (M8)
    // ==========================================================================

    // Find player empire for message context
    const playerEmpire = game.empires.find((e) => e.type === "player");
    if (playerEmpire) {
      const msgCtx: TriggerContext = {
        gameId,
        currentTurn: nextTurn,
        playerId: playerEmpire.id,
        playerEmpireName: playerEmpire.name,
      };

      // Trigger casual messages (low chance per bot)
      const casualCount = await triggerCasualMessages(msgCtx);
      if (casualCount > 0) {
        globalEvents.push({
          type: "other",
          message: `Received ${casualCount} message${casualCount > 1 ? "s" : ""} from other empires`,
          severity: "info",
        });
      }

      // Trigger random broadcast (Galactic News)
      await triggerRandomBroadcast(msgCtx);

      // Trigger endgame messages in final turns (turn 180+)
      if (nextTurn >= 180) {
        await triggerEndgame(msgCtx);
      }
    }

    // ==========================================================================
    // PHASE 8: VICTORY/DEFEAT CHECK (M6)
    // ==========================================================================

    // Check for stalemate warning at turn 180
    const stalemateWarning = await checkStalemateWarning(gameId, nextTurn);
    if (stalemateWarning?.isStalemate) {
      globalEvents.push({
        type: "other",
        message: stalemateWarning.message,
        severity: "warning",
      });
    }

    // Check for victory conditions
    const victoryResult = await checkVictoryConditions(gameId);
    if (victoryResult) {
      globalEvents.push({
        type: "victory",
        message: victoryResult.message,
        severity: "info",
      });

      // Mark game as completed
      await completeGame(gameId);

      // Return early with victory info
      const processingMs = Math.round(performance.now() - startTime);
      return {
        gameId,
        turn: nextTurn,
        processingMs,
        empireResults,
        globalEvents,
        success: true,
        victoryResult,
      };
    }

    // Update game turn counter and processing time
    const processingMs = Math.round(performance.now() - startTime);
    await db
      .update(games)
      .set({
        currentTurn: nextTurn,
        lastTurnProcessingMs: processingMs,
      })
      .where(eq(games.id, gameId));

    // Log performance
    await perfLogger.log({
      operation: "turn_processing",
      durationMs: processingMs,
      gameId,
      metadata: {
        turn: nextTurn,
        empireCount: game.empires.length,
      },
    });

    // ==========================================================================
    // PHASE 9: AUTO-SAVE (M6 - Ironman)
    // ==========================================================================

    // Create auto-save after turn processing (keeps only latest save)
    const saveResult = await createAutoSave(gameId, nextTurn);
    if (!saveResult.success) {
      console.warn("Auto-save failed:", saveResult.error);
      // Don't fail the turn, just log the warning
    }

    return {
      gameId,
      turn: nextTurn,
      processingMs,
      empireResults,
      globalEvents,
      success: true,
    };
  } catch (error) {
    console.error("Turn processing failed:", error);
    return createErrorResult(
      gameId,
      0,
      startTime,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

// =============================================================================
// EMPIRE TURN PROCESSING
// =============================================================================

/**
 * Process a single turn for one empire
 *
 * Executes all phases for a single empire:
 * 1. Calculate income with civil status multiplier
 * 2. Update population (growth/starvation)
 * 3. Evaluate civil status changes
 * 4-6. Stubs for future phases
 * 7. Apply maintenance (already in resource calculation)
 * 8. Check for defeat conditions
 */
async function processEmpireTurn(
  empire: Empire,
  planets: Planet[],
  gameId: string,
  turn: number,
  difficulty: Difficulty = "normal"
): Promise<EmpireResult> {
  const events: TurnEvent[] = [];
  let civilStatusChange: CivilStatusUpdate | undefined;

  // ==========================================================================
  // PHASE 1: INCOME COLLECTION
  // ==========================================================================

  // Get current civil status multiplier
  const incomeMultiplier = getIncomeMultiplier(empire.civilStatus as CivilStatusLevel);

  // Calculate resource production with planet maintenance already deducted
  let resourceProduction = processTurnResources(planets, incomeMultiplier);

  // Apply nightmare difficulty bonus for bot empires (+25% credits)
  if (empire.type === "bot" && difficulty === "nightmare") {
    const bonusCredits = applyBotNightmareBonus(
      resourceProduction.final.credits,
      difficulty
    );
    resourceProduction = {
      ...resourceProduction,
      final: {
        ...resourceProduction.final,
        credits: bonusCredits,
      },
    };
  }

  // Calculate unit maintenance (M3)
  const unitCounts: UnitCounts = {
    soldiers: empire.soldiers,
    fighters: empire.fighters,
    stations: empire.stations,
    lightCruisers: empire.lightCruisers,
    heavyCruisers: empire.heavyCruisers,
    carriers: empire.carriers,
    covertAgents: empire.covertAgents,
  };
  const unitMaintenance = calculateUnitMaintenance(unitCounts);
  const planetMaintenance = calculateMaintenanceCost(planets.length);
  const totalMaintenance = planetMaintenance.totalCost + unitMaintenance.totalCost;

  // Calculate new resource totals (deduct unit maintenance from credits)
  const creditsAfterMaintenance = resourceProduction.final.credits - unitMaintenance.totalCost;
  const newCredits = Math.max(0, empire.credits + creditsAfterMaintenance);
  const newFood = empire.food + resourceProduction.final.food;
  const newOre = empire.ore + resourceProduction.final.ore;
  const newPetroleum = empire.petroleum + resourceProduction.final.petroleum;
  const newResearchPoints = empire.researchPoints + resourceProduction.final.researchPoints;

  // Add production event
  events.push({
    type: "resource_production",
    message: `Produced ${resourceProduction.final.credits.toLocaleString()} credits (${incomeMultiplier}× multiplier)`,
    severity: "info",
    empireId: empire.id,
  });

  // Add maintenance event (combined planet + unit)
  events.push({
    type: "maintenance",
    message: `Paid ${totalMaintenance.toLocaleString()} credits in maintenance (${planetMaintenance.totalCost.toLocaleString()} planets, ${unitMaintenance.totalCost.toLocaleString()} units)`,
    severity: "info",
    empireId: empire.id,
  });

  // ==========================================================================
  // PHASE 2: POPULATION UPDATE
  // ==========================================================================

  // Calculate food available for population (new food after production)
  const populationUpdate = processPopulation(
    empire.population,
    empire.populationCap,
    newFood
  );

  // Deduct food consumed from new food total
  const finalFood = Math.max(0, newFood - populationUpdate.foodConsumed);

  // Add population event
  if (populationUpdate.status === "growth") {
    events.push({
      type: "population_change",
      message: `Population grew by ${populationUpdate.populationChange.toLocaleString()} citizens`,
      severity: "info",
      empireId: empire.id,
    });
  } else if (populationUpdate.status === "starvation") {
    events.push({
      type: "starvation",
      message: `${Math.abs(populationUpdate.populationChange).toLocaleString()} citizens died from starvation`,
      severity: "error",
      empireId: empire.id,
    });
  }

  // ==========================================================================
  // PHASE 3: CIVIL STATUS EVALUATION
  // ==========================================================================

  // Build civil status events based on this turn's outcomes
  const civilEvents: CivilStatusEvent[] = [];

  // Check food status
  if (populationUpdate.status === "starvation") {
    civilEvents.push({ type: "starvation", severity: 1.0 });
  } else if (populationUpdate.status === "growth") {
    // Only count as surplus if we have significant leftover food
    if (finalFood > populationUpdate.foodConsumed * 0.5) {
      civilEvents.push({ type: "food_surplus", consecutiveTurns: 1 });
    }
  }

  // Check maintenance burden (if credits went negative before clamping)
  const maintenanceRatio = totalMaintenance / Math.max(1, resourceProduction.production.credits);
  if (maintenanceRatio > 0.8) {
    civilEvents.push({ type: "high_maintenance", severity: maintenanceRatio });
  } else if (maintenanceRatio < 0.3) {
    civilEvents.push({ type: "low_maintenance", severity: maintenanceRatio });
  }

  // Check for education planets (provide bonus)
  const hasEducation = planets.some(p => p.type === "education");
  if (hasEducation) {
    civilEvents.push({ type: "education" });
  }

  // Evaluate civil status
  const statusUpdate = evaluateCivilStatus(
    empire.civilStatus as CivilStatusLevel,
    civilEvents
  );

  if (statusUpdate.changed) {
    civilStatusChange = statusUpdate;
    events.push({
      type: "civil_status_change",
      message: `Civil status changed from ${statusUpdate.oldStatus} to ${statusUpdate.newStatus}: ${statusUpdate.reason}`,
      severity: statusUpdate.newStatus === "revolting" ? "error" : "warning",
      empireId: empire.id,
    });

    // Log to database
    await logStatusChange(empire.id, gameId, turn, statusUpdate);
  }

  // ==========================================================================
  // PHASE 3.5: RESEARCH PRODUCTION (M3)
  // ==========================================================================

  // Generate research points from research planets (100 RP/planet/turn)
  const researchPlanets = planets.filter(p => p.type === "research");
  if (researchPlanets.length > 0) {
    const researchResult = await processResearchProduction(empire.id, researchPlanets.length);
    if (researchResult.leveledUp) {
      events.push({
        type: "other",
        message: `Research advanced to Level ${researchResult.newLevel}!`,
        severity: "info",
        empireId: empire.id,
      });
    }
  }

  // ==========================================================================
  // PHASE 4: BUILD QUEUE PROCESSING (M3)
  // ==========================================================================

  // Process build queue - decrement turns, add completed units
  const buildQueueResult = await processBuildQueue(empire.id);
  if (buildQueueResult.success && buildQueueResult.completedBuilds.length > 0) {
    for (const build of buildQueueResult.completedBuilds) {
      events.push({
        type: "other",
        message: `Completed ${build.quantity.toLocaleString()} ${build.unitType}`,
        severity: "info",
        empireId: empire.id,
      });
    }
  }

  // ==========================================================================
  // PHASE 4.5: COVERT POINT GENERATION (M6.5)
  // ==========================================================================

  // Generate covert points (5/turn, max 50)
  await processCovertPointGeneration(empire.id);

  // ==========================================================================
  // PHASES 5-6: STUBS FOR FUTURE MILESTONES
  // ==========================================================================

  // Phase 5: Bot decisions (M5)
  // Phase 6: Actions - covert, diplomatic, movement, combat (M4, M6.5, M7)

  // ==========================================================================
  // PHASE 7: MAINTENANCE (already applied in Phase 1)
  // ==========================================================================

  // ==========================================================================
  // PHASE 8: DEFEAT CHECK (M6)
  // ==========================================================================

  // Check for bankruptcy (can't pay maintenance)
  const isBankrupt = newCredits <= 0 && resourceProduction.final.credits < 0;
  if (isBankrupt) {
    events.push({
      type: "bankruptcy",
      message: "Empire is bankrupt! Cannot pay maintenance costs.",
      severity: "error",
      empireId: empire.id,
    });
  }

  // Check for revolting status with ramping consequences
  const isRevolting = statusUpdate.newStatus === "revolting";
  let revoltUnitLosses = {
    soldierLoss: 0,
    fighterLoss: 0,
    stationLoss: 0,
    lightCruiserLoss: 0,
    heavyCruiserLoss: 0,
    carrierLoss: 0,
    covertAgentLoss: 0,
  };
  let isCivilCollapse = false;

  if (isRevolting) {
    // Get consecutive revolting turns from history
    const consecutiveRevoltingTurns = await getConsecutiveRevoltingTurns(
      empire.id,
      gameId
    );

    // Calculate ramping consequences
    const revoltConsequence = calculateRevoltConsequences(
      empire,
      planets.length,
      consecutiveRevoltingTurns
    );

    events.push({
      type: "revolt_consequences",
      message: revoltConsequence.message,
      severity: revoltConsequence.isDefeated ? "error" : "warning",
      empireId: empire.id,
    });

    if (revoltConsequence.isDefeated) {
      isCivilCollapse = true;
      events.push({
        type: "defeat",
        message: "CIVIL WAR! Your empire has collapsed!",
        severity: "error",
        empireId: empire.id,
      });
    } else if (revoltConsequence.unitsLost > 0) {
      // Apply military desertion
      revoltUnitLosses = applyRevoltConsequences(empire, revoltConsequence);
    }
  }

  // Empire is alive if not bankrupt, not collapsed, has population, and has planets
  const isAlive = !isBankrupt && !isCivilCollapse && populationUpdate.newPopulation > 0 && planets.length > 0;

  // ==========================================================================
  // UPDATE DATABASE
  // ==========================================================================

  // Apply revolt unit losses if any
  const finalSoldiers = Math.max(0, empire.soldiers - revoltUnitLosses.soldierLoss);
  const finalFighters = Math.max(0, empire.fighters - revoltUnitLosses.fighterLoss);
  const finalStations = Math.max(0, empire.stations - revoltUnitLosses.stationLoss);
  const finalLightCruisers = Math.max(0, empire.lightCruisers - revoltUnitLosses.lightCruiserLoss);
  const finalHeavyCruisers = Math.max(0, empire.heavyCruisers - revoltUnitLosses.heavyCruiserLoss);
  const finalCarriers = Math.max(0, empire.carriers - revoltUnitLosses.carrierLoss);
  const finalCovertAgents = Math.max(0, empire.covertAgents - revoltUnitLosses.covertAgentLoss);

  await db
    .update(empires)
    .set({
      credits: newCredits,
      food: finalFood,
      ore: newOre,
      petroleum: newPetroleum,
      researchPoints: newResearchPoints,
      population: populationUpdate.newPopulation,
      civilStatus: statusUpdate.newStatus,
      // Apply revolt unit losses
      soldiers: finalSoldiers,
      fighters: finalFighters,
      stations: finalStations,
      lightCruisers: finalLightCruisers,
      heavyCruisers: finalHeavyCruisers,
      carriers: finalCarriers,
      covertAgents: finalCovertAgents,
      updatedAt: new Date(),
    })
    .where(eq(empires.id, empire.id));

  // Calculate resource changes for return value
  const resourceChanges: ResourceDelta = {
    credits: resourceProduction.final.credits,
    food: resourceProduction.final.food - populationUpdate.foodConsumed,
    ore: resourceProduction.final.ore,
    petroleum: resourceProduction.final.petroleum,
    researchPoints: resourceProduction.final.researchPoints,
  };

  return {
    empireId: empire.id,
    empireName: empire.name,
    resourceChanges,
    populationChange: populationUpdate.populationChange,
    civilStatusChange,
    events,
    isAlive,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create an error result for the entire turn
 */
function createErrorResult(
  gameId: string,
  turn: number,
  startTime: number,
  error: string
): TurnResult {
  return {
    gameId,
    turn,
    processingMs: Math.round(performance.now() - startTime),
    empireResults: [],
    globalEvents: [],
    success: false,
    error,
  };
}

/**
 * Create an error result for a single empire
 */
function createErrorEmpireResult(empire: Empire, error: unknown): EmpireResult {
  return {
    empireId: empire.id,
    empireName: empire.name,
    resourceChanges: {
      credits: 0,
      food: 0,
      ore: 0,
      petroleum: 0,
      researchPoints: 0,
    },
    populationChange: 0,
    events: [
      {
        type: "other",
        message: `Error processing empire: ${error instanceof Error ? error.message : "Unknown error"}`,
        severity: "error",
        empireId: empire.id,
      },
    ],
    isAlive: true, // Assume alive on error to prevent false eliminations
  };
}

// =============================================================================
// INDIVIDUAL PHASE PROCESSORS (for testing/extensibility)
// =============================================================================

/**
 * Phase 1: Process income for an empire
 *
 * Exported for testing purposes.
 */
export async function processPhase1_Income(
  empire: Empire,
  planets: Planet[]
): Promise<{ resources: ResourceDelta; multiplier: number }> {
  const multiplier = getIncomeMultiplier(empire.civilStatus as CivilStatusLevel);
  const production = processTurnResources(planets, multiplier);
  return {
    resources: production.final,
    multiplier,
  };
}

/**
 * Phase 2: Process population for an empire
 *
 * Exported for testing purposes.
 */
export function processPhase2_Population(
  population: number,
  populationCap: number,
  foodAvailable: number
) {
  return processPopulation(population, populationCap, foodAvailable);
}

/**
 * Phase 3: Process civil status for an empire
 *
 * Exported for testing purposes.
 */
export function processPhase3_CivilStatus(
  currentStatus: CivilStatusLevel,
  events: CivilStatusEvent[]
) {
  return evaluateCivilStatus(currentStatus, events);
}

/**
 * Phase 4: Market processing (stub for M3)
 */
export async function processPhase4_Market(): Promise<void> {
  // Stub: Market processing will be implemented in M3
}

/**
 * Phase 5: Bot decisions (stub for M5)
 */
export async function processPhase5_BotDecisions(): Promise<void> {
  // Stub: Bot AI will be implemented in M5
}

/**
 * Phase 6: Actions (stub for M4+)
 */
export async function processPhase6_Actions(): Promise<void> {
  // Stub: Combat, covert, diplomacy will be implemented in M4+
}

/**
 * Phase 7: Maintenance (already handled in Phase 1 via resource engine)
 */
export async function processPhase7_Maintenance(): Promise<void> {
  // Maintenance is calculated as part of resource production in Phase 1
}

/**
 * Phase 8: Victory check (stub for M6)
 */
export async function processPhase8_VictoryCheck(): Promise<void> {
  // Stub: Victory conditions will be implemented in M6
}

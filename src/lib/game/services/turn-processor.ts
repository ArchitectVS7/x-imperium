/**
 * Turn Processor Service
 *
 * Orchestrates the multi-phase turn processing pipeline for all empires in a game.
 * Handles resource production, population mechanics, civil status, crafting, and maintenance.
 *
 * PRD References:
 * - PRD 3: Turn Processing Order
 * - PRD 11.2: Galactic Events (M11)
 * - PRD 11.3: Alliance Checkpoints (M11)
 * - Performance target: <500ms per turn (no bots)
 *
 * Turn Processing Order:
 * 1. Income collection (with civil status multiplier)
 * 1.5. Tier 1 auto-production (crafting system)
 * 2. Population update (growth/starvation)
 * 3. Civil status evaluation
 * 3.5. Research production
 * 4. Build queue processing
 * 4.5. Covert point generation
 * 4.6. Crafting queue processing
 * 5. Bot decisions
 * 5.5. Bot emotional decay (M10) - reduce emotional intensity over time
 * 6. Market price update
 * 7. Bot messages
 * 7.5. Galactic events (M11) - every 10-20 turns after turn 15
 * 7.6. Alliance checkpoints (M11) - at turns 30, 60, 90, 120, 150, 180
 * 8. Victory/Defeat check
 * 9. Auto-save
 */

import { db } from "@/lib/db";
import {
  games,
  empires,
  resourceInventory,
  craftingQueue,
  regionConnections,
  empireInfluence,
  galaxyRegions,
  type Empire,
  type Sector,
  type CraftingQueue,
} from "@/lib/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
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
import { applyEmotionalDecay } from "@/lib/game/repositories/bot-emotional-state-repository";
import { pruneDecayedMemories } from "@/lib/game/repositories/bot-memory-repository";
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
  calculateTier1AutoProduction,
  TIER_TO_ENUM,
} from "./resource-tier-service";
import {
  processCraftingQueue as processCraftingQueueItems,
  type CompletedCrafting,
} from "./crafting-service";
import { RESOURCE_TIERS, type CraftedResource } from "../constants/crafting";
import {
  triggerCasualMessages,
  triggerRandomBroadcast,
  triggerEndgame,
  type TriggerContext,
} from "@/lib/messages";
import { processGalacticEvents, applyGalacticEvent } from "./event-service";
import {
  evaluateAllianceCheckpoint,
  generateCheckpointNotification,
  isCheckpointTurn,
} from "./checkpoint-service";
import {
  processWormholesTurn,
  attemptWormholeDiscovery,
} from "./wormhole-service";
import { processBorderDiscovery } from "./border-discovery-service";
import { processWormholeConstruction } from "./wormhole-construction-service";
import { detectBosses } from "./boss-detection-service";

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

  try {
    // Load game with all empires and sectors
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
      with: {
        empires: {
          with: {
            sectors: true,
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

    // PERFORMANCE: Process all empires in parallel (they don't have dependencies on each other)
    const empireResults = await Promise.all(
      game.empires.map(async (empire) => {
        try {
          return await processEmpireTurn(
            empire,
            empire.sectors,
            gameId,
            nextTurn,
            game.difficulty as Difficulty
          );
        } catch (error) {
          // Log error but continue processing other empires
          console.error(`Error processing empire ${empire.id}:`, error);
          return createErrorEmpireResult(empire, error);
        }
      })
    );

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
    // PHASE 5.5: BOT EMOTIONAL DECAY (M10)
    // ==========================================================================

    // Apply emotional decay to all bots at end of turn
    // This gradually reduces emotional intensity over time
    const botEmpires = game.empires.filter((e) => e.type === "bot" && !e.isEliminated);
    await Promise.all(
      botEmpires.map((bot) =>
        applyEmotionalDecay(bot.id, gameId, nextTurn).catch((err) => {
          // Don't fail the turn if emotional decay fails for a bot
          console.warn(`Emotional decay failed for bot ${bot.id}:`, err);
        })
      )
    );

    // ==========================================================================
    // PHASE 5.6: MEMORY CLEANUP (every 5 turns)
    // ==========================================================================

    // Prune decayed memories to prevent database bloat
    // Memories below weight 1.0 are removed (except permanent scars)
    if (nextTurn % 5 === 0) {
      let totalPruned = 0;
      await Promise.all(
        botEmpires.map(async (bot) => {
          try {
            const pruned = await pruneDecayedMemories(bot.id, nextTurn, 1.0);
            totalPruned += pruned;
          } catch (err) {
            console.warn(`Memory pruning failed for bot ${bot.id}:`, err);
          }
        })
      );
      if (totalPruned > 0) {
        globalEvents.push({
          type: "other",
          message: `Cleaned up ${totalPruned} old memories`,
          severity: "info",
        });
      }
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
    // PHASE 7.5: GALACTIC EVENTS (M11)
    // ==========================================================================

    // Process galactic events (every 10-20 turns after turn 15)
    const eventResult = await processGalacticEvents(
      gameId,
      nextTurn,
      game.empires
    );
    if (eventResult.event) {
      globalEvents.push({
        type: "other",
        message: `🌌 ${eventResult.message}`,
        severity: "warning",
      });
    }

    // ==========================================================================
    // PHASE 7.6: ALLIANCE CHECKPOINTS (M11)
    // ==========================================================================

    // Evaluate alliance checkpoints at turns 30, 60, 90, 120, 150, 180
    if (isCheckpointTurn(nextTurn)) {
      const checkpointResult = await evaluateAllianceCheckpoint(gameId, nextTurn);

      if (checkpointResult.imbalanceDetected && checkpointResult.rebalancingEvent) {
        // Apply the rebalancing event
        const rebalanceResult = await applyGalacticEvent(
          checkpointResult.rebalancingEvent,
          gameId,
          nextTurn,
          game.empires
        );

        globalEvents.push({
          type: "other",
          message: `⚖️ ${generateCheckpointNotification(checkpointResult)}`,
          severity: "warning",
        });

        if (rebalanceResult.success) {
          globalEvents.push({
            type: "other",
            message: `🎯 Rebalancing: ${rebalanceResult.message}`,
            severity: "info",
          });
        }
      } else if (checkpointResult.isCheckpoint) {
        globalEvents.push({
          type: "other",
          message: `⚖️ Turn ${nextTurn} checkpoint: Power balance stable`,
          severity: "info",
        });
      }
    }

    // ==========================================================================
    // PHASE 7.7: BORDER DISCOVERY (Geography System M6.2)
    // ==========================================================================

    // Process border discovery - unlocks borders between turns 10-15
    const borderDiscoveryResults = await processBorderDiscovery(gameId, nextTurn);
    if (borderDiscoveryResults.length > 0) {
      globalEvents.push({
        type: "other",
        message: `🗺️ ${borderDiscoveryResults.length} new border route${borderDiscoveryResults.length > 1 ? "s" : ""} discovered! Expansion opportunities await.`,
        severity: "info",
      });
    }

    // ==========================================================================
    // PHASE 7.8: WORMHOLE PROCESSING (Geography System)
    // ==========================================================================

    // Process wormhole discovery, collapse, and reopen mechanics
    const wormholeEvents = await processWormholesForGame(gameId, nextTurn, game.empires);
    for (const event of wormholeEvents) {
      globalEvents.push(event);
    }

    // ==========================================================================
    // PHASE 7.9: WORMHOLE CONSTRUCTION COMPLETION (M6.3)
    // ==========================================================================

    // Process wormhole construction projects and complete any that are ready
    const constructionResult = await processWormholeConstruction(gameId, nextTurn);
    if (constructionResult.completed.length > 0) {
      for (const message of constructionResult.messages) {
        globalEvents.push({
          type: "other",
          message: `🌀 ${message}`,
          severity: "info",
        });
      }
    }

    // ==========================================================================
    // PHASE 7.10: BOSS DETECTION (M7.1)
    // ==========================================================================

    // Detect and track dominant empires (bosses)
    const bossResult = await detectBosses(gameId, nextTurn);
    if (bossResult.newBosses.length > 0) {
      for (const boss of bossResult.newBosses) {
        globalEvents.push({
          type: "other",
          message: `👑 ${boss.empireName} has emerged as a DOMINANT POWER! (${boss.battleWins} victories, ${(boss.networthRatio * 100).toFixed(0)}% of average networth)`,
          severity: "warning",
        });
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
  sectors: Sector[],
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

  // Calculate resource production with sector maintenance already deducted
  let resourceProduction = processTurnResources(sectors, incomeMultiplier);

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
  const planetMaintenance = calculateMaintenanceCost(sectors.length);
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

  // Add maintenance event (combined sector + unit)
  events.push({
    type: "maintenance",
    message: `Paid ${totalMaintenance.toLocaleString()} credits in maintenance (${planetMaintenance.totalCost.toLocaleString()} sectors, ${unitMaintenance.totalCost.toLocaleString()} units)`,
    severity: "info",
    empireId: empire.id,
  });

  // ==========================================================================
  // PHASE 1.5: TIER 1 AUTO-PRODUCTION (Crafting System)
  // ==========================================================================

  // Calculate auto-production from specialized sectors
  // Ore → Refined Metals (10%), Petroleum → Fuel Cells (10%), Food → Processed Food (5%)
  const tier1Production = calculateTier1AutoProduction(
    sectors,
    {
      food: resourceProduction.final.food,
      ore: resourceProduction.final.ore,
      petroleum: resourceProduction.final.petroleum,
    }
  );

  // Update resource inventory with auto-produced Tier 1 resources
  if (tier1Production.productions.length > 0) {
    await updateResourceInventory(
      empire.id,
      gameId,
      tier1Production.totalByResource as Partial<Record<CraftedResource, number>>
    );

    // Log production events
    for (const prod of tier1Production.productions) {
      events.push({
        type: "other",
        message: `Auto-produced ${prod.quantity} ${prod.resourceType.replace(/_/g, " ")} from ${prod.sourcePlanets} ${prod.sourceType} sector(s)`,
        severity: "info",
        empireId: empire.id,
      });
    }
  }

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

  // Check for education sectors (provide bonus)
  const hasEducation = sectors.some(p => p.type === "education");
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

  // Generate research points from research sectors (100 RP/sector/turn)
  const researchPlanets = sectors.filter(p => p.type === "research");
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
  // PHASE 4.6: CRAFTING QUEUE PROCESSING (Crafting System)
  // ==========================================================================

  // Process crafting queue - complete items that are ready
  const craftingResult = await processCraftingQueueForEmpire(empire.id, gameId, turn);
  if (craftingResult.completed.length > 0) {
    for (const item of craftingResult.completed) {
      events.push({
        type: "other",
        message: `Crafting complete: ${item.quantity} ${item.resourceType.replace(/_/g, " ")}`,
        severity: "info",
        empireId: empire.id,
      });
    }
  }

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
      sectors.length,
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

  // Empire is alive if not bankrupt, not collapsed, has population, and has sectors
  const isAlive = !isBankrupt && !isCivilCollapse && populationUpdate.newPopulation > 0 && sectors.length > 0;

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
  sectors: Sector[]
): Promise<{ resources: ResourceDelta; multiplier: number }> {
  const multiplier = getIncomeMultiplier(empire.civilStatus as CivilStatusLevel);
  const production = processTurnResources(sectors, multiplier);
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

// =============================================================================
// CRAFTING SYSTEM HELPERS
// =============================================================================

/**
 * Update resource inventory for an empire
 *
 * Adds the specified resources to the empire's inventory.
 * Creates new inventory records if they don't exist.
 *
 * PERFORMANCE: Uses batch operations to minimize database queries:
 * - 1 query to fetch all existing inventory
 * - 1 batch insert for new resources
 * - 1 batch update for existing resources
 *
 * @param empireId - Empire UUID
 * @param gameId - Game UUID
 * @param resources - Resources to add (keyed by resource type)
 */
async function updateResourceInventory(
  empireId: string,
  gameId: string,
  resources: Partial<Record<CraftedResource, number>>
): Promise<void> {
  const resourceEntries = Object.entries(resources).filter(([, qty]) => qty > 0);
  if (resourceEntries.length === 0) return;

  const resourceTypes = resourceEntries.map(([type]) => type as CraftedResource);

  // PERFORMANCE: Fetch all existing inventory in one query
  const existingInventory = await db.query.resourceInventory.findMany({
    where: and(
      eq(resourceInventory.empireId, empireId),
      inArray(resourceInventory.resourceType, resourceTypes)
    ),
  });

  // Build lookup map for existing inventory
  const existingMap = new Map(
    existingInventory.map((inv) => [inv.resourceType, inv])
  );

  // Separate into updates and inserts
  const toUpdate: Array<{ id: string; newQuantity: number }> = [];
  const toInsert: Array<typeof resourceInventory.$inferInsert> = [];

  for (const [resourceType, quantity] of resourceEntries) {
    const existing = existingMap.get(resourceType as CraftedResource);

    if (existing) {
      toUpdate.push({
        id: existing.id,
        newQuantity: existing.quantity + quantity,
      });
    } else {
      const tier = RESOURCE_TIERS[resourceType as CraftedResource];
      const tierValue = TIER_TO_ENUM[tier];

      toInsert.push({
        empireId,
        gameId,
        resourceType: resourceType as CraftedResource,
        tier: tierValue,
        quantity,
      });
    }
  }

  // PERFORMANCE: Execute updates and inserts in parallel
  const updates: Promise<unknown>[] = [];

  // Batch insert new resources
  if (toInsert.length > 0) {
    updates.push(db.insert(resourceInventory).values(toInsert));
  }

  // Batch update existing resources with a single SQL query using CASE
  if (toUpdate.length > 0) {
    const ids = toUpdate.map((u) => u.id);
    const quantityCases = toUpdate
      .map((u) => sql`WHEN ${resourceInventory.id} = ${u.id} THEN ${u.newQuantity}`)
      .reduce((acc, curr) => sql`${acc} ${curr}`, sql``);

    updates.push(
      db
        .update(resourceInventory)
        .set({
          quantity: sql`CASE ${quantityCases} END`,
          updatedAt: new Date(),
        })
        .where(inArray(resourceInventory.id, ids))
    );
  }

  await Promise.all(updates);
}

/**
 * Process crafting queue for an empire
 *
 * Completes items that are ready and updates the database.
 *
 * @param empireId - Empire UUID
 * @param gameId - Game UUID
 * @param currentTurn - Current game turn
 * @returns Completed items
 */
async function processCraftingQueueForEmpire(
  empireId: string,
  gameId: string,
  currentTurn: number
): Promise<{ completed: CompletedCrafting[] }> {
  // Load current queue
  const queue: CraftingQueue[] = await db.query.craftingQueue.findMany({
    where: and(
      eq(craftingQueue.empireId, empireId),
      eq(craftingQueue.gameId, gameId)
    ),
  });

  // Sort by startTurn
  queue.sort((a, b) => a.startTurn - b.startTurn);

  if (queue.length === 0) {
    return { completed: [] };
  }

  // Convert to the format expected by processCraftingQueueItems
  const queueItems = queue.map((item: CraftingQueue) => ({
    id: item.id,
    resourceType: item.resourceType as CraftedResource,
    quantity: item.quantity,
    status: item.status as "queued" | "in_progress" | "completed" | "cancelled",
    startTurn: item.startTurn,
    completionTurn: item.completionTurn,
    componentsReserved: (item.componentsReserved as Record<string, number>) || {},
  }));

  // Process the queue
  const result = processCraftingQueueItems(queueItems, currentTurn);

  // PERFORMANCE: Batch all database updates instead of sequential awaits
  const updates: Promise<unknown>[] = [];

  // Collect inventory updates for completed items
  const inventoryUpdates: Partial<Record<CraftedResource, number>> = {};
  for (const completed of result.completed) {
    inventoryUpdates[completed.resourceType] =
      (inventoryUpdates[completed.resourceType] ?? 0) + completed.quantity;
  }

  // Add inventory update if there are completed items
  if (Object.keys(inventoryUpdates).length > 0) {
    updates.push(updateResourceInventory(empireId, gameId, inventoryUpdates));
  }

  // Collect queue status updates for completed items
  for (const completed of result.completed) {
    const queueItem = queue.find(
      (q: CraftingQueue) => q.resourceType === completed.resourceType && q.status !== "completed"
    );
    if (queueItem) {
      updates.push(
        db
          .update(craftingQueue)
          .set({
            status: "completed",
            updatedAt: new Date(),
          })
          .where(eq(craftingQueue.id, queueItem.id))
      );
    }
  }

  // Collect in_progress status updates
  for (const item of result.updatedQueue) {
    if (item.status === "in_progress") {
      const queueItem = queue.find((q: CraftingQueue) => q.id === item.id);
      if (queueItem && queueItem.status !== "in_progress") {
        updates.push(
          db
            .update(craftingQueue)
            .set({
              status: "in_progress",
              updatedAt: new Date(),
            })
            .where(eq(craftingQueue.id, queueItem.id))
        );
      }
    }
  }

  // Execute all updates in parallel
  await Promise.all(updates);

  return { completed: result.completed };
}

/**
 * Phase 1.5: Process Tier 1 auto-production
 *
 * Exported for testing purposes.
 */
export async function processPhase1_5_Tier1AutoProduction(
  empireId: string,
  gameId: string,
  sectors: Sector[],
  baseProduction: { food: number; ore: number; petroleum: number }
): Promise<{ productions: Array<{ resourceType: string; quantity: number }> }> {
  const tier1Production = calculateTier1AutoProduction(sectors, baseProduction);

  if (tier1Production.productions.length > 0) {
    await updateResourceInventory(
      empireId,
      gameId,
      tier1Production.totalByResource as Partial<Record<CraftedResource, number>>
    );
  }

  return { productions: tier1Production.productions };
}

/**
 * Phase 4.6: Process crafting queue
 *
 * Exported for testing purposes.
 */
export async function processPhase4_6_CraftingQueue(
  empireId: string,
  gameId: string,
  currentTurn: number
): Promise<{ completed: CompletedCrafting[] }> {
  return processCraftingQueueForEmpire(empireId, gameId, currentTurn);
}

// =============================================================================
// WORMHOLE PROCESSING (Geography System)
// =============================================================================

/**
 * Process wormholes for a game each turn.
 * - Attempts discovery for each empire
 * - Checks for collapse of unstabilized wormholes
 * - Checks for reopen of collapsed wormholes
 * - Auto-stabilizes old wormholes
 */
async function processWormholesForGame(
  gameId: string,
  currentTurn: number,
  allEmpires: Array<Pick<Empire, "id" | "type" | "isEliminated" | "covertAgents" | "fundamentalResearchLevel">>
): Promise<TurnEvent[]> {
  const events: TurnEvent[] = [];

  // Load all wormholes for this game
  const wormholes = await db.query.regionConnections.findMany({
    where: and(
      eq(regionConnections.gameId, gameId),
      eq(regionConnections.connectionType, "wormhole")
    ),
  });

  if (wormholes.length === 0) {
    return events;
  }

  // Load regions for names
  const regions = await db.query.galaxyRegions.findMany({
    where: eq(galaxyRegions.gameId, gameId),
  });
  const regionMap = new Map(regions.map((r) => [r.id, r]));

  // Load empire influence records for region assignments
  const influenceRecords = await db.query.empireInfluence.findMany({
    where: eq(empireInfluence.gameId, gameId),
  });
  const empireRegionMap = new Map(influenceRecords.map((r) => [r.empireId, r.primaryRegionId]));

  // ============================================================================
  // PHASE 1: WORMHOLE COLLAPSE/REOPEN/AUTO-STABILIZE
  // ============================================================================

  const wormholesWithDates = wormholes.map((w) => ({
    ...w,
    discoveredAtTurn: w.discoveredAtTurn,
  }));

  const turnResult = processWormholesTurn(wormholesWithDates, currentTurn);

  // PERFORMANCE: Parallelize wormhole status updates (independent operations)
  await Promise.all([
    // Update collapsed wormholes
    ...turnResult.collapsed.map(async (connectionId) => {
      await db
        .update(regionConnections)
        .set({
          wormholeStatus: "collapsed",
          updatedAt: new Date(),
        })
        .where(eq(regionConnections.id, connectionId));

      const wormhole = wormholes.find((w) => w.id === connectionId);
      if (wormhole) {
        const fromRegion = regionMap.get(wormhole.fromRegionId);
        const toRegion = regionMap.get(wormhole.toRegionId);
        events.push({
          type: "other",
          message: `⚠️ Wormhole between ${fromRegion?.name ?? "Unknown"} and ${toRegion?.name ?? "Unknown"} has collapsed!`,
          severity: "warning",
        });
      }
    }),

    // Update reopened wormholes
    ...turnResult.reopened.map(async (connectionId) => {
      await db
        .update(regionConnections)
        .set({
          wormholeStatus: "undiscovered",
          collapseChance: "0.05",
          discoveredAtTurn: null,
          discoveredByEmpireId: null,
          updatedAt: new Date(),
        })
        .where(eq(regionConnections.id, connectionId));

      events.push({
        type: "other",
        message: `🌀 A collapsed wormhole has reopened and awaits rediscovery!`,
        severity: "info",
      });
    }),

    // Update auto-stabilized wormholes
    ...turnResult.autoStabilized.map(async (connectionId) => {
      await db
        .update(regionConnections)
        .set({
          wormholeStatus: "stabilized",
          collapseChance: "0.00",
          updatedAt: new Date(),
        })
        .where(eq(regionConnections.id, connectionId));

      const wormhole = wormholes.find((w) => w.id === connectionId);
      if (wormhole) {
        const fromRegion = regionMap.get(wormhole.fromRegionId);
        const toRegion = regionMap.get(wormhole.toRegionId);
        events.push({
          type: "other",
          message: `✨ Wormhole between ${fromRegion?.name ?? "Unknown"} and ${toRegion?.name ?? "Unknown"} has naturally stabilized!`,
          severity: "info",
        });
      }
    }),
  ]);

  // ============================================================================
  // PHASE 2: WORMHOLE DISCOVERY ATTEMPTS
  // ============================================================================

  // Get undiscovered wormholes
  const undiscoveredWormholes = wormholes
    .filter((w) => w.wormholeStatus === "undiscovered")
    .map((w) => ({
      id: w.id,
      fromRegionId: w.fromRegionId,
      fromRegionName: regionMap.get(w.fromRegionId)?.name ?? "Unknown",
      toRegionId: w.toRegionId,
      toRegionName: regionMap.get(w.toRegionId)?.name ?? "Unknown",
    }));

  if (undiscoveredWormholes.length === 0) {
    return events;
  }

  // PERFORMANCE: Collect all discoveries first, then batch database updates
  type DiscoveryData = {
    connectionId: string;
    empireId: string;
    influenceRecordId: string | null;
    knownWormholes: string[];
    message: string;
    isPlayer: boolean;
  };

  const discoveries: DiscoveryData[] = [];

  // Attempt discovery for each active empire
  for (const empire of allEmpires) {
    if (empire.isEliminated) continue;

    const empireRegionId = empireRegionMap.get(empire.id);
    if (!empireRegionId) continue;

    const discoveryResult = attemptWormholeDiscovery(
      empire,
      undiscoveredWormholes,
      empireRegionId
    );

    if (discoveryResult.discovered && discoveryResult.connectionId) {
      // Find influence record
      const influenceRecord = influenceRecords.find((r) => r.empireId === empire.id);
      const knownWormholes = influenceRecord
        ? (JSON.parse(influenceRecord.knownWormholeIds as string) as string[])
        : [];

      // Add to known wormholes
      knownWormholes.push(discoveryResult.connectionId);

      discoveries.push({
        connectionId: discoveryResult.connectionId,
        empireId: empire.id,
        influenceRecordId: influenceRecord?.id ?? null,
        knownWormholes,
        message: discoveryResult.message,
        isPlayer: empire.type === "player",
      });

      // Remove from undiscovered list (so others can't discover same one this turn)
      const idx = undiscoveredWormholes.findIndex((w) => w.id === discoveryResult.connectionId);
      if (idx !== -1) {
        undiscoveredWormholes.splice(idx, 1);
      }
    }
  }

  // PERFORMANCE: Batch update discovered wormholes and empire influence in parallel
  if (discoveries.length > 0) {
    await Promise.all([
      // Batch update all discovered wormholes
      ...discoveries.map((discovery) =>
        db
          .update(regionConnections)
          .set({
            wormholeStatus: "discovered",
            discoveredByEmpireId: discovery.empireId,
            discoveredAtTurn: currentTurn,
            updatedAt: new Date(),
          })
          .where(eq(regionConnections.id, discovery.connectionId))
      ),
      // Batch update all empire influence records
      ...discoveries
        .filter((d) => d.influenceRecordId !== null)
        .map((discovery) =>
          db
            .update(empireInfluence)
            .set({
              knownWormholeIds: JSON.stringify(discovery.knownWormholes),
              updatedAt: new Date(),
            })
            .where(eq(empireInfluence.id, discovery.influenceRecordId!))
        ),
    ]);

    // Add events for discoveries
    for (const discovery of discoveries) {
      if (discovery.isPlayer) {
        events.push({
          type: "other",
          message: `🌀 ${discovery.message}`,
          severity: "info",
          empireId: discovery.empireId,
        });
      } else {
        // For bots, just log that a wormhole was discovered (anonymously)
        events.push({
          type: "other",
          message: `🌀 Rumors spread of a new wormhole discovery...`,
          severity: "info",
        });
      }
    }
  }

  return events;
}

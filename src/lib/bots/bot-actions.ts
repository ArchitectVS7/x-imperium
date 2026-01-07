/**
 * Bot Action Executors
 *
 * Executes bot decisions using existing game services.
 * Each executor maps a BotDecision to the appropriate service call.
 */

import { db } from "@/lib/db";
import { empires, buildQueue, sectors, type NewSector, craftingQueue, syndicateContracts, resourceInventory } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
import type { BotDecision, BotDecisionContext, Forces, UnitType } from "./types";
import { calculateUnitPurchaseCost } from "@/lib/game/unit-config";
import { UNIT_BUILD_TIMES, toDbUnitType } from "@/lib/game/build-config";
import { PLANET_COSTS, PLANET_PRODUCTION } from "@/lib/game/constants";
import { calculateSectorCost } from "@/lib/formulas/sector-costs";
import { TIER_1_RECIPES, TIER_2_RECIPES, TIER_3_RECIPES, RESOURCE_TIERS } from "@/lib/game/constants/crafting";
import type { CraftedResource, Tier1Resource, Tier2Resource, Tier3Resource } from "@/lib/game/constants/crafting";
import { CONTRACT_CONFIGS } from "@/lib/game/constants/syndicate";
import { TIER_TO_ENUM } from "@/lib/game/services/resource-tier-service";
import { executeAttack as executeCombatAttack } from "@/lib/game/services/combat-service";
import type { Forces as CombatForces } from "@/lib/combat/phases";
import { proposeTreaty, type TreatyType } from "@/lib/diplomacy";
import { executeBuyOrder, executeSellOrder, type TradableResource } from "@/lib/market";

// =============================================================================
// MAIN EXECUTOR
// =============================================================================

export interface ExecutionResult {
  success: boolean;
  error?: string;
  details?: string;
}

/**
 * Execute a bot decision and return the result.
 * Dispatches to the appropriate executor based on decision type.
 *
 * @param decision - The decision to execute
 * @param context - Current game context
 * @returns Execution result
 */
export async function executeBotDecision(
  decision: BotDecision,
  context: BotDecisionContext
): Promise<ExecutionResult> {
  try {
    switch (decision.type) {
      case "build_units":
        return await executeBuildUnits(decision, context);
      case "buy_planet":
        return await executeBuyPlanet(decision, context);
      case "attack":
        return await executeAttack(decision, context);
      case "diplomacy":
        return await executeDiplomacy(decision, context);
      case "trade":
        return await executeTrade(decision, context);
      case "do_nothing":
        return { success: true, details: "No action taken" };
      // Crafting system handlers
      case "craft_component":
        return await executeCraftComponent(decision, context);
      case "accept_contract":
        return await executeAcceptContract(decision, context);
      case "purchase_black_market":
        return await executePurchaseBlackMarket(decision, context);
      default:
        return { success: false, error: "Unknown decision type" };
    }
  } catch (error) {
    console.error("Bot action execution error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// BUILD UNITS EXECUTOR
// =============================================================================

/**
 * Execute a build_units decision.
 * Adds units to the build queue and deducts credits.
 */
async function executeBuildUnits(
  decision: Extract<BotDecision, { type: "build_units" }>,
  context: BotDecisionContext
): Promise<ExecutionResult> {
  const { empire, gameId } = context;
  const { unitType, quantity } = decision;

  // Validate quantity
  if (quantity <= 0) {
    return { success: false, error: "Invalid quantity" };
  }

  // Calculate total cost
  const totalCost = calculateUnitPurchaseCost(unitType, quantity);

  // Check if bot can afford it
  if (empire.credits < totalCost) {
    return {
      success: false,
      error: `Insufficient credits (need ${totalCost}, have ${empire.credits})`,
    };
  }

  // Get build time for this unit type
  const buildTime = getBuildTime(unitType);

  // Get current queue size for position
  const currentQueue = await db.query.buildQueue.findMany({
    where: eq(buildQueue.empireId, empire.id),
  });
  const queuePosition = currentQueue.length + 1;

  // Add to build queue
  await db.insert(buildQueue).values({
    empireId: empire.id,
    gameId,
    unitType: toDbUnitType(unitType),
    quantity,
    turnsRemaining: buildTime,
    totalCost,
    queuePosition,
  });

  // Deduct credits
  await db
    .update(empires)
    .set({
      credits: sql`${empires.credits} - ${totalCost}`,
      updatedAt: new Date(),
    })
    .where(eq(empires.id, empire.id));

  return {
    success: true,
    details: `Queued ${quantity} ${unitType} (${totalCost} credits)`,
  };
}

/**
 * Get build time for a unit type.
 */
function getBuildTime(unitType: UnitType): number {
  return UNIT_BUILD_TIMES[unitType] ?? 1;
}

// =============================================================================
// BUY PLANET EXECUTOR
// =============================================================================

/**
 * Execute a buy_planet decision.
 * Creates a new sector and deducts credits.
 */
async function executeBuyPlanet(
  decision: Extract<BotDecision, { type: "buy_planet" }>,
  context: BotDecisionContext
): Promise<ExecutionResult> {
  const { empire, gameId, currentTurn } = context;
  const { sectorType } = decision;

  // Calculate sector cost with scaling
  const baseCost = PLANET_COSTS[sectorType];
  const totalCost = calculateSectorCost(baseCost, empire.sectorCount);

  // Check if bot can afford it
  if (empire.credits < totalCost) {
    return {
      success: false,
      error: `Insufficient credits (need ${totalCost}, have ${empire.credits})`,
    };
  }

  // Get production rate for this sector type
  const productionRate = PLANET_PRODUCTION[sectorType];

  // Create the sector
  const sectorData: NewSector = {
    empireId: empire.id,
    gameId,
    type: sectorType,
    productionRate: String(productionRate),
    purchasePrice: totalCost,
    acquiredAtTurn: currentTurn,
  };

  await db.insert(sectors).values(sectorData);

  // Update empire: deduct credits and increment sector count
  await db
    .update(empires)
    .set({
      credits: sql`${empires.credits} - ${totalCost}`,
      sectorCount: sql`${empires.sectorCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(empires.id, empire.id));

  return {
    success: true,
    details: `Bought ${sectorType} sector (${totalCost} credits)`,
  };
}

// =============================================================================
// ATTACK EXECUTOR
// =============================================================================

/**
 * Execute an attack decision.
 * Uses the full combat service to resolve attacks properly.
 */
async function executeAttack(
  decision: Extract<BotDecision, { type: "attack" }>,
  context: BotDecisionContext
): Promise<ExecutionResult> {
  const { empire, gameId, currentTurn, protectionTurns } = context;
  const { targetId, forces, stance } = decision;

  // Verify protection period has ended
  if (currentTurn <= protectionTurns) {
    return { success: false, error: "Still in protection period" };
  }

  // Validate forces
  const totalForces = getTotalForces(forces);
  if (totalForces === 0) {
    return { success: false, error: "No forces allocated" };
  }

  // Verify bot has enough units (early check to avoid unnecessary combat service call)
  if (
    forces.soldiers > empire.soldiers ||
    forces.fighters > empire.fighters ||
    forces.lightCruisers > empire.lightCruisers ||
    forces.heavyCruisers > empire.heavyCruisers ||
    forces.carriers > empire.carriers
  ) {
    return { success: false, error: "Insufficient forces" };
  }

  // Convert bot Forces to combat Forces (add stations field)
  const combatForces: CombatForces = {
    soldiers: forces.soldiers,
    fighters: forces.fighters,
    stations: 0, // Bots don't use stations in attacks
    lightCruisers: forces.lightCruisers,
    heavyCruisers: forces.heavyCruisers,
    carriers: forces.carriers,
  };

  // Execute attack using combat service
  // This handles: validation, combat resolution, saving attack record, applying casualties
  const result = await executeCombatAttack({
    gameId,
    attackerId: empire.id,
    defenderId: targetId,
    attackType: "invasion", // Default to invasion for bot attacks
    forces: combatForces,
    attackerStance: stance, // Pass bot's combat stance for D20 volley combat
  });

  if (!result.success) {
    return { success: false, error: result.error ?? "Attack failed" };
  }

  // Build details message
  const outcome = result.result?.outcome ?? "unknown";
  const sectorsCaptured = result.result?.sectorsCaptured ?? 0;
  const capturedMsg = sectorsCaptured > 0 ? ` (captured ${sectorsCaptured} sector${sectorsCaptured > 1 ? "s" : ""}!)` : "";

  return {
    success: true,
    details: `Attack on ${targetId}: ${outcome}${capturedMsg} (${totalForces} units deployed)`,
  };
}

/**
 * Get total number of combat units in a force allocation.
 */
function getTotalForces(forces: Forces): number {
  return (
    forces.soldiers +
    forces.fighters +
    forces.lightCruisers +
    forces.heavyCruisers +
    forces.carriers
  );
}

// =============================================================================
// DIPLOMACY EXECUTOR
// =============================================================================

/**
 * Execute a diplomacy decision.
 * Proposes a treaty to another empire.
 */
async function executeDiplomacy(
  decision: Extract<BotDecision, { type: "diplomacy" }>,
  context: BotDecisionContext
): Promise<ExecutionResult> {
  const { empire, currentTurn } = context;
  const { action, targetId } = decision;

  // Map decision action to treaty type
  const treatyType: TreatyType = action === "propose_alliance" ? "alliance" : "nap";

  // Propose the treaty using the diplomacy service
  const result = await proposeTreaty(empire.id, targetId, treatyType, currentTurn);

  if (!result.success) {
    return { success: false, error: result.error ?? "Failed to propose treaty" };
  }

  return {
    success: true,
    details: `Proposed ${treatyType.toUpperCase()} treaty to ${targetId}`,
  };
}

// =============================================================================
// TRADE EXECUTOR
// =============================================================================

/**
 * Execute a trade decision.
 * Buys or sells resources on the market.
 */
async function executeTrade(
  decision: Extract<BotDecision, { type: "trade" }>,
  context: BotDecisionContext
): Promise<ExecutionResult> {
  const { empire, gameId, currentTurn } = context;
  const { resource, quantity, action } = decision;

  // Only trade food, ore, petroleum (not credits)
  if (resource === "credits") {
    return { success: false, error: "Cannot trade credits on the market" };
  }

  const tradableResource = resource as TradableResource;

  if (action === "buy") {
    const result = await executeBuyOrder(gameId, empire.id, tradableResource, quantity, currentTurn);
    if (!result.success) {
      return { success: false, error: result.error ?? "Buy order failed" };
    }
    return {
      success: true,
      details: `Bought ${quantity} ${resource} for ${result.newCredits !== undefined ? empire.credits - result.newCredits : "?"} credits`,
    };
  } else {
    const result = await executeSellOrder(gameId, empire.id, tradableResource, quantity, currentTurn);
    if (!result.success) {
      return { success: false, error: result.error ?? "Sell order failed" };
    }
    return {
      success: true,
      details: `Sold ${quantity} ${resource} for ${result.newCredits !== undefined ? result.newCredits - empire.credits : "?"} credits`,
    };
  }
}

// =============================================================================
// CRAFTING SYSTEM EXECUTORS
// =============================================================================

/**
 * Execute a craft_component decision.
 * Adds a crafting order to the queue.
 */
async function executeCraftComponent(
  decision: Extract<BotDecision, { type: "craft_component" }>,
  context: BotDecisionContext
): Promise<ExecutionResult> {
  const { empire, gameId, currentTurn } = context;
  const { resourceType, quantity } = decision;

  // Validate quantity
  if (quantity <= 0) {
    return { success: false, error: "Invalid quantity" };
  }

  // Get tier for this resource
  const tier = RESOURCE_TIERS[resourceType];
  if (!tier) {
    return { success: false, error: `Unknown resource type: ${resourceType}` };
  }

  // Get recipe from appropriate tier
  let craftingTime = 1;
  if (tier === 1 && resourceType in TIER_1_RECIPES) {
    craftingTime = TIER_1_RECIPES[resourceType as Tier1Resource].craftingTime;
  } else if (tier === 2 && resourceType in TIER_2_RECIPES) {
    craftingTime = TIER_2_RECIPES[resourceType as Tier2Resource].craftingTime;
  } else if (tier === 3 && resourceType in TIER_3_RECIPES) {
    craftingTime = TIER_3_RECIPES[resourceType as Tier3Resource].craftingTime;
  }

  // Calculate total crafting time
  const totalTime = craftingTime * quantity;

  // Get current queue size for position
  const currentQueue = await db.query.craftingQueue.findMany({
    where: eq(craftingQueue.empireId, empire.id),
  });
  const queuePosition = currentQueue.length + 1;

  // Add to crafting queue
  await db.insert(craftingQueue).values({
    empireId: empire.id,
    gameId,
    resourceType,
    quantity,
    status: "queued",
    componentsReserved: {}, // TODO: Calculate and reserve actual components
    startTurn: currentTurn,
    completionTurn: currentTurn + totalTime,
    queuePosition,
  });

  return {
    success: true,
    details: `Queued ${quantity}x ${resourceType} (${totalTime} turns)`,
  };
}

/**
 * Execute an accept_contract decision.
 * Accepts a Syndicate contract.
 */
async function executeAcceptContract(
  decision: Extract<BotDecision, { type: "accept_contract" }>,
  context: BotDecisionContext
): Promise<ExecutionResult> {
  const { empire, gameId, currentTurn } = context;
  const { contractType, targetId } = decision;

  // Get contract configuration
  const contractConfig = CONTRACT_CONFIGS[contractType];
  if (!contractConfig) {
    return { success: false, error: `Unknown contract type: ${contractType}` };
  }

  // Calculate deadline using turnsToComplete from config
  const deadline = currentTurn + contractConfig.turnsToComplete;

  // Determine reward (handle "varies" and "special" cases)
  const creditReward = typeof contractConfig.creditReward === "number"
    ? contractConfig.creditReward
    : 10000; // Default for non-numeric rewards

  // Create the contract
  await db.insert(syndicateContracts).values({
    empireId: empire.id,
    gameId,
    contractType,
    targetEmpireId: targetId || null,
    minTrustLevel: contractConfig.minTrustLevel,
    creditReward,
    trustReward: contractConfig.trustReward,
    deadlineTurn: deadline,
    status: "accepted",
    createdAtTurn: currentTurn,
    acceptedAtTurn: currentTurn,
  });

  return {
    success: true,
    details: `Accepted contract: ${contractType}${targetId ? ` targeting ${targetId}` : ""}`,
  };
}

/**
 * Execute a purchase_black_market decision.
 * Purchases an item from the Black Market.
 */
async function executePurchaseBlackMarket(
  decision: Extract<BotDecision, { type: "purchase_black_market" }>,
  context: BotDecisionContext
): Promise<ExecutionResult> {
  const { empire } = context;
  const { itemId, quantity } = decision;

  // Validate quantity
  if (quantity <= 0) {
    return { success: false, error: "Invalid quantity" };
  }

  // Black Market prices are 2x normal crafting value
  // For now, use a simplified cost calculation
  const resourceType = itemId as CraftedResource;
  const tier = RESOURCE_TIERS[resourceType];
  const baseCost = tier === 1 ? 1000 : tier === 2 ? 5000 : 20000;
  const totalCost = baseCost * quantity * 2; // 2x markup

  // Check if bot can afford it
  if (empire.credits < totalCost) {
    return {
      success: false,
      error: `Insufficient credits (need ${totalCost}, have ${empire.credits})`,
    };
  }

  // Deduct credits
  await db
    .update(empires)
    .set({
      credits: sql`${empires.credits} - ${totalCost}`,
      updatedAt: new Date(),
    })
    .where(eq(empires.id, empire.id));

  // Add purchased items to inventory
  // Check if resource already exists in inventory
  const existingInventory = await db.query.resourceInventory.findFirst({
    where: and(
      eq(resourceInventory.empireId, empire.id),
      eq(resourceInventory.resourceType, resourceType)
    ),
  });

  const tierValue = TIER_TO_ENUM[tier];

  if (existingInventory) {
    // Update existing inventory
    await db
      .update(resourceInventory)
      .set({
        quantity: existingInventory.quantity + quantity,
        updatedAt: new Date(),
      })
      .where(eq(resourceInventory.id, existingInventory.id));
  } else {
    // Insert new inventory record
    await db.insert(resourceInventory).values({
      empireId: empire.id,
      gameId: empire.gameId,
      resourceType,
      tier: tierValue,
      quantity,
    });
  }

  return {
    success: true,
    details: `Purchased ${quantity}x ${itemId} from Black Market (${totalCost} credits)`,
  };
}

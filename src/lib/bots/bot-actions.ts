/**
 * Bot Action Executors
 *
 * Executes bot decisions using existing game services.
 * Each executor maps a BotDecision to the appropriate service call.
 */

import { db } from "@/lib/db";
import { empires, buildQueue, planets, type NewPlanet, craftingQueue, syndicateContracts } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import type { BotDecision, BotDecisionContext, Forces, UnitType } from "./types";
import { calculateUnitPurchaseCost } from "@/lib/game/unit-config";
import { UNIT_BUILD_TIMES, toDbUnitType } from "@/lib/game/build-config";
import { PLANET_COSTS, PLANET_PRODUCTION } from "@/lib/game/constants";
import { calculatePlanetCost } from "@/lib/formulas/planet-costs";
import { TIER_1_RECIPES, TIER_2_RECIPES, TIER_3_RECIPES, RESOURCE_TIERS } from "@/lib/game/constants/crafting";
import type { CraftedResource, Tier1Resource, Tier2Resource, Tier3Resource } from "@/lib/game/constants/crafting";
import { CONTRACT_CONFIGS } from "@/lib/game/constants/syndicate";

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
      case "trade":
      case "do_nothing":
        // These are no-ops for M5
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
 * Creates a new planet and deducts credits.
 */
async function executeBuyPlanet(
  decision: Extract<BotDecision, { type: "buy_planet" }>,
  context: BotDecisionContext
): Promise<ExecutionResult> {
  const { empire, gameId, currentTurn } = context;
  const { planetType } = decision;

  // Calculate planet cost with scaling
  const baseCost = PLANET_COSTS[planetType];
  const totalCost = calculatePlanetCost(baseCost, empire.planetCount);

  // Check if bot can afford it
  if (empire.credits < totalCost) {
    return {
      success: false,
      error: `Insufficient credits (need ${totalCost}, have ${empire.credits})`,
    };
  }

  // Get production rate for this planet type
  const productionRate = PLANET_PRODUCTION[planetType];

  // Create the planet
  const planetData: NewPlanet = {
    empireId: empire.id,
    gameId,
    type: planetType,
    productionRate: String(productionRate),
    purchasePrice: totalCost,
    acquiredAtTurn: currentTurn,
  };

  await db.insert(planets).values(planetData);

  // Update empire: deduct credits and increment planet count
  await db
    .update(empires)
    .set({
      credits: sql`${empires.credits} - ${totalCost}`,
      planetCount: sql`${empires.planetCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(empires.id, empire.id));

  return {
    success: true,
    details: `Bought ${planetType} planet (${totalCost} credits)`,
  };
}

// =============================================================================
// ATTACK EXECUTOR
// =============================================================================

/**
 * Execute an attack decision.
 * For M5, this is a simplified attack that uses existing combat service.
 */
async function executeAttack(
  decision: Extract<BotDecision, { type: "attack" }>,
  context: BotDecisionContext
): Promise<ExecutionResult> {
  const { empire, currentTurn, protectionTurns } = context;
  const { targetId, forces } = decision;

  // Verify protection period has ended
  if (currentTurn <= protectionTurns) {
    return { success: false, error: "Still in protection period" };
  }

  // Validate forces
  const totalForces = getTotalForces(forces);
  if (totalForces === 0) {
    return { success: false, error: "No forces allocated" };
  }

  // Verify bot has enough units
  if (
    forces.soldiers > empire.soldiers ||
    forces.fighters > empire.fighters ||
    forces.lightCruisers > empire.lightCruisers ||
    forces.heavyCruisers > empire.heavyCruisers ||
    forces.carriers > empire.carriers
  ) {
    return { success: false, error: "Insufficient forces" };
  }

  // For M5, we'll just deduct the forces without full combat resolution
  // Full combat integration will use the combat-service in turn processing
  // This marks the intent to attack, actual resolution happens in combat phase

  // Deduct forces from attacker (they're committed to the attack)
  await db
    .update(empires)
    .set({
      soldiers: sql`${empires.soldiers} - ${forces.soldiers}`,
      fighters: sql`${empires.fighters} - ${forces.fighters}`,
      lightCruisers: sql`${empires.lightCruisers} - ${forces.lightCruisers}`,
      heavyCruisers: sql`${empires.heavyCruisers} - ${forces.heavyCruisers}`,
      carriers: sql`${empires.carriers} - ${forces.carriers}`,
      updatedAt: new Date(),
    })
    .where(eq(empires.id, empire.id));

  // Note: In a full implementation, we would:
  // 1. Create an attack record
  // 2. Resolve combat using combat-service
  // 3. Apply casualties to both sides
  // 4. Transfer planets if attacker wins
  // For M5, we simplify by just committing forces

  return {
    success: true,
    details: `Launched attack on ${targetId} with ${totalForces} units`,
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

  // Note: In a full implementation, we would add the purchased resources
  // to the empire's inventory. This requires the resource_inventory table update.
  // For now, we just deduct the credits.

  return {
    success: true,
    details: `Purchased ${quantity}x ${itemId} from Black Market (${totalCost} credits)`,
  };
}

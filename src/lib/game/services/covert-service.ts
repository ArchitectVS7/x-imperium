/**
 * Covert Service (M6.5)
 *
 * Game integration for covert operations. Ties together the core covert
 * logic (from lib/covert) with game state management.
 *
 * @see docs/MILESTONES.md Milestone 6.5
 * @see src/lib/covert/ for core operation logic
 */

import { db } from "@/lib/db";
import { empires, planets, type Empire } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import {
  type OperationType,
  COVERT_OPERATIONS,
  COVERT_POINTS_PER_TURN,
  MAX_COVERT_POINTS,
  AGENT_CAPACITY_PER_GOV_PLANET,
} from "@/lib/covert/constants";
import {
  executeCovertOp,
  previewCovertOp,
  previewAllOperations,
  type OperationResult,
  type CovertAttackerState,
  type CovertTargetState,
} from "@/lib/covert/operations";
import type { CivilStatusLevel } from "../constants";
import { CIVIL_STATUS_LEVELS } from "../constants";

// =============================================================================
// TYPES
// =============================================================================

export interface CovertStatus {
  /** Current covert points */
  covertPoints: number;
  /** Maximum covert points (50) */
  maxCovertPoints: number;
  /** Current agent count */
  agents: number;
  /** Maximum agent capacity (gov planets × 300) */
  agentCapacity: number;
  /** Number of government planets */
  governmentPlanets: number;
}

export interface CovertTarget {
  id: string;
  name: string;
  networth: number;
  planetCount: number;
  /** Preview success rates for all operations against this target */
  operationPreviews?: Array<{
    operationType: OperationType;
    successChance: number;
    catchChance: number;
    canExecute: boolean;
  }>;
}

export interface CovertOperationResult extends OperationResult {
  /** Updated attacker state after operation */
  newAttackerState: {
    covertPoints: number;
    agents: number;
  };
  /** Effects applied to database */
  appliedEffects: string[];
}

// =============================================================================
// COVERT STATUS
// =============================================================================

/**
 * Get the covert status for an empire.
 *
 * @param empireId - Empire UUID
 * @returns CovertStatus with points, agents, and capacity
 */
export async function getCovertStatus(
  empireId: string
): Promise<CovertStatus | null> {
  const empire = await db.query.empires.findFirst({
    where: eq(empires.id, empireId),
    with: {
      planets: true,
    },
  });

  if (!empire) return null;

  const governmentPlanets = empire.planets.filter(
    (p) => p.type === "government"
  ).length;

  return {
    covertPoints: empire.covertPoints,
    maxCovertPoints: MAX_COVERT_POINTS,
    agents: empire.covertAgents,
    agentCapacity: governmentPlanets * AGENT_CAPACITY_PER_GOV_PLANET,
    governmentPlanets,
  };
}

/**
 * Get agent capacity for an empire.
 */
export async function getAgentCapacity(empireId: string): Promise<number> {
  const govPlanets = await db.query.planets.findMany({
    where: and(eq(planets.empireId, empireId), eq(planets.type, "government")),
    columns: { id: true },
  });

  return govPlanets.length * AGENT_CAPACITY_PER_GOV_PLANET;
}

// =============================================================================
// COVERT POINT GENERATION
// =============================================================================

/**
 * Process covert point generation for an empire.
 * Called during turn processing.
 *
 * @param empireId - Empire UUID
 * @returns New covert points value
 */
export async function processCovertPointGeneration(
  empireId: string
): Promise<number> {
  const empire = await db.query.empires.findFirst({
    where: eq(empires.id, empireId),
    columns: { covertPoints: true },
  });

  if (!empire) return 0;

  const newPoints = Math.min(
    empire.covertPoints + COVERT_POINTS_PER_TURN,
    MAX_COVERT_POINTS
  );

  await db
    .update(empires)
    .set({ covertPoints: newPoints })
    .where(eq(empires.id, empireId));

  return newPoints;
}

// =============================================================================
// TARGET SELECTION
// =============================================================================

/**
 * Get available targets for covert operations.
 *
 * @param gameId - Game UUID
 * @param attackerId - Attacker's empire UUID
 * @returns List of valid targets with basic info
 */
export async function getCovertTargets(
  gameId: string,
  attackerId: string
): Promise<CovertTarget[]> {
  // Get all empires in the game except the attacker
  const allEmpires = await db.query.empires.findMany({
    where: and(
      eq(empires.gameId, gameId),
      ne(empires.id, attackerId)
    ),
    with: {
      planets: true,
    },
  });

  // Filter to alive empires only
  return allEmpires
    .filter((e) => e.planets.length > 0)
    .map((e) => ({
      id: e.id,
      name: e.name,
      networth: Number(e.networth),
      planetCount: e.planets.length,
    }));
}

/**
 * Get targets with operation previews.
 */
export async function getCovertTargetsWithPreviews(
  gameId: string,
  attackerId: string
): Promise<CovertTarget[]> {
  const attacker = await db.query.empires.findFirst({
    where: eq(empires.id, attackerId),
    with: { planets: true },
  });

  if (!attacker) return [];

  const targets = await getCovertTargets(gameId, attackerId);

  const attackerState: CovertAttackerState = {
    id: attackerId,
    agents: attacker.covertAgents,
    covertPoints: attacker.covertPoints,
  };

  // Add operation previews for each target
  return Promise.all(
    targets.map(async (target) => {
      const targetEmpire = await db.query.empires.findFirst({
        where: eq(empires.id, target.id),
        with: { planets: true },
      });

      if (!targetEmpire) return target;

      const targetState = buildTargetState(targetEmpire);
      const previews = previewAllOperations(attackerState, targetState);

      return {
        ...target,
        operationPreviews: previews.map((p) => ({
          operationType: p.operation.id,
          successChance: p.successChance,
          catchChance: p.catchChance,
          canExecute: p.canExecute,
        })),
      };
    })
  );
}

// =============================================================================
// OPERATION EXECUTION
// =============================================================================

/**
 * Execute a covert operation against a target empire.
 *
 * @param attackerId - Attacker's empire UUID
 * @param defenderId - Defender's empire UUID
 * @param operationType - Type of operation to execute
 * @returns Full operation result with database effects
 */
export async function executeCovertOperation(
  attackerId: string,
  defenderId: string,
  operationType: OperationType
): Promise<CovertOperationResult> {
  // Load attacker and defender
  const attacker = await db.query.empires.findFirst({
    where: eq(empires.id, attackerId),
    with: { planets: true },
  });

  const defender = await db.query.empires.findFirst({
    where: eq(empires.id, defenderId),
    with: { planets: true },
  });

  if (!attacker || !defender) {
    throw new Error("Empire not found");
  }

  // Build state objects
  const attackerState: CovertAttackerState = {
    id: attackerId,
    agents: attacker.covertAgents,
    covertPoints: attacker.covertPoints,
  };

  const defenderState = buildTargetState(defender);

  // Get operation definition
  const operation = COVERT_OPERATIONS[operationType];
  if (!operation) {
    throw new Error(`Unknown operation type: ${operationType}`);
  }

  // Execute operation
  const result = executeCovertOp(operation, attackerState, defenderState);

  // Apply effects to database
  const appliedEffects: string[] = [];

  // Deduct covert points from attacker
  const newCovertPoints = Math.max(0, attacker.covertPoints - result.pointsConsumed);
  await db
    .update(empires)
    .set({ covertPoints: newCovertPoints })
    .where(eq(empires.id, attackerId));
  appliedEffects.push(`Consumed ${result.pointsConsumed} covert points`);

  // Handle agent caught
  let newAgents = attacker.covertAgents;
  if (result.agentCaught) {
    newAgents = Math.max(0, attacker.covertAgents - 1);
    await db
      .update(empires)
      .set({ covertAgents: newAgents })
      .where(eq(empires.id, attackerId));
    appliedEffects.push("Lost 1 covert agent");
  }

  // Apply effects to defender if successful
  if (result.success && result.effects.length > 0) {
    await applyEffectsToDefender(defender, result.effects, appliedEffects);
  }

  return {
    ...result,
    newAttackerState: {
      covertPoints: newCovertPoints,
      agents: newAgents,
    },
    appliedEffects,
  };
}

/**
 * Preview a covert operation.
 */
export async function previewCovertOperation(
  attackerId: string,
  defenderId: string,
  operationType: OperationType
) {
  const attacker = await db.query.empires.findFirst({
    where: eq(empires.id, attackerId),
    with: { planets: true },
  });

  const defender = await db.query.empires.findFirst({
    where: eq(empires.id, defenderId),
    with: { planets: true },
  });

  if (!attacker || !defender) {
    throw new Error("Empire not found");
  }

  const attackerState: CovertAttackerState = {
    id: attackerId,
    agents: attacker.covertAgents,
    covertPoints: attacker.covertPoints,
  };

  const defenderState = buildTargetState(defender);

  return previewCovertOp(operationType, attackerState, defenderState);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build target state from empire data.
 */
function buildTargetState(
  empire: Empire & { planets: { type: string }[] }
): CovertTargetState {
  const governmentPlanets = empire.planets.filter(
    (p) => p.type === "government"
  ).length;

  // Get civil status index (0 = ecstatic, 7 = revolting)
  const civilStatusIndex = CIVIL_STATUS_LEVELS.indexOf(
    empire.civilStatus as CivilStatusLevel
  );

  return {
    id: empire.id,
    agents: empire.covertAgents,
    governmentPlanets,
    credits: empire.credits,
    food: empire.food,
    ore: empire.ore,
    petroleum: empire.petroleum,
    carriers: empire.carriers,
    planetCount: empire.planets.length,
    armyEffectiveness: Number(empire.armyEffectiveness),
    civilStatusIndex: civilStatusIndex >= 0 ? civilStatusIndex : 3, // Default to neutral
  };
}

/**
 * Apply operation effects to defender empire.
 */
async function applyEffectsToDefender(
  defender: Empire,
  effects: Array<{ type: string; value: number; description: string }>,
  appliedEffects: string[]
): Promise<void> {
  const updates: Partial<Empire> = {};

  for (const effect of effects) {
    switch (effect.type) {
      case "civil_status_reduced":
        // Worsen civil status by 1 level
        const currentIndex = CIVIL_STATUS_LEVELS.indexOf(
          defender.civilStatus as CivilStatusLevel
        );
        if (currentIndex < CIVIL_STATUS_LEVELS.length - 1) {
          updates.civilStatus = CIVIL_STATUS_LEVELS[currentIndex + 1];
          appliedEffects.push(`Civil status reduced to ${updates.civilStatus}`);
        }
        break;

      case "army_effectiveness_reduced":
        // Reduce army effectiveness
        const newEffectiveness = Math.max(
          0,
          Number(defender.armyEffectiveness) - effect.value
        );
        updates.armyEffectiveness = String(newEffectiveness);
        appliedEffects.push(
          `Army effectiveness reduced by ${effect.value}%`
        );
        break;

      case "resources_destroyed":
        // Reduce resources (already calculated in effect)
        // Note: The effect.value is total, but we need to apply proportionally
        const destructionRate = 0.15; // Average of 10-20%
        updates.credits = Math.floor(defender.credits * (1 - destructionRate));
        updates.food = Math.floor(defender.food * (1 - destructionRate));
        updates.ore = Math.floor(defender.ore * (1 - destructionRate));
        updates.petroleum = Math.floor(defender.petroleum * (1 - destructionRate));
        appliedEffects.push(`Resources reduced by ~15%`);
        break;

      case "carriers_destroyed":
        // Destroy carriers
        updates.carriers = Math.max(0, defender.carriers - effect.value);
        appliedEffects.push(`${effect.value} carriers destroyed`);
        break;

      case "credits_gained":
        // Ransom - handled by attacker update, not defender
        // This is credits for the attacker, not deducted from defender
        appliedEffects.push(effect.description);
        break;

      case "intelligence_revealed":
      case "diplomacy_revealed":
      case "messages_intercepted":
        // These are informational effects, no database changes
        appliedEffects.push(effect.description);
        break;

      case "planets_lost":
        // Major effect - would need to transfer planets
        // For now, just log it
        appliedEffects.push(effect.description);
        break;
    }
  }

  // Apply updates
  if (Object.keys(updates).length > 0) {
    await db
      .update(empires)
      .set(updates)
      .where(eq(empires.id, defender.id));
  }
}

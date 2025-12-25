/**
 * Covert Operation Execution Logic (PRD 6.8)
 *
 * Handles the execution of covert operations and their effects on empires.
 * This module ties together success calculation with effect application.
 *
 * @see docs/PRD.md Section 6.8 (Covert Operations)
 */

import {
  type OperationType,
  type CovertOperation,
  COVERT_OPERATIONS,
  canAffordOperation,
  hasEnoughAgents,
} from "./constants";

import {
  type OperationOutcome,
  type SuccessRateFactors,
  calculateSuccessRateFactors,
  executeOperation,
  previewOperation,
} from "./success-rate";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Minimal empire data needed for covert operations.
 * Avoids circular dependency with full Empire type.
 */
export interface CovertTargetState {
  /** Empire identifier */
  id: string;
  /** Current agent count */
  agents: number;
  /** Number of government planets */
  governmentPlanets: number;
  /** Current credits */
  credits: number;
  /** Current food */
  food: number;
  /** Current ore */
  ore: number;
  /** Current petroleum */
  petroleum: number;
  /** Current carrier count */
  carriers: number;
  /** Number of planets owned */
  planetCount: number;
  /** Current army effectiveness (0-100) */
  armyEffectiveness: number;
  /** Civil status level index (0 = ecstatic, 7 = revolting) */
  civilStatusIndex: number;
}

export interface CovertAttackerState {
  /** Empire identifier */
  id: string;
  /** Current agent count */
  agents: number;
  /** Current covert points */
  covertPoints: number;
}

/**
 * Effect applied to the target empire after a successful operation.
 */
export interface OperationEffect {
  /** Type of effect */
  type:
    | "intelligence_revealed"
    | "civil_status_reduced"
    | "army_effectiveness_reduced"
    | "resources_destroyed"
    | "diplomacy_revealed"
    | "credits_gained"
    | "carriers_destroyed"
    | "messages_intercepted"
    | "planets_lost";
  /** Magnitude of the effect */
  value: number;
  /** Duration in turns (if temporary) */
  duration?: number;
  /** Description for display */
  description: string;
}

/**
 * Full result of executing a covert operation.
 */
export interface OperationResult {
  /** The operation that was executed */
  operation: CovertOperation;
  /** Whether the operation succeeded */
  success: boolean;
  /** Whether an agent was caught */
  agentCaught: boolean;
  /** Covert points consumed */
  pointsConsumed: number;
  /** Effects applied (empty if failed) */
  effects: OperationEffect[];
  /** Success rate factors for debugging/display */
  factors: SuccessRateFactors;
  /** Message describing the outcome */
  message: string;
}

/**
 * Result from calculateCovertSuccess function.
 */
export interface SuccessResult {
  /** Calculated success rate (0-1) */
  successRate: number;
  /** All calculation factors */
  factors: SuccessRateFactors;
  /** Probability of agent being caught */
  catchProbability: number;
}

// =============================================================================
// EFFECT CALCULATION CONSTANTS
// =============================================================================

/** Effectiveness reduction range for demoralize_troops */
const DEMORALIZE_MIN_EFFECT = 10;
const DEMORALIZE_MAX_EFFECT = 15;
const DEMORALIZE_DURATION = 3;

/** Resource destruction range for bombing_operations */
const BOMBING_MIN_DESTRUCTION = 0.1;
const BOMBING_MAX_DESTRUCTION = 0.2;

/** Ransom range for take_hostages */
const HOSTAGE_MIN_RANSOM = 50_000;
const HOSTAGE_MAX_RANSOM = 100_000;

/** Carrier destruction range for carriers_sabotage */
const SABOTAGE_MIN_DESTRUCTION = 0.1;
const SABOTAGE_MAX_DESTRUCTION = 0.25;

/** Intelligence reveal duration for send_spy */
const SPY_INTEL_DURATION = 5;

/** Message intercept duration for communications_spying */
const INTERCEPT_DURATION = 10;

/** Planet loss percentage for setup_coup */
const COUP_PLANET_LOSS = 0.3;

// =============================================================================
// SUCCESS CALCULATION
// =============================================================================

/**
 * Calculate the success rate for a covert operation.
 *
 * Success rate is affected by (PRD 6.8):
 * - Base operation success rate
 * - Your agent count vs target's agent count
 * - Target's Government planet count
 * - Operation difficulty (risk level)
 * - Random variance (±20%)
 *
 * @param attackerAgents - Number of agents the attacker has
 * @param defenderAgents - Number of agents the defender has
 * @param defenderGovPlanets - Number of government planets the defender has
 * @param operation - The covert operation to calculate for
 * @returns Success calculation result
 */
export function calculateCovertSuccess(
  attackerAgents: number,
  defenderAgents: number,
  defenderGovPlanets: number,
  operation: CovertOperation
): SuccessResult {
  const factors = calculateSuccessRateFactors(
    operation.id,
    attackerAgents,
    defenderAgents,
    defenderGovPlanets
  );

  const preview = previewOperation(
    operation.id,
    attackerAgents,
    defenderAgents,
    defenderGovPlanets
  );

  return {
    successRate: factors.calculatedRate,
    factors,
    catchProbability: preview.catchChance,
  };
}

// =============================================================================
// EFFECT GENERATION
// =============================================================================

/**
 * Generate effects for a successful operation.
 * Effects are randomized within defined ranges.
 *
 * @param operationType - The operation that succeeded
 * @param target - Target empire state
 * @returns Array of effects to apply
 */
function generateEffects(
  operationType: OperationType,
  target: CovertTargetState
): OperationEffect[] {
  const effects: OperationEffect[] = [];

  switch (operationType) {
    case "send_spy":
      effects.push({
        type: "intelligence_revealed",
        value: 1,
        duration: SPY_INTEL_DURATION,
        description: `Intelligence on ${target.id} revealed for ${SPY_INTEL_DURATION} turns`,
      });
      break;

    case "insurgent_aid":
      effects.push({
        type: "civil_status_reduced",
        value: 1,
        description: `Civil unrest increased in ${target.id} (status reduced by 1 level)`,
      });
      break;

    case "support_dissension":
      effects.push({
        type: "civil_status_reduced",
        value: 1,
        description: `Propaganda campaign reduced civil status in ${target.id}`,
      });
      break;

    case "demoralize_troops":
      const demoralizeAmount =
        DEMORALIZE_MIN_EFFECT +
        Math.random() * (DEMORALIZE_MAX_EFFECT - DEMORALIZE_MIN_EFFECT);
      effects.push({
        type: "army_effectiveness_reduced",
        value: Math.round(demoralizeAmount),
        duration: DEMORALIZE_DURATION,
        description: `Army effectiveness reduced by ${Math.round(demoralizeAmount)}% for ${DEMORALIZE_DURATION} turns`,
      });
      break;

    case "bombing_operations":
      const destructionRate =
        BOMBING_MIN_DESTRUCTION +
        Math.random() * (BOMBING_MAX_DESTRUCTION - BOMBING_MIN_DESTRUCTION);
      const creditsDestroyed = Math.floor(target.credits * destructionRate);
      const foodDestroyed = Math.floor(target.food * destructionRate);
      const oreDestroyed = Math.floor(target.ore * destructionRate);
      const petroDestroyed = Math.floor(target.petroleum * destructionRate);

      effects.push({
        type: "resources_destroyed",
        value: creditsDestroyed + foodDestroyed + oreDestroyed + petroDestroyed,
        description: `Bombing destroyed ${Math.round(destructionRate * 100)}% of stored resources`,
      });
      break;

    case "relations_spying":
      effects.push({
        type: "diplomacy_revealed",
        value: 1,
        description: `Diplomatic relations of ${target.id} have been revealed`,
      });
      break;

    case "take_hostages":
      const ransom =
        HOSTAGE_MIN_RANSOM +
        Math.random() * (HOSTAGE_MAX_RANSOM - HOSTAGE_MIN_RANSOM);
      effects.push({
        type: "credits_gained",
        value: Math.floor(ransom),
        description: `Ransom of ${Math.floor(ransom).toLocaleString()} credits obtained`,
      });
      break;

    case "carriers_sabotage":
      const sabotageRate =
        SABOTAGE_MIN_DESTRUCTION +
        Math.random() * (SABOTAGE_MAX_DESTRUCTION - SABOTAGE_MIN_DESTRUCTION);
      const carriersDestroyed = Math.floor(target.carriers * sabotageRate);
      effects.push({
        type: "carriers_destroyed",
        value: carriersDestroyed,
        description: `Sabotage destroyed ${carriersDestroyed} carriers (${Math.round(sabotageRate * 100)}% of fleet)`,
      });
      break;

    case "communications_spying":
      effects.push({
        type: "messages_intercepted",
        value: 1,
        duration: INTERCEPT_DURATION,
        description: `Communications intercepted for ${INTERCEPT_DURATION} turns`,
      });
      break;

    case "setup_coup":
      const planetsLost = Math.floor(target.planetCount * COUP_PLANET_LOSS);
      effects.push({
        type: "planets_lost",
        value: planetsLost,
        description: `Coup succeeded! ${target.id} lost ${planetsLost} planets (${Math.round(COUP_PLANET_LOSS * 100)}%)`,
      });
      break;
  }

  return effects;
}

// =============================================================================
// OPERATION EXECUTION
// =============================================================================

/**
 * Execute a covert operation against a target empire.
 *
 * This function:
 * 1. Validates the operation can be performed
 * 2. Calculates success rate based on agent counts and government planets
 * 3. Rolls for success and agent detection
 * 4. Generates effects if successful
 *
 * @param operation - The operation to execute
 * @param attacker - Attacker's state
 * @param defender - Defender's state
 * @param successRoll - Optional fixed roll for testing (0-1)
 * @param detectionRoll - Optional fixed roll for testing (0-1)
 * @returns Full operation result
 */
export function executeCovertOp(
  operation: CovertOperation,
  attacker: CovertAttackerState,
  defender: CovertTargetState,
  successRoll?: number,
  detectionRoll?: number
): OperationResult {
  // Validate operation can be performed
  if (!canAffordOperation(operation.id, attacker.covertPoints)) {
    return {
      operation,
      success: false,
      agentCaught: false,
      pointsConsumed: 0,
      effects: [],
      factors: calculateSuccessRateFactors(
        operation.id,
        attacker.agents,
        defender.agents,
        defender.governmentPlanets
      ),
      message: `Insufficient covert points (need ${operation.cost}, have ${attacker.covertPoints})`,
    };
  }

  if (!hasEnoughAgents(operation.id, attacker.agents)) {
    return {
      operation,
      success: false,
      agentCaught: false,
      pointsConsumed: 0,
      effects: [],
      factors: calculateSuccessRateFactors(
        operation.id,
        attacker.agents,
        defender.agents,
        defender.governmentPlanets
      ),
      message: `Insufficient agents (need ${operation.minAgents}, have ${attacker.agents})`,
    };
  }

  // Execute the operation
  const outcome: OperationOutcome = executeOperation(
    operation.id,
    attacker.agents,
    defender.agents,
    defender.governmentPlanets,
    successRoll,
    detectionRoll
  );

  const factors = calculateSuccessRateFactors(
    operation.id,
    attacker.agents,
    defender.agents,
    defender.governmentPlanets
  );

  // Generate effects if successful
  const effects = outcome.success ? generateEffects(operation.id, defender) : [];

  // Build result message
  let message: string;
  if (outcome.success) {
    if (outcome.agentCaught) {
      message = `${operation.name} succeeded, but an agent was caught!`;
    } else {
      message = `${operation.name} succeeded!`;
    }
  } else {
    if (outcome.agentCaught) {
      message = `${operation.name} failed and an agent was caught!`;
    } else {
      message = `${operation.name} failed.`;
    }
  }

  return {
    operation,
    success: outcome.success,
    agentCaught: outcome.agentCaught,
    pointsConsumed: operation.cost,
    effects,
    factors,
    message,
  };
}

/**
 * Preview an operation without executing it.
 * Returns probabilities and potential effects.
 *
 * @param operationType - Operation to preview
 * @param attacker - Attacker's state
 * @param defender - Defender's state
 * @returns Preview information
 */
export function previewCovertOp(
  operationType: OperationType,
  attacker: CovertAttackerState,
  defender: CovertTargetState
): {
  operation: CovertOperation;
  canExecute: boolean;
  cannotExecuteReason?: string;
  successChance: number;
  catchChance: number;
  factors: SuccessRateFactors;
  potentialEffects: string[];
} {
  const operation = COVERT_OPERATIONS[operationType];

  // Check if can execute
  let canExecute = true;
  let cannotExecuteReason: string | undefined;

  if (!canAffordOperation(operationType, attacker.covertPoints)) {
    canExecute = false;
    cannotExecuteReason = `Need ${operation.cost} covert points (have ${attacker.covertPoints})`;
  } else if (!hasEnoughAgents(operationType, attacker.agents)) {
    canExecute = false;
    cannotExecuteReason = `Need ${operation.minAgents} agents (have ${attacker.agents})`;
  }

  // Get success/catch chances
  const preview = previewOperation(
    operationType,
    attacker.agents,
    defender.agents,
    defender.governmentPlanets
  );

  // Generate potential effect descriptions
  const potentialEffects: string[] = [];
  switch (operationType) {
    case "send_spy":
      potentialEffects.push(`Reveal intelligence for ${SPY_INTEL_DURATION} turns`);
      break;
    case "insurgent_aid":
    case "support_dissension":
      potentialEffects.push("Reduce civil status by 1 level");
      break;
    case "demoralize_troops":
      potentialEffects.push(
        `Reduce army effectiveness by ${DEMORALIZE_MIN_EFFECT}-${DEMORALIZE_MAX_EFFECT}%`
      );
      break;
    case "bombing_operations":
      potentialEffects.push(
        `Destroy ${Math.round(BOMBING_MIN_DESTRUCTION * 100)}-${Math.round(BOMBING_MAX_DESTRUCTION * 100)}% of stored resources`
      );
      break;
    case "relations_spying":
      potentialEffects.push("Reveal all diplomatic relations");
      break;
    case "take_hostages":
      potentialEffects.push(
        `Gain ${HOSTAGE_MIN_RANSOM.toLocaleString()}-${HOSTAGE_MAX_RANSOM.toLocaleString()} credits`
      );
      break;
    case "carriers_sabotage":
      potentialEffects.push(
        `Destroy ${Math.round(SABOTAGE_MIN_DESTRUCTION * 100)}-${Math.round(SABOTAGE_MAX_DESTRUCTION * 100)}% of carriers`
      );
      break;
    case "communications_spying":
      potentialEffects.push(`Intercept messages for ${INTERCEPT_DURATION} turns`);
      break;
    case "setup_coup":
      potentialEffects.push(`Target loses ${Math.round(COUP_PLANET_LOSS * 100)}% of planets`);
      break;
  }

  return {
    operation,
    canExecute,
    cannotExecuteReason,
    successChance: preview.successChance,
    catchChance: preview.catchChance,
    factors: preview.factors,
    potentialEffects,
  };
}

/**
 * Get all operations an attacker can currently execute.
 *
 * @param attacker - Attacker's state
 * @returns List of executable operations
 */
export function getExecutableOperations(
  attacker: CovertAttackerState
): CovertOperation[] {
  return Object.values(COVERT_OPERATIONS).filter(
    (op) =>
      canAffordOperation(op.id, attacker.covertPoints) &&
      hasEnoughAgents(op.id, attacker.agents)
  );
}

/**
 * Batch preview all operations against a target.
 *
 * @param attacker - Attacker's state
 * @param defender - Defender's state
 * @returns Array of previews for all operations
 */
export function previewAllOperations(
  attacker: CovertAttackerState,
  defender: CovertTargetState
): ReturnType<typeof previewCovertOp>[] {
  return Object.keys(COVERT_OPERATIONS).map((opType) =>
    previewCovertOp(opType as OperationType, attacker, defender)
  );
}

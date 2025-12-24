/**
 * Covert Operation Success Rate Calculation (PRD 6.8)
 *
 * Success rate is affected by:
 * - Base operation success rate
 * - Your agent count vs target's agent count
 * - Target's Government planet count
 * - Operation difficulty (risk level)
 * - Random variance (±20%)
 */

import {
  type OperationType,
  COVERT_OPERATIONS,
  RISK_SUCCESS_MODIFIER,
  RISK_DETECTION_MULTIPLIER,
  SUCCESS_RATE_VARIANCE,
  AGENT_CAPACITY_PER_GOV_PLANET,
} from "./constants";

// =============================================================================
// TYPES
// =============================================================================

export interface SuccessRateFactors {
  /** Base success rate from operation definition */
  baseRate: number;
  /** Modifier from agent ratio (your agents / their agents) */
  agentRatioModifier: number;
  /** Modifier from target's government planets (more = harder) */
  governmentModifier: number;
  /** Modifier from operation risk level */
  riskModifier: number;
  /** Final calculated rate before variance */
  calculatedRate: number;
  /** Minimum possible rate after variance */
  minRate: number;
  /** Maximum possible rate after variance */
  maxRate: number;
}

export interface OperationOutcome {
  /** Whether the operation succeeded */
  success: boolean;
  /** Whether the agent was caught */
  agentCaught: boolean;
  /** Random roll (0-1) for deterministic testing */
  roll: number;
  /** Effective success rate used */
  effectiveRate: number;
  /** Detection rate used */
  detectionRate: number;
}

// =============================================================================
// SUCCESS RATE CALCULATION
// =============================================================================

/**
 * Calculate the agent ratio modifier.
 * Having more agents than the target improves success rate.
 *
 * Formula: min(1.5, max(0.5, yourAgents / theirAgents))
 */
export function calculateAgentRatioModifier(
  yourAgents: number,
  theirAgents: number
): number {
  if (theirAgents <= 0) {
    return 1.5; // Max bonus if target has no agents
  }
  if (yourAgents <= 0) {
    return 0.5; // Min if you have no agents
  }

  const ratio = yourAgents / theirAgents;
  return Math.min(1.5, Math.max(0.5, ratio));
}

/**
 * Calculate the government planet modifier.
 * More government planets = better counter-intelligence = lower success.
 *
 * Formula: 1.0 - (govPlanets * 0.05), min 0.5
 */
export function calculateGovernmentModifier(governmentPlanets: number): number {
  const penalty = governmentPlanets * 0.05;
  return Math.max(0.5, 1.0 - penalty);
}

/**
 * Calculate all success rate factors for an operation.
 */
export function calculateSuccessRateFactors(
  operationId: OperationType,
  yourAgents: number,
  theirAgents: number,
  theirGovernmentPlanets: number
): SuccessRateFactors {
  const operation = COVERT_OPERATIONS[operationId];

  const baseRate = operation.baseSuccessRate;
  const agentRatioModifier = calculateAgentRatioModifier(yourAgents, theirAgents);
  const governmentModifier = calculateGovernmentModifier(theirGovernmentPlanets);
  const riskModifier = RISK_SUCCESS_MODIFIER[operation.risk];

  // Calculate final rate (capped at 0.95 max, 0.05 min)
  const rawRate = baseRate * agentRatioModifier * governmentModifier * riskModifier;
  const calculatedRate = Math.min(0.95, Math.max(0.05, rawRate));

  // Calculate variance bounds
  const minRate = Math.max(0, calculatedRate * (1 - SUCCESS_RATE_VARIANCE));
  const maxRate = Math.min(1, calculatedRate * (1 + SUCCESS_RATE_VARIANCE));

  return {
    baseRate,
    agentRatioModifier,
    governmentModifier,
    riskModifier,
    calculatedRate,
    minRate,
    maxRate,
  };
}

/**
 * Calculate the final success rate with variance applied.
 *
 * @param factors - Pre-calculated rate factors
 * @param randomValue - Random value (0-1) for variance. Uses Math.random() if not provided.
 * @returns Final success rate with variance applied
 */
export function applyVariance(
  factors: SuccessRateFactors,
  randomValue?: number
): number {
  const random = randomValue ?? Math.random();
  const range = factors.maxRate - factors.minRate;
  return factors.minRate + (random * range);
}

/**
 * Calculate the detection rate for an operation.
 * Based on risk level and target's counter-intelligence capability.
 */
export function calculateDetectionRate(
  operationId: OperationType,
  theirAgents: number,
  theirGovernmentPlanets: number
): number {
  const operation = COVERT_OPERATIONS[operationId];
  const baseDetection = RISK_DETECTION_MULTIPLIER[operation.risk];

  // Target's counter-intelligence improves detection
  const agentCapacity = theirGovernmentPlanets * AGENT_CAPACITY_PER_GOV_PLANET;
  const counterIntelBonus = theirAgents > 0 ? Math.min(0.3, theirAgents / agentCapacity) : 0;

  return Math.min(0.9, baseDetection + counterIntelBonus);
}

// =============================================================================
// OPERATION EXECUTION
// =============================================================================

/**
 * Execute a covert operation and determine outcome.
 *
 * @param operationId - The operation to execute
 * @param yourAgents - Your agent count
 * @param theirAgents - Target's agent count
 * @param theirGovernmentPlanets - Target's government planet count
 * @param successRoll - Optional fixed roll for success (0-1)
 * @param detectionRoll - Optional fixed roll for detection (0-1)
 * @returns Operation outcome
 */
export function executeOperation(
  operationId: OperationType,
  yourAgents: number,
  theirAgents: number,
  theirGovernmentPlanets: number,
  successRoll?: number,
  detectionRoll?: number
): OperationOutcome {
  // Calculate success rate
  const factors = calculateSuccessRateFactors(
    operationId,
    yourAgents,
    theirAgents,
    theirGovernmentPlanets
  );
  const effectiveRate = applyVariance(factors, successRoll);

  // Calculate detection rate
  const detectionRate = calculateDetectionRate(
    operationId,
    theirAgents,
    theirGovernmentPlanets
  );

  // Roll for success
  const roll = successRoll ?? Math.random();
  const success = roll < effectiveRate;

  // Roll for agent caught (only on failure, or small chance on success)
  const detectRoll = detectionRoll ?? Math.random();
  let agentCaught = false;

  if (!success) {
    // Failed operations have higher catch rate
    agentCaught = detectRoll < detectionRate;
  } else {
    // Even successful operations have small catch chance
    agentCaught = detectRoll < (detectionRate * 0.2);
  }

  return {
    success,
    agentCaught,
    roll,
    effectiveRate,
    detectionRate,
  };
}

/**
 * Simulate operation outcome for preview (doesn't use randomness).
 * Returns probability estimates.
 */
export function previewOperation(
  operationId: OperationType,
  yourAgents: number,
  theirAgents: number,
  theirGovernmentPlanets: number
): {
  successChance: number;
  catchChance: number;
  factors: SuccessRateFactors;
} {
  const factors = calculateSuccessRateFactors(
    operationId,
    yourAgents,
    theirAgents,
    theirGovernmentPlanets
  );

  const detectionRate = calculateDetectionRate(
    operationId,
    theirAgents,
    theirGovernmentPlanets
  );

  // Weighted catch chance: higher on failure, low on success
  const failureWeight = 1 - factors.calculatedRate;
  const successWeight = factors.calculatedRate;
  const catchChance = (failureWeight * detectionRate) + (successWeight * detectionRate * 0.2);

  return {
    successChance: factors.calculatedRate,
    catchChance,
    factors,
  };
}

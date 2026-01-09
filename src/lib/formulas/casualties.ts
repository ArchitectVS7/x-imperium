/**
 * Casualty Calculation (PRD 6.2)
 *
 * Calculates combat losses based on power ratio.
 * - Base loss rate: 25%
 * - Punish bad attacks: +10% if power ratio > 2
 * - Reward overwhelming force: -10% if power ratio < 0.5
 * - Random variance: 0.8 to 1.2 multiplier
 */

// =============================================================================
// CONSTANTS (PRD 6.2)
// =============================================================================

/** Base casualty rate (25%) */
export const CASUALTY_BASE_RATE = 0.25;

/** Minimum casualty rate (15% - overwhelming force) */
export const CASUALTY_MIN_RATE = 0.15;

/** Maximum casualty rate (35% - bad attack) */
export const CASUALTY_MAX_RATE = 0.35;

/** Rate adjustment when attacking a superior force */
export const CASUALTY_BAD_ATTACK_PENALTY = 0.1;

/** Rate reduction when attacking a weaker force */
export const CASUALTY_OVERWHELMING_BONUS = 0.1;

/** Power ratio threshold for bad attack penalty */
export const BAD_ATTACK_THRESHOLD = 2.0;

/** Power ratio threshold for overwhelming force bonus */
export const OVERWHELMING_THRESHOLD = 0.5;

/** Minimum variance multiplier */
export const VARIANCE_MIN = 0.8;

/** Maximum variance multiplier */
export const VARIANCE_MAX = 1.2;

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Calculate the loss rate based on the power ratio between defense and attack.
 *
 * Formula (PRD 6.2):
 * - Base rate: 25%
 * - If powerRatio > 2: +10% (max 35%)
 * - If powerRatio < 0.5: -10% (min 15%)
 *
 * @param attackPower - The attacking force's combat power
 * @param defensePower - The defending force's combat power
 * @returns Loss rate as a decimal (0.15 to 0.35)
 */
export function calculateLossRate(
  attackPower: number,
  defensePower: number
): number {
  // Handle edge cases
  if (attackPower <= 0) {
    return CASUALTY_MAX_RATE;
  }
  if (defensePower <= 0) {
    return CASUALTY_MIN_RATE;
  }

  const powerRatio = defensePower / attackPower;
  let lossRate = CASUALTY_BASE_RATE;

  // Punish attacking a superior force
  if (powerRatio > BAD_ATTACK_THRESHOLD) {
    lossRate += CASUALTY_BAD_ATTACK_PENALTY;
  }

  // Reward overwhelming force
  if (powerRatio < OVERWHELMING_THRESHOLD) {
    lossRate -= CASUALTY_OVERWHELMING_BONUS;
  }

  // Clamp to min/max bounds
  return Math.max(CASUALTY_MIN_RATE, Math.min(CASUALTY_MAX_RATE, lossRate));
}

/**
 * Generate a variance multiplier for casualty calculations.
 * Adds randomness to combat outcomes.
 *
 * For reproducible results in deterministic game simulation, pass a value
 * from a seeded RNG (e.g., createTurnBasedRng or createSeededRandom from
 * `@/lib/utils/seeded-rng`).
 *
 * @param randomValue - Optional random value (0-1) for deterministic testing.
 *                      If not provided, uses Math.random().
 *                      For reproducible combat, pass a value from a seeded RNG.
 * @returns Variance multiplier (0.8 to 1.2)
 *
 * @example
 * // Using seeded RNG for reproducible combat
 * import { createTurnBasedRng } from "@/lib/utils/seeded-rng";
 * const rng = createTurnBasedRng(gameId, turn, "combat");
 * const variance = calculateVariance(rng());
 */
export function calculateVariance(randomValue?: number): number {
  const random = randomValue ?? Math.random();
  const range = VARIANCE_MAX - VARIANCE_MIN;
  return VARIANCE_MIN + random * range;
}

/**
 * Calculate the number of casualties for a given unit count.
 *
 * Formula (PRD 6.2):
 * casualties = floor(units * lossRate * variance)
 *
 * @param units - Number of units in combat
 * @param lossRate - Loss rate (typically from calculateLossRate)
 * @param variance - Variance multiplier (typically from calculateVariance)
 * @returns Number of units lost (integer, >= 0)
 */
export function calculateCasualties(
  units: number,
  lossRate: number,
  variance: number = 1.0
): number {
  if (units <= 0 || lossRate <= 0) {
    return 0;
  }

  const casualties = Math.floor(units * lossRate * variance);
  return Math.min(casualties, units); // Can't lose more than you have
}

/**
 * Calculate casualties for a combat engagement.
 * Combines loss rate calculation and variance for a complete result.
 *
 * For reproducible results in deterministic game simulation, pass a value
 * from a seeded RNG (e.g., createTurnBasedRng or createSeededRandom from
 * `@/lib/utils/seeded-rng`).
 *
 * @param units - Number of units in combat
 * @param attackPower - Attacking force's combat power
 * @param defensePower - Defending force's combat power
 * @param randomValue - Optional random value (0-1) for deterministic testing.
 *                      For reproducible combat, pass a value from a seeded RNG.
 * @returns Number of units lost
 *
 * @example
 * // Using seeded RNG for reproducible combat
 * import { createTurnBasedRng } from "@/lib/utils/seeded-rng";
 * const rng = createTurnBasedRng(gameId, turn, "casualties");
 * const losses = calculateCombatCasualties(units, attackPower, defPower, rng());
 */
export function calculateCombatCasualties(
  units: number,
  attackPower: number,
  defensePower: number,
  randomValue?: number
): number {
  const lossRate = calculateLossRate(attackPower, defensePower);
  const variance = calculateVariance(randomValue);
  return calculateCasualties(units, lossRate, variance);
}

/**
 * Calculate retreat casualties (PRD 6.4).
 * Retreating forces suffer 15% "attack of opportunity" losses.
 *
 * @param units - Number of retreating units
 * @returns Number of units lost during retreat
 */
export const RETREAT_CASUALTY_RATE = 0.15;

export function calculateRetreatCasualties(units: number): number {
  if (units <= 0) {
    return 0;
  }
  return Math.floor(units * RETREAT_CASUALTY_RATE);
}

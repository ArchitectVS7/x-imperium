/**
 * Army Effectiveness Calculation (PRD 6.5)
 *
 * Army effectiveness is a 0-100% rating that affects combat damage.
 * - Recovery: +2% per turn
 * - Victory bonus: +5-10%
 * - Defeat penalty: -5%
 * - Unpaid penalty: Drops if maintenance not met
 */

// =============================================================================
// CONSTANTS (PRD 6.5)
// =============================================================================

/** Maximum effectiveness rating */
export const EFFECTIVENESS_MAX = 100;

/** Minimum effectiveness rating */
export const EFFECTIVENESS_MIN = 0;

/** Default starting effectiveness */
export const EFFECTIVENESS_DEFAULT = 85;

/** Effectiveness recovery per turn */
export const EFFECTIVENESS_RECOVERY_RATE = 2;

/** Effectiveness bonus for victory (minimum) */
export const EFFECTIVENESS_VICTORY_BONUS_MIN = 5;

/** Effectiveness bonus for victory (maximum) */
export const EFFECTIVENESS_VICTORY_BONUS_MAX = 10;

/** Effectiveness penalty for defeat */
export const EFFECTIVENESS_DEFEAT_PENALTY = 5;

/** Effectiveness penalty for unpaid maintenance (per turn) */
export const EFFECTIVENESS_UNPAID_PENALTY = 10;

// =============================================================================
// TYPES
// =============================================================================

export type CombatOutcome = "victory" | "defeat" | "draw";

export interface EffectivenessEvent {
  type: "combat" | "recovery" | "maintenance_unpaid" | "custom";
  outcome?: CombatOutcome;
  customValue?: number;
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Clamp effectiveness to valid bounds (0-100).
 *
 * @param effectiveness - Raw effectiveness value
 * @returns Clamped effectiveness (0-100)
 */
export function clampEffectiveness(effectiveness: number): number {
  return Math.max(EFFECTIVENESS_MIN, Math.min(EFFECTIVENESS_MAX, effectiveness));
}

/**
 * Calculate the effectiveness change from a combat outcome.
 *
 * For reproducible results in deterministic game simulation, pass a value
 * from a seeded RNG (e.g., createTurnBasedRng or createSeededRandom from
 * `@/lib/utils/seeded-rng`).
 *
 * @param outcome - The combat result
 * @param randomValue - Optional random value (0-1) for deterministic testing.
 *                      For reproducible results, pass a value from a seeded RNG.
 * @returns Change in effectiveness (positive or negative)
 *
 * @example
 * // Using seeded RNG for reproducible effectiveness changes
 * import { createTurnBasedRng } from "@/lib/utils/seeded-rng";
 * const rng = createTurnBasedRng(gameId, turn, "effectiveness");
 * const change = calculateCombatEffectivenessChange("victory", rng());
 */
export function calculateCombatEffectivenessChange(
  outcome: CombatOutcome,
  randomValue?: number
): number {
  switch (outcome) {
    case "victory": {
      const random = randomValue ?? Math.random();
      const range = EFFECTIVENESS_VICTORY_BONUS_MAX - EFFECTIVENESS_VICTORY_BONUS_MIN + 1;
      // Clamp random to [0, 1) to ensure we stay in range
      const clampedRandom = Math.min(random, 0.9999);
      return EFFECTIVENESS_VICTORY_BONUS_MIN + Math.floor(clampedRandom * range);
    }
    case "defeat":
      return -EFFECTIVENESS_DEFEAT_PENALTY;
    case "draw":
      return 0;
    default:
      return 0;
  }
}

/**
 * Apply natural recovery to effectiveness each turn.
 *
 * @param currentEffectiveness - Current effectiveness rating
 * @returns New effectiveness after recovery
 */
export function applyEffectivenessRecovery(currentEffectiveness: number): number {
  const newEffectiveness = currentEffectiveness + EFFECTIVENESS_RECOVERY_RATE;
  return clampEffectiveness(newEffectiveness);
}

/**
 * Apply maintenance unpaid penalty to effectiveness.
 *
 * @param currentEffectiveness - Current effectiveness rating
 * @returns New effectiveness after penalty
 */
export function applyMaintenancePenalty(currentEffectiveness: number): number {
  const newEffectiveness = currentEffectiveness - EFFECTIVENESS_UNPAID_PENALTY;
  return clampEffectiveness(newEffectiveness);
}

/**
 * Update effectiveness based on an event.
 *
 * For reproducible results in deterministic game simulation, pass a value
 * from a seeded RNG (e.g., createTurnBasedRng or createSeededRandom from
 * `@/lib/utils/seeded-rng`).
 *
 * @param currentEffectiveness - Current effectiveness rating
 * @param event - The event causing the change
 * @param randomValue - Optional random value (0-1) for deterministic testing.
 *                      For reproducible results, pass a value from a seeded RNG.
 * @returns New effectiveness rating
 *
 * @example
 * // Using seeded RNG for reproducible effectiveness updates
 * import { createTurnBasedRng } from "@/lib/utils/seeded-rng";
 * const rng = createTurnBasedRng(gameId, turn, "effectiveness");
 * const newEff = updateEffectiveness(85, { type: "combat", outcome: "victory" }, rng());
 */
export function updateEffectiveness(
  currentEffectiveness: number,
  event: EffectivenessEvent,
  randomValue?: number
): number {
  let change = 0;

  switch (event.type) {
    case "combat":
      if (event.outcome) {
        change = calculateCombatEffectivenessChange(event.outcome, randomValue);
      }
      break;
    case "recovery":
      change = EFFECTIVENESS_RECOVERY_RATE;
      break;
    case "maintenance_unpaid":
      change = -EFFECTIVENESS_UNPAID_PENALTY;
      break;
    case "custom":
      change = event.customValue ?? 0;
      break;
  }

  return clampEffectiveness(currentEffectiveness + change);
}

/**
 * Calculate the combat damage modifier based on effectiveness.
 * Effectiveness directly scales damage dealt.
 *
 * @param effectiveness - Current effectiveness rating (0-100)
 * @returns Damage multiplier (0.0 to 1.0)
 */
export function calculateCombatModifier(effectiveness: number): number {
  const clamped = clampEffectiveness(effectiveness);
  return clamped / 100;
}

/**
 * Calculate effective combat power with effectiveness applied.
 *
 * @param basePower - Base combat power
 * @param effectiveness - Current effectiveness rating
 * @returns Effective combat power
 */
export function calculateEffectivePower(
  basePower: number,
  effectiveness: number
): number {
  const modifier = calculateCombatModifier(effectiveness);
  return basePower * modifier;
}

/**
 * Calculate turns needed to recover to a target effectiveness.
 *
 * @param currentEffectiveness - Current effectiveness rating
 * @param targetEffectiveness - Target effectiveness rating
 * @returns Number of turns needed (0 if already at or above target)
 */
export function calculateRecoveryTurns(
  currentEffectiveness: number,
  targetEffectiveness: number
): number {
  if (currentEffectiveness >= targetEffectiveness) {
    return 0;
  }

  const difference = targetEffectiveness - currentEffectiveness;
  return Math.ceil(difference / EFFECTIVENESS_RECOVERY_RATE);
}

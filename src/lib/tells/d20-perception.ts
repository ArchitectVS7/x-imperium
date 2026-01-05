/**
 * D20 Perception System
 *
 * Implements hidden D20-based perception checks for tell interpretation.
 * Players don't see dice rolls - they only see filtered results.
 *
 * The system uses:
 * - Intel level as base perception modifier
 * - Research bonuses from covert tech tree
 * - Bot's CMD stat for deception ability
 * - Bot's DOC stat for psychological resistance
 * - Archetype-specific DC modifiers
 */

import type { ArchetypeName } from "@/lib/bots/archetypes/types";
import {
  type IntelLevel,
  type PerceptionCheckInput,
  type PerceptionCheckResult,
  type TellType,
  INTEL_MODIFIERS,
  ARCHETYPE_DECEPTION_DC,
} from "./types";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Base DC for deception checks */
const BASE_DECEPTION_DC = 10;

/** Base perception value for player */
const BASE_PERCEPTION = 10;

/** Maximum perception bonus from research */
const MAX_RESEARCH_BONUS = 5;

/** CMD stat weight in DC calculation */
const CMD_WEIGHT = 1.0;

/** DOC stat weight in DC calculation (lower than CMD) */
const DOC_WEIGHT = 0.5;

// =============================================================================
// D20 ROLLS
// =============================================================================

/**
 * Rolls a d20 (1-20).
 * Can be seeded for testing.
 *
 * @param seed - Optional seed for deterministic testing
 * @returns A number between 1 and 20
 */
export function rollD20(seed?: number): number {
  if (seed !== undefined) {
    // Simple seeded random for testing
    const x = Math.sin(seed) * 10000;
    return Math.floor((x - Math.floor(x)) * 20) + 1;
  }
  return Math.floor(Math.random() * 20) + 1;
}

// =============================================================================
// PERCEPTION CALCULATION
// =============================================================================

/**
 * Calculates player's total perception value.
 *
 * Formula: Base (10) + Intel Modifier + Research Bonus + d20 roll
 *
 * @param intelLevel - Player's intel level on target empire
 * @param researchBonus - Bonus from covert tech tree (0-5)
 * @param roll - The d20 roll result
 * @returns Total perception value
 */
export function calculatePlayerPerception(
  intelLevel: IntelLevel,
  researchBonus: number = 0,
  roll: number = 10 // Default to average roll
): number {
  const intelMod = INTEL_MODIFIERS[intelLevel];
  const clampedResearch = Math.min(researchBonus, MAX_RESEARCH_BONUS);

  return BASE_PERCEPTION + intelMod + clampedResearch + roll;
}

/**
 * Calculates bot's deception DC (difficulty class).
 *
 * Formula: Base (10) + CMD + (DOC / 2) + Archetype Modifier
 *
 * @param archetype - Bot's archetype
 * @param cmd - Bot's CMD stat (default 10)
 * @param doc - Bot's DOC stat (default 10)
 * @returns Deception DC
 */
export function calculateDeceptionDC(
  archetype: ArchetypeName,
  cmd: number = 10,
  doc: number = 10
): number {
  const archetypeMod = ARCHETYPE_DECEPTION_DC[archetype];

  // CMD directly affects deception ability
  const cmdBonus = Math.floor((cmd - 10) * CMD_WEIGHT);

  // DOC provides some psychological resistance (harder to read)
  const docBonus = Math.floor((doc - 10) * DOC_WEIGHT);

  return BASE_DECEPTION_DC + cmdBonus + docBonus + archetypeMod;
}

/**
 * Gets the static perception threshold (no roll, for display purposes).
 * Used when we need to determine if player CAN see through bluffs
 * without random variation.
 *
 * @param intelLevel - Player's intel level
 * @param researchBonus - Research bonus
 * @returns Static perception value (assuming average roll of 10)
 */
export function getStaticPerception(
  intelLevel: IntelLevel,
  researchBonus: number = 0
): number {
  return calculatePlayerPerception(intelLevel, researchBonus, 10);
}

// =============================================================================
// PERCEPTION CHECK
// =============================================================================

/**
 * Performs a hidden perception check to determine if player sees through a bluff.
 *
 * This check is invisible to the player - they only see the results.
 *
 * @param input - Perception check input parameters
 * @returns Perception check result
 */
export function performPerceptionCheck(
  input: PerceptionCheckInput
): PerceptionCheckResult {
  const {
    intelLevel,
    researchBonus = 0,
    tell,
    botArchetype,
    botCMD = 10,
    botDOC = 10,
  } = input;

  // Roll d20 for player (hidden)
  const roll = rollD20();

  // Calculate player's perception
  const playerPerception = calculatePlayerPerception(intelLevel, researchBonus, roll);

  // Calculate bot's deception DC
  const deceptionDC = calculateDeceptionDC(botArchetype, botCMD, botDOC);

  // Check succeeds if perception >= DC
  const success = playerPerception >= deceptionDC;

  // Determine result
  const wasBluff = tell.isBluff;
  let revealedType: TellType | undefined;

  if (wasBluff && success) {
    // Player saw through the bluff - reveal true intention
    revealedType = tell.trueIntention;
  }

  return {
    playerPerception,
    deceptionDC,
    success,
    wasBluff,
    revealedType: revealedType as PerceptionCheckResult["revealedType"],
  };
}

/**
 * Quick check if player would typically see through bluffs at this intel level.
 * Uses average roll (10) for estimation.
 *
 * @param intelLevel - Player's intel level
 * @param archetype - Bot's archetype
 * @param researchBonus - Research bonus
 * @returns Probability of success (0-1)
 */
export function estimatePerceptionSuccess(
  intelLevel: IntelLevel,
  archetype: ArchetypeName,
  researchBonus: number = 0
): number {
  const staticPerception = getStaticPerception(intelLevel, researchBonus);
  const deceptionDC = calculateDeceptionDC(archetype);

  // Need to roll at least (DC - static perception + 10) on d20
  // to succeed (since static perception assumes roll of 10)
  const requiredRoll = deceptionDC - staticPerception + 10;

  if (requiredRoll <= 1) {
    return 1.0; // Always succeed
  }
  if (requiredRoll > 20) {
    return 0.0; // Always fail
  }

  // Probability = (21 - requiredRoll) / 20
  return (21 - requiredRoll) / 20;
}

// =============================================================================
// INTEL LEVEL HELPERS
// =============================================================================

/**
 * Determines the minimum intel level needed to have a chance at perceiving bluffs
 * from a given archetype.
 *
 * @param archetype - Bot's archetype
 * @returns Minimum intel level needed
 */
export function getMinimumIntelForPerception(
  archetype: ArchetypeName
): IntelLevel {
  const dc = calculateDeceptionDC(archetype);

  // Check each intel level (ascending)
  const levels: IntelLevel[] = ["unknown", "basic", "moderate", "full"];

  for (const level of levels) {
    const perception = getStaticPerception(level);
    // If average perception can beat DC, this level is sufficient
    // (with good rolls, player can succeed)
    if (perception + 10 >= dc) {
      return level;
    }
  }

  return "full";
}

/**
 * Gets a description of perception chance for UI display.
 *
 * @param intelLevel - Player's intel level
 * @param archetype - Bot's archetype
 * @returns Human-readable description
 */
export function getPerceptionChanceDescription(
  intelLevel: IntelLevel,
  archetype: ArchetypeName
): string {
  const probability = estimatePerceptionSuccess(intelLevel, archetype);

  if (probability >= 0.9) return "Very High";
  if (probability >= 0.7) return "High";
  if (probability >= 0.5) return "Moderate";
  if (probability >= 0.3) return "Low";
  if (probability > 0) return "Very Low";
  return "None";
}

/**
 * Bot Archetypes Module (PRD 7.6, 7.10)
 *
 * Exports all bot archetype behavior definitions and related utilities.
 * Each archetype defines a distinct playstyle with unique behaviors,
 * passive abilities, and communication patterns.
 *
 * @see docs/PRD.md Section 7.6 (Bot Archetypes)
 * @see docs/PRD.md Section 7.10 (Player Readability / Tell System)
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  ArchetypeName,
  PassiveAbility,
  BehaviorPriorities,
  CombatStyle,
  CombatBehavior,
  DiplomacyBehavior,
  TellStyle,
  TellBehavior,
  ArchetypeBehavior,
  PassiveAbilityEffect,
} from "./types";

export {
  ARCHETYPE_NAMES,
  PASSIVE_ABILITIES,
  PASSIVE_ABILITY_EFFECTS,
} from "./types";

// =============================================================================
// INDIVIDUAL ARCHETYPE EXPORTS
// =============================================================================

export { WARLORD_BEHAVIOR } from "./warlord";
export { DIPLOMAT_BEHAVIOR } from "./diplomat";
export { MERCHANT_BEHAVIOR } from "./merchant";
export { SCHEMER_BEHAVIOR } from "./schemer";
export { TURTLE_BEHAVIOR } from "./turtle";
export { BLITZKRIEG_BEHAVIOR } from "./blitzkrieg";
export { TECH_RUSH_BEHAVIOR } from "./tech-rush";
export { OPPORTUNIST_BEHAVIOR } from "./opportunist";

// =============================================================================
// ARCHETYPE REGISTRY
// =============================================================================

import type { ArchetypeName, ArchetypeBehavior, PassiveAbility } from "./types";
import { PASSIVE_ABILITY_EFFECTS } from "./types";
import { WARLORD_BEHAVIOR } from "./warlord";
import { DIPLOMAT_BEHAVIOR } from "./diplomat";
import { MERCHANT_BEHAVIOR } from "./merchant";
import { SCHEMER_BEHAVIOR } from "./schemer";
import { TURTLE_BEHAVIOR } from "./turtle";
import { BLITZKRIEG_BEHAVIOR } from "./blitzkrieg";
import { TECH_RUSH_BEHAVIOR } from "./tech-rush";
import { OPPORTUNIST_BEHAVIOR } from "./opportunist";

/**
 * Registry of all archetype behaviors indexed by name.
 */
export const ARCHETYPE_BEHAVIORS: Record<ArchetypeName, ArchetypeBehavior> = {
  warlord: WARLORD_BEHAVIOR,
  diplomat: DIPLOMAT_BEHAVIOR,
  merchant: MERCHANT_BEHAVIOR,
  schemer: SCHEMER_BEHAVIOR,
  turtle: TURTLE_BEHAVIOR,
  blitzkrieg: BLITZKRIEG_BEHAVIOR,
  techRush: TECH_RUSH_BEHAVIOR,
  opportunist: OPPORTUNIST_BEHAVIOR,
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the archetype behavior definition by name.
 *
 * @param archetype - The archetype name
 * @returns The archetype behavior definition
 */
export function getArchetypeBehavior(archetype: ArchetypeName): ArchetypeBehavior {
  return ARCHETYPE_BEHAVIORS[archetype];
}

/**
 * Get the passive ability effects for an archetype.
 *
 * @param archetype - The archetype name
 * @returns The passive ability effects, or null if none
 */
export function getPassiveAbilityEffects(archetype: ArchetypeName) {
  const behavior = ARCHETYPE_BEHAVIORS[archetype];
  if (behavior.passiveAbility === "none") {
    return null;
  }
  return PASSIVE_ABILITY_EFFECTS[behavior.passiveAbility as Exclude<PassiveAbility, "none">];
}

/**
 * Get archetypes with a specific passive ability.
 *
 * @param ability - The passive ability to search for
 * @returns Array of archetype names with that ability
 */
export function getArchetypesWithAbility(ability: PassiveAbility): ArchetypeName[] {
  return Object.entries(ARCHETYPE_BEHAVIORS)
    .filter(([, behavior]) => behavior.passiveAbility === ability)
    .map(([name]) => name as ArchetypeName);
}

/**
 * Get archetypes by combat style.
 *
 * @param style - The combat style to search for
 * @returns Array of archetype names with that combat style
 */
export function getArchetypesByCombatStyle(
  style: ArchetypeBehavior["combat"]["style"]
): ArchetypeName[] {
  return Object.entries(ARCHETYPE_BEHAVIORS)
    .filter(([, behavior]) => behavior.combat.style === style)
    .map(([name]) => name as ArchetypeName);
}

/**
 * Check if an archetype should attack based on power ratio.
 *
 * @param archetype - The archetype name
 * @param enemyPowerRatio - Enemy power as ratio of bot's power (0-1+)
 * @returns True if the archetype would attack at this power ratio
 */
export function wouldArchetypeAttack(
  archetype: ArchetypeName,
  enemyPowerRatio: number
): boolean {
  const behavior = ARCHETYPE_BEHAVIORS[archetype];
  // Attacks if enemy has LESS than threshold (e.g., 0.5 means attack if enemy < 50%)
  return enemyPowerRatio < behavior.combat.attackThreshold;
}

/**
 * Calculate the weighted priority for a decision category.
 *
 * @param archetype - The archetype name
 * @param category - The priority category
 * @returns The priority weight (0-1)
 */
export function getArchetypePriority(
  archetype: ArchetypeName,
  category: keyof ArchetypeBehavior["priorities"]
): number {
  return ARCHETYPE_BEHAVIORS[archetype].priorities[category];
}

/**
 * Get the tell rate for an archetype (how often they telegraph intentions).
 *
 * @param archetype - The archetype name
 * @returns The tell rate (0-1)
 */
export function getArchetypeTellRate(archetype: ArchetypeName): number {
  return ARCHETYPE_BEHAVIORS[archetype].tell.tellRate;
}

/**
 * Get the advance warning range for an archetype.
 *
 * @param archetype - The archetype name
 * @returns Object with min and max turns of warning
 */
export function getArchetypeWarningRange(archetype: ArchetypeName): { min: number; max: number } {
  return ARCHETYPE_BEHAVIORS[archetype].tell.advanceWarning;
}

/**
 * Calculate a random advance warning within archetype's range.
 *
 * @param archetype - The archetype name
 * @returns Number of turns of advance warning
 */
export function rollAdvanceWarning(archetype: ArchetypeName): number {
  const { min, max } = getArchetypeWarningRange(archetype);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Determine if an archetype would telegraph their action.
 *
 * @param archetype - The archetype name
 * @returns True if the archetype telegraphs this time
 */
export function rollTellCheck(archetype: ArchetypeName): boolean {
  const tellRate = getArchetypeTellRate(archetype);
  return Math.random() < tellRate;
}

/**
 * Get archetypes sorted by a specific priority.
 *
 * @param category - The priority category to sort by
 * @param descending - Whether to sort descending (default: true)
 * @returns Sorted array of archetype names
 */
export function getArchetypesByPriority(
  category: keyof ArchetypeBehavior["priorities"],
  descending: boolean = true
): ArchetypeName[] {
  return Object.entries(ARCHETYPE_BEHAVIORS)
    .sort(([, a], [, b]) => {
      const diff = a.priorities[category] - b.priorities[category];
      return descending ? -diff : diff;
    })
    .map(([name]) => name as ArchetypeName);
}

/**
 * Get a random archetype, optionally weighted by a distribution.
 *
 * @param weights - Optional weights for each archetype (defaults to equal)
 * @returns A randomly selected archetype name
 */
export function getRandomArchetype(
  weights?: Partial<Record<ArchetypeName, number>>
): ArchetypeName {
  const archetypes = Object.keys(ARCHETYPE_BEHAVIORS) as ArchetypeName[];

  if (!weights) {
    // Safe: archetypes array is always populated from ARCHETYPE_BEHAVIORS
    return archetypes[Math.floor(Math.random() * archetypes.length)]!;
  }

  const totalWeight = archetypes.reduce(
    (sum, arch) => sum + (weights[arch] ?? 1),
    0
  );

  let random = Math.random() * totalWeight;

  for (const archetype of archetypes) {
    random -= weights[archetype] ?? 1;
    if (random <= 0) {
      return archetype;
    }
  }

  // Safe: archetypes array is always populated from ARCHETYPE_BEHAVIORS
  return archetypes[archetypes.length - 1]!;
}

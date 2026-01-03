/**
 * Archetype Configuration Loader
 *
 * Type-safe loader functions for archetype behavior configurations.
 * Loads from JSON data file for easy configuration management.
 *
 * @see data/archetype-configs.json
 * @see docs/PRD.md Section 7.6 (Bot Archetypes)
 */

import type {
  ArchetypeName,
  ArchetypeBehavior,
  BehaviorPriorities,
  CombatBehavior,
  DiplomacyBehavior,
  TellBehavior,
} from "@/lib/bots/archetypes/types";

// Import JSON configuration
import archetypeConfigsData from "@data/archetype-configs.json";

/**
 * Type-safe archetype configurations loaded from JSON.
 */
const ARCHETYPE_CONFIGS = archetypeConfigsData as Record<ArchetypeName, ArchetypeBehavior>;

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Get all archetype configurations.
 *
 * @returns Record of all archetype behaviors indexed by name
 *
 * @example
 * const configs = getArchetypeConfigs();
 * console.log(configs.warlord.displayName); // "Warlord"
 */
export function getArchetypeConfigs(): Record<ArchetypeName, ArchetypeBehavior> {
  return ARCHETYPE_CONFIGS;
}

/**
 * Get a single archetype configuration by name.
 *
 * @param name - The archetype name
 * @returns The complete archetype behavior configuration
 * @throws {Error} If archetype name is invalid
 *
 * @example
 * const warlord = getArchetypeConfig("warlord");
 * console.log(warlord.combat.attackThreshold); // 0.50
 */
export function getArchetypeConfig(name: ArchetypeName): ArchetypeBehavior {
  const config = ARCHETYPE_CONFIGS[name];
  if (!config) {
    throw new Error(`Invalid archetype name: ${name}`);
  }
  return config;
}

/**
 * Get the priority weights for an archetype.
 *
 * @param name - The archetype name
 * @returns The behavior priorities object
 * @throws {Error} If archetype name is invalid
 *
 * @example
 * const priorities = getArchetypePriorities("warlord");
 * console.log(priorities.military); // 0.70
 */
export function getArchetypePriorities(name: ArchetypeName): BehaviorPriorities {
  const config = getArchetypeConfig(name);
  return config.priorities;
}

/**
 * Get the combat behavior configuration for an archetype.
 *
 * @param name - The archetype name
 * @returns The combat behavior object
 * @throws {Error} If archetype name is invalid
 *
 * @example
 * const combat = getArchetypeCombatBehavior("warlord");
 * console.log(combat.style); // "aggressive"
 * console.log(combat.attackThreshold); // 0.50
 */
export function getArchetypeCombatBehavior(name: ArchetypeName): CombatBehavior {
  const config = getArchetypeConfig(name);
  return config.combat;
}

/**
 * Get the diplomacy behavior configuration for an archetype.
 *
 * @param name - The archetype name
 * @returns The diplomacy behavior object
 * @throws {Error} If archetype name is invalid
 *
 * @example
 * const diplomacy = getArchetypeDiplomacyBehavior("diplomat");
 * console.log(diplomacy.allianceSeeking); // 0.80
 */
export function getArchetypeDiplomacyBehavior(name: ArchetypeName): DiplomacyBehavior {
  const config = getArchetypeConfig(name);
  return config.diplomacy;
}

/**
 * Get the tell behavior configuration for an archetype.
 *
 * @param name - The archetype name
 * @returns The tell behavior object
 * @throws {Error} If archetype name is invalid
 *
 * @example
 * const tell = getArchetypeTellBehavior("schemer");
 * console.log(tell.tellRate); // 0.30
 * console.log(tell.style); // "cryptic"
 */
export function getArchetypeTellBehavior(name: ArchetypeName): TellBehavior {
  const config = getArchetypeConfig(name);
  return config.tell;
}

/**
 * Get a specific priority value for an archetype.
 *
 * @param name - The archetype name
 * @param category - The priority category
 * @returns The priority value (0-1)
 * @throws {Error} If archetype name is invalid
 *
 * @example
 * const militaryPriority = getArchetypePriority("warlord", "military");
 * console.log(militaryPriority); // 0.70
 */
export function getArchetypePriority(
  name: ArchetypeName,
  category: keyof BehaviorPriorities
): number {
  const priorities = getArchetypePriorities(name);
  return priorities[category];
}

/**
 * Check if an archetype would attack based on power ratio.
 *
 * @param name - The archetype name
 * @param enemyPowerRatio - Enemy power as ratio of bot's power (0-1+)
 * @returns True if the archetype would attack at this power ratio
 * @throws {Error} If archetype name is invalid
 *
 * @example
 * // Warlord attacks when enemy has < 50% of their power
 * shouldArchetypeAttack("warlord", 0.4); // true
 * shouldArchetypeAttack("warlord", 0.6); // false
 */
export function shouldArchetypeAttack(
  name: ArchetypeName,
  enemyPowerRatio: number
): boolean {
  const combat = getArchetypeCombatBehavior(name);
  return enemyPowerRatio < combat.attackThreshold;
}

/**
 * Get all archetype names.
 *
 * @returns Array of all archetype names
 *
 * @example
 * const names = getArchetypeNames();
 * console.log(names); // ["warlord", "diplomat", ...]
 */
export function getArchetypeNames(): ArchetypeName[] {
  return Object.keys(ARCHETYPE_CONFIGS) as ArchetypeName[];
}

/**
 * Validate if a string is a valid archetype name.
 *
 * @param name - The name to validate
 * @returns True if the name is a valid archetype
 *
 * @example
 * isValidArchetypeName("warlord"); // true
 * isValidArchetypeName("invalid"); // false
 */
export function isValidArchetypeName(name: string): name is ArchetypeName {
  return name in ARCHETYPE_CONFIGS;
}

// =============================================================================
// GAME-SPECIFIC OVERRIDES
// =============================================================================

/**
 * Get archetype configurations with game-specific overrides applied.
 *
 * @param gameId - Optional game ID to load overrides for
 * @returns Promise resolving to archetype configurations
 *
 * @example
 * const configs = await getArchetypeConfigsWithOverrides(gameId);
 * console.log(configs.warlord.combat.attackThreshold); // May be overridden
 */
export async function getArchetypeConfigsWithOverrides(
  gameId?: string
): Promise<Record<ArchetypeName, ArchetypeBehavior>> {
  if (!gameId) {
    return getArchetypeConfigs();
  }

  const { loadGameConfig } = await import("./game-config-service");
  return loadGameConfig<Record<ArchetypeName, ArchetypeBehavior>>(gameId, "archetypes");
}

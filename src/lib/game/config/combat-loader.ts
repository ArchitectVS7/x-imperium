/**
 * Combat Configuration Loader
 *
 * Loads combat configuration from JSON file to enable data-driven balancing.
 * All hardcoded combat values are centralized here.
 *
 * Supports two combat systems:
 * - "unified": Modern unified combat system (unified-combat.ts)
 * - "legacy": Legacy fleet power system (combat-power.ts)
 */

import combatConfigJson from '@data/combat-config.json';

export type CombatConfig = typeof combatConfigJson;

/**
 * Get the complete combat configuration.
 * @returns The full combat configuration object
 */
export function getCombatConfig(): CombatConfig {
  return combatConfigJson;
}

// =============================================================================
// UNIFIED COMBAT SYSTEM
// =============================================================================

/**
 * Get the unified combat configuration.
 * @returns The unified combat config
 */
export function getUnifiedConfig() {
  return combatConfigJson.unified;
}

/**
 * Get the defender bonus for unified combat.
 * @returns The defender bonus multiplier (e.g., 1.10 for 10%)
 */
export function getUnifiedDefenderBonus(): number {
  return combatConfigJson.unified.defenderBonus;
}

/**
 * Get the power multiplier for a specific unit type in unified combat.
 * @param unitType - The type of unit
 * @returns The power multiplier for that unit type, or 1 if not found
 */
export function getUnifiedPowerMultiplier(unitType: string): number {
  return combatConfigJson.unified.powerMultipliers[
    unitType as keyof typeof combatConfigJson.unified.powerMultipliers
  ] ?? 1;
}

/**
 * Get the underdog bonus configuration.
 * @returns Object with threshold and maxBonus
 */
export function getUnderdogBonus() {
  return combatConfigJson.unified.underdogBonus;
}

/**
 * Get the planet capture configuration.
 * @returns Object with minPercent and maxPercent
 */
export function getPlanetCaptureConfig() {
  return combatConfigJson.unified.planetCapture;
}

/**
 * Get the unified casualty rate multipliers.
 * @returns Object with winnerMultiplier, loserMultiplier, drawMultiplier
 */
export function getUnifiedCasualtyRates() {
  return combatConfigJson.unified.casualtyRates;
}

// =============================================================================
// LEGACY COMBAT SYSTEM (combat-power.ts)
// =============================================================================

/**
 * Get the legacy combat configuration.
 * @returns The legacy combat config
 */
export function getLegacyConfig() {
  return combatConfigJson.legacy;
}

/**
 * Get the defender advantage for legacy combat.
 * @returns The defender advantage multiplier (e.g., 1.2 for 20%)
 */
export function getLegacyDefenderAdvantage(): number {
  return combatConfigJson.legacy.defenderAdvantage;
}

/**
 * Get the station defense multiplier for legacy combat.
 * @returns The station defense multiplier (e.g., 2 for 2x on defense)
 */
export function getLegacyStationDefenseMultiplier(): number {
  return combatConfigJson.legacy.stationDefenseMultiplier;
}

/**
 * Get the power multiplier for a specific unit type in legacy combat.
 * @param unitType - The type of unit
 * @returns The power multiplier for that unit type, or 1 if not found
 */
export function getLegacyPowerMultiplier(unitType: string): number {
  return combatConfigJson.legacy.powerMultipliers[
    unitType as keyof typeof combatConfigJson.legacy.powerMultipliers
  ] ?? 1;
}

/**
 * Get the legacy diversity bonus configuration.
 * @returns Object with minUnitTypes and bonusMultiplier
 */
export function getLegacyDiversityBonus() {
  return combatConfigJson.legacy.diversityBonus;
}

// =============================================================================
// CASUALTY CALCULATIONS (shared)
// =============================================================================

/**
 * Get the casualty rate configuration.
 * @returns Object with all casualty rate parameters
 */
export function getCasualtyConfig() {
  return combatConfigJson.casualties;
}

/**
 * Get the base casualty rate.
 * @returns The base rate (e.g., 0.25 for 25%)
 */
export function getBaseCasualtyRate(): number {
  return combatConfigJson.casualties.baseRate;
}

/**
 * Get the minimum casualty rate.
 * @returns The minimum rate (e.g., 0.15 for 15%)
 */
export function getMinCasualtyRate(): number {
  return combatConfigJson.casualties.minRate;
}

/**
 * Get the maximum casualty rate.
 * @returns The maximum rate (e.g., 0.35 for 35%)
 */
export function getMaxCasualtyRate(): number {
  return combatConfigJson.casualties.maxRate;
}

/**
 * Get the bad attack penalty.
 * @returns The penalty rate (e.g., 0.1 for +10%)
 */
export function getBadAttackPenalty(): number {
  return combatConfigJson.casualties.badAttackPenalty;
}

/**
 * Get the overwhelming force bonus.
 * @returns The bonus rate (e.g., 0.1 for -10%)
 */
export function getOverwhelmingBonus(): number {
  return combatConfigJson.casualties.overwhelmingBonus;
}

/**
 * Get the bad attack threshold.
 * @returns The power ratio threshold (e.g., 2.0)
 */
export function getBadAttackThreshold(): number {
  return combatConfigJson.casualties.badAttackThreshold;
}

/**
 * Get the overwhelming force threshold.
 * @returns The power ratio threshold (e.g., 0.5)
 */
export function getOverwhelmingThreshold(): number {
  return combatConfigJson.casualties.overwhelmingThreshold;
}

/**
 * Get the casualty variance range.
 * @returns Object with min and max variance multipliers
 */
export function getVarianceRange() {
  return {
    min: combatConfigJson.casualties.varianceMin,
    max: combatConfigJson.casualties.varianceMax,
  };
}

/**
 * Get the retreat casualty rate.
 * @returns The retreat rate (e.g., 0.15 for 15%)
 */
export function getRetreatCasualtyRate(): number {
  return combatConfigJson.casualties.retreatRate;
}

// =============================================================================
// GAME-SPECIFIC OVERRIDES
// =============================================================================

/**
 * Get combat configuration with game-specific overrides applied.
 * This function is async and queries the database for overrides.
 *
 * @param gameId - Optional game ID to load overrides for
 * @returns Promise resolving to combat configuration
 *
 * @example
 * const config = await getCombatConfigWithOverrides(gameId);
 * console.log(config.unified.defenderBonus); // May be overridden
 */
export async function getCombatConfigWithOverrides(
  gameId?: string
): Promise<CombatConfig> {
  if (!gameId) {
    return getCombatConfig();
  }

  // Dynamically import to avoid circular dependency
  const { loadGameConfig } = await import("./game-config-service");
  return loadGameConfig<CombatConfig>(gameId, "combat");
}

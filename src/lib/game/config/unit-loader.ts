/**
 * Unit Stats Loader
 *
 * Data-driven unit configuration system.
 * Loads unit definitions from JSON and provides type-safe access.
 */

import unitStatsJson from "@data/unit-stats.json";

// =============================================================================
// TYPES
// =============================================================================

export type UnitStats = typeof unitStatsJson;
export type UnitType = keyof UnitStats;

export type UnitDefinition = {
  cost: {
    credits: number;
    ore?: number;
    petroleum?: number;
  };
  buildTime: number;
  maintenance: {
    credits?: number;
    ore?: number;
    petroleum?: number;
    food?: number;
  };
  populationCost: number;
  attack: number;
  defense: number;
  label: string;
  description: string;
  unlockRequirement?: {
    research?: number;
    researchDoctrine?: string;
  };
};

// =============================================================================
// GETTERS
// =============================================================================

/**
 * Get all unit stats configuration.
 */
export function getUnitStats(): UnitStats {
  return unitStatsJson;
}

/**
 * Get stats for a specific unit type.
 */
export function getUnitStat(unitType: UnitType): UnitDefinition {
  return unitStatsJson[unitType];
}

/**
 * Get the credit/resource cost for a unit type.
 */
export function getUnitCost(
  unitType: UnitType
): { credits: number; ore?: number; petroleum?: number } {
  return unitStatsJson[unitType].cost;
}

/**
 * Get the maintenance cost for a unit type.
 */
export function getUnitMaintenance(
  unitType: UnitType
): { credits?: number; ore?: number; petroleum?: number; food?: number } {
  return unitStatsJson[unitType].maintenance;
}

/**
 * Get the population cost for a unit type.
 */
export function getUnitPopulationCost(unitType: UnitType): number {
  return unitStatsJson[unitType].populationCost;
}

/**
 * Get the attack power for a unit type.
 */
export function getUnitAttack(unitType: UnitType): number {
  return unitStatsJson[unitType].attack;
}

/**
 * Get the defense power for a unit type.
 */
export function getUnitDefense(unitType: UnitType): number {
  return unitStatsJson[unitType].defense;
}

/**
 * Get the display label for a unit type.
 */
export function getUnitLabel(unitType: UnitType): string {
  return unitStatsJson[unitType].label;
}

/**
 * Get the description for a unit type.
 */
export function getUnitDescription(unitType: UnitType): string {
  return unitStatsJson[unitType].description;
}

/**
 * Get the build time for a unit type.
 */
export function getUnitBuildTime(unitType: UnitType): number {
  return unitStatsJson[unitType].buildTime;
}

/**
 * Get all unit types as an array.
 */
export function getAllUnitTypes(): UnitType[] {
  return Object.keys(unitStatsJson) as UnitType[];
}

// =============================================================================
// GAME-SPECIFIC OVERRIDES
// =============================================================================

/**
 * Get unit stats with game-specific overrides applied.
 *
 * @param gameId - Optional game ID to load overrides for
 * @returns Promise resolving to unit stats configuration
 *
 * @example
 * const stats = await getUnitStatsWithOverrides(gameId);
 * console.log(stats.soldiers.cost.credits); // May be overridden
 */
export async function getUnitStatsWithOverrides(
  gameId?: string
): Promise<UnitStats> {
  if (!gameId) {
    return getUnitStats();
  }

  const { loadGameConfig } = await import("./game-config-service");
  return loadGameConfig<UnitStats>(gameId, "units");
}

/**
 * Unit Configuration Constants (PRD 6.1)
 *
 * Defines costs, population requirements, and combat stats for all military units.
 * All values sourced directly from PRD 6.1 Unit Types table.
 *
 * NOTE: This module now uses data-driven configuration from data/unit-stats.json.
 * Exported constants and functions are maintained for backward compatibility.
 */

import {
  getUnitStats,
  getAllUnitTypes,
  getUnitCost,
  getUnitMaintenance,
  getUnitPopulationCost,
  getUnitAttack,
  getUnitDefense,
  getUnitLabel,
  getUnitDescription,
  type UnitType as LoaderUnitType,
} from "./config/unit-loader";

// =============================================================================
// UNIT TYPES
// =============================================================================

const allUnitTypes = getAllUnitTypes();
export const UNIT_TYPES = allUnitTypes as readonly LoaderUnitType[];

export type UnitType = LoaderUnitType;

// =============================================================================
// UNIT COSTS (PRD 6.1)
// =============================================================================

/**
 * Credit cost to purchase one unit.
 */
const unitStats = getUnitStats();
export const UNIT_COSTS: Record<UnitType, number> = {
  soldiers: unitStats.soldiers.cost.credits,
  fighters: unitStats.fighters.cost.credits,
  stations: unitStats.stations.cost.credits,
  lightCruisers: unitStats.lightCruisers.cost.credits,
  heavyCruisers: unitStats.heavyCruisers.cost.credits,
  carriers: unitStats.carriers.cost.credits,
  covertAgents: unitStats.covertAgents.cost.credits,
} as const;

// =============================================================================
// UNIT POPULATION REQUIREMENTS (PRD 6.1)
// =============================================================================

/**
 * Population consumed per unit when training.
 */
export const UNIT_POPULATION: Record<UnitType, number> = {
  soldiers: unitStats.soldiers.populationCost,
  fighters: unitStats.fighters.populationCost,
  stations: unitStats.stations.populationCost,
  lightCruisers: unitStats.lightCruisers.populationCost,
  heavyCruisers: unitStats.heavyCruisers.populationCost,
  carriers: unitStats.carriers.populationCost,
  covertAgents: unitStats.covertAgents.populationCost,
} as const;

// =============================================================================
// UNIT ATTACK POWER (PRD 6.1)
// =============================================================================

/**
 * Base attack power per unit.
 * Note: Covert agents don't participate in direct combat.
 */
export const UNIT_ATTACK: Record<Exclude<UnitType, "covertAgents">, number> = {
  soldiers: unitStats.soldiers.attack,
  fighters: unitStats.fighters.attack,
  stations: unitStats.stations.attack,
  lightCruisers: unitStats.lightCruisers.attack,
  heavyCruisers: unitStats.heavyCruisers.attack,
  carriers: unitStats.carriers.attack,
} as const;

// =============================================================================
// UNIT DEFENSE POWER (PRD 6.1)
// =============================================================================

/**
 * Base defense power per unit.
 * Note: Stations get 2× effectiveness when defending (handled in combat-power.ts).
 * Note: Covert agents don't participate in direct combat.
 */
export const UNIT_DEFENSE: Record<Exclude<UnitType, "covertAgents">, number> = {
  soldiers: unitStats.soldiers.defense,
  fighters: unitStats.fighters.defense,
  stations: unitStats.stations.defense,
  lightCruisers: unitStats.lightCruisers.defense,
  heavyCruisers: unitStats.heavyCruisers.defense,
  carriers: unitStats.carriers.defense,
} as const;

// =============================================================================
// UNIT MAINTENANCE (Derived from PRD context)
// =============================================================================

/**
 * Credits required per unit per turn for maintenance.
 * Approximate values based on unit complexity and cost.
 */
export const UNIT_MAINTENANCE: Record<UnitType, number> = {
  soldiers: unitStats.soldiers.maintenance.credits ?? 0,
  fighters: unitStats.fighters.maintenance.credits ?? 0,
  stations: unitStats.stations.maintenance.credits ?? 0,
  lightCruisers: unitStats.lightCruisers.maintenance.credits ?? 0,
  heavyCruisers: unitStats.heavyCruisers.maintenance.credits ?? 0,
  carriers: unitStats.carriers.maintenance.credits ?? 0,
  covertAgents: unitStats.covertAgents.maintenance.credits ?? 0,
} as const;

// =============================================================================
// UNIT DISPLAY LABELS
// =============================================================================

export const UNIT_LABELS: Record<UnitType, string> = {
  soldiers: unitStats.soldiers.label,
  fighters: unitStats.fighters.label,
  stations: unitStats.stations.label,
  lightCruisers: unitStats.lightCruisers.label,
  heavyCruisers: unitStats.heavyCruisers.label,
  carriers: unitStats.carriers.label,
  covertAgents: unitStats.covertAgents.label,
} as const;

// =============================================================================
// UNIT DESCRIPTIONS
// =============================================================================

export const UNIT_DESCRIPTIONS: Record<UnitType, string> = {
  soldiers: unitStats.soldiers.description,
  fighters: unitStats.fighters.description,
  stations: unitStats.stations.description,
  lightCruisers: unitStats.lightCruisers.description,
  heavyCruisers: unitStats.heavyCruisers.description,
  carriers: unitStats.carriers.description,
  covertAgents: unitStats.covertAgents.description,
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate the total cost to purchase a quantity of units.
 */
export function calculateUnitPurchaseCost(
  unitType: UnitType,
  quantity: number
): number {
  return UNIT_COSTS[unitType] * quantity;
}

/**
 * Calculate the population required to train a quantity of units.
 */
export function calculateUnitPopulationCost(
  unitType: UnitType,
  quantity: number
): number {
  return UNIT_POPULATION[unitType] * quantity;
}

/**
 * Calculate the maintenance cost per turn for a quantity of units.
 */
export function calculateUnitMaintenanceCost(
  unitType: UnitType,
  quantity: number
): number {
  return UNIT_MAINTENANCE[unitType] * quantity;
}

/**
 * Calculate how many units can be afforded with available credits.
 */
export function calculateAffordableUnits(
  unitType: UnitType,
  availableCredits: number
): number {
  if (availableCredits <= 0) return 0;
  return Math.floor(availableCredits / UNIT_COSTS[unitType]);
}

/**
 * Calculate how many units can be trained with available population.
 */
export function calculateTrainableUnits(
  unitType: UnitType,
  availablePopulation: number
): number {
  if (availablePopulation <= 0) return 0;
  return Math.floor(availablePopulation / UNIT_POPULATION[unitType]);
}

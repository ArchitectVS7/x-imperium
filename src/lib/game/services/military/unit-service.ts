/**
 * Unit Service (M3)
 *
 * Handles unit validation, maintenance calculations, and build requirements.
 *
 * PRD References:
 * - PRD 6.1: Unit costs, population, maintenance
 * - PRD 9.1: Research requirements (Light Cruisers require level 2)
 */

import {
  UNIT_COSTS,
  UNIT_POPULATION,
  UNIT_MAINTENANCE,
  UNIT_TYPES,
  type UnitType,
} from "../../unit-config";

// =============================================================================
// TYPES
// =============================================================================

export interface UnitCounts {
  soldiers: number;
  fighters: number;
  stations: number;
  lightCruisers: number;
  heavyCruisers: number;
  carriers: number;
  covertAgents: number;
}

export interface BuildValidation {
  canBuild: boolean;
  errors: string[];
  creditCost: number;
  populationCost: number;
  maxAffordableByCredits: number;
  maxAffordableByPopulation: number;
  maxAffordable: number;
}

export interface UnitMaintenanceBreakdown {
  totalCost: number;
  byUnit: Record<UnitType, { count: number; cost: number }>;
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate if an empire can build a specific unit type and quantity.
 *
 * Checks:
 * - Credit availability
 * - Population availability
 * - Research requirements (Light Cruisers require level 2)
 *
 * @param unitType - The type of unit to build
 * @param quantity - The number of units to build
 * @param credits - Available credits
 * @param population - Available population
 * @param researchLevel - Fundamental research level (0-7)
 * @returns BuildValidation with canBuild status and error messages
 */
export function validateBuild(
  unitType: UnitType,
  quantity: number,
  credits: number,
  population: number,
  researchLevel: number
): BuildValidation {
  const errors: string[] = [];

  // Calculate costs
  const creditCost = UNIT_COSTS[unitType] * quantity;
  const populationCost = UNIT_POPULATION[unitType] * quantity;

  // Calculate max affordable
  const maxAffordableByCredits = Math.floor(credits / UNIT_COSTS[unitType]);
  const maxAffordableByPopulation = Math.floor(population / UNIT_POPULATION[unitType]);
  const maxAffordable = Math.min(maxAffordableByCredits, maxAffordableByPopulation);

  // Check research requirements
  if (unitType === "lightCruisers" && researchLevel < 2) {
    errors.push("Light Cruisers require Fundamental Research Level 2");
  }

  // Check quantity
  if (quantity <= 0) {
    errors.push("Quantity must be positive");
  }

  // Check credits
  if (credits < creditCost) {
    errors.push(
      `Insufficient credits: need ${creditCost.toLocaleString()}, have ${credits.toLocaleString()}`
    );
  }

  // Check population
  if (population < populationCost) {
    errors.push(
      `Insufficient population: need ${populationCost.toLocaleString()}, have ${population.toLocaleString()}`
    );
  }

  return {
    canBuild: errors.length === 0,
    errors,
    creditCost,
    populationCost,
    maxAffordableByCredits,
    maxAffordableByPopulation,
    maxAffordable,
  };
}

/**
 * Check if a unit type is locked due to research requirements.
 *
 * @param unitType - The type of unit to check
 * @param researchLevel - Current fundamental research level
 * @returns Object with isLocked status and reason
 */
export function isUnitLocked(
  unitType: UnitType,
  researchLevel: number
): { isLocked: boolean; reason?: string } {
  if (unitType === "lightCruisers" && researchLevel < 2) {
    return {
      isLocked: true,
      reason: "Requires Fundamental Research Level 2",
    };
  }

  return { isLocked: false };
}

// =============================================================================
// MAINTENANCE FUNCTIONS
// =============================================================================

/**
 * Calculate total unit maintenance cost for an empire.
 *
 * @param units - Object containing counts for each unit type
 * @returns UnitMaintenanceBreakdown with total and per-unit costs
 *
 * @example
 * calculateUnitMaintenance({
 *   soldiers: 100,
 *   fighters: 50,
 *   stations: 0,
 *   lightCruisers: 0,
 *   heavyCruisers: 0,
 *   carriers: 10,
 *   covertAgents: 0,
 * })
 * // => {
 * //   totalCost: 350, // 100*0.5 + 50*2 + 10*25
 * //   byUnit: {
 * //     soldiers: { count: 100, cost: 50 },
 * //     fighters: { count: 50, cost: 100 },
 * //     carriers: { count: 10, cost: 250 },
 * //     ...
 * //   }
 * // }
 */
export function calculateUnitMaintenance(units: UnitCounts): UnitMaintenanceBreakdown {
  const byUnit: Record<UnitType, { count: number; cost: number }> = {} as Record<
    UnitType,
    { count: number; cost: number }
  >;

  let totalCost = 0;

  for (const unitType of UNIT_TYPES) {
    const count = units[unitType];
    const cost = Math.floor(UNIT_MAINTENANCE[unitType] * count);
    byUnit[unitType] = { count, cost };
    totalCost += cost;
  }

  return {
    totalCost,
    byUnit,
  };
}

/**
 * Calculate combined maintenance (sectors + units) for an empire.
 *
 * @param sectorCount - Number of sectors owned
 * @param units - Unit counts
 * @param sectorMaintenanceCost - Cost per sector (default 168)
 * @returns Combined maintenance breakdown
 */
export function calculateTotalMaintenance(
  sectorCount: number,
  units: UnitCounts,
  sectorMaintenanceCost: number = 168
): {
  sectorCost: number;
  unitCost: number;
  totalCost: number;
  unitBreakdown: UnitMaintenanceBreakdown;
} {
  const sectorCost = sectorCount * sectorMaintenanceCost;
  const unitBreakdown = calculateUnitMaintenance(units);

  return {
    sectorCost,
    unitCost: unitBreakdown.totalCost,
    totalCost: sectorCost + unitBreakdown.totalCost,
    unitBreakdown,
  };
}

// =============================================================================
// RESEARCH REQUIREMENTS
// =============================================================================

/**
 * Get the research level required to build a unit type.
 * Returns 0 if no research is required.
 */
export function getRequiredResearchLevel(unitType: UnitType): number {
  switch (unitType) {
    case "lightCruisers":
      return 2;
    default:
      return 0;
  }
}

/**
 * Get all unit types available at a given research level.
 */
export function getAvailableUnits(researchLevel: number): UnitType[] {
  return UNIT_TYPES.filter((unitType) => {
    const required = getRequiredResearchLevel(unitType);
    return researchLevel >= required;
  });
}

/**
 * Get all unit types that are currently locked at a given research level.
 */
export function getLockedUnits(researchLevel: number): UnitType[] {
  return UNIT_TYPES.filter((unitType) => {
    const required = getRequiredResearchLevel(unitType);
    return researchLevel < required;
  });
}

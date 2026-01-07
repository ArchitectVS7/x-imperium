/**
 * Resource Engine Service
 *
 * Handles resource production from sectors, maintenance costs, and income multipliers.
 * Calculates net resource changes each turn.
 *
 * PRD References:
 * - PRD 5.2: Sector production rates
 * - PRD 4.4: Civil status income multipliers
 * - Sector maintenance: 168 credits per sector per turn
 */

import type { Sector } from "@/lib/db/schema";
import type {
  ResourceDelta,
  ResourceProduction,
  MaintenanceCost,
} from "../types/turn-types";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Sector maintenance cost per turn (PRD: 168 credits) */
export const PLANET_MAINTENANCE_COST = 168;

// =============================================================================
// RESOURCE PRODUCTION
// =============================================================================

/**
 * Calculate resource production from sectors
 *
 * Sums production by sector type and returns ResourceDelta.
 * Does NOT apply civil status multipliers (that's done separately).
 *
 * @param sectors - Array of sectors owned by empire
 * @returns ResourceDelta with base production values
 *
 * @example
 * // 2 food sectors, 1 tourism sector
 * calculateProduction([
 *   { type: 'food', productionRate: '160' },
 *   { type: 'food', productionRate: '160' },
 *   { type: 'tourism', productionRate: '8000' }
 * ])
 * // => { credits: 8000, food: 320, ore: 0, petroleum: 0, researchPoints: 0 }
 */
export function calculateProduction(sectors: Sector[]): ResourceDelta {
  const production: ResourceDelta = {
    credits: 0,
    food: 0,
    ore: 0,
    petroleum: 0,
    researchPoints: 0,
  };

  for (const sector of sectors) {
    const productionRate = parseFloat(sector.productionRate);

    switch (sector.type) {
      case "food":
        production.food += productionRate;
        break;

      case "ore":
        production.ore += productionRate;
        break;

      case "petroleum":
        production.petroleum += productionRate;
        break;

      case "tourism":
      case "urban":
        production.credits += productionRate;
        break;

      case "research":
        production.researchPoints += productionRate;
        break;

      // Special effect sectors (no direct resource production)
      case "government":
      case "education":
      case "supply":
      case "anti_pollution":
        // These provide bonuses handled elsewhere
        break;
    }
  }

  return production;
}

/**
 * Apply civil status income multiplier to resource production
 *
 * Only applies to income resources (credits, research points).
 * Raw resources (food, ore, petroleum) are NOT multiplied.
 *
 * @param baseProduction - Base resource production from sectors
 * @param incomeMultiplier - Civil status multiplier (0× to 4×)
 * @returns ResourceProduction with multiplied income
 *
 * @example
 * applyIncomeMultiplier(
 *   { credits: 8000, food: 320, ore: 224, petroleum: 92, researchPoints: 100 },
 *   2.0 // Content status
 * )
 * // => {
 * //   production: { credits: 8000, food: 320, ore: 224, petroleum: 92, researchPoints: 100 },
 * //   incomeMultiplier: 2.0,
 * //   final: { credits: 16000, food: 320, ore: 224, petroleum: 92, researchPoints: 200 }
 * // }
 */
export function applyIncomeMultiplier(
  baseProduction: ResourceDelta,
  incomeMultiplier: number
): ResourceProduction {
  // Apply multiplier to income resources only
  const multipliedCredits = Math.floor(baseProduction.credits * incomeMultiplier);
  const multipliedResearch = Math.floor(baseProduction.researchPoints * incomeMultiplier);

  return {
    production: baseProduction,
    incomeMultiplier,
    final: {
      credits: multipliedCredits,
      food: baseProduction.food,
      ore: baseProduction.ore,
      petroleum: baseProduction.petroleum,
      researchPoints: multipliedResearch,
    },
  };
}

/**
 * Calculate total maintenance costs for sectors
 *
 * @param sectorCount - Number of sectors owned
 * @returns MaintenanceCost breakdown
 *
 * @example
 * calculateMaintenanceCost(9) // => { totalCost: 1512, costPerPlanet: 168, sectorCount: 9 }
 */
export function calculateMaintenanceCost(sectorCount: number): MaintenanceCost {
  return {
    totalCost: sectorCount * PLANET_MAINTENANCE_COST,
    costPerPlanet: PLANET_MAINTENANCE_COST,
    sectorCount,
  };
}

/**
 * Calculate net resource changes after production and maintenance
 *
 * Returns the delta (change) in resources for this turn.
 * Note: This returns the CHANGE, not the new total.
 *
 * @param production - Resource production (after income multiplier)
 * @param maintenance - Maintenance costs
 * @returns Net resource changes (can be negative)
 *
 * @example
 * calculateNetResourceDelta(
 *   { credits: 16000, food: 320, ore: 224, petroleum: 92, researchPoints: 200 },
 *   { totalCost: 1512, costPerPlanet: 168, sectorCount: 9 }
 * )
 * // => { credits: 14488, food: 320, ore: 224, petroleum: 92, researchPoints: 200 }
 */
export function calculateNetResourceDelta(
  production: ResourceDelta,
  maintenance: MaintenanceCost
): ResourceDelta {
  return {
    credits: production.credits - maintenance.totalCost,
    food: production.food,
    ore: production.ore,
    petroleum: production.petroleum,
    researchPoints: production.researchPoints,
  };
}

/**
 * Calculate final resources after production and maintenance
 *
 * Helper function that combines all resource calculations.
 *
 * @param sectors - Planets owned by empire
 * @param incomeMultiplier - Civil status income multiplier
 * @returns ResourceProduction with final resource changes
 *
 * @example
 * processTurnResources(
 *   [{ type: 'food', productionRate: '160' }, ...],
 *   2.0 // Content status
 * )
 * // => ResourceProduction with all calculations applied
 */
export function processTurnResources(
  sectors: Sector[],
  incomeMultiplier: number
): ResourceProduction {
  // Step 1: Calculate base production
  const baseProduction = calculateProduction(sectors);

  // Step 2: Apply income multiplier
  const productionWithMultiplier = applyIncomeMultiplier(
    baseProduction,
    incomeMultiplier
  );

  // Step 3: Deduct maintenance
  const maintenance = calculateMaintenanceCost(sectors.length);
  const finalResources = calculateNetResourceDelta(
    productionWithMultiplier.final,
    maintenance
  );

  return {
    production: baseProduction,
    incomeMultiplier,
    final: finalResources,
  };
}

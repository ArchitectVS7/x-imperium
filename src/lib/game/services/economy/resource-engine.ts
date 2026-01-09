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
 * - P2-18: Resource caps and storage costs
 */

import type { Sector } from "@/lib/db/schema";
import type {
  ResourceDelta,
  ResourceProduction,
  MaintenanceCost,
  StorageCosts,
  ResourceOverflow,
} from "../../types/turn-types";
import {
  RESOURCE_CAPS,
  STORAGE_COST_THRESHOLD,
  STORAGE_COST_RATE,
  RESOURCES_WITH_STORAGE_COSTS,
} from "../../constants";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Sector maintenance cost per turn (PRD: 168 credits) */
export const SECTOR_MAINTENANCE_COST = 168;

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
 *   { type: 'food', productionRate: '500' },
 *   { type: 'food', productionRate: '500' },
 *   { type: 'tourism', productionRate: '8000' }
 * ])
 * // => { credits: 8000, food: 1000, ore: 0, petroleum: 0, researchPoints: 0 }
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
 *   { credits: 8000, food: 1000, ore: 224, petroleum: 92, researchPoints: 100 },
 *   2.0 // Content status
 * )
 * // => {
 * //   production: { credits: 8000, food: 1000, ore: 224, petroleum: 92, researchPoints: 100 },
 * //   incomeMultiplier: 2.0,
 * //   final: { credits: 16000, food: 1000, ore: 224, petroleum: 92, researchPoints: 200 }
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
 * calculateMaintenanceCost(9) // => { totalCost: 1512, costPerSector: 168, sectorCount: 9 }
 */
export function calculateMaintenanceCost(sectorCount: number): MaintenanceCost {
  return {
    totalCost: sectorCount * SECTOR_MAINTENANCE_COST,
    costPerSector: SECTOR_MAINTENANCE_COST,
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
 *   { credits: 16000, food: 1000, ore: 224, petroleum: 92, researchPoints: 200 },
 *   { totalCost: 1512, costPerSector: 168, sectorCount: 9 }
 * )
 * // => { credits: 14488, food: 1000, ore: 224, petroleum: 92, researchPoints: 200 }
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
 * @param sectors - Sectors owned by empire
 * @param incomeMultiplier - Civil status income multiplier
 * @returns ResourceProduction with final resource changes
 *
 * @example
 * processTurnResources(
 *   [{ type: 'food', productionRate: '500' }, ...],
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

// =============================================================================
// RESOURCE CAPS AND STORAGE COSTS (P2-18)
// =============================================================================

/** Type for resources that have storage costs */
type StorageCostResource = 'ore' | 'petroleum';

/**
 * Calculate storage costs for resources above threshold
 *
 * Storage costs apply to ore and petroleum when stockpiles exceed 50% of cap.
 * Cost is 0.5% of the excess amount per turn.
 *
 * @param currentResources - Current resource stockpiles
 * @returns StorageCosts breakdown with per-resource and total costs
 *
 * @example
 * calculateStorageCosts({ credits: 100000, food: 5000, ore: 30000, petroleum: 15000 })
 * // Ore threshold: 25000 (50% of 50000), excess: 5000, cost: 25 (0.5% of 5000)
 * // Petroleum threshold: 12500 (50% of 25000), excess: 2500, cost: 12 (0.5% of 2500)
 * // => { ore: 25, petroleum: 12, total: 37 }
 */
export function calculateStorageCosts(currentResources: {
  credits: number;
  food: number;
  ore: number;
  petroleum: number;
}): StorageCosts {
  const costs: StorageCosts = { ore: 0, petroleum: 0, total: 0 };

  for (const resource of RESOURCES_WITH_STORAGE_COSTS) {
    const typedResource = resource as StorageCostResource;
    const cap = RESOURCE_CAPS[typedResource];
    const threshold = cap * STORAGE_COST_THRESHOLD;
    const current = currentResources[typedResource];

    if (current > threshold) {
      const excess = current - threshold;
      costs[typedResource] = Math.floor(excess * STORAGE_COST_RATE);
      costs.total += costs[typedResource];
    }
  }

  return costs;
}

/**
 * Apply resource caps and return overflow amounts
 *
 * Resources that exceed their maximum storage capacity are lost.
 * This simulates spoilage, theft, and storage limitations.
 *
 * @param resources - Current resource totals (after production)
 * @returns Object with capped resources and overflow amounts
 *
 * @example
 * applyResourceCaps({
 *   credits: 12000000,  // Over 10M cap
 *   food: 150000,       // Over 100K cap
 *   ore: 40000,         // Under 50K cap
 *   petroleum: 20000,   // Under 25K cap
 *   researchPoints: 500 // No cap
 * })
 * // => {
 * //   capped: { credits: 10000000, food: 100000, ore: 40000, petroleum: 20000, researchPoints: 500 },
 * //   overflow: { credits: 2000000, food: 50000, ore: 0, petroleum: 0 }
 * // }
 */
export function applyResourceCaps(resources: {
  credits: number;
  food: number;
  ore: number;
  petroleum: number;
  researchPoints: number;
}): {
  capped: typeof resources;
  overflow: ResourceOverflow;
} {
  const capped = { ...resources };
  const overflow: ResourceOverflow = { credits: 0, food: 0, ore: 0, petroleum: 0 };

  // Apply caps to each resource (except researchPoints which has no cap)
  const cappedResources: (keyof ResourceOverflow)[] = ['credits', 'food', 'ore', 'petroleum'];

  for (const resource of cappedResources) {
    const cap = RESOURCE_CAPS[resource];
    if (capped[resource] > cap) {
      overflow[resource] = capped[resource] - cap;
      capped[resource] = cap;
    }
  }

  return { capped, overflow };
}

/**
 * Check if any resources would overflow
 *
 * Utility function to determine if caps would be exceeded.
 *
 * @param resources - Resources to check
 * @returns true if any resource exceeds its cap
 */
export function wouldOverflow(resources: {
  credits: number;
  food: number;
  ore: number;
  petroleum: number;
}): boolean {
  return (
    resources.credits > RESOURCE_CAPS.credits ||
    resources.food > RESOURCE_CAPS.food ||
    resources.ore > RESOURCE_CAPS.ore ||
    resources.petroleum > RESOURCE_CAPS.petroleum
  );
}

/**
 * Check if storage costs would apply
 *
 * Utility function to determine if resources are above storage threshold.
 *
 * @param currentResources - Current resource stockpiles
 * @returns true if any resource with storage costs exceeds threshold
 */
export function hasStorageCosts(currentResources: {
  ore: number;
  petroleum: number;
}): boolean {
  for (const resource of RESOURCES_WITH_STORAGE_COSTS) {
    const typedResource = resource as StorageCostResource;
    const cap = RESOURCE_CAPS[typedResource];
    const threshold = cap * STORAGE_COST_THRESHOLD;
    if (currentResources[typedResource] > threshold) {
      return true;
    }
  }
  return false;
}

/**
 * Get the storage threshold for a resource
 *
 * @param resource - Resource type
 * @returns Threshold value (50% of cap) or Infinity for uncapped resources
 */
export function getStorageThreshold(resource: keyof typeof RESOURCE_CAPS): number {
  const cap = RESOURCE_CAPS[resource];
  if (cap === Infinity) return Infinity;
  return cap * STORAGE_COST_THRESHOLD;
}

/**
 * Get the remaining capacity for a resource before hitting cap
 *
 * @param resource - Resource type
 * @param currentAmount - Current stockpile
 * @returns Remaining capacity (0 if at or over cap)
 */
export function getRemainingCapacity(
  resource: keyof typeof RESOURCE_CAPS,
  currentAmount: number
): number {
  const cap = RESOURCE_CAPS[resource];
  if (cap === Infinity) return Infinity;
  return Math.max(0, cap - currentAmount);
}

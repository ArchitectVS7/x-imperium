/**
 * Resource Tier Service
 *
 * Handles Tier 1-3 resource management:
 * - Auto-production of Tier 1 resources from specialized sectors
 * - Tier 1 production from Industrial sectors
 * - Resource inventory management
 *
 * Based on docs/crafting-system.md Part 1: Resource Tiers
 */

import type { Sector, ResourceInventory } from "@/lib/db/schema";
import {
  TIER_1_RECIPES,
  RESOURCE_TIERS,
  type Tier1Resource,
  type CraftedResource,
} from "../../constants/crafting";

// =============================================================================
// TYPES
// =============================================================================

export interface Tier1AutoProduction {
  resourceType: Tier1Resource;
  quantity: number;
  sourceType: string;
  sourceSectors: number;
}

export interface ResourceInventoryMap {
  // Tier 1
  refined_metals: number;
  fuel_cells: number;
  polymers: number;
  processed_food: number;
  labor_units: number;
  // Tier 2
  electronics: number;
  armor_plating: number;
  propulsion_units: number;
  life_support: number;
  weapons_grade_alloy: number;
  targeting_arrays: number;
  stealth_composites: number;
  quantum_processors: number;
  // Tier 3
  reactor_cores: number;
  shield_generators: number;
  warp_drives: number;
  cloaking_devices: number;
  ion_cannon_cores: number;
  neural_interfaces: number;
  singularity_containment: number;
  bioweapon_synthesis: number;
  nuclear_warheads: number;
}

export interface Tier1ProductionResult {
  productions: Tier1AutoProduction[];
  totalByResource: Partial<Record<Tier1Resource, number>>;
}

export interface ResourceCheckResult {
  hasResources: boolean;
  missing: Partial<Record<CraftedResource, number>>;
  available: Partial<Record<CraftedResource, number>>;
}

// =============================================================================
// TIER 1 AUTO-PRODUCTION
// =============================================================================

/**
 * Calculate Tier 1 auto-production from specialized sectors
 *
 * Ore sectors produce Refined Metals (10% of ore output)
 * Petroleum sectors produce Fuel Cells (10% of petroleum output)
 * Food sectors produce Processed Food (5% of food output)
 * Urban sectors produce Labor Units (5% of population-related output)
 * Industrial sectors process Tier 0 → Tier 1 (configured separately)
 *
 * @param sectors - Sectors owned by empire
 * @param baseProduction - Base Tier 0 resource production this turn
 * @returns Tier 1 production breakdown
 */
export function calculateTier1AutoProduction(
  sectors: Sector[],
  baseProduction: { food: number; ore: number; petroleum: number }
): Tier1ProductionResult {
  const productions: Tier1AutoProduction[] = [];
  const totalByResource: Partial<Record<Tier1Resource, number>> = {};

  // Count sectors by type for Industrial sector processing
  const sectorCounts = sectors.reduce(
    (acc, sector) => {
      acc[sector.type] = (acc[sector.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Ore Sectors → Refined Metals (10% of ore production)
  if (baseProduction.ore > 0 && sectorCounts.ore) {
    const refinedMetals = Math.floor(baseProduction.ore * 0.1);
    if (refinedMetals > 0) {
      productions.push({
        resourceType: "refined_metals",
        quantity: refinedMetals,
        sourceType: "ore",
        sourceSectors: sectorCounts.ore,
      });
      totalByResource.refined_metals = (totalByResource.refined_metals || 0) + refinedMetals;
    }
  }

  // Petroleum Sectors → Fuel Cells (10% of petroleum production)
  if (baseProduction.petroleum > 0 && sectorCounts.petroleum) {
    const fuelCells = Math.floor(baseProduction.petroleum * 0.1);
    if (fuelCells > 0) {
      productions.push({
        resourceType: "fuel_cells",
        quantity: fuelCells,
        sourceType: "petroleum",
        sourceSectors: sectorCounts.petroleum,
      });
      totalByResource.fuel_cells = (totalByResource.fuel_cells || 0) + fuelCells;
    }
  }

  // Food Sectors → Processed Food (5% of food production)
  if (baseProduction.food > 0 && sectorCounts.food) {
    const processedFood = Math.floor(baseProduction.food * 0.05);
    if (processedFood > 0) {
      productions.push({
        resourceType: "processed_food",
        quantity: processedFood,
        sourceType: "food",
        sourceSectors: sectorCounts.food,
      });
      totalByResource.processed_food = (totalByResource.processed_food || 0) + processedFood;
    }
  }

  // Urban Sectors → Labor Units (5% based on urban credit production, converted to units)
  // Approximation: 1 labor unit per 1000 credits of urban production
  if (sectorCounts.urban) {
    const urbanProduction = sectorCounts.urban * 1000; // 1000 credits per urban sector
    const laborUnits = Math.floor((urbanProduction * 0.05) / 50); // 50 credits per labor unit
    if (laborUnits > 0) {
      productions.push({
        resourceType: "labor_units",
        quantity: laborUnits,
        sourceType: "urban",
        sourceSectors: sectorCounts.urban,
      });
      totalByResource.labor_units = (totalByResource.labor_units || 0) + laborUnits;
    }
  }

  return { productions, totalByResource };
}

/**
 * Calculate Industrial sector Tier 1 production
 *
 * Industrial sectors can process any Tier 0 resource into Tier 1.
 * Each Industrial sector produces a fixed amount based on research level.
 *
 * NOTE: This is a simplified implementation for Phase 1. Currently only
 * produces polymers. Full implementation with player-configurable priorities
 * and support for all Tier 1 resources will be added in a future phase.
 * See docs/crafting-system.md for full specification.
 *
 * @param industrialSectorCount - Number of industrial sectors
 * @param researchLevel - Empire's research level (affects efficiency)
 * @param tier0Resources - Available Tier 0 resources to process
 * @returns Tier 1 resources produced and Tier 0 resources consumed
 */
export function calculateIndustrialProduction(
  industrialSectorCount: number,
  researchLevel: number,
  tier0Resources: { ore: number; petroleum: number; food: number }
): {
  produced: Partial<Record<Tier1Resource, number>>;
  consumed: { ore: number; petroleum: number; food: number };
} {
  if (industrialSectorCount === 0) {
    return {
      produced: {},
      consumed: { ore: 0, petroleum: 0, food: 0 },
    };
  }

  // Base production per industrial sector: 10 units
  // Research level adds 5% efficiency per level
  const baseProduction = 10;
  const efficiencyBonus = 1 + researchLevel * 0.05;
  const productionPerSector = Math.floor(baseProduction * efficiencyBonus);
  const totalCapacity = productionPerSector * industrialSectorCount;

  // Priority: Polymers (need both petroleum and ore), then Refined Metals, then Fuel Cells
  const produced: Partial<Record<Tier1Resource, number>> = {};
  const consumed = { ore: 0, petroleum: 0, food: 0 };
  let remainingCapacity = totalCapacity;

  // Polymers: 30 petroleum + 20 ore → 1 polymer
  const polymerRecipe = TIER_1_RECIPES.polymers;
  const maxPolymers = Math.min(
    Math.floor(tier0Resources.petroleum / (polymerRecipe.inputs.petroleum || 30)),
    Math.floor(tier0Resources.ore / (polymerRecipe.inputs.ore || 20)),
    Math.floor(remainingCapacity / 2) // Polymers take more effort
  );
  if (maxPolymers > 0) {
    produced.polymers = maxPolymers;
    consumed.petroleum += maxPolymers * (polymerRecipe.inputs.petroleum || 30);
    consumed.ore += maxPolymers * (polymerRecipe.inputs.ore || 20);
    remainingCapacity -= maxPolymers * 2;
  }

  // Use remaining capacity for other Tier 1 resources proportionally
  // This is a simplified approach - full implementation would have player-configurable priorities

  return { produced, consumed };
}

// =============================================================================
// RESOURCE INVENTORY MANAGEMENT
// =============================================================================

/**
 * Convert database resource inventory records to a map
 *
 * @param inventory - Array of ResourceInventory records
 * @returns ResourceInventoryMap with all resource quantities
 */
export function inventoryToMap(inventory: ResourceInventory[]): ResourceInventoryMap {
  const map: ResourceInventoryMap = {
    // Tier 1
    refined_metals: 0,
    fuel_cells: 0,
    polymers: 0,
    processed_food: 0,
    labor_units: 0,
    // Tier 2
    electronics: 0,
    armor_plating: 0,
    propulsion_units: 0,
    life_support: 0,
    weapons_grade_alloy: 0,
    targeting_arrays: 0,
    stealth_composites: 0,
    quantum_processors: 0,
    // Tier 3
    reactor_cores: 0,
    shield_generators: 0,
    warp_drives: 0,
    cloaking_devices: 0,
    ion_cannon_cores: 0,
    neural_interfaces: 0,
    singularity_containment: 0,
    bioweapon_synthesis: 0,
    nuclear_warheads: 0,
  };

  for (const item of inventory) {
    const resourceType = item.resourceType as CraftedResource;
    if (resourceType in map) {
      map[resourceType] = item.quantity;
    }
  }

  return map;
}

/**
 * Check if empire has required resources for a recipe
 *
 * @param inventory - Current resource inventory map
 * @param requirements - Required resources (partial record)
 * @returns Check result with missing and available resources
 */
export function checkResourceRequirements(
  inventory: ResourceInventoryMap,
  requirements: Partial<Record<CraftedResource, number>>
): ResourceCheckResult {
  const missing: Partial<Record<CraftedResource, number>> = {};
  const available: Partial<Record<CraftedResource, number>> = {};
  let hasResources = true;

  for (const [resource, required] of Object.entries(requirements)) {
    const resourceType = resource as CraftedResource;
    const current = inventory[resourceType] || 0;
    available[resourceType] = current;

    if (current < required) {
      hasResources = false;
      missing[resourceType] = required - current;
    }
  }

  return { hasResources, missing, available };
}

/**
 * Deduct resources from inventory (for crafting)
 *
 * @param inventory - Current resource inventory map
 * @param costs - Resources to deduct
 * @returns Updated inventory map
 */
export function deductResources(
  inventory: ResourceInventoryMap,
  costs: Partial<Record<CraftedResource, number>>
): ResourceInventoryMap {
  const updated = { ...inventory };

  for (const [resource, amount] of Object.entries(costs)) {
    const resourceType = resource as CraftedResource;
    updated[resourceType] = Math.max(0, (updated[resourceType] || 0) - amount);
  }

  return updated;
}

/**
 * Add resources to inventory
 *
 * @param inventory - Current resource inventory map
 * @param additions - Resources to add
 * @returns Updated inventory map
 */
export function addResources(
  inventory: ResourceInventoryMap,
  additions: Partial<Record<CraftedResource, number>>
): ResourceInventoryMap {
  const updated = { ...inventory };

  for (const [resource, amount] of Object.entries(additions)) {
    const resourceType = resource as CraftedResource;
    updated[resourceType] = (updated[resourceType] || 0) + amount;
  }

  return updated;
}

// =============================================================================
// RESOURCE TIER UTILITIES
// =============================================================================

/**
 * Get the tier of a crafted resource
 *
 * @param resource - Resource type
 * @returns Tier number (1, 2, or 3)
 */
export function getResourceTier(resource: CraftedResource): 1 | 2 | 3 {
  return RESOURCE_TIERS[resource];
}

/**
 * Check if a resource requires Black Market access
 *
 * @param resource - Resource type to check
 * @returns true if Black Market only
 */
export function isBlackMarketOnly(resource: CraftedResource): boolean {
  return resource === "bioweapon_synthesis" || resource === "nuclear_warheads";
}

/**
 * Get all resources of a specific tier
 *
 * @param tier - Tier number (1, 2, or 3)
 * @returns Array of resource types in that tier
 */
export function getResourcesByTier(tier: 1 | 2 | 3): CraftedResource[] {
  return Object.entries(RESOURCE_TIERS)
    .filter(([, t]) => t === tier)
    .map(([resource]) => resource as CraftedResource);
}

/**
 * Calculate total inventory value (for networth contribution)
 *
 * Simple valuation: Tier 1 = 10, Tier 2 = 50, Tier 3 = 200 per unit
 *
 * @param inventory - Resource inventory map
 * @returns Total value in credits equivalent
 */
export function calculateInventoryValue(inventory: ResourceInventoryMap): number {
  const tierValues = { 1: 10, 2: 50, 3: 200 };
  let total = 0;

  for (const [resource, quantity] of Object.entries(inventory)) {
    const tier = RESOURCE_TIERS[resource as CraftedResource];
    if (tier) {
      total += quantity * tierValues[tier];
    }
  }

  return total;
}

// =============================================================================
// TIER ENUM MAPPING
// =============================================================================

/**
 * Map numeric tier to database enum string
 * This ensures consistency between TypeScript tier numbers and database enum values
 */
export const TIER_TO_ENUM: Record<1 | 2 | 3, "tier1" | "tier2" | "tier3"> = {
  1: "tier1",
  2: "tier2",
  3: "tier3",
} as const;

// =============================================================================
// EMPTY INVENTORY FACTORY
// =============================================================================

/**
 * Create an empty resource inventory map
 *
 * @returns ResourceInventoryMap with all values set to 0
 */
export function createEmptyInventory(): ResourceInventoryMap {
  return {
    // Tier 1
    refined_metals: 0,
    fuel_cells: 0,
    polymers: 0,
    processed_food: 0,
    labor_units: 0,
    // Tier 2
    electronics: 0,
    armor_plating: 0,
    propulsion_units: 0,
    life_support: 0,
    weapons_grade_alloy: 0,
    targeting_arrays: 0,
    stealth_composites: 0,
    quantum_processors: 0,
    // Tier 3
    reactor_cores: 0,
    shield_generators: 0,
    warp_drives: 0,
    cloaking_devices: 0,
    ion_cannon_cores: 0,
    neural_interfaces: 0,
    singularity_containment: 0,
    bioweapon_synthesis: 0,
    nuclear_warheads: 0,
  };
}

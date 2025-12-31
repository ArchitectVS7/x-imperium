/**
 * Sector Traits Service (M10.1)
 *
 * Implements strategic variety through sector traits that provide bonuses.
 * Different sectors have distinct characteristics affecting gameplay.
 *
 * From IMPLEMENTATION-02.md:
 * - Core Worlds: +20% credits
 * - Mining Belt: +20% ore
 * - Frontier: +20% research
 * - Dead Zone: -20% pop growth, fewer competitors
 * - Nebula Region: +20% covert success
 */

import type { GalaxyRegion } from "@/lib/db/schema";

// =============================================================================
// TYPES
// =============================================================================

export type SectorTrait =
  | "core_worlds"
  | "mining_belt"
  | "frontier"
  | "dead_zone"
  | "nebula_region";

export interface SectorBonus {
  /** Multiplier for credit generation (1.0 = normal) */
  creditMultiplier: number;
  /** Multiplier for ore production */
  oreMultiplier: number;
  /** Multiplier for research points */
  researchMultiplier: number;
  /** Multiplier for population growth */
  populationGrowthMultiplier: number;
  /** Multiplier for bot density (affects competition) */
  botDensityMultiplier: number;
  /** Bonus to covert operation success (additive, e.g., 0.20 = +20%) */
  covertSuccessBonus: number;
  /** Human-readable description */
  description: string;
}

export interface SectorTraitAssignment {
  sectorId: string;
  trait: SectorTrait;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Sector trait bonuses as defined in IMPLEMENTATION-02.md
 */
export const SECTOR_TRAIT_BONUSES: Record<SectorTrait, SectorBonus> = {
  core_worlds: {
    creditMultiplier: 1.2,
    oreMultiplier: 1.0,
    researchMultiplier: 1.0,
    populationGrowthMultiplier: 1.0,
    botDensityMultiplier: 1.0,
    covertSuccessBonus: 0,
    description: "+20% credit generation",
  },
  mining_belt: {
    creditMultiplier: 1.0,
    oreMultiplier: 1.2,
    researchMultiplier: 1.0,
    populationGrowthMultiplier: 1.0,
    botDensityMultiplier: 1.0,
    covertSuccessBonus: 0,
    description: "+20% ore production",
  },
  frontier: {
    creditMultiplier: 1.0,
    oreMultiplier: 1.0,
    researchMultiplier: 1.2,
    populationGrowthMultiplier: 1.0,
    botDensityMultiplier: 1.0,
    covertSuccessBonus: 0,
    description: "+20% research points",
  },
  dead_zone: {
    creditMultiplier: 1.0,
    oreMultiplier: 1.0,
    researchMultiplier: 1.0,
    populationGrowthMultiplier: 0.8,
    botDensityMultiplier: 0.5,
    covertSuccessBonus: 0,
    description: "-20% pop growth, fewer competitors",
  },
  nebula_region: {
    creditMultiplier: 1.0,
    oreMultiplier: 1.0,
    researchMultiplier: 1.0,
    populationGrowthMultiplier: 1.0,
    botDensityMultiplier: 1.0,
    covertSuccessBonus: 0.2,
    description: "+20% covert ops success",
  },
};

/**
 * Default trait distribution for 10 sectors
 * Ensures balanced variety across the galaxy
 */
export const DEFAULT_TRAIT_DISTRIBUTION: SectorTrait[] = [
  "core_worlds",
  "core_worlds", // 2
  "mining_belt",
  "mining_belt", // 2
  "frontier",
  "frontier", // 2
  "dead_zone", // 1
  "nebula_region", // 1
  "core_worlds", // 1 extra
  "mining_belt", // 1 extra
];

// =============================================================================
// PURE FUNCTIONS
// =============================================================================

/**
 * Get bonus values for a specific sector trait
 */
export function getSectorBonus(trait: SectorTrait): SectorBonus {
  return SECTOR_TRAIT_BONUSES[trait];
}

/**
 * Get neutral/default bonus (1.0 multipliers, no bonuses)
 */
export function getNeutralBonus(): SectorBonus {
  return {
    creditMultiplier: 1.0,
    oreMultiplier: 1.0,
    researchMultiplier: 1.0,
    populationGrowthMultiplier: 1.0,
    botDensityMultiplier: 1.0,
    covertSuccessBonus: 0,
    description: "Standard sector",
  };
}

/**
 * Fisher-Yates shuffle algorithm for randomizing trait distribution
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

/**
 * Assign sector traits to sectors at game creation
 *
 * Uses a shuffled distribution to ensure variety while maintaining balance.
 *
 * @param sectorCount - Number of sectors in the game
 * @returns Map of sector ID to trait
 *
 * @example
 * assignSectorTraits(10)
 * // => Map { "sector-0" => "frontier", "sector-1" => "mining_belt", ... }
 */
export function assignSectorTraits(
  sectorCount: number
): Map<string, SectorTrait> {
  // Get traits to distribute
  let traits: SectorTrait[];

  if (sectorCount <= DEFAULT_TRAIT_DISTRIBUTION.length) {
    // Use default distribution, shuffled
    traits = shuffleArray(DEFAULT_TRAIT_DISTRIBUTION.slice(0, sectorCount));
  } else {
    // Repeat distribution for larger games
    traits = [];
    while (traits.length < sectorCount) {
      traits.push(...DEFAULT_TRAIT_DISTRIBUTION);
    }
    traits = shuffleArray(traits.slice(0, sectorCount));
  }

  // Create assignments
  const assignments = new Map<string, SectorTrait>();
  for (let i = 0; i < sectorCount; i++) {
    assignments.set(`sector-${i}`, traits[i]!);
  }

  return assignments;
}

/**
 * Apply sector trait bonus to resource production
 *
 * @param baseCredits - Base credit production before bonus
 * @param trait - Sector trait to apply
 * @returns Modified credit production
 */
export function applyCreditBonus(
  baseCredits: number,
  trait: SectorTrait
): number {
  const bonus = getSectorBonus(trait);
  return Math.floor(baseCredits * bonus.creditMultiplier);
}

/**
 * Apply sector trait bonus to ore production
 */
export function applyOreBonus(baseOre: number, trait: SectorTrait): number {
  const bonus = getSectorBonus(trait);
  return Math.floor(baseOre * bonus.oreMultiplier);
}

/**
 * Apply sector trait bonus to research production
 */
export function applyResearchBonus(
  baseResearch: number,
  trait: SectorTrait
): number {
  const bonus = getSectorBonus(trait);
  return Math.floor(baseResearch * bonus.researchMultiplier);
}

/**
 * Apply sector trait to population growth
 */
export function applyPopulationGrowthBonus(
  baseGrowth: number,
  trait: SectorTrait
): number {
  const bonus = getSectorBonus(trait);
  return Math.floor(baseGrowth * bonus.populationGrowthMultiplier);
}

/**
 * Get covert success bonus for a sector trait
 */
export function getCovertSuccessBonus(trait: SectorTrait): number {
  const bonus = getSectorBonus(trait);
  return bonus.covertSuccessBonus;
}

/**
 * Get bot density modifier for a sector trait
 * Used during game creation to adjust bot placement
 */
export function getBotDensityModifier(trait: SectorTrait): number {
  const bonus = getSectorBonus(trait);
  return bonus.botDensityMultiplier;
}

/**
 * Apply all sector trait bonuses to resource delta
 *
 * @param resources - Base resource production
 * @param trait - Sector trait to apply
 * @returns Modified resource production
 */
export function applySectorTraitBonuses(
  resources: {
    credits: number;
    ore: number;
    researchPoints: number;
  },
  trait: SectorTrait
): {
  credits: number;
  ore: number;
  researchPoints: number;
} {
  const bonus = getSectorBonus(trait);

  return {
    credits: Math.floor(resources.credits * bonus.creditMultiplier),
    ore: Math.floor(resources.ore * bonus.oreMultiplier),
    researchPoints: Math.floor(
      resources.researchPoints * bonus.researchMultiplier
    ),
  };
}

/**
 * Validate that a trait string is a valid SectorTrait
 */
export function isValidSectorTrait(trait: string): trait is SectorTrait {
  return trait in SECTOR_TRAIT_BONUSES;
}

/**
 * Get trait display name (human-readable)
 */
export function getTraitDisplayName(trait: SectorTrait): string {
  const names: Record<SectorTrait, string> = {
    core_worlds: "Core Worlds",
    mining_belt: "Mining Belt",
    frontier: "Frontier",
    dead_zone: "Dead Zone",
    nebula_region: "Nebula Region",
  };
  return names[trait];
}

/**
 * Get trait icon (emoji for UI)
 */
export function getTraitIcon(trait: SectorTrait): string {
  const icons: Record<SectorTrait, string> = {
    core_worlds: "🏛️",
    mining_belt: "⛏️",
    frontier: "🔬",
    dead_zone: "💀",
    nebula_region: "🌫️",
  };
  return icons[trait];
}

/**
 * Map from region type to sector trait
 * Used to convert existing regions to the trait system
 */
export function regionTypeToSectorTrait(
  regionType: GalaxyRegion["regionType"]
): SectorTrait {
  const mapping: Record<GalaxyRegion["regionType"], SectorTrait> = {
    core: "core_worlds",
    inner: "core_worlds",
    outer: "frontier",
    rim: "dead_zone",
    void: "nebula_region",
  };
  return mapping[regionType];
}

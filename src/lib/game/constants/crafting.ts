/**
 * Crafting System Constants
 *
 * Defines the 4-tier resource system, recipes, and crafting times.
 * Based on docs/crafting-system.md
 */

// =============================================================================
// RESOURCE TIER DEFINITIONS
// =============================================================================

export type Tier0Resource = "credits" | "food" | "ore" | "petroleum" | "research_points" | "population";

export type Tier1Resource =
  | "refined_metals"
  | "fuel_cells"
  | "polymers"
  | "processed_food"
  | "labor_units";

export type Tier2Resource =
  | "electronics"
  | "armor_plating"
  | "propulsion_units"
  | "life_support"
  | "weapons_grade_alloy"
  | "targeting_arrays"
  | "stealth_composites"
  | "quantum_processors";

export type Tier3Resource =
  | "reactor_cores"
  | "shield_generators"
  | "warp_drives"
  | "cloaking_devices"
  | "ion_cannon_cores"
  | "neural_interfaces"
  | "singularity_containment"
  | "bioweapon_synthesis"
  | "nuclear_warheads";

export type CraftedResource = Tier1Resource | Tier2Resource | Tier3Resource;

// =============================================================================
// TIER 1 RECIPES - Refined Resources
// =============================================================================

export interface Tier1Recipe {
  inputs: Partial<Record<Tier0Resource, number>>;
  craftingTime: number; // turns
  autoProduction?: {
    sectorType: string;
    percentOfOutput: number;
  };
}

export const TIER_1_RECIPES: Record<Tier1Resource, Tier1Recipe> = {
  refined_metals: {
    inputs: { ore: 100 },
    craftingTime: 1,
    autoProduction: { sectorType: "ore", percentOfOutput: 0.10 },
  },
  fuel_cells: {
    inputs: { petroleum: 50, credits: 20 },
    craftingTime: 1,
    autoProduction: { sectorType: "petroleum", percentOfOutput: 0.10 },
  },
  polymers: {
    inputs: { petroleum: 30, ore: 20 },
    craftingTime: 1,
    // Only from Industrial Sectors
  },
  processed_food: {
    inputs: { food: 200 },
    craftingTime: 1,
    autoProduction: { sectorType: "food", percentOfOutput: 0.05 },
  },
  labor_units: {
    inputs: { population: 1000, credits: 50 },
    craftingTime: 1,
    autoProduction: { sectorType: "urban", percentOfOutput: 0.05 },
  },
};

// =============================================================================
// TIER 2 RECIPES - Manufactured Components
// =============================================================================

export interface Tier2Recipe {
  inputs: Partial<Record<Tier1Resource, number>>;
  researchRequired: number; // research level
  craftingTime: number; // turns
}

// Unified Tier 2 Recipes - includes dependencies on other Tier 2 components
export interface Tier2RecipeUnified {
  inputs: Partial<Record<Tier1Resource | Tier2Resource, number>>;
  researchRequired: number;
  craftingTime: number;
}

export const TIER_2_RECIPES: Record<Tier2Resource, Tier2RecipeUnified> = {
  electronics: {
    inputs: { refined_metals: 2, polymers: 1 },
    researchRequired: 1,
    craftingTime: 2,
  },
  armor_plating: {
    inputs: { refined_metals: 3, polymers: 1 },
    researchRequired: 1,
    craftingTime: 2,
  },
  propulsion_units: {
    inputs: { fuel_cells: 2, refined_metals: 1 },
    researchRequired: 1,
    craftingTime: 2,
  },
  life_support: {
    inputs: { processed_food: 1, polymers: 1 },
    researchRequired: 2,
    craftingTime: 3,
  },
  weapons_grade_alloy: {
    inputs: { refined_metals: 4, fuel_cells: 2 },
    researchRequired: 2,
    craftingTime: 3,
  },
  // Advanced Tier 2 - require other Tier 2 components (per docs/crafting-system.md)
  targeting_arrays: {
    inputs: { electronics: 2, refined_metals: 1 },
    researchRequired: 2,
    craftingTime: 2,
  },
  stealth_composites: {
    inputs: { polymers: 3, electronics: 1 },
    researchRequired: 3,
    craftingTime: 3,
  },
  quantum_processors: {
    inputs: { electronics: 3, weapons_grade_alloy: 1 },
    researchRequired: 4,
    craftingTime: 4,
  },
};

// Legacy export for backwards compatibility (deprecated - use TIER_2_RECIPES instead)
export const TIER_2_EXTENDED_RECIPES: Record<string, Tier2RecipeUnified> = {};

// =============================================================================
// TIER 3 RECIPES - Advanced Systems
// =============================================================================

export interface Tier3Recipe {
  inputs: Partial<Record<Tier2Resource | Tier3Resource, number>>;
  researchRequired: number;
  craftingTime: number;
  blackMarketOnly?: boolean; // Some items only available via Black Market
}

// Unified Tier 3 Recipes - includes dependencies on other Tier 3 components (per docs/crafting-system.md)
export const TIER_3_RECIPES: Record<Tier3Resource, Tier3Recipe> = {
  reactor_cores: {
    inputs: { propulsion_units: 3, electronics: 2, quantum_processors: 1 },
    researchRequired: 4,
    craftingTime: 5,
  },
  shield_generators: {
    inputs: { armor_plating: 2, electronics: 2, quantum_processors: 1 },
    researchRequired: 4,
    craftingTime: 5,
  },
  // Advanced Tier 3 - require other Tier 3 components
  warp_drives: {
    inputs: { reactor_cores: 2, stealth_composites: 1, targeting_arrays: 1 },
    researchRequired: 5,
    craftingTime: 6,
  },
  cloaking_devices: {
    inputs: { stealth_composites: 3, quantum_processors: 2 },
    researchRequired: 5,
    craftingTime: 6,
  },
  ion_cannon_cores: {
    inputs: { weapons_grade_alloy: 2, reactor_cores: 2, targeting_arrays: 1 },
    researchRequired: 5,
    craftingTime: 6,
  },
  neural_interfaces: {
    inputs: { quantum_processors: 2, life_support: 1 },
    researchRequired: 6,
    craftingTime: 7,
  },
  singularity_containment: {
    inputs: { reactor_cores: 3, shield_generators: 2 },
    researchRequired: 7,
    craftingTime: 8,
  },
  // Black Market only items
  bioweapon_synthesis: {
    inputs: { life_support: 2, quantum_processors: 1 },
    researchRequired: 6,
    craftingTime: 5,
    blackMarketOnly: true,
  },
  nuclear_warheads: {
    inputs: { weapons_grade_alloy: 3 },
    researchRequired: 5,
    craftingTime: 4,
    blackMarketOnly: true,
  },
};

// Legacy export for backwards compatibility (deprecated - use TIER_3_RECIPES instead)
export const TIER_3_EXTENDED_RECIPES: Record<string, Tier3Recipe> = {};

// =============================================================================
// MILITARY CRAFTING REQUIREMENTS
// =============================================================================

export interface MilitaryCraftingCost {
  credits: number;
  components: Partial<Record<Tier2Resource | Tier3Resource, number>>;
  researchRequired: number;
  buildTime: number; // turns
}

export const MILITARY_CRAFTING_COSTS: Record<string, MilitaryCraftingCost> = {
  // Tier 2 Units (Research 1+)
  marines: {
    credits: 150,
    components: { armor_plating: 1 },
    researchRequired: 1,
    buildTime: 1,
  },
  interceptors: {
    credits: 400,
    components: { propulsion_units: 1, electronics: 1 },
    researchRequired: 1,
    buildTime: 1,
  },
  light_cruiser: {
    credits: 5_000,
    components: { armor_plating: 2, propulsion_units: 2 },
    researchRequired: 1,
    buildTime: 2,
  },
  defense_station: {
    credits: 3_000,
    components: { armor_plating: 1, electronics: 1 },
    researchRequired: 2,
    buildTime: 3,
  },

  // Tier 3 Units (Research 2-3)
  powered_infantry: {
    credits: 500,
    components: { armor_plating: 2, propulsion_units: 1 },
    researchRequired: 2,
    buildTime: 2,
  },
  commandos: {
    credits: 800,
    components: { stealth_composites: 1, electronics: 1 },
    researchRequired: 3,
    buildTime: 2,
  },
  bombers: {
    credits: 600,
    components: { weapons_grade_alloy: 1, targeting_arrays: 1 },
    researchRequired: 2,
    buildTime: 2,
  },
  stealth_fighters: {
    credits: 1_000,
    components: { stealth_composites: 2, propulsion_units: 1 },
    researchRequired: 3,
    buildTime: 2,
  },
  heavy_cruiser: {
    credits: 15_000,
    components: { armor_plating: 3, propulsion_units: 2, reactor_cores: 1 },
    researchRequired: 3,
    buildTime: 3,
  },
  missile_platform: {
    credits: 6_000,
    components: { targeting_arrays: 2, weapons_grade_alloy: 1 },
    researchRequired: 3,
    buildTime: 3,
  },
  enhanced_carrier: {
    credits: 25_000,
    components: { armor_plating: 2, life_support: 2 },
    researchRequired: 3,
    buildTime: 4,
  },

  // Tier 4 Units (Research 4-5)
  battlecruiser: {
    credits: 35_000,
    components: { weapons_grade_alloy: 3, reactor_cores: 2, shield_generators: 2 },
    researchRequired: 4,
    buildTime: 4,
  },
  shield_fortress: {
    credits: 15_000,
    components: { shield_generators: 2, reactor_cores: 1 },
    researchRequired: 4,
    buildTime: 4,
  },
  dreadnought: {
    credits: 80_000,
    components: { reactor_cores: 3, shield_generators: 2, ion_cannon_cores: 1 },
    researchRequired: 5,
    buildTime: 5,
  },
  stealth_cruiser: {
    credits: 50_000,
    components: { cloaking_devices: 2, reactor_cores: 1, neural_interfaces: 1 },
    researchRequired: 5,
    buildTime: 5,
  },
  ion_cannon: {
    credits: 40_000,
    components: { ion_cannon_cores: 1, targeting_arrays: 1, reactor_cores: 1 },
    researchRequired: 5,
    buildTime: 5,
  },

  // Tier 5 Units (Research 7)
  sector_shield: {
    credits: 100_000,
    components: { shield_generators: 3, reactor_cores: 2, singularity_containment: 1 },
    researchRequired: 7,
    buildTime: 8,
  },
};

// =============================================================================
// STRATEGIC SYSTEMS COSTS
// =============================================================================

export const STRATEGIC_SYSTEMS_COSTS: Record<string, MilitaryCraftingCost> = {
  targeting_computer: {
    credits: 10_000,
    components: { targeting_arrays: 2, quantum_processors: 1 },
    researchRequired: 4,
    buildTime: 3,
  },
  ecm_suite: {
    credits: 12_000,
    components: { electronics: 2, stealth_composites: 1 },
    researchRequired: 3,
    buildTime: 3,
  },
  encryption_array: {
    credits: 8_000,
    components: { quantum_processors: 2 },
    researchRequired: 4,
    buildTime: 2,
  },
  tractor_beam: {
    credits: 15_000,
    components: { propulsion_units: 1, reactor_cores: 1 },
    researchRequired: 3,
    buildTime: 3,
  },
  wormhole_generator: {
    credits: 60_000,
    components: { warp_drives: 1, singularity_containment: 1 },
    researchRequired: 7,
    buildTime: 10,
  },
  virus_uplink: {
    credits: 20_000,
    components: { quantum_processors: 2, neural_interfaces: 1 },
    researchRequired: 6,
    buildTime: 4,
  },
  command_ship_upgrade: {
    credits: 25_000,
    components: { neural_interfaces: 1, reactor_cores: 1 },
    researchRequired: 4,
    buildTime: 3,
  },
};

// =============================================================================
// RESEARCH LEVEL REQUIREMENTS
// =============================================================================

export const RESEARCH_LEVELS = {
  0: { rpRequired: 0, cumulative: 0 },
  1: { rpRequired: 500, cumulative: 500 },
  2: { rpRequired: 1_500, cumulative: 2_000 },
  3: { rpRequired: 3_000, cumulative: 5_000 },
  4: { rpRequired: 5_000, cumulative: 10_000 },
  5: { rpRequired: 8_000, cumulative: 18_000 },
  6: { rpRequired: 12_000, cumulative: 30_000 },
  7: { rpRequired: 20_000, cumulative: 50_000 },
} as const;

/**
 * Research unlocks by level (0-indexed: levels 0-7)
 * Defines what technologies, units, and crafting recipes are unlocked at each research level.
 */
export const RESEARCH_UNLOCKS_BY_LEVEL: Record<number, string[]> = {
  0: [
    "Basic Military (Soldiers, Fighters)",
    "Basic Crafting (Tier 1 Resources)",
    "Trade Access",
  ],
  1: [
    "Tier 2 Components",
    "Light Cruisers",
    "Marines",
    "Interceptors",
    "Defense Stations",
    "Electronics Crafting",
    "Armor Plating Crafting",
    "Propulsion Units Crafting",
  ],
  2: [
    "Bombers",
    "Life Support Crafting",
    "Weapons Grade Alloy Crafting",
    "Targeting Arrays Crafting",
    "Advanced Covert Operations",
  ],
  3: [
    "Heavy Cruisers",
    "Stealth Composites Crafting",
    "Advanced Defense Systems",
    "Military Doctrine: Attack Bonus +5%",
  ],
  4: [
    "Tier 3 Components",
    "Battlecruisers",
    "Quantum Processors Crafting",
    "Reactor Cores Crafting",
    "Shield Generators Crafting",
    "Research Victory Path Begins",
  ],
  5: [
    "Dreadnoughts",
    "Stealth Cruisers",
    "Warp Drives Crafting",
    "Cloaking Devices Crafting",
    "Ion Cannon Cores Crafting",
    "WMD Research (with Syndicate)",
  ],
  6: [
    "Neural Interfaces Crafting",
    "Psionic Tech",
    "Advanced AI Systems",
    "Military Doctrine: Defense Bonus +10%",
  ],
  7: [
    "Singularity Containment Crafting",
    "Superweapons",
    "Research Victory Achievement",
    "Ultimate Technology Mastery",
  ],
};

export const MAX_RESEARCH_LEVEL = 7;

// =============================================================================
// RESEARCH BRANCH BONUSES
// =============================================================================

export const RESEARCH_BRANCH_BONUSES = {
  military: { thresholdPercent: 20, bonus: "+10% attack damage" },
  defense: { thresholdPercent: 20, bonus: "+10% defensive HP" },
  propulsion: { thresholdPercent: 20, bonus: "+15% fleet evasion" },
  stealth: { thresholdPercent: 20, bonus: "+20% covert success" },
  economy: { thresholdPercent: 20, bonus: "-10% crafting costs" },
  biotech: { thresholdPercent: 20, bonus: "+10% population growth" },
} as const;

export type ResearchBranch = keyof typeof RESEARCH_BRANCH_BONUSES;

// =============================================================================
// INDUSTRIAL SECTOR CONFIGURATION
// =============================================================================

export const INDUSTRIAL_SECTOR = {
  baseCost: 15_000,
  productionRate: 0, // Special processing function
  craftingTimeReductionPerResearchLevel: 0.05, // 5% faster per research level
  maxProcessingPerTurn: 10, // Max tier 1 resources produced per turn
} as const;

// =============================================================================
// RESOURCE DISPLAY LABELS
// =============================================================================

export const CRAFTED_RESOURCE_LABELS: Record<CraftedResource, string> = {
  // Tier 1
  refined_metals: "Refined Metals",
  fuel_cells: "Fuel Cells",
  polymers: "Polymers",
  processed_food: "Processed Food",
  labor_units: "Labor Units",
  // Tier 2
  electronics: "Electronics",
  armor_plating: "Armor Plating",
  propulsion_units: "Propulsion Units",
  life_support: "Life Support",
  weapons_grade_alloy: "Weapons Grade Alloy",
  targeting_arrays: "Targeting Arrays",
  stealth_composites: "Stealth Composites",
  quantum_processors: "Quantum Processors",
  // Tier 3
  reactor_cores: "Reactor Cores",
  shield_generators: "Shield Generators",
  warp_drives: "Warp Drives",
  cloaking_devices: "Cloaking Devices",
  ion_cannon_cores: "Ion Cannon Cores",
  neural_interfaces: "Neural Interfaces",
  singularity_containment: "Singularity Containment",
  bioweapon_synthesis: "Bioweapon Synthesis",
  nuclear_warheads: "Nuclear Warheads",
};

export const RESOURCE_TIERS: Record<CraftedResource, 1 | 2 | 3> = {
  // Tier 1
  refined_metals: 1,
  fuel_cells: 1,
  polymers: 1,
  processed_food: 1,
  labor_units: 1,
  // Tier 2
  electronics: 2,
  armor_plating: 2,
  propulsion_units: 2,
  life_support: 2,
  weapons_grade_alloy: 2,
  targeting_arrays: 2,
  stealth_composites: 2,
  quantum_processors: 2,
  // Tier 3
  reactor_cores: 3,
  shield_generators: 3,
  warp_drives: 3,
  cloaking_devices: 3,
  ion_cannon_cores: 3,
  neural_interfaces: 3,
  singularity_containment: 3,
  bioweapon_synthesis: 3,
  nuclear_warheads: 3,
};

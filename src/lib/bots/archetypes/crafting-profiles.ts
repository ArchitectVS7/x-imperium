/**
 * Bot Archetype Crafting Profiles
 *
 * Defines crafting, research, and Syndicate behavior for each archetype.
 * Part of Phase 5: Bot crafting/syndicate integration.
 */

import type { BotArchetype } from "../types";
import type { CraftedResource } from "@/lib/game/constants/crafting";
import type { ContractType } from "@/lib/game/constants/syndicate";

// =============================================================================
// TYPES
// =============================================================================

export interface CraftingProfile {
  /** Archetype name */
  archetype: BotArchetype;

  /** Priority order for crafting resources (first = highest priority) */
  craftingPriority: CraftedResource[];

  /** Research branch focus weights (percentages, should sum to 100) */
  researchFocus: {
    military: number;
    defense: number;
    propulsion: number;
    stealth: number;
    economy: number;
    biotech: number;
  };

  /** Willingness to engage with Syndicate (0-1) */
  syndicateWillingness: number;

  /** Preferred contract types (in order of preference) */
  contractPreference: ContractType[];

  /** Base weight for crafting decisions (0-1) */
  craftingWeight: number;

  /** Base weight for black market purchases (0-1) */
  blackMarketWeight: number;
}

// =============================================================================
// ARCHETYPE CRAFTING PROFILES
// =============================================================================

export const ARCHETYPE_CRAFTING_PROFILES: Record<BotArchetype, CraftingProfile> = {
  /**
   * Warlord: Military-focused crafting
   * - Prioritizes weapons and armor components
   * - Moderate Syndicate engagement (wants WMDs)
   * - Prefers combat-oriented contracts
   */
  warlord: {
    archetype: "warlord",
    craftingPriority: [
      "weapons_grade_alloy",
      "armor_plating",
      "reactor_cores",
      "propulsion_units",
      "targeting_arrays",
      "electronics",
    ],
    researchFocus: {
      military: 40,
      defense: 30,
      propulsion: 20,
      stealth: 0,
      economy: 5,
      biotech: 5,
    },
    syndicateWillingness: 0.6,
    contractPreference: [
      "military_probe",
      "hostile_takeover",
      "kingslayer",
      "scorched_earth",
    ],
    craftingWeight: 0.10,
    blackMarketWeight: 0.05,
  },

  /**
   * Diplomat: Peace-focused, minimal Syndicate engagement
   * - Prioritizes life support and defensive components
   * - Avoids Syndicate (reputation matters)
   * - Rarely takes contracts
   */
  diplomat: {
    archetype: "diplomat",
    craftingPriority: [
      "life_support",
      "electronics",
      "shield_generators",
      "polymers",
      "processed_food",
      "labor_units",
    ],
    researchFocus: {
      military: 10,
      defense: 25,
      propulsion: 10,
      stealth: 5,
      economy: 30,
      biotech: 20,
    },
    syndicateWillingness: 0.1,
    contractPreference: [],
    craftingWeight: 0.08,
    blackMarketWeight: 0.02,
  },

  /**
   * Merchant: Economy-focused crafting
   * - Prioritizes Tier 1 resources for selling
   * - Moderate Syndicate (business is business)
   * - Prefers economic contracts
   */
  merchant: {
    archetype: "merchant",
    craftingPriority: [
      "refined_metals",
      "fuel_cells",
      "polymers",
      "electronics",
      "processed_food",
      "labor_units",
    ],
    researchFocus: {
      military: 10,
      defense: 15,
      propulsion: 10,
      stealth: 5,
      economy: 45,
      biotech: 15,
    },
    syndicateWillingness: 0.4,
    contractPreference: [
      "economic_warfare",
      "market_manipulation",
      "supply_run",
    ],
    craftingWeight: 0.15,
    blackMarketWeight: 0.08,
  },

  /**
   * Schemer: Stealth and covert-focused
   * - Prioritizes stealth composites and cloaking
   * - High Syndicate engagement (loves underworld)
   * - Prefers manipulation contracts
   */
  schemer: {
    archetype: "schemer",
    craftingPriority: [
      "stealth_composites",
      "cloaking_devices",
      "neural_interfaces",
      "electronics",
      "quantum_processors",
      "targeting_arrays",
    ],
    researchFocus: {
      military: 15,
      defense: 10,
      propulsion: 10,
      stealth: 45,
      economy: 15,
      biotech: 5,
    },
    syndicateWillingness: 0.9,
    contractPreference: [
      "regime_change",
      "proxy_war",
      "scorched_earth",
      "intimidation",
      "intel_gathering",
    ],
    craftingWeight: 0.12,
    blackMarketWeight: 0.15,
  },

  /**
   * Turtle: Defensive crafting focus
   * - Prioritizes armor and shields
   * - Low Syndicate engagement (prefers legit)
   * - Only takes safe contracts
   */
  turtle: {
    archetype: "turtle",
    craftingPriority: [
      "armor_plating",
      "shield_generators",
      "ion_cannon_cores",
      "electronics",
      "propulsion_units",
      "life_support",
    ],
    researchFocus: {
      military: 15,
      defense: 50,
      propulsion: 10,
      stealth: 5,
      economy: 15,
      biotech: 5,
    },
    syndicateWillingness: 0.2,
    contractPreference: ["supply_run", "intel_gathering"],
    craftingWeight: 0.12,
    blackMarketWeight: 0.03,
  },

  /**
   * Blitzkrieg: Speed and aggression focused
   * - Prioritizes propulsion and weapons
   * - High Syndicate engagement (wants fast power)
   * - Prefers quick strike contracts
   */
  blitzkrieg: {
    archetype: "blitzkrieg",
    craftingPriority: [
      "propulsion_units",
      "weapons_grade_alloy",
      "targeting_arrays",
      "fuel_cells",
      "reactor_cores",
      "electronics",
    ],
    researchFocus: {
      military: 40,
      defense: 5,
      propulsion: 40,
      stealth: 5,
      economy: 5,
      biotech: 5,
    },
    syndicateWillingness: 0.7,
    contractPreference: [
      "disruption",
      "military_probe",
      "kingslayer",
      "salvage_op",
    ],
    craftingWeight: 0.08,
    blackMarketWeight: 0.10,
  },

  /**
   * Tech Rush: Research and advanced tech focused
   * - Prioritizes electronics and quantum processors
   * - Low-moderate Syndicate (prefers research path)
   * - Prefers tech-related contracts
   */
  tech_rush: {
    archetype: "tech_rush",
    craftingPriority: [
      "electronics",
      "quantum_processors",
      "neural_interfaces",
      "singularity_containment",
      "reactor_cores",
      "life_support",
    ],
    researchFocus: {
      military: 20,
      defense: 15,
      propulsion: 15,
      stealth: 15,
      economy: 25,
      biotech: 10,
    },
    syndicateWillingness: 0.3,
    contractPreference: ["salvage_op", "intel_gathering"],
    craftingWeight: 0.15,
    blackMarketWeight: 0.05,
  },

  /**
   * Opportunist: Dynamic priorities based on situation
   * - Crafting priority is dynamic (whatever's cheapest)
   * - Moderate Syndicate (depends on opportunity)
   * - Takes whatever pays best
   */
  opportunist: {
    archetype: "opportunist",
    craftingPriority: [
      "electronics",
      "armor_plating",
      "propulsion_units",
      "refined_metals",
      "fuel_cells",
      "polymers",
    ],
    researchFocus: {
      military: 25,
      defense: 20,
      propulsion: 15,
      stealth: 15,
      economy: 20,
      biotech: 5,
    },
    syndicateWillingness: 0.5,
    contractPreference: [
      "hostile_takeover",
      "salvage_op",
      "supply_run",
      "military_probe",
    ],
    craftingWeight: 0.10,
    blackMarketWeight: 0.07,
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the crafting profile for an archetype
 */
export function getCraftingProfile(archetype: BotArchetype): CraftingProfile {
  return ARCHETYPE_CRAFTING_PROFILES[archetype];
}

/**
 * Get the next resource to craft based on profile priority
 * Returns the highest priority resource that's not already in queue
 */
export function getNextCraftingPriority(
  archetype: BotArchetype,
  alreadyQueued: CraftedResource[]
): CraftedResource | null {
  const profile = ARCHETYPE_CRAFTING_PROFILES[archetype];

  for (const resource of profile.craftingPriority) {
    if (!alreadyQueued.includes(resource)) {
      return resource;
    }
  }

  return null;
}

/**
 * Check if bot should engage with Syndicate based on willingness
 */
export function shouldEngageSyndicate(
  archetype: BotArchetype,
  random: number = Math.random()
): boolean {
  const profile = ARCHETYPE_CRAFTING_PROFILES[archetype];
  return random < profile.syndicateWillingness;
}

/**
 * Get preferred contract type from profile
 */
export function getPreferredContract(
  archetype: BotArchetype,
  availableContracts: ContractType[]
): ContractType | null {
  const profile = ARCHETYPE_CRAFTING_PROFILES[archetype];

  // Find first preferred contract that's available
  for (const preferred of profile.contractPreference) {
    if (availableContracts.includes(preferred)) {
      return preferred;
    }
  }

  // If no preferred contract available, take first available (for opportunist behavior)
  if (profile.archetype === "opportunist" && availableContracts.length > 0) {
    return availableContracts[0] ?? null;
  }

  return null;
}

/**
 * Calculate adjusted decision weights including crafting
 */
export function getExtendedWeights(archetype: BotArchetype): {
  craftingWeight: number;
  blackMarketWeight: number;
} {
  const profile = ARCHETYPE_CRAFTING_PROFILES[archetype];
  return {
    craftingWeight: profile.craftingWeight,
    blackMarketWeight: profile.blackMarketWeight,
  };
}

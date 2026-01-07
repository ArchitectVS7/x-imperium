/**
 * Galactic Syndicate Constants
 *
 * Defines the Black Market trust system, contracts, and pirate mission mechanics.
 * Based on docs/crafting-system.md Part 3: Black Market & Mafia Trust System
 */

import type { Tier2Resource, Tier3Resource } from "./crafting";

// =============================================================================
// TRUST LEVEL DEFINITIONS
// =============================================================================

export type SyndicateTrustLevel =
  | "unknown"      // Level 0
  | "associate"    // Level 1
  | "runner"       // Level 2
  | "soldier"      // Level 3
  | "captain"      // Level 4
  | "lieutenant"   // Level 5
  | "underboss"    // Level 6
  | "consigliere"  // Level 7
  | "syndicate_lord"; // Level 8

export interface TrustLevelConfig {
  level: number;
  title: SyndicateTrustLevel;
  pointsRequired: number;
  priceMultiplier: number; // Price multiplier for Black Market purchases
  unlocks: string[];
}

export const TRUST_LEVELS: Record<SyndicateTrustLevel, TrustLevelConfig> = {
  unknown: {
    level: 0,
    title: "unknown",
    pointsRequired: 0,
    priceMultiplier: 0, // Cannot purchase
    unlocks: ["Must complete intro contract"],
  },
  associate: {
    level: 1,
    title: "associate",
    pointsRequired: 100,
    priceMultiplier: 2.0,
    unlocks: ["Basic intel", "Component purchases at 2x price", "Pirate raid contracts"],
  },
  runner: {
    level: 2,
    title: "runner",
    pointsRequired: 500,
    priceMultiplier: 1.75,
    unlocks: ["Standard player contracts", "Economic warfare contracts"],
  },
  soldier: {
    level: 3,
    title: "soldier",
    pointsRequired: 1_500,
    priceMultiplier: 1.5,
    unlocks: ["Tier 2 components at 1.5x", "Military probe contracts", "Advanced intel"],
  },
  captain: {
    level: 4,
    title: "captain",
    pointsRequired: 3_500,
    priceMultiplier: 1.4,
    unlocks: ["Targeted contracts", "Kingslayer contracts", "Hostile takeover contracts"],
  },
  lieutenant: {
    level: 5,
    title: "lieutenant",
    pointsRequired: 7_000,
    priceMultiplier: 1.3,
    unlocks: ["Tier 3 systems (non-WMD)", "Decapitation strike contracts", "Proxy war introduction"],
  },
  underboss: {
    level: 6,
    title: "underboss",
    pointsRequired: 12_000,
    priceMultiplier: 1.25,
    unlocks: ["Chemical weapons", "EMP devices", "Scorched earth contracts"],
  },
  consigliere: {
    level: 7,
    title: "consigliere",
    pointsRequired: 20_000,
    priceMultiplier: 1.1,
    unlocks: ["Nuclear weapons", "Advanced WMD contracts", "Syndicate operations"],
  },
  syndicate_lord: {
    level: 8,
    title: "syndicate_lord",
    pointsRequired: 35_000,
    priceMultiplier: 1.0, // Wholesale prices
    unlocks: ["Bioweapons", "Singularity tech", "Exclusive contracts", "Syndicate seat"],
  },
};

export const TRUST_LEVEL_ORDER: SyndicateTrustLevel[] = [
  "unknown",
  "associate",
  "runner",
  "soldier",
  "captain",
  "lieutenant",
  "underboss",
  "consigliere",
  "syndicate_lord",
];

// =============================================================================
// CONTRACT DEFINITIONS
// =============================================================================

export type ContractType =
  // Tier 1: Pirate Raids (Trust 1+)
  | "supply_run"
  | "disruption"
  | "salvage_op"
  | "intel_gathering"
  // Tier 2: Standard Contracts (Trust 2+)
  | "intimidation"
  | "economic_warfare"
  | "military_probe"
  | "hostile_takeover"
  // Tier 3: Targeted Contracts (Trust 4+)
  | "kingslayer"
  | "market_manipulation"
  | "regime_change"
  | "decapitation_strike"
  // Tier 4: Syndicate Operations (Trust 6+)
  | "proxy_war"
  | "scorched_earth"
  | "the_equalizer";

export interface ContractConfig {
  type: ContractType;
  tier: 1 | 2 | 3 | 4;
  minTrustLevel: SyndicateTrustLevel;
  creditReward: number | "varies" | "special";
  trustReward: number;
  turnsToComplete: number;
  triggersPirate: boolean;
  targetType: "any_pirate" | "random_player" | "specific_player" | "top_players" | "multiple";
  description: string;
  completionCriteria: string;
  risk: "low" | "medium" | "high" | "very_high";
}

export const CONTRACT_CONFIGS: Record<ContractType, ContractConfig> = {
  // Tier 1: Pirate Raids
  supply_run: {
    type: "supply_run",
    tier: 1,
    minTrustLevel: "associate",
    creditReward: 5_000,
    trustReward: 10,
    turnsToComplete: 5,
    triggersPirate: true,
    targetType: "any_pirate",
    description: "Disrupt a pirate team's supply lines",
    completionCriteria: "Pirate attack completes successfully",
    risk: "low",
  },
  disruption: {
    type: "disruption",
    tier: 1,
    minTrustLevel: "associate",
    creditReward: 8_000,
    trustReward: 15,
    turnsToComplete: 5,
    triggersPirate: true,
    targetType: "any_pirate",
    description: "Attack a specific pirate base",
    completionCriteria: "Target base disrupted",
    risk: "low",
  },
  salvage_op: {
    type: "salvage_op",
    tier: 1,
    minTrustLevel: "associate",
    creditReward: "varies",
    trustReward: 20,
    turnsToComplete: 5,
    triggersPirate: true,
    targetType: "any_pirate",
    description: "Destroy pirate ships and keep 50% salvage",
    completionCriteria: "Pirate fleet destroyed",
    risk: "medium",
  },
  intel_gathering: {
    type: "intel_gathering",
    tier: 1,
    minTrustLevel: "associate",
    creditReward: 3_000,
    trustReward: 10,
    turnsToComplete: 10,
    triggersPirate: false,
    targetType: "any_pirate",
    description: "Spy on 3 pirate teams",
    completionCriteria: "3 spy operations completed",
    risk: "low",
  },

  // Tier 2: Standard Contracts
  intimidation: {
    type: "intimidation",
    tier: 2,
    minTrustLevel: "runner",
    creditReward: 15_000,
    trustReward: 30,
    turnsToComplete: 10,
    triggersPirate: false,
    targetType: "random_player",
    description: "Reduce target's civil status via insurgent aid",
    completionCriteria: "Target civil status drops by 1+ level",
    risk: "low",
  },
  economic_warfare: {
    type: "economic_warfare",
    tier: 2,
    minTrustLevel: "runner",
    creditReward: 25_000,
    trustReward: 40,
    turnsToComplete: 10,
    triggersPirate: false,
    targetType: "random_player",
    description: "Bomb target's food production",
    completionCriteria: "Target loses 30%+ food stockpile",
    risk: "medium",
  },
  military_probe: {
    type: "military_probe",
    tier: 2,
    minTrustLevel: "runner",
    creditReward: 35_000,
    trustReward: 50,
    turnsToComplete: 10,
    triggersPirate: false,
    targetType: "random_player",
    description: "Launch guerilla ambush, keep 10% loot",
    completionCriteria: "Successful guerilla attack",
    risk: "medium",
  },
  hostile_takeover: {
    type: "hostile_takeover",
    tier: 2,
    minTrustLevel: "runner",
    creditReward: 50_000,
    trustReward: 75,
    turnsToComplete: 15,
    triggersPirate: false,
    targetType: "random_player",
    description: "Capture 1 sector from target",
    completionCriteria: "1 sector captured from target",
    risk: "high",
  },

  // Tier 3: Targeted Contracts
  kingslayer: {
    type: "kingslayer",
    tier: 3,
    minTrustLevel: "captain",
    creditReward: 100_000,
    trustReward: 100,
    turnsToComplete: 20,
    triggersPirate: false,
    targetType: "top_players",
    description: "Remove a top 3 player from their position",
    completionCriteria: "Target falls out of top 3",
    risk: "high",
  },
  market_manipulation: {
    type: "market_manipulation",
    tier: 3,
    minTrustLevel: "captain",
    creditReward: 75_000,
    trustReward: 80,
    turnsToComplete: 15,
    triggersPirate: false,
    targetType: "top_players",
    description: "Crash a top 10 player's tourism income",
    completionCriteria: "Target loses 50%+ tourism income for 5+ turns",
    risk: "medium",
  },
  regime_change: {
    type: "regime_change",
    tier: 3,
    minTrustLevel: "captain",
    creditReward: 60_000,
    trustReward: 60,
    turnsToComplete: 15,
    triggersPirate: false,
    targetType: "top_players",
    description: "Cause civil war in a top 25% player",
    completionCriteria: "Target reaches 'revolting' civil status",
    risk: "high",
  },
  decapitation_strike: {
    type: "decapitation_strike",
    tier: 3,
    minTrustLevel: "lieutenant",
    creditReward: 200_000,
    trustReward: 150,
    turnsToComplete: 25,
    triggersPirate: false,
    targetType: "top_players",
    description: "Target the #1 player specifically",
    completionCriteria: "#1 player loses their position",
    risk: "very_high",
  },

  // Tier 4: Syndicate Operations
  proxy_war: {
    type: "proxy_war",
    tier: 4,
    minTrustLevel: "underboss",
    creditReward: 150_000,
    trustReward: 120,
    turnsToComplete: 30,
    triggersPirate: false,
    targetType: "multiple",
    description: "Set up conflict between two specific players",
    completionCriteria: "Both targets declare war on each other",
    risk: "high",
  },
  scorched_earth: {
    type: "scorched_earth",
    tier: 4,
    minTrustLevel: "underboss",
    creditReward: "special",
    trustReward: 100,
    turnsToComplete: 20,
    triggersPirate: false,
    targetType: "specific_player",
    description: "Use WMD on a specific empire (WMD provided)",
    completionCriteria: "WMD successfully deployed",
    risk: "very_high",
  },
  the_equalizer: {
    type: "the_equalizer",
    tier: 4,
    minTrustLevel: "underboss",
    creditReward: "special",
    trustReward: 200,
    turnsToComplete: 40,
    triggersPirate: false,
    targetType: "multiple",
    description: "Hurt 3+ players in the top 10%",
    completionCriteria: "3+ top 10% players lose significant networth",
    risk: "very_high",
  },
};

// =============================================================================
// BLACK MARKET CATALOG
// =============================================================================

export interface BlackMarketItem {
  type: "component" | "system" | "weapon" | "intel";
  resourceType?: Tier2Resource | Tier3Resource;
  basePrice: number;
  minTrustLevel: SyndicateTrustLevel;
  description: string;
  singleUse?: boolean;
  coordinatorResponse?: string; // Penalty if caught
}

export const BLACK_MARKET_CATALOG: Record<string, BlackMarketItem> = {
  // Tier 2 Components (Trust 1+)
  electronics: {
    type: "component",
    resourceType: "electronics",
    basePrice: 2_000,
    minTrustLevel: "associate",
    description: "Circuit boards, sensors - no crafting needed",
  },
  armor_plating: {
    type: "component",
    resourceType: "armor_plating",
    basePrice: 2_500,
    minTrustLevel: "associate",
    description: "Hull protection materials",
  },
  propulsion_units: {
    type: "component",
    resourceType: "propulsion_units",
    basePrice: 2_200,
    minTrustLevel: "associate",
    description: "Engine systems",
  },
  targeting_arrays: {
    type: "component",
    resourceType: "targeting_arrays",
    basePrice: 4_000,
    minTrustLevel: "soldier",
    description: "Precision guidance systems",
  },
  stealth_composites: {
    type: "component",
    resourceType: "stealth_composites",
    basePrice: 5_000,
    minTrustLevel: "soldier",
    description: "Sensor-absorbing materials",
  },
  quantum_processors: {
    type: "component",
    resourceType: "quantum_processors",
    basePrice: 8_000,
    minTrustLevel: "captain",
    description: "Advanced computing cores",
  },

  // Tier 3 Systems (Trust 5+)
  reactor_cores: {
    type: "system",
    resourceType: "reactor_cores",
    basePrice: 15_000,
    minTrustLevel: "lieutenant",
    description: "Power generation systems",
  },
  shield_generators: {
    type: "system",
    resourceType: "shield_generators",
    basePrice: 18_000,
    minTrustLevel: "lieutenant",
    description: "Energy barrier generators",
  },
  cloaking_devices: {
    type: "system",
    resourceType: "cloaking_devices",
    basePrice: 25_000,
    minTrustLevel: "lieutenant",
    description: "Invisibility technology",
  },
  warp_drives: {
    type: "system",
    resourceType: "warp_drives",
    basePrice: 30_000,
    minTrustLevel: "underboss",
    description: "FTL capability systems",
  },

  // Restricted Items (Trust 6+)
  chemical_weapons: {
    type: "weapon",
    basePrice: 50_000,
    minTrustLevel: "underboss",
    description: "Kills 30% population, -50% production for 5 turns",
    singleUse: true,
    coordinatorResponse: "Military response (lose 10% forces)",
  },
  emp_device: {
    type: "weapon",
    basePrice: 75_000,
    minTrustLevel: "underboss",
    description: "Disables all electronics for 3 turns",
    singleUse: true,
    coordinatorResponse: "None (undetectable)",
  },
  nuclear_warhead: {
    type: "weapon",
    resourceType: "nuclear_warheads",
    basePrice: 100_000,
    minTrustLevel: "consigliere",
    description: "Destroys 1-3 sectors, radiation for 10 turns",
    singleUse: true,
    coordinatorResponse: "Severe (lose 25% forces + sanctions)",
  },
  bioweapon_canister: {
    type: "weapon",
    resourceType: "bioweapon_synthesis",
    basePrice: 150_000,
    minTrustLevel: "syndicate_lord",
    description: "Kills 50% population, spreads to neighbors",
    singleUse: true,
    coordinatorResponse: "Annihilation attempt by Coordinator forces",
  },

  // Intel Services
  basic_intel: {
    type: "intel",
    basePrice: 5_000,
    minTrustLevel: "associate",
    description: "Reveal target empire's resources and military",
  },
  advanced_intel: {
    type: "intel",
    basePrice: 15_000,
    minTrustLevel: "soldier",
    description: "Reveal target's active contracts, alliances, and battle plans",
  },
  deep_intel: {
    type: "intel",
    basePrice: 30_000,
    minTrustLevel: "captain",
    description: "Full visibility on target for 10 turns",
  },
};

// =============================================================================
// TRUST MECHANICS
// =============================================================================

export const TRUST_MECHANICS = {
  // Decay: 5% per 10 turns without interaction
  decayRate: 0.05,
  decayInterval: 10,

  // Betrayal penalties
  contractFailurePenalty: 0.5, // Lose 50% of potential trust reward
  contractFailureLevelLoss: 1, // Lose 1 trust level

  // Reporting to Coordinator
  reportReward: {
    trustReset: true,
    coordinatorFundingBonus: 0.10, // +10% funding
    syndicateHostile: true, // Assassination attempts
  },

  // Recruitment threshold (bottom 50% of empires)
  recruitmentThreshold: 0.50,
  recruitmentBonusTrust: 0.50, // 50% bonus trust on first contract
  recruitmentStartupFunds: 10_000,
} as const;

// =============================================================================
// PIRATE MISSION CONFIGURATION
// =============================================================================

export interface PirateMissionConfig {
  type: ContractType;
  incomeDebuffPercent?: number;
  incomeDebuffTurns?: number;
  planetsDestroyedMin?: number;
  planetsDestroyedMax?: number;
  militaryDestroyedPercent?: number;
  salvagePercent?: number; // Percentage of destroyed value given to contractor
}

export const PIRATE_MISSION_EFFECTS: Partial<Record<ContractType, PirateMissionConfig>> = {
  supply_run: {
    type: "supply_run",
    incomeDebuffPercent: 0.05,
    incomeDebuffTurns: 2,
  },
  disruption: {
    type: "disruption",
    planetsDestroyedMin: 1,
    planetsDestroyedMax: 3,
  },
  salvage_op: {
    type: "salvage_op",
    militaryDestroyedPercent: 0.10,
    salvagePercent: 0.50,
  },
};

// =============================================================================
// DISPLAY LABELS
// =============================================================================

export const TRUST_LEVEL_LABELS: Record<SyndicateTrustLevel, string> = {
  unknown: "Unknown",
  associate: "Associate",
  runner: "Runner",
  soldier: "Soldier",
  captain: "Captain",
  lieutenant: "Lieutenant",
  underboss: "Underboss",
  consigliere: "Consigliere",
  syndicate_lord: "Syndicate Lord",
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  supply_run: "Supply Run",
  disruption: "Disruption",
  salvage_op: "Salvage Operation",
  intel_gathering: "Intel Gathering",
  intimidation: "Intimidation",
  economic_warfare: "Economic Warfare",
  military_probe: "Military Probe",
  hostile_takeover: "Hostile Takeover",
  kingslayer: "Kingslayer",
  market_manipulation: "Market Manipulation",
  regime_change: "Regime Change",
  decapitation_strike: "Decapitation Strike",
  proxy_war: "Proxy War",
  scorched_earth: "Scorched Earth",
  the_equalizer: "The Equalizer",
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getTrustLevelFromPoints(points: number): SyndicateTrustLevel {
  for (let i = TRUST_LEVEL_ORDER.length - 1; i >= 0; i--) {
    const level = TRUST_LEVEL_ORDER[i]!;
    if (points >= TRUST_LEVELS[level].pointsRequired) {
      return level;
    }
  }
  return "unknown";
}

export function getNextTrustLevel(current: SyndicateTrustLevel): SyndicateTrustLevel | null {
  const currentIndex = TRUST_LEVEL_ORDER.indexOf(current);
  if (currentIndex >= 0 && currentIndex < TRUST_LEVEL_ORDER.length - 1) {
    return TRUST_LEVEL_ORDER[currentIndex + 1] ?? null;
  }
  return null;
}

export function getAvailableContracts(trustLevel: SyndicateTrustLevel): ContractType[] {
  const currentLevelIndex = TRUST_LEVEL_ORDER.indexOf(trustLevel);
  return Object.entries(CONTRACT_CONFIGS)
    .filter(([, config]) => {
      const requiredIndex = TRUST_LEVEL_ORDER.indexOf(config.minTrustLevel);
      return requiredIndex <= currentLevelIndex;
    })
    .map(([type]) => type as ContractType);
}

export function getBlackMarketPrice(
  item: string,
  trustLevel: SyndicateTrustLevel
): number | null {
  const catalogItem = BLACK_MARKET_CATALOG[item];
  if (!catalogItem) return null;

  const itemLevelIndex = TRUST_LEVEL_ORDER.indexOf(catalogItem.minTrustLevel);
  const currentLevelIndex = TRUST_LEVEL_ORDER.indexOf(trustLevel);

  if (currentLevelIndex < itemLevelIndex) return null; // Can't purchase

  const priceMultiplier = TRUST_LEVELS[trustLevel].priceMultiplier;
  return Math.floor(catalogItem.basePrice * priceMultiplier);
}

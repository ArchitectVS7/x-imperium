/**
 * Bot Decision Engine
 *
 * Implements weighted random decision-making for M5 Random Bots.
 * Generates decisions based on game state and difficulty settings.
 *
 * Decision Weights (PRD M5):
 * - 35% build units
 * - 20% buy planets
 * - 15% attack (0% during protection period)
 * - 10% diplomacy (stub: resolves to do_nothing until M7)
 * - 10% trade (stub: resolves to do_nothing until M7)
 * - 10% do nothing
 */

import type {
  BotArchetype,
  BotDecision,
  BotDecisionContext,
  BotDecisionType,
  BotDecisionWeights,
  Forces,
  PlanetType,
  UnitType,
} from "./types";
import {
  selectTarget,
  shouldMakeSuboptimalChoice,
  applySuboptimalQuantity,
} from "./difficulty";
import {
  UNIT_COSTS,
  calculateAffordableUnits,
} from "@/lib/game/unit-config";
import { PLANET_COSTS } from "@/lib/game/constants";
import {
  ARCHETYPE_CRAFTING_PROFILES,
  getNextCraftingPriority,
  shouldEngageSyndicate,
  getPreferredContract,
} from "./archetypes/crafting-profiles";
import type { CraftedResource } from "@/lib/game/constants/crafting";
import { CONTRACT_CONFIGS, type ContractType } from "@/lib/game/constants/syndicate";

// =============================================================================
// BASE DECISION WEIGHTS
// =============================================================================

export const BASE_WEIGHTS: BotDecisionWeights = {
  build_units: 0.30,
  buy_planet: 0.15,
  attack: 0.12,
  diplomacy: 0.08, // Stub: resolves to do_nothing until M7
  trade: 0.08, // Stub: resolves to do_nothing until M7
  do_nothing: 0.07,
  // Crafting system weights
  craft_component: 0.10,
  accept_contract: 0.05,
  purchase_black_market: 0.05,
};

// =============================================================================
// ARCHETYPE-SPECIFIC WEIGHTS (M9 Preview)
// =============================================================================

/**
 * Archetype-specific decision weight modifiers.
 * These capture each archetype's playstyle:
 * - warlord: Aggressive military focus
 * - diplomat: Peaceful, economy-focused
 * - merchant: Trade and expansion focused
 * - schemer: Opportunistic, waits then strikes
 * - turtle: Defensive, builds stations
 * - blitzkrieg: Rush attacks, early aggression
 * - tech_rush: Research and development focus
 * - opportunist: Attacks weakened targets
 */
export const ARCHETYPE_WEIGHTS: Record<BotArchetype, BotDecisionWeights> = {
  warlord: {
    build_units: 0.28,
    buy_planet: 0.08,
    attack: 0.32,      // Highly aggressive
    diplomacy: 0.04,
    trade: 0.04,
    do_nothing: 0.04,
    // Crafting: military focus, moderate Syndicate
    craft_component: 0.10,
    accept_contract: 0.06,
    purchase_black_market: 0.04,
  },
  diplomat: {
    build_units: 0.22,
    buy_planet: 0.22,
    attack: 0.04,      // Very peaceful
    diplomacy: 0.22,   // High diplomacy (still stub)
    trade: 0.12,
    do_nothing: 0.04,
    // Crafting: minimal Syndicate engagement
    craft_component: 0.08,
    accept_contract: 0.02,
    purchase_black_market: 0.04,
  },
  merchant: {
    build_units: 0.15,
    buy_planet: 0.27,  // Economy expansion
    attack: 0.08,
    diplomacy: 0.08,
    trade: 0.15,       // High trade (still stub)
    do_nothing: 0.04,
    // Crafting: economy focus, moderate Syndicate
    craft_component: 0.15,
    accept_contract: 0.04,
    purchase_black_market: 0.04,
  },
  schemer: {
    build_units: 0.20,
    buy_planet: 0.10,
    attack: 0.22,      // Opportunistic strikes
    diplomacy: 0.06,
    trade: 0.06,
    do_nothing: 0.03,
    // Crafting: stealth focus, high Syndicate engagement
    craft_component: 0.12,
    accept_contract: 0.09,
    purchase_black_market: 0.12,
  },
  turtle: {
    build_units: 0.35, // Heavy defense building (stations)
    buy_planet: 0.20,
    attack: 0.04,      // Very defensive
    diplomacy: 0.08,
    trade: 0.08,
    do_nothing: 0.04,
    // Crafting: defense focus, low Syndicate
    craft_component: 0.12,
    accept_contract: 0.03,
    purchase_black_market: 0.06,
  },
  blitzkrieg: {
    build_units: 0.20,
    buy_planet: 0.08,
    attack: 0.40,      // Maximum aggression
    diplomacy: 0.04,
    trade: 0.04,
    do_nothing: 0.04,
    // Crafting: speed/attack focus, high Syndicate
    craft_component: 0.08,
    accept_contract: 0.07,
    purchase_black_market: 0.05,
  },
  tech_rush: {
    build_units: 0.18,
    buy_planet: 0.27,  // Research planets
    attack: 0.08,
    diplomacy: 0.08,
    trade: 0.10,
    do_nothing: 0.04,
    // Crafting: tech focus, moderate Syndicate
    craft_component: 0.15,
    accept_contract: 0.05,
    purchase_black_market: 0.05,
  },
  opportunist: {
    build_units: 0.20,
    buy_planet: 0.15,
    attack: 0.28,      // Attacks when advantage
    diplomacy: 0.08,
    trade: 0.04,
    do_nothing: 0.04,
    // Crafting: balanced, moderate Syndicate
    craft_component: 0.10,
    accept_contract: 0.05,
    purchase_black_market: 0.06,
  },
};

// Planet types that bots can purchase (excludes special types)
const PURCHASABLE_PLANET_TYPES: PlanetType[] = [
  "food",
  "ore",
  "petroleum",
  "tourism",
  "urban",
  "government",
  "research",
];

// Combat unit types (excludes covert agents)
const COMBAT_UNIT_TYPES: UnitType[] = [
  "soldiers",
  "fighters",
  "lightCruisers",
  "heavyCruisers",
  "carriers",
  "stations",
];

// =============================================================================
// WEIGHT ADJUSTMENT
// =============================================================================

/**
 * Get adjusted weights based on game state and archetype.
 * - Uses archetype-specific weights for differentiated playstyles
 * - Attack weight is 0 during protection period (turn <= protectionTurns)
 * - Redistributes attack weight proportionally to other actions
 *
 * @param context - Current game context
 * @returns Adjusted decision weights
 */
export function getAdjustedWeights(
  context: BotDecisionContext
): BotDecisionWeights {
  // Get archetype-specific weights (default to BASE_WEIGHTS if archetype unknown)
  const archetype = context.empire.botArchetype;
  const baseWeights = archetype && ARCHETYPE_WEIGHTS[archetype]
    ? ARCHETYPE_WEIGHTS[archetype]
    : BASE_WEIGHTS;

  const isProtected = context.currentTurn <= context.protectionTurns;

  if (!isProtected) {
    // After protection period, use archetype weights
    return { ...baseWeights };
  }

  // During protection: redistribute attack weight to other actions
  const attackWeight = baseWeights.attack;
  const otherWeightSum =
    baseWeights.build_units +
    baseWeights.buy_planet +
    baseWeights.diplomacy +
    baseWeights.trade +
    baseWeights.do_nothing +
    baseWeights.craft_component +
    baseWeights.accept_contract +
    baseWeights.purchase_black_market;

  // Redistribute proportionally
  const redistributionFactor = 1 + attackWeight / otherWeightSum;

  return {
    build_units: baseWeights.build_units * redistributionFactor,
    buy_planet: baseWeights.buy_planet * redistributionFactor,
    attack: 0, // No attacks during protection
    diplomacy: baseWeights.diplomacy * redistributionFactor,
    trade: baseWeights.trade * redistributionFactor,
    do_nothing: baseWeights.do_nothing * redistributionFactor,
    craft_component: baseWeights.craft_component * redistributionFactor,
    accept_contract: baseWeights.accept_contract * redistributionFactor,
    purchase_black_market: baseWeights.purchase_black_market * redistributionFactor,
  };
}

// =============================================================================
// DECISION TYPE SELECTION
// =============================================================================

/**
 * Select a decision type based on weights using weighted random selection.
 *
 * @param weights - Decision weights (must sum to ~1.0)
 * @param random - Optional random value for testing (0-1)
 * @returns Selected decision type
 */
export function selectDecisionType(
  weights: BotDecisionWeights,
  random?: number
): BotDecisionType {
  const roll = random ?? Math.random();
  let cumulative = 0;

  const entries: [BotDecisionType, number][] = [
    ["build_units", weights.build_units],
    ["buy_planet", weights.buy_planet],
    ["attack", weights.attack],
    ["diplomacy", weights.diplomacy],
    ["trade", weights.trade],
    ["do_nothing", weights.do_nothing],
    // Crafting system decision types
    ["craft_component", weights.craft_component],
    ["accept_contract", weights.accept_contract],
    ["purchase_black_market", weights.purchase_black_market],
  ];

  for (const [type, weight] of entries) {
    cumulative += weight;
    if (roll < cumulative) {
      return type;
    }
  }

  // Fallback (should never reach due to weights summing to 1.0)
  return "do_nothing";
}

// =============================================================================
// DECISION GENERATORS
// =============================================================================

/**
 * Generate a complete bot decision.
 * Selects a decision type and generates the appropriate decision.
 *
 * @param context - Current game context
 * @param randomType - Optional random value for type selection (testing)
 * @param randomDecision - Optional random value for decision generation (testing)
 * @returns Generated decision
 */
export function generateBotDecision(
  context: BotDecisionContext,
  randomType?: number,
  randomDecision?: number
): BotDecision {
  const weights = getAdjustedWeights(context);
  let decisionType = selectDecisionType(weights, randomType);

  // Apply suboptimal choice for Easy mode
  if (shouldMakeSuboptimalChoice(context.difficulty, randomDecision)) {
    // Make a less optimal choice by choosing a random decision type
    const allTypes: BotDecisionType[] = [
      "build_units",
      "buy_planet",
      "attack",
      "diplomacy",
      "trade",
      "do_nothing",
      "craft_component",
      "accept_contract",
      "purchase_black_market",
    ];
    const validTypes = allTypes.filter((t) => {
      if (t === "attack" && context.currentTurn <= context.protectionTurns) {
        return false;
      }
      return true;
    });
    const suboptimalIndex = Math.floor(
      (randomDecision ?? Math.random()) * validTypes.length
    );
    decisionType = validTypes[suboptimalIndex] ?? "do_nothing";
  }

  // Generate specific decision based on type
  switch (decisionType) {
    case "build_units":
      return generateBuildUnitsDecision(context, randomDecision);
    case "buy_planet":
      return generateBuyPlanetDecision(context, randomDecision);
    case "attack":
      return generateAttackDecision(context, randomDecision);
    case "diplomacy":
      return generateDiplomacyDecision(context, randomDecision);
    case "trade":
      return generateTradeDecision(context, randomDecision);
    // Crafting system decisions
    case "craft_component":
      return generateCraftComponentDecision(context, randomDecision);
    case "accept_contract":
      return generateAcceptContractDecision(context, randomDecision);
    case "purchase_black_market":
      return generatePurchaseBlackMarketDecision(context, randomDecision);
    case "do_nothing":
    default:
      return { type: "do_nothing" };
  }
}

/**
 * Generate a build_units decision.
 * Randomly selects a unit type and affordable quantity.
 */
function generateBuildUnitsDecision(
  context: BotDecisionContext,
  random?: number
): BotDecision {
  const { empire, difficulty } = context;

  // Filter to unit types the bot can afford
  const affordableTypes = COMBAT_UNIT_TYPES.filter((type) => {
    const cost = UNIT_COSTS[type];
    return empire.credits >= cost;
  });

  if (affordableTypes.length === 0) {
    return { type: "do_nothing" };
  }

  // Select random unit type
  const typeIndex = Math.floor((random ?? Math.random()) * affordableTypes.length);
  const unitType = affordableTypes[typeIndex];
  if (!unitType) {
    return { type: "do_nothing" };
  }

  // Calculate affordable quantity (use 10-50% of available credits)
  const maxAffordable = calculateAffordableUnits(unitType, empire.credits);
  const spendFraction = 0.1 + (random ?? Math.random()) * 0.4; // 10-50%
  let quantity = Math.max(1, Math.floor(maxAffordable * spendFraction));

  // Apply suboptimal quantity for Easy mode
  quantity = applySuboptimalQuantity(quantity, 1, difficulty, random);

  return { type: "build_units", unitType, quantity };
}

/**
 * Generate a buy_planet decision.
 * Randomly selects an affordable planet type.
 */
function generateBuyPlanetDecision(
  context: BotDecisionContext,
  random?: number
): BotDecision {
  const { empire } = context;

  // Filter to planet types the bot can afford
  // Note: Planet cost scaling isn't applied here for simplicity
  const affordableTypes = PURCHASABLE_PLANET_TYPES.filter((type) => {
    const cost = PLANET_COSTS[type];
    return empire.credits >= cost;
  });

  if (affordableTypes.length === 0) {
    return { type: "do_nothing" };
  }

  // Select random planet type
  const typeIndex = Math.floor((random ?? Math.random()) * affordableTypes.length);
  const planetType = affordableTypes[typeIndex];
  if (!planetType) {
    return { type: "do_nothing" };
  }

  return { type: "buy_planet", planetType };
}

/**
 * Generate an attack decision.
 * Selects a target based on difficulty and allocates forces.
 */
function generateAttackDecision(
  context: BotDecisionContext,
  random?: number
): BotDecision {
  const { empire, difficulty, availableTargets, currentTurn, protectionTurns } =
    context;

  // Can't attack during protection period
  if (currentTurn <= protectionTurns) {
    return { type: "do_nothing" };
  }

  // Filter valid targets (non-eliminated, not self)
  const validTargets = availableTargets.filter(
    (t) => !t.isEliminated && t.id !== empire.id
  );

  if (validTargets.length === 0) {
    return { type: "do_nothing" };
  }

  // Select target based on difficulty
  const target = selectTarget(validTargets, difficulty, random);
  if (!target) {
    return { type: "do_nothing" };
  }

  // Check if bot has any forces to attack with
  const hasSoldiers = empire.soldiers > 0;
  const hasNavy =
    empire.fighters > 0 ||
    empire.lightCruisers > 0 ||
    empire.heavyCruisers > 0 ||
    empire.carriers > 0;

  if (!hasSoldiers && !hasNavy) {
    return { type: "do_nothing" };
  }

  // Allocate a portion of forces (30-70% of each unit type)
  const allocationFactor = 0.3 + (random ?? Math.random()) * 0.4;

  const forces: Forces = {
    soldiers: Math.floor(empire.soldiers * allocationFactor),
    fighters: Math.floor(empire.fighters * allocationFactor),
    stations: 0, // Stations don't attack
    lightCruisers: Math.floor(empire.lightCruisers * allocationFactor),
    heavyCruisers: Math.floor(empire.heavyCruisers * allocationFactor),
    carriers: Math.floor(empire.carriers * allocationFactor),
  };

  // Ensure at least some soldiers for ground combat
  if (forces.soldiers === 0 && empire.soldiers > 0) {
    forces.soldiers = Math.min(10, empire.soldiers);
  }

  return { type: "attack", targetId: target.id, forces };
}

/**
 * Generate a diplomacy decision.
 * Proposes NAP or Alliance based on archetype and target availability.
 */
function generateDiplomacyDecision(
  context: BotDecisionContext,
  random?: number
): BotDecision {
  const { empire, availableTargets } = context;
  const archetype = empire.botArchetype;
  const roll = random ?? Math.random();

  // No targets = can't propose treaties
  if (!availableTargets || availableTargets.length === 0) {
    return { type: "do_nothing" };
  }

  // Filter to targets without existing treaties
  const validTargets = availableTargets.filter((t) => !t.hasTreaty);
  if (validTargets.length === 0) {
    return { type: "do_nothing" };
  }

  // Archetype affects treaty preference
  // Diplomats prefer alliances, others prefer NAPs
  let treatyAction: "propose_nap" | "propose_alliance";
  if (archetype === "diplomat") {
    treatyAction = roll < 0.7 ? "propose_alliance" : "propose_nap";
  } else if (archetype === "warlord" || archetype === "blitzkrieg") {
    // Aggressive archetypes rarely propose treaties
    if (roll > 0.3) {
      return { type: "do_nothing" };
    }
    treatyAction = "propose_nap";
  } else if (archetype === "turtle" || archetype === "merchant") {
    // Defensive/economic archetypes prefer NAPs
    treatyAction = roll < 0.8 ? "propose_nap" : "propose_alliance";
  } else {
    // Default: mostly NAPs
    treatyAction = roll < 0.7 ? "propose_nap" : "propose_alliance";
  }

  // Select target: prefer similar networth for NAP, stronger for alliance
  let target;
  if (treatyAction === "propose_alliance") {
    // For alliance, prefer stronger empires
    const sorted = [...validTargets].sort((a, b) => b.networth - a.networth);
    target = sorted[Math.floor(roll * Math.min(3, sorted.length))];
  } else {
    // For NAP, prefer similar strength
    const sortedByDiff = [...validTargets].sort(
      (a, b) => Math.abs(a.networth - empire.networth) - Math.abs(b.networth - empire.networth)
    );
    target = sortedByDiff[Math.floor(roll * Math.min(3, sortedByDiff.length))];
  }

  if (!target) {
    return { type: "do_nothing" };
  }

  return { type: "diplomacy", action: treatyAction, targetId: target.id };
}

/**
 * Generate a trade decision.
 * Buys resources when low, sells when high surplus.
 */
function generateTradeDecision(
  context: BotDecisionContext,
  random?: number
): BotDecision {
  const { empire } = context;
  const roll = random ?? Math.random();

  // Calculate resource needs
  const lowFood = empire.food < empire.population * 2; // Need 2x population in food
  const lowOre = empire.ore < 500;
  const lowPetroleum = empire.petroleum < 200;

  // Calculate resource surpluses (arbitrary thresholds)
  const highFood = empire.food > empire.population * 10;
  const highOre = empire.ore > 5000;
  const highPetroleum = empire.petroleum > 2000;

  // Buying takes priority over selling
  if (lowFood && empire.credits > 5000) {
    // Buy food to prevent starvation
    const quantity = Math.min(500, Math.floor(empire.credits / 20));
    return { type: "trade", resource: "food", quantity, action: "buy" };
  }

  if (lowOre && empire.credits > 10000 && roll < 0.7) {
    const quantity = Math.min(300, Math.floor(empire.credits / 50));
    return { type: "trade", resource: "ore", quantity, action: "buy" };
  }

  if (lowPetroleum && empire.credits > 8000 && roll < 0.6) {
    const quantity = Math.min(200, Math.floor(empire.credits / 60));
    return { type: "trade", resource: "petroleum", quantity, action: "buy" };
  }

  // Sell surpluses
  if (highFood && empire.credits < 50000 && roll < 0.5) {
    const quantity = Math.min(
      Math.floor((empire.food - empire.population * 5) / 2),
      1000
    );
    if (quantity > 50) {
      return { type: "trade", resource: "food", quantity, action: "sell" };
    }
  }

  if (highOre && empire.credits < 30000 && roll < 0.4) {
    const quantity = Math.min(Math.floor((empire.ore - 2000) / 2), 500);
    if (quantity > 50) {
      return { type: "trade", resource: "ore", quantity, action: "sell" };
    }
  }

  if (highPetroleum && empire.credits < 20000 && roll < 0.3) {
    const quantity = Math.min(Math.floor((empire.petroleum - 1000) / 2), 300);
    if (quantity > 30) {
      return { type: "trade", resource: "petroleum", quantity, action: "sell" };
    }
  }

  // No trade needed
  return { type: "do_nothing" };
}

// =============================================================================
// CRAFTING SYSTEM DECISION GENERATORS
// =============================================================================

/**
 * Generate a craft_component decision.
 * Uses archetype crafting profile to select resource to craft.
 */
function generateCraftComponentDecision(
  context: BotDecisionContext,
  random?: number
): BotDecision {
  const { empire } = context;
  const archetype = empire.botArchetype;

  // If no archetype, fall back to do_nothing
  if (!archetype) {
    return { type: "do_nothing" };
  }

  // Get the crafting profile for this archetype
  const profile = ARCHETYPE_CRAFTING_PROFILES[archetype];
  if (!profile) {
    return { type: "do_nothing" };
  }

  // Get the next resource to craft based on priority
  // In a full implementation, we'd check the crafting queue to avoid duplicates
  const alreadyQueued: CraftedResource[] = []; // TODO: Get from context when available
  const resourceType = getNextCraftingPriority(archetype, alreadyQueued);

  if (!resourceType) {
    return { type: "do_nothing" };
  }

  // Determine quantity (1-3 based on economy strength)
  const baseQuantity = 1;
  const economyMultiplier = Math.min(3, Math.floor(empire.credits / 50000) + 1);
  const quantity = Math.max(1, Math.floor(
    baseQuantity * economyMultiplier * ((random ?? Math.random()) * 0.5 + 0.5)
  ));

  return { type: "craft_component", resourceType, quantity };
}

/**
 * Generate an accept_contract decision.
 * Uses archetype Syndicate profile to select contract.
 */
function generateAcceptContractDecision(
  context: BotDecisionContext,
  random?: number
): BotDecision {
  const { empire, availableTargets } = context;
  const archetype = empire.botArchetype;

  // If no archetype, fall back to do_nothing
  if (!archetype) {
    return { type: "do_nothing" };
  }

  // Check if bot should engage with Syndicate
  if (!shouldEngageSyndicate(archetype, random ?? Math.random())) {
    return { type: "do_nothing" };
  }

  // Get available contract types (simplified - full implementation would check trust level)
  const availableContracts: ContractType[] = Object.keys(CONTRACT_CONFIGS) as ContractType[];

  // Get preferred contract based on archetype
  const contractType = getPreferredContract(archetype, availableContracts);
  if (!contractType) {
    return { type: "do_nothing" };
  }

  // For targeted contracts, select a target
  const contractConfig = CONTRACT_CONFIGS[contractType];
  let targetId: string | undefined;

  // Check if this is a player-targeted contract
  const isPlayerTargeted = contractConfig.targetType === "random_player" ||
    contractConfig.targetType === "specific_player" ||
    contractConfig.targetType === "top_players";

  if (isPlayerTargeted) {
    // Select a random valid target (non-eliminated, not self)
    const validTargets = availableTargets.filter(
      (t) => !t.isEliminated && t.id !== empire.id && !t.isBot
    );
    if (validTargets.length > 0) {
      const targetIndex = Math.floor((random ?? Math.random()) * validTargets.length);
      targetId = validTargets[targetIndex]?.id;
    }
  }

  return { type: "accept_contract", contractType, targetId };
}

/**
 * Generate a purchase_black_market decision.
 * Uses archetype Syndicate profile to determine what to purchase.
 */
function generatePurchaseBlackMarketDecision(
  context: BotDecisionContext,
  random?: number
): BotDecision {
  const { empire } = context;
  const archetype = empire.botArchetype;

  // If no archetype, fall back to do_nothing
  if (!archetype) {
    return { type: "do_nothing" };
  }

  // Check if bot should engage with Syndicate (uses willingness)
  if (!shouldEngageSyndicate(archetype, random ?? Math.random())) {
    return { type: "do_nothing" };
  }

  // Get the crafting profile for purchase preferences
  const profile = ARCHETYPE_CRAFTING_PROFILES[archetype];
  if (!profile) {
    return { type: "do_nothing" };
  }

  // Select an item based on crafting priority (Black Market sells components)
  // In full implementation, we'd check available Black Market catalog
  const itemId = profile.craftingPriority[0]; // First priority resource
  if (!itemId) {
    return { type: "do_nothing" };
  }

  // Purchase quantity based on economy (1-2 units)
  const quantity = empire.credits > 100000 ? 2 : 1;

  return { type: "purchase_black_market", itemId, quantity };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the sum of all weights (should be ~1.0).
 */
export function getWeightSum(weights: BotDecisionWeights): number {
  return (
    weights.build_units +
    weights.buy_planet +
    weights.attack +
    weights.diplomacy +
    weights.trade +
    weights.do_nothing +
    weights.craft_component +
    weights.accept_contract +
    weights.purchase_black_market
  );
}

/**
 * Validate that weights sum to approximately 1.0.
 */
export function validateWeights(weights: BotDecisionWeights): boolean {
  const sum = getWeightSum(weights);
  return Math.abs(sum - 1.0) < 0.001;
}

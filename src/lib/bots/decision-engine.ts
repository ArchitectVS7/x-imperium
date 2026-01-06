/**
 * Bot Decision Engine
 *
 * Implements weighted decision-making for M5-M10 Bot AI.
 * Generates decisions based on game state, difficulty, emotions, and archetypes.
 *
 * M5: Base weighted random decisions
 * M9: Archetype-based decision trees
 * M10: Emotional state modifiers
 *
 * Decision Weights (PRD M5, modified by archetype/emotion):
 * - 30% build units
 * - 15% buy planets
 * - 12% attack (0% during protection period)
 * - 8% diplomacy
 * - 8% trade
 * - 7% do nothing
 * - 10% craft component
 * - 5% accept contract
 * - 5% purchase black market
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
// M10: Emotional state imports
import {
  type EmotionalStateName,
  getScaledModifiers,
  // EMOTIONAL_STATES, // TODO: Use for state lookup
} from "./emotions";
// M9: Archetype behavior imports
import {
  ARCHETYPE_BEHAVIORS,
  type ArchetypeBehavior,
  // wouldArchetypeAttack - Archetype attack weights used via ARCHETYPE_BEHAVIORS
  // rollTellCheck - Used in bot-processor.ts via triggerThreatWarning
  // rollAdvanceWarning - Future: for multi-turn attack planning
} from "./archetypes";
// Combat stance selection
import { getBotCombatStance } from "./research-preferences";

// =============================================================================
// BASE DECISION WEIGHTS
// =============================================================================

export const BASE_WEIGHTS: BotDecisionWeights = {
  build_units: 0.25,
  buy_planet: 0.12,
  attack: 0.10,
  diplomacy: 0.08,
  trade: 0.08,
  do_nothing: 0.05,
  // Crafting system weights
  craft_component: 0.08,
  accept_contract: 0.04,
  purchase_black_market: 0.04,
  // Additional game systems (PRD 6.8, 9.2, 9.4)
  covert_operation: 0.06,
  fund_research: 0.05,
  upgrade_units: 0.05,
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
    build_units: 0.22,
    buy_planet: 0.06,
    attack: 0.28,      // Highly aggressive
    diplomacy: 0.03,
    trade: 0.03,
    do_nothing: 0.03,
    craft_component: 0.08,
    accept_contract: 0.05,
    purchase_black_market: 0.03,
    // Military focus: high covert ops, low research
    covert_operation: 0.10,
    fund_research: 0.03,
    upgrade_units: 0.06,
  },
  diplomat: {
    build_units: 0.18,
    buy_planet: 0.18,
    attack: 0.03,      // Very peaceful
    diplomacy: 0.18,   // High diplomacy
    trade: 0.10,
    do_nothing: 0.03,
    craft_component: 0.06,
    accept_contract: 0.02,
    purchase_black_market: 0.03,
    // Peaceful: low covert, moderate research
    covert_operation: 0.04,
    fund_research: 0.08,
    upgrade_units: 0.07,
  },
  merchant: {
    build_units: 0.12,
    buy_planet: 0.22,  // Economy expansion
    attack: 0.06,
    diplomacy: 0.06,
    trade: 0.12,       // High trade
    do_nothing: 0.03,
    craft_component: 0.12,
    accept_contract: 0.03,
    purchase_black_market: 0.03,
    // Economy focus: moderate covert, economy research
    covert_operation: 0.05,
    fund_research: 0.10,
    upgrade_units: 0.06,
  },
  schemer: {
    build_units: 0.16,
    buy_planet: 0.08,
    attack: 0.18,      // Opportunistic strikes
    diplomacy: 0.05,
    trade: 0.05,
    do_nothing: 0.02,
    craft_component: 0.10,
    accept_contract: 0.07,
    purchase_black_market: 0.10,
    // Stealth focus: HIGH covert ops
    covert_operation: 0.12,
    fund_research: 0.04,
    upgrade_units: 0.03,
  },
  turtle: {
    build_units: 0.28, // Heavy defense building (stations)
    buy_planet: 0.16,
    attack: 0.03,      // Very defensive
    diplomacy: 0.06,
    trade: 0.06,
    do_nothing: 0.03,
    craft_component: 0.10,
    accept_contract: 0.02,
    purchase_black_market: 0.05,
    // Defense focus: low covert, defense research, high upgrades
    covert_operation: 0.04,
    fund_research: 0.07,
    upgrade_units: 0.10,
  },
  blitzkrieg: {
    build_units: 0.16,
    buy_planet: 0.06,
    attack: 0.32,      // Maximum aggression
    diplomacy: 0.03,
    trade: 0.03,
    do_nothing: 0.03,
    craft_component: 0.06,
    accept_contract: 0.06,
    purchase_black_market: 0.04,
    // Speed focus: moderate covert, low research, moderate upgrades
    covert_operation: 0.08,
    fund_research: 0.05,
    upgrade_units: 0.08,
  },
  tech_rush: {
    build_units: 0.14,
    buy_planet: 0.20,  // Research planets
    attack: 0.06,
    diplomacy: 0.06,
    trade: 0.08,
    do_nothing: 0.03,
    craft_component: 0.12,
    accept_contract: 0.04,
    purchase_black_market: 0.04,
    // Tech focus: HIGH research, high upgrades
    covert_operation: 0.05,
    fund_research: 0.12,
    upgrade_units: 0.06,
  },
  opportunist: {
    build_units: 0.16,
    buy_planet: 0.12,
    attack: 0.22,      // Attacks when advantage
    diplomacy: 0.06,
    trade: 0.03,
    do_nothing: 0.03,
    craft_component: 0.08,
    accept_contract: 0.04,
    purchase_black_market: 0.05,
    // Balanced: moderate everything
    covert_operation: 0.08,
    fund_research: 0.06,
    upgrade_units: 0.07,
  },
};

// =============================================================================
// M10: EMOTIONAL STATE MODIFIERS (PRD 7.8)
// =============================================================================

/**
 * Emotional state modifiers interface for decision weights.
 * Maps emotional effects to decision weight adjustments.
 */
export interface EmotionalWeightModifiers {
  /** Modifier for attack weight (from aggression) */
  attackModifier: number;
  /** Modifier for diplomacy weight (from allianceWillingness) */
  diplomacyModifier: number;
  /** Modifier for overall decision quality */
  qualityModifier: number;
  /** Modifier for trade/negotiation weight */
  tradeModifier: number;
}

/**
 * Apply emotional state modifiers to decision weights.
 *
 * PRD 7.8 Effects:
 * - Confident: +5% optimal decisions, +10% negotiation
 * - Arrogant: -15% optimal decisions, +30% aggression (attack weight)
 * - Desperate: +40% alliance-seeking (diplomacy weight)
 * - Vengeful: +40% aggression, -40% negotiation
 * - Fearful: -30% aggression, +50% alliance-seeking
 * - Triumphant: +20% aggression
 *
 * @param weights - Base decision weights
 * @param state - Current emotional state
 * @param intensity - Emotional intensity (0-1)
 * @returns Modified weights
 */
export function applyEmotionalModifiers(
  weights: BotDecisionWeights,
  state: EmotionalStateName,
  intensity: number
): BotDecisionWeights {
  const modifiers = getScaledModifiers(state, intensity);

  // Apply aggression modifier to attack weight
  const attackMultiplier = 1 + modifiers.aggression;

  // Apply alliance willingness to diplomacy weight
  const diplomacyMultiplier = 1 + modifiers.allianceWillingness;

  // Apply negotiation modifier to trade weight
  const tradeMultiplier = 1 + modifiers.negotiation;

  // Calculate modified weights
  const newWeights: BotDecisionWeights = {
    build_units: weights.build_units,
    buy_planet: weights.buy_planet,
    attack: Math.max(0, weights.attack * attackMultiplier),
    diplomacy: Math.max(0, weights.diplomacy * diplomacyMultiplier),
    trade: Math.max(0, weights.trade * tradeMultiplier),
    do_nothing: weights.do_nothing,
    craft_component: weights.craft_component,
    accept_contract: weights.accept_contract,
    purchase_black_market: weights.purchase_black_market,
    covert_operation: weights.covert_operation,
    fund_research: weights.fund_research,
    upgrade_units: weights.upgrade_units,
  };

  // Normalize weights to sum to 1.0
  const sum = Object.values(newWeights).reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (const key of Object.keys(newWeights) as Array<keyof BotDecisionWeights>) {
      newWeights[key] = newWeights[key] / sum;
    }
  }

  return newWeights;
}

/**
 * Get emotional weight modifiers for debugging/display.
 *
 * @param state - Emotional state name
 * @param intensity - Intensity (0-1)
 * @returns Modifiers object
 */
export function getEmotionalWeightModifiers(
  state: EmotionalStateName,
  intensity: number
): EmotionalWeightModifiers {
  const mods = getScaledModifiers(state, intensity);

  return {
    attackModifier: mods.aggression,
    diplomacyModifier: mods.allianceWillingness,
    qualityModifier: mods.decisionQuality,
    tradeModifier: mods.negotiation,
  };
}

// =============================================================================
// M9: ARCHETYPE DECISION TREE HELPERS
// =============================================================================

/**
 * Get archetype behavior definition, with fallback.
 *
 * @param archetype - Bot archetype (from database)
 * @returns Archetype behavior or null if not found
 */
function getArchetypeBehavior(archetype: BotArchetype | null): ArchetypeBehavior | null {
  if (!archetype) return null;

  // Map database archetype names to behavior names
  const archetypeMap: Record<BotArchetype, string> = {
    warlord: "warlord",
    diplomat: "diplomat",
    merchant: "merchant",
    schemer: "schemer",
    turtle: "turtle",
    blitzkrieg: "blitzkrieg",
    tech_rush: "techRush",
    opportunist: "opportunist",
  };

  const behaviorName = archetypeMap[archetype];
  return ARCHETYPE_BEHAVIORS[behaviorName as keyof typeof ARCHETYPE_BEHAVIORS] ?? null;
}

/**
 * Check if archetype should attack based on power ratio.
 *
 * @param archetype - Bot archetype
 * @param ourPower - Our military power
 * @param enemyPower - Enemy military power
 * @returns True if archetype would attack
 */
export function shouldArchetypeAttack(
  archetype: BotArchetype | null,
  ourPower: number,
  enemyPower: number
): boolean {
  if (!archetype || ourPower === 0) return false;

  const behavior = getArchetypeBehavior(archetype);
  if (!behavior) return Math.random() < 0.5; // Default random

  // Calculate enemy power as ratio of our power
  const enemyRatio = enemyPower / ourPower;

  // Archetype attacks if enemy is weaker than threshold
  return enemyRatio < behavior.combat.attackThreshold;
}

/**
 * Get retreat willingness for an archetype.
 *
 * @param archetype - Bot archetype
 * @returns Retreat willingness (0-1)
 */
export function getRetreatWillingness(archetype: BotArchetype | null): number {
  if (!archetype) return 0.3; // Default moderate

  const behavior = getArchetypeBehavior(archetype);
  return behavior?.combat.retreatWillingness ?? 0.3;
}

/**
 * Get alliance seeking tendency for an archetype.
 *
 * @param archetype - Bot archetype
 * @returns Alliance seeking (0-1)
 */
export function getAllianceSeeking(archetype: BotArchetype | null): number {
  if (!archetype) return 0.3; // Default moderate

  const behavior = getArchetypeBehavior(archetype);
  return behavior?.diplomacy.allianceSeeking ?? 0.3;
}

// =============================================================================
// M9: TELL SYSTEM (PRD 7.10)
// =============================================================================

/**
 * Determine if bot should telegraph their upcoming action.
 *
 * @param archetype - Bot archetype
 * @param actionType - Type of action being planned
 * @returns Object with shouldTell and advanceWarningTurns
 */
export function shouldTelegraphAction(
  archetype: BotArchetype | null,
  actionType: "attack" | "diplomacy" | "trade" | "other"
): { shouldTell: boolean; advanceWarningTurns: number } {
  if (!archetype) {
    return { shouldTell: false, advanceWarningTurns: 0 };
  }

  const behavior = getArchetypeBehavior(archetype);
  if (!behavior) {
    return { shouldTell: false, advanceWarningTurns: 0 };
  }

  // Only telegraph significant actions
  if (actionType !== "attack" && actionType !== "diplomacy") {
    return { shouldTell: false, advanceWarningTurns: 0 };
  }

  // Roll tell check based on archetype tell rate
  const shouldTell = Math.random() < behavior.tell.tellRate;

  if (!shouldTell) {
    return { shouldTell: false, advanceWarningTurns: 0 };
  }

  // Calculate advance warning turns
  const { min, max } = behavior.tell.advanceWarning;
  const advanceWarningTurns = Math.floor(Math.random() * (max - min + 1)) + min;

  return { shouldTell: true, advanceWarningTurns };
}

/**
 * Get tell style for an archetype.
 *
 * @param archetype - Bot archetype
 * @returns Tell style string
 */
export function getTellStyle(archetype: BotArchetype | null): string {
  if (!archetype) return "minimal";

  const behavior = getArchetypeBehavior(archetype);
  return behavior?.tell.style ?? "minimal";
}

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
 * Get adjusted weights based on game state, archetype, and emotional state.
 * - Uses archetype-specific weights for differentiated playstyles
 * - Attack weight is 0 during protection period (turn <= protectionTurns)
 * - Applies M10 emotional modifiers based on current state
 * - Redistributes attack weight proportionally to other actions during protection
 *
 * @param context - Current game context
 * @returns Adjusted decision weights
 */
export function getAdjustedWeights(
  context: BotDecisionContext
): BotDecisionWeights {
  // Get archetype-specific weights (default to BASE_WEIGHTS if archetype unknown)
  const archetype = context.empire.botArchetype;
  let weights = archetype && ARCHETYPE_WEIGHTS[archetype]
    ? { ...ARCHETYPE_WEIGHTS[archetype] }
    : { ...BASE_WEIGHTS };

  const isProtected = context.currentTurn <= context.protectionTurns;

  // During protection: set attack to 0 and redistribute
  if (isProtected) {
    const attackWeight = weights.attack;
    const otherWeightSum =
      weights.build_units +
      weights.buy_planet +
      weights.diplomacy +
      weights.trade +
      weights.do_nothing +
      weights.craft_component +
      weights.accept_contract +
      weights.purchase_black_market +
      weights.covert_operation +
      weights.fund_research +
      weights.upgrade_units;

    // Redistribute proportionally
    const redistributionFactor = 1 + attackWeight / otherWeightSum;

    weights = {
      build_units: weights.build_units * redistributionFactor,
      buy_planet: weights.buy_planet * redistributionFactor,
      attack: 0, // No attacks during protection
      diplomacy: weights.diplomacy * redistributionFactor,
      trade: weights.trade * redistributionFactor,
      do_nothing: weights.do_nothing * redistributionFactor,
      craft_component: weights.craft_component * redistributionFactor,
      accept_contract: weights.accept_contract * redistributionFactor,
      purchase_black_market: weights.purchase_black_market * redistributionFactor,
      covert_operation: weights.covert_operation * redistributionFactor,
      fund_research: weights.fund_research * redistributionFactor,
      upgrade_units: weights.upgrade_units * redistributionFactor,
    };
  }

  // M10: Apply emotional state modifiers if available
  if (context.emotionalState) {
    const { state, intensity } = context.emotionalState;
    // Only apply if not neutral
    if (state !== "neutral") {
      weights = applyEmotionalModifiers(
        weights,
        state as EmotionalStateName,
        intensity
      );
    }
  }

  // M10: Apply permanent grudge targeting (increase attack weight against grudge targets)
  if (context.permanentGrudges && context.permanentGrudges.length > 0) {
    // Check if any available targets are grudge targets
    const hasGrudgeTarget = context.availableTargets.some(
      (t) => context.permanentGrudges?.includes(t.id)
    );
    if (hasGrudgeTarget && !isProtected) {
      // Boost attack weight by 20% when grudge targets are available
      const boost = weights.attack * 0.2;
      weights.attack += boost;
      // Normalize
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      for (const key of Object.keys(weights) as Array<keyof BotDecisionWeights>) {
        weights[key] = weights[key] / sum;
      }
    }
  }

  return weights;
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
    // Additional game systems
    ["covert_operation", weights.covert_operation],
    ["fund_research", weights.fund_research],
    ["upgrade_units", weights.upgrade_units],
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
      "covert_operation",
      "fund_research",
      "upgrade_units",
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
    // Additional game systems (TODO: Implement when features are ready)
    case "covert_operation":
      // TODO: Implement covert operation decision generation
      return { type: "do_nothing" };
    case "fund_research":
      // TODO: Implement research funding decision generation
      return { type: "do_nothing" };
    case "upgrade_units":
      // TODO: Implement unit upgrade decision generation
      return { type: "do_nothing" };
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
 * Selects a target based on difficulty, archetype, and grudges.
 * M9: Uses archetype attack thresholds
 * M10: Prioritizes grudge targets
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

  // M10: Check for grudge targets first
  let target;
  if (context.permanentGrudges && context.permanentGrudges.length > 0) {
    const grudgeTargets = validTargets.filter((t) =>
      context.permanentGrudges?.includes(t.id)
    );
    if (grudgeTargets.length > 0) {
      // Prioritize grudge targets (70% chance to attack grudge target if available)
      const grudgeRoll = random ?? Math.random();
      if (grudgeRoll < 0.7) {
        // Use a separate random value for target selection to avoid double random call
        const targetRoll = random !== undefined ? (grudgeRoll + 0.3) % 1 : Math.random();
        target = grudgeTargets[Math.floor(targetRoll * grudgeTargets.length)];
      }
    }
  }

  // If no grudge target selected, use normal selection
  if (!target) {
    target = selectTarget(validTargets, difficulty, random);
  }

  if (!target) {
    return { type: "do_nothing" };
  }

  // M9: Check archetype attack threshold
  const archetype = empire.botArchetype;
  if (archetype) {
    const ourPower = calculateOurMilitaryPower(empire);
    const enemyPower = target.militaryPower;

    // Only attack if we pass the archetype's attack threshold check
    // (unless targeting a grudge - grudge overrides threshold)
    const isGrudgeTarget = context.permanentGrudges?.includes(target.id);
    if (!isGrudgeTarget && !shouldArchetypeAttack(archetype, ourPower, enemyPower)) {
      // Archetype wouldn't attack at this power ratio
      return { type: "do_nothing" };
    }
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

  // Allocate forces based on archetype style
  const behavior = getArchetypeBehavior(archetype);
  const baseAllocation = behavior?.combat.style === "aggressive" ? 0.5 : 0.3;
  const allocationFactor = baseAllocation + (random ?? Math.random()) * 0.3;

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

  // Select combat stance based on archetype
  const stance = getBotCombatStance(archetype, random);

  return { type: "attack", targetId: target.id, forces, stance };
}

/**
 * Calculate military power for our empire.
 */
function calculateOurMilitaryPower(empire: BotDecisionContext["empire"]): number {
  return (
    empire.soldiers +
    empire.fighters * 3 +
    empire.lightCruisers * 5 +
    empire.heavyCruisers * 8 +
    empire.carriers * 12 +
    empire.stations * 50
  );
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
    weights.purchase_black_market +
    weights.covert_operation +
    weights.fund_research +
    weights.upgrade_units
  );
}

/**
 * Validate that weights sum to approximately 1.0.
 */
export function validateWeights(weights: BotDecisionWeights): boolean {
  const sum = getWeightSum(weights);
  return Math.abs(sum - 1.0) < 0.001;
}

// =============================================================================
// M12: TIER 1 LLM DECISION GENERATION
// =============================================================================

/**
 * Get persona for a bot based on archetype, tier, and LLM status.
 * Matches personas from personas.json based on bot properties.
 *
 * @param bot - Empire object (bot empire)
 * @param personas - Array of personas from personas.json
 * @returns Matching persona or null if not found
 */
export function getPersonaForBot(
  bot: { botArchetype: string | null; botTier: string | null; llmEnabled: boolean },
  personas: Array<{
    id: string;
    name: string;
    emperorName: string;
    archetype: string;
    tier: number;
    voice: {
      tone: string;
      quirks: string[];
      vocabulary: string[];
      catchphrase: string;
    };
    tellRate: number;
    llmEnabled?: boolean;
  }>
): typeof personas[0] | null {
  if (!bot.botArchetype || !bot.botTier) {
    return null;
  }

  // Convert tier string to number (e.g., "tier1_llm" -> 1)
  const tierNum = parseInt(bot.botTier.replace(/\D/g, "")) || 1;

  // Find matching personas (treat undefined llmEnabled as false)
  const matches = personas.filter(
    (p) =>
      p.archetype === bot.botArchetype &&
      p.tier === tierNum &&
      (p.llmEnabled ?? false) === bot.llmEnabled
  );

  if (matches.length === 0) {
    // Fallback: try without llmEnabled match
    const fallbackMatches = personas.filter(
      (p) => p.archetype === bot.botArchetype && p.tier === tierNum
    );
    return fallbackMatches[0] ?? null;
  }

  // Return first match (could randomize here if desired)
  return matches[0] ?? null;
}

/**
 * Generate decision for Tier 1 LLM bots.
 *
 * Flow:
 * 1. Check cache for pre-computed decision
 * 2. If found: return cached decision
 * 3. If not found: attempt sync LLM call (3s timeout)
 * 4. If LLM fails: fall back to Tier 2 scripted logic
 *
 * @param context - Bot decision context
 * @returns Bot decision (either from LLM or fallback)
 */
export async function generateTier1Decision(
  context: BotDecisionContext
): Promise<BotDecision> {
  const { getCachedDecision } = await import("@/lib/llm/cache");

  // Step 1: Check cache for pre-computed decision
  const cached = await getCachedDecision(
    context.gameId,
    context.empire.id,
    context.currentTurn
  );

  if (cached) {
    return cached.decision;
  }

  // Step 2: Cache miss - attempt synchronous LLM call

  try {
    const { callLlmWithFailover } = await import("@/lib/llm/client");
    const { buildDecisionPrompt } = await import("@/lib/llm/prompts/tier1-prompt");
    const { parseLlmResponse } = await import("@/lib/llm/response-parser");
    const { logLlmCall } = await import("@/lib/llm/cost-tracker");
    const { TIER1_BOT_CONFIG } = await import("@/lib/llm/constants");

    // Load personas dynamically
    const personas = await import("@/data/personas.json");
    const persona = getPersonaForBot(context.empire, personas.default);

    if (!persona) {
      throw new Error(
        `No persona found for bot ${context.empire.name} (archetype: ${context.empire.botArchetype}, tier: ${context.empire.botTier})`
      );
    }

    // Build prompt
    const messages = buildDecisionPrompt(persona, context);

    // Call LLM with 3s timeout (sync mode)
    const llmResponse = await callLlmWithFailover(
      {
        messages,
        temperature: TIER1_BOT_CONFIG.DECISION_TEMPERATURE,
        maxTokens: TIER1_BOT_CONFIG.DECISION_MAX_TOKENS,
      },
      "decision",
      "groq",
      ["together", "openai"],
      3000 // 3s timeout for sync call
    );

    // Log call
    await logLlmCall(
      context.gameId,
      context.empire.id,
      context.currentTurn,
      "decision",
      llmResponse
    );

    // Parse response
    if (llmResponse.status === "completed") {
      const parsed = parseLlmResponse(llmResponse.content, context);

      if (parsed.success && parsed.decision) {
        return parsed.decision;
      }
    }
  } catch (error) {
    console.error(
      `[Tier 1] Sync LLM call failed for ${context.empire.name}:`,
      error
    );
  }

  // Step 3: Fallback to Tier 2 scripted logic
  return generateBotDecision(context);
}

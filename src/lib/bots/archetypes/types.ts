/**
 * Bot Archetype Type Definitions (PRD 7.6, 7.10)
 *
 * Defines the structure for bot archetype behaviors, passive abilities,
 * and tell system parameters.
 *
 * @see docs/PRD.md Section 7.6 (Bot Archetypes)
 * @see docs/PRD.md Section 7.10 (Player Readability / Tell System)
 */

// =============================================================================
// ARCHETYPE TYPES
// =============================================================================

export const ARCHETYPE_NAMES = [
  "warlord",
  "diplomat",
  "merchant",
  "schemer",
  "turtle",
  "blitzkrieg",
  "techRush",
  "opportunist",
] as const;

export type ArchetypeName = (typeof ARCHETYPE_NAMES)[number];

// =============================================================================
// PASSIVE ABILITY TYPES
// =============================================================================

export const PASSIVE_ABILITIES = [
  "war_economy",      // Warlord: -20% military cost when at war
  "trade_network",    // Diplomat: +10% income per alliance
  "market_insight",   // Merchant: Sees next turn's market prices
  "shadow_network",   // Schemer: -50% agent cost, +20% covert success
  "fortification",    // Turtle: 2× defensive structure effectiveness
  "none",             // For archetypes without passives
] as const;

export type PassiveAbility = (typeof PASSIVE_ABILITIES)[number];

// =============================================================================
// BEHAVIOR PRIORITY TYPES
// =============================================================================

/** Priority areas for bot decision making (0-1 scale) */
export interface BehaviorPriorities {
  /** Priority for military spending (0-1) */
  military: number;
  /** Priority for economic development (0-1) */
  economy: number;
  /** Priority for research investment (0-1) */
  research: number;
  /** Priority for diplomatic actions (0-1) */
  diplomacy: number;
  /** Priority for covert operations (0-1) */
  covert: number;
}

// =============================================================================
// COMBAT BEHAVIOR TYPES
// =============================================================================

export type CombatStyle = "aggressive" | "defensive" | "opportunistic" | "reluctant";

export interface CombatBehavior {
  /** Combat approach style */
  style: CombatStyle;
  /** Power ratio threshold to initiate attack (attacks if enemy has less than X of bot's power) */
  attackThreshold: number;
  /** Whether to only attack with allies present */
  requireAllies: boolean;
  /** Willingness to retreat (0-1, higher = more likely to retreat) */
  retreatWillingness: number;
  /** Preference for specific unit types (optional) */
  unitPreference?: {
    soldiers?: number;
    fighters?: number;
    stations?: number;
    cruisers?: number;
    carriers?: number;
  };
}

// =============================================================================
// DIPLOMACY BEHAVIOR TYPES
// =============================================================================

export interface DiplomacyBehavior {
  /** How actively bot seeks alliances (0-1) */
  allianceSeeking: number;
  /** Trust given to new empires (0-1) */
  baseTrust: number;
  /** How likely to break treaties (0-1) */
  betrayalChance: number;
  /** Willingness to accept tribute instead of war (0-1) */
  tributeAcceptance: number;
  /** Whether bot mediates conflicts between others */
  mediatesConflicts: boolean;
}

// =============================================================================
// TELL SYSTEM TYPES (PRD 7.10)
// =============================================================================

export type TellStyle = "obvious" | "polite" | "transactional" | "cryptic" | "minimal" | "clear";

export interface TellBehavior {
  /** How often bot telegraphs intentions (0-1) */
  tellRate: number;
  /** Style of communication/hints */
  style: TellStyle;
  /** Turns of advance warning given before major actions */
  advanceWarning: {
    min: number;
    max: number;
  };
}

// =============================================================================
// ARCHETYPE BEHAVIOR INTERFACE
// =============================================================================

export interface ArchetypeBehavior {
  /** Archetype identifier */
  name: ArchetypeName;
  /** Display name for the archetype */
  displayName: string;
  /** Short description of playstyle */
  description: string;
  /** Passive ability (if any) */
  passiveAbility: PassiveAbility;
  /** Description of passive ability effect */
  passiveDescription: string;
  /** Priority weights for different activities */
  priorities: BehaviorPriorities;
  /** Combat-related behaviors */
  combat: CombatBehavior;
  /** Diplomacy-related behaviors */
  diplomacy: DiplomacyBehavior;
  /** Tell system parameters (how readable the bot is) */
  tell: TellBehavior;
}

// =============================================================================
// PASSIVE ABILITY EFFECTS
// =============================================================================

export interface PassiveAbilityEffect {
  /** The passive ability type */
  ability: PassiveAbility;
  /** Condition that must be met for the ability to activate */
  condition?: string;
  /** Effect modifiers when active */
  effects: {
    militaryCostModifier?: number;      // Multiplier for military costs
    incomeModifier?: number;            // Multiplier per condition
    covertCostModifier?: number;        // Multiplier for covert agent costs
    covertSuccessModifier?: number;     // Additive bonus to success rate
    defenseModifier?: number;           // Multiplier for defensive structures
    marketInsight?: boolean;            // Can see next turn's prices
  };
}

/**
 * Passive ability effect definitions.
 */
export const PASSIVE_ABILITY_EFFECTS: Record<Exclude<PassiveAbility, "none">, PassiveAbilityEffect> = {
  war_economy: {
    ability: "war_economy",
    condition: "at_war",
    effects: {
      militaryCostModifier: 0.80, // -20% military cost
    },
  },
  trade_network: {
    ability: "trade_network",
    condition: "per_alliance",
    effects: {
      incomeModifier: 0.10, // +10% income per alliance
    },
  },
  market_insight: {
    ability: "market_insight",
    effects: {
      marketInsight: true,
    },
  },
  shadow_network: {
    ability: "shadow_network",
    effects: {
      covertCostModifier: 0.50,    // -50% agent cost
      covertSuccessModifier: 0.20, // +20% success rate
    },
  },
  fortification: {
    ability: "fortification",
    effects: {
      defenseModifier: 2.0, // 2× defensive structure effectiveness
    },
  },
};

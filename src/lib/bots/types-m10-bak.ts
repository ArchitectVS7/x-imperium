/**
 * Bot Types and Interfaces
 *
 * Type definitions for the bot decision system.
 * Defines decision types, weights, context, and processing results.
 * Extended in M9/M10 to support emotional states and memory.
 */

import type { Empire, Planet } from "@/lib/db/schema";
import type { EmotionalStateName, EmotionalModifiers } from "./emotions/states";
import type { MemoryRecord, RelationshipMemory } from "./memory/weights";

// Re-export for convenience
export type { Empire, Planet };

// =============================================================================
// DIFFICULTY TYPES
// =============================================================================

export type Difficulty = "easy" | "normal" | "hard" | "nightmare";

export interface DifficultyModifiers {
  /** Resource bonus multiplier (1.0 = normal, 1.25 = nightmare) */
  resourceBonus: number;
  /** Chance of making suboptimal choice (0.5 = 50% for easy, 0 otherwise) */
  suboptimalChance: number;
  /** Whether to target weakest enemies (hard/nightmare) */
  targetWeakest: boolean;
}

// =============================================================================
// BOT ARCHETYPES
// =============================================================================

export type BotArchetype =
  | "warlord"
  | "diplomat"
  | "merchant"
  | "schemer"
  | "turtle"
  | "blitzkrieg"
  | "tech_rush"
  | "opportunist";

export type BotTier =
  | "tier1_llm"
  | "tier2_strategic"
  | "tier3_simple"
  | "tier4_random";

// =============================================================================
// UNIT TYPES
// =============================================================================

export type UnitType =
  | "soldiers"
  | "fighters"
  | "stations"
  | "lightCruisers"
  | "heavyCruisers"
  | "carriers"
  | "covertAgents";

export type PlanetType =
  | "food"
  | "ore"
  | "petroleum"
  | "tourism"
  | "urban"
  | "education"
  | "government"
  | "research"
  | "supply"
  | "anti_pollution";

export type ResourceType = "credits" | "food" | "ore" | "petroleum";

// =============================================================================
// FORCES (for attacks)
// =============================================================================

export interface Forces {
  soldiers: number;
  fighters: number;
  stations: number;
  lightCruisers: number;
  heavyCruisers: number;
  carriers: number;
}

// =============================================================================
// BOT DECISIONS
// =============================================================================

export type BotDecision =
  | { type: "build_units"; unitType: UnitType; quantity: number }
  | { type: "buy_planet"; planetType: PlanetType }
  | { type: "attack"; targetId: string; forces: Forces }
  | {
      type: "diplomacy";
      action: "propose_nap" | "propose_alliance";
      targetId: string;
    }
  | {
      type: "trade";
      resource: ResourceType;
      quantity: number;
      action: "buy" | "sell";
    }
  | { type: "do_nothing" };

export type BotDecisionType =
  | "build_units"
  | "buy_planet"
  | "attack"
  | "diplomacy"
  | "trade"
  | "do_nothing";

// =============================================================================
// DECISION WEIGHTS
// =============================================================================

export interface BotDecisionWeights {
  build_units: number; // 35%
  buy_planet: number; // 20%
  attack: number; // 15% (0% before protection ends)
  diplomacy: number; // 10% (stub: resolves to do_nothing)
  trade: number; // 10% (stub: resolves to do_nothing)
  do_nothing: number; // 10%
}

// =============================================================================
// EMPIRE TARGET (for attack selection)
// =============================================================================

export interface EmpireTarget {
  id: string;
  name: string;
  networth: number;
  planetCount: number;
  isBot: boolean;
  isEliminated: boolean;
  /** Military strength estimate (soldiers + fighters + cruisers) */
  militaryPower: number;
}

// =============================================================================
// EMOTIONAL STATE CONTEXT (M10)
// =============================================================================

/**
 * Current emotional state of a bot empire.
 * Used to modify decision weights and message tones.
 */
export interface BotEmotionalState {
  /** The current emotional state */
  state: EmotionalStateName;
  /** Intensity of the state (0.0 - 1.0) */
  intensity: number;
  /** Turn when this state was triggered */
  triggeredTurn: number;
  /** Calculated modifiers at current intensity */
  modifiers: EmotionalModifiers;
}

// =============================================================================
// RELATIONSHIP CONTEXT (M10)
// =============================================================================

/**
 * Relationship scores with other empires.
 * Derived from memory weights and used to modify diplomacy decisions.
 */
export interface RelationshipScores {
  /** Map of empireId -> relationship score (-100 to +100 typical range) */
  scores: Map<string, number>;
  /** Permanent scars (empireIds that will never be fully trusted) */
  permanentEnemies: Set<string>;
}

// =============================================================================
// DECISION CONTEXT
// =============================================================================

export interface BotDecisionContext {
  empire: Empire;
  planets: Planet[];
  gameId: string;
  currentTurn: number;
  protectionTurns: number;
  difficulty: Difficulty;
  availableTargets: EmpireTarget[];

  // ==========================================================================
  // M10: Emotional State (Optional - populated when M10 is complete)
  // ==========================================================================

  /**
   * Current emotional state of this bot.
   * Affects decision quality, aggression, and diplomacy willingness.
   * @see src/lib/bots/emotions/states.ts
   */
  emotionalState?: BotEmotionalState;

  // ==========================================================================
  // M10: Memory & Relationships (Optional - populated when M10 is complete)
  // ==========================================================================

  /**
   * Memories about interactions with other empires.
   * Used to calculate relationship scores and influence targeting.
   * @see src/lib/bots/memory/weights.ts
   */
  memories?: MemoryRecord[];

  /**
   * Pre-calculated relationship scores with other empires.
   * Derived from memories with decay applied.
   */
  relationshipScores?: RelationshipScores;

  /**
   * Full relationship memory for each known empire.
   * Only populated when detailed memory access is needed.
   */
  relationships?: Map<string, RelationshipMemory>;
}

// =============================================================================
// PROCESSING RESULTS
// =============================================================================

export interface BotProcessingResult {
  empireId: string;
  empireName: string;
  decision: BotDecision;
  executed: boolean;
  error?: string;
  durationMs: number;
}

export interface BotTurnResult {
  gameId: string;
  turn: number;
  botResults: BotProcessingResult[];
  totalDurationMs: number;
  success: boolean;
  error?: string;
}

// =============================================================================
// BOT CREATION
// =============================================================================

export interface BotEmpireConfig {
  name: string;
  emperorName: string;
  archetype: BotArchetype;
  tier: BotTier;
}

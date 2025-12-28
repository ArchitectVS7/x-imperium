/**
 * Bot Types and Interfaces
 *
 * Type definitions for the M5 Random Bot system.
 * Defines decision types, weights, context, and processing results.
 */

import type { Empire, Planet } from "@/lib/db/schema";

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

/**
 * Information about a potential target empire.
 *
 * TODO (Fog of War - Gate 2/3):
 * Currently bots have "god mode" knowledge - exact networth, planetCount,
 * and militaryPower for all empires. This should be replaced with:
 * - estimatedNetworth: Based on leaderboard position (with uncertainty)
 * - estimatedPower: Based on covert ops intelligence (spy missions)
 * - visiblePlanets: Only planets revealed through espionage
 * - publicInfo: Major battles, official rankings, treaty announcements
 *
 * Bots should only get accurate info through:
 * 1. Public leaderboards (approximate networth rankings)
 * 2. Successful spy missions (reveal specific details)
 * 3. Combat encounters (observe enemy forces)
 * 4. Treaty negotiations (voluntary information sharing)
 */
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

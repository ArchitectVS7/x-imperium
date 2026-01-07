/**
 * Bot Types and Interfaces
 *
 * Type definitions for the M5 Random Bot system.
 * Defines decision types, weights, context, and processing results.
 */

import type { Empire, Sector } from "@/lib/db/schema";
import type { CraftedResource } from "@/lib/game/constants/crafting";
import type { ContractType } from "@/lib/game/constants/syndicate";
import type { CombatStance } from "@/lib/combat/stances";

// Re-export for convenience
export type { Empire, Sector };

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
  | "tier1_elite_scripted"
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

export type CovertOperationType =
  | "send_spy"
  | "insurgent_aid"
  | "support_dissension"
  | "demoralize_troops"
  | "bombing_operations"
  | "relations_spying"
  | "take_hostages"
  | "carriers_sabotage"
  | "communications_spying"
  | "setup_coup";

export type ResearchBranch =
  | "military"
  | "defense"
  | "propulsion"
  | "stealth"
  | "economy"
  | "biotech";

export type BotDecision =
  | { type: "build_units"; unitType: UnitType; quantity: number }
  | { type: "buy_planet"; sectorType: PlanetType }
  | { type: "attack"; targetId: string; forces: Forces; stance?: CombatStance }
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
  | { type: "do_nothing" }
  // Crafting system decisions
  | { type: "craft_component"; resourceType: CraftedResource; quantity: number }
  | { type: "accept_contract"; contractType: ContractType; targetId?: string }
  | { type: "purchase_black_market"; itemId: string; quantity: number }
  // Covert operations (PRD 6.8)
  | { type: "covert_operation"; operation: CovertOperationType; targetId: string }
  // Research funding (PRD 9.2)
  | { type: "fund_research"; branch: ResearchBranch; amount: number }
  // Unit upgrades (PRD 9.4)
  | { type: "upgrade_units"; unitType: UnitType; level: 1 | 2 };

export type BotDecisionType =
  | "build_units"
  | "buy_planet"
  | "attack"
  | "diplomacy"
  | "trade"
  | "do_nothing"
  // Crafting system decision types
  | "craft_component"
  | "accept_contract"
  | "purchase_black_market"
  // Additional game systems
  | "covert_operation"
  | "fund_research"
  | "upgrade_units";

// =============================================================================
// DECISION WEIGHTS
// =============================================================================

export interface BotDecisionWeights {
  build_units: number; // 25%
  buy_planet: number; // 12%
  attack: number; // 10% (0% before protection ends)
  diplomacy: number; // 8%
  trade: number; // 8%
  do_nothing: number; // 5%
  // Crafting system weights
  craft_component: number; // 8%
  accept_contract: number; // 4%
  purchase_black_market: number; // 4%
  // Additional game systems
  covert_operation: number; // 6%
  fund_research: number; // 5%
  upgrade_units: number; // 5%
}

// =============================================================================
// EMPIRE TARGET (for attack selection)
// =============================================================================

/**
 * Information about a potential target empire.
 *
 * TODO (Fog of War - Gate 2/3):
 * Currently bots have "god mode" knowledge - exact networth, sectorCount,
 * and militaryPower for all empires. This should be replaced with:
 * - estimatedNetworth: Based on leaderboard position (with uncertainty)
 * - estimatedPower: Based on covert ops intelligence (spy missions)
 * - visiblePlanets: Only sectors revealed through espionage
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
  sectorCount: number;
  isBot: boolean;
  isEliminated: boolean;
  /** Military strength estimate (soldiers + fighters + cruisers) */
  militaryPower: number;
  /** Whether the bot has an active treaty with this target */
  hasTreaty?: boolean;
}

// =============================================================================
// DECISION CONTEXT
// =============================================================================

export interface BotDecisionContext {
  empire: Empire;
  sectors: Sector[];
  gameId: string;
  currentTurn: number;
  protectionTurns: number;
  difficulty: Difficulty;
  availableTargets: EmpireTarget[];
  /** Resources currently in crafting queue (to avoid duplicate orders) */
  queuedCrafting?: CraftedResource[];
  /** M10: Current emotional state (if loaded) */
  emotionalState?: {
    state: "confident" | "arrogant" | "desperate" | "vengeful" | "fearful" | "triumphant" | "neutral";
    intensity: number;
  };
  /** M10: Empire IDs this bot has permanent grudges against */
  permanentGrudges?: string[];
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
  /** Whether this bot uses LLM API for decisions (only for tier1_llm) */
  llmEnabled: boolean;
}

/**
 * Galactic Events Type Definitions (PRD 11.2)
 *
 * Events occur every 10-20 turns (semi-random) to shake up the game state.
 * Types: Economic, Political, Military, Narrative
 */

// =============================================================================
// EVENT CATEGORIES
// =============================================================================

export type EventCategory = "economic" | "political" | "military" | "narrative";

// =============================================================================
// EVENT SCOPE
// =============================================================================

/** Who is affected by the event */
export type EventScope =
  | "global" // Affects all empires
  | "targeted" // Affects a specific empire
  | "random_empire" // Affects a randomly selected empire
  | "top_empires" // Affects top N empires by networth
  | "bottom_empires" // Affects bottom N empires by networth
  | "coalition"; // Affects members of a coalition

// =============================================================================
// EFFECT TYPES
// =============================================================================

/** Resource multiplier effect */
export interface ResourceEffect {
  type: "resource_multiplier";
  resource: "credits" | "food" | "ore" | "petroleum" | "research" | "all";
  multiplier: number; // 0.5 = -50%, 1.5 = +50%
}

/** Production bonus effect */
export interface ProductionEffect {
  type: "production_bonus";
  bonus: number; // Percentage bonus (0.5 = +50%)
  sectorTypes?: string[]; // Optional: only affects specific sector types
}

/** Price multiplier effect */
export interface PriceEffect {
  type: "price_multiplier";
  resource: "credits" | "food" | "ore" | "petroleum" | "all";
  multiplier: number;
}

/** Civil status effect */
export interface CivilStatusEffect {
  type: "civil_status";
  change: number; // -2 = drop 2 levels, +1 = gain 1 level
}

/** Military effect */
export interface MilitaryEffect {
  type: "military";
  subtype:
    | "damage" // Lose units
    | "bonus" // Gain units
    | "effectiveness" // Change army effectiveness
    | "maintenance"; // Change maintenance costs
  value: number;
  unitTypes?: string[]; // Optional: only affects specific units
}

/** Population effect */
export interface PopulationEffect {
  type: "population";
  change: number; // Percentage change (-0.1 = -10%)
}

/** Research effect */
export interface ResearchEffect {
  type: "research";
  change: number; // Flat research points or percentage
  isPercentage: boolean;
}

/** Diplomatic effect */
export interface DiplomaticEffect {
  type: "diplomatic";
  subtype:
    | "treaty_break" // Force break treaties
    | "reputation_change" // Change reputation
    | "forced_alliance" // Force alliances
    | "forced_war"; // Force war between empires
  value?: number;
}

/** Generic effect union */
export type EventEffect =
  | ResourceEffect
  | ProductionEffect
  | PriceEffect
  | CivilStatusEffect
  | MilitaryEffect
  | PopulationEffect
  | ResearchEffect
  | DiplomaticEffect;

// =============================================================================
// EVENT DEFINITION
// =============================================================================

export interface GalacticEvent {
  /** Unique event identifier */
  id: string;
  /** Display name */
  name: string;
  /** Event category */
  category: EventCategory;
  /** Who is affected */
  scope: EventScope;
  /** Number of empires affected (for scopes that target multiple) */
  targetCount?: number;
  /** Short description for event feed */
  description: string;
  /** Longer narrative text */
  narrative: string;
  /** Effects applied when event triggers */
  effects: EventEffect[];
  /** Duration in turns (0 = instant) */
  duration: number;
  /** Base probability of occurrence (0-1) */
  probability: number;
  /** Earliest turn this event can occur */
  minTurn?: number;
  /** Latest turn this event can occur */
  maxTurn?: number;
  /** If true, can only happen once per game */
  unique?: boolean;
  /** Prerequisite conditions (optional) */
  prerequisites?: EventPrerequisite[];
}

// =============================================================================
// EVENT PREREQUISITES
// =============================================================================

export type EventPrerequisite =
  | { type: "turn_range"; min?: number; max?: number }
  | { type: "empire_count"; min?: number; max?: number }
  | { type: "player_networth"; min?: number; max?: number }
  | { type: "previous_event"; eventId: string; occurred: boolean }
  | { type: "random_chance"; probability: number };

// =============================================================================
// EVENT LOG ENTRY
// =============================================================================

export interface EventLogEntry {
  eventId: string;
  turn: number;
  affectedEmpires: string[];
  actualEffects: Record<string, unknown>;
  timestamp: Date;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Minimum turns between galactic events */
export const MIN_TURNS_BETWEEN_EVENTS = 10;

/** Maximum turns between galactic events */
export const MAX_TURNS_BETWEEN_EVENTS = 20;

/** Turn at which galactic events start occurring */
export const EVENTS_START_TURN = 15;

/** Maximum concurrent active effects */
export const MAX_ACTIVE_EFFECTS = 5;

/**
 * Bot Battle Simulator Types
 *
 * Type definitions for the headless game simulation system.
 * Used to run bot-vs-bot battles without a database to validate
 * all game systems and collect balance statistics.
 */

import type { BotArchetype, BotDecision, Forces, PlanetType, UnitType } from "@/lib/bots/types";
import type { CivilStatusLevel } from "@/lib/game/constants";

// =============================================================================
// SIMULATED EMPIRE
// =============================================================================

export interface SimulatedEmpire {
  id: string;
  name: string;
  archetype: BotArchetype;

  // Resources
  credits: number;
  food: number;
  ore: number;
  petroleum: number;
  researchPoints: number;

  // Population
  population: number;
  populationCap: number;
  civilStatus: CivilStatusLevel;

  // Military
  soldiers: number;
  fighters: number;
  stations: number;
  lightCruisers: number;
  heavyCruisers: number;
  carriers: number;
  covertAgents: number;
  armyEffectiveness: number;

  // Planets
  planets: SimulatedPlanet[];

  // State
  isEliminated: boolean;
  eliminatedAtTurn?: number;

  // Stats
  researchLevel: number;
  covertPoints: number;
  networth: number;
}

export interface SimulatedPlanet {
  id: string;
  type: PlanetType;
  productionRate: number;
}

// =============================================================================
// SIMULATION STATE
// =============================================================================

export interface SimulationState {
  gameId: string;
  currentTurn: number;
  turnLimit: number;
  protectionTurns: number;

  empires: SimulatedEmpire[];

  // Market state
  marketPrices: {
    credits: number;
    food: number;
    ore: number;
    petroleum: number;
  };

  // Diplomacy state
  treaties: SimulatedTreaty[];
}

export interface SimulatedTreaty {
  id: string;
  type: "nap" | "alliance";
  empireAId: string;
  empireBId: string;
  startTurn: number;
}

// =============================================================================
// ACTION TRACKING
// =============================================================================

export interface TrackedAction {
  turn: number;
  empireId: string;
  empireName: string;
  decision: BotDecision;
  outcome: ActionOutcome;
}

export type ActionOutcome =
  | { type: "success"; details: string }
  | { type: "failure"; reason: string }
  | { type: "combat"; result: CombatOutcomeRecord }
  | { type: "no_op" };

export interface CombatOutcomeRecord {
  attackerId: string;
  defenderId: string;
  attackerLosses: Forces;
  defenderLosses: Forces;
  planetsTransferred: number;
  winner: "attacker" | "defender" | "draw";
}

// =============================================================================
// SYSTEM COVERAGE
// =============================================================================

export interface SystemCoverage {
  // Actions taken
  buildUnits: { count: number; unitTypes: Set<UnitType> };
  buyPlanet: { count: number; sectorTypes: Set<PlanetType> };
  attacks: { count: number; invasions: number; guerilla: number };
  diplomacy: { count: number; naps: number; alliances: number };
  trades: { count: number; buys: number; sells: number };
  covertOps: { count: number; operationTypes: Set<string> };

  // Systems exercised
  combatResolved: boolean;
  marketUsed: boolean;
  researchAdvanced: boolean;
  civilStatusChanged: boolean;
  starvationOccurred: boolean;
  bankruptcyOccurred: boolean;
  eliminationOccurred: boolean;
  victoryAchieved: boolean;

  // Victory conditions checked
  conquestChecked: boolean;
  economicChecked: boolean;
  survivalChecked: boolean;
}

// =============================================================================
// BALANCE STATISTICS
// =============================================================================

export interface BalanceStats {
  // Per-archetype stats
  archetypeWins: Record<BotArchetype, number>;
  archetypeTopThree: Record<BotArchetype, number>;
  archetypeEliminations: Record<BotArchetype, number>;
  archetypeSurvivalTurns: Record<BotArchetype, number[]>;

  // Game-level stats
  averageGameLength: number;
  longestGame: number;
  shortestGame: number;
  victoryTypes: Record<string, number>;

  // Economy stats
  averageFinalNetworth: number;
  maxNetworth: number;
  averagePlanetCount: number;

  // Combat stats
  totalBattles: number;
  attackerWinRate: number;
  averageCasualties: number;
}

// =============================================================================
// CUSTOM BOT CONFIG
// =============================================================================

export type BotTier = "overpowered" | "normal" | "underpowered";

export interface CustomBotConfig {
  name: string;
  emperorName: string;
  archetype: BotArchetype;
  startPosition: number;
  tier?: BotTier;
}

// =============================================================================
// SIMULATION CONFIG
// =============================================================================

export interface SimulationConfig {
  /** Number of empires (including player if simulated) */
  empireCount?: number;

  /** Alias for empireCount (for battle framework compatibility) */
  botCount?: number;

  /** Maximum turns to run */
  turnLimit: number;

  /** Protection period (no attacks) */
  protectionTurns: number;

  /** Whether to include a simulated player */
  includePlayer?: boolean;

  /** Bot difficulty level */
  difficulty?: "easy" | "normal" | "hard" | "nightmare";

  /** Random seed for reproducibility */
  seed?: number;

  /** Enable verbose logging */
  verbose: boolean;

  /** Archetype distribution (optional, defaults to random) */
  archetypeDistribution?: Partial<Record<BotArchetype, number>>;

  /** Custom bot configurations (for battle framework) */
  customBots?: CustomBotConfig[];
}

export interface SimulationResult {
  /** Final game state */
  finalState: SimulationState;

  /** All tracked actions */
  actions: TrackedAction[];

  /** System coverage metrics */
  coverage: SystemCoverage;

  /** Winner info */
  winner?: {
    empireId: string;
    empireName: string;
    archetype: BotArchetype;
    victoryType: string;
  };

  /** Total turns played */
  turnsPlayed: number;

  /** Simulation duration in ms */
  durationMs: number;
}

// =============================================================================
// BATCH SIMULATION
// =============================================================================

export interface BatchConfig {
  /** Number of simulations to run */
  count: number;

  /** Config for each simulation */
  simulationConfig: SimulationConfig;

  /** Run in parallel */
  parallel: boolean;
}

export interface BatchResult {
  /** Individual simulation results */
  results: SimulationResult[];

  /** Aggregated balance statistics */
  balanceStats: BalanceStats;

  /** Total duration */
  totalDurationMs: number;
}

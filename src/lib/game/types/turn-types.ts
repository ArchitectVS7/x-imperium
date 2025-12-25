/**
 * Type definitions for turn processing system
 *
 * These types define the structure of turn processing data,
 * events, and results throughout the 6-phase turn pipeline.
 */

import type { CivilStatusLevel } from "../constants";

// =============================================================================
// TURN PHASES
// =============================================================================

export type TurnPhase =
  | "income"
  | "population"
  | "civil_status"
  | "market"
  | "bot_decisions"
  | "actions"
  | "maintenance"
  | "victory_check";

// =============================================================================
// POPULATION MECHANICS
// =============================================================================

export type PopulationStatus = "growth" | "stable" | "starvation";

export type PopulationUpdate = {
  /** New population after growth/starvation */
  newPopulation: number;
  /** Food consumed this turn (0.05 per citizen) */
  foodConsumed: number;
  /** Net change in population (positive = growth, negative = starvation) */
  populationChange: number;
  /** Status indicator for this turn's population */
  status: PopulationStatus;
};

// =============================================================================
// CIVIL STATUS
// =============================================================================

export type CivilStatusUpdate = {
  /** Previous civil status */
  oldStatus: CivilStatusLevel;
  /** New civil status after evaluation */
  newStatus: CivilStatusLevel;
  /** Human-readable reason for the change */
  reason: string;
  /** Income multiplier for the new status */
  multiplier: number;
  /** Whether status changed this turn */
  changed: boolean;
};

// =============================================================================
// RESOURCES
// =============================================================================

export type ResourceDelta = {
  credits: number;
  food: number;
  ore: number;
  petroleum: number;
  researchPoints: number;
};

export type ResourceProduction = {
  /** Resources produced from planets (before multipliers) */
  production: ResourceDelta;
  /** Income multiplier from civil status */
  incomeMultiplier: number;
  /** Resources after applying multiplier */
  final: ResourceDelta;
};

export type MaintenanceCost = {
  /** Total maintenance cost */
  totalCost: number;
  /** Cost per planet (168 credits) */
  costPerPlanet: number;
  /** Number of planets */
  planetCount: number;
};

// =============================================================================
// TURN EVENTS
// =============================================================================

export type TurnEvent = {
  /** Event type for categorization */
  type:
    | "resource_production"
    | "population_change"
    | "civil_status_change"
    | "maintenance"
    | "bankruptcy"
    | "starvation"
    | "victory"
    | "defeat"
    | "revolt_consequences"
    | "other";
  /** Human-readable message */
  message: string;
  /** Severity level */
  severity: "info" | "warning" | "error";
  /** Associated empire ID (if applicable) */
  empireId?: string;
};

// =============================================================================
// EMPIRE RESULTS
// =============================================================================

export type EmpireResult = {
  /** Empire UUID */
  empireId: string;
  /** Empire name for display */
  empireName: string;
  /** Net resource changes this turn */
  resourceChanges: ResourceDelta;
  /** Population change (growth/starvation) */
  populationChange: number;
  /** Civil status change (if any) */
  civilStatusChange?: CivilStatusUpdate;
  /** Events that occurred for this empire */
  events: TurnEvent[];
  /** Whether empire is still alive */
  isAlive: boolean;
};

// =============================================================================
// TURN RESULTS
// =============================================================================

export type TurnResult = {
  /** Game UUID */
  gameId: string;
  /** Turn number that just completed */
  turn: number;
  /** Total processing time in milliseconds */
  processingMs: number;
  /** Results for each empire */
  empireResults: EmpireResult[];
  /** Global events (not empire-specific) */
  globalEvents: TurnEvent[];
  /** Success/failure status */
  success: boolean;
  /** Error message (if failed) */
  error?: string;
  /** Victory result if game ended in victory (M6) */
  victoryResult?: {
    type: "conquest" | "economic" | "survival";
    winnerId: string;
    winnerName: string;
    message: string;
  };
  /** Defeat result if player was defeated (M6) */
  defeatResult?: {
    type: "bankruptcy" | "elimination" | "civil_collapse";
    empireId: string;
    empireName: string;
    message: string;
  };
};

// =============================================================================
// TURN ACTION RESULTS (for Server Actions)
// =============================================================================

export type TurnActionResult =
  | {
      success: true;
      data: {
        turn: number;
        processingMs: number;
        events: TurnEvent[];
      };
    }
  | {
      success: false;
      error: string;
    };

export type TurnStatus = {
  currentTurn: number;
  turnLimit: number;
  isProcessing: boolean;
  lastProcessingMs: number | null;
};

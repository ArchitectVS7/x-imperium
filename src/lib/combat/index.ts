/**
 * Combat System Module
 *
 * Exports all combat-related functionality including:
 * - D20 Volley Combat System v2 (production)
 * - Combat types (Forces, CombatResult, PhaseResult)
 * - Unit effectiveness matrix
 * - Guerilla attacks and retreat mechanics
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  Forces,
  PhaseResult,
  CombatResult,
  AttackType,
  CombatPhase,
  CombatUnitType,
} from "./types";

// =============================================================================
// COMBAT UTILITIES (Guerilla, Retreat)
// =============================================================================

export {
  resolveGuerillaAttack,
  resolveRetreat,
  SOLDIERS_PER_CARRIER,
} from "./phases";

// =============================================================================
// UNIT EFFECTIVENESS
// =============================================================================

export {
  UNIT_EFFECTIVENESS,
  EFFECTIVENESS_LEVELS,
  PHASE_PRIMARY_UNITS,
  getUnitEffectiveness,
  canParticipate,
  getParticipatingUnits,
  getPrimaryPhase,
  calculatePhaseEffectivePower,
  getPhaseRoleDescription,
} from "./effectiveness";

// =============================================================================
// D20 VOLLEY COMBAT SYSTEM v2 (PRODUCTION)
// =============================================================================

export {
  type D20Stats,
  type CombatUnitType as VolleyCombatUnitType,
  type AttackRoll,
  type VolleyResult,
  type BattleOutcome,
  type BattleResult,
  type BattleOptions,
  type VolleySummary,
  summarizeVolley,
  resolveBattle,
  processRetreat,
  getOutcomeDisplay,
  estimateWinProbability,
  convertToLegacyCombatResult,
  resolveVolleyInvasion,
} from "./volley-combat-v2";

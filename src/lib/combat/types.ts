/**
 * Combat System Types
 *
 * Canonical type definitions for the combat system.
 * Used by volley-combat-v2.ts (production) and legacy modules.
 */

// Import Forces from canonical source
import type { Forces as ForcesType } from "@/lib/game/types/forces";

// Re-export Forces for backward compatibility
export type Forces = ForcesType;

// Also export the CombatPhase from effectiveness
export type { CombatPhase, CombatUnitType } from "./effectiveness";

/**
 * Attack type - invasion or guerilla raid.
 */
export type AttackType = "invasion" | "guerilla";

/**
 * Result of a single combat phase.
 */
export interface PhaseResult {
  phase: import("./effectiveness").CombatPhase;
  phaseNumber: 1 | 2 | 3;
  winner: "attacker" | "defender" | "draw";

  // Power calculations
  attackerPower: number;
  defenderPower: number;

  // Forces at start of phase
  attackerForcesStart: Forces;
  defenderForcesStart: Forces;

  // Forces after phase
  attackerForcesEnd: Forces;
  defenderForcesEnd: Forces;

  // Casualties this phase
  attackerCasualties: Partial<Forces>;
  defenderCasualties: Partial<Forces>;

  // Narrative description
  description: string;
}

/**
 * Complete result of a combat encounter.
 */
export interface CombatResult {
  outcome: "attacker_victory" | "defender_victory" | "retreat" | "stalemate";
  phases: PhaseResult[];

  // Final casualty totals
  attackerTotalCasualties: Forces;
  defenderTotalCasualties: Forces;

  // Effectiveness changes
  attackerEffectivenessChange: number;
  defenderEffectivenessChange: number;

  // Sector capture
  sectorsCaptured: number;

  // Summary
  summary: string;
}

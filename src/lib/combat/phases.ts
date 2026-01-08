/**
 * Combat Utility Functions
 *
 * Contains guerilla attack and retreat resolution functions.
 * Main invasion combat is handled by volley-combat-v2.ts.
 *
 * For types, see ./types.ts
 */

import {
  calculateLossRate,
  calculateVariance,
  calculateCasualties,
  RETREAT_CASUALTY_RATE,
} from "../formulas/casualties";
import {
  type CombatOutcome as EffectivenessOutcome,
  calculateCombatEffectivenessChange,
} from "../formulas/army-effectiveness";
import { EFFECTIVENESS_LEVELS } from "./effectiveness";

// =============================================================================
// TYPE RE-EXPORTS (for backward compatibility)
// =============================================================================

export type {
  Forces,
  PhaseResult,
  CombatResult,
  AttackType,
  CombatPhase,
  CombatUnitType,
} from "./types";

import type { Forces, PhaseResult, CombatResult } from "./types";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Minimum carriers required per soldier for invasions */
export const SOLDIERS_PER_CARRIER = 100;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createEmptyForces(): Forces {
  return {
    soldiers: 0,
    fighters: 0,
    stations: 0,
    lightCruisers: 0,
    heavyCruisers: 0,
    carriers: 0,
  };
}

function sumCasualties(phases: PhaseResult[], side: "attacker" | "defender"): Forces {
  const total = createEmptyForces();

  for (const phase of phases) {
    const casualties = side === "attacker" ? phase.attackerCasualties : phase.defenderCasualties;
    total.soldiers += casualties.soldiers ?? 0;
    total.fighters += casualties.fighters ?? 0;
    total.stations += casualties.stations ?? 0;
    total.lightCruisers += casualties.lightCruisers ?? 0;
    total.heavyCruisers += casualties.heavyCruisers ?? 0;
    total.carriers += casualties.carriers ?? 0;
  }

  return total;
}

function createCombatResult(
  phases: PhaseResult[],
  outcome: CombatResult["outcome"],
  sectorsCaptured: number
): CombatResult {
  const attackerTotalCasualties = sumCasualties(phases, "attacker");
  const defenderTotalCasualties = sumCasualties(phases, "defender");

  // Calculate effectiveness changes
  let attackerOutcome: EffectivenessOutcome;
  let defenderOutcome: EffectivenessOutcome;

  if (outcome === "attacker_victory") {
    attackerOutcome = "victory";
    defenderOutcome = "defeat";
  } else if (outcome === "defender_victory") {
    attackerOutcome = "defeat";
    defenderOutcome = "victory";
  } else {
    attackerOutcome = "draw";
    defenderOutcome = "draw";
  }

  const attackerEffectivenessChange = calculateCombatEffectivenessChange(attackerOutcome);
  const defenderEffectivenessChange = calculateCombatEffectivenessChange(defenderOutcome);

  // Generate summary
  const summary =
    outcome === "attacker_victory"
      ? `Attack successful! ${sectorsCaptured} sector${sectorsCaptured !== 1 ? "s" : ""} captured.`
      : outcome === "defender_victory"
        ? "Attack repelled. Defender holds their territory."
        : outcome === "retreat"
          ? "Forces withdrew from combat, suffering retreat casualties."
          : "Combat ended in stalemate. No territory changed hands.";

  return {
    outcome,
    phases,
    attackerTotalCasualties,
    defenderTotalCasualties,
    attackerEffectivenessChange,
    defenderEffectivenessChange,
    sectorsCaptured,
    summary,
  };
}

// =============================================================================
// GUERILLA ATTACK
// =============================================================================

/**
 * Resolve a guerilla attack (soldiers only, single phase).
 * Used for quick raids that don't involve full invasion mechanics.
 */
export function resolveGuerillaAttack(
  attackerSoldiers: number,
  defenderForces: Forces,
  randomValue?: number
): CombatResult {
  const attackerForces: Forces = {
    soldiers: attackerSoldiers,
    fighters: 0,
    stations: 0,
    lightCruisers: 0,
    heavyCruisers: 0,
    carriers: 0,
  };

  const attackerPower = attackerSoldiers * 1 * EFFECTIVENESS_LEVELS.HIGH;
  const defenderPower = defenderForces.soldiers * 1 * EFFECTIVENESS_LEVELS.HIGH * 1.2;

  const lossRate = calculateLossRate(attackerPower, defenderPower);
  const variance = calculateVariance(randomValue);

  const attackerLosses = calculateCasualties(attackerSoldiers, lossRate, variance);
  const defenderLosses = calculateCasualties(defenderForces.soldiers, lossRate, variance);

  const winner = attackerPower > defenderPower ? "attacker" : "defender";

  const phaseResult: PhaseResult = {
    phase: "guerilla",
    phaseNumber: 1,
    winner,
    attackerPower,
    defenderPower,
    attackerForcesStart: attackerForces,
    defenderForcesStart: defenderForces,
    attackerForcesEnd: { ...attackerForces, soldiers: attackerSoldiers - attackerLosses },
    defenderForcesEnd: { ...defenderForces, soldiers: defenderForces.soldiers - defenderLosses },
    attackerCasualties: { soldiers: attackerLosses },
    defenderCasualties: { soldiers: defenderLosses },
    description: `Guerilla raid: ${attackerSoldiers} soldiers attack. ${winner === "attacker" ? "Raid succeeds!" : "Raid repelled!"}`,
  };

  const outcome = winner === "attacker" ? "attacker_victory" : "defender_victory";

  return createCombatResult([phaseResult], outcome, 0);
}

// =============================================================================
// RETREAT
// =============================================================================

/**
 * Calculate retreat casualties and return result.
 * Used when a player chooses to retreat from combat.
 */
export function resolveRetreat(attackerForces: Forces): CombatResult {
  const casualties: Forces = {
    soldiers: Math.floor(attackerForces.soldiers * RETREAT_CASUALTY_RATE),
    fighters: Math.floor(attackerForces.fighters * RETREAT_CASUALTY_RATE),
    stations: 0, // Stations don't retreat
    lightCruisers: Math.floor(attackerForces.lightCruisers * RETREAT_CASUALTY_RATE),
    heavyCruisers: Math.floor(attackerForces.heavyCruisers * RETREAT_CASUALTY_RATE),
    carriers: Math.floor(attackerForces.carriers * RETREAT_CASUALTY_RATE),
  };

  const retreatResult: CombatResult = {
    outcome: "retreat",
    phases: [],
    attackerTotalCasualties: casualties,
    defenderTotalCasualties: createEmptyForces(),
    attackerEffectivenessChange: -5, // Retreat penalty
    defenderEffectivenessChange: 0,
    sectorsCaptured: 0,
    summary: `Forces retreat, suffering ${RETREAT_CASUALTY_RATE * 100}% casualties during withdrawal.`,
  };

  return retreatResult;
}

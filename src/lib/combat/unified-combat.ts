/**
 * Unified Combat Resolution (Fix for 1.2% attacker win rate)
 *
 * PROBLEM: Sequential 3-phase combat requires attacker to win ALL phases.
 * - Each phase: ~45% attacker win (with defender bonus)
 * - All 3: 0.45³ = 9.1% (actually worse: ~1.2% observed)
 *
 * SOLUTION: Single unified roll with all forces contributing.
 * - All units contribute to total combat power
 * - Single roll determines winner (D20-style variance preserved)
 * - Phases become narrative only (describe the battle)
 * - Target: 40-50% attacker win rate with equal forces
 *
 * Based on docs/redesign/COMBAT-GEOGRAPHY-TURNS.md Solution B
 */

import type { Forces, PhaseResult, CombatResult } from "./phases";
import { calculateLossRate, calculateVariance, calculateCasualties } from "../formulas/casualties";
import {
  type CombatOutcome as EffectivenessOutcome,
  calculateCombatEffectivenessChange,
} from "../formulas/army-effectiveness";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Base power values per unit type */
export const UNIT_BASE_POWER = {
  soldiers: 1,
  fighters: 3,
  stations: 30,
  lightCruisers: 5,
  heavyCruisers: 8,
  carriers: 2, // Carriers contribute minimally to combat power
};

/** Defender gets a home turf bonus */
export const DEFENDER_BONUS = 1.10; // 10% bonus (reduced from 20%)

/** Underdog bonus when outpowered 2:1 or more */
export const UNDERDOG_BONUS_THRESHOLD = 0.5; // power ratio below this triggers bonus
export const UNDERDOG_BONUS_MAX = 1.25; // max 25% bonus for severe underdogs

/** Planet capture percentages */
export const PLANET_CAPTURE_MIN_PERCENT = 0.05;
export const PLANET_CAPTURE_MAX_PERCENT = 0.15;

/** Soldiers per carrier for transport */
export const SOLDIERS_PER_CARRIER = 100;

// =============================================================================
// UNIFIED POWER CALCULATION
// =============================================================================

/**
 * Calculate total combat power for a force.
 * All units contribute to a single power value.
 */
export function calculateUnifiedPower(
  forces: Forces,
  isDefender: boolean = false
): number {
  let power = 0;

  // Sum all unit contributions
  power += forces.soldiers * UNIT_BASE_POWER.soldiers;
  power += forces.fighters * UNIT_BASE_POWER.fighters;
  power += forces.stations * UNIT_BASE_POWER.stations;
  power += forces.lightCruisers * UNIT_BASE_POWER.lightCruisers;
  power += forces.heavyCruisers * UNIT_BASE_POWER.heavyCruisers;
  power += forces.carriers * UNIT_BASE_POWER.carriers;

  // Apply defender bonus
  if (isDefender) {
    power *= DEFENDER_BONUS;
  }

  return power;
}

/**
 * Apply underdog bonus to combat power.
 * Weaker side gets a bonus that scales with how outmatched they are.
 */
export function applyUnderdogBonus(
  myPower: number,
  opponentPower: number
): number {
  if (opponentPower === 0) return myPower;

  const ratio = myPower / opponentPower;

  // Only apply if significantly outpowered
  if (ratio < UNDERDOG_BONUS_THRESHOLD) {
    // Scale bonus: more outpowered = bigger bonus
    // At 0.5 ratio: 1.0x bonus (no change)
    // At 0.25 ratio: 1.125x bonus
    // At 0.1 ratio: 1.25x bonus (max)
    const underdogMultiplier = 1 + (UNDERDOG_BONUS_MAX - 1) * (1 - ratio / UNDERDOG_BONUS_THRESHOLD);
    return myPower * Math.min(underdogMultiplier, UNDERDOG_BONUS_MAX);
  }

  return myPower;
}

// =============================================================================
// UNIFIED COMBAT RESOLUTION
// =============================================================================

/**
 * Determine combat winner with D20-style variance.
 *
 * @param attackerPower - Attacker's total power
 * @param defenderPower - Defender's total power
 * @param randomValue - Optional fixed random for testing (0-1)
 * @returns Winner and win probability
 */
export function determineUnifiedWinner(
  attackerPower: number,
  defenderPower: number,
  randomValue?: number
): { winner: "attacker" | "defender" | "draw"; attackerWinChance: number } {
  const roll = randomValue ?? Math.random();

  // Handle edge cases
  if (attackerPower === 0 && defenderPower === 0) {
    return { winner: "draw", attackerWinChance: 0.5 };
  }
  if (attackerPower === 0) {
    return { winner: "defender", attackerWinChance: 0 };
  }
  if (defenderPower === 0) {
    return { winner: "attacker", attackerWinChance: 1 };
  }

  // Calculate power ratio and base win chance
  const powerRatio = attackerPower / defenderPower;
  let attackerWinChance = powerRatio / (powerRatio + 1);

  // Apply floors and ceilings (D20 nat 1/nat 20 effect)
  const MIN_CHANCE = 0.05; // 5% minimum (underdog can still win)
  const MAX_CHANCE = 0.95; // 95% maximum (favorite can still lose)
  attackerWinChance = Math.max(MIN_CHANCE, Math.min(MAX_CHANCE, attackerWinChance));

  // Very narrow band for draws (only when nearly exactly equal: 48-52%)
  const DRAW_BAND = 0.02;
  const DRAW_ROLL_WINDOW = 0.05;
  if (attackerWinChance >= 0.5 - DRAW_BAND && attackerWinChance <= 0.5 + DRAW_BAND) {
    // 5% chance of actual draw when evenly matched
    if (roll > 0.5 - DRAW_ROLL_WINDOW && roll < 0.5 + DRAW_ROLL_WINDOW) {
      return { winner: "draw", attackerWinChance };
    }
  }

  // Roll for outcome
  const winner = roll < attackerWinChance ? "attacker" : "defender";
  return { winner, attackerWinChance };
}

/**
 * Calculate casualties for both sides based on combat outcome.
 * Winner takes fewer casualties, loser takes more.
 */
export function calculateUnifiedCasualties(
  attackerForces: Forces,
  defenderForces: Forces,
  attackerPower: number,
  defenderPower: number,
  winner: "attacker" | "defender" | "draw",
  randomValue?: number
): { attackerCasualties: Forces; defenderCasualties: Forces } {
  const variance = calculateVariance(randomValue);

  // Base loss rate depends on power ratio
  const attackerLossRate = calculateLossRate(defenderPower, attackerPower);
  const defenderLossRate = calculateLossRate(attackerPower, defenderPower);

  // Winner takes 50% normal casualties, loser takes 150%
  const winnerMultiplier = 0.5;
  const loserMultiplier = 1.5;
  const drawMultiplier = 1.0;

  const attackerMultiplier =
    winner === "attacker" ? winnerMultiplier :
    winner === "defender" ? loserMultiplier :
    drawMultiplier;

  const defenderMultiplier =
    winner === "defender" ? winnerMultiplier :
    winner === "attacker" ? loserMultiplier :
    drawMultiplier;

  const attackerCasualties: Forces = {
    soldiers: calculateCasualties(attackerForces.soldiers, attackerLossRate * attackerMultiplier, variance),
    fighters: calculateCasualties(attackerForces.fighters, attackerLossRate * attackerMultiplier, variance),
    stations: 0, // Attackers don't have stations
    lightCruisers: calculateCasualties(attackerForces.lightCruisers, attackerLossRate * attackerMultiplier, variance),
    heavyCruisers: calculateCasualties(attackerForces.heavyCruisers, attackerLossRate * attackerMultiplier, variance),
    carriers: calculateCasualties(attackerForces.carriers, attackerLossRate * attackerMultiplier, variance),
  };

  const defenderCasualties: Forces = {
    soldiers: calculateCasualties(defenderForces.soldiers, defenderLossRate * defenderMultiplier, variance),
    fighters: calculateCasualties(defenderForces.fighters, defenderLossRate * defenderMultiplier, variance),
    stations: calculateCasualties(defenderForces.stations, defenderLossRate * defenderMultiplier, variance),
    lightCruisers: calculateCasualties(defenderForces.lightCruisers, defenderLossRate * defenderMultiplier, variance),
    heavyCruisers: calculateCasualties(defenderForces.heavyCruisers, defenderLossRate * defenderMultiplier, variance),
    carriers: calculateCasualties(defenderForces.carriers, defenderLossRate * defenderMultiplier, variance),
  };

  return { attackerCasualties, defenderCasualties };
}

/**
 * Generate narrative phases for the battle report.
 * These are purely cosmetic - the outcome is already determined.
 */
function generateNarrativePhases(
  attackerForces: Forces,
  defenderForces: Forces,
  winner: "attacker" | "defender" | "draw",
  attackerCasualties: Forces,
  defenderCasualties: Forces,
  attackerPower: number,
  defenderPower: number
): PhaseResult[] {
  const phases: PhaseResult[] = [];

  // Distribute casualties across phases for narrative
  const spaceWeight = 0.4;
  const orbitalWeight = 0.35;
  const groundWeight = 0.25;

  // Space Phase (cruisers dominant)
  const spaceAttackerCasualties: Partial<Forces> = {
    lightCruisers: Math.floor((attackerCasualties.lightCruisers ?? 0) * spaceWeight),
    heavyCruisers: Math.floor((attackerCasualties.heavyCruisers ?? 0) * spaceWeight),
    fighters: Math.floor((attackerCasualties.fighters ?? 0) * 0.2),
  };
  const spaceDefenderCasualties: Partial<Forces> = {
    lightCruisers: Math.floor((defenderCasualties.lightCruisers ?? 0) * spaceWeight),
    heavyCruisers: Math.floor((defenderCasualties.heavyCruisers ?? 0) * spaceWeight),
    fighters: Math.floor((defenderCasualties.fighters ?? 0) * 0.2),
  };

  phases.push({
    phase: "space",
    phaseNumber: 1,
    winner, // Same as overall winner
    attackerPower: attackerPower * 0.4,
    defenderPower: defenderPower * 0.4,
    attackerForcesStart: { ...attackerForces },
    defenderForcesStart: { ...defenderForces },
    attackerForcesEnd: subtractForces(attackerForces, spaceAttackerCasualties),
    defenderForcesEnd: subtractForces(defenderForces, spaceDefenderCasualties),
    attackerCasualties: spaceAttackerCasualties,
    defenderCasualties: spaceDefenderCasualties,
    description: `Space Combat: ${winner === "attacker" ? "Attackers seize space superiority!" : winner === "defender" ? "Defenders repel the space assault!" : "Space combat ends in stalemate."}`,
  });

  // Orbital Phase (fighters vs stations)
  const orbitalAttackerCasualties: Partial<Forces> = {
    fighters: Math.floor((attackerCasualties.fighters ?? 0) * orbitalWeight),
    lightCruisers: Math.floor((attackerCasualties.lightCruisers ?? 0) * orbitalWeight),
  };
  const orbitalDefenderCasualties: Partial<Forces> = {
    fighters: Math.floor((defenderCasualties.fighters ?? 0) * orbitalWeight),
    stations: Math.floor((defenderCasualties.stations ?? 0) * 0.7),
  };

  const afterSpace = subtractForces(attackerForces, spaceAttackerCasualties);
  const defAfterSpace = subtractForces(defenderForces, spaceDefenderCasualties);

  phases.push({
    phase: "orbital",
    phaseNumber: 2,
    winner,
    attackerPower: attackerPower * 0.35,
    defenderPower: defenderPower * 0.35,
    attackerForcesStart: afterSpace,
    defenderForcesStart: defAfterSpace,
    attackerForcesEnd: subtractForces(afterSpace, orbitalAttackerCasualties),
    defenderForcesEnd: subtractForces(defAfterSpace, orbitalDefenderCasualties),
    attackerCasualties: orbitalAttackerCasualties,
    defenderCasualties: orbitalDefenderCasualties,
    description: `Orbital Combat: ${winner === "attacker" ? "Orbital defenses neutralized!" : winner === "defender" ? "Orbital stations hold the line!" : "Neither side gains orbital advantage."}`,
  });

  // Ground Phase (soldiers)
  const groundAttackerCasualties: Partial<Forces> = {
    soldiers: attackerCasualties.soldiers,
    carriers: attackerCasualties.carriers,
  };
  const groundDefenderCasualties: Partial<Forces> = {
    soldiers: defenderCasualties.soldiers,
  };

  const afterOrbital = subtractForces(afterSpace, orbitalAttackerCasualties);
  const defAfterOrbital = subtractForces(defAfterSpace, orbitalDefenderCasualties);

  phases.push({
    phase: "ground",
    phaseNumber: 3,
    winner,
    attackerPower: attackerPower * 0.25,
    defenderPower: defenderPower * 0.25,
    attackerForcesStart: afterOrbital,
    defenderForcesStart: defAfterOrbital,
    attackerForcesEnd: subtractForces(afterOrbital, groundAttackerCasualties),
    defenderForcesEnd: subtractForces(defAfterOrbital, groundDefenderCasualties),
    attackerCasualties: groundAttackerCasualties,
    defenderCasualties: groundDefenderCasualties,
    description: `Ground Combat: ${winner === "attacker" ? "Landing forces secure the territory!" : winner === "defender" ? "Ground forces repel the invasion!" : "Ground combat ends in a bloody draw."}`,
  });

  return phases;
}

// =============================================================================
// MAIN COMBAT FUNCTION
// =============================================================================

/**
 * Resolve an invasion using unified combat roll.
 *
 * @param attackerForces - Attacking forces
 * @param defenderForces - Defending forces
 * @param defenderPlanetCount - Number of planets defender owns
 * @param randomValue - Optional random value for deterministic testing
 * @returns Complete combat result
 */
export function resolveUnifiedInvasion(
  attackerForces: Forces,
  defenderForces: Forces,
  defenderPlanetCount: number,
  randomValue?: number
): CombatResult {
  // Apply carrier capacity limit
  const maxSoldiersTransportable = attackerForces.carriers * SOLDIERS_PER_CARRIER;
  const effectiveAttackerForces: Forces = {
    ...attackerForces,
    soldiers: Math.min(attackerForces.soldiers, maxSoldiersTransportable),
  };

  // Calculate unified power
  let attackerPower = calculateUnifiedPower(effectiveAttackerForces, false);
  const defenderPower = calculateUnifiedPower(defenderForces, true);

  // Apply underdog bonus (helps weaker side)
  attackerPower = applyUnderdogBonus(attackerPower, defenderPower);
  // Defender already has home turf bonus, don't double-apply underdog

  // Determine winner
  const { winner, attackerWinChance } = determineUnifiedWinner(
    attackerPower,
    defenderPower,
    randomValue
  );

  // Calculate casualties
  const { attackerCasualties, defenderCasualties } = calculateUnifiedCasualties(
    effectiveAttackerForces,
    defenderForces,
    attackerPower,
    defenderPower,
    winner,
    randomValue
  );

  // Generate narrative phases
  const phases = generateNarrativePhases(
    effectiveAttackerForces,
    defenderForces,
    winner,
    attackerCasualties,
    defenderCasualties,
    attackerPower,
    defenderPower
  );

  // Determine outcome and planets captured
  let outcome: CombatResult["outcome"];
  let planetsCaptured = 0;

  if (winner === "attacker") {
    outcome = "attacker_victory";
    const capturePercent = PLANET_CAPTURE_MIN_PERCENT +
      (randomValue ?? Math.random()) * (PLANET_CAPTURE_MAX_PERCENT - PLANET_CAPTURE_MIN_PERCENT);
    planetsCaptured = Math.max(1, Math.floor(defenderPlanetCount * capturePercent));
  } else if (winner === "defender") {
    outcome = "defender_victory";
  } else {
    outcome = "stalemate";
  }

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
  const summary = generateCombatSummary(outcome, planetsCaptured, attackerWinChance);

  return {
    outcome,
    phases,
    attackerTotalCasualties: attackerCasualties,
    defenderTotalCasualties: defenderCasualties,
    attackerEffectivenessChange,
    defenderEffectivenessChange,
    planetsCaptured,
    summary,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function subtractForces(forces: Forces, casualties: Partial<Forces>): Forces {
  return {
    soldiers: Math.max(0, forces.soldiers - (casualties.soldiers ?? 0)),
    fighters: Math.max(0, forces.fighters - (casualties.fighters ?? 0)),
    stations: Math.max(0, forces.stations - (casualties.stations ?? 0)),
    lightCruisers: Math.max(0, forces.lightCruisers - (casualties.lightCruisers ?? 0)),
    heavyCruisers: Math.max(0, forces.heavyCruisers - (casualties.heavyCruisers ?? 0)),
    carriers: Math.max(0, forces.carriers - (casualties.carriers ?? 0)),
  };
}

function generateCombatSummary(
  outcome: CombatResult["outcome"],
  planetsCaptured: number,
  winChance: number
): string {
  const chanceStr = `(${(winChance * 100).toFixed(1)}% win chance)`;

  switch (outcome) {
    case "attacker_victory":
      return `Invasion successful! ${planetsCaptured} planet${planetsCaptured !== 1 ? "s" : ""} captured. ${chanceStr}`;
    case "defender_victory":
      return `Invasion repelled! Defender holds their territory. ${chanceStr}`;
    case "stalemate":
      return `Combat ended in stalemate. No territory changed hands. ${chanceStr}`;
    default:
      return `Combat concluded. ${chanceStr}`;
  }
}

// =============================================================================
// SIMULATION FOR VALIDATION
// =============================================================================

/**
 * Simulate many battles to validate win rates.
 * Run this to verify the fix works before deploying.
 */
export function simulateBattles(
  attackerForces: Forces,
  defenderForces: Forces,
  numBattles: number = 1000
): {
  attackerWins: number;
  defenderWins: number;
  draws: number;
  attackerWinRate: number;
  averagePlanetsCaptured: number;
} {
  let attackerWins = 0;
  let defenderWins = 0;
  let draws = 0;
  let totalPlanetsCaptured = 0;

  for (let i = 0; i < numBattles; i++) {
    const result = resolveUnifiedInvasion(attackerForces, defenderForces, 10);

    if (result.outcome === "attacker_victory") {
      attackerWins++;
      totalPlanetsCaptured += result.planetsCaptured;
    } else if (result.outcome === "defender_victory") {
      defenderWins++;
    } else {
      draws++;
    }
  }

  return {
    attackerWins,
    defenderWins,
    draws,
    attackerWinRate: attackerWins / numBattles,
    averagePlanetsCaptured: attackerWins > 0 ? totalPlanetsCaptured / attackerWins : 0,
  };
}

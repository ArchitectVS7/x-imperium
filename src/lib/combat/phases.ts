/**
 * Combat Phase Resolution (PRD 6.7)
 *
 * Three-phase combat system:
 * 1. Space Combat: Cruisers vs Cruisers (determines space superiority)
 * 2. Orbital Combat: Fighters vs Stations (determines orbital control)
 * 3. Ground Combat: Soldiers capture planets (requires carriers for transport)
 *
 * Each phase must be won to proceed to the next.
 * Attackers need to win all 3 phases for successful planet capture.
 */

// Note: FleetComposition and calculateFleetPower are available from combat-power
// but we use custom phase-specific power calculations here
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
import {
  type CombatPhase,
  type CombatUnitType,
  getUnitEffectiveness,
  EFFECTIVENESS_LEVELS,
} from "./effectiveness";

// =============================================================================
// TYPES
// =============================================================================

export interface Forces {
  soldiers: number;
  fighters: number;
  stations: number;
  lightCruisers: number;
  heavyCruisers: number;
  carriers: number;
}

export interface PhaseResult {
  phase: CombatPhase;
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

export interface CombatResult {
  outcome: "attacker_victory" | "defender_victory" | "retreat" | "stalemate";
  phases: PhaseResult[];

  // Final casualty totals
  attackerTotalCasualties: Forces;
  defenderTotalCasualties: Forces;

  // Effectiveness changes
  attackerEffectivenessChange: number;
  defenderEffectivenessChange: number;

  // Planet capture
  planetsCaptured: number;

  // Summary
  summary: string;
}

export type AttackType = "invasion" | "guerilla";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Percentage of defender planets captured on successful invasion */
export const PLANET_CAPTURE_MIN_PERCENT = 0.05;
export const PLANET_CAPTURE_MAX_PERCENT = 0.15;

/** Minimum carriers required per soldier for invasions */
export const SOLDIERS_PER_CARRIER = 100;

// =============================================================================
// PHASE POWER CALCULATIONS
// =============================================================================

/**
 * Calculate combat power for space phase.
 * Only cruisers participate effectively.
 */
export function calculateSpacePhasePower(forces: Forces, isDefender: boolean): number {
  const phase: CombatPhase = "space";

  // Light cruisers: High effectiveness in space
  const lightCruiserPower = forces.lightCruisers * 5 * getUnitEffectiveness("lightCruisers", phase, isDefender);

  // Heavy cruisers: High effectiveness in space
  const heavyCruiserPower = forces.heavyCruisers * 8 * getUnitEffectiveness("heavyCruisers", phase, isDefender);

  // Fighters have low effectiveness in space
  const fighterPower = forces.fighters * 3 * getUnitEffectiveness("fighters", phase, isDefender);

  let total = lightCruiserPower + heavyCruiserPower + fighterPower;

  // Defender advantage
  if (isDefender) {
    total *= 1.2;
  }

  return total;
}

/**
 * Calculate combat power for orbital phase.
 * Fighters vs Stations, with cruiser support.
 */
export function calculateOrbitalPhasePower(forces: Forces, isDefender: boolean): number {
  const phase: CombatPhase = "orbital";

  // Fighters: High effectiveness in orbital
  const fighterPower = forces.fighters * 3 * getUnitEffectiveness("fighters", phase, isDefender);

  // Stations: Medium effectiveness, but 2× on defense
  const stationPower = forces.stations * 50 * getUnitEffectiveness("stations", phase, isDefender);

  // Light cruisers provide high support
  const lightCruiserPower = forces.lightCruisers * 5 * getUnitEffectiveness("lightCruisers", phase, isDefender);

  // Heavy cruisers provide medium support
  const heavyCruiserPower = forces.heavyCruisers * 8 * getUnitEffectiveness("heavyCruisers", phase, isDefender);

  let total = fighterPower + stationPower + lightCruiserPower + heavyCruiserPower;

  // Defender advantage
  if (isDefender) {
    total *= 1.2;
  }

  return total;
}

/**
 * Calculate combat power for ground phase.
 * Only soldiers participate.
 */
export function calculateGroundPhasePower(forces: Forces, isDefender: boolean): number {
  const phase: CombatPhase = "ground";

  // Soldiers: High effectiveness in ground combat
  const soldierPower = forces.soldiers * 1 * getUnitEffectiveness("soldiers", phase, isDefender);

  // Fighters provide low support
  const fighterPower = forces.fighters * 3 * getUnitEffectiveness("fighters", phase, isDefender);

  // Stations provide medium defensive support
  const stationPower = forces.stations * 50 * getUnitEffectiveness("stations", phase, isDefender);

  let total = soldierPower + fighterPower + stationPower;

  // Defender advantage (defending own territory)
  if (isDefender) {
    total *= 1.2;
  }

  return total;
}

// =============================================================================
// CASUALTY CALCULATIONS
// =============================================================================

/**
 * Calculate casualties for a specific combat phase.
 * Only units that participate in the phase take casualties.
 */
function calculatePhaseCasualties(
  forces: Forces,
  attackPower: number,
  defensePower: number,
  phase: CombatPhase,
  isDefender: boolean,
  randomValue?: number
): Partial<Forces> {
  const lossRate = calculateLossRate(attackPower, defensePower);
  const variance = calculateVariance(randomValue);

  const casualties: Partial<Forces> = {};

  // Only calculate casualties for units that participate in this phase
  const unitTypes: CombatUnitType[] = ["soldiers", "fighters", "stations", "lightCruisers", "heavyCruisers", "carriers"];

  for (const unitType of unitTypes) {
    const effectiveness = getUnitEffectiveness(unitType, phase, isDefender);
    if (effectiveness > 0 && forces[unitType] > 0) {
      // Units with higher effectiveness take proportionally more casualties
      const adjustedLossRate = lossRate * effectiveness;
      casualties[unitType] = calculateCasualties(forces[unitType], adjustedLossRate, variance);
    }
  }

  return casualties;
}

/**
 * Apply casualties to forces, returning new force totals.
 */
function applyPhraseCasualties(forces: Forces, casualties: Partial<Forces>): Forces {
  return {
    soldiers: Math.max(0, forces.soldiers - (casualties.soldiers ?? 0)),
    fighters: Math.max(0, forces.fighters - (casualties.fighters ?? 0)),
    stations: Math.max(0, forces.stations - (casualties.stations ?? 0)),
    lightCruisers: Math.max(0, forces.lightCruisers - (casualties.lightCruisers ?? 0)),
    heavyCruisers: Math.max(0, forces.heavyCruisers - (casualties.heavyCruisers ?? 0)),
    carriers: Math.max(0, forces.carriers - (casualties.carriers ?? 0)),
  };
}

// =============================================================================
// PHASE RESOLUTION
// =============================================================================

/**
 * Resolve Phase 1: Space Combat
 * Cruisers vs Cruisers - determines space superiority
 */
export function resolveSpaceCombat(
  attackerForces: Forces,
  defenderForces: Forces,
  randomValue?: number
): PhaseResult {
  const attackerPower = calculateSpacePhasePower(attackerForces, false);
  const defenderPower = calculateSpacePhasePower(defenderForces, true);

  // Determine winner
  const powerRatio = defenderPower > 0 ? attackerPower / defenderPower : Infinity;
  let winner: "attacker" | "defender" | "draw";

  if (powerRatio > 1.0) {
    winner = "attacker";
  } else if (powerRatio < 1.0) {
    winner = "defender";
  } else {
    winner = "draw";
  }

  // Calculate casualties (loser takes more)
  const attackerCasualties = calculatePhaseCasualties(
    attackerForces,
    defenderPower, // Attacker's casualties based on defender's attack
    attackerPower,
    "space",
    false,
    randomValue
  );

  const defenderCasualties = calculatePhaseCasualties(
    defenderForces,
    attackerPower, // Defender's casualties based on attacker's attack
    defenderPower,
    "space",
    true,
    randomValue
  );

  const attackerForcesEnd = applyPhraseCasualties(attackerForces, attackerCasualties);
  const defenderForcesEnd = applyPhraseCasualties(defenderForces, defenderCasualties);

  return {
    phase: "space",
    phaseNumber: 1,
    winner,
    attackerPower,
    defenderPower,
    attackerForcesStart: { ...attackerForces },
    defenderForcesStart: { ...defenderForces },
    attackerForcesEnd,
    defenderForcesEnd,
    attackerCasualties,
    defenderCasualties,
    description: generatePhaseDescription("space", winner, attackerPower, defenderPower),
  };
}

/**
 * Resolve Phase 2: Orbital Combat
 * Fighters vs Stations - determines orbital control
 */
export function resolveOrbitalCombat(
  attackerForces: Forces,
  defenderForces: Forces,
  randomValue?: number
): PhaseResult {
  const attackerPower = calculateOrbitalPhasePower(attackerForces, false);
  const defenderPower = calculateOrbitalPhasePower(defenderForces, true);

  const powerRatio = defenderPower > 0 ? attackerPower / defenderPower : Infinity;
  let winner: "attacker" | "defender" | "draw";

  if (powerRatio > 1.0) {
    winner = "attacker";
  } else if (powerRatio < 1.0) {
    winner = "defender";
  } else {
    winner = "draw";
  }

  const attackerCasualties = calculatePhaseCasualties(
    attackerForces,
    defenderPower,
    attackerPower,
    "orbital",
    false,
    randomValue
  );

  const defenderCasualties = calculatePhaseCasualties(
    defenderForces,
    attackerPower,
    defenderPower,
    "orbital",
    true,
    randomValue
  );

  const attackerForcesEnd = applyPhraseCasualties(attackerForces, attackerCasualties);
  const defenderForcesEnd = applyPhraseCasualties(defenderForces, defenderCasualties);

  return {
    phase: "orbital",
    phaseNumber: 2,
    winner,
    attackerPower,
    defenderPower,
    attackerForcesStart: { ...attackerForces },
    defenderForcesStart: { ...defenderForces },
    attackerForcesEnd,
    defenderForcesEnd,
    attackerCasualties,
    defenderCasualties,
    description: generatePhaseDescription("orbital", winner, attackerPower, defenderPower),
  };
}

/**
 * Resolve Phase 3: Ground Combat
 * Soldiers capture planets (requires prior phase victories)
 */
export function resolveGroundCombat(
  attackerForces: Forces,
  defenderForces: Forces,
  randomValue?: number
): PhaseResult {
  const attackerPower = calculateGroundPhasePower(attackerForces, false);
  const defenderPower = calculateGroundPhasePower(defenderForces, true);

  const powerRatio = defenderPower > 0 ? attackerPower / defenderPower : Infinity;
  let winner: "attacker" | "defender" | "draw";

  if (powerRatio > 1.0) {
    winner = "attacker";
  } else if (powerRatio < 1.0) {
    winner = "defender";
  } else {
    winner = "draw";
  }

  const attackerCasualties = calculatePhaseCasualties(
    attackerForces,
    defenderPower,
    attackerPower,
    "ground",
    false,
    randomValue
  );

  const defenderCasualties = calculatePhaseCasualties(
    defenderForces,
    attackerPower,
    defenderPower,
    "ground",
    true,
    randomValue
  );

  const attackerForcesEnd = applyPhraseCasualties(attackerForces, attackerCasualties);
  const defenderForcesEnd = applyPhraseCasualties(defenderForces, defenderCasualties);

  return {
    phase: "ground",
    phaseNumber: 3,
    winner,
    attackerPower,
    defenderPower,
    attackerForcesStart: { ...attackerForces },
    defenderForcesStart: { ...defenderForces },
    attackerForcesEnd,
    defenderForcesEnd,
    attackerCasualties,
    defenderCasualties,
    description: generatePhaseDescription("ground", winner, attackerPower, defenderPower),
  };
}

// =============================================================================
// FULL COMBAT RESOLUTION
// =============================================================================

/**
 * Resolve a full invasion attack through all 3 phases.
 *
 * @param attackerForces - Attacking forces
 * @param defenderForces - Defending forces
 * @param defenderPlanetCount - Number of planets defender owns
 * @param randomValue - Optional random value for deterministic testing
 * @returns Complete combat result
 */
export function resolveInvasion(
  attackerForces: Forces,
  defenderForces: Forces,
  defenderPlanetCount: number,
  randomValue?: number
): CombatResult {
  const phases: PhaseResult[] = [];
  let currentAttackerForces = { ...attackerForces };
  let currentDefenderForces = { ...defenderForces };

  // Check carrier requirement
  const maxSoldiersTransportable = attackerForces.carriers * SOLDIERS_PER_CARRIER;
  if (attackerForces.soldiers > maxSoldiersTransportable) {
    // Can only send as many soldiers as carriers can transport
    currentAttackerForces.soldiers = maxSoldiersTransportable;
  }

  // Phase 1: Space Combat
  const spaceResult = resolveSpaceCombat(currentAttackerForces, currentDefenderForces, randomValue);
  phases.push(spaceResult);
  currentAttackerForces = spaceResult.attackerForcesEnd;
  currentDefenderForces = spaceResult.defenderForcesEnd;

  // If attacker lost space phase, defender wins
  if (spaceResult.winner === "defender") {
    return createCombatResult(phases, "defender_victory", defenderPlanetCount, 0);
  }

  // Phase 2: Orbital Combat (only if space won or draw)
  const orbitalResult = resolveOrbitalCombat(currentAttackerForces, currentDefenderForces, randomValue);
  phases.push(orbitalResult);
  currentAttackerForces = orbitalResult.attackerForcesEnd;
  currentDefenderForces = orbitalResult.defenderForcesEnd;

  // If attacker lost orbital phase, defender wins
  if (orbitalResult.winner === "defender") {
    return createCombatResult(phases, "defender_victory", defenderPlanetCount, 0);
  }

  // Phase 3: Ground Combat (only if orbital won or draw)
  const groundResult = resolveGroundCombat(currentAttackerForces, currentDefenderForces, randomValue);
  phases.push(groundResult);

  // Determine final outcome
  let outcome: CombatResult["outcome"];
  let planetsCaptured = 0;

  if (groundResult.winner === "attacker") {
    outcome = "attacker_victory";
    // Calculate planets captured (5-15% of defender's planets)
    const capturePercent = PLANET_CAPTURE_MIN_PERCENT +
      (randomValue ?? Math.random()) * (PLANET_CAPTURE_MAX_PERCENT - PLANET_CAPTURE_MIN_PERCENT);
    planetsCaptured = Math.max(1, Math.floor(defenderPlanetCount * capturePercent));
  } else if (groundResult.winner === "defender") {
    outcome = "defender_victory";
  } else {
    outcome = "stalemate";
  }

  return createCombatResult(phases, outcome, defenderPlanetCount, planetsCaptured);
}

/**
 * Resolve a guerilla attack (soldiers only, no phases).
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

  return createCombatResult([phaseResult], outcome, 0, 0);
}

/**
 * Calculate retreat casualties and return result.
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
    planetsCaptured: 0,
    summary: `Forces retreat, suffering ${RETREAT_CASUALTY_RATE * 100}% casualties during withdrawal.`,
  };

  return retreatResult;
}

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
  _defenderPlanetCount: number,
  planetsCaptured: number
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
  const summary = generateCombatSummary(outcome, phases, planetsCaptured);

  return {
    outcome,
    phases,
    attackerTotalCasualties,
    defenderTotalCasualties,
    attackerEffectivenessChange,
    defenderEffectivenessChange,
    planetsCaptured,
    summary,
  };
}

function generatePhaseDescription(
  phase: CombatPhase,
  winner: "attacker" | "defender" | "draw",
  attackerPower: number,
  defenderPower: number
): string {
  const phaseNames: Record<CombatPhase, string> = {
    space: "Space Combat",
    orbital: "Orbital Combat",
    ground: "Ground Combat",
    guerilla: "Guerilla Raid",
    pirate_defense: "Pirate Defense",
  };

  const ratio = defenderPower > 0 ? (attackerPower / defenderPower).toFixed(2) : "∞";

  if (winner === "attacker") {
    return `${phaseNames[phase]}: Attacker victorious (power ratio: ${ratio}:1)`;
  } else if (winner === "defender") {
    return `${phaseNames[phase]}: Defender holds (power ratio: ${ratio}:1)`;
  } else {
    return `${phaseNames[phase]}: Stalemate (power ratio: ${ratio}:1)`;
  }
}

function generateCombatSummary(
  outcome: CombatResult["outcome"],
  phases: PhaseResult[],
  planetsCaptured: number
): string {
  switch (outcome) {
    case "attacker_victory":
      return `Invasion successful! ${planetsCaptured} planet${planetsCaptured !== 1 ? "s" : ""} captured after ${phases.length} combat phases.`;
    case "defender_victory":
      const failedPhase = phases.find(p => p.winner === "defender");
      return `Invasion repelled during ${failedPhase?.phase ?? "combat"}. Defender holds their territory.`;
    case "retreat":
      return "Forces withdrew from combat, suffering retreat casualties.";
    case "stalemate":
      return "Combat ended in stalemate. No territory changed hands.";
    default:
      return "Combat concluded.";
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  type CombatPhase,
  type CombatUnitType,
  getUnitEffectiveness,
} from "./effectiveness";

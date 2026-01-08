/**
 * Theater Control System
 *
 * Theater bonuses reward army diversity and tactical positioning.
 * Each theater (Space, Orbital, Ground) provides bonuses when dominated.
 *
 * Theaters:
 * - Space Dominance: 2x space units vs enemy → +2 attack for all volleys
 * - Orbital Shield: Defender has stations → +2 DEF for defender
 * - Ground Superiority: 3x marines vs enemy → Capture even if lose 2 volleys
 */

import type { Forces } from "./types";

// =============================================================================
// TYPES
// =============================================================================

export type Theater = "space" | "orbital" | "ground";

export interface TheaterBonus {
  /** Name of the theater bonus */
  name: string;
  /** Requirement description */
  requirement: string;
  /** Attack modifier (added to all attack rolls) */
  attackMod: number;
  /** Defense modifier (added to defender DEF) */
  defenseMod: number;
  /** Special effect description */
  specialEffect: string | null;
}

export interface TheaterAnalysis {
  /** Theater bonuses the attacker has earned */
  attackerBonuses: TheaterBonus[];
  /** Theater bonuses the defender has earned */
  defenderBonuses: TheaterBonus[];
  /** Total attack modifier for attacker */
  attackerAttackMod: number;
  /** Total defense modifier for defender */
  defenderDefenseMod: number;
  /** Does attacker have ground superiority (special capture rule)? */
  attackerHasGroundSuperiority: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Ratio required for space dominance (attacker space units / defender space units) */
const SPACE_DOMINANCE_RATIO = 2.0;

/** Ratio required for ground superiority (attacker marines / defender marines) */
const GROUND_SUPERIORITY_RATIO = 3.0;

/** Attack bonus for space dominance */
const SPACE_DOMINANCE_ATTACK_BONUS = 2;

/** Defense bonus for orbital shield (stations present) */
const ORBITAL_SHIELD_DEFENSE_BONUS = 2;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Count space units in a force.
 * Space units: lightCruisers, heavyCruisers, carriers
 */
function countSpaceUnits(forces: Forces): number {
  return (
    (forces.lightCruisers ?? 0) +
    (forces.heavyCruisers ?? 0) +
    (forces.carriers ?? 0)
  );
}

/**
 * Count orbital units in a force.
 * Orbital units: fighters, stations
 */
function countOrbitalUnits(forces: Forces): number {
  return (forces.fighters ?? 0) + (forces.stations ?? 0);
}

/**
 * Count ground units in a force.
 * Ground units: soldiers (marines)
 */
function countGroundUnits(forces: Forces): number {
  return forces.soldiers ?? 0;
}

/**
 * Check if attacker has space dominance (2x space units).
 */
function hasSpaceDominance(
  attackerForces: Forces,
  defenderForces: Forces
): boolean {
  const attackerSpace = countSpaceUnits(attackerForces);
  const defenderSpace = countSpaceUnits(defenderForces);

  // Avoid division by zero - if defender has 0, attacker dominates
  if (defenderSpace === 0) return attackerSpace > 0;

  return attackerSpace / defenderSpace >= SPACE_DOMINANCE_RATIO;
}

/**
 * Check if defender has orbital shield (has stations).
 */
function hasOrbitalShield(defenderForces: Forces): boolean {
  return (defenderForces.stations ?? 0) > 0;
}

/**
 * Check if attacker has ground superiority (3x marines).
 */
function hasGroundSuperiority(
  attackerForces: Forces,
  defenderForces: Forces
): boolean {
  const attackerGround = countGroundUnits(attackerForces);
  const defenderGround = countGroundUnits(defenderForces);

  // Avoid division by zero - if defender has 0, attacker has superiority
  if (defenderGround === 0) return attackerGround > 0;

  return attackerGround / defenderGround >= GROUND_SUPERIORITY_RATIO;
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Analyze theater control for a battle.
 *
 * @param attackerForces - Attacker's forces
 * @param defenderForces - Defender's forces
 * @returns Theater analysis with bonuses
 *
 * @example
 * const analysis = analyzeTheaterControl(
 *   { lightCruisers: 20, soldiers: 300 },
 *   { lightCruisers: 5, stations: 2 }
 * );
 * console.log(analysis.attackerAttackMod); // 2 (space dominance)
 * console.log(analysis.defenderDefenseMod); // 2 (orbital shield)
 */
export function analyzeTheaterControl(
  attackerForces: Forces,
  defenderForces: Forces
): TheaterAnalysis {
  const attackerBonuses: TheaterBonus[] = [];
  const defenderBonuses: TheaterBonus[] = [];
  let attackerAttackMod = 0;
  let defenderDefenseMod = 0;
  let attackerHasGroundSuperiority = false;

  // Check Space Dominance (attacker bonus)
  if (hasSpaceDominance(attackerForces, defenderForces)) {
    attackerBonuses.push({
      name: "Space Dominance",
      requirement: "2x space units vs enemy",
      attackMod: SPACE_DOMINANCE_ATTACK_BONUS,
      defenseMod: 0,
      specialEffect: null,
    });
    attackerAttackMod += SPACE_DOMINANCE_ATTACK_BONUS;
  }

  // Check Orbital Shield (defender bonus)
  if (hasOrbitalShield(defenderForces)) {
    defenderBonuses.push({
      name: "Orbital Shield",
      requirement: "Defender has stations",
      attackMod: 0,
      defenseMod: ORBITAL_SHIELD_DEFENSE_BONUS,
      specialEffect: null,
    });
    defenderDefenseMod += ORBITAL_SHIELD_DEFENSE_BONUS;
  }

  // Check Ground Superiority (attacker special ability)
  if (hasGroundSuperiority(attackerForces, defenderForces)) {
    attackerBonuses.push({
      name: "Ground Superiority",
      requirement: "3x marines vs enemy",
      attackMod: 0,
      defenseMod: 0,
      specialEffect: "Can capture sector even if lose 2 volleys",
    });
    attackerHasGroundSuperiority = true;
  }

  return {
    attackerBonuses,
    defenderBonuses,
    attackerAttackMod,
    defenderDefenseMod,
    attackerHasGroundSuperiority,
  };
}

/**
 * Get the theater for a unit type.
 *
 * @param unitType - The unit type key
 * @returns The theater the unit belongs to
 */
export function getUnitTheater(
  unitType: keyof Forces
): Theater | "none" {
  switch (unitType) {
    case "soldiers":
      return "ground";
    case "fighters":
    case "stations":
      return "orbital";
    case "lightCruisers":
    case "heavyCruisers":
    case "carriers":
      return "space";
    default:
      return "none";
  }
}

/**
 * Get all units that belong to a theater.
 *
 * @param theater - The theater to get units for
 * @returns Array of unit type keys
 */
export function getUnitsInTheater(theater: Theater): (keyof Forces)[] {
  switch (theater) {
    case "ground":
      return ["soldiers"];
    case "orbital":
      return ["fighters", "stations"];
    case "space":
      return ["lightCruisers", "heavyCruisers", "carriers"];
    default:
      return [];
  }
}

/**
 * Count total units in a specific theater.
 *
 * @param forces - The forces to count
 * @param theater - The theater to count
 * @returns Total unit count in that theater
 */
export function countUnitsInTheater(forces: Forces, theater: Theater): number {
  switch (theater) {
    case "ground":
      return countGroundUnits(forces);
    case "orbital":
      return countOrbitalUnits(forces);
    case "space":
      return countSpaceUnits(forces);
    default:
      return 0;
  }
}

/**
 * Get display string for theater bonuses.
 *
 * @param analysis - Theater analysis result
 * @param side - Which side to get bonuses for
 * @returns Human-readable bonus string
 */
export function getTheaterBonusDisplay(
  analysis: TheaterAnalysis,
  side: "attacker" | "defender"
): string {
  const bonuses =
    side === "attacker"
      ? analysis.attackerBonuses
      : analysis.defenderBonuses;

  if (bonuses.length === 0) return "No theater bonuses";

  return bonuses.map((b) => b.name).join(", ");
}

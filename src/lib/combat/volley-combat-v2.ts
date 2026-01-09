/**
 * Volley Combat System v2 - D20 Based
 *
 * 3-Volley combat using true D20 mechanics (d20 + TAR >= DEF).
 * Empire vs Empire combat - winner captures percentage of defender's sectors.
 *
 * Combat Flow:
 * 1. Pre-combat: Calculate theater bonuses, set stances
 * 2. Volley 1: D20 rolls, damage, volley winner determined
 * 3. (Optional) Retreat after Volley 1 with 15% AoO penalty
 * 4. Volley 2: Same resolution
 * 5. (Optional) Retreat after Volley 2 if not decided
 * 6. Volley 3: Final resolution if needed (2-2 or 1-1)
 * 7. Post-combat: Capture sectors based on victory margin
 */

import type { Forces, CombatResult, PhaseResult, CombatPhase } from "./types";
import {
  type CombatStance,
  getStanceModifiers,
  applyCasualtyModifier,
  getDefaultStance,
} from "./stances";
import { analyzeTheaterControl, type TheaterAnalysis } from "./theater-control";
import { rollD20 as rollD20Seeded } from "@/lib/utils/seeded-rng";
import unitStatsData from "@/../data/unit-stats.json";

// =============================================================================
// TYPES
// =============================================================================

/** D20 stats from unit-stats.json */
export interface D20Stats {
  TAR: number; // Targeting (attack roll modifier)
  DEF: number; // Defense threshold
  HUL: number; // Hull integrity (damage capacity)
  REA: number; // Reactor output (initiative, retreat)
  CMD: number; // Command control (morale)
  DOC: number; // Doctrine protocols (psychological)
  hullPer: number; // Units per hull point (e.g., 50 soldiers = 1 hull)
}

/** Unit type key */
export type CombatUnitType = keyof Omit<Forces, "covertAgents">;

/** Roll result for a single attack */
export interface AttackRoll {
  unitType: CombatUnitType;
  roll: number; // The d20 roll (1-20)
  modifier: number; // TAR + stance + theater
  total: number; // roll + modifier
  targetDEF: number; // Target's effective DEF
  hit: boolean; // total >= targetDEF
  critical: boolean; // Natural 20
  fumble: boolean; // Natural 1
  damage: number; // Damage dealt (0 if miss)
}

/** Result of a single volley */
export interface VolleyResult {
  volleyNumber: 1 | 2 | 3;
  attackerRolls: AttackRoll[];
  defenderRolls: AttackRoll[];
  attackerHits: number;
  defenderHits: number;
  attackerDamage: number;
  defenderDamage: number;
  volleyWinner: "attacker" | "defender" | "tie";
  attackerCasualties: Partial<Forces>;
  defenderCasualties: Partial<Forces>;
  canRetreat: boolean; // false for volley 3
}

/** Battle outcome */
export type BattleOutcome =
  | "attacker_decisive" // 3-0 attacker
  | "attacker_victory" // 2-1 attacker
  | "defender_victory" // 1-2 defender
  | "defender_decisive" // 0-3 defender
  | "attacker_retreat" // Attacker retreated mid-battle
  | "defender_retreat"; // Defender retreated mid-battle

/** Final battle result */
export interface BattleResult {
  volleys: VolleyResult[];
  volleyScore: { attacker: number; defender: number };
  outcome: BattleOutcome;
  sectorsCaptured: number;
  attackerFinalCasualties: Partial<Forces>;
  defenderFinalCasualties: Partial<Forces>;
  theaterAnalysis: TheaterAnalysis;
  retreated: boolean;
  retreatPenaltyCasualties: Partial<Forces>;
}

/** Options for battle resolution */
export interface BattleOptions {
  attackerStance?: CombatStance;
  defenderStance?: CombatStance;
  defenderSectorCount: number;
  /** For testing: provide deterministic rolls */
  rollOverrides?: number[];
  /** For testing: provide deterministic random values */
  randomOverride?: number;
}

/** Summary of a volley's rolls for UI display */
export interface VolleySummary {
  totalRolls: number;
  hits: number;
  criticals: number;
  fumbles: number;
  totalDamage: number;
}

/**
 * Summarize a volley's rolls for UI display.
 * Extracts hit/critical/fumble counts from the detailed roll data.
 *
 * @param volley - The volley result to summarize
 * @param side - Which side to summarize ('attacker' or 'defender')
 * @returns Summary statistics for the specified side
 */
export function summarizeVolley(
  volley: VolleyResult,
  side: "attacker" | "defender"
): VolleySummary {
  const rolls = side === "attacker" ? volley.attackerRolls : volley.defenderRolls;

  return {
    totalRolls: rolls.length,
    hits: rolls.filter((r) => r.hit).length,
    criticals: rolls.filter((r) => r.critical).length,
    fumbles: rolls.filter((r) => r.fumble).length,
    totalDamage: rolls.reduce((sum, r) => sum + r.damage, 0),
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Minimum sectors captured on victory */
const MIN_SECTORS_CAPTURED = 1;

/** Capture percentage for 2-1 victory */
const STANDARD_CAPTURE_PERCENT = 0.1;

/** Capture percentage for 3-0 decisive victory */
const DECISIVE_CAPTURE_PERCENT = 0.15;

/** Bonus sectors for decisive victory */
const DECISIVE_BONUS_SECTORS = 1;

/** Attack of Opportunity penalty for retreat (% of remaining forces) */
const RETREAT_CASUALTY_PERCENT = 0.15;

/** Extra casualty multiplier for 0-3 crushing defeat */
const CRUSHING_DEFEAT_MULTIPLIER = 1.25;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get D20 stats for a unit type.
 */
function getD20Stats(unitType: CombatUnitType): D20Stats {
  const stats = unitStatsData[unitType as keyof typeof unitStatsData];
  if (!stats || !("d20Stats" in stats)) {
    throw new Error(`No D20 stats found for unit type: ${unitType}`);
  }
  return stats.d20Stats as D20Stats;
}

/**
 * Roll a d20 (1-20).
 * Uses provided roll override if available (for testing), otherwise uses
 * the centralized rollD20 from seeded-rng utility with optional RNG function.
 *
 * @param rollOverrides - Optional array of predetermined roll values for testing
 * @param rollIndex - Index into rollOverrides array
 * @param rng - Optional RNG function for seeded randomness
 * @returns Integer from 1 to 20
 */
function rollD20(
  rollOverrides?: number[],
  rollIndex?: number,
  rng?: () => number
): number {
  if (rollOverrides && rollIndex !== undefined && rollOverrides[rollIndex] !== undefined) {
    return rollOverrides[rollIndex];
  }
  return rollD20Seeded(rng);
}

/**
 * Calculate total hull points for a force.
 */
function calculateTotalHull(forces: Forces): number {
  let total = 0;
  const combatUnits: CombatUnitType[] = [
    "soldiers",
    "fighters",
    "stations",
    "lightCruisers",
    "heavyCruisers",
    "carriers",
  ];

  for (const unitType of combatUnits) {
    const count = forces[unitType] ?? 0;
    if (count > 0) {
      const stats = getD20Stats(unitType);
      const hullPer = stats.hullPer || 1;
      total += Math.ceil(count / hullPer) * stats.HUL;
    }
  }

  return total;
}

/**
 * Convert damage to unit casualties.
 * Distributes damage across unit types based on hull values.
 */
function damageToUnitCasualties(
  forces: Forces,
  damage: number,
  stance: CombatStance
): Partial<Forces> {
  const casualties: Partial<Forces> = {};

  // Apply stance casualty modifier
  const adjustedDamage = applyCasualtyModifier(damage, stance);

  // Simple distribution: divide damage proportionally by hull
  const totalHull = calculateTotalHull(forces);
  if (totalHull === 0) return casualties;

  const combatUnits: CombatUnitType[] = [
    "soldiers",
    "fighters",
    "stations",
    "lightCruisers",
    "heavyCruisers",
    "carriers",
  ];

  for (const unitType of combatUnits) {
    const count = forces[unitType] ?? 0;
    if (count > 0) {
      const stats = getD20Stats(unitType);
      const hullPer = stats.hullPer || 1;
      const unitHull = Math.ceil(count / hullPer) * stats.HUL;
      const proportion = unitHull / totalHull;
      const unitDamage = Math.floor(adjustedDamage * proportion);

      // Convert damage back to unit count
      const unitsLost = Math.floor((unitDamage / stats.HUL) * hullPer);
      if (unitsLost > 0) {
        casualties[unitType] = Math.min(unitsLost, count);
      }
    }
  }

  return casualties;
}

/**
 * Apply casualties to forces (mutates the forces object).
 */
function applyCasualties(forces: Forces, casualties: Partial<Forces>): void {
  const combatKeys: (keyof Forces)[] = [
    "soldiers", "fighters", "stations", "lightCruisers", "heavyCruisers", "carriers"
  ];
  for (const key of combatKeys) {
    const lost = casualties[key];
    if (forces[key] !== undefined && lost !== undefined && lost > 0) {
      const current = forces[key] ?? 0;
      forces[key] = Math.max(0, current - lost);
    }
  }
}

/**
 * Merge casualty objects.
 */
function mergeCasualties(
  a: Partial<Forces>,
  b: Partial<Forces>
): Partial<Forces> {
  const result: Partial<Forces> = { ...a };
  for (const [key, value] of Object.entries(b)) {
    const k = key as keyof Forces;
    result[k] = ((result[k] as number) || 0) + (value as number);
  }
  return result;
}

// =============================================================================
// VOLLEY RESOLUTION
// =============================================================================

/**
 * Resolve a single volley of combat.
 *
 * Each unit type makes one attack roll: d20 + TAR + mods >= target DEF
 * Damage dealt based on HUL stat.
 */
function resolveVolley(
  attackerForces: Forces,
  defenderForces: Forces,
  attackerStance: CombatStance,
  defenderStance: CombatStance,
  theaterAnalysis: TheaterAnalysis,
  volleyNumber: 1 | 2 | 3,
  rollOverrides?: number[]
): VolleyResult {
  const attackerRolls: AttackRoll[] = [];
  const defenderRolls: AttackRoll[] = [];
  let rollIndex = 0;

  const combatUnits: CombatUnitType[] = [
    "soldiers",
    "fighters",
    "lightCruisers",
    "heavyCruisers",
    "carriers",
  ];
  // Stations are defense only
  const defenderUnits: CombatUnitType[] = [...combatUnits, "stations"];

  const attackerStanceMods = getStanceModifiers(attackerStance);
  const defenderStanceMods = getStanceModifiers(defenderStance);

  // Attacker attacks
  for (const unitType of combatUnits) {
    const count = attackerForces[unitType] ?? 0;
    if (count > 0) {
      const stats = getD20Stats(unitType);
      const roll = rollD20(rollOverrides, rollIndex++);

      // Calculate modifier: TAR + stance + theater
      const modifier =
        stats.TAR +
        attackerStanceMods.attackMod +
        theaterAnalysis.attackerAttackMod;

      // Calculate target DEF: base + stance
      const targetDEF =
        stats.DEF + defenderStanceMods.defenseMod + theaterAnalysis.defenderDefenseMod;

      const total = roll + modifier;
      const critical = roll === 20;
      const fumble = roll === 1;
      const hit = !fumble && (critical || total >= targetDEF);

      // Damage based on HUL and unit count
      const hullPer = stats.hullPer || 1;
      const hullPoints = Math.ceil(count / hullPer) * stats.HUL;
      const baseDamage = hit ? Math.ceil(hullPoints / 2) : 0;
      const damage = critical ? baseDamage * 2 : baseDamage;

      attackerRolls.push({
        unitType,
        roll,
        modifier,
        total,
        targetDEF,
        hit,
        critical,
        fumble,
        damage,
      });
    }
  }

  // Defender attacks (including stations)
  for (const unitType of defenderUnits) {
    const count = defenderForces[unitType] ?? 0;
    // Stations cannot attack, only defend
    if (count > 0 && unitType !== "stations") {
      const stats = getD20Stats(unitType);
      const roll = rollD20(rollOverrides, rollIndex++);

      // Calculate modifier: TAR + stance (defender doesn't get theater attack bonus)
      const modifier = stats.TAR + defenderStanceMods.attackMod;

      // Calculate target DEF: base + attacker stance
      const targetDEF = stats.DEF + attackerStanceMods.defenseMod;

      const total = roll + modifier;
      const critical = roll === 20;
      const fumble = roll === 1;
      const hit = !fumble && (critical || total >= targetDEF);

      const hullPer = stats.hullPer || 1;
      const hullPoints = Math.ceil(count / hullPer) * stats.HUL;
      const baseDamage = hit ? Math.ceil(hullPoints / 2) : 0;
      const damage = critical ? baseDamage * 2 : baseDamage;

      defenderRolls.push({
        unitType,
        roll,
        modifier,
        total,
        targetDEF,
        hit,
        critical,
        fumble,
        damage,
      });
    }
  }

  // Calculate totals
  const attackerHits = attackerRolls.filter((r) => r.hit).length;
  const defenderHits = defenderRolls.filter((r) => r.hit).length;
  const attackerDamage = attackerRolls.reduce((sum, r) => sum + r.damage, 0);
  const defenderDamage = defenderRolls.reduce((sum, r) => sum + r.damage, 0);

  // Determine volley winner (who dealt more hits)
  let volleyWinner: "attacker" | "defender" | "tie";
  if (attackerHits > defenderHits) {
    volleyWinner = "attacker";
  } else if (defenderHits > attackerHits) {
    volleyWinner = "defender";
  } else {
    // Tie-breaker: more damage dealt
    if (attackerDamage > defenderDamage) {
      volleyWinner = "attacker";
    } else if (defenderDamage > attackerDamage) {
      volleyWinner = "defender";
    } else {
      volleyWinner = "tie"; // True tie, defender advantage
    }
  }

  // Calculate casualties
  const attackerCasualties = damageToUnitCasualties(
    attackerForces,
    defenderDamage,
    attackerStance
  );
  const defenderCasualties = damageToUnitCasualties(
    defenderForces,
    attackerDamage,
    defenderStance
  );

  return {
    volleyNumber,
    attackerRolls,
    defenderRolls,
    attackerHits,
    defenderHits,
    attackerDamage,
    defenderDamage,
    volleyWinner,
    attackerCasualties,
    defenderCasualties,
    canRetreat: volleyNumber < 3,
  };
}

// =============================================================================
// MAIN BATTLE FUNCTION
// =============================================================================

/**
 * Resolve a complete 3-volley battle.
 *
 * @param attackerForces - Attacker's forces (will be mutated with casualties)
 * @param defenderForces - Defender's forces (will be mutated with casualties)
 * @param options - Battle options including stances and sector count
 * @returns Complete battle result
 *
 * @example
 * const result = resolveBattle(
 *   { soldiers: 500, lightCruisers: 10 },
 *   { soldiers: 300, stations: 2 },
 *   { defenderSectorCount: 20, attackerStance: "aggressive" }
 * );
 * console.log(result.outcome); // "attacker_victory"
 * console.log(result.sectorsCaptured); // 2
 */
export function resolveBattle(
  attackerForces: Forces,
  defenderForces: Forces,
  options: BattleOptions
): BattleResult {
  const attackerStance = options.attackerStance ?? getDefaultStance();
  const defenderStance = options.defenderStance ?? getDefaultStance();

  // Deep copy forces to track casualties
  const attackerRemaining = { ...attackerForces };
  const defenderRemaining = { ...defenderForces };

  // Analyze theater control
  const theaterAnalysis = analyzeTheaterControl(
    attackerForces,
    defenderForces
  );

  const volleys: VolleyResult[] = [];
  let attackerVolleyWins = 0;
  let defenderVolleyWins = 0;
  let totalAttackerCasualties: Partial<Forces> = {};
  let totalDefenderCasualties: Partial<Forces> = {};
  let battleDecided = false;
  let rollIndex = 0; // BUGFIX: Changed from const to let to track roll consumption

  // Resolve up to 3 volleys
  for (let v = 1; v <= 3 && !battleDecided; v++) {
    const volleyNumber = v as 1 | 2 | 3;

    // Get roll overrides for this volley if provided
    const volleyRolls = options.rollOverrides?.slice(rollIndex);

    const volley = resolveVolley(
      attackerRemaining,
      defenderRemaining,
      attackerStance,
      defenderStance,
      theaterAnalysis,
      volleyNumber,
      volleyRolls
    );

    volleys.push(volley);

    // BUGFIX: Advance rollIndex by number of rolls consumed in this volley
    // Count active attacker units (5 unit types max)
    const attackerRollCount = [
      attackerRemaining.soldiers,
      attackerRemaining.fighters,
      attackerRemaining.lightCruisers,
      attackerRemaining.heavyCruisers,
      attackerRemaining.carriers,
    ].filter((count) => (count ?? 0) > 0).length;

    // Count active defender units (5 unit types max, stations don't attack)
    const defenderRollCount = [
      defenderRemaining.soldiers,
      defenderRemaining.fighters,
      defenderRemaining.lightCruisers,
      defenderRemaining.heavyCruisers,
      defenderRemaining.carriers,
    ].filter((count) => (count ?? 0) > 0).length;

    rollIndex += attackerRollCount + defenderRollCount;

    // Apply casualties
    applyCasualties(attackerRemaining, volley.attackerCasualties);
    applyCasualties(defenderRemaining, volley.defenderCasualties);
    totalAttackerCasualties = mergeCasualties(
      totalAttackerCasualties,
      volley.attackerCasualties
    );
    totalDefenderCasualties = mergeCasualties(
      totalDefenderCasualties,
      volley.defenderCasualties
    );

    // Update volley scores
    if (volley.volleyWinner === "attacker") {
      attackerVolleyWins++;
    } else if (volley.volleyWinner === "defender") {
      defenderVolleyWins++;
    } else {
      // Tie goes to defender
      defenderVolleyWins++;
    }

    // Check if battle is decided (2 wins)
    if (attackerVolleyWins >= 2 || defenderVolleyWins >= 2) {
      battleDecided = true;
    }
  }

  // Determine outcome
  let outcome: BattleOutcome;
  let sectorsCaptured = 0;

  if (attackerVolleyWins === 3) {
    outcome = "attacker_decisive";
    sectorsCaptured = Math.max(
      MIN_SECTORS_CAPTURED,
      Math.floor(options.defenderSectorCount * DECISIVE_CAPTURE_PERCENT) +
        DECISIVE_BONUS_SECTORS
    );
  } else if (attackerVolleyWins === 2) {
    outcome = "attacker_victory";
    sectorsCaptured = Math.max(
      MIN_SECTORS_CAPTURED,
      Math.floor(options.defenderSectorCount * STANDARD_CAPTURE_PERCENT)
    );

    // Ground superiority override
    if (theaterAnalysis.attackerHasGroundSuperiority && defenderVolleyWins === 2) {
      outcome = "attacker_victory";
      sectorsCaptured = MIN_SECTORS_CAPTURED;
    }
  } else if (defenderVolleyWins === 3) {
    outcome = "defender_decisive";
    // Apply crushing defeat extra casualties
    const extraCasualties: Partial<Forces> = {};
    const casualtyKeys: (keyof Forces)[] = [
      "soldiers", "fighters", "stations", "lightCruisers", "heavyCruisers", "carriers"
    ];
    for (const key of casualtyKeys) {
      const value = totalAttackerCasualties[key];
      if (value !== undefined && value > 0) {
        extraCasualties[key] = Math.floor(value * (CRUSHING_DEFEAT_MULTIPLIER - 1));
      }
    }
    totalAttackerCasualties = mergeCasualties(
      totalAttackerCasualties,
      extraCasualties
    );
  } else {
    outcome = "defender_victory";
  }

  // Ensure at least 1 sector remains with defender
  if (sectorsCaptured >= options.defenderSectorCount) {
    sectorsCaptured = options.defenderSectorCount - 1;
  }

  return {
    volleys,
    volleyScore: { attacker: attackerVolleyWins, defender: defenderVolleyWins },
    outcome,
    sectorsCaptured,
    attackerFinalCasualties: totalAttackerCasualties,
    defenderFinalCasualties: totalDefenderCasualties,
    theaterAnalysis,
    retreated: false,
    retreatPenaltyCasualties: {},
  };
}

/**
 * Process a retreat during battle.
 *
 * @param forces - The retreating side's remaining forces
 * @param casualties - Casualties already taken
 * @returns Updated casualties including AoO penalty
 */
export function processRetreat(
  forces: Forces,
  casualties: Partial<Forces>
): Partial<Forces> {
  const aooCasualties: Partial<Forces> = {};

  const combatUnits: CombatUnitType[] = [
    "soldiers",
    "fighters",
    "stations",
    "lightCruisers",
    "heavyCruisers",
    "carriers",
  ];

  for (const unitType of combatUnits) {
    const remaining = (forces[unitType] ?? 0) - ((casualties[unitType] as number) ?? 0);
    if (remaining > 0) {
      aooCasualties[unitType] = Math.floor(remaining * RETREAT_CASUALTY_PERCENT);
    }
  }

  return mergeCasualties(casualties, aooCasualties);
}

/**
 * Get battle outcome display string.
 */
export function getOutcomeDisplay(outcome: BattleOutcome): string {
  switch (outcome) {
    case "attacker_decisive":
      return "Decisive Victory";
    case "attacker_victory":
      return "Victory";
    case "defender_victory":
      return "Repelled";
    case "defender_decisive":
      return "Crushing Defense";
    case "attacker_retreat":
      return "Attacker Retreated";
    case "defender_retreat":
      return "Defender Retreated";
  }
}

/**
 * Calculate win probability for a battle preview.
 * Uses Monte Carlo simulation.
 *
 * @param attackerForces - Attacker's forces
 * @param defenderForces - Defender's forces
 * @param iterations - Number of simulations (default 100)
 * @returns Estimated win probability for attacker (0-1)
 */
export function estimateWinProbability(
  attackerForces: Forces,
  defenderForces: Forces,
  attackerStance: CombatStance = "balanced",
  defenderStance: CombatStance = "balanced",
  iterations = 100
): number {
  let attackerWins = 0;

  for (let i = 0; i < iterations; i++) {
    const result = resolveBattle(
      { ...attackerForces },
      { ...defenderForces },
      {
        attackerStance,
        defenderStance,
        defenderSectorCount: 10, // Doesn't affect win/loss
      }
    );

    if (
      result.outcome === "attacker_victory" ||
      result.outcome === "attacker_decisive"
    ) {
      attackerWins++;
    }
  }

  return attackerWins / iterations;
}

// =============================================================================
// LEGACY COMPATIBILITY
// =============================================================================

/**
 * Convert a full Forces object from partial casualties.
 * Fills missing values with 0.
 */
function partialToFullForces(partial: Partial<Forces>): Forces {
  return {
    soldiers: partial.soldiers ?? 0,
    fighters: partial.fighters ?? 0,
    stations: partial.stations ?? 0,
    lightCruisers: partial.lightCruisers ?? 0,
    heavyCruisers: partial.heavyCruisers ?? 0,
    carriers: partial.carriers ?? 0,
  };
}

/**
 * Convert BattleResult to legacy CombatResult format.
 * This allows the new volley system to work with existing infrastructure.
 *
 * @param battleResult - New volley combat result
 * @param attackerForces - Original attacker forces
 * @param defenderForces - Original defender forces
 * @returns Legacy-compatible CombatResult
 */
export function convertToLegacyCombatResult(
  battleResult: BattleResult,
  attackerForces: Forces,
  defenderForces: Forces
): CombatResult {
  // Map battle outcome to legacy outcome format
  let outcome: CombatResult["outcome"];
  switch (battleResult.outcome) {
    case "attacker_decisive":
    case "attacker_victory":
      outcome = "attacker_victory";
      break;
    case "defender_decisive":
    case "defender_victory":
      outcome = "defender_victory";
      break;
    case "attacker_retreat":
    case "defender_retreat":
      outcome = "retreat";
      break;
    default:
      outcome = "stalemate";
  }

  // Convert volleys to legacy phase format
  const phases: PhaseResult[] = battleResult.volleys.map((volley, index) => {
    // Map volley number to combat phase
    const phaseMap: Record<1 | 2 | 3, CombatPhase> = {
      1: "space",
      2: "orbital",
      3: "ground",
    };
    const phase = phaseMap[volley.volleyNumber];

    // Calculate forces before/after this volley
    const attackerForcesStart = index === 0
      ? attackerForces
      : applyPreviousCasualties(attackerForces, battleResult.volleys.slice(0, index));
    const defenderForcesStart = index === 0
      ? defenderForces
      : applyPreviousCasualties(defenderForces, battleResult.volleys.slice(0, index));

    // Generate volley description
    const winnerText = volley.volleyWinner === "tie" ? "Draw" :
      volley.volleyWinner === "attacker" ? "Attacker wins" : "Defender wins";
    const phaseNames: Record<CombatPhase, string> = {
      space: "Space Combat",
      orbital: "Orbital Combat",
      ground: "Ground Combat",
      guerilla: "Guerilla Raid",
      pirate_defense: "Pirate Defense",
    };
    const description = `Volley ${volley.volleyNumber}: ${phaseNames[phase]}. ${winnerText} (${volley.attackerHits} vs ${volley.defenderHits} hits).`;

    return {
      phase,
      phaseNumber: volley.volleyNumber,
      winner: volley.volleyWinner === "tie" ? "draw" : volley.volleyWinner,
      attackerPower: volley.attackerDamage,
      defenderPower: volley.defenderDamage,
      attackerForcesStart,
      defenderForcesStart,
      attackerForcesEnd: subtractCasualties(attackerForcesStart, volley.attackerCasualties),
      defenderForcesEnd: subtractCasualties(defenderForcesStart, volley.defenderCasualties),
      attackerCasualties: volley.attackerCasualties,
      defenderCasualties: volley.defenderCasualties,
      description,
    };
  });

  // Generate summary
  const { attacker: aWins, defender: dWins } = battleResult.volleyScore;
  let summary = `Battle resolved in ${battleResult.volleys.length} volleys (${aWins}-${dWins}). `;
  if (outcome === "attacker_victory") {
    summary += `Attacker captured ${battleResult.sectorsCaptured} sector(s).`;
  } else if (outcome === "defender_victory") {
    summary += "Defender successfully repelled the attack.";
  } else if (outcome === "retreat") {
    summary += "Forces retreated from battle.";
  }

  return {
    outcome,
    phases,
    attackerTotalCasualties: partialToFullForces(battleResult.attackerFinalCasualties),
    defenderTotalCasualties: partialToFullForces(battleResult.defenderFinalCasualties),
    attackerEffectivenessChange: 0, // Not used in new system
    defenderEffectivenessChange: 0, // Not used in new system
    sectorsCaptured: battleResult.sectorsCaptured,
    summary,
  };
}

/**
 * Apply previous volley casualties to get forces at start of a volley.
 */
function applyPreviousCasualties(
  forces: Forces,
  previousVolleys: VolleyResult[]
): Forces {
  let result = { ...forces };
  for (const volley of previousVolleys) {
    result = subtractCasualties(result, volley.attackerCasualties);
  }
  return result;
}

/**
 * Subtract casualties from forces.
 */
function subtractCasualties(
  forces: Forces,
  casualties: Partial<Forces>
): Forces {
  return {
    soldiers: Math.max(0, (forces.soldiers ?? 0) - (casualties.soldiers ?? 0)),
    fighters: Math.max(0, (forces.fighters ?? 0) - (casualties.fighters ?? 0)),
    stations: Math.max(0, (forces.stations ?? 0) - (casualties.stations ?? 0)),
    lightCruisers: Math.max(0, (forces.lightCruisers ?? 0) - (casualties.lightCruisers ?? 0)),
    heavyCruisers: Math.max(0, (forces.heavyCruisers ?? 0) - (casualties.heavyCruisers ?? 0)),
    carriers: Math.max(0, (forces.carriers ?? 0) - (casualties.carriers ?? 0)),
  };
}

/**
 * Resolve a battle and return legacy CombatResult format.
 * This is a convenience function that combines resolveBattle and convertToLegacyCombatResult.
 *
 * @param attackerForces - Attacker's forces
 * @param defenderForces - Defender's forces
 * @param defenderSectorCount - Number of sectors defender has
 * @param options - Optional battle options
 * @returns Legacy-compatible CombatResult
 */
export function resolveVolleyInvasion(
  attackerForces: Forces,
  defenderForces: Forces,
  defenderSectorCount: number,
  options?: {
    attackerStance?: CombatStance;
    defenderStance?: CombatStance;
  }
): CombatResult {
  const battleResult = resolveBattle(
    { ...attackerForces },
    { ...defenderForces },
    {
      defenderSectorCount,
      attackerStance: options?.attackerStance,
      defenderStance: options?.defenderStance,
    }
  );

  return convertToLegacyCombatResult(
    battleResult,
    attackerForces,
    defenderForces
  );
}

/**
 * Victory & Defeat Conditions (PRD 10.1, 10.2)
 *
 * Six victory conditions + three defeat conditions.
 * Victory priority determines winner when multiple conditions are met simultaneously.
 */

// =============================================================================
// TYPES
// =============================================================================

export type VictoryType =
  | "conquest"
  | "economic"
  | "diplomatic"
  | "research"
  | "military"
  | "survival";

export type DefeatReason = "bankruptcy" | "elimination" | "civil_collapse";

export interface Empire {
  id: string;
  name: string;
  planetCount: number;
  networth: number;
  credits: number;
  civilStatus: string;
  fundamentalResearchLevel: number;
  isEliminated: boolean;
  // Military units for military victory calculation
  soldiers: number;
  fighters: number;
  stations: number;
  lightCruisers: number;
  heavyCruisers: number;
  carriers: number;
  covertAgents: number;
}

export interface Coalition {
  id: string;
  memberEmpireIds: string[];
}

export interface VictoryResult {
  achieved: boolean;
  type: VictoryType;
  winnerId?: string;
  winnerName?: string;
  details?: string;
}

export interface DefeatResult {
  defeated: boolean;
  reason?: DefeatReason;
  details?: string;
}

export interface GameEndState {
  gameOver: boolean;
  victor?: VictoryResult;
  defeatedEmpires?: Array<{ empireId: string; reason: DefeatReason }>;
}

// =============================================================================
// CONSTANTS (PRD 10.1)
// =============================================================================

/** Conquest victory: Control 60% of total territory */
export const CONQUEST_THRESHOLD = 0.6;

/** Economic victory: 1.5× networth of second place */
export const ECONOMIC_MULTIPLIER = 1.5;

/** Diplomatic victory: Coalition controls 50% of territory */
export const DIPLOMATIC_THRESHOLD = 0.5;

/** Research victory: Complete all 8 fundamental research levels */
export const RESEARCH_MAX_LEVEL = 7; // 0-indexed, so level 7 = completed all 8

/** Military victory: 2× military power of all others combined */
export const MILITARY_MULTIPLIER = 2.0;

/** Default turn limit for survival victory */
export const DEFAULT_TURN_LIMIT = 200;

/** Turn at which stalemate prevention activates (PRD 10.2) */
export const STALEMATE_CHECK_TURN = 180;

/**
 * Victory priority order (PRD 10.2).
 * When multiple victory conditions are met simultaneously,
 * the one with higher priority wins.
 */
export const VICTORY_PRIORITY: VictoryType[] = [
  "conquest",
  "research",
  "diplomatic",
  "economic",
  "military",
  "survival",
];

// =============================================================================
// MILITARY POWER CALCULATION
// =============================================================================

/**
 * Unit weights for military power calculation.
 * Based on unit costs and combat effectiveness.
 */
export const MILITARY_UNIT_WEIGHTS = {
  soldiers: 1,
  fighters: 4,
  stations: 100,
  lightCruisers: 10,
  heavyCruisers: 20,
  carriers: 50,
  covertAgents: 0, // Not counted for military victory
} as const;

/**
 * Calculate the total military power of an empire.
 *
 * @param empire - The empire to calculate power for
 * @returns Total military power score
 */
export function calculateMilitaryPower(empire: Empire): number {
  return (
    empire.soldiers * MILITARY_UNIT_WEIGHTS.soldiers +
    empire.fighters * MILITARY_UNIT_WEIGHTS.fighters +
    empire.stations * MILITARY_UNIT_WEIGHTS.stations +
    empire.lightCruisers * MILITARY_UNIT_WEIGHTS.lightCruisers +
    empire.heavyCruisers * MILITARY_UNIT_WEIGHTS.heavyCruisers +
    empire.carriers * MILITARY_UNIT_WEIGHTS.carriers
  );
}

// =============================================================================
// VICTORY CONDITION CHECKS
// =============================================================================

/**
 * Check if an empire has achieved Conquest Victory.
 * Requires controlling 60% of total planets.
 *
 * @param empire - The empire to check
 * @param totalPlanets - Total number of planets in the game
 * @returns True if conquest victory achieved
 */
export function checkConquestVictory(
  empire: Empire,
  totalPlanets: number
): boolean {
  if (totalPlanets <= 0) return false;
  return empire.planetCount / totalPlanets >= CONQUEST_THRESHOLD;
}

/**
 * Check if an empire has achieved Economic Victory.
 * Requires 1.5× the networth of second place.
 *
 * @param empire - The empire to check
 * @param secondPlaceNetworth - Networth of the second-highest empire
 * @returns True if economic victory achieved
 */
export function checkEconomicVictory(
  empire: Empire,
  secondPlaceNetworth: number
): boolean {
  if (secondPlaceNetworth <= 0) return false;
  return empire.networth >= secondPlaceNetworth * ECONOMIC_MULTIPLIER;
}

/**
 * Check if a coalition has achieved Diplomatic Victory.
 * Requires coalition members to control 50% of total planets.
 *
 * @param coalition - The coalition to check
 * @param empires - All empires in the game
 * @param totalPlanets - Total number of planets in the game
 * @returns True if diplomatic victory achieved
 */
export function checkDiplomaticVictory(
  coalition: Coalition,
  empires: Empire[],
  totalPlanets: number
): boolean {
  if (totalPlanets <= 0 || coalition.memberEmpireIds.length === 0) return false;

  const memberEmpireIds = new Set(coalition.memberEmpireIds);
  // Only count active (non-eliminated) coalition members
  const coalitionPlanets = empires
    .filter((e) => memberEmpireIds.has(e.id) && !e.isEliminated)
    .reduce((sum, e) => sum + e.planetCount, 0);

  return coalitionPlanets / totalPlanets >= DIPLOMATIC_THRESHOLD;
}

/**
 * Check if an empire has achieved Research Victory.
 * Requires completing all 8 fundamental research levels.
 *
 * @param empire - The empire to check
 * @returns True if research victory achieved
 */
export function checkResearchVictory(empire: Empire): boolean {
  return empire.fundamentalResearchLevel >= RESEARCH_MAX_LEVEL;
}

/**
 * Check if an empire has achieved Military Victory.
 * Requires 2× the military power of all other empires combined.
 *
 * @param empire - The empire to check
 * @param allEmpires - All empires in the game
 * @returns True if military victory achieved
 */
export function checkMilitaryVictory(
  empire: Empire,
  allEmpires: Empire[]
): boolean {
  const empirePower = calculateMilitaryPower(empire);
  const othersPower = allEmpires
    .filter((e) => e.id !== empire.id && !e.isEliminated)
    .reduce((sum, e) => sum + calculateMilitaryPower(e), 0);

  if (othersPower <= 0) return empirePower > 0;
  return empirePower >= othersPower * MILITARY_MULTIPLIER;
}

/**
 * Check if an empire wins Survival Victory.
 * Must have highest networth at turn limit.
 * Tie-breaker: empire name (alphabetical), then ID.
 *
 * @param empire - The empire to check
 * @param allEmpires - All empires in the game
 * @param currentTurn - Current game turn
 * @param turnLimit - Maximum turns before survival victory
 * @returns True if survival victory achieved
 */
export function checkSurvivalVictory(
  empire: Empire,
  allEmpires: Empire[],
  currentTurn: number,
  turnLimit: number = DEFAULT_TURN_LIMIT
): boolean {
  if (currentTurn < turnLimit) return false;

  const activeEmpires = allEmpires.filter((e) => !e.isEliminated);
  if (activeEmpires.length === 0) return false;

  const highestNetworth = Math.max(...activeEmpires.map((e) => e.networth));

  // Find all empires tied for highest networth
  const tiedEmpires = activeEmpires.filter(
    (e) => e.networth === highestNetworth
  );

  if (tiedEmpires.length === 1) {
    return empire.networth === highestNetworth;
  }

  // Tie-breaker: sort by name (alphabetical), then by ID
  tiedEmpires.sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name);
    return nameCompare !== 0 ? nameCompare : a.id.localeCompare(b.id);
  });

  // Winner is the first in sorted order
  const winner = tiedEmpires[0];
  return winner !== undefined && empire.id === winner.id;
}

// =============================================================================
// DEFEAT CONDITION CHECKS
// =============================================================================

/**
 * Check if an empire is bankrupt.
 * Bankruptcy occurs when credits are negative and
 * the empire cannot pay maintenance.
 *
 * @param empire - The empire to check
 * @param maintenanceCost - Total maintenance cost this turn
 * @returns True if empire is bankrupt
 */
export function checkBankruptcy(
  empire: Empire,
  maintenanceCost: number
): boolean {
  return empire.credits < maintenanceCost && empire.credits < 0;
}

/**
 * Check if an empire has been eliminated.
 * Elimination occurs when an empire controls 0 planets.
 *
 * @param empire - The empire to check
 * @returns True if empire is eliminated
 */
export function checkElimination(empire: Empire): boolean {
  return empire.planetCount === 0;
}

/**
 * Check if an empire has collapsed due to civil unrest.
 * Civil collapse occurs when civil status reaches "revolting".
 *
 * @param empire - The empire to check
 * @returns True if empire has collapsed
 */
export function checkCivilCollapse(empire: Empire): boolean {
  return empire.civilStatus === "revolting";
}

/**
 * Check all defeat conditions for an empire.
 *
 * @param empire - The empire to check
 * @param maintenanceCost - Total maintenance cost this turn
 * @returns DefeatResult with reason if defeated
 */
export function checkDefeatConditions(
  empire: Empire,
  maintenanceCost: number
): DefeatResult {
  if (checkElimination(empire)) {
    return {
      defeated: true,
      reason: "elimination",
      details: `${empire.name} has lost all planets and been eliminated from the galaxy.`,
    };
  }

  if (checkCivilCollapse(empire)) {
    return {
      defeated: true,
      reason: "civil_collapse",
      details: `${empire.name} has collapsed due to civil unrest and revolution.`,
    };
  }

  if (checkBankruptcy(empire, maintenanceCost)) {
    return {
      defeated: true,
      reason: "bankruptcy",
      details: `${empire.name} has gone bankrupt and cannot maintain its empire.`,
    };
  }

  return { defeated: false };
}

// =============================================================================
// COMPREHENSIVE VICTORY CHECK
// =============================================================================

/**
 * Check all victory conditions and return the winning result.
 * Uses victory priority to resolve simultaneous victories.
 *
 * @param empires - All empires in the game
 * @param coalitions - All coalitions in the game
 * @param totalPlanets - Total number of planets in the game
 * @param currentTurn - Current game turn
 * @param turnLimit - Maximum turns before survival victory
 * @returns VictoryResult if any empire has won
 */
export function checkAllVictoryConditions(
  empires: Empire[],
  coalitions: Coalition[],
  totalPlanets: number,
  currentTurn: number,
  turnLimit: number = DEFAULT_TURN_LIMIT
): VictoryResult | null {
  const activeEmpires = empires.filter((e) => !e.isEliminated);

  if (activeEmpires.length === 0) {
    return null; // No winner if all eliminated
  }

  // Special case: Only one empire remaining
  if (activeEmpires.length === 1) {
    const lastEmpire = activeEmpires[0]!;
    return {
      achieved: true,
      type: "conquest",
      winnerId: lastEmpire.id,
      winnerName: lastEmpire.name,
      details: `${lastEmpire.name} is the last empire standing.`,
    };
  }

  // Sort empires by networth for economic victory check
  const sortedByNetworth = [...activeEmpires].sort(
    (a, b) => b.networth - a.networth
  );
  const secondPlace = sortedByNetworth[1];
  const secondPlaceNetworth = secondPlace?.networth ?? 0;

  // Check each victory condition in priority order
  for (const victoryType of VICTORY_PRIORITY) {
    for (const empire of activeEmpires) {
      let achieved = false;
      let details = "";

      switch (victoryType) {
        case "conquest":
          achieved = checkConquestVictory(empire, totalPlanets);
          if (achieved) {
            const percentage = Math.round(
              (empire.planetCount / totalPlanets) * 100
            );
            details = `${empire.name} controls ${percentage}% of the galaxy.`;
          }
          break;

        case "research":
          achieved = checkResearchVictory(empire);
          if (achieved) {
            details = `${empire.name} has achieved technological supremacy.`;
          }
          break;

        case "diplomatic":
          // Check if any coalition with this empire has achieved diplomatic victory
          for (const coalition of coalitions) {
            if (
              coalition.memberEmpireIds.includes(empire.id) &&
              checkDiplomaticVictory(coalition, empires, totalPlanets)
            ) {
              achieved = true;
              details = `${empire.name}'s coalition controls the galaxy through diplomacy.`;
              break;
            }
          }
          break;

        case "economic": {
          const firstPlace = sortedByNetworth[0];
          if (firstPlace && empire.id === firstPlace.id) {
            achieved = checkEconomicVictory(empire, secondPlaceNetworth);
            if (achieved) {
              details = `${empire.name} has achieved overwhelming economic dominance.`;
            }
          }
          break;
        }

        case "military":
          achieved = checkMilitaryVictory(empire, empires);
          if (achieved) {
            details = `${empire.name} commands an unstoppable military force.`;
          }
          break;

        case "survival":
          achieved = checkSurvivalVictory(
            empire,
            empires,
            currentTurn,
            turnLimit
          );
          if (achieved) {
            details = `${empire.name} has survived to dominate the final era.`;
          }
          break;
      }

      if (achieved) {
        return {
          achieved: true,
          type: victoryType,
          winnerId: empire.id,
          winnerName: empire.name,
          details,
        };
      }
    }
  }

  return null; // No victory yet
}

// =============================================================================
// VICTORY PATH ANALYSIS
// =============================================================================

export interface VictoryProgress {
  type: VictoryType;
  currentValue: number;
  targetValue: number;
  percentage: number;
  feasible: boolean;
  turnsToComplete?: number;
}

/**
 * Calculate progress toward each victory condition for an empire.
 *
 * @param empire - The empire to analyze
 * @param allEmpires - All empires in the game
 * @param coalitions - All coalitions in the game
 * @param totalPlanets - Total number of planets in the game
 * @param currentTurn - Current game turn
 * @param turnLimit - Maximum turns before survival victory
 * @returns Array of VictoryProgress for each victory type
 */
export function analyzeVictoryProgress(
  empire: Empire,
  allEmpires: Empire[],
  coalitions: Coalition[],
  totalPlanets: number,
  currentTurn: number,
  turnLimit: number = DEFAULT_TURN_LIMIT
): VictoryProgress[] {
  const activeEmpires = allEmpires.filter((e) => !e.isEliminated);
  const sortedByNetworth = [...activeEmpires].sort(
    (a, b) => b.networth - a.networth
  );
  const secondPlace = sortedByNetworth[1];
  const secondPlaceNetworth = secondPlace?.networth ?? 0;

  const empireMilitary = calculateMilitaryPower(empire);
  const othersMilitary = activeEmpires
    .filter((e) => e.id !== empire.id)
    .reduce((sum, e) => sum + calculateMilitaryPower(e), 0);

  // Find coalition for diplomatic victory
  const empireCoalition = coalitions.find((c) =>
    c.memberEmpireIds.includes(empire.id)
  );
  const coalitionPlanets = empireCoalition
    ? activeEmpires
        .filter((e) => empireCoalition.memberEmpireIds.includes(e.id))
        .reduce((sum, e) => sum + e.planetCount, 0)
    : empire.planetCount;

  return [
    // Conquest
    {
      type: "conquest",
      currentValue: empire.planetCount,
      targetValue: Math.ceil(totalPlanets * CONQUEST_THRESHOLD),
      percentage:
        totalPlanets > 0
          ? Math.min(100, (empire.planetCount / (totalPlanets * CONQUEST_THRESHOLD)) * 100)
          : 0,
      feasible: empire.planetCount > 0,
    },

    // Economic
    {
      type: "economic",
      currentValue: empire.networth,
      targetValue: Math.ceil(secondPlaceNetworth * ECONOMIC_MULTIPLIER),
      percentage:
        secondPlaceNetworth > 0
          ? Math.min(
              100,
              (empire.networth / (secondPlaceNetworth * ECONOMIC_MULTIPLIER)) * 100
            )
          : empire.networth > 0
          ? 100
          : 0,
      feasible: empire.networth > 0,
    },

    // Diplomatic
    {
      type: "diplomatic",
      currentValue: coalitionPlanets,
      targetValue: Math.ceil(totalPlanets * DIPLOMATIC_THRESHOLD),
      percentage:
        totalPlanets > 0
          ? Math.min(
              100,
              (coalitionPlanets / (totalPlanets * DIPLOMATIC_THRESHOLD)) * 100
            )
          : 0,
      feasible: coalitionPlanets > 0,
    },

    // Research
    {
      type: "research",
      currentValue: empire.fundamentalResearchLevel,
      targetValue: RESEARCH_MAX_LEVEL,
      percentage: Math.min(
        100,
        ((empire.fundamentalResearchLevel + 1) / (RESEARCH_MAX_LEVEL + 1)) * 100
      ),
      feasible: true,
    },

    // Military
    {
      type: "military",
      currentValue: empireMilitary,
      targetValue: Math.ceil(othersMilitary * MILITARY_MULTIPLIER),
      percentage:
        othersMilitary > 0
          ? Math.min(
              100,
              (empireMilitary / (othersMilitary * MILITARY_MULTIPLIER)) * 100
            )
          : empireMilitary > 0
          ? 100
          : 0,
      feasible: empireMilitary > 0,
    },

    // Survival
    {
      type: "survival",
      currentValue: currentTurn,
      targetValue: turnLimit,
      percentage: Math.min(100, (currentTurn / turnLimit) * 100),
      feasible: !empire.isEliminated,
      turnsToComplete: turnLimit - currentTurn,
    },
  ];
}

/**
 * Check if any victory path is still feasible.
 * Used for stalemate prevention (Turn 180 warning).
 *
 * @param empire - The empire to check
 * @param allEmpires - All empires in the game
 * @param coalitions - All coalitions in the game
 * @param totalPlanets - Total number of planets in the game
 * @param currentTurn - Current game turn
 * @param turnLimit - Maximum turns before survival victory
 * @returns True if at least one victory path is feasible
 */
export function hasViableVictoryPath(
  empire: Empire,
  allEmpires: Empire[],
  coalitions: Coalition[],
  totalPlanets: number,
  currentTurn: number,
  turnLimit: number = DEFAULT_TURN_LIMIT
): boolean {
  const progress = analyzeVictoryProgress(
    empire,
    allEmpires,
    coalitions,
    totalPlanets,
    currentTurn,
    turnLimit
  );

  return progress.some((p) => p.feasible && p.percentage > 0);
}

/**
 * Get the most viable victory path for an empire.
 *
 * @param empire - The empire to analyze
 * @param allEmpires - All empires in the game
 * @param coalitions - All coalitions in the game
 * @param totalPlanets - Total number of planets in the game
 * @param currentTurn - Current game turn
 * @param turnLimit - Maximum turns before survival victory
 * @returns The victory type with highest progress percentage
 */
export function getMostViableVictoryPath(
  empire: Empire,
  allEmpires: Empire[],
  coalitions: Coalition[],
  totalPlanets: number,
  currentTurn: number,
  turnLimit: number = DEFAULT_TURN_LIMIT
): VictoryType {
  const progress = analyzeVictoryProgress(
    empire,
    allEmpires,
    coalitions,
    totalPlanets,
    currentTurn,
    turnLimit
  );

  const viable = progress.filter((p) => p.feasible);
  if (viable.length === 0) return "survival";

  viable.sort((a, b) => b.percentage - a.percentage);
  const best = viable[0];
  return best?.type ?? "survival";
}

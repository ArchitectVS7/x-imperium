/**
 * Victory & Defeat Detection Service (M6)
 *
 * Handles victory conditions, defeat conditions, and game completion.
 *
 * Victory Conditions (PRD 10.1):
 * - Conquest: Control 60% of total sectors in game
 * - Economic: 1.5× networth of 2nd place empire
 * - Survival: Highest networth at turn 200
 *
 * Defeat Conditions:
 * - Bankruptcy: Credits <= 0 AND can't pay maintenance
 * - Elimination: 0 sectors remaining
 * - Civil Collapse: 3 consecutive turns of revolting
 *
 * @see docs/MILESTONES.md Milestone 6
 */

import { db } from "@/lib/db";
import {
  games,
  empires,
  civilStatusHistory,
  type Empire,
  type Game,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { calculateNetworth, type NetworthInput } from "../networth";

// =============================================================================
// TYPES
// =============================================================================

export type VictoryType = "conquest" | "economic" | "survival";
export type DefeatType = "bankruptcy" | "elimination" | "civil_collapse";

export interface VictoryResult {
  type: VictoryType;
  winnerId: string;
  winnerName: string;
  message: string;
  stats: GameStats;
}

export interface DefeatResult {
  type: DefeatType;
  empireId: string;
  empireName: string;
  message: string;
  turn: number;
}

export interface RevoltConsequence {
  consecutiveTurns: number;
  productionPenalty: number; // Percentage reduction (0.1 = 10%)
  planetsLost: number;
  unitsLost: number;
  isDefeated: boolean;
  message: string;
}

export interface EmpireStanding {
  id: string;
  name: string;
  type: "player" | "bot";
  sectorCount: number;
  networth: number;
  isAlive: boolean;
  rank: number;
}

export interface GameStats {
  totalTurns: number;
  totalSectors: number;
  winnerPlanets: number;
  winnerNetworth: number;
  empiresRemaining: number;
  empiresDefeated: number;
}

export interface StalemateWarning {
  isStalemate: boolean;
  message: string;
  leadingEmpire: string;
  leadingNetworth: number;
  turnsRemaining: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Victory thresholds */
export const CONQUEST_THRESHOLD = 0.6; // 60% of sectors
export const ECONOMIC_THRESHOLD = 1.5; // 1.5× networth of 2nd place
export const TURN_LIMIT = 200;
export const STALEMATE_WARNING_TURN = 180;

/** Civil collapse ramping consequences */
export const REVOLT_CONSEQUENCES = {
  1: {
    productionPenalty: 0.1, // -10% production
    planetLossChance: 0.1, // 10% chance per sector to defect
    unitLossRate: 0,
    message: "Civil unrest grows! Production reduced by 10%, some sectors may defect.",
  },
  2: {
    productionPenalty: 0.25, // -25% production
    planetLossChance: 0.15, // 15% chance per sector to defect
    unitLossRate: 0.1, // 10% military desertion
    message: "Riots spread! Production down 25%, military deserting, sectors rebelling!",
  },
  3: {
    productionPenalty: 1.0, // 100% - complete collapse
    planetLossChance: 1.0,
    unitLossRate: 1.0,
    message: "CIVIL WAR! Your empire has collapsed!",
  },
} as const;

// =============================================================================
// VICTORY DETECTION
// =============================================================================

/**
 * Check all victory conditions for a game.
 *
 * @param gameId - Game UUID
 * @returns VictoryResult if someone won, null otherwise
 */
export async function checkVictoryConditions(
  gameId: string
): Promise<VictoryResult | null> {
  // Get game state
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
    with: {
      empires: {
        with: {
          sectors: true,
        },
      },
    },
  });

  if (!game) return null;

  const aliveEmpires = game.empires.filter(
    (e) => e.sectors.length > 0 && e.credits >= 0
  );

  if (aliveEmpires.length === 0) return null;

  // Calculate standings
  const standings = calculateStandings(aliveEmpires);

  // Check conquest victory (60% of sectors)
  const conquestResult = checkConquestVictory(game, standings);
  if (conquestResult) return conquestResult;

  // Check economic victory (1.5× networth of 2nd place)
  const economicResult = checkEconomicVictory(game, standings);
  if (economicResult) return economicResult;

  // Check survival victory (turn 200)
  const survivalResult = checkSurvivalVictory(game, standings);
  if (survivalResult) return survivalResult;

  return null;
}

/**
 * Check conquest victory: Control 60% of total sectors.
 */
function checkConquestVictory(
  game: Game & { empires: (Empire & { sectors: { id: string }[] })[] },
  standings: EmpireStanding[]
): VictoryResult | null {
  const totalSectors = game.empires.reduce(
    (sum, e) => sum + e.sectors.length,
    0
  );

  if (totalSectors === 0) return null;

  const leader = standings[0];
  if (!leader) return null;

  const controlPercentage = leader.sectorCount / totalSectors;

  if (controlPercentage >= CONQUEST_THRESHOLD) {
    return {
      type: "conquest",
      winnerId: leader.id,
      winnerName: leader.name,
      message: `${leader.name} has conquered ${Math.round(controlPercentage * 100)}% of the galaxy!`,
      stats: buildGameStats(game, leader),
    };
  }

  return null;
}

/**
 * Check economic victory: 1.5× networth of 2nd place.
 */
function checkEconomicVictory(
  game: Game & { empires: (Empire & { sectors: { id: string }[] })[] },
  standings: EmpireStanding[]
): VictoryResult | null {
  if (standings.length < 2) {
    // Only one empire left - they win by elimination, not economics
    return null;
  }

  const first = standings[0];
  const second = standings[1];

  if (!first || !second) return null;

  // Need 1.5× the networth of 2nd place
  if (first.networth >= second.networth * ECONOMIC_THRESHOLD) {
    return {
      type: "economic",
      winnerId: first.id,
      winnerName: first.name,
      message: `${first.name} has achieved economic dominance with ${first.networth.toLocaleString()} networth!`,
      stats: buildGameStats(game, first),
    };
  }

  return null;
}

/**
 * Check survival victory: Highest networth at turn 200.
 */
function checkSurvivalVictory(
  game: Game & { empires: (Empire & { sectors: { id: string }[] })[] },
  standings: EmpireStanding[]
): VictoryResult | null {
  if (game.currentTurn < TURN_LIMIT) return null;

  const leader = standings[0];
  if (!leader) return null;

  return {
    type: "survival",
    winnerId: leader.id,
    winnerName: leader.name,
    message: `${leader.name} survived 200 turns with the highest networth of ${leader.networth.toLocaleString()}!`,
    stats: buildGameStats(game, leader),
  };
}

// =============================================================================
// DEFEAT DETECTION
// =============================================================================

/**
 * Check defeat conditions for an empire.
 *
 * @param empire - Empire to check
 * @param sectors - Empire's sectors
 * @param turn - Current turn number
 * @param creditProduction - Net credit production this turn
 * @returns DefeatResult if defeated, null otherwise
 */
export function checkDefeatConditions(
  empire: Empire,
  sectorCount: number,
  turn: number,
  creditProduction: number
): DefeatResult | null {
  // Check elimination (0 sectors)
  if (sectorCount === 0) {
    return {
      type: "elimination",
      empireId: empire.id,
      empireName: empire.name,
      message: `${empire.name} has been eliminated! All sectors lost.`,
      turn,
    };
  }

  // Check bankruptcy (can't pay maintenance)
  const isBankrupt = empire.credits <= 0 && creditProduction < 0;
  if (isBankrupt) {
    return {
      type: "bankruptcy",
      empireId: empire.id,
      empireName: empire.name,
      message: `${empire.name} has gone bankrupt! Cannot pay maintenance costs.`,
      turn,
    };
  }

  // Note: Civil collapse is checked separately via getConsecutiveRevoltingTurns
  // and handled in the turn processor

  return null;
}

/**
 * Get the number of consecutive turns an empire has been in revolting status.
 *
 * @param empireId - Empire UUID
 * @param gameId - Game UUID
 * @returns Number of consecutive revolting turns (0 if not currently revolting)
 */
export async function getConsecutiveRevoltingTurns(
  empireId: string,
  gameId: string
): Promise<number> {
  // Get the empire's current status
  const empire = await db.query.empires.findFirst({
    where: eq(empires.id, empireId),
  });

  if (!empire || empire.civilStatus !== "revolting") {
    return 0;
  }

  // Count consecutive revolting entries in history
  const history = await db.query.civilStatusHistory.findMany({
    where: and(
      eq(civilStatusHistory.empireId, empireId),
      eq(civilStatusHistory.gameId, gameId)
    ),
    orderBy: [desc(civilStatusHistory.turn)],
    limit: 10, // Only need to check recent history
  });

  let consecutiveCount = 0;

  // Current status is revolting, so start at 1
  consecutiveCount = 1;

  // Check history for consecutive revolting status
  for (const entry of history) {
    if (entry.newStatus === "revolting") {
      consecutiveCount++;
    } else {
      break; // Chain broken
    }
  }

  return consecutiveCount;
}

/**
 * Apply ramping consequences for revolting status.
 *
 * @param empire - Empire in revolt
 * @param consecutiveTurns - Number of consecutive revolting turns
 * @returns Consequence result with penalties to apply
 */
export function calculateRevoltConsequences(
  empire: Empire,
  sectorCount: number,
  consecutiveTurns: number
): RevoltConsequence {
  if (consecutiveTurns <= 0) {
    return {
      consecutiveTurns: 0,
      productionPenalty: 0,
      planetsLost: 0,
      unitsLost: 0,
      isDefeated: false,
      message: "Civil status stable",
    };
  }

  // Cap at 3 (civil war = defeat)
  const level = Math.min(consecutiveTurns, 3) as 1 | 2 | 3;
  const consequence = REVOLT_CONSEQUENCES[level];

  // Calculate sector losses (random chance per sector)
  let planetsLost = 0;
  if (consequence.planetLossChance > 0 && level < 3) {
    // In actual implementation, use deterministic random based on turn/empire
    planetsLost = Math.floor(sectorCount * consequence.planetLossChance * Math.random());
  }

  // Calculate unit losses (percentage of total military)
  const totalUnits =
    empire.soldiers +
    empire.fighters +
    empire.stations +
    empire.lightCruisers +
    empire.heavyCruisers +
    empire.carriers +
    empire.covertAgents;

  const unitsLost = Math.floor(totalUnits * consequence.unitLossRate);

  return {
    consecutiveTurns,
    productionPenalty: consequence.productionPenalty,
    planetsLost,
    unitsLost,
    isDefeated: level >= 3,
    message: consequence.message,
  };
}

/**
 * Apply revolt consequences to an empire.
 * Returns the changes that should be applied to the database.
 */
export function applyRevoltConsequences(
  empire: Empire,
  consequence: RevoltConsequence
): {
  soldierLoss: number;
  fighterLoss: number;
  stationLoss: number;
  lightCruiserLoss: number;
  heavyCruiserLoss: number;
  carrierLoss: number;
  covertAgentLoss: number;
} {
  if (consequence.unitsLost === 0) {
    return {
      soldierLoss: 0,
      fighterLoss: 0,
      stationLoss: 0,
      lightCruiserLoss: 0,
      heavyCruiserLoss: 0,
      carrierLoss: 0,
      covertAgentLoss: 0,
    };
  }

  // Distribute losses proportionally across unit types
  const rate = consequence.consecutiveTurns >= 2 ? 0.1 : 0;

  return {
    soldierLoss: Math.floor(empire.soldiers * rate),
    fighterLoss: Math.floor(empire.fighters * rate),
    stationLoss: Math.floor(empire.stations * rate),
    lightCruiserLoss: Math.floor(empire.lightCruisers * rate),
    heavyCruiserLoss: Math.floor(empire.heavyCruisers * rate),
    carrierLoss: Math.floor(empire.carriers * rate),
    covertAgentLoss: Math.floor(empire.covertAgents * rate),
  };
}

// =============================================================================
// GAME STANDINGS
// =============================================================================

/**
 * Get current game standings sorted by networth.
 */
export async function getGameStandings(
  gameId: string
): Promise<EmpireStanding[]> {
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
    with: {
      empires: {
        with: {
          sectors: true,
        },
      },
    },
  });

  if (!game) return [];

  const aliveEmpires = game.empires.filter((e) => e.sectors.length > 0);
  return calculateStandings(aliveEmpires);
}

/**
 * Calculate standings from empire data.
 */
function calculateStandings(
  empires: (Empire & { sectors: { id: string }[] })[]
): EmpireStanding[] {
  const standings = empires.map((empire) => {
    const networthInput: NetworthInput = {
      sectorCount: empire.sectors.length,
      soldiers: empire.soldiers,
      fighters: empire.fighters,
      stations: empire.stations,
      lightCruisers: empire.lightCruisers,
      heavyCruisers: empire.heavyCruisers,
      carriers: empire.carriers,
      covertAgents: empire.covertAgents,
    };

    return {
      id: empire.id,
      name: empire.name,
      type: empire.type as "player" | "bot",
      sectorCount: empire.sectors.length,
      networth: calculateNetworth(networthInput),
      isAlive: empire.sectors.length > 0,
      rank: 0, // Will be set below
    };
  });

  // Sort by networth descending
  standings.sort((a, b) => b.networth - a.networth);

  // Assign ranks
  standings.forEach((s, i) => {
    s.rank = i + 1;
  });

  return standings;
}

// =============================================================================
// STALEMATE DETECTION
// =============================================================================

/**
 * Check for stalemate warning at turn 180.
 */
export async function checkStalemateWarning(
  gameId: string,
  currentTurn: number
): Promise<StalemateWarning | null> {
  if (currentTurn < STALEMATE_WARNING_TURN) {
    return null;
  }

  const standings = await getGameStandings(gameId);
  if (standings.length < 2) return null;

  const leader = standings[0];
  const second = standings[1];

  // TypeScript safety check
  if (!leader || !second) return null;

  const turnsRemaining = TURN_LIMIT - currentTurn;

  // Check if any victory is achievable
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
    with: { empires: { with: { sectors: true } } },
  });

  if (!game) return null;

  const totalSectors = game.empires.reduce(
    (sum, e) => sum + e.sectors.length,
    0
  );

  if (totalSectors === 0) return null;

  const leaderControlPercentage = leader.sectorCount / totalSectors;
  const economicRatio = leader.networth / (second.networth || 1);

  // Check if conquest or economic victory is feasible
  const conquestFeasible = leaderControlPercentage >= 0.4; // At least 40% already
  const economicFeasible = economicRatio >= 1.2; // At least 1.2× already

  if (conquestFeasible || economicFeasible) {
    return null; // Victory still achievable
  }

  return {
    isStalemate: true,
    message: `Warning: No clear victory path! Game will end at turn ${TURN_LIMIT} with highest networth winning.`,
    leadingEmpire: leader.name,
    leadingNetworth: leader.networth,
    turnsRemaining,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build game statistics for victory screen.
 */
function buildGameStats(
  game: Game & { empires: (Empire & { sectors: { id: string }[] })[] },
  winner: EmpireStanding
): GameStats {
  const totalSectors = game.empires.reduce(
    (sum, e) => sum + e.sectors.length,
    0
  );
  const aliveCount = game.empires.filter((e) => e.sectors.length > 0).length;

  return {
    totalTurns: game.currentTurn,
    totalSectors,
    winnerPlanets: winner.sectorCount,
    winnerNetworth: winner.networth,
    empiresRemaining: aliveCount,
    empiresDefeated: game.empires.length - aliveCount,
  };
}

/**
 * Mark a game as completed with victory/defeat information.
 */
export async function completeGame(
  gameId: string
): Promise<void> {
  await db
    .update(games)
    .set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(games.id, gameId));
}

/**
 * Check if the player has been defeated.
 */
export async function isPlayerDefeated(gameId: string): Promise<boolean> {
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
    with: {
      empires: {
        with: {
          sectors: true,
        },
      },
    },
  });

  if (!game) return false;

  const playerEmpire = game.empires.find((e) => e.type === "player");
  if (!playerEmpire) return false;

  return playerEmpire.sectors.length === 0 || playerEmpire.credits < 0;
}

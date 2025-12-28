/**
 * SRE-Style Battle Framework
 *
 * Multi-configuration testing system for bot balance evaluation.
 * Based on the Solar Realms Elite bot system documentation.
 *
 * Supports:
 * - Battle configurations (Quick Duel, Classic Four, Grand Melee)
 * - Bot tiers (Overpowered, Normal, Underpowered)
 * - Multi-group test runs (10 games × 10 groups = 100 games)
 * - Statistical analysis and reporting
 */

import { runSimulation } from "./simulator";
import type { SimulationConfig, SimulationResult, BotTier } from "./types";
import type { BotArchetype } from "@/lib/bots/types";
import personas from "../../data/personas.json";

// =============================================================================
// BATTLE CONFIGURATIONS
// =============================================================================

export type BattleConfigType =
  | "quick_duel"
  | "classic_four"
  | "standard_match"
  | "grand_melee"
  | "custom";

export interface BattleConfig {
  name: string;
  type: BattleConfigType;
  botCount: number;
  turnLimit: number;
  protectionTurns: number;
  description: string;
}

export const BATTLE_CONFIGS: Record<BattleConfigType, BattleConfig> = {
  quick_duel: {
    name: "Quick Duel",
    type: "quick_duel",
    botCount: 2,
    turnLimit: 100,
    protectionTurns: 5,
    description: "1v1 duel between two bots",
  },
  classic_four: {
    name: "Classic Four",
    type: "classic_four",
    botCount: 4,
    turnLimit: 200,       // Increased from 150
    protectionTurns: 7,
    description: "Classic SRE-style 4-player match",
  },
  standard_match: {
    name: "Standard Match",
    type: "standard_match",
    botCount: 10,
    turnLimit: 250,       // Increased from 175
    protectionTurns: 10,
    description: "Standard 10-player match",
  },
  grand_melee: {
    name: "Grand Melee",
    type: "grand_melee",
    botCount: 20,
    turnLimit: 300,       // Increased from 200
    protectionTurns: 15,
    description: "Large-scale 20-player battle royale",
  },
  custom: {
    name: "Custom",
    type: "custom",
    botCount: 10,
    turnLimit: 250,
    protectionTurns: 10,
    description: "Custom configuration",
  },
};

// =============================================================================
// BOT TIER SYSTEM
// =============================================================================
// Tier modifiers are defined in empire-factory.ts and applied during empire creation
// BotTier type is imported from types.ts

// =============================================================================
// PERSONA MANAGEMENT
// =============================================================================

export interface Persona {
  id: string;
  name: string;
  emperorName: string;
  archetype: BotArchetype;
  voice: {
    tone: string;
    quirks: string[];
    vocabulary: string[];
    catchphrase: string;
  };
  tellRate: number;
}

// Cast and validate personas
const ALL_PERSONAS: Persona[] = personas as Persona[];

/**
 * Determine bot tier based on tellRate
 * - tellRate < 0.4: Overpowered (scheming, dangerous)
 * - tellRate 0.4-0.7: Normal
 * - tellRate > 0.7: Underpowered (naive, reveals intentions)
 */
export function getBotTier(persona: Persona): BotTier {
  if (persona.tellRate < 0.4) return "overpowered";
  if (persona.tellRate > 0.7) return "underpowered";
  return "normal";
}

/**
 * Get tier distribution across all personas
 */
export function getTierDistribution(): Record<BotTier, number> {
  const distribution: Record<BotTier, number> = {
    overpowered: 0,
    normal: 0,
    underpowered: 0,
  };

  for (const persona of ALL_PERSONAS) {
    distribution[getBotTier(persona)]++;
  }

  return distribution;
}

/**
 * Get all personas by archetype
 */
export function getPersonasByArchetype(archetype: BotArchetype): Persona[] {
  return ALL_PERSONAS.filter((p) => p.archetype === archetype);
}

/**
 * Get personas by tier
 */
export function getPersonasByTier(tier: BotTier): Persona[] {
  return ALL_PERSONAS.filter((p) => getBotTier(p) === tier);
}

/**
 * Get persona counts by archetype
 */
export function getArchetypeCounts(): Record<BotArchetype, number> {
  const counts: Record<BotArchetype, number> = {
    warlord: 0,
    diplomat: 0,
    merchant: 0,
    schemer: 0,
    turtle: 0,
    blitzkrieg: 0,
    tech_rush: 0,
    opportunist: 0,
  };

  for (const persona of ALL_PERSONAS) {
    counts[persona.archetype]++;
  }

  return counts;
}

/**
 * Select random personas from the pool
 */
export function selectRandomPersonas(count: number, exclude: string[] = []): Persona[] {
  const available = ALL_PERSONAS.filter((p) => !exclude.includes(p.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Select personas with archetype balance
 * Attempts to include at least one of each archetype when possible
 */
export function selectBalancedPersonas(count: number, exclude: string[] = []): Persona[] {
  const available = ALL_PERSONAS.filter((p) => !exclude.includes(p.id));
  const archetypes: BotArchetype[] = [
    "warlord",
    "diplomat",
    "merchant",
    "schemer",
    "turtle",
    "blitzkrieg",
    "tech_rush",
    "opportunist",
  ];

  const selected: Persona[] = [];

  // First pass: try to get one of each archetype
  for (const archetype of archetypes) {
    if (selected.length >= count) break;
    const archPersonas = available.filter(
      (p) => p.archetype === archetype && !selected.find((s) => s.id === p.id)
    );
    if (archPersonas.length > 0) {
      const randomIndex = Math.floor(Math.random() * archPersonas.length);
      selected.push(archPersonas[randomIndex]!);
    }
  }

  // Second pass: fill remaining with random
  const remaining = available.filter((p) => !selected.find((s) => s.id === p.id));
  const shuffled = [...remaining].sort(() => Math.random() - 0.5);
  for (const persona of shuffled) {
    if (selected.length >= count) break;
    selected.push(persona);
  }

  // Shuffle final selection for random turn order
  return selected.sort(() => Math.random() - 0.5);
}

// =============================================================================
// GAME RESULT TRACKING
// =============================================================================

export interface GameResult {
  gameNumber: number;
  groupNumber: number;
  participants: Array<{
    id: string;
    name: string;
    archetype: BotArchetype;
    startPosition: number;
    finalNetworth: number;
    finalPlanetCount: number;
    isEliminated: boolean;
    eliminatedAtTurn?: number;
  }>;
  winner?: {
    id: string;
    name: string;
    archetype: BotArchetype;
    victoryType: string;
  };
  turnsPlayed: number;
  durationMs: number;
  victoryType: string;
}

export interface GroupResults {
  groupNumber: number;
  participants: string[]; // Persona IDs used in this group
  games: GameResult[];
  archetypeWins: Record<BotArchetype, number>;
  victoryTypeCounts: Record<string, number>;
  averageTurns: number;
  totalDurationMs: number;
}

export interface BattleTestResults {
  config: BattleConfig;
  totalGames: number;
  groups: GroupResults[];
  overallStats: {
    archetypeWinRates: Record<BotArchetype, { wins: number; games: number; rate: number }>;
    victoryTypeDistribution: Record<string, number>;
    averageTurns: number;
    stalemateRate: number;
    eliminationRate: number;
  };
  durationMs: number;
}

// =============================================================================
// SIMULATION RUNNER
// =============================================================================

/**
 * Run a single game with specific personas
 */
export function runSingleGame(
  gameNumber: number,
  groupNumber: number,
  selectedPersonas: Persona[],
  config: BattleConfig,
  verbose = false
): GameResult {
  // Build simulation config
  const simConfig: SimulationConfig = {
    botCount: selectedPersonas.length,
    turnLimit: config.turnLimit,
    protectionTurns: config.protectionTurns,
    difficulty: "normal",
    verbose,
    // Pass persona info to the simulator (including tier from tellRate)
    customBots: selectedPersonas.map((p, index) => ({
      name: p.name,
      emperorName: p.emperorName,
      archetype: p.archetype,
      startPosition: index,
      tier: getBotTier(p),
    })),
  };

  const result = runSimulation(simConfig);

  // Build game result
  const participants = result.finalState.empires.map((empire, index) => ({
    id: selectedPersonas[index]?.id ?? empire.id,
    name: empire.name,
    archetype: empire.archetype,
    startPosition: index,
    finalNetworth: empire.networth,
    finalPlanetCount: empire.planets.length,
    isEliminated: empire.isEliminated,
    eliminatedAtTurn: empire.eliminatedAtTurn,
  }));

  return {
    gameNumber,
    groupNumber,
    participants,
    winner: result.winner
      ? {
          id: result.winner.empireId,
          name: result.winner.empireName,
          archetype: result.winner.archetype,
          victoryType: result.winner.victoryType,
        }
      : undefined,
    turnsPlayed: result.turnsPlayed,
    durationMs: result.durationMs,
    victoryType: result.winner?.victoryType ?? "stalemate",
  };
}

/**
 * Run a group of games with the same personas but randomized turn order
 */
export function runGameGroup(
  groupNumber: number,
  selectedPersonas: Persona[],
  gamesPerGroup: number,
  config: BattleConfig,
  verbose = false
): GroupResults {
  const games: GameResult[] = [];
  const archetypeWins: Record<BotArchetype, number> = {
    warlord: 0,
    diplomat: 0,
    merchant: 0,
    schemer: 0,
    turtle: 0,
    blitzkrieg: 0,
    tech_rush: 0,
    opportunist: 0,
  };
  const victoryTypeCounts: Record<string, number> = {};
  let totalTurns = 0;
  let totalDuration = 0;

  for (let gameNum = 1; gameNum <= gamesPerGroup; gameNum++) {
    // Randomize turn order for each game
    const shuffledPersonas = [...selectedPersonas].sort(() => Math.random() - 0.5);
    const result = runSingleGame(gameNum, groupNumber, shuffledPersonas, config, verbose);

    games.push(result);
    totalTurns += result.turnsPlayed;
    totalDuration += result.durationMs;

    // Track victory stats
    if (result.winner) {
      archetypeWins[result.winner.archetype]++;
      victoryTypeCounts[result.victoryType] = (victoryTypeCounts[result.victoryType] ?? 0) + 1;
    } else {
      victoryTypeCounts["stalemate"] = (victoryTypeCounts["stalemate"] ?? 0) + 1;
    }
  }

  return {
    groupNumber,
    participants: selectedPersonas.map((p) => p.id),
    games,
    archetypeWins,
    victoryTypeCounts,
    averageTurns: totalTurns / gamesPerGroup,
    totalDurationMs: totalDuration,
  };
}

/**
 * Run a full battle test with multiple groups
 */
export function runBattleTest(
  configType: BattleConfigType,
  numberOfGroups: number,
  gamesPerGroup: number,
  verbose = false,
  progressCallback?: (completed: number, total: number) => void
): BattleTestResults {
  const startTime = performance.now();
  const config = BATTLE_CONFIGS[configType];
  const groups: GroupResults[] = [];
  const usedPersonaIds: string[] = [];

  const totalGames = numberOfGroups * gamesPerGroup;

  for (let groupNum = 1; groupNum <= numberOfGroups; groupNum++) {
    // Select personas for this group (avoiding previously used ones if possible)
    let selectedPersonas: Persona[];

    if (usedPersonaIds.length + config.botCount <= ALL_PERSONAS.length) {
      // Enough unique personas - select new ones
      selectedPersonas = selectBalancedPersonas(config.botCount, usedPersonaIds);
    } else {
      // Need to reuse - reset exclusion list
      usedPersonaIds.length = 0;
      selectedPersonas = selectBalancedPersonas(config.botCount);
    }

    // Track used personas
    usedPersonaIds.push(...selectedPersonas.map((p) => p.id));

    // Run the group
    const groupResult = runGameGroup(groupNum, selectedPersonas, gamesPerGroup, config, verbose);
    groups.push(groupResult);

    // Report progress
    if (progressCallback) {
      progressCallback(groupNum * gamesPerGroup, totalGames);
    }
  }

  // Calculate overall statistics
  const overallStats = calculateOverallStats(groups, totalGames);

  return {
    config,
    totalGames,
    groups,
    overallStats,
    durationMs: Math.round(performance.now() - startTime),
  };
}

/**
 * Calculate overall statistics from all groups
 */
function calculateOverallStats(
  groups: GroupResults[],
  totalGames: number
): BattleTestResults["overallStats"] {
  const archetypes: BotArchetype[] = [
    "warlord",
    "diplomat",
    "merchant",
    "schemer",
    "turtle",
    "blitzkrieg",
    "tech_rush",
    "opportunist",
  ];

  // Initialize archetype tracking
  const archetypeStats: Record<BotArchetype, { wins: number; games: number }> = {} as any;
  for (const archetype of archetypes) {
    archetypeStats[archetype] = { wins: 0, games: 0 };
  }

  const victoryTypeDistribution: Record<string, number> = {};
  let totalTurns = 0;
  let stalemateCount = 0;
  let eliminationCount = 0;

  for (const group of groups) {
    // Count archetype participation and wins
    for (const game of group.games) {
      // Track participation by archetype
      for (const participant of game.participants) {
        archetypeStats[participant.archetype].games++;
        if (participant.isEliminated) {
          eliminationCount++;
        }
      }

      // Track wins
      if (game.winner) {
        archetypeStats[game.winner.archetype].wins++;
      } else {
        stalemateCount++;
      }

      totalTurns += game.turnsPlayed;
    }

    // Aggregate victory types
    for (const [type, count] of Object.entries(group.victoryTypeCounts)) {
      victoryTypeDistribution[type] = (victoryTypeDistribution[type] ?? 0) + count;
    }
  }

  // Calculate win rates
  const archetypeWinRates: Record<BotArchetype, { wins: number; games: number; rate: number }> =
    {} as any;
  for (const archetype of archetypes) {
    const stats = archetypeStats[archetype];
    archetypeWinRates[archetype] = {
      wins: stats.wins,
      games: stats.games,
      rate: stats.games > 0 ? stats.wins / stats.games : 0,
    };
  }

  const totalParticipants = groups.reduce(
    (sum, g) => sum + g.games.reduce((s, game) => s + game.participants.length, 0),
    0
  );

  return {
    archetypeWinRates,
    victoryTypeDistribution,
    averageTurns: totalTurns / totalGames,
    stalemateRate: stalemateCount / totalGames,
    eliminationRate: totalParticipants > 0 ? eliminationCount / totalParticipants : 0,
  };
}

// =============================================================================
// REPORTING
// =============================================================================

/**
 * Print a formatted report of battle test results
 */
export function printBattleTestReport(results: BattleTestResults): void {
  console.log("\n" + "=".repeat(70));
  console.log(`BATTLE TEST REPORT: ${results.config.name}`);
  console.log("=".repeat(70));

  console.log(`\nConfiguration:`);
  console.log(`  - Bot Count: ${results.config.botCount}`);
  console.log(`  - Turn Limit: ${results.config.turnLimit}`);
  console.log(`  - Protection Turns: ${results.config.protectionTurns}`);
  console.log(`  - Total Games: ${results.totalGames}`);
  console.log(`  - Groups: ${results.groups.length}`);
  console.log(`  - Duration: ${(results.durationMs / 1000).toFixed(2)}s`);

  console.log(`\n${"─".repeat(70)}`);
  console.log("OVERALL STATISTICS");
  console.log("─".repeat(70));

  console.log(`\nVictory Type Distribution:`);
  for (const [type, count] of Object.entries(results.overallStats.victoryTypeDistribution)) {
    const pct = ((count / results.totalGames) * 100).toFixed(1);
    console.log(`  ${type.padEnd(15)} ${count.toString().padStart(4)} (${pct}%)`);
  }

  console.log(`\nKey Metrics:`);
  console.log(`  - Average Turns: ${results.overallStats.averageTurns.toFixed(1)}`);
  console.log(`  - Stalemate Rate: ${(results.overallStats.stalemateRate * 100).toFixed(1)}%`);
  console.log(`  - Elimination Rate: ${(results.overallStats.eliminationRate * 100).toFixed(1)}%`);

  console.log(`\n${"─".repeat(70)}`);
  console.log("ARCHETYPE WIN RATES");
  console.log("─".repeat(70));

  // Sort archetypes by win rate
  const sortedArchetypes = Object.entries(results.overallStats.archetypeWinRates)
    .sort(([, a], [, b]) => b.rate - a.rate)
    .map(([archetype, stats]) => ({ archetype, ...stats }));

  console.log(
    `${"Archetype".padEnd(15)} ${"Wins".padStart(6)} ${"Games".padStart(6)} ${"Rate".padStart(8)}`
  );
  console.log("─".repeat(40));

  for (const entry of sortedArchetypes) {
    const ratePct = (entry.rate * 100).toFixed(2) + "%";
    console.log(
      `${entry.archetype.padEnd(15)} ${entry.wins.toString().padStart(6)} ${entry.games.toString().padStart(6)} ${ratePct.padStart(8)}`
    );
  }

  // Per-group summary
  console.log(`\n${"─".repeat(70)}`);
  console.log("GROUP SUMMARIES");
  console.log("─".repeat(70));

  for (const group of results.groups) {
    const winnerCounts = Object.entries(group.archetypeWins)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([arch, count]) => `${arch}:${count}`)
      .join(", ");

    console.log(
      `\nGroup ${group.groupNumber}: ${group.games.length} games, avg ${group.averageTurns.toFixed(0)} turns`
    );
    console.log(`  Winners: ${winnerCounts || "none (all stalemates)"}`);
  }

  console.log("\n" + "=".repeat(70));
}

/**
 * Print a compact summary suitable for console output during tests
 */
export function printCompactSummary(results: BattleTestResults): void {
  console.log(`\n${results.config.name}: ${results.totalGames} games in ${(results.durationMs / 1000).toFixed(1)}s`);

  const topArchetypes = Object.entries(results.overallStats.archetypeWinRates)
    .sort(([, a], [, b]) => b.rate - a.rate)
    .slice(0, 3)
    .map(([arch, stats]) => `${arch}:${(stats.rate * 100).toFixed(0)}%`)
    .join(", ");

  console.log(`  Top winners: ${topArchetypes}`);
  console.log(`  Stalemate: ${(results.overallStats.stalemateRate * 100).toFixed(0)}%`);
  console.log(`  Avg turns: ${results.overallStats.averageTurns.toFixed(0)}`);
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick test with default settings (10 groups × 10 games = 100 games)
 */
export function runQuickBattleTest(
  configType: BattleConfigType = "standard_match",
  verbose = false
): BattleTestResults {
  return runBattleTest(configType, 10, 10, verbose, (completed, total) => {
    process.stdout.write(`\rProgress: ${completed}/${total} games`);
  });
}

/**
 * Run all battle configurations for comprehensive testing
 */
export function runComprehensiveTest(
  gamesPerGroup = 10,
  groupsPerConfig = 10,
  verbose = false
): Record<BattleConfigType, BattleTestResults> {
  const results: Partial<Record<BattleConfigType, BattleTestResults>> = {};
  const configs: BattleConfigType[] = ["quick_duel", "classic_four", "standard_match", "grand_melee"];

  for (const configType of configs) {
    console.log(`\nRunning ${BATTLE_CONFIGS[configType].name}...`);
    results[configType] = runBattleTest(configType, groupsPerConfig, gamesPerGroup, verbose);
    printCompactSummary(results[configType]!);
  }

  return results as Record<BattleConfigType, BattleTestResults>;
}

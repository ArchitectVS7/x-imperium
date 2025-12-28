/**
 * Batch Simulation Runner
 *
 * Runs multiple simulations and aggregates balance statistics.
 * Used for game balance testing and tuning.
 */

import type {
  BatchConfig,
  BatchResult,
  BalanceStats,
  SimulationResult,
  SimulationConfig,
} from "./types";
import { runSimulation } from "./simulator";
import type { BotArchetype } from "@/lib/bots/types";

const ALL_ARCHETYPES: BotArchetype[] = [
  "warlord",
  "diplomat",
  "merchant",
  "schemer",
  "turtle",
  "blitzkrieg",
  "tech_rush",
  "opportunist",
];

/**
 * Run a batch of simulations
 */
export function runBatch(config: BatchConfig): BatchResult {
  const startTime = performance.now();
  const results: SimulationResult[] = [];

  console.log(`\n${"=".repeat(60)}`);
  console.log(`BOT BATTLE SIMULATOR - Batch Run`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Running ${config.count} simulations...`);
  console.log(`  - Empires per game: ${config.simulationConfig.empireCount}`);
  console.log(`  - Turn limit: ${config.simulationConfig.turnLimit}`);
  console.log(`  - Protection turns: ${config.simulationConfig.protectionTurns}`);
  console.log();

  for (let i = 0; i < config.count; i++) {
    // Vary seed for each simulation
    const simConfig: SimulationConfig = {
      ...config.simulationConfig,
      seed: config.simulationConfig.seed !== undefined
        ? config.simulationConfig.seed + i
        : undefined,
    };

    const result = runSimulation(simConfig);
    results.push(result);

    // Progress indicator
    if ((i + 1) % 10 === 0 || i === config.count - 1) {
      const winnerInfo = result.winner
        ? `${result.winner.empireName} (${result.winner.archetype}) - ${result.winner.victoryType}`
        : "No winner";
      console.log(`  [${i + 1}/${config.count}] T${result.turnsPlayed} | ${winnerInfo}`);
    }
  }

  const balanceStats = aggregateStats(results);
  const totalDurationMs = Math.round(performance.now() - startTime);

  console.log();
  console.log(`Completed ${config.count} simulations in ${totalDurationMs}ms`);
  console.log(`Average: ${Math.round(totalDurationMs / config.count)}ms per game`);

  return {
    results,
    balanceStats,
    totalDurationMs,
  };
}

/**
 * Aggregate statistics from simulation results
 */
function aggregateStats(results: SimulationResult[]): BalanceStats {
  const stats: BalanceStats = {
    archetypeWins: createArchetypeRecord(0),
    archetypeTopThree: createArchetypeRecord(0),
    archetypeEliminations: createArchetypeRecord(0),
    archetypeSurvivalTurns: createArchetypeRecord([]),

    averageGameLength: 0,
    longestGame: 0,
    shortestGame: Infinity,
    victoryTypes: {},

    averageFinalNetworth: 0,
    maxNetworth: 0,
    averagePlanetCount: 0,

    totalBattles: 0,
    attackerWinRate: 0,
    averageCasualties: 0,
  };

  let totalTurns = 0;
  let totalNetworth = 0;
  let totalPlanets = 0;
  let totalCombats = 0;
  let attackerWins = 0;
  let empireCount = 0;

  for (const result of results) {
    // Game length stats
    totalTurns += result.turnsPlayed;
    stats.longestGame = Math.max(stats.longestGame, result.turnsPlayed);
    stats.shortestGame = Math.min(stats.shortestGame, result.turnsPlayed);

    // Victory stats
    if (result.winner) {
      const archetype = result.winner.archetype;
      stats.archetypeWins[archetype]++;
      stats.victoryTypes[result.winner.victoryType] =
        (stats.victoryTypes[result.winner.victoryType] ?? 0) + 1;
    }

    // Per-empire stats
    const sortedEmpires = [...result.finalState.empires]
      .filter((e) => !e.isEliminated)
      .sort((a, b) => b.networth - a.networth);

    // Top 3 tracking
    for (let i = 0; i < Math.min(3, sortedEmpires.length); i++) {
      const empire = sortedEmpires[i]!;
      stats.archetypeTopThree[empire.archetype]++;
    }

    // Elimination tracking
    for (const empire of result.finalState.empires) {
      if (empire.isEliminated) {
        stats.archetypeEliminations[empire.archetype]++;
        if (empire.eliminatedAtTurn !== undefined) {
          (stats.archetypeSurvivalTurns[empire.archetype] as number[]).push(
            empire.eliminatedAtTurn
          );
        }
      }

      totalNetworth += empire.networth;
      totalPlanets += empire.planets.length;
      empireCount++;
    }

    // Combat stats
    for (const action of result.actions) {
      if (action.outcome.type === "combat") {
        totalCombats++;
        stats.totalBattles++;
        if (action.outcome.result.winner === "attacker") {
          attackerWins++;
        }
      }
    }
  }

  // Calculate averages
  stats.averageGameLength = totalTurns / results.length;
  stats.averageFinalNetworth = empireCount > 0 ? totalNetworth / empireCount : 0;
  stats.averagePlanetCount = empireCount > 0 ? totalPlanets / empireCount : 0;
  stats.attackerWinRate = totalCombats > 0 ? attackerWins / totalCombats : 0;

  if (stats.shortestGame === Infinity) {
    stats.shortestGame = 0;
  }

  return stats;
}

function createArchetypeRecord<T>(defaultValue: T): Record<BotArchetype, T> {
  const record: Record<BotArchetype, T> = {} as Record<BotArchetype, T>;
  for (const archetype of ALL_ARCHETYPES) {
    record[archetype] =
      Array.isArray(defaultValue) ? ([] as unknown as T) : defaultValue;
  }
  return record;
}

/**
 * Print a formatted balance report
 */
export function printBalanceReport(stats: BalanceStats, gameCount: number): void {
  console.log();
  console.log(`${"=".repeat(60)}`);
  console.log("BALANCE REPORT");
  console.log(`${"=".repeat(60)}`);

  console.log();
  console.log("GAME LENGTH");
  console.log("-".repeat(40));
  console.log(`  Average: ${stats.averageGameLength.toFixed(1)} turns`);
  console.log(`  Shortest: ${stats.shortestGame} turns`);
  console.log(`  Longest: ${stats.longestGame} turns`);

  console.log();
  console.log("VICTORY TYPES");
  console.log("-".repeat(40));
  for (const [type, count] of Object.entries(stats.victoryTypes)) {
    const percent = ((count / gameCount) * 100).toFixed(1);
    console.log(`  ${type.padEnd(15)} ${count.toString().padStart(4)} (${percent}%)`);
  }

  console.log();
  console.log("ARCHETYPE WIN RATES");
  console.log("-".repeat(40));
  const sortedWins = Object.entries(stats.archetypeWins).sort(
    (a, b) => b[1] - a[1]
  );
  for (const [archetype, wins] of sortedWins) {
    const percent = ((wins / gameCount) * 100).toFixed(1);
    const bar = "█".repeat(Math.round(wins / gameCount * 20));
    console.log(
      `  ${archetype.padEnd(12)} ${wins.toString().padStart(4)} wins (${percent.padStart(5)}%) ${bar}`
    );
  }

  console.log();
  console.log("ARCHETYPE TOP-3 FINISHES");
  console.log("-".repeat(40));
  const sortedTop3 = Object.entries(stats.archetypeTopThree).sort(
    (a, b) => b[1] - a[1]
  );
  for (const [archetype, count] of sortedTop3) {
    const percent = ((count / (gameCount * 3)) * 100).toFixed(1);
    console.log(`  ${archetype.padEnd(12)} ${count.toString().padStart(4)} (${percent}%)`);
  }

  console.log();
  console.log("ARCHETYPE ELIMINATIONS");
  console.log("-".repeat(40));
  const sortedElims = Object.entries(stats.archetypeEliminations).sort(
    (a, b) => b[1] - a[1]
  );
  for (const [archetype, count] of sortedElims) {
    const turns = stats.archetypeSurvivalTurns[archetype as BotArchetype] as number[];
    const avgTurn =
      turns.length > 0
        ? (turns.reduce((a, b) => a + b, 0) / turns.length).toFixed(1)
        : "N/A";
    console.log(
      `  ${archetype.padEnd(12)} ${count.toString().padStart(4)} eliminations (avg turn: ${avgTurn})`
    );
  }

  console.log();
  console.log("COMBAT STATISTICS");
  console.log("-".repeat(40));
  console.log(`  Total battles: ${stats.totalBattles}`);
  console.log(`  Attacker win rate: ${(stats.attackerWinRate * 100).toFixed(1)}%`);

  console.log();
  console.log("ECONOMY STATISTICS");
  console.log("-".repeat(40));
  console.log(`  Average final networth: ${stats.averageFinalNetworth.toFixed(0)}`);
  console.log(`  Average planet count: ${stats.averagePlanetCount.toFixed(1)}`);

  console.log();
  console.log(`${"=".repeat(60)}`);
}

/**
 * Print system coverage report
 */
export function printCoverageReport(results: SimulationResult[]): void {
  console.log();
  console.log(`${"=".repeat(60)}`);
  console.log("SYSTEM COVERAGE REPORT");
  console.log(`${"=".repeat(60)}`);

  // Aggregate coverage across all simulations
  let totalBuildUnits = 0;
  let totalBuyPlanet = 0;
  let totalAttacks = 0;
  const allUnitTypes = new Set<string>();
  const allPlanetTypes = new Set<string>();

  let combatResolved = 0;
  let researchAdvanced = 0;
  let civilStatusChanged = 0;
  let starvationOccurred = 0;
  let bankruptcyOccurred = 0;
  let eliminationOccurred = 0;
  let victoryAchieved = 0;

  for (const result of results) {
    const c = result.coverage;
    totalBuildUnits += c.buildUnits.count;
    totalBuyPlanet += c.buyPlanet.count;
    totalAttacks += c.attacks.count;

    c.buildUnits.unitTypes.forEach((t) => allUnitTypes.add(t));
    c.buyPlanet.planetTypes.forEach((t) => allPlanetTypes.add(t));

    if (c.combatResolved) combatResolved++;
    if (c.researchAdvanced) researchAdvanced++;
    if (c.civilStatusChanged) civilStatusChanged++;
    if (c.starvationOccurred) starvationOccurred++;
    if (c.bankruptcyOccurred) bankruptcyOccurred++;
    if (c.eliminationOccurred) eliminationOccurred++;
    if (c.victoryAchieved) victoryAchieved++;
  }

  const n = results.length;

  console.log();
  console.log("ACTION COVERAGE");
  console.log("-".repeat(40));
  console.log(`  Build units: ${totalBuildUnits} total`);
  console.log(`    Unit types used: ${Array.from(allUnitTypes).join(", ")}`);
  console.log(`  Buy planets: ${totalBuyPlanet} total`);
  console.log(`    Planet types used: ${Array.from(allPlanetTypes).join(", ")}`);
  console.log(`  Attacks: ${totalAttacks} total`);

  console.log();
  console.log("SYSTEM EVENTS (% of games)");
  console.log("-".repeat(40));
  console.log(`  Combat resolved:      ${((combatResolved / n) * 100).toFixed(1)}%`);
  console.log(`  Research advanced:    ${((researchAdvanced / n) * 100).toFixed(1)}%`);
  console.log(`  Civil status changed: ${((civilStatusChanged / n) * 100).toFixed(1)}%`);
  console.log(`  Starvation occurred:  ${((starvationOccurred / n) * 100).toFixed(1)}%`);
  console.log(`  Bankruptcy occurred:  ${((bankruptcyOccurred / n) * 100).toFixed(1)}%`);
  console.log(`  Elimination occurred: ${((eliminationOccurred / n) * 100).toFixed(1)}%`);
  console.log(`  Victory achieved:     ${((victoryAchieved / n) * 100).toFixed(1)}%`);

  // Check for missing coverage
  console.log();
  console.log("COVERAGE GAPS");
  console.log("-".repeat(40));
  const allExpectedUnits = [
    "soldiers",
    "fighters",
    "stations",
    "lightCruisers",
    "heavyCruisers",
    "carriers",
    "covertAgents",
  ];
  const missingUnits = allExpectedUnits.filter((u) => !allUnitTypes.has(u));
  if (missingUnits.length > 0) {
    console.log(`  Missing unit types: ${missingUnits.join(", ")}`);
  } else {
    console.log(`  ✓ All unit types covered`);
  }

  const allExpectedPlanets = [
    "food",
    "ore",
    "petroleum",
    "tourism",
    "urban",
    "government",
    "research",
  ];
  const missingPlanets = allExpectedPlanets.filter((p) => !allPlanetTypes.has(p));
  if (missingPlanets.length > 0) {
    console.log(`  Missing planet types: ${missingPlanets.join(", ")}`);
  } else {
    console.log(`  ✓ All planet types covered`);
  }

  if (combatResolved === 0) {
    console.log(`  ⚠ No combat resolved - increase turn limit or reduce protection`);
  }

  console.log();
  console.log(`${"=".repeat(60)}`);
}

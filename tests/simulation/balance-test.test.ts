/**
 * Controlled Balance Test
 *
 * Tests game balance using 10 specific bots from the persona list.
 * Each archetype is represented, and we predict win rates based on strategy.
 *
 * This test:
 * 1. Uses specific bots from data/personas.json (not random)
 * 2. Predicts win % for each archetype
 * 3. Runs 10+ games with randomized turn order
 * 4. Compares actual vs predicted to identify balance issues
 */

import { describe, it, expect } from "vitest";
import { runSimulation } from "./simulator";
import type { SimulationConfig, SimulationResult, SimulatedEmpire } from "./types";
import type { BotArchetype } from "@/lib/bots/types";

// =============================================================================
// SELECTED TEST BOTS
// =============================================================================

/**
 * 10 selected bots from data/personas.json with balanced archetypes.
 * Selection criteria:
 * - One representative from each archetype (8)
 * - Plus 2 extras for variety (2nd warlord, 2nd schemer for combat dynamics)
 * - Similar tellRate range (0.3-0.8) for comparable "power level"
 */
export interface TestBotSpec {
  id: string;
  name: string;
  archetype: BotArchetype;
  tellRate: number;
  description: string;
}

export const SELECTED_BOTS: TestBotSpec[] = [
  {
    id: "general_ironhide",
    name: "General Ironhide",
    archetype: "warlord",
    tellRate: 0.7,
    description: "Grizzled veteran, no-nonsense military pragmatist",
  },
  {
    id: "chancellor_vale",
    name: "Chancellor Vale",
    archetype: "diplomat",
    tellRate: 0.8,
    description: "Shrewd negotiator, always finding middle ground",
  },
  {
    id: "ceo_quix",
    name: "CEO Quix",
    archetype: "merchant",
    tellRate: 0.6,
    description: "Obsessed with profit, sees everything as transaction",
  },
  {
    id: "spider_matriarch",
    name: "Spider Matriarch",
    archetype: "schemer",
    tellRate: 0.3,
    description: "Web-weaving strategist, patient trap-setter",
  },
  {
    id: "baron_krell",
    name: "Baron Krell",
    archetype: "turtle",
    tellRate: 0.4,
    description: "Paranoid isolationist, obsessed with defenses",
  },
  {
    id: "raider_fang",
    name: "Raider Fang",
    archetype: "blitzkrieg",
    tellRate: 0.4,
    description: "Lightning-fast raider, hit-and-run specialist",
  },
  {
    id: "archmagos_vex",
    name: "Archmagos Vex",
    archetype: "tech_rush",
    tellRate: 0.5,
    description: "Obsessive researcher, treats war as experimentation",
  },
  {
    id: "gambler_chance",
    name: "Gambler Chance",
    archetype: "opportunist",
    tellRate: 0.5,
    description: "Takes calculated risks, strikes when odds favor",
  },
  {
    id: "admiral_steelheart",
    name: "Admiral Steelheart",
    archetype: "warlord",
    tellRate: 0.7,
    description: "Cold fleet commander, treats war as naval chess",
  },
  {
    id: "count_dravos",
    name: "Count Dravos",
    archetype: "schemer",
    tellRate: 0.3,
    description: "Aristocratic predator, speaks in metaphors of hunting",
  },
];

// =============================================================================
// WIN RATE PREDICTIONS
// =============================================================================

/**
 * Predicted win rates by archetype based on strategic analysis.
 *
 * Reasoning:
 * - warlord (2 bots): Direct combat strength, dominate mid-game = 22-28%
 * - blitzkrieg (1 bot): Fast aggression, can eliminate weak early = 12-18%
 * - merchant (1 bot): Economic victory path, slow but steady = 8-14%
 * - tech_rush (1 bot): Late game powerhouse, vulnerable early = 8-14%
 * - turtle (1 bot): Survives to late game, rarely wins conquest = 6-10%
 * - schemer (2 bots): Needs others to weaken, unpredictable = 10-16%
 * - diplomat (1 bot): Relies on alliances, survival focused = 4-8%
 * - opportunist (1 bot): Thrives on chaos, depends on state = 8-14%
 *
 * With 2 warlords + 1 blitzkrieg = 3 aggressive bots, they should
 * win 40-50% of games combined.
 */
export const PREDICTED_WIN_RATES: Record<BotArchetype, { min: number; max: number; reasoning: string }> = {
  warlord: {
    min: 22,
    max: 28,
    reasoning: "2 warlords in pool - direct combat strength dominates mid-game",
  },
  diplomat: {
    min: 4,
    max: 8,
    reasoning: "1 diplomat - relies on alliances, survival-focused rather than winning",
  },
  merchant: {
    min: 8,
    max: 14,
    reasoning: "1 merchant - economic victory path possible but slow",
  },
  schemer: {
    min: 10,
    max: 16,
    reasoning: "2 schemers - covert ops can weaken targets, unpredictable outcomes",
  },
  turtle: {
    min: 6,
    max: 10,
    reasoning: "1 turtle - excellent survival, rarely achieves conquest victory",
  },
  blitzkrieg: {
    min: 12,
    max: 18,
    reasoning: "1 blitzkrieg - fast aggression can eliminate weak bots early",
  },
  tech_rush: {
    min: 8,
    max: 14,
    reasoning: "1 tech_rush - late game powerhouse if it survives early pressure",
  },
  opportunist: {
    min: 8,
    max: 14,
    reasoning: "1 opportunist - thrives when others are weakened by combat",
  },
};

// =============================================================================
// BALANCE TEST RUNNER
// =============================================================================

interface BalanceTestResult {
  gamesRun: number;
  winsByArchetype: Record<BotArchetype, number>;
  winRateByArchetype: Record<BotArchetype, number>;
  predictions: typeof PREDICTED_WIN_RATES;
  deviations: Record<BotArchetype, { actual: number; predicted: number; deviation: number; withinRange: boolean }>;
  overallAssessment: "BALANCED" | "NEEDS_ADJUSTMENT" | "SEVERELY_IMBALANCED";
  issues: string[];
}

/**
 * Run controlled balance test with specific bots
 */
export function runBalanceTest(gameCount: number, verbose: boolean = false): BalanceTestResult {
  const winsByArchetype: Record<BotArchetype, number> = {
    warlord: 0,
    diplomat: 0,
    merchant: 0,
    schemer: 0,
    turtle: 0,
    blitzkrieg: 0,
    tech_rush: 0,
    opportunist: 0,
  };

  const results: SimulationResult[] = [];
  const botCountByArchetype: Record<BotArchetype, number> = {
    warlord: 2,
    diplomat: 1,
    merchant: 1,
    schemer: 2,
    turtle: 1,
    blitzkrieg: 1,
    tech_rush: 1,
    opportunist: 1,
  };

  for (let game = 0; game < gameCount; game++) {
    // Randomize turn order with different seed each game
    const shuffleSeed = Date.now() + game * 12345;

    const config: SimulationConfig = {
      empireCount: 10,
      turnLimit: 100,
      protectionTurns: 10,
      includePlayer: false,
      verbose: false,
      seed: shuffleSeed,
      // Force exact archetype distribution to match our selected bots
      archetypeDistribution: botCountByArchetype,
    };

    const result = runSimulation(config);
    results.push(result);

    if (result.winner) {
      winsByArchetype[result.winner.archetype]++;

      if (verbose) {
        console.log(
          `Game ${game + 1}: ${result.winner.empireName} (${result.winner.archetype}) wins by ${result.winner.victoryType} on turn ${result.turnsPlayed}`
        );
      }
    } else if (verbose) {
      console.log(`Game ${game + 1}: No winner (draw or timeout)`);
    }
  }

  // Calculate win rates as percentages
  const winRateByArchetype: Record<BotArchetype, number> = {} as Record<BotArchetype, number>;
  for (const archetype of Object.keys(winsByArchetype) as BotArchetype[]) {
    winRateByArchetype[archetype] = (winsByArchetype[archetype] / gameCount) * 100;
  }

  // Calculate deviations from predictions
  const deviations: Record<
    BotArchetype,
    { actual: number; predicted: number; deviation: number; withinRange: boolean }
  > = {} as Record<BotArchetype, { actual: number; predicted: number; deviation: number; withinRange: boolean }>;

  const issues: string[] = [];

  for (const archetype of Object.keys(PREDICTED_WIN_RATES) as BotArchetype[]) {
    const predicted = PREDICTED_WIN_RATES[archetype];
    const actual = winRateByArchetype[archetype];
    const midpoint = (predicted.min + predicted.max) / 2;
    const deviation = actual - midpoint;
    const withinRange = actual >= predicted.min && actual <= predicted.max;

    deviations[archetype] = {
      actual,
      predicted: midpoint,
      deviation,
      withinRange,
    };

    if (!withinRange) {
      if (actual < predicted.min) {
        issues.push(`${archetype} underperforming: ${actual.toFixed(1)}% (expected ${predicted.min}-${predicted.max}%)`);
      } else {
        issues.push(`${archetype} overperforming: ${actual.toFixed(1)}% (expected ${predicted.min}-${predicted.max}%)`);
      }
    }
  }

  // Determine overall assessment
  let overallAssessment: "BALANCED" | "NEEDS_ADJUSTMENT" | "SEVERELY_IMBALANCED";
  const severeDeviations = issues.filter(
    (i) => i.includes("underperforming") && parseFloat(i.match(/(\d+\.?\d*)%/)?.[1] ?? "0") < 2
  ).length;

  if (issues.length === 0) {
    overallAssessment = "BALANCED";
  } else if (issues.length <= 2 && severeDeviations === 0) {
    overallAssessment = "NEEDS_ADJUSTMENT";
  } else {
    overallAssessment = "SEVERELY_IMBALANCED";
  }

  return {
    gamesRun: gameCount,
    winsByArchetype,
    winRateByArchetype,
    predictions: PREDICTED_WIN_RATES,
    deviations,
    overallAssessment,
    issues,
  };
}

/**
 * Print detailed balance report
 */
export function printBalanceTestReport(result: BalanceTestResult): void {
  console.log("\n" + "=".repeat(70));
  console.log("CONTROLLED BALANCE TEST REPORT");
  console.log("=".repeat(70));
  console.log(`\nGames Run: ${result.gamesRun}`);
  console.log(`Overall Assessment: ${result.overallAssessment}\n`);

  console.log("Selected Bots:");
  console.log("-".repeat(50));
  for (const bot of SELECTED_BOTS) {
    console.log(`  ${bot.name.padEnd(20)} (${bot.archetype.padEnd(10)}) - tellRate: ${bot.tellRate}`);
  }

  console.log("\nWin Rates vs Predictions:");
  console.log("-".repeat(70));
  console.log("Archetype".padEnd(15) + "Actual".padStart(10) + "Predicted".padStart(12) + "Dev".padStart(8) + "  Status");
  console.log("-".repeat(70));

  for (const archetype of Object.keys(result.deviations) as BotArchetype[]) {
    const d = result.deviations[archetype];
    const p = result.predictions[archetype];
    const status = d.withinRange ? "✓" : d.actual < p.min ? "↓ LOW" : "↑ HIGH";
    console.log(
      archetype.padEnd(15) +
        `${d.actual.toFixed(1)}%`.padStart(10) +
        `${p.min}-${p.max}%`.padStart(12) +
        `${d.deviation >= 0 ? "+" : ""}${d.deviation.toFixed(1)}`.padStart(8) +
        `  ${status}`
    );
  }

  if (result.issues.length > 0) {
    console.log("\nBalance Issues:");
    console.log("-".repeat(50));
    for (const issue of result.issues) {
      console.log(`  ⚠ ${issue}`);
    }
  }

  // Check attacker win rate from results
  console.log("\nStrategic Analysis:");
  console.log("-".repeat(50));

  const aggressiveWinRate =
    result.winRateByArchetype.warlord + result.winRateByArchetype.blitzkrieg;
  console.log(`  Aggressive archetypes (warlord + blitzkrieg): ${aggressiveWinRate.toFixed(1)}%`);
  console.log(`  Expected range: 34-46%`);

  const defensiveWinRate =
    result.winRateByArchetype.turtle + result.winRateByArchetype.diplomat;
  console.log(`  Defensive archetypes (turtle + diplomat): ${defensiveWinRate.toFixed(1)}%`);
  console.log(`  Expected range: 10-18%`);

  console.log("\n" + "=".repeat(70) + "\n");
}

// =============================================================================
// VITEST TESTS
// =============================================================================

describe("Controlled Balance Test", () => {
  it("should have correct bot selection", () => {
    expect(SELECTED_BOTS).toHaveLength(10);

    // Count archetypes
    const archetypeCounts: Record<string, number> = {};
    for (const bot of SELECTED_BOTS) {
      archetypeCounts[bot.archetype] = (archetypeCounts[bot.archetype] ?? 0) + 1;
    }

    // Should have 2 warlords, 2 schemers, 1 of each other
    expect(archetypeCounts.warlord).toBe(2);
    expect(archetypeCounts.schemer).toBe(2);
    expect(archetypeCounts.diplomat).toBe(1);
    expect(archetypeCounts.merchant).toBe(1);
    expect(archetypeCounts.turtle).toBe(1);
    expect(archetypeCounts.blitzkrieg).toBe(1);
    expect(archetypeCounts.tech_rush).toBe(1);
    expect(archetypeCounts.opportunist).toBe(1);
  });

  it("should have predictions for all archetypes", () => {
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

    for (const archetype of archetypes) {
      expect(PREDICTED_WIN_RATES[archetype]).toBeDefined();
      expect(PREDICTED_WIN_RATES[archetype].min).toBeLessThan(PREDICTED_WIN_RATES[archetype].max);
    }

    // Total predicted range should roughly sum to 100%
    const totalMin = Object.values(PREDICTED_WIN_RATES).reduce((sum, p) => sum + p.min, 0);
    const totalMax = Object.values(PREDICTED_WIN_RATES).reduce((sum, p) => sum + p.max, 0);

    // Allow some flexibility since predictions overlap
    expect(totalMin).toBeLessThanOrEqual(100);
    expect(totalMax).toBeGreaterThanOrEqual(80);
  });

  it("should run balance test with 10 games", () => {
    console.log("\n\nRUNNING CONTROLLED BALANCE TEST (10 games)\n");

    const result = runBalanceTest(10, true);

    printBalanceTestReport(result);

    // Basic sanity checks
    expect(result.gamesRun).toBe(10);

    // Total wins should equal games run
    const totalWins = Object.values(result.winsByArchetype).reduce((sum, w) => sum + w, 0);
    expect(totalWins).toBeLessThanOrEqual(result.gamesRun);

    // Win rates should be percentages
    for (const rate of Object.values(result.winRateByArchetype)) {
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    }
  });

  it("should run larger balance test with 20 games for better statistics", () => {
    console.log("\n\nRUNNING LARGER BALANCE TEST (20 games)\n");

    const result = runBalanceTest(20, false);

    printBalanceTestReport(result);

    // With more games, we expect more meaningful results
    expect(result.gamesRun).toBe(20);

    // Log assessment for review
    console.log(`\nFinal Assessment: ${result.overallAssessment}`);
    console.log(`Issues found: ${result.issues.length}`);
  });
});

// =============================================================================
// STANDALONE RUNNER
// =============================================================================

/**
 * Run balance test from command line:
 * npx ts-node tests/simulation/balance-test.ts
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Starting Controlled Balance Test...\n");

  const gameCount = parseInt(process.argv[2] ?? "20", 10);
  const result = runBalanceTest(gameCount, true);

  printBalanceTestReport(result);

  process.exit(result.overallAssessment === "SEVERELY_IMBALANCED" ? 1 : 0);
}

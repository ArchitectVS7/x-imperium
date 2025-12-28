/**
 * Battle Framework Tests
 *
 * Tests for the SRE-style multi-configuration battle testing system.
 * These tests run various battle configurations to evaluate game balance.
 */

import { describe, it, expect } from "vitest";
import {
  runBattleTest,
  runSingleGame,
  runGameGroup,
  selectRandomPersonas,
  selectBalancedPersonas,
  getArchetypeCounts,
  getPersonasByArchetype,
  BATTLE_CONFIGS,
  printBattleTestReport,
  printCompactSummary,
  type BattleTestResults,
} from "./battle-framework";

describe("Battle Framework", () => {
  describe("Persona Selection", () => {
    it("should have 100 personas available", () => {
      const counts = getArchetypeCounts();
      const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
      // We should have about 100 personas (may vary slightly)
      expect(total).toBeGreaterThanOrEqual(80);
      expect(total).toBeLessThanOrEqual(120);
    });

    it("should have all 8 archetypes represented", () => {
      const counts = getArchetypeCounts();
      const archetypes = Object.keys(counts);
      expect(archetypes).toContain("warlord");
      expect(archetypes).toContain("diplomat");
      expect(archetypes).toContain("merchant");
      expect(archetypes).toContain("schemer");
      expect(archetypes).toContain("turtle");
      expect(archetypes).toContain("blitzkrieg");
      expect(archetypes).toContain("tech_rush");
      expect(archetypes).toContain("opportunist");
    });

    it("should select random personas without duplicates", () => {
      const personas = selectRandomPersonas(10);
      expect(personas.length).toBe(10);

      const ids = personas.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });

    it("should select balanced personas with archetype variety", () => {
      const personas = selectBalancedPersonas(8);
      expect(personas.length).toBe(8);

      // Should have variety of archetypes (not all the same)
      const archetypes = new Set(personas.map((p) => p.archetype));
      expect(archetypes.size).toBeGreaterThanOrEqual(4);
    });

    it("should respect exclusion list", () => {
      const first = selectRandomPersonas(5);
      const excludeIds = first.map((p) => p.id);

      const second = selectRandomPersonas(5, excludeIds);

      // No overlap should exist
      for (const persona of second) {
        expect(excludeIds).not.toContain(persona.id);
      }
    });

    it("should get personas by archetype", () => {
      const warlords = getPersonasByArchetype("warlord");
      expect(warlords.length).toBeGreaterThan(0);
      expect(warlords.every((p) => p.archetype === "warlord")).toBe(true);
    });
  });

  describe("Battle Configurations", () => {
    it("should have all expected configurations", () => {
      expect(BATTLE_CONFIGS.quick_duel.botCount).toBe(2);
      expect(BATTLE_CONFIGS.classic_four.botCount).toBe(4);
      expect(BATTLE_CONFIGS.standard_match.botCount).toBe(10);
      expect(BATTLE_CONFIGS.grand_melee.botCount).toBe(20);
    });

    it("should have valid turn limits", () => {
      for (const config of Object.values(BATTLE_CONFIGS)) {
        expect(config.turnLimit).toBeGreaterThan(0);
        expect(config.protectionTurns).toBeGreaterThan(0);
        expect(config.protectionTurns).toBeLessThan(config.turnLimit);
      }
    });
  });

  describe("Single Game Execution", () => {
    it("should run a quick duel game", () => {
      const personas = selectRandomPersonas(2);
      const result = runSingleGame(1, 1, personas, BATTLE_CONFIGS.quick_duel);

      expect(result.gameNumber).toBe(1);
      expect(result.groupNumber).toBe(1);
      expect(result.participants.length).toBe(2);
      expect(result.turnsPlayed).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThan(0);
    });

    it("should run a classic four game", () => {
      const personas = selectRandomPersonas(4);
      const result = runSingleGame(1, 1, personas, BATTLE_CONFIGS.classic_four);

      expect(result.participants.length).toBe(4);
      expect(result.turnsPlayed).toBeGreaterThan(0);
    });

    it("should track participant data correctly", () => {
      const personas = selectRandomPersonas(4);
      const result = runSingleGame(1, 1, personas, BATTLE_CONFIGS.classic_four);

      for (const participant of result.participants) {
        expect(participant.finalNetworth).toBeGreaterThanOrEqual(0);
        expect(typeof participant.isEliminated).toBe("boolean");
        expect(typeof participant.archetype).toBe("string");
      }
    });
  });

  describe("Game Group Execution", () => {
    it("should run multiple games with same personas", () => {
      const personas = selectRandomPersonas(4);
      const groupResult = runGameGroup(1, personas, 3, BATTLE_CONFIGS.classic_four);

      expect(groupResult.groupNumber).toBe(1);
      expect(groupResult.games.length).toBe(3);
      expect(groupResult.participants.length).toBe(4);
    });

    it("should track archetype wins per group", () => {
      const personas = selectBalancedPersonas(4);
      const groupResult = runGameGroup(1, personas, 5, BATTLE_CONFIGS.classic_four);

      // Total wins should equal games with winners
      const totalWins = Object.values(groupResult.archetypeWins).reduce((sum, c) => sum + c, 0);
      const gamesWithWinners = groupResult.games.filter((g) => g.winner).length;
      expect(totalWins).toBe(gamesWithWinners);
    });

    it("should calculate average turns correctly", () => {
      const personas = selectRandomPersonas(4);
      const groupResult = runGameGroup(1, personas, 3, BATTLE_CONFIGS.classic_four);

      const manualAvg =
        groupResult.games.reduce((sum, g) => sum + g.turnsPlayed, 0) / groupResult.games.length;
      expect(groupResult.averageTurns).toBeCloseTo(manualAvg, 1);
    });
  });

  describe("Full Battle Test", () => {
    it("should run a small battle test successfully", () => {
      // Small test: 2 groups × 2 games = 4 games
      const results = runBattleTest("quick_duel", 2, 2);

      expect(results.totalGames).toBe(4);
      expect(results.groups.length).toBe(2);
      expect(results.config.name).toBe("Quick Duel");
    });

    it("should calculate overall statistics", () => {
      const results = runBattleTest("quick_duel", 2, 3);

      // Check archetype win rates exist
      expect(results.overallStats.archetypeWinRates).toBeDefined();
      expect(results.overallStats.victoryTypeDistribution).toBeDefined();
      expect(results.overallStats.averageTurns).toBeGreaterThan(0);
      expect(results.overallStats.stalemateRate).toBeGreaterThanOrEqual(0);
      expect(results.overallStats.stalemateRate).toBeLessThanOrEqual(1);
    });

    it("should track victory type distribution", () => {
      const results = runBattleTest("classic_four", 2, 3);

      // Sum of victory types should equal total games
      const victoryTotal = Object.values(results.overallStats.victoryTypeDistribution).reduce(
        (sum, c) => sum + c,
        0
      );
      expect(victoryTotal).toBe(results.totalGames);
    });
  });

  describe("Report Generation", () => {
    it("should generate reports without errors", () => {
      const results = runBattleTest("quick_duel", 2, 2);

      // These should not throw
      expect(() => printBattleTestReport(results)).not.toThrow();
      expect(() => printCompactSummary(results)).not.toThrow();
    });
  });
});

// =============================================================================
// BALANCE ANALYSIS TESTS (Longer running)
// =============================================================================

describe("Balance Analysis", () => {
  it("should run Quick Duel balance test (20 games)", () => {
    console.log("\n--- Quick Duel Balance Test (20 games) ---");
    const results = runBattleTest("quick_duel", 4, 5);
    printCompactSummary(results);

    expect(results.totalGames).toBe(20);
    expect(results.overallStats.averageTurns).toBeGreaterThan(0);
  });

  it("should run Classic Four balance test (20 games)", () => {
    console.log("\n--- Classic Four Balance Test (20 games) ---");
    const results = runBattleTest("classic_four", 4, 5);
    printCompactSummary(results);

    expect(results.totalGames).toBe(20);
    expect(results.overallStats.averageTurns).toBeGreaterThan(0);
  });

  it("should run Standard Match balance test (10 games)", () => {
    console.log("\n--- Standard Match Balance Test (10 games) ---");
    const results = runBattleTest("standard_match", 2, 5);
    printCompactSummary(results);

    expect(results.totalGames).toBe(10);
  });
});

// =============================================================================
// EXTENDED BALANCE TEST (Run manually for full analysis)
// =============================================================================

describe.skip("Extended Balance Analysis (Manual)", () => {
  it("should run full 100-game balance test per configuration", () => {
    const configs = ["quick_duel", "classic_four", "standard_match"] as const;

    for (const configType of configs) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`Running ${BATTLE_CONFIGS[configType].name}: 100 games (10 groups × 10 games)`);
      console.log("=".repeat(60));

      const results = runBattleTest(configType, 10, 10, false, (completed, total) => {
        process.stdout.write(`\rProgress: ${completed}/${total} games`);
      });

      console.log("\n");
      printBattleTestReport(results);
    }
  });

  it("should run Grand Melee test (50 games)", () => {
    console.log("\n--- Grand Melee Balance Test (50 games) ---");
    const results = runBattleTest("grand_melee", 5, 10, false, (completed, total) => {
      process.stdout.write(`\rProgress: ${completed}/${total} games`);
    });
    console.log("\n");
    printBattleTestReport(results);
  });
});

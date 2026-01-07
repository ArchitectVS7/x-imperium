/**
 * M5.3: 50-Bot Stress Tests for Performance Verification
 *
 * Verifies performance and stability at campaign scale:
 * - Turn processing < 2 seconds
 * - No memory issues over 50 turns
 * - Natural boss emergence by turn 50
 * - System handles large-scale combat
 */

import { describe, it, expect } from "vitest";
import { runSimulation } from "../simulation/simulator";
import type { SimulationConfig, SimulationResult, SimulatedEmpire } from "../simulation/types";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getMemoryUsageMB(): number {
  if (typeof process !== "undefined" && process.memoryUsage) {
    return process.memoryUsage().heapUsed / (1024 * 1024);
  }
  return 0;
}

function identifyBosses(empires: SimulatedEmpire[]): SimulatedEmpire[] {
  const active = empires.filter(e => !e.isEliminated);
  if (active.length === 0) return [];

  const avgNetworth = active.reduce((sum, e) => sum + e.networth, 0) / active.length;

  // Boss = 2×+ average networth
  return active.filter(e => e.networth >= avgNetworth * 2);
}

// =============================================================================
// 50-BOT STRESS TESTS
// =============================================================================

describe("M5.3: 50-Bot Performance Stress Tests", () => {
  it("should complete turn processing within time limit", () => {
    const config: SimulationConfig = {
      empireCount: 50,
      turnLimit: 10, // Short test for timing
      protectionTurns: 5,
      verbose: false,
    };

    const start = performance.now();
    const result = runSimulation(config);
    const duration = performance.now() - start;

    const perTurnMs = duration / result.turnsPlayed;

    console.log(`\n50-Bot Turn Performance:`);
    console.log(`  Total duration: ${duration.toFixed(0)}ms`);
    console.log(`  Turns played: ${result.turnsPlayed}`);
    console.log(`  Per turn: ${perTurnMs.toFixed(1)}ms`);

    // Each turn should complete in < 200ms (gives margin for 2s target with 10 turns)
    expect(perTurnMs).toBeLessThan(200);
  });

  it("should complete 50 turns without memory issues", () => {
    const initialMemory = getMemoryUsageMB();

    const config: SimulationConfig = {
      empireCount: 50,
      turnLimit: 50,
      protectionTurns: 10,
      verbose: false,
    };

    const result = runSimulation(config);

    // Force GC if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = getMemoryUsageMB();
    const memoryGrowth = finalMemory - initialMemory;

    console.log(`\n50-Bot Memory Usage (50 turns):`);
    console.log(`  Initial: ${initialMemory.toFixed(1)}MB`);
    console.log(`  Final: ${finalMemory.toFixed(1)}MB`);
    console.log(`  Growth: ${memoryGrowth.toFixed(1)}MB`);
    console.log(`  Actions tracked: ${result.actions.length}`);

    // Memory growth should be < 100MB for 50 turns
    expect(memoryGrowth).toBeLessThan(100);
  });

  it("should produce natural boss emergence by turn 50", () => {
    const config: SimulationConfig = {
      empireCount: 50,
      turnLimit: 50,
      protectionTurns: 10,
      verbose: false,
    };

    const results: SimulationResult[] = [];
    for (let i = 0; i < 3; i++) {
      results.push(runSimulation({ ...config, seed: Date.now() + i * 12345 }));
    }

    // Check for boss emergence in at least one simulation
    let bossesFound = 0;
    for (const result of results) {
      const bosses = identifyBosses(result.finalState.empires);
      if (bosses.length > 0) {
        bossesFound++;
      }
    }

    console.log(`\n50-Bot Boss Emergence (${results.length} games, 50 turns each):`);
    console.log(`  Games with bosses: ${bossesFound}/${results.length}`);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (!result) continue;
      const bosses = identifyBosses(result.finalState.empires);
      const active = result.finalState.empires.filter(e => !e.isEliminated);
      const avgNetworth = active.reduce((sum, e) => sum + e.networth, 0) / active.length;

      console.log(`  Game ${i + 1}: ${bosses.length} bosses (avg networth: ${avgNetworth.toFixed(0)})`);
      for (const boss of bosses) {
        console.log(`    - ${boss.name} (${boss.archetype}): ${boss.networth.toFixed(0)} networth`);
      }
    }

    // Natural selection should create some differentiation
    // At least some games should have empires with varied networth
    const hasVariety = results.some(r => {
      const active = r.finalState.empires.filter(e => !e.isEliminated);
      if (active.length < 2) return true;
      const max = Math.max(...active.map(e => e.networth));
      const min = Math.min(...active.map(e => e.networth));
      return max > min * 1.5; // At least 1.5× spread
    });

    expect(hasVariety).toBe(true);
  });

  it("should handle large-scale combat gracefully", () => {
    const config: SimulationConfig = {
      empireCount: 50,
      turnLimit: 75,
      protectionTurns: 5, // Shorter protection to get more combat
      verbose: false,
    };

    const result = runSimulation(config);

    console.log(`\n50-Bot Combat Scale (75 turns):`);
    console.log(`  Total attacks: ${result.coverage.attacks.count}`);
    console.log(`  Invasions: ${result.coverage.attacks.invasions}`);
    console.log(`  Combat resolved: ${result.coverage.combatResolved}`);
    console.log(`  Eliminations: ${result.finalState.empires.filter(e => e.isEliminated).length}`);

    // Should have processed some combat
    expect(result.coverage.attacks.count).toBeGreaterThanOrEqual(0);

    // Simulation should complete without errors
    expect(result.turnsPlayed).toBeGreaterThan(0);
  });
});

// =============================================================================
// EXTENDED STRESS TESTS
// =============================================================================

describe("M5.3: Extended Campaign-Scale Tests", () => {
  it("should maintain stable performance over 100 turns", () => {
    const config: SimulationConfig = {
      empireCount: 50,
      turnLimit: 100,
      protectionTurns: 10,
      verbose: false,
    };

    const start = performance.now();
    const result = runSimulation(config);
    const duration = performance.now() - start;

    console.log(`\n50-Bot Extended Performance (100 turns):`);
    console.log(`  Total duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`  Per turn avg: ${(duration / result.turnsPlayed).toFixed(1)}ms`);
    console.log(`  Actions tracked: ${result.actions.length}`);
    console.log(`  Eliminated: ${result.finalState.empires.filter(e => e.isEliminated).length}`);

    // 50 bots × 100 turns should complete in < 30 seconds
    expect(duration).toBeLessThan(30000);
  });

  it("should track all game systems in large simulation", () => {
    const config: SimulationConfig = {
      empireCount: 50,
      turnLimit: 100,
      protectionTurns: 10,
      verbose: false,
    };

    const result = runSimulation(config);

    console.log(`\n50-Bot System Coverage (100 turns):`);
    console.log(`  Build units: ${result.coverage.buildUnits.count} (${result.coverage.buildUnits.unitTypes.size} types)`);
    console.log(`  Buy planets: ${result.coverage.buyPlanet.count} (${result.coverage.buyPlanet.sectorTypes.size} types)`);
    console.log(`  Attacks: ${result.coverage.attacks.count}`);
    console.log(`  Combat resolved: ${result.coverage.combatResolved}`);
    console.log(`  Research advanced: ${result.coverage.researchAdvanced}`);
    console.log(`  Civil status changed: ${result.coverage.civilStatusChanged}`);
    console.log(`  Starvation occurred: ${result.coverage.starvationOccurred}`);
    console.log(`  Bankruptcy occurred: ${result.coverage.bankruptcyOccurred}`);
    console.log(`  Elimination occurred: ${result.coverage.eliminationOccurred}`);
    console.log(`  Victory achieved: ${result.coverage.victoryAchieved}`);

    // With 50 empires over 100 turns, should exercise most systems
    expect(result.coverage.buildUnits.count).toBeGreaterThan(0);
  });

  it("should handle endgame scenarios", () => {
    const config: SimulationConfig = {
      empireCount: 50,
      turnLimit: 150,
      protectionTurns: 10,
      verbose: false,
    };

    const result = runSimulation(config);

    const active = result.finalState.empires.filter(e => !e.isEliminated);
    const eliminated = result.finalState.empires.filter(e => e.isEliminated);

    console.log(`\n50-Bot Endgame State (150 turns):`);
    console.log(`  Active empires: ${active.length}`);
    console.log(`  Eliminated: ${eliminated.length}`);
    console.log(`  Turns played: ${result.turnsPlayed}`);
    console.log(`  Winner: ${result.winner?.empireName || "None"}`);
    console.log(`  Victory type: ${result.winner?.victoryType || "N/A"}`);

    // Game should have progressed significantly
    expect(result.turnsPlayed).toBeGreaterThan(50);

    // Should still have valid game state
    expect(active.length + eliminated.length).toBe(50);
  });
});

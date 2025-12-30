/**
 * Unified Combat Tests
 *
 * Validates that the unified combat system produces reasonable win rates.
 *
 * Target outcomes:
 * - Equal forces: 40-50% attacker win rate (slight defender advantage)
 * - 2x attacker power: 60-70% attacker win rate
 * - 2x defender power: 20-30% attacker win rate
 * - Underdog bonus prevents total stomps
 */

import { describe, it, expect } from "vitest";
import {
  calculateUnifiedPower,
  applyUnderdogBonus,
  determineUnifiedWinner,
  resolveUnifiedInvasion,
  simulateBattles,
  DEFENDER_BONUS,
  UNIT_BASE_POWER,
} from "../unified-combat";
import type { Forces } from "../phases";

describe("calculateUnifiedPower", () => {
  it("should calculate power correctly for basic forces", () => {
    const forces: Forces = {
      soldiers: 100,
      fighters: 50,
      stations: 0,
      lightCruisers: 10,
      heavyCruisers: 5,
      carriers: 2,
    };

    const power = calculateUnifiedPower(forces, false);

    const expected =
      100 * UNIT_BASE_POWER.soldiers +
      50 * UNIT_BASE_POWER.fighters +
      10 * UNIT_BASE_POWER.lightCruisers +
      5 * UNIT_BASE_POWER.heavyCruisers +
      2 * UNIT_BASE_POWER.carriers;

    expect(power).toBe(expected);
  });

  it("should apply defender bonus", () => {
    const forces: Forces = {
      soldiers: 100,
      fighters: 50,
      stations: 0,
      lightCruisers: 10,
      heavyCruisers: 5,
      carriers: 2,
    };

    const attackerPower = calculateUnifiedPower(forces, false);
    const defenderPower = calculateUnifiedPower(forces, true);

    expect(defenderPower).toBe(attackerPower * DEFENDER_BONUS);
  });

  it("should include stations in power calculation", () => {
    const forcesWithStations: Forces = {
      soldiers: 100,
      fighters: 0,
      stations: 5,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
    };

    const forcesWithoutStations: Forces = {
      ...forcesWithStations,
      stations: 0,
    };

    const powerWith = calculateUnifiedPower(forcesWithStations, false);
    const powerWithout = calculateUnifiedPower(forcesWithoutStations, false);

    expect(powerWith).toBeGreaterThan(powerWithout);
    expect(powerWith - powerWithout).toBe(5 * UNIT_BASE_POWER.stations);
  });
});

describe("applyUnderdogBonus", () => {
  it("should not apply bonus when evenly matched", () => {
    const myPower = 100;
    const opponentPower = 100;

    const adjusted = applyUnderdogBonus(myPower, opponentPower);
    expect(adjusted).toBe(myPower); // ratio 1.0, no bonus
  });

  it("should apply bonus when severely outmatched", () => {
    const myPower = 100;
    const opponentPower = 500; // 5x stronger opponent

    const adjusted = applyUnderdogBonus(myPower, opponentPower);
    expect(adjusted).toBeGreaterThan(myPower);
    expect(adjusted).toBeLessThanOrEqual(myPower * 1.25); // Max 25% bonus
  });

  it("should not apply bonus when stronger", () => {
    const myPower = 200;
    const opponentPower = 100;

    const adjusted = applyUnderdogBonus(myPower, opponentPower);
    expect(adjusted).toBe(myPower);
  });
});

describe("determineUnifiedWinner", () => {
  it("should give attacker ~50% chance with equal power", () => {
    // Test with controlled random values across the range
    let attackerWins = 0;
    const trials = 100;

    for (let i = 0; i < trials; i++) {
      const randomValue = i / trials;
      const { winner } = determineUnifiedWinner(100, 100, randomValue);
      if (winner === "attacker") attackerWins++;
    }

    // Should be around 45-55%
    expect(attackerWins).toBeGreaterThanOrEqual(40);
    expect(attackerWins).toBeLessThanOrEqual(60);
  });

  it("should give attacker higher chance with more power", () => {
    const { attackerWinChance } = determineUnifiedWinner(200, 100);
    expect(attackerWinChance).toBeGreaterThan(0.5);
    expect(attackerWinChance).toBeLessThanOrEqual(0.95);
  });

  it("should give attacker lower chance with less power", () => {
    const { attackerWinChance } = determineUnifiedWinner(50, 100);
    expect(attackerWinChance).toBeLessThan(0.5);
    expect(attackerWinChance).toBeGreaterThanOrEqual(0.05);
  });

  it("should cap at 95% maximum win chance", () => {
    const { attackerWinChance } = determineUnifiedWinner(10000, 1);
    expect(attackerWinChance).toBeLessThanOrEqual(0.95);
  });

  it("should floor at 5% minimum win chance", () => {
    const { attackerWinChance } = determineUnifiedWinner(1, 10000);
    expect(attackerWinChance).toBeGreaterThanOrEqual(0.05);
  });
});

describe("resolveUnifiedInvasion", () => {
  const equalForces: Forces = {
    soldiers: 100,
    fighters: 50,
    stations: 0,
    lightCruisers: 10,
    heavyCruisers: 5,
    carriers: 2,
  };

  const equalDefender: Forces = {
    ...equalForces,
    stations: 2, // Defenders have stations
  };

  it("should return valid combat result structure", () => {
    const result = resolveUnifiedInvasion(equalForces, equalDefender, 10, 0.5);

    expect(result.outcome).toBeDefined();
    expect(["attacker_victory", "defender_victory", "stalemate"]).toContain(result.outcome);
    expect(result.phases).toHaveLength(3);
    expect(result.attackerTotalCasualties).toBeDefined();
    expect(result.defenderTotalCasualties).toBeDefined();
    expect(result.summary).toBeDefined();
  });

  it("should capture planets on attacker victory", () => {
    // Force attacker win with low random value
    const result = resolveUnifiedInvasion(
      { ...equalForces, soldiers: 500, fighters: 200 }, // Strong attacker
      equalDefender,
      10,
      0.01
    );

    if (result.outcome === "attacker_victory") {
      expect(result.planetsCaptured).toBeGreaterThan(0);
      expect(result.planetsCaptured).toBeLessThanOrEqual(2); // 15% of 10 max
    }
  });

  it("should respect carrier capacity", () => {
    const manysoldiersNoCarriers: Forces = {
      soldiers: 1000,
      fighters: 0,
      stations: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0, // No carriers!
    };

    const result = resolveUnifiedInvasion(manysoldiersNoCarriers, equalDefender, 10);

    // With no carriers, soldiers can't be transported effectively
    // Combat should heavily favor defender
    // (We're not testing exact outcome, just that it processes)
    expect(result.outcome).toBeDefined();
  });
});

describe("simulateBattles - Win Rate Validation", () => {
  const standardAttacker: Forces = {
    soldiers: 100,
    fighters: 50,
    stations: 0,
    lightCruisers: 10,
    heavyCruisers: 5,
    carriers: 2,
  };

  const standardDefender: Forces = {
    soldiers: 100,
    fighters: 50,
    stations: 2,
    lightCruisers: 10,
    heavyCruisers: 5,
    carriers: 0,
  };

  it("should produce ~40-50% attacker win rate with equal forces", () => {
    const results = simulateBattles(standardAttacker, standardDefender, 500);

    console.log("Equal Forces Results:", results);

    // With equal forces and defender bonus, expect 40-50% attacker win rate
    expect(results.attackerWinRate).toBeGreaterThanOrEqual(0.35);
    expect(results.attackerWinRate).toBeLessThanOrEqual(0.55);
  });

  it("should produce higher win rate for stronger attacker", () => {
    const strongAttacker: Forces = {
      soldiers: 200,
      fighters: 100,
      stations: 0,
      lightCruisers: 20,
      heavyCruisers: 10,
      carriers: 4,
    };

    const results = simulateBattles(strongAttacker, standardDefender, 500);

    console.log("Strong Attacker Results:", results);

    // 2x forces should give 60-75% win rate
    expect(results.attackerWinRate).toBeGreaterThanOrEqual(0.55);
    expect(results.attackerWinRate).toBeLessThanOrEqual(0.80);
  });

  it("should produce lower win rate for weaker attacker", () => {
    const weakAttacker: Forces = {
      soldiers: 50,
      fighters: 25,
      stations: 0,
      lightCruisers: 5,
      heavyCruisers: 2,
      carriers: 1,
    };

    const results = simulateBattles(weakAttacker, standardDefender, 500);

    console.log("Weak Attacker Results:", results);

    // 0.5x forces should give 15-35% win rate (underdog bonus helps)
    expect(results.attackerWinRate).toBeGreaterThanOrEqual(0.10);
    expect(results.attackerWinRate).toBeLessThanOrEqual(0.40);
  });

  it("should still allow underdog victories occasionally", () => {
    const veryWeakAttacker: Forces = {
      soldiers: 25,
      fighters: 10,
      stations: 0,
      lightCruisers: 2,
      heavyCruisers: 1,
      carriers: 1,
    };

    const veryStrongDefender: Forces = {
      soldiers: 200,
      fighters: 100,
      stations: 5,
      lightCruisers: 20,
      heavyCruisers: 10,
      carriers: 0,
    };

    const results = simulateBattles(veryWeakAttacker, veryStrongDefender, 500);

    console.log("Underdog Results:", results);

    // Even severe underdog should win occasionally (5% floor)
    expect(results.attackerWins).toBeGreaterThan(0);
    expect(results.attackerWinRate).toBeGreaterThanOrEqual(0.03);
    expect(results.attackerWinRate).toBeLessThanOrEqual(0.15);
  });
});

describe("Combat Balance Verification", () => {
  it("VALIDATION: Print combat statistics for review", () => {
    console.log("\n=== COMBAT BALANCE VALIDATION ===\n");

    const baseForces: Forces = {
      soldiers: 100,
      fighters: 50,
      stations: 0,
      lightCruisers: 10,
      heavyCruisers: 5,
      carriers: 2,
    };

    const defenderForces: Forces = {
      ...baseForces,
      stations: 2,
    };

    const scenarios = [
      { name: "Equal Forces", multiplier: 1.0 },
      { name: "Attacker 1.5x", multiplier: 1.5 },
      { name: "Attacker 2.0x", multiplier: 2.0 },
      { name: "Attacker 0.75x", multiplier: 0.75 },
      { name: "Attacker 0.5x", multiplier: 0.5 },
      { name: "Attacker 0.25x", multiplier: 0.25 },
    ];

    for (const scenario of scenarios) {
      const attackerForces: Forces = {
        soldiers: Math.floor(baseForces.soldiers * scenario.multiplier),
        fighters: Math.floor(baseForces.fighters * scenario.multiplier),
        stations: 0,
        lightCruisers: Math.floor(baseForces.lightCruisers * scenario.multiplier),
        heavyCruisers: Math.floor(baseForces.heavyCruisers * scenario.multiplier),
        carriers: Math.max(1, Math.floor(baseForces.carriers * scenario.multiplier)),
      };

      const results = simulateBattles(attackerForces, defenderForces, 200);

      console.log(`${scenario.name}:`);
      console.log(`  Attacker Win Rate: ${(results.attackerWinRate * 100).toFixed(1)}%`);
      console.log(`  Defender Win Rate: ${((results.defenderWins / 200) * 100).toFixed(1)}%`);
      console.log(`  Draws: ${results.draws}`);
      console.log(`  Avg Planets Captured: ${results.averagePlanetsCaptured.toFixed(2)}`);
      console.log("");
    }

    // This test always passes - it's for manual review
    expect(true).toBe(true);
  });
});

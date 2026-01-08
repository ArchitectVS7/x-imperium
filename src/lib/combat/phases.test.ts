/**
 * Combat Utility Functions Tests
 *
 * Tests for guerilla attacks and retreat mechanics.
 * For main combat (D20 volley system), see volley-combat-v2.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  type Forces,
  resolveGuerillaAttack,
  resolveRetreat,
  SOLDIERS_PER_CARRIER,
} from "./phases";

// =============================================================================
// TEST FIXTURES
// =============================================================================

const emptyForces: Forces = {
  soldiers: 0,
  fighters: 0,
  stations: 0,
  lightCruisers: 0,
  heavyCruisers: 0,
  carriers: 0,
};

const balancedFleet: Forces = {
  soldiers: 1000,
  fighters: 100,
  stations: 10,
  lightCruisers: 50,
  heavyCruisers: 25,
  carriers: 20,
};

// =============================================================================
// GUERILLA ATTACK TESTS
// =============================================================================

describe("Guerilla Attack", () => {
  it("should only use soldiers", () => {
    const result = resolveGuerillaAttack(1000, { ...emptyForces, soldiers: 500 }, 0.5);

    expect(result.phases.length).toBe(1);
    expect(result.phases[0]!.phase).toBe("guerilla");

    // Only soldier casualties
    expect(result.attackerTotalCasualties.soldiers).toBeGreaterThan(0);
    expect(result.attackerTotalCasualties.fighters).toBe(0);
  });

  it("should not capture sectors", () => {
    const result = resolveGuerillaAttack(1000, { ...emptyForces, soldiers: 100 }, 0.5);

    expect(result.sectorsCaptured).toBe(0);
  });

  it("should determine winner based on power", () => {
    // Strong attacker vs weak defender
    const resultStrongAttacker = resolveGuerillaAttack(
      1000,
      { ...emptyForces, soldiers: 100 },
      0.5
    );

    // With 10x soldier advantage, attacker should win
    expect(resultStrongAttacker.outcome).toBe("attacker_victory");

    // Weak attacker vs strong defender
    const resultWeakAttacker = resolveGuerillaAttack(
      100,
      { ...emptyForces, soldiers: 1000 },
      0.5
    );

    // With 10x soldier disadvantage, defender should win
    expect(resultWeakAttacker.outcome).toBe("defender_victory");
  });

  it("should have correct phase description", () => {
    const result = resolveGuerillaAttack(500, { ...emptyForces, soldiers: 300 }, 0.5);

    expect(result.phases[0]!.description).toContain("Guerilla raid");
    expect(result.phases[0]!.description).toContain("500 soldiers attack");
  });
});

// =============================================================================
// RETREAT TESTS
// =============================================================================

describe("Retreat", () => {
  it("should apply 15% casualties on retreat", () => {
    const forces: Forces = {
      soldiers: 1000,
      fighters: 100,
      stations: 10, // Stations don't retreat
      lightCruisers: 50,
      heavyCruisers: 25,
      carriers: 20,
    };

    const result = resolveRetreat(forces);

    expect(result.outcome).toBe("retreat");
    expect(result.attackerTotalCasualties.soldiers).toBe(150); // 15% of 1000
    expect(result.attackerTotalCasualties.fighters).toBe(15); // 15% of 100
    expect(result.attackerTotalCasualties.stations).toBe(0); // Stations don't retreat
    expect(result.attackerTotalCasualties.lightCruisers).toBe(7); // 15% of 50
    expect(result.attackerTotalCasualties.heavyCruisers).toBe(3); // 15% of 25
    expect(result.attackerTotalCasualties.carriers).toBe(3); // 15% of 20
  });

  it("should apply -5% effectiveness penalty", () => {
    const result = resolveRetreat(balancedFleet);

    expect(result.attackerEffectivenessChange).toBe(-5);
  });

  it("should not cause defender casualties", () => {
    const result = resolveRetreat(balancedFleet);

    expect(result.defenderTotalCasualties.soldiers).toBe(0);
    expect(result.defenderTotalCasualties.fighters).toBe(0);
    expect(result.defenderTotalCasualties.lightCruisers).toBe(0);
  });

  it("should have no phases", () => {
    const result = resolveRetreat(balancedFleet);

    expect(result.phases.length).toBe(0);
  });

  it("should have descriptive summary", () => {
    const result = resolveRetreat(balancedFleet);

    expect(result.summary).toContain("retreat");
    expect(result.summary).toContain("15%");
  });
});

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Combat Constants", () => {
  it("should export SOLDIERS_PER_CARRIER constant", () => {
    expect(SOLDIERS_PER_CARRIER).toBe(100);
  });
});

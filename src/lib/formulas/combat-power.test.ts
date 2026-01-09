import { describe, it, expect } from "vitest";
import {
  calculateFleetPower,
  calculateDiversityBonus,
  calculatePowerRatio,
  countUnitTypes,
  hasDiversityBonus,
  POWER_MULTIPLIERS,
  DIVERSITY_THRESHOLD,
  DIVERSITY_BONUS,
  DEFENDER_ADVANTAGE,
  STATION_DEFENSE_MULTIPLIER,
  type FleetComposition,
} from "./combat-power";

// Helper to create empty fleet
const emptyFleet: FleetComposition = {
  soldiers: 0,
  fighters: 0,
  stations: 0,
  lightCruisers: 0,
  heavyCruisers: 0,
  carriers: 0,
};

describe("countUnitTypes", () => {
  it("returns 0 for empty fleet", () => {
    expect(countUnitTypes(emptyFleet)).toBe(0);
  });

  it("counts single unit type", () => {
    expect(countUnitTypes({ ...emptyFleet, fighters: 100 })).toBe(1);
    expect(countUnitTypes({ ...emptyFleet, carriers: 5 })).toBe(1);
  });

  it("counts multiple unit types", () => {
    expect(
      countUnitTypes({
        ...emptyFleet,
        fighters: 50,
        lightCruisers: 20,
        carriers: 5,
      })
    ).toBe(3);
  });

  it("counts all 6 unit types when present", () => {
    const fullFleet: FleetComposition = {
      soldiers: 100,
      fighters: 50,
      stations: 10,
      lightCruisers: 20,
      heavyCruisers: 5,
      carriers: 3,
    };
    expect(countUnitTypes(fullFleet)).toBe(6);
  });

  it("does not count zero values", () => {
    expect(
      countUnitTypes({
        soldiers: 0,
        fighters: 100,
        stations: 0,
        lightCruisers: 50,
        heavyCruisers: 0,
        carriers: 0,
      })
    ).toBe(2);
  });
});

describe("hasDiversityBonus", () => {
  it("returns false for less than 4 unit types", () => {
    expect(hasDiversityBonus(emptyFleet)).toBe(false);
    expect(hasDiversityBonus({ ...emptyFleet, fighters: 100 })).toBe(false);
    expect(
      hasDiversityBonus({
        ...emptyFleet,
        fighters: 50,
        lightCruisers: 20,
        carriers: 5,
      })
    ).toBe(false);
  });

  it("returns true for exactly 4 unit types", () => {
    const fleet: FleetComposition = {
      soldiers: 100,
      fighters: 50,
      stations: 0,
      lightCruisers: 20,
      heavyCruisers: 5,
      carriers: 0,
    };
    expect(hasDiversityBonus(fleet)).toBe(true);
  });

  it("returns true for more than 4 unit types", () => {
    const fleet: FleetComposition = {
      soldiers: 100,
      fighters: 50,
      stations: 10,
      lightCruisers: 20,
      heavyCruisers: 5,
      carriers: 3,
    };
    expect(hasDiversityBonus(fleet)).toBe(true);
  });
});

describe("calculateDiversityBonus", () => {
  it("returns 1.0 for fleets without diversity bonus", () => {
    expect(calculateDiversityBonus(emptyFleet)).toBe(1.0);
    expect(calculateDiversityBonus({ ...emptyFleet, fighters: 100 })).toBe(1.0);
  });

  it("returns 1.15 for fleets with diversity bonus", () => {
    const fleet: FleetComposition = {
      soldiers: 100,
      fighters: 50,
      stations: 10,
      lightCruisers: 20,
      heavyCruisers: 0,
      carriers: 0,
    };
    expect(calculateDiversityBonus(fleet)).toBe(DIVERSITY_BONUS);
    expect(calculateDiversityBonus(fleet)).toBe(1.15);
  });
});

describe("calculateFleetPower", () => {
  it("returns 0 for empty fleet", () => {
    expect(calculateFleetPower(emptyFleet, false)).toBe(0);
    expect(calculateFleetPower(emptyFleet, true)).toBe(0);
  });

  it("calculates power for fighters only", () => {
    const fleet: FleetComposition = { ...emptyFleet, fighters: 100 };
    // 100 fighters * 1 multiplier = 100
    expect(calculateFleetPower(fleet, false)).toBe(100);
  });

  it("calculates power for cruisers", () => {
    const fleet: FleetComposition = {
      ...emptyFleet,
      lightCruisers: 10,
      heavyCruisers: 5,
    };
    // (10 * 4) + (5 * 4) = 40 + 20 = 60
    expect(calculateFleetPower(fleet, false)).toBe(60);
  });

  it("calculates power for carriers", () => {
    const fleet: FleetComposition = { ...emptyFleet, carriers: 5 };
    // 5 carriers * 12 multiplier = 60
    expect(calculateFleetPower(fleet, false)).toBe(60);
  });

  it("calculates station power with base multiplier for attacker", () => {
    const fleet: FleetComposition = { ...emptyFleet, stations: 10 };
    // 10 stations * 40 = 400
    expect(calculateFleetPower(fleet, false)).toBe(400);
  });

  it("applies 2x station multiplier for defender", () => {
    const fleet: FleetComposition = { ...emptyFleet, stations: 10 };
    // 10 stations * 40 * 2 (defense) * 1.2 (defender advantage) = 960
    const expectedPower = 10 * POWER_MULTIPLIERS.stations * STATION_DEFENSE_MULTIPLIER * DEFENDER_ADVANTAGE;
    expect(calculateFleetPower(fleet, true)).toBe(expectedPower);
  });

  it("applies defender advantage multiplier", () => {
    const fleet: FleetComposition = { ...emptyFleet, fighters: 100 };
    const attackPower = calculateFleetPower(fleet, false);
    const defensePower = calculateFleetPower(fleet, true);
    // Defender gets 1.2x multiplier
    expect(defensePower).toBe(attackPower * DEFENDER_ADVANTAGE);
  });

  it("applies diversity bonus for mixed fleets", () => {
    const fleet: FleetComposition = {
      soldiers: 100,
      fighters: 50,
      stations: 10,
      lightCruisers: 20,
      heavyCruisers: 0,
      carriers: 0,
    };
    // Base power: (50 * 1) + (10 * 40) + (20 * 4) = 50 + 400 + 80 = 530
    // With diversity bonus: 530 * 1.15 = 609.5
    const basePower = 50 * 1 + 10 * 40 + 20 * 4;
    expect(calculateFleetPower(fleet, false)).toBe(basePower * DIVERSITY_BONUS);
  });

  it("applies both diversity bonus and defender advantage", () => {
    const fleet: FleetComposition = {
      soldiers: 100,
      fighters: 50,
      stations: 10,
      lightCruisers: 20,
      heavyCruisers: 5,
      carriers: 0,
    };
    // Has 5 unit types - gets diversity bonus
    // Defender - gets defender advantage + station 2x
    const attackPower = calculateFleetPower(fleet, false);
    const defensePower = calculateFleetPower(fleet, true);
    expect(defensePower).toBeGreaterThan(attackPower);
  });

  it("does not count soldiers in fleet power calculation", () => {
    const soldiersOnly: FleetComposition = { ...emptyFleet, soldiers: 10000 };
    expect(calculateFleetPower(soldiersOnly, false)).toBe(0);
  });
});

describe("calculatePowerRatio", () => {
  it("returns 1 when both fleets are empty", () => {
    expect(calculatePowerRatio(emptyFleet, emptyFleet)).toBe(1);
  });

  it("returns Infinity when defender has no power", () => {
    const attacker: FleetComposition = { ...emptyFleet, fighters: 100 };
    expect(calculatePowerRatio(attacker, emptyFleet)).toBe(Infinity);
  });

  it("calculates correct ratio for balanced fleets", () => {
    const fleet: FleetComposition = { ...emptyFleet, fighters: 100 };
    const ratio = calculatePowerRatio(fleet, fleet);
    // Defender gets 1.2x advantage, so ratio is 1/1.2 = 0.833...
    expect(ratio).toBeCloseTo(1 / DEFENDER_ADVANTAGE, 5);
  });

  it("calculates correct ratio for unbalanced fleets", () => {
    const attacker: FleetComposition = { ...emptyFleet, fighters: 200 };
    const defender: FleetComposition = { ...emptyFleet, fighters: 100 };
    // Attacker: 200, Defender: 100 * 1.2 = 120
    // Ratio: 200 / 120 = 1.666...
    expect(calculatePowerRatio(attacker, defender)).toBeCloseTo(
      200 / (100 * DEFENDER_ADVANTAGE),
      5
    );
  });
});

describe("POWER_MULTIPLIERS constants", () => {
  it("has correct values from PRD 6.2", () => {
    expect(POWER_MULTIPLIERS.fighters).toBe(1);
    expect(POWER_MULTIPLIERS.stations).toBe(40);
    expect(POWER_MULTIPLIERS.lightCruisers).toBe(4);
    expect(POWER_MULTIPLIERS.heavyCruisers).toBe(4);
    expect(POWER_MULTIPLIERS.carriers).toBe(12);
  });

  it("has correct diversity threshold", () => {
    expect(DIVERSITY_THRESHOLD).toBe(4);
  });

  it("has correct diversity bonus", () => {
    expect(DIVERSITY_BONUS).toBe(1.15);
  });

  it("has correct defender advantage", () => {
    expect(DEFENDER_ADVANTAGE).toBe(1.2);
  });

  it("has correct station defense multiplier", () => {
    expect(STATION_DEFENSE_MULTIPLIER).toBe(2);
  });
});

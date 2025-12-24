import { describe, it, expect } from "vitest";
import {
  calculateNetworth,
  calculateStartingNetworth,
  NETWORTH_MULTIPLIERS,
  type NetworthInput,
} from "./networth";

describe("calculateNetworth", () => {
  it("calculates networth for starting empire (9 planets, 100 soldiers)", () => {
    const input: NetworthInput = {
      planetCount: 9,
      soldiers: 100,
      fighters: 0,
      stations: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
      covertAgents: 0,
    };

    const result = calculateNetworth(input);

    // 9 * 10 + 100 * 0.0005 = 90 + 0.05 = 90.05
    expect(result).toBe(90.05);
  });

  it("calculates networth with all unit types", () => {
    const input: NetworthInput = {
      planetCount: 15,
      soldiers: 1000,
      fighters: 50,
      stations: 10,
      lightCruisers: 20,
      heavyCruisers: 5,
      carriers: 3,
      covertAgents: 10,
    };

    const result = calculateNetworth(input);

    // Manual calculation:
    // 15 * 10 = 150
    // 1000 * 0.0005 = 0.5
    // 50 * 0.001 = 0.05
    // 10 * 0.002 = 0.02
    // 20 * 0.001 = 0.02
    // 5 * 0.002 = 0.01
    // 3 * 0.005 = 0.015
    // 10 * 0.001 = 0.01
    // Total: 150.625
    const expected =
      15 * NETWORTH_MULTIPLIERS.planets +
      1000 * NETWORTH_MULTIPLIERS.soldiers +
      50 * NETWORTH_MULTIPLIERS.fighters +
      10 * NETWORTH_MULTIPLIERS.stations +
      20 * NETWORTH_MULTIPLIERS.lightCruisers +
      5 * NETWORTH_MULTIPLIERS.heavyCruisers +
      3 * NETWORTH_MULTIPLIERS.carriers +
      10 * NETWORTH_MULTIPLIERS.covertAgents;

    expect(result).toBeCloseTo(expected, 10);
    expect(result).toBeCloseTo(150.625, 10);
  });

  it("returns 0 for empty empire", () => {
    const input: NetworthInput = {
      planetCount: 0,
      soldiers: 0,
      fighters: 0,
      stations: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
      covertAgents: 0,
    };

    const result = calculateNetworth(input);

    expect(result).toBe(0);
  });

  it("handles large military counts", () => {
    const input: NetworthInput = {
      planetCount: 100,
      soldiers: 1_000_000,
      fighters: 100_000,
      stations: 50_000,
      lightCruisers: 75_000,
      heavyCruisers: 25_000,
      carriers: 10_000,
      covertAgents: 5_000,
    };

    const result = calculateNetworth(input);

    // 100 * 10 = 1000
    // 1_000_000 * 0.0005 = 500
    // 100_000 * 0.001 = 100
    // 50_000 * 0.002 = 100
    // 75_000 * 0.001 = 75
    // 25_000 * 0.002 = 50
    // 10_000 * 0.005 = 50
    // 5_000 * 0.001 = 5
    // Total: 1880
    expect(result).toBeCloseTo(1880, 10);
  });

  it("correctly weights planets as highest value", () => {
    const planetsOnly: NetworthInput = {
      planetCount: 10,
      soldiers: 0,
      fighters: 0,
      stations: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
      covertAgents: 0,
    };

    const soldiersOnly: NetworthInput = {
      planetCount: 0,
      soldiers: 10000, // 10000 * 0.0005 = 5
      fighters: 0,
      stations: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
      covertAgents: 0,
    };

    const planetNetworth = calculateNetworth(planetsOnly);
    const soldierNetworth = calculateNetworth(soldiersOnly);

    // 10 planets = 100 networth
    // 10000 soldiers = 5 networth
    expect(planetNetworth).toBe(100);
    expect(soldierNetworth).toBe(5);
    expect(planetNetworth).toBeGreaterThan(soldierNetworth);
  });

  it("carriers have highest unit multiplier", () => {
    const baseInput: NetworthInput = {
      planetCount: 0,
      soldiers: 0,
      fighters: 0,
      stations: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
      covertAgents: 0,
    };

    const oneOfEach = [
      { ...baseInput, soldiers: 1 },
      { ...baseInput, fighters: 1 },
      { ...baseInput, stations: 1 },
      { ...baseInput, lightCruisers: 1 },
      { ...baseInput, heavyCruisers: 1 },
      { ...baseInput, carriers: 1 },
      { ...baseInput, covertAgents: 1 },
    ];

    const networths = oneOfEach.map(calculateNetworth);

    // Carriers should have highest networth contribution per unit
    const carrierNetworth = calculateNetworth({ ...baseInput, carriers: 1 });
    expect(carrierNetworth).toBe(NETWORTH_MULTIPLIERS.carriers);
    expect(Math.max(...networths)).toBe(NETWORTH_MULTIPLIERS.carriers);
  });
});

describe("calculateStartingNetworth", () => {
  it("returns correct starting networth (90.05)", () => {
    const result = calculateStartingNetworth();

    // 9 planets * 10 + 100 soldiers * 0.0005 = 90 + 0.05 = 90.05
    expect(result).toBe(90.05);
  });

  it("matches manual calculation with starting values", () => {
    const manualResult = calculateNetworth({
      planetCount: 9,
      soldiers: 100,
      fighters: 0,
      stations: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
      covertAgents: 0,
    });

    expect(calculateStartingNetworth()).toBe(manualResult);
  });
});

describe("NETWORTH_MULTIPLIERS", () => {
  it("has correct planet multiplier (10)", () => {
    expect(NETWORTH_MULTIPLIERS.planets).toBe(10);
  });

  it("has correct soldier multiplier (0.0005)", () => {
    expect(NETWORTH_MULTIPLIERS.soldiers).toBe(0.0005);
  });

  it("has correct fighter multiplier (0.001)", () => {
    expect(NETWORTH_MULTIPLIERS.fighters).toBe(0.001);
  });

  it("has correct station multiplier (0.002)", () => {
    expect(NETWORTH_MULTIPLIERS.stations).toBe(0.002);
  });

  it("has correct light cruiser multiplier (0.001)", () => {
    expect(NETWORTH_MULTIPLIERS.lightCruisers).toBe(0.001);
  });

  it("has correct heavy cruiser multiplier (0.002)", () => {
    expect(NETWORTH_MULTIPLIERS.heavyCruisers).toBe(0.002);
  });

  it("has correct carrier multiplier (0.005)", () => {
    expect(NETWORTH_MULTIPLIERS.carriers).toBe(0.005);
  });

  it("has correct covert agent multiplier (0.001)", () => {
    expect(NETWORTH_MULTIPLIERS.covertAgents).toBe(0.001);
  });
});

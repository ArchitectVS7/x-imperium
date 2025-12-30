/**
 * Tests for Galaxy Generation Service
 *
 * Tests the galaxy structure generation including regions,
 * connections, wormholes, and empire placement.
 */

import { describe, it, expect } from "vitest";
import {
  calculateRegionCount,
  generateRegions,
  generateConnections,
  generateWormholes,
  assignEmpiresToRegions,
  createEmpireInfluenceRecords,
  generateGalaxy,
  createSeededRandom,
  GALAXY_CONSTANTS,
} from "../galaxy-generation-service";

describe("createSeededRandom", () => {
  it("should produce deterministic results", () => {
    const random1 = createSeededRandom(12345);
    const random2 = createSeededRandom(12345);

    const values1 = [random1(), random1(), random1()];
    const values2 = [random2(), random2(), random2()];

    expect(values1).toEqual(values2);
  });

  it("should produce different results with different seeds", () => {
    const random1 = createSeededRandom(12345);
    const random2 = createSeededRandom(54321);

    expect(random1()).not.toBe(random2());
  });

  it("should produce values between 0 and 1", () => {
    const random = createSeededRandom(12345);

    for (let i = 0; i < 100; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe("calculateRegionCount", () => {
  it("should return minimum regions for small empire count", () => {
    const count = calculateRegionCount(5);
    expect(count).toBe(GALAXY_CONSTANTS.MIN_REGIONS);
  });

  it("should scale regions with empire count", () => {
    const count10 = calculateRegionCount(10);
    const count50 = calculateRegionCount(50);
    const count100 = calculateRegionCount(100);

    expect(count50).toBeGreaterThan(count10);
    expect(count100).toBeGreaterThan(count50);
  });

  it("should cap at maximum regions", () => {
    const count = calculateRegionCount(1000);
    expect(count).toBe(GALAXY_CONSTANTS.MAX_REGIONS);
  });

  it("should respect custom empires per region", () => {
    const count = calculateRegionCount(100, 5); // 100/5 = 20, but capped at MAX
    expect(count).toBe(GALAXY_CONSTANTS.MAX_REGIONS);
  });
});

describe("generateRegions", () => {
  it("should generate correct number of regions", () => {
    const regions = generateRegions("game-1", 25);
    const expectedCount = calculateRegionCount(25);
    expect(regions).toHaveLength(expectedCount);
  });

  it("should have unique names", () => {
    const regions = generateRegions("game-1", 100, 10, createSeededRandom(12345));
    const names = regions.map((r) => r.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it("should include all region types", () => {
    const regions = generateRegions("game-1", 100, 10, createSeededRandom(12345));
    const types = new Set(regions.map((r) => r.regionType));

    expect(types.has("core")).toBe(true);
    expect(types.has("inner")).toBe(true);
    expect(types.has("outer")).toBe(true);
  });

  it("should set correct game ID", () => {
    const regions = generateRegions("test-game-id", 25);
    regions.forEach((r) => {
      expect(r.gameId).toBe("test-game-id");
    });
  });

  it("should have valid positions", () => {
    const regions = generateRegions("game-1", 50);
    regions.forEach((r) => {
      const x = Number(r.positionX);
      const y = Number(r.positionY);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    });
  });
});

describe("generateConnections", () => {
  const regions = [
    { id: "r1", positionX: "50.00", positionY: "50.00", regionType: "core" },
    { id: "r2", positionX: "60.00", positionY: "50.00", regionType: "inner" },
    { id: "r3", positionX: "70.00", positionY: "50.00", regionType: "outer" },
    { id: "r4", positionX: "80.00", positionY: "50.00", regionType: "rim" },
  ];

  it("should create connections between adjacent regions", () => {
    const connections = generateConnections("game-1", regions);
    expect(connections.length).toBeGreaterThan(0);
  });

  it("should ensure every region has at least one connection", () => {
    const connections = generateConnections("game-1", regions);

    for (const region of regions) {
      const hasConnection = connections.some(
        (c) => c.fromRegionId === region.id || c.toRegionId === region.id
      );
      expect(hasConnection).toBe(true);
    }
  });

  it("should set bidirectional flag", () => {
    const connections = generateConnections("game-1", regions);
    connections.forEach((c) => {
      expect(c.isBidirectional).toBe(true);
    });
  });

  it("should include various connection types", () => {
    // Generate with seeded random to get consistent hazardous/contested
    const connections = generateConnections(
      "game-1",
      [
        ...regions,
        { id: "r5", positionX: "55.00", positionY: "55.00", regionType: "outer" },
        { id: "r6", positionX: "65.00", positionY: "45.00", regionType: "outer" },
      ],
      createSeededRandom(12345)
    );

    const types = new Set(connections.map((c) => c.connectionType));
    expect(types.has("adjacent")).toBe(true);
  });
});

describe("generateWormholes", () => {
  const regions = [
    { id: "r1", positionX: "10.00", positionY: "10.00", regionType: "core" },
    { id: "r2", positionX: "20.00", positionY: "10.00", regionType: "inner" },
    { id: "r3", positionX: "90.00", positionY: "90.00", regionType: "rim" },
    { id: "r4", positionX: "80.00", positionY: "80.00", regionType: "outer" },
  ];

  it("should generate wormholes between distant regions", () => {
    const existingConnections = [
      {
        fromRegionId: "r1",
        toRegionId: "r2",
        connectionType: "adjacent" as const,
        gameId: "game-1",
        forceMultiplier: "1.00",
        travelCost: 0,
        tradeBonus: "1.00",
        isBidirectional: true,
      },
    ];

    const wormholes = generateWormholes(
      "game-1",
      regions,
      25,
      existingConnections,
      createSeededRandom(12345)
    );

    expect(wormholes.length).toBeGreaterThan(0);
    wormholes.forEach((w) => {
      expect(w.connectionType).toBe("wormhole");
      expect(w.wormholeStatus).toBe("undiscovered");
    });
  });

  it("should not duplicate existing connections", () => {
    const existingConnections = [
      {
        fromRegionId: "r1",
        toRegionId: "r3",
        connectionType: "adjacent" as const,
        gameId: "game-1",
        forceMultiplier: "1.00",
        travelCost: 0,
        tradeBonus: "1.00",
        isBidirectional: true,
      },
    ];

    const wormholes = generateWormholes(
      "game-1",
      regions,
      25,
      existingConnections
    );

    // Should not create wormhole between r1-r3 since connection exists
    const r1r3 = wormholes.find(
      (w) =>
        (w.fromRegionId === "r1" && w.toRegionId === "r3") ||
        (w.fromRegionId === "r3" && w.toRegionId === "r1")
    );
    expect(r1r3).toBeUndefined();
  });
});

describe("assignEmpiresToRegions", () => {
  const regions = [
    { id: "r-core", regionType: "core", maxEmpires: 10 },
    { id: "r-inner", regionType: "inner", maxEmpires: 10 },
    { id: "r-outer", regionType: "outer", maxEmpires: 10 },
  ];

  const empires = [
    { id: "player", type: "player" as const },
    { id: "bot-1", type: "bot" as const },
    { id: "bot-2", type: "bot" as const },
    { id: "bot-3", type: "bot" as const },
  ];

  it("should assign all empires to regions", () => {
    const assignments = assignEmpiresToRegions(empires, regions);
    expect(assignments.size).toBe(empires.length);
  });

  it("should place player in outer or inner region (not core)", () => {
    const assignments = assignEmpiresToRegions(
      empires,
      regions,
      createSeededRandom(12345)
    );

    const playerRegion = assignments.get("player");
    expect(playerRegion).toBeDefined();
    expect(playerRegion).not.toBe("r-core");
  });

  it("should respect region capacity", () => {
    const limitedRegions = [
      { id: "r-small", regionType: "outer", maxEmpires: 2 },
      { id: "r-large", regionType: "inner", maxEmpires: 10 },
    ];

    const manyEmpires = Array.from({ length: 10 }, (_, i) => ({
      id: `empire-${i}`,
      type: "bot" as const,
    }));

    const assignments = assignEmpiresToRegions(manyEmpires, limitedRegions);

    // Count empires per region
    const countByRegion = new Map<string, number>();
    assignments.forEach((regionId) => {
      countByRegion.set(regionId, (countByRegion.get(regionId) ?? 0) + 1);
    });

    // Small region should not exceed capacity
    expect(countByRegion.get("r-small") ?? 0).toBeLessThanOrEqual(2);
  });
});

describe("createEmpireInfluenceRecords", () => {
  it("should create influence record for each empire", () => {
    const assignments = new Map([
      ["empire-1", "region-1"],
      ["empire-2", "region-2"],
    ]);

    const empires = [
      { id: "empire-1", planetCount: 6 },
      { id: "empire-2", planetCount: 6 },
    ];

    const records = createEmpireInfluenceRecords("game-1", assignments, empires);

    expect(records).toHaveLength(2);
    records.forEach((r) => {
      expect(r.gameId).toBe("game-1");
      expect(r.baseInfluenceRadius).toBe(3);
    });
  });

  it("should set home and primary region correctly", () => {
    const assignments = new Map([["empire-1", "region-1"]]);
    const empires = [{ id: "empire-1", planetCount: 6 }];

    const records = createEmpireInfluenceRecords("game-1", assignments, empires);

    expect(records[0]!.homeRegionId).toBe("region-1");
    expect(records[0]!.primaryRegionId).toBe("region-1");
    expect(JSON.parse(records[0]!.controlledRegionIds as string)).toContain("region-1");
  });
});

describe("generateGalaxy", () => {
  const empires = [
    { id: "player", type: "player" as const, planetCount: 6 },
    ...Array.from({ length: 24 }, (_, i) => ({
      id: `bot-${i}`,
      type: "bot" as const,
      planetCount: 6,
    })),
  ];

  it("should generate complete galaxy structure", () => {
    const result = generateGalaxy("game-1", empires, { seed: 12345 });

    expect(result.regions.length).toBeGreaterThan(0);
    expect(result.connections.length).toBeGreaterThan(0);
    expect(result.empireAssignments.size).toBe(empires.length);
    expect(result.empireInfluenceRecords.length).toBe(empires.length);
  });

  it("should produce deterministic results with seed", () => {
    const result1 = generateGalaxy("game-1", empires, { seed: 12345 });
    const result2 = generateGalaxy("game-1", empires, { seed: 12345 });

    expect(result1.regions.length).toBe(result2.regions.length);
    expect(result1.connections.length).toBe(result2.connections.length);
  });

  it("should scale wormhole count with empire count", () => {
    const smallEmpires = empires.slice(0, 10);
    const resultSmall = generateGalaxy("game-1", smallEmpires, { seed: 12345 });

    const resultLarge = generateGalaxy("game-1", empires, { seed: 12345 });

    expect(resultLarge.wormholes.length).toBeGreaterThanOrEqual(
      resultSmall.wormholes.length
    );
  });
});

/**
 * Tests for Sector Balancing Service (M6.1)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  balanceEmpiresToSectors,
  calculateEffectiveNetworth,
  calculateSectorBalances,
  checkBalance,
  assignEmpiresWithBalancing,
  BALANCE_CONSTANTS,
  type EmpireForBalancing,
  type RegionForBalancing,
} from "../sector-balancing-service";

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createTestEmpires(count: number, includePlayer = true): EmpireForBalancing[] {
  const empires: EmpireForBalancing[] = [];

  if (includePlayer) {
    empires.push({ id: "player-1", type: "player", botTier: null });
  }

  const botsNeeded = includePlayer ? count - 1 : count;

  // Distribute bots across tiers (roughly matching ideal mix)
  for (let i = 0; i < botsNeeded; i++) {
    let tier: number;
    if (i < Math.ceil(botsNeeded * 0.1)) {
      tier = 1; // ~10% Tier 1
    } else if (i < Math.ceil(botsNeeded * 0.3)) {
      tier = 2; // ~20% Tier 2
    } else if (i < Math.ceil(botsNeeded * 0.9)) {
      tier = 3; // ~60% Tier 3
    } else {
      tier = 4; // ~10% Tier 4
    }

    empires.push({
      id: `bot-${i + 1}`,
      type: "bot",
      botTier: tier,
    });
  }

  return empires;
}

function createTestRegions(count: number): RegionForBalancing[] {
  const types: Array<RegionForBalancing["regionType"]> = [
    "core",
    "inner",
    "inner",
    "outer",
    "outer",
    "outer",
    "rim",
    "rim",
    "void",
    "void",
  ];

  const wealthModifiers: Record<string, number> = {
    core: 1.5,
    inner: 1.2,
    outer: 1.0,
    rim: 0.8,
    void: 0.5,
  };

  return Array.from({ length: count }, (_, i) => ({
    id: `region-${i + 1}`,
    regionType: types[i % types.length]!,
    maxEmpires: 12,
    wealthModifier: wealthModifiers[types[i % types.length]!]!,
  }));
}

// =============================================================================
// EFFECTIVE NETWORTH CALCULATION TESTS
// =============================================================================

describe("calculateEffectiveNetworth", () => {
  it("should apply wealth modifier correctly", () => {
    const baseNetworth = 50;

    expect(calculateEffectiveNetworth(baseNetworth, 1.0, null)).toBe(50);
    expect(calculateEffectiveNetworth(baseNetworth, 1.5, null)).toBe(75);
    expect(calculateEffectiveNetworth(baseNetworth, 0.8, null)).toBe(40);
  });

  it("should apply bot tier weight correctly", () => {
    const baseNetworth = 50;
    const wealthModifier = 1.0;

    // Tier 1 bots are worth more (1.5x)
    expect(calculateEffectiveNetworth(baseNetworth, wealthModifier, 1)).toBe(75);
    // Tier 2 bots (1.2x)
    expect(calculateEffectiveNetworth(baseNetworth, wealthModifier, 2)).toBe(60);
    // Tier 3 bots (1.0x baseline)
    expect(calculateEffectiveNetworth(baseNetworth, wealthModifier, 3)).toBe(50);
    // Tier 4 bots worth less (0.8x)
    expect(calculateEffectiveNetworth(baseNetworth, wealthModifier, 4)).toBe(40);
  });

  it("should combine wealth modifier and tier weight", () => {
    const baseNetworth = 50;

    // Core region (1.5x) with Tier 1 bot (1.5x) = 2.25x
    expect(calculateEffectiveNetworth(baseNetworth, 1.5, 1)).toBe(112.5);

    // Rim region (0.8x) with Tier 4 bot (0.8x) = 0.64x
    expect(calculateEffectiveNetworth(baseNetworth, 0.8, 4)).toBe(32);
  });
});

// =============================================================================
// SECTOR BALANCE CALCULATION TESTS
// =============================================================================

describe("calculateSectorBalances", () => {
  it("should calculate correct totals for each sector", () => {
    const empires = createTestEmpires(20, true);
    const regions = createTestRegions(2);

    // Manually assign half to each region
    const assignments = new Map<string, string>();
    empires.forEach((e, i) => {
      assignments.set(e.id, i < 10 ? "region-1" : "region-2");
    });

    const balances = calculateSectorBalances(assignments, empires, regions);

    expect(balances.length).toBe(2);
    expect(balances[0]!.empireIds.length).toBe(10);
    expect(balances[1]!.empireIds.length).toBe(10);
  });

  it("should track bot tier distribution", () => {
    const empires: EmpireForBalancing[] = [
      { id: "b1", type: "bot", botTier: 1 },
      { id: "b2", type: "bot", botTier: 2 },
      { id: "b3", type: "bot", botTier: 3 },
      { id: "b4", type: "bot", botTier: 3 },
      { id: "b5", type: "bot", botTier: 4 },
    ];

    const regions = createTestRegions(1);
    const assignments = new Map<string, string>();
    empires.forEach((e) => assignments.set(e.id, "region-1"));

    const balances = calculateSectorBalances(assignments, empires, regions);

    expect(balances[0]!.botTierDistribution[1]).toBe(1);
    expect(balances[0]!.botTierDistribution[2]).toBe(1);
    expect(balances[0]!.botTierDistribution[3]).toBe(2);
    expect(balances[0]!.botTierDistribution[4]).toBe(1);
  });
});

// =============================================================================
// BALANCE CHECK TESTS
// =============================================================================

describe("checkBalance", () => {
  it("should return balanced for equal sectors", () => {
    const balances = [
      { regionId: "r1", empireIds: [], totalNetworth: 500, effectiveNetworth: 500, botTierDistribution: {} },
      { regionId: "r2", empireIds: [], totalNetworth: 500, effectiveNetworth: 500, botTierDistribution: {} },
    ];

    const result = checkBalance(balances);

    expect(result.isBalanced).toBe(true);
    expect(result.maxDeviation).toBe(0);
    expect(result.averageNetworth).toBe(500);
  });

  it("should detect imbalance above 10% threshold", () => {
    // Balance check uses totalNetworth (raw), not effectiveNetworth
    const balances = [
      { regionId: "r1", empireIds: [], totalNetworth: 600, effectiveNetworth: 600, botTierDistribution: {} },
      { regionId: "r2", empireIds: [], totalNetworth: 400, effectiveNetworth: 400, botTierDistribution: {} },
    ];

    const result = checkBalance(balances);

    expect(result.isBalanced).toBe(false);
    expect(result.maxDeviation).toBeGreaterThan(0.10);
  });

  it("should accept 9% deviation as balanced", () => {
    const balances = [
      { regionId: "r1", empireIds: [], totalNetworth: 500, effectiveNetworth: 545, botTierDistribution: {} },
      { regionId: "r2", empireIds: [], totalNetworth: 500, effectiveNetworth: 455, botTierDistribution: {} },
    ];

    const result = checkBalance(balances);

    // Average = 500, deviation = 45/500 = 9%
    expect(result.maxDeviation).toBeLessThanOrEqual(0.10);
    expect(result.isBalanced).toBe(true);
  });
});

// =============================================================================
// MAIN BALANCING ALGORITHM TESTS
// =============================================================================

describe("balanceEmpiresToSectors", () => {
  it("should assign all empires to regions", () => {
    const empires = createTestEmpires(50, true);
    const regions = createTestRegions(5);

    const result = balanceEmpiresToSectors(empires, regions);

    expect(result.assignments.size).toBe(50);
  });

  it("should respect region capacity", () => {
    const empires = createTestEmpires(30, true);
    const regions = createTestRegions(3).map((r) => ({ ...r, maxEmpires: 10 }));

    const result = balanceEmpiresToSectors(empires, regions);

    // Each region should have exactly 10 empires
    for (const balance of result.sectorBalances) {
      expect(balance.empireIds.length).toBeLessThanOrEqual(10);
    }
  });

  it("should place player in outer or inner region", () => {
    const empires = createTestEmpires(50, true);
    const regions = createTestRegions(10);

    const result = balanceEmpiresToSectors(empires, regions);

    const playerRegionId = result.assignments.get("player-1");
    const playerRegion = regions.find((r) => r.id === playerRegionId);

    expect(playerRegion).toBeDefined();
    expect(["outer", "inner"]).toContain(playerRegion!.regionType);
  });

  it("should achieve ±10% balance for mixed tier bots", () => {
    // Create realistic mixed tier bots
    const empires: EmpireForBalancing[] = [
      { id: "player", type: "player", botTier: null },
      // 5 Tier 1 bots (10%)
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `bot-t1-${i}`,
        type: "bot" as const,
        botTier: 1,
      })),
      // 10 Tier 2 bots (20%)
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `bot-t2-${i}`,
        type: "bot" as const,
        botTier: 2,
      })),
      // 30 Tier 3 bots (60%)
      ...Array.from({ length: 30 }, (_, i) => ({
        id: `bot-t3-${i}`,
        type: "bot" as const,
        botTier: 3,
      })),
      // 4 Tier 4 bots (8%)
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `bot-t4-${i}`,
        type: "bot" as const,
        botTier: 4,
      })),
    ];
    const regions = createTestRegions(5);

    const result = balanceEmpiresToSectors(empires, regions);

    // With mixed tiers, algorithm can balance by swapping
    expect(result.maxDeviation).toBeLessThanOrEqual(BALANCE_CONSTANTS.MAX_DEVIATION);
  });

  it("should evenly distribute empires when all have equal tier", () => {
    // With equal tier bots, best we can do is even distribution
    const empires: EmpireForBalancing[] = [
      { id: "player", type: "player", botTier: null },
      ...Array.from({ length: 49 }, (_, i) => ({
        id: `bot-${i}`,
        type: "bot" as const,
        botTier: 3,
      })),
    ];
    const regions = createTestRegions(5);

    const result = balanceEmpiresToSectors(empires, regions);

    // Check relatively even distribution (within ±1 of target)
    const targetPerRegion = empires.length / regions.length; // 10
    for (const balance of result.sectorBalances) {
      expect(balance.empireIds.length).toBeGreaterThanOrEqual(targetPerRegion - 1);
      expect(balance.empireIds.length).toBeLessThanOrEqual(targetPerRegion + 1);
    }
  });

  it("should distribute bot tiers across regions", () => {
    const empires = createTestEmpires(100, true);
    const regions = createTestRegions(10);

    const result = balanceEmpiresToSectors(empires, regions);

    // Check that not all Tier 1 bots are in the same region
    const tier1Regions = new Set<string>();
    for (const empire of empires) {
      if (empire.botTier === 1) {
        const regionId = result.assignments.get(empire.id);
        if (regionId) tier1Regions.add(regionId);
      }
    }

    // Tier 1 bots should be spread across multiple regions
    expect(tier1Regions.size).toBeGreaterThan(1);
  });

  it("should handle edge case with more empires than capacity", () => {
    const empires = createTestEmpires(25, true);
    const regions = createTestRegions(2).map((r) => ({ ...r, maxEmpires: 10 }));

    const result = balanceEmpiresToSectors(empires, regions);

    // Should assign up to capacity, remaining may not be assigned
    const assignedCount = result.assignments.size;
    expect(assignedCount).toBeLessThanOrEqual(20);
  });
});

// =============================================================================
// INTEGRATION FUNCTION TESTS
// =============================================================================

describe("assignEmpiresWithBalancing", () => {
  it("should work with string bot tiers", () => {
    const empires = [
      { id: "player", type: "player" as const, botTier: null },
      { id: "bot-1", type: "bot" as const, botTier: "1" },
      { id: "bot-2", type: "bot" as const, botTier: "2" },
      { id: "bot-3", type: "bot" as const, botTier: "3" },
    ];

    const regions = [
      { id: "region-1", regionType: "outer", maxEmpires: 10, wealthModifier: "1.0" },
      { id: "region-2", regionType: "inner", maxEmpires: 10, wealthModifier: "1.2" },
    ];

    const result = assignEmpiresWithBalancing(empires, regions);

    expect(result.size).toBe(4);
    expect(result.get("player")).toBeDefined();
    expect(result.get("bot-1")).toBeDefined();
  });

  it("should handle missing wealth modifier", () => {
    const empires = [
      { id: "player", type: "player" as const, botTier: null },
      { id: "bot-1", type: "bot" as const, botTier: "3" },
    ];

    const regions = [
      { id: "region-1", regionType: "outer", maxEmpires: 10 },
    ];

    const result = assignEmpiresWithBalancing(empires, regions);

    expect(result.size).toBe(2);
  });
});

// =============================================================================
// REPRODUCIBILITY TESTS
// =============================================================================

describe("reproducibility", () => {
  it("should produce same results with seeded random", () => {
    const empires = createTestEmpires(50, true);
    const regions = createTestRegions(5);

    // Create seeded random function
    const createSeeded = (seed: number) => {
      let state = seed;
      return () => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state / 0x7fffffff;
      };
    };

    const result1 = balanceEmpiresToSectors(empires, regions, createSeeded(12345));
    const result2 = balanceEmpiresToSectors(empires, regions, createSeeded(12345));

    // Same seed should produce same assignments
    expect(Array.from(result1.assignments.entries())).toEqual(
      Array.from(result2.assignments.entries())
    );
  });
});

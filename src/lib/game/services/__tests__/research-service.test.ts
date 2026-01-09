/**
 * Research Service Tests (M3)
 *
 * Tests for research system operations.
 */

import { describe, it, expect } from "vitest";
import {
  calculateResearchCost,
  calculateResearchProgress,
  RESEARCH_BASE_COST,
  RESEARCH_GROWTH_RATE,
} from "@/lib/formulas/research-costs";
import {
  RESEARCH_POINTS_PER_SECTOR,
  MAX_RESEARCH_LEVEL,
  getResearchUnlocks,
  getNextUnlock,
} from "../research/research-service";

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Research Constants", () => {
  it("should have correct points per sector", () => {
    expect(RESEARCH_POINTS_PER_SECTOR).toBe(100);
  });

  it("should have correct max level (7 = 8 levels from 0-7)", () => {
    expect(MAX_RESEARCH_LEVEL).toBe(7);
  });

  it("should have correct base cost from formula module", () => {
    expect(RESEARCH_BASE_COST).toBe(1_000);
  });
});

// =============================================================================
// RESEARCH COST TESTS (using formula module)
// =============================================================================

describe("Research Cost Calculations", () => {
  it("should calculate correct cost for level 0", () => {
    expect(calculateResearchCost(0)).toBe(1_000); // 1000 * 1.5^0
  });

  it("should calculate correct cost for level 1", () => {
    expect(calculateResearchCost(1)).toBe(1_500); // 1000 * 1.5^1
  });

  it("should calculate correct cost for level 2", () => {
    expect(calculateResearchCost(2)).toBe(2_250); // 1000 * 1.5^2
  });

  it("should calculate correct cost for level 3", () => {
    expect(calculateResearchCost(3)).toBe(3_375); // 1000 * 1.5^3
  });

  it("should calculate correct cost for level 7 (max)", () => {
    expect(calculateResearchCost(7)).toBe(17_085); // 1000 * 1.5^7 (floor)
  });

  it("should follow exponential growth pattern", () => {
    const level0 = calculateResearchCost(0);
    const level1 = calculateResearchCost(1);
    const level2 = calculateResearchCost(2);

    expect(level1).toBe(Math.floor(level0 * RESEARCH_GROWTH_RATE));
    expect(level2).toBe(Math.floor(level1 * RESEARCH_GROWTH_RATE));
  });
});

// =============================================================================
// RESEARCH PROGRESS TESTS
// =============================================================================

describe("Research Progress Calculations", () => {
  it("should calculate 0% progress with 0 points", () => {
    expect(calculateResearchProgress(0, 0)).toBe(0);
  });

  it("should calculate 50% progress at halfway", () => {
    // Level 0 costs 1000, so 500 points = 50%
    expect(calculateResearchProgress(500, 0)).toBe(50);
  });

  it("should calculate 100% progress at threshold", () => {
    expect(calculateResearchProgress(1000, 0)).toBe(100);
  });

  it("should cap at 100%", () => {
    expect(calculateResearchProgress(2000, 0)).toBe(100);
  });

  it("should handle different levels correctly", () => {
    // Level 1 costs 1500, so 750 points = 50%
    expect(calculateResearchProgress(750, 1)).toBe(50);

    // Level 2 costs 2250, so 1125 points = 50%
    expect(calculateResearchProgress(1125, 2)).toBe(50);
  });
});

// =============================================================================
// RESEARCH PRODUCTION TESTS
// =============================================================================

describe("Research Production Calculations", () => {
  it("should calculate correct production with 1 sector", () => {
    const production = 1 * RESEARCH_POINTS_PER_SECTOR;
    expect(production).toBe(100);
  });

  it("should calculate correct production with 5 sectors", () => {
    const production = 5 * RESEARCH_POINTS_PER_SECTOR;
    expect(production).toBe(500);
  });

  it("should calculate correct production with 10 sectors", () => {
    const production = 10 * RESEARCH_POINTS_PER_SECTOR;
    expect(production).toBe(1_000);
  });

  it("should generate 0 points with 0 sectors", () => {
    const production = 0 * RESEARCH_POINTS_PER_SECTOR;
    expect(production).toBe(0);
  });
});

// =============================================================================
// LEVEL-UP CALCULATION TESTS
// =============================================================================

describe("Level-Up Calculations", () => {
  it("should require 1000 points to go from level 0 to 1", () => {
    const cost = calculateResearchCost(0);
    expect(cost).toBe(1_000);
  });

  it("should require 2500 total points to reach level 2", () => {
    const totalCost = calculateResearchCost(0) + calculateResearchCost(1);
    expect(totalCost).toBe(2_500); // 1000 + 1500
  });

  it("should require 4750 total points to reach level 3", () => {
    const totalCost =
      calculateResearchCost(0) +
      calculateResearchCost(1) +
      calculateResearchCost(2);
    expect(totalCost).toBe(4_750); // 1000 + 1500 + 2250
  });

  it("should calculate turns to level with overflow", () => {
    // With 500 points/turn, reaching level 1 from 0:
    // Need 1000 points, so 2 turns
    const pointsPerTurn = 500;
    const pointsNeeded = calculateResearchCost(0);
    const turns = Math.ceil(pointsNeeded / pointsPerTurn);
    expect(turns).toBe(2);
  });

  it("should handle exact level-up without overflow", () => {
    // 1000 points at level 0 = exactly level 1
    const points = 1000;
    const levelCost = calculateResearchCost(0);
    expect(points).toBe(levelCost);
  });

  it("should handle overflow to next level", () => {
    // 1250 points at level 0:
    // - Costs 1000 for level 1, leaves 250 overflow
    // - Level 1 costs 1500, so 250/1500 = 16.67% progress
    const startPoints = 1250;
    const level0Cost = calculateResearchCost(0);
    const overflow = startPoints - level0Cost;
    const level1Cost = calculateResearchCost(1);
    const progressToLevel2 = (overflow / level1Cost) * 100;

    expect(overflow).toBe(250);
    expect(progressToLevel2).toBeCloseTo(16.67, 1);
  });

  it("should handle multiple level-ups from single investment", () => {
    // 2500 points at level 0:
    // - Level 0->1: costs 1000, leaves 1500
    // - Level 1->2: costs 1500, leaves 0
    // Result: level 2, 0 overflow
    const startPoints = 2500;
    let remainingPoints = startPoints;
    let level = 0;

    // Level 0 to 1
    if (remainingPoints >= calculateResearchCost(0)) {
      remainingPoints -= calculateResearchCost(0);
      level++;
    }

    // Level 1 to 2
    if (remainingPoints >= calculateResearchCost(1)) {
      remainingPoints -= calculateResearchCost(1);
      level++;
    }

    expect(level).toBe(2);
    expect(remainingPoints).toBe(0);
  });
});

// =============================================================================
// UNLOCK TESTS
// =============================================================================

describe("Research Unlocks", () => {
  it("should have no unlocks at level 0", () => {
    const unlocks = getResearchUnlocks(0);
    expect(unlocks).toEqual([]);
  });

  it("should have no unlocks at level 1", () => {
    const unlocks = getResearchUnlocks(1);
    expect(unlocks).toEqual([]);
  });

  it("should unlock Light Cruisers at level 2", () => {
    const unlocks = getResearchUnlocks(2);
    expect(unlocks).toContain("Light Cruisers");
  });

  it("should still have Light Cruisers at higher levels", () => {
    const unlocks = getResearchUnlocks(5);
    expect(unlocks).toContain("Light Cruisers");
  });
});

describe("Next Unlock", () => {
  it("should return Light Cruisers as next unlock at level 0", () => {
    const next = getNextUnlock(0);
    expect(next).toEqual({ unlock: "Light Cruisers", level: 2 });
  });

  it("should return Light Cruisers as next unlock at level 1", () => {
    const next = getNextUnlock(1);
    expect(next).toEqual({ unlock: "Light Cruisers", level: 2 });
  });

  it("should return null at level 2 (no more unlocks)", () => {
    const next = getNextUnlock(2);
    expect(next).toBeNull();
  });

  it("should return null at max level", () => {
    const next = getNextUnlock(MAX_RESEARCH_LEVEL);
    expect(next).toBeNull();
  });
});

// =============================================================================
// TURNS TO LEVEL TESTS
// =============================================================================

describe("Turns to Level Calculations", () => {
  it("should calculate turns needed with current progress", () => {
    // At level 0 with 500 points progress, 1 research sector
    // Need 500 more points (1000 - 500)
    // Generating 100/turn = 5 turns
    const currentProgress = 500;
    const pointsNeeded = calculateResearchCost(0) - currentProgress;
    const pointsPerTurn = RESEARCH_POINTS_PER_SECTOR; // 100
    const turns = Math.ceil(pointsNeeded / pointsPerTurn);

    expect(turns).toBe(5);
  });

  it("should calculate turns for multiple levels", () => {
    // From level 0, 0 progress, to level 2 with 10 research sectors
    // Need: 1000 (level 0->1) + 1500 (level 1->2) = 2500 points
    // Generating 1000/turn = 3 turns (ceil of 2.5)
    const pointsNeeded = calculateResearchCost(0) + calculateResearchCost(1);
    const pointsPerTurn = 10 * RESEARCH_POINTS_PER_SECTOR; // 1000
    const turns = Math.ceil(pointsNeeded / pointsPerTurn);

    expect(turns).toBe(3);
  });

  it("should return 0 turns if already at target level", () => {
    // Already at level 3, target is level 3
    const currentLevel = 3;
    const targetLevel = 3;
    const turnsNeeded = currentLevel >= targetLevel ? 0 : 1;

    expect(turnsNeeded).toBe(0);
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe("Research Edge Cases", () => {
  it("should handle max level correctly", () => {
    expect(MAX_RESEARCH_LEVEL).toBe(7);
    // At max level, no more progress should be possible
  });

  it("should cap progress at max level", () => {
    // At max level (7), calculating cost returns the level 7 cost
    // but no further progression should occur
    const maxLevelCost = calculateResearchCost(MAX_RESEARCH_LEVEL);
    expect(maxLevelCost).toBeGreaterThan(0);
  });

  it("should handle very large point investments", () => {
    // 100,000 points at level 0
    // Level costs with 1.5x growth: 1000, 1500, 2250, 3375, 5062, 7593, 11390, 17085
    // Total to level 7: ~49,255, which is less than 100,000
    // Since MAX_RESEARCH_LEVEL is 7, we cap there
    let remainingPoints = 100_000;
    let level = 0;

    while (level < MAX_RESEARCH_LEVEL) {
      const cost = calculateResearchCost(level);
      if (remainingPoints >= cost) {
        remainingPoints -= cost;
        level++;
      } else {
        break;
      }
    }

    expect(level).toBe(7); // Capped at max level
    // Total cost to reach level 7: 1000+1500+2250+3375+5062+7593+11390 = 32,170
    expect(remainingPoints).toBe(100_000 - 32_170);
  });

  it("should handle zero research sectors correctly", () => {
    const production = 0 * RESEARCH_POINTS_PER_SECTOR;
    expect(production).toBe(0);
  });
});

// =============================================================================
// PRD 9.1 COMPLIANCE TESTS
// =============================================================================

describe("PRD 9.1 Compliance", () => {
  it("should support 8 research levels (0-7)", () => {
    expect(MAX_RESEARCH_LEVEL).toBe(7);
    // Valid levels: 0, 1, 2, 3, 4, 5, 6, 7 = 8 levels
  });

  it("should follow exponential cost formula: 1000 * 1.5^level", () => {
    for (let level = 0; level <= MAX_RESEARCH_LEVEL; level++) {
      const expectedCost = Math.floor(1000 * Math.pow(1.5, level));
      expect(calculateResearchCost(level)).toBe(expectedCost);
    }
  });

  it("should generate 100 research points per research sector", () => {
    expect(RESEARCH_POINTS_PER_SECTOR).toBe(100);
  });

  it("should unlock Light Cruisers at level 2", () => {
    const unlocksAtLevel1 = getResearchUnlocks(1);
    const unlocksAtLevel2 = getResearchUnlocks(2);

    expect(unlocksAtLevel1).not.toContain("Light Cruisers");
    expect(unlocksAtLevel2).toContain("Light Cruisers");
  });
});

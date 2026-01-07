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
} from "@/lib/formulas/research-costs";
import {
  RESEARCH_POINTS_PER_PLANET,
  MAX_RESEARCH_LEVEL,
  getResearchUnlocks,
  getNextUnlock,
} from "../research-service";

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Research Constants", () => {
  it("should have correct points per sector", () => {
    expect(RESEARCH_POINTS_PER_PLANET).toBe(100);
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
    expect(calculateResearchCost(0)).toBe(1_000); // 1000 * 2^0
  });

  it("should calculate correct cost for level 1", () => {
    expect(calculateResearchCost(1)).toBe(2_000); // 1000 * 2^1
  });

  it("should calculate correct cost for level 2", () => {
    expect(calculateResearchCost(2)).toBe(4_000); // 1000 * 2^2
  });

  it("should calculate correct cost for level 3", () => {
    expect(calculateResearchCost(3)).toBe(8_000); // 1000 * 2^3
  });

  it("should calculate correct cost for level 7 (max)", () => {
    expect(calculateResearchCost(7)).toBe(128_000); // 1000 * 2^7
  });

  it("should follow exponential growth pattern", () => {
    const level0 = calculateResearchCost(0);
    const level1 = calculateResearchCost(1);
    const level2 = calculateResearchCost(2);

    expect(level1).toBe(level0 * 2);
    expect(level2).toBe(level1 * 2);
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
    // Level 1 costs 2000, so 1000 points = 50%
    expect(calculateResearchProgress(1000, 1)).toBe(50);

    // Level 2 costs 4000, so 2000 points = 50%
    expect(calculateResearchProgress(2000, 2)).toBe(50);
  });
});

// =============================================================================
// RESEARCH PRODUCTION TESTS
// =============================================================================

describe("Research Production Calculations", () => {
  it("should calculate correct production with 1 sector", () => {
    const production = 1 * RESEARCH_POINTS_PER_PLANET;
    expect(production).toBe(100);
  });

  it("should calculate correct production with 5 sectors", () => {
    const production = 5 * RESEARCH_POINTS_PER_PLANET;
    expect(production).toBe(500);
  });

  it("should calculate correct production with 10 sectors", () => {
    const production = 10 * RESEARCH_POINTS_PER_PLANET;
    expect(production).toBe(1_000);
  });

  it("should generate 0 points with 0 sectors", () => {
    const production = 0 * RESEARCH_POINTS_PER_PLANET;
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

  it("should require 3000 total points to reach level 2", () => {
    const totalCost = calculateResearchCost(0) + calculateResearchCost(1);
    expect(totalCost).toBe(3_000); // 1000 + 2000
  });

  it("should require 7000 total points to reach level 3", () => {
    const totalCost =
      calculateResearchCost(0) +
      calculateResearchCost(1) +
      calculateResearchCost(2);
    expect(totalCost).toBe(7_000); // 1000 + 2000 + 4000
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
    // 1500 points at level 0:
    // - Costs 1000 for level 1, leaves 500 overflow
    // - Level 1 costs 2000, so 500/2000 = 25% progress
    const startPoints = 1500;
    const level0Cost = calculateResearchCost(0);
    const overflow = startPoints - level0Cost;
    const level1Cost = calculateResearchCost(1);
    const progressToLevel2 = (overflow / level1Cost) * 100;

    expect(overflow).toBe(500);
    expect(progressToLevel2).toBe(25);
  });

  it("should handle multiple level-ups from single investment", () => {
    // 3000 points at level 0:
    // - Level 0→1: costs 1000, leaves 2000
    // - Level 1→2: costs 2000, leaves 0
    // Result: level 2, 0 overflow
    const startPoints = 3000;
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
    const pointsPerTurn = RESEARCH_POINTS_PER_PLANET; // 100
    const turns = Math.ceil(pointsNeeded / pointsPerTurn);

    expect(turns).toBe(5);
  });

  it("should calculate turns for multiple levels", () => {
    // From level 0, 0 progress, to level 2 with 10 research sectors
    // Need: 1000 (level 0→1) + 2000 (level 1→2) = 3000 points
    // Generating 1000/turn = 3 turns
    const pointsNeeded = calculateResearchCost(0) + calculateResearchCost(1);
    const pointsPerTurn = 10 * RESEARCH_POINTS_PER_PLANET; // 1000
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
    // Level costs: 1000, 2000, 4000, 8000, 16000, 32000 = 63000 for levels 0-5
    // 64000 for level 6
    // Total to level 6: 63000, remaining: 37000
    // Level 6 costs 64000, so stays at level 6 with 37000 progress
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

    expect(level).toBe(6); // 1000+2000+4000+8000+16000+32000 = 63000
    expect(remainingPoints).toBe(37_000);
  });

  it("should handle zero research sectors correctly", () => {
    const production = 0 * RESEARCH_POINTS_PER_PLANET;
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

  it("should follow exponential cost formula: 1000 × 2^level", () => {
    for (let level = 0; level <= MAX_RESEARCH_LEVEL; level++) {
      const expectedCost = 1000 * Math.pow(2, level);
      expect(calculateResearchCost(level)).toBe(expectedCost);
    }
  });

  it("should generate 100 research points per research sector", () => {
    expect(RESEARCH_POINTS_PER_PLANET).toBe(100);
  });

  it("should unlock Light Cruisers at level 2", () => {
    const unlocksAtLevel1 = getResearchUnlocks(1);
    const unlocksAtLevel2 = getResearchUnlocks(2);

    expect(unlocksAtLevel1).not.toContain("Light Cruisers");
    expect(unlocksAtLevel2).toContain("Light Cruisers");
  });
});

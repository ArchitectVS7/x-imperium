import { describe, it, expect } from "vitest";
import {
  calculateResearchCost,
  calculateTotalResearchCost,
  calculateResearchUpgradeCost,
  calculateMaxResearchLevel,
  calculateResearchProgress,
  calculateTurnsToResearchLevel,
  RESEARCH_BASE_COST,
  RESEARCH_GROWTH_RATE,
  RESEARCH_MAX_LEVEL,
} from "./research-costs";

describe("calculateResearchCost", () => {
  it("returns base cost for level 0", () => {
    expect(calculateResearchCost(0)).toBe(RESEARCH_BASE_COST);
    expect(calculateResearchCost(0)).toBe(1_000);
  });

  it("applies 1.5x cost multiplier each level (exponential growth)", () => {
    // Level 1: 1,000 * 1.5^1 = 1,500
    expect(calculateResearchCost(1)).toBe(1_500);
    // Level 2: 1,000 * 1.5^2 = 2,250
    expect(calculateResearchCost(2)).toBe(2_250);
    // Level 3: 1,000 * 1.5^3 = 3,375
    expect(calculateResearchCost(3)).toBe(3_375);
  });

  it("calculates correct cost for level 10", () => {
    // Level 10: 1,000 * 1.5^10 = 57,665 (floor)
    expect(calculateResearchCost(10)).toBe(57_665);
  });

  it("returns 0 for negative levels", () => {
    expect(calculateResearchCost(-1)).toBe(0);
    expect(calculateResearchCost(-10)).toBe(0);
  });

  it("caps at max level", () => {
    const maxCost = calculateResearchCost(RESEARCH_MAX_LEVEL);
    const beyondMaxCost = calculateResearchCost(RESEARCH_MAX_LEVEL + 10);
    expect(beyondMaxCost).toBe(maxCost);
  });
});

describe("calculateTotalResearchCost", () => {
  it("returns 0 for level 0 or negative", () => {
    expect(calculateTotalResearchCost(0)).toBe(0);
    expect(calculateTotalResearchCost(-5)).toBe(0);
  });

  it("returns base cost for level 1", () => {
    // Only level 0 needs to be completed: 1,000
    expect(calculateTotalResearchCost(1)).toBe(1_000);
  });

  it("calculates cumulative cost", () => {
    // Level 0: 1,000
    // Level 1: 1,500
    // Level 2: 2,250
    // Total to reach level 3: 4,750
    expect(calculateTotalResearchCost(3)).toBe(4_750);
  });

  it("calculates correct total for level 5", () => {
    // Levels 0-4: 1,000 + 1,500 + 2,250 + 3,375 + 5,062 = 13,187
    expect(calculateTotalResearchCost(5)).toBe(13_187);
  });
});

describe("calculateResearchUpgradeCost", () => {
  it("returns 0 when target is same as current", () => {
    expect(calculateResearchUpgradeCost(5, 5)).toBe(0);
  });

  it("returns 0 when target is less than current", () => {
    expect(calculateResearchUpgradeCost(5, 3)).toBe(0);
  });

  it("calculates cost for single level upgrade", () => {
    // From level 0 to 1: cost of level 0 = 1,000
    expect(calculateResearchUpgradeCost(0, 1)).toBe(1_000);
    // From level 5 to 6: cost of level 5 = 7,593
    expect(calculateResearchUpgradeCost(5, 6)).toBe(7_593);
  });

  it("calculates cost for multiple level upgrade", () => {
    // From level 2 to 5: levels 2, 3, 4 = 2,250 + 3,375 + 5,062 = 10,687
    expect(calculateResearchUpgradeCost(2, 5)).toBe(10_687);
  });

  it("handles negative from level as 0", () => {
    expect(calculateResearchUpgradeCost(-5, 2)).toBe(calculateTotalResearchCost(2));
  });
});

describe("calculateMaxResearchLevel", () => {
  it("returns current level for 0 points", () => {
    expect(calculateMaxResearchLevel(0, 0)).toBe(0);
    expect(calculateMaxResearchLevel(0, 5)).toBe(5);
  });

  it("returns current level for negative points", () => {
    expect(calculateMaxResearchLevel(-1000, 5)).toBe(5);
  });

  it("returns next level when points are exact", () => {
    // Exactly 1,000 points gets you from level 0 to 1
    expect(calculateMaxResearchLevel(1_000, 0)).toBe(1);
  });

  it("calculates correct level for surplus points", () => {
    // 4,750 points from level 0: can reach level 3 (1,000 + 1,500 + 2,250 = 4,750)
    expect(calculateMaxResearchLevel(4_750, 0)).toBe(3);
  });

  it("does not exceed max level", () => {
    // With enough points to reach level 50, we cap at max level
    const totalCostToMax = calculateTotalResearchCost(RESEARCH_MAX_LEVEL);
    expect(calculateMaxResearchLevel(totalCostToMax * 10, 0)).toBe(RESEARCH_MAX_LEVEL);
  });

  it("works from non-zero starting level", () => {
    // 5,625 points from level 2: can buy level 2 (2,250) and level 3 (3,375)
    expect(calculateMaxResearchLevel(5_625, 2)).toBe(4);
  });
});

describe("calculateResearchProgress", () => {
  it("returns 0 for 0 points", () => {
    expect(calculateResearchProgress(0, 0)).toBe(0);
  });

  it("returns 50 for half the required points", () => {
    // Level 0 costs 1,000, 500 points = 50%
    expect(calculateResearchProgress(500, 0)).toBe(50);
  });

  it("returns 100 for full points", () => {
    expect(calculateResearchProgress(1_000, 0)).toBe(100);
  });

  it("caps at 100 for excess points", () => {
    expect(calculateResearchProgress(2_000, 0)).toBe(100);
  });

  it("handles max level progress", () => {
    // At max level, cost is still calculated (capped at max level cost)
    const maxLevelCost = calculateResearchCost(RESEARCH_MAX_LEVEL);
    expect(calculateResearchProgress(maxLevelCost, RESEARCH_MAX_LEVEL)).toBe(100);
  });
});

describe("calculateTurnsToResearchLevel", () => {
  it("returns 0 when already at target", () => {
    expect(calculateTurnsToResearchLevel(5, 0, 100, 5)).toBe(0);
    expect(calculateTurnsToResearchLevel(5, 0, 100, 3)).toBe(0);
  });

  it("returns Infinity for 0 points per turn", () => {
    expect(calculateTurnsToResearchLevel(0, 0, 0, 5)).toBe(Infinity);
  });

  it("calculates turns for single level", () => {
    // Level 0 costs 1,000, 100 points/turn = 10 turns
    expect(calculateTurnsToResearchLevel(0, 0, 100, 1)).toBe(10);
  });

  it("accounts for current progress", () => {
    // Level 0 costs 1,000, already have 500, 100 points/turn = 5 turns
    expect(calculateTurnsToResearchLevel(0, 500, 100, 1)).toBe(5);
  });

  it("calculates turns for multiple levels", () => {
    // From 0 to 2: 1,000 + 1,500 = 2,500
    // At 100/turn = 25 turns
    expect(calculateTurnsToResearchLevel(0, 0, 100, 2)).toBe(25);
  });

  it("rounds up partial turns", () => {
    // 999 points needed, 100/turn = 10 turns (ceil)
    expect(calculateTurnsToResearchLevel(0, 1, 100, 1)).toBe(10);
  });
});

describe("constants", () => {
  it("has correct PRD values", () => {
    expect(RESEARCH_BASE_COST).toBe(1_000);
    expect(RESEARCH_GROWTH_RATE).toBe(1.5);
  });

  it("has reasonable max level", () => {
    expect(RESEARCH_MAX_LEVEL).toBe(50);
  });
});

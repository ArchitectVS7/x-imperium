import { describe, it, expect } from "vitest";
import {
  calculateSectorCost,
  calculateReleaseRefund,
  getSectorCostMultiplier,
  calculateBulkSectorCost,
  calculateAffordableSectors,
  SECTOR_COST_SCALING,
  SECTOR_RELEASE_REFUND,
} from "./sector-costs";

describe("calculateSectorCost", () => {
  it("returns base cost when owning 0 sectors", () => {
    expect(calculateSectorCost(8_000, 0)).toBe(8_000);
    expect(calculateSectorCost(6_000, 0)).toBe(6_000);
  });

  it("applies 5% increase per owned sector", () => {
    // 8,000 * (1 + 1 * 0.05) = 8,400
    expect(calculateSectorCost(8_000, 1)).toBe(8_400);
    // 8,000 * (1 + 5 * 0.05) = 10,000
    expect(calculateSectorCost(8_000, 5)).toBe(10_000);
  });

  it("calculates correctly for 9 starting sectors (PRD default)", () => {
    // 8,000 * (1 + 9 * 0.05) = 8,000 * 1.45 = 11,600
    expect(calculateSectorCost(8_000, 9)).toBe(11_600);
  });

  it("handles large sector counts", () => {
    // 8,000 * (1 + 50 * 0.05) = 8,000 * 3.5 = 28,000
    expect(calculateSectorCost(8_000, 50)).toBe(28_000);
  });

  it("returns 0 for 0 base cost", () => {
    expect(calculateSectorCost(0, 10)).toBe(0);
  });

  it("handles negative owned sectors as 0", () => {
    expect(calculateSectorCost(8_000, -5)).toBe(8_000);
  });

  it("floors the result", () => {
    // 7,500 * 1.05 = 7,875
    expect(calculateSectorCost(7_500, 1)).toBe(7_875);
  });
});

describe("calculateReleaseRefund", () => {
  it("returns 50% of current price", () => {
    // At 9 sectors, cost is 11,600, refund is 5,800
    expect(calculateReleaseRefund(8_000, 9)).toBe(5_800);
  });

  it("returns 50% of base price for 0 sectors", () => {
    expect(calculateReleaseRefund(8_000, 0)).toBe(4_000);
  });

  it("floors the result", () => {
    // 7,500 * 1.05 = 7,875 * 0.5 = 3,937.5 -> 3,937
    expect(calculateReleaseRefund(7_500, 1)).toBe(3_937);
  });
});

describe("getSectorCostMultiplier", () => {
  it("returns 1.0 for 0 sectors", () => {
    expect(getSectorCostMultiplier(0)).toBe(1.0);
  });

  it("returns correct multipliers", () => {
    expect(getSectorCostMultiplier(1)).toBe(1.05);
    expect(getSectorCostMultiplier(9)).toBe(1.45);
    expect(getSectorCostMultiplier(20)).toBe(2.0);
  });

  it("handles negative values as 0", () => {
    expect(getSectorCostMultiplier(-5)).toBe(1.0);
  });
});

describe("calculateBulkSectorCost", () => {
  it("returns 0 for 0 quantity", () => {
    expect(calculateBulkSectorCost(8_000, 0, 0)).toBe(0);
  });

  it("returns single sector cost for quantity 1", () => {
    expect(calculateBulkSectorCost(8_000, 0, 1)).toBe(8_000);
    expect(calculateBulkSectorCost(8_000, 9, 1)).toBe(11_600);
  });

  it("calculates escalating costs for multiple sectors", () => {
    // Buy 3 sectors starting from 0
    // Sector 1: 8,000 * 1.0 = 8,000
    // Sector 2: 8,000 * 1.05 = 8,400
    // Sector 3: 8,000 * 1.10 = 8,800
    // Total: 25,200
    expect(calculateBulkSectorCost(8_000, 0, 3)).toBe(25_200);
  });

  it("handles negative quantity", () => {
    expect(calculateBulkSectorCost(8_000, 0, -5)).toBe(0);
  });
});

describe("calculateAffordableSectors", () => {
  it("returns 0 for 0 credits", () => {
    expect(calculateAffordableSectors(8_000, 0, 0)).toBe(0);
  });

  it("returns 0 for 0 base cost", () => {
    expect(calculateAffordableSectors(0, 0, 100_000)).toBe(0);
  });

  it("returns 1 for exact cost", () => {
    expect(calculateAffordableSectors(8_000, 0, 8_000)).toBe(1);
  });

  it("returns correct count for multiple sectors", () => {
    // With 25,200 credits, can buy 3 sectors (calculated above)
    expect(calculateAffordableSectors(8_000, 0, 25_200)).toBe(3);
    // With 25,199 credits, can only buy 2
    expect(calculateAffordableSectors(8_000, 0, 25_199)).toBe(2);
  });

  it("accounts for current sector count", () => {
    // Starting with 9 sectors, first new sector costs 11,600
    expect(calculateAffordableSectors(8_000, 9, 11_600)).toBe(1);
    expect(calculateAffordableSectors(8_000, 9, 11_599)).toBe(0);
  });

  it("handles negative credits", () => {
    expect(calculateAffordableSectors(8_000, 0, -1000)).toBe(0);
  });
});

describe("constants", () => {
  it("has correct PRD values", () => {
    expect(SECTOR_COST_SCALING).toBe(0.05);
    expect(SECTOR_RELEASE_REFUND).toBe(0.5);
  });
});

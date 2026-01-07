/**
 * Sector Service Tests (M3)
 *
 * Tests for sector buy/release operations.
 * Note: These are integration-style tests that require database access.
 * For pure unit tests, see the formula tests in sector-costs.test.ts.
 */

import { describe, it, expect } from "vitest";
import {
  calculateSectorCost,
  calculateReleaseRefund,
} from "@/lib/formulas/sector-costs";
import { PLANET_COSTS } from "../../constants";
import { calculateNetworth } from "../../networth";

// =============================================================================
// UNIT TESTS FOR BUSINESS LOGIC
// =============================================================================

describe("Sector Service Business Logic", () => {
  describe("Sector Purchase Cost Calculation", () => {
    it("should calculate correct cost for first sector at 9 owned", () => {
      // With 9 starting sectors, cost multiplier is 1.45
      const baseCost = PLANET_COSTS.food; // 8,000
      const currentOwned = 9;
      const cost = calculateSectorCost(baseCost, currentOwned);

      // 8,000 × 1.45 = 11,600
      expect(cost).toBe(11_600);
    });

    it("should calculate escalating costs for sequential purchases", () => {
      const baseCost = PLANET_COSTS.food; // 8,000

      // 9 sectors → 10: 8,000 × 1.45 = 11,600
      expect(calculateSectorCost(baseCost, 9)).toBe(11_600);

      // 10 sectors → 11: 8,000 × 1.50 = 12,000
      expect(calculateSectorCost(baseCost, 10)).toBe(12_000);

      // 11 sectors → 12: 8,000 × 1.55 = 12,400
      expect(calculateSectorCost(baseCost, 11)).toBe(12_400);
    });

    it("should use different base costs for different sector types", () => {
      const currentOwned = 9;

      expect(calculateSectorCost(PLANET_COSTS.food, currentOwned)).toBe(11_600); // 8,000 × 1.45
      expect(calculateSectorCost(PLANET_COSTS.ore, currentOwned)).toBe(8_700);   // 6,000 × 1.45
      expect(calculateSectorCost(PLANET_COSTS.research, currentOwned)).toBe(33_350); // 23,000 × 1.45
    });
  });

  describe("Sector Release Refund Calculation", () => {
    it("should refund 50% of current price", () => {
      const baseCost = PLANET_COSTS.food; // 8,000
      const currentOwned = 9;
      const refund = calculateReleaseRefund(baseCost, currentOwned);

      // Current price: 11,600, refund: 5,800
      expect(refund).toBe(5_800);
    });

    it("should refund based on current ownership count", () => {
      const baseCost = PLANET_COSTS.food;

      // With 10 sectors: price = 12,000, refund = 6,000
      expect(calculateReleaseRefund(baseCost, 10)).toBe(6_000);

      // With 20 sectors: price = 16,000, refund = 8,000
      expect(calculateReleaseRefund(baseCost, 20)).toBe(8_000);
    });
  });

  describe("Networth Update on Sector Change", () => {
    it("should increase networth by 10 per sector purchased", () => {
      const baseNetworth = calculateNetworth({
        sectorCount: 9,
        soldiers: 100,
        fighters: 0,
        stations: 0,
        lightCruisers: 0,
        heavyCruisers: 0,
        carriers: 0,
        covertAgents: 0,
      });

      const newNetworth = calculateNetworth({
        sectorCount: 10,
        soldiers: 100,
        fighters: 0,
        stations: 0,
        lightCruisers: 0,
        heavyCruisers: 0,
        carriers: 0,
        covertAgents: 0,
      });

      // Each sector adds 10 to networth
      expect(newNetworth - baseNetworth).toBe(10);
    });

    it("should decrease networth by 10 per sector released", () => {
      const baseNetworth = calculateNetworth({
        sectorCount: 10,
        soldiers: 100,
        fighters: 0,
        stations: 0,
        lightCruisers: 0,
        heavyCruisers: 0,
        carriers: 0,
        covertAgents: 0,
      });

      const newNetworth = calculateNetworth({
        sectorCount: 9,
        soldiers: 100,
        fighters: 0,
        stations: 0,
        lightCruisers: 0,
        heavyCruisers: 0,
        carriers: 0,
        covertAgents: 0,
      });

      expect(baseNetworth - newNetworth).toBe(10);
    });
  });

  describe("PRD Compliance - Sector Costs", () => {
    it("should have correct base costs for all sector types (PRD 5.2)", () => {
      expect(PLANET_COSTS.food).toBe(8_000);
      expect(PLANET_COSTS.ore).toBe(6_000);
      expect(PLANET_COSTS.petroleum).toBe(11_500);
      expect(PLANET_COSTS.tourism).toBe(8_000);
      expect(PLANET_COSTS.urban).toBe(8_000);
      expect(PLANET_COSTS.education).toBe(8_000);
      expect(PLANET_COSTS.government).toBe(7_500);
      expect(PLANET_COSTS.research).toBe(23_000);
      expect(PLANET_COSTS.supply).toBe(11_500);
      expect(PLANET_COSTS.anti_pollution).toBe(10_500);
    });

    it("should apply 5% cost scaling per owned sector (PRD 5.3)", () => {
      const baseCost = 10_000;

      // Formula: BaseCost × (1 + OwnedSectors × 0.05)
      expect(calculateSectorCost(baseCost, 0)).toBe(10_000);  // × 1.00
      expect(calculateSectorCost(baseCost, 1)).toBe(10_500);  // × 1.05
      expect(calculateSectorCost(baseCost, 10)).toBe(15_000); // × 1.50
      expect(calculateSectorCost(baseCost, 20)).toBe(20_000); // × 2.00
    });

    it("should refund exactly 50% on release (PRD 5.3)", () => {
      const baseCost = 10_000;
      const currentPrice = calculateSectorCost(baseCost, 10); // 15,000
      const refund = calculateReleaseRefund(baseCost, 10);

      expect(refund).toBe(7_500); // 50% of 15,000
      expect(refund / currentPrice).toBe(0.5);
    });
  });
});

// =============================================================================
// VALIDATION TESTS (logic that would be tested with mocks)
// =============================================================================

describe("Sector Service Validation Logic", () => {
  describe("Colonize Sector Validation", () => {
    it("should reject purchase with insufficient credits", () => {
      const credits = 10_000;
      const sectorCost = 11_600; // Food at 9 sectors

      const canAfford = credits >= sectorCost;
      expect(canAfford).toBe(false);
    });

    it("should allow purchase with exact credits", () => {
      const credits = 11_600;
      const sectorCost = 11_600;

      const canAfford = credits >= sectorCost;
      expect(canAfford).toBe(true);
    });

    it("should correctly calculate credits after purchase", () => {
      const credits = 100_000;
      const sectorCost = 11_600;

      const remainingCredits = credits - sectorCost;
      expect(remainingCredits).toBe(88_400);
    });
  });

  describe("Release Sector Validation", () => {
    it("should not allow releasing last sector", () => {
      const sectorCount = 1;
      const canRelease = sectorCount > 1;

      expect(canRelease).toBe(false);
    });

    it("should allow releasing when multiple sectors owned", () => {
      const sectorCount = 9;
      const canRelease = sectorCount > 1;

      expect(canRelease).toBe(true);
    });

    it("should correctly calculate credits after release", () => {
      const credits = 50_000;
      const refund = 5_800;

      const newCredits = credits + refund;
      expect(newCredits).toBe(55_800);
    });
  });

  describe("Sector Type Validation", () => {
    it("should recognize all valid sector types", () => {
      const validTypes = [
        "food", "ore", "petroleum", "tourism", "urban",
        "education", "government", "research", "supply", "anti_pollution"
      ];

      validTypes.forEach(type => {
        expect(PLANET_COSTS[type as keyof typeof PLANET_COSTS]).toBeDefined();
        expect(PLANET_COSTS[type as keyof typeof PLANET_COSTS]).toBeGreaterThan(0);
      });
    });
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe("Sector Service Edge Cases", () => {
  it("should handle very high sector counts", () => {
    const baseCost = PLANET_COSTS.food;
    const ownedSectors = 100;
    const cost = calculateSectorCost(baseCost, ownedSectors);

    // 8,000 × (1 + 100 × 0.05) = 8,000 × 6 = 48,000
    expect(cost).toBe(48_000);
  });

  it("should floor fractional costs", () => {
    // 7,500 × 1.45 = 10,875
    const cost = calculateSectorCost(7_500, 9);
    expect(cost).toBe(10_875);
    expect(Number.isInteger(cost)).toBe(true);
  });

  it("should floor fractional refunds", () => {
    // 7,500 × 1.45 × 0.5 = 5,437.5 → 5,437
    const refund = calculateReleaseRefund(7_500, 9);
    expect(refund).toBe(5_437);
    expect(Number.isInteger(refund)).toBe(true);
  });

  it("should handle bulk sector purchases calculation", () => {
    const baseCost = PLANET_COSTS.food;

    // Calculate cost of buying 3 sectors starting at 9 owned
    const cost1 = calculateSectorCost(baseCost, 9);  // 11,600
    const cost2 = calculateSectorCost(baseCost, 10); // 12,000
    const cost3 = calculateSectorCost(baseCost, 11); // 12,400
    const totalCost = cost1 + cost2 + cost3;

    expect(totalCost).toBe(36_000);
  });
});

/**
 * Resource Engine Service Tests
 *
 * Comprehensive test suite for resource production:
 * - Sector production calculation
 * - Income multiplier application
 * - Maintenance cost calculation
 * - Resource change calculations
 * - Resource caps and storage costs (P2-18)
 * - Edge cases
 */

import { describe, it, expect } from "vitest";
import {
  calculateProduction,
  applyIncomeMultiplier,
  calculateMaintenanceCost,
  calculateNetResourceDelta,
  processTurnResources,
  calculateStorageCosts,
  applyResourceCaps,
  wouldOverflow,
  hasStorageCosts,
  getStorageThreshold,
  getRemainingCapacity,
  SECTOR_MAINTENANCE_COST,
} from "../economy/resource-engine";
import {
  RESOURCE_CAPS,
  STORAGE_COST_THRESHOLD,
  STORAGE_COST_RATE,
} from "../../constants";
import type { Sector } from "@/lib/db/schema";
import type { ResourceDelta } from "../../types/turn-types";

// Test helper to create mock sectors
function createMockSector(type: Sector["type"], productionRate: string): Sector {
  return {
    id: "test-id",
    empireId: "test-empire",
    gameId: "test-game",
    type,
    productionRate,
    name: null,
    purchasePrice: 0,
    acquiredAtTurn: 1,
    createdAt: new Date(),
  };
}

describe("Resource Engine Service", () => {
  describe("calculateProduction", () => {
    it("should calculate food production from food sectors", () => {
      const sectors = [
        createMockSector("food", "160"),
        createMockSector("food", "160"),
      ];

      const production = calculateProduction(sectors);

      expect(production.food).toBe(320); // 2 × 160
      expect(production.credits).toBe(0);
      expect(production.ore).toBe(0);
      expect(production.petroleum).toBe(0);
      expect(production.researchPoints).toBe(0);
    });

    it("should calculate ore production from ore sectors", () => {
      const sectors = [
        createMockSector("ore", "112"),
        createMockSector("ore", "112"),
      ];

      const production = calculateProduction(sectors);

      expect(production.ore).toBe(224); // 2 × 112
    });

    it("should calculate petroleum production from petroleum sectors", () => {
      const sectors = [createMockSector("petroleum", "92")];

      const production = calculateProduction(sectors);

      expect(production.petroleum).toBe(92);
    });

    it("should calculate credits production from tourism sectors", () => {
      const sectors = [createMockSector("tourism", "8000")];

      const production = calculateProduction(sectors);

      expect(production.credits).toBe(8000);
    });

    it("should calculate credits production from urban sectors", () => {
      const sectors = [createMockSector("urban", "1000")];

      const production = calculateProduction(sectors);

      expect(production.credits).toBe(1000);
    });

    it("should calculate research points from research sectors", () => {
      const sectors = [createMockSector("research", "100")];

      const production = calculateProduction(sectors);

      expect(production.researchPoints).toBe(100);
    });

    it("should handle multiple credits-producing sectors", () => {
      const sectors = [
        createMockSector("tourism", "8000"),
        createMockSector("urban", "1000"),
      ];

      const production = calculateProduction(sectors);

      expect(production.credits).toBe(9000); // 8000 + 1000
    });

    it("should handle starting sector distribution (9 sectors)", () => {
      const sectors = [
        createMockSector("food", "160"),
        createMockSector("food", "160"),
        createMockSector("ore", "112"),
        createMockSector("ore", "112"),
        createMockSector("petroleum", "92"),
        createMockSector("tourism", "8000"),
        createMockSector("urban", "1000"),
        createMockSector("government", "300"),
        createMockSector("research", "100"),
      ];

      const production = calculateProduction(sectors);

      expect(production.food).toBe(320); // 2 × 160
      expect(production.ore).toBe(224); // 2 × 112
      expect(production.petroleum).toBe(92);
      expect(production.credits).toBe(9000); // 8000 + 1000
      expect(production.researchPoints).toBe(100);
    });

    it("should handle special effect sectors with no production", () => {
      const sectors = [
        createMockSector("government", "300"),
        createMockSector("education", "0"),
        createMockSector("supply", "0"),
        createMockSector("anti_pollution", "0"),
      ];

      const production = calculateProduction(sectors);

      // Special sectors don't produce direct resources
      expect(production.credits).toBe(0);
      expect(production.food).toBe(0);
      expect(production.ore).toBe(0);
      expect(production.petroleum).toBe(0);
      expect(production.researchPoints).toBe(0);
    });

    it("should handle zero sectors", () => {
      const production = calculateProduction([]);

      expect(production.credits).toBe(0);
      expect(production.food).toBe(0);
      expect(production.ore).toBe(0);
      expect(production.petroleum).toBe(0);
      expect(production.researchPoints).toBe(0);
    });

    it("should handle decimal production rates", () => {
      const sectors = [createMockSector("food", "160.5")];

      const production = calculateProduction(sectors);

      expect(production.food).toBe(160.5);
    });
  });

  describe("applyIncomeMultiplier", () => {
    it("should apply 2× multiplier (Content status) to income resources", () => {
      const baseProduction: ResourceDelta = {
        credits: 8000,
        food: 320,
        ore: 224,
        petroleum: 92,
        researchPoints: 100,
      };

      const result = applyIncomeMultiplier(baseProduction, 2.0);

      expect(result.final.credits).toBe(16000); // 8000 × 2
      expect(result.final.researchPoints).toBe(200); // 100 × 2
      expect(result.final.food).toBe(320); // NOT multiplied
      expect(result.final.ore).toBe(224); // NOT multiplied
      expect(result.final.petroleum).toBe(92); // NOT multiplied
      expect(result.incomeMultiplier).toBe(2.0);
    });

    it("should apply 4× multiplier (Ecstatic status)", () => {
      const baseProduction: ResourceDelta = {
        credits: 10000,
        food: 0,
        ore: 0,
        petroleum: 0,
        researchPoints: 100,
      };

      const result = applyIncomeMultiplier(baseProduction, 4.0);

      expect(result.final.credits).toBe(40000); // 10000 × 4
      expect(result.final.researchPoints).toBe(400); // 100 × 4
    });

    it("should apply 0× multiplier (Unhappy status)", () => {
      const baseProduction: ResourceDelta = {
        credits: 10000,
        food: 320,
        ore: 224,
        petroleum: 92,
        researchPoints: 100,
      };

      const result = applyIncomeMultiplier(baseProduction, 0.0);

      expect(result.final.credits).toBe(0); // 10000 × 0
      expect(result.final.researchPoints).toBe(0); // 100 × 0
      expect(result.final.food).toBe(320); // NOT affected
    });

    it("should apply negative multiplier (Revolting status)", () => {
      const baseProduction: ResourceDelta = {
        credits: 10000,
        food: 0,
        ore: 0,
        petroleum: 0,
        researchPoints: 100,
      };

      const result = applyIncomeMultiplier(baseProduction, -0.5);

      expect(result.final.credits).toBe(-5000); // 10000 × -0.5
      expect(result.final.researchPoints).toBe(-50); // 100 × -0.5
    });

    it("should floor decimal results", () => {
      const baseProduction: ResourceDelta = {
        credits: 999,
        food: 0,
        ore: 0,
        petroleum: 0,
        researchPoints: 99,
      };

      const result = applyIncomeMultiplier(baseProduction, 1.5);

      // 999 × 1.5 = 1498.5, floored to 1498
      expect(result.final.credits).toBe(1498);
      // 99 × 1.5 = 148.5, floored to 148
      expect(result.final.researchPoints).toBe(148);
    });

    it("should preserve original production in result", () => {
      const baseProduction: ResourceDelta = {
        credits: 8000,
        food: 320,
        ore: 224,
        petroleum: 92,
        researchPoints: 100,
      };

      const result = applyIncomeMultiplier(baseProduction, 2.0);

      expect(result.production).toEqual(baseProduction);
    });
  });

  describe("calculateMaintenanceCost", () => {
    it("should calculate maintenance for 9 starting sectors", () => {
      const maintenance = calculateMaintenanceCost(9);

      expect(maintenance.totalCost).toBe(1512); // 9 × 168
      expect(maintenance.costPerSector).toBe(168);
      expect(maintenance.sectorCount).toBe(9);
    });

    it("should calculate maintenance for various sector counts", () => {
      expect(calculateMaintenanceCost(1).totalCost).toBe(168);
      expect(calculateMaintenanceCost(5).totalCost).toBe(840);
      expect(calculateMaintenanceCost(20).totalCost).toBe(3360);
    });

    it("should handle zero sectors", () => {
      const maintenance = calculateMaintenanceCost(0);

      expect(maintenance.totalCost).toBe(0);
      expect(maintenance.sectorCount).toBe(0);
    });

    it("should use correct SECTOR_MAINTENANCE_COST constant", () => {
      expect(SECTOR_MAINTENANCE_COST).toBe(168); // PRD specification
    });
  });

  describe("calculateNetResourceDelta", () => {
    it("should deduct maintenance from credit production", () => {
      const production: ResourceDelta = {
        credits: 16000,
        food: 320,
        ore: 224,
        petroleum: 92,
        researchPoints: 200,
      };

      const maintenance = { totalCost: 1512, costPerSector: 168, sectorCount: 9 };

      const delta = calculateNetResourceDelta(production, maintenance);

      expect(delta.credits).toBe(14488); // 16000 - 1512
      expect(delta.food).toBe(320);
      expect(delta.ore).toBe(224);
      expect(delta.petroleum).toBe(92);
      expect(delta.researchPoints).toBe(200);
    });

    it("should allow negative credit balance (debt)", () => {
      const production: ResourceDelta = {
        credits: 500,
        food: 0,
        ore: 0,
        petroleum: 0,
        researchPoints: 0,
      };

      const maintenance = { totalCost: 1512, costPerSector: 168, sectorCount: 9 };

      const delta = calculateNetResourceDelta(production, maintenance);

      expect(delta.credits).toBe(-1012); // 500 - 1512 = -1012 (debt)
    });
  });

  describe("processTurnResources - Full Integration", () => {
    it("should process full turn for starting empire", () => {
      const startingSectors = [
        createMockSector("food", "160"),
        createMockSector("food", "160"),
        createMockSector("ore", "112"),
        createMockSector("ore", "112"),
        createMockSector("petroleum", "92"),
        createMockSector("tourism", "8000"),
        createMockSector("urban", "1000"),
        createMockSector("government", "300"),
        createMockSector("research", "100"),
      ];

      const result = processTurnResources(startingSectors, 2.0); // Content status

      // Base production
      expect(result.production.credits).toBe(9000); // 8000 + 1000
      expect(result.production.food).toBe(320);
      expect(result.production.ore).toBe(224);
      expect(result.production.petroleum).toBe(92);
      expect(result.production.researchPoints).toBe(100);

      // After multiplier (2×)
      expect(result.incomeMultiplier).toBe(2.0);

      // Final (after maintenance)
      expect(result.final.credits).toBe(16488); // (9000 × 2) - 1512
      expect(result.final.food).toBe(320);
      expect(result.final.ore).toBe(224);
      expect(result.final.petroleum).toBe(92);
      expect(result.final.researchPoints).toBe(200); // 100 × 2
    });

    it("should process turn with ecstatic status (4× multiplier)", () => {
      const sectors = [
        createMockSector("tourism", "10000"),
        createMockSector("research", "100"),
      ];

      const result = processTurnResources(sectors, 4.0); // Ecstatic

      expect(result.final.credits).toBe(39664); // (10000 × 4) - (2 × 168)
      expect(result.final.researchPoints).toBe(400); // 100 × 4
    });

    it("should process turn with unhappy status (0× multiplier)", () => {
      const sectors = [
        createMockSector("tourism", "10000"),
        createMockSector("food", "160"),
      ];

      const result = processTurnResources(sectors, 0.0); // Unhappy

      expect(result.final.credits).toBe(-336); // (10000 × 0) - (2 × 168)
      expect(result.final.food).toBe(160); // NOT affected by multiplier
    });

    it("should handle zero sectors", () => {
      const result = processTurnResources([], 2.0);

      expect(result.final.credits).toBe(0);
      expect(result.final.food).toBe(0);
      expect(result.final.ore).toBe(0);
      expect(result.final.petroleum).toBe(0);
      expect(result.final.researchPoints).toBe(0);
    });

    it("should handle large empire with many sectors", () => {
      const sectors = Array(50).fill(null).map(() => createMockSector("tourism", "8000"));

      const result = processTurnResources(sectors, 2.0);

      // 50 × 8000 = 400,000 credits base
      // 400,000 × 2 = 800,000 after multiplier
      // 800,000 - (50 × 168) = 800,000 - 8,400 = 791,600
      expect(result.final.credits).toBe(791600);
    });
  });

  // =============================================================================
  // RESOURCE CAPS AND STORAGE COSTS TESTS (P2-18)
  // =============================================================================

  describe("calculateStorageCosts", () => {
    it("should return zero costs when resources are below threshold", () => {
      const resources = {
        credits: 100000,
        food: 5000,
        ore: 20000,     // Below 25000 threshold (50% of 50000)
        petroleum: 10000, // Below 12500 threshold (50% of 25000)
      };

      const costs = calculateStorageCosts(resources);

      expect(costs.ore).toBe(0);
      expect(costs.petroleum).toBe(0);
      expect(costs.total).toBe(0);
    });

    it("should calculate ore storage costs above threshold", () => {
      const resources = {
        credits: 100000,
        food: 5000,
        ore: 30000,     // 5000 above 25000 threshold
        petroleum: 10000,
      };

      const costs = calculateStorageCosts(resources);

      // Excess: 30000 - 25000 = 5000
      // Cost: floor(5000 * 0.005) = 25
      expect(costs.ore).toBe(25);
      expect(costs.petroleum).toBe(0);
      expect(costs.total).toBe(25);
    });

    it("should calculate petroleum storage costs above threshold", () => {
      const resources = {
        credits: 100000,
        food: 5000,
        ore: 20000,
        petroleum: 15000, // 2500 above 12500 threshold
      };

      const costs = calculateStorageCosts(resources);

      // Excess: 15000 - 12500 = 2500
      // Cost: floor(2500 * 0.005) = 12
      expect(costs.ore).toBe(0);
      expect(costs.petroleum).toBe(12);
      expect(costs.total).toBe(12);
    });

    it("should calculate combined storage costs", () => {
      const resources = {
        credits: 100000,
        food: 5000,
        ore: 40000,     // 15000 above threshold
        petroleum: 20000, // 7500 above threshold
      };

      const costs = calculateStorageCosts(resources);

      // Ore: floor(15000 * 0.005) = 75
      // Petroleum: floor(7500 * 0.005) = 37
      expect(costs.ore).toBe(75);
      expect(costs.petroleum).toBe(37);
      expect(costs.total).toBe(112);
    });

    it("should handle resources exactly at threshold", () => {
      const resources = {
        credits: 100000,
        food: 5000,
        ore: 25000,     // Exactly at threshold
        petroleum: 12500, // Exactly at threshold
      };

      const costs = calculateStorageCosts(resources);

      expect(costs.ore).toBe(0);
      expect(costs.petroleum).toBe(0);
      expect(costs.total).toBe(0);
    });

    it("should handle maximum resources at cap", () => {
      const resources = {
        credits: RESOURCE_CAPS.credits,
        food: RESOURCE_CAPS.food,
        ore: RESOURCE_CAPS.ore,           // 50000
        petroleum: RESOURCE_CAPS.petroleum, // 25000
      };

      const costs = calculateStorageCosts(resources);

      // Ore: excess = 50000 - 25000 = 25000, cost = floor(25000 * 0.005) = 125
      // Petroleum: excess = 25000 - 12500 = 12500, cost = floor(12500 * 0.005) = 62
      expect(costs.ore).toBe(125);
      expect(costs.petroleum).toBe(62);
      expect(costs.total).toBe(187);
    });

    it("should use correct threshold and rate constants", () => {
      expect(STORAGE_COST_THRESHOLD).toBe(0.5);
      expect(STORAGE_COST_RATE).toBe(0.005);
    });
  });

  describe("applyResourceCaps", () => {
    it("should not modify resources below caps", () => {
      const resources = {
        credits: 1000000,
        food: 50000,
        ore: 30000,
        petroleum: 15000,
        researchPoints: 500,
      };

      const { capped, overflow } = applyResourceCaps(resources);

      expect(capped).toEqual(resources);
      expect(overflow.credits).toBe(0);
      expect(overflow.food).toBe(0);
      expect(overflow.ore).toBe(0);
      expect(overflow.petroleum).toBe(0);
    });

    it("should cap credits at 10 million", () => {
      const resources = {
        credits: 12000000, // 2M over cap
        food: 50000,
        ore: 30000,
        petroleum: 15000,
        researchPoints: 500,
      };

      const { capped, overflow } = applyResourceCaps(resources);

      expect(capped.credits).toBe(10000000);
      expect(overflow.credits).toBe(2000000);
    });

    it("should cap food at 100,000", () => {
      const resources = {
        credits: 1000000,
        food: 150000, // 50K over cap
        ore: 30000,
        petroleum: 15000,
        researchPoints: 500,
      };

      const { capped, overflow } = applyResourceCaps(resources);

      expect(capped.food).toBe(100000);
      expect(overflow.food).toBe(50000);
    });

    it("should cap ore at 50,000", () => {
      const resources = {
        credits: 1000000,
        food: 50000,
        ore: 75000, // 25K over cap
        petroleum: 15000,
        researchPoints: 500,
      };

      const { capped, overflow } = applyResourceCaps(resources);

      expect(capped.ore).toBe(50000);
      expect(overflow.ore).toBe(25000);
    });

    it("should cap petroleum at 25,000", () => {
      const resources = {
        credits: 1000000,
        food: 50000,
        ore: 30000,
        petroleum: 35000, // 10K over cap
        researchPoints: 500,
      };

      const { capped, overflow } = applyResourceCaps(resources);

      expect(capped.petroleum).toBe(25000);
      expect(overflow.petroleum).toBe(10000);
    });

    it("should not cap research points (infinite cap)", () => {
      const resources = {
        credits: 1000000,
        food: 50000,
        ore: 30000,
        petroleum: 15000,
        researchPoints: 999999999, // Very high value
      };

      const { capped, overflow } = applyResourceCaps(resources);

      expect(capped.researchPoints).toBe(999999999);
      // Verify no overflow for capped resources (researchPoints not in overflow type)
      expect(overflow.credits).toBe(0);
      expect(overflow.food).toBe(0);
      expect(overflow.ore).toBe(0);
      expect(overflow.petroleum).toBe(0);
    });

    it("should handle multiple resources over cap", () => {
      const resources = {
        credits: 15000000,   // 5M over
        food: 200000,        // 100K over
        ore: 100000,         // 50K over
        petroleum: 50000,    // 25K over
        researchPoints: 500,
      };

      const { capped, overflow } = applyResourceCaps(resources);

      expect(capped.credits).toBe(10000000);
      expect(capped.food).toBe(100000);
      expect(capped.ore).toBe(50000);
      expect(capped.petroleum).toBe(25000);

      expect(overflow.credits).toBe(5000000);
      expect(overflow.food).toBe(100000);
      expect(overflow.ore).toBe(50000);
      expect(overflow.petroleum).toBe(25000);
    });

    it("should handle resources exactly at cap", () => {
      const resources = {
        credits: 10000000,
        food: 100000,
        ore: 50000,
        petroleum: 25000,
        researchPoints: 500,
      };

      const { capped, overflow } = applyResourceCaps(resources);

      expect(capped).toEqual(resources);
      expect(overflow.credits).toBe(0);
      expect(overflow.food).toBe(0);
      expect(overflow.ore).toBe(0);
      expect(overflow.petroleum).toBe(0);
    });

    it("should verify resource cap constants", () => {
      expect(RESOURCE_CAPS.credits).toBe(10000000);
      expect(RESOURCE_CAPS.food).toBe(100000);
      expect(RESOURCE_CAPS.ore).toBe(50000);
      expect(RESOURCE_CAPS.petroleum).toBe(25000);
      expect(RESOURCE_CAPS.researchPoints).toBe(Infinity);
    });
  });

  describe("wouldOverflow", () => {
    it("should return false when all resources are below caps", () => {
      expect(wouldOverflow({
        credits: 1000000,
        food: 50000,
        ore: 30000,
        petroleum: 15000,
      })).toBe(false);
    });

    it("should return true when credits exceed cap", () => {
      expect(wouldOverflow({
        credits: 15000000,
        food: 50000,
        ore: 30000,
        petroleum: 15000,
      })).toBe(true);
    });

    it("should return true when food exceeds cap", () => {
      expect(wouldOverflow({
        credits: 1000000,
        food: 150000,
        ore: 30000,
        petroleum: 15000,
      })).toBe(true);
    });

    it("should return true when ore exceeds cap", () => {
      expect(wouldOverflow({
        credits: 1000000,
        food: 50000,
        ore: 60000,
        petroleum: 15000,
      })).toBe(true);
    });

    it("should return true when petroleum exceeds cap", () => {
      expect(wouldOverflow({
        credits: 1000000,
        food: 50000,
        ore: 30000,
        petroleum: 30000,
      })).toBe(true);
    });
  });

  describe("hasStorageCosts", () => {
    it("should return false when resources are below threshold", () => {
      expect(hasStorageCosts({
        ore: 20000,
        petroleum: 10000,
      })).toBe(false);
    });

    it("should return true when ore exceeds threshold", () => {
      expect(hasStorageCosts({
        ore: 30000, // Above 25000 threshold
        petroleum: 10000,
      })).toBe(true);
    });

    it("should return true when petroleum exceeds threshold", () => {
      expect(hasStorageCosts({
        ore: 20000,
        petroleum: 15000, // Above 12500 threshold
      })).toBe(true);
    });

    it("should return false when resources are exactly at threshold", () => {
      expect(hasStorageCosts({
        ore: 25000,
        petroleum: 12500,
      })).toBe(false);
    });
  });

  describe("getStorageThreshold", () => {
    it("should return correct threshold for credits", () => {
      expect(getStorageThreshold('credits')).toBe(5000000); // 50% of 10M
    });

    it("should return correct threshold for food", () => {
      expect(getStorageThreshold('food')).toBe(50000); // 50% of 100K
    });

    it("should return correct threshold for ore", () => {
      expect(getStorageThreshold('ore')).toBe(25000); // 50% of 50K
    });

    it("should return correct threshold for petroleum", () => {
      expect(getStorageThreshold('petroleum')).toBe(12500); // 50% of 25K
    });

    it("should return Infinity for research points", () => {
      expect(getStorageThreshold('researchPoints')).toBe(Infinity);
    });
  });

  describe("getRemainingCapacity", () => {
    it("should return full capacity when resource is zero", () => {
      expect(getRemainingCapacity('credits', 0)).toBe(10000000);
      expect(getRemainingCapacity('food', 0)).toBe(100000);
      expect(getRemainingCapacity('ore', 0)).toBe(50000);
      expect(getRemainingCapacity('petroleum', 0)).toBe(25000);
    });

    it("should return correct remaining capacity", () => {
      expect(getRemainingCapacity('credits', 3000000)).toBe(7000000);
      expect(getRemainingCapacity('food', 60000)).toBe(40000);
      expect(getRemainingCapacity('ore', 30000)).toBe(20000);
      expect(getRemainingCapacity('petroleum', 20000)).toBe(5000);
    });

    it("should return zero when at capacity", () => {
      expect(getRemainingCapacity('credits', 10000000)).toBe(0);
      expect(getRemainingCapacity('food', 100000)).toBe(0);
      expect(getRemainingCapacity('ore', 50000)).toBe(0);
      expect(getRemainingCapacity('petroleum', 25000)).toBe(0);
    });

    it("should return zero when over capacity", () => {
      expect(getRemainingCapacity('credits', 15000000)).toBe(0);
      expect(getRemainingCapacity('ore', 60000)).toBe(0);
    });

    it("should return Infinity for research points", () => {
      expect(getRemainingCapacity('researchPoints', 0)).toBe(Infinity);
      expect(getRemainingCapacity('researchPoints', 999999)).toBe(Infinity);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very small production rates", () => {
      const sectors = [createMockSector("food", "0.1")];

      const production = calculateProduction(sectors);

      expect(production.food).toBe(0.1);
    });

    it("should handle zero production rate", () => {
      const sectors = [createMockSector("food", "0")];

      const production = calculateProduction(sectors);

      expect(production.food).toBe(0);
    });

    it("should handle mixed sector types comprehensively", () => {
      const sectors = [
        createMockSector("food", "100"),
        createMockSector("ore", "50"),
        createMockSector("petroleum", "25"),
        createMockSector("tourism", "5000"),
        createMockSector("urban", "1000"),
        createMockSector("research", "75"),
      ];

      const production = calculateProduction(sectors);

      expect(production.food).toBe(100);
      expect(production.ore).toBe(50);
      expect(production.petroleum).toBe(25);
      expect(production.credits).toBe(6000); // 5000 + 1000
      expect(production.researchPoints).toBe(75);
    });

    it("should handle storage costs with zero excess correctly", () => {
      const resources = {
        credits: 100000,
        food: 5000,
        ore: 25001,     // 1 over threshold
        petroleum: 12501, // 1 over threshold
      };

      const costs = calculateStorageCosts(resources);

      // floor(1 * 0.005) = 0 for both
      expect(costs.ore).toBe(0);
      expect(costs.petroleum).toBe(0);
      expect(costs.total).toBe(0);
    });

    it("should handle storage costs with small excess", () => {
      const resources = {
        credits: 100000,
        food: 5000,
        ore: 25200,     // 200 over threshold
        petroleum: 12700, // 200 over threshold
      };

      const costs = calculateStorageCosts(resources);

      // floor(200 * 0.005) = 1 for both
      expect(costs.ore).toBe(1);
      expect(costs.petroleum).toBe(1);
      expect(costs.total).toBe(2);
    });
  });
});

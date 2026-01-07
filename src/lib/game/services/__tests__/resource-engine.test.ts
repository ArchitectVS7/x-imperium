/**
 * Resource Engine Service Tests
 *
 * Comprehensive test suite for resource production:
 * - Sector production calculation
 * - Income multiplier application
 * - Maintenance cost calculation
 * - Resource change calculations
 * - Edge cases
 */

import { describe, it, expect } from "vitest";
import {
  calculateProduction,
  applyIncomeMultiplier,
  calculateMaintenanceCost,
  calculateNetResourceDelta,
  processTurnResources,
  PLANET_MAINTENANCE_COST,
} from "../resource-engine";
import type { Sector } from "@/lib/db/schema";
import type { ResourceDelta } from "../../types/turn-types";

// Test helper to create mock sectors
function createMockPlanet(type: Sector["type"], productionRate: string): Sector {
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
        createMockPlanet("food", "160"),
        createMockPlanet("food", "160"),
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
        createMockPlanet("ore", "112"),
        createMockPlanet("ore", "112"),
      ];

      const production = calculateProduction(sectors);

      expect(production.ore).toBe(224); // 2 × 112
    });

    it("should calculate petroleum production from petroleum sectors", () => {
      const sectors = [createMockPlanet("petroleum", "92")];

      const production = calculateProduction(sectors);

      expect(production.petroleum).toBe(92);
    });

    it("should calculate credits production from tourism sectors", () => {
      const sectors = [createMockPlanet("tourism", "8000")];

      const production = calculateProduction(sectors);

      expect(production.credits).toBe(8000);
    });

    it("should calculate credits production from urban sectors", () => {
      const sectors = [createMockPlanet("urban", "1000")];

      const production = calculateProduction(sectors);

      expect(production.credits).toBe(1000);
    });

    it("should calculate research points from research sectors", () => {
      const sectors = [createMockPlanet("research", "100")];

      const production = calculateProduction(sectors);

      expect(production.researchPoints).toBe(100);
    });

    it("should handle multiple credits-producing sectors", () => {
      const sectors = [
        createMockPlanet("tourism", "8000"),
        createMockPlanet("urban", "1000"),
      ];

      const production = calculateProduction(sectors);

      expect(production.credits).toBe(9000); // 8000 + 1000
    });

    it("should handle starting sector distribution (9 sectors)", () => {
      const sectors = [
        createMockPlanet("food", "160"),
        createMockPlanet("food", "160"),
        createMockPlanet("ore", "112"),
        createMockPlanet("ore", "112"),
        createMockPlanet("petroleum", "92"),
        createMockPlanet("tourism", "8000"),
        createMockPlanet("urban", "1000"),
        createMockPlanet("government", "300"),
        createMockPlanet("research", "100"),
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
        createMockPlanet("government", "300"),
        createMockPlanet("education", "0"),
        createMockPlanet("supply", "0"),
        createMockPlanet("anti_pollution", "0"),
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
      const sectors = [createMockPlanet("food", "160.5")];

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
      expect(maintenance.costPerPlanet).toBe(168);
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

    it("should use correct PLANET_MAINTENANCE_COST constant", () => {
      expect(PLANET_MAINTENANCE_COST).toBe(168); // PRD specification
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

      const maintenance = { totalCost: 1512, costPerPlanet: 168, sectorCount: 9 };

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

      const maintenance = { totalCost: 1512, costPerPlanet: 168, sectorCount: 9 };

      const delta = calculateNetResourceDelta(production, maintenance);

      expect(delta.credits).toBe(-1012); // 500 - 1512 = -1012 (debt)
    });
  });

  describe("processTurnResources - Full Integration", () => {
    it("should process full turn for starting empire", () => {
      const startingPlanets = [
        createMockPlanet("food", "160"),
        createMockPlanet("food", "160"),
        createMockPlanet("ore", "112"),
        createMockPlanet("ore", "112"),
        createMockPlanet("petroleum", "92"),
        createMockPlanet("tourism", "8000"),
        createMockPlanet("urban", "1000"),
        createMockPlanet("government", "300"),
        createMockPlanet("research", "100"),
      ];

      const result = processTurnResources(startingPlanets, 2.0); // Content status

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
        createMockPlanet("tourism", "10000"),
        createMockPlanet("research", "100"),
      ];

      const result = processTurnResources(sectors, 4.0); // Ecstatic

      expect(result.final.credits).toBe(39664); // (10000 × 4) - (2 × 168)
      expect(result.final.researchPoints).toBe(400); // 100 × 4
    });

    it("should process turn with unhappy status (0× multiplier)", () => {
      const sectors = [
        createMockPlanet("tourism", "10000"),
        createMockPlanet("food", "160"),
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
      const sectors = Array(50).fill(null).map(() => createMockPlanet("tourism", "8000"));

      const result = processTurnResources(sectors, 2.0);

      // 50 × 8000 = 400,000 credits base
      // 400,000 × 2 = 800,000 after multiplier
      // 800,000 - (50 × 168) = 800,000 - 8,400 = 791,600
      expect(result.final.credits).toBe(791600);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very small production rates", () => {
      const sectors = [createMockPlanet("food", "0.1")];

      const production = calculateProduction(sectors);

      expect(production.food).toBe(0.1);
    });

    it("should handle zero production rate", () => {
      const sectors = [createMockPlanet("food", "0")];

      const production = calculateProduction(sectors);

      expect(production.food).toBe(0);
    });

    it("should handle mixed sector types comprehensively", () => {
      const sectors = [
        createMockPlanet("food", "100"),
        createMockPlanet("ore", "50"),
        createMockPlanet("petroleum", "25"),
        createMockPlanet("tourism", "5000"),
        createMockPlanet("urban", "1000"),
        createMockPlanet("research", "75"),
      ];

      const production = calculateProduction(sectors);

      expect(production.food).toBe(100);
      expect(production.ore).toBe(50);
      expect(production.petroleum).toBe(25);
      expect(production.credits).toBe(6000); // 5000 + 1000
      expect(production.researchPoints).toBe(75);
    });
  });
});

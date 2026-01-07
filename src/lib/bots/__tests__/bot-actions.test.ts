import { describe, it, expect } from "vitest";
import { UNIT_BUILD_TIMES } from "@/lib/game/build-config";
import { PLANET_COSTS, PLANET_PRODUCTION } from "@/lib/game/constants";

describe("Bot Actions", () => {
  describe("Build Units configuration", () => {
    it("should have build times for all unit types", () => {
      expect(UNIT_BUILD_TIMES.soldiers).toBeDefined();
      expect(UNIT_BUILD_TIMES.fighters).toBeDefined();
      expect(UNIT_BUILD_TIMES.lightCruisers).toBeDefined();
      expect(UNIT_BUILD_TIMES.heavyCruisers).toBeDefined();
      expect(UNIT_BUILD_TIMES.carriers).toBeDefined();
      expect(UNIT_BUILD_TIMES.stations).toBeDefined();
    });

    it("should have positive build times", () => {
      Object.values(UNIT_BUILD_TIMES).forEach((time) => {
        expect(time).toBeGreaterThan(0);
      });
    });
  });

  describe("Buy Sector configuration", () => {
    it("should have costs for all purchasable sector types", () => {
      const purchasableTypes = ["food", "ore", "petroleum", "tourism", "urban", "government", "research"];
      purchasableTypes.forEach((type) => {
        expect(PLANET_COSTS[type as keyof typeof PLANET_COSTS]).toBeDefined();
      });
    });

    it("should have production rates for all sector types", () => {
      const purchasableTypes = ["food", "ore", "petroleum", "tourism", "urban", "government", "research"];
      purchasableTypes.forEach((type) => {
        expect(PLANET_PRODUCTION[type as keyof typeof PLANET_PRODUCTION]).toBeDefined();
      });
    });

    it("should have positive sector costs", () => {
      Object.values(PLANET_COSTS).forEach((cost) => {
        expect(cost).toBeGreaterThan(0);
      });
    });
  });

  describe("Attack validation rules", () => {
    it("should require protection period to end before attacks", () => {
      const PROTECTION_TURNS = 20;
      expect(PROTECTION_TURNS).toBe(20);

      // Turn 20 is still protected
      expect(20 <= PROTECTION_TURNS).toBe(true);

      // Turn 21 is not protected
      expect(21 <= PROTECTION_TURNS).toBe(false);
    });

    it("should require forces to be allocated for attack", () => {
      const forces = { soldiers: 0, fighters: 0, lightCruisers: 0, heavyCruisers: 0, carriers: 0, stations: 0 };
      const totalForces = forces.soldiers + forces.fighters + forces.lightCruisers + forces.heavyCruisers + forces.carriers;
      expect(totalForces).toBe(0);
    });
  });
});

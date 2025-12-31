/**
 * Tests for Sector Traits Service (M10.1)
 */

import { describe, it, expect } from "vitest";
import {
  getSectorBonus,
  getNeutralBonus,
  assignSectorTraits,
  applyCreditBonus,
  applyOreBonus,
  applyResearchBonus,
  applyPopulationGrowthBonus,
  getCovertSuccessBonus,
  getBotDensityModifier,
  applySectorTraitBonuses,
  isValidSectorTrait,
  getTraitDisplayName,
  getTraitIcon,
  regionTypeToSectorTrait,
  SECTOR_TRAIT_BONUSES,
  type SectorTrait,
} from "../sector-traits-service";

describe("Sector Traits Service", () => {
  describe("getSectorBonus", () => {
    it("should return correct bonus for core_worlds (+20% credits)", () => {
      const bonus = getSectorBonus("core_worlds");
      expect(bonus.creditMultiplier).toBe(1.2);
      expect(bonus.oreMultiplier).toBe(1.0);
      expect(bonus.researchMultiplier).toBe(1.0);
    });

    it("should return correct bonus for mining_belt (+20% ore)", () => {
      const bonus = getSectorBonus("mining_belt");
      expect(bonus.creditMultiplier).toBe(1.0);
      expect(bonus.oreMultiplier).toBe(1.2);
      expect(bonus.researchMultiplier).toBe(1.0);
    });

    it("should return correct bonus for frontier (+20% research)", () => {
      const bonus = getSectorBonus("frontier");
      expect(bonus.creditMultiplier).toBe(1.0);
      expect(bonus.oreMultiplier).toBe(1.0);
      expect(bonus.researchMultiplier).toBe(1.2);
    });

    it("should return correct bonus for dead_zone (-20% pop growth, 50% bots)", () => {
      const bonus = getSectorBonus("dead_zone");
      expect(bonus.populationGrowthMultiplier).toBe(0.8);
      expect(bonus.botDensityMultiplier).toBe(0.5);
    });

    it("should return correct bonus for nebula_region (+20% covert success)", () => {
      const bonus = getSectorBonus("nebula_region");
      expect(bonus.covertSuccessBonus).toBe(0.2);
    });
  });

  describe("getNeutralBonus", () => {
    it("should return neutral bonuses (all 1.0 multipliers)", () => {
      const bonus = getNeutralBonus();
      expect(bonus.creditMultiplier).toBe(1.0);
      expect(bonus.oreMultiplier).toBe(1.0);
      expect(bonus.researchMultiplier).toBe(1.0);
      expect(bonus.populationGrowthMultiplier).toBe(1.0);
      expect(bonus.botDensityMultiplier).toBe(1.0);
      expect(bonus.covertSuccessBonus).toBe(0);
    });
  });

  describe("assignSectorTraits", () => {
    it("should assign traits to all sectors", () => {
      const assignments = assignSectorTraits(10);
      expect(assignments.size).toBe(10);
    });

    it("should use sector-N naming convention", () => {
      const assignments = assignSectorTraits(5);
      expect(assignments.has("sector-0")).toBe(true);
      expect(assignments.has("sector-4")).toBe(true);
      expect(assignments.has("sector-5")).toBe(false);
    });

    it("should assign valid traits", () => {
      const assignments = assignSectorTraits(10);
      const validTraits: SectorTrait[] = [
        "core_worlds",
        "mining_belt",
        "frontier",
        "dead_zone",
        "nebula_region",
      ];

      for (const trait of Array.from(assignments.values())) {
        expect(validTraits).toContain(trait);
      }
    });

    it("should handle sector counts larger than default distribution", () => {
      const assignments = assignSectorTraits(15);
      expect(assignments.size).toBe(15);
    });
  });

  describe("applyCreditBonus", () => {
    it("should apply +20% for core_worlds", () => {
      expect(applyCreditBonus(1000, "core_worlds")).toBe(1200);
    });

    it("should not change credits for non-credit traits", () => {
      expect(applyCreditBonus(1000, "mining_belt")).toBe(1000);
      expect(applyCreditBonus(1000, "frontier")).toBe(1000);
    });

    it("should floor the result", () => {
      expect(applyCreditBonus(999, "core_worlds")).toBe(1198);
    });
  });

  describe("applyOreBonus", () => {
    it("should apply +20% for mining_belt", () => {
      expect(applyOreBonus(500, "mining_belt")).toBe(600);
    });

    it("should not change ore for non-ore traits", () => {
      expect(applyOreBonus(500, "core_worlds")).toBe(500);
    });
  });

  describe("applyResearchBonus", () => {
    it("should apply +20% for frontier", () => {
      expect(applyResearchBonus(100, "frontier")).toBe(120);
    });

    it("should not change research for non-research traits", () => {
      expect(applyResearchBonus(100, "mining_belt")).toBe(100);
    });
  });

  describe("applyPopulationGrowthBonus", () => {
    it("should apply -20% for dead_zone", () => {
      expect(applyPopulationGrowthBonus(1000, "dead_zone")).toBe(800);
    });

    it("should not change growth for normal sectors", () => {
      expect(applyPopulationGrowthBonus(1000, "core_worlds")).toBe(1000);
    });
  });

  describe("getCovertSuccessBonus", () => {
    it("should return +20% for nebula_region", () => {
      expect(getCovertSuccessBonus("nebula_region")).toBe(0.2);
    });

    it("should return 0 for non-covert traits", () => {
      expect(getCovertSuccessBonus("core_worlds")).toBe(0);
      expect(getCovertSuccessBonus("mining_belt")).toBe(0);
    });
  });

  describe("getBotDensityModifier", () => {
    it("should return 0.5 for dead_zone", () => {
      expect(getBotDensityModifier("dead_zone")).toBe(0.5);
    });

    it("should return 1.0 for normal sectors", () => {
      expect(getBotDensityModifier("core_worlds")).toBe(1.0);
    });
  });

  describe("applySectorTraitBonuses", () => {
    it("should apply all bonuses correctly for core_worlds", () => {
      const result = applySectorTraitBonuses(
        { credits: 1000, ore: 500, researchPoints: 100 },
        "core_worlds"
      );
      expect(result.credits).toBe(1200);
      expect(result.ore).toBe(500);
      expect(result.researchPoints).toBe(100);
    });

    it("should apply all bonuses correctly for mining_belt", () => {
      const result = applySectorTraitBonuses(
        { credits: 1000, ore: 500, researchPoints: 100 },
        "mining_belt"
      );
      expect(result.credits).toBe(1000);
      expect(result.ore).toBe(600);
      expect(result.researchPoints).toBe(100);
    });

    it("should apply all bonuses correctly for frontier", () => {
      const result = applySectorTraitBonuses(
        { credits: 1000, ore: 500, researchPoints: 100 },
        "frontier"
      );
      expect(result.credits).toBe(1000);
      expect(result.ore).toBe(500);
      expect(result.researchPoints).toBe(120);
    });
  });

  describe("isValidSectorTrait", () => {
    it("should return true for valid traits", () => {
      expect(isValidSectorTrait("core_worlds")).toBe(true);
      expect(isValidSectorTrait("mining_belt")).toBe(true);
      expect(isValidSectorTrait("frontier")).toBe(true);
      expect(isValidSectorTrait("dead_zone")).toBe(true);
      expect(isValidSectorTrait("nebula_region")).toBe(true);
    });

    it("should return false for invalid traits", () => {
      expect(isValidSectorTrait("invalid")).toBe(false);
      expect(isValidSectorTrait("")).toBe(false);
      expect(isValidSectorTrait("CORE_WORLDS")).toBe(false);
    });
  });

  describe("getTraitDisplayName", () => {
    it("should return human-readable names", () => {
      expect(getTraitDisplayName("core_worlds")).toBe("Core Worlds");
      expect(getTraitDisplayName("mining_belt")).toBe("Mining Belt");
      expect(getTraitDisplayName("frontier")).toBe("Frontier");
      expect(getTraitDisplayName("dead_zone")).toBe("Dead Zone");
      expect(getTraitDisplayName("nebula_region")).toBe("Nebula Region");
    });
  });

  describe("getTraitIcon", () => {
    it("should return appropriate emoji icons", () => {
      expect(getTraitIcon("core_worlds")).toBe("🏛️");
      expect(getTraitIcon("mining_belt")).toBe("⛏️");
      expect(getTraitIcon("frontier")).toBe("🔬");
      expect(getTraitIcon("dead_zone")).toBe("💀");
      expect(getTraitIcon("nebula_region")).toBe("🌫️");
    });
  });

  describe("regionTypeToSectorTrait", () => {
    it("should map region types to sector traits", () => {
      expect(regionTypeToSectorTrait("core")).toBe("core_worlds");
      expect(regionTypeToSectorTrait("inner")).toBe("core_worlds");
      expect(regionTypeToSectorTrait("outer")).toBe("frontier");
      expect(regionTypeToSectorTrait("rim")).toBe("dead_zone");
      expect(regionTypeToSectorTrait("void")).toBe("nebula_region");
    });
  });

  describe("SECTOR_TRAIT_BONUSES", () => {
    it("should have descriptions for all traits", () => {
      for (const trait of Object.keys(SECTOR_TRAIT_BONUSES) as SectorTrait[]) {
        const bonus = SECTOR_TRAIT_BONUSES[trait];
        expect(bonus.description).toBeTruthy();
        expect(bonus.description.length).toBeGreaterThan(0);
      }
    });
  });
});

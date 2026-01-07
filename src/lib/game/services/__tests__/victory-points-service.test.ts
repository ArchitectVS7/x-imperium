/**
 * Tests for Victory Points Service (M10.2)
 */

import { describe, it, expect } from "vitest";
import {
  calculateTerritoryVP,
  calculateNetworthVP,
  calculateMilitaryVP,
  calculateDiplomacyVP,
  calculateEliminationVP,
  calculateResearchVP,
  calculateVictoryPoints,
  triggersCoalition,
  getMaximumVP,
  getVPDescriptions,
  calculateMilitaryPower,
  compareVP,
  getCoalitionProgress,
  COALITION_TRIGGER_VP,
} from "../victory-points-service";

describe("Victory Points Service", () => {
  describe("calculateTerritoryVP", () => {
    it("should return 0 for less than 10 sectors", () => {
      expect(calculateTerritoryVP(0)).toBe(0);
      expect(calculateTerritoryVP(5)).toBe(0);
      expect(calculateTerritoryVP(9)).toBe(0);
    });

    it("should return 1 for 10-19 sectors", () => {
      expect(calculateTerritoryVP(10)).toBe(1);
      expect(calculateTerritoryVP(15)).toBe(1);
      expect(calculateTerritoryVP(19)).toBe(1);
    });

    it("should return 2 for 20-29 sectors", () => {
      expect(calculateTerritoryVP(20)).toBe(2);
      expect(calculateTerritoryVP(25)).toBe(2);
      expect(calculateTerritoryVP(29)).toBe(2);
    });

    it("should return 3 for 30+ sectors", () => {
      expect(calculateTerritoryVP(30)).toBe(3);
      expect(calculateTerritoryVP(50)).toBe(3);
      expect(calculateTerritoryVP(100)).toBe(3);
    });
  });

  describe("calculateNetworthVP", () => {
    it("should return 0 when below 1.2× average", () => {
      expect(calculateNetworthVP(1000, 1000)).toBe(0);
      expect(calculateNetworthVP(1100, 1000)).toBe(0);
      expect(calculateNetworthVP(1190, 1000)).toBe(0);
    });

    it("should return 1 for 1.2×-1.49× average", () => {
      expect(calculateNetworthVP(1200, 1000)).toBe(1);
      expect(calculateNetworthVP(1400, 1000)).toBe(1);
      expect(calculateNetworthVP(1499, 1000)).toBe(1);
    });

    it("should return 2 for 1.5×-1.99× average", () => {
      expect(calculateNetworthVP(1500, 1000)).toBe(2);
      expect(calculateNetworthVP(1750, 1000)).toBe(2);
      expect(calculateNetworthVP(1999, 1000)).toBe(2);
    });

    it("should return 3 for 2×+ average", () => {
      expect(calculateNetworthVP(2000, 1000)).toBe(3);
      expect(calculateNetworthVP(5000, 1000)).toBe(3);
    });

    it("should handle zero average gracefully", () => {
      expect(calculateNetworthVP(1000, 0)).toBe(0);
    });
  });

  describe("calculateMilitaryVP", () => {
    it("should return 0 when below 1.5× average", () => {
      expect(calculateMilitaryVP(1000, 1000)).toBe(0);
      expect(calculateMilitaryVP(1400, 1000)).toBe(0);
    });

    it("should return 1 for 1.5×-1.99× average", () => {
      expect(calculateMilitaryVP(1500, 1000)).toBe(1);
      expect(calculateMilitaryVP(1999, 1000)).toBe(1);
    });

    it("should return 2 for 2×+ average", () => {
      expect(calculateMilitaryVP(2000, 1000)).toBe(2);
      expect(calculateMilitaryVP(5000, 1000)).toBe(2);
    });
  });

  describe("calculateDiplomacyVP", () => {
    it("should return 0 for less than 2 alliances", () => {
      expect(calculateDiplomacyVP(0)).toBe(0);
      expect(calculateDiplomacyVP(1)).toBe(0);
    });

    it("should return 1 for 2-3 alliances", () => {
      expect(calculateDiplomacyVP(2)).toBe(1);
      expect(calculateDiplomacyVP(3)).toBe(1);
    });

    it("should return 2 for 4+ alliances", () => {
      expect(calculateDiplomacyVP(4)).toBe(2);
      expect(calculateDiplomacyVP(10)).toBe(2);
    });
  });

  describe("calculateEliminationVP", () => {
    it("should return 0 for less than 2 eliminations", () => {
      expect(calculateEliminationVP(0)).toBe(0);
      expect(calculateEliminationVP(1)).toBe(0);
    });

    it("should return 1 for 2-3 eliminations", () => {
      expect(calculateEliminationVP(2)).toBe(1);
      expect(calculateEliminationVP(3)).toBe(1);
    });

    it("should return 2 for 4+ eliminations", () => {
      expect(calculateEliminationVP(4)).toBe(2);
      expect(calculateEliminationVP(10)).toBe(2);
    });
  });

  describe("calculateResearchVP", () => {
    it("should return 0 for less than level 6", () => {
      expect(calculateResearchVP(0)).toBe(0);
      expect(calculateResearchVP(3)).toBe(0);
      expect(calculateResearchVP(5)).toBe(0);
    });

    it("should return 1 for level 6-7", () => {
      expect(calculateResearchVP(6)).toBe(1);
      expect(calculateResearchVP(7)).toBe(1);
    });

    it("should return 2 for level 8+", () => {
      expect(calculateResearchVP(8)).toBe(2);
      expect(calculateResearchVP(10)).toBe(2);
    });
  });

  describe("calculateVictoryPoints", () => {
    it("should calculate full breakdown correctly", () => {
      const empire = {
        sectorCount: 25,
        networth: 2000,
        militaryPower: 1600,
        allianceCount: 3,
        eliminationCount: 2,
        researchLevel: 6,
      };

      const gameStats = {
        averageNetworth: 1000,
        averageMilitary: 1000,
        totalEmpires: 50,
      };

      const result = calculateVictoryPoints(empire, gameStats);

      expect(result.territory).toBe(2); // 25 sectors
      expect(result.networth).toBe(3); // 2× average
      expect(result.military).toBe(1); // 1.6× average
      expect(result.diplomacy).toBe(1); // 3 alliances
      expect(result.eliminations).toBe(1); // 2 eliminations
      expect(result.research).toBe(1); // Level 6
      expect(result.total).toBe(9);
    });

    it("should handle minimal empire", () => {
      const empire = {
        sectorCount: 5,
        networth: 500,
        militaryPower: 500,
        allianceCount: 0,
        eliminationCount: 0,
        researchLevel: 1,
      };

      const gameStats = {
        averageNetworth: 1000,
        averageMilitary: 1000,
        totalEmpires: 50,
      };

      const result = calculateVictoryPoints(empire, gameStats);
      expect(result.total).toBe(0);
    });

    it("should handle maximum empire", () => {
      const empire = {
        sectorCount: 50,
        networth: 10000,
        militaryPower: 5000,
        allianceCount: 5,
        eliminationCount: 10,
        researchLevel: 8,
      };

      const gameStats = {
        averageNetworth: 1000,
        averageMilitary: 1000,
        totalEmpires: 50,
      };

      const result = calculateVictoryPoints(empire, gameStats);
      expect(result.territory).toBe(3);
      expect(result.networth).toBe(3);
      expect(result.military).toBe(2);
      expect(result.diplomacy).toBe(2);
      expect(result.eliminations).toBe(2);
      expect(result.research).toBe(2);
      expect(result.total).toBe(14);
    });
  });

  describe("triggersCoalition", () => {
    it("should return false below threshold", () => {
      expect(triggersCoalition(0)).toBe(false);
      expect(triggersCoalition(5)).toBe(false);
      expect(triggersCoalition(6)).toBe(false);
    });

    it("should return true at or above threshold", () => {
      expect(triggersCoalition(7)).toBe(true);
      expect(triggersCoalition(10)).toBe(true);
      expect(triggersCoalition(14)).toBe(true);
    });
  });

  describe("getMaximumVP", () => {
    it("should return 14 (max possible VP)", () => {
      // 3 + 3 + 2 + 2 + 2 + 2 = 14
      expect(getMaximumVP()).toBe(14);
    });
  });

  describe("getVPDescriptions", () => {
    it("should return descriptions for non-zero VP sources", () => {
      const breakdown = {
        territory: 2,
        networth: 1,
        military: 0,
        diplomacy: 1,
        eliminations: 0,
        research: 2,
        total: 6,
      };

      const descriptions = getVPDescriptions(breakdown);
      expect(descriptions).toHaveLength(4);
      expect(descriptions.some((d) => d.includes("Territory"))).toBe(true);
      expect(descriptions.some((d) => d.includes("Networth"))).toBe(true);
      expect(descriptions.some((d) => d.includes("Military"))).toBe(false);
      expect(descriptions.some((d) => d.includes("Diplomacy"))).toBe(true);
      expect(descriptions.some((d) => d.includes("Research"))).toBe(true);
    });

    it("should return empty array for zero VP", () => {
      const breakdown = {
        territory: 0,
        networth: 0,
        military: 0,
        diplomacy: 0,
        eliminations: 0,
        research: 0,
        total: 0,
      };

      const descriptions = getVPDescriptions(breakdown);
      expect(descriptions).toHaveLength(0);
    });
  });

  describe("calculateMilitaryPower", () => {
    it("should calculate military power from units", () => {
      const units = {
        soldiers: 100,
        fighters: 50,
        stations: 2,
        lightCruisers: 10,
        heavyCruisers: 5,
        carriers: 3,
      };

      const power = calculateMilitaryPower(units);
      // 100*1 + 50*3 + 2*50 + 10*10 + 5*25 + 3*12 = 100 + 150 + 100 + 100 + 125 + 36 = 611
      expect(power).toBe(611);
    });

    it("should handle zero units", () => {
      const units = {
        soldiers: 0,
        fighters: 0,
        stations: 0,
        lightCruisers: 0,
        heavyCruisers: 0,
        carriers: 0,
      };

      expect(calculateMilitaryPower(units)).toBe(0);
    });
  });

  describe("compareVP", () => {
    it("should return positive when a > b", () => {
      const a = { territory: 3, networth: 2, military: 1, diplomacy: 0, eliminations: 0, research: 0, total: 6 };
      const b = { territory: 1, networth: 1, military: 0, diplomacy: 0, eliminations: 0, research: 0, total: 2 };
      expect(compareVP(a, b)).toBeGreaterThan(0);
    });

    it("should return negative when a < b", () => {
      const a = { territory: 1, networth: 0, military: 0, diplomacy: 0, eliminations: 0, research: 0, total: 1 };
      const b = { territory: 3, networth: 2, military: 1, diplomacy: 0, eliminations: 0, research: 0, total: 6 };
      expect(compareVP(a, b)).toBeLessThan(0);
    });

    it("should return 0 when equal", () => {
      const a = { territory: 2, networth: 1, military: 0, diplomacy: 0, eliminations: 0, research: 0, total: 3 };
      const b = { territory: 1, networth: 2, military: 0, diplomacy: 0, eliminations: 0, research: 0, total: 3 };
      expect(compareVP(a, b)).toBe(0);
    });
  });

  describe("getCoalitionProgress", () => {
    it("should show progress correctly", () => {
      const progress = getCoalitionProgress(4);
      expect(progress.current).toBe(4);
      expect(progress.threshold).toBe(COALITION_TRIGGER_VP);
      expect(progress.remaining).toBe(3);
      expect(progress.percentage).toBeCloseTo(57.14, 1);
      expect(progress.isTriggered).toBe(false);
    });

    it("should show triggered state", () => {
      const progress = getCoalitionProgress(8);
      expect(progress.remaining).toBe(0);
      expect(progress.percentage).toBe(100);
      expect(progress.isTriggered).toBe(true);
    });

    it("should cap percentage at 100", () => {
      const progress = getCoalitionProgress(14);
      expect(progress.percentage).toBe(100);
    });
  });
});

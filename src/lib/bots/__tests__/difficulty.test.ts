import { describe, it, expect } from "vitest";
import {
  DIFFICULTY_MODIFIERS,
  getDifficultyModifiers,
  applyNightmareBonus,
  shouldMakeSuboptimalChoice,
  selectTarget,
  applySuboptimalQuantity,
} from "../difficulty";
import type { Difficulty, EmpireTarget } from "../types";

describe("Difficulty System", () => {
  describe("DIFFICULTY_MODIFIERS", () => {
    it("should have all four difficulty levels", () => {
      expect(DIFFICULTY_MODIFIERS.easy).toBeDefined();
      expect(DIFFICULTY_MODIFIERS.normal).toBeDefined();
      expect(DIFFICULTY_MODIFIERS.hard).toBeDefined();
      expect(DIFFICULTY_MODIFIERS.nightmare).toBeDefined();
    });

    it("easy should have 50% suboptimal chance", () => {
      expect(DIFFICULTY_MODIFIERS.easy.suboptimalChance).toBe(0.5);
    });

    it("normal should have 0% suboptimal chance", () => {
      expect(DIFFICULTY_MODIFIERS.normal.suboptimalChance).toBe(0);
    });

    it("hard should target weakest", () => {
      expect(DIFFICULTY_MODIFIERS.hard.targetWeakest).toBe(true);
    });

    it("nightmare should have +25% resource bonus", () => {
      expect(DIFFICULTY_MODIFIERS.nightmare.resourceBonus).toBe(1.25);
    });

    it("nightmare should target weakest", () => {
      expect(DIFFICULTY_MODIFIERS.nightmare.targetWeakest).toBe(true);
    });
  });

  describe("getDifficultyModifiers", () => {
    it("should return correct modifiers for each difficulty", () => {
      const difficulties: Difficulty[] = ["easy", "normal", "hard", "nightmare"];
      difficulties.forEach((difficulty) => {
        expect(getDifficultyModifiers(difficulty)).toEqual(
          DIFFICULTY_MODIFIERS[difficulty]
        );
      });
    });
  });

  describe("applyNightmareBonus", () => {
    it("should return unchanged income for normal difficulty", () => {
      expect(applyNightmareBonus(1000, "normal")).toBe(1000);
    });

    it("should return unchanged income for easy difficulty", () => {
      expect(applyNightmareBonus(1000, "easy")).toBe(1000);
    });

    it("should return unchanged income for hard difficulty", () => {
      expect(applyNightmareBonus(1000, "hard")).toBe(1000);
    });

    it("should apply +25% bonus for nightmare difficulty", () => {
      expect(applyNightmareBonus(1000, "nightmare")).toBe(1250);
    });

    it("should floor the result", () => {
      expect(applyNightmareBonus(1001, "nightmare")).toBe(1251);
    });
  });

  describe("shouldMakeSuboptimalChoice", () => {
    it("should never make suboptimal choice for normal difficulty", () => {
      // Test with various random values
      expect(shouldMakeSuboptimalChoice("normal", 0)).toBe(false);
      expect(shouldMakeSuboptimalChoice("normal", 0.5)).toBe(false);
      expect(shouldMakeSuboptimalChoice("normal", 0.99)).toBe(false);
    });

    it("should sometimes make suboptimal choice for easy difficulty", () => {
      // With random = 0.4, should be suboptimal (< 0.5)
      expect(shouldMakeSuboptimalChoice("easy", 0.4)).toBe(true);
      // With random = 0.6, should not be suboptimal (>= 0.5)
      expect(shouldMakeSuboptimalChoice("easy", 0.6)).toBe(false);
    });

    it("should return true 50% of the time for easy", () => {
      // Test boundary
      expect(shouldMakeSuboptimalChoice("easy", 0.49)).toBe(true);
      expect(shouldMakeSuboptimalChoice("easy", 0.50)).toBe(false);
    });
  });

  describe("selectTarget", () => {
    const mockTargets: EmpireTarget[] = [
      { id: "1", name: "Empire 1", networth: 100, sectorCount: 5, isBot: true, isEliminated: false, militaryPower: 50 },
      { id: "2", name: "Empire 2", networth: 50, sectorCount: 3, isBot: true, isEliminated: false, militaryPower: 30 },
      { id: "3", name: "Empire 3", networth: 200, sectorCount: 10, isBot: true, isEliminated: false, militaryPower: 100 },
    ];

    it("should return null for empty targets array", () => {
      expect(selectTarget([], "normal")).toBeNull();
    });

    it("should return random target for normal difficulty", () => {
      // With random = 0, should get first target
      expect(selectTarget(mockTargets, "normal", 0)?.id).toBe("1");
      // With random = 0.33, should get first target (0.33 * 3 = 0.99, floor = 0)
      expect(selectTarget(mockTargets, "normal", 0.33)?.id).toBe("1");
      // With random = 0.34, should get second target (0.34 * 3 = 1.02, floor = 1)
      expect(selectTarget(mockTargets, "normal", 0.34)?.id).toBe("2");
      // With random = 0.67, should get third target (0.67 * 3 = 2.01, floor = 2)
      expect(selectTarget(mockTargets, "normal", 0.67)?.id).toBe("3");
    });

    it("should return weakest target for hard difficulty", () => {
      const target = selectTarget(mockTargets, "hard");
      expect(target?.id).toBe("2"); // Lowest networth
    });

    it("should return weakest target for nightmare difficulty", () => {
      const target = selectTarget(mockTargets, "nightmare");
      expect(target?.id).toBe("2"); // Lowest networth
    });
  });

  describe("applySuboptimalQuantity", () => {
    it("should return original value for normal difficulty", () => {
      expect(applySuboptimalQuantity(100, 1, "normal", 0)).toBe(100);
    });

    it("should reduce value for easy difficulty when suboptimal triggered", () => {
      // With random = 0.4 (< 0.5), suboptimal choice triggered
      // Reduction factor = 0.25 + 0.4 * 0.5 = 0.45
      // 100 * 0.45 = 45
      const result = applySuboptimalQuantity(100, 1, "easy", 0.4);
      expect(result).toBeLessThan(100);
      expect(result).toBeGreaterThanOrEqual(1);
    });

    it("should not go below minimum value", () => {
      const result = applySuboptimalQuantity(2, 5, "easy", 0.1);
      expect(result).toBeGreaterThanOrEqual(5);
    });

    it("should not reduce for easy difficulty when suboptimal not triggered", () => {
      // With random = 0.6 (>= 0.5), suboptimal choice NOT triggered
      expect(applySuboptimalQuantity(100, 1, "easy", 0.6)).toBe(100);
    });
  });
});

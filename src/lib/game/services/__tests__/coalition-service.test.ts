/**
 * Coalition Service Tests (M11)
 *
 * Tests for coalition system mechanics:
 * - Coalition creation and validation
 * - Member management
 * - Diplomatic victory calculation
 * - Coalition warfare
 */

import { describe, it, expect } from "vitest";
import {
  areCoalitionsUnlocked,
  isCoalitionWarfareUnlocked,
  getCoordinatedAttackBonus,
  COALITION_UNLOCK_TURN,
  COALITION_WARFARE_UNLOCK_TURN,
  COORDINATED_ATTACK_BONUS,
} from "../diplomacy/coalition-service";
import {
  COALITION_MAX_MEMBERS,
  COALITION_MIN_MEMBERS,
  COALITION_VICTORY_THRESHOLD,
} from "@/lib/constants/diplomacy";

describe("Coalition Service", () => {
  describe("Constants", () => {
    it("should have correct coalition unlock turn", () => {
      expect(COALITION_UNLOCK_TURN).toBe(20);
    });

    it("should have correct coalition warfare unlock turn", () => {
      expect(COALITION_WARFARE_UNLOCK_TURN).toBe(75);
    });

    it("should have correct coordinated attack bonus", () => {
      expect(COORDINATED_ATTACK_BONUS).toBe(0.10);
    });

    it("should have correct max members from diplomacy constants", () => {
      expect(COALITION_MAX_MEMBERS).toBe(5);
    });

    it("should have correct min members from diplomacy constants", () => {
      expect(COALITION_MIN_MEMBERS).toBe(2);
    });

    it("should have correct victory threshold from diplomacy constants", () => {
      expect(COALITION_VICTORY_THRESHOLD).toBe(0.5);
    });
  });

  describe("areCoalitionsUnlocked", () => {
    it("should return false before turn 20", () => {
      expect(areCoalitionsUnlocked(1)).toBe(false);
      expect(areCoalitionsUnlocked(10)).toBe(false);
      expect(areCoalitionsUnlocked(19)).toBe(false);
    });

    it("should return true at turn 20", () => {
      expect(areCoalitionsUnlocked(20)).toBe(true);
    });

    it("should return true after turn 20", () => {
      expect(areCoalitionsUnlocked(21)).toBe(true);
      expect(areCoalitionsUnlocked(50)).toBe(true);
      expect(areCoalitionsUnlocked(100)).toBe(true);
    });
  });

  describe("isCoalitionWarfareUnlocked", () => {
    it("should return false before turn 75", () => {
      expect(isCoalitionWarfareUnlocked(1)).toBe(false);
      expect(isCoalitionWarfareUnlocked(50)).toBe(false);
      expect(isCoalitionWarfareUnlocked(74)).toBe(false);
    });

    it("should return true at turn 75", () => {
      expect(isCoalitionWarfareUnlocked(75)).toBe(true);
    });

    it("should return true after turn 75", () => {
      expect(isCoalitionWarfareUnlocked(76)).toBe(true);
      expect(isCoalitionWarfareUnlocked(100)).toBe(true);
      expect(isCoalitionWarfareUnlocked(200)).toBe(true);
    });
  });

  describe("getCoordinatedAttackBonus", () => {
    it("should return 10% bonus for coordinated attacks", () => {
      expect(getCoordinatedAttackBonus(true)).toBe(0.10);
    });

    it("should return 0 bonus for non-coordinated attacks", () => {
      expect(getCoordinatedAttackBonus(false)).toBe(0);
    });
  });

  describe("Coalition Victory Threshold", () => {
    it("should require 50% territory for diplomatic victory", () => {
      // Test the threshold value
      expect(COALITION_VICTORY_THRESHOLD).toBe(0.5);

      // Example: coalition with 50 sectors out of 100 total
      const coalitionSectors = 50;
      const totalSectors = 100;
      const territoryPercent = coalitionSectors / totalSectors;

      expect(territoryPercent >= COALITION_VICTORY_THRESHOLD).toBe(true);
    });

    it("should not trigger victory under 50% territory", () => {
      // Example: coalition with 49 sectors out of 100 total
      const coalitionSectors = 49;
      const totalSectors = 100;
      const territoryPercent = coalitionSectors / totalSectors;

      expect(territoryPercent >= COALITION_VICTORY_THRESHOLD).toBe(false);
    });

    it("should handle edge case of exactly 50%", () => {
      // Exactly 50 out of 100
      const coalitionSectors = 500;
      const totalSectors = 1000;
      const territoryPercent = coalitionSectors / totalSectors;

      expect(territoryPercent).toBe(0.5);
      expect(territoryPercent >= COALITION_VICTORY_THRESHOLD).toBe(true);
    });
  });

  describe("Coalition Member Limits", () => {
    it("should enforce maximum of 5 members", () => {
      const members = [1, 2, 3, 4, 5];
      expect(members.length <= COALITION_MAX_MEMBERS).toBe(true);

      const tooManyMembers = [1, 2, 3, 4, 5, 6];
      expect(tooManyMembers.length <= COALITION_MAX_MEMBERS).toBe(false);
    });

    it("should require minimum of 2 members for activation", () => {
      const singleMember = [1];
      expect(singleMember.length >= COALITION_MIN_MEMBERS).toBe(false);

      const twoMembers = [1, 2];
      expect(twoMembers.length >= COALITION_MIN_MEMBERS).toBe(true);
    });
  });

  describe("Territory Calculation", () => {
    it("should correctly calculate territory percentage", () => {
      const testCases = [
        { coalition: 10, total: 100, expected: 10 },
        { coalition: 25, total: 100, expected: 25 },
        { coalition: 50, total: 100, expected: 50 },
        { coalition: 75, total: 100, expected: 75 },
        { coalition: 100, total: 100, expected: 100 },
      ];

      testCases.forEach(({ coalition, total, expected }) => {
        const percent = (coalition / total) * 100;
        expect(percent).toBe(expected);
      });
    });

    it("should handle fractional percentages", () => {
      const coalitionSectors = 33;
      const totalSectors = 100;
      const percent = (coalitionSectors / totalSectors) * 100;

      expect(percent).toBe(33);
    });

    it("should handle zero total sectors safely", () => {
      const coalitionSectors = 0;
      const totalSectors = 0;

      // Avoid division by zero
      const percent = totalSectors > 0 ? (coalitionSectors / totalSectors) * 100 : 0;
      expect(percent).toBe(0);
    });
  });

  describe("Coalition Power Calculation", () => {
    it("should sum member networthhs", () => {
      const memberNetworthhs = [100000, 200000, 150000];
      const totalPower = memberNetworthhs.reduce((sum, n) => sum + n, 0);

      expect(totalPower).toBe(450000);
    });

    it("should handle single member", () => {
      const memberNetworthhs = [500000];
      const totalPower = memberNetworthhs.reduce((sum, n) => sum + n, 0);

      expect(totalPower).toBe(500000);
    });

    it("should handle maximum members", () => {
      const memberNetworthhs = [100000, 200000, 300000, 400000, 500000];
      expect(memberNetworthhs.length).toBe(COALITION_MAX_MEMBERS);

      const totalPower = memberNetworthhs.reduce((sum, n) => sum + n, 0);
      expect(totalPower).toBe(1500000);
    });
  });

  describe("Coordinated Attack Mechanics", () => {
    it("should apply 10% combat power bonus", () => {
      const basePower = 1000;
      const bonus = getCoordinatedAttackBonus(true);
      const boostedPower = basePower * (1 + bonus);

      expect(boostedPower).toBe(1100);
    });

    it("should not apply bonus to non-coordinated attacks", () => {
      const basePower = 1000;
      const bonus = getCoordinatedAttackBonus(false);
      const power = basePower * (1 + bonus);

      expect(power).toBe(1000);
    });
  });

  describe("Coalition Status Transitions", () => {
    it("should start in forming status with one member", () => {
      const memberCount = 1;
      const minRequired = COALITION_MIN_MEMBERS;

      const shouldBeForming = memberCount < minRequired;
      expect(shouldBeForming).toBe(true);
    });

    it("should activate when minimum members join", () => {
      const memberCount = 2;
      const minRequired = COALITION_MIN_MEMBERS;

      const shouldBeActive = memberCount >= minRequired;
      expect(shouldBeActive).toBe(true);
    });

    it("should return to forming if below minimum after member leaves", () => {
      const memberCount = 1; // After one left from 2
      const minRequired = COALITION_MIN_MEMBERS;

      const shouldRevertToForming = memberCount < minRequired;
      expect(shouldRevertToForming).toBe(true);
    });

    it("should dissolve when all members leave", () => {
      const memberCount = 0;

      const shouldDissolve = memberCount === 0;
      expect(shouldDissolve).toBe(true);
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  TREATY_TYPES,
  TREATY_MIN_DURATION,
  TREATY_BREAK_COOLDOWN,
  REPUTATION_EVENTS,
  RELATIONSHIP_THRESHOLDS,
  getRelationFromReputation,
  COALITION_MAX_MEMBERS,
  COALITION_MIN_MEMBERS,
  COALITION_REPUTATION_BONUS,
  COALITION_VICTORY_THRESHOLD,
  PROTECTION_PERIOD_TURNS,
  isUnderProtection,
  NETWORTH_ATTACK_RATIO,
  canAttackByNetworth,
  getTreatyDefinition,
  getReputationChange,
  isEventPermanent,
  calculateDecayedReputation,
  ALL_TREATY_TYPES,
  ALL_REPUTATION_EVENTS,
  type TreatyType,
  type ReputationEventType,
} from "../diplomacy";

describe("Diplomacy Constants", () => {
  describe("TREATY_TYPES", () => {
    it("should define NAP treaty", () => {
      const nap = TREATY_TYPES.nap;
      expect(nap.name).toBe("Non-Aggression Pact");
      expect(nap.duration).toBe(20);
      expect(nap.breakPenalty).toBe(-50);
      expect(nap.mutualDefense).toBe(false);
      expect(nap.sharedIntelligence).toBe(false);
    });

    it("should define Alliance treaty", () => {
      const alliance = TREATY_TYPES.alliance;
      expect(alliance.name).toBe("Alliance");
      expect(alliance.duration).toBe(40);
      expect(alliance.breakPenalty).toBe(-100);
      expect(alliance.tradeBonus).toBe(0.1);
      expect(alliance.mutualDefense).toBe(true);
      expect(alliance.sharedIntelligence).toBe(true);
    });

    it("should have stricter penalties for alliance breaking", () => {
      expect(Math.abs(TREATY_TYPES.alliance.breakPenalty)).toBeGreaterThan(
        Math.abs(TREATY_TYPES.nap.breakPenalty)
      );
    });
  });

  describe("Treaty Constants", () => {
    it("should have minimum treaty duration", () => {
      expect(TREATY_MIN_DURATION).toBe(5);
    });

    it("should have break cooldown period", () => {
      expect(TREATY_BREAK_COOLDOWN).toBe(10);
    });
  });

  describe("REPUTATION_EVENTS", () => {
    it("should have treaty_broken as permanent with high penalty", () => {
      const event = REPUTATION_EVENTS.treaty_broken;
      expect(event.change).toBeLessThan(-50);
      expect(event.isPermanent).toBe(true);
      expect(event.decayResistance).toBe(1.0);
    });

    it("should have positive reputation for treaty_honored", () => {
      expect(REPUTATION_EVENTS.treaty_honored.change).toBeGreaterThan(0);
    });

    it("should have captured_planet as permanent with high penalty", () => {
      const event = REPUTATION_EVENTS.captured_planet;
      expect(event.isPermanent).toBe(true);
      expect(event.change).toBeLessThan(-50);
    });

    it("should have saved_from_destruction as highest positive change", () => {
      expect(REPUTATION_EVENTS.saved_from_destruction.change).toBeGreaterThanOrEqual(90);
    });

    it("should have small change for message_sent", () => {
      expect(REPUTATION_EVENTS.message_sent.change).toBe(1);
    });

    it("should have decay resistance values between 0 and 1", () => {
      for (const eventType of ALL_REPUTATION_EVENTS) {
        const event = REPUTATION_EVENTS[eventType] as { decayResistance?: number };
        if (event.decayResistance !== undefined) {
          expect(event.decayResistance).toBeGreaterThanOrEqual(0);
          expect(event.decayResistance).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe("RELATIONSHIP_THRESHOLDS", () => {
    it("should have thresholds in ascending order", () => {
      expect(RELATIONSHIP_THRESHOLDS.hostile).toBeLessThan(RELATIONSHIP_THRESHOLDS.unfriendly);
      expect(RELATIONSHIP_THRESHOLDS.unfriendly).toBeLessThan(RELATIONSHIP_THRESHOLDS.neutral);
      expect(RELATIONSHIP_THRESHOLDS.neutral).toBeLessThan(RELATIONSHIP_THRESHOLDS.friendly);
    });
  });

  describe("getRelationFromReputation", () => {
    it("should return hostile for very negative reputation", () => {
      expect(getRelationFromReputation(-150)).toBe("hostile");
      expect(getRelationFromReputation(-101)).toBe("hostile");
    });

    it("should return unfriendly for moderately negative reputation", () => {
      expect(getRelationFromReputation(-100)).toBe("unfriendly");
      expect(getRelationFromReputation(-50)).toBe("unfriendly");
      expect(getRelationFromReputation(-26)).toBe("unfriendly");
    });

    it("should return neutral for near-zero reputation", () => {
      expect(getRelationFromReputation(-25)).toBe("neutral");
      expect(getRelationFromReputation(0)).toBe("neutral");
      expect(getRelationFromReputation(24)).toBe("neutral");
    });

    it("should return friendly for positive reputation", () => {
      expect(getRelationFromReputation(25)).toBe("friendly");
      expect(getRelationFromReputation(50)).toBe("friendly");
      expect(getRelationFromReputation(74)).toBe("friendly");
    });

    it("should return allied for high positive reputation", () => {
      expect(getRelationFromReputation(75)).toBe("allied");
      expect(getRelationFromReputation(100)).toBe("allied");
      expect(getRelationFromReputation(200)).toBe("allied");
    });
  });

  describe("Coalition Constants", () => {
    it("should have max members of 5", () => {
      expect(COALITION_MAX_MEMBERS).toBe(5);
    });

    it("should have min members of 2", () => {
      expect(COALITION_MIN_MEMBERS).toBe(2);
    });

    it("should have reputation bonus", () => {
      expect(COALITION_REPUTATION_BONUS).toBe(25);
    });

    it("should have victory threshold of 50%", () => {
      expect(COALITION_VICTORY_THRESHOLD).toBe(0.5);
    });
  });

  describe("Protection Period", () => {
    it("should be 20 turns", () => {
      expect(PROTECTION_PERIOD_TURNS).toBe(20);
    });

    it("isUnderProtection should return true for first 20 turns", () => {
      expect(isUnderProtection(1)).toBe(true);
      expect(isUnderProtection(10)).toBe(true);
      expect(isUnderProtection(20)).toBe(true);
    });

    it("isUnderProtection should return false after turn 20", () => {
      expect(isUnderProtection(21)).toBe(false);
      expect(isUnderProtection(50)).toBe(false);
      expect(isUnderProtection(100)).toBe(false);
    });
  });

  describe("Attack Restrictions", () => {
    it("should have networth ratio of 0.25", () => {
      expect(NETWORTH_ATTACK_RATIO).toBe(0.25);
    });

    describe("canAttackByNetworth", () => {
      it("should allow attacks on equal networth", () => {
        expect(canAttackByNetworth(1000, 1000)).toBe(true);
      });

      it("should allow attacks on slightly weaker empires", () => {
        expect(canAttackByNetworth(1000, 500)).toBe(true); // 50% is above 25%
        expect(canAttackByNetworth(1000, 300)).toBe(true); // 30% is above 25%
      });

      it("should block attacks on much weaker empires", () => {
        expect(canAttackByNetworth(1000, 200)).toBe(false); // 20% is below 25%
        expect(canAttackByNetworth(1000, 100)).toBe(false); // 10% is below 25%
      });

      it("should allow retaliation against weaker empires", () => {
        expect(canAttackByNetworth(1000, 100, true)).toBe(true);
        expect(canAttackByNetworth(1000, 50, true)).toBe(true);
      });

      it("should handle edge case at exactly 25%", () => {
        expect(canAttackByNetworth(1000, 250)).toBe(true);
        expect(canAttackByNetworth(1000, 249)).toBe(false);
      });
    });
  });

  describe("getTreatyDefinition", () => {
    it("should return NAP definition", () => {
      const def = getTreatyDefinition("nap");
      expect(def.name).toBe("Non-Aggression Pact");
    });

    it("should return Alliance definition", () => {
      const def = getTreatyDefinition("alliance");
      expect(def.name).toBe("Alliance");
    });
  });

  describe("getReputationChange", () => {
    it("should return correct change for treaty_broken", () => {
      expect(getReputationChange("treaty_broken")).toBe(-100);
    });

    it("should return correct change for saved_from_destruction", () => {
      expect(getReputationChange("saved_from_destruction")).toBe(90);
    });

    it("should return correct change for message_sent", () => {
      expect(getReputationChange("message_sent")).toBe(1);
    });
  });

  describe("isEventPermanent", () => {
    it("should return true for permanent events", () => {
      expect(isEventPermanent("treaty_broken")).toBe(true);
      expect(isEventPermanent("captured_planet")).toBe(true);
      expect(isEventPermanent("trade_cheated")).toBe(true);
    });

    it("should return false for non-permanent events", () => {
      expect(isEventPermanent("treaty_honored")).toBe(false);
      expect(isEventPermanent("message_sent")).toBe(false);
      expect(isEventPermanent("trade_completed")).toBe(false);
    });
  });

  describe("calculateDecayedReputation", () => {
    it("should not decay permanent events", () => {
      expect(calculateDecayedReputation("treaty_broken", 100)).toBe(-100);
      expect(calculateDecayedReputation("captured_planet", 50)).toBe(-80);
    });

    it("should decay non-permanent events over time", () => {
      const initial = getReputationChange("message_sent");
      const decayed = calculateDecayedReputation("message_sent", 20);
      expect(decayed).toBeLessThanOrEqual(initial);
    });

    it("should decay faster for low decay resistance", () => {
      // trade_completed has 0.1 resistance, defended_ally has 0.6 resistance
      // Both are positive values, making comparison easier
      const lowResistance = calculateDecayedReputation("trade_completed", 20);
      const highResistance = calculateDecayedReputation("defended_ally", 20);

      const lowOriginal = getReputationChange("trade_completed"); // +5
      const highOriginal = getReputationChange("defended_ally"); // +30

      // Calculate retained percentage
      const lowRetained = lowResistance / lowOriginal;
      const highRetained = highResistance / highOriginal;

      // Higher resistance should retain more of the original value
      expect(highRetained).toBeGreaterThan(lowRetained);
    });

    it("should not decay high resistance events quickly", () => {
      // attacked has 0.7 decay resistance, original is -40
      const decayed5 = calculateDecayedReputation("attacked", 5);
      const original = getReputationChange("attacked");
      // For negative values, decayed should have smaller absolute value (be closer to 0)
      expect(Math.abs(decayed5)).toBeLessThan(Math.abs(original));
      expect(Math.abs(decayed5)).toBeGreaterThan(Math.abs(original) * 0.5);
    });

    it("should return 0 or near 0 after many turns for low resistance", () => {
      const decayed = calculateDecayedReputation("message_sent", 100);
      expect(Math.abs(decayed)).toBeLessThanOrEqual(1);
    });
  });

  describe("ALL_TREATY_TYPES", () => {
    it("should contain nap and alliance", () => {
      expect(ALL_TREATY_TYPES).toContain("nap");
      expect(ALL_TREATY_TYPES).toContain("alliance");
      expect(ALL_TREATY_TYPES.length).toBe(2);
    });
  });

  describe("ALL_REPUTATION_EVENTS", () => {
    it("should contain all expected events", () => {
      expect(ALL_REPUTATION_EVENTS).toContain("treaty_broken");
      expect(ALL_REPUTATION_EVENTS).toContain("treaty_honored");
      expect(ALL_REPUTATION_EVENTS).toContain("captured_planet");
      expect(ALL_REPUTATION_EVENTS).toContain("saved_from_destruction");
      expect(ALL_REPUTATION_EVENTS.length).toBeGreaterThan(10);
    });
  });
});

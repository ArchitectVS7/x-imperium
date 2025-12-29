import { describe, it, expect } from "vitest";
import {
  EMOTIONAL_STATE_NAMES,
  EMOTIONAL_STATES,
  DEFAULT_EMOTIONAL_STATE,
  DEFAULT_INTENSITY,
  POSITIVE_STATES,
  NEGATIVE_STATES,
  AGGRESSIVE_STATES,
  PASSIVE_STATES,
  ALLIANCE_SEEKING_STATES,
  ISOLATIONIST_STATES,
  getEmotionalState,
  getScaledModifiers,
  applyModifier,
  getDecisionMultiplier,
  getAllianceMultiplier,
  getAggressionMultiplier,
  getNegotiationMultiplier,
  isStateCategory,
  ALL_EMOTIONAL_STATES,
  type EmotionalStateName,
} from "../states";

describe("Emotional States", () => {
  describe("EMOTIONAL_STATE_NAMES", () => {
    it("should have 6 emotional states", () => {
      expect(EMOTIONAL_STATE_NAMES.length).toBe(6);
    });

    it("should contain all expected states", () => {
      expect(EMOTIONAL_STATE_NAMES).toContain("confident");
      expect(EMOTIONAL_STATE_NAMES).toContain("arrogant");
      expect(EMOTIONAL_STATE_NAMES).toContain("desperate");
      expect(EMOTIONAL_STATE_NAMES).toContain("vengeful");
      expect(EMOTIONAL_STATE_NAMES).toContain("fearful");
      expect(EMOTIONAL_STATE_NAMES).toContain("triumphant");
    });
  });

  describe("EMOTIONAL_STATES", () => {
    it("should have definitions for all states", () => {
      for (const stateName of EMOTIONAL_STATE_NAMES) {
        const state = EMOTIONAL_STATES[stateName];
        expect(state).toBeDefined();
        expect(state.name).toBe(stateName);
        expect(state.displayName).toBeTruthy();
        expect(state.description).toBeTruthy();
        expect(state.messageTone).toBeTruthy();
        expect(state.indicatorPhrases.length).toBeGreaterThan(0);
      }
    });

    it("should have valid modifiers for all states", () => {
      for (const stateName of EMOTIONAL_STATE_NAMES) {
        const { modifiers } = EMOTIONAL_STATES[stateName];
        expect(modifiers.decisionQuality).toBeGreaterThanOrEqual(-1);
        expect(modifiers.decisionQuality).toBeLessThanOrEqual(1);
        expect(modifiers.allianceWillingness).toBeGreaterThanOrEqual(-1);
        expect(modifiers.allianceWillingness).toBeLessThanOrEqual(1);
        expect(modifiers.aggression).toBeGreaterThanOrEqual(-1);
        expect(modifiers.aggression).toBeLessThanOrEqual(1);
        expect(modifiers.negotiation).toBeGreaterThanOrEqual(-1);
        expect(modifiers.negotiation).toBeLessThanOrEqual(1);
      }
    });

    it("should have correct modifiers for confident state (PRD Table)", () => {
      const modifiers = EMOTIONAL_STATES.confident.modifiers;
      expect(modifiers.decisionQuality).toBeCloseTo(0.05);
      expect(modifiers.allianceWillingness).toBeCloseTo(-0.20);
      expect(modifiers.aggression).toBeCloseTo(0.10);
      expect(modifiers.negotiation).toBeCloseTo(0.10);
    });

    it("should have correct modifiers for arrogant state (PRD Table)", () => {
      const modifiers = EMOTIONAL_STATES.arrogant.modifiers;
      expect(modifiers.decisionQuality).toBeCloseTo(-0.15);
      expect(modifiers.allianceWillingness).toBeCloseTo(-0.40);
      expect(modifiers.aggression).toBeCloseTo(0.30);
      expect(modifiers.negotiation).toBeCloseTo(-0.30);
    });

    it("should have correct modifiers for desperate state (PRD Table)", () => {
      const modifiers = EMOTIONAL_STATES.desperate.modifiers;
      expect(modifiers.decisionQuality).toBeCloseTo(-0.10);
      expect(modifiers.allianceWillingness).toBeCloseTo(0.40);
      expect(modifiers.aggression).toBeCloseTo(-0.20);
      expect(modifiers.negotiation).toBeCloseTo(-0.20);
    });

    it("should have correct modifiers for vengeful state (PRD Table)", () => {
      const modifiers = EMOTIONAL_STATES.vengeful.modifiers;
      expect(modifiers.decisionQuality).toBeCloseTo(-0.05);
      expect(modifiers.allianceWillingness).toBeCloseTo(-0.30);
      expect(modifiers.aggression).toBeCloseTo(0.40);
      expect(modifiers.negotiation).toBeCloseTo(-0.40);
    });

    it("should have correct modifiers for fearful state (PRD Table)", () => {
      const modifiers = EMOTIONAL_STATES.fearful.modifiers;
      expect(modifiers.decisionQuality).toBeCloseTo(-0.10);
      expect(modifiers.allianceWillingness).toBeCloseTo(0.50);
      expect(modifiers.aggression).toBeCloseTo(-0.30);
      expect(modifiers.negotiation).toBeCloseTo(0.10);
    });

    it("should have correct modifiers for triumphant state (PRD Table)", () => {
      const modifiers = EMOTIONAL_STATES.triumphant.modifiers;
      expect(modifiers.decisionQuality).toBeCloseTo(0.10);
      expect(modifiers.allianceWillingness).toBeCloseTo(-0.10);
      expect(modifiers.aggression).toBeCloseTo(0.20);
      expect(modifiers.negotiation).toBeCloseTo(-0.20);
    });
  });

  describe("Default values", () => {
    it("should have confident as default state", () => {
      expect(DEFAULT_EMOTIONAL_STATE).toBe("confident");
    });

    it("should have 0.5 as default intensity", () => {
      expect(DEFAULT_INTENSITY).toBe(0.5);
    });
  });

  describe("State Categories", () => {
    it("should categorize positive states correctly", () => {
      expect(POSITIVE_STATES).toContain("confident");
      expect(POSITIVE_STATES).toContain("triumphant");
      expect(POSITIVE_STATES).not.toContain("desperate");
      expect(POSITIVE_STATES).not.toContain("fearful");
    });

    it("should categorize negative states correctly", () => {
      expect(NEGATIVE_STATES).toContain("arrogant");
      expect(NEGATIVE_STATES).toContain("desperate");
      expect(NEGATIVE_STATES).toContain("vengeful");
      expect(NEGATIVE_STATES).toContain("fearful");
      expect(NEGATIVE_STATES).not.toContain("confident");
    });

    it("should categorize aggressive states correctly", () => {
      expect(AGGRESSIVE_STATES).toContain("arrogant");
      expect(AGGRESSIVE_STATES).toContain("vengeful");
      expect(AGGRESSIVE_STATES).toContain("triumphant");
      expect(AGGRESSIVE_STATES).toContain("confident");
    });

    it("should categorize passive states correctly", () => {
      expect(PASSIVE_STATES).toContain("desperate");
      expect(PASSIVE_STATES).toContain("fearful");
      expect(PASSIVE_STATES.length).toBe(2);
    });

    it("should categorize alliance seeking states correctly", () => {
      expect(ALLIANCE_SEEKING_STATES).toContain("desperate");
      expect(ALLIANCE_SEEKING_STATES).toContain("fearful");
    });

    it("should categorize isolationist states correctly", () => {
      expect(ISOLATIONIST_STATES).toContain("arrogant");
      expect(ISOLATIONIST_STATES).toContain("vengeful");
      expect(ISOLATIONIST_STATES).toContain("confident");
      expect(ISOLATIONIST_STATES).toContain("triumphant");
    });
  });

  describe("getEmotionalState", () => {
    it("should return the correct state definition", () => {
      const confident = getEmotionalState("confident");
      expect(confident.name).toBe("confident");
      expect(confident.displayName).toBe("Confident");
    });

    it("should return definition for all states", () => {
      for (const stateName of EMOTIONAL_STATE_NAMES) {
        const state = getEmotionalState(stateName);
        expect(state.name).toBe(stateName);
      }
    });
  });

  describe("getScaledModifiers", () => {
    it("should return zero modifiers at intensity 0", () => {
      const modifiers = getScaledModifiers("confident", 0);
      expect(modifiers.decisionQuality).toBeCloseTo(0);
      expect(modifiers.allianceWillingness).toBeCloseTo(0);
      expect(modifiers.aggression).toBeCloseTo(0);
      expect(modifiers.negotiation).toBeCloseTo(0);
    });

    it("should return full modifiers at intensity 1", () => {
      const modifiers = getScaledModifiers("confident", 1);
      expect(modifiers.decisionQuality).toBeCloseTo(0.05);
      expect(modifiers.allianceWillingness).toBeCloseTo(-0.20);
      expect(modifiers.aggression).toBeCloseTo(0.10);
      expect(modifiers.negotiation).toBeCloseTo(0.10);
    });

    it("should return half modifiers at intensity 0.5", () => {
      const modifiers = getScaledModifiers("confident", 0.5);
      expect(modifiers.decisionQuality).toBeCloseTo(0.025);
      expect(modifiers.allianceWillingness).toBeCloseTo(-0.10);
      expect(modifiers.aggression).toBeCloseTo(0.05);
      expect(modifiers.negotiation).toBeCloseTo(0.05);
    });

    it("should clamp intensity to valid range", () => {
      const modifiers1 = getScaledModifiers("arrogant", 1.5);
      const modifiers2 = getScaledModifiers("arrogant", 1.0);
      expect(modifiers1.decisionQuality).toBe(modifiers2.decisionQuality);

      const modifiers3 = getScaledModifiers("arrogant", -0.5);
      const modifiers4 = getScaledModifiers("arrogant", 0);
      expect(modifiers3.decisionQuality).toBe(modifiers4.decisionQuality);
    });
  });

  describe("applyModifier", () => {
    it("should apply positive modifier correctly", () => {
      expect(applyModifier(100, 0.10)).toBeCloseTo(110);
    });

    it("should apply negative modifier correctly", () => {
      expect(applyModifier(100, -0.20)).toBeCloseTo(80);
    });

    it("should handle zero modifier", () => {
      expect(applyModifier(100, 0)).toBe(100);
    });

    it("should work with decimal base values", () => {
      expect(applyModifier(0.5, 0.10)).toBeCloseTo(0.55);
    });
  });

  describe("getDecisionMultiplier", () => {
    it("should return 1.05 for confident at full intensity", () => {
      expect(getDecisionMultiplier("confident", 1)).toBeCloseTo(1.05);
    });

    it("should return 0.85 for arrogant at full intensity", () => {
      expect(getDecisionMultiplier("arrogant", 1)).toBeCloseTo(0.85);
    });

    it("should return 1.0 at zero intensity", () => {
      expect(getDecisionMultiplier("arrogant", 0)).toBe(1);
    });

    it("should scale with intensity", () => {
      const half = getDecisionMultiplier("confident", 0.5);
      const full = getDecisionMultiplier("confident", 1);
      expect(half).toBeLessThan(full);
      expect(half).toBeGreaterThan(1);
    });
  });

  describe("getAllianceMultiplier", () => {
    it("should return high value for fearful (alliance seeking)", () => {
      expect(getAllianceMultiplier("fearful", 1)).toBeCloseTo(1.50);
    });

    it("should return low value for arrogant (isolationist)", () => {
      expect(getAllianceMultiplier("arrogant", 1)).toBeCloseTo(0.60);
    });

    it("should return 1.0 at zero intensity", () => {
      expect(getAllianceMultiplier("desperate", 0)).toBe(1);
    });
  });

  describe("getAggressionMultiplier", () => {
    it("should return high value for vengeful", () => {
      expect(getAggressionMultiplier("vengeful", 1)).toBeCloseTo(1.40);
    });

    it("should return low value for fearful", () => {
      expect(getAggressionMultiplier("fearful", 1)).toBeCloseTo(0.70);
    });

    it("should return 1.0 at zero intensity", () => {
      expect(getAggressionMultiplier("vengeful", 0)).toBe(1);
    });
  });

  describe("getNegotiationMultiplier", () => {
    it("should return high value for confident", () => {
      expect(getNegotiationMultiplier("confident", 1)).toBeCloseTo(1.10);
    });

    it("should return low value for vengeful", () => {
      expect(getNegotiationMultiplier("vengeful", 1)).toBeCloseTo(0.60);
    });

    it("should return 1.0 at zero intensity", () => {
      expect(getNegotiationMultiplier("arrogant", 0)).toBe(1);
    });
  });

  describe("isStateCategory", () => {
    it("should correctly identify positive states", () => {
      expect(isStateCategory("confident", "positive")).toBe(true);
      expect(isStateCategory("triumphant", "positive")).toBe(true);
      expect(isStateCategory("desperate", "positive")).toBe(false);
    });

    it("should correctly identify negative states", () => {
      expect(isStateCategory("arrogant", "negative")).toBe(true);
      expect(isStateCategory("desperate", "negative")).toBe(true);
      expect(isStateCategory("confident", "negative")).toBe(false);
    });

    it("should correctly identify aggressive states", () => {
      expect(isStateCategory("vengeful", "aggressive")).toBe(true);
      expect(isStateCategory("arrogant", "aggressive")).toBe(true);
      expect(isStateCategory("fearful", "aggressive")).toBe(false);
    });

    it("should correctly identify passive states", () => {
      expect(isStateCategory("fearful", "passive")).toBe(true);
      expect(isStateCategory("desperate", "passive")).toBe(true);
      expect(isStateCategory("confident", "passive")).toBe(false);
    });

    it("should correctly identify alliance_seeking states", () => {
      expect(isStateCategory("desperate", "alliance_seeking")).toBe(true);
      expect(isStateCategory("fearful", "alliance_seeking")).toBe(true);
      expect(isStateCategory("arrogant", "alliance_seeking")).toBe(false);
    });

    it("should correctly identify isolationist states", () => {
      expect(isStateCategory("arrogant", "isolationist")).toBe(true);
      expect(isStateCategory("vengeful", "isolationist")).toBe(true);
      expect(isStateCategory("desperate", "isolationist")).toBe(false);
    });
  });

  describe("ALL_EMOTIONAL_STATES", () => {
    it("should contain all 6 states", () => {
      expect(ALL_EMOTIONAL_STATES.length).toBe(6);
    });

    it("should be identical to EMOTIONAL_STATE_NAMES", () => {
      expect(ALL_EMOTIONAL_STATES).toEqual([...EMOTIONAL_STATE_NAMES]);
    });
  });

  describe("State consistency", () => {
    it("all states should be in either positive or negative category", () => {
      for (const state of EMOTIONAL_STATE_NAMES) {
        const isPositive = POSITIVE_STATES.includes(state);
        const isNegative = NEGATIVE_STATES.includes(state);
        expect(isPositive || isNegative).toBe(true);
        expect(isPositive && isNegative).toBe(false);
      }
    });

    it("all states should be in either aggressive or passive category", () => {
      for (const state of EMOTIONAL_STATE_NAMES) {
        const isAggressive = AGGRESSIVE_STATES.includes(state);
        const isPassive = PASSIVE_STATES.includes(state);
        expect(isAggressive || isPassive).toBe(true);
        expect(isAggressive && isPassive).toBe(false);
      }
    });

    it("all states should be in either alliance_seeking or isolationist category", () => {
      for (const state of EMOTIONAL_STATE_NAMES) {
        const isAllianceSeeking = ALLIANCE_SEEKING_STATES.includes(state);
        const isIsolationist = ISOLATIONIST_STATES.includes(state);
        expect(isAllianceSeeking || isIsolationist).toBe(true);
        expect(isAllianceSeeking && isIsolationist).toBe(false);
      }
    });
  });
});

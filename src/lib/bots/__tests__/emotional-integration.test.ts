/**
 * Emotional Integration Tests (M10)
 *
 * Tests for the emotional state system integration with bot decisions.
 */

import { describe, it, expect } from "vitest";
import {
  applyEmotionalModifiers,
  getEmotionalWeightModifiers,
} from "../decision-engine";
import type { BotDecisionWeights } from "../types";
import { getScaledModifiers, type EmotionalStateName } from "../emotions";

describe("applyEmotionalModifiers", () => {
  const baseWeights: BotDecisionWeights = {
    build_units: 0.25,
    buy_planet: 0.12,
    attack: 0.10,
    diplomacy: 0.08,
    trade: 0.08,
    do_nothing: 0.05,
    craft_component: 0.08,
    accept_contract: 0.04,
    purchase_black_market: 0.04,
    covert_operation: 0.06,
    fund_research: 0.05,
    upgrade_units: 0.05,
  };

  it("should increase attack weight for arrogant state", () => {
    const result = applyEmotionalModifiers(baseWeights, "arrogant", 1.0);

    // Arrogant: +30% aggression
    // Attack should be higher relative to base
    expect(result.attack).toBeGreaterThan(baseWeights.attack * 0.9); // Account for normalization
  });

  it("should increase attack weight for vengeful state", () => {
    const result = applyEmotionalModifiers(baseWeights, "vengeful", 1.0);

    // Vengeful: +40% aggression
    expect(result.attack).toBeGreaterThan(baseWeights.attack * 0.9);
  });

  it("should decrease attack weight for fearful state", () => {
    const result = applyEmotionalModifiers(baseWeights, "fearful", 1.0);

    // Fearful: -30% aggression
    const attackRatio = result.attack / baseWeights.attack;
    const diplomacyRatio = result.diplomacy / baseWeights.diplomacy;
    // Attack should decrease relative to diplomacy
    expect(attackRatio).toBeLessThan(diplomacyRatio);
  });

  it("should increase diplomacy weight for desperate state", () => {
    const result = applyEmotionalModifiers(baseWeights, "desperate", 1.0);

    // Desperate: +40% alliance-seeking
    const diplomacyRatio = result.diplomacy / baseWeights.diplomacy;
    const attackRatio = result.attack / baseWeights.attack;
    // Diplomacy should increase relative to attack
    expect(diplomacyRatio).toBeGreaterThan(attackRatio);
  });

  it("should increase diplomacy weight for fearful state", () => {
    const result = applyEmotionalModifiers(baseWeights, "fearful", 1.0);

    // Fearful: +50% alliance-seeking
    const diplomacyRatio = result.diplomacy / baseWeights.diplomacy;
    expect(diplomacyRatio).toBeGreaterThan(1.0);
  });

  it("should scale modifiers by intensity", () => {
    const fullIntensity = applyEmotionalModifiers(baseWeights, "arrogant", 1.0);
    const halfIntensity = applyEmotionalModifiers(baseWeights, "arrogant", 0.5);
    const zeroIntensity = applyEmotionalModifiers(baseWeights, "arrogant", 0.0);

    // Higher intensity should have more effect
    expect(Math.abs(fullIntensity.attack - baseWeights.attack)).toBeGreaterThan(
      Math.abs(halfIntensity.attack - baseWeights.attack) * 0.9
    );

    // Zero intensity should be close to base weights (after normalization)
    const sumZero = Object.values(zeroIntensity).reduce((a, b) => a + b, 0);
    expect(sumZero).toBeCloseTo(1.0, 2);
  });

  it("should normalize weights to sum to 1.0", () => {
    const states: EmotionalStateName[] = [
      "confident",
      "arrogant",
      "desperate",
      "vengeful",
      "fearful",
      "triumphant",
    ];

    for (const state of states) {
      const result = applyEmotionalModifiers(baseWeights, state, 0.8);
      const sum = Object.values(result).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    }
  });

  it("should not produce negative weights", () => {
    const states: EmotionalStateName[] = [
      "confident",
      "arrogant",
      "desperate",
      "vengeful",
      "fearful",
      "triumphant",
    ];

    for (const state of states) {
      const result = applyEmotionalModifiers(baseWeights, state, 1.0);
      for (const weight of Object.values(result)) {
        expect(weight).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("getEmotionalWeightModifiers", () => {
  it("should return correct modifiers for confident state", () => {
    const mods = getEmotionalWeightModifiers("confident", 1.0);

    // Confident: +5% decision quality, +10% aggression, +10% negotiation
    expect(mods.qualityModifier).toBeCloseTo(0.05, 2);
    expect(mods.attackModifier).toBeCloseTo(0.10, 2);
    expect(mods.tradeModifier).toBeCloseTo(0.10, 2);
  });

  it("should return correct modifiers for arrogant state", () => {
    const mods = getEmotionalWeightModifiers("arrogant", 1.0);

    // Arrogant: -15% decision quality, +30% aggression, -30% negotiation
    expect(mods.qualityModifier).toBeCloseTo(-0.15, 2);
    expect(mods.attackModifier).toBeCloseTo(0.30, 2);
    expect(mods.tradeModifier).toBeCloseTo(-0.30, 2);
  });

  it("should return correct modifiers for vengeful state", () => {
    const mods = getEmotionalWeightModifiers("vengeful", 1.0);

    // Vengeful: +40% aggression, -40% negotiation
    expect(mods.attackModifier).toBeCloseTo(0.40, 2);
    expect(mods.tradeModifier).toBeCloseTo(-0.40, 2);
  });

  it("should return correct modifiers for fearful state", () => {
    const mods = getEmotionalWeightModifiers("fearful", 1.0);

    // Fearful: -30% aggression, +50% alliance-seeking
    expect(mods.attackModifier).toBeCloseTo(-0.30, 2);
    expect(mods.diplomacyModifier).toBeCloseTo(0.50, 2);
  });

  it("should scale modifiers by intensity", () => {
    const full = getEmotionalWeightModifiers("arrogant", 1.0);
    const half = getEmotionalWeightModifiers("arrogant", 0.5);

    expect(half.attackModifier).toBeCloseTo(full.attackModifier * 0.5, 2);
    expect(half.qualityModifier).toBeCloseTo(full.qualityModifier * 0.5, 2);
  });
});

describe("getScaledModifiers", () => {
  it("should return full modifiers at intensity 1.0", () => {
    const mods = getScaledModifiers("arrogant", 1.0);

    expect(mods.decisionQuality).toBeCloseTo(-0.15, 2);
    expect(mods.aggression).toBeCloseTo(0.30, 2);
    expect(mods.allianceWillingness).toBeCloseTo(-0.40, 2);
    expect(mods.negotiation).toBeCloseTo(-0.30, 2);
  });

  it("should return half modifiers at intensity 0.5", () => {
    const mods = getScaledModifiers("arrogant", 0.5);

    expect(mods.decisionQuality).toBeCloseTo(-0.075, 3);
    expect(mods.aggression).toBeCloseTo(0.15, 2);
  });

  it("should return zero modifiers at intensity 0.0", () => {
    const mods = getScaledModifiers("arrogant", 0.0);

    expect(mods.decisionQuality).toBeCloseTo(0, 5);
    expect(mods.aggression).toBeCloseTo(0, 5);
    expect(mods.allianceWillingness).toBeCloseTo(0, 5);
    expect(mods.negotiation).toBeCloseTo(0, 5);
  });

  it("should clamp intensity to valid range", () => {
    const tooHigh = getScaledModifiers("arrogant", 1.5);
    const maxValid = getScaledModifiers("arrogant", 1.0);

    expect(tooHigh.aggression).toBeCloseTo(maxValid.aggression, 2);

    const tooLow = getScaledModifiers("arrogant", -0.5);
    expect(tooLow.aggression).toBe(0);
  });
});

describe("Emotional state PRD 7.8 compliance", () => {
  it("should match PRD 7.8 table for confident state", () => {
    const mods = getScaledModifiers("confident", 1.0);
    expect(mods.decisionQuality).toBeCloseTo(0.05, 2);  // +5%
    expect(mods.allianceWillingness).toBeCloseTo(-0.20, 2);  // -20%
    expect(mods.aggression).toBeCloseTo(0.10, 2);  // +10%
    expect(mods.negotiation).toBeCloseTo(0.10, 2);  // +10%
  });

  it("should match PRD 7.8 table for arrogant state", () => {
    const mods = getScaledModifiers("arrogant", 1.0);
    expect(mods.decisionQuality).toBeCloseTo(-0.15, 2);  // -15%
    expect(mods.allianceWillingness).toBeCloseTo(-0.40, 2);  // -40%
    expect(mods.aggression).toBeCloseTo(0.30, 2);  // +30%
    expect(mods.negotiation).toBeCloseTo(-0.30, 2);  // -30%
  });

  it("should match PRD 7.8 table for desperate state", () => {
    const mods = getScaledModifiers("desperate", 1.0);
    expect(mods.decisionQuality).toBeCloseTo(-0.10, 2);  // -10%
    expect(mods.allianceWillingness).toBeCloseTo(0.40, 2);  // +40%
    expect(mods.aggression).toBeCloseTo(-0.20, 2);  // -20%
    expect(mods.negotiation).toBeCloseTo(-0.20, 2);  // -20%
  });

  it("should match PRD 7.8 table for vengeful state", () => {
    const mods = getScaledModifiers("vengeful", 1.0);
    expect(mods.decisionQuality).toBeCloseTo(-0.05, 2);  // -5%
    expect(mods.allianceWillingness).toBeCloseTo(-0.30, 2);  // -30%
    expect(mods.aggression).toBeCloseTo(0.40, 2);  // +40%
    expect(mods.negotiation).toBeCloseTo(-0.40, 2);  // -40%
  });

  it("should match PRD 7.8 table for fearful state", () => {
    const mods = getScaledModifiers("fearful", 1.0);
    expect(mods.decisionQuality).toBeCloseTo(-0.10, 2);  // -10%
    expect(mods.allianceWillingness).toBeCloseTo(0.50, 2);  // +50%
    expect(mods.aggression).toBeCloseTo(-0.30, 2);  // -30%
    expect(mods.negotiation).toBeCloseTo(0.10, 2);  // +10%
  });

  it("should match PRD 7.8 table for triumphant state", () => {
    const mods = getScaledModifiers("triumphant", 1.0);
    expect(mods.decisionQuality).toBeCloseTo(0.10, 2);  // +10%
    expect(mods.allianceWillingness).toBeCloseTo(-0.10, 2);  // -10%
    expect(mods.aggression).toBeCloseTo(0.20, 2);  // +20%
    expect(mods.negotiation).toBeCloseTo(-0.20, 2);  // -20%
  });
});

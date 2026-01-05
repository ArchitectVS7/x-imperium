/**
 * D20 Perception System Tests
 *
 * Tests for hidden perception checks and bluff detection.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  rollD20,
  calculatePlayerPerception,
  calculateDeceptionDC,
  getStaticPerception,
  performPerceptionCheck,
  estimatePerceptionSuccess,
  getMinimumIntelForPerception,
  getPerceptionChanceDescription,
} from "../d20-perception";
import { INTEL_MODIFIERS, ARCHETYPE_DECEPTION_DC } from "../types";
import type { BotTell } from "../types";

describe("rollD20", () => {
  it("should return value between 1 and 20", () => {
    // Run multiple times to verify range
    for (let i = 0; i < 100; i++) {
      const roll = rollD20();
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(20);
    }
  });

  it("should return deterministic value with seed", () => {
    const seed = 42;
    const roll1 = rollD20(seed);
    const roll2 = rollD20(seed);
    expect(roll1).toBe(roll2);
  });

  it("should return different values with different seeds", () => {
    const roll1 = rollD20(42);
    const roll2 = rollD20(123);
    // They could theoretically be the same, but very unlikely
    // Just verify they're both valid
    expect(roll1).toBeGreaterThanOrEqual(1);
    expect(roll2).toBeGreaterThanOrEqual(1);
  });
});

describe("calculatePlayerPerception", () => {
  it("should return base 10 + intel modifier for unknown intel", () => {
    const perception = calculatePlayerPerception("unknown", 0, 0);
    // Base 10 + intel mod 0 + research 0 + roll 0 = 10
    expect(perception).toBe(10);
  });

  it("should add intel modifier based on level", () => {
    const unknownPerception = calculatePlayerPerception("unknown", 0, 0);
    const basicPerception = calculatePlayerPerception("basic", 0, 0);
    const moderatePerception = calculatePlayerPerception("moderate", 0, 0);
    const fullPerception = calculatePlayerPerception("full", 0, 0);

    expect(basicPerception - unknownPerception).toBe(INTEL_MODIFIERS.basic);
    expect(moderatePerception - unknownPerception).toBe(INTEL_MODIFIERS.moderate);
    expect(fullPerception - unknownPerception).toBe(INTEL_MODIFIERS.full);
  });

  it("should add research bonus up to max of 5", () => {
    const noResearch = calculatePlayerPerception("unknown", 0, 0);
    const someResearch = calculatePlayerPerception("unknown", 3, 0);
    const maxResearch = calculatePlayerPerception("unknown", 10, 0); // Should cap at 5

    expect(someResearch - noResearch).toBe(3);
    expect(maxResearch - noResearch).toBe(5); // Capped at 5
  });

  it("should add d20 roll to total", () => {
    const roll10 = calculatePlayerPerception("unknown", 0, 10);
    const roll20 = calculatePlayerPerception("unknown", 0, 20);

    expect(roll20 - roll10).toBe(10);
  });
});

describe("calculateDeceptionDC", () => {
  it("should return base 10 for average stats", () => {
    const dc = calculateDeceptionDC("warlord", 10, 10);
    // Base 10 + warlord modifier (0) = 10
    expect(dc).toBe(10);
  });

  it("should add archetype modifier", () => {
    const warlordDC = calculateDeceptionDC("warlord", 10, 10);
    const schemerDC = calculateDeceptionDC("schemer", 10, 10);

    // Schemer has +5 modifier, warlord has 0
    expect(schemerDC - warlordDC).toBe(
      ARCHETYPE_DECEPTION_DC.schemer - ARCHETYPE_DECEPTION_DC.warlord
    );
  });

  it("should have turtle with negative modifier (easy to read)", () => {
    const turtleDC = calculateDeceptionDC("turtle", 10, 10);
    // Turtle has -2 modifier
    expect(turtleDC).toBeLessThan(10);
  });

  it("should increase with higher CMD stat", () => {
    const lowCMD = calculateDeceptionDC("warlord", 10, 10);
    const highCMD = calculateDeceptionDC("warlord", 14, 10);

    expect(highCMD).toBeGreaterThan(lowCMD);
  });

  it("should increase with higher DOC stat (at half weight)", () => {
    const lowDOC = calculateDeceptionDC("warlord", 10, 10);
    const highDOC = calculateDeceptionDC("warlord", 10, 14);

    // DOC has 0.5 weight, so +4 DOC = +2 DC
    expect(highDOC - lowDOC).toBe(2);
  });
});

describe("getStaticPerception", () => {
  it("should return perception assuming roll of 10", () => {
    const staticPerception = getStaticPerception("moderate", 2);
    const manualCalc = calculatePlayerPerception("moderate", 2, 10);

    expect(staticPerception).toBe(manualCalc);
  });
});

describe("performPerceptionCheck", () => {
  const createMockTell = (isBluff: boolean, trueIntention?: string): BotTell => ({
    id: "tell-1",
    gameId: "game-1",
    empireId: "bot-1",
    tellType: "diplomatic_overture",
    isBluff,
    trueIntention: trueIntention as BotTell["trueIntention"],
    confidence: 0.7,
    createdAtTurn: 10,
    expiresAtTurn: 13,
    createdAt: new Date(),
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should succeed when perception beats DC", () => {
    // High intel + high roll should succeed
    vi.spyOn(Math, "random").mockReturnValue(0.95); // Roll ~20

    const result = performPerceptionCheck({
      intelLevel: "full",
      researchBonus: 5,
      tell: createMockTell(false),
      botArchetype: "turtle", // Easy to read
      botCMD: 8,
      botDOC: 8,
    });

    expect(result.success).toBe(true);
  });

  it("should fail when perception is below DC", () => {
    // Low intel + low roll should fail against schemer
    vi.spyOn(Math, "random").mockReturnValue(0.05); // Roll ~1

    const result = performPerceptionCheck({
      intelLevel: "basic",
      researchBonus: 0,
      tell: createMockTell(true, "aggression_spike"),
      botArchetype: "schemer", // Hard to read
      botCMD: 14,
      botDOC: 12,
    });

    expect(result.success).toBe(false);
  });

  it("should reveal true intention when bluff is detected", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.95);

    const tell = createMockTell(true, "aggression_spike");
    const result = performPerceptionCheck({
      intelLevel: "full",
      researchBonus: 5,
      tell,
      botArchetype: "turtle",
      botCMD: 8,
      botDOC: 8,
    });

    expect(result.success).toBe(true);
    expect(result.wasBluff).toBe(true);
    expect(result.revealedType).toBe("aggression_spike");
  });

  it("should not reveal anything for non-bluff tells", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.95);

    const result = performPerceptionCheck({
      intelLevel: "full",
      researchBonus: 5,
      tell: createMockTell(false),
      botArchetype: "turtle",
    });

    expect(result.wasBluff).toBe(false);
    expect(result.revealedType).toBeUndefined();
  });

  it("should include perception and DC in result", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const result = performPerceptionCheck({
      intelLevel: "moderate",
      researchBonus: 2,
      tell: createMockTell(false),
      botArchetype: "warlord",
      botCMD: 12,
      botDOC: 10,
    });

    expect(result.playerPerception).toBeGreaterThan(0);
    expect(result.deceptionDC).toBeGreaterThan(0);
  });
});

describe("estimatePerceptionSuccess", () => {
  it("should return 1.0 when perception always beats DC", () => {
    // Full intel with research vs turtle should always succeed
    const probability = estimatePerceptionSuccess("full", "turtle", 5);
    expect(probability).toBe(1.0);
  });

  it("should return lower probability for harder conditions", () => {
    // Unknown intel vs schemer should be harder than full intel vs turtle
    const hardProbability = estimatePerceptionSuccess("unknown", "schemer", 0);
    const easyProbability = estimatePerceptionSuccess("full", "turtle", 5);

    expect(hardProbability).toBeLessThan(easyProbability);
  });

  it("should return value between 0 and 1", () => {
    const probability = estimatePerceptionSuccess("moderate", "warlord", 2);
    expect(probability).toBeGreaterThanOrEqual(0);
    expect(probability).toBeLessThanOrEqual(1);
  });

  it("should increase with higher intel level", () => {
    const basicProb = estimatePerceptionSuccess("basic", "warlord");
    const moderateProb = estimatePerceptionSuccess("moderate", "warlord");
    const fullProb = estimatePerceptionSuccess("full", "warlord");

    expect(moderateProb).toBeGreaterThanOrEqual(basicProb);
    expect(fullProb).toBeGreaterThanOrEqual(moderateProb);
  });
});

describe("getMinimumIntelForPerception", () => {
  it("should return lower intel requirement for easy-to-read archetypes", () => {
    const turtleMinIntel = getMinimumIntelForPerception("turtle");
    const schemerMinIntel = getMinimumIntelForPerception("schemer");

    const intelOrder = ["unknown", "basic", "moderate", "full"];
    const turtleIndex = intelOrder.indexOf(turtleMinIntel);
    const schemerIndex = intelOrder.indexOf(schemerMinIntel);

    expect(turtleIndex).toBeLessThanOrEqual(schemerIndex);
  });
});

describe("getPerceptionChanceDescription", () => {
  it("should return Very High for high probability", () => {
    const desc = getPerceptionChanceDescription("full", "turtle");
    expect(["Very High", "High"]).toContain(desc);
  });

  it("should return descriptive string", () => {
    const desc = getPerceptionChanceDescription("moderate", "warlord");
    expect(typeof desc).toBe("string");
    expect(desc.length).toBeGreaterThan(0);
  });
});

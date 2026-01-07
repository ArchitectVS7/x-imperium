/**
 * Tell Generator Tests
 *
 * Tests for bot tell generation, bluff mechanics, and confidence calculation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  determineTellType,
  rollForTell,
  rollForBluff,
  invertTellType,
  calculateTellConfidence,
  calculateTellDuration,
  generateTellFromDecision,
  generateTellsForTurn,
} from "../tell-generator";
import { TELL_INVERSIONS, ARCHETYPE_BLUFF_RATES } from "../types";
import type { BotDecision } from "@/lib/bots/types";
import type { TellGenerationContext } from "../types";

describe("determineTellType", () => {
  it("should return military_buildup for military unit builds", () => {
    const decisions: BotDecision[] = [
      { type: "build_units", unitType: "soldiers", quantity: 100 },
      { type: "build_units", unitType: "fighters", quantity: 50 },
      { type: "build_units", unitType: "lightCruisers", quantity: 10 },
      { type: "build_units", unitType: "heavyCruisers", quantity: 5 },
      { type: "build_units", unitType: "carriers", quantity: 2 },
    ];

    for (const decision of decisions) {
      expect(determineTellType(decision)).toBe("military_buildup");
    }
  });

  it("should return silence for station builds", () => {
    const decision: BotDecision = { type: "build_units", unitType: "stations", quantity: 5 };
    expect(determineTellType(decision)).toBe("silence");
  });

  it("should return aggression_spike for attacks", () => {
    const decision: BotDecision = {
      type: "attack",
      targetId: "target-123",
      forces: {
        soldiers: 100,
        fighters: 50,
        stations: 0,
        lightCruisers: 10,
        heavyCruisers: 5,
        carriers: 2,
      },
    };
    expect(determineTellType(decision)).toBe("aggression_spike");
  });

  it("should return diplomatic_overture for alliance proposals", () => {
    const decision: BotDecision = {
      type: "diplomacy",
      action: "propose_alliance",
      targetId: "target-123",
    };
    expect(determineTellType(decision)).toBe("diplomatic_overture");
  });

  it("should return diplomatic_overture for NAP proposals", () => {
    const decision: BotDecision = {
      type: "diplomacy",
      action: "propose_nap",
      targetId: "target-123",
    };
    expect(determineTellType(decision)).toBe("diplomatic_overture");
  });

  it("should return silence for do_nothing", () => {
    const decision: BotDecision = { type: "do_nothing" };
    expect(determineTellType(decision)).toBe("silence");
  });

  it("should return economic_preparation for sector purchases", () => {
    const decision: BotDecision = { type: "buy_planet", sectorType: "food" };
    expect(determineTellType(decision)).toBe("economic_preparation");
  });

  it("should return target_fixation for spy operations", () => {
    const decision: BotDecision = {
      type: "covert_operation",
      operation: "send_spy",
      targetId: "target-123",
    };
    expect(determineTellType(decision)).toBe("target_fixation");
  });

  it("should return aggression_spike for bombing operations", () => {
    const decision: BotDecision = {
      type: "covert_operation",
      operation: "bombing_operations",
      targetId: "target-123",
    };
    expect(determineTellType(decision)).toBe("aggression_spike");
  });
});

describe("rollForTell", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return true when roll is below tell rate", () => {
    // Warlord has 70% tell rate
    vi.mocked(Math.random).mockReturnValue(0.5);
    expect(rollForTell("warlord")).toBe(true);
  });

  it("should return false when roll is above tell rate", () => {
    // Schemer has 30% tell rate
    vi.mocked(Math.random).mockReturnValue(0.5);
    expect(rollForTell("schemer")).toBe(false);
  });

  it("should respect turtle's high tell rate (90%)", () => {
    vi.mocked(Math.random).mockReturnValue(0.85);
    expect(rollForTell("turtle")).toBe(true);
  });

  it("should respect blitzkrieg's lower tell rate (40%)", () => {
    vi.mocked(Math.random).mockReturnValue(0.45);
    expect(rollForTell("blitzkrieg")).toBe(false);
  });
});

describe("rollForBluff", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return true when roll is below bluff rate", () => {
    // Schemer has 50% bluff rate
    vi.mocked(Math.random).mockReturnValue(0.3);
    expect(rollForBluff("schemer")).toBe(true);
  });

  it("should return false when roll is above bluff rate", () => {
    // Turtle has 5% bluff rate
    vi.mocked(Math.random).mockReturnValue(0.1);
    expect(rollForBluff("turtle")).toBe(false);
  });

  it("should increase bluff rate when desperate", () => {
    // Warlord base 10%, desperate multiplies by 1.5 = 15%
    vi.mocked(Math.random).mockReturnValue(0.12);
    const emotionalState = { state: "desperate" as const, intensity: 0.8 };
    expect(rollForBluff("warlord", emotionalState)).toBe(true);
  });

  it("should decrease bluff rate when confident", () => {
    // Opportunist base 35%, confident multiplies by 0.7 = 24.5%
    vi.mocked(Math.random).mockReturnValue(0.30);
    const emotionalState = { state: "confident" as const, intensity: 0.8 };
    expect(rollForBluff("opportunist", emotionalState)).toBe(false);
  });
});

describe("invertTellType", () => {
  it("should invert military_buildup to diplomatic_overture", () => {
    expect(invertTellType("military_buildup")).toBe("diplomatic_overture");
  });

  it("should invert aggression_spike to treaty_interest", () => {
    expect(invertTellType("aggression_spike")).toBe("treaty_interest");
  });

  it("should invert diplomatic_overture to aggression_spike", () => {
    expect(invertTellType("diplomatic_overture")).toBe("aggression_spike");
  });

  it("should match all inversions in TELL_INVERSIONS", () => {
    for (const [original, inverted] of Object.entries(TELL_INVERSIONS)) {
      expect(invertTellType(original as keyof typeof TELL_INVERSIONS)).toBe(inverted);
    }
  });
});

describe("calculateTellConfidence", () => {
  const baseContext: TellGenerationContext = {
    archetype: "warlord",
    currentTurn: 10,
  };

  it("should return higher confidence for high tell rate archetypes", () => {
    const turtleContext: TellGenerationContext = { ...baseContext, archetype: "turtle" };
    const schemerContext: TellGenerationContext = { ...baseContext, archetype: "schemer" };

    const turtleConfidence = calculateTellConfidence(turtleContext, false);
    const schemerConfidence = calculateTellConfidence(schemerContext, false);

    expect(turtleConfidence).toBeGreaterThan(schemerConfidence);
  });

  it("should return lower confidence for bluffs", () => {
    const truthConfidence = calculateTellConfidence(baseContext, false);
    const bluffConfidence = calculateTellConfidence(baseContext, true);

    expect(bluffConfidence).toBeLessThan(truthConfidence);
  });

  it("should increase confidence when confident emotional state", () => {
    const neutralContext: TellGenerationContext = { ...baseContext };
    const confidentContext: TellGenerationContext = {
      ...baseContext,
      emotionalState: { state: "confident", intensity: 0.8 },
    };

    const neutralConfidence = calculateTellConfidence(neutralContext, false);
    const confidentConfidence = calculateTellConfidence(confidentContext, false);

    expect(confidentConfidence).toBeGreaterThan(neutralConfidence);
  });

  it("should decrease confidence when fearful emotional state", () => {
    const neutralContext: TellGenerationContext = { ...baseContext };
    const fearfulContext: TellGenerationContext = {
      ...baseContext,
      emotionalState: { state: "fearful", intensity: 0.8 },
    };

    const neutralConfidence = calculateTellConfidence(neutralContext, false);
    const fearfulConfidence = calculateTellConfidence(fearfulContext, false);

    expect(fearfulConfidence).toBeLessThan(neutralConfidence);
  });

  it("should clamp confidence between 0.1 and 1.0", () => {
    const extremeContext: TellGenerationContext = {
      ...baseContext,
      emotionalState: { state: "triumphant", intensity: 1.0 },
    };

    const confidence = calculateTellConfidence(extremeContext, false);
    expect(confidence).toBeGreaterThanOrEqual(0.1);
    expect(confidence).toBeLessThanOrEqual(1.0);
  });
});

describe("calculateTellDuration", () => {
  it("should return longer duration for turtle (high advance warning)", () => {
    const turtleDuration = calculateTellDuration("turtle");
    const blitzkriegDuration = calculateTellDuration("blitzkrieg");

    // Turtle has 5-10 advance warning, blitzkrieg has 0-1
    expect(turtleDuration).toBeGreaterThan(blitzkriegDuration);
  });

  it("should return duration within expected range", () => {
    const duration = calculateTellDuration("warlord");
    // Base 3, max 5
    expect(duration).toBeGreaterThanOrEqual(3);
    expect(duration).toBeLessThanOrEqual(5);
  });
});

describe("generateTellFromDecision", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const context: TellGenerationContext = {
    archetype: "warlord",
    currentTurn: 10,
  };

  it("should generate tell for attack decision when tell check passes", () => {
    // Force tell check to pass, bluff check to fail
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.3) // Tell check passes (warlord has 70%)
      .mockReturnValueOnce(0.5); // Bluff check fails (warlord has 10%)

    const decision: BotDecision = {
      type: "attack",
      targetId: "target-123",
      forces: { soldiers: 100, fighters: 50, stations: 0, lightCruisers: 0, heavyCruisers: 0, carriers: 0 },
    };

    const result = generateTellFromDecision(decision, "empire-1", "game-1", context);

    expect(result.generated).toBe(true);
    expect(result.tell).toBeDefined();
    expect(result.tell?.tellType).toBe("aggression_spike");
    expect(result.tell?.isBluff).toBe(false);
    expect(result.tell?.targetEmpireId).toBe("target-123");
  });

  it("should not generate tell when tell check fails", () => {
    // Force tell check to fail
    vi.mocked(Math.random).mockReturnValue(0.9);

    const decision: BotDecision = {
      type: "attack",
      targetId: "target-123",
      forces: { soldiers: 100, fighters: 50, stations: 0, lightCruisers: 0, heavyCruisers: 0, carriers: 0 },
    };

    const result = generateTellFromDecision(decision, "empire-1", "game-1", context);

    expect(result.generated).toBe(false);
  });

  it("should generate bluff tell when bluff check passes", () => {
    // Schemer context for higher bluff rate
    const schemerContext: TellGenerationContext = {
      archetype: "schemer",
      currentTurn: 10,
    };

    // Force tell check to pass, bluff check to pass
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.1) // Tell check passes (schemer has 30%)
      .mockReturnValueOnce(0.2); // Bluff check passes (schemer has 50%)

    const decision: BotDecision = {
      type: "attack",
      targetId: "target-123",
      forces: { soldiers: 100, fighters: 50, stations: 0, lightCruisers: 0, heavyCruisers: 0, carriers: 0 },
    };

    const result = generateTellFromDecision(decision, "empire-1", "game-1", schemerContext);

    expect(result.generated).toBe(true);
    expect(result.tell?.isBluff).toBe(true);
    expect(result.tell?.trueIntention).toBe("aggression_spike");
    // Inverted aggression_spike → treaty_interest
    expect(result.tell?.tellType).toBe("treaty_interest");
  });

  it("should not generate tell for decisions that don't produce tells", () => {
    const decision: BotDecision = { type: "build_units", unitType: "covertAgents", quantity: 5 };

    const result = generateTellFromDecision(decision, "empire-1", "game-1", context);

    expect(result.generated).toBe(false);
    expect(result.reason).toContain("does not generate tells");
  });
});

describe("generateTellsForTurn", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return only highest priority tell when multiple generated", () => {
    const context: TellGenerationContext = {
      archetype: "warlord",
      currentTurn: 10,
    };

    // Force tell checks to pass (0.05 < 0.70 warlord tell rate)
    // But bluff checks to fail (0.50 > 0.10 warlord bluff rate)
    vi.mocked(Math.random)
      .mockReturnValueOnce(0.05) // buy_planet tell check - passes
      .mockReturnValueOnce(0.50) // buy_planet bluff check - fails (no bluff)
      .mockReturnValueOnce(0.05) // attack tell check - passes
      .mockReturnValueOnce(0.50); // attack bluff check - fails (no bluff)

    const decisions: BotDecision[] = [
      { type: "buy_planet", sectorType: "food" }, // economic_preparation (priority 3)
      { type: "attack", targetId: "t1", forces: { soldiers: 100, fighters: 0, stations: 0, lightCruisers: 0, heavyCruisers: 0, carriers: 0 } }, // aggression_spike (priority 10)
    ];

    const results = generateTellsForTurn(decisions, "empire-1", "game-1", context);

    // Should only have 1 result - the highest priority
    expect(results).toHaveLength(1);
    expect(results[0]?.tell?.tellType).toBe("aggression_spike");
  });

  it("should return empty array when no tells generated", () => {
    const context: TellGenerationContext = {
      archetype: "schemer", // Low tell rate
      currentTurn: 10,
    };

    // Force tell check to fail
    vi.mocked(Math.random).mockReturnValue(0.9);

    const decisions: BotDecision[] = [
      { type: "buy_planet", sectorType: "food" },
    ];

    const results = generateTellsForTurn(decisions, "empire-1", "game-1", context);

    expect(results).toHaveLength(0);
  });
});

describe("archetype bluff rates", () => {
  it("should have schemer with highest bluff rate", () => {
    const schemerRate = ARCHETYPE_BLUFF_RATES["schemer"];
    const otherRates = Object.entries(ARCHETYPE_BLUFF_RATES)
      .filter(([name]) => name !== "schemer")
      .map(([, rate]) => rate);

    expect(Math.max(...otherRates)).toBeLessThan(schemerRate);
  });

  it("should have turtle with lowest bluff rate", () => {
    const turtleRate = ARCHETYPE_BLUFF_RATES["turtle"];
    const otherRates = Object.entries(ARCHETYPE_BLUFF_RATES)
      .filter(([name]) => name !== "turtle")
      .map(([, rate]) => rate);

    expect(Math.min(...otherRates)).toBeGreaterThan(turtleRate);
  });
});

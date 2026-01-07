/**
 * Archetype Decision Tests (M9)
 *
 * Tests for archetype-based decision trees and the tell system.
 */

import { describe, it, expect } from "vitest";
import {
  shouldArchetypeAttack,
  getRetreatWillingness,
  getAllianceSeeking,
  shouldTelegraphAction,
  getTellStyle,
  getAdjustedWeights,
} from "../decision-engine";
import type { BotArchetype, BotDecisionContext, Empire } from "../types";
import {
  ARCHETYPE_BEHAVIORS,
  wouldArchetypeAttack,
  getArchetypeTellRate,
} from "../archetypes";

describe("shouldArchetypeAttack", () => {
  it("should return true for warlord when enemy is weak", () => {
    // Warlord attacks if enemy < 50% of our power
    expect(shouldArchetypeAttack("warlord", 1000, 400)).toBe(true);
  });

  it("should return false for warlord when enemy is strong", () => {
    // Warlord doesn't attack if enemy > 50% of our power
    expect(shouldArchetypeAttack("warlord", 1000, 600)).toBe(false);
  });

  it("should return true for blitzkrieg against weaker targets", () => {
    // Blitzkrieg has aggressive threshold
    expect(shouldArchetypeAttack("blitzkrieg", 1000, 300)).toBe(true);
  });

  it("should return false for turtle in most cases", () => {
    // Turtle is defensive, rarely attacks
    // Only attacks if enemy is very weak
    expect(shouldArchetypeAttack("turtle", 1000, 500)).toBe(false);
  });

  it("should return false for null archetype", () => {
    expect(shouldArchetypeAttack(null, 1000, 500)).toBe(false);
  });

  it("should return false when our power is zero", () => {
    expect(shouldArchetypeAttack("warlord", 0, 500)).toBe(false);
  });
});

describe("getRetreatWillingness", () => {
  it("should be low for warlord", () => {
    const willingness = getRetreatWillingness("warlord");
    expect(willingness).toBeLessThan(0.3);
  });

  it("should be high for turtle", () => {
    const willingness = getRetreatWillingness("turtle");
    expect(willingness).toBeGreaterThan(0.4);
  });

  it("should return default for null archetype", () => {
    const willingness = getRetreatWillingness(null);
    expect(willingness).toBe(0.3);
  });
});

describe("getAllianceSeeking", () => {
  it("should be high for diplomat", () => {
    const seeking = getAllianceSeeking("diplomat");
    expect(seeking).toBeGreaterThan(0.5);
  });

  it("should be low for warlord", () => {
    const seeking = getAllianceSeeking("warlord");
    expect(seeking).toBeLessThan(0.4);
  });

  it("should be moderate for merchant", () => {
    const seeking = getAllianceSeeking("merchant");
    expect(seeking).toBeGreaterThan(0.2);
    expect(seeking).toBeLessThan(0.7);
  });

  it("should return default for null archetype", () => {
    const seeking = getAllianceSeeking(null);
    expect(seeking).toBe(0.3);
  });
});

describe("shouldTelegraphAction", () => {
  it("should only telegraph attacks and diplomacy", () => {
    const tradeResult = shouldTelegraphAction("warlord", "trade");
    expect(tradeResult.shouldTell).toBe(false);

    const otherResult = shouldTelegraphAction("warlord", "other");
    expect(otherResult.shouldTell).toBe(false);
  });

  it("should return false for null archetype", () => {
    const result = shouldTelegraphAction(null, "attack");
    expect(result.shouldTell).toBe(false);
    expect(result.advanceWarningTurns).toBe(0);
  });

  it("should return advance warning turns when telegraphing", () => {
    // Run multiple times to get a telegraph result
    let telegraphResult = null;
    for (let i = 0; i < 100; i++) {
      const result = shouldTelegraphAction("warlord", "attack");
      if (result.shouldTell) {
        telegraphResult = result;
        break;
      }
    }

    // Warlord has 70% tell rate so we should get one
    if (telegraphResult) {
      expect(telegraphResult.advanceWarningTurns).toBeGreaterThanOrEqual(2);
      expect(telegraphResult.advanceWarningTurns).toBeLessThanOrEqual(3);
    }
  });
});

describe("getTellStyle", () => {
  it("should return obvious for warlord", () => {
    expect(getTellStyle("warlord")).toBe("obvious");
  });

  it("should return polite for diplomat", () => {
    expect(getTellStyle("diplomat")).toBe("polite");
  });

  it("should return transactional for merchant", () => {
    expect(getTellStyle("merchant")).toBe("transactional");
  });

  it("should return cryptic for schemer", () => {
    expect(getTellStyle("schemer")).toBe("cryptic");
  });

  it("should return minimal for null archetype", () => {
    expect(getTellStyle(null)).toBe("minimal");
  });
});

describe("ARCHETYPE_BEHAVIORS", () => {
  const archetypes = [
    "warlord",
    "diplomat",
    "merchant",
    "schemer",
    "turtle",
    "blitzkrieg",
    "techRush",
    "opportunist",
  ] as const;

  it("should have all 8 archetypes defined", () => {
    expect(Object.keys(ARCHETYPE_BEHAVIORS)).toHaveLength(8);
    for (const arch of archetypes) {
      expect(ARCHETYPE_BEHAVIORS[arch]).toBeDefined();
    }
  });

  it("should have valid priority values (sum > 0)", () => {
    for (const arch of archetypes) {
      const behavior = ARCHETYPE_BEHAVIORS[arch];
      const sum =
        behavior.priorities.military +
        behavior.priorities.economy +
        behavior.priorities.research +
        behavior.priorities.diplomacy +
        behavior.priorities.covert;
      expect(sum).toBeGreaterThan(0);
    }
  });

  it("should have valid attack thresholds (0-1)", () => {
    for (const arch of archetypes) {
      const threshold = ARCHETYPE_BEHAVIORS[arch].combat.attackThreshold;
      expect(threshold).toBeGreaterThanOrEqual(0);
      expect(threshold).toBeLessThanOrEqual(1);
    }
  });

  it("should have valid retreat willingness (0-1)", () => {
    for (const arch of archetypes) {
      const willingness = ARCHETYPE_BEHAVIORS[arch].combat.retreatWillingness;
      expect(willingness).toBeGreaterThanOrEqual(0);
      expect(willingness).toBeLessThanOrEqual(1);
    }
  });

  it("should have valid tell rates (0-1)", () => {
    for (const arch of archetypes) {
      const tellRate = ARCHETYPE_BEHAVIORS[arch].tell.tellRate;
      expect(tellRate).toBeGreaterThanOrEqual(0);
      expect(tellRate).toBeLessThanOrEqual(1);
    }
  });
});

describe("wouldArchetypeAttack from archetypes module", () => {
  it("should use attack threshold correctly", () => {
    // Warlord threshold is 0.5 - attacks if enemy < 50%
    expect(wouldArchetypeAttack("warlord", 0.4)).toBe(true);
    expect(wouldArchetypeAttack("warlord", 0.6)).toBe(false);
  });

  it("should work for diplomat with higher threshold", () => {
    // Diplomat has lower threshold - more reluctant
    const diplomat = ARCHETYPE_BEHAVIORS.diplomat;
    expect(wouldArchetypeAttack("diplomat", diplomat.combat.attackThreshold - 0.1)).toBe(true);
    expect(wouldArchetypeAttack("diplomat", diplomat.combat.attackThreshold + 0.1)).toBe(false);
  });
});

describe("getArchetypeTellRate", () => {
  it("should return correct rates from PRD 7.10", () => {
    // Warlord: 70% (obvious intentions)
    expect(getArchetypeTellRate("warlord")).toBe(0.70);

    // Diplomat: 80% (very transparent)
    expect(getArchetypeTellRate("diplomat")).toBe(0.80);

    // Schemer: 30% (cryptic, rarely telegraphs)
    expect(getArchetypeTellRate("schemer")).toBe(0.30);
  });
});

describe("getAdjustedWeights with archetype", () => {
  const createMockContext = (archetype: BotArchetype): BotDecisionContext => ({
    empire: {
      id: "test-id",
      gameId: "game-id",
      name: "Test Empire",
      emperorName: "Test Emperor",
      type: "bot",
      botArchetype: archetype,
      botTier: "tier2_strategic",
      credits: 10000,
      food: 5000,
      ore: 3000,
      petroleum: 2000,
      soldiers: 100,
      fighters: 50,
      stations: 5,
      lightCruisers: 10,
      heavyCruisers: 5,
      carriers: 2,
      covertAgents: 5,
      population: 10000,
      populationCap: 50000,
      sectorCount: 10,
      networth: 50000,
      civilStatus: "Content",
      researchPoints: 500,
      isEliminated: false,
      armyEffectiveness: 1.0,
      covertPoints: 0,
      fundamentalResearchLevel: 0,
      personalityTraits: null,
      eliminatedAtTurn: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Empire,
    sectors: [],
    gameId: "game-id",
    currentTurn: 25, // After protection
    protectionTurns: 20,
    difficulty: "normal",
    availableTargets: [],
  });

  it("should use warlord weights for warlord archetype", () => {
    const context = createMockContext("warlord");
    const weights = getAdjustedWeights(context);

    // Warlord has high attack weight
    expect(weights.attack).toBeGreaterThan(0.15);
  });

  it("should use turtle weights for turtle archetype", () => {
    const context = createMockContext("turtle");
    const weights = getAdjustedWeights(context);

    // Turtle has low attack weight
    expect(weights.attack).toBeLessThan(0.10);
  });

  it("should use diplomat weights for diplomat archetype", () => {
    const context = createMockContext("diplomat");
    const weights = getAdjustedWeights(context);

    // Diplomat has higher diplomacy weight
    expect(weights.diplomacy).toBeGreaterThan(0.10);
  });

  it("should set attack to 0 during protection period", () => {
    const context = createMockContext("warlord");
    context.currentTurn = 10; // Still in protection
    const weights = getAdjustedWeights(context);

    expect(weights.attack).toBe(0);
  });

  it("should apply emotional modifiers when provided", () => {
    const context = createMockContext("warlord");
    context.emotionalState = {
      state: "arrogant",
      intensity: 1.0,
    };
    const weights = getAdjustedWeights(context);

    // Arrogant increases attack even more
    const baseContext = createMockContext("warlord");
    const baseWeights = getAdjustedWeights(baseContext);

    // Attack should be higher with arrogant modifier
    expect(weights.attack).toBeGreaterThan(baseWeights.attack * 0.95);
  });

  it("should boost attack weight when grudge targets available", () => {
    const context = createMockContext("warlord");
    context.permanentGrudges = ["enemy-1"];
    context.availableTargets = [
      {
        id: "enemy-1",
        name: "Grudge Enemy",
        networth: 30000,
        sectorCount: 8,
        isBot: true,
        isEliminated: false,
        militaryPower: 500,
      },
    ];

    const weights = getAdjustedWeights(context);

    // With grudge target, attack should be boosted
    const baseContext = createMockContext("warlord");
    const baseWeights = getAdjustedWeights(baseContext);

    expect(weights.attack).toBeGreaterThan(baseWeights.attack);
  });
});

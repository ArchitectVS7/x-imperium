/**
 * Tell Filter Tests
 *
 * Tests for intel gating, filtering, and perception application.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getMinimumIntelForTell,
  canSeeTells,
  canSeeTellType,
  canSeeEmotionalContext,
  filterTellsByIntel,
  filterTellsTargetingEmpire,
  filterTellsByType,
  applyPerceptionToTells,
  groupTellsByEmpire,
  getMostConfidentTell,
  getMostRecentTell,
  isThreatTell,
  isDiplomaticTell,
  getTellDescription,
  getBluffDetectionProbability,
} from "../tell-filter";
import type { BotTell, TellPerception, IntelLevel, TellType } from "../types";

// Helper to create mock tells
function createMockTell(overrides: Partial<BotTell> = {}): BotTell {
  return {
    id: "tell-1",
    gameId: "game-1",
    empireId: "bot-1",
    tellType: "military_buildup",
    isBluff: false,
    confidence: 0.7,
    createdAtTurn: 10,
    expiresAtTurn: 13,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("getMinimumIntelForTell", () => {
  it("should return basic as minimum intel level", () => {
    expect(getMinimumIntelForTell()).toBe("basic");
  });
});

describe("canSeeTells", () => {
  it("should return false for unknown intel", () => {
    expect(canSeeTells("unknown")).toBe(false);
  });

  it("should return true for basic intel", () => {
    expect(canSeeTells("basic")).toBe(true);
  });

  it("should return true for moderate intel", () => {
    expect(canSeeTells("moderate")).toBe(true);
  });

  it("should return true for full intel", () => {
    expect(canSeeTells("full")).toBe(true);
  });
});

describe("canSeeTellType", () => {
  it("should return false for unknown intel", () => {
    expect(canSeeTellType("unknown")).toBe(false);
  });

  it("should return false for basic intel", () => {
    expect(canSeeTellType("basic")).toBe(false);
  });

  it("should return true for moderate intel", () => {
    expect(canSeeTellType("moderate")).toBe(true);
  });

  it("should return true for full intel", () => {
    expect(canSeeTellType("full")).toBe(true);
  });
});

describe("canSeeEmotionalContext", () => {
  it("should return false for unknown intel", () => {
    expect(canSeeEmotionalContext("unknown")).toBe(false);
  });

  it("should return false for basic intel", () => {
    expect(canSeeEmotionalContext("basic")).toBe(false);
  });

  it("should return false for moderate intel", () => {
    expect(canSeeEmotionalContext("moderate")).toBe(false);
  });

  it("should return true for full intel", () => {
    expect(canSeeEmotionalContext("full")).toBe(true);
  });
});

describe("filterTellsByIntel", () => {
  const currentTurn = 12;

  it("should filter out own tells", () => {
    const tells = [
      createMockTell({ empireId: "player-1" }),
      createMockTell({ empireId: "bot-1" }),
    ];
    const intelLevels = new Map<string, IntelLevel>([
      ["player-1", "full"],
      ["bot-1", "moderate"],
    ]);

    const filtered = filterTellsByIntel(tells, "player-1", intelLevels, currentTurn);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.empireId).toBe("bot-1");
  });

  it("should filter out expired tells", () => {
    const tells = [
      createMockTell({ expiresAtTurn: 11 }), // Expired
      createMockTell({ expiresAtTurn: 15 }), // Valid
    ];
    const intelLevels = new Map<string, IntelLevel>([["bot-1", "moderate"]]);

    const filtered = filterTellsByIntel(tells, "player-1", intelLevels, currentTurn);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.expiresAtTurn).toBe(15);
  });

  it("should filter out tells for empires with unknown intel", () => {
    const tells = [
      createMockTell({ empireId: "bot-1" }),
      createMockTell({ empireId: "bot-2" }),
    ];
    const intelLevels = new Map<string, IntelLevel>([
      ["bot-1", "moderate"],
      ["bot-2", "unknown"],
    ]);

    const filtered = filterTellsByIntel(tells, "player-1", intelLevels, currentTurn);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.empireId).toBe("bot-1");
  });

  it("should treat missing intel level as unknown", () => {
    const tells = [createMockTell({ empireId: "bot-1" })];
    const intelLevels = new Map<string, IntelLevel>(); // Empty - no intel

    const filtered = filterTellsByIntel(tells, "player-1", intelLevels, currentTurn);

    expect(filtered).toHaveLength(0);
  });
});

describe("filterTellsTargetingEmpire", () => {
  it("should return tells targeting specific empire", () => {
    const tells = [
      createMockTell({ targetEmpireId: "player-1" }),
      createMockTell({ targetEmpireId: "bot-2" }),
      createMockTell({ targetEmpireId: "player-1" }),
    ];

    const filtered = filterTellsTargetingEmpire(tells, "player-1");

    expect(filtered).toHaveLength(2);
    expect(filtered.every((t) => t.targetEmpireId === "player-1")).toBe(true);
  });

  it("should return empty array when no tells target empire", () => {
    const tells = [
      createMockTell({ targetEmpireId: "bot-2" }),
      createMockTell({ targetEmpireId: "bot-3" }),
    ];

    const filtered = filterTellsTargetingEmpire(tells, "player-1");

    expect(filtered).toHaveLength(0);
  });
});

describe("filterTellsByType", () => {
  it("should return tells of specified types", () => {
    const tells = [
      createMockTell({ tellType: "military_buildup" }),
      createMockTell({ tellType: "diplomatic_overture" }),
      createMockTell({ tellType: "aggression_spike" }),
    ];

    const filtered = filterTellsByType(tells, ["military_buildup", "aggression_spike"]);

    expect(filtered).toHaveLength(2);
    expect(filtered.map((t) => t.tellType)).toContain("military_buildup");
    expect(filtered.map((t) => t.tellType)).toContain("aggression_spike");
  });

  it("should return empty array when no matching types", () => {
    const tells = [
      createMockTell({ tellType: "diplomatic_overture" }),
    ];

    const filtered = filterTellsByType(tells, ["military_buildup"]);

    expect(filtered).toHaveLength(0);
  });
});

describe("applyPerceptionToTells", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should reveal bluff when perception check succeeds", () => {
    // High roll = success
    vi.spyOn(Math, "random").mockReturnValue(0.95);

    const tells = [
      createMockTell({
        isBluff: true,
        tellType: "diplomatic_overture",
        trueIntention: "aggression_spike",
      }),
    ];
    const intelLevels = new Map<string, IntelLevel>([["bot-1", "full"]]);
    const archetypes = new Map([["bot-1", "turtle" as const]]);

    const perceptions = applyPerceptionToTells(tells, intelLevels, archetypes, 5);

    expect(perceptions).toHaveLength(1);
    expect(perceptions[0]?.perceivedTruth).toBe(true);
    expect(perceptions[0]?.displayType).toBe("aggression_spike");
  });

  it("should not reveal bluff when perception check fails", () => {
    // Low roll = failure
    vi.spyOn(Math, "random").mockReturnValue(0.05);

    const tells = [
      createMockTell({
        isBluff: true,
        tellType: "diplomatic_overture",
        trueIntention: "aggression_spike",
      }),
    ];
    const intelLevels = new Map<string, IntelLevel>([["bot-1", "basic"]]);
    const archetypes = new Map([["bot-1", "schemer" as const]]);

    const perceptions = applyPerceptionToTells(tells, intelLevels, archetypes, 0);

    expect(perceptions).toHaveLength(1);
    expect(perceptions[0]?.perceivedTruth).toBe(false);
    expect(perceptions[0]?.displayType).toBe("diplomatic_overture");
  });

  it("should not mark truth as revealed for non-bluff tells", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.95);

    const tells = [createMockTell({ isBluff: false })];
    const intelLevels = new Map<string, IntelLevel>([["bot-1", "full"]]);
    const archetypes = new Map([["bot-1", "warlord" as const]]);

    const perceptions = applyPerceptionToTells(tells, intelLevels, archetypes, 5);

    expect(perceptions[0]?.perceivedTruth).toBe(false);
  });

  it("should set signalDetected based on intel level", () => {
    const tells = [createMockTell()];

    const basicIntel = new Map<string, IntelLevel>([["bot-1", "basic"]]);
    const unknownIntel = new Map<string, IntelLevel>([["bot-1", "unknown"]]);
    const archetypes = new Map([["bot-1", "warlord" as const]]);

    const basicPerceptions = applyPerceptionToTells(tells, basicIntel, archetypes);
    const unknownPerceptions = applyPerceptionToTells(tells, unknownIntel, archetypes);

    expect(basicPerceptions[0]?.signalDetected).toBe(true);
    expect(unknownPerceptions[0]?.signalDetected).toBe(false);
  });
});

describe("groupTellsByEmpire", () => {
  it("should group tells by empire ID", () => {
    const tells = [
      createMockTell({ id: "t1", empireId: "bot-1" }),
      createMockTell({ id: "t2", empireId: "bot-2" }),
      createMockTell({ id: "t3", empireId: "bot-1" }),
    ];

    const grouped = groupTellsByEmpire(tells);

    expect(grouped.size).toBe(2);
    expect(grouped.get("bot-1")).toHaveLength(2);
    expect(grouped.get("bot-2")).toHaveLength(1);
  });

  it("should return empty map for empty input", () => {
    const grouped = groupTellsByEmpire([]);
    expect(grouped.size).toBe(0);
  });
});

describe("getMostConfidentTell", () => {
  it("should return tell with highest confidence", () => {
    const tells = [
      createMockTell({ id: "t1", confidence: 0.5 }),
      createMockTell({ id: "t2", confidence: 0.9 }),
      createMockTell({ id: "t3", confidence: 0.7 }),
    ];

    const mostConfident = getMostConfidentTell(tells);

    expect(mostConfident?.id).toBe("t2");
    expect(mostConfident?.confidence).toBe(0.9);
  });

  it("should return null for empty array", () => {
    expect(getMostConfidentTell([])).toBeNull();
  });
});

describe("getMostRecentTell", () => {
  it("should return most recently created tell", () => {
    const tells = [
      createMockTell({ id: "t1", createdAtTurn: 5 }),
      createMockTell({ id: "t2", createdAtTurn: 10 }),
      createMockTell({ id: "t3", createdAtTurn: 7 }),
    ];

    const mostRecent = getMostRecentTell(tells);

    expect(mostRecent?.id).toBe("t2");
    expect(mostRecent?.createdAtTurn).toBe(10);
  });

  it("should return null for empty array", () => {
    expect(getMostRecentTell([])).toBeNull();
  });
});

describe("isThreatTell", () => {
  it("should return true for threat types", () => {
    const threatTypes: TellType[] = [
      "military_buildup",
      "target_fixation",
      "aggression_spike",
      "fleet_movement",
    ];

    for (const type of threatTypes) {
      expect(isThreatTell(type)).toBe(true);
    }
  });

  it("should return false for non-threat types", () => {
    const nonThreatTypes: TellType[] = [
      "diplomatic_overture",
      "economic_preparation",
      "silence",
      "treaty_interest",
    ];

    for (const type of nonThreatTypes) {
      expect(isThreatTell(type)).toBe(false);
    }
  });
});

describe("isDiplomaticTell", () => {
  it("should return true for diplomatic types", () => {
    expect(isDiplomaticTell("diplomatic_overture")).toBe(true);
    expect(isDiplomaticTell("treaty_interest")).toBe(true);
  });

  it("should return false for non-diplomatic types", () => {
    expect(isDiplomaticTell("military_buildup")).toBe(false);
    expect(isDiplomaticTell("aggression_spike")).toBe(false);
    expect(isDiplomaticTell("silence")).toBe(false);
  });
});

describe("getTellDescription", () => {
  const createMockPerception = (
    displayType: TellType,
    perceivedTruth: boolean = false
  ): TellPerception => ({
    tell: createMockTell({ tellType: displayType }),
    perceivedTruth,
    displayType,
    displayConfidence: 0.7,
    signalDetected: true,
  });

  it("should return empty string for unknown intel", () => {
    const perception = createMockPerception("military_buildup");
    expect(getTellDescription(perception, "unknown")).toBe("");
  });

  it("should return generic description for basic intel with threat tell", () => {
    const perception = createMockPerception("military_buildup");
    expect(getTellDescription(perception, "basic")).toBe("Hostile activity detected");
  });

  it("should return generic description for basic intel with diplomatic tell", () => {
    const perception = createMockPerception("diplomatic_overture");
    expect(getTellDescription(perception, "basic")).toBe("Diplomatic signals detected");
  });

  it("should return generic description for basic intel with neutral tell", () => {
    const perception = createMockPerception("silence");
    expect(getTellDescription(perception, "basic")).toBe("Activity detected");
  });

  it("should return specific description for moderate intel", () => {
    const perception = createMockPerception("military_buildup");
    expect(getTellDescription(perception, "moderate")).toBe("Military buildup detected");
  });

  it("should return specific description for full intel", () => {
    const perception = createMockPerception("aggression_spike");
    expect(getTellDescription(perception, "full")).toBe("Aggressive behavior detected");
  });

  it("should have descriptions for all tell types", () => {
    const allTypes: TellType[] = [
      "military_buildup",
      "fleet_movement",
      "target_fixation",
      "diplomatic_overture",
      "economic_preparation",
      "silence",
      "aggression_spike",
      "treaty_interest",
    ];

    for (const type of allTypes) {
      const perception = createMockPerception(type);
      const desc = getTellDescription(perception, "full");
      expect(desc).not.toBe("");
      expect(desc).not.toBe("Unknown activity");
    }
  });
});

describe("getBluffDetectionProbability", () => {
  it("should return 1.0 when player always beats DC", () => {
    // Full intel vs turtle with research should always succeed
    const probability = getBluffDetectionProbability("full", "turtle", 5);
    expect(probability).toBe(1.0);
  });

  it("should return value between 0 and 1", () => {
    const probability = getBluffDetectionProbability("moderate", "warlord", 2);
    expect(probability).toBeGreaterThanOrEqual(0);
    expect(probability).toBeLessThanOrEqual(1);
  });

  it("should be higher with better intel level", () => {
    const basicProb = getBluffDetectionProbability("basic", "warlord");
    const moderateProb = getBluffDetectionProbability("moderate", "warlord");
    const fullProb = getBluffDetectionProbability("full", "warlord");

    expect(moderateProb).toBeGreaterThanOrEqual(basicProb);
    expect(fullProb).toBeGreaterThanOrEqual(moderateProb);
  });

  it("should be lower against better deceivers", () => {
    // Use basic intel which has lower perception modifiers
    const turtleProb = getBluffDetectionProbability("basic", "turtle");
    const warlordProb = getBluffDetectionProbability("basic", "warlord");
    const schemerProb = getBluffDetectionProbability("basic", "schemer");

    // At least verify the ordering is correct (or equal for easy ones)
    expect(turtleProb).toBeGreaterThanOrEqual(warlordProb);
    expect(warlordProb).toBeGreaterThanOrEqual(schemerProb);
  });

  it("should increase with research bonus", () => {
    const noResearch = getBluffDetectionProbability("moderate", "warlord", 0);
    const withResearch = getBluffDetectionProbability("moderate", "warlord", 5);

    expect(withResearch).toBeGreaterThanOrEqual(noResearch);
  });
});

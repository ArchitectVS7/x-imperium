/**
 * Victory & Defeat Conditions Tests (PRD 10.1, 10.2)
 */

import { describe, it, expect } from "vitest";
import {
  // Types
  type Empire,
  type Coalition,
  // Constants
  CONQUEST_THRESHOLD,
  ECONOMIC_MULTIPLIER,
  DIPLOMATIC_THRESHOLD,
  RESEARCH_MAX_LEVEL,
  MILITARY_MULTIPLIER,
  VICTORY_PRIORITY,
  // Victory Checks
  checkConquestVictory,
  checkEconomicVictory,
  checkDiplomaticVictory,
  checkResearchVictory,
  checkMilitaryVictory,
  checkSurvivalVictory,
  checkAllVictoryConditions,
  // Defeat Checks
  checkBankruptcy,
  checkElimination,
  checkCivilCollapse,
  checkDefeatConditions,
  // Military Power
  calculateMilitaryPower,
  // Victory Progress
  analyzeVictoryProgress,
  hasViableVictoryPath,
  getMostViableVictoryPath,
} from "./conditions";

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestEmpire(overrides: Partial<Empire> = {}): Empire {
  return {
    id: "empire-1",
    name: "Test Empire",
    planetCount: 9,
    networth: 100,
    credits: 100000,
    civilStatus: "content",
    fundamentalResearchLevel: 0,
    isEliminated: false,
    soldiers: 100,
    fighters: 0,
    stations: 0,
    lightCruisers: 0,
    heavyCruisers: 0,
    carriers: 0,
    covertAgents: 0,
    ...overrides,
  };
}

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Victory Constants", () => {
  it("should have correct conquest threshold (60%)", () => {
    expect(CONQUEST_THRESHOLD).toBe(0.6);
  });

  it("should have correct economic multiplier (1.5x)", () => {
    expect(ECONOMIC_MULTIPLIER).toBe(1.5);
  });

  it("should have correct diplomatic threshold (50%)", () => {
    expect(DIPLOMATIC_THRESHOLD).toBe(0.5);
  });

  it("should have correct research max level (7 = 8 levels)", () => {
    expect(RESEARCH_MAX_LEVEL).toBe(7);
  });

  it("should have correct military multiplier (2x)", () => {
    expect(MILITARY_MULTIPLIER).toBe(2.0);
  });

  it("should have victory priority in correct order", () => {
    expect(VICTORY_PRIORITY).toEqual([
      "conquest",
      "research",
      "diplomatic",
      "economic",
      "military",
      "survival",
    ]);
  });
});

// =============================================================================
// CONQUEST VICTORY TESTS
// =============================================================================

describe("checkConquestVictory", () => {
  it("should return true when empire controls 60% of planets", () => {
    const empire = createTestEmpire({ planetCount: 60 });
    expect(checkConquestVictory(empire, 100)).toBe(true);
  });

  it("should return true when empire controls more than 60%", () => {
    const empire = createTestEmpire({ planetCount: 75 });
    expect(checkConquestVictory(empire, 100)).toBe(true);
  });

  it("should return false when empire controls less than 60%", () => {
    const empire = createTestEmpire({ planetCount: 59 });
    expect(checkConquestVictory(empire, 100)).toBe(false);
  });

  it("should return false when totalPlanets is 0", () => {
    const empire = createTestEmpire({ planetCount: 10 });
    expect(checkConquestVictory(empire, 0)).toBe(false);
  });

  it("should handle edge case of exactly 60%", () => {
    const empire = createTestEmpire({ planetCount: 6 });
    expect(checkConquestVictory(empire, 10)).toBe(true);
  });
});

// =============================================================================
// ECONOMIC VICTORY TESTS
// =============================================================================

describe("checkEconomicVictory", () => {
  it("should return true when empire has 1.5x second place networth", () => {
    const empire = createTestEmpire({ networth: 150 });
    expect(checkEconomicVictory(empire, 100)).toBe(true);
  });

  it("should return true when empire has more than 1.5x", () => {
    const empire = createTestEmpire({ networth: 200 });
    expect(checkEconomicVictory(empire, 100)).toBe(true);
  });

  it("should return false when empire has less than 1.5x", () => {
    const empire = createTestEmpire({ networth: 149 });
    expect(checkEconomicVictory(empire, 100)).toBe(false);
  });

  it("should return false when second place networth is 0", () => {
    const empire = createTestEmpire({ networth: 100 });
    expect(checkEconomicVictory(empire, 0)).toBe(false);
  });

  it("should handle edge case of exactly 1.5x", () => {
    const empire = createTestEmpire({ networth: 150 });
    expect(checkEconomicVictory(empire, 100)).toBe(true);
  });
});

// =============================================================================
// DIPLOMATIC VICTORY TESTS
// =============================================================================

describe("checkDiplomaticVictory", () => {
  it("should return true when coalition controls 50% of planets", () => {
    const empires = [
      createTestEmpire({ id: "e1", planetCount: 30 }),
      createTestEmpire({ id: "e2", planetCount: 20 }),
      createTestEmpire({ id: "e3", planetCount: 50 }),
    ];
    const coalition: Coalition = { id: "c1", memberEmpireIds: ["e1", "e2"] };
    expect(checkDiplomaticVictory(coalition, empires, 100)).toBe(true);
  });

  it("should return true when coalition controls more than 50%", () => {
    const empires = [
      createTestEmpire({ id: "e1", planetCount: 40 }),
      createTestEmpire({ id: "e2", planetCount: 20 }),
      createTestEmpire({ id: "e3", planetCount: 40 }),
    ];
    const coalition: Coalition = { id: "c1", memberEmpireIds: ["e1", "e2"] };
    expect(checkDiplomaticVictory(coalition, empires, 100)).toBe(true);
  });

  it("should return false when coalition controls less than 50%", () => {
    const empires = [
      createTestEmpire({ id: "e1", planetCount: 30 }),
      createTestEmpire({ id: "e2", planetCount: 10 }),
      createTestEmpire({ id: "e3", planetCount: 60 }),
    ];
    const coalition: Coalition = { id: "c1", memberEmpireIds: ["e1", "e2"] };
    expect(checkDiplomaticVictory(coalition, empires, 100)).toBe(false);
  });

  it("should return false when coalition has no members", () => {
    const empires = [createTestEmpire({ id: "e1", planetCount: 100 })];
    const coalition: Coalition = { id: "c1", memberEmpireIds: [] };
    expect(checkDiplomaticVictory(coalition, empires, 100)).toBe(false);
  });

  it("should return false when totalPlanets is 0", () => {
    const empires = [createTestEmpire({ id: "e1", planetCount: 10 })];
    const coalition: Coalition = { id: "c1", memberEmpireIds: ["e1"] };
    expect(checkDiplomaticVictory(coalition, empires, 0)).toBe(false);
  });

  it("should exclude eliminated coalition members from planet count", () => {
    const empires = [
      createTestEmpire({ id: "e1", planetCount: 20 }),
      createTestEmpire({ id: "e2", planetCount: 40, isEliminated: true }), // Eliminated!
      createTestEmpire({ id: "e3", planetCount: 40 }),
    ];
    const coalition: Coalition = { id: "c1", memberEmpireIds: ["e1", "e2"] };
    // e1 has 20, e2 is eliminated so doesn't count
    // 20/100 = 20% < 50% threshold
    expect(checkDiplomaticVictory(coalition, empires, 100)).toBe(false);
  });

  it("should succeed when active coalition members control 50%", () => {
    const empires = [
      createTestEmpire({ id: "e1", planetCount: 30 }),
      createTestEmpire({ id: "e2", planetCount: 25 }),
      createTestEmpire({ id: "e3", planetCount: 45, isEliminated: true }), // Eliminated!
    ];
    const coalition: Coalition = { id: "c1", memberEmpireIds: ["e1", "e2"] };
    // e1 has 30, e2 has 25 = 55 planets
    // 55/100 = 55% >= 50% threshold
    expect(checkDiplomaticVictory(coalition, empires, 100)).toBe(true);
  });
});

// =============================================================================
// RESEARCH VICTORY TESTS
// =============================================================================

describe("checkResearchVictory", () => {
  it("should return true when research level is max (7)", () => {
    const empire = createTestEmpire({ fundamentalResearchLevel: 7 });
    expect(checkResearchVictory(empire)).toBe(true);
  });

  it("should return true when research level exceeds max", () => {
    const empire = createTestEmpire({ fundamentalResearchLevel: 8 });
    expect(checkResearchVictory(empire)).toBe(true);
  });

  it("should return false when research level is below max", () => {
    const empire = createTestEmpire({ fundamentalResearchLevel: 6 });
    expect(checkResearchVictory(empire)).toBe(false);
  });

  it("should return false at level 0", () => {
    const empire = createTestEmpire({ fundamentalResearchLevel: 0 });
    expect(checkResearchVictory(empire)).toBe(false);
  });
});

// =============================================================================
// MILITARY VICTORY TESTS
// =============================================================================

describe("calculateMilitaryPower", () => {
  it("should calculate power correctly", () => {
    const empire = createTestEmpire({
      soldiers: 1000, // 1000 * 1 = 1000
      fighters: 100, // 100 * 4 = 400
      stations: 10, // 10 * 100 = 1000
      lightCruisers: 50, // 50 * 10 = 500
      heavyCruisers: 25, // 25 * 20 = 500
      carriers: 10, // 10 * 50 = 500
    });
    expect(calculateMilitaryPower(empire)).toBe(3900);
  });

  it("should return 0 for empire with no military", () => {
    const empire = createTestEmpire({
      soldiers: 0,
      fighters: 0,
      stations: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
    });
    expect(calculateMilitaryPower(empire)).toBe(0);
  });

  it("should not count covert agents", () => {
    const empire = createTestEmpire({
      soldiers: 0,
      fighters: 0,
      stations: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
      covertAgents: 1000,
    });
    expect(calculateMilitaryPower(empire)).toBe(0);
  });
});

describe("checkMilitaryVictory", () => {
  it("should return true when empire has 2x military of all others", () => {
    const empire = createTestEmpire({ id: "e1", soldiers: 10000 });
    const allEmpires = [
      empire,
      createTestEmpire({ id: "e2", soldiers: 2000 }),
      createTestEmpire({ id: "e3", soldiers: 3000 }),
    ];
    // Empire: 10000, Others: 5000, need 2x = 10000 ✓
    expect(checkMilitaryVictory(empire, allEmpires)).toBe(true);
  });

  it("should return false when empire has less than 2x", () => {
    const empire = createTestEmpire({ id: "e1", soldiers: 9999 });
    const allEmpires = [
      empire,
      createTestEmpire({ id: "e2", soldiers: 2000 }),
      createTestEmpire({ id: "e3", soldiers: 3000 }),
    ];
    expect(checkMilitaryVictory(empire, allEmpires)).toBe(false);
  });

  it("should return true when only empire with military", () => {
    const empire = createTestEmpire({ id: "e1", soldiers: 100 });
    const allEmpires = [
      empire,
      createTestEmpire({ id: "e2", soldiers: 0 }),
    ];
    expect(checkMilitaryVictory(empire, allEmpires)).toBe(true);
  });

  it("should exclude eliminated empires from calculation", () => {
    const empire = createTestEmpire({ id: "e1", soldiers: 6000 });
    const allEmpires = [
      empire,
      createTestEmpire({ id: "e2", soldiers: 3000 }),
      createTestEmpire({ id: "e3", soldiers: 10000, isEliminated: true }),
    ];
    // Others active: 3000, need 2x = 6000 ✓
    expect(checkMilitaryVictory(empire, allEmpires)).toBe(true);
  });
});

// =============================================================================
// SURVIVAL VICTORY TESTS
// =============================================================================

describe("checkSurvivalVictory", () => {
  it("should return true at turn limit with 1.5× networth of second place", () => {
    // Must meet economic threshold (1.5×) to win by survival
    const empire = createTestEmpire({ id: "e1", networth: 600 });
    const allEmpires = [
      empire,
      createTestEmpire({ id: "e2", networth: 300 }),
      createTestEmpire({ id: "e3", networth: 400 }),
    ];
    // 600 >= 400 * 1.5 = true
    expect(checkSurvivalVictory(empire, allEmpires, 200, 200)).toBe(true);
  });

  it("should return false at turn limit without economic threshold", () => {
    // Highest networth but doesn't meet 1.5× threshold
    const empire = createTestEmpire({ id: "e1", networth: 500 });
    const allEmpires = [
      empire,
      createTestEmpire({ id: "e2", networth: 400 }),
    ];
    // 500 < 400 * 1.5 = false (prevents pure turtling)
    expect(checkSurvivalVictory(empire, allEmpires, 200, 200)).toBe(false);
  });

  it("should return false before turn limit", () => {
    const empire = createTestEmpire({ id: "e1", networth: 500 });
    const allEmpires = [empire];
    expect(checkSurvivalVictory(empire, allEmpires, 199, 200)).toBe(false);
  });

  it("should return false if not highest networth", () => {
    const empire = createTestEmpire({ id: "e1", networth: 300 });
    const allEmpires = [
      empire,
      createTestEmpire({ id: "e2", networth: 500 }),
    ];
    expect(checkSurvivalVictory(empire, allEmpires, 200, 200)).toBe(false);
  });

  it("should return true when only one empire remains", () => {
    const empire = createTestEmpire({ id: "e1", networth: 300 });
    const allEmpires = [
      empire,
      createTestEmpire({ id: "e2", networth: 500, isEliminated: true }),
    ];
    expect(checkSurvivalVictory(empire, allEmpires, 200, 200)).toBe(true);
  });

  it("should return false when tied - neither meets threshold", () => {
    // Equal networth means neither has 1.5× advantage
    const empireA = createTestEmpire({ id: "e1", name: "Alpha Empire", networth: 500 });
    const empireZ = createTestEmpire({ id: "e2", name: "Zeta Empire", networth: 500 });
    const allEmpires = [empireA, empireZ];

    // Neither wins because 500 < 500 * 1.5
    expect(checkSurvivalVictory(empireA, allEmpires, 200, 200)).toBe(false);
    expect(checkSurvivalVictory(empireZ, allEmpires, 200, 200)).toBe(false);
  });

  it("should require economic dominance even with slight lead", () => {
    const empire1 = createTestEmpire({ id: "aaa-1", name: "Leader", networth: 600 });
    const empire2 = createTestEmpire({ id: "zzz-2", name: "Second", networth: 500 });
    const allEmpires = [empire1, empire2];

    // 600 < 500 * 1.5 = 750, so no winner
    expect(checkSurvivalVictory(empire1, allEmpires, 200, 200)).toBe(false);
    expect(checkSurvivalVictory(empire2, allEmpires, 200, 200)).toBe(false);
  });
});

// =============================================================================
// DEFEAT CONDITION TESTS
// =============================================================================

describe("checkBankruptcy", () => {
  it("should return true when credits are negative and below maintenance", () => {
    const empire = createTestEmpire({ credits: -100 });
    expect(checkBankruptcy(empire, 50)).toBe(true);
  });

  it("should return false when credits are positive", () => {
    const empire = createTestEmpire({ credits: 100 });
    expect(checkBankruptcy(empire, 50)).toBe(false);
  });

  it("should return false when credits cover maintenance", () => {
    const empire = createTestEmpire({ credits: 100 });
    expect(checkBankruptcy(empire, 50)).toBe(false);
  });
});

describe("checkElimination", () => {
  it("should return true when planet count is 0", () => {
    const empire = createTestEmpire({ planetCount: 0 });
    expect(checkElimination(empire)).toBe(true);
  });

  it("should return false when planet count is positive", () => {
    const empire = createTestEmpire({ planetCount: 1 });
    expect(checkElimination(empire)).toBe(false);
  });
});

describe("checkCivilCollapse", () => {
  it("should return true when civil status is revolting", () => {
    const empire = createTestEmpire({ civilStatus: "revolting" });
    expect(checkCivilCollapse(empire)).toBe(true);
  });

  it("should return false for other civil statuses", () => {
    const statuses = [
      "ecstatic",
      "happy",
      "content",
      "neutral",
      "unhappy",
      "angry",
      "rioting",
    ];
    for (const status of statuses) {
      const empire = createTestEmpire({ civilStatus: status });
      expect(checkCivilCollapse(empire)).toBe(false);
    }
  });
});

describe("checkDefeatConditions", () => {
  it("should detect elimination first", () => {
    const empire = createTestEmpire({
      planetCount: 0,
      credits: -1000,
      civilStatus: "revolting",
    });
    const result = checkDefeatConditions(empire, 100);
    expect(result.defeated).toBe(true);
    expect(result.reason).toBe("elimination");
  });

  it("should detect civil collapse second", () => {
    const empire = createTestEmpire({
      planetCount: 5,
      credits: -1000,
      civilStatus: "revolting",
    });
    const result = checkDefeatConditions(empire, 100);
    expect(result.defeated).toBe(true);
    expect(result.reason).toBe("civil_collapse");
  });

  it("should detect bankruptcy third", () => {
    const empire = createTestEmpire({
      planetCount: 5,
      credits: -1000,
      civilStatus: "content",
    });
    const result = checkDefeatConditions(empire, 100);
    expect(result.defeated).toBe(true);
    expect(result.reason).toBe("bankruptcy");
  });

  it("should return not defeated when all conditions pass", () => {
    const empire = createTestEmpire({
      planetCount: 5,
      credits: 1000,
      civilStatus: "content",
    });
    const result = checkDefeatConditions(empire, 100);
    expect(result.defeated).toBe(false);
    expect(result.reason).toBeUndefined();
  });
});

// =============================================================================
// COMPREHENSIVE VICTORY CHECK TESTS
// =============================================================================

describe("checkAllVictoryConditions", () => {
  it("should return null when no victory achieved", () => {
    const empires = [
      createTestEmpire({ id: "e1", planetCount: 30, networth: 100 }),
      createTestEmpire({ id: "e2", planetCount: 30, networth: 100 }),
      createTestEmpire({ id: "e3", planetCount: 40, networth: 100 }),
    ];
    const result = checkAllVictoryConditions(empires, [], 100, 50);
    expect(result).toBeNull();
  });

  it("should detect conquest victory", () => {
    const empires = [
      createTestEmpire({ id: "e1", planetCount: 65 }),
      createTestEmpire({ id: "e2", planetCount: 35 }),
    ];
    const result = checkAllVictoryConditions(empires, [], 100, 50);
    expect(result?.achieved).toBe(true);
    expect(result?.type).toBe("conquest");
    expect(result?.winnerId).toBe("e1");
  });

  it("should prioritize conquest over other victories", () => {
    const empires = [
      createTestEmpire({
        id: "e1",
        planetCount: 65,
        fundamentalResearchLevel: 7, // Also has research victory
      }),
      createTestEmpire({ id: "e2", planetCount: 35 }),
    ];
    const result = checkAllVictoryConditions(empires, [], 100, 50);
    expect(result?.type).toBe("conquest");
  });

  it("should detect last empire standing as conquest", () => {
    const empires = [
      createTestEmpire({ id: "e1", planetCount: 30, isEliminated: false }),
      createTestEmpire({ id: "e2", planetCount: 0, isEliminated: true }),
    ];
    const result = checkAllVictoryConditions(empires, [], 100, 50);
    expect(result?.achieved).toBe(true);
    expect(result?.type).toBe("conquest");
    expect(result?.winnerId).toBe("e1");
  });

  it("should return null when all empires eliminated", () => {
    const empires = [
      createTestEmpire({ id: "e1", isEliminated: true }),
      createTestEmpire({ id: "e2", isEliminated: true }),
    ];
    const result = checkAllVictoryConditions(empires, [], 100, 50);
    expect(result).toBeNull();
  });
});

// =============================================================================
// VICTORY PROGRESS TESTS
// =============================================================================

describe("analyzeVictoryProgress", () => {
  it("should return progress for all victory types", () => {
    const empire = createTestEmpire({ id: "e1", planetCount: 30 });
    const allEmpires = [empire, createTestEmpire({ id: "e2", planetCount: 70 })];
    const progress = analyzeVictoryProgress(empire, allEmpires, [], 100, 50);

    expect(progress.length).toBe(6);
    expect(progress.map((p) => p.type)).toEqual([
      "conquest",
      "economic",
      "diplomatic",
      "research",
      "military",
      "survival",
    ]);
  });

  it("should calculate conquest progress correctly", () => {
    const empire = createTestEmpire({ id: "e1", planetCount: 30 });
    const allEmpires = [empire];
    const progress = analyzeVictoryProgress(empire, allEmpires, [], 100, 50);
    const conquest = progress.find((p) => p.type === "conquest");

    expect(conquest?.currentValue).toBe(30);
    expect(conquest?.targetValue).toBe(60); // 60% of 100
    expect(conquest?.percentage).toBe(50); // 30/60 = 50%
  });

  it("should calculate research progress correctly", () => {
    const empire = createTestEmpire({ fundamentalResearchLevel: 3 });
    const progress = analyzeVictoryProgress(empire, [empire], [], 100, 50);
    const research = progress.find((p) => p.type === "research");

    expect(research?.currentValue).toBe(3);
    expect(research?.targetValue).toBe(7);
    expect(research?.percentage).toBe(50); // (3+1)/(7+1) = 4/8 = 50%
  });
});

describe("hasViableVictoryPath", () => {
  it("should return true when empire has viable paths", () => {
    const empire = createTestEmpire({ planetCount: 30 });
    expect(hasViableVictoryPath(empire, [empire], [], 100, 50)).toBe(true);
  });

  it("should consider survival always viable for active empires", () => {
    const empire = createTestEmpire({ planetCount: 1 });
    expect(hasViableVictoryPath(empire, [empire], [], 100, 50)).toBe(true);
  });
});

describe("getMostViableVictoryPath", () => {
  it("should return highest progress victory path", () => {
    // When empire has 50 planets out of 100:
    // - Conquest: 50/60 = 83% progress
    // - Diplomatic: 50/50 = 100% progress (empire's own planets count as coalition)
    // So diplomatic should be returned as it has higher progress
    const empire = createTestEmpire({ id: "e1", planetCount: 50 });
    const other = createTestEmpire({ id: "e2", planetCount: 50 });
    const result = getMostViableVictoryPath(empire, [empire, other], [], 100, 50);
    expect(result).toBe("diplomatic");
  });

  it("should return survival as fallback", () => {
    const empire = createTestEmpire({
      planetCount: 1,
      networth: 1,
      soldiers: 0,
    });
    const other = createTestEmpire({
      id: "e2",
      planetCount: 99,
      networth: 1000,
      soldiers: 10000,
    });
    const result = getMostViableVictoryPath(empire, [empire, other], [], 100, 190);
    // At turn 190, survival is 95% complete
    expect(result).toBe("survival");
  });
});

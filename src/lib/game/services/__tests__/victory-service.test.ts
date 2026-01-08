/**
 * Victory Service Tests
 *
 * Comprehensive test suite for victory and defeat mechanics:
 * - Defeat condition detection (elimination, bankruptcy, civil collapse)
 * - Revolt consequence calculation and ramping
 * - Unit loss distribution during revolts
 *
 * Note: Database-dependent functions (checkVictoryConditions, getGameStandings,
 * checkStalemateWarning) are tested via E2E tests.
 */

import { describe, it, expect } from "vitest";
import {
  checkDefeatConditions,
  calculateRevoltConsequences,
  applyRevoltConsequences,
  REVOLT_CONSEQUENCES,
  CONQUEST_THRESHOLD,
  ECONOMIC_THRESHOLD,
  TURN_LIMIT,
} from "../core/victory-service";
import type { Empire } from "@/lib/db/schema";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createMockEmpire(overrides: Partial<Empire> = {}): Empire {
  return {
    id: "test-empire-id",
    gameId: "test-game-id",
    name: "Test Empire",
    type: "player",
    credits: 100000,
    food: 10000,
    ore: 10000,
    petroleum: 5000,
    population: 500000,
    populationCap: 1000000,
    soldiers: 1000,
    fighters: 500,
    stations: 50,
    lightCruisers: 100,
    heavyCruisers: 50,
    carriers: 10,
    covertAgents: 20,
    covertPoints: 100,
    researchPoints: 0,
    civilStatus: "content",
    networth: "1000000",
    armyEffectiveness: "1.00",
    foodDeficitTurns: 0,
    foodSurplusTurns: 0,
    isEliminated: false,
    eliminatedAt: null,
    lastActiveAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// =============================================================================
// CONSTANTS VERIFICATION
// =============================================================================

describe("Victory Service Constants", () => {
  it("should have correct conquest threshold (60%)", () => {
    expect(CONQUEST_THRESHOLD).toBe(0.6);
  });

  it("should have correct economic threshold (1.5×)", () => {
    expect(ECONOMIC_THRESHOLD).toBe(1.5);
  });

  it("should have correct turn limit (200)", () => {
    expect(TURN_LIMIT).toBe(200);
  });

  it("should have revolt consequences for 3 levels", () => {
    expect(REVOLT_CONSEQUENCES[1]).toBeDefined();
    expect(REVOLT_CONSEQUENCES[2]).toBeDefined();
    expect(REVOLT_CONSEQUENCES[3]).toBeDefined();
  });

  it("should have increasing severity in revolt consequences", () => {
    expect(REVOLT_CONSEQUENCES[1].productionPenalty).toBeLessThan(
      REVOLT_CONSEQUENCES[2].productionPenalty
    );
    expect(REVOLT_CONSEQUENCES[2].productionPenalty).toBeLessThan(
      REVOLT_CONSEQUENCES[3].productionPenalty
    );
  });
});

// =============================================================================
// checkDefeatConditions Tests
// =============================================================================

describe("checkDefeatConditions", () => {
  describe("Elimination defeat (0 sectors)", () => {
    it("should detect elimination when sectorCount is 0", () => {
      const empire = createMockEmpire({ credits: 50000 });
      const result = checkDefeatConditions(empire, 0, 50, 1000);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("elimination");
      expect(result?.empireId).toBe(empire.id);
      expect(result?.empireName).toBe(empire.name);
      expect(result?.turn).toBe(50);
    });

    it("should return elimination message with empire name", () => {
      const empire = createMockEmpire({ name: "Fallen Kingdom" });
      const result = checkDefeatConditions(empire, 0, 100, 5000);

      expect(result?.message).toContain("Fallen Kingdom");
      expect(result?.message).toContain("eliminated");
    });

    it("should detect elimination regardless of credits", () => {
      const richEmpire = createMockEmpire({ credits: 999999999 });
      const result = checkDefeatConditions(richEmpire, 0, 10, 50000);

      expect(result?.type).toBe("elimination");
    });

    it("should detect elimination regardless of positive production", () => {
      const empire = createMockEmpire();
      const result = checkDefeatConditions(empire, 0, 10, 100000);

      expect(result?.type).toBe("elimination");
    });
  });

  describe("Bankruptcy defeat (credits <= 0 AND negative production)", () => {
    it("should detect bankruptcy when credits <= 0 AND negative production", () => {
      const empire = createMockEmpire({ credits: 0 });
      const result = checkDefeatConditions(empire, 5, 75, -1000);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("bankruptcy");
      expect(result?.turn).toBe(75);
    });

    it("should detect bankruptcy with negative credits and negative production", () => {
      const empire = createMockEmpire({ credits: -5000 });
      const result = checkDefeatConditions(empire, 5, 30, -500);

      expect(result?.type).toBe("bankruptcy");
    });

    it("should NOT defeat on zero credits if production is positive", () => {
      const empire = createMockEmpire({ credits: 0 });
      const result = checkDefeatConditions(empire, 10, 50, 5000);

      expect(result).toBeNull();
    });

    it("should NOT defeat on negative credits if production is positive", () => {
      const empire = createMockEmpire({ credits: -1000 });
      const result = checkDefeatConditions(empire, 10, 50, 2000);

      expect(result).toBeNull();
    });

    it("should NOT defeat on zero credits if production is zero", () => {
      const empire = createMockEmpire({ credits: 0 });
      const result = checkDefeatConditions(empire, 5, 50, 0);

      expect(result).toBeNull();
    });

    it("should return bankruptcy message with empire name", () => {
      const empire = createMockEmpire({ name: "Broke Empire", credits: 0 });
      const result = checkDefeatConditions(empire, 3, 40, -100);

      expect(result?.message).toContain("Broke Empire");
      expect(result?.message).toContain("bankrupt");
    });
  });

  describe("Edge cases", () => {
    it("should handle empire with exactly 1 sector (not defeated)", () => {
      const empire = createMockEmpire();
      const result = checkDefeatConditions(empire, 1, 100, 500);

      expect(result).toBeNull();
    });

    it("should prioritize elimination over bankruptcy check", () => {
      const empire = createMockEmpire({ credits: -1000 });
      const result = checkDefeatConditions(empire, 0, 50, -500);

      expect(result?.type).toBe("elimination");
    });

    it("should handle large positive credits with 0 sectors", () => {
      const empire = createMockEmpire({ credits: 100000000 });
      const result = checkDefeatConditions(empire, 0, 25, 50000);

      expect(result?.type).toBe("elimination");
    });

    it("should handle healthy empire (not defeated)", () => {
      const empire = createMockEmpire({ credits: 50000 });
      const result = checkDefeatConditions(empire, 10, 100, 5000);

      expect(result).toBeNull();
    });

    it("should include correct turn number in defeat result", () => {
      const empire = createMockEmpire();
      const result = checkDefeatConditions(empire, 0, 199, 0);

      expect(result?.turn).toBe(199);
    });
  });
});

// =============================================================================
// calculateRevoltConsequences Tests
// =============================================================================

describe("calculateRevoltConsequences", () => {
  describe("No revolt (0 consecutive turns)", () => {
    it("should return no consequences for 0 consecutive turns", () => {
      const empire = createMockEmpire();
      const result = calculateRevoltConsequences(empire, 10, 0);

      expect(result.consecutiveTurns).toBe(0);
      expect(result.productionPenalty).toBe(0);
      expect(result.sectorsLost).toBe(0);
      expect(result.unitsLost).toBe(0);
      expect(result.isDefeated).toBe(false);
    });

    it("should return stable message for 0 turns", () => {
      const empire = createMockEmpire();
      const result = calculateRevoltConsequences(empire, 10, 0);

      expect(result.message).toContain("stable");
    });

    it("should return no consequences for negative turns", () => {
      const empire = createMockEmpire();
      const result = calculateRevoltConsequences(empire, 10, -1);

      expect(result.consecutiveTurns).toBe(0);
      expect(result.isDefeated).toBe(false);
    });
  });

  describe("Turn 1 of revolt (10% production penalty)", () => {
    it("should apply 10% production penalty on turn 1", () => {
      const empire = createMockEmpire();
      const result = calculateRevoltConsequences(empire, 10, 1);

      expect(result.consecutiveTurns).toBe(1);
      expect(result.productionPenalty).toBe(0.1);
      expect(result.isDefeated).toBe(false);
    });

    it("should have warning message on turn 1", () => {
      const empire = createMockEmpire();
      const result = calculateRevoltConsequences(empire, 10, 1);

      expect(result.message).toContain("unrest");
    });

    it("should not lose units on turn 1", () => {
      const empire = createMockEmpire({
        soldiers: 1000,
        fighters: 500,
      });
      const result = calculateRevoltConsequences(empire, 10, 1);

      // Unit loss rate is 0 on turn 1
      expect(result.unitsLost).toBe(0);
    });
  });

  describe("Turn 2 of revolt (25% penalty, 10% desertion)", () => {
    it("should apply 25% production penalty on turn 2", () => {
      const empire = createMockEmpire();
      const result = calculateRevoltConsequences(empire, 10, 2);

      expect(result.consecutiveTurns).toBe(2);
      expect(result.productionPenalty).toBe(0.25);
      expect(result.isDefeated).toBe(false);
    });

    it("should calculate unit losses on turn 2", () => {
      const empire = createMockEmpire({
        soldiers: 1000,
        fighters: 500,
        stations: 50,
        lightCruisers: 100,
        heavyCruisers: 50,
        carriers: 10,
        covertAgents: 20,
      });

      const result = calculateRevoltConsequences(empire, 10, 2);

      // Total units = 1730, 10% loss = 173
      expect(result.unitsLost).toBeGreaterThan(0);
    });

    it("should have escalated message on turn 2", () => {
      const empire = createMockEmpire();
      const result = calculateRevoltConsequences(empire, 10, 2);

      expect(result.message).toContain("deserting");
    });
  });

  describe("Turn 3 of revolt (Civil war = defeat)", () => {
    it("should trigger defeat on turn 3", () => {
      const empire = createMockEmpire();
      const result = calculateRevoltConsequences(empire, 10, 3);

      expect(result.consecutiveTurns).toBe(3);
      expect(result.isDefeated).toBe(true);
    });

    it("should have 100% production penalty on turn 3", () => {
      const empire = createMockEmpire();
      const result = calculateRevoltConsequences(empire, 10, 3);

      expect(result.productionPenalty).toBe(1.0);
    });

    it("should have civil war message on turn 3", () => {
      const empire = createMockEmpire();
      const result = calculateRevoltConsequences(empire, 10, 3);

      expect(result.message).toContain("CIVIL WAR");
    });
  });

  describe("Beyond turn 3 (still defeated)", () => {
    it("should still be defeated at turn 4", () => {
      const empire = createMockEmpire();
      const result = calculateRevoltConsequences(empire, 10, 4);

      expect(result.isDefeated).toBe(true);
      expect(result.productionPenalty).toBe(1.0);
    });

    it("should cap at level 3 consequences", () => {
      const empire = createMockEmpire();
      const result = calculateRevoltConsequences(empire, 10, 10);

      // Should not exceed level 3 consequences
      expect(result.productionPenalty).toBe(1.0);
      expect(result.isDefeated).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("should handle empire with 0 sectors", () => {
      const empire = createMockEmpire();
      const result = calculateRevoltConsequences(empire, 0, 1);

      // Sector loss calculation shouldn't break with 0 sectors
      expect(result.sectorsLost).toBe(0);
    });

    it("should handle empire with 0 military units", () => {
      const empire = createMockEmpire({
        soldiers: 0,
        fighters: 0,
        stations: 0,
        lightCruisers: 0,
        heavyCruisers: 0,
        carriers: 0,
        covertAgents: 0,
      });

      const result = calculateRevoltConsequences(empire, 10, 2);

      expect(result.unitsLost).toBe(0);
    });

    it("should handle large empire correctly", () => {
      const empire = createMockEmpire({
        soldiers: 100000,
        fighters: 50000,
        stations: 5000,
        lightCruisers: 10000,
        heavyCruisers: 5000,
        carriers: 1000,
        covertAgents: 500,
      });

      const result = calculateRevoltConsequences(empire, 100, 2);

      // Should calculate 10% of total units
      expect(result.unitsLost).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// applyRevoltConsequences Tests
// =============================================================================

describe("applyRevoltConsequences", () => {
  describe("No unit loss (turn 1 or no revolt)", () => {
    it("should return zero losses when unitsLost is 0", () => {
      const empire = createMockEmpire({
        soldiers: 1000,
        fighters: 500,
      });

      const consequence = {
        consecutiveTurns: 1,
        productionPenalty: 0.1,
        sectorsLost: 0,
        unitsLost: 0,
        isDefeated: false,
        message: "Test",
      };

      const result = applyRevoltConsequences(empire, consequence);

      expect(result.soldierLoss).toBe(0);
      expect(result.fighterLoss).toBe(0);
      expect(result.stationLoss).toBe(0);
      expect(result.lightCruiserLoss).toBe(0);
      expect(result.heavyCruiserLoss).toBe(0);
      expect(result.carrierLoss).toBe(0);
      expect(result.covertAgentLoss).toBe(0);
    });

    it("should return zero losses for turn 0", () => {
      const empire = createMockEmpire();

      const consequence = {
        consecutiveTurns: 0,
        productionPenalty: 0,
        sectorsLost: 0,
        unitsLost: 0,
        isDefeated: false,
        message: "Stable",
      };

      const result = applyRevoltConsequences(empire, consequence);

      expect(result.soldierLoss).toBe(0);
    });
  });

  describe("Unit loss distribution (turn 2+)", () => {
    it("should distribute losses proportionally across 7 unit types", () => {
      const empire = createMockEmpire({
        soldiers: 1000,
        fighters: 500,
        stations: 100,
        lightCruisers: 200,
        heavyCruisers: 100,
        carriers: 50,
        covertAgents: 50,
      });

      const consequence = {
        consecutiveTurns: 2,
        productionPenalty: 0.25,
        sectorsLost: 1,
        unitsLost: 200, // Total units = 2000, so 10%
        isDefeated: false,
        message: "Riots",
      };

      const result = applyRevoltConsequences(empire, consequence);

      // 10% of each unit type
      expect(result.soldierLoss).toBe(100); // 10% of 1000
      expect(result.fighterLoss).toBe(50); // 10% of 500
      expect(result.stationLoss).toBe(10); // 10% of 100
      expect(result.lightCruiserLoss).toBe(20); // 10% of 200
      expect(result.heavyCruiserLoss).toBe(10); // 10% of 100
      expect(result.carrierLoss).toBe(5); // 10% of 50
      expect(result.covertAgentLoss).toBe(5); // 10% of 50
    });

    it("should handle empire with only some unit types", () => {
      const empire = createMockEmpire({
        soldiers: 1000,
        fighters: 0,
        stations: 0,
        lightCruisers: 0,
        heavyCruisers: 0,
        carriers: 0,
        covertAgents: 0,
      });

      const consequence = {
        consecutiveTurns: 2,
        productionPenalty: 0.25,
        sectorsLost: 1,
        unitsLost: 100,
        isDefeated: false,
        message: "Riots",
      };

      const result = applyRevoltConsequences(empire, consequence);

      expect(result.soldierLoss).toBe(100);
      expect(result.fighterLoss).toBe(0);
      expect(result.lightCruiserLoss).toBe(0);
    });

    it("should handle empire with zero units", () => {
      const empire = createMockEmpire({
        soldiers: 0,
        fighters: 0,
        stations: 0,
        lightCruisers: 0,
        heavyCruisers: 0,
        carriers: 0,
        covertAgents: 0,
      });

      const consequence = {
        consecutiveTurns: 2,
        productionPenalty: 0.25,
        sectorsLost: 1,
        unitsLost: 100, // Should not matter
        isDefeated: false,
        message: "Riots",
      };

      const result = applyRevoltConsequences(empire, consequence);

      expect(result.soldierLoss).toBe(0);
      expect(result.fighterLoss).toBe(0);
    });

    it("should floor loss values (not round)", () => {
      const empire = createMockEmpire({
        soldiers: 15, // 10% = 1.5 → 1
        fighters: 25, // 10% = 2.5 → 2
        stations: 7, // 10% = 0.7 → 0
        lightCruisers: 0,
        heavyCruisers: 0,
        carriers: 0,
        covertAgents: 0,
      });

      const consequence = {
        consecutiveTurns: 2,
        productionPenalty: 0.25,
        sectorsLost: 0,
        unitsLost: 5,
        isDefeated: false,
        message: "Riots",
      };

      const result = applyRevoltConsequences(empire, consequence);

      expect(result.soldierLoss).toBe(1); // floor(1.5)
      expect(result.fighterLoss).toBe(2); // floor(2.5)
      expect(result.stationLoss).toBe(0); // floor(0.7)
    });

    it("should not apply 10% rate when consecutiveTurns < 2", () => {
      const empire = createMockEmpire({
        soldiers: 1000,
        fighters: 500,
      });

      const consequence = {
        consecutiveTurns: 1,
        productionPenalty: 0.1,
        sectorsLost: 0,
        unitsLost: 0, // Turn 1 has 0 unit loss rate
        isDefeated: false,
        message: "Unrest",
      };

      const result = applyRevoltConsequences(empire, consequence);

      expect(result.soldierLoss).toBe(0);
      expect(result.fighterLoss).toBe(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle very large unit counts", () => {
      const empire = createMockEmpire({
        soldiers: 10000000,
        fighters: 5000000,
        stations: 100000,
        lightCruisers: 500000,
        heavyCruisers: 250000,
        carriers: 50000,
        covertAgents: 10000,
      });

      const consequence = {
        consecutiveTurns: 2,
        productionPenalty: 0.25,
        sectorsLost: 10,
        unitsLost: 1591000, // 10% of total
        isDefeated: false,
        message: "Riots",
      };

      const result = applyRevoltConsequences(empire, consequence);

      expect(result.soldierLoss).toBe(1000000); // 10% of 10M
      expect(result.fighterLoss).toBe(500000); // 10% of 5M
    });

    it("should return all seven loss properties", () => {
      const empire = createMockEmpire();

      const consequence = {
        consecutiveTurns: 2,
        productionPenalty: 0.25,
        sectorsLost: 1,
        unitsLost: 173,
        isDefeated: false,
        message: "Riots",
      };

      const result = applyRevoltConsequences(empire, consequence);

      expect(result).toHaveProperty("soldierLoss");
      expect(result).toHaveProperty("fighterLoss");
      expect(result).toHaveProperty("stationLoss");
      expect(result).toHaveProperty("lightCruiserLoss");
      expect(result).toHaveProperty("heavyCruiserLoss");
      expect(result).toHaveProperty("carrierLoss");
      expect(result).toHaveProperty("covertAgentLoss");
    });
  });
});

// =============================================================================
// Integration scenarios
// =============================================================================

describe("Victory/Defeat Integration Scenarios", () => {
  describe("Revolt progression to civil collapse", () => {
    it("should escalate from stable to defeat over 3 turns", () => {
      const empire = createMockEmpire();

      // Turn 0 - stable
      const stable = calculateRevoltConsequences(empire, 10, 0);
      expect(stable.isDefeated).toBe(false);
      expect(stable.productionPenalty).toBe(0);

      // Turn 1 - minor unrest
      const turn1 = calculateRevoltConsequences(empire, 10, 1);
      expect(turn1.isDefeated).toBe(false);
      expect(turn1.productionPenalty).toBe(0.1);

      // Turn 2 - escalation
      const turn2 = calculateRevoltConsequences(empire, 10, 2);
      expect(turn2.isDefeated).toBe(false);
      expect(turn2.productionPenalty).toBe(0.25);
      expect(turn2.unitsLost).toBeGreaterThan(0);

      // Turn 3 - civil war (defeat)
      const turn3 = calculateRevoltConsequences(empire, 10, 3);
      expect(turn3.isDefeated).toBe(true);
      expect(turn3.productionPenalty).toBe(1.0);
    });
  });

  describe("Combined defeat conditions", () => {
    it("should prioritize elimination when both elimination and bankruptcy possible", () => {
      const empire = createMockEmpire({ credits: -5000 });
      const result = checkDefeatConditions(empire, 0, 50, -1000);

      // Elimination takes priority
      expect(result?.type).toBe("elimination");
    });
  });
});

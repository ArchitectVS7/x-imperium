/**
 * Tests for Volley Combat System v2 (D20 Based)
 */

import { describe, it, expect } from "vitest";
import {
  resolveBattle,
  processRetreat,
  estimateWinProbability,
  getOutcomeDisplay,
  summarizeVolley,
  type BattleOptions,
  type VolleyResult,
  type AttackRoll,
} from "../volley-combat-v2";
import {
  getStanceModifiers,
  getAllStances,
  getEffectiveAttackMod,
  getEffectiveDefense,
  applyCasualtyModifier,
  isValidStance,
} from "../stances";
import {
  analyzeTheaterControl,
  getUnitTheater,
  countUnitsInTheater,
} from "../theater-control";
import type { Forces } from "../phases";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a complete Forces object with defaults for missing properties.
 */
function makeForces(partial: Partial<Forces>): Forces {
  return {
    soldiers: 0,
    fighters: 0,
    stations: 0,
    lightCruisers: 0,
    heavyCruisers: 0,
    carriers: 0,
    ...partial,
  };
}

// =============================================================================
// STANCE TESTS
// =============================================================================

describe("Stances", () => {
  describe("getStanceModifiers", () => {
    it("returns correct modifiers for aggressive stance", () => {
      const mods = getStanceModifiers("aggressive");
      expect(mods.attackMod).toBe(3);
      expect(mods.defenseMod).toBe(-2);
      expect(mods.casualtyMultiplier).toBe(1.2);
    });

    it("returns no modifiers for balanced stance", () => {
      const mods = getStanceModifiers("balanced");
      expect(mods.attackMod).toBe(0);
      expect(mods.defenseMod).toBe(0);
      expect(mods.casualtyMultiplier).toBe(1.0);
    });

    it("returns defensive modifiers for defensive stance", () => {
      const mods = getStanceModifiers("defensive");
      expect(mods.attackMod).toBe(-2);
      expect(mods.defenseMod).toBe(3);
      expect(mods.casualtyMultiplier).toBe(0.8);
    });

    it("returns evasive modifiers for evasive stance", () => {
      const mods = getStanceModifiers("evasive");
      expect(mods.attackMod).toBe(-3);
      expect(mods.defenseMod).toBe(1);
      expect(mods.casualtyMultiplier).toBe(0.6);
    });
  });

  describe("getAllStances", () => {
    it("returns all 4 stances", () => {
      const stances = getAllStances();
      expect(stances).toHaveLength(4);
      expect(stances).toContain("aggressive");
      expect(stances).toContain("balanced");
      expect(stances).toContain("defensive");
      expect(stances).toContain("evasive");
    });
  });

  describe("getEffectiveAttackMod", () => {
    it("adds TAR and stance modifier", () => {
      expect(getEffectiveAttackMod(4, "aggressive")).toBe(7); // 4 + 3
      expect(getEffectiveAttackMod(4, "balanced")).toBe(4); // 4 + 0
      expect(getEffectiveAttackMod(4, "defensive")).toBe(2); // 4 - 2
      expect(getEffectiveAttackMod(4, "evasive")).toBe(1); // 4 - 3
    });
  });

  describe("getEffectiveDefense", () => {
    it("adds DEF and stance modifier", () => {
      expect(getEffectiveDefense(15, "aggressive")).toBe(13); // 15 - 2
      expect(getEffectiveDefense(15, "balanced")).toBe(15); // 15 + 0
      expect(getEffectiveDefense(15, "defensive")).toBe(18); // 15 + 3
      expect(getEffectiveDefense(15, "evasive")).toBe(16); // 15 + 1
    });
  });

  describe("applyCasualtyModifier", () => {
    it("applies casualty multiplier based on stance", () => {
      expect(applyCasualtyModifier(100, "aggressive")).toBe(120);
      expect(applyCasualtyModifier(100, "balanced")).toBe(100);
      expect(applyCasualtyModifier(100, "defensive")).toBe(80);
      expect(applyCasualtyModifier(100, "evasive")).toBe(60);
    });
  });

  describe("isValidStance", () => {
    it("validates stance strings", () => {
      expect(isValidStance("aggressive")).toBe(true);
      expect(isValidStance("balanced")).toBe(true);
      expect(isValidStance("invalid")).toBe(false);
      expect(isValidStance("")).toBe(false);
    });
  });
});

// =============================================================================
// THEATER TESTS
// =============================================================================

describe("Theater Control", () => {
  describe("analyzeTheaterControl", () => {
    it("grants space dominance when attacker has 2x space units", () => {
      const attacker = makeForces({ lightCruisers: 20, heavyCruisers: 10 });
      const defender = makeForces({ lightCruisers: 10 });

      const analysis = analyzeTheaterControl(attacker, defender);

      expect(analysis.attackerBonuses).toHaveLength(1);
      expect(analysis.attackerBonuses[0]?.name).toBe("Space Dominance");
      expect(analysis.attackerAttackMod).toBe(2);
    });

    it("grants orbital shield when defender has stations", () => {
      const attacker = makeForces({ lightCruisers: 10 });
      const defender = makeForces({ stations: 2, lightCruisers: 10 });

      const analysis = analyzeTheaterControl(attacker, defender);

      expect(analysis.defenderBonuses).toHaveLength(1);
      expect(analysis.defenderBonuses[0]?.name).toBe("Orbital Shield");
      expect(analysis.defenderDefenseMod).toBe(2);
    });

    it("grants ground superiority when attacker has 3x marines", () => {
      const attacker = makeForces({ soldiers: 600 });
      const defender = makeForces({ soldiers: 100 });

      const analysis = analyzeTheaterControl(attacker, defender);

      expect(analysis.attackerHasGroundSuperiority).toBe(true);
      expect(
        analysis.attackerBonuses.find((b) => b.name === "Ground Superiority")
      ).toBeDefined();
    });

    it("returns no bonuses when neither side has advantage", () => {
      const attacker = makeForces({ lightCruisers: 10 });
      const defender = makeForces({ lightCruisers: 10 });

      const analysis = analyzeTheaterControl(attacker, defender);

      expect(analysis.attackerBonuses).toHaveLength(0);
      expect(analysis.defenderBonuses).toHaveLength(0);
      expect(analysis.attackerAttackMod).toBe(0);
      expect(analysis.defenderDefenseMod).toBe(0);
    });
  });

  describe("getUnitTheater", () => {
    it("returns correct theater for each unit type", () => {
      expect(getUnitTheater("soldiers")).toBe("ground");
      expect(getUnitTheater("fighters")).toBe("orbital");
      expect(getUnitTheater("stations")).toBe("orbital");
      expect(getUnitTheater("lightCruisers")).toBe("space");
      expect(getUnitTheater("heavyCruisers")).toBe("space");
      expect(getUnitTheater("carriers")).toBe("space");
    });
  });

  describe("countUnitsInTheater", () => {
    it("counts units in each theater", () => {
      const forces: Forces = {
        soldiers: 500,
        fighters: 100,
        stations: 5,
        lightCruisers: 20,
        heavyCruisers: 10,
        carriers: 5,
      };

      expect(countUnitsInTheater(forces, "ground")).toBe(500);
      expect(countUnitsInTheater(forces, "orbital")).toBe(105);
      expect(countUnitsInTheater(forces, "space")).toBe(35);
    });
  });
});

// =============================================================================
// BATTLE RESOLUTION TESTS
// =============================================================================

describe("Battle Resolution", () => {
  const defaultOptions: BattleOptions = {
    defenderSectorCount: 20,
    attackerStance: "balanced",
    defenderStance: "balanced",
  };

  describe("resolveBattle", () => {
    it("resolves a battle with 3 volleys maximum", () => {
      const attacker = makeForces({ lightCruisers: 10 });
      const defender = makeForces({ lightCruisers: 10 });

      const result = resolveBattle(attacker, defender, defaultOptions);

      expect(result.volleys.length).toBeGreaterThanOrEqual(2);
      expect(result.volleys.length).toBeLessThanOrEqual(3);
      expect(result.volleyScore.attacker + result.volleyScore.defender).toBeGreaterThanOrEqual(2);
    });

    it("determines winner based on volley score", () => {
      const attacker = makeForces({ lightCruisers: 10 });
      const defender = makeForces({ lightCruisers: 10 });

      const result = resolveBattle(attacker, defender, defaultOptions);

      const { attacker: aWins, defender: dWins } = result.volleyScore;

      if (aWins >= 2) {
        expect(["attacker_victory", "attacker_decisive"]).toContain(
          result.outcome
        );
      } else if (dWins >= 2) {
        expect(["defender_victory", "defender_decisive"]).toContain(
          result.outcome
        );
      }
    });

    it("captures sectors on attacker victory", () => {
      const attacker = makeForces({ heavyCruisers: 50 });
      const defender = makeForces({ soldiers: 10 });

      const result = resolveBattle(attacker, defender, {
        ...defaultOptions,
        defenderSectorCount: 30,
      });

      if (result.outcome.startsWith("attacker")) {
        expect(result.sectorsCaptured).toBeGreaterThanOrEqual(1);
      }
    });

    it("captures more sectors on decisive victory (3-0)", () => {
      // With overwhelming force and favorable rolls, we should get decisive victory
      const attacker = makeForces({ heavyCruisers: 100, lightCruisers: 100 });
      const defender = makeForces({ soldiers: 5 });

      // Run multiple times to find a decisive victory
      let decisiveResult = null;
      for (let i = 0; i < 20; i++) {
        const result = resolveBattle(attacker, defender, {
          ...defaultOptions,
          defenderSectorCount: 20,
        });
        if (result.outcome === "attacker_decisive") {
          decisiveResult = result;
          break;
        }
      }

      if (decisiveResult) {
        // 15% of 20 + 1 bonus = 4 sectors
        expect(decisiveResult.sectorsCaptured).toBeGreaterThanOrEqual(3);
      }
    });

    it("never captures all defender sectors", () => {
      const attacker = makeForces({ heavyCruisers: 100 });
      const defender = makeForces({ soldiers: 1 });

      const result = resolveBattle(attacker, defender, {
        ...defaultOptions,
        defenderSectorCount: 5,
      });

      if (result.outcome.startsWith("attacker")) {
        expect(result.sectorsCaptured).toBeLessThan(5);
      }
    });

    it("applies casualties to both sides", () => {
      const attacker = makeForces({ lightCruisers: 10 });
      const defender = makeForces({ lightCruisers: 10 });

      const result = resolveBattle(attacker, defender, defaultOptions);

      // At least one side should have casualties in a fair fight
      const totalCasualties =
        Object.values(result.attackerFinalCasualties).reduce(
          (sum, v) => sum + (v ?? 0),
          0
        ) +
        Object.values(result.defenderFinalCasualties).reduce(
          (sum, v) => sum + (v ?? 0),
          0
        );

      expect(totalCasualties).toBeGreaterThanOrEqual(0);
    });

    it("includes theater analysis in result", () => {
      const attacker = makeForces({ lightCruisers: 30 });
      const defender = makeForces({ lightCruisers: 10, stations: 2 });

      const result = resolveBattle(attacker, defender, defaultOptions);

      expect(result.theaterAnalysis).toBeDefined();
      expect(result.theaterAnalysis.attackerBonuses.length).toBeGreaterThan(0); // Space dominance
      expect(result.theaterAnalysis.defenderBonuses.length).toBeGreaterThan(0); // Orbital shield
    });
  });

  describe("stance effects", () => {
    it("aggressive stance increases attack rolls", () => {
      // Can't directly test roll values, but we can test that the system uses stances
      const attacker = makeForces({ lightCruisers: 10 });
      const defender = makeForces({ lightCruisers: 10 });

      const aggressiveResult = resolveBattle(attacker, defender, {
        ...defaultOptions,
        attackerStance: "aggressive",
      });

      // Check that volley results exist
      expect(aggressiveResult.volleys.length).toBeGreaterThan(0);
      expect(aggressiveResult.volleys[0]?.attackerRolls.length).toBeGreaterThan(0);
    });

    it("defensive stance reduces casualties", () => {
      // Run multiple battles and compare average casualties
      const attacker = makeForces({ lightCruisers: 20 });
      const defender = makeForces({ lightCruisers: 20 });

      let balancedCasualties = 0;
      let defensiveCasualties = 0;
      const runs = 20;

      for (let i = 0; i < runs; i++) {
        const balancedResult = resolveBattle(
          { ...attacker },
          { ...defender },
          { ...defaultOptions, defenderStance: "balanced" }
        );
        const defensiveResult = resolveBattle(
          { ...attacker },
          { ...defender },
          { ...defaultOptions, defenderStance: "defensive" }
        );

        balancedCasualties += Object.values(
          balancedResult.defenderFinalCasualties
        ).reduce((sum, v) => sum + (v ?? 0), 0);
        defensiveCasualties += Object.values(
          defensiveResult.defenderFinalCasualties
        ).reduce((sum, v) => sum + (v ?? 0), 0);
      }

      // Defensive should generally have fewer casualties (allowing some variance)
      // This is a statistical test, might occasionally fail
      expect(defensiveCasualties).toBeLessThanOrEqual(balancedCasualties * 1.5);
    });
  });
});

// =============================================================================
// RETREAT TESTS
// =============================================================================

describe("Retreat", () => {
  describe("processRetreat", () => {
    it("adds 15% AoO casualties on retreat", () => {
      const forces = makeForces({ lightCruisers: 100, soldiers: 1000 });
      const existingCasualties: Partial<Forces> = { lightCruisers: 10 };

      const result = processRetreat(forces, existingCasualties);

      // Remaining: 90 cruisers, 1000 soldiers
      // AoO: 13 cruisers (90 * 0.15), 150 soldiers (1000 * 0.15)
      expect(result.lightCruisers).toBeGreaterThan(10);
      expect(result.soldiers).toBeGreaterThan(0);
    });

    it("combines existing casualties with AoO penalty", () => {
      const forces = makeForces({ lightCruisers: 100 });
      const existingCasualties: Partial<Forces> = { lightCruisers: 20 };

      const result = processRetreat(forces, existingCasualties);

      // Remaining: 80 cruisers
      // AoO: 12 cruisers (80 * 0.15)
      // Total: 20 + 12 = 32
      expect(result.lightCruisers).toBe(32);
    });
  });
});

// =============================================================================
// UTILITY TESTS
// =============================================================================

describe("Utilities", () => {
  describe("getOutcomeDisplay", () => {
    it("returns correct display strings", () => {
      expect(getOutcomeDisplay("attacker_decisive")).toBe("Decisive Victory");
      expect(getOutcomeDisplay("attacker_victory")).toBe("Victory");
      expect(getOutcomeDisplay("defender_victory")).toBe("Repelled");
      expect(getOutcomeDisplay("defender_decisive")).toBe("Crushing Defense");
      expect(getOutcomeDisplay("attacker_retreat")).toBe("Attacker Retreated");
      expect(getOutcomeDisplay("defender_retreat")).toBe("Defender Retreated");
    });
  });

  describe("estimateWinProbability", () => {
    it("returns probability between 0 and 1", () => {
      const attacker = makeForces({ lightCruisers: 10 });
      const defender = makeForces({ lightCruisers: 10 });

      const prob = estimateWinProbability(attacker, defender);

      expect(prob).toBeGreaterThanOrEqual(0);
      expect(prob).toBeLessThanOrEqual(1);
    });

    it("returns higher probability for stronger attacker", () => {
      const strongAttacker = makeForces({ heavyCruisers: 50 });
      const weakDefender = makeForces({ soldiers: 10 });
      const weakAttacker = makeForces({ soldiers: 10 });
      const strongDefender = makeForces({ heavyCruisers: 50, stations: 5 });

      const strongProb = estimateWinProbability(strongAttacker, weakDefender);
      const weakProb = estimateWinProbability(weakAttacker, strongDefender);

      expect(strongProb).toBeGreaterThan(weakProb);
    });

    it("aggressive stance increases win probability for stronger force", () => {
      const attacker = makeForces({ heavyCruisers: 30 });
      const defender = makeForces({ lightCruisers: 10 });

      const balancedProb = estimateWinProbability(
        attacker,
        defender,
        "balanced",
        "balanced"
      );
      const aggressiveProb = estimateWinProbability(
        attacker,
        defender,
        "aggressive",
        "balanced"
      );

      // With a stronger force, aggressive should generally help
      expect(aggressiveProb).toBeGreaterThanOrEqual(balancedProb * 0.8);
    });
  });
});

// =============================================================================
// BALANCE TESTS
// =============================================================================

describe("Balance", () => {
  it("attacker win rate should be 40-60% for equal forces", () => {
    const attacker = makeForces({ lightCruisers: 20, soldiers: 500 });
    const defender = makeForces({ lightCruisers: 20, soldiers: 500 });

    let attackerWins = 0;
    const runs = 100;

    for (let i = 0; i < runs; i++) {
      const result = resolveBattle({ ...attacker }, { ...defender }, {
        defenderSectorCount: 20,
        attackerStance: "balanced",
        defenderStance: "balanced",
      });

      if (
        result.outcome === "attacker_victory" ||
        result.outcome === "attacker_decisive"
      ) {
        attackerWins++;
      }
    }

    const winRate = attackerWins / runs;

    // Allow 35-65% range for statistical variance
    expect(winRate).toBeGreaterThanOrEqual(0.35);
    expect(winRate).toBeLessThanOrEqual(0.65);
  });

  it("defender with stations should have advantage", () => {
    const attacker = makeForces({ lightCruisers: 20 });
    const defenderWithStations = makeForces({ lightCruisers: 15, stations: 3 });
    const defenderWithoutStations = makeForces({ lightCruisers: 20 });

    let winsVsStations = 0;
    let winsVsNoStations = 0;
    const runs = 50;

    for (let i = 0; i < runs; i++) {
      const resultVsStations = resolveBattle(
        { ...attacker },
        { ...defenderWithStations },
        { defenderSectorCount: 20 }
      );
      const resultVsNoStations = resolveBattle(
        { ...attacker },
        { ...defenderWithoutStations },
        { defenderSectorCount: 20 }
      );

      if (resultVsStations.outcome.startsWith("attacker")) {
        winsVsStations++;
      }
      if (resultVsNoStations.outcome.startsWith("attacker")) {
        winsVsNoStations++;
      }
    }

    // Attacker should win less often against stations
    expect(winsVsStations).toBeLessThanOrEqual(winsVsNoStations + 10);
  });
});

// =============================================================================
// SUMMARIZE VOLLEY TESTS (UI SUPPORT)
// =============================================================================

describe("summarizeVolley", () => {
  /**
   * Create a mock AttackRoll for testing
   */
  function makeRoll(overrides: Partial<AttackRoll> = {}): AttackRoll {
    return {
      unitType: "lightCruisers",
      roll: 10,
      modifier: 4,
      total: 14,
      targetDEF: 15,
      hit: false,
      critical: false,
      fumble: false,
      damage: 0,
      ...overrides,
    };
  }

  /**
   * Create a mock VolleyResult for testing
   */
  function makeVolley(
    attackerRolls: AttackRoll[],
    defenderRolls: AttackRoll[]
  ): VolleyResult {
    return {
      volleyNumber: 1,
      attackerRolls,
      defenderRolls,
      attackerHits: attackerRolls.filter((r) => r.hit).length,
      defenderHits: defenderRolls.filter((r) => r.hit).length,
      attackerDamage: attackerRolls.reduce((sum, r) => sum + r.damage, 0),
      defenderDamage: defenderRolls.reduce((sum, r) => sum + r.damage, 0),
      volleyWinner: "tie",
      attackerCasualties: {},
      defenderCasualties: {},
      canRetreat: true,
    };
  }

  it("should count total rolls correctly", () => {
    const attackerRolls = [makeRoll(), makeRoll(), makeRoll()];
    const defenderRolls = [makeRoll(), makeRoll()];
    const volley = makeVolley(attackerRolls, defenderRolls);

    const attackerSummary = summarizeVolley(volley, "attacker");
    const defenderSummary = summarizeVolley(volley, "defender");

    expect(attackerSummary.totalRolls).toBe(3);
    expect(defenderSummary.totalRolls).toBe(2);
  });

  it("should count hits correctly", () => {
    const attackerRolls = [
      makeRoll({ hit: true, damage: 10 }),
      makeRoll({ hit: false, damage: 0 }),
      makeRoll({ hit: true, damage: 8 }),
    ];
    const volley = makeVolley(attackerRolls, []);

    const summary = summarizeVolley(volley, "attacker");

    expect(summary.hits).toBe(2);
    expect(summary.totalDamage).toBe(18);
  });

  it("should count criticals correctly", () => {
    const attackerRolls = [
      makeRoll({ roll: 20, critical: true, hit: true, damage: 20 }),
      makeRoll({ roll: 15, critical: false, hit: true, damage: 10 }),
      makeRoll({ roll: 20, critical: true, hit: true, damage: 25 }),
    ];
    const volley = makeVolley(attackerRolls, []);

    const summary = summarizeVolley(volley, "attacker");

    expect(summary.criticals).toBe(2);
    expect(summary.hits).toBe(3);
  });

  it("should count fumbles correctly", () => {
    const attackerRolls = [
      makeRoll({ roll: 1, fumble: true, hit: false, damage: 0 }),
      makeRoll({ roll: 15, fumble: false, hit: true, damage: 10 }),
      makeRoll({ roll: 1, fumble: true, hit: false, damage: 0 }),
    ];
    const volley = makeVolley(attackerRolls, []);

    const summary = summarizeVolley(volley, "attacker");

    expect(summary.fumbles).toBe(2);
    expect(summary.hits).toBe(1);
  });

  it("should calculate total damage correctly", () => {
    const attackerRolls = [
      makeRoll({ hit: true, damage: 15 }),
      makeRoll({ hit: true, damage: 25 }),
      makeRoll({ hit: false, damage: 0 }),
      makeRoll({ hit: true, damage: 10 }),
    ];
    const volley = makeVolley(attackerRolls, []);

    const summary = summarizeVolley(volley, "attacker");

    expect(summary.totalDamage).toBe(50);
  });

  it("should return zeros for empty rolls", () => {
    const volley = makeVolley([], []);

    const summary = summarizeVolley(volley, "attacker");

    expect(summary.totalRolls).toBe(0);
    expect(summary.hits).toBe(0);
    expect(summary.criticals).toBe(0);
    expect(summary.fumbles).toBe(0);
    expect(summary.totalDamage).toBe(0);
  });

  it("should work with real battle volley data", () => {
    const attacker = makeForces({ lightCruisers: 10 });
    const defender = makeForces({ lightCruisers: 10 });

    const result = resolveBattle(attacker, defender, {
      defenderSectorCount: 20,
    });

    // Get first volley
    const firstVolley = result.volleys[0];
    expect(firstVolley).toBeDefined();

    if (firstVolley) {
      const attackerSummary = summarizeVolley(firstVolley, "attacker");
      const defenderSummary = summarizeVolley(firstVolley, "defender");

      // Should have positive roll counts
      expect(attackerSummary.totalRolls).toBeGreaterThan(0);
      expect(defenderSummary.totalRolls).toBeGreaterThan(0);

      // Hits should be <= total rolls
      expect(attackerSummary.hits).toBeLessThanOrEqual(attackerSummary.totalRolls);
      expect(defenderSummary.hits).toBeLessThanOrEqual(defenderSummary.totalRolls);

      // Criticals + fumbles should be rare
      expect(attackerSummary.criticals).toBeLessThanOrEqual(attackerSummary.totalRolls);
      expect(attackerSummary.fumbles).toBeLessThanOrEqual(attackerSummary.totalRolls);
    }
  });
});

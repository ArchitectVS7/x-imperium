/**
 * Nuclear Warfare Tests (M11)
 *
 * Tests for nuclear strike mechanics:
 * - Damage calculations
 * - Detection mechanics
 * - Casualty modifiers
 * - Consequence calculations
 */

import { describe, it, expect } from "vitest";
import {
  executeNuclearStrike,
  canLaunchNuclearStrike,
  getPostStrikeCivilStatus,
  generateNuclearNewsHeadline,
  NUCLEAR_CONSTANTS,
  areNuclearWeaponsUnlocked,
} from "../nuclear";
import {
  rollForDetection,
  determineDetectionOutcome,
  calculateNuclearCasualties,
  canLaunchNuclear,
  NUCLEAR_DETECTION_OUTCOMES,
  CASUALTY_MODIFIERS,
} from "@/lib/game/constants/nuclear";

describe("Nuclear Warfare System", () => {
  describe("NUCLEAR_CONSTANTS", () => {
    it("should have correct cost (50M credits - expensive but achievable)", () => {
      expect(NUCLEAR_CONSTANTS.COST).toBe(50_000_000);
    });

    it("should have 40% population damage", () => {
      expect(NUCLEAR_CONSTANTS.POPULATION_DAMAGE).toBe(0.40);
    });

    it("should have 30% detection chance", () => {
      expect(NUCLEAR_CONSTANTS.DETECTION_CHANCE).toBe(0.30);
    });

    it("should have 10 turn cooldown", () => {
      expect(NUCLEAR_CONSTANTS.COOLDOWN_TURNS).toBe(10);
    });

    it("should have -3 civil status penalty", () => {
      expect(NUCLEAR_CONSTANTS.CIVIL_STATUS_PENALTY).toBe(-3);
    });

    it("should have -200 reputation penalty", () => {
      expect(NUCLEAR_CONSTANTS.REPUTATION_PENALTY).toBe(-200);
    });

    it("should unlock at turn 100", () => {
      expect(NUCLEAR_CONSTANTS.UNLOCK_TURN).toBe(100);
    });

    it("should have minimum surviving population of 1000", () => {
      expect(NUCLEAR_CONSTANTS.MIN_SURVIVING_POPULATION).toBe(1000);
    });
  });

  describe("areNuclearWeaponsUnlocked", () => {
    it("should return false before turn 100", () => {
      expect(areNuclearWeaponsUnlocked(1)).toBe(false);
      expect(areNuclearWeaponsUnlocked(50)).toBe(false);
      expect(areNuclearWeaponsUnlocked(99)).toBe(false);
    });

    it("should return true at turn 100", () => {
      expect(areNuclearWeaponsUnlocked(100)).toBe(true);
    });

    it("should return true after turn 100", () => {
      expect(areNuclearWeaponsUnlocked(101)).toBe(true);
      expect(areNuclearWeaponsUnlocked(150)).toBe(true);
      expect(areNuclearWeaponsUnlocked(200)).toBe(true);
    });
  });

  describe("rollForDetection", () => {
    it("should detect when random is below detection chance", () => {
      // Detection chance is 0.30, so random < 0.30 = detected
      expect(rollForDetection(0.1)).toBe(true);
      expect(rollForDetection(0.2)).toBe(true);
      expect(rollForDetection(0.29)).toBe(true);
    });

    it("should not detect when random is at or above detection chance", () => {
      expect(rollForDetection(0.3)).toBe(false);
      expect(rollForDetection(0.5)).toBe(false);
      expect(rollForDetection(0.9)).toBe(false);
    });

    it("should handle edge case of exactly 0", () => {
      expect(rollForDetection(0)).toBe(true);
    });

    it("should handle edge case of exactly 1", () => {
      expect(rollForDetection(1)).toBe(false);
    });
  });

  describe("determineDetectionOutcome", () => {
    // Weights: proceed_with_warning: 0.50, intercepted: 0.20, evacuation: 0.30

    it("should return proceed_with_warning for low random values", () => {
      expect(determineDetectionOutcome(0.1)).toBe(NUCLEAR_DETECTION_OUTCOMES.PROCEED_WITH_WARNING);
      expect(determineDetectionOutcome(0.4)).toBe(NUCLEAR_DETECTION_OUTCOMES.PROCEED_WITH_WARNING);
      expect(determineDetectionOutcome(0.49)).toBe(NUCLEAR_DETECTION_OUTCOMES.PROCEED_WITH_WARNING);
    });

    it("should return intercepted for medium random values", () => {
      expect(determineDetectionOutcome(0.5)).toBe(NUCLEAR_DETECTION_OUTCOMES.INTERCEPTED);
      expect(determineDetectionOutcome(0.6)).toBe(NUCLEAR_DETECTION_OUTCOMES.INTERCEPTED);
      expect(determineDetectionOutcome(0.69)).toBe(NUCLEAR_DETECTION_OUTCOMES.INTERCEPTED);
    });

    it("should return evacuation for high random values", () => {
      expect(determineDetectionOutcome(0.7)).toBe(NUCLEAR_DETECTION_OUTCOMES.EVACUATION);
      expect(determineDetectionOutcome(0.85)).toBe(NUCLEAR_DETECTION_OUTCOMES.EVACUATION);
      expect(determineDetectionOutcome(0.99)).toBe(NUCLEAR_DETECTION_OUTCOMES.EVACUATION);
    });
  });

  describe("calculateNuclearCasualties", () => {
    it("should calculate 40% casualties when undetected", () => {
      const population = 100000;
      const casualties = calculateNuclearCasualties(population, null);

      // 40% of 100000 = 40000
      // Max casualties = 100000 - 1000 (min surviving) = 99000
      // Since 40000 < 99000, casualties = 40000
      expect(casualties).toBe(40000);
    });

    it("should apply full damage modifier when undetected", () => {
      const population = 50000;
      const casualties = calculateNuclearCasualties(population, null);

      // 40% of 50000 = 20000
      expect(casualties).toBe(20000);
    });

    it("should reduce casualties when evacuation occurs", () => {
      const population = 100000;
      const casualties = calculateNuclearCasualties(
        population,
        NUCLEAR_DETECTION_OUTCOMES.EVACUATION
      );

      // 40% * 50% = 20% of 100000 = 20000
      expect(casualties).toBe(20000);
    });

    it("should have zero casualties when intercepted", () => {
      const population = 100000;
      const casualties = calculateNuclearCasualties(
        population,
        NUCLEAR_DETECTION_OUTCOMES.INTERCEPTED
      );

      expect(casualties).toBe(0);
    });

    it("should reduce casualties slightly when detected but proceeds", () => {
      const population = 100000;
      const casualties = calculateNuclearCasualties(
        population,
        NUCLEAR_DETECTION_OUTCOMES.PROCEED_WITH_WARNING
      );

      // 40% * 85% = 34% of 100000 = 34000
      expect(casualties).toBe(34000);
    });

    it("should ensure minimum population survives", () => {
      const population = 10000; // Very low population
      const casualties = calculateNuclearCasualties(population, null);

      // 40% of 10000 = 4000, but max casualties = 10000 - 1000 = 9000
      // 4000 < 9000, so 4000 casualties
      expect(casualties).toBe(4000);
    });

    it("should cap casualties to preserve minimum population", () => {
      const population = 2000; // Very low population
      const casualties = calculateNuclearCasualties(population, null);

      // 40% of 2000 = 800, max casualties = 2000 - 1000 = 1000
      // 800 < 1000, so 800 casualties
      expect(casualties).toBe(800);
    });
  });

  describe("canLaunchNuclear", () => {
    it("should allow launch when no previous launch", () => {
      const result = canLaunchNuclear(100, null);
      expect(result.allowed).toBe(true);
      expect(result.turnsRemaining).toBeUndefined();
    });

    it("should allow launch after cooldown expires", () => {
      const currentTurn = 120;
      const lastLaunchTurn = 100; // 20 turns ago, cooldown is 10

      const result = canLaunchNuclear(currentTurn, lastLaunchTurn);
      expect(result.allowed).toBe(true);
    });

    it("should deny launch during cooldown", () => {
      const currentTurn = 105;
      const lastLaunchTurn = 100; // 5 turns ago, cooldown is 10

      const result = canLaunchNuclear(currentTurn, lastLaunchTurn);
      expect(result.allowed).toBe(false);
      expect(result.turnsRemaining).toBe(5);
    });

    it("should allow launch exactly when cooldown ends", () => {
      const currentTurn = 110;
      const lastLaunchTurn = 100; // 10 turns ago = cooldown

      const result = canLaunchNuclear(currentTurn, lastLaunchTurn);
      expect(result.allowed).toBe(true);
    });
  });

  describe("canLaunchNuclearStrike", () => {
    const baseContext = {
      attacker: { id: "attacker-1", credits: 1000000000, civilStatus: "content" as const },
      target: { id: "target-1", population: 100000 },
      currentTurn: 100,
      lastNukeLaunchTurn: null,
      hasNuclearWeapon: true,
    };

    it("should deny launch before turn 100", () => {
      const context = { ...baseContext, currentTurn: 99 };
      const result = canLaunchNuclearStrike(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("unlock at turn 100");
    });

    it("should deny launch without nuclear weapon", () => {
      const context = { ...baseContext, hasNuclearWeapon: false };
      const result = canLaunchNuclearStrike(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("No nuclear weapon");
    });

    it("should deny launch during cooldown", () => {
      const context = { ...baseContext, lastNukeLaunchTurn: 95 }; // 5 turns ago
      const result = canLaunchNuclearStrike(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("cooldown");
    });

    it("should deny self-targeting", () => {
      const context = {
        ...baseContext,
        target: { id: "attacker-1", population: 100000 },
      };
      const result = canLaunchNuclearStrike(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Cannot target your own");
    });

    it("should deny targeting low population empires", () => {
      const context = {
        ...baseContext,
        target: { id: "target-1", population: 500 }, // Below MIN_SURVIVING_POPULATION
      };
      const result = canLaunchNuclearStrike(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("population too low");
    });

    it("should allow valid launch", () => {
      const result = canLaunchNuclearStrike(baseContext);
      expect(result.allowed).toBe(true);
    });
  });

  describe("executeNuclearStrike", () => {
    const attacker = { id: "attacker-1" };
    const target = { id: "target-1", population: 100000 };

    it("should execute undetected strike with full damage", () => {
      // Force undetected by passing random > 0.30
      const result = executeNuclearStrike(attacker, target, 0.5);

      expect(result.success).toBe(true);
      expect(result.detected).toBe(false);
      expect(result.detectionOutcome).toBeNull();
      expect(result.populationKilled).toBeGreaterThan(0);
      expect(result.civilStatusDrop).toBe(-3);
      expect(result.reputationLoss).toBe(-200);
      expect(result.globalOutrage).toBe(true);
    });

    it("should handle detected and intercepted strike", () => {
      // Force detected (random < 0.30) and intercepted (outcome random 0.5-0.7)
      const result = executeNuclearStrike(attacker, target, 0.1, 0.55);

      expect(result.success).toBe(true);
      expect(result.detected).toBe(true);
      expect(result.detectionOutcome).toBe(NUCLEAR_DETECTION_OUTCOMES.INTERCEPTED);
      expect(result.populationKilled).toBe(0);
      expect(result.globalOutrage).toBe(false);
      expect(result.description).toContain("intercepted");
    });

    it("should handle detected with evacuation", () => {
      // Force detected and evacuation (outcome random > 0.7)
      const result = executeNuclearStrike(attacker, target, 0.1, 0.75);

      expect(result.success).toBe(true);
      expect(result.detected).toBe(true);
      expect(result.detectionOutcome).toBe(NUCLEAR_DETECTION_OUTCOMES.EVACUATION);
      expect(result.populationKilled).toBeGreaterThan(0);
      expect(result.populationKilled).toBeLessThan(40000); // Less than full damage
      expect(result.description).toContain("evacuation");
    });

    it("should handle detected but proceeds", () => {
      // Force detected and proceed_with_warning (outcome random < 0.5)
      const result = executeNuclearStrike(attacker, target, 0.1, 0.3);

      expect(result.success).toBe(true);
      expect(result.detected).toBe(true);
      expect(result.detectionOutcome).toBe(NUCLEAR_DETECTION_OUTCOMES.PROCEED_WITH_WARNING);
      expect(result.populationKilled).toBeGreaterThan(0);
      expect(result.description).toContain("could not be stopped");
    });

    it("should always apply civil status and reputation penalties", () => {
      const result = executeNuclearStrike(attacker, target, 0.5);

      expect(result.civilStatusDrop).toBe(NUCLEAR_CONSTANTS.CIVIL_STATUS_PENALTY);
      expect(result.reputationLoss).toBe(NUCLEAR_CONSTANTS.REPUTATION_PENALTY);
    });
  });

  describe("getPostStrikeCivilStatus", () => {
    it("should drop 3 levels from content to angry", () => {
      // Status order: ecstatic, happy, content, neutral, unhappy, angry, rioting, revolting
      // content is at index 2, penalty is -3, so new index = 2 - (-3) = 5 (angry)
      const result = getPostStrikeCivilStatus("content");
      expect(result).toBe("angry");
    });

    it("should drop 3 levels from ecstatic to neutral", () => {
      const result = getPostStrikeCivilStatus("ecstatic");
      expect(result).toBe("neutral");
    });

    it("should cap at revolting", () => {
      const result = getPostStrikeCivilStatus("rioting");
      expect(result).toBe("revolting");
    });

    it("should stay at revolting if already there", () => {
      const result = getPostStrikeCivilStatus("revolting");
      expect(result).toBe("revolting");
    });
  });

  describe("generateNuclearNewsHeadline", () => {
    it("should generate interception headline", () => {
      const headline = generateNuclearNewsHeadline(
        "Attacker Empire",
        "Target Empire",
        0,
        true,
        true
      );

      expect(headline).toContain("intercepts");
      expect(headline).toContain("Attacker Empire");
      expect(headline).toContain("Target Empire");
    });

    it("should generate detected strike headline", () => {
      const headline = generateNuclearNewsHeadline(
        "Attacker Empire",
        "Target Empire",
        50000,
        true,
        false
      );

      expect(headline).toContain("ALERT");
      expect(headline).toContain("50,000");
    });

    it("should generate catastrophe headline for massive casualties", () => {
      const headline = generateNuclearNewsHeadline(
        "Attacker Empire",
        "Target Empire",
        5000000, // 5 million
        false,
        false
      );

      expect(headline).toContain("CATASTROPHE");
      expect(headline).toContain("5,000,000");
    });

    it("should generate standard strike headline for moderate casualties", () => {
      const headline = generateNuclearNewsHeadline(
        "Attacker Empire",
        "Target Empire",
        50000,
        false,
        false
      );

      expect(headline).toContain("NUCLEAR STRIKE");
      expect(headline).toContain("50,000");
    });
  });

  describe("Casualty Modifiers", () => {
    it("should have correct modifier values", () => {
      expect(CASUALTY_MODIFIERS.undetected).toBe(1.0);
      expect(CASUALTY_MODIFIERS[NUCLEAR_DETECTION_OUTCOMES.PROCEED_WITH_WARNING]).toBe(0.85);
      expect(CASUALTY_MODIFIERS[NUCLEAR_DETECTION_OUTCOMES.INTERCEPTED]).toBe(0.0);
      expect(CASUALTY_MODIFIERS[NUCLEAR_DETECTION_OUTCOMES.EVACUATION]).toBe(0.50);
    });

    it("should correctly apply modifiers to damage", () => {
      const baseDamage = 100;

      expect(baseDamage * CASUALTY_MODIFIERS.undetected).toBe(100);
      expect(baseDamage * CASUALTY_MODIFIERS[NUCLEAR_DETECTION_OUTCOMES.PROCEED_WITH_WARNING]).toBe(85);
      expect(baseDamage * CASUALTY_MODIFIERS[NUCLEAR_DETECTION_OUTCOMES.INTERCEPTED]).toBe(0);
      expect(baseDamage * CASUALTY_MODIFIERS[NUCLEAR_DETECTION_OUTCOMES.EVACUATION]).toBe(50);
    });
  });
});

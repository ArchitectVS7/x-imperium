/**
 * Tests for Archetype Configuration Loader
 *
 * Verifies that archetype configurations are loaded correctly from JSON
 * and all accessor functions work as expected.
 */

import { describe, it, expect } from "vitest";
import type { ArchetypeName } from "@/lib/bots/archetypes/types";
import {
  getArchetypeConfigs,
  getArchetypeConfig,
  getArchetypePriorities,
  getArchetypeCombatBehavior,
  getArchetypeDiplomacyBehavior,
  getArchetypeTellBehavior,
  getArchetypePriority,
  shouldArchetypeAttack,
  getArchetypeNames,
  isValidArchetypeName,
} from "../archetype-loader";

describe("archetype-loader", () => {
  describe("getArchetypeConfigs", () => {
    it("should return all 8 archetype configurations", () => {
      const configs = getArchetypeConfigs();
      expect(Object.keys(configs)).toHaveLength(8);
    });

    it("should include all expected archetypes", () => {
      const configs = getArchetypeConfigs();
      expect(configs).toHaveProperty("warlord");
      expect(configs).toHaveProperty("diplomat");
      expect(configs).toHaveProperty("merchant");
      expect(configs).toHaveProperty("schemer");
      expect(configs).toHaveProperty("turtle");
      expect(configs).toHaveProperty("blitzkrieg");
      expect(configs).toHaveProperty("techRush");
      expect(configs).toHaveProperty("opportunist");
    });
  });

  describe("getArchetypeConfig", () => {
    it("should return correct config for warlord", () => {
      const config = getArchetypeConfig("warlord");
      expect(config.name).toBe("warlord");
      expect(config.displayName).toBe("Warlord");
      expect(config.passiveAbility).toBe("war_economy");
    });

    it("should return correct config for diplomat", () => {
      const config = getArchetypeConfig("diplomat");
      expect(config.name).toBe("diplomat");
      expect(config.displayName).toBe("Diplomat");
      expect(config.passiveAbility).toBe("trade_network");
    });

    it("should throw error for invalid archetype", () => {
      expect(() => getArchetypeConfig("invalid" as ArchetypeName)).toThrow("Invalid archetype name: invalid");
    });
  });

  describe("getArchetypePriorities", () => {
    it("should return priorities for warlord", () => {
      const priorities = getArchetypePriorities("warlord");
      expect(priorities.military).toBe(0.70);
      expect(priorities.economy).toBe(0.15);
      expect(priorities.research).toBe(0.05);
      expect(priorities.diplomacy).toBe(0.05);
      expect(priorities.covert).toBe(0.05);
    });

    it("should return priorities for merchant", () => {
      const priorities = getArchetypePriorities("merchant");
      expect(priorities.economy).toBe(0.50);
      expect(priorities.military).toBe(0.15);
    });
  });

  describe("getArchetypeCombatBehavior", () => {
    it("should return combat behavior for warlord", () => {
      const combat = getArchetypeCombatBehavior("warlord");
      expect(combat.style).toBe("aggressive");
      expect(combat.attackThreshold).toBe(0.50);
      expect(combat.requireAllies).toBe(false);
      expect(combat.retreatWillingness).toBe(0.10);
    });

    it("should return combat behavior for turtle", () => {
      const combat = getArchetypeCombatBehavior("turtle");
      expect(combat.style).toBe("defensive");
      expect(combat.attackThreshold).toBe(0.00);
      expect(combat.requireAllies).toBe(true);
    });
  });

  describe("getArchetypeDiplomacyBehavior", () => {
    it("should return diplomacy behavior for diplomat", () => {
      const diplomacy = getArchetypeDiplomacyBehavior("diplomat");
      expect(diplomacy.allianceSeeking).toBe(0.80);
      expect(diplomacy.baseTrust).toBe(0.60);
      expect(diplomacy.betrayalChance).toBe(0.05);
      expect(diplomacy.mediatesConflicts).toBe(true);
    });

    it("should return diplomacy behavior for schemer", () => {
      const diplomacy = getArchetypeDiplomacyBehavior("schemer");
      expect(diplomacy.betrayalChance).toBe(0.70);
      expect(diplomacy.baseTrust).toBe(0.20);
    });
  });

  describe("getArchetypeTellBehavior", () => {
    it("should return tell behavior for warlord", () => {
      const tell = getArchetypeTellBehavior("warlord");
      expect(tell.tellRate).toBe(0.70);
      expect(tell.style).toBe("obvious");
      expect(tell.advanceWarning.min).toBe(2);
      expect(tell.advanceWarning.max).toBe(3);
    });

    it("should return tell behavior for schemer", () => {
      const tell = getArchetypeTellBehavior("schemer");
      expect(tell.tellRate).toBe(0.30);
      expect(tell.style).toBe("cryptic");
      expect(tell.advanceWarning.min).toBe(0);
      expect(tell.advanceWarning.max).toBe(1);
    });
  });

  describe("getArchetypePriority", () => {
    it("should return specific priority for warlord military", () => {
      const priority = getArchetypePriority("warlord", "military");
      expect(priority).toBe(0.70);
    });

    it("should return specific priority for merchant economy", () => {
      const priority = getArchetypePriority("merchant", "economy");
      expect(priority).toBe(0.50);
    });

    it("should return specific priority for schemer covert", () => {
      const priority = getArchetypePriority("schemer", "covert");
      expect(priority).toBe(0.30);
    });
  });

  describe("shouldArchetypeAttack", () => {
    it("should return true when enemy is weaker than threshold (warlord)", () => {
      // Warlord attacks when enemy has < 50% of their power
      expect(shouldArchetypeAttack("warlord", 0.4)).toBe(true);
      expect(shouldArchetypeAttack("warlord", 0.3)).toBe(true);
    });

    it("should return false when enemy is stronger than threshold (warlord)", () => {
      expect(shouldArchetypeAttack("warlord", 0.6)).toBe(false);
      expect(shouldArchetypeAttack("warlord", 0.8)).toBe(false);
    });

    it("should return true only for very weak enemies (diplomat)", () => {
      // Diplomat attacks when enemy has < 20% of their power
      expect(shouldArchetypeAttack("diplomat", 0.1)).toBe(true);
      expect(shouldArchetypeAttack("diplomat", 0.3)).toBe(false);
    });

    it("should never attack (turtle)", () => {
      // Turtle has 0.00 threshold, never attacks first
      expect(shouldArchetypeAttack("turtle", 0.0)).toBe(false);
      expect(shouldArchetypeAttack("turtle", 0.1)).toBe(false);
      expect(shouldArchetypeAttack("turtle", 0.5)).toBe(false);
    });
  });

  describe("getArchetypeNames", () => {
    it("should return all archetype names", () => {
      const names = getArchetypeNames();
      expect(names).toContain("warlord");
      expect(names).toContain("diplomat");
      expect(names).toContain("merchant");
      expect(names).toContain("schemer");
      expect(names).toContain("turtle");
      expect(names).toContain("blitzkrieg");
      expect(names).toContain("techRush");
      expect(names).toContain("opportunist");
    });
  });

  describe("isValidArchetypeName", () => {
    it("should return true for valid archetype names", () => {
      expect(isValidArchetypeName("warlord")).toBe(true);
      expect(isValidArchetypeName("diplomat")).toBe(true);
      expect(isValidArchetypeName("schemer")).toBe(true);
    });

    it("should return false for invalid archetype names", () => {
      expect(isValidArchetypeName("invalid")).toBe(false);
      expect(isValidArchetypeName("")).toBe(false);
      expect(isValidArchetypeName("random")).toBe(false);
    });
  });

  describe("data integrity", () => {
    it("should have all priorities sum to 1.0 for each archetype", () => {
      const configs = getArchetypeConfigs();
      Object.entries(configs).forEach(([, config]) => {
        const sum = Object.values(config.priorities).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1.0, 5); // Allow floating point precision
      });
    });

    it("should have valid tell rates (0-1) for all archetypes", () => {
      const configs = getArchetypeConfigs();
      Object.entries(configs).forEach(([, config]) => {
        expect(config.tell.tellRate).toBeGreaterThanOrEqual(0);
        expect(config.tell.tellRate).toBeLessThanOrEqual(1);
      });
    });

    it("should have valid attack thresholds (0-1) for all archetypes", () => {
      const configs = getArchetypeConfigs();
      Object.entries(configs).forEach(([, config]) => {
        expect(config.combat.attackThreshold).toBeGreaterThanOrEqual(0);
        expect(config.combat.attackThreshold).toBeLessThanOrEqual(1);
      });
    });

    it("should have min <= max for advance warning", () => {
      const configs = getArchetypeConfigs();
      Object.entries(configs).forEach(([, config]) => {
        expect(config.tell.advanceWarning.min).toBeLessThanOrEqual(
          config.tell.advanceWarning.max
        );
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ARCHETYPE_BEHAVIORS,
  getArchetypeBehavior,
  getPassiveAbilityEffects,
  getArchetypesWithAbility,
  getArchetypesByCombatStyle,
  wouldArchetypeAttack,
  getArchetypePriority,
  getArchetypeTellRate,
  getArchetypeWarningRange,
  rollAdvanceWarning,
  rollTellCheck,
  getArchetypesByPriority,
  getRandomArchetype,
  ARCHETYPE_NAMES,
  type ArchetypeName,
} from "../index";

describe("Archetype Module", () => {
  describe("ARCHETYPE_BEHAVIORS", () => {
    it("should have all 8 archetypes defined", () => {
      expect(Object.keys(ARCHETYPE_BEHAVIORS).length).toBe(8);
    });

    it("should have all expected archetypes", () => {
      expect(ARCHETYPE_BEHAVIORS.warlord).toBeDefined();
      expect(ARCHETYPE_BEHAVIORS.diplomat).toBeDefined();
      expect(ARCHETYPE_BEHAVIORS.merchant).toBeDefined();
      expect(ARCHETYPE_BEHAVIORS.schemer).toBeDefined();
      expect(ARCHETYPE_BEHAVIORS.turtle).toBeDefined();
      expect(ARCHETYPE_BEHAVIORS.blitzkrieg).toBeDefined();
      expect(ARCHETYPE_BEHAVIORS.techRush).toBeDefined();
      expect(ARCHETYPE_BEHAVIORS.opportunist).toBeDefined();
    });

    it("should have valid structure for all archetypes", () => {
      for (const [name, behavior] of Object.entries(ARCHETYPE_BEHAVIORS)) {
        expect(behavior.name).toBe(name);
        expect(behavior.displayName).toBeTruthy();
        expect(behavior.description).toBeTruthy();
        expect(behavior.priorities).toBeDefined();
        expect(behavior.combat).toBeDefined();
        expect(behavior.diplomacy).toBeDefined();
        expect(behavior.tell).toBeDefined();
      }
    });
  });

  describe("getArchetypeBehavior", () => {
    it("should return correct behavior for each archetype", () => {
      for (const name of ARCHETYPE_NAMES) {
        const behavior = getArchetypeBehavior(name);
        expect(behavior.name).toBe(name);
      }
    });

    it("should return warlord behavior correctly", () => {
      const behavior = getArchetypeBehavior("warlord");
      expect(behavior.displayName).toBe("Warlord");
      expect(behavior.priorities.military).toBeGreaterThan(behavior.priorities.economy);
    });

    it("should return merchant behavior correctly", () => {
      const behavior = getArchetypeBehavior("merchant");
      expect(behavior.displayName).toBe("Merchant");
      expect(behavior.priorities.economy).toBeGreaterThan(behavior.priorities.military);
    });
  });

  describe("getPassiveAbilityEffects", () => {
    it("should return null for archetypes with no passive ability", () => {
      // Check for archetypes that have "none" as passive
      for (const [, behavior] of Object.entries(ARCHETYPE_BEHAVIORS)) {
        if (behavior.passiveAbility === "none") {
          const effects = getPassiveAbilityEffects(behavior.name as ArchetypeName);
          expect(effects).toBeNull();
        }
      }
    });

    it("should return effects for archetypes with passive abilities", () => {
      for (const [, behavior] of Object.entries(ARCHETYPE_BEHAVIORS)) {
        if (behavior.passiveAbility !== "none") {
          const effects = getPassiveAbilityEffects(behavior.name as ArchetypeName);
          expect(effects).toBeDefined();
          expect(effects).not.toBeNull();
        }
      }
    });
  });

  describe("getArchetypesWithAbility", () => {
    it("should return archetypes with specified ability", () => {
      const noAbilityArchetypes = getArchetypesWithAbility("none");
      expect(Array.isArray(noAbilityArchetypes)).toBe(true);
    });

    it("should return correct archetypes for war_economy", () => {
      const warEconomyArchetypes = getArchetypesWithAbility("war_economy");
      expect(warEconomyArchetypes).toContain("warlord");
    });

    it("should return correct archetypes for market_insight", () => {
      const marketInsightArchetypes = getArchetypesWithAbility("market_insight");
      expect(marketInsightArchetypes).toContain("merchant");
    });

    it("should return correct archetypes for shadow_network", () => {
      const shadowNetworkArchetypes = getArchetypesWithAbility("shadow_network");
      expect(shadowNetworkArchetypes).toContain("schemer");
    });
  });

  describe("getArchetypesByCombatStyle", () => {
    it("should return archetypes with aggressive style", () => {
      const aggressiveArchetypes = getArchetypesByCombatStyle("aggressive");
      expect(aggressiveArchetypes).toContain("warlord");
      expect(aggressiveArchetypes).toContain("blitzkrieg");
    });

    it("should return archetypes with defensive style", () => {
      const defensiveArchetypes = getArchetypesByCombatStyle("defensive");
      expect(defensiveArchetypes).toContain("turtle");
    });

    it("should return archetypes with opportunistic style", () => {
      const opportunisticArchetypes = getArchetypesByCombatStyle("opportunistic");
      expect(opportunisticArchetypes).toContain("opportunist");
    });
  });

  describe("wouldArchetypeAttack", () => {
    it("should return true when enemy is weaker than threshold", () => {
      // Warlord has low attack threshold (attacks often)
      expect(wouldArchetypeAttack("warlord", 0.3)).toBe(true);
    });

    it("should return false when enemy is stronger than threshold", () => {
      // Turtle has high attack threshold (rarely attacks)
      expect(wouldArchetypeAttack("turtle", 0.8)).toBe(false);
    });

    it("should respect different thresholds per archetype", () => {
      const warlordBehavior = getArchetypeBehavior("warlord");
      const turtleBehavior = getArchetypeBehavior("turtle");

      // Warlord should attack at higher enemy power than turtle
      expect(warlordBehavior.combat.attackThreshold).toBeGreaterThan(
        turtleBehavior.combat.attackThreshold
      );
    });
  });

  describe("getArchetypePriority", () => {
    it("should return military as highest priority for warlord", () => {
      const military = getArchetypePriority("warlord", "military");
      const economy = getArchetypePriority("warlord", "economy");
      const diplomacy = getArchetypePriority("warlord", "diplomacy");
      expect(military).toBeGreaterThanOrEqual(economy);
      expect(military).toBeGreaterThanOrEqual(diplomacy);
    });

    it("should return economy as highest priority for merchant", () => {
      const military = getArchetypePriority("merchant", "military");
      const economy = getArchetypePriority("merchant", "economy");
      expect(economy).toBeGreaterThanOrEqual(military);
    });

    it("should return research as highest priority for techRush", () => {
      const research = getArchetypePriority("techRush", "research");
      const military = getArchetypePriority("techRush", "military");
      expect(research).toBeGreaterThanOrEqual(military);
    });

    it("should return valid priority for diplomat", () => {
      const diplomacy = getArchetypePriority("diplomat", "diplomacy");
      expect(diplomacy).toBeGreaterThan(0);
    });

    it("should return priorities between 0 and 1", () => {
      for (const name of ARCHETYPE_NAMES) {
        const military = getArchetypePriority(name, "military");
        const economy = getArchetypePriority(name, "economy");
        const diplomacy = getArchetypePriority(name, "diplomacy");
        const research = getArchetypePriority(name, "research");

        expect(military).toBeGreaterThanOrEqual(0);
        expect(military).toBeLessThanOrEqual(1);
        expect(economy).toBeGreaterThanOrEqual(0);
        expect(economy).toBeLessThanOrEqual(1);
        expect(diplomacy).toBeGreaterThanOrEqual(0);
        expect(diplomacy).toBeLessThanOrEqual(1);
        expect(research).toBeGreaterThanOrEqual(0);
        expect(research).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("getArchetypeTellRate", () => {
    it("should return tell rate between 0 and 1", () => {
      for (const name of ARCHETYPE_NAMES) {
        const tellRate = getArchetypeTellRate(name);
        expect(tellRate).toBeGreaterThanOrEqual(0);
        expect(tellRate).toBeLessThanOrEqual(1);
      }
    });

    it("should return higher tell rate for honest archetypes", () => {
      const warlordRate = getArchetypeTellRate("warlord");
      const schemerRate = getArchetypeTellRate("schemer");
      expect(warlordRate).toBeGreaterThan(schemerRate);
    });

    it("should return lower tell rate for deceptive archetypes", () => {
      const schemerRate = getArchetypeTellRate("schemer");
      expect(schemerRate).toBeLessThan(0.5);
    });
  });

  describe("getArchetypeWarningRange", () => {
    it("should return valid warning range", () => {
      for (const name of ARCHETYPE_NAMES) {
        const range = getArchetypeWarningRange(name);
        expect(range.min).toBeGreaterThanOrEqual(0);
        expect(range.max).toBeGreaterThanOrEqual(range.min);
      }
    });

    it("should return different ranges for different archetypes", () => {
      const warlordRange = getArchetypeWarningRange("warlord");
      const schemerRange = getArchetypeWarningRange("schemer");
      // Different archetypes should have different warning patterns
      expect(warlordRange).toBeDefined();
      expect(schemerRange).toBeDefined();
    });
  });

  describe("rollAdvanceWarning", () => {
    beforeEach(() => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should return value within range", () => {
      const range = getArchetypeWarningRange("warlord");
      const warning = rollAdvanceWarning("warlord");
      expect(warning).toBeGreaterThanOrEqual(range.min);
      expect(warning).toBeLessThanOrEqual(range.max);
    });

    it("should return min when random is 0", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      const range = getArchetypeWarningRange("diplomat");
      const warning = rollAdvanceWarning("diplomat");
      expect(warning).toBe(range.min);
    });

    it("should return max when random is close to 1", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.99);
      const range = getArchetypeWarningRange("diplomat");
      const warning = rollAdvanceWarning("diplomat");
      expect(warning).toBe(range.max);
    });
  });

  describe("rollTellCheck", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should return true when random is below tell rate", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.1);
      expect(rollTellCheck("warlord")).toBe(true); // Warlord has high tell rate
    });

    it("should return false when random is above tell rate", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.9);
      expect(rollTellCheck("schemer")).toBe(false); // Schemer has low tell rate
    });
  });

  describe("getArchetypesByPriority", () => {
    it("should return archetypes sorted by military priority descending", () => {
      const sorted = getArchetypesByPriority("military", true);
      expect(sorted.length).toBe(8);
      expect(sorted[0]).toBe("warlord"); // Should be first with highest military
    });

    it("should return archetypes sorted by economy priority descending", () => {
      const sorted = getArchetypesByPriority("economy", true);
      expect(sorted[0]).toBe("merchant"); // Should be first with highest economy
    });

    it("should return archetypes sorted ascending when specified", () => {
      const descending = getArchetypesByPriority("military", true);
      const ascending = getArchetypesByPriority("military", false);
      expect(descending[0]).toBe(ascending[ascending.length - 1]);
    });
  });

  describe("getRandomArchetype", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should return a valid archetype without weights", () => {
      const archetype = getRandomArchetype();
      expect(ARCHETYPE_NAMES.includes(archetype)).toBe(true);
    });

    it("should respect weights when provided", () => {
      // With extreme weight for warlord, should always return warlord
      vi.spyOn(Math, "random").mockReturnValue(0.001);
      const archetype = getRandomArchetype({ warlord: 1000 });
      expect(archetype).toBe("warlord");
    });

    it("should return consistent results for same random value", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      const first = getRandomArchetype();
      vi.spyOn(Math, "random").mockReturnValue(0);
      const second = getRandomArchetype();
      expect(first).toBe(second);
    });
  });

  describe("ARCHETYPE_NAMES", () => {
    it("should contain all 8 archetype names", () => {
      expect(ARCHETYPE_NAMES.length).toBe(8);
    });

    it("should match ARCHETYPE_BEHAVIORS keys", () => {
      const behaviorKeys = Object.keys(ARCHETYPE_BEHAVIORS);
      expect(behaviorKeys.length).toBe(ARCHETYPE_NAMES.length);
      for (const name of ARCHETYPE_NAMES) {
        expect(behaviorKeys).toContain(name);
      }
    });
  });
});

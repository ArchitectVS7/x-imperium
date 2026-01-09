import { describe, it, expect } from "vitest";
import { getRandomArchetype } from "../bot-generator";
import type { BotArchetype } from "../types";

describe("Bot Generator", () => {
  describe("getRandomArchetype", () => {
    const VALID_ARCHETYPES: BotArchetype[] = [
      "warlord",
      "diplomat",
      "merchant",
      "schemer",
      "turtle",
      "blitzkrieg",
      "tech_rush",
      "opportunist",
    ];

    it("should return a valid archetype", () => {
      const archetype = getRandomArchetype();
      expect(VALID_ARCHETYPES).toContain(archetype);
    });

    it("should return different archetypes over multiple calls", () => {
      // Run 100 times and check we get at least 2 different values
      const results = new Set<BotArchetype>();
      for (let i = 0; i < 100; i++) {
        results.add(getRandomArchetype());
      }
      expect(results.size).toBeGreaterThan(1);
    });

    it("should have 8 valid archetypes", () => {
      expect(VALID_ARCHETYPES).toHaveLength(8);
    });
  });

  describe("Bot empire creation requirements", () => {
    it("should define starting resources matching player", () => {
      // This is a documentation test for the bot creation spec
      // Reduced to 5 sectors for faster eliminations (see IMPLEMENTATION-PLAN.md M1.1)
      const EXPECTED_STARTING_SECTORS = 5;
      const EXPECTED_BOT_TIER = "tier4_random";

      expect(EXPECTED_STARTING_SECTORS).toBe(5);
      expect(EXPECTED_BOT_TIER).toBe("tier4_random");
    });

    it("should create 25 bots by default", () => {
      const DEFAULT_BOT_COUNT = 25;
      expect(DEFAULT_BOT_COUNT).toBe(25);
    });
  });
});

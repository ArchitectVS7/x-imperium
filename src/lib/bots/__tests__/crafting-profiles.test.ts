/**
 * Crafting Profiles Tests
 *
 * Tests for bot archetype crafting and Syndicate behavior profiles.
 */

import { describe, it, expect } from "vitest";
import {
  ARCHETYPE_CRAFTING_PROFILES,
  getCraftingProfile,
  getNextCraftingPriority,
  shouldEngageSyndicate,
  getPreferredContract,
  getExtendedWeights,
} from "../archetypes/crafting-profiles";
import type { BotArchetype } from "../types";
import type { CraftedResource } from "@/lib/game/constants/crafting";
import type { ContractType } from "@/lib/game/constants/syndicate";

// Use BotArchetype values (matches the main type definition)
const BOT_ARCHETYPES: BotArchetype[] = [
  "warlord",
  "diplomat",
  "merchant",
  "schemer",
  "turtle",
  "blitzkrieg",
  "tech_rush",
  "opportunist",
];

// =============================================================================
// PROFILE STRUCTURE TESTS
// =============================================================================

describe("Crafting Profile Structure", () => {
  it("should have profiles for all archetypes", () => {
    for (const archetype of BOT_ARCHETYPES) {
      expect(ARCHETYPE_CRAFTING_PROFILES[archetype]).toBeDefined();
    }
  });

  it("should have valid crafting priorities", () => {
    for (const archetype of BOT_ARCHETYPES) {
      const profile = ARCHETYPE_CRAFTING_PROFILES[archetype];
      expect(profile.craftingPriority.length).toBeGreaterThan(0);
    }
  });

  it("should have research focus weights that sum to 100", () => {
    for (const archetype of BOT_ARCHETYPES) {
      const profile = ARCHETYPE_CRAFTING_PROFILES[archetype];
      const sum =
        profile.researchFocus.military +
        profile.researchFocus.defense +
        profile.researchFocus.propulsion +
        profile.researchFocus.stealth +
        profile.researchFocus.economy +
        profile.researchFocus.biotech;
      expect(sum).toBe(100);
    }
  });

  it("should have syndicate willingness between 0 and 1", () => {
    for (const archetype of BOT_ARCHETYPES) {
      const profile = ARCHETYPE_CRAFTING_PROFILES[archetype];
      expect(profile.syndicateWillingness).toBeGreaterThanOrEqual(0);
      expect(profile.syndicateWillingness).toBeLessThanOrEqual(1);
    }
  });

  it("should have valid crafting weights", () => {
    for (const archetype of BOT_ARCHETYPES) {
      const profile = ARCHETYPE_CRAFTING_PROFILES[archetype];
      expect(profile.craftingWeight).toBeGreaterThan(0);
      expect(profile.craftingWeight).toBeLessThanOrEqual(0.5);
      expect(profile.blackMarketWeight).toBeGreaterThanOrEqual(0);
      expect(profile.blackMarketWeight).toBeLessThanOrEqual(0.5);
    }
  });
});

// =============================================================================
// ARCHETYPE CHARACTERISTIC TESTS
// =============================================================================

describe("Archetype Characteristics", () => {
  it("warlord should prioritize military components", () => {
    const profile = ARCHETYPE_CRAFTING_PROFILES.warlord;
    expect(profile.craftingPriority[0]).toBe("weapons_grade_alloy");
    expect(profile.researchFocus.military).toBeGreaterThan(profile.researchFocus.economy);
  });

  it("diplomat should have low syndicate willingness", () => {
    const profile = ARCHETYPE_CRAFTING_PROFILES.diplomat;
    expect(profile.syndicateWillingness).toBeLessThanOrEqual(0.2);
    expect(profile.contractPreference).toHaveLength(0);
  });

  it("merchant should focus on economy research", () => {
    const profile = ARCHETYPE_CRAFTING_PROFILES.merchant;
    expect(profile.researchFocus.economy).toBeGreaterThanOrEqual(40);
  });

  it("schemer should have high syndicate willingness", () => {
    const profile = ARCHETYPE_CRAFTING_PROFILES.schemer;
    expect(profile.syndicateWillingness).toBeGreaterThanOrEqual(0.8);
    expect(profile.craftingPriority).toContain("stealth_composites");
  });

  it("turtle should focus on defense", () => {
    const profile = ARCHETYPE_CRAFTING_PROFILES.turtle;
    expect(profile.researchFocus.defense).toBeGreaterThanOrEqual(45);
    expect(profile.craftingPriority[0]).toBe("armor_plating");
  });

  it("blitzkrieg should prioritize propulsion", () => {
    const profile = ARCHETYPE_CRAFTING_PROFILES.blitzkrieg;
    expect(profile.craftingPriority[0]).toBe("propulsion_units");
    expect(profile.researchFocus.propulsion).toBeGreaterThanOrEqual(35);
  });

  it("tech_rush should prioritize advanced tech", () => {
    const profile = ARCHETYPE_CRAFTING_PROFILES.tech_rush;
    expect(profile.craftingPriority).toContain("quantum_processors");
    expect(profile.craftingPriority).toContain("neural_interfaces");
  });

  it("opportunist should have balanced profile", () => {
    const profile = ARCHETYPE_CRAFTING_PROFILES.opportunist;
    expect(profile.syndicateWillingness).toBe(0.5);
    // Research should be relatively balanced
    const maxResearch = Math.max(
      profile.researchFocus.military,
      profile.researchFocus.defense,
      profile.researchFocus.economy
    );
    expect(maxResearch).toBeLessThanOrEqual(30);
  });
});

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe("getCraftingProfile", () => {
  it("should return correct profile for each archetype", () => {
    for (const archetype of BOT_ARCHETYPES) {
      const profile = getCraftingProfile(archetype);
      expect(profile.archetype).toBe(archetype);
    }
  });
});

describe("getNextCraftingPriority", () => {
  it("should return highest priority available resource", () => {
    const next = getNextCraftingPriority("warlord", []);
    expect(next).toBe("weapons_grade_alloy");
  });

  it("should skip already queued resources", () => {
    const queued: CraftedResource[] = ["weapons_grade_alloy", "armor_plating"];
    const next = getNextCraftingPriority("warlord", queued);
    expect(next).toBe("reactor_cores");
  });

  it("should return null if all priorities are queued", () => {
    const profile = getCraftingProfile("warlord");
    const next = getNextCraftingPriority("warlord", profile.craftingPriority);
    expect(next).toBeNull();
  });
});

describe("shouldEngageSyndicate", () => {
  it("should return true for high willingness with low random", () => {
    // Schemer has 0.9 willingness
    expect(shouldEngageSyndicate("schemer", 0.5)).toBe(true);
  });

  it("should return false for low willingness with high random", () => {
    // Diplomat has 0.1 willingness
    expect(shouldEngageSyndicate("diplomat", 0.5)).toBe(false);
  });

  it("should return true when random is below threshold", () => {
    // Any archetype with willingness > 0.3
    expect(shouldEngageSyndicate("opportunist", 0.3)).toBe(true);
  });

  it("should return false when random is above threshold", () => {
    expect(shouldEngageSyndicate("opportunist", 0.6)).toBe(false);
  });
});

describe("getPreferredContract", () => {
  it("should return first preferred contract if available", () => {
    const available: ContractType[] = ["supply_run", "military_probe", "hostile_takeover"];
    const preferred = getPreferredContract("warlord", available);
    expect(preferred).toBe("military_probe"); // First in warlord's preferences
  });

  it("should return null if no preferred contracts available", () => {
    const available: ContractType[] = ["supply_run"];
    const preferred = getPreferredContract("diplomat", available);
    expect(preferred).toBeNull();
  });

  it("should return any available contract for opportunist", () => {
    const available: ContractType[] = ["intimidation"];
    const preferred = getPreferredContract("opportunist", available);
    expect(preferred).toBe("intimidation");
  });

  it("should handle empty available list", () => {
    const preferred = getPreferredContract("warlord", []);
    expect(preferred).toBeNull();
  });
});

describe("getExtendedWeights", () => {
  it("should return crafting and black market weights", () => {
    const weights = getExtendedWeights("warlord");
    expect(weights.craftingWeight).toBeDefined();
    expect(weights.blackMarketWeight).toBeDefined();
    expect(weights.craftingWeight).toBe(0.10);
    expect(weights.blackMarketWeight).toBe(0.05);
  });

  it("should reflect archetype differences", () => {
    const merchantWeights = getExtendedWeights("merchant");
    const turtleWeights = getExtendedWeights("turtle");

    // Merchant should have higher crafting weight
    expect(merchantWeights.craftingWeight).toBeGreaterThan(turtleWeights.blackMarketWeight);
  });
});

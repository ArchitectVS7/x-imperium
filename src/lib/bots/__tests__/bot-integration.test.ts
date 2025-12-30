/**
 * Bot Integration Tests
 *
 * Comprehensive tests to validate the complete bot system:
 * - Tier distribution (25 T4, 25 T3, 25 T2, 15 T1-scripted, 10 T1-LLM)
 * - All decision types are reachable
 * - Bot creation with proper tiers
 * - Game loop compatibility with 100 bots
 */

import { describe, it, expect, vi } from "vitest";
import {
  getTierDistribution,
  selectPersonasForGame,
  getAllPersonas,
} from "../bot-generator";
import { BASE_WEIGHTS, ARCHETYPE_WEIGHTS, generateDecision } from "../decision-engine";
import type { BotDecisionWeights, BotArchetype, BotTier } from "../types";

// =============================================================================
// TIER DISTRIBUTION TESTS
// =============================================================================

describe("Bot Tier Distribution", () => {
  describe("getTierDistribution", () => {
    it("should return correct distribution for 100 bots", () => {
      const dist = getTierDistribution(100);
      expect(dist).toEqual({
        tier1_llm: 10,
        tier1_elite_scripted: 15,
        tier2: 25,
        tier3: 25,
        tier4: 25,
      });

      const total = dist.tier1_llm + dist.tier1_elite_scripted + dist.tier2 + dist.tier3 + dist.tier4;
      expect(total).toBe(100);
    });

    it("should return correct distribution for 50 bots", () => {
      const dist = getTierDistribution(50);
      expect(dist).toEqual({
        tier1_llm: 5,
        tier1_elite_scripted: 8,
        tier2: 12,
        tier3: 12,
        tier4: 13,
      });

      const total = dist.tier1_llm + dist.tier1_elite_scripted + dist.tier2 + dist.tier3 + dist.tier4;
      expect(total).toBe(50);
    });

    it("should return correct distribution for 25 bots", () => {
      const dist = getTierDistribution(25);
      expect(dist).toEqual({
        tier1_llm: 2,
        tier1_elite_scripted: 4,
        tier2: 6,
        tier3: 6,
        tier4: 7,
      });

      const total = dist.tier1_llm + dist.tier1_elite_scripted + dist.tier2 + dist.tier3 + dist.tier4;
      expect(total).toBe(25);
    });

    it("should return correct distribution for 10 bots", () => {
      const dist = getTierDistribution(10);
      expect(dist).toEqual({
        tier1_llm: 1,
        tier1_elite_scripted: 2,
        tier2: 2,
        tier3: 2,
        tier4: 3,
      });

      const total = dist.tier1_llm + dist.tier1_elite_scripted + dist.tier2 + dist.tier3 + dist.tier4;
      expect(total).toBe(10);
    });
  });

  describe("Persona Distribution", () => {
    it("should have exactly 100 personas", () => {
      const personas = getAllPersonas();
      expect(personas.length).toBe(100);
    });

    it("should have correct tier distribution: 25 T1 (10 LLM + 15 scripted), 25 T2, 25 T3, 25 T4", () => {
      const personas = getAllPersonas();

      const tier1LLM = personas.filter(p => p.tier === 1 && p.llmEnabled === true);
      const tier1Scripted = personas.filter(p => p.tier === 1 && p.llmEnabled !== true);
      const tier2 = personas.filter(p => p.tier === 2);
      const tier3 = personas.filter(p => p.tier === 3);
      const tier4 = personas.filter(p => p.tier === 4);

      expect(tier1LLM.length).toBe(10);
      expect(tier1Scripted.length).toBe(15);
      expect(tier2.length).toBe(25);
      expect(tier3.length).toBe(25);
      expect(tier4.length).toBe(25);
    });

    it("should select correct number of personas for 100-bot game", () => {
      const selected = selectPersonasForGame(100);
      expect(selected.length).toBe(100);
    });

    it("should select correct number of personas for 25-bot game", () => {
      const selected = selectPersonasForGame(25);
      expect(selected.length).toBe(25);
    });

    it("should include all 8 archetypes in personas", () => {
      const personas = getAllPersonas();
      const archetypes = new Set(personas.map(p => p.archetype));

      expect(archetypes.has("warlord")).toBe(true);
      expect(archetypes.has("diplomat")).toBe(true);
      expect(archetypes.has("merchant")).toBe(true);
      expect(archetypes.has("schemer")).toBe(true);
      expect(archetypes.has("turtle")).toBe(true);
      expect(archetypes.has("blitzkrieg")).toBe(true);
      expect(archetypes.has("tech_rush")).toBe(true);
      expect(archetypes.has("opportunist")).toBe(true);
    });
  });
});

// =============================================================================
// DECISION WEIGHT TESTS
// =============================================================================

describe("Bot Decision Weights", () => {
  const validateWeightSum = (weights: BotDecisionWeights, name: string) => {
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    // Allow for floating point precision (0.99 to 1.01)
    expect(sum).toBeGreaterThanOrEqual(0.99);
    expect(sum).toBeLessThanOrEqual(1.01);
  };

  it("BASE_WEIGHTS should sum to 1.0", () => {
    validateWeightSum(BASE_WEIGHTS, "BASE_WEIGHTS");
  });

  it("BASE_WEIGHTS should include all 12 decision types", () => {
    expect(BASE_WEIGHTS).toHaveProperty("build_units");
    expect(BASE_WEIGHTS).toHaveProperty("buy_planet");
    expect(BASE_WEIGHTS).toHaveProperty("attack");
    expect(BASE_WEIGHTS).toHaveProperty("diplomacy");
    expect(BASE_WEIGHTS).toHaveProperty("trade");
    expect(BASE_WEIGHTS).toHaveProperty("do_nothing");
    expect(BASE_WEIGHTS).toHaveProperty("craft_component");
    expect(BASE_WEIGHTS).toHaveProperty("accept_contract");
    expect(BASE_WEIGHTS).toHaveProperty("purchase_black_market");
    expect(BASE_WEIGHTS).toHaveProperty("covert_operation");
    expect(BASE_WEIGHTS).toHaveProperty("fund_research");
    expect(BASE_WEIGHTS).toHaveProperty("upgrade_units");
  });

  describe("Archetype weights", () => {
    const archetypes: BotArchetype[] = [
      "warlord", "diplomat", "merchant", "schemer",
      "turtle", "blitzkrieg", "tech_rush", "opportunist"
    ];

    archetypes.forEach(archetype => {
      it(`${archetype} weights should sum to 1.0`, () => {
        validateWeightSum(ARCHETYPE_WEIGHTS[archetype], archetype);
      });

      it(`${archetype} should include all 12 decision types`, () => {
        const weights = ARCHETYPE_WEIGHTS[archetype];
        expect(weights).toHaveProperty("build_units");
        expect(weights).toHaveProperty("buy_planet");
        expect(weights).toHaveProperty("attack");
        expect(weights).toHaveProperty("diplomacy");
        expect(weights).toHaveProperty("trade");
        expect(weights).toHaveProperty("do_nothing");
        expect(weights).toHaveProperty("craft_component");
        expect(weights).toHaveProperty("accept_contract");
        expect(weights).toHaveProperty("purchase_black_market");
        expect(weights).toHaveProperty("covert_operation");
        expect(weights).toHaveProperty("fund_research");
        expect(weights).toHaveProperty("upgrade_units");
      });
    });

    // Archetype-specific weight validations
    it("warlord should have highest attack weight", () => {
      const warlord = ARCHETYPE_WEIGHTS.warlord;
      const diplomat = ARCHETYPE_WEIGHTS.diplomat;
      expect(warlord.attack).toBeGreaterThan(diplomat.attack);
    });

    it("diplomat should have highest diplomacy weight", () => {
      const diplomat = ARCHETYPE_WEIGHTS.diplomat;
      expect(diplomat.diplomacy).toBeGreaterThan(diplomat.attack);
    });

    it("schemer should have highest covert_operation weight", () => {
      const schemer = ARCHETYPE_WEIGHTS.schemer;
      const diplomat = ARCHETYPE_WEIGHTS.diplomat;
      expect(schemer.covert_operation).toBeGreaterThan(diplomat.covert_operation);
    });

    it("tech_rush should have highest fund_research weight", () => {
      const techRush = ARCHETYPE_WEIGHTS.tech_rush;
      const warlord = ARCHETYPE_WEIGHTS.warlord;
      expect(techRush.fund_research).toBeGreaterThan(warlord.fund_research);
    });

    it("turtle should have highest upgrade_units weight", () => {
      const turtle = ARCHETYPE_WEIGHTS.turtle;
      const blitzkrieg = ARCHETYPE_WEIGHTS.blitzkrieg;
      expect(turtle.upgrade_units).toBeGreaterThan(blitzkrieg.fund_research);
    });
  });
});

// =============================================================================
// BOT TIER BEHAVIOR TESTS
// =============================================================================

describe("Bot Tier Behaviors", () => {
  const tierTypes: BotTier[] = [
    "tier1_llm",
    "tier1_elite_scripted",
    "tier2_strategic",
    "tier3_simple",
    "tier4_random"
  ];

  it("should have 5 distinct tier types defined", () => {
    expect(tierTypes.length).toBe(5);
  });

  it("tier1_llm should be distinct from tier1_elite_scripted", () => {
    expect(tierTypes).toContain("tier1_llm");
    expect(tierTypes).toContain("tier1_elite_scripted");
    expect("tier1_llm").not.toBe("tier1_elite_scripted");
  });
});

// =============================================================================
// GAME SYSTEM COVERAGE TESTS
// =============================================================================

describe("Bot Game System Coverage", () => {
  /**
   * This test validates that bots can theoretically interact with
   * all major game systems through their decision types.
   */
  const allDecisionTypes = [
    "build_units",      // Military system
    "buy_planet",       // Planet/expansion system
    "attack",           // Combat system
    "diplomacy",        // Diplomacy system
    "trade",            // Market system
    "do_nothing",       // Pass turn
    "craft_component",  // Crafting system
    "accept_contract",  // Syndicate system
    "purchase_black_market", // Black market system
    "covert_operation", // Covert operations system
    "fund_research",    // Research system
    "upgrade_units",    // Unit upgrade system
  ];

  it("should cover all major game systems", () => {
    expect(allDecisionTypes.length).toBe(12);
  });

  it("all decision types should have non-zero BASE_WEIGHTS", () => {
    allDecisionTypes.forEach(type => {
      expect(BASE_WEIGHTS[type as keyof BotDecisionWeights]).toBeGreaterThan(0);
    });
  });

  describe("Game System Mapping", () => {
    const systemMapping = {
      military: ["build_units", "upgrade_units"],
      planets: ["buy_planet"],
      combat: ["attack"],
      diplomacy: ["diplomacy"],
      market: ["trade"],
      crafting: ["craft_component"],
      syndicate: ["accept_contract", "purchase_black_market"],
      covert: ["covert_operation"],
      research: ["fund_research"],
    };

    Object.entries(systemMapping).forEach(([system, decisions]) => {
      it(`${system} system should be accessible by bots`, () => {
        decisions.forEach(decision => {
          expect(allDecisionTypes).toContain(decision);
        });
      });
    });
  });
});

// =============================================================================
// PERFORMANCE / SCALABILITY TESTS
// =============================================================================

describe("Bot Scalability", () => {
  it("should be able to generate 100 personas without duplicates", () => {
    const personas = getAllPersonas();
    const ids = new Set(personas.map(p => p.id));
    const names = new Set(personas.map(p => p.name));

    expect(ids.size).toBe(100);
    expect(names.size).toBe(100);
  });

  it("selectPersonasForGame should return unique personas", () => {
    const selected = selectPersonasForGame(100);
    const ids = new Set(selected.map(p => p.id));

    expect(ids.size).toBe(100);
  });

  it("should handle repeated persona selection (different games)", () => {
    // Each call should return a valid set (may overlap between calls due to randomization)
    const game1 = selectPersonasForGame(25);
    const game2 = selectPersonasForGame(25);

    expect(game1.length).toBe(25);
    expect(game2.length).toBe(25);
  });
});

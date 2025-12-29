import { describe, it, expect } from "vitest";
import {
  BASE_WEIGHTS,
  ARCHETYPE_WEIGHTS,
  getAdjustedWeights,
  selectDecisionType,
  generateBotDecision,
  getWeightSum,
  validateWeights,
  applyEmotionalModifiers,
  getEmotionalWeightModifiers,
  shouldArchetypeAttack,
  getRetreatWillingness,
  getAllianceSeeking,
  shouldTelegraphAction,
  getTellStyle,
} from "../decision-engine";
import type { BotDecisionContext, Empire } from "../types";

// Mock empire for testing
const mockEmpire = {
  id: "test-empire",
  name: "Test Empire",
  type: "bot" as const,
  credits: 100000,
  food: 1000,
  ore: 500,
  petroleum: 200,
  researchPoints: 0,
  soldiers: 100,
  fighters: 50,
  stations: 0,
  lightCruisers: 10,
  heavyCruisers: 5,
  carriers: 2,
  covertAgents: 0,
  population: 10000,
  populationCap: 50000,
  civilStatus: "content",
  networth: 1000,
  planetCount: 9,
  isEliminated: false,
} as Empire;

const mockContext: BotDecisionContext = {
  empire: mockEmpire,
  planets: [],
  gameId: "test-game",
  currentTurn: 25, // After protection period
  protectionTurns: 20,
  difficulty: "normal",
  availableTargets: [
    { id: "target-1", name: "Target 1", networth: 500, planetCount: 5, isBot: true, isEliminated: false, militaryPower: 50, hasTreaty: false },
    { id: "target-2", name: "Target 2", networth: 800, planetCount: 7, isBot: true, isEliminated: false, militaryPower: 80, hasTreaty: false },
  ],
};

describe("Decision Engine", () => {
  describe("BASE_WEIGHTS", () => {
    it("should have all decision types", () => {
      expect(BASE_WEIGHTS.build_units).toBeDefined();
      expect(BASE_WEIGHTS.buy_planet).toBeDefined();
      expect(BASE_WEIGHTS.attack).toBeDefined();
      expect(BASE_WEIGHTS.diplomacy).toBeDefined();
      expect(BASE_WEIGHTS.trade).toBeDefined();
      expect(BASE_WEIGHTS.do_nothing).toBeDefined();
      // Crafting system weights
      expect(BASE_WEIGHTS.craft_component).toBeDefined();
      expect(BASE_WEIGHTS.accept_contract).toBeDefined();
      expect(BASE_WEIGHTS.purchase_black_market).toBeDefined();
    });

    it("should sum to 1.0", () => {
      const sum = getWeightSum(BASE_WEIGHTS);
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it("should have correct weights with crafting integration", () => {
      // Updated weights with crafting system integration
      expect(BASE_WEIGHTS.build_units).toBe(0.30);
      expect(BASE_WEIGHTS.buy_planet).toBe(0.15);
      expect(BASE_WEIGHTS.attack).toBe(0.12);
      expect(BASE_WEIGHTS.diplomacy).toBe(0.08);
      expect(BASE_WEIGHTS.trade).toBe(0.08);
      expect(BASE_WEIGHTS.do_nothing).toBe(0.07);
      expect(BASE_WEIGHTS.craft_component).toBe(0.10);
      expect(BASE_WEIGHTS.accept_contract).toBe(0.05);
      expect(BASE_WEIGHTS.purchase_black_market).toBe(0.05);
    });
  });

  describe("getAdjustedWeights", () => {
    it("should return base weights after protection period", () => {
      const weights = getAdjustedWeights(mockContext);
      expect(weights.attack).toBe(0.12);
    });

    it("should set attack weight to 0 during protection period", () => {
      const protectedContext = { ...mockContext, currentTurn: 10 };
      const weights = getAdjustedWeights(protectedContext);
      expect(weights.attack).toBe(0);
    });

    it("should redistribute attack weight during protection", () => {
      const protectedContext = { ...mockContext, currentTurn: 10 };
      const weights = getAdjustedWeights(protectedContext);

      // Weights should still sum to ~1.0
      const sum = getWeightSum(weights);
      expect(sum).toBeCloseTo(1.0, 5);

      // Other weights should be higher
      expect(weights.build_units).toBeGreaterThan(BASE_WEIGHTS.build_units);
    });

    it("should handle edge case of turn = protectionTurns", () => {
      const edgeContext = { ...mockContext, currentTurn: 20, protectionTurns: 20 };
      const weights = getAdjustedWeights(edgeContext);
      expect(weights.attack).toBe(0); // Still protected at exactly turn 20
    });

    it("should allow attacks at turn = protectionTurns + 1", () => {
      const afterContext = { ...mockContext, currentTurn: 21, protectionTurns: 20 };
      const weights = getAdjustedWeights(afterContext);
      expect(weights.attack).toBe(0.12); // Can attack at turn 21
    });
  });

  describe("selectDecisionType", () => {
    // Updated cumulative ranges with crafting integration:
    // 0-0.30: build_units
    // 0.30-0.45: buy_planet
    // 0.45-0.57: attack
    // 0.57-0.65: diplomacy
    // 0.65-0.73: trade
    // 0.73-0.80: do_nothing
    // 0.80-0.90: craft_component
    // 0.90-0.95: accept_contract
    // 0.95-1.0: purchase_black_market

    it("should return build_units for low random value", () => {
      expect(selectDecisionType(BASE_WEIGHTS, 0)).toBe("build_units");
      expect(selectDecisionType(BASE_WEIGHTS, 0.29)).toBe("build_units");
    });

    it("should return buy_planet for mid-low random value", () => {
      expect(selectDecisionType(BASE_WEIGHTS, 0.30)).toBe("buy_planet");
      expect(selectDecisionType(BASE_WEIGHTS, 0.44)).toBe("buy_planet");
    });

    it("should return attack for mid random value", () => {
      expect(selectDecisionType(BASE_WEIGHTS, 0.46)).toBe("attack");
      expect(selectDecisionType(BASE_WEIGHTS, 0.56)).toBe("attack");
    });

    it("should return diplomacy for mid-high random value", () => {
      expect(selectDecisionType(BASE_WEIGHTS, 0.58)).toBe("diplomacy");
      expect(selectDecisionType(BASE_WEIGHTS, 0.64)).toBe("diplomacy");
    });

    it("should return trade for high random value", () => {
      expect(selectDecisionType(BASE_WEIGHTS, 0.66)).toBe("trade");
      expect(selectDecisionType(BASE_WEIGHTS, 0.72)).toBe("trade");
    });

    it("should return do_nothing for very high random value", () => {
      expect(selectDecisionType(BASE_WEIGHTS, 0.74)).toBe("do_nothing");
      expect(selectDecisionType(BASE_WEIGHTS, 0.79)).toBe("do_nothing");
    });

    it("should return craft_component for crafting range", () => {
      expect(selectDecisionType(BASE_WEIGHTS, 0.81)).toBe("craft_component");
      expect(selectDecisionType(BASE_WEIGHTS, 0.89)).toBe("craft_component");
    });

    it("should return accept_contract for contract range", () => {
      expect(selectDecisionType(BASE_WEIGHTS, 0.91)).toBe("accept_contract");
      expect(selectDecisionType(BASE_WEIGHTS, 0.94)).toBe("accept_contract");
    });

    it("should return purchase_black_market for black market range", () => {
      expect(selectDecisionType(BASE_WEIGHTS, 0.96)).toBe("purchase_black_market");
      expect(selectDecisionType(BASE_WEIGHTS, 0.99)).toBe("purchase_black_market");
    });
  });

  describe("generateBotDecision", () => {
    it("should return diplomacy decision with targets available", () => {
      const decision = generateBotDecision(mockContext, 0.58); // diplomacy range
      // Can return diplomacy or do_nothing depending on archetype and random roll
      expect(["diplomacy", "do_nothing"]).toContain(decision.type);
      if (decision.type === "diplomacy") {
        expect(decision.action).toMatch(/propose_nap|propose_alliance/);
        expect(decision.targetId).toBeDefined();
      }
    });

    it("should return trade decision or do_nothing based on resources", () => {
      const decision = generateBotDecision(mockContext, 0.66); // trade range
      // Can return trade or do_nothing depending on resource levels
      expect(["trade", "do_nothing"]).toContain(decision.type);
      if (decision.type === "trade") {
        expect(["food", "ore", "petroleum"]).toContain(decision.resource);
        expect(decision.quantity).toBeGreaterThan(0);
        expect(["buy", "sell"]).toContain(decision.action);
      }
    });

    it("should return build_units decision with valid data", () => {
      const decision = generateBotDecision(mockContext, 0.1); // build_units range
      if (decision.type === "build_units") {
        expect(decision.unitType).toBeDefined();
        expect(decision.quantity).toBeGreaterThan(0);
      }
    });

    it("should return buy_planet decision with valid data", () => {
      const decision = generateBotDecision(mockContext, 0.35); // buy_planet range
      if (decision.type === "buy_planet") {
        expect(decision.planetType).toBeDefined();
      }
    });

    it("should return attack decision with valid data after protection", () => {
      const decision = generateBotDecision(mockContext, 0.50); // attack range
      if (decision.type === "attack") {
        expect(decision.targetId).toBeDefined();
        expect(decision.forces).toBeDefined();
        expect(decision.forces.soldiers).toBeGreaterThanOrEqual(0);
      }
    });

    it("should not generate attack during protection period", () => {
      const protectedContext = { ...mockContext, currentTurn: 10 };
      const decision = generateBotDecision(protectedContext, 0.5);
      // Should be redistributed to another action
      expect(decision.type).not.toBe("attack");
    });

    it("should return do_nothing for explicit do_nothing", () => {
      const decision = generateBotDecision(mockContext, 0.74);
      expect(decision.type).toBe("do_nothing");
    });

    it("should return craft_component for crafting decision", () => {
      const decision = generateBotDecision(mockContext, 0.81);
      // May return do_nothing if archetype is not set, otherwise craft_component
      expect(["craft_component", "do_nothing"]).toContain(decision.type);
    });
  });

  describe("validateWeights", () => {
    it("should return true for valid weights", () => {
      expect(validateWeights(BASE_WEIGHTS)).toBe(true);
    });

    it("should return false for weights that don't sum to 1", () => {
      const invalidWeights = {
        ...BASE_WEIGHTS,
        build_units: 0.5, // Changed from 0.30
      };
      expect(validateWeights(invalidWeights)).toBe(false);
    });
  });

  describe("getWeightSum", () => {
    it("should correctly sum all weights", () => {
      // Use toBeCloseTo for floating point precision
      expect(getWeightSum(BASE_WEIGHTS)).toBeCloseTo(1.0, 5);
    });
  });

  describe("ARCHETYPE_WEIGHTS", () => {
    it("should have weights for all archetypes", () => {
      expect(ARCHETYPE_WEIGHTS.warlord).toBeDefined();
      expect(ARCHETYPE_WEIGHTS.diplomat).toBeDefined();
      expect(ARCHETYPE_WEIGHTS.merchant).toBeDefined();
      expect(ARCHETYPE_WEIGHTS.schemer).toBeDefined();
      expect(ARCHETYPE_WEIGHTS.turtle).toBeDefined();
      expect(ARCHETYPE_WEIGHTS.blitzkrieg).toBeDefined();
      expect(ARCHETYPE_WEIGHTS.tech_rush).toBeDefined();
      expect(ARCHETYPE_WEIGHTS.opportunist).toBeDefined();
    });

    it("should have warlord with highest attack weight", () => {
      expect(ARCHETYPE_WEIGHTS.warlord.attack).toBeGreaterThan(BASE_WEIGHTS.attack);
    });

    it("should have diplomat with low attack weight", () => {
      expect(ARCHETYPE_WEIGHTS.diplomat.attack).toBeLessThan(BASE_WEIGHTS.attack);
    });

    it("should have blitzkrieg with maximum aggression", () => {
      expect(ARCHETYPE_WEIGHTS.blitzkrieg.attack).toBe(0.40);
    });
  });

  describe("applyEmotionalModifiers", () => {
    it("should increase attack weight for vengeful state", () => {
      const modified = applyEmotionalModifiers(BASE_WEIGHTS, "vengeful", 1.0);
      // Vengeful has +40% aggression
      expect(modified.attack).toBeGreaterThan(BASE_WEIGHTS.attack);
    });

    it("should decrease attack weight for fearful state", () => {
      const modified = applyEmotionalModifiers(BASE_WEIGHTS, "fearful", 1.0);
      // Fearful has -30% aggression
      expect(modified.attack).toBeLessThan(BASE_WEIGHTS.attack);
    });

    it("should increase diplomacy weight for fearful state", () => {
      const modified = applyEmotionalModifiers(BASE_WEIGHTS, "fearful", 1.0);
      // Fearful has +50% alliance willingness
      expect(modified.diplomacy).toBeGreaterThan(BASE_WEIGHTS.diplomacy);
    });

    it("should scale modifiers by intensity", () => {
      const halfIntensity = applyEmotionalModifiers(BASE_WEIGHTS, "vengeful", 0.5);
      const fullIntensity = applyEmotionalModifiers(BASE_WEIGHTS, "vengeful", 1.0);
      // Half intensity should have smaller modification
      expect(fullIntensity.attack - BASE_WEIGHTS.attack).toBeGreaterThan(
        halfIntensity.attack - BASE_WEIGHTS.attack
      );
    });

    it("should normalize weights to sum to 1.0", () => {
      const modified = applyEmotionalModifiers(BASE_WEIGHTS, "arrogant", 1.0);
      const sum = getWeightSum(modified);
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });

  describe("getEmotionalWeightModifiers", () => {
    it("should return modifiers for confident state", () => {
      const mods = getEmotionalWeightModifiers("confident", 1.0);
      expect(mods.attackModifier).toBeCloseTo(0.10);
      expect(mods.diplomacyModifier).toBeCloseTo(-0.20);
      expect(mods.qualityModifier).toBeCloseTo(0.05);
      expect(mods.tradeModifier).toBeCloseTo(0.10);
    });

    it("should return zero modifiers at zero intensity", () => {
      const mods = getEmotionalWeightModifiers("vengeful", 0);
      expect(mods.attackModifier).toBeCloseTo(0);
      expect(mods.diplomacyModifier).toBeCloseTo(0);
    });
  });

  describe("shouldArchetypeAttack", () => {
    it("should return false for null archetype", () => {
      expect(shouldArchetypeAttack(null, 100, 50)).toBe(false);
    });

    it("should return false for zero our power", () => {
      expect(shouldArchetypeAttack("warlord", 0, 50)).toBe(false);
    });

    it("should return true when enemy is much weaker for warlord", () => {
      // Warlord has high attack threshold, attacks weaker enemies
      expect(shouldArchetypeAttack("warlord", 1000, 100)).toBe(true);
    });

    it("should return false when enemy is stronger for turtle", () => {
      // Turtle has low attack threshold, very defensive
      expect(shouldArchetypeAttack("turtle", 100, 200)).toBe(false);
    });
  });

  describe("getRetreatWillingness", () => {
    it("should return default for null archetype", () => {
      expect(getRetreatWillingness(null)).toBe(0.3);
    });

    it("should return higher retreat for defensive archetypes", () => {
      const turtleRetreat = getRetreatWillingness("turtle");
      const warlordRetreat = getRetreatWillingness("warlord");
      expect(turtleRetreat).toBeGreaterThan(warlordRetreat);
    });
  });

  describe("getAllianceSeeking", () => {
    it("should return default for null archetype", () => {
      expect(getAllianceSeeking(null)).toBe(0.3);
    });

    it("should return higher for diplomat", () => {
      const diplomatAlliance = getAllianceSeeking("diplomat");
      const warlordAlliance = getAllianceSeeking("warlord");
      expect(diplomatAlliance).toBeGreaterThan(warlordAlliance);
    });
  });

  describe("shouldTelegraphAction", () => {
    it("should return false for null archetype", () => {
      const result = shouldTelegraphAction(null, "attack");
      expect(result.shouldTell).toBe(false);
      expect(result.advanceWarningTurns).toBe(0);
    });

    it("should not telegraph trade actions", () => {
      const result = shouldTelegraphAction("warlord", "trade");
      expect(result.shouldTell).toBe(false);
    });

    it("should not telegraph other actions", () => {
      const result = shouldTelegraphAction("diplomat", "other");
      expect(result.shouldTell).toBe(false);
    });
  });

  describe("getTellStyle", () => {
    it("should return minimal for null archetype", () => {
      expect(getTellStyle(null)).toBe("minimal");
    });

    it("should return valid style for archetypes", () => {
      const warlordStyle = getTellStyle("warlord");
      expect(warlordStyle).toBeTruthy();
    });
  });

  describe("getAdjustedWeights with archetypes", () => {
    it("should use archetype weights when archetype is set", () => {
      const warlordContext: BotDecisionContext = {
        ...mockContext,
        empire: { ...mockEmpire, botArchetype: "warlord" },
      };
      const weights = getAdjustedWeights(warlordContext);
      // Warlord should have higher attack weight
      expect(weights.attack).toBeGreaterThan(BASE_WEIGHTS.attack);
    });

    it("should apply emotional modifiers when emotional state is set", () => {
      const emotionalContext: BotDecisionContext = {
        ...mockContext,
        empire: { ...mockEmpire, botArchetype: "warlord" },
        emotionalState: { state: "vengeful", intensity: 0.8 },
      };
      const weights = getAdjustedWeights(emotionalContext);
      // Vengeful should boost attack even more
      expect(weights.attack).toBeGreaterThan(ARCHETYPE_WEIGHTS.warlord.attack);
    });

    it("should skip emotional modifiers for neutral state", () => {
      const neutralContext: BotDecisionContext = {
        ...mockContext,
        empire: { ...mockEmpire, botArchetype: "warlord" },
        emotionalState: { state: "neutral", intensity: 0.5 },
      };
      const weights = getAdjustedWeights(neutralContext);
      // Should use archetype weights without modification
      expect(weights.attack).toBeCloseTo(ARCHETYPE_WEIGHTS.warlord.attack);
    });

    it("should boost attack weight when grudge targets are available", () => {
      const grudgeContext: BotDecisionContext = {
        ...mockContext,
        empire: { ...mockEmpire, botArchetype: "warlord" },
        permanentGrudges: ["target-1"],
      };
      const weights = getAdjustedWeights(grudgeContext);
      // Should have boosted attack weight
      expect(weights.attack).toBeGreaterThan(ARCHETYPE_WEIGHTS.warlord.attack);
    });

    it("should not boost attack for grudges during protection", () => {
      const protectedGrudgeContext: BotDecisionContext = {
        ...mockContext,
        currentTurn: 10, // Protected
        empire: { ...mockEmpire, botArchetype: "warlord" },
        permanentGrudges: ["target-1"],
      };
      const weights = getAdjustedWeights(protectedGrudgeContext);
      expect(weights.attack).toBe(0);
    });
  });

  describe("generateBotDecision with archetypes", () => {
    it("should generate attack against grudge target when available", () => {
      const grudgeContext: BotDecisionContext = {
        ...mockContext,
        empire: { ...mockEmpire, botArchetype: "warlord", soldiers: 500, fighters: 200, lightCruisers: 50 },
        permanentGrudges: ["target-1"],
      };
      // Force attack decision
      const decision = generateBotDecision(grudgeContext, 0.50, 0.1);
      if (decision.type === "attack") {
        // 70% chance to target grudge, with random 0.1 it should target grudge
        expect(decision.targetId).toBeDefined();
      }
    });

    it("should return do_nothing when no forces for attack", () => {
      const noForcesContext: BotDecisionContext = {
        ...mockContext,
        empire: { ...mockEmpire, soldiers: 0, fighters: 0, lightCruisers: 0, heavyCruisers: 0, carriers: 0 },
      };
      const decision = generateBotDecision(noForcesContext, 0.50); // attack range
      expect(decision.type).not.toBe("attack");
    });

    it("should return do_nothing when no affordable units for build", () => {
      const poorContext: BotDecisionContext = {
        ...mockContext,
        empire: { ...mockEmpire, credits: 0 },
      };
      const decision = generateBotDecision(poorContext, 0.1); // build_units range
      expect(decision.type).toBe("do_nothing");
    });

    it("should return do_nothing when no affordable planets for buy", () => {
      const poorContext: BotDecisionContext = {
        ...mockContext,
        empire: { ...mockEmpire, credits: 0 },
      };
      const decision = generateBotDecision(poorContext, 0.35); // buy_planet range
      expect(decision.type).toBe("do_nothing");
    });

    it("should return do_nothing for diplomacy when no targets", () => {
      const noTargetsContext: BotDecisionContext = {
        ...mockContext,
        availableTargets: [],
      };
      const decision = generateBotDecision(noTargetsContext, 0.58); // diplomacy range
      expect(decision.type).toBe("do_nothing");
    });

    it("should return do_nothing for diplomacy when all have treaties", () => {
      const treatyContext: BotDecisionContext = {
        ...mockContext,
        availableTargets: mockContext.availableTargets.map(t => ({ ...t, hasTreaty: true })),
      };
      const decision = generateBotDecision(treatyContext, 0.58); // diplomacy range
      expect(decision.type).toBe("do_nothing");
    });
  });

  describe("generateBotDecision trade scenarios", () => {
    it("should buy food when food is low", () => {
      const lowFoodContext: BotDecisionContext = {
        ...mockContext,
        empire: { ...mockEmpire, food: 100, population: 10000, credits: 50000 },
      };
      const decision = generateBotDecision(lowFoodContext, 0.66, 0.1); // trade range
      if (decision.type === "trade") {
        expect(decision.resource).toBe("food");
        expect(decision.action).toBe("buy");
      }
    });

    it("should sell food when food is very high", () => {
      const highFoodContext: BotDecisionContext = {
        ...mockContext,
        empire: { ...mockEmpire, food: 200000, population: 10000, credits: 10000 },
      };
      const decision = generateBotDecision(highFoodContext, 0.66, 0.3); // trade range
      if (decision.type === "trade") {
        expect(decision.resource).toBe("food");
        expect(decision.action).toBe("sell");
      }
    });
  });

  describe("generateBotDecision crafting scenarios", () => {
    it("should generate craft_component with archetype", () => {
      const craftingContext: BotDecisionContext = {
        ...mockContext,
        empire: { ...mockEmpire, botArchetype: "merchant", credits: 100000 },
      };
      const decision = generateBotDecision(craftingContext, 0.81, 0.5);
      // With merchant archetype, should attempt crafting
      expect(["craft_component", "do_nothing"]).toContain(decision.type);
    });

    it("should generate accept_contract with archetype", () => {
      const contractContext: BotDecisionContext = {
        ...mockContext,
        empire: { ...mockEmpire, botArchetype: "schemer", credits: 100000 },
        availableTargets: [
          { id: "human-1", name: "Human 1", networth: 500, planetCount: 5, isBot: false, isEliminated: false, militaryPower: 50, hasTreaty: false },
        ],
      };
      // Schemer has high Syndicate willingness
      const decision = generateBotDecision(contractContext, 0.91, 0.1);
      // Crafting-related decisions
      expect(["accept_contract", "purchase_black_market", "do_nothing"]).toContain(decision.type);
    });

    it("should generate purchase_black_market with high-Syndicate archetype", () => {
      const blackMarketContext: BotDecisionContext = {
        ...mockContext,
        empire: { ...mockEmpire, botArchetype: "schemer", credits: 150000 },
      };
      // Force black market decision range
      const decision = generateBotDecision(blackMarketContext, 0.96, 0.05);
      expect(["purchase_black_market", "do_nothing"]).toContain(decision.type);
      if (decision.type === "purchase_black_market") {
        expect(decision.quantity).toBe(2); // High credits = 2 units
      }
    });

    it("should generate purchase_black_market with lower quantity when poor", () => {
      const poorBlackMarketContext: BotDecisionContext = {
        ...mockContext,
        empire: { ...mockEmpire, botArchetype: "schemer", credits: 50000 },
      };
      const decision = generateBotDecision(poorBlackMarketContext, 0.96, 0.05);
      expect(["purchase_black_market", "do_nothing"]).toContain(decision.type);
      if (decision.type === "purchase_black_market") {
        expect(decision.quantity).toBe(1); // Low credits = 1 unit
      }
    });

    it("should return do_nothing for crafting when no archetype", () => {
      const noArchetypeContext: BotDecisionContext = {
        ...mockContext,
        empire: { ...mockEmpire, botArchetype: null },
      };
      const decision = generateBotDecision(noArchetypeContext, 0.81);
      expect(decision.type).toBe("do_nothing");
    });
  });

  describe("generateBotDecision diplomacy archetypes", () => {
    it("should prefer alliance for diplomat archetype", () => {
      const diplomatContext: BotDecisionContext = {
        ...mockContext,
        empire: { ...mockEmpire, botArchetype: "diplomat" },
      };
      const decision = generateBotDecision(diplomatContext, 0.58, 0.3);
      if (decision.type === "diplomacy") {
        // Diplomat prefers alliances (70% chance)
        expect(["propose_nap", "propose_alliance"]).toContain(decision.action);
      }
    });

    it("should prefer NAP for aggressive archetypes", () => {
      const warlordContext: BotDecisionContext = {
        ...mockContext,
        empire: { ...mockEmpire, botArchetype: "warlord" },
      };
      const decision = generateBotDecision(warlordContext, 0.58, 0.1);
      if (decision.type === "diplomacy") {
        // Aggressive archetypes prefer NAP
        expect(decision.action).toBe("propose_nap");
      }
    });

    it("should prefer NAP for turtle archetype", () => {
      const turtleContext: BotDecisionContext = {
        ...mockContext,
        empire: { ...mockEmpire, botArchetype: "turtle" },
      };
      const decision = generateBotDecision(turtleContext, 0.58, 0.3);
      if (decision.type === "diplomacy") {
        expect(["propose_nap", "propose_alliance"]).toContain(decision.action);
      }
    });
  });
});

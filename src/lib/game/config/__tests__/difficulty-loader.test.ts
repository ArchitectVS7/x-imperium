/**
 * Difficulty Loader Tests
 *
 * Tests for difficulty preset loading and application.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getDifficultyPresets,
  getDifficultyPreset,
  applyDifficultyPreset,
  getDifficultyModifiers,
  getBotModifiers,
  getPlayerModifiers,
  hasCustomDifficultyModifiers,
  clearCustomDifficultyModifiers,
} from "../difficulty-loader";
import type { Difficulty } from "@/lib/bots/types";

// Mock database
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      games: {
        findFirst: vi.fn(),
      },
      empires: {
        findFirst: vi.fn(),
      },
      gameConfigs: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

describe("Difficulty Presets", () => {
  describe("getDifficultyPresets", () => {
    it("should return all four difficulty presets", () => {
      const presets = getDifficultyPresets();
      expect(presets).toHaveProperty("easy");
      expect(presets).toHaveProperty("normal");
      expect(presets).toHaveProperty("hard");
      expect(presets).toHaveProperty("nightmare");
    });

    it("should have required properties for each preset", () => {
      const presets = getDifficultyPresets();
      const levels: Difficulty[] = ["easy", "normal", "hard", "nightmare"];

      for (const level of levels) {
        const preset = presets[level];
        expect(preset).toHaveProperty("name");
        expect(preset).toHaveProperty("description");
        expect(preset).toHaveProperty("player");
        expect(preset).toHaveProperty("bots");
        expect(preset).toHaveProperty("combat");
        expect(preset).toHaveProperty("economy");
      }
    });
  });

  describe("getDifficultyPreset", () => {
    it("should return easy preset with player advantages", () => {
      const preset = getDifficultyPreset("easy");
      expect(preset.name).toBe("Easy");
      expect(preset.player.incomeMultiplier).toBe(1.20); // +20% income
      expect(preset.player.startingCreditsBonus).toBe(2000);
      expect(preset.bots.incomeMultiplier).toBe(1.00); // No bot bonuses
    });

    it("should return normal preset with balanced values", () => {
      const preset = getDifficultyPreset("normal");
      expect(preset.name).toBe("Normal");
      expect(preset.player.incomeMultiplier).toBe(1.00);
      expect(preset.player.startingCreditsBonus).toBe(0);
      expect(preset.bots.incomeMultiplier).toBe(1.00);
      expect(preset.bots.attackThresholdModifier).toBe(0.00);
    });

    it("should return hard preset with bot advantages", () => {
      const preset = getDifficultyPreset("hard");
      expect(preset.name).toBe("Hard");
      expect(preset.player.incomeMultiplier).toBe(1.00); // No player bonuses
      expect(preset.bots.incomeMultiplier).toBe(1.15); // +15% income
      expect(preset.bots.attackThresholdModifier).toBe(-0.10); // More aggressive
      expect(preset.bots.targetWeakest).toBe(true);
    });

    it("should return nightmare preset with major bot advantages", () => {
      const preset = getDifficultyPreset("nightmare");
      expect(preset.name).toBe("Nightmare");
      expect(preset.player.startingCreditsBonus).toBe(-1000); // Penalty
      expect(preset.bots.incomeMultiplier).toBe(1.30); // +30% income
      expect(preset.bots.combatPowerMultiplier).toBe(1.10); // +10% combat
      expect(preset.bots.attackThresholdModifier).toBe(-0.20); // Very aggressive
    });
  });
});

describe("Player Modifiers", () => {
  it("easy difficulty should give player income bonus", () => {
    const preset = getDifficultyPreset("easy");
    expect(preset.player.incomeMultiplier).toBeGreaterThan(1.0);
  });

  it("easy difficulty should reduce planet costs", () => {
    const preset = getDifficultyPreset("easy");
    expect(preset.player.planetCostReduction).toBeLessThan(1.0);
  });

  it("easy difficulty should reduce unit costs", () => {
    const preset = getDifficultyPreset("easy");
    expect(preset.player.unitCostReduction).toBeLessThan(1.0);
  });

  it("normal difficulty should have no player bonuses", () => {
    const preset = getDifficultyPreset("normal");
    expect(preset.player.incomeMultiplier).toBe(1.0);
    expect(preset.player.planetCostReduction).toBe(1.0);
    expect(preset.player.unitCostReduction).toBe(1.0);
    expect(preset.player.startingCreditsBonus).toBe(0);
  });

  it("nightmare difficulty should penalize player start", () => {
    const preset = getDifficultyPreset("nightmare");
    expect(preset.player.startingCreditsBonus).toBeLessThan(0);
  });
});

describe("Bot Modifiers", () => {
  it("easy difficulty should have bot handicaps", () => {
    const preset = getDifficultyPreset("easy");
    expect(preset.bots.suboptimalChance).toBe(0.50); // 50% chance of bad moves
    expect(preset.bots.targetWeakest).toBe(false);
    expect(preset.bots.incomeMultiplier).toBe(1.0);
  });

  it("normal difficulty should have balanced bot behavior", () => {
    const preset = getDifficultyPreset("normal");
    expect(preset.bots.incomeMultiplier).toBe(1.0);
    expect(preset.bots.suboptimalChance).toBe(0.0);
    expect(preset.bots.targetWeakest).toBe(false);
    expect(preset.bots.combatPowerMultiplier).toBe(1.0);
  });

  it("hard difficulty should have bot advantages", () => {
    const preset = getDifficultyPreset("hard");
    expect(preset.bots.incomeMultiplier).toBeGreaterThan(1.0);
    expect(preset.bots.targetWeakest).toBe(true);
    expect(preset.bots.combatPowerMultiplier).toBeGreaterThan(1.0);
  });

  it("nightmare difficulty should have major bot bonuses", () => {
    const preset = getDifficultyPreset("nightmare");
    expect(preset.bots.incomeMultiplier).toBeGreaterThanOrEqual(1.3);
    expect(preset.bots.combatPowerMultiplier).toBeGreaterThanOrEqual(1.1);
    expect(preset.bots.buildSpeedMultiplier).toBeGreaterThan(1.0);
    expect(preset.bots.researchSpeedMultiplier).toBeGreaterThan(1.0);
  });

  it("attack threshold should be more aggressive on harder difficulties", () => {
    const easy = getDifficultyPreset("easy");
    const normal = getDifficultyPreset("normal");
    const hard = getDifficultyPreset("hard");
    const nightmare = getDifficultyPreset("nightmare");

    expect(easy.bots.attackThresholdModifier).toBeGreaterThan(normal.bots.attackThresholdModifier);
    expect(normal.bots.attackThresholdModifier).toBeGreaterThan(hard.bots.attackThresholdModifier);
    expect(hard.bots.attackThresholdModifier).toBeGreaterThan(nightmare.bots.attackThresholdModifier);
  });
});

describe("Combat Modifiers", () => {
  it("easy difficulty should give player defense bonus", () => {
    const preset = getDifficultyPreset("easy");
    expect(preset.combat.playerDefenseBonus).toBeGreaterThan(1.0);
  });

  it("normal difficulty should have standard defender bonus", () => {
    const preset = getDifficultyPreset("normal");
    expect(preset.combat.defenderBonus).toBe(1.10);
    expect(preset.combat.playerDefenseBonus).toBe(1.0);
  });

  it("nightmare difficulty should reduce player defense", () => {
    const preset = getDifficultyPreset("nightmare");
    expect(preset.combat.playerDefenseBonus).toBeLessThan(1.0);
  });
});

describe("Economy Modifiers", () => {
  it("easy difficulty should reduce market volatility", () => {
    const preset = getDifficultyPreset("easy");
    expect(preset.economy.marketPriceVolatility).toBeLessThan(1.0);
  });

  it("easy difficulty should reduce maintenance costs", () => {
    const preset = getDifficultyPreset("easy");
    expect(preset.economy.maintenanceCostMultiplier).toBeLessThan(1.0);
  });

  it("hard/nightmare should increase market volatility", () => {
    const hard = getDifficultyPreset("hard");
    const nightmare = getDifficultyPreset("nightmare");
    expect(hard.economy.marketPriceVolatility).toBeGreaterThan(1.0);
    expect(nightmare.economy.marketPriceVolatility).toBeGreaterThan(1.0);
  });
});

describe("Income Calculations", () => {
  it("should apply easy player income bonus correctly", () => {
    const preset = getDifficultyPreset("easy");
    const baseIncome = 10000;
    const bonusIncome = baseIncome * preset.player.incomeMultiplier;
    expect(bonusIncome).toBe(12000); // +20%
  });

  it("should apply hard bot income bonus correctly", () => {
    const preset = getDifficultyPreset("hard");
    const baseIncome = 10000;
    const bonusIncome = baseIncome * preset.bots.incomeMultiplier;
    expect(bonusIncome).toBe(11500); // +15%
  });

  it("should apply nightmare bot income bonus correctly", () => {
    const preset = getDifficultyPreset("nightmare");
    const baseIncome = 10000;
    const bonusIncome = baseIncome * preset.bots.incomeMultiplier;
    expect(bonusIncome).toBe(13000); // +30%
  });
});

describe("Planet Cost Calculations", () => {
  it("should reduce planet costs on easy", () => {
    const preset = getDifficultyPreset("easy");
    const baseCost = 10000;
    const reducedCost = baseCost * preset.player.planetCostReduction;
    expect(reducedCost).toBe(8500); // -15%
  });

  it("should not change planet costs on normal", () => {
    const preset = getDifficultyPreset("normal");
    const baseCost = 10000;
    const finalCost = baseCost * preset.player.planetCostReduction;
    expect(finalCost).toBe(10000);
  });
});

describe("Unit Cost Calculations", () => {
  it("should reduce unit costs on easy", () => {
    const preset = getDifficultyPreset("easy");
    const baseCost = 1000;
    const reducedCost = baseCost * preset.player.unitCostReduction;
    expect(reducedCost).toBe(900); // -10%
  });

  it("should not change unit costs on normal", () => {
    const preset = getDifficultyPreset("normal");
    const baseCost = 1000;
    const finalCost = baseCost * preset.player.unitCostReduction;
    expect(finalCost).toBe(1000);
  });
});

describe("Build Speed Calculations", () => {
  it("should speed up bot builds on hard", () => {
    const preset = getDifficultyPreset("hard");
    // Hard gives 1.10x build speed, which with baseTurns=11 gives 10 turns
    expect(preset.bots.buildSpeedMultiplier).toBe(1.10);
    const baseTurns = 11;
    const reducedTurns = Math.ceil(baseTurns / preset.bots.buildSpeedMultiplier);
    expect(reducedTurns).toBe(10); // 11/1.10 = 10
  });

  it("should significantly speed up bot builds on nightmare", () => {
    const preset = getDifficultyPreset("nightmare");
    const baseTurns = 10;
    const reducedTurns = Math.ceil(baseTurns / preset.bots.buildSpeedMultiplier);
    expect(reducedTurns).toBe(9); // 20% faster = 8.33 rounds to 9
  });
});

describe("Combat Power Calculations", () => {
  it("should boost bot combat power on hard", () => {
    const preset = getDifficultyPreset("hard");
    const basePower = 1000;
    const boostedPower = basePower * preset.bots.combatPowerMultiplier;
    expect(boostedPower).toBe(1050); // +5%
  });

  it("should significantly boost bot combat power on nightmare", () => {
    const preset = getDifficultyPreset("nightmare");
    const basePower = 1000;
    const boostedPower = basePower * preset.bots.combatPowerMultiplier;
    expect(boostedPower).toBe(1100); // +10%
  });
});

describe("Defender Bonus Calculations", () => {
  it("should apply defender bonus to all difficulties", () => {
    const levels: Difficulty[] = ["easy", "normal", "hard", "nightmare"];
    for (const level of levels) {
      const preset = getDifficultyPreset(level);
      expect(preset.combat.defenderBonus).toBeGreaterThanOrEqual(1.0);
    }
  });

  it("should give player extra defense on easy", () => {
    const preset = getDifficultyPreset("easy");
    const totalBonus = preset.combat.defenderBonus * preset.combat.playerDefenseBonus;
    expect(totalBonus).toBeGreaterThan(1.15);
  });

  it("should reduce player defense on nightmare", () => {
    const preset = getDifficultyPreset("nightmare");
    const totalBonus = preset.combat.defenderBonus * preset.combat.playerDefenseBonus;
    expect(totalBonus).toBeLessThan(1.10);
  });
});

describe("Maintenance Cost Calculations", () => {
  it("should reduce maintenance on easy", () => {
    const preset = getDifficultyPreset("easy");
    const baseMaintenance = 1000;
    const reducedMaintenance = baseMaintenance * preset.economy.maintenanceCostMultiplier;
    expect(reducedMaintenance).toBe(900); // -10%
  });

  it("should increase maintenance on hard/nightmare", () => {
    const hard = getDifficultyPreset("hard");
    const nightmare = getDifficultyPreset("nightmare");
    const baseMaintenance = 1000;

    expect(baseMaintenance * hard.economy.maintenanceCostMultiplier).toBeGreaterThan(1000);
    expect(baseMaintenance * nightmare.economy.maintenanceCostMultiplier).toBeGreaterThan(1000);
  });
});

describe("Consistency Checks", () => {
  it("all presets should have valid multipliers (positive numbers)", () => {
    const presets = getDifficultyPresets();
    const levels: Difficulty[] = ["easy", "normal", "hard", "nightmare"];

    for (const level of levels) {
      const preset = presets[level];
      expect(preset.player.incomeMultiplier).toBeGreaterThan(0);
      expect(preset.bots.incomeMultiplier).toBeGreaterThan(0);
      expect(preset.combat.defenderBonus).toBeGreaterThan(0);
      expect(preset.economy.marketPriceVolatility).toBeGreaterThan(0);
    }
  });

  it("attack threshold should be in reasonable range", () => {
    const presets = getDifficultyPresets();
    const levels: Difficulty[] = ["easy", "normal", "hard", "nightmare"];

    for (const level of levels) {
      const preset = presets[level];
      expect(preset.bots.attackThresholdModifier).toBeGreaterThanOrEqual(-0.3);
      expect(preset.bots.attackThresholdModifier).toBeLessThanOrEqual(0.3);
    }
  });

  it("suboptimal chance should be between 0 and 1", () => {
    const presets = getDifficultyPresets();
    const levels: Difficulty[] = ["easy", "normal", "hard", "nightmare"];

    for (const level of levels) {
      const preset = presets[level];
      expect(preset.bots.suboptimalChance).toBeGreaterThanOrEqual(0);
      expect(preset.bots.suboptimalChance).toBeLessThanOrEqual(1);
    }
  });
});

describe("Progression Validation", () => {
  it("difficulty should increase from easy to nightmare", () => {
    const easy = getDifficultyPreset("easy");
    const normal = getDifficultyPreset("normal");
    const hard = getDifficultyPreset("hard");
    const nightmare = getDifficultyPreset("nightmare");

    // Bot income should increase
    expect(easy.bots.incomeMultiplier).toBeLessThanOrEqual(normal.bots.incomeMultiplier);
    expect(normal.bots.incomeMultiplier).toBeLessThan(hard.bots.incomeMultiplier);
    expect(hard.bots.incomeMultiplier).toBeLessThan(nightmare.bots.incomeMultiplier);

    // Player bonuses should decrease
    expect(easy.player.incomeMultiplier).toBeGreaterThan(normal.player.incomeMultiplier);
  });

  it("bot build speed should increase from easy to nightmare", () => {
    const easy = getDifficultyPreset("easy");
    const normal = getDifficultyPreset("normal");
    const hard = getDifficultyPreset("hard");
    const nightmare = getDifficultyPreset("nightmare");

    expect(easy.bots.buildSpeedMultiplier).toBeLessThanOrEqual(normal.bots.buildSpeedMultiplier);
    expect(normal.bots.buildSpeedMultiplier).toBeLessThan(hard.bots.buildSpeedMultiplier);
    expect(hard.bots.buildSpeedMultiplier).toBeLessThan(nightmare.bots.buildSpeedMultiplier);
  });
});

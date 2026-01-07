/**
 * Tests for Coalition Raid Service (M9)
 */

import { describe, it, expect } from "vitest";
import {
  detectCoalitionRaid,
  isPartOfCoalitionRaid,
  calculateRaidCombatBonus,
  calculateRaidDistribution,
  getRaidParticipants,
  calculateRaidRewards,
  generateRaidVictoryMessage,
  validateRaidAttacks,
  getRaidBonusDescription,
  MIN_COALITION_SIZE,
  BONUS_PER_ATTACKER,
  MAX_COALITION_BONUS,
  RAID_REPUTATION_BONUS,
  type PendingAttack,
  type BossStatus,
  type CoalitionRaid,
} from "../coalition-raid-service";

// =============================================================================
// TEST HELPERS
// =============================================================================

const createAttack = (
  attackerId: string,
  attackerName: string,
  defenderId: string,
  defenderName: string,
  damage: number,
  turn: number = 1
): PendingAttack => ({
  attackerId,
  attackerName,
  defenderId,
  defenderName,
  damage,
  troopsCommitted: damage / 2,
  turn,
});

const createBossStatus = (empireId: string, isBoss: boolean): BossStatus => ({
  empireId,
  isBoss,
  battleWins: isBoss ? 5 : 2,
  networthRatio: isBoss ? 2.5 : 1.0,
});

// =============================================================================
// M9.1: COALITION RAID DETECTION TESTS
// =============================================================================

describe("Coalition Raid Detection (M9.1)", () => {
  describe("detectCoalitionRaid", () => {
    it("should detect coalition when 3+ empires attack a boss", () => {
      const bossId = "boss-1";
      const attacks = [
        createAttack("emp-1", "Empire 1", bossId, "Boss Empire", 100),
        createAttack("emp-2", "Empire 2", bossId, "Boss Empire", 150),
        createAttack("emp-3", "Empire 3", bossId, "Boss Empire", 200),
      ];
      const bossStatuses = [createBossStatus(bossId, true)];

      const raid = detectCoalitionRaid(attacks, bossStatuses, 1);

      expect(raid).not.toBeNull();
      expect(raid?.isValidRaid).toBe(true);
      expect(raid?.targetEmpireId).toBe(bossId);
      expect(raid?.attackerIds).toHaveLength(3);
    });

    it("should NOT detect coalition with only 2 attackers", () => {
      const bossId = "boss-1";
      const attacks = [
        createAttack("emp-1", "Empire 1", bossId, "Boss Empire", 100),
        createAttack("emp-2", "Empire 2", bossId, "Boss Empire", 150),
      ];
      const bossStatuses = [createBossStatus(bossId, true)];

      const raid = detectCoalitionRaid(attacks, bossStatuses, 1);

      expect(raid).toBeNull();
    });

    it("should NOT detect coalition when target is not a boss", () => {
      const targetId = "regular-1";
      const attacks = [
        createAttack("emp-1", "Empire 1", targetId, "Regular Empire", 100),
        createAttack("emp-2", "Empire 2", targetId, "Regular Empire", 150),
        createAttack("emp-3", "Empire 3", targetId, "Regular Empire", 200),
      ];
      const bossStatuses = [createBossStatus(targetId, false)];

      const raid = detectCoalitionRaid(attacks, bossStatuses, 1);

      expect(raid).toBeNull();
    });

    it("should count unique attackers (multiple attacks from same empire = 1)", () => {
      const bossId = "boss-1";
      const attacks = [
        createAttack("emp-1", "Empire 1", bossId, "Boss Empire", 100),
        createAttack("emp-1", "Empire 1", bossId, "Boss Empire", 50), // Same attacker
        createAttack("emp-2", "Empire 2", bossId, "Boss Empire", 150),
      ];
      const bossStatuses = [createBossStatus(bossId, true)];

      const raid = detectCoalitionRaid(attacks, bossStatuses, 1);

      expect(raid).toBeNull(); // Only 2 unique attackers
    });

    it("should only consider attacks from current turn", () => {
      const bossId = "boss-1";
      const attacks = [
        createAttack("emp-1", "Empire 1", bossId, "Boss Empire", 100, 1),
        createAttack("emp-2", "Empire 2", bossId, "Boss Empire", 150, 1),
        createAttack("emp-3", "Empire 3", bossId, "Boss Empire", 200, 2), // Different turn
      ];
      const bossStatuses = [createBossStatus(bossId, true)];

      const raid = detectCoalitionRaid(attacks, bossStatuses, 1);

      expect(raid).toBeNull(); // Only 2 attackers in turn 1
    });

    it("should calculate correct bonus for 3 attackers (+5%)", () => {
      const bossId = "boss-1";
      const attacks = [
        createAttack("emp-1", "Empire 1", bossId, "Boss Empire", 100),
        createAttack("emp-2", "Empire 2", bossId, "Boss Empire", 150),
        createAttack("emp-3", "Empire 3", bossId, "Boss Empire", 200),
      ];
      const bossStatuses = [createBossStatus(bossId, true)];

      const raid = detectCoalitionRaid(attacks, bossStatuses, 1);

      expect(raid?.bonusPercentage).toBe(0.05); // 3 - 2 = 1 × 0.05 = 0.05
    });

    it("should calculate correct bonus for 5 attackers (+15%)", () => {
      const bossId = "boss-1";
      const attacks = [
        createAttack("emp-1", "Empire 1", bossId, "Boss Empire", 100),
        createAttack("emp-2", "Empire 2", bossId, "Boss Empire", 150),
        createAttack("emp-3", "Empire 3", bossId, "Boss Empire", 200),
        createAttack("emp-4", "Empire 4", bossId, "Boss Empire", 180),
        createAttack("emp-5", "Empire 5", bossId, "Boss Empire", 120),
      ];
      const bossStatuses = [createBossStatus(bossId, true)];

      const raid = detectCoalitionRaid(attacks, bossStatuses, 1);

      expect(raid?.bonusPercentage).toBeCloseTo(0.15, 5); // 5 - 2 = 3 × 0.05 = 0.15
    });

    it("should cap bonus at 25%", () => {
      const bossId = "boss-1";
      const attacks = [];
      for (let i = 1; i <= 10; i++) {
        attacks.push(createAttack(`emp-${i}`, `Empire ${i}`, bossId, "Boss Empire", 100));
      }
      const bossStatuses = [createBossStatus(bossId, true)];

      const raid = detectCoalitionRaid(attacks, bossStatuses, 1);

      expect(raid?.bonusPercentage).toBe(0.25); // Capped at 25%
    });
  });

  describe("isPartOfCoalitionRaid", () => {
    it("should return true for raid participants", () => {
      const raid: CoalitionRaid = {
        targetEmpireId: "boss-1",
        targetEmpireName: "Boss Empire",
        attackerIds: ["emp-1", "emp-2", "emp-3"],
        attackerNames: ["Empire 1", "Empire 2", "Empire 3"],
        isValidRaid: true,
        bonusPercentage: 0.05,
        turn: 1,
      };

      expect(isPartOfCoalitionRaid("emp-1", raid)).toBe(true);
      expect(isPartOfCoalitionRaid("emp-2", raid)).toBe(true);
    });

    it("should return false for non-participants", () => {
      const raid: CoalitionRaid = {
        targetEmpireId: "boss-1",
        targetEmpireName: "Boss Empire",
        attackerIds: ["emp-1", "emp-2", "emp-3"],
        attackerNames: ["Empire 1", "Empire 2", "Empire 3"],
        isValidRaid: true,
        bonusPercentage: 0.05,
        turn: 1,
      };

      expect(isPartOfCoalitionRaid("emp-4", raid)).toBe(false);
    });

    it("should return false for null raid", () => {
      expect(isPartOfCoalitionRaid("emp-1", null)).toBe(false);
    });
  });
});

// =============================================================================
// M9.2: RAID COMBAT BONUSES TESTS
// =============================================================================

describe("Raid Combat Bonuses (M9.2)", () => {
  describe("calculateRaidCombatBonus", () => {
    it("should return 1.0 (no bonus) for null raid", () => {
      expect(calculateRaidCombatBonus(null, "emp-1")).toBe(1.0);
    });

    it("should return 1.0 for non-participants", () => {
      const raid: CoalitionRaid = {
        targetEmpireId: "boss-1",
        targetEmpireName: "Boss Empire",
        attackerIds: ["emp-1", "emp-2", "emp-3"],
        attackerNames: ["Empire 1", "Empire 2", "Empire 3"],
        isValidRaid: true,
        bonusPercentage: 0.05,
        turn: 1,
      };

      expect(calculateRaidCombatBonus(raid, "emp-4")).toBe(1.0);
    });

    it("should return correct multiplier for 3 attackers (1.05)", () => {
      const raid: CoalitionRaid = {
        targetEmpireId: "boss-1",
        targetEmpireName: "Boss Empire",
        attackerIds: ["emp-1", "emp-2", "emp-3"],
        attackerNames: ["Empire 1", "Empire 2", "Empire 3"],
        isValidRaid: true,
        bonusPercentage: 0.05,
        turn: 1,
      };

      expect(calculateRaidCombatBonus(raid, "emp-1")).toBe(1.05);
    });

    it("should return correct multiplier for 5 attackers (1.15)", () => {
      const raid: CoalitionRaid = {
        targetEmpireId: "boss-1",
        targetEmpireName: "Boss Empire",
        attackerIds: ["emp-1", "emp-2", "emp-3", "emp-4", "emp-5"],
        attackerNames: ["E1", "E2", "E3", "E4", "E5"],
        isValidRaid: true,
        bonusPercentage: 0.15,
        turn: 1,
      };

      expect(calculateRaidCombatBonus(raid, "emp-3")).toBe(1.15);
    });
  });

  describe("getRaidBonusDescription", () => {
    it("should generate readable description", () => {
      const raid: CoalitionRaid = {
        targetEmpireId: "boss-1",
        targetEmpireName: "Boss Empire",
        attackerIds: ["emp-1", "emp-2", "emp-3", "emp-4"],
        attackerNames: ["E1", "E2", "E3", "E4"],
        isValidRaid: true,
        bonusPercentage: 0.10,
        turn: 1,
      };

      const description = getRaidBonusDescription(raid);

      expect(description).toContain("4 empires");
      expect(description).toContain("+10%");
    });
  });
});

// =============================================================================
// M9.3: RAID TERRITORY DISTRIBUTION TESTS
// =============================================================================

describe("Raid Territory Distribution (M9.3)", () => {
  describe("calculateRaidDistribution", () => {
    it("should give each participant at least 1 sector", () => {
      const raid: CoalitionRaid = {
        targetEmpireId: "boss-1",
        targetEmpireName: "Boss Empire",
        attackerIds: ["emp-1", "emp-2", "emp-3"],
        attackerNames: ["Empire 1", "Empire 2", "Empire 3"],
        isValidRaid: true,
        bonusPercentage: 0.05,
        turn: 1,
      };

      const attacks = [
        createAttack("emp-1", "Empire 1", "boss-1", "Boss Empire", 100),
        createAttack("emp-2", "Empire 2", "boss-1", "Boss Empire", 200),
        createAttack("emp-3", "Empire 3", "boss-1", "Boss Empire", 300),
      ];

      const distribution = calculateRaidDistribution(raid, attacks, 10);

      // Each participant should have at least 1 sector
      for (const d of distribution) {
        expect(d.planetsAwarded).toBeGreaterThanOrEqual(1);
      }
    });

    it("should distribute remaining sectors by damage percentage", () => {
      const raid: CoalitionRaid = {
        targetEmpireId: "boss-1",
        targetEmpireName: "Boss Empire",
        attackerIds: ["emp-1", "emp-2", "emp-3"],
        attackerNames: ["Empire 1", "Empire 2", "Empire 3"],
        isValidRaid: true,
        bonusPercentage: 0.05,
        turn: 1,
      };

      // Empire 3 dealt 50% of damage, should get more sectors
      const attacks = [
        createAttack("emp-1", "Empire 1", "boss-1", "Boss Empire", 100), // 16.67%
        createAttack("emp-2", "Empire 2", "boss-1", "Boss Empire", 200), // 33.33%
        createAttack("emp-3", "Empire 3", "boss-1", "Boss Empire", 300), // 50%
      ];

      const distribution = calculateRaidDistribution(raid, attacks, 10);

      // Sort by sectors awarded
      distribution.sort((a, b) => b.planetsAwarded - a.planetsAwarded);

      // Empire 3 should have the most sectors
      expect(distribution[0]?.empireId).toBe("emp-3");
      expect(distribution[0]?.planetsAwarded).toBeGreaterThan(distribution[2]?.planetsAwarded ?? 0);
    });

    it("should distribute all sectors (no remainder)", () => {
      const raid: CoalitionRaid = {
        targetEmpireId: "boss-1",
        targetEmpireName: "Boss Empire",
        attackerIds: ["emp-1", "emp-2", "emp-3"],
        attackerNames: ["Empire 1", "Empire 2", "Empire 3"],
        isValidRaid: true,
        bonusPercentage: 0.05,
        turn: 1,
      };

      const attacks = [
        createAttack("emp-1", "Empire 1", "boss-1", "Boss Empire", 100),
        createAttack("emp-2", "Empire 2", "boss-1", "Boss Empire", 200),
        createAttack("emp-3", "Empire 3", "boss-1", "Boss Empire", 300),
      ];

      const distribution = calculateRaidDistribution(raid, attacks, 10);
      const totalDistributed = distribution.reduce((sum, d) => sum + d.planetsAwarded, 0);

      expect(totalDistributed).toBe(10);
    });

    it("should split elimination credit equally", () => {
      const raid: CoalitionRaid = {
        targetEmpireId: "boss-1",
        targetEmpireName: "Boss Empire",
        attackerIds: ["emp-1", "emp-2", "emp-3", "emp-4"],
        attackerNames: ["Empire 1", "Empire 2", "Empire 3", "Empire 4"],
        isValidRaid: true,
        bonusPercentage: 0.10,
        turn: 1,
      };

      const attacks = [
        createAttack("emp-1", "Empire 1", "boss-1", "Boss Empire", 100),
        createAttack("emp-2", "Empire 2", "boss-1", "Boss Empire", 200),
        createAttack("emp-3", "Empire 3", "boss-1", "Boss Empire", 300),
        createAttack("emp-4", "Empire 4", "boss-1", "Boss Empire", 400),
      ];

      const distribution = calculateRaidDistribution(raid, attacks, 10);

      for (const d of distribution) {
        expect(d.eliminationCredit).toBeCloseTo(0.25, 5); // 1/4 each
      }
    });

    it("should handle zero damage gracefully", () => {
      const raid: CoalitionRaid = {
        targetEmpireId: "boss-1",
        targetEmpireName: "Boss Empire",
        attackerIds: ["emp-1", "emp-2", "emp-3"],
        attackerNames: ["Empire 1", "Empire 2", "Empire 3"],
        isValidRaid: true,
        bonusPercentage: 0.05,
        turn: 1,
      };

      const attacks = [
        createAttack("emp-1", "Empire 1", "boss-1", "Boss Empire", 0),
        createAttack("emp-2", "Empire 2", "boss-1", "Boss Empire", 0),
        createAttack("emp-3", "Empire 3", "boss-1", "Boss Empire", 0),
      ];

      const distribution = calculateRaidDistribution(raid, attacks, 9);
      const totalDistributed = distribution.reduce((sum, d) => sum + d.planetsAwarded, 0);

      expect(totalDistributed).toBe(9);
      // Should distribute evenly when no damage dealt
      for (const d of distribution) {
        expect(d.planetsAwarded).toBe(3);
      }
    });

    it("should handle more participants than sectors", () => {
      const raid: CoalitionRaid = {
        targetEmpireId: "boss-1",
        targetEmpireName: "Boss Empire",
        attackerIds: ["emp-1", "emp-2", "emp-3", "emp-4", "emp-5"],
        attackerNames: ["E1", "E2", "E3", "E4", "E5"],
        isValidRaid: true,
        bonusPercentage: 0.15,
        turn: 1,
      };

      const attacks = [
        createAttack("emp-1", "E1", "boss-1", "Boss Empire", 100),
        createAttack("emp-2", "E2", "boss-1", "Boss Empire", 200),
        createAttack("emp-3", "E3", "boss-1", "Boss Empire", 300),
        createAttack("emp-4", "E4", "boss-1", "Boss Empire", 400),
        createAttack("emp-5", "E5", "boss-1", "Boss Empire", 500),
      ];

      const distribution = calculateRaidDistribution(raid, attacks, 3);
      const totalDistributed = distribution.reduce((sum, d) => sum + d.planetsAwarded, 0);

      expect(totalDistributed).toBe(3);
      // Top 3 by damage should get sectors
      const withPlanets = distribution.filter((d) => d.planetsAwarded > 0);
      expect(withPlanets.length).toBe(3);
    });
  });

  describe("getRaidParticipants", () => {
    it("should aggregate damage from multiple attacks", () => {
      const raid: CoalitionRaid = {
        targetEmpireId: "boss-1",
        targetEmpireName: "Boss Empire",
        attackerIds: ["emp-1", "emp-2"],
        attackerNames: ["Empire 1", "Empire 2"],
        isValidRaid: true,
        bonusPercentage: 0.05,
        turn: 1,
      };

      const attacks = [
        createAttack("emp-1", "Empire 1", "boss-1", "Boss Empire", 100),
        createAttack("emp-1", "Empire 1", "boss-1", "Boss Empire", 150), // Same attacker
        createAttack("emp-2", "Empire 2", "boss-1", "Boss Empire", 200),
      ];

      const participants = getRaidParticipants(raid, attacks);

      expect(participants).toHaveLength(2);

      const emp1 = participants.find((p) => p.empireId === "emp-1");
      expect(emp1?.damageDealt).toBe(250); // 100 + 150
    });

    it("should sort participants by damage descending", () => {
      const raid: CoalitionRaid = {
        targetEmpireId: "boss-1",
        targetEmpireName: "Boss Empire",
        attackerIds: ["emp-1", "emp-2", "emp-3"],
        attackerNames: ["Empire 1", "Empire 2", "Empire 3"],
        isValidRaid: true,
        bonusPercentage: 0.05,
        turn: 1,
      };

      const attacks = [
        createAttack("emp-1", "Empire 1", "boss-1", "Boss Empire", 100),
        createAttack("emp-2", "Empire 2", "boss-1", "Boss Empire", 300),
        createAttack("emp-3", "Empire 3", "boss-1", "Boss Empire", 200),
      ];

      const participants = getRaidParticipants(raid, attacks);

      expect(participants[0]?.empireId).toBe("emp-2"); // Highest damage
      expect(participants[1]?.empireId).toBe("emp-3");
      expect(participants[2]?.empireId).toBe("emp-1"); // Lowest damage
    });
  });
});

// =============================================================================
// RAID REWARDS TESTS
// =============================================================================

describe("Raid Rewards", () => {
  describe("calculateRaidRewards", () => {
    it("should split elimination credit by participant count", () => {
      const rewards4 = calculateRaidRewards(4);
      expect(rewards4.eliminationCredit).toBe(0.25);

      const rewards5 = calculateRaidRewards(5);
      expect(rewards5.eliminationCredit).toBe(0.2);
    });

    it("should include base reputation bonus", () => {
      const rewards = calculateRaidRewards(3);
      expect(rewards.reputationBonus).toBe(RAID_REPUTATION_BONUS);
    });

    it("should include production bonus", () => {
      const rewards = calculateRaidRewards(3);
      expect(rewards.productionBonusAmount).toBe(0.10);
      expect(rewards.productionBonusTurns).toBeGreaterThan(0);
    });

    it("should include morale bonus", () => {
      const rewards = calculateRaidRewards(3);
      expect(rewards.moraleBonus).toBe(0.05);
      expect(rewards.moraleBonusTurns).toBeGreaterThan(0);
    });
  });

  describe("generateRaidVictoryMessage", () => {
    it("should include target name", () => {
      const raid: CoalitionRaid = {
        targetEmpireId: "boss-1",
        targetEmpireName: "Dark Emperor",
        attackerIds: ["emp-1", "emp-2", "emp-3"],
        attackerNames: ["Alpha", "Beta", "Gamma"],
        isValidRaid: true,
        bonusPercentage: 0.05,
        turn: 1,
      };

      const distributions = [
        { empireId: "emp-1", empireName: "Alpha", planetsAwarded: 4, damagePercentage: 0.33, eliminationCredit: 0.33 },
        { empireId: "emp-2", empireName: "Beta", planetsAwarded: 3, damagePercentage: 0.33, eliminationCredit: 0.33 },
        { empireId: "emp-3", empireName: "Gamma", planetsAwarded: 3, damagePercentage: 0.34, eliminationCredit: 0.34 },
      ];

      const message = generateRaidVictoryMessage(raid, distributions);

      expect(message).toContain("Dark Emperor");
      expect(message).toContain("3 empires");
      expect(message).toContain("10 sectors");
    });
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe("Validation", () => {
  describe("validateRaidAttacks", () => {
    it("should accept valid attacks", () => {
      const attacks = [
        createAttack("emp-1", "Empire 1", "boss-1", "Boss Empire", 100),
        createAttack("emp-2", "Empire 2", "boss-1", "Boss Empire", 200),
      ];

      const result = validateRaidAttacks(attacks);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject empty attacks", () => {
      const result = validateRaidAttacks([]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("No attacks provided");
    });

    it("should reject negative damage", () => {
      const attacks = [
        createAttack("emp-1", "Empire 1", "boss-1", "Boss Empire", -100),
      ];

      const result = validateRaidAttacks(attacks);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Negative damage"))).toBe(true);
    });
  });
});

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Constants", () => {
  it("should have correct minimum coalition size", () => {
    expect(MIN_COALITION_SIZE).toBe(3);
  });

  it("should have correct bonus per attacker", () => {
    expect(BONUS_PER_ATTACKER).toBe(0.05);
  });

  it("should have correct max coalition bonus", () => {
    expect(MAX_COALITION_BONUS).toBe(0.25);
  });
});

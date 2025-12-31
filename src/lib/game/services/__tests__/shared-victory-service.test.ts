/**
 * Tests for Shared Victory Service (M10.3)
 */

import { describe, it, expect } from "vitest";
import {
  calculateContributionPercentages,
  filterQualifiedMembers,
  calculatePlanetAllocation,
  calculateCreditAllocation,
  calculateReputationGain,
  generateVictoryMessage,
  distributeRewards,
  validateContributions,
  getDistributionSummary,
  DISTRIBUTION_TIERS,
  MIN_CONTRIBUTION_PERCENT,
  REPUTATION_GAIN_BASE,
  type CoalitionMemberContribution,
  type BossDefeatResult,
} from "../shared-victory-service";

describe("Shared Victory Service", () => {
  // Helper to create test contributions
  const createContribution = (
    empireId: string,
    name: string,
    damage: number,
    troops: number,
    attacks: number
  ): CoalitionMemberContribution => ({
    empireId,
    empireName: name,
    damageDealt: damage,
    troopsCommitted: troops,
    attacksParticipated: attacks,
  });

  describe("calculateContributionPercentages", () => {
    it("should calculate percentages correctly", () => {
      const contributions = [
        createContribution("1", "Empire A", 1000, 500, 5),
        createContribution("2", "Empire B", 500, 250, 3),
      ];

      const result = calculateContributionPercentages(contributions);

      // Empire A should be first (higher contribution)
      expect(result[0]!.empireId).toBe("1");
      expect(result[0]!.contributionPercent).toBeGreaterThan(0.5);

      // Percentages should sum to 1
      const total = result.reduce((sum, r) => sum + r.contributionPercent, 0);
      expect(total).toBeCloseTo(1, 5);
    });

    it("should sort by contribution descending", () => {
      const contributions = [
        createContribution("1", "Small", 100, 50, 1),
        createContribution("2", "Large", 1000, 500, 10),
        createContribution("3", "Medium", 500, 250, 5),
      ];

      const result = calculateContributionPercentages(contributions);

      expect(result[0]!.empireId).toBe("2"); // Large first
      expect(result[1]!.empireId).toBe("3"); // Medium second
      expect(result[2]!.empireId).toBe("1"); // Small last
    });

    it("should handle equal contributions", () => {
      const contributions = [
        createContribution("1", "A", 100, 100, 1),
        createContribution("2", "B", 100, 100, 1),
      ];

      const result = calculateContributionPercentages(contributions);
      expect(result[0]!.contributionPercent).toBeCloseTo(0.5, 5);
      expect(result[1]!.contributionPercent).toBeCloseTo(0.5, 5);
    });

    it("should handle zero total contribution", () => {
      const contributions = [
        createContribution("1", "A", 0, 0, 0),
        createContribution("2", "B", 0, 0, 0),
      ];

      const result = calculateContributionPercentages(contributions);
      expect(result[0]!.contributionPercent).toBe(0);
    });
  });

  describe("filterQualifiedMembers", () => {
    it("should filter out members below threshold", () => {
      const contributions = [
        { empireId: "1", empireName: "A", damageDealt: 0, troopsCommitted: 0, attacksParticipated: 0, contributionPercent: 0.7 },
        { empireId: "2", empireName: "B", damageDealt: 0, troopsCommitted: 0, attacksParticipated: 0, contributionPercent: 0.25 },
        { empireId: "3", empireName: "C", damageDealt: 0, troopsCommitted: 0, attacksParticipated: 0, contributionPercent: 0.04 },
        { empireId: "4", empireName: "D", damageDealt: 0, troopsCommitted: 0, attacksParticipated: 0, contributionPercent: 0.01 },
      ];

      const result = filterQualifiedMembers(contributions);

      expect(result).toHaveLength(2);
      expect(result.map(r => r.empireId)).toEqual(["1", "2"]);
    });

    it("should include members at exactly threshold", () => {
      const contributions = [
        { empireId: "1", empireName: "A", damageDealt: 0, troopsCommitted: 0, attacksParticipated: 0, contributionPercent: MIN_CONTRIBUTION_PERCENT },
      ];

      const result = filterQualifiedMembers(contributions);
      expect(result).toHaveLength(1);
    });
  });

  describe("calculatePlanetAllocation", () => {
    it("should give all planets to single member", () => {
      expect(calculatePlanetAllocation(10, 1, 1)).toBe(10);
    });

    it("should split 60/40 for two members", () => {
      expect(calculatePlanetAllocation(10, 2, 1)).toBe(6);
      expect(calculatePlanetAllocation(10, 2, 2)).toBe(4);
    });

    it("should use tiered distribution for 3+ members", () => {
      // 10 planets, 3 members
      // Rank 1: 40% = 4
      // Rank 2: 30% = 3
      // Rank 3: 20% = 2
      expect(calculatePlanetAllocation(10, 3, 1)).toBe(4);
      expect(calculatePlanetAllocation(10, 3, 2)).toBe(3);
      expect(calculatePlanetAllocation(10, 3, 3)).toBe(2);
    });

    it("should handle zero planets", () => {
      expect(calculatePlanetAllocation(0, 3, 1)).toBe(0);
    });

    it("should handle invalid rank", () => {
      expect(calculatePlanetAllocation(10, 3, 0)).toBe(0);
    });
  });

  describe("calculateCreditAllocation", () => {
    it("should allocate credits proportionally", () => {
      expect(calculateCreditAllocation(10000, 0.5)).toBe(5000);
      expect(calculateCreditAllocation(10000, 0.3)).toBe(3000);
      expect(calculateCreditAllocation(10000, 0.2)).toBe(2000);
    });

    it("should floor the result", () => {
      expect(calculateCreditAllocation(10000, 0.333)).toBe(3330);
    });
  });

  describe("calculateReputationGain", () => {
    it("should give higher reputation to higher ranks", () => {
      const rank1 = calculateReputationGain(1);
      const rank2 = calculateReputationGain(2);
      const rank3 = calculateReputationGain(3);
      const rank4 = calculateReputationGain(4);

      expect(rank1).toBeGreaterThan(rank2);
      expect(rank2).toBeGreaterThan(rank3);
      expect(rank3).toBeGreaterThan(rank4);
    });

    it("should include base reputation", () => {
      const anyRank = calculateReputationGain(10);
      expect(anyRank).toBeGreaterThanOrEqual(REPUTATION_GAIN_BASE);
    });
  });

  describe("generateVictoryMessage", () => {
    it("should generate message for solo victory", () => {
      const message = generateVictoryMessage("Dark Emperor", 1);
      expect(message).toContain("lone empire");
      expect(message).toContain("Dark Emperor");
    });

    it("should generate message for duo victory", () => {
      const message = generateVictoryMessage("Dark Emperor", 2);
      expect(message).toContain("Two");
      expect(message).toContain("Dark Emperor");
    });

    it("should generate message for coalition victory", () => {
      const message = generateVictoryMessage("Dark Emperor", 5);
      expect(message).toContain("coalition of 5");
      expect(message).toContain("Dark Emperor");
    });
  });

  describe("distributeRewards", () => {
    const bossResult: BossDefeatResult = {
      bossEmpireId: "boss-1",
      bossName: "Dark Emperor",
      planetsToDistribute: 10,
      creditsLooted: 100000,
      defeatTurn: 50,
    };

    it("should distribute rewards to all qualified members", () => {
      const contributions = [
        createContribution("1", "Alpha", 1000, 500, 10),
        createContribution("2", "Beta", 800, 400, 8),
        createContribution("3", "Gamma", 600, 300, 6),
      ];

      const result = distributeRewards(contributions, bossResult);

      expect(result.bossDefeated).toBe("Dark Emperor");
      expect(result.distributions).toHaveLength(3);
      expect(result.distributions[0]!.contributionRank).toBe(1);
      expect(result.distributions[0]!.planetsAwarded).toBeGreaterThan(0);
      expect(result.distributions[0]!.creditsAwarded).toBeGreaterThan(0);
    });

    it("should filter out low contributors", () => {
      const contributions = [
        createContribution("1", "Major", 1000, 500, 10),
        createContribution("2", "Minor", 10, 5, 1), // Will be filtered (< 5%)
      ];

      const result = distributeRewards(contributions, bossResult);

      expect(result.distributions).toHaveLength(1);
      expect(result.distributions[0]!.empireId).toBe("1");
    });

    it("should handle single contributor", () => {
      const contributions = [
        createContribution("1", "Solo", 1000, 500, 10),
      ];

      const result = distributeRewards(contributions, bossResult);

      expect(result.distributions).toHaveLength(1);
      expect(result.distributions[0]!.planetsAwarded).toBe(10);
    });

    it("should handle no qualified contributors", () => {
      const contributions: CoalitionMemberContribution[] = [];

      const result = distributeRewards(contributions, bossResult);

      expect(result.distributions).toHaveLength(0);
      expect(result.totalPlanetsDistributed).toBe(0);
    });
  });

  describe("validateContributions", () => {
    it("should accept valid contributions", () => {
      const contributions = [
        createContribution("1", "A", 100, 50, 1),
        createContribution("2", "B", 200, 100, 2),
      ];

      const result = validateContributions(contributions);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject empty contributions", () => {
      const result = validateContributions([]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("No contributions provided");
    });

    it("should reject missing empireId", () => {
      const contributions = [
        { empireId: "", empireName: "A", damageDealt: 100, troopsCommitted: 50, attacksParticipated: 1 },
      ];

      const result = validateContributions(contributions);
      expect(result.valid).toBe(false);
    });

    it("should reject negative damage", () => {
      const contributions = [
        createContribution("1", "A", -100, 50, 1),
      ];

      const result = validateContributions(contributions);
      expect(result.valid).toBe(false);
    });
  });

  describe("getDistributionSummary", () => {
    it("should generate readable summary", () => {
      const result = distributeRewards(
        [
          createContribution("1", "Alpha Empire", 1000, 500, 10),
          createContribution("2", "Beta Empire", 500, 250, 5),
        ],
        {
          bossEmpireId: "boss",
          bossName: "Dark Lord",
          planetsToDistribute: 10,
          creditsLooted: 50000,
          defeatTurn: 50,
        }
      );

      const summary = getDistributionSummary(result);

      expect(summary.some(s => s.includes("Boss Defeated"))).toBe(true);
      expect(summary.some(s => s.includes("Dark Lord"))).toBe(true);
      expect(summary.some(s => s.includes("Alpha Empire"))).toBe(true);
      expect(summary.some(s => s.includes("reputation"))).toBe(true);
    });
  });

  describe("DISTRIBUTION_TIERS", () => {
    it("should sum to 1.0", () => {
      const total =
        DISTRIBUTION_TIERS.RANK_1_PERCENT +
        DISTRIBUTION_TIERS.RANK_2_PERCENT +
        DISTRIBUTION_TIERS.RANK_3_PERCENT +
        DISTRIBUTION_TIERS.REMAINING_PERCENT;

      expect(total).toBeCloseTo(1.0, 5);
    });
  });
});

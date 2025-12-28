/**
 * Syndicate Service Tests
 *
 * Tests for the Black Market trust system, contracts, and purchases.
 */

import { describe, it, expect } from "vitest";
import {
  getSyndicateTrustStatus,
  calculateTrustDecay,
  awardContractTrust,
  penalizeContractFailure,
  generateContractOffers,
  validateContractAcceptance,
  getBlackMarketCatalog,
  calculateBlackMarketPurchase,
  checkRecruitmentEligibility,
  getRecruitmentBonuses,
  calculateCoordinatorReport,
} from "../syndicate-service";

// =============================================================================
// TRUST LEVEL MANAGEMENT TESTS
// =============================================================================

describe("Syndicate Trust Management", () => {
  describe("getSyndicateTrustStatus", () => {
    it("should return unknown level for 0 trust points", () => {
      const status = getSyndicateTrustStatus(0, 0, 0, false, false);

      expect(status.trustLevel).toBe("unknown");
      expect(status.levelTitle).toBe("Unknown");
      expect(status.trustPoints).toBe(0);
      expect(status.contractsCompleted).toBe(0);
      expect(status.contractsFailed).toBe(0);
    });

    it("should calculate correct trust level from points", () => {
      const associate = getSyndicateTrustStatus(100, 1, 0, false, true);
      expect(associate.trustLevel).toBe("associate");
      expect(associate.levelTitle).toBe("Associate");

      const runner = getSyndicateTrustStatus(500, 3, 0, false, true);
      expect(runner.trustLevel).toBe("runner");

      const soldier = getSyndicateTrustStatus(1500, 5, 0, false, true);
      expect(soldier.trustLevel).toBe("soldier");

      const captain = getSyndicateTrustStatus(3500, 10, 1, false, true);
      expect(captain.trustLevel).toBe("captain");

      const lieutenant = getSyndicateTrustStatus(7000, 15, 2, false, true);
      expect(lieutenant.trustLevel).toBe("lieutenant");

      const underboss = getSyndicateTrustStatus(12000, 20, 3, false, true);
      expect(underboss.trustLevel).toBe("underboss");

      const consigliere = getSyndicateTrustStatus(20000, 25, 4, false, true);
      expect(consigliere.trustLevel).toBe("consigliere");

      const syndicateLord = getSyndicateTrustStatus(35000, 30, 5, false, true);
      expect(syndicateLord.trustLevel).toBe("syndicate_lord");
    });

    it("should calculate progress to next level", () => {
      // At 300 points (associate level, need 500 for runner)
      const status = getSyndicateTrustStatus(300, 2, 0, false, true);

      expect(status.trustLevel).toBe("associate");
      expect(status.pointsToNextLevel).toBe(200); // 500 - 300
      expect(status.nextLevelTitle).toBe("runner");
      expect(status.progressPercent).toBeCloseTo(50, 0); // 200/400 = 50%
    });

    it("should return null for next level at max trust", () => {
      const status = getSyndicateTrustStatus(40000, 50, 0, false, true);

      expect(status.trustLevel).toBe("syndicate_lord");
      expect(status.pointsToNextLevel).toBeNull();
      expect(status.nextLevelTitle).toBeNull();
      expect(status.progressPercent).toBe(100);
    });

    it("should track hostile status", () => {
      const hostile = getSyndicateTrustStatus(500, 5, 2, true, true);
      expect(hostile.isHostile).toBe(true);

      const friendly = getSyndicateTrustStatus(500, 5, 0, false, true);
      expect(friendly.isHostile).toBe(false);
    });

    it("should return available contracts based on trust level", () => {
      const unknown = getSyndicateTrustStatus(0, 0, 0, false, false);
      expect(unknown.availableContracts).toHaveLength(0);

      const associate = getSyndicateTrustStatus(100, 1, 0, false, true);
      expect(associate.availableContracts).toContain("supply_run");
      expect(associate.availableContracts).toContain("disruption");
      expect(associate.availableContracts).not.toContain("intimidation");

      const runner = getSyndicateTrustStatus(500, 3, 0, false, true);
      expect(runner.availableContracts).toContain("intimidation");
      expect(runner.availableContracts).toContain("economic_warfare");

      const captain = getSyndicateTrustStatus(3500, 10, 0, false, true);
      expect(captain.availableContracts).toContain("kingslayer");
    });

    it("should return correct price multiplier", () => {
      const associate = getSyndicateTrustStatus(100, 1, 0, false, true);
      expect(associate.priceMultiplier).toBe(2.0);

      const soldier = getSyndicateTrustStatus(1500, 5, 0, false, true);
      expect(soldier.priceMultiplier).toBe(1.5);

      const syndicateLord = getSyndicateTrustStatus(35000, 30, 0, false, true);
      expect(syndicateLord.priceMultiplier).toBe(1.0);
    });
  });

  describe("calculateTrustDecay", () => {
    it("should not decay if within decay interval", () => {
      const result = calculateTrustDecay(1000, 5);
      expect(result.newPoints).toBe(1000);
      expect(result.decayAmount).toBe(0);
    });

    it("should decay once after one interval", () => {
      const result = calculateTrustDecay(1000, 10);
      expect(result.newPoints).toBe(950); // 1000 * 0.95
      expect(result.decayAmount).toBe(50);
    });

    it("should decay multiple times for multiple intervals", () => {
      const result = calculateTrustDecay(1000, 30);
      // 3 intervals: 1000 -> 950 -> floor(902.5)=902 -> floor(856.9)=856
      expect(result.newPoints).toBe(856);
      expect(result.decayAmount).toBe(144);
    });

    it("should not go below 0", () => {
      const result = calculateTrustDecay(10, 100);
      expect(result.newPoints).toBeGreaterThanOrEqual(0);
    });

    it("should return 0 decay for 0 turns", () => {
      const result = calculateTrustDecay(1000, 0);
      expect(result.newPoints).toBe(1000);
      expect(result.decayAmount).toBe(0);
    });
  });

  describe("awardContractTrust", () => {
    it("should award base trust for completing contract", () => {
      const result = awardContractTrust(100, "supply_run", false);
      expect(result.trustEarned).toBe(10);
      expect(result.newPoints).toBe(110);
    });

    it("should apply 50% bonus for recruitees", () => {
      const result = awardContractTrust(100, "supply_run", true);
      expect(result.trustEarned).toBe(15); // 10 * 1.5
      expect(result.newPoints).toBe(115);
    });

    it("should return correct new trust level", () => {
      // At 90 points, completing supply_run (+10) should reach associate (100)
      const result = awardContractTrust(90, "supply_run", false);
      expect(result.newLevel).toBe("associate");
    });

    it("should award higher trust for higher tier contracts", () => {
      const tier1 = awardContractTrust(100, "supply_run", false);
      const tier2 = awardContractTrust(500, "intimidation", false);
      const tier3 = awardContractTrust(3500, "kingslayer", false);

      expect(tier1.trustEarned).toBe(10);
      expect(tier2.trustEarned).toBe(30);
      expect(tier3.trustEarned).toBe(100);
    });
  });

  describe("penalizeContractFailure", () => {
    it("should deduct 50% of trust reward on failure", () => {
      // supply_run trust reward is 10, so penalty is 5
      const result = penalizeContractFailure(200, "supply_run");
      expect(result.trustLost).toBe(5);
      expect(result.newPoints).toBe(195);
    });

    it("should not go below 0 points", () => {
      const result = penalizeContractFailure(2, "kingslayer");
      expect(result.newPoints).toBe(0);
      expect(result.trustLost).toBe(50); // 100 * 0.5
    });

    it("should detect level drop", () => {
      // At 105 points (associate), failing kingslayer (-50) drops to unknown
      const result = penalizeContractFailure(105, "kingslayer");
      expect(result.levelDropped).toBe(true);
      expect(result.newLevel).toBe("unknown");
    });

    it("should not report level drop if level maintained", () => {
      const result = penalizeContractFailure(1000, "supply_run");
      expect(result.levelDropped).toBe(false);
    });
  });
});

// =============================================================================
// CONTRACT MANAGEMENT TESTS
// =============================================================================

describe("Contract Management", () => {
  describe("generateContractOffers", () => {
    const mockTargets = [
      { id: "empire-1", name: "Empire One", networth: 100000, rank: 1 },
      { id: "empire-2", name: "Empire Two", networth: 80000, rank: 2 },
      { id: "empire-3", name: "Empire Three", networth: 60000, rank: 3 },
      { id: "empire-4", name: "Empire Four", networth: 40000, rank: 4 },
      { id: "empire-5", name: "Empire Five", networth: 20000, rank: 5 },
    ];

    it("should return empty array for unknown trust level", () => {
      const offers = generateContractOffers("unknown", 1, [], mockTargets);
      expect(offers).toHaveLength(0);
    });

    it("should return tier 1 contracts for associate level", () => {
      const offers = generateContractOffers("associate", 1, [], mockTargets);

      expect(offers.length).toBeGreaterThan(0);
      const types = offers.map((o) => o.type);
      expect(types).toContain("supply_run");
      expect(types).toContain("disruption");
      expect(types).not.toContain("intimidation"); // Requires runner
    });

    it("should exclude already active contract types", () => {
      const offers = generateContractOffers(
        "associate",
        1,
        ["supply_run", "disruption"],
        mockTargets
      );

      const types = offers.map((o) => o.type);
      expect(types).not.toContain("supply_run");
      expect(types).not.toContain("disruption");
    });

    it("should calculate correct deadline", () => {
      const currentTurn = 50;
      const offers = generateContractOffers(
        "associate",
        currentTurn,
        [],
        mockTargets
      );

      const supplyRun = offers.find((o) => o.type === "supply_run");
      expect(supplyRun?.deadline).toBe(currentTurn + 5); // 5 turns to complete
    });

    it("should mark contracts unavailable when no valid targets", () => {
      const offers = generateContractOffers("runner", 1, [], []);

      const intimidation = offers.find((o) => o.type === "intimidation");
      expect(intimidation?.isAvailable).toBe(false);
      expect(intimidation?.reasonIfUnavailable).toBe("No valid targets available");
    });

    it("should assign target for player contracts", () => {
      const offers = generateContractOffers("runner", 1, [], mockTargets);

      const intimidation = offers.find((o) => o.type === "intimidation");
      expect(intimidation?.targetEmpireId).toBeDefined();
      expect(intimidation?.targetEmpireName).toBeDefined();
    });

    it("should only target top 3 for kingslayer contracts", () => {
      const offers = generateContractOffers("captain", 1, [], mockTargets);

      const kingslayer = offers.find((o) => o.type === "kingslayer");
      expect(kingslayer?.isAvailable).toBe(true);
      if (kingslayer?.targetEmpireId) {
        const targetRank = mockTargets.find(
          (t) => t.id === kingslayer.targetEmpireId
        )?.rank;
        expect(targetRank).toBeLessThanOrEqual(3);
      }
    });

    it("should return higher tier contracts for higher trust", () => {
      const underboss = generateContractOffers("underboss", 1, [], mockTargets);

      const types = underboss.map((o) => o.type);
      expect(types).toContain("proxy_war");
      expect(types).toContain("scorched_earth");
    });
  });

  describe("validateContractAcceptance", () => {
    it("should reject if trust level too low", () => {
      const result = validateContractAcceptance(
        "associate",
        "intimidation", // Requires runner
        0
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Requires");
    });

    it("should reject if at max active contracts", () => {
      const result = validateContractAcceptance(
        "runner",
        "intimidation",
        3, // Max 3
        3
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Maximum");
    });

    it("should accept valid contract", () => {
      const result = validateContractAcceptance(
        "runner",
        "intimidation",
        1,
        3
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept contract at exact trust threshold", () => {
      const result = validateContractAcceptance(
        "associate",
        "supply_run",
        0
      );

      expect(result.valid).toBe(true);
    });
  });
});

// =============================================================================
// BLACK MARKET TESTS
// =============================================================================

describe("Black Market", () => {
  describe("getBlackMarketCatalog", () => {
    it("should return all items with unlock status", () => {
      const catalog = getBlackMarketCatalog("associate");

      expect(catalog.length).toBeGreaterThan(0);
      catalog.forEach((entry) => {
        expect(entry.itemId).toBeDefined();
        expect(entry.item).toBeDefined();
        expect(typeof entry.isUnlocked).toBe("boolean");
      });
    });

    it("should show basic components unlocked for associate", () => {
      const catalog = getBlackMarketCatalog("associate");

      const electronics = catalog.find((c) => c.itemId === "electronics");
      expect(electronics?.isUnlocked).toBe(true);
      expect(electronics?.price).toBe(4000); // 2000 * 2.0 multiplier
    });

    it("should lock advanced items for low trust", () => {
      const catalog = getBlackMarketCatalog("associate");

      const nuclear = catalog.find((c) => c.itemId === "nuclear_warhead");
      expect(nuclear?.isUnlocked).toBe(false);
      expect(nuclear?.price).toBeNull();
    });

    it("should apply trust level price multiplier", () => {
      const associateCatalog = getBlackMarketCatalog("associate");
      const soldierCatalog = getBlackMarketCatalog("soldier");

      const associatePrice = associateCatalog.find(
        (c) => c.itemId === "electronics"
      )?.price;
      const soldierPrice = soldierCatalog.find(
        (c) => c.itemId === "electronics"
      )?.price;

      expect(associatePrice).toBe(4000); // 2000 * 2.0
      expect(soldierPrice).toBe(3000); // 2000 * 1.5
    });

    it("should unlock all items for syndicate lord", () => {
      const catalog = getBlackMarketCatalog("syndicate_lord");

      const bioweapon = catalog.find((c) => c.itemId === "bioweapon_canister");
      expect(bioweapon?.isUnlocked).toBe(true);
      expect(bioweapon?.price).toBe(150000); // 1.0 multiplier
    });
  });

  describe("calculateBlackMarketPurchase", () => {
    it("should reject unknown items", () => {
      const result = calculateBlackMarketPurchase(
        "fake_item",
        1,
        "soldier",
        100000
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown");
    });

    it("should reject if trust too low", () => {
      const result = calculateBlackMarketPurchase(
        "nuclear_warhead",
        1,
        "soldier", // Needs consigliere
        200000
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("trust level");
    });

    it("should reject if insufficient credits", () => {
      const result = calculateBlackMarketPurchase(
        "electronics",
        10,
        "soldier",
        5000 // Not enough for 10 @ 3000 each
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Insufficient");
    });

    it("should reject multiple single-use items", () => {
      const result = calculateBlackMarketPurchase(
        "chemical_weapons",
        2, // Single-use: max 1
        "underboss",
        500000
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Single-use");
    });

    it("should calculate correct purchase cost", () => {
      const result = calculateBlackMarketPurchase(
        "electronics",
        5,
        "soldier",
        50000
      );

      expect(result.success).toBe(true);
      expect(result.creditsSpent).toBe(15000); // 5 * 3000 (with 1.5x multiplier)
      expect(result.resourceType).toBe("electronics");
      expect(result.quantity).toBe(5);
    });

    it("should allow single-use item purchase of 1", () => {
      const result = calculateBlackMarketPurchase(
        "chemical_weapons",
        1,
        "underboss",
        500000
      );

      expect(result.success).toBe(true);
      expect(result.creditsSpent).toBe(62500); // 50000 * 1.25
    });
  });
});

// =============================================================================
// RECRUITMENT TESTS
// =============================================================================

describe("Recruitment Mechanics", () => {
  describe("checkRecruitmentEligibility", () => {
    const networths = [100000, 80000, 60000, 40000, 20000, 10000]; // Descending

    it("should reject if already received invitation", () => {
      const result = checkRecruitmentEligibility(10000, networths, true);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("Already received");
    });

    it("should reject if in top 50%", () => {
      const result = checkRecruitmentEligibility(80000, networths, false);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("top");
    });

    it("should accept if in bottom 50%", () => {
      const result = checkRecruitmentEligibility(20000, networths, false);

      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should handle empty networth list", () => {
      const result = checkRecruitmentEligibility(10000, [], false);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("No empires");
    });

    it("should handle single empire", () => {
      const result = checkRecruitmentEligibility(10000, [10000], false);

      // Single empire is rank 1 of 1, percentile = 1.0 > 0.50, so eligible
      // (Edge case: lone empire is technically in "bottom 100%")
      expect(result.eligible).toBe(true);
    });

    it("should handle exact 50% threshold", () => {
      // 4 empires: ranks 1, 2, 3, 4. Bottom 50% = ranks 3, 4
      const fourNetworths = [100, 75, 50, 25];
      const atThreshold = checkRecruitmentEligibility(50, fourNetworths, false);

      // At 50%, percentile = 0.75 (rank 3 of 4), which is > 0.50, so eligible
      expect(atThreshold.eligible).toBe(true);
    });
  });

  describe("getRecruitmentBonuses", () => {
    it("should return correct startup funds", () => {
      const bonuses = getRecruitmentBonuses();
      expect(bonuses.startupFunds).toBe(10000);
    });

    it("should return correct trust bonus percentage", () => {
      const bonuses = getRecruitmentBonuses();
      expect(bonuses.trustBonusPercent).toBe(50);
    });
  });
});

// =============================================================================
// COORDINATOR REPORTING TESTS
// =============================================================================

describe("Coordinator Reporting", () => {
  describe("calculateCoordinatorReport", () => {
    it("should reset trust to 0", () => {
      const result = calculateCoordinatorReport(5000, 100000);

      expect(result.trustReset).toBe(true);
      expect(result.newTrustPoints).toBe(0);
    });

    it("should calculate funding bonus", () => {
      const result = calculateCoordinatorReport(5000, 100000);

      expect(result.fundingBonusPercent).toBe(10);
      expect(result.fundingIncrease).toBe(10000); // 100000 * 0.10
    });

    it("should flag syndicate as hostile", () => {
      const result = calculateCoordinatorReport(5000, 100000);

      expect(result.becomesHostile).toBe(true);
    });

    it("should provide risk description", () => {
      const result = calculateCoordinatorReport(5000, 100000);

      expect(result.riskDescription).toBeDefined();
      expect(result.riskDescription.length).toBeGreaterThan(0);
    });
  });
});

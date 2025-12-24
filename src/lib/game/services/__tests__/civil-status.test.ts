/**
 * Civil Status Service Tests
 *
 * Comprehensive test suite for civil status mechanics:
 * - Income multiplier calculation
 * - Status upgrade/downgrade logic
 * - Event-based evaluation
 * - Edge cases
 */

import { describe, it, expect } from "vitest";
import {
  getIncomeMultiplier,
  shouldDowngradeStatus,
  shouldUpgradeStatus,
  evaluateCivilStatus,
  type CivilStatusEvent,
} from "../civil-status";
import type { CivilStatusLevel } from "../../constants";

describe("Civil Status Service", () => {
  describe("getIncomeMultiplier", () => {
    it("should return correct multiplier for ecstatic status", () => {
      expect(getIncomeMultiplier("ecstatic")).toBe(4.0);
    });

    it("should return correct multiplier for happy status", () => {
      expect(getIncomeMultiplier("happy")).toBe(3.0);
    });

    it("should return correct multiplier for content status", () => {
      expect(getIncomeMultiplier("content")).toBe(2.0);
    });

    it("should return correct multiplier for neutral status", () => {
      expect(getIncomeMultiplier("neutral")).toBe(1.0);
    });

    it("should return correct multiplier for unhappy status", () => {
      // PRD: "0× (no bonus)" means baseline (1×) with no bonus
      expect(getIncomeMultiplier("unhappy")).toBe(1.0);
    });

    it("should return correct multiplier for angry status", () => {
      // Extrapolated: 25% penalty
      expect(getIncomeMultiplier("angry")).toBe(0.75);
    });

    it("should return correct multiplier for rioting status", () => {
      // Extrapolated: 50% penalty
      expect(getIncomeMultiplier("rioting")).toBe(0.5);
    });

    it("should return correct multiplier for revolting status", () => {
      // Extrapolated: 75% penalty (near collapse)
      expect(getIncomeMultiplier("revolting")).toBe(0.25);
    });
  });

  describe("shouldDowngradeStatus - Starvation", () => {
    it("should downgrade on starvation event", () => {
      const events: CivilStatusEvent[] = [{ type: "starvation" }];
      expect(shouldDowngradeStatus("content", events)).toBe(true);
    });

    it("should downgrade from any status on starvation", () => {
      const events: CivilStatusEvent[] = [{ type: "starvation" }];
      expect(shouldDowngradeStatus("ecstatic", events)).toBe(true);
      expect(shouldDowngradeStatus("happy", events)).toBe(true);
      expect(shouldDowngradeStatus("neutral", events)).toBe(true);
    });

    it("should not downgrade from revolting (already at bottom)", () => {
      const events: CivilStatusEvent[] = [{ type: "starvation" }];
      expect(shouldDowngradeStatus("revolting", events)).toBe(false);
    });
  });

  describe("shouldDowngradeStatus - Food Deficit", () => {
    it("should downgrade after 2 consecutive food deficit turns", () => {
      const events: CivilStatusEvent[] = [
        { type: "food_deficit", consecutiveTurns: 2 },
      ];
      expect(shouldDowngradeStatus("content", events)).toBe(true);
    });

    it("should downgrade after 3+ consecutive food deficit turns", () => {
      const events: CivilStatusEvent[] = [
        { type: "food_deficit", consecutiveTurns: 5 },
      ];
      expect(shouldDowngradeStatus("content", events)).toBe(true);
    });

    it("should not downgrade with only 1 turn of food deficit", () => {
      const events: CivilStatusEvent[] = [
        { type: "food_deficit", consecutiveTurns: 1 },
      ];
      expect(shouldDowngradeStatus("content", events)).toBe(false);
    });

    it("should not downgrade without consecutiveTurns specified", () => {
      const events: CivilStatusEvent[] = [{ type: "food_deficit" }];
      expect(shouldDowngradeStatus("content", events)).toBe(false);
    });
  });

  describe("shouldDowngradeStatus - Defeat", () => {
    it("should downgrade on major battle losses (30%+ casualties)", () => {
      const events: CivilStatusEvent[] = [
        { type: "defeat", severity: 0.3 },
      ];
      expect(shouldDowngradeStatus("content", events)).toBe(true);
    });

    it("should downgrade on severe battle losses (50%+ casualties)", () => {
      const events: CivilStatusEvent[] = [
        { type: "defeat", severity: 0.5 },
      ];
      expect(shouldDowngradeStatus("content", events)).toBe(true);
    });

    it("should not downgrade on minor battle losses (<30% casualties)", () => {
      const events: CivilStatusEvent[] = [
        { type: "defeat", severity: 0.2 },
      ];
      expect(shouldDowngradeStatus("content", events)).toBe(false);
    });
  });

  describe("shouldDowngradeStatus - High Maintenance", () => {
    it("should downgrade when maintenance burden is very high (>80%)", () => {
      const events: CivilStatusEvent[] = [
        { type: "high_maintenance", severity: 0.85 },
      ];
      expect(shouldDowngradeStatus("content", events)).toBe(true);
    });

    it("should not downgrade when maintenance burden is moderate", () => {
      const events: CivilStatusEvent[] = [
        { type: "high_maintenance", severity: 0.6 },
      ];
      expect(shouldDowngradeStatus("content", events)).toBe(false);
    });
  });

  describe("shouldUpgradeStatus - Food Surplus", () => {
    it("should upgrade after 5 consecutive food surplus turns", () => {
      const events: CivilStatusEvent[] = [
        { type: "food_surplus", consecutiveTurns: 5 },
      ];
      expect(shouldUpgradeStatus("content", events)).toBe(true);
    });

    it("should upgrade after 10+ consecutive food surplus turns", () => {
      const events: CivilStatusEvent[] = [
        { type: "food_surplus", consecutiveTurns: 10 },
      ];
      expect(shouldUpgradeStatus("content", events)).toBe(true);
    });

    it("should not upgrade with only 3 turns of food surplus", () => {
      const events: CivilStatusEvent[] = [
        { type: "food_surplus", consecutiveTurns: 3 },
      ];
      expect(shouldUpgradeStatus("content", events)).toBe(false);
    });

    it("should not upgrade from ecstatic (already at top)", () => {
      const events: CivilStatusEvent[] = [
        { type: "food_surplus", consecutiveTurns: 10 },
      ];
      expect(shouldUpgradeStatus("ecstatic", events)).toBe(false);
    });
  });

  describe("shouldUpgradeStatus - Victory", () => {
    it("should upgrade after 3 consecutive victories", () => {
      const events: CivilStatusEvent[] = [
        { type: "victory", consecutiveTurns: 3 },
      ];
      expect(shouldUpgradeStatus("content", events)).toBe(true);
    });

    it("should not upgrade with only 2 victories", () => {
      const events: CivilStatusEvent[] = [
        { type: "victory", consecutiveTurns: 2 },
      ];
      expect(shouldUpgradeStatus("content", events)).toBe(false);
    });
  });

  describe("shouldUpgradeStatus - Education", () => {
    it("should upgrade with education event", () => {
      const events: CivilStatusEvent[] = [{ type: "education" }];
      expect(shouldUpgradeStatus("content", events)).toBe(true);
    });
  });

  describe("shouldUpgradeStatus - Low Maintenance", () => {
    it("should upgrade when maintenance is very low (<30%)", () => {
      const events: CivilStatusEvent[] = [
        { type: "low_maintenance", severity: 0.2 },
      ];
      expect(shouldUpgradeStatus("content", events)).toBe(true);
    });

    it("should not upgrade when maintenance is moderate", () => {
      const events: CivilStatusEvent[] = [
        { type: "low_maintenance", severity: 0.5 },
      ];
      expect(shouldUpgradeStatus("content", events)).toBe(false);
    });
  });

  describe("evaluateCivilStatus - Downgrades", () => {
    it("should downgrade from content to neutral on food deficit", () => {
      const events: CivilStatusEvent[] = [
        { type: "food_deficit", consecutiveTurns: 3 },
      ];
      const result = evaluateCivilStatus("content", events);

      expect(result.oldStatus).toBe("content");
      expect(result.newStatus).toBe("neutral");
      expect(result.reason).toBe("Prolonged food deficit");
      expect(result.multiplier).toBe(1.0);
      expect(result.changed).toBe(true);
    });

    it("should downgrade from content to neutral on starvation", () => {
      const events: CivilStatusEvent[] = [{ type: "starvation" }];
      const result = evaluateCivilStatus("content", events);

      expect(result.oldStatus).toBe("content");
      expect(result.newStatus).toBe("neutral");
      expect(result.reason).toBe("Population starvation");
      expect(result.multiplier).toBe(1.0);
      expect(result.changed).toBe(true);
    });

    it("should downgrade on major battle losses", () => {
      const events: CivilStatusEvent[] = [
        { type: "defeat", severity: 0.4 },
      ];
      const result = evaluateCivilStatus("happy", events);

      expect(result.oldStatus).toBe("happy");
      expect(result.newStatus).toBe("content");
      expect(result.reason).toBe("Major battle losses");
      expect(result.changed).toBe(true);
    });

    it("should not downgrade below revolting", () => {
      const events: CivilStatusEvent[] = [{ type: "starvation" }];
      const result = evaluateCivilStatus("revolting", events);

      expect(result.oldStatus).toBe("revolting");
      expect(result.newStatus).toBe("revolting");
      expect(result.changed).toBe(false);
    });
  });

  describe("evaluateCivilStatus - Upgrades", () => {
    it("should upgrade from content to happy on food surplus", () => {
      const events: CivilStatusEvent[] = [
        { type: "food_surplus", consecutiveTurns: 5 },
      ];
      const result = evaluateCivilStatus("content", events);

      expect(result.oldStatus).toBe("content");
      expect(result.newStatus).toBe("happy");
      expect(result.reason).toBe("Sustained food surplus");
      expect(result.multiplier).toBe(3.0);
      expect(result.changed).toBe(true);
    });

    it("should upgrade on multiple victories", () => {
      const events: CivilStatusEvent[] = [
        { type: "victory", consecutiveTurns: 3 },
      ];
      const result = evaluateCivilStatus("neutral", events);

      expect(result.oldStatus).toBe("neutral");
      expect(result.newStatus).toBe("content");
      expect(result.reason).toBe("Multiple victories");
      expect(result.changed).toBe(true);
    });

    it("should upgrade on education improvements", () => {
      const events: CivilStatusEvent[] = [{ type: "education" }];
      const result = evaluateCivilStatus("neutral", events);

      expect(result.oldStatus).toBe("neutral");
      expect(result.newStatus).toBe("content");
      expect(result.reason).toBe("Education improvements");
      expect(result.changed).toBe(true);
    });

    it("should not upgrade above ecstatic", () => {
      const events: CivilStatusEvent[] = [
        { type: "food_surplus", consecutiveTurns: 10 },
      ];
      const result = evaluateCivilStatus("ecstatic", events);

      expect(result.oldStatus).toBe("ecstatic");
      expect(result.newStatus).toBe("ecstatic");
      expect(result.changed).toBe(false);
    });
  });

  describe("evaluateCivilStatus - No Change", () => {
    it("should not change status with no events", () => {
      const result = evaluateCivilStatus("content", []);

      expect(result.oldStatus).toBe("content");
      expect(result.newStatus).toBe("content");
      expect(result.reason).toBe("No significant events");
      expect(result.multiplier).toBe(2.0);
      expect(result.changed).toBe(false);
    });

    it("should not change status with insufficient event severity", () => {
      const events: CivilStatusEvent[] = [
        { type: "food_deficit", consecutiveTurns: 1 },
      ];
      const result = evaluateCivilStatus("content", events);

      expect(result.changed).toBe(false);
    });
  });

  describe("evaluateCivilStatus - Priority", () => {
    it("should prioritize downgrades over upgrades", () => {
      // Both downgrade and upgrade triggers present
      const events: CivilStatusEvent[] = [
        { type: "starvation" },
        { type: "food_surplus", consecutiveTurns: 10 },
      ];
      const result = evaluateCivilStatus("content", events);

      // Starvation (downgrade) should take priority
      expect(result.newStatus).toBe("neutral");
      expect(result.reason).toBe("Population starvation");
      expect(result.changed).toBe(true);
    });
  });

  describe("evaluateCivilStatus - Full Spectrum", () => {
    const statuses: CivilStatusLevel[] = [
      "ecstatic",
      "happy",
      "content",
      "neutral",
      "unhappy",
      "angry",
      "rioting",
      "revolting",
    ];

    it("should handle all 8 status levels correctly", () => {
      statuses.forEach((status) => {
        const result = evaluateCivilStatus(status, []);
        expect(result.oldStatus).toBe(status);
        expect(result.newStatus).toBe(status);
        expect(result.changed).toBe(false);
      });
    });

    it("should return correct multipliers for all statuses", () => {
      // Updated to match corrected PRD interpretation
      // "0× (no bonus)" for unhappy = 1.0 baseline
      const expectedMultipliers = [4.0, 3.0, 2.0, 1.0, 1.0, 0.75, 0.5, 0.25];

      statuses.forEach((status, index) => {
        const result = evaluateCivilStatus(status, []);
        expect(result.multiplier).toBe(expectedMultipliers[index]);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle multiple events of same type", () => {
      const events: CivilStatusEvent[] = [
        { type: "food_deficit", consecutiveTurns: 3 },
        { type: "food_deficit", consecutiveTurns: 5 },
      ];
      const result = evaluateCivilStatus("content", events);

      expect(result.changed).toBe(true);
      expect(result.newStatus).toBe("neutral");
    });

    it("should handle mixed event types", () => {
      const events: CivilStatusEvent[] = [
        { type: "defeat", severity: 0.2 }, // Too low to trigger
        { type: "victory", consecutiveTurns: 1 }, // Too low to trigger
      ];
      const result = evaluateCivilStatus("content", events);

      expect(result.changed).toBe(false);
    });

    it("should handle events with missing optional fields", () => {
      const events: CivilStatusEvent[] = [
        { type: "food_deficit" }, // Missing consecutiveTurns
      ];
      const result = evaluateCivilStatus("content", events);

      expect(result.changed).toBe(false);
    });
  });
});

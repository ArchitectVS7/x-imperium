/**
 * Combat Configuration Loader Tests
 *
 * Validates that the combat configuration loader correctly loads
 * values from the JSON config file.
 */

import { describe, it, expect } from "vitest";
import {
  getCombatConfig,
  getUnifiedDefenderBonus,
  getUnifiedPowerMultiplier,
  getLegacyDefenderAdvantage,
  getLegacyPowerMultiplier,
  getLegacyDiversityBonus,
  getBaseCasualtyRate,
  getMinCasualtyRate,
  getMaxCasualtyRate,
} from "./combat-loader";

describe("Combat Configuration Loader", () => {
  describe("getCombatConfig", () => {
    it("should load the complete configuration", () => {
      const config = getCombatConfig();
      expect(config).toBeDefined();
      expect(config.unified).toBeDefined();
      expect(config.legacy).toBeDefined();
      expect(config.casualties).toBeDefined();
    });
  });

  describe("Unified Combat Config", () => {
    it("should load defender bonus", () => {
      const defenderBonus = getUnifiedDefenderBonus();
      expect(defenderBonus).toBe(1.10);
    });

    it("should load power multipliers", () => {
      expect(getUnifiedPowerMultiplier('soldiers')).toBe(1);
      expect(getUnifiedPowerMultiplier('fighters')).toBe(3);
      expect(getUnifiedPowerMultiplier('stations')).toBe(40);
      expect(getUnifiedPowerMultiplier('lightCruisers')).toBe(5);
      expect(getUnifiedPowerMultiplier('heavyCruisers')).toBe(8);
      expect(getUnifiedPowerMultiplier('carriers')).toBe(2);
    });

    it("should return 1 for unknown unit types", () => {
      expect(getUnifiedPowerMultiplier('unknown')).toBe(1);
    });
  });

  describe("Legacy Combat Config", () => {
    it("should load defender advantage", () => {
      const defenderAdvantage = getLegacyDefenderAdvantage();
      expect(defenderAdvantage).toBe(1.2);
    });

    it("should load power multipliers", () => {
      expect(getLegacyPowerMultiplier('soldiers')).toBe(1);
      expect(getLegacyPowerMultiplier('fighters')).toBe(1);
      expect(getLegacyPowerMultiplier('stations')).toBe(40);
      expect(getLegacyPowerMultiplier('lightCruisers')).toBe(4);
      expect(getLegacyPowerMultiplier('heavyCruisers')).toBe(4);
      expect(getLegacyPowerMultiplier('carriers')).toBe(12);
    });

    it("should load diversity bonus config", () => {
      const diversityBonus = getLegacyDiversityBonus();
      expect(diversityBonus.minUnitTypes).toBe(4);
      expect(diversityBonus.bonusMultiplier).toBe(1.15);
    });

    it("should return 1 for unknown unit types", () => {
      expect(getLegacyPowerMultiplier('unknown')).toBe(1);
    });
  });

  describe("Casualty Config", () => {
    it("should load casualty rates", () => {
      expect(getBaseCasualtyRate()).toBe(0.25);
      expect(getMinCasualtyRate()).toBe(0.15);
      expect(getMaxCasualtyRate()).toBe(0.35);
    });
  });

  describe("Station Power Consistency", () => {
    it("should have consistent station power between unified and legacy systems", () => {
      // Both systems should use the same station power value (40)
      // to avoid confusion and potential bugs when systems interact
      expect(getUnifiedPowerMultiplier('stations')).toBe(40);
      expect(getLegacyPowerMultiplier('stations')).toBe(40);
      expect(getUnifiedPowerMultiplier('stations')).toBe(getLegacyPowerMultiplier('stations'));
    });
  });
});

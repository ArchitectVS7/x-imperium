/**
 * M3 Integration Tests
 *
 * End-to-end tests for Milestone 3 features focusing on pure functions:
 * - Sector cost scaling with ownership
 * - Build times and unit costs
 * - Military unit validation and maintenance calculations
 * - Research system cost formulas
 * - Unit upgrade bonuses
 *
 * Note: Database interaction tests are covered by individual service tests.
 */

import { describe, it, expect } from "vitest";

// Unit service - pure functions
import {
  validateBuild,
  isUnitLocked,
  calculateUnitMaintenance,
  calculateTotalMaintenance,
  type UnitCounts,
} from "../military/unit-service";

// Config imports
import { UNIT_BUILD_TIMES } from "../../build-config";
import { calculateSectorCost, calculateReleaseRefund } from "@/lib/formulas/sector-costs";
import {
  UNIT_COSTS,
  UNIT_POPULATION,
  UNIT_MAINTENANCE,
} from "../../unit-config";
import { UPGRADE_COSTS, MAX_UPGRADE_LEVEL, getUpgradeBonuses } from "../../upgrade-config";
import { calculateResearchCost } from "@/lib/formulas/research-costs";

// =============================================================================
// SECTOR MANAGEMENT INTEGRATION TESTS
// =============================================================================

describe("M3 Integration: Sector Management", () => {
  describe("Cost Scaling", () => {
    it("should increase cost with more owned sectors", () => {
      // Base cost for food sector is 1000
      const baseCost = 1000;

      // Costs should increase with more sectors
      const cost0Sectors = calculateSectorCost(baseCost, 0);
      const cost5Sectors = calculateSectorCost(baseCost, 5);
      const cost10Sectors = calculateSectorCost(baseCost, 10);
      const cost20Sectors = calculateSectorCost(baseCost, 20);

      expect(cost5Sectors).toBeGreaterThan(cost0Sectors);
      expect(cost10Sectors).toBeGreaterThan(cost5Sectors);
      expect(cost20Sectors).toBeGreaterThan(cost10Sectors);
    });

    it("should apply 50% refund on release", () => {
      // Refund should be 50% of current cost
      const baseCost = 1000;
      const currentCost = calculateSectorCost(baseCost, 10);
      const refund = calculateReleaseRefund(baseCost, 10);

      expect(refund).toBe(Math.floor(currentCost * 0.5));
    });
  });
});

// =============================================================================
// BUILD QUEUE INTEGRATION TESTS
// =============================================================================

describe("M3 Integration: Build Queue System", () => {
  describe("Build Times", () => {
    it("should have correct build times for all unit types", () => {
      // Verify build times from config
      expect(UNIT_BUILD_TIMES.soldiers).toBe(1);
      expect(UNIT_BUILD_TIMES.fighters).toBe(1);
      expect(UNIT_BUILD_TIMES.lightCruisers).toBe(2);
      expect(UNIT_BUILD_TIMES.heavyCruisers).toBe(2);
      expect(UNIT_BUILD_TIMES.carriers).toBe(3);
      expect(UNIT_BUILD_TIMES.stations).toBe(3);
      expect(UNIT_BUILD_TIMES.covertAgents).toBe(2);
    });

    it("should have correct unit costs from unit-config", () => {
      expect(UNIT_COSTS.soldiers).toBe(50);
      expect(UNIT_COSTS.fighters).toBe(200);
      expect(UNIT_COSTS.lightCruisers).toBe(500);
      expect(UNIT_COSTS.heavyCruisers).toBe(1000);
      expect(UNIT_COSTS.carriers).toBe(2500);
      expect(UNIT_COSTS.stations).toBe(5000);
      expect(UNIT_COSTS.covertAgents).toBe(4090);
    });
  });
});

// =============================================================================
// MILITARY UNIT VALIDATION INTEGRATION TESTS
// =============================================================================

describe("M3 Integration: Military Unit Validation", () => {
  describe("Light Cruiser Research Lock", () => {
    it("should lock Light Cruisers when research level < 2", () => {
      const lockAt0 = isUnitLocked("lightCruisers", 0);
      expect(lockAt0.isLocked).toBe(true);

      const lockAt1 = isUnitLocked("lightCruisers", 1);
      expect(lockAt1.isLocked).toBe(true);
    });

    it("should unlock Light Cruisers when research level >= 2", () => {
      const lockAt2 = isUnitLocked("lightCruisers", 2);
      expect(lockAt2.isLocked).toBe(false);

      const lockAt7 = isUnitLocked("lightCruisers", 7);
      expect(lockAt7.isLocked).toBe(false);
    });
  });

  describe("Unit Maintenance Calculation", () => {
    it("should calculate correct maintenance for all unit types", () => {
      const unitCounts: UnitCounts = {
        soldiers: 100,      // 100 * 0.5 = 50
        fighters: 50,       // 50 * 2 = 100
        stations: 5,        // 5 * 50 = 250
        lightCruisers: 10,  // 10 * 5 = 50
        heavyCruisers: 10,  // 10 * 10 = 100
        carriers: 2,        // 2 * 25 = 50
        covertAgents: 5,    // 5 * 40 = 200
      };

      const maintenance = calculateUnitMaintenance(unitCounts);

      // Total: 50 + 100 + 250 + 50 + 100 + 50 + 200 = 800
      expect(maintenance.totalCost).toBe(800);
      expect(maintenance.byUnit.soldiers.cost).toBe(50);
      expect(maintenance.byUnit.fighters.cost).toBe(100);
      expect(maintenance.byUnit.stations.cost).toBe(250);
      expect(maintenance.byUnit.lightCruisers.cost).toBe(50);
      expect(maintenance.byUnit.heavyCruisers.cost).toBe(100);
      expect(maintenance.byUnit.carriers.cost).toBe(50);
      expect(maintenance.byUnit.covertAgents.cost).toBe(200);
    });

    it("should match PRD maintenance rates", () => {
      // Verify maintenance rates from config match PRD 6.1
      expect(UNIT_MAINTENANCE.soldiers).toBe(0.5);
      expect(UNIT_MAINTENANCE.fighters).toBe(2);
      expect(UNIT_MAINTENANCE.stations).toBe(50);
      expect(UNIT_MAINTENANCE.lightCruisers).toBe(5);
      expect(UNIT_MAINTENANCE.heavyCruisers).toBe(10);
      expect(UNIT_MAINTENANCE.carriers).toBe(25);
      expect(UNIT_MAINTENANCE.covertAgents).toBe(40);
    });
  });

  describe("Build Validation", () => {
    it("should validate credits requirement", () => {
      // 100 soldiers at 50 each = 5000 credits, only have 1000
      const result = validateBuild("soldiers", 100, 1000, 10000, 0);

      expect(result.canBuild).toBe(false);
      expect(result.errors.some(e => e.includes("Insufficient credits"))).toBe(true);
    });

    it("should validate population requirement", () => {
      // Carriers require 3 population each, 100 carriers = 300 population
      // Only have 100
      const result = validateBuild("carriers", 100, 1000000, 100, 0);

      expect(result.canBuild).toBe(false);
      expect(result.errors.some(e => e.includes("Insufficient population"))).toBe(true);
    });

    it("should validate research lock for Light Cruisers", () => {
      // Light Cruisers require research level 2
      const result = validateBuild("lightCruisers", 10, 1000000, 10000, 1);

      expect(result.canBuild).toBe(false);
      expect(result.errors.some(e => e.includes("Fundamental Research Level 2"))).toBe(true);
    });

    it("should pass validation when all requirements met", () => {
      // Light Cruisers: enough credits, population, research level 2
      const result = validateBuild("lightCruisers", 10, 100000, 10000, 2);

      expect(result.canBuild).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });
});

// =============================================================================
// RESEARCH SYSTEM INTEGRATION TESTS
// =============================================================================

describe("M3 Integration: Research System", () => {
  describe("Research Cost Formula", () => {
    it("should have exponential cost formula (1000 * 2^level)", () => {
      // Level 0 -> 1: 1000 * 2^0 = 1000
      expect(calculateResearchCost(0)).toBe(1000);

      // Level 1 -> 2: 1000 * 2^1 = 2000
      expect(calculateResearchCost(1)).toBe(2000);

      // Level 2 -> 3: 1000 * 2^2 = 4000
      expect(calculateResearchCost(2)).toBe(4000);

      // Level 3 -> 4: 1000 * 2^3 = 8000
      expect(calculateResearchCost(3)).toBe(8000);

      // Level 4 -> 5: 1000 * 2^4 = 16000
      expect(calculateResearchCost(4)).toBe(16000);

      // Level 5 -> 6: 1000 * 2^5 = 32000
      expect(calculateResearchCost(5)).toBe(32000);

      // Level 6 -> 7: 1000 * 2^6 = 64000
      expect(calculateResearchCost(6)).toBe(64000);
    });
  });

  describe("8 Research Levels", () => {
    it("should have exponential cost structure for all levels", () => {
      // Test each level has correct exponential cost
      for (let level = 0; level < 7; level++) {
        const cost = calculateResearchCost(level);
        const expectedCost = 1000 * Math.pow(2, level);
        expect(cost).toBe(expectedCost);
      }
    });
  });
});

// =============================================================================
// UNIT UPGRADES INTEGRATION TESTS
// =============================================================================

describe("M3 Integration: Unit Upgrades", () => {
  describe("3 Upgrade Levels", () => {
    it("should support levels 0, 1, 2", () => {
      expect(MAX_UPGRADE_LEVEL).toBe(2);

      // Verify upgrade costs
      expect(UPGRADE_COSTS[0]).toBe(500);   // 0 -> 1
      expect(UPGRADE_COSTS[1]).toBe(1000);  // 1 -> 2
    });
  });

  describe("Upgrade Bonuses (PRD 9.2)", () => {
    it("should return correct soldier bonuses per level", () => {
      // Level 0
      const level0 = getUpgradeBonuses("soldiers", 0);
      expect(level0.guerilla).toBe(1.0);
      expect(level0.ground).toBe(1.0);
      expect(level0.pirate).toBe(0.5);

      // Level 1
      const level1 = getUpgradeBonuses("soldiers", 1);
      expect(level1.guerilla).toBe(1.5);
      expect(level1.ground).toBe(1.0);
      expect(level1.pirate).toBe(1.0);

      // Level 2
      const level2 = getUpgradeBonuses("soldiers", 2);
      expect(level2.guerilla).toBe(0.5);
      expect(level2.ground).toBe(2.0);
      expect(level2.pirate).toBe(2.0);
    });

    it("should return correct carrier bonuses per level", () => {
      // Level 0
      const level0 = getUpgradeBonuses("carriers", 0);
      expect(level0.toughness).toBe(1.0);
      expect(level0.speed).toBe(1.0);
      expect(level0.cargo).toBe(1.0);

      // Level 1
      const level1 = getUpgradeBonuses("carriers", 1);
      expect(level1.toughness).toBe(2.0);
      expect(level1.speed).toBe(2.0);
      expect(level1.cargo).toBe(0.5);

      // Level 2
      const level2 = getUpgradeBonuses("carriers", 2);
      expect(level2.toughness).toBe(4.0);
      expect(level2.speed).toBe(4.0);
      expect(level2.cargo).toBe(0.25);
    });

    it("should return generic combat bonuses for other units", () => {
      const units = ["fighters", "stations", "lightCruisers", "heavyCruisers"] as const;

      for (const unit of units) {
        const level0 = getUpgradeBonuses(unit, 0);
        expect(level0.attack).toBe(1.0);
        expect(level0.defense).toBe(1.0);

        const level1 = getUpgradeBonuses(unit, 1);
        expect(level1.attack).toBe(1.25);
        expect(level1.defense).toBe(1.25);

        const level2 = getUpgradeBonuses(unit, 2);
        expect(level2.attack).toBe(1.5);
        expect(level2.defense).toBe(1.5);
      }
    });

    it("should return covert agent bonuses per level", () => {
      // Level 0
      const level0 = getUpgradeBonuses("covertAgents", 0);
      expect(level0.stealth).toBe(1.0);
      expect(level0.effectiveness).toBe(1.0);

      // Level 1
      const level1 = getUpgradeBonuses("covertAgents", 1);
      expect(level1.stealth).toBe(1.5);
      expect(level1.effectiveness).toBe(1.25);

      // Level 2
      const level2 = getUpgradeBonuses("covertAgents", 2);
      expect(level2.stealth).toBe(2.0);
      expect(level2.effectiveness).toBe(1.5);
    });
  });
});

// =============================================================================
// FULL TURN PROCESSING INTEGRATION TESTS
// =============================================================================

describe("M3 Integration: Full Turn Processing", () => {
  describe("Combined Maintenance", () => {
    it("should calculate total maintenance (sectors + units)", () => {
      const sectorCount = 10;
      const unitCounts: UnitCounts = {
        soldiers: 100,      // 100 * 0.5 = 50
        fighters: 50,       // 50 * 2 = 100
        stations: 5,        // 5 * 50 = 250
        lightCruisers: 0,   // 0
        heavyCruisers: 10,  // 10 * 10 = 100
        carriers: 2,        // 2 * 25 = 50
        covertAgents: 5,    // 5 * 40 = 200
      };

      // Sector maintenance: 10 * 168 = 1680 (default)
      // Unit maintenance: 50 + 100 + 250 + 0 + 100 + 50 + 200 = 750

      const totalMaint = calculateTotalMaintenance(sectorCount, unitCounts);
      expect(totalMaint.unitCost).toBe(750);
      expect(totalMaint.sectorCost).toBe(1680);
      expect(totalMaint.totalCost).toBe(1680 + 750);
    });
  });

  describe("End-to-End Scenarios", () => {
    it("should handle research -> unlock -> build flow", () => {
      // 1. Start at research level 0
      // 2. Light Cruisers locked
      expect(isUnitLocked("lightCruisers", 0).isLocked).toBe(true);
      expect(isUnitLocked("lightCruisers", 1).isLocked).toBe(true);

      // 3. Reach research level 2
      // 4. Light Cruisers unlocked
      expect(isUnitLocked("lightCruisers", 2).isLocked).toBe(false);

      // 5. Build validation should pass
      const validation = validateBuild("lightCruisers", 10, 100000, 10000, 2);
      expect(validation.canBuild).toBe(true);
    });

    it("should handle upgrade -> bonus application flow", () => {
      // Level 0 soldiers: base stats
      const baseBonuses = getUpgradeBonuses("soldiers", 0);
      expect(baseBonuses.pirate).toBe(0.5); // Weak against pirates

      // Level 2 soldiers: enhanced anti-pirate
      const upgradedBonuses = getUpgradeBonuses("soldiers", 2);
      expect(upgradedBonuses.pirate).toBe(2.0); // Strong against pirates
    });
  });
});

// =============================================================================
// PRD COMPLIANCE VERIFICATION
// =============================================================================

describe("M3 PRD Compliance Verification", () => {
  describe("PRD 5.3: Sector Costs", () => {
    it("should have 5% scaling per owned sector", () => {
      // Verify scaling factor
      const baseCost = 1000;
      const cost0 = calculateSectorCost(baseCost, 0);
      const cost1 = calculateSectorCost(baseCost, 1);
      const expectedIncrease = cost0 * 0.05;

      expect(cost1 - cost0).toBe(expectedIncrease);
    });

    it("should have 50% refund on release", () => {
      const baseCost = 1000;
      const cost = calculateSectorCost(baseCost, 5);
      const refund = calculateReleaseRefund(baseCost, 5);

      expect(refund).toBe(Math.floor(cost * 0.5));
    });
  });

  describe("PRD 6.1: Unit Costs and Maintenance", () => {
    it("should match PRD unit costs", () => {
      expect(UNIT_COSTS.soldiers).toBe(50);
      expect(UNIT_COSTS.fighters).toBe(200);
      expect(UNIT_COSTS.lightCruisers).toBe(500);
      expect(UNIT_COSTS.heavyCruisers).toBe(1000);
      expect(UNIT_COSTS.carriers).toBe(2500);
      expect(UNIT_COSTS.stations).toBe(5000);
      expect(UNIT_COSTS.covertAgents).toBe(4090);
    });

    it("should match PRD population requirements", () => {
      expect(UNIT_POPULATION.soldiers).toBe(0.2);
      expect(UNIT_POPULATION.fighters).toBe(0.4);
      expect(UNIT_POPULATION.lightCruisers).toBe(1.0);
      expect(UNIT_POPULATION.heavyCruisers).toBe(2.0);
      expect(UNIT_POPULATION.carriers).toBe(3.0);
      expect(UNIT_POPULATION.stations).toBe(0.5);
      expect(UNIT_POPULATION.covertAgents).toBe(1.0);
    });
  });

  describe("PRD 9.1: Research System", () => {
    it("should have 8 levels (0-7)", () => {
      // Test costs for all 7 level transitions
      for (let level = 0; level < 7; level++) {
        const cost = calculateResearchCost(level);
        expect(cost).toBeGreaterThan(0);
      }
    });

    it("should use exponential cost formula", () => {
      for (let level = 0; level < 7; level++) {
        const expectedCost = 1000 * Math.pow(2, level);
        expect(calculateResearchCost(level)).toBe(expectedCost);
      }
    });
  });

  describe("PRD 9.2: Unit Upgrades", () => {
    it("should have 3 levels per unit (0, 1, 2)", () => {
      expect(MAX_UPGRADE_LEVEL).toBe(2);
    });

    it("should match soldier upgrade bonuses", () => {
      const soldierL2 = getUpgradeBonuses("soldiers", 2);
      expect(soldierL2.guerilla).toBe(0.5);
      expect(soldierL2.ground).toBe(2.0);
      expect(soldierL2.pirate).toBe(2.0);
    });

    it("should match carrier upgrade bonuses", () => {
      const carrierL2 = getUpgradeBonuses("carriers", 2);
      expect(carrierL2.toughness).toBe(4.0);
      expect(carrierL2.speed).toBe(4.0);
      expect(carrierL2.cargo).toBe(0.25);
    });
  });
});

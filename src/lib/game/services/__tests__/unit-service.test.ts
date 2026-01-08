/**
 * Unit Service Tests (M3)
 *
 * Tests for unit validation, maintenance calculations, and research requirements.
 */

import { describe, it, expect } from "vitest";
import {
  validateBuild,
  isUnitLocked,
  calculateUnitMaintenance,
  calculateTotalMaintenance,
  getRequiredResearchLevel,
  getAvailableUnits,
  getLockedUnits,
} from "../military/unit-service";
import {
  UNIT_COSTS,
  UNIT_POPULATION,
  UNIT_MAINTENANCE,
} from "../../unit-config";

// =============================================================================
// BUILD VALIDATION TESTS
// =============================================================================

describe("validateBuild", () => {
  describe("Basic Validation", () => {
    it("should allow valid build with sufficient resources", () => {
      const result = validateBuild("soldiers", 100, 10_000, 1000, 0);

      expect(result.canBuild).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.creditCost).toBe(5_000); // 100 * 50
      expect(result.populationCost).toBe(20); // 100 * 0.2
    });

    it("should reject zero quantity", () => {
      const result = validateBuild("soldiers", 0, 10_000, 1000, 0);

      expect(result.canBuild).toBe(false);
      expect(result.errors).toContain("Quantity must be positive");
    });

    it("should reject negative quantity", () => {
      const result = validateBuild("soldiers", -5, 10_000, 1000, 0);

      expect(result.canBuild).toBe(false);
      expect(result.errors).toContain("Quantity must be positive");
    });
  });

  describe("Credit Validation", () => {
    it("should reject insufficient credits", () => {
      const result = validateBuild("soldiers", 100, 1000, 1000, 0);

      expect(result.canBuild).toBe(false);
      expect(result.errors.some((e) => e.includes("Insufficient credits"))).toBe(true);
    });

    it("should calculate max affordable by credits", () => {
      const result = validateBuild("soldiers", 1, 500, 1000, 0);

      expect(result.maxAffordableByCredits).toBe(10); // 500 / 50
    });

    it("should handle exact credits match", () => {
      const result = validateBuild("soldiers", 100, 5000, 1000, 0);

      expect(result.canBuild).toBe(true);
      expect(result.creditCost).toBe(5000);
    });
  });

  describe("Population Validation", () => {
    it("should reject insufficient population", () => {
      const result = validateBuild("soldiers", 100, 10_000, 10, 0);

      expect(result.canBuild).toBe(false);
      expect(result.errors.some((e) => e.includes("Insufficient population"))).toBe(true);
    });

    it("should calculate max affordable by population", () => {
      const result = validateBuild("soldiers", 1, 10_000, 10, 0);

      expect(result.maxAffordableByPopulation).toBe(50); // 10 / 0.2
    });
  });

  describe("Research Validation", () => {
    it("should reject Light Cruisers without research level 2", () => {
      const result = validateBuild("lightCruisers", 10, 100_000, 1000, 1);

      expect(result.canBuild).toBe(false);
      expect(result.errors.some((e) => e.includes("Research Level 2"))).toBe(true);
    });

    it("should allow Light Cruisers at research level 2", () => {
      const result = validateBuild("lightCruisers", 10, 100_000, 1000, 2);

      expect(result.canBuild).toBe(true);
    });

    it("should allow Light Cruisers at higher research levels", () => {
      const result = validateBuild("lightCruisers", 10, 100_000, 1000, 5);

      expect(result.canBuild).toBe(true);
    });

    it("should allow other units at research level 0", () => {
      const result = validateBuild("heavyCruisers", 10, 100_000, 1000, 0);

      expect(result.canBuild).toBe(true);
    });
  });

  describe("Max Affordable Calculations", () => {
    it("should calculate minimum of credit and population affordability", () => {
      // 1000 credits / 50 per soldier = 20 by credits
      // 5 population / 0.2 per soldier = 25 by population
      // Max affordable = min(20, 25) = 20
      const result = validateBuild("soldiers", 1, 1000, 5, 0);

      expect(result.maxAffordableByCredits).toBe(20);
      expect(result.maxAffordableByPopulation).toBe(25);
      expect(result.maxAffordable).toBe(20);
    });

    it("should handle population as limiting factor", () => {
      // 10000 credits / 50 per soldier = 200 by credits
      // 20 population / 0.2 per soldier = 100 by population
      // Max affordable = min(200, 100) = 100
      const result = validateBuild("soldiers", 1, 10000, 20, 0);

      expect(result.maxAffordable).toBe(100);
    });
  });

  describe("Multiple Error Conditions", () => {
    it("should report all errors when multiple conditions fail", () => {
      const result = validateBuild("lightCruisers", 100, 100, 1, 0);

      expect(result.canBuild).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});

// =============================================================================
// UNIT LOCK TESTS
// =============================================================================

describe("isUnitLocked", () => {
  it("should lock Light Cruisers at research level 0", () => {
    const result = isUnitLocked("lightCruisers", 0);

    expect(result.isLocked).toBe(true);
    expect(result.reason).toContain("Research Level 2");
  });

  it("should lock Light Cruisers at research level 1", () => {
    const result = isUnitLocked("lightCruisers", 1);

    expect(result.isLocked).toBe(true);
  });

  it("should unlock Light Cruisers at research level 2", () => {
    const result = isUnitLocked("lightCruisers", 2);

    expect(result.isLocked).toBe(false);
    expect(result.reason).toBeUndefined();
  });

  it("should not lock Soldiers at any research level", () => {
    expect(isUnitLocked("soldiers", 0).isLocked).toBe(false);
    expect(isUnitLocked("soldiers", 5).isLocked).toBe(false);
  });

  it("should not lock Heavy Cruisers at any research level", () => {
    expect(isUnitLocked("heavyCruisers", 0).isLocked).toBe(false);
    expect(isUnitLocked("heavyCruisers", 5).isLocked).toBe(false);
  });
});

// =============================================================================
// MAINTENANCE CALCULATION TESTS
// =============================================================================

describe("calculateUnitMaintenance", () => {
  it("should calculate maintenance for soldiers", () => {
    const result = calculateUnitMaintenance({
      soldiers: 100,
      fighters: 0,
      stations: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
      covertAgents: 0,
    });

    expect(result.totalCost).toBe(50); // 100 * 0.5
    expect(result.byUnit.soldiers.count).toBe(100);
    expect(result.byUnit.soldiers.cost).toBe(50);
  });

  it("should calculate maintenance for mixed army", () => {
    const result = calculateUnitMaintenance({
      soldiers: 100, // 100 * 0.5 = 50
      fighters: 50, // 50 * 2 = 100
      stations: 10, // 10 * 50 = 500
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 5, // 5 * 25 = 125
      covertAgents: 0,
    });

    expect(result.totalCost).toBe(50 + 100 + 500 + 125);
    expect(result.byUnit.fighters.cost).toBe(100);
    expect(result.byUnit.stations.cost).toBe(500);
  });

  it("should handle empty army", () => {
    const result = calculateUnitMaintenance({
      soldiers: 0,
      fighters: 0,
      stations: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
      covertAgents: 0,
    });

    expect(result.totalCost).toBe(0);
  });

  it("should floor maintenance costs", () => {
    // 1 soldier = 0.5 credits, should floor to 0
    const result = calculateUnitMaintenance({
      soldiers: 1,
      fighters: 0,
      stations: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
      covertAgents: 0,
    });

    expect(result.byUnit.soldiers.cost).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  it("should calculate correct costs per PRD 6.1", () => {
    // Verify maintenance rates match PRD values
    expect(UNIT_MAINTENANCE.soldiers).toBe(0.5);
    expect(UNIT_MAINTENANCE.fighters).toBe(2);
    expect(UNIT_MAINTENANCE.stations).toBe(50);
    expect(UNIT_MAINTENANCE.lightCruisers).toBe(5);
    expect(UNIT_MAINTENANCE.heavyCruisers).toBe(10);
    expect(UNIT_MAINTENANCE.carriers).toBe(25);
    expect(UNIT_MAINTENANCE.covertAgents).toBe(40);
  });
});

describe("calculateTotalMaintenance", () => {
  it("should combine sector and unit maintenance", () => {
    const result = calculateTotalMaintenance(9, {
      soldiers: 100,
      fighters: 0,
      stations: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
      covertAgents: 0,
    });

    expect(result.sectorCost).toBe(1512); // 9 * 168
    expect(result.unitCost).toBe(50); // 100 * 0.5
    expect(result.totalCost).toBe(1562);
  });

  it("should handle zero sectors", () => {
    const result = calculateTotalMaintenance(0, {
      soldiers: 100,
      fighters: 0,
      stations: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
      covertAgents: 0,
    });

    expect(result.sectorCost).toBe(0);
    expect(result.unitCost).toBe(50);
    expect(result.totalCost).toBe(50);
  });

  it("should handle zero units", () => {
    const result = calculateTotalMaintenance(9, {
      soldiers: 0,
      fighters: 0,
      stations: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
      covertAgents: 0,
    });

    expect(result.sectorCost).toBe(1512);
    expect(result.unitCost).toBe(0);
    expect(result.totalCost).toBe(1512);
  });

  it("should use custom sector maintenance cost if provided", () => {
    const result = calculateTotalMaintenance(
      10,
      {
        soldiers: 0,
        fighters: 0,
        stations: 0,
        lightCruisers: 0,
        heavyCruisers: 0,
        carriers: 0,
        covertAgents: 0,
      },
      200
    );

    expect(result.sectorCost).toBe(2000); // 10 * 200
  });
});

// =============================================================================
// RESEARCH REQUIREMENT TESTS
// =============================================================================

describe("getRequiredResearchLevel", () => {
  it("should return 2 for Light Cruisers", () => {
    expect(getRequiredResearchLevel("lightCruisers")).toBe(2);
  });

  it("should return 0 for all other units", () => {
    expect(getRequiredResearchLevel("soldiers")).toBe(0);
    expect(getRequiredResearchLevel("fighters")).toBe(0);
    expect(getRequiredResearchLevel("stations")).toBe(0);
    expect(getRequiredResearchLevel("heavyCruisers")).toBe(0);
    expect(getRequiredResearchLevel("carriers")).toBe(0);
    expect(getRequiredResearchLevel("covertAgents")).toBe(0);
  });
});

describe("getAvailableUnits", () => {
  it("should exclude Light Cruisers at research level 0", () => {
    const available = getAvailableUnits(0);

    expect(available).not.toContain("lightCruisers");
    expect(available).toContain("soldiers");
    expect(available).toContain("heavyCruisers");
  });

  it("should include Light Cruisers at research level 2", () => {
    const available = getAvailableUnits(2);

    expect(available).toContain("lightCruisers");
  });

  it("should include all 7 unit types at research level 2", () => {
    const available = getAvailableUnits(2);

    expect(available).toHaveLength(7);
  });
});

describe("getLockedUnits", () => {
  it("should return Light Cruisers at research level 0", () => {
    const locked = getLockedUnits(0);

    expect(locked).toContain("lightCruisers");
    expect(locked).toHaveLength(1);
  });

  it("should return empty array at research level 2", () => {
    const locked = getLockedUnits(2);

    expect(locked).toHaveLength(0);
  });
});

// =============================================================================
// UNIT COST VERIFICATION TESTS (PRD 6.1)
// =============================================================================

describe("Unit Costs Match PRD 6.1", () => {
  it("should have correct credit costs", () => {
    expect(UNIT_COSTS.soldiers).toBe(50);
    expect(UNIT_COSTS.fighters).toBe(200);
    expect(UNIT_COSTS.stations).toBe(5_000);
    expect(UNIT_COSTS.lightCruisers).toBe(500);
    expect(UNIT_COSTS.heavyCruisers).toBe(1_000);
    expect(UNIT_COSTS.carriers).toBe(2_500);
    expect(UNIT_COSTS.covertAgents).toBe(4_090);
  });

  it("should have correct population costs", () => {
    expect(UNIT_POPULATION.soldiers).toBe(0.2);
    expect(UNIT_POPULATION.fighters).toBe(0.4);
    expect(UNIT_POPULATION.stations).toBe(0.5);
    expect(UNIT_POPULATION.lightCruisers).toBe(1.0);
    expect(UNIT_POPULATION.heavyCruisers).toBe(2.0);
    expect(UNIT_POPULATION.carriers).toBe(3.0);
    expect(UNIT_POPULATION.covertAgents).toBe(1.0);
  });

  it("should have correct maintenance costs", () => {
    expect(UNIT_MAINTENANCE.soldiers).toBe(0.5);
    expect(UNIT_MAINTENANCE.fighters).toBe(2);
    expect(UNIT_MAINTENANCE.stations).toBe(50);
    expect(UNIT_MAINTENANCE.lightCruisers).toBe(5);
    expect(UNIT_MAINTENANCE.heavyCruisers).toBe(10);
    expect(UNIT_MAINTENANCE.carriers).toBe(25);
    expect(UNIT_MAINTENANCE.covertAgents).toBe(40);
  });
});

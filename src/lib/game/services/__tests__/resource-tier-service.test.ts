/**
 * Resource Tier Service Tests
 *
 * Tests for Tier 1-3 resource management and auto-production.
 */

import { describe, it, expect } from "vitest";
import {
  calculateTier1AutoProduction,
  calculateIndustrialProduction,
  inventoryToMap,
  checkResourceRequirements,
  deductResources,
  addResources,
  getResourceTier,
  isBlackMarketOnly,
  getResourcesByTier,
  calculateInventoryValue,
  createEmptyInventory,
} from "../economy/resource-tier-service";
import type { Sector, ResourceInventory } from "@/lib/db/schema";

// =============================================================================
// HELPER: Create mock sector
// =============================================================================

function createMockSector(type: string, id = "sector-1"): Sector {
  return {
    id,
    empireId: "empire-1",
    gameId: "game-1",
    name: `Test ${type} Sector`,
    type: type as Sector["type"],
    productionRate: "100.00",
    purchasePrice: 1000,
    acquiredAtTurn: 1,
    createdAt: new Date(),
  };
}

// =============================================================================
// TIER 1 AUTO-PRODUCTION TESTS
// =============================================================================

describe("calculateTier1AutoProduction", () => {
  it("should produce refined metals from ore sectors (10%)", () => {
    const sectors = [createMockSector("ore")];
    const baseProduction = { food: 0, ore: 1000, petroleum: 0 };

    const result = calculateTier1AutoProduction(sectors, baseProduction);

    expect(result.totalByResource.refined_metals).toBe(100); // 10% of 1000
    expect(result.productions).toHaveLength(1);
    expect(result.productions[0]).toEqual({
      resourceType: "refined_metals",
      quantity: 100,
      sourceType: "ore",
      sourceSectors: 1,
    });
  });

  it("should produce fuel cells from petroleum sectors (10%)", () => {
    const sectors = [createMockSector("petroleum")];
    const baseProduction = { food: 0, ore: 0, petroleum: 500 };

    const result = calculateTier1AutoProduction(sectors, baseProduction);

    expect(result.totalByResource.fuel_cells).toBe(50); // 10% of 500
  });

  it("should produce processed food from food sectors (5%)", () => {
    const sectors = [createMockSector("food")];
    const baseProduction = { food: 2000, ore: 0, petroleum: 0 };

    const result = calculateTier1AutoProduction(sectors, baseProduction);

    expect(result.totalByResource.processed_food).toBe(100); // 5% of 2000
  });

  it("should produce labor units from urban sectors", () => {
    const sectors = [createMockSector("urban")];
    const baseProduction = { food: 0, ore: 0, petroleum: 0 };

    const result = calculateTier1AutoProduction(sectors, baseProduction);

    // 1 urban sector = 1000 credits * 5% / 50 = 1 labor unit
    expect(result.totalByResource.labor_units).toBe(1);
  });

  it("should handle multiple sectors of same type", () => {
    const sectors = [
      createMockSector("ore", "p1"),
      createMockSector("ore", "p2"),
      createMockSector("ore", "p3"),
    ];
    const baseProduction = { food: 0, ore: 3000, petroleum: 0 };

    const result = calculateTier1AutoProduction(sectors, baseProduction);

    expect(result.totalByResource.refined_metals).toBe(300); // 10% of 3000
    expect(result.productions[0]?.sourceSectors).toBe(3);
  });

  it("should handle mixed sector types", () => {
    const sectors = [
      createMockSector("ore", "p1"),
      createMockSector("petroleum", "p2"),
      createMockSector("food", "p3"),
    ];
    const baseProduction = { food: 1000, ore: 1000, petroleum: 1000 };

    const result = calculateTier1AutoProduction(sectors, baseProduction);

    expect(result.productions).toHaveLength(3);
    expect(result.totalByResource.refined_metals).toBe(100);
    expect(result.totalByResource.fuel_cells).toBe(100);
    expect(result.totalByResource.processed_food).toBe(50);
  });

  it("should not produce if base production is zero", () => {
    const sectors = [createMockSector("ore")];
    const baseProduction = { food: 0, ore: 0, petroleum: 0 };

    const result = calculateTier1AutoProduction(sectors, baseProduction);

    expect(result.productions).toHaveLength(0);
    expect(result.totalByResource).toEqual({});
  });

  it("should not produce if no matching sectors", () => {
    const sectors = [createMockSector("tourism")];
    const baseProduction = { food: 1000, ore: 1000, petroleum: 1000 };

    const result = calculateTier1AutoProduction(sectors, baseProduction);

    expect(result.productions).toHaveLength(0);
  });

  it("should floor fractional production", () => {
    const sectors = [createMockSector("ore")];
    const baseProduction = { food: 0, ore: 55, petroleum: 0 }; // 10% = 5.5 → 5

    const result = calculateTier1AutoProduction(sectors, baseProduction);

    expect(result.totalByResource.refined_metals).toBe(5);
  });
});

// =============================================================================
// INDUSTRIAL SECTOR PRODUCTION TESTS
// =============================================================================

describe("calculateIndustrialProduction", () => {
  it("should return empty if no industrial sectors", () => {
    const result = calculateIndustrialProduction(0, 1, { ore: 100, petroleum: 100, food: 100 });

    expect(result.produced).toEqual({});
    expect(result.consumed).toEqual({ ore: 0, petroleum: 0, food: 0 });
  });

  it("should produce polymers with available resources", () => {
    const result = calculateIndustrialProduction(1, 0, { ore: 100, petroleum: 100, food: 0 });

    // With base 10 production per sector and research level 0
    // Polymers: 30 petroleum + 20 ore → 1 polymer
    // Can make floor(100/30) = 3 from petroleum, floor(100/20) = 5 from ore
    // Limited by capacity: 10/2 = 5 polymers max
    // So can make min(3, 5, 5) = 3 polymers
    expect(result.produced.polymers).toBe(3);
    expect(result.consumed.petroleum).toBe(90); // 3 * 30
    expect(result.consumed.ore).toBe(60); // 3 * 20
  });

  it("should increase production with higher research level", () => {
    const lowResearch = calculateIndustrialProduction(1, 0, { ore: 200, petroleum: 200, food: 0 });
    const highResearch = calculateIndustrialProduction(1, 4, { ore: 200, petroleum: 200, food: 0 });

    // Higher research = higher efficiency bonus
    // Level 0: 10 production, Level 4: 10 * 1.2 = 12 production
    expect(highResearch.produced.polymers).toBeGreaterThanOrEqual(lowResearch.produced.polymers!);
  });

  it("should scale with multiple industrial sectors", () => {
    const single = calculateIndustrialProduction(1, 0, { ore: 500, petroleum: 500, food: 0 });
    const double = calculateIndustrialProduction(2, 0, { ore: 500, petroleum: 500, food: 0 });

    expect(double.produced.polymers).toBeGreaterThan(single.produced.polymers!);
  });
});

// =============================================================================
// INVENTORY MANAGEMENT TESTS
// =============================================================================

describe("inventoryToMap", () => {
  it("should convert empty inventory to zeroed map", () => {
    const result = inventoryToMap([]);

    expect(result.refined_metals).toBe(0);
    expect(result.electronics).toBe(0);
    expect(result.reactor_cores).toBe(0);
  });

  it("should convert inventory records to map", () => {
    const inventory: ResourceInventory[] = [
      { id: "1", empireId: "e1", gameId: "g1", resourceType: "refined_metals", tier: "tier1", quantity: 50, createdAt: new Date(), updatedAt: new Date() },
      { id: "2", empireId: "e1", gameId: "g1", resourceType: "electronics", tier: "tier2", quantity: 25, createdAt: new Date(), updatedAt: new Date() },
    ];

    const result = inventoryToMap(inventory);

    expect(result.refined_metals).toBe(50);
    expect(result.electronics).toBe(25);
    expect(result.fuel_cells).toBe(0); // Not in inventory
  });
});

describe("checkResourceRequirements", () => {
  it("should pass when all resources available", () => {
    const inventory = createEmptyInventory();
    inventory.refined_metals = 10;
    inventory.fuel_cells = 5;

    const result = checkResourceRequirements(inventory, {
      refined_metals: 5,
      fuel_cells: 3,
    });

    expect(result.hasResources).toBe(true);
    expect(result.missing).toEqual({});
  });

  it("should fail when resources missing", () => {
    const inventory = createEmptyInventory();
    inventory.refined_metals = 2;

    const result = checkResourceRequirements(inventory, {
      refined_metals: 5,
    });

    expect(result.hasResources).toBe(false);
    expect(result.missing.refined_metals).toBe(3);
  });

  it("should report all missing resources", () => {
    const inventory = createEmptyInventory();
    inventory.refined_metals = 2;
    inventory.fuel_cells = 0;

    const result = checkResourceRequirements(inventory, {
      refined_metals: 5,
      fuel_cells: 10,
    });

    expect(result.hasResources).toBe(false);
    expect(result.missing.refined_metals).toBe(3);
    expect(result.missing.fuel_cells).toBe(10);
  });

  it("should report available resources", () => {
    const inventory = createEmptyInventory();
    inventory.refined_metals = 10;

    const result = checkResourceRequirements(inventory, {
      refined_metals: 5,
    });

    expect(result.available.refined_metals).toBe(10);
  });
});

describe("deductResources", () => {
  it("should deduct specified amounts", () => {
    const inventory = createEmptyInventory();
    inventory.refined_metals = 100;
    inventory.fuel_cells = 50;

    const result = deductResources(inventory, {
      refined_metals: 30,
      fuel_cells: 20,
    });

    expect(result.refined_metals).toBe(70);
    expect(result.fuel_cells).toBe(30);
  });

  it("should not go below zero", () => {
    const inventory = createEmptyInventory();
    inventory.refined_metals = 10;

    const result = deductResources(inventory, {
      refined_metals: 50,
    });

    expect(result.refined_metals).toBe(0);
  });

  it("should not modify original inventory", () => {
    const inventory = createEmptyInventory();
    inventory.refined_metals = 100;

    deductResources(inventory, { refined_metals: 30 });

    expect(inventory.refined_metals).toBe(100);
  });
});

describe("addResources", () => {
  it("should add specified amounts", () => {
    const inventory = createEmptyInventory();
    inventory.refined_metals = 100;

    const result = addResources(inventory, {
      refined_metals: 50,
      fuel_cells: 25,
    });

    expect(result.refined_metals).toBe(150);
    expect(result.fuel_cells).toBe(25);
  });

  it("should not modify original inventory", () => {
    const inventory = createEmptyInventory();
    inventory.refined_metals = 100;

    addResources(inventory, { refined_metals: 50 });

    expect(inventory.refined_metals).toBe(100);
  });
});

// =============================================================================
// RESOURCE TIER UTILITIES TESTS
// =============================================================================

describe("getResourceTier", () => {
  it("should return 1 for Tier 1 resources", () => {
    expect(getResourceTier("refined_metals")).toBe(1);
    expect(getResourceTier("fuel_cells")).toBe(1);
    expect(getResourceTier("polymers")).toBe(1);
    expect(getResourceTier("processed_food")).toBe(1);
    expect(getResourceTier("labor_units")).toBe(1);
  });

  it("should return 2 for Tier 2 resources", () => {
    expect(getResourceTier("electronics")).toBe(2);
    expect(getResourceTier("armor_plating")).toBe(2);
    expect(getResourceTier("propulsion_units")).toBe(2);
    expect(getResourceTier("quantum_processors")).toBe(2);
  });

  it("should return 3 for Tier 3 resources", () => {
    expect(getResourceTier("reactor_cores")).toBe(3);
    expect(getResourceTier("shield_generators")).toBe(3);
    expect(getResourceTier("cloaking_devices")).toBe(3);
    expect(getResourceTier("nuclear_warheads")).toBe(3);
  });
});

describe("isBlackMarketOnly", () => {
  it("should return true for bioweapon_synthesis", () => {
    expect(isBlackMarketOnly("bioweapon_synthesis")).toBe(true);
  });

  it("should return true for nuclear_warheads", () => {
    expect(isBlackMarketOnly("nuclear_warheads")).toBe(true);
  });

  it("should return false for regular resources", () => {
    expect(isBlackMarketOnly("refined_metals")).toBe(false);
    expect(isBlackMarketOnly("electronics")).toBe(false);
    expect(isBlackMarketOnly("reactor_cores")).toBe(false);
  });
});

describe("getResourcesByTier", () => {
  it("should return all Tier 1 resources", () => {
    const tier1 = getResourcesByTier(1);

    expect(tier1).toContain("refined_metals");
    expect(tier1).toContain("fuel_cells");
    expect(tier1).toContain("polymers");
    expect(tier1).toContain("processed_food");
    expect(tier1).toContain("labor_units");
    expect(tier1).toHaveLength(5);
  });

  it("should return all Tier 2 resources", () => {
    const tier2 = getResourcesByTier(2);

    expect(tier2).toContain("electronics");
    expect(tier2).toContain("armor_plating");
    expect(tier2).toContain("quantum_processors");
    expect(tier2).toHaveLength(8);
  });

  it("should return all Tier 3 resources", () => {
    const tier3 = getResourcesByTier(3);

    expect(tier3).toContain("reactor_cores");
    expect(tier3).toContain("shield_generators");
    expect(tier3).toContain("bioweapon_synthesis");
    expect(tier3).toContain("nuclear_warheads");
    expect(tier3).toHaveLength(9);
  });
});

describe("calculateInventoryValue", () => {
  it("should calculate value based on tier", () => {
    const inventory = createEmptyInventory();
    inventory.refined_metals = 10; // Tier 1 = 10 * 10 = 100
    inventory.electronics = 5; // Tier 2 = 5 * 50 = 250
    inventory.reactor_cores = 2; // Tier 3 = 2 * 200 = 400

    const result = calculateInventoryValue(inventory);

    expect(result).toBe(750);
  });

  it("should return 0 for empty inventory", () => {
    const inventory = createEmptyInventory();

    expect(calculateInventoryValue(inventory)).toBe(0);
  });
});

describe("createEmptyInventory", () => {
  it("should create inventory with all resources at 0", () => {
    const inventory = createEmptyInventory();

    // Check a few from each tier
    expect(inventory.refined_metals).toBe(0);
    expect(inventory.electronics).toBe(0);
    expect(inventory.reactor_cores).toBe(0);
    expect(inventory.nuclear_warheads).toBe(0);
  });

  it("should have all 22 resource types", () => {
    const inventory = createEmptyInventory();
    const keys = Object.keys(inventory);

    expect(keys).toHaveLength(22);
  });
});

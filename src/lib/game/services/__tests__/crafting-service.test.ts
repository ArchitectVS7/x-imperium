/**
 * Crafting Service Tests
 *
 * Tests for crafting queue management, recipe validation, and component reservation.
 */

import { describe, it, expect } from "vitest";
import {
  getRecipe,
  validateCraftingOrder,
  calculateCraftingTime,
  createQueueItem,
  processCraftingQueue,
  cancelQueueItem,
  getQueueState,
  executeCraftingOrder,
  getAvailableRecipes,
  type CraftingOrder,
  type QueuedItem,
} from "../crafting-service";
import { createEmptyInventory } from "../resource-tier-service";

// =============================================================================
// RECIPE LOOKUP TESTS
// =============================================================================

describe("getRecipe", () => {
  describe("Tier 1 recipes", () => {
    it("should return refined_metals recipe", () => {
      const recipe = getRecipe("refined_metals");

      expect(recipe).not.toBeNull();
      expect(recipe?.inputs.ore).toBe(100);
      expect(recipe?.researchRequired).toBe(0);
      expect(recipe?.craftingTime).toBe(1);
    });

    it("should return fuel_cells recipe", () => {
      const recipe = getRecipe("fuel_cells");

      expect(recipe).not.toBeNull();
      expect(recipe?.inputs.petroleum).toBe(50);
      expect(recipe?.inputs.credits).toBe(20);
    });

    it("should return polymers recipe", () => {
      const recipe = getRecipe("polymers");

      expect(recipe).not.toBeNull();
      expect(recipe?.inputs.petroleum).toBe(30);
      expect(recipe?.inputs.ore).toBe(20);
    });
  });

  describe("Tier 2 recipes", () => {
    it("should return electronics recipe", () => {
      const recipe = getRecipe("electronics");

      expect(recipe).not.toBeNull();
      expect(recipe?.inputs.refined_metals).toBe(2);
      expect(recipe?.inputs.polymers).toBe(1);
      expect(recipe?.researchRequired).toBe(1);
    });

    it("should return armor_plating recipe", () => {
      const recipe = getRecipe("armor_plating");

      expect(recipe).not.toBeNull();
      expect(recipe?.researchRequired).toBe(1);
    });

    it("should return quantum_processors recipe", () => {
      const recipe = getRecipe("quantum_processors");

      expect(recipe).not.toBeNull();
      expect(recipe?.researchRequired).toBe(4);
    });
  });

  describe("Tier 3 recipes", () => {
    it("should return reactor_cores recipe", () => {
      const recipe = getRecipe("reactor_cores");

      expect(recipe).not.toBeNull();
      expect(recipe?.researchRequired).toBe(4);
    });

    it("should return nuclear_warheads as black market only", () => {
      const recipe = getRecipe("nuclear_warheads");

      expect(recipe).not.toBeNull();
      expect(recipe?.blackMarketOnly).toBe(true);
    });

    it("should return bioweapon_synthesis as black market only", () => {
      const recipe = getRecipe("bioweapon_synthesis");

      expect(recipe).not.toBeNull();
      expect(recipe?.blackMarketOnly).toBe(true);
    });
  });
});

// =============================================================================
// CRAFTING VALIDATION TESTS
// =============================================================================

describe("validateCraftingOrder", () => {
  it("should validate order with sufficient resources", () => {
    const order: CraftingOrder = { resourceType: "refined_metals", quantity: 1 };
    const tier0 = { credits: 1000, food: 0, ore: 200, petroleum: 0 };
    const inventory = createEmptyInventory();

    const result = validateCraftingOrder(order, 0, tier0, inventory);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.requiredResources.ore).toBe(100);
  });

  it("should reject order with insufficient resources", () => {
    const order: CraftingOrder = { resourceType: "refined_metals", quantity: 1 };
    const tier0 = { credits: 0, food: 0, ore: 50, petroleum: 0 }; // Need 100 ore
    const inventory = createEmptyInventory();

    const result = validateCraftingOrder(order, 0, tier0, inventory);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Need 100 ore, have 50");
    expect(result.missingResources.ore).toBe(50);
  });

  it("should reject order with insufficient research level", () => {
    const order: CraftingOrder = { resourceType: "electronics", quantity: 1 };
    const tier0 = { credits: 1000, food: 0, ore: 0, petroleum: 0 };
    const inventory = createEmptyInventory();
    inventory.refined_metals = 10;
    inventory.polymers = 10;

    const result = validateCraftingOrder(order, 0, tier0, inventory); // Research level 0, needs 1

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Research level 1 required"))).toBe(true);
  });

  it("should scale resource requirements with quantity", () => {
    const order: CraftingOrder = { resourceType: "refined_metals", quantity: 5 };
    const tier0 = { credits: 0, food: 0, ore: 500, petroleum: 0 };
    const inventory = createEmptyInventory();

    const result = validateCraftingOrder(order, 0, tier0, inventory);

    expect(result.requiredResources.ore).toBe(500); // 100 * 5
    expect(result.valid).toBe(true);
  });

  it("should check crafted resource requirements", () => {
    const order: CraftingOrder = { resourceType: "electronics", quantity: 1 };
    const tier0 = { credits: 1000, food: 0, ore: 0, petroleum: 0 };
    const inventory = createEmptyInventory();
    inventory.refined_metals = 1; // Need 2
    inventory.polymers = 5;

    const result = validateCraftingOrder(order, 5, tier0, inventory);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("refined_metals"))).toBe(true);
  });

  it("should reject black market items without trust", () => {
    const order: CraftingOrder = { resourceType: "nuclear_warheads", quantity: 1 };
    const tier0 = { credits: 100000, food: 0, ore: 0, petroleum: 0 };
    const inventory = createEmptyInventory();
    inventory.reactor_cores = 10;
    inventory.shield_generators = 10;

    const result = validateCraftingOrder(order, 7, tier0, inventory, 5); // Trust level 5

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("trust level 6+"))).toBe(true);
    expect(result.isBlackMarketOnly).toBe(true);
  });

  it("should allow black market items with sufficient trust", () => {
    const order: CraftingOrder = { resourceType: "nuclear_warheads", quantity: 1 };
    const tier0 = { credits: 100000, food: 0, ore: 0, petroleum: 0 };
    const inventory = createEmptyInventory();
    // Add required resources
    inventory.reactor_cores = 10;
    inventory.shield_generators = 10;

    const result = validateCraftingOrder(order, 7, tier0, inventory, 7); // Trust level 7

    // May still fail due to resource requirements, but not trust
    expect(result.errors.every((e) => !e.includes("trust level"))).toBe(true);
  });
});

// =============================================================================
// CRAFTING TIME TESTS
// =============================================================================

describe("calculateCraftingTime", () => {
  it("should return base time with no bonuses", () => {
    const result = calculateCraftingTime(2, 0, 0, 0);

    expect(result).toBe(2);
  });

  it("should reduce time with higher research level", () => {
    const baseTime = calculateCraftingTime(10, 0, 0, 0);
    const withResearch = calculateCraftingTime(10, 4, 0, 0); // 4 * 5% = 20% reduction

    expect(withResearch).toBeLessThan(baseTime);
  });

  it("should reduce time with economy investment", () => {
    const baseTime = calculateCraftingTime(10, 0, 0, 0);
    const withEconomy = calculateCraftingTime(10, 0, 20, 0); // 20% investment = 10% reduction

    expect(withEconomy).toBeLessThan(baseTime);
  });

  it("should reduce time with industrial sectors", () => {
    const baseTime = calculateCraftingTime(10, 0, 0, 0);
    const withIndustrial = calculateCraftingTime(10, 0, 0, 5); // 5 * 2% = 10% reduction

    expect(withIndustrial).toBeLessThan(baseTime);
  });

  it("should have minimum time of 1 turn", () => {
    const result = calculateCraftingTime(1, 10, 100, 100); // Max bonuses

    expect(result).toBeGreaterThanOrEqual(1);
  });

  it("should stack bonuses", () => {
    const noBonus = calculateCraftingTime(20, 0, 0, 0);
    const withResearch = calculateCraftingTime(20, 4, 0, 0);
    const withAll = calculateCraftingTime(20, 4, 20, 5);

    expect(withResearch).toBeLessThan(noBonus);
    expect(withAll).toBeLessThan(withResearch);
  });
});

// =============================================================================
// QUEUE MANAGEMENT TESTS
// =============================================================================

describe("createQueueItem", () => {
  it("should create queue item with correct fields", () => {
    const order: CraftingOrder = { resourceType: "refined_metals", quantity: 5 };
    const currentQueue: QueuedItem[] = [];

    const result = createQueueItem(order, 10, 2, currentQueue);

    expect(result.resourceType).toBe("refined_metals");
    expect(result.quantity).toBe(5);
    expect(result.startTurn).toBe(10);
    expect(result.completionTurn).toBe(12);
    expect(result.status).toBe("in_progress"); // First item starts immediately
  });

  it("should queue after existing items", () => {
    const existingItem: QueuedItem = {
      id: "item-1",
      resourceType: "refined_metals",
      quantity: 1,
      status: "in_progress",
      startTurn: 10,
      completionTurn: 12,
      componentsReserved: { ore: 100 },
    };
    const order: CraftingOrder = { resourceType: "fuel_cells", quantity: 2 };

    const result = createQueueItem(order, 10, 3, [existingItem]);

    expect(result.startTurn).toBe(12); // Starts when existing completes
    expect(result.completionTurn).toBe(15);
    expect(result.status).toBe("queued"); // Not first, so queued
  });

  it("should reserve components based on recipe", () => {
    const order: CraftingOrder = { resourceType: "refined_metals", quantity: 3 };

    const result = createQueueItem(order, 1, 1, []);

    expect(result.componentsReserved.ore).toBe(300); // 100 * 3
  });
});

describe("processCraftingQueue", () => {
  it("should complete items at their completion turn", () => {
    const queue: QueuedItem[] = [
      {
        id: "item-1",
        resourceType: "refined_metals",
        quantity: 5,
        status: "in_progress",
        startTurn: 1,
        completionTurn: 3,
        componentsReserved: { ore: 500 },
      },
    ];

    const result = processCraftingQueue(queue, 3);

    expect(result.completed).toHaveLength(1);
    expect(result.completed[0]).toEqual({
      resourceType: "refined_metals",
      quantity: 5,
      completedAtTurn: 3,
    });
    expect(result.updatedQueue).toHaveLength(0);
  });

  it("should not complete items before their turn", () => {
    const queue: QueuedItem[] = [
      {
        id: "item-1",
        resourceType: "refined_metals",
        quantity: 5,
        status: "in_progress",
        startTurn: 1,
        completionTurn: 5,
        componentsReserved: { ore: 500 },
      },
    ];

    const result = processCraftingQueue(queue, 3);

    expect(result.completed).toHaveLength(0);
    expect(result.updatedQueue).toHaveLength(1);
  });

  it("should start next item when current completes", () => {
    const queue: QueuedItem[] = [
      {
        id: "item-1",
        resourceType: "refined_metals",
        quantity: 1,
        status: "in_progress",
        startTurn: 1,
        completionTurn: 2,
        componentsReserved: { ore: 100 },
      },
      {
        id: "item-2",
        resourceType: "fuel_cells",
        quantity: 1,
        status: "queued",
        startTurn: 2,
        completionTurn: 4,
        componentsReserved: { petroleum: 50 },
      },
    ];

    const result = processCraftingQueue(queue, 2);

    expect(result.completed).toHaveLength(1);
    expect(result.updatedQueue).toHaveLength(1);
    expect(result.updatedQueue[0]!.status).toBe("in_progress");
  });

  it("should skip cancelled items", () => {
    const queue: QueuedItem[] = [
      {
        id: "item-1",
        resourceType: "refined_metals",
        quantity: 1,
        status: "cancelled",
        startTurn: 1,
        completionTurn: 2,
        componentsReserved: { ore: 100 },
      },
      {
        id: "item-2",
        resourceType: "fuel_cells",
        quantity: 1,
        status: "queued",
        startTurn: 2,
        completionTurn: 4,
        componentsReserved: { petroleum: 50 },
      },
    ];

    const result = processCraftingQueue(queue, 2);

    expect(result.updatedQueue).toHaveLength(1);
    expect(result.updatedQueue[0]!.id).toBe("item-2");
    expect(result.updatedQueue[0]!.status).toBe("in_progress");
  });
});

describe("cancelQueueItem", () => {
  it("should mark item as cancelled", () => {
    const queue: QueuedItem[] = [
      {
        id: "item-1",
        resourceType: "refined_metals",
        quantity: 1,
        status: "queued",
        startTurn: 1,
        completionTurn: 2,
        componentsReserved: { ore: 100 },
      },
    ];

    const result = cancelQueueItem(queue, "item-1");

    expect(result.updatedQueue[0]!.status).toBe("cancelled");
  });

  it("should return refunded resources", () => {
    const queue: QueuedItem[] = [
      {
        id: "item-1",
        resourceType: "refined_metals",
        quantity: 5,
        status: "in_progress",
        startTurn: 1,
        completionTurn: 2,
        componentsReserved: { ore: 500, credits: 100 },
      },
    ];

    const result = cancelQueueItem(queue, "item-1");

    expect(result.refundedResources.ore).toBe(500);
    expect(result.refundedResources.credits).toBe(100);
  });

  it("should not affect other items", () => {
    const queue: QueuedItem[] = [
      {
        id: "item-1",
        resourceType: "refined_metals",
        quantity: 1,
        status: "in_progress",
        startTurn: 1,
        completionTurn: 2,
        componentsReserved: { ore: 100 },
      },
      {
        id: "item-2",
        resourceType: "fuel_cells",
        quantity: 1,
        status: "queued",
        startTurn: 2,
        completionTurn: 4,
        componentsReserved: { petroleum: 50 },
      },
    ];

    const result = cancelQueueItem(queue, "item-1");

    expect(result.updatedQueue.find((i) => i.id === "item-2")?.status).toBe("queued");
  });

  it("should not cancel completed items", () => {
    const queue: QueuedItem[] = [
      {
        id: "item-1",
        resourceType: "refined_metals",
        quantity: 1,
        status: "completed",
        startTurn: 1,
        completionTurn: 2,
        componentsReserved: { ore: 100 },
      },
    ];

    const result = cancelQueueItem(queue, "item-1");

    expect(result.refundedResources).toEqual({});
  });
});

describe("getQueueState", () => {
  it("should return empty state for empty queue", () => {
    const result = getQueueState([], 1);

    expect(result.items).toHaveLength(0);
    expect(result.totalTurnsRemaining).toBe(0);
    expect(result.currentlyBuilding).toBeNull();
  });

  it("should identify currently building item", () => {
    const queue: QueuedItem[] = [
      {
        id: "item-1",
        resourceType: "refined_metals",
        quantity: 1,
        status: "in_progress",
        startTurn: 1,
        completionTurn: 5,
        componentsReserved: { ore: 100 },
      },
    ];

    const result = getQueueState(queue, 2);

    expect(result.currentlyBuilding?.id).toBe("item-1");
    expect(result.totalTurnsRemaining).toBe(3); // 5 - 2
  });

  it("should exclude cancelled items", () => {
    const queue: QueuedItem[] = [
      {
        id: "item-1",
        resourceType: "refined_metals",
        quantity: 1,
        status: "cancelled",
        startTurn: 1,
        completionTurn: 2,
        componentsReserved: {},
      },
      {
        id: "item-2",
        resourceType: "fuel_cells",
        quantity: 1,
        status: "in_progress",
        startTurn: 2,
        completionTurn: 4,
        componentsReserved: {},
      },
    ];

    const result = getQueueState(queue, 2);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("item-2");
  });
});

// =============================================================================
// CRAFTING EXECUTION TESTS
// =============================================================================

describe("executeCraftingOrder", () => {
  it("should execute valid order", () => {
    const order: CraftingOrder = { resourceType: "refined_metals", quantity: 2 };
    const state = {
      researchLevel: 0,
      tier0Resources: { credits: 1000, food: 0, ore: 500, petroleum: 0 },
      inventory: createEmptyInventory(),
      queue: [] as QueuedItem[],
      currentTurn: 1,
    };

    const result = executeCraftingOrder(order, state);

    expect(result.success).toBe(true);
    expect(result.updatedTier0?.ore).toBe(300); // 500 - 200
    expect(result.newQueueItem).toBeDefined();
    expect(result.newQueueItem?.quantity).toBe(2);
  });

  it("should fail for invalid order", () => {
    const order: CraftingOrder = { resourceType: "refined_metals", quantity: 10 };
    const state = {
      researchLevel: 0,
      tier0Resources: { credits: 0, food: 0, ore: 100, petroleum: 0 }, // Only 100 ore, need 1000
      inventory: createEmptyInventory(),
      queue: [] as QueuedItem[],
      currentTurn: 1,
    };

    const result = executeCraftingOrder(order, state);

    expect(result.success).toBe(false);
    expect(result.error).toContain("ore");
  });

  it("should deduct crafted resources", () => {
    const order: CraftingOrder = { resourceType: "electronics", quantity: 1 };
    const inventory = createEmptyInventory();
    inventory.refined_metals = 10;
    inventory.polymers = 5;

    const state = {
      researchLevel: 5,
      tier0Resources: { credits: 1000, food: 0, ore: 0, petroleum: 0 },
      inventory,
      queue: [] as QueuedItem[],
      currentTurn: 1,
    };

    const result = executeCraftingOrder(order, state);

    expect(result.success).toBe(true);
    expect(result.updatedInventory?.refined_metals).toBe(8); // 10 - 2
    expect(result.updatedInventory?.polymers).toBe(4); // 5 - 1
  });

  it("should apply crafting time bonuses", () => {
    const order: CraftingOrder = { resourceType: "refined_metals", quantity: 1 };
    const state = {
      researchLevel: 4,
      tier0Resources: { credits: 1000, food: 0, ore: 500, petroleum: 0 },
      inventory: createEmptyInventory(),
      queue: [] as QueuedItem[],
      currentTurn: 1,
      economyInvestment: 20,
      industrialPlanets: 5,
    };

    const result = executeCraftingOrder(order, state);

    expect(result.success).toBe(true);
    // With bonuses, time should be reduced
    expect(result.newQueueItem?.completionTurn).toBeDefined();
  });
});

// =============================================================================
// AVAILABLE RECIPES TESTS
// =============================================================================

describe("getAvailableRecipes", () => {
  it("should return Tier 1 recipes at research level 0", () => {
    const recipes = getAvailableRecipes(0);

    expect(recipes.some((r) => r.resource === "refined_metals")).toBe(true);
    expect(recipes.some((r) => r.resource === "fuel_cells")).toBe(true);
    expect(recipes.every((r) => r.tier === 1 || !r.isAvailable)).toBe(true);
  });

  it("should return Tier 2 recipes at research level 2", () => {
    const recipes = getAvailableRecipes(2);

    expect(recipes.some((r) => r.resource === "electronics" && r.isAvailable)).toBe(true);
    expect(recipes.some((r) => r.resource === "armor_plating" && r.isAvailable)).toBe(true);
  });

  it("should not return higher tier recipes without includeFuture", () => {
    const recipes = getAvailableRecipes(0, false);

    expect(recipes.some((r) => r.resource === "electronics")).toBe(false);
    expect(recipes.some((r) => r.resource === "reactor_cores")).toBe(false);
  });

  it("should return all recipes with includeFuture", () => {
    const recipes = getAvailableRecipes(0, true);

    expect(recipes.some((r) => r.resource === "electronics" && !r.isAvailable)).toBe(true);
    expect(recipes.some((r) => r.resource === "reactor_cores" && !r.isAvailable)).toBe(true);
  });

  it("should include recipe details", () => {
    const recipes = getAvailableRecipes(1, true);
    const electronics = recipes.find((r) => r.resource === "electronics");

    expect(electronics).toBeDefined();
    expect(electronics?.tier).toBe(2);
    expect(electronics?.researchRequired).toBe(1);
    expect(electronics?.craftingTime).toBeGreaterThan(0);
    expect(electronics?.inputs).toBeDefined();
  });
});

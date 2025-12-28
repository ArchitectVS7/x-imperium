/**
 * Crafting Service
 *
 * Handles crafting queue management, recipe validation, and component reservation.
 * Manages the production of Tier 1-3 resources from recipes.
 *
 * Based on docs/crafting-system.md
 */

import {
  TIER_1_RECIPES,
  TIER_2_RECIPES,
  TIER_2_EXTENDED_RECIPES,
  TIER_3_RECIPES,
  TIER_3_EXTENDED_RECIPES,
  INDUSTRIAL_PLANET,
  type Tier1Resource,
  type Tier2Resource,
  type Tier3Resource,
  type CraftedResource,
} from "../constants/crafting";
import {
  type ResourceInventoryMap,
  deductResources,
  getResourceTier,
} from "./resource-tier-service";

// =============================================================================
// TYPES
// =============================================================================

export interface CraftingOrder {
  resourceType: CraftedResource;
  quantity: number;
}

export interface CraftingValidation {
  valid: boolean;
  errors: string[];
  requiredResources: Partial<Record<CraftedResource | "credits" | "ore" | "petroleum" | "food", number>>;
  missingResources: Partial<Record<CraftedResource | "credits" | "ore" | "petroleum" | "food", number>>;
  researchRequired: number;
  craftingTime: number;
  isBlackMarketOnly: boolean;
}

export interface QueuedItem {
  id: string;
  resourceType: CraftedResource;
  quantity: number;
  status: "queued" | "in_progress" | "completed" | "cancelled";
  startTurn: number;
  completionTurn: number;
  componentsReserved: Record<string, number>;
}

export interface CraftingQueueState {
  items: QueuedItem[];
  totalTurnsRemaining: number;
  currentlyBuilding: QueuedItem | null;
}

export interface CompletedCrafting {
  resourceType: CraftedResource;
  quantity: number;
  completedAtTurn: number;
}

// =============================================================================
// RECIPE LOOKUP
// =============================================================================

/**
 * Get the full recipe for a crafted resource
 *
 * @param resource - Resource type to look up
 * @returns Recipe with inputs, research requirement, and crafting time
 */
export function getRecipe(resource: CraftedResource): {
  inputs: Record<string, number>;
  researchRequired: number;
  craftingTime: number;
  blackMarketOnly?: boolean;
} | null {
  const tier = getResourceTier(resource);

  if (tier === 1) {
    const recipe = TIER_1_RECIPES[resource as Tier1Resource];
    if (recipe) {
      return {
        inputs: recipe.inputs as Record<string, number>,
        researchRequired: 0,
        craftingTime: recipe.craftingTime,
      };
    }
  } else if (tier === 2) {
    // Check extended recipes first (they have more accurate dependencies)
    const extended = TIER_2_EXTENDED_RECIPES[resource];
    if (extended) {
      return {
        inputs: extended.inputs as Record<string, number>,
        researchRequired: extended.researchRequired,
        craftingTime: extended.craftingTime,
      };
    }
    const basic = TIER_2_RECIPES[resource as Tier2Resource];
    if (basic) {
      return {
        inputs: basic.inputs as Record<string, number>,
        researchRequired: basic.researchRequired,
        craftingTime: basic.craftingTime,
      };
    }
  } else if (tier === 3) {
    // Check extended recipes first
    const extended = TIER_3_EXTENDED_RECIPES[resource];
    if (extended) {
      return {
        inputs: extended.inputs as Record<string, number>,
        researchRequired: extended.researchRequired,
        craftingTime: extended.craftingTime,
        blackMarketOnly: extended.blackMarketOnly,
      };
    }
    const basic = TIER_3_RECIPES[resource as Tier3Resource];
    if (basic) {
      return {
        inputs: basic.inputs as Record<string, number>,
        researchRequired: basic.researchRequired,
        craftingTime: basic.craftingTime,
        blackMarketOnly: basic.blackMarketOnly,
      };
    }
  }

  return null;
}

// =============================================================================
// CRAFTING VALIDATION
// =============================================================================

/**
 * Validate a crafting order against requirements
 *
 * Checks:
 * - Recipe exists
 * - Research level met
 * - Resources available (Tier 0 and crafted)
 * - Not Black Market only (unless has trust)
 *
 * @param order - Crafting order to validate
 * @param researchLevel - Empire's current research level
 * @param tier0Resources - Available Tier 0 resources
 * @param inventory - Current crafted resource inventory
 * @param syndicateTrustLevel - Empire's Syndicate trust level (for Black Market items)
 * @returns Validation result with errors if any
 */
export function validateCraftingOrder(
  order: CraftingOrder,
  researchLevel: number,
  tier0Resources: { credits: number; food: number; ore: number; petroleum: number },
  inventory: ResourceInventoryMap,
  syndicateTrustLevel: number = 0
): CraftingValidation {
  const errors: string[] = [];
  const recipe = getRecipe(order.resourceType);

  if (!recipe) {
    return {
      valid: false,
      errors: [`Unknown resource type: ${order.resourceType}`],
      requiredResources: {},
      missingResources: {},
      researchRequired: 0,
      craftingTime: 0,
      isBlackMarketOnly: false,
    };
  }

  // Check Black Market restriction
  const isBlackMarketOnly = recipe.blackMarketOnly ?? false;
  if (isBlackMarketOnly && syndicateTrustLevel < 6) {
    errors.push(`${order.resourceType} requires Syndicate trust level 6+ (Underboss)`);
  }

  // Check research level
  if (researchLevel < recipe.researchRequired) {
    errors.push(
      `Research level ${recipe.researchRequired} required (current: ${researchLevel})`
    );
  }

  // Calculate total required resources for the quantity
  const requiredResources: Record<string, number> = {};
  for (const [resource, amount] of Object.entries(recipe.inputs)) {
    requiredResources[resource] = amount * order.quantity;
  }

  // Check resource availability
  const missingResources: Record<string, number> = {};

  for (const [resource, required] of Object.entries(requiredResources)) {
    // Check Tier 0 resources
    if (resource in tier0Resources) {
      const available = tier0Resources[resource as keyof typeof tier0Resources];
      if (available < required) {
        missingResources[resource] = required - available;
        errors.push(`Need ${required} ${resource}, have ${available}`);
      }
    }
    // Check crafted resources
    else if (resource in inventory) {
      const available = inventory[resource as keyof ResourceInventoryMap];
      if (available < required) {
        missingResources[resource] = required - available;
        errors.push(`Need ${required} ${resource}, have ${available}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    requiredResources,
    missingResources,
    researchRequired: recipe.researchRequired,
    craftingTime: recipe.craftingTime * order.quantity,
    isBlackMarketOnly,
  };
}

/**
 * Calculate crafting time with research bonuses
 *
 * Economy branch investment reduces crafting time.
 *
 * @param baseCraftingTime - Base crafting time from recipe
 * @param researchLevel - Empire's research level
 * @param economyInvestment - RP invested in economy branch
 * @param industrialPlanets - Number of industrial planets
 * @returns Adjusted crafting time in turns
 */
export function calculateCraftingTime(
  baseCraftingTime: number,
  researchLevel: number,
  economyInvestment: number = 0,
  industrialPlanets: number = 0
): number {
  let time = baseCraftingTime;

  // Research level bonus: 5% faster per level (from Industrial planet config)
  const researchBonus = researchLevel * INDUSTRIAL_PLANET.craftingTimeReductionPerResearchLevel;
  time *= 1 - researchBonus;

  // Economy branch bonus: up to 10% faster at 20%+ investment
  // Simplified: 0.5% faster per 1% investment, max 10%
  const economyBonus = Math.min(economyInvestment * 0.005, 0.1);
  time *= 1 - economyBonus;

  // Industrial planets: 2% faster per planet, max 20%
  const industrialBonus = Math.min(industrialPlanets * 0.02, 0.2);
  time *= 1 - industrialBonus;

  // Minimum 1 turn
  return Math.max(1, Math.ceil(time));
}

// =============================================================================
// QUEUE MANAGEMENT
// =============================================================================

/**
 * Add an item to the crafting queue
 *
 * Reserves resources immediately upon queuing.
 *
 * @param order - Crafting order to add
 * @param currentTurn - Current game turn
 * @param craftingTime - Calculated crafting time
 * @param currentQueue - Existing queue items
 * @returns New queue item
 */
export function createQueueItem(
  order: CraftingOrder,
  currentTurn: number,
  craftingTime: number,
  currentQueue: QueuedItem[]
): QueuedItem {
  // Find when the last item in queue completes
  const lastCompletion = currentQueue.reduce(
    (max, item) => Math.max(max, item.completionTurn),
    currentTurn
  );

  const startTurn = lastCompletion;
  const completionTurn = startTurn + craftingTime;

  const recipe = getRecipe(order.resourceType);

  // Defensive check - should never happen if validation ran first
  if (!recipe) {
    throw new Error(`Recipe not found for ${order.resourceType}. This is a programming error - validation should have caught this.`);
  }

  const componentsReserved: Record<string, number> = {};
  for (const [resource, amount] of Object.entries(recipe.inputs)) {
    componentsReserved[resource] = amount * order.quantity;
  }

  return {
    id: crypto.randomUUID(),
    resourceType: order.resourceType,
    quantity: order.quantity,
    status: currentQueue.length === 0 ? "in_progress" : "queued",
    startTurn,
    completionTurn,
    componentsReserved,
  };
}

/**
 * Process the crafting queue for a turn
 *
 * Completes items that are ready and starts the next item.
 *
 * @param queue - Current crafting queue
 * @param currentTurn - Current game turn
 * @returns Completed items and updated queue
 */
export function processCraftingQueue(
  queue: QueuedItem[],
  currentTurn: number
): {
  completed: CompletedCrafting[];
  updatedQueue: QueuedItem[];
} {
  const completed: CompletedCrafting[] = [];
  const updatedQueue: QueuedItem[] = [];

  for (const item of queue) {
    if (item.completionTurn <= currentTurn && item.status !== "cancelled") {
      // Item completed
      completed.push({
        resourceType: item.resourceType,
        quantity: item.quantity,
        completedAtTurn: currentTurn,
      });
    } else if (item.status !== "cancelled") {
      // Item still in progress
      updatedQueue.push(item);
    }
  }

  // Start the next item in queue if nothing is currently building
  const hasInProgress = updatedQueue.some((item) => item.status === "in_progress");
  if (!hasInProgress && updatedQueue.length > 0) {
    const nextItem = updatedQueue.find((item) => item.status === "queued");
    if (nextItem) {
      nextItem.status = "in_progress";
    }
  }

  return { completed, updatedQueue };
}

/**
 * Cancel a queued item and refund resources
 *
 * @param queue - Current crafting queue
 * @param itemId - ID of item to cancel
 * @returns Updated queue and refunded resources
 */
export function cancelQueueItem(
  queue: QueuedItem[],
  itemId: string
): {
  updatedQueue: QueuedItem[];
  refundedResources: Record<string, number>;
} {
  const item = queue.find((i) => i.id === itemId);

  if (!item || item.status === "completed") {
    return { updatedQueue: queue, refundedResources: {} };
  }

  // Mark as cancelled
  const updatedQueue = queue.map((i) =>
    i.id === itemId ? { ...i, status: "cancelled" as const } : i
  );

  // Refund reserved components
  const refundedResources = { ...item.componentsReserved };

  return { updatedQueue, refundedResources };
}

/**
 * Get the current state of the crafting queue
 *
 * @param queue - Queue items
 * @param currentTurn - Current game turn
 * @returns Queue state summary
 */
export function getQueueState(
  queue: QueuedItem[],
  currentTurn: number
): CraftingQueueState {
  const activeItems = queue.filter(
    (item) => item.status !== "cancelled" && item.status !== "completed"
  );

  const currentlyBuilding =
    activeItems.find((item) => item.status === "in_progress") || null;

  const totalTurnsRemaining = activeItems.reduce(
    (total, item) => total + Math.max(0, item.completionTurn - currentTurn),
    0
  );

  return {
    items: activeItems,
    totalTurnsRemaining,
    currentlyBuilding,
  };
}

// =============================================================================
// CRAFTING EXECUTION
// =============================================================================

/**
 * Execute a crafting order
 *
 * Validates, deducts resources, and queues the item.
 *
 * @param order - Crafting order to execute
 * @param state - Current game state
 * @returns Result with updated inventory and queue
 */
export function executeCraftingOrder(
  order: CraftingOrder,
  state: {
    researchLevel: number;
    tier0Resources: { credits: number; food: number; ore: number; petroleum: number };
    inventory: ResourceInventoryMap;
    queue: QueuedItem[];
    currentTurn: number;
    economyInvestment?: number;
    industrialPlanets?: number;
    syndicateTrustLevel?: number;
  }
): {
  success: boolean;
  error?: string;
  updatedInventory?: ResourceInventoryMap;
  updatedTier0?: { credits: number; food: number; ore: number; petroleum: number };
  newQueueItem?: QueuedItem;
} {
  // Validate the order
  const validation = validateCraftingOrder(
    order,
    state.researchLevel,
    state.tier0Resources,
    state.inventory,
    state.syndicateTrustLevel
  );

  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.join("; "),
    };
  }

  // Calculate crafting time
  const craftingTime = calculateCraftingTime(
    validation.craftingTime,
    state.researchLevel,
    state.economyInvestment,
    state.industrialPlanets
  );

  // Deduct resources
  const recipe = getRecipe(order.resourceType);
  if (!recipe) {
    return { success: false, error: "Recipe not found" };
  }

  // Separate Tier 0 and crafted resource costs
  const tier0Costs: Record<string, number> = {};
  const craftedCosts: Partial<Record<CraftedResource, number>> = {};

  for (const [resource, amount] of Object.entries(recipe.inputs)) {
    const totalAmount = amount * order.quantity;
    if (resource in state.tier0Resources) {
      tier0Costs[resource] = totalAmount;
    } else {
      craftedCosts[resource as CraftedResource] = totalAmount;
    }
  }

  // Apply Tier 0 deductions
  const updatedTier0 = { ...state.tier0Resources };
  for (const [resource, amount] of Object.entries(tier0Costs)) {
    updatedTier0[resource as keyof typeof updatedTier0] -= amount;
  }

  // Apply crafted resource deductions
  const updatedInventory = deductResources(state.inventory, craftedCosts);

  // Create queue item
  const newQueueItem = createQueueItem(
    order,
    state.currentTurn,
    craftingTime,
    state.queue
  );

  return {
    success: true,
    updatedInventory,
    updatedTier0,
    newQueueItem,
  };
}

// =============================================================================
// AVAILABLE RECIPES
// =============================================================================

/**
 * Get all recipes available at a given research level
 *
 * @param researchLevel - Empire's current research level
 * @param includeFuture - Include recipes for higher levels (grayed out in UI)
 * @returns Array of available recipe information
 */
export function getAvailableRecipes(
  researchLevel: number,
  includeFuture: boolean = false
): Array<{
  resource: CraftedResource;
  tier: 1 | 2 | 3;
  researchRequired: number;
  isAvailable: boolean;
  craftingTime: number;
  inputs: Record<string, number>;
}> {
  const recipes: Array<{
    resource: CraftedResource;
    tier: 1 | 2 | 3;
    researchRequired: number;
    isAvailable: boolean;
    craftingTime: number;
    inputs: Record<string, number>;
  }> = [];

  // Tier 1 - always available
  for (const [resource, recipe] of Object.entries(TIER_1_RECIPES)) {
    recipes.push({
      resource: resource as Tier1Resource,
      tier: 1,
      researchRequired: 0,
      isAvailable: true,
      craftingTime: recipe.craftingTime,
      inputs: recipe.inputs as Record<string, number>,
    });
  }

  // Tier 2
  for (const [resource, recipe] of Object.entries(TIER_2_RECIPES)) {
    const isAvailable = researchLevel >= recipe.researchRequired;
    if (isAvailable || includeFuture) {
      recipes.push({
        resource: resource as Tier2Resource,
        tier: 2,
        researchRequired: recipe.researchRequired,
        isAvailable,
        craftingTime: recipe.craftingTime,
        inputs: recipe.inputs as Record<string, number>,
      });
    }
  }

  // Tier 3
  for (const [resource, recipe] of Object.entries(TIER_3_RECIPES)) {
    const isAvailable = researchLevel >= recipe.researchRequired && !recipe.blackMarketOnly;
    if (isAvailable || includeFuture) {
      recipes.push({
        resource: resource as Tier3Resource,
        tier: 3,
        researchRequired: recipe.researchRequired,
        isAvailable,
        craftingTime: recipe.craftingTime,
        inputs: recipe.inputs as Record<string, number>,
      });
    }
  }

  return recipes;
}

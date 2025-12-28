"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  resourceInventory,
  craftingQueue,
  empires,
  researchProgress,
  games,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  executeCraftingOrder,
  getAvailableRecipes,
  type CraftingOrder,
  type QueuedItem,
} from "@/lib/game/services/crafting-service";
import {
  CRAFTED_RESOURCE_LABELS,
  RESOURCE_TIERS,
  type CraftedResource,
} from "@/lib/game/constants/crafting";
import { createEmptyInventory, type ResourceInventoryMap } from "@/lib/game/services/resource-tier-service";

// =============================================================================
// COOKIE HELPERS
// =============================================================================

const GAME_ID_COOKIE = "gameId";
const EMPIRE_ID_COOKIE = "empireId";

async function getGameCookies(): Promise<{
  gameId: string | undefined;
  empireId: string | undefined;
}> {
  const cookieStore = await cookies();
  return {
    gameId: cookieStore.get(GAME_ID_COOKIE)?.value,
    empireId: cookieStore.get(EMPIRE_ID_COOKIE)?.value,
  };
}

// =============================================================================
// RESOURCE INVENTORY ACTIONS
// =============================================================================

export interface InventoryItem {
  resourceType: CraftedResource;
  label: string;
  tier: 1 | 2 | 3;
  quantity: number;
}

/**
 * Get the player's crafted resource inventory (Tier 1-3).
 */
export async function getResourceInventoryAction(): Promise<{
  items: InventoryItem[];
  byTier: Record<1 | 2 | 3, InventoryItem[]>;
} | null> {
  try {
    const { gameId, empireId } = await getGameCookies();

    if (!gameId || !empireId) {
      return null;
    }

    const inventory = await db.query.resourceInventory.findMany({
      where: and(
        eq(resourceInventory.empireId, empireId),
        eq(resourceInventory.gameId, gameId)
      ),
    });

    const items: InventoryItem[] = inventory.map((item) => ({
      resourceType: item.resourceType as CraftedResource,
      label: CRAFTED_RESOURCE_LABELS[item.resourceType as CraftedResource],
      tier: RESOURCE_TIERS[item.resourceType as CraftedResource],
      quantity: item.quantity,
    }));

    // Group by tier
    const byTier: Record<1 | 2 | 3, InventoryItem[]> = {
      1: items.filter((i) => i.tier === 1),
      2: items.filter((i) => i.tier === 2),
      3: items.filter((i) => i.tier === 3),
    };

    return { items, byTier };
  } catch (error) {
    console.error("Failed to get resource inventory:", error);
    return null;
  }
}

// =============================================================================
// CRAFTING QUEUE ACTIONS
// =============================================================================

export interface QueueItemDisplay {
  id: string;
  resourceType: CraftedResource;
  label: string;
  tier: 1 | 2 | 3;
  quantity: number;
  status: "queued" | "in_progress" | "completed" | "cancelled";
  startTurn: number;
  completionTurn: number;
  turnsRemaining: number;
}

/**
 * Get the player's crafting queue.
 */
export async function getCraftingQueueAction(currentTurn?: number): Promise<{
  items: QueueItemDisplay[];
  currentlyBuilding: QueueItemDisplay | null;
  totalTurnsRemaining: number;
} | null> {
  try {
    const { gameId, empireId } = await getGameCookies();

    if (!gameId || !empireId) {
      return null;
    }

    // Get current game turn if not provided
    let turn = currentTurn;
    if (!turn) {
      const game = await db.query.games.findFirst({
        where: eq(games.id, gameId),
      });
      turn = game?.currentTurn ?? 1;
    }

    const queue = await db.query.craftingQueue.findMany({
      where: and(
        eq(craftingQueue.empireId, empireId),
        eq(craftingQueue.gameId, gameId)
      ),
      orderBy: (q, { asc }) => [asc(q.queuePosition)],
    });

    const items: QueueItemDisplay[] = queue
      .filter((item) => item.status !== "completed" && item.status !== "cancelled")
      .map((item) => ({
        id: item.id,
        resourceType: item.resourceType as CraftedResource,
        label: CRAFTED_RESOURCE_LABELS[item.resourceType as CraftedResource],
        tier: RESOURCE_TIERS[item.resourceType as CraftedResource],
        quantity: item.quantity,
        status: item.status as QueueItemDisplay["status"],
        startTurn: item.startTurn,
        completionTurn: item.completionTurn,
        turnsRemaining: Math.max(0, item.completionTurn - turn!),
      }));

    const currentlyBuilding = items.find((i) => i.status === "in_progress") || null;
    const totalTurnsRemaining = items.reduce((sum, i) => sum + i.turnsRemaining, 0);

    return {
      items,
      currentlyBuilding,
      totalTurnsRemaining,
    };
  } catch (error) {
    console.error("Failed to get crafting queue:", error);
    return null;
  }
}

// =============================================================================
// RECIPE ACTIONS
// =============================================================================

export interface RecipeDisplay {
  resource: CraftedResource;
  label: string;
  tier: 1 | 2 | 3;
  researchRequired: number;
  isAvailable: boolean;
  craftingTime: number;
  inputs: Array<{ resource: string; label: string; amount: number }>;
}

/**
 * Get available crafting recipes.
 */
export async function getAvailableRecipesAction(
  includeFuture: boolean = true
): Promise<RecipeDisplay[] | null> {
  try {
    const { gameId, empireId } = await getGameCookies();

    if (!gameId || !empireId) {
      return null;
    }

    // Get empire's research level
    const research = await db.query.researchProgress.findFirst({
      where: and(
        eq(researchProgress.empireId, empireId),
        eq(researchProgress.gameId, gameId)
      ),
    });

    const researchLevel = research?.researchLevel ?? 1;

    const recipes = getAvailableRecipes(researchLevel, includeFuture);

    return recipes.map((recipe) => ({
      resource: recipe.resource,
      label: CRAFTED_RESOURCE_LABELS[recipe.resource],
      tier: recipe.tier,
      researchRequired: recipe.researchRequired,
      isAvailable: recipe.isAvailable,
      craftingTime: recipe.craftingTime,
      inputs: Object.entries(recipe.inputs).map(([resource, amount]) => ({
        resource,
        label: formatResourceLabel(resource),
        amount,
      })),
    }));
  } catch (error) {
    console.error("Failed to get available recipes:", error);
    return null;
  }
}

function formatResourceLabel(resource: string): string {
  // Check if it's a crafted resource
  if (resource in CRAFTED_RESOURCE_LABELS) {
    return CRAFTED_RESOURCE_LABELS[resource as CraftedResource];
  }
  // Format Tier 0 resources
  return resource
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// =============================================================================
// CRAFTING ORDER ACTIONS
// =============================================================================

export interface CraftingResult {
  success: boolean;
  error?: string;
  queuePosition?: number;
  completionTurn?: number;
}

/**
 * Queue a crafting order.
 */
export async function queueCraftingOrderAction(
  resourceType: CraftedResource,
  quantity: number
): Promise<CraftingResult> {
  try {
    const { gameId, empireId } = await getGameCookies();

    if (!gameId || !empireId) {
      return { success: false, error: "No active game session" };
    }

    if (quantity <= 0) {
      return { success: false, error: "Quantity must be positive" };
    }

    // Prevent DoS via excessive quantities
    const MAX_CRAFT_QUANTITY = 1000;
    if (quantity > MAX_CRAFT_QUANTITY) {
      return { success: false, error: `Maximum quantity is ${MAX_CRAFT_QUANTITY}` };
    }

    // Get current empire state
    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (!empire) {
      return { success: false, error: "Empire not found" };
    }

    // Get research level
    const research = await db.query.researchProgress.findFirst({
      where: and(
        eq(researchProgress.empireId, empireId),
        eq(researchProgress.gameId, gameId)
      ),
    });

    const researchLevel = research?.researchLevel ?? 1;

    // Get current inventory
    const inventoryRows = await db.query.resourceInventory.findMany({
      where: and(
        eq(resourceInventory.empireId, empireId),
        eq(resourceInventory.gameId, gameId)
      ),
    });

    const inventory: ResourceInventoryMap = createEmptyInventory();
    for (const row of inventoryRows) {
      inventory[row.resourceType as keyof ResourceInventoryMap] = row.quantity;
    }

    // Get current queue
    const queueRows = await db.query.craftingQueue.findMany({
      where: and(
        eq(craftingQueue.empireId, empireId),
        eq(craftingQueue.gameId, gameId)
      ),
      orderBy: (q, { asc }) => [asc(q.queuePosition)],
    });

    const queue: QueuedItem[] = queueRows.map((row) => ({
      id: row.id,
      resourceType: row.resourceType as CraftedResource,
      quantity: row.quantity,
      status: row.status as QueuedItem["status"],
      startTurn: row.startTurn,
      completionTurn: row.completionTurn,
      componentsReserved: row.componentsReserved as Record<string, number>,
    }));

    // Get current game turn
    const game = await db.query.games.findFirst({
      where: eq(empires.gameId, gameId),
    });
    const currentTurn = game?.currentTurn ?? 1;

    // Execute crafting order
    const order: CraftingOrder = { resourceType, quantity };
    const result = executeCraftingOrder(order, {
      researchLevel,
      tier0Resources: {
        credits: empire.credits,
        food: empire.food,
        ore: empire.ore,
        petroleum: empire.petroleum,
      },
      inventory,
      queue,
      currentTurn,
    });

    if (!result.success || !result.newQueueItem) {
      return { success: false, error: result.error };
    }

    // Update Tier 0 resources
    if (result.updatedTier0) {
      await db
        .update(empires)
        .set({
          credits: result.updatedTier0.credits,
          food: result.updatedTier0.food,
          ore: result.updatedTier0.ore,
          petroleum: result.updatedTier0.petroleum,
          updatedAt: new Date(),
        })
        .where(eq(empires.id, empireId));
    }

    // Update inventory (deduct used resources)
    if (result.updatedInventory) {
      for (const [type, qty] of Object.entries(result.updatedInventory)) {
        if (qty !== inventory[type as keyof ResourceInventoryMap]) {
          const existing = inventoryRows.find((r) => r.resourceType === type);
          if (existing) {
            await db
              .update(resourceInventory)
              .set({ quantity: qty, updatedAt: new Date() })
              .where(eq(resourceInventory.id, existing.id));
          }
        }
      }
    }

    // Add to queue
    await db.insert(craftingQueue).values({
      empireId,
      gameId,
      resourceType: result.newQueueItem.resourceType,
      quantity: result.newQueueItem.quantity,
      status: result.newQueueItem.status,
      componentsReserved: result.newQueueItem.componentsReserved,
      startTurn: result.newQueueItem.startTurn,
      completionTurn: result.newQueueItem.completionTurn,
      queuePosition: queue.length + 1,
    });

    return {
      success: true,
      queuePosition: queue.length + 1,
      completionTurn: result.newQueueItem.completionTurn,
    };
  } catch (error) {
    console.error("Failed to queue crafting order:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to queue order",
    };
  }
}

/**
 * Cancel a crafting order and refund resources.
 */
export async function cancelCraftingOrderAction(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { gameId, empireId } = await getGameCookies();

    if (!gameId || !empireId) {
      return { success: false, error: "No active game session" };
    }

    // Find the queue item
    const item = await db.query.craftingQueue.findFirst({
      where: and(
        eq(craftingQueue.id, itemId),
        eq(craftingQueue.empireId, empireId)
      ),
    });

    if (!item) {
      return { success: false, error: "Item not found" };
    }

    if (item.status === "completed") {
      return { success: false, error: "Cannot cancel completed item" };
    }

    // Refund reserved components - both Tier 0 and crafted resources
    const reserved = item.componentsReserved as Record<string, number>;
    const tier0Refunds: { credits?: number; food?: number; ore?: number; petroleum?: number } = {};

    for (const [resource, amount] of Object.entries(reserved)) {
      // Handle Tier 0 resources (credits, food, ore, petroleum)
      if (resource === "credits" || resource === "food" || resource === "ore" || resource === "petroleum") {
        tier0Refunds[resource as keyof typeof tier0Refunds] = amount;
        continue;
      }

      // Handle crafted resources
      if (resource in RESOURCE_TIERS) {
        const existing = await db.query.resourceInventory.findFirst({
          where: and(
            eq(resourceInventory.empireId, empireId),
            eq(resourceInventory.gameId, gameId),
            eq(resourceInventory.resourceType, resource as CraftedResource)
          ),
        });

        if (existing) {
          await db
            .update(resourceInventory)
            .set({
              quantity: existing.quantity + amount,
              updatedAt: new Date(),
            })
            .where(eq(resourceInventory.id, existing.id));
        }
      }
    }

    // Refund Tier 0 resources to empire
    if (Object.keys(tier0Refunds).length > 0) {
      const empire = await db.query.empires.findFirst({
        where: eq(empires.id, empireId),
      });
      if (empire) {
        await db
          .update(empires)
          .set({
            credits: empire.credits + (tier0Refunds.credits ?? 0),
            food: empire.food + (tier0Refunds.food ?? 0),
            ore: empire.ore + (tier0Refunds.ore ?? 0),
            petroleum: empire.petroleum + (tier0Refunds.petroleum ?? 0),
            updatedAt: new Date(),
          })
          .where(eq(empires.id, empireId));
      }
    }

    // Mark as cancelled
    await db
      .update(craftingQueue)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(craftingQueue.id, itemId));

    return { success: true };
  } catch (error) {
    console.error("Failed to cancel crafting order:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel order",
    };
  }
}

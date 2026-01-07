"use server";

/**
 * Market Server Actions (M7)
 *
 * Server actions for buying and selling resources on the global market.
 * All inputs are validated with Zod schemas per reviewer checklist.
 */

import { z } from "zod";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  type TradableResource,
  getMarketStatus,
  validateBuyOrder,
  executeBuyOrder,
  validateSellOrder,
  executeSellOrder,
  getOrderHistory,
} from "@/lib/market";
import { checkRateLimit } from "@/lib/security/rate-limiter";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const UUIDSchema = z.string().uuid("Invalid UUID format");

const ResourceTypeSchema = z.enum(["food", "ore", "petroleum"], {
  error: "Invalid resource type",
});

const MarketStatusSchema = z.object({
  gameId: UUIDSchema,
  empireId: UUIDSchema,
});

const TradeOrderSchema = z.object({
  gameId: UUIDSchema,
  empireId: UUIDSchema,
  resourceType: ResourceTypeSchema,
  quantity: z.number().int().positive("Quantity must be a positive integer"),
});

const OrderHistorySchema = z.object({
  empireId: UUIDSchema,
});

// =============================================================================
// GET MARKET STATUS
// =============================================================================

export async function getMarketStatusAction(gameId: string, empireId: string) {
  try {
    // Validate inputs
    const parsed = MarketStatusSchema.safeParse({ gameId, empireId });
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const status = await getMarketStatus(parsed.data.gameId, parsed.data.empireId);
    if (!status) {
      return { success: false as const, error: "Failed to fetch market status" };
    }
    return { success: true as const, data: status };
  } catch (error) {
    console.error("Error fetching market status:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// BUY RESOURCES
// =============================================================================

export async function buyResourceAction(
  gameId: string,
  empireId: string,
  resourceType: string,
  quantity: number
) {
  try {
    // Validate inputs with Zod
    const parsed = TradeOrderSchema.safeParse({ gameId, empireId, resourceType, quantity });
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    // SECURITY: Rate limiting to prevent market manipulation
    const rateLimitResult = checkRateLimit(parsed.data.empireId, "MARKET_ACTION");
    if (!rateLimitResult.allowed) {
      const waitSeconds = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return { success: false as const, error: `Rate limit exceeded. Please wait ${waitSeconds} seconds.` };
    }

    // Get current turn
    const game = await db.query.games.findFirst({
      where: eq(games.id, parsed.data.gameId),
    });

    if (!game) {
      return { success: false as const, error: "Game not found" };
    }

    // Execute buy order
    const result = await executeBuyOrder(
      parsed.data.gameId,
      parsed.data.empireId,
      parsed.data.resourceType as TradableResource,
      parsed.data.quantity,
      game.currentTurn
    );

    if (!result.success) {
      return { success: false as const, error: result.error };
    }

    return {
      success: true as const,
      data: {
        newCredits: result.newCredits,
        newResourceAmount: result.newResourceAmount,
        orderId: result.order?.id,
      },
    };
  } catch (error) {
    console.error("Error buying resource:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// SELL RESOURCES
// =============================================================================

export async function sellResourceAction(
  gameId: string,
  empireId: string,
  resourceType: string,
  quantity: number
) {
  try {
    // Validate inputs with Zod
    const parsed = TradeOrderSchema.safeParse({ gameId, empireId, resourceType, quantity });
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    // SECURITY: Rate limiting to prevent market manipulation
    const rateLimitResult = checkRateLimit(parsed.data.empireId, "MARKET_ACTION");
    if (!rateLimitResult.allowed) {
      const waitSeconds = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return { success: false as const, error: `Rate limit exceeded. Please wait ${waitSeconds} seconds.` };
    }

    // Get current turn
    const game = await db.query.games.findFirst({
      where: eq(games.id, parsed.data.gameId),
    });

    if (!game) {
      return { success: false as const, error: "Game not found" };
    }

    // Execute sell order
    const result = await executeSellOrder(
      parsed.data.gameId,
      parsed.data.empireId,
      parsed.data.resourceType as TradableResource,
      parsed.data.quantity,
      game.currentTurn
    );

    if (!result.success) {
      return { success: false as const, error: result.error };
    }

    return {
      success: true as const,
      data: {
        newCredits: result.newCredits,
        newResourceAmount: result.newResourceAmount,
        orderId: result.order?.id,
      },
    };
  } catch (error) {
    console.error("Error selling resource:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// VALIDATE ORDERS
// =============================================================================

export async function validateBuyOrderAction(
  gameId: string,
  empireId: string,
  resourceType: string,
  quantity: number
) {
  try {
    // Validate inputs with Zod
    const parsed = TradeOrderSchema.safeParse({ gameId, empireId, resourceType, quantity });
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const validation = await validateBuyOrder(
      parsed.data.gameId,
      parsed.data.empireId,
      parsed.data.resourceType as TradableResource,
      parsed.data.quantity
    );

    return {
      success: true as const,
      data: validation,
    };
  } catch (error) {
    console.error("Error validating buy order:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

export async function validateSellOrderAction(
  gameId: string,
  empireId: string,
  resourceType: string,
  quantity: number
) {
  try {
    // Validate inputs with Zod
    const parsed = TradeOrderSchema.safeParse({ gameId, empireId, resourceType, quantity });
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const validation = await validateSellOrder(
      parsed.data.gameId,
      parsed.data.empireId,
      parsed.data.resourceType as TradableResource,
      parsed.data.quantity
    );

    return {
      success: true as const,
      data: validation,
    };
  } catch (error) {
    console.error("Error validating sell order:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// ORDER HISTORY
// =============================================================================

export async function getOrderHistoryAction(empireId: string) {
  try {
    // Validate inputs with Zod
    const parsed = OrderHistorySchema.safeParse({ empireId });
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const orders = await getOrderHistory(parsed.data.empireId);
    return { success: true as const, data: orders };
  } catch (error) {
    console.error("Error fetching order history:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

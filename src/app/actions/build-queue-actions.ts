"use server";

import {
  addToBuildQueue,
  cancelBuildOrder,
  getBuildQueueStatus,
  type AddToQueueResult,
  type CancelBuildResult,
  type QueueStatus,
} from "@/lib/game/services/military/build-queue-service";
import type { UnitType } from "@/lib/game/unit-config";
import { isFeatureUnlocked } from "@/lib/constants/unlocks";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  isValidUnitType,
  isValidUUID,
  sanitizeQuantity,
  verifyEmpireOwnership,
} from "@/lib/security/validation";
import { getGameSession } from "@/lib/session";

// =============================================================================
// BUILD QUEUE ACTIONS
// =============================================================================

/**
 * Add units to the build queue.
 *
 * SECURITY: Validates unit type and quantity at runtime, verifies empire ownership.
 */
export async function addToBuildQueueAction(
  unitType: UnitType,
  quantity: number
): Promise<AddToQueueResult> {
  // Validate unit type at runtime (TypeScript types are compile-time only)
  if (!isValidUnitType(unitType)) {
    return { success: false, error: "Invalid unit type" };
  }

  // Validate and sanitize quantity
  const safeQuantity = sanitizeQuantity(quantity, 1, 100_000);
  if (safeQuantity === undefined) {
    return { success: false, error: "Invalid quantity (must be between 1 and 100,000)" };
  }

  const { gameId, empireId } = await getGameSession();

  if (!gameId || !empireId) {
    return { success: false, error: "No active game session" };
  }

  // Verify empire belongs to the game (authorization check)
  const ownership = await verifyEmpireOwnership(empireId, gameId);
  if (!ownership.valid) {
    return { success: false, error: ownership.error ?? "Authorization failed" };
  }

  try {
    // Check if heavy cruisers are unlocked (Turn 50 - advanced_ships)
    if (unitType === "heavyCruisers") {
      const game = await db.query.games.findFirst({
        where: eq(games.id, gameId),
      });
      if (game && !isFeatureUnlocked("advanced_ships", game.currentTurn)) {
        return { success: false, error: "Heavy Cruisers not yet available (requires Turn 50)" };
      }
    }

    return await addToBuildQueue(empireId, gameId, unitType, safeQuantity);
  } catch (error) {
    console.error("Failed to add to build queue:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add to build queue",
    };
  }
}

/**
 * Cancel a build order.
 *
 * SECURITY: Validates queue ID format and verifies empire ownership.
 */
export async function cancelBuildOrderAction(
  queueId: string
): Promise<CancelBuildResult> {
  // Validate queue ID format
  if (!isValidUUID(queueId)) {
    return { success: false, error: "Invalid queue ID format" };
  }

  const { gameId, empireId } = await getGameSession();

  if (!gameId || !empireId) {
    return { success: false, error: "No active game session" };
  }

  // Verify empire belongs to the game (authorization check)
  const ownership = await verifyEmpireOwnership(empireId, gameId);
  if (!ownership.valid) {
    return { success: false, error: ownership.error ?? "Authorization failed" };
  }

  try {
    return await cancelBuildOrder(empireId, queueId);
  } catch (error) {
    console.error("Failed to cancel build order:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel build order",
    };
  }
}

/**
 * Get the current build queue status.
 */
export async function getBuildQueueStatusAction(): Promise<QueueStatus | null> {
  const { empireId } = await getGameSession();

  if (!empireId) {
    return null;
  }

  try {
    return await getBuildQueueStatus(empireId);
  } catch (error) {
    console.error("Failed to get build queue status:", error);
    return null;
  }
}

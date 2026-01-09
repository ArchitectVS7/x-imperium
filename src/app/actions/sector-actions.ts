"use server";

import {
  colonizeSector,
  releaseSector,
  getSectorPurchaseInfo,
  getAllSectorPurchaseInfo,
  type ColonizeSectorResult,
  type ReleaseSectorResult,
  type SectorPurchaseInfo,
} from "@/lib/game/services/geography/sector-service";
import { getGameById } from "@/lib/game/repositories/game-repository";
import type { SectorType } from "@/lib/game/constants";
import {
  isValidSectorType,
  isValidUUID,
  verifyEmpireOwnership,
} from "@/lib/security/validation";
import { getGameSession } from "@/lib/session";

// =============================================================================
// SECTOR ACTIONS
// =============================================================================

/**
 * Colonize a sector of the specified type.
 *
 * SECURITY: Validates sector type at runtime and verifies empire ownership.
 */
export async function colonizeSectorAction(
  sectorType: SectorType
): Promise<ColonizeSectorResult> {
  // Validate sector type at runtime (TypeScript types are compile-time only)
  if (!isValidSectorType(sectorType)) {
    return { success: false, error: "Invalid sector type" };
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

  // Get current game for turn number
  const game = await getGameById(gameId);
  if (!game) {
    return { success: false, error: "Game not found" };
  }

  try {
    return await colonizeSector(empireId, sectorType, gameId, game.currentTurn);
  } catch (error) {
    console.error("Failed to colonize sector:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to colonize sector",
    };
  }
}

/**
 * Release (sell) a sector by ID.
 *
 * SECURITY: Validates sector ID format and verifies empire ownership.
 */
export async function releaseSectorAction(
  sectorId: string
): Promise<ReleaseSectorResult> {
  // Validate sector ID format
  if (!isValidUUID(sectorId)) {
    return { success: false, error: "Invalid sector ID format" };
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
    return await releaseSector(empireId, sectorId);
  } catch (error) {
    console.error("Failed to release sector:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to release sector",
    };
  }
}

/**
 * Get purchase info for a specific sector type.
 *
 * SECURITY: Validates sector type at runtime.
 */
export async function getSectorPurchaseInfoAction(
  sectorType: SectorType
): Promise<SectorPurchaseInfo | null> {
  // Validate sector type at runtime
  if (!isValidSectorType(sectorType)) {
    return null;
  }

  const { empireId } = await getGameSession();

  if (!empireId) {
    return null;
  }

  try {
    return await getSectorPurchaseInfo(empireId, sectorType);
  } catch (error) {
    console.error("Failed to get sector purchase info:", error);
    return null;
  }
}

/**
 * Get purchase info for all sector types.
 */
export async function getAllSectorPurchaseInfoAction(): Promise<SectorPurchaseInfo[] | null> {
  const { empireId } = await getGameSession();

  if (!empireId) {
    return null;
  }

  try {
    return await getAllSectorPurchaseInfo(empireId);
  } catch (error) {
    console.error("Failed to get all sector purchase info:", error);
    return null;
  }
}

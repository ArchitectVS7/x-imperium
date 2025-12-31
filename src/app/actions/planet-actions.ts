"use server";

import { cookies } from "next/headers";
import {
  buyPlanet,
  releasePlanet,
  getPlanetPurchaseInfo,
  getAllPlanetPurchaseInfo,
  type BuyPlanetResult,
  type ReleasePlanetResult,
  type PlanetPurchaseInfo,
} from "@/lib/game/services/planet-service";
import { getGameById } from "@/lib/game/repositories/game-repository";
import type { PlanetType } from "@/lib/game/constants";
import {
  isValidPlanetType,
  isValidUUID,
  verifyEmpireOwnership,
} from "@/lib/security/validation";

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
// PLANET ACTIONS
// =============================================================================

/**
 * Buy a planet of the specified type.
 *
 * SECURITY: Validates planet type at runtime and verifies empire ownership.
 */
export async function buyPlanetAction(
  planetType: PlanetType
): Promise<BuyPlanetResult> {
  // Validate planet type at runtime (TypeScript types are compile-time only)
  if (!isValidPlanetType(planetType)) {
    return { success: false, error: "Invalid planet type" };
  }

  const { gameId, empireId } = await getGameCookies();

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
    return await buyPlanet(empireId, planetType, gameId, game.currentTurn);
  } catch (error) {
    console.error("Failed to buy planet:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to buy planet",
    };
  }
}

/**
 * Release (sell) a planet by ID.
 *
 * SECURITY: Validates planet ID format and verifies empire ownership.
 */
export async function releasePlanetAction(
  planetId: string
): Promise<ReleasePlanetResult> {
  // Validate planet ID format
  if (!isValidUUID(planetId)) {
    return { success: false, error: "Invalid planet ID format" };
  }

  const { gameId, empireId } = await getGameCookies();

  if (!gameId || !empireId) {
    return { success: false, error: "No active game session" };
  }

  // Verify empire belongs to the game (authorization check)
  const ownership = await verifyEmpireOwnership(empireId, gameId);
  if (!ownership.valid) {
    return { success: false, error: ownership.error ?? "Authorization failed" };
  }

  try {
    return await releasePlanet(empireId, planetId);
  } catch (error) {
    console.error("Failed to release planet:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to release planet",
    };
  }
}

/**
 * Get purchase info for a specific planet type.
 *
 * SECURITY: Validates planet type at runtime.
 */
export async function getPlanetPurchaseInfoAction(
  planetType: PlanetType
): Promise<PlanetPurchaseInfo | null> {
  // Validate planet type at runtime
  if (!isValidPlanetType(planetType)) {
    return null;
  }

  const { empireId } = await getGameCookies();

  if (!empireId) {
    return null;
  }

  try {
    return await getPlanetPurchaseInfo(empireId, planetType);
  } catch (error) {
    console.error("Failed to get planet purchase info:", error);
    return null;
  }
}

/**
 * Get purchase info for all planet types.
 */
export async function getAllPlanetPurchaseInfoAction(): Promise<PlanetPurchaseInfo[] | null> {
  const { empireId } = await getGameCookies();

  if (!empireId) {
    return null;
  }

  try {
    return await getAllPlanetPurchaseInfo(empireId);
  } catch (error) {
    console.error("Failed to get all planet purchase info:", error);
    return null;
  }
}

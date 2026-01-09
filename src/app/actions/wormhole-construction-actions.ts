"use server";

import { db } from "@/lib/db";
import { games, empires } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  calculateMaxWormholeSlots,
  getEmpireWormholeCount,
  getConstructionProjects,
  getPotentialDestinations,
  startWormholeConstruction,
} from "@/lib/game/services/geography/wormhole-construction-service";
import { getGameSession } from "@/lib/session";

// =============================================================================
// TYPES
// =============================================================================

export interface WormholeConstructionData {
  slotInfo: {
    usedSlots: number;
    maxSlots: number;
    availableSlots: number;
  };
  projects: Array<{
    id: string;
    fromRegionId: string;
    fromRegionName: string;
    toRegionId: string;
    toRegionName: string;
    startTurn: number;
    completionTurn: number;
    isComplete: boolean;
  }>;
  destinations: Array<{
    regionId: string;
    regionName: string;
    regionType: string;
    distance: number;
    cost: { credits: number; petroleum: number };
    buildTime: number;
    canAfford: boolean;
  }>;
  playerCredits: number;
  playerPetroleum: number;
  researchLevel: number;
  currentTurn: number;
}

// =============================================================================
// GET CONSTRUCTION DATA
// =============================================================================

/**
 * Get all wormhole construction data for the current player.
 */
export async function getWormholeConstructionDataAction(): Promise<WormholeConstructionData | null> {
  const { gameId, empireId } = await getGameSession();

  if (!gameId || !empireId) {
    return null;
  }

  try {
    // Fetch game info
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });

    if (!game) {
      return null;
    }

    // Fetch player empire
    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (!empire) {
      return null;
    }

    // Get slot info
    const maxSlots = calculateMaxWormholeSlots(empire.fundamentalResearchLevel);
    const usedSlots = await getEmpireWormholeCount(empireId, gameId);

    // Get construction projects
    const projects = await getConstructionProjects(empireId, gameId, game.currentTurn);

    // Get potential destinations
    const destinations = await getPotentialDestinations(
      empireId,
      gameId,
      empire.credits,
      empire.petroleum
    );

    return {
      slotInfo: {
        usedSlots,
        maxSlots,
        availableSlots: Math.max(0, maxSlots - usedSlots),
      },
      projects,
      destinations,
      playerCredits: empire.credits,
      playerPetroleum: empire.petroleum,
      researchLevel: empire.fundamentalResearchLevel,
      currentTurn: game.currentTurn,
    };
  } catch (error) {
    console.error("Failed to get wormhole construction data:", error);
    return null;
  }
}

// =============================================================================
// START CONSTRUCTION
// =============================================================================

export interface StartConstructionResult {
  success: boolean;
  message: string;
  connectionId?: string;
}

/**
 * Start construction of a new wormhole to the specified destination.
 */
export async function startWormholeConstructionAction(
  destinationRegionId: string
): Promise<StartConstructionResult> {
  const { gameId, empireId } = await getGameSession();

  if (!gameId || !empireId) {
    return { success: false, message: "Not logged in" };
  }

  try {
    // Fetch game info for current turn
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });

    if (!game) {
      return { success: false, message: "Game not found" };
    }

    // Call the service function
    const result = await startWormholeConstruction(
      empireId,
      gameId,
      destinationRegionId,
      game.currentTurn
    );

    return {
      success: result.success,
      message: result.message,
      connectionId: result.connectionId,
    };
  } catch (error) {
    console.error("Failed to start wormhole construction:", error);
    return { success: false, message: "An error occurred" };
  }
}

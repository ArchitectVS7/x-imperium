"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { planets, empires } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  getResearchStatus,
  investResearchPoints,
  calculateTurnsToLevel,
  getNextUnlock,
  initializeResearch,
  RESEARCH_POINTS_PER_PLANET,
  MAX_RESEARCH_LEVEL,
  type ResearchStatus,
  type ResearchResult,
} from "@/lib/game/services/research-service";
import { initializeUnitUpgrades } from "@/lib/game/services/upgrade-service";

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
// RESEARCH STATUS ACTIONS
// =============================================================================

/**
 * Get current research status for the player's empire.
 */
export async function getResearchStatusAction(): Promise<ResearchStatus | null> {
  const { gameId, empireId } = await getGameCookies();

  if (!gameId || !empireId) {
    return null;
  }

  let status = await getResearchStatus(empireId);

  // Auto-initialize for existing games that don't have research entries
  if (!status) {
    await initializeResearch(empireId, gameId);
    await initializeUnitUpgrades(empireId, gameId);
    status = await getResearchStatus(empireId);
  }

  return status;
}

/**
 * Get detailed research info including production rate.
 */
export async function getResearchInfoAction(): Promise<{
  status: ResearchStatus;
  researchPlanetCount: number;
  pointsPerTurn: number;
  turnsToNextLevel: number;
  nextUnlock: { unlock: string; level: number } | null;
} | null> {
  const { gameId, empireId } = await getGameCookies();

  if (!gameId || !empireId) {
    return null;
  }

  try {
    let status = await getResearchStatus(empireId);

    // Auto-initialize for existing games that don't have research entries
    if (!status) {
      await initializeResearch(empireId, gameId);
      await initializeUnitUpgrades(empireId, gameId);
      status = await getResearchStatus(empireId);

      if (!status) {
        return null;
      }
    }

    // Count research planets
    const researchPlanets = await db.query.planets.findMany({
      where: and(
        eq(planets.empireId, empireId),
        eq(planets.type, "research")
      ),
    });

    const researchPlanetCount = researchPlanets.length;
    const pointsPerTurn = researchPlanetCount * RESEARCH_POINTS_PER_PLANET;

    // Calculate turns to next level
    const turnsToNextLevel = status.isMaxLevel
      ? 0
      : await calculateTurnsToLevel(empireId, researchPlanetCount, status.level + 1);

    // Get next unlock
    const nextUnlock = getNextUnlock(status.level);

    return {
      status,
      researchPlanetCount,
      pointsPerTurn,
      turnsToNextLevel: turnsToNextLevel === Infinity ? -1 : turnsToNextLevel,
      nextUnlock,
    };
  } catch (error) {
    console.error("Failed to get research info:", error);
    return null;
  }
}

// =============================================================================
// RESEARCH INVESTMENT ACTIONS
// =============================================================================

/**
 * Manually invest research points.
 * Note: This is typically done automatically through turn processing,
 * but allows for manual investment if the game design requires it.
 */
export async function investResearchPointsAction(
  points: number
): Promise<ResearchResult> {
  const { empireId } = await getGameCookies();

  if (!empireId) {
    return { success: false, error: "No active game session" };
  }

  if (points <= 0) {
    return { success: false, error: "Points must be positive" };
  }

  try {
    // Check if empire has research points to spend
    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (!empire) {
      return { success: false, error: "Empire not found" };
    }

    // Note: If we want to allow manual investment from a "research point pool",
    // we would need to add that to the schema. For now, this just adds points.
    return await investResearchPoints(empireId, points);
  } catch (error) {
    console.error("Failed to invest research points:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Investment failed",
    };
  }
}

// =============================================================================
// RESEARCH PROJECTION ACTIONS
// =============================================================================

/**
 * Get projection for reaching a target research level.
 */
export async function getResearchProjectionAction(
  targetLevel: number
): Promise<{
  currentLevel: number;
  targetLevel: number;
  turnsNeeded: number;
  pointsNeeded: number;
  achievable: boolean;
} | null> {
  const { empireId } = await getGameCookies();

  if (!empireId) {
    return null;
  }

  try {
    const status = await getResearchStatus(empireId);
    if (!status) {
      return null;
    }

    // Count research planets
    const researchPlanets = await db.query.planets.findMany({
      where: and(
        eq(planets.empireId, empireId),
        eq(planets.type, "research")
      ),
    });

    const researchPlanetCount = researchPlanets.length;
    const turnsNeeded = await calculateTurnsToLevel(
      empireId,
      researchPlanetCount,
      targetLevel
    );

    // Calculate points needed
    let pointsNeeded = status.pointsToNextLevel;
    for (let level = status.level + 1; level < targetLevel; level++) {
      pointsNeeded += 1000 * Math.pow(2, level);
    }

    return {
      currentLevel: status.level,
      targetLevel,
      turnsNeeded: turnsNeeded === Infinity ? -1 : turnsNeeded,
      pointsNeeded,
      achievable: researchPlanetCount > 0,
    };
  } catch (error) {
    console.error("Failed to get research projection:", error);
    return null;
  }
}

// =============================================================================
// HELPER EXPORTS
// =============================================================================

export { MAX_RESEARCH_LEVEL, RESEARCH_POINTS_PER_PLANET };

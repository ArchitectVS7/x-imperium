"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { sectors, empires } from "@/lib/db/schema";
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
import {
  sanitizeQuantity,
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
// RESEARCH STATUS ACTIONS
// =============================================================================

/**
 * Get current research status for the player's empire.
 */
export async function getResearchStatusAction(): Promise<ResearchStatus | null> {
  try {
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
  } catch (error) {
    console.error("Failed to get research status:", error);
    return null;
  }
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
  try {
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

      if (!status) {
        return null;
      }
    }

    // Count research sectors
    const researchPlanets = await db.query.sectors.findMany({
      where: and(
        eq(sectors.empireId, empireId),
        eq(sectors.type, "research")
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
 *
 * SECURITY: Validates points amount and verifies empire ownership.
 */
export async function investResearchPointsAction(
  points: number
): Promise<ResearchResult> {
  // Validate and sanitize points (max 1 million to prevent overflow)
  const safePoints = sanitizeQuantity(points, 1, 1_000_000);
  if (safePoints === undefined) {
    return { success: false, error: "Invalid points amount (must be between 1 and 1,000,000)" };
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
    // Check if empire has research points to spend
    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (!empire) {
      return { success: false, error: "Empire not found" };
    }

    // Note: If we want to allow manual investment from a "research point pool",
    // we would need to add that to the schema. For now, this just adds points.
    return await investResearchPoints(empireId, safePoints);
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
 *
 * SECURITY: Validates target level range.
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
  // Validate target level (must be positive integer within valid range)
  const safeLevel = sanitizeQuantity(targetLevel, 1, MAX_RESEARCH_LEVEL);
  if (safeLevel === undefined) {
    return null;
  }

  const { empireId } = await getGameCookies();

  if (!empireId) {
    return null;
  }

  try {
    const status = await getResearchStatus(empireId);
    if (!status) {
      return null;
    }

    // Count research sectors
    const researchPlanets = await db.query.sectors.findMany({
      where: and(
        eq(sectors.empireId, empireId),
        eq(sectors.type, "research")
      ),
    });

    const researchPlanetCount = researchPlanets.length;
    const turnsNeeded = await calculateTurnsToLevel(
      empireId,
      researchPlanetCount,
      safeLevel
    );

    // Calculate points needed
    let pointsNeeded = status.pointsToNextLevel;
    for (let level = status.level + 1; level < safeLevel; level++) {
      pointsNeeded += 1000 * Math.pow(2, level);
    }

    return {
      currentLevel: status.level,
      targetLevel: safeLevel,
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
// NOTE: Do NOT export non-async values from "use server" files.
// Import constants directly from research-service if needed:
// import { MAX_RESEARCH_LEVEL, RESEARCH_POINTS_PER_PLANET } from "@/lib/game/services/research-service";
// =============================================================================

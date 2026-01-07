/**
 * Research Service (M3)
 *
 * Handles fundamental research system:
 * - Initialize research for new empires
 * - Process research point generation each turn
 * - Handle level-up when points threshold is reached
 *
 * PRD References:
 * - PRD 9.1: 8 fundamental research levels (0-7)
 * - Exponential cost: 1000 × 2^level
 * - Research sectors generate 100 points/turn
 * - Light Cruisers unlock at level 2
 */

import { db } from "@/lib/db";
import { researchProgress, empires, type ResearchProgress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  calculateResearchCost,
  calculateResearchProgress,
  RESEARCH_BASE_COST,
} from "@/lib/formulas/research-costs";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Research points generated per research sector per turn */
export const RESEARCH_POINTS_PER_PLANET = 100;

/** Maximum research level (0-7 = 8 levels) */
export const MAX_RESEARCH_LEVEL = 7;

// =============================================================================
// TYPES
// =============================================================================

export interface ResearchStatus {
  level: number;
  currentPoints: number;
  requiredPoints: number;
  progressPercent: number;
  pointsToNextLevel: number;
  isMaxLevel: boolean;
}

export interface ResearchResult {
  success: boolean;
  error?: string;
  newLevel?: number;
  leveledUp?: boolean;
}

export interface ResearchProductionResult {
  success: boolean;
  error?: string;
  pointsGenerated: number;
  newLevel: number;
  leveledUp: boolean;
  previousLevel: number;
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize research progress for a new empire.
 * Creates a research_progress entry with level 0.
 */
export async function initializeResearch(
  empireId: string,
  gameId: string
): Promise<ResearchResult> {
  try {
    // Check if already exists
    const existing = await db.query.researchProgress.findFirst({
      where: and(
        eq(researchProgress.empireId, empireId),
        eq(researchProgress.gameId, gameId)
      ),
    });

    if (existing) {
      return { success: true, newLevel: existing.researchLevel };
    }

    // Create new research progress entry
    const [entry] = await db
      .insert(researchProgress)
      .values({
        empireId,
        gameId,
        researchLevel: 0,
        currentInvestment: 0,
        requiredInvestment: RESEARCH_BASE_COST,
      })
      .returning();

    if (!entry) {
      return { success: false, error: "Failed to create research progress" };
    }

    return { success: true, newLevel: 0 };
  } catch (error) {
    console.error("Failed to initialize research:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Initialization failed",
    };
  }
}

// =============================================================================
// RESEARCH STATUS
// =============================================================================

/**
 * Get the current research status for an empire.
 */
export async function getResearchStatus(
  empireId: string
): Promise<ResearchStatus | null> {
  try {
    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (!empire) {
      return null;
    }

    const progress = await db.query.researchProgress.findFirst({
      where: eq(researchProgress.empireId, empireId),
    });

    const level = empire.fundamentalResearchLevel;
    const currentPoints = progress?.currentInvestment ?? 0;
    const requiredPoints = calculateResearchCost(level);
    const progressPercent = calculateResearchProgress(currentPoints, level);
    const isMaxLevel = level >= MAX_RESEARCH_LEVEL;

    return {
      level,
      currentPoints,
      requiredPoints,
      progressPercent,
      pointsToNextLevel: Math.max(0, requiredPoints - currentPoints),
      isMaxLevel,
    };
  } catch (error) {
    console.error("Failed to get research status:", error);
    return null;
  }
}

/**
 * Get the research progress entry for an empire.
 */
export async function getResearchProgress(
  empireId: string
): Promise<ResearchProgress | null> {
  try {
    const progress = await db.query.researchProgress.findFirst({
      where: eq(researchProgress.empireId, empireId),
    });
    return progress ?? null;
  } catch (error) {
    console.error("Failed to get research progress:", error);
    return null;
  }
}

// =============================================================================
// RESEARCH PRODUCTION (TURN PROCESSING)
// =============================================================================

/**
 * Process research point generation for an empire during turn processing.
 *
 * @param empireId - The empire to process
 * @param researchPlanetCount - Number of research sectors owned
 * @returns Result with points generated and level-up status
 */
export async function processResearchProduction(
  empireId: string,
  researchPlanetCount: number
): Promise<ResearchProductionResult> {
  const pointsGenerated = researchPlanetCount * RESEARCH_POINTS_PER_PLANET;

  if (pointsGenerated === 0) {
    // No research sectors, no production
    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    return {
      success: true,
      pointsGenerated: 0,
      newLevel: empire?.fundamentalResearchLevel ?? 0,
      leveledUp: false,
      previousLevel: empire?.fundamentalResearchLevel ?? 0,
    };
  }

  // Add points to research
  const result = await investResearchPoints(empireId, pointsGenerated);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      pointsGenerated,
      newLevel: 0,
      leveledUp: false,
      previousLevel: 0,
    };
  }

  return {
    success: true,
    pointsGenerated,
    newLevel: result.newLevel ?? 0,
    leveledUp: result.leveledUp ?? false,
    previousLevel: (result.newLevel ?? 0) - (result.leveledUp ? 1 : 0),
  };
}

// =============================================================================
// RESEARCH INVESTMENT
// =============================================================================

/**
 * Invest research points for an empire.
 * Handles level-up when threshold is reached (with overflow to next level).
 *
 * @param empireId - The empire investing points
 * @param points - Research points to invest
 * @returns Result with new level and level-up status
 */
export async function investResearchPoints(
  empireId: string,
  points: number
): Promise<ResearchResult> {
  if (points <= 0) {
    return { success: false, error: "Points must be positive" };
  }

  try {
    // Get current state
    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (!empire) {
      return { success: false, error: "Empire not found" };
    }

    const progress = await db.query.researchProgress.findFirst({
      where: eq(researchProgress.empireId, empireId),
    });

    if (!progress) {
      return { success: false, error: "Research progress not initialized" };
    }

    // Check if at max level
    if (empire.fundamentalResearchLevel >= MAX_RESEARCH_LEVEL) {
      return {
        success: true,
        newLevel: MAX_RESEARCH_LEVEL,
        leveledUp: false,
      };
    }

    // Calculate new investment
    let currentLevel = empire.fundamentalResearchLevel;
    let currentPoints = progress.currentInvestment + points;
    let leveledUp = false;

    // Handle level-ups (including overflow)
    while (currentLevel < MAX_RESEARCH_LEVEL) {
      const costForLevel = calculateResearchCost(currentLevel);

      if (currentPoints >= costForLevel) {
        // Level up!
        currentPoints -= costForLevel;
        currentLevel++;
        leveledUp = true;
      } else {
        break;
      }
    }

    // Cap at max level
    if (currentLevel >= MAX_RESEARCH_LEVEL) {
      currentLevel = MAX_RESEARCH_LEVEL;
      currentPoints = 0; // No overflow beyond max
    }

    // Update database
    const requiredForNext = calculateResearchCost(currentLevel);

    await db
      .update(researchProgress)
      .set({
        researchLevel: currentLevel,
        currentInvestment: currentPoints,
        requiredInvestment: requiredForNext,
        updatedAt: new Date(),
      })
      .where(eq(researchProgress.id, progress.id));

    // Also update empire's research level
    if (leveledUp) {
      await db
        .update(empires)
        .set({
          fundamentalResearchLevel: currentLevel,
          updatedAt: new Date(),
        })
        .where(eq(empires.id, empireId));
    }

    return {
      success: true,
      newLevel: currentLevel,
      leveledUp,
    };
  } catch (error) {
    console.error("Failed to invest research points:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Investment failed",
    };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate how many turns until a target research level is reached.
 *
 * @param empireId - The empire to calculate for
 * @param researchPlanetCount - Number of research sectors
 * @param targetLevel - Target research level
 * @returns Number of turns, or Infinity if no research sectors
 */
export async function calculateTurnsToLevel(
  empireId: string,
  researchPlanetCount: number,
  targetLevel: number
): Promise<number> {
  if (researchPlanetCount <= 0) {
    return Infinity;
  }

  const status = await getResearchStatus(empireId);
  if (!status) {
    return Infinity;
  }

  if (status.level >= targetLevel) {
    return 0;
  }

  // Calculate remaining points needed
  let totalPointsNeeded = status.pointsToNextLevel;
  for (let level = status.level + 1; level < targetLevel; level++) {
    totalPointsNeeded += calculateResearchCost(level);
  }

  const pointsPerTurn = researchPlanetCount * RESEARCH_POINTS_PER_PLANET;
  return Math.ceil(totalPointsNeeded / pointsPerTurn);
}

/**
 * Get unlocks available at a specific research level.
 */
export function getResearchUnlocks(level: number): string[] {
  const unlocks: string[] = [];

  if (level >= 2) {
    unlocks.push("Light Cruisers");
  }

  // Future unlocks can be added here as the game expands

  return unlocks;
}

/**
 * Get the next unlock and level required.
 */
export function getNextUnlock(currentLevel: number): {
  unlock: string;
  level: number;
} | null {
  if (currentLevel < 2) {
    return { unlock: "Light Cruisers", level: 2 };
  }

  // No more unlocks beyond level 2 currently
  return null;
}

/**
 * Tell Filter
 *
 * Filters bot tells based on intel level and applies perception checks.
 * Players only see tells they have sufficient intel to detect.
 *
 * @see docs/PRD.md Section 7.10 (Player Readability / Tell System)
 */

import type { ArchetypeName } from "@/lib/bots/archetypes/types";
import {
  type BotTell,
  type TellPerception,
  type IntelLevel,
  type TellType,
  INTEL_LEVELS,
} from "./types";
import {
  performPerceptionCheck,
  getStaticPerception,
  calculateDeceptionDC,
} from "./d20-perception";

// =============================================================================
// INTEL LEVEL FILTERING
// =============================================================================

/**
 * Determines minimum intel level needed to see a tell.
 * - unknown: No tells visible
 * - basic: Generic "something happening" indicator
 * - moderate: Tell type + confidence
 * - full: Full details including emotional context
 */
export function getMinimumIntelForTell(): IntelLevel {
  return "basic";
}

/**
 * Checks if intel level is sufficient to see tells at all.
 */
export function canSeeTells(intelLevel: IntelLevel): boolean {
  const levels = INTEL_LEVELS;
  const intelIndex = levels.indexOf(intelLevel);
  const minIndex = levels.indexOf(getMinimumIntelForTell());
  return intelIndex >= minIndex;
}

/**
 * Checks if intel level reveals tell type (not just generic indicator).
 */
export function canSeeTellType(intelLevel: IntelLevel): boolean {
  return intelLevel === "moderate" || intelLevel === "full";
}

/**
 * Checks if intel level reveals emotional context.
 */
export function canSeeEmotionalContext(intelLevel: IntelLevel): boolean {
  return intelLevel === "full";
}

// =============================================================================
// TELL FILTERING
// =============================================================================

/**
 * Filters tells for a specific empire based on player's intel levels.
 *
 * @param tells - All tells in the game
 * @param viewerEmpireId - The player's empire ID
 * @param intelLevels - Map of empire ID to intel level
 * @param currentTurn - Current game turn (for expiration check)
 * @returns Filtered array of tells visible to the player
 */
export function filterTellsByIntel(
  tells: BotTell[],
  viewerEmpireId: string,
  intelLevels: Map<string, IntelLevel>,
  currentTurn: number
): BotTell[] {
  return tells.filter((tell) => {
    // Don't show own tells (player shouldn't see their own behavior analyzed)
    if (tell.empireId === viewerEmpireId) {
      return false;
    }

    // Check expiration
    if (tell.expiresAtTurn < currentTurn) {
      return false;
    }

    // Check intel level
    const intelLevel = intelLevels.get(tell.empireId) ?? "unknown";
    return canSeeTells(intelLevel);
  });
}

/**
 * Filters tells to only those targeting a specific empire.
 *
 * @param tells - All tells
 * @param targetEmpireId - The empire to filter for
 * @returns Tells targeting the specified empire
 */
export function filterTellsTargetingEmpire(
  tells: BotTell[],
  targetEmpireId: string
): BotTell[] {
  return tells.filter((tell) => tell.targetEmpireId === targetEmpireId);
}

/**
 * Filters tells by type.
 *
 * @param tells - All tells
 * @param types - Tell types to include
 * @returns Filtered tells
 */
export function filterTellsByType(
  tells: BotTell[],
  types: TellType[]
): BotTell[] {
  return tells.filter((tell) => types.includes(tell.tellType));
}

// =============================================================================
// PERCEPTION APPLICATION
// =============================================================================

/**
 * Applies perception checks to tells, potentially revealing bluffs.
 *
 * @param tells - Tells to process
 * @param intelLevels - Map of empire ID to intel level
 * @param archetypes - Map of empire ID to archetype
 * @param researchBonus - Player's research bonus (0-5)
 * @param botStats - Optional map of empire ID to { cmd, doc }
 * @returns Array of tell perceptions with display info
 */
export function applyPerceptionToTells(
  tells: BotTell[],
  intelLevels: Map<string, IntelLevel>,
  archetypes: Map<string, ArchetypeName>,
  researchBonus: number = 0,
  botStats?: Map<string, { cmd: number; doc: number }>
): TellPerception[] {
  return tells.map((tell) => {
    const intelLevel = intelLevels.get(tell.empireId) ?? "unknown";
    const archetype = archetypes.get(tell.empireId) ?? "opportunist";
    const stats = botStats?.get(tell.empireId);

    // Perform hidden perception check
    const checkResult = performPerceptionCheck({
      intelLevel,
      researchBonus,
      tell,
      botArchetype: archetype,
      botCMD: stats?.cmd,
      botDOC: stats?.doc,
    });

    // Determine what the player sees
    let displayType: TellType;
    let displayConfidence = tell.confidence;
    let perceivedTruth = false;

    if (tell.isBluff && checkResult.success) {
      // Player saw through the bluff!
      displayType = tell.trueIntention ?? tell.tellType;
      perceivedTruth = true;
      // Increase confidence when truth is revealed
      displayConfidence = Math.min(1.0, tell.confidence * 1.2);
    } else {
      // Player sees the displayed tell (possibly a bluff)
      displayType = tell.tellType;
    }

    // At basic intel, we only show that *something* is happening
    // We still track the type internally but UI should show generic indicator
    const signalDetected = canSeeTells(intelLevel);

    return {
      tell,
      perceivedTruth,
      displayType,
      displayConfidence,
      signalDetected,
    };
  });
}

// =============================================================================
// AGGREGATION HELPERS
// =============================================================================

/**
 * Groups tells by emitting empire.
 *
 * @param tells - Tells to group
 * @returns Map of empire ID to their tells
 */
export function groupTellsByEmpire(tells: BotTell[]): Map<string, BotTell[]> {
  const grouped = new Map<string, BotTell[]>();

  for (const tell of tells) {
    const existing = grouped.get(tell.empireId) ?? [];
    existing.push(tell);
    grouped.set(tell.empireId, existing);
  }

  return grouped;
}

/**
 * Gets the most confident tell for an empire.
 *
 * @param tells - Tells for an empire
 * @returns The highest confidence tell, or null
 */
export function getMostConfidentTell(tells: BotTell[]): BotTell | null {
  if (tells.length === 0) return null;

  return tells.reduce((best, current) =>
    current.confidence > best.confidence ? current : best
  );
}

/**
 * Gets the most recent tell for an empire.
 *
 * @param tells - Tells for an empire
 * @returns The most recent tell, or null
 */
export function getMostRecentTell(tells: BotTell[]): BotTell | null {
  if (tells.length === 0) return null;

  return tells.reduce((newest, current) =>
    current.createdAtTurn > newest.createdAtTurn ? current : newest
  );
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Determines if a tell should show a warning indicator.
 * Warning tells suggest potential hostile intent.
 */
export function isThreatTell(tellType: TellType): boolean {
  const threatTypes: TellType[] = [
    "military_buildup",
    "target_fixation",
    "aggression_spike",
    "fleet_movement",
  ];
  return threatTypes.includes(tellType);
}

/**
 * Determines if a tell suggests diplomatic opportunity.
 */
export function isDiplomaticTell(tellType: TellType): boolean {
  const diplomaticTypes: TellType[] = [
    "diplomatic_overture",
    "treaty_interest",
  ];
  return diplomaticTypes.includes(tellType);
}

/**
 * Gets a player-facing description for a tell perception.
 *
 * @param perception - The tell perception
 * @param intelLevel - Player's intel level
 * @returns Human-readable description
 */
export function getTellDescription(
  perception: TellPerception,
  intelLevel: IntelLevel
): string {
  if (!canSeeTells(intelLevel)) {
    return "";
  }

  if (!canSeeTellType(intelLevel)) {
    // Basic intel - generic description
    if (isThreatTell(perception.displayType)) {
      return "Hostile activity detected";
    }
    if (isDiplomaticTell(perception.displayType)) {
      return "Diplomatic signals detected";
    }
    return "Activity detected";
  }

  // Moderate/Full intel - specific description
  const descriptions: Record<TellType, string> = {
    military_buildup: "Military buildup detected",
    fleet_movement: "Fleet movement observed",
    target_fixation: "Focused on a target",
    diplomatic_overture: "Seeking diplomatic relations",
    economic_preparation: "Economic preparation underway",
    silence: "Unusually quiet",
    aggression_spike: "Aggressive behavior detected",
    treaty_interest: "Interest in treaties",
  };

  return descriptions[perception.displayType] ?? "Unknown activity";
}

/**
 * Calculates probability player will see through bluffs from a specific empire.
 *
 * @param intelLevel - Player's intel level
 * @param archetype - Bot's archetype
 * @param researchBonus - Player's research bonus
 * @returns Probability (0-1)
 */
export function getBluffDetectionProbability(
  intelLevel: IntelLevel,
  archetype: ArchetypeName,
  researchBonus: number = 0
): number {
  const perception = getStaticPerception(intelLevel, researchBonus);
  const dc = calculateDeceptionDC(archetype);

  // Need to roll at least (DC - perception + 10) on d20
  const requiredRoll = dc - perception + 10;

  if (requiredRoll <= 1) return 1.0;
  if (requiredRoll > 20) return 0.0;

  return (21 - requiredRoll) / 20;
}

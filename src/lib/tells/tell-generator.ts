/**
 * Tell Generator
 *
 * Generates behavioral tells from bot decisions.
 * Uses archetype tell rates and bluff mechanics to create
 * dynamic, personality-driven signals.
 *
 * @see docs/PRD.md Section 7.10 (Player Readability / Tell System)
 */

import type { BotDecision } from "@/lib/bots/types";
import type { ArchetypeName } from "@/lib/bots/archetypes/types";
import { getArchetypeBehavior } from "@/lib/bots/archetypes";
import {
  type TellType,
  type TellGenerationContext,
  type TellGenerationResult,
  type BotTell,
  TELL_INVERSIONS,
  ARCHETYPE_BLUFF_RATES,
  TELL_TYPES,
} from "./types";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Base duration for tells (in turns) */
const BASE_TELL_DURATION = 3;

/** Maximum tell duration */
const MAX_TELL_DURATION = 5;

/** Emotional state multipliers for confidence */
const EMOTIONAL_CONFIDENCE_MULTIPLIERS: Record<string, number> = {
  confident: 1.2,
  arrogant: 1.3,
  desperate: 0.8,
  vengeful: 1.4,
  fearful: 0.7,
  triumphant: 1.1,
  neutral: 1.0,
};

// =============================================================================
// DECISION TO TELL TYPE MAPPING
// =============================================================================

/**
 * Maps a bot decision to the most appropriate tell type.
 *
 * @param decision - The bot's decision
 * @returns The tell type that matches the decision, or null if no tell
 */
export function determineTellType(decision: BotDecision): TellType | null {
  switch (decision.type) {
    case "build_units":
      // Military units trigger military_buildup
      if (
        decision.unitType === "soldiers" ||
        decision.unitType === "fighters" ||
        decision.unitType === "lightCruisers" ||
        decision.unitType === "heavyCruisers" ||
        decision.unitType === "carriers"
      ) {
        return "military_buildup";
      }
      // Stations are defensive
      if (decision.unitType === "stations") {
        return "silence"; // Defensive posture, quiet building
      }
      return null;

    case "attack":
      return "aggression_spike";

    case "diplomacy":
      if (decision.action === "propose_alliance" || decision.action === "propose_nap") {
        return "diplomatic_overture";
      }
      return "treaty_interest";

    case "trade":
      // Selling resources might indicate preparation
      if (decision.action === "sell" && decision.quantity > 100) {
        return "economic_preparation";
      }
      return null;

    case "covert_operation":
      // Covert ops generate subtle tells
      if (decision.operation === "send_spy" || decision.operation === "relations_spying") {
        return "target_fixation";
      }
      if (decision.operation === "demoralize_troops" || decision.operation === "bombing_operations") {
        return "aggression_spike";
      }
      return "silence";

    case "fund_research":
      // Research funding creates economic signals
      if (decision.branch === "military" || decision.branch === "defense") {
        return "military_buildup";
      }
      return "economic_preparation";

    case "upgrade_units":
      return "military_buildup";

    case "buy_planet":
      return "economic_preparation";

    case "do_nothing":
      // Doing nothing can itself be a tell (silence)
      return "silence";

    default:
      return null;
  }
}

// =============================================================================
// TELL GENERATION
// =============================================================================

/**
 * Rolls to determine if an archetype generates a tell.
 *
 * @param archetype - The bot's archetype
 * @returns True if a tell should be generated
 */
export function rollForTell(archetype: ArchetypeName): boolean {
  const behavior = getArchetypeBehavior(archetype);
  const tellRate = behavior.tell.tellRate;
  return Math.random() < tellRate;
}

/**
 * Rolls to determine if a tell should be a bluff.
 *
 * @param archetype - The bot's archetype
 * @param emotionalState - Current emotional state (affects bluff likelihood)
 * @returns True if the tell should be a bluff
 */
export function rollForBluff(
  archetype: ArchetypeName,
  emotionalState?: TellGenerationContext["emotionalState"]
): boolean {
  let bluffRate = ARCHETYPE_BLUFF_RATES[archetype];

  // Emotional state adjustments
  if (emotionalState) {
    switch (emotionalState.state) {
      case "desperate":
        // Desperate bots bluff more
        bluffRate *= 1.5;
        break;
      case "fearful":
        // Fearful bots also bluff more
        bluffRate *= 1.3;
        break;
      case "confident":
      case "triumphant":
        // Confident bots bluff less
        bluffRate *= 0.7;
        break;
      case "vengeful":
        // Vengeful bots are direct
        bluffRate *= 0.5;
        break;
    }
  }

  // Cap bluff rate at 80%
  bluffRate = Math.min(bluffRate, 0.8);

  return Math.random() < bluffRate;
}

/**
 * Generates an inverted (bluff) tell type.
 *
 * @param trueType - The actual tell type
 * @returns The inverted tell type for bluffing
 */
export function invertTellType(trueType: TellType): TellType {
  return TELL_INVERSIONS[trueType];
}

/**
 * Calculates tell confidence based on context.
 *
 * @param context - Generation context
 * @param isBluff - Whether this is a bluff
 * @returns Confidence value (0-1)
 */
export function calculateTellConfidence(
  context: TellGenerationContext,
  isBluff: boolean
): number {
  // Base confidence
  let confidence = 0.6;

  // Archetype-based adjustment
  const behavior = getArchetypeBehavior(context.archetype);
  // Higher tell rate = higher confidence (more obvious tells)
  confidence += (behavior.tell.tellRate - 0.5) * 0.3;

  // Emotional state adjustment
  if (context.emotionalState) {
    const multiplier = EMOTIONAL_CONFIDENCE_MULTIPLIERS[context.emotionalState.state] ?? 1.0;
    confidence *= multiplier;

    // Intensity also affects confidence
    confidence += context.emotionalState.intensity * 0.1;
  }

  // Bluffs have slightly lower confidence (bot is less committed)
  if (isBluff) {
    confidence *= 0.85;
  }

  // Clamp to valid range
  return Math.max(0.1, Math.min(1.0, confidence));
}

/**
 * Calculates tell duration based on archetype.
 *
 * @param archetype - The bot's archetype
 * @returns Duration in turns
 */
export function calculateTellDuration(archetype: ArchetypeName): number {
  const behavior = getArchetypeBehavior(archetype);
  const { min, max } = behavior.tell.advanceWarning;

  // Duration is based on advance warning range
  const baseDuration = Math.floor((min + max) / 2) + BASE_TELL_DURATION;
  const variance = Math.floor(Math.random() * 2) - 1; // -1, 0, or 1

  return Math.min(MAX_TELL_DURATION, Math.max(BASE_TELL_DURATION, baseDuration + variance));
}

/**
 * Generates a tell from a bot decision.
 *
 * @param decision - The bot's decision
 * @param empireId - The bot's empire ID
 * @param gameId - The current game ID
 * @param context - Generation context
 * @returns Generation result with optional tell
 */
export function generateTellFromDecision(
  decision: BotDecision,
  empireId: string,
  gameId: string,
  context: TellGenerationContext
): TellGenerationResult {
  // First, check if this decision type even generates a tell
  const trueType = determineTellType(decision);
  if (!trueType) {
    return {
      generated: false,
      reason: "Decision type does not generate tells",
    };
  }

  // Roll to see if the archetype reveals a tell
  if (!rollForTell(context.archetype)) {
    return {
      generated: false,
      reason: `Archetype ${context.archetype} rolled not to reveal tell`,
    };
  }

  // Roll for bluff
  const isBluff = rollForBluff(context.archetype, context.emotionalState);

  // Determine displayed tell type
  const displayType = isBluff ? invertTellType(trueType) : trueType;

  // Calculate confidence
  const confidence = calculateTellConfidence(context, isBluff);

  // Calculate duration
  const duration = calculateTellDuration(context.archetype);

  // Extract target if applicable
  let targetEmpireId: string | undefined;
  if ("targetId" in decision && typeof decision.targetId === "string") {
    targetEmpireId = decision.targetId;
  }

  const tell: Omit<BotTell, "id" | "createdAt"> = {
    gameId,
    empireId,
    tellType: displayType,
    targetEmpireId,
    isBluff,
    trueIntention: isBluff ? trueType : undefined,
    confidence,
    createdAtTurn: context.currentTurn,
    expiresAtTurn: context.currentTurn + duration,
  };

  return {
    generated: true,
    tell,
  };
}

/**
 * Generates tells for multiple decisions.
 * Filters to only the most significant tell if multiple would be generated.
 *
 * @param decisions - Array of bot decisions
 * @param empireId - The bot's empire ID
 * @param gameId - The current game ID
 * @param context - Generation context
 * @returns Array of generated tells (usually 0-1)
 */
export function generateTellsForTurn(
  decisions: BotDecision[],
  empireId: string,
  gameId: string,
  context: TellGenerationContext
): TellGenerationResult[] {
  const results: TellGenerationResult[] = [];

  // Priority order for tell types (higher = more important)
  const TELL_PRIORITY: Record<TellType, number> = {
    aggression_spike: 10,
    military_buildup: 8,
    target_fixation: 7,
    fleet_movement: 6,
    diplomatic_overture: 5,
    treaty_interest: 4,
    economic_preparation: 3,
    silence: 1,
  };

  // Generate tells for each decision
  for (const decision of decisions) {
    const result = generateTellFromDecision(decision, empireId, gameId, context);
    if (result.generated && result.tell) {
      results.push(result);
    }
  }

  // If multiple tells, keep only the highest priority
  if (results.length > 1) {
    results.sort((a, b) => {
      const priorityA = a.tell ? TELL_PRIORITY[a.tell.tellType] : 0;
      const priorityB = b.tell ? TELL_PRIORITY[b.tell.tellType] : 0;
      return priorityB - priorityA;
    });

    // Keep only the top tell
    return [results[0]!];
  }

  return results;
}

/**
 * Gets a random tell type (for testing or fallback).
 */
export function getRandomTellType(): TellType {
  const index = Math.floor(Math.random() * TELL_TYPES.length);
  return TELL_TYPES[index]!;
}

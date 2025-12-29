/**
 * Bot Emotional State Repository (PRD 7.8)
 *
 * Persistence layer for bot emotional states.
 * Handles CRUD operations for the botEmotionalStates table.
 *
 * Key Features:
 * - getEmotionalState: Retrieve current emotional state
 * - updateEmotionalState: Modify emotional state
 * - recordPermanentGrudge: Store permanent grudges
 * - initializeEmotionalState: Create default state for new bots
 *
 * @see docs/PRD.md Section 7.8 (Emotional State System)
 */

import { db } from "@/lib/db";
import {
  botEmotionalStates,
  botMemories,
  type BotEmotionalState,
  type NewBotEmotionalState,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  type EmotionalStateName,
  type GameEventType,
  type BotEmotionalState as BotEmotionalStateData,
  DEFAULT_EMOTIONAL_STATE,
  DEFAULT_INTENSITY,
  processEmotionalEvent,
  applyIntensityDecay,
  createDefaultEmotionalState,
} from "@/lib/bots/emotions";

// =============================================================================
// INTERFACES
// =============================================================================

export interface EmotionalStateWithContext extends BotEmotionalState {
  /** Decoded permanent grudges from memories */
  permanentGrudges: string[];
}

// =============================================================================
// GET EMOTIONAL STATE
// =============================================================================

/**
 * Get the current emotional state for a bot.
 * Creates a default state if none exists.
 *
 * @param empireId - The bot empire ID
 * @param gameId - The game ID
 * @returns The emotional state record
 */
export async function getEmotionalState(
  empireId: string,
  gameId: string
): Promise<BotEmotionalState> {
  const state = await db.query.botEmotionalStates.findFirst({
    where: and(
      eq(botEmotionalStates.empireId, empireId),
      eq(botEmotionalStates.gameId, gameId)
    ),
  });

  if (!state) {
    // Create default state
    return initializeEmotionalState(empireId, gameId);
  }

  return state;
}

/**
 * Get emotional state with permanent grudges loaded.
 *
 * @param empireId - The bot empire ID
 * @param gameId - The game ID
 * @returns Emotional state with grudge data
 */
export async function getEmotionalStateWithGrudges(
  empireId: string,
  gameId: string
): Promise<EmotionalStateWithContext> {
  const state = await getEmotionalState(empireId, gameId);

  // Load permanent grudges from memories
  const grudges = await db.query.botMemories.findMany({
    where: and(
      eq(botMemories.empireId, empireId),
      eq(botMemories.isPermanentScar, true)
    ),
  });

  const permanentGrudges = Array.from(new Set(grudges.map((g) => g.targetEmpireId)));

  return {
    ...state,
    permanentGrudges,
  };
}

// =============================================================================
// INITIALIZE EMOTIONAL STATE
// =============================================================================

/**
 * Initialize emotional state for a new bot.
 *
 * @param empireId - The bot empire ID
 * @param gameId - The game ID
 * @param initialTurn - Starting turn (default 1)
 * @returns The created emotional state
 */
export async function initializeEmotionalState(
  empireId: string,
  gameId: string,
  initialTurn: number = 1
): Promise<BotEmotionalState> {
  const stateData: NewBotEmotionalState = {
    gameId,
    empireId,
    state: DEFAULT_EMOTIONAL_STATE,
    intensity: String(DEFAULT_INTENSITY),
    previousState: null,
    stateChangedAtTurn: initialTurn,
    recentVictories: 0,
    recentDefeats: 0,
    recentBetrayals: 0,
    recentAlliances: 0,
  };

  const [state] = await db.insert(botEmotionalStates).values(stateData).returning();

  if (!state) {
    throw new Error("Failed to create bot emotional state");
  }

  return state;
}

// =============================================================================
// UPDATE EMOTIONAL STATE
// =============================================================================

/**
 * Update the emotional state for a bot.
 *
 * @param empireId - The bot empire ID
 * @param gameId - The game ID
 * @param newState - The new emotional state
 * @param intensity - New intensity (0-1)
 * @param turn - Current game turn
 * @returns Updated emotional state
 */
export async function updateEmotionalState(
  empireId: string,
  gameId: string,
  newState: EmotionalStateName,
  intensity: number,
  turn: number
): Promise<BotEmotionalState> {
  // Get current state to track previous
  const current = await getEmotionalState(empireId, gameId);

  const stateChanged = current.state !== newState;
  const clampedIntensity = Math.max(0, Math.min(1, intensity));

  const [updated] = await db
    .update(botEmotionalStates)
    .set({
      state: newState,
      intensity: String(clampedIntensity),
      previousState: stateChanged ? current.state : current.previousState,
      stateChangedAtTurn: stateChanged ? turn : current.stateChangedAtTurn,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(botEmotionalStates.empireId, empireId),
        eq(botEmotionalStates.gameId, gameId)
      )
    )
    .returning();

  if (!updated) {
    throw new Error("Failed to update bot emotional state");
  }

  return updated;
}

/**
 * Process a game event and update emotional state accordingly.
 * Uses the emotion trigger system to determine state changes.
 *
 * @param empireId - The bot empire ID
 * @param gameId - The game ID
 * @param event - The game event type
 * @param currentTurn - Current game turn
 * @param targetEmpireId - Optional target empire (for grudges)
 * @returns Updated emotional state
 */
export async function processEmotionalEventForBot(
  empireId: string,
  gameId: string,
  event: GameEventType,
  currentTurn: number,
  targetEmpireId?: string
): Promise<BotEmotionalState> {
  // Get current state
  const dbState = await getEmotionalStateWithGrudges(empireId, gameId);

  // Convert to in-memory format for processing
  const currentState: BotEmotionalStateData = {
    currentState: dbState.state as EmotionalStateName,
    intensity: parseFloat(dbState.intensity),
    stateChangedTurn: dbState.stateChangedAtTurn ?? currentTurn,
    permanentGrudges: dbState.permanentGrudges,
    recentEvents: [], // Would need to track this separately if needed
  };

  // Process the event
  const newState = processEmotionalEvent(event, currentState, currentTurn, targetEmpireId);

  // Update the database
  return updateEmotionalState(
    empireId,
    gameId,
    newState.currentState,
    newState.intensity,
    currentTurn
  );
}

// =============================================================================
// EVENT COUNTERS
// =============================================================================

/**
 * Increment victory counter for emotional tracking.
 *
 * @param empireId - The bot empire ID
 * @param gameId - The game ID
 */
export async function incrementVictories(empireId: string, gameId: string): Promise<void> {
  const current = await getEmotionalState(empireId, gameId);

  await db
    .update(botEmotionalStates)
    .set({
      recentVictories: current.recentVictories + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(botEmotionalStates.empireId, empireId),
        eq(botEmotionalStates.gameId, gameId)
      )
    );
}

/**
 * Increment defeat counter for emotional tracking.
 *
 * @param empireId - The bot empire ID
 * @param gameId - The game ID
 */
export async function incrementDefeats(empireId: string, gameId: string): Promise<void> {
  const current = await getEmotionalState(empireId, gameId);

  await db
    .update(botEmotionalStates)
    .set({
      recentDefeats: current.recentDefeats + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(botEmotionalStates.empireId, empireId),
        eq(botEmotionalStates.gameId, gameId)
      )
    );
}

/**
 * Increment betrayal counter for emotional tracking.
 *
 * @param empireId - The bot empire ID
 * @param gameId - The game ID
 */
export async function incrementBetrayals(empireId: string, gameId: string): Promise<void> {
  const current = await getEmotionalState(empireId, gameId);

  await db
    .update(botEmotionalStates)
    .set({
      recentBetrayals: current.recentBetrayals + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(botEmotionalStates.empireId, empireId),
        eq(botEmotionalStates.gameId, gameId)
      )
    );
}

/**
 * Increment alliance counter for emotional tracking.
 *
 * @param empireId - The bot empire ID
 * @param gameId - The game ID
 */
export async function incrementAlliances(empireId: string, gameId: string): Promise<void> {
  const current = await getEmotionalState(empireId, gameId);

  await db
    .update(botEmotionalStates)
    .set({
      recentAlliances: current.recentAlliances + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(botEmotionalStates.empireId, empireId),
        eq(botEmotionalStates.gameId, gameId)
      )
    );
}

/**
 * Reset event counters (typically at end of turn or after processing).
 *
 * @param empireId - The bot empire ID
 * @param gameId - The game ID
 */
export async function resetEventCounters(empireId: string, gameId: string): Promise<void> {
  await db
    .update(botEmotionalStates)
    .set({
      recentVictories: 0,
      recentDefeats: 0,
      recentBetrayals: 0,
      recentAlliances: 0,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(botEmotionalStates.empireId, empireId),
        eq(botEmotionalStates.gameId, gameId)
      )
    );
}

// =============================================================================
// INTENSITY DECAY
// =============================================================================

/**
 * Apply natural intensity decay over time.
 * Intensity decays toward 0.5 (neutral).
 *
 * @param empireId - The bot empire ID
 * @param gameId - The game ID
 * @param currentTurn - Current game turn
 * @param decayRate - Rate of decay per turn (default 0.02)
 * @returns Updated emotional state
 */
export async function applyEmotionalDecay(
  empireId: string,
  gameId: string,
  currentTurn: number,
  decayRate: number = 0.02
): Promise<BotEmotionalState> {
  const current = await getEmotionalState(empireId, gameId);

  const turnsSinceChange = currentTurn - (current.stateChangedAtTurn ?? currentTurn);
  const currentIntensity = parseFloat(current.intensity);

  // Create temp state for decay calculation
  const tempState: BotEmotionalStateData = {
    currentState: current.state as EmotionalStateName,
    intensity: currentIntensity,
    stateChangedTurn: current.stateChangedAtTurn ?? currentTurn,
    permanentGrudges: [],
    recentEvents: [],
  };

  const decayed = applyIntensityDecay(tempState, turnsSinceChange, decayRate);

  // Only update if intensity actually changed
  if (Math.abs(decayed.intensity - currentIntensity) > 0.001) {
    return updateEmotionalState(
      empireId,
      gameId,
      current.state as EmotionalStateName,
      decayed.intensity,
      currentTurn
    );
  }

  return current;
}

// =============================================================================
// PERMANENT GRUDGE MANAGEMENT
// =============================================================================

/**
 * Record a permanent grudge (stored as a permanent scar memory).
 * This is called when a significant negative event occurs.
 *
 * @param empireId - The bot empire ID
 * @param targetEmpireId - The empire to hold a grudge against
 * @param gameId - The game ID
 * @param turn - Current turn
 * @param reason - Description of why the grudge exists
 */
export async function recordPermanentGrudge(
  empireId: string,
  targetEmpireId: string,
  gameId: string,
  turn: number,
  reason: string = "Unforgivable betrayal"
): Promise<void> {
  // Record as a permanent scar memory
  await db.insert(botMemories).values({
    gameId,
    empireId,
    targetEmpireId,
    memoryType: "ally_betrayed",
    weight: 100, // Maximum weight for grudges
    description: reason,
    turn,
    decayResistance: "1.00", // Permanent
    isPermanentScar: true,
    context: { isGrudge: true },
  });
}

/**
 * Check if a bot has a permanent grudge against a target.
 *
 * @param empireId - The bot empire ID
 * @param targetEmpireId - The target empire ID
 * @returns True if there's a permanent grudge
 */
export async function hasGrudgeAgainst(
  empireId: string,
  targetEmpireId: string
): Promise<boolean> {
  const grudge = await db.query.botMemories.findFirst({
    where: and(
      eq(botMemories.empireId, empireId),
      eq(botMemories.targetEmpireId, targetEmpireId),
      eq(botMemories.isPermanentScar, true)
    ),
  });

  return grudge !== undefined;
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Initialize emotional states for multiple bots.
 * Used when creating bots for a new game.
 *
 * @param empireIds - Array of empire IDs
 * @param gameId - The game ID
 */
export async function initializeEmotionalStatesForGame(
  empireIds: string[],
  gameId: string
): Promise<void> {
  const states: NewBotEmotionalState[] = empireIds.map((empireId) => ({
    gameId,
    empireId,
    state: DEFAULT_EMOTIONAL_STATE,
    intensity: String(DEFAULT_INTENSITY),
    previousState: null,
    stateChangedAtTurn: 1,
    recentVictories: 0,
    recentDefeats: 0,
    recentBetrayals: 0,
    recentAlliances: 0,
  }));

  await db.insert(botEmotionalStates).values(states);
}

/**
 * Apply emotional decay to all bots in a game.
 * Called during turn processing.
 *
 * @param gameId - The game ID
 * @param currentTurn - Current game turn
 */
export async function applyDecayForAllBots(
  gameId: string,
  currentTurn: number
): Promise<void> {
  const states = await db.query.botEmotionalStates.findMany({
    where: eq(botEmotionalStates.gameId, gameId),
  });

  for (const state of states) {
    await applyEmotionalDecay(state.empireId, gameId, currentTurn);
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert database state to in-memory format.
 *
 * @param dbState - Database emotional state record
 * @param permanentGrudges - Array of grudge target IDs
 * @returns In-memory emotional state format
 */
export function toEmotionalStateData(
  dbState: BotEmotionalState,
  permanentGrudges: string[] = []
): BotEmotionalStateData {
  return {
    currentState: dbState.state as EmotionalStateName,
    intensity: parseFloat(dbState.intensity),
    stateChangedTurn: dbState.stateChangedAtTurn ?? 1,
    permanentGrudges,
    recentEvents: [],
  };
}

/**
 * Get emotional state summary for debugging/display.
 *
 * @param empireId - The bot empire ID
 * @param gameId - The game ID
 * @returns Human-readable state summary
 */
export async function getEmotionalStateSummary(
  empireId: string,
  gameId: string
): Promise<{
  state: string;
  intensity: number;
  turnsSinceChange: number;
  recentStats: {
    victories: number;
    defeats: number;
    betrayals: number;
    alliances: number;
  };
  grudgeCount: number;
}> {
  const stateWithGrudges = await getEmotionalStateWithGrudges(empireId, gameId);

  return {
    state: stateWithGrudges.state,
    intensity: parseFloat(stateWithGrudges.intensity),
    turnsSinceChange: stateWithGrudges.stateChangedAtTurn ?? 0,
    recentStats: {
      victories: stateWithGrudges.recentVictories,
      defeats: stateWithGrudges.recentDefeats,
      betrayals: stateWithGrudges.recentBetrayals,
      alliances: stateWithGrudges.recentAlliances,
    },
    grudgeCount: stateWithGrudges.permanentGrudges.length,
  };
}

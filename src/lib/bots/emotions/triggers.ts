/**
 * Emotional State Triggers (PRD 7.8)
 *
 * Defines how game events affect bot emotional states.
 * Events can shift bots between states and affect intensity.
 *
 * @see docs/PRD.md Section 7.8 (Emotional State System)
 */

import type { EmotionalStateName } from "./states";
import { DEFAULT_EMOTIONAL_STATE, DEFAULT_INTENSITY } from "./states";

// =============================================================================
// GAME EVENT TYPES
// =============================================================================

export const GAME_EVENT_TYPES = [
  // Combat events
  "battle_won",
  "battle_lost",
  "sector_captured",
  "sector_lost",
  "invasion_success",
  "invasion_failed",
  "under_attack",
  "attack_repelled",

  // Diplomatic events
  "alliance_formed",
  "alliance_broken",
  "treaty_offered",
  "treaty_rejected",
  "betrayed",
  "saved_by_ally",

  // Economic events
  "trade_success",
  "market_manipulation_detected",
  "resource_shortage",
  "economic_boom",

  // Covert events
  "spy_caught",
  "spy_success",
  "covert_op_against_me",
  "covert_op_success",

  // Power dynamics
  "became_top_3",
  "fell_from_top_3",
  "significantly_outpowered",
  "achieved_dominance",

  // Survival events
  "near_elimination",
  "survived_threat",
  "turns_without_incident",
] as const;

export type GameEventType = (typeof GAME_EVENT_TYPES)[number];

// =============================================================================
// EMOTIONAL RESPONSE INTERFACE
// =============================================================================

export interface EmotionalResponse {
  /** The resulting emotional state */
  newState: EmotionalStateName;
  /** Change to intensity (-1 to +1, added to current) */
  intensityChange: number;
  /** Minimum intensity after this event */
  minIntensity?: number;
  /** Maximum intensity after this event */
  maxIntensity?: number;
}

export interface EventTrigger {
  /** The event type */
  event: GameEventType;
  /** Possible responses based on current state and context */
  responses: {
    /** Response when in stable/positive state */
    fromPositive?: Partial<EmotionalResponse>;
    /** Response when in negative/unstable state */
    fromNegative?: Partial<EmotionalResponse>;
    /** Default response regardless of current state */
    default: EmotionalResponse;
  };
  /** Whether this event can create permanent emotional scars */
  canScar?: boolean;
  /** Display description of the emotional impact */
  description: string;
}

// =============================================================================
// EVENT TRIGGER DEFINITIONS
// =============================================================================

/**
 * Event triggers that cause emotional state changes.
 *
 * Each event can shift the bot's emotional state and intensity.
 * The system considers the current state when determining response.
 */
export const EVENT_TRIGGERS: Record<GameEventType, EventTrigger> = {
  // ==========================================================================
  // COMBAT EVENTS
  // ==========================================================================

  battle_won: {
    event: "battle_won",
    description: "Victory in battle breeds confidence",
    responses: {
      fromNegative: { newState: "confident", intensityChange: +0.15 },
      default: { newState: "triumphant", intensityChange: +0.20, maxIntensity: 1.0 },
    },
  },

  battle_lost: {
    event: "battle_lost",
    description: "Defeat in battle shakes confidence",
    responses: {
      fromPositive: { newState: "confident", intensityChange: -0.20 },
      default: { newState: "fearful", intensityChange: +0.25 },
    },
  },

  sector_captured: {
    event: "sector_captured",
    description: "Successful conquest fuels ambition",
    responses: {
      fromNegative: { newState: "confident", intensityChange: +0.20 },
      default: { newState: "triumphant", intensityChange: +0.25, maxIntensity: 1.0 },
    },
  },

  sector_lost: {
    event: "sector_lost",
    description: "Losing territory creates fear or anger",
    canScar: true,
    responses: {
      fromPositive: { newState: "vengeful", intensityChange: +0.30 },
      default: { newState: "desperate", intensityChange: +0.35, minIntensity: 0.4 },
    },
  },

  invasion_success: {
    event: "invasion_success",
    description: "Successful invasion confirms military prowess",
    responses: {
      fromNegative: { newState: "triumphant", intensityChange: +0.25 },
      default: { newState: "arrogant", intensityChange: +0.15 },
    },
  },

  invasion_failed: {
    event: "invasion_failed",
    description: "Failed invasion is humiliating",
    responses: {
      fromPositive: { newState: "vengeful", intensityChange: +0.30 },
      default: { newState: "fearful", intensityChange: +0.20 },
    },
  },

  under_attack: {
    event: "under_attack",
    description: "Being attacked triggers defensive emotions",
    responses: {
      fromPositive: { newState: "vengeful", intensityChange: +0.25 },
      default: { newState: "fearful", intensityChange: +0.30 },
    },
  },

  attack_repelled: {
    event: "attack_repelled",
    description: "Repelling an attack restores confidence",
    responses: {
      fromNegative: { newState: "confident", intensityChange: +0.20 },
      default: { newState: "triumphant", intensityChange: +0.15 },
    },
  },

  // ==========================================================================
  // DIPLOMATIC EVENTS
  // ==========================================================================

  alliance_formed: {
    event: "alliance_formed",
    description: "New alliance provides security",
    responses: {
      fromNegative: { newState: "confident", intensityChange: +0.15 },
      default: { newState: "confident", intensityChange: +0.10 },
    },
  },

  alliance_broken: {
    event: "alliance_broken",
    description: "Alliance dissolution creates distrust",
    responses: {
      fromPositive: { newState: "vengeful", intensityChange: +0.20 },
      default: { newState: "fearful", intensityChange: +0.25 },
    },
  },

  treaty_offered: {
    event: "treaty_offered",
    description: "Receiving treaty offer is flattering",
    responses: {
      fromNegative: { newState: "confident", intensityChange: +0.10 },
      default: { newState: "confident", intensityChange: +0.05 },
    },
  },

  treaty_rejected: {
    event: "treaty_rejected",
    description: "Treaty rejection is insulting",
    responses: {
      fromPositive: { newState: "arrogant", intensityChange: +0.15 },
      default: { newState: "vengeful", intensityChange: +0.20 },
    },
  },

  betrayed: {
    event: "betrayed",
    description: "Betrayal by trusted ally is devastating",
    canScar: true,
    responses: {
      default: { newState: "vengeful", intensityChange: +0.50, minIntensity: 0.6 },
    },
  },

  saved_by_ally: {
    event: "saved_by_ally",
    description: "Being saved creates gratitude and relief",
    responses: {
      fromNegative: { newState: "confident", intensityChange: +0.30 },
      default: { newState: "confident", intensityChange: +0.15 },
    },
  },

  // ==========================================================================
  // ECONOMIC EVENTS
  // ==========================================================================

  trade_success: {
    event: "trade_success",
    description: "Profitable trade builds confidence",
    responses: {
      fromNegative: { newState: "confident", intensityChange: +0.05 },
      default: { newState: "confident", intensityChange: +0.05 },
    },
  },

  market_manipulation_detected: {
    event: "market_manipulation_detected",
    description: "Detecting manipulation by others breeds distrust",
    responses: {
      default: { newState: "vengeful", intensityChange: +0.15 },
    },
  },

  resource_shortage: {
    event: "resource_shortage",
    description: "Resource shortage creates desperation",
    responses: {
      fromPositive: { newState: "fearful", intensityChange: +0.20 },
      default: { newState: "desperate", intensityChange: +0.25 },
    },
  },

  economic_boom: {
    event: "economic_boom",
    description: "Economic prosperity breeds confidence",
    responses: {
      fromNegative: { newState: "confident", intensityChange: +0.20 },
      default: { newState: "triumphant", intensityChange: +0.10 },
    },
  },

  // ==========================================================================
  // COVERT EVENTS
  // ==========================================================================

  spy_caught: {
    event: "spy_caught",
    description: "Catching enemy spies feels victorious",
    responses: {
      fromNegative: { newState: "confident", intensityChange: +0.10 },
      default: { newState: "confident", intensityChange: +0.05 },
    },
  },

  spy_success: {
    event: "spy_success",
    description: "Successful espionage builds confidence",
    responses: {
      fromNegative: { newState: "confident", intensityChange: +0.10 },
      default: { newState: "confident", intensityChange: +0.05 },
    },
  },

  covert_op_against_me: {
    event: "covert_op_against_me",
    description: "Being target of covert ops breeds paranoia",
    responses: {
      fromPositive: { newState: "vengeful", intensityChange: +0.20 },
      default: { newState: "fearful", intensityChange: +0.15 },
    },
  },

  covert_op_success: {
    event: "covert_op_success",
    description: "Successful sabotage is satisfying",
    responses: {
      fromNegative: { newState: "triumphant", intensityChange: +0.15 },
      default: { newState: "arrogant", intensityChange: +0.10 },
    },
  },

  // ==========================================================================
  // POWER DYNAMICS
  // ==========================================================================

  became_top_3: {
    event: "became_top_3",
    description: "Rising to top ranks breeds confidence",
    responses: {
      fromNegative: { newState: "triumphant", intensityChange: +0.30 },
      default: { newState: "arrogant", intensityChange: +0.20 },
    },
  },

  fell_from_top_3: {
    event: "fell_from_top_3",
    description: "Falling from power is humiliating",
    responses: {
      fromPositive: { newState: "vengeful", intensityChange: +0.30 },
      default: { newState: "desperate", intensityChange: +0.25 },
    },
  },

  significantly_outpowered: {
    event: "significantly_outpowered",
    description: "Being significantly weaker breeds fear",
    responses: {
      fromPositive: { newState: "fearful", intensityChange: +0.25 },
      default: { newState: "desperate", intensityChange: +0.30 },
    },
  },

  achieved_dominance: {
    event: "achieved_dominance",
    description: "Achieving dominance breeds arrogance",
    responses: {
      default: { newState: "arrogant", intensityChange: +0.40, minIntensity: 0.5 },
    },
  },

  // ==========================================================================
  // SURVIVAL EVENTS
  // ==========================================================================

  near_elimination: {
    event: "near_elimination",
    description: "Near death experience creates desperation",
    canScar: true,
    responses: {
      default: { newState: "desperate", intensityChange: +0.50, minIntensity: 0.7 },
    },
  },

  survived_threat: {
    event: "survived_threat",
    description: "Surviving a major threat builds confidence",
    responses: {
      fromNegative: { newState: "confident", intensityChange: +0.30 },
      default: { newState: "triumphant", intensityChange: +0.20 },
    },
  },

  turns_without_incident: {
    event: "turns_without_incident",
    description: "Peace and stability restore emotional balance",
    responses: {
      fromNegative: { newState: "confident", intensityChange: -0.10 },
      default: { newState: "confident", intensityChange: -0.05 },
    },
  },
} as const;

// =============================================================================
// CURRENT BOT STATE INTERFACE
// =============================================================================

export interface BotEmotionalState {
  /** Current emotional state */
  currentState: EmotionalStateName;
  /** Current intensity (0.0 - 1.0) */
  intensity: number;
  /** Turn when state was last changed */
  stateChangedTurn: number;
  /** Empire IDs this bot has permanent grudges against */
  permanentGrudges: string[];
  /** History of recent emotional events */
  recentEvents: Array<{
    event: GameEventType;
    turn: number;
    targetEmpireId?: string;
  }>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a default emotional state for a new bot.
 *
 * @param startTurn - The turn the bot is created
 * @returns A new BotEmotionalState
 */
export function createDefaultEmotionalState(startTurn: number = 1): BotEmotionalState {
  return {
    currentState: DEFAULT_EMOTIONAL_STATE,
    intensity: DEFAULT_INTENSITY,
    stateChangedTurn: startTurn,
    permanentGrudges: [],
    recentEvents: [],
  };
}

/**
 * Calculate the emotional response to a game event.
 *
 * @param event - The game event type
 * @param currentState - The bot's current emotional state
 * @returns The emotional response
 */
export function calculateEmotionalResponse(
  event: GameEventType,
  currentState: BotEmotionalState
): EmotionalResponse {
  const trigger = EVENT_TRIGGERS[event];
  const { currentState: state } = currentState;

  // Determine if current state is positive or negative
  const isPositive = state === "confident" || state === "triumphant";

  // Get appropriate response
  let response: EmotionalResponse;

  if (isPositive && trigger.responses.fromPositive) {
    response = {
      ...trigger.responses.default,
      ...trigger.responses.fromPositive,
    };
  } else if (!isPositive && trigger.responses.fromNegative) {
    response = {
      ...trigger.responses.default,
      ...trigger.responses.fromNegative,
    };
  } else {
    response = trigger.responses.default;
  }

  return response;
}

/**
 * Apply an emotional response to update the bot's state.
 *
 * @param currentState - Current emotional state
 * @param response - The emotional response to apply
 * @param currentTurn - Current game turn
 * @param event - The triggering event
 * @param targetEmpireId - Optional target empire for grudges
 * @returns Updated emotional state
 */
export function applyEmotionalResponse(
  currentState: BotEmotionalState,
  response: EmotionalResponse,
  currentTurn: number,
  event: GameEventType,
  targetEmpireId?: string
): BotEmotionalState {
  const trigger = EVENT_TRIGGERS[event];

  // Calculate new intensity
  let newIntensity = currentState.intensity + response.intensityChange;

  // Apply min/max constraints
  if (response.minIntensity !== undefined) {
    newIntensity = Math.max(newIntensity, response.minIntensity);
  }
  if (response.maxIntensity !== undefined) {
    newIntensity = Math.min(newIntensity, response.maxIntensity);
  }

  // Clamp to valid range
  newIntensity = Math.max(0, Math.min(1, newIntensity));

  // Check for permanent scar (grudge)
  const newGrudges = [...currentState.permanentGrudges];
  if (trigger.canScar && targetEmpireId && Math.random() < 0.2) {
    // 20% chance of permanent scar per PRD 7.9
    if (!newGrudges.includes(targetEmpireId)) {
      newGrudges.push(targetEmpireId);
    }
  }

  // Add to recent events (keep last 10)
  const newRecentEvents = [
    { event, turn: currentTurn, targetEmpireId },
    ...currentState.recentEvents.slice(0, 9),
  ];

  // Determine if state actually changed
  const stateChanged = currentState.currentState !== response.newState;

  return {
    currentState: response.newState,
    intensity: newIntensity,
    stateChangedTurn: stateChanged ? currentTurn : currentState.stateChangedTurn,
    permanentGrudges: newGrudges,
    recentEvents: newRecentEvents,
  };
}

/**
 * Process a game event and update the bot's emotional state.
 *
 * @param event - The game event type
 * @param currentState - Current emotional state
 * @param currentTurn - Current game turn
 * @param targetEmpireId - Optional target empire for grudges
 * @returns Updated emotional state
 */
export function processEmotionalEvent(
  event: GameEventType,
  currentState: BotEmotionalState,
  currentTurn: number,
  targetEmpireId?: string
): BotEmotionalState {
  const response = calculateEmotionalResponse(event, currentState);
  return applyEmotionalResponse(currentState, response, currentTurn, event, targetEmpireId);
}

/**
 * Apply natural intensity decay over time.
 *
 * @param currentState - Current emotional state
 * @param turnsSinceChange - Turns since the last state change
 * @param decayRate - Rate of decay per turn (default 0.02)
 * @returns Updated emotional state with decayed intensity
 */
export function applyIntensityDecay(
  currentState: BotEmotionalState,
  turnsSinceChange: number,
  decayRate: number = 0.02
): BotEmotionalState {
  // Intensity decays toward 0.5 (neutral)
  const targetIntensity = 0.5;
  const decayAmount = turnsSinceChange * decayRate;

  let newIntensity: number;
  if (currentState.intensity > targetIntensity) {
    newIntensity = Math.max(targetIntensity, currentState.intensity - decayAmount);
  } else {
    newIntensity = Math.min(targetIntensity, currentState.intensity + decayAmount);
  }

  return {
    ...currentState,
    intensity: newIntensity,
  };
}

/**
 * Check if a bot has a permanent grudge against an empire.
 *
 * @param state - The bot's emotional state
 * @param empireId - The empire to check
 * @returns True if there's a permanent grudge
 */
export function hasPermanentGrudge(state: BotEmotionalState, empireId: string): boolean {
  return state.permanentGrudges.includes(empireId);
}

/**
 * Get the dominant emotion from recent events.
 *
 * @param state - The bot's emotional state
 * @returns The most common recent emotional state
 */
export function getDominantRecentEmotion(state: BotEmotionalState): EmotionalStateName | null {
  if (state.recentEvents.length === 0) {
    return null;
  }

  // Count resulting states from recent events
  const stateCounts: Partial<Record<EmotionalStateName, number>> = {};

  for (const recentEvent of state.recentEvents) {
    const trigger = EVENT_TRIGGERS[recentEvent.event];
    const resultState = trigger.responses.default.newState;
    stateCounts[resultState] = (stateCounts[resultState] || 0) + 1;
  }

  // Find the most common
  let maxCount = 0;
  let dominantState: EmotionalStateName | null = null;

  for (const [stateName, count] of Object.entries(stateCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantState = stateName as EmotionalStateName;
    }
  }

  return dominantState;
}

/**
 * Get all game event types as an array.
 */
export const ALL_GAME_EVENTS: GameEventType[] = [...GAME_EVENT_TYPES];

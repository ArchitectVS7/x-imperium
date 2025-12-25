/**
 * Bot Emotions Module (PRD 7.8)
 *
 * Exports emotional state definitions and trigger mechanics.
 * Emotional states affect bot decision-making and are hidden from players.
 *
 * @see docs/PRD.md Section 7.8 (Emotional State System)
 */

// =============================================================================
// STATE EXPORTS
// =============================================================================

export type { EmotionalStateName, EmotionalModifiers, EmotionalStateDefinition } from "./states";

export {
  EMOTIONAL_STATE_NAMES,
  EMOTIONAL_STATES,
  DEFAULT_EMOTIONAL_STATE,
  DEFAULT_INTENSITY,
  POSITIVE_STATES,
  NEGATIVE_STATES,
  AGGRESSIVE_STATES,
  PASSIVE_STATES,
  ALLIANCE_SEEKING_STATES,
  ISOLATIONIST_STATES,
  ALL_EMOTIONAL_STATES,
  getEmotionalState,
  getScaledModifiers,
  applyModifier,
  getDecisionMultiplier,
  getAllianceMultiplier,
  getAggressionMultiplier,
  getNegotiationMultiplier,
  isStateCategory,
} from "./states";

// =============================================================================
// TRIGGER EXPORTS
// =============================================================================

export type { GameEventType, EmotionalResponse, EventTrigger, BotEmotionalState } from "./triggers";

export {
  GAME_EVENT_TYPES,
  EVENT_TRIGGERS,
  ALL_GAME_EVENTS,
  createDefaultEmotionalState,
  calculateEmotionalResponse,
  applyEmotionalResponse,
  processEmotionalEvent,
  applyIntensityDecay,
  hasPermanentGrudge,
  getDominantRecentEmotion,
} from "./triggers";

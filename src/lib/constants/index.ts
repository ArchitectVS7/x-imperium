/**
 * Constants Module
 *
 * Exports all game constants including:
 * - Diplomacy constants (PRD 8.x)
 * - Progressive unlock definitions (PRD 11.1)
 */

// Diplomacy constants
export {
  type TreatyType,
  type DiplomaticRelation,
  type TreatyDefinition,
  type ReputationEvent,
  type ReputationEventType,
  TREATY_TYPES,
  TREATY_MIN_DURATION,
  TREATY_BREAK_COOLDOWN,
  REPUTATION_EVENTS,
  RELATIONSHIP_THRESHOLDS,
  COALITION_MAX_MEMBERS,
  COALITION_MIN_MEMBERS,
  COALITION_REPUTATION_BONUS,
  COALITION_VICTORY_THRESHOLD,
  PROTECTION_PERIOD_TURNS,
  NETWORTH_ATTACK_RATIO,
  getRelationFromReputation,
  getTreatyDefinition,
  getReputationChange,
  isEventPermanent,
  calculateDecayedReputation,
  isUnderProtection,
  canAttackByNetworth,
  ALL_TREATY_TYPES,
  ALL_REPUTATION_EVENTS,
} from "./diplomacy";

// Progressive unlocks
export {
  type UnlockFeature,
  type UnlockDefinition,
  type GamePhase,
  PROGRESSIVE_UNLOCKS,
  UNLOCK_DEFINITIONS,
  UNLOCK_TURNS,
  GAME_PHASES,
  PHASE_NAMES,
  getUnlockedFeatures,
  getNewUnlocks,
  isFeatureUnlocked,
  getUnlockTurn,
  getUnlockDefinition,
  getUpcomingUnlocks,
  getNextUnlock,
  getUnlockProgress,
  getCurrentPhase,
  ALL_UNLOCK_FEATURES,
} from "./unlocks";

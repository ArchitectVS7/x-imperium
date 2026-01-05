/**
 * Bot Tell System Module
 *
 * Exports tell generation, filtering, and perception functionality.
 * The tell system allows bots to emit behavioral signals that players
 * can interpret to gain strategic advantage.
 *
 * @see docs/PRD.md Section 7.10 (Player Readability / Tell System)
 */

// Type exports
export type {
  TellType,
  IntelLevel,
  BotTell,
  TellPerception,
  TellGenerationContext,
  TellGenerationResult,
  PerceptionCheckInput,
  PerceptionCheckResult,
  TellVisualStyle,
} from "./types";

// Constant exports
export {
  TELL_TYPES,
  TELL_INVERSIONS,
  INTEL_LEVELS,
  INTEL_MODIFIERS,
  ARCHETYPE_BLUFF_RATES,
  ARCHETYPE_DECEPTION_DC,
  TELL_VISUAL_STYLES,
  CONFIDENCE_LABELS,
  getConfidenceLabel,
} from "./types";

// Tell generation exports
export {
  determineTellType,
  rollForTell,
  rollForBluff,
  invertTellType,
  calculateTellConfidence,
  calculateTellDuration,
  generateTellFromDecision,
  generateTellsForTurn,
  getRandomTellType,
} from "./tell-generator";

// D20 perception exports
export {
  rollD20,
  calculatePlayerPerception,
  calculateDeceptionDC,
  getStaticPerception,
  performPerceptionCheck,
  estimatePerceptionSuccess,
  getMinimumIntelForPerception,
  getPerceptionChanceDescription,
} from "./d20-perception";

// Tell filter exports
export {
  getMinimumIntelForTell,
  canSeeTells,
  canSeeTellType,
  canSeeEmotionalContext,
  filterTellsByIntel,
  filterTellsTargetingEmpire,
  filterTellsByType,
  applyPerceptionToTells,
  groupTellsByEmpire,
  getMostConfidentTell,
  getMostRecentTell,
  isThreatTell,
  isDiplomaticTell,
  getTellDescription,
  getBluffDetectionProbability,
} from "./tell-filter";

/**
 * Bot AI Module (PRD 7.x)
 *
 * Exports all bot-related systems including:
 * - M5: Random Bot Infrastructure (types, generator, processor, decision engine)
 * - Archetypes (PRD 7.6, 7.10)
 * - Emotional States (PRD 7.8)
 * - Relationship Memory (PRD 7.9)
 *
 * @see docs/PRD.md Section 7 (Bot AI System)
 */

// =============================================================================
// M5: BOT INFRASTRUCTURE EXPORTS
// =============================================================================

// Types
export * from "./types";

// Bot Names
export { BOT_EMPIRE_NAMES, BOT_EMPEROR_NAMES, getBotEmpireName, getBotEmperorName } from "./bot-names";

// Difficulty
export {
  DIFFICULTY_MODIFIERS,
  getDifficultyModifiers,
  applyNightmareBonus,
  shouldMakeSuboptimalChoice,
  selectTarget,
  applySuboptimalQuantity,
} from "./difficulty";

// Bot Generator
export {
  createBotEmpire,
  createBotEmpires,
  createBotEmpiresParallel,
  getRandomArchetype,
} from "./bot-generator";

// Decision Engine
export {
  BASE_WEIGHTS,
  getAdjustedWeights,
  selectDecisionType,
  generateBotDecision,
  getWeightSum,
  validateWeights,
  // M10: Emotional modifiers
  applyEmotionalModifiers,
  getEmotionalWeightModifiers,
  type EmotionalWeightModifiers,
  // M9: Archetype decision helpers
  shouldArchetypeAttack,
  getRetreatWillingness,
  getAllianceSeeking,
  // M9: Tell system
  shouldTelegraphAction,
  getTellStyle,
} from "./decision-engine";

// Bot Actions
export { executeBotDecision, type ExecutionResult } from "./bot-actions";

// Bot Processor
export {
  processBotTurn,
  applyBotNightmareBonus,
  calculateBotStats,
  type BotProcessingStats,
} from "./bot-processor";

// =============================================================================
// ARCHETYPE EXPORTS (PRD 7.6, 7.10)
// =============================================================================

export * from "./archetypes";

// =============================================================================
// EMOTION EXPORTS (PRD 7.8)
// =============================================================================

export * from "./emotions";

// =============================================================================
// MEMORY EXPORTS (PRD 7.9)
// =============================================================================

export * from "./memory";

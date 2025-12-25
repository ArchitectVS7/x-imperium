/**
 * Emotional State Definitions (PRD 7.8)
 *
 * Defines the 6 emotional states that affect bot decision-making.
 * States are hidden from the player and inferred through bot messages.
 *
 * Key Mechanics:
 * - Intensity scales effects (0.0 - 1.0)
 * - States affect decision quality, alliance willingness, aggression, and negotiation
 * - Mechanical impact on gameplay, not just flavor
 *
 * @see docs/PRD.md Section 7.8 (Emotional State System)
 */

// =============================================================================
// EMOTIONAL STATE TYPES
// =============================================================================

export const EMOTIONAL_STATE_NAMES = [
  "confident",
  "arrogant",
  "desperate",
  "vengeful",
  "fearful",
  "triumphant",
] as const;

export type EmotionalStateName = (typeof EMOTIONAL_STATE_NAMES)[number];

/**
 * Modifier categories affected by emotional states.
 *
 * All modifiers are expressed as percentages:
 * - Positive = bonus (e.g., +0.05 = +5%)
 * - Negative = penalty (e.g., -0.15 = -15%)
 */
export interface EmotionalModifiers {
  /** Affects quality of strategic decisions (positive = better choices) */
  decisionQuality: number;
  /** Affects willingness to form/maintain alliances (positive = more willing) */
  allianceWillingness: number;
  /** Affects likelihood to initiate combat (positive = more aggressive) */
  aggression: number;
  /** Affects diplomatic negotiation success (positive = better deals) */
  negotiation: number;
}

/**
 * Definition of an emotional state and its effects.
 */
export interface EmotionalStateDefinition {
  /** The state identifier */
  name: EmotionalStateName;
  /** Display name for the state */
  displayName: string;
  /** Description of how this state manifests */
  description: string;
  /** Base modifiers at full intensity (1.0) */
  modifiers: EmotionalModifiers;
  /** Message tone when in this state */
  messageTone: string;
  /** Sample phrases that indicate this state */
  indicatorPhrases: string[];
}

// =============================================================================
// EMOTIONAL STATE DEFINITIONS (PRD 7.8)
// =============================================================================

/**
 * All emotional states with their effects.
 *
 * PRD 7.8 Table:
 * | Emotion     | Decision | Alliance | Aggression | Negotiation |
 * |-------------|----------|----------|------------|-------------|
 * | Confident   | +5%      | -20%     | +10%       | +10%        |
 * | Arrogant    | -15%     | -40%     | +30%       | -30%        |
 * | Desperate   | -10%     | +40%     | -20%       | -20%        |
 * | Vengeful    | -5%      | -30%     | +40%       | -40%        |
 * | Fearful     | -10%     | +50%     | -30%       | +10%        |
 * | Triumphant  | +10%     | -10%     | +20%       | -20%        |
 */
export const EMOTIONAL_STATES: Record<EmotionalStateName, EmotionalStateDefinition> = {
  confident: {
    name: "confident",
    displayName: "Confident",
    description: "Secure in their position, makes calculated moves",
    modifiers: {
      decisionQuality: +0.05,      // +5% - better decisions
      allianceWillingness: -0.20,  // -20% - less need for allies
      aggression: +0.10,           // +10% - willing to act
      negotiation: +0.10,          // +10% - negotiates from strength
    },
    messageTone: "assured and measured",
    indicatorPhrases: [
      "I have no doubt",
      "As expected",
      "This is proceeding well",
      "My position is secure",
    ],
  },

  arrogant: {
    name: "arrogant",
    displayName: "Arrogant",
    description: "Overconfident and dismissive, makes rash decisions",
    modifiers: {
      decisionQuality: -0.15,      // -15% - poor decisions from hubris
      allianceWillingness: -0.40,  // -40% - thinks they don't need allies
      aggression: +0.30,           // +30% - eager to prove dominance
      negotiation: -0.30,          // -30% - refuses to compromise
    },
    messageTone: "dismissive and condescending",
    indicatorPhrases: [
      "You are beneath my notice",
      "Pathetic",
      "I am superior",
      "Do not waste my time",
      "You dare?",
    ],
  },

  desperate: {
    name: "desperate",
    displayName: "Desperate",
    description: "Cornered and anxious, seeks any lifeline",
    modifiers: {
      decisionQuality: -0.10,      // -10% - panic clouds judgment
      allianceWillingness: +0.40,  // +40% - will ally with anyone
      aggression: -0.20,           // -20% - avoids risks
      negotiation: -0.20,          // -20% - accepts bad deals
    },
    messageTone: "urgent and pleading",
    indicatorPhrases: [
      "Please, we must",
      "I implore you",
      "There is no time",
      "I will give you anything",
      "Help me",
    ],
  },

  vengeful: {
    name: "vengeful",
    displayName: "Vengeful",
    description: "Consumed by grudge, prioritizes revenge over strategy",
    modifiers: {
      decisionQuality: -0.05,      // -5% - slightly impaired by emotion
      allianceWillingness: -0.30,  // -30% - distrustful
      aggression: +0.40,           // +40% - seeks retribution
      negotiation: -0.40,          // -40% - refuses to forgive
    },
    messageTone: "bitter and threatening",
    indicatorPhrases: [
      "You will pay for this",
      "I will never forget",
      "Revenge will be mine",
      "I remember what you did",
      "You think this is over?",
    ],
  },

  fearful: {
    name: "fearful",
    displayName: "Fearful",
    description: "Intimidated and defensive, avoids confrontation",
    modifiers: {
      decisionQuality: -0.10,      // -10% - anxiety impairs thinking
      allianceWillingness: +0.50,  // +50% - seeks protection
      aggression: -0.30,           // -30% - avoids conflict
      negotiation: +0.10,          // +10% - willing to compromise
    },
    messageTone: "hesitant and conciliatory",
    indicatorPhrases: [
      "Perhaps we could avoid",
      "I mean no offense",
      "Let us not escalate",
      "I am willing to discuss",
      "Please understand",
    ],
  },

  triumphant: {
    name: "triumphant",
    displayName: "Triumphant",
    description: "Riding high on recent success, bold but overreaching",
    modifiers: {
      decisionQuality: +0.10,      // +10% - success breeds success
      allianceWillingness: -0.10,  // -10% - less dependent on others
      aggression: +0.20,           // +20% - seeks to capitalize
      negotiation: -0.20,          // -20% - demands more
    },
    messageTone: "boastful and demanding",
    indicatorPhrases: [
      "Victory is ours",
      "None can stand against me",
      "I am unstoppable",
      "Bow before my might",
      "Another conquest awaits",
    ],
  },
} as const;

// =============================================================================
// DEFAULT STATE
// =============================================================================

/** The default/neutral emotional state for bots */
export const DEFAULT_EMOTIONAL_STATE: EmotionalStateName = "confident";

/** Default intensity for emotional states (0.0 - 1.0) */
export const DEFAULT_INTENSITY = 0.5;

// =============================================================================
// STATE CATEGORIES
// =============================================================================

/** States that are generally positive/stable */
export const POSITIVE_STATES: EmotionalStateName[] = ["confident", "triumphant"];

/** States that are generally negative/unstable */
export const NEGATIVE_STATES: EmotionalStateName[] = ["arrogant", "desperate", "vengeful", "fearful"];

/** States that increase aggression */
export const AGGRESSIVE_STATES: EmotionalStateName[] = ["arrogant", "vengeful", "triumphant", "confident"];

/** States that decrease aggression */
export const PASSIVE_STATES: EmotionalStateName[] = ["desperate", "fearful"];

/** States that improve alliance willingness */
export const ALLIANCE_SEEKING_STATES: EmotionalStateName[] = ["desperate", "fearful"];

/** States that reduce alliance willingness */
export const ISOLATIONIST_STATES: EmotionalStateName[] = ["arrogant", "vengeful", "confident", "triumphant"];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the emotional state definition.
 *
 * @param state - The emotional state name
 * @returns The state definition
 */
export function getEmotionalState(state: EmotionalStateName): EmotionalStateDefinition {
  return EMOTIONAL_STATES[state];
}

/**
 * Get modifiers for a state at a given intensity.
 *
 * Intensity scales the modifiers linearly:
 * - 0.0 = no effect
 * - 0.5 = half effect
 * - 1.0 = full effect
 *
 * @param state - The emotional state name
 * @param intensity - The intensity (0.0 - 1.0)
 * @returns Scaled modifiers
 */
export function getScaledModifiers(
  state: EmotionalStateName,
  intensity: number
): EmotionalModifiers {
  const clampedIntensity = Math.max(0, Math.min(1, intensity));
  const baseModifiers = EMOTIONAL_STATES[state].modifiers;

  return {
    decisionQuality: baseModifiers.decisionQuality * clampedIntensity,
    allianceWillingness: baseModifiers.allianceWillingness * clampedIntensity,
    aggression: baseModifiers.aggression * clampedIntensity,
    negotiation: baseModifiers.negotiation * clampedIntensity,
  };
}

/**
 * Apply emotional modifiers to a base value.
 *
 * @param baseValue - The base value to modify
 * @param modifier - The modifier (e.g., +0.10 for +10%)
 * @returns The modified value
 */
export function applyModifier(baseValue: number, modifier: number): number {
  return baseValue * (1 + modifier);
}

/**
 * Get the combined decision quality modifier.
 *
 * @param state - The emotional state name
 * @param intensity - The intensity (0.0 - 1.0)
 * @returns The decision quality multiplier (e.g., 1.05 for +5%)
 */
export function getDecisionMultiplier(state: EmotionalStateName, intensity: number): number {
  const modifiers = getScaledModifiers(state, intensity);
  return 1 + modifiers.decisionQuality;
}

/**
 * Get the alliance willingness modifier.
 *
 * @param state - The emotional state name
 * @param intensity - The intensity (0.0 - 1.0)
 * @returns The alliance willingness multiplier
 */
export function getAllianceMultiplier(state: EmotionalStateName, intensity: number): number {
  const modifiers = getScaledModifiers(state, intensity);
  return 1 + modifiers.allianceWillingness;
}

/**
 * Get the aggression modifier.
 *
 * @param state - The emotional state name
 * @param intensity - The intensity (0.0 - 1.0)
 * @returns The aggression multiplier
 */
export function getAggressionMultiplier(state: EmotionalStateName, intensity: number): number {
  const modifiers = getScaledModifiers(state, intensity);
  return 1 + modifiers.aggression;
}

/**
 * Get the negotiation modifier.
 *
 * @param state - The emotional state name
 * @param intensity - The intensity (0.0 - 1.0)
 * @returns The negotiation multiplier
 */
export function getNegotiationMultiplier(state: EmotionalStateName, intensity: number): number {
  const modifiers = getScaledModifiers(state, intensity);
  return 1 + modifiers.negotiation;
}

/**
 * Check if a state is in a category.
 *
 * @param state - The emotional state name
 * @param category - The category to check
 * @returns True if the state is in that category
 */
export function isStateCategory(
  state: EmotionalStateName,
  category: "positive" | "negative" | "aggressive" | "passive" | "alliance_seeking" | "isolationist"
): boolean {
  switch (category) {
    case "positive":
      return POSITIVE_STATES.includes(state);
    case "negative":
      return NEGATIVE_STATES.includes(state);
    case "aggressive":
      return AGGRESSIVE_STATES.includes(state);
    case "passive":
      return PASSIVE_STATES.includes(state);
    case "alliance_seeking":
      return ALLIANCE_SEEKING_STATES.includes(state);
    case "isolationist":
      return ISOLATIONIST_STATES.includes(state);
  }
}

/**
 * Get all emotional state names as an array.
 */
export const ALL_EMOTIONAL_STATES: EmotionalStateName[] = [...EMOTIONAL_STATE_NAMES];

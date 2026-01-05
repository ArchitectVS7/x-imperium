/**
 * Bot Tell System Types
 *
 * Type definitions for the bot personality tell system (PRD 7.10).
 * Tells are behavioral signals that reveal or conceal bot intentions.
 * The system uses D20-based perception checks and intel gating.
 *
 * @see docs/PRD.md Section 7.10 (Player Readability / Tell System)
 */

import type { ArchetypeName } from "@/lib/bots/archetypes/types";

// =============================================================================
// TELL TYPES
// =============================================================================

/**
 * Types of behavioral tells that bots can emit.
 */
export const TELL_TYPES = [
  "military_buildup",     // Preparing attack - building units
  "fleet_movement",       // Moving forces toward target
  "target_fixation",      // Focused on specific target
  "diplomatic_overture",  // Seeking alliance/NAP
  "economic_preparation", // Building war chest / saving credits
  "silence",              // Unusual quiet - planning something big
  "aggression_spike",     // Imminent attack - hostile actions
  "treaty_interest",      // Genuine treaty interest
] as const;

export type TellType = (typeof TELL_TYPES)[number];

/**
 * Map of tell types to their opposite (for bluffing).
 */
export const TELL_INVERSIONS: Record<TellType, TellType> = {
  military_buildup: "diplomatic_overture",
  fleet_movement: "silence",
  target_fixation: "economic_preparation",
  diplomatic_overture: "aggression_spike",
  economic_preparation: "military_buildup",
  silence: "diplomatic_overture",
  aggression_spike: "treaty_interest",
  treaty_interest: "aggression_spike",
};

// =============================================================================
// INTEL LEVELS
// =============================================================================

/**
 * Intel levels determine how much tell information is visible.
 */
export const INTEL_LEVELS = ["unknown", "basic", "moderate", "full"] as const;
export type IntelLevel = (typeof INTEL_LEVELS)[number];

/**
 * Intel modifiers for perception checks.
 */
export const INTEL_MODIFIERS: Record<IntelLevel, number> = {
  unknown: 0,
  basic: 2,
  moderate: 5,
  full: 8,
};

// =============================================================================
// BOT TELL INTERFACE
// =============================================================================

/**
 * A behavioral tell emitted by a bot.
 */
export interface BotTell {
  /** Unique identifier */
  id: string;
  /** Game this tell belongs to */
  gameId: string;
  /** Empire that emitted this tell */
  empireId: string;
  /** The apparent tell type (may be bluff) */
  tellType: TellType;
  /** Optional target empire this tell is directed at */
  targetEmpireId?: string;
  /** Whether this tell is a bluff */
  isBluff: boolean;
  /** The true intention if this is a bluff */
  trueIntention?: TellType;
  /** Confidence level (0.0 - 1.0) - how strong the signal is */
  confidence: number;
  /** Turn this tell was created */
  createdAtTurn: number;
  /** Turn this tell expires */
  expiresAtTurn: number;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Tell as perceived by a player after filtering.
 */
export interface TellPerception {
  /** The underlying tell */
  tell: BotTell;
  /** Whether the player perceived through the bluff */
  perceivedTruth: boolean;
  /** What tell type the player sees */
  displayType: TellType;
  /** Adjusted confidence after perception */
  displayConfidence: number;
  /** Whether a signal was detected (even if type is unknown) */
  signalDetected: boolean;
}

// =============================================================================
// BLUFF CONFIGURATION
// =============================================================================

/**
 * Bluff rates by archetype (how often tells are inverted).
 * Lower = more honest, Higher = more deceptive.
 */
export const ARCHETYPE_BLUFF_RATES: Record<ArchetypeName, number> = {
  warlord: 0.10,      // Obvious aggression, rarely deceptive
  diplomat: 0.20,     // Clear signals, occasional misdirection
  merchant: 0.25,     // Economic tells, moderate bluffing
  schemer: 0.50,      // Rare tells, often inverted
  turtle: 0.05,       // Very transparent, almost never bluffs
  blitzkrieg: 0.15,   // Fast and aggressive, some feints
  techRush: 0.20,     // Research-focused tells
  opportunist: 0.35,  // Unpredictable, frequent bluffs
};

/**
 * DC modifiers by archetype for deception checks.
 * Higher = harder to read.
 */
export const ARCHETYPE_DECEPTION_DC: Record<ArchetypeName, number> = {
  warlord: 0,         // Easy to read
  diplomat: 2,        // Polished, slightly harder
  merchant: 1,        // Transactional, modest difficulty
  schemer: 5,         // Master of deception
  turtle: -2,         // Very transparent
  blitzkrieg: 1,      // Minimal communication
  techRush: 0,        // Clear signals
  opportunist: 3,     // Unpredictable
};

// =============================================================================
// TELL GENERATION CONTEXT
// =============================================================================

/**
 * Context for generating tells from bot decisions.
 */
export interface TellGenerationContext {
  /** The archetype of the bot */
  archetype: ArchetypeName;
  /** Current emotional state (affects tell intensity) */
  emotionalState?: {
    state: "confident" | "arrogant" | "desperate" | "vengeful" | "fearful" | "triumphant" | "neutral";
    intensity: number;
  };
  /** Current game turn */
  currentTurn: number;
  /** Bot's CMD stat (deception ability) */
  cmdStat?: number;
  /** Bot's DOC stat (psychological resistance) */
  docStat?: number;
}

/**
 * Result of tell generation.
 */
export interface TellGenerationResult {
  /** Whether a tell was generated */
  generated: boolean;
  /** The generated tell (if any) */
  tell?: Omit<BotTell, "id" | "createdAt">;
  /** Reason for not generating (for debugging) */
  reason?: string;
}

// =============================================================================
// PERCEPTION CHECK TYPES
// =============================================================================

/**
 * Input for a perception check.
 */
export interface PerceptionCheckInput {
  /** Player's intel level on the target empire */
  intelLevel: IntelLevel;
  /** Player's research bonuses (from covert tech tree) */
  researchBonus?: number;
  /** The tell being perceived */
  tell: BotTell;
  /** Bot's archetype */
  botArchetype: ArchetypeName;
  /** Bot's CMD stat */
  botCMD?: number;
  /** Bot's DOC stat */
  botDOC?: number;
}

/**
 * Result of a perception check.
 */
export interface PerceptionCheckResult {
  /** Player's total perception value */
  playerPerception: number;
  /** Bot's deception DC */
  deceptionDC: number;
  /** Whether the check succeeded */
  success: boolean;
  /** Whether the tell was a bluff */
  wasBluff: boolean;
  /** The true tell type (revealed if success and bluff) */
  revealedType?: TellType;
}

// =============================================================================
// TELL DISPLAY
// =============================================================================

/**
 * Visual style for tell indicators.
 */
export interface TellVisualStyle {
  /** Primary color (hex) */
  color: string;
  /** Icon name (lucide) */
  icon: string;
  /** Animation class */
  animation: string;
  /** Label for tooltip */
  label: string;
}

/**
 * Visual styles for each tell type.
 */
export const TELL_VISUAL_STYLES: Record<TellType, TellVisualStyle> = {
  military_buildup: {
    color: "#ef4444",      // red-500
    icon: "Swords",
    animation: "lcars-pulse-alert",
    label: "Military Buildup",
  },
  fleet_movement: {
    color: "#f97316",      // orange-500
    icon: "MoveRight",
    animation: "slide-in-right",
    label: "Fleet Movement",
  },
  target_fixation: {
    color: "#dc2626",      // red-600
    icon: "Target",
    animation: "lcars-pulse",
    label: "Target Fixation",
  },
  diplomatic_overture: {
    color: "#22c55e",      // green-500
    icon: "Handshake",
    animation: "lcars-pulse-success",
    label: "Diplomatic Overture",
  },
  economic_preparation: {
    color: "#eab308",      // yellow-500
    icon: "TrendingUp",
    animation: "animate-pulse-slow",
    label: "Economic Preparation",
  },
  silence: {
    color: "#6b7280",      // gray-500
    icon: "VolumeX",
    animation: "animate-fade-out",
    label: "Unusual Silence",
  },
  aggression_spike: {
    color: "#b91c1c",      // red-700
    icon: "Flame",
    animation: "critical-hit",
    label: "Aggression Spike",
  },
  treaty_interest: {
    color: "#3b82f6",      // blue-500
    icon: "FileText",
    animation: "lcars-pulse",
    label: "Treaty Interest",
  },
};

/**
 * Confidence level labels.
 */
export const CONFIDENCE_LABELS: { threshold: number; label: string }[] = [
  { threshold: 0.8, label: "High" },
  { threshold: 0.5, label: "Moderate" },
  { threshold: 0.3, label: "Low" },
  { threshold: 0, label: "Faint" },
];

/**
 * Get confidence label for a given confidence value.
 */
export function getConfidenceLabel(confidence: number): string {
  for (const { threshold, label } of CONFIDENCE_LABELS) {
    if (confidence >= threshold) {
      return label;
    }
  }
  return "Faint";
}

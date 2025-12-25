/**
 * Diplomacy System Constants (PRD 8.x)
 *
 * Defines treaty types, reputation mechanics, and diplomatic relationships.
 *
 * @see docs/PRD.md Section 8 (Diplomacy System)
 */

// =============================================================================
// TYPES
// =============================================================================

export type TreatyType = "nap" | "alliance";

export type DiplomaticRelation =
  | "hostile"
  | "unfriendly"
  | "neutral"
  | "friendly"
  | "allied";

export interface TreatyDefinition {
  /** Display name of the treaty */
  name: string;
  /** Duration in turns */
  duration: number;
  /** Reputation penalty for breaking the treaty */
  breakPenalty: number;
  /** Trade bonus multiplier (if applicable) */
  tradeBonus?: number;
  /** Whether mutual defense is required */
  mutualDefense?: boolean;
  /** Whether intelligence is shared */
  sharedIntelligence?: boolean;
}

export interface ReputationEvent {
  /** Display name of the event */
  name: string;
  /** Reputation change (positive or negative) */
  change: number;
  /** Whether this creates a permanent "scar" (PRD 7.9) */
  isPermanent?: boolean;
  /** Decay resistance (0-1, higher = longer lasting) */
  decayResistance?: number;
}

// =============================================================================
// TREATY CONSTANTS (PRD 8.1)
// =============================================================================

/**
 * Treaty type definitions.
 *
 * Types (PRD 8.1):
 * - Neutrality (NAP): Cannot attack each other
 * - Alliance: Shared intelligence, mutual defense
 * - Coalition: Formal group with shared goals (handled separately)
 */
export const TREATY_TYPES: Record<TreatyType, TreatyDefinition> = {
  nap: {
    name: "Non-Aggression Pact",
    duration: 20,
    breakPenalty: -50,
    mutualDefense: false,
    sharedIntelligence: false,
  },
  alliance: {
    name: "Alliance",
    duration: 40,
    breakPenalty: -100,
    tradeBonus: 0.1, // +10% trade value
    mutualDefense: true,
    sharedIntelligence: true,
  },
} as const;

/** Minimum turns before a treaty can be voluntarily ended */
export const TREATY_MIN_DURATION = 5;

/** Cooldown turns after breaking a treaty before proposing a new one */
export const TREATY_BREAK_COOLDOWN = 10;

// =============================================================================
// REPUTATION EVENTS (PRD 7.9, 8.x)
// =============================================================================

/**
 * Reputation changes from various diplomatic events.
 *
 * Events are weighted and some resist decay (PRD 7.9):
 * - Major events have HIGH decay resistance
 * - 20% of negative events become permanent scars
 */
export const REPUTATION_EVENTS = {
  // Treaty-related events
  treaty_broken: {
    name: "Treaty Broken",
    change: -100,
    isPermanent: true,
    decayResistance: 1.0,
  },
  treaty_honored: {
    name: "Treaty Honored",
    change: +10,
    decayResistance: 0.5,
  },
  treaty_proposed: {
    name: "Treaty Proposed",
    change: +5,
    decayResistance: 0.2,
  },
  treaty_rejected: {
    name: "Treaty Rejected",
    change: -5,
    decayResistance: 0.2,
  },

  // Trade-related events
  trade_completed: {
    name: "Trade Completed",
    change: +5,
    decayResistance: 0.1,
  },
  trade_rejected: {
    name: "Trade Rejected",
    change: -2,
    decayResistance: 0.1,
  },
  trade_cheated: {
    name: "Trade Cheated",
    change: -30,
    isPermanent: true,
    decayResistance: 0.8,
  },

  // Combat-related events (PRD 7.9)
  captured_planet: {
    name: "Planet Captured",
    change: -80,
    isPermanent: true,
    decayResistance: 1.0,
  },
  attacked: {
    name: "Attacked",
    change: -40,
    decayResistance: 0.7,
  },
  defended_ally: {
    name: "Defended Ally",
    change: +30,
    decayResistance: 0.6,
  },
  saved_from_destruction: {
    name: "Saved From Destruction",
    change: +90,
    decayResistance: 1.0,
  },
  won_battle: {
    name: "Won Battle Against",
    change: -40,
    decayResistance: 0.5,
  },

  // Covert operations (PRD 6.8)
  spy_caught: {
    name: "Spy Caught",
    change: -25,
    decayResistance: 0.4,
  },
  covert_op_detected: {
    name: "Covert Operation Detected",
    change: -40,
    decayResistance: 0.6,
  },

  // Alliance-related events
  alliance_invitation: {
    name: "Coalition Invitation",
    change: +15,
    decayResistance: 0.3,
  },
  alliance_left: {
    name: "Left Coalition",
    change: -20,
    decayResistance: 0.4,
  },
  reinforcement_sent: {
    name: "Reinforcement Sent",
    change: +20,
    decayResistance: 0.5,
  },
  reinforcement_denied: {
    name: "Reinforcement Denied",
    change: -35,
    decayResistance: 0.6,
  },

  // Communication events (PRD 7.9)
  message_sent: {
    name: "Message Sent",
    change: +1,
    decayResistance: 0.05,
  },
  threat_issued: {
    name: "Threat Issued",
    change: -10,
    decayResistance: 0.3,
  },
  apology_given: {
    name: "Apology Given",
    change: +15,
    decayResistance: 0.4,
  },
} as const;

export type ReputationEventType = keyof typeof REPUTATION_EVENTS;

// =============================================================================
// RELATIONSHIP THRESHOLDS
// =============================================================================

/**
 * Reputation thresholds for diplomatic relations.
 * Total reputation with an empire determines the relationship level.
 */
export const RELATIONSHIP_THRESHOLDS = {
  hostile: -100,    // < -100: Will actively seek to harm you
  unfriendly: -25,  // -100 to -25: Distrustful, unlikely to cooperate
  neutral: 25,      // -25 to 25: No strong feelings
  friendly: 75,     // 25 to 75: Willing to cooperate
  allied: Infinity, // > 75: Strong trust, seeks alliance
} as const;

/**
 * Get the diplomatic relation based on reputation score.
 *
 * @param reputation - Total reputation with an empire
 * @returns The diplomatic relation level
 */
export function getRelationFromReputation(reputation: number): DiplomaticRelation {
  if (reputation < RELATIONSHIP_THRESHOLDS.hostile) {
    return "hostile";
  }
  if (reputation < RELATIONSHIP_THRESHOLDS.unfriendly) {
    return "unfriendly";
  }
  if (reputation < RELATIONSHIP_THRESHOLDS.neutral) {
    return "neutral";
  }
  if (reputation < RELATIONSHIP_THRESHOLDS.friendly) {
    return "friendly";
  }
  return "allied";
}

// =============================================================================
// COALITION CONSTANTS (PRD 8.2)
// =============================================================================

/** Maximum empires in a coalition */
export const COALITION_MAX_MEMBERS = 5;

/** Minimum empires to form a coalition */
export const COALITION_MIN_MEMBERS = 2;

/** Reputation bonus for coalition members */
export const COALITION_REPUTATION_BONUS = 25;

/** Diplomatic victory threshold: coalition controls X% of territory */
export const COALITION_VICTORY_THRESHOLD = 0.5; // 50%

// =============================================================================
// PROTECTION PERIOD (PRD 12.1)
// =============================================================================

/** Turns of protection for new players (PRD 12.1: "20-turn safe zone") */
export const PROTECTION_PERIOD_TURNS = 20;

/**
 * Check if an empire is still under protection.
 *
 * @param currentTurn - Current game turn
 * @returns True if still in protection period
 */
export function isUnderProtection(currentTurn: number): boolean {
  return currentTurn <= PROTECTION_PERIOD_TURNS;
}

// =============================================================================
// ATTACK RESTRICTIONS (PRD 6.6)
// =============================================================================

/**
 * Networth ratio below which attacks are restricted.
 * Cannot attack empires significantly weaker unless they attacked first.
 */
export const NETWORTH_ATTACK_RATIO = 0.25; // Can't attack if target is <25% of your networth

/**
 * Check if an attack is allowed based on networth difference.
 *
 * @param attackerNetworth - Attacker's networth
 * @param defenderNetworth - Defender's networth
 * @param defenderAttackedFirst - Whether defender initiated hostilities
 * @returns True if attack is allowed
 */
export function canAttackByNetworth(
  attackerNetworth: number,
  defenderNetworth: number,
  defenderAttackedFirst: boolean = false
): boolean {
  // Always can retaliate
  if (defenderAttackedFirst) {
    return true;
  }

  // Can't attack much weaker empires
  if (defenderNetworth < attackerNetworth * NETWORTH_ATTACK_RATIO) {
    return false;
  }

  return true;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the treaty definition for a treaty type.
 */
export function getTreatyDefinition(type: TreatyType): TreatyDefinition {
  return TREATY_TYPES[type];
}

/**
 * Calculate the reputation change from an event.
 */
export function getReputationChange(eventType: ReputationEventType): number {
  return REPUTATION_EVENTS[eventType].change;
}

/**
 * Check if an event creates a permanent scar.
 */
export function isEventPermanent(eventType: ReputationEventType): boolean {
  const event = REPUTATION_EVENTS[eventType] as { isPermanent?: boolean };
  return event.isPermanent ?? false;
}

/**
 * Calculate decayed reputation from an event over time.
 *
 * @param eventType - The event type
 * @param turnsAgo - How many turns since the event
 * @param decayRate - Base decay rate per turn (default 0.05)
 * @returns The current reputation impact after decay
 */
export function calculateDecayedReputation(
  eventType: ReputationEventType,
  turnsAgo: number,
  decayRate: number = 0.05
): number {
  const event = REPUTATION_EVENTS[eventType] as {
    change: number;
    isPermanent?: boolean;
    decayResistance?: number;
  };

  // Permanent events don't decay
  if (event.isPermanent) {
    return event.change;
  }

  // Apply decay resistance
  const effectiveDecayRate = decayRate * (1 - (event.decayResistance ?? 0));
  const decayMultiplier = Math.pow(1 - effectiveDecayRate, turnsAgo);

  return Math.round(event.change * decayMultiplier);
}

/**
 * All treaty types as an array for iteration.
 */
export const ALL_TREATY_TYPES: TreatyType[] = ["nap", "alliance"];

/**
 * All reputation event types as an array for iteration.
 */
export const ALL_REPUTATION_EVENTS: ReputationEventType[] = Object.keys(
  REPUTATION_EVENTS
) as ReputationEventType[];

/**
 * Memory Weight System (PRD 7.9)
 *
 * Defines the weighted, non-expiring memory system for bot relationships.
 * Events have weight and decay resistance - major events persist longer.
 *
 * Key Mechanics:
 * - Events have weight (1-100) and decay resistance
 * - Major events resist being "washed away" by minor events
 * - 20% of negative events become permanent scars
 *
 * @see docs/PRD.md Section 7.9 (Relationship Memory)
 */

// =============================================================================
// MEMORY EVENT TYPES
// =============================================================================

export const MEMORY_EVENT_TYPES = [
  // High weight events (60-100)
  "planet_captured",
  "saved_from_destruction",
  "alliance_broken",

  // Medium weight events (30-59)
  "battle_won",
  "battle_lost",
  "invasion_repelled",
  "major_trade",
  "covert_op_detected",
  "reinforcement_received",
  "reinforcement_denied",

  // Low weight events (10-29)
  "trade_completed",
  "treaty_signed",
  "treaty_rejected",
  "minor_skirmish",
  "spy_caught",
  "threat_issued",
  "apology_given",

  // Very low weight events (1-9)
  "message_sent",
  "trade_offer_made",
  "routine_interaction",
] as const;

export type MemoryEventType = (typeof MEMORY_EVENT_TYPES)[number];

// =============================================================================
// DECAY RESISTANCE LEVELS
// =============================================================================

export type DecayResistance = "very_low" | "low" | "medium" | "high" | "permanent";

/**
 * Decay resistance values.
 * Higher values mean the memory persists longer.
 */
export const DECAY_RESISTANCE_VALUES: Record<DecayResistance, number> = {
  very_low: 0.1,   // Decays quickly
  low: 0.3,        // Moderate decay
  medium: 0.5,     // Slower decay
  high: 0.8,       // Very slow decay
  permanent: 1.0,  // Never decays
} as const;

// =============================================================================
// MEMORY WEIGHT DEFINITIONS (PRD 7.9)
// =============================================================================

export interface MemoryWeightDefinition {
  /** The event type */
  event: MemoryEventType;
  /** Weight of this memory (1-100) */
  weight: number;
  /** How resistant to decay this memory is */
  decayResistance: DecayResistance;
  /** Whether this is a negative event (can become permanent scar) */
  isNegative: boolean;
  /** Display name for the event */
  displayName: string;
  /** Description of what happened */
  description: string;
}

/**
 * Memory weight definitions for all event types.
 *
 * PRD 7.9 Table:
 * | Event                   | Weight | Decay Resistance |
 * |-------------------------|--------|------------------|
 * | Captured planet         | 80     | HIGH             |
 * | Saved from destruction  | 90     | HIGH             |
 * | Broke alliance          | 70     | HIGH             |
 * | Won battle              | 40     | MEDIUM           |
 * | Trade accepted          | 10     | LOW              |
 * | Message sent            | 1      | VERY LOW         |
 */
export const MEMORY_WEIGHTS: Record<MemoryEventType, MemoryWeightDefinition> = {
  // ==========================================================================
  // HIGH WEIGHT EVENTS (60-100) - Major relationship changers
  // ==========================================================================

  planet_captured: {
    event: "planet_captured",
    weight: 80,
    decayResistance: "high",
    isNegative: true,
    displayName: "Planet Captured",
    description: "They captured one of our planets",
  },

  saved_from_destruction: {
    event: "saved_from_destruction",
    weight: 90,
    decayResistance: "high",
    isNegative: false,
    displayName: "Saved From Destruction",
    description: "They saved us from being destroyed",
  },

  alliance_broken: {
    event: "alliance_broken",
    weight: 70,
    decayResistance: "high",
    isNegative: true,
    displayName: "Alliance Broken",
    description: "They broke our alliance",
  },

  // ==========================================================================
  // MEDIUM WEIGHT EVENTS (30-59) - Significant but not defining
  // ==========================================================================

  battle_won: {
    event: "battle_won",
    weight: 40,
    decayResistance: "medium",
    isNegative: true, // From target's perspective
    displayName: "Battle Won Against",
    description: "They defeated us in battle",
  },

  battle_lost: {
    event: "battle_lost",
    weight: 35,
    decayResistance: "medium",
    isNegative: false, // We beat them
    displayName: "Battle Won By Us",
    description: "We defeated them in battle",
  },

  invasion_repelled: {
    event: "invasion_repelled",
    weight: 45,
    decayResistance: "medium",
    isNegative: false,
    displayName: "Invasion Repelled",
    description: "We successfully repelled their invasion",
  },

  major_trade: {
    event: "major_trade",
    weight: 30,
    decayResistance: "medium",
    isNegative: false,
    displayName: "Major Trade",
    description: "Completed a significant trade deal",
  },

  covert_op_detected: {
    event: "covert_op_detected",
    weight: 50,
    decayResistance: "medium",
    isNegative: true,
    displayName: "Covert Operation Detected",
    description: "They conducted covert operations against us",
  },

  reinforcement_received: {
    event: "reinforcement_received",
    weight: 40,
    decayResistance: "medium",
    isNegative: false,
    displayName: "Reinforcement Received",
    description: "They sent reinforcements to help us",
  },

  reinforcement_denied: {
    event: "reinforcement_denied",
    weight: 35,
    decayResistance: "medium",
    isNegative: true,
    displayName: "Reinforcement Denied",
    description: "They refused to send reinforcements",
  },

  // ==========================================================================
  // LOW WEIGHT EVENTS (10-29) - Normal interactions
  // ==========================================================================

  trade_completed: {
    event: "trade_completed",
    weight: 10,
    decayResistance: "low",
    isNegative: false,
    displayName: "Trade Completed",
    description: "Completed a routine trade",
  },

  treaty_signed: {
    event: "treaty_signed",
    weight: 25,
    decayResistance: "low",
    isNegative: false,
    displayName: "Treaty Signed",
    description: "Signed a treaty with them",
  },

  treaty_rejected: {
    event: "treaty_rejected",
    weight: 15,
    decayResistance: "low",
    isNegative: true,
    displayName: "Treaty Rejected",
    description: "They rejected our treaty proposal",
  },

  minor_skirmish: {
    event: "minor_skirmish",
    weight: 20,
    decayResistance: "low",
    isNegative: true,
    displayName: "Minor Skirmish",
    description: "Had a minor military confrontation",
  },

  spy_caught: {
    event: "spy_caught",
    weight: 25,
    decayResistance: "low",
    isNegative: true,
    displayName: "Spy Caught",
    description: "They caught one of our spies",
  },

  threat_issued: {
    event: "threat_issued",
    weight: 15,
    decayResistance: "low",
    isNegative: true,
    displayName: "Threat Issued",
    description: "They issued a threat against us",
  },

  apology_given: {
    event: "apology_given",
    weight: 20,
    decayResistance: "low",
    isNegative: false,
    displayName: "Apology Given",
    description: "They apologized for past actions",
  },

  // ==========================================================================
  // VERY LOW WEIGHT EVENTS (1-9) - Trivial interactions
  // ==========================================================================

  message_sent: {
    event: "message_sent",
    weight: 1,
    decayResistance: "very_low",
    isNegative: false,
    displayName: "Message Sent",
    description: "Received a message from them",
  },

  trade_offer_made: {
    event: "trade_offer_made",
    weight: 5,
    decayResistance: "very_low",
    isNegative: false,
    displayName: "Trade Offer Made",
    description: "They made a trade offer",
  },

  routine_interaction: {
    event: "routine_interaction",
    weight: 2,
    decayResistance: "very_low",
    isNegative: false,
    displayName: "Routine Interaction",
    description: "Had a routine interaction",
  },
} as const;

// =============================================================================
// PERMANENT SCAR CONSTANTS (PRD 7.9)
// =============================================================================

/**
 * Chance that a negative event becomes a permanent scar.
 * PRD 7.9: "20% of negative events are permanent scars"
 */
export const PERMANENT_SCAR_CHANCE = 0.2;

/**
 * Minimum weight for an event to potentially become a scar.
 * Very minor events shouldn't create permanent grudges.
 */
export const SCAR_WEIGHT_THRESHOLD = 30;

// =============================================================================
// MEMORY RECORD INTERFACE
// =============================================================================

export interface MemoryRecord {
  /** Unique identifier for this memory */
  id: string;
  /** The empire this memory is about */
  targetEmpireId: string;
  /** The type of event */
  eventType: MemoryEventType;
  /** The original weight of this memory */
  originalWeight: number;
  /** Current effective weight (after decay) */
  currentWeight: number;
  /** Turn when this event occurred */
  turn: number;
  /** Whether this is a permanent scar */
  isPermanentScar: boolean;
  /** Optional additional context */
  context?: string;
}

export interface RelationshipMemory {
  /** Empire ID this memory collection is about */
  empireId: string;
  /** All memories about this empire */
  memories: MemoryRecord[];
  /** Net relationship score (sum of weighted memories) */
  netScore: number;
  /** Permanent scars against this empire */
  permanentScars: MemoryRecord[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the memory weight definition for an event type.
 *
 * @param eventType - The memory event type
 * @returns The weight definition
 */
export function getMemoryWeight(eventType: MemoryEventType): MemoryWeightDefinition {
  return MEMORY_WEIGHTS[eventType];
}

/**
 * Calculate memory decay over time.
 *
 * High-weight memories with high decay resistance persist longer.
 * Formula: currentWeight = originalWeight * decayMultiplier
 * Where decayMultiplier = max(0, 1 - (turnsSince * decayRate * (1 - resistance)))
 *
 * @param weight - Original weight of the memory
 * @param turnsSince - Number of turns since the event
 * @param decayResistance - The decay resistance level
 * @param baseDecayRate - Base decay rate per turn (default 0.01)
 * @returns The current weight after decay
 */
export function calculateMemoryDecay(
  weight: number,
  turnsSince: number,
  decayResistance: DecayResistance,
  baseDecayRate: number = 0.01
): number {
  // Permanent memories never decay
  if (decayResistance === "permanent") {
    return weight;
  }

  const resistance = DECAY_RESISTANCE_VALUES[decayResistance];
  const effectiveDecayRate = baseDecayRate * (1 - resistance);
  const decayMultiplier = Math.max(0, 1 - turnsSince * effectiveDecayRate);

  return Math.round(weight * decayMultiplier * 100) / 100;
}

/**
 * Determine if a negative event becomes a permanent scar.
 *
 * @param eventType - The event type
 * @returns True if this event should become a permanent scar
 */
export function rollPermanentScar(eventType: MemoryEventType): boolean {
  const definition = MEMORY_WEIGHTS[eventType];

  // Must be negative and above weight threshold
  if (!definition.isNegative || definition.weight < SCAR_WEIGHT_THRESHOLD) {
    return false;
  }

  // 20% chance per PRD 7.9
  return Math.random() < PERMANENT_SCAR_CHANCE;
}

/**
 * Create a new memory record.
 *
 * @param targetEmpireId - The empire this memory is about
 * @param eventType - The type of event
 * @param turn - The turn when this event occurred
 * @param context - Optional additional context
 * @returns A new MemoryRecord
 */
export function createMemoryRecord(
  targetEmpireId: string,
  eventType: MemoryEventType,
  turn: number,
  context?: string
): MemoryRecord {
  const definition = MEMORY_WEIGHTS[eventType];
  const isPermanentScar = rollPermanentScar(eventType);

  return {
    id: `${targetEmpireId}-${eventType}-${turn}-${Math.random().toString(36).slice(2, 9)}`,
    targetEmpireId,
    eventType,
    originalWeight: definition.weight,
    currentWeight: definition.weight,
    turn,
    isPermanentScar,
    context,
  };
}

/**
 * Update memory weights based on current turn.
 *
 * @param memory - The memory record to update
 * @param currentTurn - The current game turn
 * @returns Updated memory record
 */
export function updateMemoryWeight(
  memory: MemoryRecord,
  currentTurn: number
): MemoryRecord {
  // Permanent scars don't decay
  if (memory.isPermanentScar) {
    return memory;
  }

  const definition = MEMORY_WEIGHTS[memory.eventType];
  const turnsSince = currentTurn - memory.turn;
  const newWeight = calculateMemoryDecay(
    memory.originalWeight,
    turnsSince,
    definition.decayResistance
  );

  return {
    ...memory,
    currentWeight: newWeight,
  };
}

/**
 * Calculate net relationship score from memories.
 *
 * Positive events add to the score, negative events subtract.
 *
 * @param memories - Array of memory records
 * @param currentTurn - Current game turn
 * @returns Net relationship score
 */
export function calculateNetRelationship(
  memories: MemoryRecord[],
  currentTurn: number
): number {
  let netScore = 0;

  for (const memory of memories) {
    const definition = MEMORY_WEIGHTS[memory.eventType];
    const updated = updateMemoryWeight(memory, currentTurn);

    if (definition.isNegative) {
      netScore -= updated.currentWeight;
    } else {
      netScore += updated.currentWeight;
    }
  }

  return Math.round(netScore * 100) / 100;
}

/**
 * Get the most significant memories (highest current weight).
 *
 * @param memories - Array of memory records
 * @param currentTurn - Current game turn
 * @param limit - Maximum number of memories to return
 * @returns Top memories by current weight
 */
export function getMostSignificantMemories(
  memories: MemoryRecord[],
  currentTurn: number,
  limit: number = 5
): MemoryRecord[] {
  return memories
    .map((m) => updateMemoryWeight(m, currentTurn))
    .sort((a, b) => Math.abs(b.currentWeight) - Math.abs(a.currentWeight))
    .slice(0, limit);
}

/**
 * Filter memories that have decayed below a threshold.
 *
 * @param memories - Array of memory records
 * @param currentTurn - Current game turn
 * @param threshold - Minimum weight to keep (default 0.5)
 * @returns Filtered memory records (permanent scars always kept)
 */
export function pruneDecayedMemories(
  memories: MemoryRecord[],
  currentTurn: number,
  threshold: number = 0.5
): MemoryRecord[] {
  return memories.filter((memory) => {
    if (memory.isPermanentScar) {
      return true; // Always keep permanent scars
    }

    const updated = updateMemoryWeight(memory, currentTurn);
    return updated.currentWeight >= threshold;
  });
}

/**
 * Create a relationship memory object for tracking all memories about an empire.
 *
 * @param empireId - The target empire ID
 * @returns A new RelationshipMemory object
 */
export function createRelationshipMemory(empireId: string): RelationshipMemory {
  return {
    empireId,
    memories: [],
    netScore: 0,
    permanentScars: [],
  };
}

/**
 * Add a memory to a relationship.
 *
 * @param relationship - The relationship memory object
 * @param memory - The memory to add
 * @param currentTurn - Current game turn
 * @returns Updated relationship memory
 */
export function addMemoryToRelationship(
  relationship: RelationshipMemory,
  memory: MemoryRecord,
  currentTurn: number
): RelationshipMemory {
  const newMemories = [...relationship.memories, memory];
  const newScars = memory.isPermanentScar
    ? [...relationship.permanentScars, memory]
    : relationship.permanentScars;

  return {
    ...relationship,
    memories: newMemories,
    netScore: calculateNetRelationship(newMemories, currentTurn),
    permanentScars: newScars,
  };
}

/**
 * Update all memory weights in a relationship for the current turn.
 *
 * @param relationship - The relationship memory object
 * @param currentTurn - Current game turn
 * @returns Updated relationship memory
 */
export function updateRelationshipMemory(
  relationship: RelationshipMemory,
  currentTurn: number
): RelationshipMemory {
  const updatedMemories = relationship.memories.map((m) =>
    updateMemoryWeight(m, currentTurn)
  );

  return {
    ...relationship,
    memories: updatedMemories,
    netScore: calculateNetRelationship(updatedMemories, currentTurn),
  };
}

/**
 * Get relationship tier based on net score.
 *
 * @param netScore - The net relationship score
 * @returns Relationship tier
 */
export function getRelationshipTier(
  netScore: number
): "hostile" | "unfriendly" | "neutral" | "friendly" | "allied" {
  if (netScore < -100) return "hostile";
  if (netScore < -25) return "unfriendly";
  if (netScore < 25) return "neutral";
  if (netScore < 100) return "friendly";
  return "allied";
}

/**
 * Check if there are any permanent scars against an empire.
 *
 * @param relationship - The relationship memory object
 * @returns True if there are permanent scars
 */
export function hasPermanentScars(relationship: RelationshipMemory): boolean {
  return relationship.permanentScars.length > 0;
}

/**
 * Get all memory event types as an array.
 */
export const ALL_MEMORY_EVENTS: MemoryEventType[] = [...MEMORY_EVENT_TYPES];

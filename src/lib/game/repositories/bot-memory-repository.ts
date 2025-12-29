/**
 * Bot Memory Repository (PRD 7.9)
 *
 * Persistence layer for bot relationship memories.
 * Handles CRUD operations for the botMemories table.
 *
 * Key Features:
 * - recordMemory: Store a new memory event
 * - getMemoriesFor: Get all memories with decay applied
 * - getRelationshipScore: Calculate net relationship score
 * - Automatic decay application based on turn
 *
 * @see docs/PRD.md Section 7.9 (Relationship Memory)
 */

import { db } from "@/lib/db";
import { botMemories, type BotMemory, type NewBotMemory } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  MEMORY_WEIGHTS,
  calculateMemoryDecay,
  PERMANENT_SCAR_CHANCE,
  SCAR_WEIGHT_THRESHOLD,
  type MemoryEventType,
} from "@/lib/bots/memory";

// =============================================================================
// MEMORY TYPE MAPPINGS
// =============================================================================

/**
 * Map from MemoryEventType to database memoryType enum values.
 * The database uses a different set of types than the memory module.
 */
const MEMORY_TYPE_TO_DB: Record<MemoryEventType, string> = {
  planet_captured: "planet_captured",
  saved_from_destruction: "ally_saved",
  alliance_broken: "treaty_broken",
  battle_won: "battle_won",
  battle_lost: "battle_lost",
  invasion_repelled: "battle_won",
  major_trade: "trade_completed",
  covert_op_detected: "covert_detected",
  reinforcement_received: "ally_saved",
  reinforcement_denied: "ally_betrayed",
  trade_completed: "trade_completed",
  treaty_signed: "treaty_formed",
  treaty_rejected: "message_received",
  minor_skirmish: "battle_lost",
  spy_caught: "covert_detected",
  threat_issued: "message_received",
  apology_given: "message_received",
  message_sent: "message_received",
  trade_offer_made: "message_received",
  routine_interaction: "message_received",
};

// =============================================================================
// INTERFACES
// =============================================================================

export interface MemoryWithDecay extends BotMemory {
  /** The current weight after decay is applied */
  currentWeight: number;
}

export interface RelationshipSummary {
  /** Net relationship score (positive = friendly, negative = hostile) */
  netScore: number;
  /** Whether there's a permanent grudge */
  hasPermanentGrudge: boolean;
  /** Relationship tier based on score */
  tier: "hostile" | "unfriendly" | "neutral" | "friendly" | "allied";
  /** Most significant memories */
  topMemories: MemoryWithDecay[];
}

// =============================================================================
// RECORD MEMORY
// =============================================================================

/**
 * Record a new memory for a bot.
 *
 * @param empireId - The bot empire holding the memory
 * @param targetEmpireId - The empire the memory is about
 * @param eventType - Type of event (from memory module)
 * @param turn - The turn when this event occurred
 * @param gameId - The game ID
 * @param context - Optional additional context data
 * @returns The created memory record
 */
export async function recordMemory(
  empireId: string,
  targetEmpireId: string,
  eventType: MemoryEventType,
  turn: number,
  gameId: string,
  context?: Record<string, unknown>
): Promise<BotMemory> {
  const weightDef = MEMORY_WEIGHTS[eventType];

  // Determine if this becomes a permanent scar
  const isPermanentScar =
    weightDef.isNegative &&
    weightDef.weight >= SCAR_WEIGHT_THRESHOLD &&
    Math.random() < PERMANENT_SCAR_CHANCE;

  // Map to database memory type
  const dbMemoryType = MEMORY_TYPE_TO_DB[eventType] as BotMemory["memoryType"];

  const memoryData: NewBotMemory = {
    gameId,
    empireId,
    targetEmpireId,
    memoryType: dbMemoryType,
    weight: weightDef.weight,
    description: weightDef.description,
    turn,
    decayResistance: String(getDecayResistanceValue(weightDef.decayResistance)),
    isPermanentScar,
    context: context ?? null,
  };

  const [memory] = await db.insert(botMemories).values(memoryData).returning();

  if (!memory) {
    throw new Error("Failed to create bot memory");
  }

  return memory;
}

/**
 * Helper to convert decay resistance level to numeric value.
 */
function getDecayResistanceValue(level: string): number {
  const values: Record<string, number> = {
    very_low: 0.1,
    low: 0.3,
    medium: 0.5,
    high: 0.8,
    permanent: 1.0,
  };
  return values[level] ?? 0.5;
}

// =============================================================================
// GET MEMORIES
// =============================================================================

/**
 * Get all memories for a bot about a specific target, with decay applied.
 *
 * @param empireId - The bot empire holding the memories
 * @param targetEmpireId - The empire the memories are about
 * @param currentTurn - Current game turn for decay calculation
 * @returns Memories with currentWeight reflecting decay
 */
export async function getMemoriesFor(
  empireId: string,
  targetEmpireId: string,
  currentTurn: number
): Promise<MemoryWithDecay[]> {
  const memories = await db.query.botMemories.findMany({
    where: and(
      eq(botMemories.empireId, empireId),
      eq(botMemories.targetEmpireId, targetEmpireId)
    ),
    orderBy: [desc(botMemories.turn)],
  });

  return memories.map((memory) => applyDecayToMemory(memory, currentTurn));
}

/**
 * Get all memories for a bot (all targets).
 *
 * @param empireId - The bot empire holding the memories
 * @param currentTurn - Current game turn for decay calculation
 * @returns All memories with decay applied
 */
export async function getAllMemoriesForEmpire(
  empireId: string,
  currentTurn: number
): Promise<MemoryWithDecay[]> {
  const memories = await db.query.botMemories.findMany({
    where: eq(botMemories.empireId, empireId),
    orderBy: [desc(botMemories.turn)],
  });

  return memories.map((memory) => applyDecayToMemory(memory, currentTurn));
}

/**
 * Apply decay to a single memory.
 */
function applyDecayToMemory(memory: BotMemory, currentTurn: number): MemoryWithDecay {
  // Permanent scars never decay
  if (memory.isPermanentScar) {
    return { ...memory, currentWeight: memory.weight };
  }

  const turnsSince = currentTurn - memory.turn;
  const decayResistance = parseFloat(memory.decayResistance);

  // Calculate decayed weight
  const currentWeight = calculateMemoryDecay(
    memory.weight,
    turnsSince,
    decayResistance >= 1.0 ? "permanent" :
    decayResistance >= 0.8 ? "high" :
    decayResistance >= 0.5 ? "medium" :
    decayResistance >= 0.3 ? "low" : "very_low"
  );

  return { ...memory, currentWeight };
}

// =============================================================================
// RELATIONSHIP SCORE
// =============================================================================

/**
 * Calculate the net relationship score between a bot and target.
 * Positive = friendly, Negative = hostile.
 *
 * @param empireId - The bot empire
 * @param targetEmpireId - The target empire
 * @param currentTurn - Current game turn
 * @returns Net relationship score
 */
export async function getRelationshipScore(
  empireId: string,
  targetEmpireId: string,
  currentTurn: number
): Promise<number> {
  const memories = await getMemoriesFor(empireId, targetEmpireId, currentTurn);

  return memories.reduce((score, memory) => {
    // Determine if memory is negative based on memory type
    const isNegative = isNegativeMemoryType(memory.memoryType);

    if (isNegative) {
      return score - memory.currentWeight;
    } else {
      return score + memory.currentWeight;
    }
  }, 0);
}

/**
 * Check if a memory type is negative (reduces relationship score).
 */
function isNegativeMemoryType(memoryType: BotMemory["memoryType"]): boolean {
  const negativeTypes = [
    "planet_captured",
    "planet_lost",
    "ally_betrayed",
    "treaty_broken",
    "war_declared",
    "covert_detected",
    "battle_lost",
  ];
  return negativeTypes.includes(memoryType);
}

/**
 * Get a full relationship summary between a bot and target.
 *
 * @param empireId - The bot empire
 * @param targetEmpireId - The target empire
 * @param currentTurn - Current game turn
 * @returns Full relationship summary
 */
export async function getRelationshipSummary(
  empireId: string,
  targetEmpireId: string,
  currentTurn: number
): Promise<RelationshipSummary> {
  const memories = await getMemoriesFor(empireId, targetEmpireId, currentTurn);

  // Calculate net score
  const netScore = memories.reduce((score, memory) => {
    const isNegative = isNegativeMemoryType(memory.memoryType);
    return isNegative ? score - memory.currentWeight : score + memory.currentWeight;
  }, 0);

  // Check for permanent grudge
  const hasPermanentGrudge = memories.some((m) => m.isPermanentScar);

  // Determine tier
  const tier = getRelationshipTier(netScore, hasPermanentGrudge);

  // Get top memories by current weight
  const topMemories = memories
    .sort((a, b) => Math.abs(b.currentWeight) - Math.abs(a.currentWeight))
    .slice(0, 5);

  return {
    netScore: Math.round(netScore * 100) / 100,
    hasPermanentGrudge,
    tier,
    topMemories,
  };
}

/**
 * Determine relationship tier from score.
 */
function getRelationshipTier(
  netScore: number,
  hasPermanentGrudge: boolean
): "hostile" | "unfriendly" | "neutral" | "friendly" | "allied" {
  // Permanent grudge caps at unfriendly maximum
  if (hasPermanentGrudge && netScore > -25) {
    return "unfriendly";
  }

  if (netScore < -100) return "hostile";
  if (netScore < -25) return "unfriendly";
  if (netScore < 25) return "neutral";
  if (netScore < 100) return "friendly";
  return "allied";
}

// =============================================================================
// PERMANENT GRUDGE MANAGEMENT
// =============================================================================

/**
 * Check if a bot has a permanent grudge against a target.
 *
 * @param empireId - The bot empire
 * @param targetEmpireId - The target empire
 * @returns True if there's a permanent grudge
 */
export async function hasPermanentGrudge(
  empireId: string,
  targetEmpireId: string
): Promise<boolean> {
  const memories = await db.query.botMemories.findMany({
    where: and(
      eq(botMemories.empireId, empireId),
      eq(botMemories.targetEmpireId, targetEmpireId),
      eq(botMemories.isPermanentScar, true)
    ),
    limit: 1,
  });

  return memories.length > 0;
}

/**
 * Get all empires a bot has permanent grudges against.
 *
 * @param empireId - The bot empire
 * @returns Array of empire IDs
 */
export async function getPermanentGrudges(empireId: string): Promise<string[]> {
  const memories = await db.query.botMemories.findMany({
    where: and(
      eq(botMemories.empireId, empireId),
      eq(botMemories.isPermanentScar, true)
    ),
  });

  // Get unique target empire IDs
  const targetIds = new Set(memories.map((m) => m.targetEmpireId));
  return Array.from(targetIds);
}

// =============================================================================
// MEMORY CLEANUP
// =============================================================================

/**
 * Prune memories that have decayed below a threshold.
 * Permanent scars are never pruned.
 *
 * @param empireId - The bot empire
 * @param currentTurn - Current game turn
 * @param threshold - Minimum weight to keep (default 0.5)
 * @returns Number of memories pruned
 */
export async function pruneDecayedMemories(
  empireId: string,
  currentTurn: number,
  threshold: number = 0.5
): Promise<number> {
  const memories = await getAllMemoriesForEmpire(empireId, currentTurn);

  const toDelete = memories.filter(
    (m) => !m.isPermanentScar && m.currentWeight < threshold
  );

  if (toDelete.length === 0) {
    return 0;
  }

  // Delete in batches
  for (const memory of toDelete) {
    await db.delete(botMemories).where(eq(botMemories.id, memory.id));
  }

  return toDelete.length;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Record a memory event with type inference from game events.
 * Convenience wrapper for common event types.
 */
export async function recordBattleMemory(
  empireId: string,
  targetEmpireId: string,
  won: boolean,
  turn: number,
  gameId: string
): Promise<BotMemory> {
  return recordMemory(
    empireId,
    targetEmpireId,
    won ? "battle_won" : "battle_lost",
    turn,
    gameId
  );
}

export async function recordPlanetCapturedMemory(
  empireId: string,
  targetEmpireId: string,
  turn: number,
  gameId: string,
  planetName?: string
): Promise<BotMemory> {
  return recordMemory(
    empireId,
    targetEmpireId,
    "planet_captured",
    turn,
    gameId,
    planetName ? { planetName } : undefined
  );
}

export async function recordTreatyMemory(
  empireId: string,
  targetEmpireId: string,
  signed: boolean,
  turn: number,
  gameId: string
): Promise<BotMemory> {
  return recordMemory(
    empireId,
    targetEmpireId,
    signed ? "treaty_signed" : "treaty_rejected",
    turn,
    gameId
  );
}

export async function recordBetrayalMemory(
  empireId: string,
  targetEmpireId: string,
  turn: number,
  gameId: string
): Promise<BotMemory> {
  return recordMemory(
    empireId,
    targetEmpireId,
    "alliance_broken",
    turn,
    gameId
  );
}

export async function recordTradeMemory(
  empireId: string,
  targetEmpireId: string,
  turn: number,
  gameId: string,
  amount?: number
): Promise<BotMemory> {
  return recordMemory(
    empireId,
    targetEmpireId,
    "trade_completed",
    turn,
    gameId,
    amount ? { amount } : undefined
  );
}

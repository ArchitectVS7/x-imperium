/**
 * Build Queue Service (M3)
 *
 * Handles unit construction queue operations:
 * - Add units to build queue (credits deducted immediately)
 * - Process queue each turn (decrement turns, add units on completion)
 * - Cancel build orders (50% refund)
 */

import { db } from "@/lib/db";
import { buildQueue, empires, type BuildQueue } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { UNIT_COSTS, UNIT_POPULATION, type UnitType } from "../../unit-config";
import { UNIT_BUILD_TIMES, MAX_QUEUE_SIZE, calculateBuildCancelRefund, toDbUnitType, fromDbUnitType } from "../../build-config";
import { calculateNetworth } from "../../networth";

// =============================================================================
// TYPES
// =============================================================================

export interface AddToQueueResult {
  success: boolean;
  error?: string;
  queueEntry?: BuildQueue;
  creditsDeducted?: number;
  populationDeducted?: number;
}

export interface ProcessQueueResult {
  success: boolean;
  completedBuilds: CompletedBuild[];
  error?: string;
}

export interface CompletedBuild {
  unitType: UnitType;
  quantity: number;
}

export interface CancelBuildResult {
  success: boolean;
  error?: string;
  creditsRefunded?: number;
}

export interface QueueStatus {
  entries: BuildQueue[];
  totalItems: number;
  canAddMore: boolean;
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Add a unit build order to the queue.
 *
 * - Validates credits and population
 * - Checks research requirements (Light Cruisers require level 2)
 * - Deducts credits and population immediately
 * - Adds to build queue with appropriate build time
 */
export async function addToBuildQueue(
  empireId: string,
  gameId: string,
  unitType: UnitType,
  quantity: number
): Promise<AddToQueueResult> {
  if (quantity <= 0) {
    return { success: false, error: "Quantity must be positive" };
  }

  // Fetch current empire state
  const empire = await db.query.empires.findFirst({
    where: eq(empires.id, empireId),
  });

  if (!empire) {
    return { success: false, error: "Empire not found" };
  }

  // Check Light Cruiser research requirement
  if (unitType === "lightCruisers" && empire.fundamentalResearchLevel < 2) {
    return { success: false, error: "Light Cruisers require Research Level 2" };
  }

  // Calculate costs
  const unitCost = UNIT_COSTS[unitType];
  const totalCost = unitCost * quantity;
  const populationCost = UNIT_POPULATION[unitType] * quantity;

  // Validate credits
  if (empire.credits < totalCost) {
    return {
      success: false,
      error: `Insufficient credits. Need ${totalCost.toLocaleString()}, have ${empire.credits.toLocaleString()}`,
    };
  }

  // Validate population
  if (empire.population < populationCost) {
    return {
      success: false,
      error: `Insufficient population. Need ${populationCost.toLocaleString()}, have ${empire.population.toLocaleString()}`,
    };
  }

  // Check queue size limit
  const currentQueue = await db.query.buildQueue.findMany({
    where: eq(buildQueue.empireId, empireId),
  });

  if (currentQueue.length >= MAX_QUEUE_SIZE) {
    return { success: false, error: `Build queue full (max ${MAX_QUEUE_SIZE} items)` };
  }

  // Calculate new values
  const newCredits = empire.credits - totalCost;
  const newPopulation = empire.population - populationCost;
  const buildTime = UNIT_BUILD_TIMES[unitType];

  // Get next queue position
  const maxPosition = currentQueue.reduce((max, q) => Math.max(max, q.queuePosition), 0);
  const nextPosition = maxPosition + 1;

  // Create queue entry
  const [queueEntry] = await db
    .insert(buildQueue)
    .values({
      empireId,
      gameId,
      unitType: toDbUnitType(unitType),
      quantity,
      turnsRemaining: buildTime,
      totalCost,
      queuePosition: nextPosition,
    })
    .returning();

  if (!queueEntry) {
    return { success: false, error: "Failed to create build queue entry" };
  }

  // Deduct credits and population
  await db
    .update(empires)
    .set({
      credits: newCredits,
      population: newPopulation,
      updatedAt: new Date(),
    })
    .where(eq(empires.id, empireId));

  return {
    success: true,
    queueEntry,
    creditsDeducted: totalCost,
    populationDeducted: populationCost,
  };
}

/**
 * Process the build queue for an empire during turn processing.
 *
 * - Decrements turnsRemaining for all queue entries
 * - When turnsRemaining reaches 0, adds units to empire and removes from queue
 * - Updates networth after adding units
 */
export async function processBuildQueue(
  empireId: string
): Promise<ProcessQueueResult> {
  const completedBuilds: CompletedBuild[] = [];

  // Get all queue entries for this empire, ordered by position
  const queue = await db.query.buildQueue.findMany({
    where: eq(buildQueue.empireId, empireId),
    orderBy: asc(buildQueue.queuePosition),
  });

  if (queue.length === 0) {
    return { success: true, completedBuilds };
  }

  // Fetch empire for unit count updates
  const empire = await db.query.empires.findFirst({
    where: eq(empires.id, empireId),
  });

  if (!empire) {
    return { success: false, completedBuilds, error: "Empire not found" };
  }

  // Track unit additions
  const unitAdditions: Partial<Record<UnitType, number>> = {};

  // Process each queue entry
  for (const entry of queue) {
    const newTurnsRemaining = entry.turnsRemaining - 1;

    if (newTurnsRemaining <= 0) {
      // Build complete - add units
      const unitType = fromDbUnitType(entry.unitType);
      unitAdditions[unitType] = (unitAdditions[unitType] || 0) + entry.quantity;
      completedBuilds.push({ unitType, quantity: entry.quantity });

      // Remove from queue
      await db.delete(buildQueue).where(eq(buildQueue.id, entry.id));
    } else {
      // Still building - decrement turns
      await db
        .update(buildQueue)
        .set({ turnsRemaining: newTurnsRemaining })
        .where(eq(buildQueue.id, entry.id));
    }
  }

  // Update empire with new units if any completed
  if (Object.keys(unitAdditions).length > 0) {
    const newSoldiers = empire.soldiers + (unitAdditions.soldiers || 0);
    const newFighters = empire.fighters + (unitAdditions.fighters || 0);
    const newStations = empire.stations + (unitAdditions.stations || 0);
    const newLightCruisers = empire.lightCruisers + (unitAdditions.lightCruisers || 0);
    const newHeavyCruisers = empire.heavyCruisers + (unitAdditions.heavyCruisers || 0);
    const newCarriers = empire.carriers + (unitAdditions.carriers || 0);
    const newCovertAgents = empire.covertAgents + (unitAdditions.covertAgents || 0);

    // Calculate new networth
    const newNetworth = calculateNetworth({
      sectorCount: empire.sectorCount,
      soldiers: newSoldiers,
      fighters: newFighters,
      stations: newStations,
      lightCruisers: newLightCruisers,
      heavyCruisers: newHeavyCruisers,
      carriers: newCarriers,
      covertAgents: newCovertAgents,
    });

    await db
      .update(empires)
      .set({
        soldiers: newSoldiers,
        fighters: newFighters,
        stations: newStations,
        lightCruisers: newLightCruisers,
        heavyCruisers: newHeavyCruisers,
        carriers: newCarriers,
        covertAgents: newCovertAgents,
        networth: newNetworth,
        updatedAt: new Date(),
      })
      .where(eq(empires.id, empireId));
  }

  return { success: true, completedBuilds };
}

/**
 * Cancel a build order and refund credits.
 *
 * - Gives 50% refund if build hasn't started
 * - Proportional refund if in progress
 * - Population is NOT refunded (already consumed for training)
 */
export async function cancelBuildOrder(
  empireId: string,
  queueId: string
): Promise<CancelBuildResult> {
  // Find the queue entry
  const entry = await db.query.buildQueue.findFirst({
    where: and(eq(buildQueue.id, queueId), eq(buildQueue.empireId, empireId)),
  });

  if (!entry) {
    return { success: false, error: "Build order not found or doesn't belong to this empire" };
  }

  // Calculate refund
  const unitType = fromDbUnitType(entry.unitType);
  const buildTime = UNIT_BUILD_TIMES[unitType];
  const refund = calculateBuildCancelRefund(entry.totalCost, entry.turnsRemaining, buildTime);

  // Fetch empire for credit update
  const empire = await db.query.empires.findFirst({
    where: eq(empires.id, empireId),
  });

  if (!empire) {
    return { success: false, error: "Empire not found" };
  }

  // Delete the queue entry
  await db.delete(buildQueue).where(eq(buildQueue.id, queueId));

  // Add refund to empire
  const newCredits = empire.credits + refund;
  await db
    .update(empires)
    .set({
      credits: newCredits,
      updatedAt: new Date(),
    })
    .where(eq(empires.id, empireId));

  // Reorder remaining queue entries
  const remainingQueue = await db.query.buildQueue.findMany({
    where: eq(buildQueue.empireId, empireId),
    orderBy: asc(buildQueue.queuePosition),
  });

  for (let i = 0; i < remainingQueue.length; i++) {
    const entry = remainingQueue[i];
    if (entry) {
      await db
        .update(buildQueue)
        .set({ queuePosition: i + 1 })
        .where(eq(buildQueue.id, entry.id));
    }
  }

  return {
    success: true,
    creditsRefunded: refund,
  };
}

/**
 * Get the current build queue status for an empire.
 */
export async function getBuildQueueStatus(empireId: string): Promise<QueueStatus | null> {
  const entries = await db.query.buildQueue.findMany({
    where: eq(buildQueue.empireId, empireId),
    orderBy: asc(buildQueue.queuePosition),
  });

  return {
    entries,
    totalItems: entries.length,
    canAddMore: entries.length < MAX_QUEUE_SIZE,
  };
}

/**
 * Get a single build queue entry by ID.
 */
export async function getBuildQueueEntry(
  empireId: string,
  queueId: string
): Promise<BuildQueue | null> {
  const entry = await db.query.buildQueue.findFirst({
    where: and(eq(buildQueue.id, queueId), eq(buildQueue.empireId, empireId)),
  });

  return entry || null;
}

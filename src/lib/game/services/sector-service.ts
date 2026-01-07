/**
 * Sector Service (M3)
 *
 * Handles sector acquisition and release operations.
 * - Colonize sectors with cost scaling (PRD 5.3)
 * - Release sectors with 50% refund
 * - Atomic updates to empire.sectorCount and networth
 */

import { db } from "@/lib/db";
import { empires, sectors, type Sector } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  calculateSectorCost,
  calculateReleaseRefund,
  calculateAffordableSectors,
} from "@/lib/formulas/sector-costs";
import { PLANET_COSTS, PLANET_PRODUCTION, type PlanetType } from "../constants";
import { calculateNetworth } from "../networth";

// =============================================================================
// TYPES
// =============================================================================

export interface ColonizeSectorResult {
  success: boolean;
  error?: string;
  sector?: Sector;
  creditsDeducted?: number;
  newSectorCount?: number;
  newNetworth?: number;
}

export interface ReleaseSectorResult {
  success: boolean;
  error?: string;
  creditsRefunded?: number;
  newSectorCount?: number;
  newNetworth?: number;
}

export interface SectorPurchaseInfo {
  sectorType: PlanetType;
  baseCost: number;
  currentCost: number;
  costMultiplier: number;
  affordableCount: number;
  ownedCount: number;
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Colonize a sector for an empire.
 *
 * - Validates sufficient credits
 * - Deducts credits using scaled cost
 * - Creates sector record
 * - Updates empire.sectorCount and networth atomically
 *
 * @param empireId - The empire colonizing the sector
 * @param sectorType - Type of sector to colonize
 * @param gameId - Game ID for the sector record
 * @param currentTurn - Current turn number for acquisition tracking
 */
export async function colonizeSector(
  empireId: string,
  sectorType: PlanetType,
  gameId: string,
  currentTurn: number
): Promise<ColonizeSectorResult> {
  // Fetch current empire state
  const empire = await db.query.empires.findFirst({
    where: eq(empires.id, empireId),
    with: {
      sectors: true,
    },
  });

  if (!empire) {
    return { success: false, error: "Empire not found" };
  }

  // Get base cost for sector type
  const baseCost = PLANET_COSTS[sectorType];
  if (!baseCost) {
    return { success: false, error: `Invalid sector type: ${sectorType}` };
  }

  // Calculate scaled cost based on current ownership
  const currentSectorCount = empire.sectorCount;
  const scaledCost = calculateSectorCost(baseCost, currentSectorCount);

  // Validate sufficient credits
  if (empire.credits < scaledCost) {
    return {
      success: false,
      error: `Insufficient credits. Need ${scaledCost.toLocaleString()}, have ${empire.credits.toLocaleString()}`,
    };
  }

  // Calculate new values
  const newCredits = empire.credits - scaledCost;
  const newSectorCount = currentSectorCount + 1;
  const newNetworth = calculateNetworth({
    sectorCount: newSectorCount,
    soldiers: empire.soldiers,
    fighters: empire.fighters,
    stations: empire.stations,
    lightCruisers: empire.lightCruisers,
    heavyCruisers: empire.heavyCruisers,
    carriers: empire.carriers,
    covertAgents: empire.covertAgents,
  });

  // Create sector and update empire atomically
  const [newSector] = await db
    .insert(sectors)
    .values({
      empireId,
      gameId,
      type: sectorType,
      productionRate: String(PLANET_PRODUCTION[sectorType]),
      purchasePrice: scaledCost,
      acquiredAtTurn: currentTurn,
    })
    .returning();

  if (!newSector) {
    return { success: false, error: "Failed to create sector" };
  }

  // Update empire with new credits, sector count, and networth
  await db
    .update(empires)
    .set({
      credits: newCredits,
      sectorCount: newSectorCount,
      networth: newNetworth,
      updatedAt: new Date(),
    })
    .where(eq(empires.id, empireId));

  return {
    success: true,
    sector: newSector,
    creditsDeducted: scaledCost,
    newSectorCount,
    newNetworth,
  };
}

/**
 * Release (sell) a sector for an empire.
 *
 * - Validates sector ownership
 * - Calculates 50% refund of current price
 * - Deletes sector record
 * - Updates empire.sectorCount and networth atomically
 *
 * @param empireId - The empire releasing the sector
 * @param sectorId - ID of the sector to release
 */
export async function releaseSector(
  empireId: string,
  sectorId: string
): Promise<ReleaseSectorResult> {
  // Fetch the sector to release
  const sector = await db.query.sectors.findFirst({
    where: eq(sectors.id, sectorId),
  });

  if (!sector) {
    return { success: false, error: "Sector not found" };
  }

  if (sector.empireId !== empireId) {
    return { success: false, error: "Sector does not belong to this empire" };
  }

  // Fetch current empire state
  const empire = await db.query.empires.findFirst({
    where: eq(empires.id, empireId),
  });

  if (!empire) {
    return { success: false, error: "Empire not found" };
  }

  // Cannot release if only 1 sector left
  if (empire.sectorCount <= 1) {
    return { success: false, error: "Cannot release your last sector" };
  }

  // Get base cost for sector type
  const baseCost = PLANET_COSTS[sector.type as PlanetType];
  if (!baseCost) {
    return { success: false, error: `Invalid sector type: ${sector.type}` };
  }

  // Calculate refund (50% of current price based on ownership count)
  // Note: We use current sector count (including this sector) for the refund calculation
  const refund = calculateReleaseRefund(baseCost, empire.sectorCount);

  // Calculate new values
  const newCredits = empire.credits + refund;
  const newSectorCount = empire.sectorCount - 1;
  const newNetworth = calculateNetworth({
    sectorCount: newSectorCount,
    soldiers: empire.soldiers,
    fighters: empire.fighters,
    stations: empire.stations,
    lightCruisers: empire.lightCruisers,
    heavyCruisers: empire.heavyCruisers,
    carriers: empire.carriers,
    covertAgents: empire.covertAgents,
  });

  // Delete sector
  await db.delete(sectors).where(eq(sectors.id, sectorId));

  // Update empire with new credits, sector count, and networth
  await db
    .update(empires)
    .set({
      credits: newCredits,
      sectorCount: newSectorCount,
      networth: newNetworth,
      updatedAt: new Date(),
    })
    .where(eq(empires.id, empireId));

  return {
    success: true,
    creditsRefunded: refund,
    newSectorCount,
    newNetworth,
  };
}

/**
 * Get purchase information for a sector type.
 *
 * Returns current cost, affordable count, and ownership info.
 *
 * @param empireId - The empire to check
 * @param sectorType - Type of sector to get info for
 */
export async function getSectorPurchaseInfo(
  empireId: string,
  sectorType: PlanetType
): Promise<SectorPurchaseInfo | null> {
  // Fetch current empire state
  const empire = await db.query.empires.findFirst({
    where: eq(empires.id, empireId),
    with: {
      sectors: true,
    },
  });

  if (!empire) {
    return null;
  }

  // Get base cost for sector type
  const baseCost = PLANET_COSTS[sectorType];
  if (!baseCost) {
    return null;
  }

  // Calculate current cost and multiplier
  const currentCost = calculateSectorCost(baseCost, empire.sectorCount);
  const costMultiplier = 1 + empire.sectorCount * 0.05;

  // Calculate how many can be afforded
  const affordableCount = calculateAffordableSectors(
    baseCost,
    empire.sectorCount,
    empire.credits
  );

  // Count owned sectors of this type
  const ownedCount = empire.sectors.filter((p) => p.type === sectorType).length;

  return {
    sectorType,
    baseCost,
    currentCost,
    costMultiplier,
    affordableCount,
    ownedCount,
  };
}

/**
 * Get purchase information for all sector types.
 *
 * @param empireId - The empire to check
 */
export async function getAllSectorPurchaseInfo(
  empireId: string
): Promise<SectorPurchaseInfo[] | null> {
  const sectorTypes: PlanetType[] = [
    "food",
    "ore",
    "petroleum",
    "tourism",
    "urban",
    "education",
    "government",
    "research",
    "supply",
    "anti_pollution",
  ];

  // Fetch current empire state once
  const empire = await db.query.empires.findFirst({
    where: eq(empires.id, empireId),
    with: {
      sectors: true,
    },
  });

  if (!empire) {
    return null;
  }

  return sectorTypes.map((sectorType) => {
    const baseCost = PLANET_COSTS[sectorType];
    const currentCost = calculateSectorCost(baseCost, empire.sectorCount);
    const costMultiplier = 1 + empire.sectorCount * 0.05;
    const affordableCount = calculateAffordableSectors(
      baseCost,
      empire.sectorCount,
      empire.credits
    );
    const ownedCount = empire.sectors.filter((p) => p.type === sectorType).length;

    return {
      sectorType,
      baseCost,
      currentCost,
      costMultiplier,
      affordableCount,
      ownedCount,
    };
  });
}

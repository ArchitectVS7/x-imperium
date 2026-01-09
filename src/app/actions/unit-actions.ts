"use server";

import { db } from "@/lib/db";
import { empires } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  validateBuild,
  isUnitLocked,
  calculateUnitMaintenance,
  calculateTotalMaintenance,
  getAvailableUnits,
  getLockedUnits,
  type BuildValidation,
  type UnitMaintenanceBreakdown,
  type UnitCounts,
} from "@/lib/game/services/military/unit-service";
import type { UnitType } from "@/lib/game/unit-config";
import { isValidUnitType, sanitizeQuantity } from "@/lib/security/validation";
import { getGameSession } from "@/lib/session";

// =============================================================================
// VALIDATION ACTIONS
// =============================================================================

/**
 * Validate if the current empire can build a specific unit type.
 *
 * SECURITY: Validates unit type and quantity at runtime.
 */
export async function validateBuildAction(
  unitType: UnitType,
  quantity: number
): Promise<BuildValidation | { error: string }> {
  // Validate unit type at runtime
  if (!isValidUnitType(unitType)) {
    return { error: "Invalid unit type" };
  }

  // Validate quantity (bounded to prevent overflow)
  const safeQuantity = sanitizeQuantity(quantity, 1, 100_000);
  if (safeQuantity === undefined) {
    return { error: "Invalid quantity (must be between 1 and 100,000)" };
  }

  const { empireId } = await getGameSession();

  if (!empireId) {
    return { error: "No active game session" };
  }

  try {
    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (!empire) {
      return { error: "Empire not found" };
    }

    return validateBuild(
      unitType,
      safeQuantity,
      empire.credits,
      empire.population,
      empire.fundamentalResearchLevel
    );
  } catch (error) {
    console.error("Failed to validate build:", error);
    return { error: error instanceof Error ? error.message : "Validation failed" };
  }
}

/**
 * Check if a unit type is locked for the current empire.
 *
 * SECURITY: Validates unit type at runtime.
 */
export async function checkUnitLockAction(
  unitType: UnitType
): Promise<{ isLocked: boolean; reason?: string } | { error: string }> {
  // Validate unit type at runtime
  if (!isValidUnitType(unitType)) {
    return { error: "Invalid unit type" };
  }

  const { empireId } = await getGameSession();

  if (!empireId) {
    return { error: "No active game session" };
  }

  try {
    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (!empire) {
      return { error: "Empire not found" };
    }

    return isUnitLocked(unitType, empire.fundamentalResearchLevel);
  } catch (error) {
    console.error("Failed to check unit lock:", error);
    return { error: error instanceof Error ? error.message : "Check failed" };
  }
}

// =============================================================================
// MAINTENANCE ACTIONS
// =============================================================================

/**
 * Get unit maintenance breakdown for the current empire.
 */
export async function getUnitMaintenanceAction(): Promise<UnitMaintenanceBreakdown | null> {
  const { empireId } = await getGameSession();

  if (!empireId) {
    return null;
  }

  try {
    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (!empire) {
      return null;
    }

    const units: UnitCounts = {
      soldiers: empire.soldiers,
      fighters: empire.fighters,
      stations: empire.stations,
      lightCruisers: empire.lightCruisers,
      heavyCruisers: empire.heavyCruisers,
      carriers: empire.carriers,
      covertAgents: empire.covertAgents,
    };

    return calculateUnitMaintenance(units);
  } catch (error) {
    console.error("Failed to get unit maintenance:", error);
    return null;
  }
}

/**
 * Get total maintenance (sectors + units) for the current empire.
 */
export async function getTotalMaintenanceAction(): Promise<{
  sectorCost: number;
  unitCost: number;
  totalCost: number;
  unitBreakdown: UnitMaintenanceBreakdown;
} | null> {
  const { empireId } = await getGameSession();

  if (!empireId) {
    return null;
  }

  try {
    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (!empire) {
      return null;
    }

    const units: UnitCounts = {
      soldiers: empire.soldiers,
      fighters: empire.fighters,
      stations: empire.stations,
      lightCruisers: empire.lightCruisers,
      heavyCruisers: empire.heavyCruisers,
      carriers: empire.carriers,
      covertAgents: empire.covertAgents,
    };

    return calculateTotalMaintenance(empire.sectorCount, units);
  } catch (error) {
    console.error("Failed to get total maintenance:", error);
    return null;
  }
}

// =============================================================================
// UNIT AVAILABILITY ACTIONS
// =============================================================================

/**
 * Get available and locked units for the current empire.
 */
export async function getUnitAvailabilityAction(): Promise<{
  available: UnitType[];
  locked: UnitType[];
  researchLevel: number;
} | null> {
  const { empireId } = await getGameSession();

  if (!empireId) {
    return null;
  }

  try {
    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (!empire) {
      return null;
    }

    return {
      available: getAvailableUnits(empire.fundamentalResearchLevel),
      locked: getLockedUnits(empire.fundamentalResearchLevel),
      researchLevel: empire.fundamentalResearchLevel,
    };
  } catch (error) {
    console.error("Failed to get unit availability:", error);
    return null;
  }
}

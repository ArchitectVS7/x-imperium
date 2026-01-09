"use server";

import {
  upgradeUnit,
  getUnitUpgradeStatus,
  getAllUpgradeStatuses,
  canUpgradeUnit,
  type UpgradeResult,
  type UpgradeStatus,
  type AllUpgradeStatuses,
} from "@/lib/game/services/military/upgrade-service";
import type { UnitType } from "@/lib/game/unit-config";
import { isValidUnitType } from "@/lib/security/validation";
import { getGameSession } from "@/lib/session";

// =============================================================================
// UPGRADE ACTIONS
// =============================================================================

/**
 * Upgrade a unit type to the next level.
 *
 * SECURITY: Validates unit type at runtime.
 */
export async function upgradeUnitAction(
  unitType: UnitType
): Promise<UpgradeResult> {
  // Validate unit type at runtime
  if (!isValidUnitType(unitType)) {
    return { success: false, error: "Invalid unit type" };
  }

  const { empireId } = await getGameSession();

  if (!empireId) {
    return { success: false, error: "No active game session" };
  }

  try {
    return await upgradeUnit(empireId, unitType);
  } catch (error) {
    console.error("Failed to upgrade unit:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upgrade failed",
    };
  }
}

/**
 * Get upgrade status for a specific unit type.
 *
 * SECURITY: Validates unit type at runtime.
 */
export async function getUnitUpgradeStatusAction(
  unitType: UnitType
): Promise<UpgradeStatus | null> {
  // Validate unit type at runtime
  if (!isValidUnitType(unitType)) {
    return null;
  }

  const { empireId } = await getGameSession();

  if (!empireId) {
    return null;
  }

  try {
    return await getUnitUpgradeStatus(empireId, unitType);
  } catch (error) {
    console.error("Failed to get unit upgrade status:", error);
    return null;
  }
}

/**
 * Get upgrade statuses for all unit types.
 */
export async function getAllUpgradeStatusesAction(): Promise<AllUpgradeStatuses | null> {
  const { empireId } = await getGameSession();

  if (!empireId) {
    return null;
  }

  try {
    return await getAllUpgradeStatuses(empireId);
  } catch (error) {
    console.error("Failed to get all upgrade statuses:", error);
    return null;
  }
}

/**
 * Check if a specific unit can be upgraded.
 *
 * SECURITY: Validates unit type at runtime.
 */
export async function canUpgradeUnitAction(
  unitType: UnitType
): Promise<{ canUpgrade: boolean; reason?: string }> {
  // Validate unit type at runtime
  if (!isValidUnitType(unitType)) {
    return { canUpgrade: false, reason: "Invalid unit type" };
  }

  const { empireId } = await getGameSession();

  if (!empireId) {
    return { canUpgrade: false, reason: "No active game session" };
  }

  try {
    return await canUpgradeUnit(empireId, unitType);
  } catch (error) {
    console.error("Failed to check upgrade eligibility:", error);
    return {
      canUpgrade: false,
      reason: error instanceof Error ? error.message : "Check failed",
    };
  }
}

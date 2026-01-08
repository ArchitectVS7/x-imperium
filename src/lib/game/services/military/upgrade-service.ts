/**
 * Unit Upgrade Service (M3)
 *
 * Handles unit upgrade operations:
 * - Initialize upgrade entries for new empires
 * - Upgrade units (costs research points)
 * - Get upgrade status and bonuses
 *
 * PRD References:
 * - PRD 9.2: Unit upgrades (3 levels per type)
 * - Upgrade costs: 500 RP for level 1, 1000 RP for level 2
 */

import { db } from "@/lib/db";
import { unitUpgrades, researchProgress, type UnitUpgrade } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { UNIT_TYPES, type UnitType } from "../../unit-config";
import {
  MAX_UPGRADE_LEVEL,
  getUpgradeCost,
  getUpgradeBonuses,
  getUpgradeDescription,
} from "../../upgrade-config";
import { toDbUnitType, fromDbUnitType, type DbUnitType } from "../../build-config";

// =============================================================================
// TYPES
// =============================================================================

export interface UpgradeStatus {
  unitType: UnitType;
  level: number;
  maxLevel: number;
  canUpgrade: boolean;
  upgradeCost: number;
  description: string;
  bonuses: Record<string, number>;
}

export interface UpgradeResult {
  success: boolean;
  error?: string;
  newLevel?: number;
  researchPointsSpent?: number;
}

export interface AllUpgradeStatuses {
  upgrades: UpgradeStatus[];
  availableResearchPoints: number;
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize unit upgrades for a new empire.
 * Creates upgrade entries for all unit types at level 0.
 */
export async function initializeUnitUpgrades(
  empireId: string,
  gameId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if already initialized
    const existing = await db.query.unitUpgrades.findFirst({
      where: eq(unitUpgrades.empireId, empireId),
    });

    if (existing) {
      return { success: true };
    }

    // Create entries for all unit types
    const values = UNIT_TYPES.map((unitType) => ({
      empireId,
      gameId,
      unitType: toDbUnitType(unitType),
      upgradeLevel: 0,
      totalInvestment: 0,
    }));

    await db.insert(unitUpgrades).values(values);

    return { success: true };
  } catch (error) {
    console.error("Failed to initialize unit upgrades:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Initialization failed",
    };
  }
}

// =============================================================================
// UPGRADE OPERATIONS
// =============================================================================

/**
 * Upgrade a unit type to the next level.
 * Costs research points from the empire's research progress.
 *
 * @param empireId - The empire upgrading
 * @param unitType - The unit type to upgrade
 * @returns Result with new level and cost
 */
export async function upgradeUnit(
  empireId: string,
  unitType: UnitType
): Promise<UpgradeResult> {
  try {
    // Get current upgrade level
    const dbUnitType = toDbUnitType(unitType);
    const upgrade = await db.query.unitUpgrades.findFirst({
      where: and(
        eq(unitUpgrades.empireId, empireId),
        eq(unitUpgrades.unitType, dbUnitType)
      ),
    });

    if (!upgrade) {
      return { success: false, error: "Unit upgrade not found. Initialize upgrades first." };
    }

    // Check if already at max level
    if (upgrade.upgradeLevel >= MAX_UPGRADE_LEVEL) {
      return { success: false, error: `${unitType} is already at maximum level` };
    }

    // Get upgrade cost
    const cost = getUpgradeCost(upgrade.upgradeLevel);
    if (cost <= 0) {
      return { success: false, error: "Invalid upgrade cost" };
    }

    // Get empire's research progress
    const progress = await db.query.researchProgress.findFirst({
      where: eq(researchProgress.empireId, empireId),
    });

    if (!progress) {
      return { success: false, error: "Research progress not found" };
    }

    // Check if empire has enough research points
    if (progress.currentInvestment < cost) {
      return {
        success: false,
        error: `Insufficient research points. Need ${cost.toLocaleString()}, have ${progress.currentInvestment.toLocaleString()}`,
      };
    }

    // Deduct research points
    const newResearchPoints = progress.currentInvestment - cost;
    await db
      .update(researchProgress)
      .set({
        currentInvestment: newResearchPoints,
        updatedAt: new Date(),
      })
      .where(eq(researchProgress.id, progress.id));

    // Upgrade the unit
    const newLevel = upgrade.upgradeLevel + 1;
    const newTotalInvestment = upgrade.totalInvestment + cost;

    await db
      .update(unitUpgrades)
      .set({
        upgradeLevel: newLevel,
        totalInvestment: newTotalInvestment,
        updatedAt: new Date(),
      })
      .where(eq(unitUpgrades.id, upgrade.id));

    return {
      success: true,
      newLevel,
      researchPointsSpent: cost,
    };
  } catch (error) {
    console.error("Failed to upgrade unit:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upgrade failed",
    };
  }
}

// =============================================================================
// STATUS QUERIES
// =============================================================================

/**
 * Get the upgrade status for a specific unit type.
 */
export async function getUnitUpgradeStatus(
  empireId: string,
  unitType: UnitType
): Promise<UpgradeStatus | null> {
  try {
    const dbUnitType = toDbUnitType(unitType);
    const upgrade = await db.query.unitUpgrades.findFirst({
      where: and(
        eq(unitUpgrades.empireId, empireId),
        eq(unitUpgrades.unitType, dbUnitType)
      ),
    });

    if (!upgrade) {
      return null;
    }

    const progress = await db.query.researchProgress.findFirst({
      where: eq(researchProgress.empireId, empireId),
    });

    const upgradeCost = getUpgradeCost(upgrade.upgradeLevel);
    const availablePoints = progress?.currentInvestment ?? 0;
    const canUpgrade =
      upgrade.upgradeLevel < MAX_UPGRADE_LEVEL && availablePoints >= upgradeCost;

    const bonuses = getUpgradeBonuses(unitType, upgrade.upgradeLevel);

    return {
      unitType,
      level: upgrade.upgradeLevel,
      maxLevel: MAX_UPGRADE_LEVEL,
      canUpgrade,
      upgradeCost,
      description: getUpgradeDescription(unitType, upgrade.upgradeLevel),
      bonuses: bonuses as Record<string, number>,
    };
  } catch (error) {
    console.error("Failed to get unit upgrade status:", error);
    return null;
  }
}

/**
 * Get upgrade statuses for all unit types.
 */
export async function getAllUpgradeStatuses(
  empireId: string
): Promise<AllUpgradeStatuses | null> {
  try {
    const allUpgrades = await db.query.unitUpgrades.findMany({
      where: eq(unitUpgrades.empireId, empireId),
    });

    if (allUpgrades.length === 0) {
      return null;
    }

    const progress = await db.query.researchProgress.findFirst({
      where: eq(researchProgress.empireId, empireId),
    });

    const availableResearchPoints = progress?.currentInvestment ?? 0;

    const upgrades: UpgradeStatus[] = allUpgrades.map((upgrade) => {
      const unitType = fromDbUnitType(upgrade.unitType as DbUnitType);
      const upgradeCost = getUpgradeCost(upgrade.upgradeLevel);
      const canUpgrade =
        upgrade.upgradeLevel < MAX_UPGRADE_LEVEL &&
        availableResearchPoints >= upgradeCost;

      const bonuses = getUpgradeBonuses(unitType, upgrade.upgradeLevel);

      return {
        unitType,
        level: upgrade.upgradeLevel,
        maxLevel: MAX_UPGRADE_LEVEL,
        canUpgrade,
        upgradeCost,
        description: getUpgradeDescription(unitType, upgrade.upgradeLevel),
        bonuses: bonuses as Record<string, number>,
      };
    });

    return {
      upgrades,
      availableResearchPoints,
    };
  } catch (error) {
    console.error("Failed to get all upgrade statuses:", error);
    return null;
  }
}

/**
 * Get the upgrade entry for a specific unit type.
 */
export async function getUnitUpgradeEntry(
  empireId: string,
  unitType: UnitType
): Promise<UnitUpgrade | null> {
  try {
    const dbUnitType = toDbUnitType(unitType);
    const upgrade = await db.query.unitUpgrades.findFirst({
      where: and(
        eq(unitUpgrades.empireId, empireId),
        eq(unitUpgrades.unitType, dbUnitType)
      ),
    });
    return upgrade ?? null;
  } catch (error) {
    console.error("Failed to get unit upgrade entry:", error);
    return null;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a unit type can be upgraded.
 */
export async function canUpgradeUnit(
  empireId: string,
  unitType: UnitType
): Promise<{ canUpgrade: boolean; reason?: string }> {
  const status = await getUnitUpgradeStatus(empireId, unitType);

  if (!status) {
    return { canUpgrade: false, reason: "Unit upgrade not found" };
  }

  if (status.level >= MAX_UPGRADE_LEVEL) {
    return { canUpgrade: false, reason: "Already at maximum level" };
  }

  const progress = await db.query.researchProgress.findFirst({
    where: eq(researchProgress.empireId, empireId),
  });

  if (!progress || progress.currentInvestment < status.upgradeCost) {
    return {
      canUpgrade: false,
      reason: `Insufficient research points (need ${status.upgradeCost})`,
    };
  }

  return { canUpgrade: true };
}

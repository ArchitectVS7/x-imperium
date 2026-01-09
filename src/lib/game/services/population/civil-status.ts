/**
 * Civil Status Service
 *
 * Handles civil status evaluation, transitions, and income multiplier calculations.
 * Civil status affects income through 8 levels from Ecstatic (2.5×) to Revolting (0.5×).
 *
 * PRD References:
 * - PRD 4.4: Civil Status System (8 levels)
 * - Income multipliers: Ecstatic (2.5×) down to Revolting (0.5×) - 5x differential
 * - Status changes based on food supply, victories, defeats
 */

import { db } from "@/lib/db";
import { civilStatusHistory } from "@/lib/db/schema";
import {
  CIVIL_STATUS_LEVELS,
  CIVIL_STATUS_INCOME_MULTIPLIERS,
  type CivilStatusLevel,
} from "../../constants";
import type { CivilStatusUpdate } from "../../types/turn-types";

// =============================================================================
// CIVIL STATUS EVALUATION EVENTS
// =============================================================================

/** Events that can affect civil status */
export type CivilStatusEvent = {
  type:
    | "food_surplus"
    | "food_deficit"
    | "victory"
    | "defeat"
    | "high_maintenance"
    | "low_maintenance"
    | "education"
    | "starvation";
  /** Number of consecutive turns (for tracking patterns) */
  consecutiveTurns?: number;
  /** Severity multiplier (0-1) */
  severity?: number;
};

// =============================================================================
// STATUS THRESHOLDS
// =============================================================================

/** Number of consecutive food deficit turns before downgrade */
const FOOD_DEFICIT_THRESHOLD = 2;

/** Number of consecutive food surplus turns before upgrade */
const FOOD_SURPLUS_THRESHOLD = 5;

/** Battle loss casualties percentage to trigger downgrade */
const BATTLE_LOSS_THRESHOLD = 0.3; // 30%

/** Number of victories to trigger upgrade */
const VICTORY_COUNT_THRESHOLD = 3;

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Get income multiplier for a civil status level
 *
 * @param status - Civil status level
 * @returns Income multiplier (0.5× to 2.5×)
 *
 * @example
 * getIncomeMultiplier('ecstatic') // => 2.5
 * getIncomeMultiplier('content')  // => 1.5
 * getIncomeMultiplier('unhappy')  // => 0.85
 * getIncomeMultiplier('revolting') // => 0.5
 */
export function getIncomeMultiplier(status: CivilStatusLevel): number {
  return CIVIL_STATUS_INCOME_MULTIPLIERS[status];
}

/**
 * Get the status level index (for comparisons)
 *
 * @param status - Civil status level
 * @returns Index in CIVIL_STATUS_LEVELS array (0 = ecstatic, 7 = revolting)
 */
function getStatusIndex(status: CivilStatusLevel): number {
  return CIVIL_STATUS_LEVELS.indexOf(status);
}

/**
 * Downgrade civil status by N levels
 *
 * @param currentStatus - Current status
 * @param levels - Number of levels to downgrade (default: 1)
 * @returns New status (cannot go below 'revolting')
 */
function downgradeStatus(
  currentStatus: CivilStatusLevel,
  levels: number = 1
): CivilStatusLevel {
  const currentIndex = getStatusIndex(currentStatus);
  const newIndex = Math.min(currentIndex + levels, CIVIL_STATUS_LEVELS.length - 1);
  return CIVIL_STATUS_LEVELS[newIndex] as CivilStatusLevel;
}

/**
 * Upgrade civil status by N levels
 *
 * @param currentStatus - Current status
 * @param levels - Number of levels to upgrade (default: 1)
 * @returns New status (cannot go above 'ecstatic')
 */
function upgradeStatus(
  currentStatus: CivilStatusLevel,
  levels: number = 1
): CivilStatusLevel {
  const currentIndex = getStatusIndex(currentStatus);
  const newIndex = Math.max(currentIndex - levels, 0);
  return CIVIL_STATUS_LEVELS[newIndex] as CivilStatusLevel;
}

/**
 * Determine if status should downgrade based on events
 *
 * @param currentStatus - Current civil status
 * @param events - Events that occurred this turn
 * @returns True if status should downgrade
 */
export function shouldDowngradeStatus(
  currentStatus: CivilStatusLevel,
  events: CivilStatusEvent[]
): boolean {
  // Cannot downgrade from revolting (already at bottom)
  if (currentStatus === "revolting") {
    return false;
  }

  // Immediate downgrades
  for (const event of events) {
    switch (event.type) {
      case "starvation":
        // Starvation always causes downgrade
        return true;

      case "food_deficit":
        // Consecutive food deficits trigger downgrade
        if (event.consecutiveTurns && event.consecutiveTurns >= FOOD_DEFICIT_THRESHOLD) {
          return true;
        }
        break;

      case "defeat":
        // Major battle losses trigger downgrade
        if (event.severity && event.severity >= BATTLE_LOSS_THRESHOLD) {
          return true;
        }
        break;

      case "high_maintenance":
        // High maintenance burden can trigger downgrade
        if (event.severity && event.severity > 0.8) {
          return true;
        }
        break;
    }
  }

  return false;
}

/**
 * Determine if status should upgrade based on events
 *
 * @param currentStatus - Current civil status
 * @param events - Events that occurred this turn
 * @returns True if status should upgrade
 */
export function shouldUpgradeStatus(
  currentStatus: CivilStatusLevel,
  events: CivilStatusEvent[]
): boolean {
  // Cannot upgrade from ecstatic (already at top)
  if (currentStatus === "ecstatic") {
    return false;
  }

  // Check for upgrade triggers
  for (const event of events) {
    switch (event.type) {
      case "food_surplus":
        // Consecutive food surplus triggers upgrade
        if (event.consecutiveTurns && event.consecutiveTurns >= FOOD_SURPLUS_THRESHOLD) {
          return true;
        }
        break;

      case "victory":
        // Multiple victories trigger upgrade
        if (event.consecutiveTurns && event.consecutiveTurns >= VICTORY_COUNT_THRESHOLD) {
          return true;
        }
        break;

      case "education":
        // Education sector bonus can trigger upgrade
        return true;

      case "low_maintenance":
        // Low maintenance is good for morale
        if (event.severity && event.severity < 0.3) {
          return true;
        }
        break;
    }
  }

  return false;
}

/**
 * Evaluate civil status and determine if it should change
 *
 * @param currentStatus - Current civil status
 * @param events - Events that occurred this turn
 * @returns CivilStatusUpdate with new status (or unchanged if no change)
 *
 * @example
 * // Food deficit causes downgrade
 * evaluateCivilStatus('content', [{ type: 'food_deficit', consecutiveTurns: 3 }])
 * // => { oldStatus: 'content', newStatus: 'neutral', reason: 'Food deficit', multiplier: 1.0, changed: true }
 *
 * // No change
 * evaluateCivilStatus('content', [])
 * // => { oldStatus: 'content', newStatus: 'content', reason: 'No events', multiplier: 2.0, changed: false }
 */
export function evaluateCivilStatus(
  currentStatus: CivilStatusLevel,
  events: CivilStatusEvent[]
): CivilStatusUpdate {
  let newStatus = currentStatus;
  let reason = "No significant events";

  // Check for downgrade first (negative events take priority)
  if (shouldDowngradeStatus(currentStatus, events)) {
    newStatus = downgradeStatus(currentStatus);

    // Determine reason
    if (events.some((e) => e.type === "starvation")) {
      reason = "Population starvation";
    } else if (events.some((e) => e.type === "food_deficit")) {
      reason = "Prolonged food deficit";
    } else if (events.some((e) => e.type === "defeat")) {
      reason = "Major battle losses";
    } else if (events.some((e) => e.type === "high_maintenance")) {
      reason = "High maintenance burden";
    }
  }
  // Check for upgrade (only if not downgrading)
  else if (shouldUpgradeStatus(currentStatus, events)) {
    newStatus = upgradeStatus(currentStatus);

    // Determine reason
    if (events.some((e) => e.type === "food_surplus")) {
      reason = "Sustained food surplus";
    } else if (events.some((e) => e.type === "victory")) {
      reason = "Multiple victories";
    } else if (events.some((e) => e.type === "education")) {
      reason = "Education improvements";
    } else if (events.some((e) => e.type === "low_maintenance")) {
      reason = "Low maintenance costs";
    }
  }

  const changed = newStatus !== currentStatus;
  const multiplier = getIncomeMultiplier(newStatus);

  return {
    oldStatus: currentStatus,
    newStatus,
    reason,
    multiplier,
    changed,
  };
}

/**
 * Log a civil status change to the database
 *
 * @param empireId - Empire UUID
 * @param gameId - Game UUID
 * @param turn - Current turn number
 * @param update - CivilStatusUpdate from evaluateCivilStatus
 * @returns Promise that resolves when logged
 *
 * @example
 * await logStatusChange(
 *   empireId,
 *   gameId,
 *   15,
 *   { oldStatus: 'content', newStatus: 'neutral', reason: 'Food deficit', multiplier: 1.0, changed: true }
 * );
 */
export async function logStatusChange(
  empireId: string,
  gameId: string,
  turn: number,
  update: CivilStatusUpdate
): Promise<void> {
  // Only log if status actually changed
  if (!update.changed) {
    return;
  }

  await db.insert(civilStatusHistory).values({
    empireId,
    gameId,
    turn,
    oldStatus: update.oldStatus,
    newStatus: update.newStatus,
    reason: update.reason,
    incomeMultiplier: update.multiplier.toString(), // Convert number to string for decimal field
  });
}

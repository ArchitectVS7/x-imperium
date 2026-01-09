"use server";

/**
 * Combat Server Actions (M4)
 *
 * Server actions for combat operations with:
 * - Cookie-based session management
 * - Input validation at the boundary
 * - Rate limiting for abuse prevention
 * - Proper error handling and logging
 */

import { revalidatePath } from "next/cache";
import {
  executeAttack,
  executeRetreat,
  validateAttack,
  getTargets,
  type AttackParams,
  type AttackResult,
  type AttackValidation,
} from "@/lib/game/services/combat";
import {
  getAttackHistory,
  getAttackWithLogs,
  getEmpireForces,
  type AttackWithLogs,
} from "@/lib/game/repositories/combat-repository";
import type { Forces, AttackType } from "@/lib/combat/phases";
import type { CombatStance } from "@/lib/combat/stances";
import type { Attack } from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { getGameSession } from "@/lib/session";

// Valid combat stances for validation
const VALID_STANCES: CombatStance[] = ["aggressive", "balanced", "defensive", "evasive"];

// =============================================================================
// INPUT VALIDATION
// =============================================================================

/**
 * Validate UUID format at the action boundary.
 */
function isValidUUID(id: string): boolean {
  if (typeof id !== "string") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate and sanitize forces input.
 */
function sanitizeForces(forces: unknown): Forces | null {
  if (!forces || typeof forces !== "object") return null;

  const f = forces as Record<string, unknown>;

  // Ensure all fields exist and are valid non-negative integers
  const soldiers = typeof f.soldiers === "number" ? Math.floor(Math.max(0, f.soldiers)) : 0;
  const fighters = typeof f.fighters === "number" ? Math.floor(Math.max(0, f.fighters)) : 0;
  const stations = typeof f.stations === "number" ? Math.floor(Math.max(0, f.stations)) : 0;
  const lightCruisers = typeof f.lightCruisers === "number" ? Math.floor(Math.max(0, f.lightCruisers)) : 0;
  const heavyCruisers = typeof f.heavyCruisers === "number" ? Math.floor(Math.max(0, f.heavyCruisers)) : 0;
  const carriers = typeof f.carriers === "number" ? Math.floor(Math.max(0, f.carriers)) : 0;

  // Validate no value is NaN or Infinity
  if (!Number.isFinite(soldiers) || !Number.isFinite(fighters) ||
      !Number.isFinite(stations) || !Number.isFinite(lightCruisers) ||
      !Number.isFinite(heavyCruisers) || !Number.isFinite(carriers)) {
    return null;
  }

  return { soldiers, fighters, stations, lightCruisers, heavyCruisers, carriers };
}

/**
 * Validate attack type.
 */
function isValidAttackType(type: unknown): type is AttackType {
  return type === "invasion" || type === "guerilla";
}

// =============================================================================
// ATTACK ACTIONS
// =============================================================================

/**
 * Launch an attack against another empire.
 *
 * @param defenderId - Target empire ID
 * @param attackType - "invasion" or "guerilla"
 * @param forces - Forces to commit to the attack
 * @param attackerStance - Combat stance for D20 volley combat (optional, defaults to "balanced")
 */
export async function launchAttackAction(
  defenderId: string,
  attackType: AttackType,
  forces: Forces,
  attackerStance?: CombatStance
): Promise<AttackResult> {
  try {
    // Get session cookies
    const { gameId, empireId } = await getGameSession();

    if (!gameId || !empireId) {
      return { success: false, error: "No active game session" };
    }

    // Rate limit check for combat actions
    const rateLimitResult = checkRateLimit(empireId, "COMBAT_ACTION");
    if (!rateLimitResult.allowed) {
      const waitSeconds = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return {
        success: false,
        error: `Too many attacks. Please wait ${waitSeconds} seconds before trying again.`,
      };
    }

    // Validate inputs at action boundary
    if (!isValidUUID(defenderId)) {
      return { success: false, error: "Invalid defender ID" };
    }

    if (!isValidAttackType(attackType)) {
      return { success: false, error: "Invalid attack type" };
    }

    const sanitizedForces = sanitizeForces(forces);
    if (!sanitizedForces) {
      return { success: false, error: "Invalid forces data" };
    }

    // Validate stance if provided
    const validatedStance: CombatStance | undefined =
      attackerStance && VALID_STANCES.includes(attackerStance)
        ? attackerStance
        : undefined;

    const params: AttackParams = {
      gameId,
      attackerId: empireId,
      defenderId,
      attackType,
      forces: sanitizedForces,
      attackerStance: validatedStance,
    };

    const result = await executeAttack(params);

    if (result.success) {
      revalidatePath("/game");
      revalidatePath("/game/combat");
      revalidatePath("/game/military");
    }

    return result;
  } catch (error) {
    console.error("Failed to launch attack:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Attack failed",
    };
  }
}

/**
 * Validate an attack before launching.
 */
export async function validateAttackAction(
  defenderId: string,
  attackType: AttackType,
  forces: Forces
): Promise<AttackValidation> {
  try {
    const { gameId, empireId } = await getGameSession();

    if (!gameId || !empireId) {
      return { valid: false, errors: ["No active game session"] };
    }

    // Validate inputs
    if (!isValidUUID(defenderId)) {
      return { valid: false, errors: ["Invalid defender ID"] };
    }

    if (!isValidAttackType(attackType)) {
      return { valid: false, errors: ["Invalid attack type"] };
    }

    const sanitizedForces = sanitizeForces(forces);
    if (!sanitizedForces) {
      return { valid: false, errors: ["Invalid forces data"] };
    }

    const params: AttackParams = {
      gameId,
      attackerId: empireId,
      defenderId,
      attackType,
      forces: sanitizedForces,
    };

    return await validateAttack(params);
  } catch (error) {
    console.error("Failed to validate attack:", error);
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : "Validation failed"],
    };
  }
}

/**
 * Execute a retreat (15% casualties).
 */
export async function retreatAction(
  forces: Forces
): Promise<{ success: boolean; error?: string; casualties?: Forces }> {
  try {
    const { empireId } = await getGameSession();

    if (!empireId) {
      return { success: false, error: "No active game session" };
    }

    const sanitizedForces = sanitizeForces(forces);
    if (!sanitizedForces) {
      return { success: false, error: "Invalid forces data" };
    }

    const result = await executeRetreat(empireId, sanitizedForces);

    if (result.success) {
      revalidatePath("/game");
      revalidatePath("/game/military");
    }

    return {
      success: result.success,
      error: result.error,
      casualties: result.casualties,
    };
  } catch (error) {
    console.error("Failed to retreat:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Retreat failed",
    };
  }
}

// =============================================================================
// QUERY ACTIONS
// =============================================================================

/**
 * Get available targets for attack.
 */
export async function getAvailableTargetsAction(): Promise<{
  success: boolean;
  targets?: Array<{ id: string; name: string; networth: number; sectorCount: number }>;
  error?: string;
}> {
  try {
    const { gameId, empireId } = await getGameSession();

    if (!gameId || !empireId) {
      return { success: false, error: "No active game session" };
    }

    const targets = await getTargets(gameId, empireId);

    return { success: true, targets };
  } catch (error) {
    console.error("Failed to get targets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get targets",
    };
  }
}

/**
 * Get player's current military forces.
 */
export async function getMyForcesAction(): Promise<{
  success: boolean;
  forces?: Forces;
  error?: string;
}> {
  try {
    const { empireId } = await getGameSession();

    if (!empireId) {
      return { success: false, error: "No active game session" };
    }

    const forces = await getEmpireForces(empireId);

    if (!forces) {
      return { success: false, error: "Forces not found" };
    }

    return { success: true, forces };
  } catch (error) {
    console.error("Failed to get forces:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get forces",
    };
  }
}

/**
 * Get attack history for the player's empire.
 */
export async function getAttackHistoryAction(
  limit = 20
): Promise<{
  success: boolean;
  attacks?: Attack[];
  error?: string;
}> {
  try {
    const { empireId } = await getGameSession();

    if (!empireId) {
      return { success: false, error: "No active game session" };
    }

    // Sanitize limit
    const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 100);

    const attacks = await getAttackHistory(empireId, safeLimit);

    return { success: true, attacks };
  } catch (error) {
    console.error("Failed to get attack history:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get history",
    };
  }
}

/**
 * Get detailed attack with combat logs.
 *
 * SECURITY: Verifies the requesting user is either the attacker or defender.
 */
export async function getAttackDetailsAction(
  attackId: string
): Promise<{
  success: boolean;
  attack?: AttackWithLogs;
  error?: string;
}> {
  try {
    // Get session cookies
    const { empireId } = await getGameSession();

    if (!empireId) {
      return { success: false, error: "No active game session" };
    }

    // Validate input
    if (!isValidUUID(attackId)) {
      return { success: false, error: "Invalid attack ID" };
    }

    const attack = await getAttackWithLogs(attackId);

    if (!attack) {
      return { success: false, error: "Attack not found" };
    }

    // SECURITY: Verify the requesting user is involved in this attack
    if (attack.attackerId !== empireId && attack.defenderId !== empireId) {
      return { success: false, error: "Unauthorized: You are not involved in this attack" };
    }

    return { success: true, attack };
  } catch (error) {
    console.error("Failed to get attack details:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get details",
    };
  }
}

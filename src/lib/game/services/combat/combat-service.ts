/**
 * Combat Service (M4)
 *
 * Orchestrates combat operations:
 * - Validates attack parameters
 * - Verifies authorization (empire belongs to game)
 * - Executes combat using phases.ts
 * - Applies results via combat-repository
 *
 * SECURITY: All operations verify empire belongs to the specified game.
 * Input validation prevents negative values and invalid states.
 */

import {
  resolveGuerillaAttack,
  resolveRetreat,
  SOLDIERS_PER_CARRIER,
} from "@/lib/combat/phases";
import type { Forces, CombatResult, AttackType } from "@/lib/combat/types";
import {
  resolveBattle,
  convertToLegacyCombatResult,
  type BattleResult,
} from "@/lib/combat/volley-combat-v2";
import type { CombatStance } from "@/lib/combat/stances";
import {
  saveAttack,
  applyCombatResults,
  getEmpireForces,
  getAvailableTargets,
  type SaveAttackParams,
} from "../../repositories/combat-repository";
import { db } from "@/lib/db";
import { empires, games } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hasActiveTreaty } from "@/lib/diplomacy";

// =============================================================================
// TYPES
// =============================================================================

export interface AttackParams {
  gameId: string;
  attackerId: string;
  defenderId: string;
  attackType: AttackType;
  forces: Forces;
  /** Combat stance for D20 volley combat (optional, defaults to balanced) */
  attackerStance?: CombatStance;
}

export interface AttackValidation {
  valid: boolean;
  errors: string[];
}

export interface AttackResult {
  success: boolean;
  error?: string;
  result?: CombatResult;
  /** Full D20 battle result with volley details (only for volley combat) */
  battleResult?: BattleResult;
  attackId?: string;
}

// =============================================================================
// INPUT VALIDATION
// =============================================================================

/**
 * Validate UUID format.
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate forces are non-negative integers.
 */
function validateForces(forces: Forces): string[] {
  const errors: string[] = [];

  if (!Number.isInteger(forces.soldiers) || forces.soldiers < 0) {
    errors.push("Soldiers must be a non-negative integer");
  }
  if (!Number.isInteger(forces.fighters) || forces.fighters < 0) {
    errors.push("Fighters must be a non-negative integer");
  }
  if (!Number.isInteger(forces.stations) || forces.stations < 0) {
    errors.push("Stations must be a non-negative integer");
  }
  if (!Number.isInteger(forces.lightCruisers) || forces.lightCruisers < 0) {
    errors.push("Light cruisers must be a non-negative integer");
  }
  if (!Number.isInteger(forces.heavyCruisers) || forces.heavyCruisers < 0) {
    errors.push("Heavy cruisers must be a non-negative integer");
  }
  if (!Number.isInteger(forces.carriers) || forces.carriers < 0) {
    errors.push("Carriers must be a non-negative integer");
  }

  return errors;
}

/**
 * Verify an empire belongs to a specific game.
 * SECURITY: Critical for preventing cross-game attacks.
 */
async function verifyEmpireBelongsToGame(
  empireId: string,
  gameId: string
): Promise<{ valid: boolean; empire?: typeof empires.$inferSelect; error?: string }> {
  const empire = await db.query.empires.findFirst({
    where: eq(empires.id, empireId),
  });

  if (!empire) {
    return { valid: false, error: "Empire not found" };
  }

  if (empire.gameId !== gameId) {
    return { valid: false, error: "Empire does not belong to this game" };
  }

  return { valid: true, empire };
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate attack parameters before execution.
 * Includes authorization checks and input validation.
 */
export async function validateAttack(params: AttackParams): Promise<AttackValidation> {
  const errors: string[] = [];
  const { gameId, attackerId, defenderId, attackType, forces } = params;

  // UUID format validation
  if (!isValidUUID(gameId)) {
    return { valid: false, errors: ["Invalid game ID format"] };
  }
  if (!isValidUUID(attackerId)) {
    return { valid: false, errors: ["Invalid attacker ID format"] };
  }
  if (!isValidUUID(defenderId)) {
    return { valid: false, errors: ["Invalid defender ID format"] };
  }

  // Forces validation
  const forceErrors = validateForces(forces);
  if (forceErrors.length > 0) {
    return { valid: false, errors: forceErrors };
  }

  // Attack type validation
  if (attackType !== "invasion" && attackType !== "guerilla") {
    return { valid: false, errors: ["Invalid attack type"] };
  }

  // Cannot attack self
  if (attackerId === defenderId) {
    errors.push("Cannot attack yourself");
    return { valid: false, errors };
  }

  // Verify attacker belongs to the game (AUTHORIZATION)
  const attackerAuth = await verifyEmpireBelongsToGame(attackerId, gameId);
  if (!attackerAuth.valid) {
    return { valid: false, errors: [attackerAuth.error ?? "Attacker authorization failed"] };
  }

  // Verify defender belongs to the game
  const defenderAuth = await verifyEmpireBelongsToGame(defenderId, gameId);
  if (!defenderAuth.valid) {
    return { valid: false, errors: [defenderAuth.error ?? "Defender not found in game"] };
  }

  // Check if defender is eliminated
  if (defenderAuth.empire?.isEliminated) {
    errors.push("Cannot attack eliminated empire");
    return { valid: false, errors };
  }

  // M7: Check for active treaty between attacker and defender
  const hasTreaty = await hasActiveTreaty(attackerId, defenderId);
  if (hasTreaty) {
    errors.push("Cannot attack empire with active treaty (NAP or Alliance)");
    return { valid: false, errors };
  }

  // Get attacker's current forces
  const attackerForces = await getEmpireForces(attackerId);
  if (!attackerForces) {
    return { valid: false, errors: ["Attacker empire forces not found"] };
  }

  // Validate attacker has enough units
  if (forces.soldiers > attackerForces.soldiers) {
    errors.push(`Insufficient soldiers: have ${attackerForces.soldiers}, want ${forces.soldiers}`);
  }
  if (forces.fighters > attackerForces.fighters) {
    errors.push(`Insufficient fighters: have ${attackerForces.fighters}, want ${forces.fighters}`);
  }
  if (forces.lightCruisers > attackerForces.lightCruisers) {
    errors.push(`Insufficient light cruisers: have ${attackerForces.lightCruisers}, want ${forces.lightCruisers}`);
  }
  if (forces.heavyCruisers > attackerForces.heavyCruisers) {
    errors.push(`Insufficient heavy cruisers: have ${attackerForces.heavyCruisers}, want ${forces.heavyCruisers}`);
  }
  if (forces.carriers > attackerForces.carriers) {
    errors.push(`Insufficient carriers: have ${attackerForces.carriers}, want ${forces.carriers}`);
  }
  if (forces.stations > attackerForces.stations) {
    errors.push(`Insufficient stations: have ${attackerForces.stations}, want ${forces.stations}`);
  }

  // Validate attack type requirements
  if (attackType === "invasion") {
    // Need at least some combat units
    const hasUnits = forces.soldiers > 0 || forces.fighters > 0 ||
                     forces.lightCruisers > 0 || forces.heavyCruisers > 0;
    if (!hasUnits) {
      errors.push("Invasion requires at least some combat units");
    }

    // Carrier capacity for soldiers
    const carrierCapacity = forces.carriers * SOLDIERS_PER_CARRIER;
    if (forces.soldiers > carrierCapacity) {
      errors.push(`Insufficient carrier capacity: ${forces.carriers} carriers can transport ${carrierCapacity} soldiers, need ${forces.soldiers}`);
    }
  } else if (attackType === "guerilla") {
    // Guerilla only uses soldiers
    if (forces.soldiers === 0) {
      errors.push("Guerilla attack requires at least 1 soldier");
    }
    if (forces.fighters > 0 || forces.lightCruisers > 0 || forces.heavyCruisers > 0 ||
        forces.carriers > 0 || forces.stations > 0) {
      errors.push("Guerilla attack can only use soldiers");
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// COMBAT EXECUTION
// =============================================================================

/**
 * Execute an attack and apply results.
 * Includes full authorization and validation.
 */
export async function executeAttack(params: AttackParams): Promise<AttackResult> {
  const { gameId, attackerId, defenderId, attackType, forces, attackerStance } = params;

  // Validate attack (includes authorization)
  const validation = await validateAttack(params);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join("; ") };
  }

  // Get defender forces (fresh fetch for combat calculation)
  const defenderForces = await getEmpireForces(defenderId);
  if (!defenderForces) {
    return { success: false, error: "Defender forces not found" };
  }

  // Get attacker for effectiveness
  const attacker = await db.query.empires.findFirst({
    where: eq(empires.id, attackerId),
  });
  if (!attacker) {
    return { success: false, error: "Attacker not found" };
  }

  // Get defender for sector count
  const defender = await db.query.empires.findFirst({
    where: eq(empires.id, defenderId),
  });
  if (!defender) {
    return { success: false, error: "Defender not found" };
  }

  // Execute combat based on attack type
  let result: CombatResult;
  let battleResult: BattleResult | undefined;

  if (attackType === "guerilla") {
    // Guerilla attack - soldiers only, single phase
    result = resolveGuerillaAttack(
      forces.soldiers,
      defenderForces
    );
  } else {
    // D20 3-volley combat system (production)
    // Resolve battle to get full D20 details
    battleResult = resolveBattle(
      { ...forces },
      { ...defenderForces },
      {
        attackerStance,
        defenderSectorCount: defender.sectorCount,
      }
    );
    // Convert to legacy format for backward compatibility
    result = convertToLegacyCombatResult(battleResult, forces, defenderForces);
  }

  // Get current turn
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
  });

  if (!game) {
    return { success: false, error: "Game not found" };
  }

  const currentTurn = game.currentTurn;

  // Save attack to database
  const saveParams: SaveAttackParams = {
    gameId,
    attackerId,
    defenderId,
    turn: currentTurn,
    attackType,
    attackerForces: forces,
    defenderForces,
    result,
  };

  try {
    const attack = await saveAttack(saveParams);

    // Apply combat results to empires
    await applyCombatResults(attackerId, defenderId, result);

    return {
      success: true,
      result,
      battleResult,
      attackId: attack.id,
    };
  } catch (error) {
    console.error("Failed to save attack:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save attack",
    };
  }
}

/**
 * Execute a retreat with transaction safety.
 */
export async function executeRetreat(
  attackerId: string,
  forces: Forces
): Promise<{ success: boolean; casualties: Forces; error?: string }> {
  // Input validation
  if (!isValidUUID(attackerId)) {
    return {
      success: false,
      error: "Invalid attacker ID",
      casualties: { soldiers: 0, fighters: 0, stations: 0, lightCruisers: 0, heavyCruisers: 0, carriers: 0 }
    };
  }

  const forceErrors = validateForces(forces);
  if (forceErrors.length > 0) {
    return {
      success: false,
      error: forceErrors.join("; "),
      casualties: { soldiers: 0, fighters: 0, stations: 0, lightCruisers: 0, heavyCruisers: 0, carriers: 0 }
    };
  }

  const result = resolveRetreat(forces);

  // Apply retreat casualties within a transaction
  try {
    await db.transaction(async (tx) => {
      // Fetch fresh attacker state
      const attacker = await tx.query.empires.findFirst({
        where: eq(empires.id, attackerId),
      });

      if (!attacker) {
        throw new Error("Attacker not found");
      }

      // Deduct retreat casualties
      await tx
        .update(empires)
        .set({
          soldiers: Math.max(0, attacker.soldiers - result.attackerTotalCasualties.soldiers),
          fighters: Math.max(0, attacker.fighters - result.attackerTotalCasualties.fighters),
          lightCruisers: Math.max(0, attacker.lightCruisers - result.attackerTotalCasualties.lightCruisers),
          heavyCruisers: Math.max(0, attacker.heavyCruisers - result.attackerTotalCasualties.heavyCruisers),
          carriers: Math.max(0, attacker.carriers - result.attackerTotalCasualties.carriers),
          updatedAt: new Date(),
        })
        .where(eq(empires.id, attackerId));
    });

    return { success: true, casualties: result.attackerTotalCasualties };
  } catch (error) {
    console.error("Retreat failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Retreat failed",
      casualties: result.attackerTotalCasualties
    };
  }
}

/**
 * Get targets available for attack.
 * M7: Filters out empires with active treaties (NAP or Alliance).
 */
export async function getTargets(
  gameId: string,
  empireId: string
): Promise<Array<{ id: string; name: string; networth: number; sectorCount: number; hasTreaty: boolean }>> {
  // Input validation (getAvailableTargets also validates, but validate early)
  if (!isValidUUID(gameId) || !isValidUUID(empireId)) {
    return [];
  }

  const targets = await getAvailableTargets(gameId, empireId);

  // Check treaties for each target
  const targetsWithTreatyInfo = await Promise.all(
    targets.map(async (t) => {
      const hasTreatyFlag = await hasActiveTreaty(empireId, t.id);
      return {
        id: t.id,
        name: t.name,
        networth: t.networth,
        sectorCount: t.sectorCount,
        hasTreaty: hasTreatyFlag,
      };
    })
  );

  return targetsWithTreatyInfo;
}

/**
 * Combat Repository (M4)
 *
 * Handles database persistence for combat operations:
 * - Save attack records
 * - Save phase-by-phase combat logs
 * - Retrieve attack history
 * - Apply combat results to empires
 *
 * SECURITY: All write operations use transactions for atomicity.
 * Race conditions are prevented by fetching fresh data within transactions.
 */

import { db } from "@/lib/db";
import type { Database } from "@/lib/db";
import {
  attacks,
  combatLogs,
  empires,
  sectors,
  type Attack,
  type CombatLog,
  type Empire,
} from "@/lib/db/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";
import type { CombatResult, Forces, PhaseResult, AttackType } from "@/lib/combat/phases";

// =============================================================================
// TYPES
// =============================================================================

export interface SaveAttackParams {
  gameId: string;
  attackerId: string;
  defenderId: string;
  targetPlanetId?: string;
  turn: number;
  attackType: AttackType;
  attackerForces: Forces;
  defenderForces: Forces;
  result: CombatResult;
}

export interface AttackWithLogs extends Attack {
  logs: CombatLog[];
  attacker?: Empire;
  defender?: Empire;
}

// =============================================================================
// INPUT VALIDATION
// =============================================================================

/**
 * Validate UUID format to prevent injection attacks.
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate forces object has non-negative values.
 */
function validateForces(forces: Forces): boolean {
  return (
    forces.soldiers >= 0 &&
    forces.fighters >= 0 &&
    forces.stations >= 0 &&
    forces.lightCruisers >= 0 &&
    forces.heavyCruisers >= 0 &&
    forces.carriers >= 0 &&
    Number.isFinite(forces.soldiers) &&
    Number.isFinite(forces.fighters) &&
    Number.isFinite(forces.stations) &&
    Number.isFinite(forces.lightCruisers) &&
    Number.isFinite(forces.heavyCruisers) &&
    Number.isFinite(forces.carriers)
  );
}

// =============================================================================
// SAVE OPERATIONS (WITH TRANSACTIONS)
// =============================================================================

/**
 * Save an attack and its combat logs to the database.
 * Uses a transaction for atomicity.
 */
export async function saveAttack(params: SaveAttackParams): Promise<Attack> {
  const {
    gameId,
    attackerId,
    defenderId,
    targetPlanetId,
    turn,
    attackType,
    attackerForces,
    defenderForces,
    result,
  } = params;

  // Input validation
  if (!isValidUUID(gameId) || !isValidUUID(attackerId) || !isValidUUID(defenderId)) {
    throw new Error("Invalid ID format");
  }
  if (targetPlanetId && !isValidUUID(targetPlanetId)) {
    throw new Error("Invalid target sector ID format");
  }
  if (!validateForces(attackerForces) || !validateForces(defenderForces)) {
    throw new Error("Invalid forces: values must be non-negative finite numbers");
  }
  if (turn < 1 || !Number.isInteger(turn)) {
    throw new Error("Invalid turn number");
  }

  // Calculate total power from all phases (with overflow protection)
  const totalAttackerPower = result.phases.reduce((sum, p) => {
    const newSum = sum + p.attackerPower;
    return Number.isFinite(newSum) ? newSum : sum;
  }, 0);
  const totalDefenderPower = result.phases.reduce((sum, p) => {
    const newSum = sum + p.defenderPower;
    return Number.isFinite(newSum) ? newSum : sum;
  }, 0);

  // Use transaction for atomicity
  return await db.transaction(async (tx) => {
    // Insert the attack record
    const [attack] = await tx
      .insert(attacks)
      .values({
        gameId,
        attackerId,
        defenderId,
        targetPlanetId: targetPlanetId ?? null,
        turn,
        attackType,
        // Attacker forces
        attackerSoldiers: attackerForces.soldiers,
        attackerFighters: attackerForces.fighters,
        attackerLightCruisers: attackerForces.lightCruisers,
        attackerHeavyCruisers: attackerForces.heavyCruisers,
        attackerCarriers: attackerForces.carriers,
        attackerStations: attackerForces.stations,
        // Defender forces
        defenderSoldiers: defenderForces.soldiers,
        defenderFighters: defenderForces.fighters,
        defenderLightCruisers: defenderForces.lightCruisers,
        defenderHeavyCruisers: defenderForces.heavyCruisers,
        defenderCarriers: defenderForces.carriers,
        defenderStations: defenderForces.stations,
        // Power and outcome
        attackerPower: String(totalAttackerPower),
        defenderPower: String(totalDefenderPower),
        outcome: result.outcome,
        sectorCaptured: result.sectorsCaptured > 0,
        // Casualties as JSON
        attackerCasualties: result.attackerTotalCasualties,
        defenderCasualties: result.defenderTotalCasualties,
        // Effectiveness changes
        attackerEffectivenessChange: String(result.attackerEffectivenessChange),
        defenderEffectivenessChange: String(result.defenderEffectivenessChange),
      })
      .returning();

    if (!attack) {
      throw new Error("Failed to save attack");
    }

    // Save combat logs for each phase within the same transaction
    if (result.phases.length > 0) {
      await saveCombatLogsInTransaction(tx, attack.id, gameId, result.phases);
    }

    return attack;
  });
}

// Database combat phase enum values
type DbCombatPhase = "space" | "orbital" | "ground";

/**
 * Map CombatPhase to database-compatible phase.
 * Guerilla and pirate_defense are stored as "ground" for DB compatibility.
 */
function toDbPhase(phase: string): DbCombatPhase {
  if (phase === "space" || phase === "orbital" || phase === "ground") {
    return phase;
  }
  // Map guerilla and pirate_defense to ground for DB storage
  return "ground";
}

/**
 * Save phase-by-phase combat logs within a transaction.
 */
async function saveCombatLogsInTransaction(
  tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
  attackId: string,
  gameId: string,
  phases: PhaseResult[]
): Promise<void> {
  // Filter to only phases that can be stored in DB (skip guerilla/pirate_defense phases)
  const storablePhases = phases.filter(
    (p) => p.phase === "space" || p.phase === "orbital" || p.phase === "ground"
  );

  if (storablePhases.length === 0) return;

  const logValues = storablePhases.map((phase) => ({
    attackId,
    gameId,
    phase: toDbPhase(phase.phase),
    phaseNumber: phase.phaseNumber,
    attackerUnits: phase.attackerForcesStart,
    defenderUnits: phase.defenderForcesStart,
    attackerPhasePower: String(phase.attackerPower),
    defenderPhasePower: String(phase.defenderPower),
    phaseWinner: phase.winner,
    phaseCasualties: {
      attacker: phase.attackerCasualties,
      defender: phase.defenderCasualties,
    },
    description: phase.description,
  }));

  await tx.insert(combatLogs).values(logValues);
}

// =============================================================================
// APPLY COMBAT RESULTS (WITH TRANSACTIONS)
// =============================================================================

/**
 * Apply combat results to both empires atomically.
 * Uses a transaction to prevent race conditions.
 * Updates unit counts, effectiveness, and handles sector captures.
 */
export async function applyCombatResults(
  attackerId: string,
  defenderId: string,
  result: CombatResult
): Promise<void> {
  // Input validation
  if (!isValidUUID(attackerId) || !isValidUUID(defenderId)) {
    throw new Error("Invalid empire ID format");
  }

  await db.transaction(async (tx) => {
    // Fetch fresh empire states within transaction to prevent TOCTOU
    const [attacker, defender] = await Promise.all([
      tx.query.empires.findFirst({ where: eq(empires.id, attackerId) }),
      tx.query.empires.findFirst({ where: eq(empires.id, defenderId) }),
    ]);

    if (!attacker || !defender) {
      throw new Error("Empires not found");
    }

    const attackerCasualties = result.attackerTotalCasualties;
    const defenderCasualties = result.defenderTotalCasualties;

    // Update attacker - use Math.max to prevent negative values
    await tx
      .update(empires)
      .set({
        soldiers: Math.max(0, attacker.soldiers - attackerCasualties.soldiers),
        fighters: Math.max(0, attacker.fighters - attackerCasualties.fighters),
        stations: Math.max(0, attacker.stations - attackerCasualties.stations),
        lightCruisers: Math.max(0, attacker.lightCruisers - attackerCasualties.lightCruisers),
        heavyCruisers: Math.max(0, attacker.heavyCruisers - attackerCasualties.heavyCruisers),
        carriers: Math.max(0, attacker.carriers - attackerCasualties.carriers),
        armyEffectiveness: String(
          Math.max(0, Math.min(100, Number(attacker.armyEffectiveness) + result.attackerEffectivenessChange))
        ),
        updatedAt: new Date(),
      })
      .where(eq(empires.id, attackerId));

    // Update defender
    await tx
      .update(empires)
      .set({
        soldiers: Math.max(0, defender.soldiers - defenderCasualties.soldiers),
        fighters: Math.max(0, defender.fighters - defenderCasualties.fighters),
        stations: Math.max(0, defender.stations - defenderCasualties.stations),
        lightCruisers: Math.max(0, defender.lightCruisers - defenderCasualties.lightCruisers),
        heavyCruisers: Math.max(0, defender.heavyCruisers - defenderCasualties.heavyCruisers),
        carriers: Math.max(0, defender.carriers - defenderCasualties.carriers),
        armyEffectiveness: String(
          Math.max(0, Math.min(100, Number(defender.armyEffectiveness) + result.defenderEffectivenessChange))
        ),
        updatedAt: new Date(),
      })
      .where(eq(empires.id, defenderId));

    // Handle sector captures if applicable - within same transaction
    if (result.sectorsCaptured > 0) {
      await transferPlanetsInTransaction(tx, defenderId, attackerId, result.sectorsCaptured);
    }
  });
}

/**
 * Transfer sectors from defender to attacker within a transaction.
 * Prevents race conditions by operating within the transaction context.
 */
async function transferPlanetsInTransaction(
  tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
  fromEmpireId: string,
  toEmpireId: string,
  count: number
): Promise<void> {
  // Validate count
  if (count <= 0 || !Number.isInteger(count)) {
    return;
  }

  // Get defender's sectors within transaction
  const defenderPlanets = await tx.query.sectors.findMany({
    where: eq(sectors.empireId, fromEmpireId),
  });

  if (defenderPlanets.length === 0) return;

  // Don't transfer all sectors - leave at least 1 (prevents elimination via combat alone)
  const transferCount = Math.min(count, defenderPlanets.length - 1);
  if (transferCount <= 0) return;

  // Select random sectors to transfer (use crypto for better randomness if available)
  const shuffled = [...defenderPlanets].sort(() => Math.random() - 0.5);
  const planetsToTransfer = shuffled.slice(0, transferCount);
  const planetIds = planetsToTransfer.map(p => p.id);

  // Batch update sector ownership for efficiency
  if (planetIds.length > 0) {
    await tx
      .update(sectors)
      .set({ empireId: toEmpireId })
      .where(sql`${sectors.id} IN (${sql.join(planetIds.map(id => sql`${id}`), sql`, `)})`);
  }

  // Update sector counts atomically within transaction
  // Fetch fresh counts to avoid race conditions
  const [fromEmpire, toEmpire] = await Promise.all([
    tx.query.empires.findFirst({ where: eq(empires.id, fromEmpireId) }),
    tx.query.empires.findFirst({ where: eq(empires.id, toEmpireId) }),
  ]);

  if (fromEmpire && toEmpire) {
    await Promise.all([
      tx
        .update(empires)
        .set({ sectorCount: Math.max(0, fromEmpire.sectorCount - transferCount) })
        .where(eq(empires.id, fromEmpireId)),
      tx
        .update(empires)
        .set({ sectorCount: toEmpire.sectorCount + transferCount })
        .where(eq(empires.id, toEmpireId)),
    ]);
  }
}

// =============================================================================
// QUERY OPERATIONS (READ-ONLY, NO TRANSACTION NEEDED)
// =============================================================================

/**
 * Get attack history for an empire (as attacker or defender).
 */
export async function getAttackHistory(
  empireId: string,
  limit = 20
): Promise<Attack[]> {
  // Input validation
  if (!isValidUUID(empireId)) {
    throw new Error("Invalid empire ID format");
  }
  // Clamp limit to reasonable range
  const safeLimit = Math.min(Math.max(1, limit), 100);

  return db.query.attacks.findMany({
    where: or(
      eq(attacks.attackerId, empireId),
      eq(attacks.defenderId, empireId)
    ),
    orderBy: [desc(attacks.createdAt)],
    limit: safeLimit,
  });
}

/**
 * Get a specific attack with its combat logs.
 */
export async function getAttackWithLogs(
  attackId: string
): Promise<AttackWithLogs | null> {
  // Input validation
  if (!isValidUUID(attackId)) {
    throw new Error("Invalid attack ID format");
  }

  const attack = await db.query.attacks.findFirst({
    where: eq(attacks.id, attackId),
  });

  if (!attack) return null;

  const logs = await db.query.combatLogs.findMany({
    where: eq(combatLogs.attackId, attackId),
    orderBy: [combatLogs.phaseNumber],
  });

  const [attacker, defender] = await Promise.all([
    db.query.empires.findFirst({ where: eq(empires.id, attack.attackerId) }),
    db.query.empires.findFirst({ where: eq(empires.id, attack.defenderId) }),
  ]);

  return {
    ...attack,
    logs,
    attacker: attacker ?? undefined,
    defender: defender ?? undefined,
  };
}

/**
 * Get available target empires for attack.
 * Returns empires in the same game that are not the player.
 */
export async function getAvailableTargets(
  gameId: string,
  excludeEmpireId: string
): Promise<Empire[]> {
  // Input validation
  if (!isValidUUID(gameId) || !isValidUUID(excludeEmpireId)) {
    throw new Error("Invalid ID format");
  }

  return db.query.empires.findMany({
    where: and(
      eq(empires.gameId, gameId),
      eq(empires.isEliminated, false)
    ),
  }).then(results => results.filter(e => e.id !== excludeEmpireId));
}

/**
 * Get empire military forces.
 */
export async function getEmpireForces(empireId: string): Promise<Forces | null> {
  // Input validation
  if (!isValidUUID(empireId)) {
    throw new Error("Invalid empire ID format");
  }

  const empire = await db.query.empires.findFirst({
    where: eq(empires.id, empireId),
  });

  if (!empire) return null;

  return {
    soldiers: empire.soldiers,
    fighters: empire.fighters,
    stations: empire.stations,
    lightCruisers: empire.lightCruisers,
    heavyCruisers: empire.heavyCruisers,
    carriers: empire.carriers,
  };
}

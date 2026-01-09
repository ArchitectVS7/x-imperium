"use server";

/**
 * Nuclear Warfare Server Actions (M11)
 *
 * Server actions for nuclear weapon purchase and deployment.
 * Uses cookie-based session management for authentication.
 *
 * @see docs/PRD.md Section on Turn 100+ unlocks
 */

import { z } from "zod";
import { db } from "@/lib/db";
import { games, empires, resourceInventory, messages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  executeNuclearStrike,
  canLaunchNuclearStrike,
  getPostStrikeCivilStatus,
  generateNuclearNewsHeadline,
  generateGlobalBroadcast,
  NUCLEAR_CONSTANTS,
  areNuclearWeaponsUnlocked,
  getNuclearWeaponCost,
} from "@/lib/combat/nuclear";
import { getEmpireCoalition } from "@/lib/game/repositories/coalition-repository";
import { verifyEmpireOwnership } from "@/lib/security/validation";
import { getGameSession } from "@/lib/session";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const UUIDSchema = z.string().uuid("Invalid UUID format");

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if an empire has a nuclear weapon in inventory.
 */
async function hasNuclearWeapon(empireId: string): Promise<boolean> {
  const inventory = await db.query.resourceInventory.findFirst({
    where: and(
      eq(resourceInventory.empireId, empireId),
      eq(resourceInventory.resourceType, "nuclear_warheads")
    ),
  });

  return inventory !== undefined && inventory.quantity > 0;
}

/**
 * Add a nuclear weapon to empire inventory.
 */
async function addNuclearWeapon(empireId: string, gameId: string): Promise<void> {
  // Check if inventory entry exists
  const existing = await db.query.resourceInventory.findFirst({
    where: and(
      eq(resourceInventory.empireId, empireId),
      eq(resourceInventory.resourceType, "nuclear_warheads")
    ),
  });

  if (existing) {
    // Increment quantity
    await db
      .update(resourceInventory)
      .set({
        quantity: existing.quantity + 1,
        updatedAt: new Date(),
      })
      .where(eq(resourceInventory.id, existing.id));
  } else {
    // Create new inventory entry
    await db.insert(resourceInventory).values({
      empireId,
      gameId,
      resourceType: "nuclear_warheads",
      tier: "tier3",
      quantity: 1,
    });
  }
}

/**
 * Remove a nuclear weapon from empire inventory.
 */
async function removeNuclearWeapon(empireId: string): Promise<boolean> {
  const inventory = await db.query.resourceInventory.findFirst({
    where: and(
      eq(resourceInventory.empireId, empireId),
      eq(resourceInventory.resourceType, "nuclear_warheads")
    ),
  });

  if (!inventory || inventory.quantity <= 0) {
    return false;
  }

  await db
    .update(resourceInventory)
    .set({
      quantity: inventory.quantity - 1,
      updatedAt: new Date(),
    })
    .where(eq(resourceInventory.id, inventory.id));

  return true;
}

/**
 * Get the last turn an empire launched a nuclear weapon.
 * For now, we'll track this via messages or a simple approach.
 * A proper implementation would add a field to the empire table.
 */
async function getLastNukeLaunchTurn(
  empireId: string,
  gameId: string
): Promise<number | null> {
  // TODO: In production, add a lastNukeLaunchTurn field to empires table
  // This stub exists to support future cooldown tracking
  void empireId;
  void gameId;
  return null; // Allow launch for now (no cooldown tracking)
}

/**
 * Create a broadcast message for all empires.
 */
async function createGlobalBroadcast(
  gameId: string,
  senderId: string,
  content: string,
  turn: number
): Promise<void> {
  await db.insert(messages).values({
    gameId,
    senderId,
    recipientId: null, // Broadcast
    channel: "broadcast",
    trigger: "broadcast_shout",
    content,
    turn,
  });
}

// =============================================================================
// PURCHASE NUCLEAR WEAPON
// =============================================================================

/**
 * Purchase a nuclear weapon from the Syndicate Black Market.
 * Uses cookie-based session for authentication.
 */
export async function purchaseNuclearWeaponAction() {
  try {
    // Get session from cookies
    const { gameId, empireId } = await getGameSession();

    if (!gameId || !empireId) {
      return { success: false as const, error: "No active game session" };
    }

    // Verify empire ownership
    const ownership = await verifyEmpireOwnership(empireId, gameId);
    if (!ownership.valid) {
      return { success: false as const, error: ownership.error ?? "Authorization failed" };
    }

    // Get game and empire
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });

    if (!game) {
      return { success: false as const, error: "Game not found" };
    }

    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (!empire) {
      return { success: false as const, error: "Empire not found" };
    }

    // Check if nuclear weapons are unlocked
    if (!areNuclearWeaponsUnlocked(game.currentTurn)) {
      return {
        success: false as const,
        error: `Nuclear weapons unlock at turn ${NUCLEAR_CONSTANTS.UNLOCK_TURN}. Current turn: ${game.currentTurn}`,
      };
    }

    // Check if empire has enough credits
    const cost = getNuclearWeaponCost();
    if (empire.credits < cost) {
      return {
        success: false as const,
        error: `Insufficient credits. Need ${cost.toLocaleString()}, have ${empire.credits.toLocaleString()}`,
      };
    }

    // Deduct credits and add weapon
    await db.transaction(async (tx) => {
      await tx
        .update(empires)
        .set({
          credits: empire.credits - cost,
          updatedAt: new Date(),
        })
        .where(eq(empires.id, empireId));
    });

    await addNuclearWeapon(empireId, gameId);

    return {
      success: true as const,
      data: {
        message: "Nuclear weapon acquired from the Syndicate Black Market",
        cost,
        remainingCredits: empire.credits - cost,
      },
    };
  } catch (error) {
    console.error("Error purchasing nuclear weapon:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// LAUNCH NUCLEAR STRIKE
// =============================================================================

/**
 * Launch a nuclear strike against a target empire.
 * Uses cookie-based session for authentication.
 */
export async function launchNuclearStrikeAction(targetEmpireId: string) {
  try {
    // Validate target ID
    const targetParsed = UUIDSchema.safeParse(targetEmpireId);
    if (!targetParsed.success) {
      return { success: false as const, error: "Invalid target empire ID" };
    }

    // Get session from cookies
    const { gameId, empireId } = await getGameSession();

    if (!gameId || !empireId) {
      return { success: false as const, error: "No active game session" };
    }

    // Verify empire ownership
    const ownership = await verifyEmpireOwnership(empireId, gameId);
    if (!ownership.valid) {
      return { success: false as const, error: ownership.error ?? "Authorization failed" };
    }

    // Get game
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });

    if (!game) {
      return { success: false as const, error: "Game not found" };
    }

    // Get attacker
    const attacker = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (!attacker) {
      return { success: false as const, error: "Empire not found" };
    }

    // Get target
    const target = await db.query.empires.findFirst({
      where: eq(empires.id, targetEmpireId),
    });

    if (!target) {
      return { success: false as const, error: "Target empire not found" };
    }

    if (target.gameId !== gameId) {
      return { success: false as const, error: "Target not in this game" };
    }

    if (target.isEliminated) {
      return { success: false as const, error: "Cannot target eliminated empire" };
    }

    // Check if attacker has nuclear weapon
    const hasNuke = await hasNuclearWeapon(empireId);

    // Get last launch turn
    const lastNukeLaunchTurn = await getLastNukeLaunchTurn(
      empireId,
      gameId
    );

    // Validate launch
    const validation = canLaunchNuclearStrike({
      attacker: {
        id: attacker.id,
        credits: attacker.credits,
        civilStatus: attacker.civilStatus,
      },
      target: {
        id: target.id,
        population: target.population,
      },
      currentTurn: game.currentTurn,
      lastNukeLaunchTurn,
      hasNuclearWeapon: hasNuke,
    });

    if (!validation.allowed) {
      return { success: false as const, error: validation.reason };
    }

    // Execute the strike
    const result = executeNuclearStrike(
      { id: attacker.id },
      { id: target.id, population: target.population }
    );

    // Apply consequences in a transaction
    await db.transaction(async (tx) => {
      // Remove nuclear weapon from inventory
      await removeNuclearWeapon(empireId);

      // Apply population damage to target
      if (result.populationKilled > 0) {
        const newPopulation = Math.max(
          NUCLEAR_CONSTANTS.MIN_SURVIVING_POPULATION,
          target.population - result.populationKilled
        );

        await tx
          .update(empires)
          .set({
            population: newPopulation,
            updatedAt: new Date(),
          })
          .where(eq(empires.id, targetEmpireId));
      }

      // Apply civil status penalty to attacker
      const newCivilStatus = getPostStrikeCivilStatus(attacker.civilStatus);
      await tx
        .update(empires)
        .set({
          civilStatus: newCivilStatus as typeof attacker.civilStatus,
          reputation: Math.max(0, attacker.reputation + result.reputationLoss),
          updatedAt: new Date(),
        })
        .where(eq(empires.id, empireId));
    });

    // Create global broadcast if damage occurred
    if (result.globalOutrage) {
      const broadcast = generateGlobalBroadcast(attacker.name, target.name);
      await createGlobalBroadcast(
        gameId,
        empireId,
        broadcast,
        game.currentTurn
      );
    }

    // Generate news headline
    const headline = generateNuclearNewsHeadline(
      attacker.name,
      target.name,
      result.populationKilled,
      result.detected,
      result.detectionOutcome === "intercepted"
    );

    return {
      success: true as const,
      data: {
        result: {
          detected: result.detected,
          detectionOutcome: result.detectionOutcome,
          populationKilled: result.populationKilled,
          civilStatusDrop: result.civilStatusDrop,
          reputationLoss: result.reputationLoss,
          globalOutrage: result.globalOutrage,
        },
        description: result.description,
        headline,
      },
    };
  } catch (error) {
    console.error("Error launching nuclear strike:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// GET NUCLEAR STATUS
// =============================================================================

/**
 * Get nuclear warfare status for an empire.
 * Uses cookie-based session for authentication.
 */
export async function getNuclearStatusAction() {
  try {
    // Get session from cookies
    const { gameId, empireId } = await getGameSession();

    if (!gameId || !empireId) {
      return { success: false as const, error: "No active game session" };
    }

    // Get game
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });

    if (!game) {
      return { success: false as const, error: "Game not found" };
    }

    // Get empire
    const empire = await db.query.empires.findFirst({
      where: eq(empires.id, empireId),
    });

    if (!empire) {
      return { success: false as const, error: "Empire not found" };
    }

    // Check nuclear weapon inventory
    const hasNuke = await hasNuclearWeapon(empireId);
    const inventory = await db.query.resourceInventory.findFirst({
      where: and(
        eq(resourceInventory.empireId, empireId),
        eq(resourceInventory.resourceType, "nuclear_warheads")
      ),
    });

    // Get last launch turn
    const lastNukeLaunchTurn = await getLastNukeLaunchTurn(
      empireId,
      gameId
    );

    const isUnlocked = areNuclearWeaponsUnlocked(game.currentTurn);
    const cost = getNuclearWeaponCost();
    const canAfford = empire.credits >= cost;

    let cooldownRemaining: number | undefined;
    if (lastNukeLaunchTurn !== null) {
      const turnsSinceLaunch = game.currentTurn - lastNukeLaunchTurn;
      if (turnsSinceLaunch < NUCLEAR_CONSTANTS.COOLDOWN_TURNS) {
        cooldownRemaining = NUCLEAR_CONSTANTS.COOLDOWN_TURNS - turnsSinceLaunch;
      }
    }

    return {
      success: true as const,
      data: {
        currentTurn: game.currentTurn,
        unlockTurn: NUCLEAR_CONSTANTS.UNLOCK_TURN,
        isUnlocked,
        turnsUntilUnlock: isUnlocked ? 0 : NUCLEAR_CONSTANTS.UNLOCK_TURN - game.currentTurn,
        hasNuclearWeapon: hasNuke,
        nuclearWeaponCount: inventory?.quantity ?? 0,
        cost,
        canAfford,
        credits: empire.credits,
        lastNukeLaunchTurn,
        cooldownRemaining,
        cooldownTurns: NUCLEAR_CONSTANTS.COOLDOWN_TURNS,
        consequences: {
          populationDamage: `${NUCLEAR_CONSTANTS.POPULATION_DAMAGE * 100}%`,
          civilStatusPenalty: NUCLEAR_CONSTANTS.CIVIL_STATUS_PENALTY,
          reputationPenalty: NUCLEAR_CONSTANTS.REPUTATION_PENALTY,
          detectionChance: `${NUCLEAR_CONSTANTS.DETECTION_CHANCE * 100}%`,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching nuclear status:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// GET NUCLEAR TARGETS
// =============================================================================

/**
 * Get potential nuclear strike targets.
 * Uses cookie-based session for authentication.
 */
export async function getNuclearTargetsAction() {
  try {
    // Get session from cookies
    const { gameId, empireId } = await getGameSession();

    if (!gameId || !empireId) {
      return { success: false as const, error: "No active game session" };
    }

    // Get all non-eliminated empires except self
    const targets = await db.query.empires.findMany({
      where: and(
        eq(empires.gameId, gameId),
        eq(empires.isEliminated, false)
      ),
    });

    // Get attacker's coalition (if any)
    const attackerCoalition = await getEmpireCoalition(empireId);

    const targetList = targets
      .filter((e) => e.id !== empireId)
      .map((e) => ({
        id: e.id,
        name: e.name,
        population: e.population,
        networth: e.networth,
        estimatedCasualties: Math.floor(e.population * NUCLEAR_CONSTANTS.POPULATION_DAMAGE),
        isCoalitionMember: attackerCoalition
          ? false // Would need to check coalition membership
          : false,
      }));

    return {
      success: true as const,
      data: targetList,
    };
  } catch (error) {
    console.error("Error fetching nuclear targets:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

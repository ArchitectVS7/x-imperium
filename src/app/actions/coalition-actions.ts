"use server";

/**
 * Coalition Server Actions (M11)
 *
 * Server actions for coalition management.
 * Uses cookie-based session management for authentication.
 *
 * @see docs/PRD.md Section 8.2 (Coalitions)
 */

import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { games, empires } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { sanitizeText } from "@/lib/security/validation";
import {
  createCoalition,
  inviteToCoalition,
  acceptCoalitionInvite,
  leaveCoalition,
  getCoalitionPower,
  getMyCoalition,
  checkDiplomaticVictory,
  proposeCoordinatedAttack,
  areCoalitionsUnlocked,
  isCoalitionWarfareUnlocked,
  COALITION_UNLOCK_TURN,
  COALITION_WARFARE_UNLOCK_TURN,
} from "@/lib/game/services/diplomacy/coalition-service";
import {
  getCoalitionById,
  getCoalitionWithMembers,
  getGameCoalitions,
  isEmpireInCoalition,
} from "@/lib/game/repositories/coalition-repository";
import {
  COALITION_MAX_MEMBERS,
  COALITION_MIN_MEMBERS,
  COALITION_VICTORY_THRESHOLD,
} from "@/lib/constants/diplomacy";

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

const GAME_ID_COOKIE = "gameId";
const EMPIRE_ID_COOKIE = "empireId";

async function getGameCookies(): Promise<{
  gameId: string | undefined;
  empireId: string | undefined;
}> {
  try {
    const cookieStore = await cookies();
    return {
      gameId: cookieStore.get(GAME_ID_COOKIE)?.value,
      empireId: cookieStore.get(EMPIRE_ID_COOKIE)?.value,
    };
  } catch (error) {
    console.error("Failed to read cookies:", error);
    return { gameId: undefined, empireId: undefined };
  }
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const UUIDSchema = z.string().uuid("Invalid UUID format");

// =============================================================================
// GET COALITION STATUS
// =============================================================================

/**
 * Get the coalition the empire belongs to (if any).
 * Uses cookie-based session for authentication.
 */
export async function getMyCoalitionAction() {
  try {
    // Get session from cookies
    const { empireId } = await getGameCookies();

    if (!empireId) {
      return { success: false as const, error: "No active game session" };
    }

    const coalition = await getMyCoalition(empireId);

    if (!coalition) {
      return {
        success: true as const,
        data: null,
      };
    }

    const power = await getCoalitionPower(coalition.id);
    const victoryCheck = await checkDiplomaticVictory(coalition.id);

    return {
      success: true as const,
      data: {
        coalition: {
          id: coalition.id,
          name: coalition.name,
          status: coalition.status,
          leaderId: coalition.leaderId,
          memberCount: coalition.memberCount,
          totalNetworth: coalition.totalNetworth,
          territoryPercent: Number(coalition.territoryPercent),
          formedAtTurn: coalition.formedAtTurn,
        },
        members: coalition.members.map((m) => ({
          id: m.empire.id,
          name: m.empire.name,
          networth: m.empire.networth,
          sectorCount: m.empire.sectorCount,
          joinedAtTurn: m.joinedAtTurn,
          isLeader: m.empire.id === coalition.leaderId,
        })),
        power,
        victoryProgress: victoryCheck
          ? {
              territoryPercent: victoryCheck.territoryPercent,
              threshold: COALITION_VICTORY_THRESHOLD * 100,
              achieved: victoryCheck.achieved,
            }
          : null,
      },
    };
  } catch (error) {
    console.error("Error fetching coalition:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

/**
 * Get all coalitions in a game.
 * Uses cookie-based session for authentication.
 */
export async function getGameCoalitionsAction() {
  try {
    // Get session from cookies
    const { gameId } = await getGameCookies();

    if (!gameId) {
      return { success: false as const, error: "No active game session" };
    }

    const coalitions = await getGameCoalitions(gameId);

    // Get details for each coalition
    const coalitionDetails = await Promise.all(
      coalitions.map(async (c) => {
        const withMembers = await getCoalitionWithMembers(c.id);
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          memberCount: c.memberCount,
          totalNetworth: c.totalNetworth,
          territoryPercent: Number(c.territoryPercent),
          formedAtTurn: c.formedAtTurn,
          leaderName: withMembers?.members.find((m) => m.empire.id === c.leaderId)?.empire.name ?? "Unknown",
        };
      })
    );

    return { success: true as const, data: coalitionDetails };
  } catch (error) {
    console.error("Error fetching game coalitions:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

/**
 * Get potential coalition members (empires not in a coalition).
 * Uses cookie-based session for authentication.
 */
export async function getAvailableCoalitionMembersAction() {
  try {
    // Get session from cookies
    const { gameId, empireId } = await getGameCookies();

    if (!gameId || !empireId) {
      return { success: false as const, error: "No active game session" };
    }

    // Get all non-eliminated empires in the game
    const allEmpires = await db.query.empires.findMany({
      where: and(
        eq(empires.gameId, gameId),
        ne(empires.id, empireId),
        eq(empires.isEliminated, false)
      ),
    });

    // Filter out those already in coalitions
    const available = await Promise.all(
      allEmpires.map(async (e) => {
        const inCoalition = await isEmpireInCoalition(e.id);
        return inCoalition ? null : e;
      })
    );

    const filtered = available.filter((e) => e !== null);

    return {
      success: true as const,
      data: filtered.map((e) => ({
        id: e.id,
        name: e.name,
        networth: e.networth,
        sectorCount: e.sectorCount,
        reputation: e.reputation,
      })),
    };
  } catch (error) {
    console.error("Error fetching available members:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// CREATE COALITION
// =============================================================================

/**
 * Create a new coalition.
 * Uses cookie-based session for authentication.
 */
export async function createCoalitionAction(name: string) {
  try {
    // Get session from cookies
    const { gameId, empireId } = await getGameCookies();

    if (!gameId || !empireId) {
      return { success: false as const, error: "No active game session" };
    }

    // Sanitize and validate name
    const sanitizedName = sanitizeText(name, 200);
    const nameSchema = z.string().min(1, "Name required").max(200, "Name too long");
    const nameParsed = nameSchema.safeParse(sanitizedName);
    if (!nameParsed.success) {
      return { success: false as const, error: nameParsed.error.issues[0]?.message ?? "Invalid name" };
    }

    // Get current turn
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });

    if (!game) {
      return { success: false as const, error: "Game not found" };
    }

    // Check if coalitions are unlocked
    if (!areCoalitionsUnlocked(game.currentTurn)) {
      return {
        success: false as const,
        error: `Coalitions unlock at turn ${COALITION_UNLOCK_TURN}. Current turn: ${game.currentTurn}`,
      };
    }

    const result = await createCoalition(
      gameId,
      empireId,
      sanitizedName,
      game.currentTurn
    );

    if (!result.success) {
      return { success: false as const, error: result.error };
    }

    return {
      success: true as const,
      data: {
        coalitionId: result.coalition?.id,
        message: "Coalition created successfully. Invite members to activate it.",
      },
    };
  } catch (error) {
    console.error("Error creating coalition:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// INVITE MEMBER
// =============================================================================

/**
 * Invite an empire to join the coalition.
 * Uses cookie-based session for authentication.
 */
export async function inviteToCoalitionAction(
  coalitionId: string,
  inviteeEmpireId: string
) {
  try {
    // Validate coalition and invitee IDs
    const coalitionParsed = UUIDSchema.safeParse(coalitionId);
    const inviteeParsed = UUIDSchema.safeParse(inviteeEmpireId);
    if (!coalitionParsed.success || !inviteeParsed.success) {
      return { success: false as const, error: "Invalid ID format" };
    }

    // Get session from cookies (inviter is authenticated user)
    const { empireId } = await getGameCookies();

    if (!empireId) {
      return { success: false as const, error: "No active game session" };
    }

    // Get coalition to find game
    const coalition = await getCoalitionById(coalitionId);
    if (!coalition) {
      return { success: false as const, error: "Coalition not found" };
    }

    // Get current turn
    const game = await db.query.games.findFirst({
      where: eq(games.id, coalition.gameId),
    });

    if (!game) {
      return { success: false as const, error: "Game not found" };
    }

    const result = await inviteToCoalition(
      coalitionId,
      empireId,
      inviteeEmpireId,
      game.currentTurn
    );

    if (!result.success) {
      return { success: false as const, error: result.error };
    }

    return {
      success: true as const,
      data: { message: "Empire joined the coalition" },
    };
  } catch (error) {
    console.error("Error inviting to coalition:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// JOIN COALITION
// =============================================================================

/**
 * Join a coalition.
 * Uses cookie-based session for authentication.
 */
export async function joinCoalitionAction(coalitionId: string) {
  try {
    // Validate coalition ID
    const coalitionParsed = UUIDSchema.safeParse(coalitionId);
    if (!coalitionParsed.success) {
      return { success: false as const, error: "Invalid coalition ID" };
    }

    // Get session from cookies
    const { empireId } = await getGameCookies();

    if (!empireId) {
      return { success: false as const, error: "No active game session" };
    }

    // Get coalition to find game
    const coalition = await getCoalitionById(coalitionId);
    if (!coalition) {
      return { success: false as const, error: "Coalition not found" };
    }

    // Get current turn
    const game = await db.query.games.findFirst({
      where: eq(games.id, coalition.gameId),
    });

    if (!game) {
      return { success: false as const, error: "Game not found" };
    }

    const result = await acceptCoalitionInvite(
      coalitionId,
      empireId,
      game.currentTurn
    );

    if (!result.success) {
      return { success: false as const, error: result.error };
    }

    return {
      success: true as const,
      data: { message: "Successfully joined the coalition" },
    };
  } catch (error) {
    console.error("Error joining coalition:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// LEAVE COALITION
// =============================================================================

/**
 * Leave a coalition.
 * Uses cookie-based session for authentication.
 */
export async function leaveCoalitionAction(coalitionId: string) {
  try {
    // Validate coalition ID
    const coalitionParsed = UUIDSchema.safeParse(coalitionId);
    if (!coalitionParsed.success) {
      return { success: false as const, error: "Invalid coalition ID" };
    }

    // Get session from cookies
    const { empireId } = await getGameCookies();

    if (!empireId) {
      return { success: false as const, error: "No active game session" };
    }

    // Get coalition to find game
    const coalition = await getCoalitionById(coalitionId);
    if (!coalition) {
      return { success: false as const, error: "Coalition not found" };
    }

    // Get current turn
    const game = await db.query.games.findFirst({
      where: eq(games.id, coalition.gameId),
    });

    if (!game) {
      return { success: false as const, error: "Game not found" };
    }

    const result = await leaveCoalition(
      coalitionId,
      empireId,
      game.currentTurn
    );

    if (!result.success) {
      return { success: false as const, error: result.error };
    }

    return {
      success: true as const,
      data: { message: "Successfully left the coalition" },
    };
  } catch (error) {
    console.error("Error leaving coalition:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// COORDINATED ATTACK
// =============================================================================

/**
 * Propose a coordinated attack.
 * Uses cookie-based session for authentication.
 */
export async function proposeCoordinatedAttackAction(
  coalitionId: string,
  targetEmpireId: string,
  scheduledTurn: number
) {
  try {
    // Validate IDs and turn
    const coalitionParsed = UUIDSchema.safeParse(coalitionId);
    const targetParsed = UUIDSchema.safeParse(targetEmpireId);
    const turnSchema = z.number().int().positive();
    const turnParsed = turnSchema.safeParse(scheduledTurn);

    if (!coalitionParsed.success || !targetParsed.success || !turnParsed.success) {
      return { success: false as const, error: "Invalid input" };
    }

    // Get session from cookies (proposer is authenticated user)
    const { empireId } = await getGameCookies();

    if (!empireId) {
      return { success: false as const, error: "No active game session" };
    }

    // Get coalition to find game
    const coalition = await getCoalitionById(coalitionId);
    if (!coalition) {
      return { success: false as const, error: "Coalition not found" };
    }

    // Get current turn
    const game = await db.query.games.findFirst({
      where: eq(games.id, coalition.gameId),
    });

    if (!game) {
      return { success: false as const, error: "Game not found" };
    }

    // Check if coalition warfare is unlocked
    if (!isCoalitionWarfareUnlocked(game.currentTurn)) {
      return {
        success: false as const,
        error: `Coalition warfare unlocks at turn ${COALITION_WARFARE_UNLOCK_TURN}. Current turn: ${game.currentTurn}`,
      };
    }

    const result = await proposeCoordinatedAttack(
      coalitionId,
      empireId,
      targetEmpireId,
      scheduledTurn,
      game.currentTurn
    );

    if (!result.success) {
      return { success: false as const, error: result.error };
    }

    return {
      success: true as const,
      data: {
        message: "Coordinated attack proposed",
        scheduledTurn,
        bonus: "+10% combat power for all participants",
      },
    };
  } catch (error) {
    console.error("Error proposing coordinated attack:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// VICTORY CHECK
// =============================================================================

/**
 * Check if the coalition has achieved diplomatic victory.
 */
export async function checkDiplomaticVictoryAction(coalitionId: string) {
  try {
    const parsed = UUIDSchema.safeParse(coalitionId);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid ID" };
    }

    const victoryCheck = await checkDiplomaticVictory(parsed.data);

    if (!victoryCheck) {
      return { success: false as const, error: "Coalition not found or not active" };
    }

    return {
      success: true as const,
      data: victoryCheck,
    };
  } catch (error) {
    console.error("Error checking victory:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

// =============================================================================
// INFO
// =============================================================================

/**
 * Get coalition system info.
 * Uses cookie-based session for authentication.
 */
export async function getCoalitionSystemInfoAction() {
  try {
    // Get session from cookies
    const { gameId } = await getGameCookies();

    if (!gameId) {
      return { success: false as const, error: "No active game session" };
    }

    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
    });

    if (!game) {
      return { success: false as const, error: "Game not found" };
    }

    return {
      success: true as const,
      data: {
        currentTurn: game.currentTurn,
        coalitionsUnlocked: areCoalitionsUnlocked(game.currentTurn),
        coalitionUnlockTurn: COALITION_UNLOCK_TURN,
        coalitionWarfareUnlocked: isCoalitionWarfareUnlocked(game.currentTurn),
        coalitionWarfareUnlockTurn: COALITION_WARFARE_UNLOCK_TURN,
        maxMembers: COALITION_MAX_MEMBERS,
        minMembers: COALITION_MIN_MEMBERS,
        victoryThreshold: COALITION_VICTORY_THRESHOLD * 100,
      },
    };
  } catch (error) {
    console.error("Error fetching coalition info:", error);
    return { success: false as const, error: "An error occurred" };
  }
}

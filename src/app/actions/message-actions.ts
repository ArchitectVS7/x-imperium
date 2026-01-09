"use server";

/**
 * Message Server Actions (M8)
 *
 * Server actions for the bot messaging system.
 * All inputs are validated with Zod schemas per reviewer checklist.
 *
 * @see docs/MILESTONES.md Milestone 8
 */

import { z } from "zod";
import {
  getPlayerInbox,
  getInboxSummary,
  getGalacticNews,
  markMessageRead,
  markAllMessagesRead,
  triggerGreetings,
  triggerCasualMessages,
  triggerRandomBroadcast,
  triggerEndgame,
  type StoredMessage,
  type InboxSummary,
  type GalacticNewsItem,
  type TriggerContext,
} from "@/lib/messages";
import { db } from "@/lib/db";
import { empires, games, messages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyEmpireOwnership } from "@/lib/security/validation";
import { getGameSession } from "@/lib/session";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const UUIDSchema = z.string().uuid("Invalid UUID format");

const InboxRequestSchema = z.object({
  gameId: UUIDSchema,
  playerId: UUIDSchema,
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
  unreadOnly: z.boolean().optional(),
});

const GalacticNewsRequestSchema = z.object({
  gameId: UUIDSchema,
  limit: z.number().int().min(1).max(50).optional(),
  offset: z.number().int().min(0).optional(),
});

const MarkReadSchema = z.object({
  messageId: UUIDSchema,
});

const MarkAllReadSchema = z.object({
  gameId: UUIDSchema,
  playerId: UUIDSchema,
});

const TriggerMessagesSchema = z.object({
  gameId: UUIDSchema,
  playerId: UUIDSchema,
});

// =============================================================================
// TYPES
// =============================================================================

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// =============================================================================
// GET INBOX
// =============================================================================

/**
 * Get the player's inbox messages
 */
export async function getInboxAction(
  gameId: string,
  playerId: string,
  options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }
): Promise<ActionResult<StoredMessage[]>> {
  try {
    const parsed = InboxRequestSchema.safeParse({
      gameId,
      playerId,
      ...options,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid input",
      };
    }

    // SECURITY: Verify the requesting user owns this empire
    const ownership = await verifyEmpireOwnership(parsed.data.playerId, parsed.data.gameId);
    if (!ownership.valid) {
      return {
        success: false,
        error: ownership.error ?? "Authorization failed",
      };
    }

    const messages = await getPlayerInbox(
      parsed.data.gameId,
      parsed.data.playerId,
      {
        limit: parsed.data.limit,
        offset: parsed.data.offset,
        unreadOnly: parsed.data.unreadOnly,
      }
    );

    return { success: true, data: messages };
  } catch (error) {
    console.error("getInboxAction error:", error);
    return { success: false, error: "Failed to fetch inbox" };
  }
}

// =============================================================================
// GET INBOX SUMMARY
// =============================================================================

/**
 * Get inbox summary with message counts
 */
export async function getInboxSummaryAction(
  gameId: string,
  playerId: string
): Promise<ActionResult<InboxSummary>> {
  try {
    const parsed = MarkAllReadSchema.safeParse({ gameId, playerId });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid input",
      };
    }

    // SECURITY: Verify the requesting user owns this empire
    const ownership = await verifyEmpireOwnership(parsed.data.playerId, parsed.data.gameId);
    if (!ownership.valid) {
      return {
        success: false,
        error: ownership.error ?? "Authorization failed",
      };
    }

    const summary = await getInboxSummary(
      parsed.data.gameId,
      parsed.data.playerId
    );

    return { success: true, data: summary };
  } catch (error) {
    console.error("getInboxSummaryAction error:", error);
    return { success: false, error: "Failed to fetch inbox summary" };
  }
}

// =============================================================================
// GET GALACTIC NEWS
// =============================================================================

/**
 * Get the Galactic News feed (broadcasts)
 */
export async function getGalacticNewsAction(
  gameId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<ActionResult<GalacticNewsItem[]>> {
  try {
    const parsed = GalacticNewsRequestSchema.safeParse({
      gameId,
      ...options,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid input",
      };
    }

    const news = await getGalacticNews(parsed.data.gameId, {
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return { success: true, data: news };
  } catch (error) {
    console.error("getGalacticNewsAction error:", error);
    return { success: false, error: "Failed to fetch galactic news" };
  }
}

// =============================================================================
// MARK MESSAGE READ
// =============================================================================

/**
 * Mark a single message as read
 */
export async function markMessageReadAction(
  messageId: string
): Promise<ActionResult<boolean>> {
  try {
    const parsed = MarkReadSchema.safeParse({ messageId });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid input",
      };
    }

    // SECURITY: Get current session and verify message ownership
    const { gameId, empireId } = await getGameSession();
    if (!gameId || !empireId) {
      return { success: false, error: "No active game session" };
    }

    // Verify message exists and belongs to this empire
    const message = await db.query.messages.findFirst({
      where: eq(messages.id, parsed.data.messageId),
      columns: { recipientId: true },
    });

    if (!message) {
      return { success: false, error: "Message not found" };
    }

    // Only the recipient can mark a message as read
    if (message.recipientId !== empireId) {
      return { success: false, error: "Unauthorized - not your message" };
    }

    const result = await markMessageRead(parsed.data.messageId);

    return { success: true, data: result };
  } catch (error) {
    console.error("markMessageReadAction error:", error);
    return { success: false, error: "Failed to mark message as read" };
  }
}

/**
 * Mark all messages as read
 */
export async function markAllMessagesReadAction(
  gameId: string,
  playerId: string
): Promise<ActionResult<number>> {
  try {
    const parsed = MarkAllReadSchema.safeParse({ gameId, playerId });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid input",
      };
    }

    // SECURITY: Verify the requesting user owns this empire
    const ownership = await verifyEmpireOwnership(parsed.data.playerId, parsed.data.gameId);
    if (!ownership.valid) {
      return {
        success: false,
        error: ownership.error ?? "Authorization failed",
      };
    }

    const count = await markAllMessagesRead(
      parsed.data.gameId,
      parsed.data.playerId
    );

    return { success: true, data: count };
  } catch (error) {
    console.error("markAllMessagesReadAction error:", error);
    return { success: false, error: "Failed to mark messages as read" };
  }
}

// =============================================================================
// TRIGGER MESSAGES
// =============================================================================

/**
 * Trigger greeting messages for a new game
 */
export async function triggerGreetingsAction(
  gameId: string,
  playerId: string
): Promise<ActionResult<number>> {
  try {
    const parsed = TriggerMessagesSchema.safeParse({ gameId, playerId });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid input",
      };
    }

    // SECURITY: Verify the requesting user owns this empire
    const ownership = await verifyEmpireOwnership(parsed.data.playerId, parsed.data.gameId);
    if (!ownership.valid) {
      return {
        success: false,
        error: ownership.error ?? "Authorization failed",
      };
    }

    // Get game and player info
    const game = await db.query.games.findFirst({
      where: eq(games.id, parsed.data.gameId),
    });

    const player = await db.query.empires.findFirst({
      where: and(
        eq(empires.id, parsed.data.playerId),
        eq(empires.type, "player")
      ),
    });

    if (!game || !player) {
      return { success: false, error: "Game or player not found" };
    }

    const ctx: TriggerContext = {
      gameId: parsed.data.gameId,
      currentTurn: game.currentTurn,
      playerId: parsed.data.playerId,
      playerEmpireName: player.name,
    };

    const count = await triggerGreetings(ctx);

    return { success: true, data: count };
  } catch (error) {
    console.error("triggerGreetingsAction error:", error);
    return { success: false, error: "Failed to trigger greetings" };
  }
}

/**
 * Trigger casual messages each turn
 */
export async function triggerCasualMessagesAction(
  gameId: string,
  playerId: string
): Promise<ActionResult<number>> {
  try {
    const parsed = TriggerMessagesSchema.safeParse({ gameId, playerId });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid input",
      };
    }

    const game = await db.query.games.findFirst({
      where: eq(games.id, parsed.data.gameId),
    });

    const player = await db.query.empires.findFirst({
      where: and(
        eq(empires.id, parsed.data.playerId),
        eq(empires.type, "player")
      ),
    });

    if (!game || !player) {
      return { success: false, error: "Game or player not found" };
    }

    const ctx: TriggerContext = {
      gameId: parsed.data.gameId,
      currentTurn: game.currentTurn,
      playerId: parsed.data.playerId,
      playerEmpireName: player.name,
    };

    const count = await triggerCasualMessages(ctx);

    return { success: true, data: count };
  } catch (error) {
    console.error("triggerCasualMessagesAction error:", error);
    return { success: false, error: "Failed to trigger casual messages" };
  }
}

/**
 * Trigger a random broadcast message
 */
export async function triggerRandomBroadcastAction(
  gameId: string,
  playerId: string
): Promise<ActionResult<boolean>> {
  try {
    const parsed = TriggerMessagesSchema.safeParse({ gameId, playerId });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid input",
      };
    }

    const game = await db.query.games.findFirst({
      where: eq(games.id, parsed.data.gameId),
    });

    const player = await db.query.empires.findFirst({
      where: and(
        eq(empires.id, parsed.data.playerId),
        eq(empires.type, "player")
      ),
    });

    if (!game || !player) {
      return { success: false, error: "Game or player not found" };
    }

    const ctx: TriggerContext = {
      gameId: parsed.data.gameId,
      currentTurn: game.currentTurn,
      playerId: parsed.data.playerId,
      playerEmpireName: player.name,
    };

    const sent = await triggerRandomBroadcast(ctx);

    return { success: true, data: sent };
  } catch (error) {
    console.error("triggerRandomBroadcastAction error:", error);
    return { success: false, error: "Failed to trigger broadcast" };
  }
}

/**
 * Trigger endgame messages
 */
export async function triggerEndgameMessagesAction(
  gameId: string,
  playerId: string
): Promise<ActionResult<number>> {
  try {
    const parsed = TriggerMessagesSchema.safeParse({ gameId, playerId });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid input",
      };
    }

    const game = await db.query.games.findFirst({
      where: eq(games.id, parsed.data.gameId),
    });

    const player = await db.query.empires.findFirst({
      where: and(
        eq(empires.id, parsed.data.playerId),
        eq(empires.type, "player")
      ),
    });

    if (!game || !player) {
      return { success: false, error: "Game or player not found" };
    }

    const ctx: TriggerContext = {
      gameId: parsed.data.gameId,
      currentTurn: game.currentTurn,
      playerId: parsed.data.playerId,
      playerEmpireName: player.name,
    };

    const count = await triggerEndgame(ctx);

    return { success: true, data: count };
  } catch (error) {
    console.error("triggerEndgameMessagesAction error:", error);
    return { success: false, error: "Failed to trigger endgame messages" };
  }
}

// =============================================================================
// COOKIE-BASED CONVENIENCE ACTIONS
// =============================================================================

/**
 * Get inbox using cookies for current game session
 */
export async function getInboxFromCookiesAction(
  options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }
): Promise<ActionResult<StoredMessage[]>> {
  const { gameId, empireId } = await getGameSession();
  if (!gameId || !empireId) {
    return { success: false, error: "No active game session" };
  }
  return getInboxAction(gameId, empireId, options);
}

/**
 * Get inbox summary using cookies
 */
export async function getInboxSummaryFromCookiesAction(): Promise<ActionResult<InboxSummary>> {
  const { gameId, empireId } = await getGameSession();
  if (!gameId || !empireId) {
    return { success: false, error: "No active game session" };
  }
  return getInboxSummaryAction(gameId, empireId);
}

/**
 * Get galactic news using cookies
 */
export async function getGalacticNewsFromCookiesAction(
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<ActionResult<GalacticNewsItem[]>> {
  const { gameId } = await getGameSession();
  if (!gameId) {
    return { success: false, error: "No active game session" };
  }
  return getGalacticNewsAction(gameId, options);
}

/**
 * Mark all messages read using cookies
 */
export async function markAllMessagesReadFromCookiesAction(): Promise<ActionResult<number>> {
  const { gameId, empireId } = await getGameSession();
  if (!gameId || !empireId) {
    return { success: false, error: "No active game session" };
  }
  return markAllMessagesReadAction(gameId, empireId);
}

/**
 * Get current game session info
 */
export async function getGameSessionAction(): Promise<ActionResult<{ gameId: string; empireId: string }>> {
  const { gameId, empireId } = await getGameSession();
  if (!gameId || !empireId) {
    return { success: false, error: "No active game session" };
  }
  return { success: true, data: { gameId, empireId } };
}

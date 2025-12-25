/**
 * Message Service (M8)
 *
 * Core service for managing bot-to-player and broadcast messages.
 * Handles message creation, storage, retrieval, and read status.
 *
 * @see docs/MILESTONES.md Milestone 8
 */

import { db } from "@/lib/db";
import { messages, empires } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type {
  MessageTrigger,
  MessageChannel,
  MessageContext,
  StoredMessage,
  InboxSummary,
  GalacticNewsItem,
  BotArchetype,
} from "./types";
import { generateMessage } from "./template-loader";

// =============================================================================
// MESSAGE CREATION
// =============================================================================

/**
 * Send a message from a bot to the player
 */
export async function sendBotMessage(params: {
  gameId: string;
  senderId: string;
  senderPersonaId: string;
  senderArchetype: BotArchetype;
  recipientId: string;
  trigger: MessageTrigger;
  context: MessageContext;
  turn: number;
}): Promise<StoredMessage | null> {
  const {
    gameId,
    senderId,
    senderPersonaId,
    senderArchetype,
    recipientId,
    trigger,
    context,
    turn,
  } = params;

  // Generate message from template
  const generated = await generateMessage(
    senderPersonaId,
    senderArchetype,
    trigger,
    context
  );

  // Insert into database
  const [inserted] = await db
    .insert(messages)
    .values({
      gameId,
      senderId,
      recipientId,
      channel: generated.channel,
      trigger,
      content: generated.content,
      templateId: generated.templateId,
      turn,
      isRead: false,
    })
    .returning();

  if (!inserted) return null;

  return {
    id: inserted.id,
    gameId: inserted.gameId,
    senderId: inserted.senderId,
    recipientId: inserted.recipientId,
    channel: inserted.channel as MessageChannel,
    trigger: inserted.trigger as MessageTrigger,
    content: inserted.content,
    templateId: inserted.templateId,
    isRead: inserted.isRead,
    turn: inserted.turn,
    createdAt: inserted.createdAt,
    readAt: inserted.readAt,
  };
}

/**
 * Send a broadcast message (Galactic News)
 */
export async function sendBroadcastMessage(params: {
  gameId: string;
  senderId: string;
  senderPersonaId: string;
  senderArchetype: BotArchetype;
  context: MessageContext;
  turn: number;
}): Promise<StoredMessage | null> {
  const { gameId, senderId, senderPersonaId, senderArchetype, context, turn } =
    params;

  // Generate broadcast message
  const generated = await generateMessage(
    senderPersonaId,
    senderArchetype,
    "broadcast_shout",
    context
  );

  // Insert as broadcast (no recipient)
  const [inserted] = await db
    .insert(messages)
    .values({
      gameId,
      senderId,
      recipientId: null,
      channel: "broadcast",
      trigger: "broadcast_shout",
      content: generated.content,
      templateId: generated.templateId,
      turn,
      isRead: false,
    })
    .returning();

  if (!inserted) return null;

  return {
    id: inserted.id,
    gameId: inserted.gameId,
    senderId: inserted.senderId,
    recipientId: inserted.recipientId,
    channel: inserted.channel as MessageChannel,
    trigger: inserted.trigger as MessageTrigger,
    content: inserted.content,
    templateId: inserted.templateId,
    isRead: inserted.isRead,
    turn: inserted.turn,
    createdAt: inserted.createdAt,
    readAt: inserted.readAt,
  };
}

// =============================================================================
// MESSAGE RETRIEVAL
// =============================================================================

/**
 * Get the player's inbox messages
 */
export async function getPlayerInbox(
  gameId: string,
  playerId: string,
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  } = {}
): Promise<StoredMessage[]> {
  const { limit = 50, offset = 0, unreadOnly = false } = options;

  const conditions = [
    eq(messages.gameId, gameId),
    eq(messages.recipientId, playerId),
    eq(messages.channel, "direct"),
  ];

  if (unreadOnly) {
    conditions.push(eq(messages.isRead, false));
  }

  const results = await db
    .select({
      message: messages,
      sender: {
        name: empires.name,
        archetype: empires.botArchetype,
      },
    })
    .from(messages)
    .leftJoin(empires, eq(messages.senderId, empires.id))
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .offset(offset);

  return results.map((r) => ({
    id: r.message.id,
    gameId: r.message.gameId,
    senderId: r.message.senderId,
    senderName: r.sender?.name ?? "Unknown",
    senderArchetype: r.sender?.archetype as BotArchetype | undefined,
    recipientId: r.message.recipientId,
    channel: r.message.channel as MessageChannel,
    trigger: r.message.trigger as MessageTrigger,
    content: r.message.content,
    templateId: r.message.templateId,
    isRead: r.message.isRead,
    turn: r.message.turn,
    createdAt: r.message.createdAt,
    readAt: r.message.readAt,
  }));
}

/**
 * Get inbox summary (counts)
 */
export async function getInboxSummary(
  gameId: string,
  playerId: string
): Promise<InboxSummary> {
  // Get direct message counts
  const directResults = await db
    .select({
      total: sql<number>`count(*)::int`,
      unread: sql<number>`count(*) filter (where ${messages.isRead} = false)::int`,
    })
    .from(messages)
    .where(
      and(
        eq(messages.gameId, gameId),
        eq(messages.recipientId, playerId),
        eq(messages.channel, "direct")
      )
    );

  // Get broadcast count
  const broadcastResults = await db
    .select({
      total: sql<number>`count(*)::int`,
    })
    .from(messages)
    .where(and(eq(messages.gameId, gameId), eq(messages.channel, "broadcast")));

  const direct = directResults[0] ?? { total: 0, unread: 0 };
  const broadcast = broadcastResults[0] ?? { total: 0 };

  return {
    totalMessages: direct.total + broadcast.total,
    unreadCount: direct.unread,
    directMessages: direct.total,
    directUnread: direct.unread,
    broadcasts: broadcast.total,
  };
}

/**
 * Get Galactic News feed (broadcasts)
 */
export async function getGalacticNews(
  gameId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<GalacticNewsItem[]> {
  const { limit = 20, offset = 0 } = options;

  const results = await db
    .select({
      message: messages,
      sender: {
        name: empires.name,
        archetype: empires.botArchetype,
      },
    })
    .from(messages)
    .leftJoin(empires, eq(messages.senderId, empires.id))
    .where(and(eq(messages.gameId, gameId), eq(messages.channel, "broadcast")))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .offset(offset);

  return results.map((r) => ({
    id: r.message.id,
    senderName: r.sender?.name ?? "Unknown Empire",
    senderArchetype: r.sender?.archetype as BotArchetype | undefined,
    content: r.message.content,
    turn: r.message.turn,
    createdAt: r.message.createdAt,
  }));
}

// =============================================================================
// MESSAGE STATUS
// =============================================================================

/**
 * Mark a message as read
 */
export async function markMessageRead(messageId: string): Promise<boolean> {
  const [updated] = await db
    .update(messages)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(eq(messages.id, messageId))
    .returning();

  return !!updated;
}

/**
 * Mark all messages as read for a player
 */
export async function markAllMessagesRead(
  gameId: string,
  playerId: string
): Promise<number> {
  const result = await db
    .update(messages)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(messages.gameId, gameId),
        eq(messages.recipientId, playerId),
        eq(messages.isRead, false)
      )
    )
    .returning();

  return result.length;
}

// =============================================================================
// MESSAGE DELETION
// =============================================================================

/**
 * Delete old messages (cleanup)
 */
export async function deleteOldMessages(
  gameId: string,
  keepTurns: number
): Promise<number> {
  // Get current turn
  const game = await db.query.games.findFirst({
    where: eq(messages.gameId, gameId),
  });

  if (!game) return 0;

  const cutoffTurn = game.currentTurn - keepTurns;
  if (cutoffTurn <= 0) return 0;

  const result = await db
    .delete(messages)
    .where(
      and(
        eq(messages.gameId, gameId),
        sql`${messages.turn} < ${cutoffTurn}`
      )
    )
    .returning();

  return result.length;
}

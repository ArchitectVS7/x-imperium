/**
 * Message Trigger System (M8)
 *
 * Handles automatic message sending based on game events.
 * Integrates with combat, diplomacy, covert ops, and other systems.
 *
 * @see docs/MILESTONES.md Milestone 8
 */

import { db } from "@/lib/db";
import { empires, type Empire } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendBotMessage, sendBroadcastMessage } from "./message-service";
import { getPersona } from "./template-loader";
import type { MessageContext, BotArchetype } from "./types";

// =============================================================================
// TYPES
// =============================================================================

export interface TriggerContext {
  gameId: string;
  currentTurn: number;
  playerId: string;
  playerEmpireName: string;
}

export interface BotInfo {
  id: string;
  name: string;
  personaId: string;
  archetype: BotArchetype;
}

// =============================================================================
// BOT INFO HELPERS
// =============================================================================

/**
 * Get bot info from empire record.
 * The persona ID is derived from the emperor name (converted to snake_case).
 */
function getBotInfoFromEmpire(empire: Empire): BotInfo | null {
  if (empire.type !== "bot" || !empire.botArchetype || !empire.emperorName) {
    return null;
  }

  // Convert emperor name to persona ID (e.g., "Marshal Valorian" -> "marshal_valorian")
  const personaId = empire.emperorName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return {
    id: empire.id,
    name: empire.name,
    personaId,
    archetype: empire.botArchetype as BotArchetype,
  };
}

// =============================================================================
// GREETING TRIGGERS
// =============================================================================

/**
 * Send initial greeting when a new game starts.
 * Each bot sends a greeting to the player.
 */
export async function triggerGreetings(ctx: TriggerContext): Promise<number> {
  // Get all bots in the game
  const bots = await db.query.empires.findMany({
    where: and(
      eq(empires.gameId, ctx.gameId),
      eq(empires.type, "bot"),
      eq(empires.isEliminated, false)
    ),
  });

  let messagesSent = 0;

  for (const bot of bots) {
    const botInfo = getBotInfoFromEmpire(bot);
    if (!botInfo) continue;

    // Check if persona exists
    const persona = await getPersona(botInfo.personaId);
    if (!persona) continue;

    // Random chance to send greeting (based on tell rate)
    if (Math.random() > persona.tellRate) continue;

    const context: MessageContext = {
      empire_name: ctx.playerEmpireName,
      turn: ctx.currentTurn,
    };

    await sendBotMessage({
      gameId: ctx.gameId,
      senderId: botInfo.id,
      senderPersonaId: botInfo.personaId,
      senderArchetype: botInfo.archetype,
      recipientId: ctx.playerId,
      trigger: "greeting",
      context,
      turn: ctx.currentTurn,
    });

    messagesSent++;
  }

  return messagesSent;
}

// =============================================================================
// COMBAT TRIGGERS
// =============================================================================

/**
 * Trigger a battle taunt before attacking
 */
export async function triggerBattleTaunt(
  ctx: TriggerContext,
  attackerBot: BotInfo
): Promise<void> {
  const persona = await getPersona(attackerBot.personaId);
  if (!persona) return;

  // Check tell rate
  if (Math.random() > persona.tellRate) return;

  const context: MessageContext = {
    empire_name: ctx.playerEmpireName,
    turn: ctx.currentTurn,
  };

  await sendBotMessage({
    gameId: ctx.gameId,
    senderId: attackerBot.id,
    senderPersonaId: attackerBot.personaId,
    senderArchetype: attackerBot.archetype,
    recipientId: ctx.playerId,
    trigger: "battle_taunt",
    context,
    turn: ctx.currentTurn,
  });
}

/**
 * Trigger victory gloating after winning a battle
 */
export async function triggerVictoryGloat(
  ctx: TriggerContext,
  winnerBot: BotInfo
): Promise<void> {
  const persona = await getPersona(winnerBot.personaId);
  if (!persona) return;

  if (Math.random() > persona.tellRate) return;

  const context: MessageContext = {
    empire_name: ctx.playerEmpireName,
    turn: ctx.currentTurn,
  };

  await sendBotMessage({
    gameId: ctx.gameId,
    senderId: winnerBot.id,
    senderPersonaId: winnerBot.personaId,
    senderArchetype: winnerBot.archetype,
    recipientId: ctx.playerId,
    trigger: "victory_gloat",
    context,
    turn: ctx.currentTurn,
  });
}

/**
 * Trigger defeat message after losing a battle
 */
export async function triggerDefeat(
  ctx: TriggerContext,
  loserBot: BotInfo
): Promise<void> {
  const persona = await getPersona(loserBot.personaId);
  if (!persona) return;

  if (Math.random() > persona.tellRate) return;

  const context: MessageContext = {
    empire_name: ctx.playerEmpireName,
    turn: ctx.currentTurn,
  };

  await sendBotMessage({
    gameId: ctx.gameId,
    senderId: loserBot.id,
    senderPersonaId: loserBot.personaId,
    senderArchetype: loserBot.archetype,
    recipientId: ctx.playerId,
    trigger: "defeat",
    context,
    turn: ctx.currentTurn,
  });
}

/**
 * Trigger retreat message
 */
export async function triggerRetreat(
  ctx: TriggerContext,
  retreatingBot: BotInfo
): Promise<void> {
  const persona = await getPersona(retreatingBot.personaId);
  if (!persona) return;

  if (Math.random() > persona.tellRate) return;

  const context: MessageContext = {
    empire_name: ctx.playerEmpireName,
    turn: ctx.currentTurn,
  };

  await sendBotMessage({
    gameId: ctx.gameId,
    senderId: retreatingBot.id,
    senderPersonaId: retreatingBot.personaId,
    senderArchetype: retreatingBot.archetype,
    recipientId: ctx.playerId,
    trigger: "retreat",
    context,
    turn: ctx.currentTurn,
  });
}

// =============================================================================
// DIPLOMACY TRIGGERS
// =============================================================================

/**
 * Trigger alliance proposal message
 */
export async function triggerAllianceProposal(
  ctx: TriggerContext,
  proposerBot: BotInfo
): Promise<void> {
  const persona = await getPersona(proposerBot.personaId);
  if (!persona) return;

  const context: MessageContext = {
    empire_name: ctx.playerEmpireName,
    turn: ctx.currentTurn,
  };

  await sendBotMessage({
    gameId: ctx.gameId,
    senderId: proposerBot.id,
    senderPersonaId: proposerBot.personaId,
    senderArchetype: proposerBot.archetype,
    recipientId: ctx.playerId,
    trigger: "alliance_proposal",
    context,
    turn: ctx.currentTurn,
  });
}

/**
 * Trigger trade offer message
 */
export async function triggerTradeOffer(
  ctx: TriggerContext,
  offeringBot: BotInfo,
  tradeDetails?: { credits?: number; resources?: string }
): Promise<void> {
  const persona = await getPersona(offeringBot.personaId);
  if (!persona) return;

  const context: MessageContext = {
    empire_name: ctx.playerEmpireName,
    turn: ctx.currentTurn,
    ...tradeDetails,
  };

  await sendBotMessage({
    gameId: ctx.gameId,
    senderId: offeringBot.id,
    senderPersonaId: offeringBot.personaId,
    senderArchetype: offeringBot.archetype,
    recipientId: ctx.playerId,
    trigger: "trade_offer",
    context,
    turn: ctx.currentTurn,
  });
}

/**
 * Trigger betrayal message when breaking alliance/NAP
 */
export async function triggerBetrayal(
  ctx: TriggerContext,
  betrayerBot: BotInfo
): Promise<void> {
  const persona = await getPersona(betrayerBot.personaId);
  if (!persona) return;

  const context: MessageContext = {
    empire_name: ctx.playerEmpireName,
    turn: ctx.currentTurn,
  };

  await sendBotMessage({
    gameId: ctx.gameId,
    senderId: betrayerBot.id,
    senderPersonaId: betrayerBot.personaId,
    senderArchetype: betrayerBot.archetype,
    recipientId: ctx.playerId,
    trigger: "betrayal",
    context,
    turn: ctx.currentTurn,
  });
}

// =============================================================================
// COVERT TRIGGERS
// =============================================================================

/**
 * Trigger covert operation detected message
 */
export async function triggerCovertDetected(
  ctx: TriggerContext,
  detectorBot: BotInfo
): Promise<void> {
  const persona = await getPersona(detectorBot.personaId);
  if (!persona) return;

  const context: MessageContext = {
    empire_name: ctx.playerEmpireName,
    turn: ctx.currentTurn,
  };

  await sendBotMessage({
    gameId: ctx.gameId,
    senderId: detectorBot.id,
    senderPersonaId: detectorBot.personaId,
    senderArchetype: detectorBot.archetype,
    recipientId: ctx.playerId,
    trigger: "covert_detected",
    context,
    turn: ctx.currentTurn,
  });
}

// =============================================================================
// THREAT & DEMAND TRIGGERS
// =============================================================================

/**
 * Trigger tribute demand message
 */
export async function triggerTributeDemand(
  ctx: TriggerContext,
  demandingBot: BotInfo,
  amount?: number
): Promise<void> {
  const persona = await getPersona(demandingBot.personaId);
  if (!persona) return;

  const context: MessageContext = {
    empire_name: ctx.playerEmpireName,
    turn: ctx.currentTurn,
    credits: amount,
  };

  await sendBotMessage({
    gameId: ctx.gameId,
    senderId: demandingBot.id,
    senderPersonaId: demandingBot.personaId,
    senderArchetype: demandingBot.archetype,
    recipientId: ctx.playerId,
    trigger: "tribute_demand",
    context,
    turn: ctx.currentTurn,
  });
}

/**
 * Trigger threat warning message
 */
export async function triggerThreatWarning(
  ctx: TriggerContext,
  threateningBot: BotInfo
): Promise<void> {
  const persona = await getPersona(threateningBot.personaId);
  if (!persona) return;

  if (Math.random() > persona.tellRate) return;

  const context: MessageContext = {
    empire_name: ctx.playerEmpireName,
    turn: ctx.currentTurn,
  };

  await sendBotMessage({
    gameId: ctx.gameId,
    senderId: threateningBot.id,
    senderPersonaId: threateningBot.personaId,
    senderArchetype: threateningBot.archetype,
    recipientId: ctx.playerId,
    trigger: "threat_warning",
    context,
    turn: ctx.currentTurn,
  });
}

// =============================================================================
// GAME STATE TRIGGERS
// =============================================================================

/**
 * Trigger eliminated message when a bot is eliminated
 */
export async function triggerEliminated(
  ctx: TriggerContext,
  eliminatedBot: BotInfo
): Promise<void> {
  const persona = await getPersona(eliminatedBot.personaId);
  if (!persona) return;

  const context: MessageContext = {
    empire_name: ctx.playerEmpireName,
    turn: ctx.currentTurn,
  };

  await sendBotMessage({
    gameId: ctx.gameId,
    senderId: eliminatedBot.id,
    senderPersonaId: eliminatedBot.personaId,
    senderArchetype: eliminatedBot.archetype,
    recipientId: ctx.playerId,
    trigger: "eliminated",
    context,
    turn: ctx.currentTurn,
  });
}

/**
 * Trigger endgame messages at late game turns
 */
export async function triggerEndgame(ctx: TriggerContext): Promise<number> {
  // Get all bots in the game
  const bots = await db.query.empires.findMany({
    where: and(
      eq(empires.gameId, ctx.gameId),
      eq(empires.type, "bot"),
      eq(empires.isEliminated, false)
    ),
  });

  let messagesSent = 0;

  for (const bot of bots) {
    const botInfo = getBotInfoFromEmpire(bot);
    if (!botInfo) continue;

    const persona = await getPersona(botInfo.personaId);
    if (!persona) continue;

    // Lower chance for endgame messages
    if (Math.random() > persona.tellRate * 0.3) continue;

    const context: MessageContext = {
      empire_name: ctx.playerEmpireName,
      turn: ctx.currentTurn,
    };

    await sendBotMessage({
      gameId: ctx.gameId,
      senderId: botInfo.id,
      senderPersonaId: botInfo.personaId,
      senderArchetype: botInfo.archetype,
      recipientId: ctx.playerId,
      trigger: "endgame",
      context,
      turn: ctx.currentTurn,
    });

    messagesSent++;
  }

  return messagesSent;
}

// =============================================================================
// BROADCAST TRIGGERS
// =============================================================================

/**
 * Trigger random broadcast messages (Galactic News)
 */
export async function triggerRandomBroadcast(ctx: TriggerContext): Promise<boolean> {
  // Get a random bot
  const bots = await db.query.empires.findMany({
    where: and(
      eq(empires.gameId, ctx.gameId),
      eq(empires.type, "bot"),
      eq(empires.isEliminated, false)
    ),
  });

  if (bots.length === 0) return false;

  // Random bot selection
  const randomBot = bots[Math.floor(Math.random() * bots.length)];
  if (!randomBot) return false;
  const botInfo = getBotInfoFromEmpire(randomBot);
  if (!botInfo) return false;

  const persona = await getPersona(botInfo.personaId);
  if (!persona) return false;

  // Lower chance for broadcasts
  if (Math.random() > persona.tellRate * 0.2) return false;

  const context: MessageContext = {
    turn: ctx.currentTurn,
  };

  await sendBroadcastMessage({
    gameId: ctx.gameId,
    senderId: botInfo.id,
    senderPersonaId: botInfo.personaId,
    senderArchetype: botInfo.archetype,
    context,
    turn: ctx.currentTurn,
  });

  return true;
}

/**
 * Trigger casual messages between turns
 */
export async function triggerCasualMessages(ctx: TriggerContext): Promise<number> {
  // Get all bots
  const bots = await db.query.empires.findMany({
    where: and(
      eq(empires.gameId, ctx.gameId),
      eq(empires.type, "bot"),
      eq(empires.isEliminated, false)
    ),
  });

  let messagesSent = 0;

  for (const bot of bots) {
    const botInfo = getBotInfoFromEmpire(bot);
    if (!botInfo) continue;

    const persona = await getPersona(botInfo.personaId);
    if (!persona) continue;

    // Very low chance for casual messages
    if (Math.random() > persona.tellRate * 0.1) continue;

    const context: MessageContext = {
      empire_name: ctx.playerEmpireName,
      turn: ctx.currentTurn,
    };

    await sendBotMessage({
      gameId: ctx.gameId,
      senderId: botInfo.id,
      senderPersonaId: botInfo.personaId,
      senderArchetype: botInfo.archetype,
      recipientId: ctx.playerId,
      trigger: "casual_message",
      context,
      turn: ctx.currentTurn,
    });

    messagesSent++;
  }

  return messagesSent;
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export { getBotInfoFromEmpire };

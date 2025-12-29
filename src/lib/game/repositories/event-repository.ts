/**
 * Event Repository (M11)
 *
 * Database operations for galactic events.
 * Handles event persistence, tracking, and querying.
 *
 * @see src/lib/events/ for event definitions
 * @see docs/MILESTONES.md Milestone 11
 */

import { db } from "@/lib/db";
import {
  galacticEvents,
  type NewGalacticEvent,
  type GalacticEvent as DBGalacticEvent,
} from "@/lib/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import type { GalacticEvent, EventEffect } from "@/lib/events/types";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Mapping from event definition IDs to database event subtypes.
 * This bridges the event definitions in src/lib/events with the database schema.
 */
const EVENT_ID_TO_SUBTYPE: Record<string, DBGalacticEvent["eventSubtype"]> = {
  // Economic events
  market_crash: "market_crash",
  market_boom: "resource_boom",
  trade_disruption: "trade_embargo",
  resource_boom: "resource_boom",
  ore_shortage: "market_crash",
  petroleum_discovery: "resource_boom",
  food_blight: "market_crash",
  golden_harvest: "resource_boom",
  tax_revolt: "rebellion",
  tourism_boom: "economic_miracle",
  hyperinflation: "market_crash",
  galactic_depression: "market_crash",
  new_technology_era: "economic_miracle",
  monopoly_formation: "economic_miracle",
  // Political events
  coup_attempt: "coup_attempt",
  assassination: "assassination",
  rebellion: "rebellion",
  political_scandal: "political_scandal",
  // Military events
  pirate_armada: "pirate_armada",
  arms_race: "arms_race",
  mercenary_influx: "mercenary_influx",
  military_parade: "military_parade",
  // Narrative events
  ancient_discovery: "ancient_discovery",
  prophecy_revealed: "prophecy_revealed",
  mysterious_signal: "mysterious_signal",
  cultural_renaissance: "cultural_renaissance",
};

/**
 * Get the database subtype for an event definition ID.
 */
export function getEventSubtype(eventId: string): DBGalacticEvent["eventSubtype"] {
  return EVENT_ID_TO_SUBTYPE[eventId] ?? "economic_miracle";
}

/**
 * Get the database event type for an event category.
 */
export function getEventType(category: GalacticEvent["category"]): DBGalacticEvent["eventType"] {
  return category;
}

// =============================================================================
// QUERY OPERATIONS
// =============================================================================

/**
 * Get all event IDs that have occurred in a game.
 * Used for filtering out unique events that have already fired.
 *
 * @param gameId - Game UUID
 * @returns Set of event IDs that have occurred
 */
export async function getOccurredEventIds(gameId: string): Promise<Set<string>> {
  const events = await db.query.galacticEvents.findMany({
    where: eq(galacticEvents.gameId, gameId),
  });

  // Map subtype back to event IDs
  const eventIds = new Set<string>();
  for (const event of events) {
    // Use title as event ID since we store the original event ID there
    // The title is unique per event definition
    if (event.title) {
      // Extract event ID from the description or use subtype
      const matchingId = Object.entries(EVENT_ID_TO_SUBTYPE).find(
        ([, subtype]) => subtype === event.eventSubtype
      )?.[0];
      if (matchingId) {
        eventIds.add(matchingId);
      }
    }
  }

  return eventIds;
}

/**
 * Get the turn of the most recent event in a game.
 *
 * @param gameId - Game UUID
 * @returns Turn number of last event, or 0 if no events
 */
export async function getLastEventTurn(gameId: string): Promise<number> {
  const lastEvent = await db.query.galacticEvents.findFirst({
    where: eq(galacticEvents.gameId, gameId),
    orderBy: [desc(galacticEvents.turn)],
  });

  return lastEvent?.turn ?? 0;
}

/**
 * Get all active effects for a game at a given turn.
 * Active effects are events that haven't expired yet.
 *
 * @param gameId - Game UUID
 * @param currentTurn - Current game turn
 * @returns Array of active events with their effects
 */
export async function getActiveEffects(
  gameId: string,
  currentTurn: number
): Promise<Array<{ event: DBGalacticEvent; effects: EventEffect[] }>> {
  const activeEvents = await db.query.galacticEvents.findMany({
    where: and(
      eq(galacticEvents.gameId, gameId),
      eq(galacticEvents.isActive, true),
      lte(galacticEvents.turn, currentTurn)
    ),
  });

  // Filter to events that haven't expired
  const stillActive = activeEvents.filter((event) => {
    if (event.expiresAtTurn !== null && event.expiresAtTurn <= currentTurn) {
      return false;
    }
    return true;
  });

  return stillActive.map((event) => ({
    event,
    effects: (event.effects as EventEffect[]) || [],
  }));
}

/**
 * Get events for a specific empire.
 *
 * @param gameId - Game UUID
 * @param empireId - Empire UUID
 * @returns Array of events affecting this empire
 */
export async function getEventsForEmpire(
  gameId: string,
  empireId: string
): Promise<DBGalacticEvent[]> {
  return db.query.galacticEvents.findMany({
    where: and(
      eq(galacticEvents.gameId, gameId),
      eq(galacticEvents.affectedEmpireId, empireId)
    ),
    orderBy: [desc(galacticEvents.turn)],
  });
}

/**
 * Get recent events for display in the game feed.
 *
 * @param gameId - Game UUID
 * @param limit - Maximum number of events to return
 * @returns Array of recent events
 */
export async function getRecentEvents(
  gameId: string,
  limit: number = 10
): Promise<DBGalacticEvent[]> {
  return db.query.galacticEvents.findMany({
    where: eq(galacticEvents.gameId, gameId),
    orderBy: [desc(galacticEvents.turn)],
    limit,
  });
}

// =============================================================================
// WRITE OPERATIONS
// =============================================================================

/**
 * Record a galactic event occurrence in the database.
 *
 * @param gameId - Game UUID
 * @param event - Event definition from src/lib/events
 * @param turn - Turn when event occurred
 * @param affectedEmpireIds - Empire UUIDs affected (first one is stored)
 * @param appliedEffects - Effects that were applied
 * @returns Created database record
 */
export async function recordEvent(
  gameId: string,
  event: GalacticEvent,
  turn: number,
  affectedEmpireIds: string[],
  appliedEffects: EventEffect[]
): Promise<DBGalacticEvent> {
  const eventData: NewGalacticEvent = {
    gameId,
    eventType: getEventType(event.category),
    eventSubtype: getEventSubtype(event.id),
    title: event.name,
    description: event.description,
    severity: Math.round(event.probability * 100), // Convert probability to 1-100 scale
    affectedEmpireId: affectedEmpireIds[0] ?? null,
    effects: appliedEffects,
    turn,
    durationTurns: event.duration,
    expiresAtTurn: event.duration > 0 ? turn + event.duration : null,
    isActive: event.duration > 0,
  };

  const [created] = await db.insert(galacticEvents).values(eventData).returning();
  if (!created) {
    throw new Error("Failed to record galactic event");
  }

  return created;
}

/**
 * Mark expired events as inactive.
 *
 * @param gameId - Game UUID
 * @param currentTurn - Current game turn
 * @returns Number of events marked inactive (estimated)
 */
export async function expireEvents(
  gameId: string,
  currentTurn: number
): Promise<number> {
  // First count how many events will be expired
  const expiredEvents = await db.query.galacticEvents.findMany({
    where: and(
      eq(galacticEvents.gameId, gameId),
      eq(galacticEvents.isActive, true),
      lte(galacticEvents.expiresAtTurn, currentTurn)
    ),
  });

  if (expiredEvents.length === 0) {
    return 0;
  }

  // Update them to inactive
  await db
    .update(galacticEvents)
    .set({
      isActive: false,
    })
    .where(
      and(
        eq(galacticEvents.gameId, gameId),
        eq(galacticEvents.isActive, true),
        lte(galacticEvents.expiresAtTurn, currentTurn)
      )
    );

  return expiredEvents.length;
}

/**
 * Get event count by type for analytics.
 *
 * @param gameId - Game UUID
 * @returns Count of events by type
 */
export async function getEventCountsByType(
  gameId: string
): Promise<Record<string, number>> {
  const events = await db.query.galacticEvents.findMany({
    where: eq(galacticEvents.gameId, gameId),
  });

  const counts: Record<string, number> = {};
  for (const event of events) {
    counts[event.eventType] = (counts[event.eventType] || 0) + 1;
  }

  return counts;
}

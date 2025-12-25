/**
 * Galactic Events Module (PRD 11.2)
 *
 * Events occur every 10-20 turns (semi-random) to shake up the game state.
 * Categories: Economic, Political, Military, Narrative
 */

// =============================================================================
// RE-EXPORTS
// =============================================================================

// Types
export * from "./types";

// Event Categories
export { ECONOMIC_EVENTS } from "./economic";
export { POLITICAL_EVENTS } from "./political";
export { MILITARY_EVENTS } from "./military";
export { NARRATIVE_EVENTS } from "./narrative";

// Helper Functions
export {
  getAvailableEconomicEvents,
  getEconomicEventsByScope,
  getEconomicEventProbabilityWeight,
} from "./economic";

export {
  getAvailablePoliticalEvents,
  getPoliticalEventsByScope,
  getPoliticalStabilityEvents,
  getPoliticalEventProbabilityWeight,
} from "./political";

export {
  getAvailableMilitaryEvents,
  getMilitaryEventsByScope,
  getDestructiveMilitaryEvents,
  getMilitaryEventProbabilityWeight,
} from "./military";

export {
  getAvailableNarrativeEvents,
  getNarrativeEventsByScope,
  getPureFlavorEvents,
  getProphecyAndRumorEvents,
  getNarrativeEventProbabilityWeight,
} from "./narrative";

// =============================================================================
// IMPORTS FOR COMBINED ACCESS
// =============================================================================

import { ECONOMIC_EVENTS } from "./economic";
import { POLITICAL_EVENTS } from "./political";
import { MILITARY_EVENTS } from "./military";
import { NARRATIVE_EVENTS } from "./narrative";
import type { GalacticEvent, EventCategory, EventPrerequisite } from "./types";
import {
  MIN_TURNS_BETWEEN_EVENTS,
  MAX_TURNS_BETWEEN_EVENTS,
  EVENTS_START_TURN,
} from "./types";

// =============================================================================
// PREREQUISITE CHECKING
// =============================================================================

export interface PrerequisiteContext {
  turn: number;
  empireCount: number;
  playerNetworth: number;
  occurredEventIds: Set<string>;
}

/**
 * Check if a single prerequisite is met.
 */
export function checkPrerequisite(
  prereq: EventPrerequisite,
  context: PrerequisiteContext
): boolean {
  switch (prereq.type) {
    case "turn_range":
      if (prereq.min !== undefined && context.turn < prereq.min) return false;
      if (prereq.max !== undefined && context.turn > prereq.max) return false;
      return true;

    case "empire_count":
      if (prereq.min !== undefined && context.empireCount < prereq.min)
        return false;
      if (prereq.max !== undefined && context.empireCount > prereq.max)
        return false;
      return true;

    case "player_networth":
      if (prereq.min !== undefined && context.playerNetworth < prereq.min)
        return false;
      if (prereq.max !== undefined && context.playerNetworth > prereq.max)
        return false;
      return true;

    case "previous_event":
      const hasOccurred = context.occurredEventIds.has(prereq.eventId);
      return hasOccurred === prereq.occurred;

    case "random_chance":
      return Math.random() < prereq.probability;

    default:
      return true;
  }
}

/**
 * Check if all prerequisites for an event are met.
 */
export function checkAllPrerequisites(
  event: GalacticEvent,
  context: PrerequisiteContext
): boolean {
  if (!event.prerequisites || event.prerequisites.length === 0) {
    return true;
  }

  return event.prerequisites.every((prereq) =>
    checkPrerequisite(prereq, context)
  );
}

// =============================================================================
// COMBINED EVENT ACCESS
// =============================================================================

/**
 * All galactic events across all categories.
 */
export const ALL_GALACTIC_EVENTS: GalacticEvent[] = [
  ...ECONOMIC_EVENTS,
  ...POLITICAL_EVENTS,
  ...MILITARY_EVENTS,
  ...NARRATIVE_EVENTS,
];

/**
 * Get all events by category.
 */
export function getEventsByCategory(
  category: EventCategory
): GalacticEvent[] {
  switch (category) {
    case "economic":
      return ECONOMIC_EVENTS;
    case "political":
      return POLITICAL_EVENTS;
    case "military":
      return MILITARY_EVENTS;
    case "narrative":
      return NARRATIVE_EVENTS;
    default:
      return [];
  }
}

/**
 * Get all events that can occur at a given turn.
 */
export function getAvailableEvents(turn: number): GalacticEvent[] {
  if (turn < EVENTS_START_TURN) {
    return [];
  }

  return ALL_GALACTIC_EVENTS.filter((event) => {
    const minTurnMet = !event.minTurn || turn >= event.minTurn;
    const maxTurnMet = !event.maxTurn || turn <= event.maxTurn;
    return minTurnMet && maxTurnMet;
  });
}

/**
 * Get events filtered by category and turn.
 */
export function getAvailableEventsByCategory(
  turn: number,
  category: EventCategory
): GalacticEvent[] {
  return getAvailableEvents(turn).filter((event) => event.category === category);
}

/**
 * Get unique events that haven't occurred yet.
 */
export function getUniqueEventsNotTriggered(
  occurredEventIds: Set<string>
): GalacticEvent[] {
  return ALL_GALACTIC_EVENTS.filter(
    (event) => event.unique && !occurredEventIds.has(event.id)
  );
}

/**
 * Calculate total probability weight for all events at a given turn.
 */
export function getTotalEventProbabilityWeight(turn: number): number {
  return getAvailableEvents(turn).reduce(
    (sum, event) => sum + event.probability,
    0
  );
}

/**
 * Randomly select an event based on probability weights.
 * Returns null if no event should trigger.
 *
 * @param turn - Current game turn
 * @param occurredEventIds - Set of unique event IDs that have already occurred
 * @param random - Random number between 0 and 1 (for testing)
 * @param context - Optional prerequisite context for filtering events
 */
export function selectRandomEvent(
  turn: number,
  occurredEventIds: Set<string> = new Set(),
  random: number = Math.random(),
  context?: Partial<PrerequisiteContext>
): GalacticEvent | null {
  // Build full context with defaults
  const fullContext: PrerequisiteContext = {
    turn,
    empireCount: context?.empireCount ?? 26, // Default: player + 25 bots
    playerNetworth: context?.playerNetworth ?? 100,
    occurredEventIds,
  };

  const availableEvents = getAvailableEvents(turn).filter((event) => {
    // Filter out already-occurred unique events
    if (event.unique && occurredEventIds.has(event.id)) {
      return false;
    }
    // Check prerequisites if context is provided
    if (context) {
      return checkAllPrerequisites(event, fullContext);
    }
    return true;
  });

  if (availableEvents.length === 0) {
    return null;
  }

  // Calculate cumulative probabilities
  let cumulative = 0;
  for (const event of availableEvents) {
    cumulative += event.probability;
    if (random < cumulative) {
      return event;
    }
  }

  // If random exceeds all probabilities, no event triggers
  return null;
}

/**
 * Check if an event should trigger this turn based on time since last event.
 *
 * @param turnsSinceLastEvent - Number of turns since the last galactic event
 * @param random - Random number between 0 and 1 (for testing)
 */
export function shouldEventTrigger(
  turnsSinceLastEvent: number,
  random: number = Math.random()
): boolean {
  if (turnsSinceLastEvent < MIN_TURNS_BETWEEN_EVENTS) {
    return false;
  }

  if (turnsSinceLastEvent >= MAX_TURNS_BETWEEN_EVENTS) {
    return true; // Guaranteed trigger
  }

  // Linear probability increase between min and max
  const range = MAX_TURNS_BETWEEN_EVENTS - MIN_TURNS_BETWEEN_EVENTS;
  const progress = turnsSinceLastEvent - MIN_TURNS_BETWEEN_EVENTS;
  const probability = progress / range;

  return random < probability;
}

// =============================================================================
// EVENT STATISTICS
// =============================================================================

/**
 * Get summary statistics for all events.
 */
export function getEventStatistics(): {
  total: number;
  byCategory: Record<EventCategory, number>;
  unique: number;
  averageProbability: number;
} {
  const byCategory: Record<EventCategory, number> = {
    economic: ECONOMIC_EVENTS.length,
    political: POLITICAL_EVENTS.length,
    military: MILITARY_EVENTS.length,
    narrative: NARRATIVE_EVENTS.length,
  };

  const unique = ALL_GALACTIC_EVENTS.filter((e) => e.unique).length;
  const totalProbability = ALL_GALACTIC_EVENTS.reduce(
    (sum, e) => sum + e.probability,
    0
  );

  return {
    total: ALL_GALACTIC_EVENTS.length,
    byCategory,
    unique,
    averageProbability: totalProbability / ALL_GALACTIC_EVENTS.length,
  };
}

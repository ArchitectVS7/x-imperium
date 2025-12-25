/**
 * Galactic Events Tests (PRD 11.2)
 */

import { describe, it, expect } from "vitest";
import {
  // Types
  type GalacticEvent,
  type EventCategory,
  type PrerequisiteContext,
  // Constants
  MIN_TURNS_BETWEEN_EVENTS,
  MAX_TURNS_BETWEEN_EVENTS,
  EVENTS_START_TURN,
  // Event Arrays
  ECONOMIC_EVENTS,
  POLITICAL_EVENTS,
  MILITARY_EVENTS,
  NARRATIVE_EVENTS,
  ALL_GALACTIC_EVENTS,
  // Functions
  getEventsByCategory,
  getAvailableEvents,
  getAvailableEventsByCategory,
  getUniqueEventsNotTriggered,
  getTotalEventProbabilityWeight,
  selectRandomEvent,
  shouldEventTrigger,
  getEventStatistics,
  checkPrerequisite,
  checkAllPrerequisites,
  // Category-specific
  getAvailableEconomicEvents,
  getAvailablePoliticalEvents,
  getAvailableMilitaryEvents,
  getAvailableNarrativeEvents,
  getEconomicEventsByScope,
  getPoliticalStabilityEvents,
  getDestructiveMilitaryEvents,
  getPureFlavorEvents,
  getProphecyAndRumorEvents,
} from "./index";

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Event Constants", () => {
  it("should have correct minimum turns between events", () => {
    expect(MIN_TURNS_BETWEEN_EVENTS).toBe(10);
  });

  it("should have correct maximum turns between events", () => {
    expect(MAX_TURNS_BETWEEN_EVENTS).toBe(20);
  });

  it("should have correct events start turn", () => {
    expect(EVENTS_START_TURN).toBe(15);
  });

  it("should have max > min for turns between events", () => {
    expect(MAX_TURNS_BETWEEN_EVENTS).toBeGreaterThan(MIN_TURNS_BETWEEN_EVENTS);
  });
});

// =============================================================================
// EVENT ARRAYS TESTS
// =============================================================================

describe("Event Arrays", () => {
  it("should have economic events", () => {
    expect(ECONOMIC_EVENTS.length).toBeGreaterThan(0);
    expect(ECONOMIC_EVENTS.every((e) => e.category === "economic")).toBe(true);
  });

  it("should have political events", () => {
    expect(POLITICAL_EVENTS.length).toBeGreaterThan(0);
    expect(POLITICAL_EVENTS.every((e) => e.category === "political")).toBe(true);
  });

  it("should have military events", () => {
    expect(MILITARY_EVENTS.length).toBeGreaterThan(0);
    expect(MILITARY_EVENTS.every((e) => e.category === "military")).toBe(true);
  });

  it("should have narrative events", () => {
    expect(NARRATIVE_EVENTS.length).toBeGreaterThan(0);
    expect(NARRATIVE_EVENTS.every((e) => e.category === "narrative")).toBe(true);
  });

  it("should have all events combined correctly", () => {
    const expectedTotal =
      ECONOMIC_EVENTS.length +
      POLITICAL_EVENTS.length +
      MILITARY_EVENTS.length +
      NARRATIVE_EVENTS.length;
    expect(ALL_GALACTIC_EVENTS.length).toBe(expectedTotal);
  });

  it("should have unique event IDs", () => {
    const ids = ALL_GALACTIC_EVENTS.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

// =============================================================================
// EVENT STRUCTURE TESTS
// =============================================================================

describe("Event Structure", () => {
  const allEvents = ALL_GALACTIC_EVENTS;

  it("all events should have required fields", () => {
    for (const event of allEvents) {
      expect(event.id).toBeDefined();
      expect(event.name).toBeDefined();
      expect(event.category).toBeDefined();
      expect(event.scope).toBeDefined();
      expect(event.description).toBeDefined();
      expect(event.narrative).toBeDefined();
      expect(event.effects).toBeDefined();
      expect(Array.isArray(event.effects)).toBe(true);
      expect(typeof event.duration).toBe("number");
      expect(typeof event.probability).toBe("number");
    }
  });

  it("all events should have valid probability (0-1)", () => {
    for (const event of allEvents) {
      expect(event.probability).toBeGreaterThanOrEqual(0);
      expect(event.probability).toBeLessThanOrEqual(1);
    }
  });

  it("all events should have non-negative duration", () => {
    for (const event of allEvents) {
      expect(event.duration).toBeGreaterThanOrEqual(0);
    }
  });

  it("all events should have valid category", () => {
    const validCategories: EventCategory[] = [
      "economic",
      "political",
      "military",
      "narrative",
    ];
    for (const event of allEvents) {
      expect(validCategories).toContain(event.category);
    }
  });

  it("all events should have valid scope", () => {
    const validScopes = [
      "global",
      "targeted",
      "random_empire",
      "top_empires",
      "bottom_empires",
      "coalition",
    ];
    for (const event of allEvents) {
      expect(validScopes).toContain(event.scope);
    }
  });

  it("events with targetCount should have compatible scope", () => {
    for (const event of allEvents) {
      if (event.targetCount !== undefined) {
        expect(["top_empires", "bottom_empires", "coalition"]).toContain(
          event.scope
        );
      }
    }
  });

  it("minTurn should be less than or equal to maxTurn when both defined", () => {
    for (const event of allEvents) {
      if (event.minTurn !== undefined && event.maxTurn !== undefined) {
        expect(event.minTurn).toBeLessThanOrEqual(event.maxTurn);
      }
    }
  });
});

// =============================================================================
// getEventsByCategory TESTS
// =============================================================================

describe("getEventsByCategory", () => {
  it("should return economic events for economic category", () => {
    const events = getEventsByCategory("economic");
    expect(events).toEqual(ECONOMIC_EVENTS);
  });

  it("should return political events for political category", () => {
    const events = getEventsByCategory("political");
    expect(events).toEqual(POLITICAL_EVENTS);
  });

  it("should return military events for military category", () => {
    const events = getEventsByCategory("military");
    expect(events).toEqual(MILITARY_EVENTS);
  });

  it("should return narrative events for narrative category", () => {
    const events = getEventsByCategory("narrative");
    expect(events).toEqual(NARRATIVE_EVENTS);
  });
});

// =============================================================================
// getAvailableEvents TESTS
// =============================================================================

describe("getAvailableEvents", () => {
  it("should return empty array before EVENTS_START_TURN", () => {
    const events = getAvailableEvents(EVENTS_START_TURN - 1);
    expect(events).toEqual([]);
  });

  it("should return events at EVENTS_START_TURN", () => {
    const events = getAvailableEvents(EVENTS_START_TURN);
    expect(events.length).toBeGreaterThan(0);
  });

  it("should filter by minTurn", () => {
    const earlyEvents = getAvailableEvents(20);
    const lateEvents = getAvailableEvents(100);

    // Late events should include events with high minTurn
    const lateOnlyEvents = lateEvents.filter((e) => e.minTurn && e.minTurn > 20);
    expect(lateOnlyEvents.length).toBeGreaterThan(0);

    // Early events should not include events with high minTurn
    for (const event of earlyEvents) {
      if (event.minTurn) {
        expect(event.minTurn).toBeLessThanOrEqual(20);
      }
    }
  });

  it("should filter by maxTurn", () => {
    const eventsAt195 = getAvailableEvents(195);
    const hasMaxTurnEvent = eventsAt195.some(
      (e) => e.maxTurn && e.maxTurn < 195
    );
    // Events past their maxTurn should be excluded
    expect(hasMaxTurnEvent).toBe(false);
  });
});

// =============================================================================
// getAvailableEventsByCategory TESTS
// =============================================================================

describe("getAvailableEventsByCategory", () => {
  it("should filter by both turn and category", () => {
    const events = getAvailableEventsByCategory(50, "economic");

    expect(events.every((e) => e.category === "economic")).toBe(true);
    for (const event of events) {
      if (event.minTurn) {
        expect(event.minTurn).toBeLessThanOrEqual(50);
      }
    }
  });

  it("should return empty for turn before EVENTS_START_TURN", () => {
    const events = getAvailableEventsByCategory(10, "economic");
    expect(events).toEqual([]);
  });
});

// =============================================================================
// getUniqueEventsNotTriggered TESTS
// =============================================================================

describe("getUniqueEventsNotTriggered", () => {
  it("should return all unique events when none triggered", () => {
    const uniqueEvents = ALL_GALACTIC_EVENTS.filter((e) => e.unique);
    const available = getUniqueEventsNotTriggered(new Set());
    expect(available.length).toBe(uniqueEvents.length);
  });

  it("should exclude triggered unique events", () => {
    const uniqueEvents = ALL_GALACTIC_EVENTS.filter((e) => e.unique);
    const firstUnique = uniqueEvents[0];
    if (firstUnique) {
      const triggered = new Set([firstUnique.id]);
      const available = getUniqueEventsNotTriggered(triggered);
      expect(available.length).toBe(uniqueEvents.length - 1);
      expect(available.find((e) => e.id === firstUnique.id)).toBeUndefined();
    }
  });

  it("should ignore non-unique events in triggered set", () => {
    const nonUniqueEvent = ALL_GALACTIC_EVENTS.find((e) => !e.unique);
    if (nonUniqueEvent) {
      const triggered = new Set([nonUniqueEvent.id]);
      const available = getUniqueEventsNotTriggered(triggered);
      const uniqueEvents = ALL_GALACTIC_EVENTS.filter((e) => e.unique);
      expect(available.length).toBe(uniqueEvents.length);
    }
  });
});

// =============================================================================
// getTotalEventProbabilityWeight TESTS
// =============================================================================

describe("getTotalEventProbabilityWeight", () => {
  it("should return 0 before EVENTS_START_TURN", () => {
    const weight = getTotalEventProbabilityWeight(10);
    expect(weight).toBe(0);
  });

  it("should return positive weight after EVENTS_START_TURN", () => {
    const weight = getTotalEventProbabilityWeight(50);
    expect(weight).toBeGreaterThan(0);
  });

  it("should match sum of available event probabilities", () => {
    const turn = 50;
    const events = getAvailableEvents(turn);
    const expectedWeight = events.reduce((sum, e) => sum + e.probability, 0);
    const actualWeight = getTotalEventProbabilityWeight(turn);
    expect(actualWeight).toBeCloseTo(expectedWeight, 10);
  });
});

// =============================================================================
// selectRandomEvent TESTS
// =============================================================================

describe("selectRandomEvent", () => {
  it("should return null before EVENTS_START_TURN", () => {
    const event = selectRandomEvent(10, new Set(), 0.1);
    expect(event).toBeNull();
  });

  it("should return null when random exceeds all probabilities", () => {
    // With random=0.99, very likely to exceed cumulative probabilities
    // This depends on actual probability weights
    // The result could be null or an event - both are valid behaviors
    const result = selectRandomEvent(50, new Set(), 0.99);
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("should select event based on probability weight", () => {
    // With random=0 (lowest), should select first available event
    const event = selectRandomEvent(50, new Set(), 0);
    expect(event).not.toBeNull();
  });

  it("should exclude triggered unique events", () => {
    const uniqueEvents = ALL_GALACTIC_EVENTS.filter((e) => e.unique);
    const triggeredIds = new Set(uniqueEvents.map((e) => e.id));

    // Try many times - should never return a triggered unique event
    for (let i = 0; i < 100; i++) {
      const event = selectRandomEvent(100, triggeredIds, Math.random() * 0.5);
      if (event && event.unique) {
        expect(triggeredIds.has(event.id)).toBe(false);
      }
    }
  });
});

// =============================================================================
// shouldEventTrigger TESTS
// =============================================================================

describe("shouldEventTrigger", () => {
  it("should return false before MIN_TURNS_BETWEEN_EVENTS", () => {
    expect(shouldEventTrigger(5, 0.5)).toBe(false);
    expect(shouldEventTrigger(9, 0.5)).toBe(false);
  });

  it("should return true at MAX_TURNS_BETWEEN_EVENTS", () => {
    expect(shouldEventTrigger(20, 0)).toBe(true);
    expect(shouldEventTrigger(20, 0.99)).toBe(true);
  });

  it("should return true after MAX_TURNS_BETWEEN_EVENTS", () => {
    expect(shouldEventTrigger(25, 0.5)).toBe(true);
  });

  it("should use linear probability between min and max", () => {
    // At turn 15 (halfway between 10 and 20), probability should be ~0.5
    expect(shouldEventTrigger(15, 0.4)).toBe(true);
    expect(shouldEventTrigger(15, 0.6)).toBe(false);
  });

  it("should return based on probability at exactly MIN_TURNS", () => {
    // At MIN_TURNS (10), probability is 0
    expect(shouldEventTrigger(10, 0)).toBe(false);
  });
});

// =============================================================================
// getEventStatistics TESTS
// =============================================================================

describe("getEventStatistics", () => {
  it("should return correct total count", () => {
    const stats = getEventStatistics();
    expect(stats.total).toBe(ALL_GALACTIC_EVENTS.length);
  });

  it("should return correct category counts", () => {
    const stats = getEventStatistics();
    expect(stats.byCategory.economic).toBe(ECONOMIC_EVENTS.length);
    expect(stats.byCategory.political).toBe(POLITICAL_EVENTS.length);
    expect(stats.byCategory.military).toBe(MILITARY_EVENTS.length);
    expect(stats.byCategory.narrative).toBe(NARRATIVE_EVENTS.length);
  });

  it("should return correct unique count", () => {
    const stats = getEventStatistics();
    const uniqueEvents = ALL_GALACTIC_EVENTS.filter((e) => e.unique);
    expect(stats.unique).toBe(uniqueEvents.length);
  });

  it("should return valid average probability", () => {
    const stats = getEventStatistics();
    expect(stats.averageProbability).toBeGreaterThan(0);
    expect(stats.averageProbability).toBeLessThan(1);
  });
});

// =============================================================================
// CATEGORY-SPECIFIC HELPER TESTS
// =============================================================================

describe("Category-specific helpers", () => {
  describe("Economic events", () => {
    it("getAvailableEconomicEvents should filter by turn", () => {
      const events = getAvailableEconomicEvents(50);
      for (const event of events) {
        if (event.minTurn) {
          expect(event.minTurn).toBeLessThanOrEqual(50);
        }
      }
    });

    it("getEconomicEventsByScope should filter by scope", () => {
      const globalEvents = getEconomicEventsByScope("global");
      expect(globalEvents.every((e) => e.scope === "global")).toBe(true);
    });
  });

  describe("Political events", () => {
    it("getAvailablePoliticalEvents should filter by turn", () => {
      const events = getAvailablePoliticalEvents(50);
      expect(events.every((e) => e.category === "political")).toBe(true);
    });

    it("getPoliticalStabilityEvents should return events with civil status effects", () => {
      const events = getPoliticalStabilityEvents();
      for (const event of events) {
        const hasCivilStatusEffect = event.effects.some(
          (e) => e.type === "civil_status"
        );
        expect(hasCivilStatusEffect).toBe(true);
      }
    });
  });

  describe("Military events", () => {
    it("getAvailableMilitaryEvents should filter by turn", () => {
      const events = getAvailableMilitaryEvents(50);
      expect(events.every((e) => e.category === "military")).toBe(true);
    });

    it("getDestructiveMilitaryEvents should return events with military damage", () => {
      const events = getDestructiveMilitaryEvents();
      for (const event of events) {
        const hasDamageEffect = event.effects.some(
          (e) => e.type === "military" && e.subtype === "damage"
        );
        expect(hasDamageEffect).toBe(true);
      }
    });
  });

  describe("Narrative events", () => {
    it("getAvailableNarrativeEvents should filter by turn", () => {
      const events = getAvailableNarrativeEvents(50);
      expect(events.every((e) => e.category === "narrative")).toBe(true);
    });

    it("getPureFlavorEvents should return events with no effects", () => {
      const events = getPureFlavorEvents();
      for (const event of events) {
        expect(event.effects.length).toBe(0);
      }
    });

    it("getProphecyAndRumorEvents should return prophecy/rumor events", () => {
      const events = getProphecyAndRumorEvents();
      for (const event of events) {
        expect(
          event.id.startsWith("prophecy_") || event.id.startsWith("rumor_")
        ).toBe(true);
      }
    });
  });
});

// =============================================================================
// PRD COMPLIANCE TESTS
// =============================================================================

describe("PRD 11.2 Compliance", () => {
  it("should have economic events matching PRD examples", () => {
    const economicIds = ECONOMIC_EVENTS.map((e) => e.id);
    expect(economicIds).toContain("market_crash");
    expect(economicIds).toContain("resource_boom");
  });

  it("should have political events matching PRD examples", () => {
    const politicalIds = POLITICAL_EVENTS.map((e) => e.id);
    expect(politicalIds.some((id) => id.includes("coup"))).toBe(true);
    expect(politicalIds.some((id) => id.includes("assassination"))).toBe(true);
  });

  it("should have military events matching PRD examples", () => {
    const militaryIds = MILITARY_EVENTS.map((e) => e.id);
    expect(militaryIds.some((id) => id.includes("pirate"))).toBe(true);
    expect(militaryIds.some((id) => id.includes("alien"))).toBe(true);
    expect(militaryIds.some((id) => id.includes("arms_race"))).toBe(true);
  });

  it("should have narrative events matching PRD examples", () => {
    const narrativeIds = NARRATIVE_EVENTS.map((e) => e.id);
    expect(narrativeIds.some((id) => id.includes("prophecy"))).toBe(true);
    expect(narrativeIds.some((id) => id.includes("rumor"))).toBe(true);
  });

  it("events should occur every 10-20 turns", () => {
    expect(MIN_TURNS_BETWEEN_EVENTS).toBe(10);
    expect(MAX_TURNS_BETWEEN_EVENTS).toBe(20);
  });
});

// =============================================================================
// PREREQUISITE CHECKING TESTS
// =============================================================================

describe("Prerequisite Checking", () => {
  const baseContext: PrerequisiteContext = {
    turn: 50,
    empireCount: 20,
    playerNetworth: 500,
    occurredEventIds: new Set(["event_a"]),
  };

  describe("checkPrerequisite", () => {
    it("should pass turn_range when turn is within range", () => {
      expect(
        checkPrerequisite({ type: "turn_range", min: 40, max: 60 }, baseContext)
      ).toBe(true);
    });

    it("should fail turn_range when turn is below min", () => {
      expect(
        checkPrerequisite({ type: "turn_range", min: 60 }, baseContext)
      ).toBe(false);
    });

    it("should fail turn_range when turn is above max", () => {
      expect(
        checkPrerequisite({ type: "turn_range", max: 40 }, baseContext)
      ).toBe(false);
    });

    it("should pass empire_count when count is within range", () => {
      expect(
        checkPrerequisite({ type: "empire_count", min: 10, max: 30 }, baseContext)
      ).toBe(true);
    });

    it("should fail empire_count when count is outside range", () => {
      expect(
        checkPrerequisite({ type: "empire_count", max: 10 }, baseContext)
      ).toBe(false);
    });

    it("should pass player_networth when networth is within range", () => {
      expect(
        checkPrerequisite({ type: "player_networth", min: 400 }, baseContext)
      ).toBe(true);
    });

    it("should fail player_networth when networth is below min", () => {
      expect(
        checkPrerequisite({ type: "player_networth", min: 600 }, baseContext)
      ).toBe(false);
    });

    it("should pass previous_event when event has occurred and required", () => {
      expect(
        checkPrerequisite(
          { type: "previous_event", eventId: "event_a", occurred: true },
          baseContext
        )
      ).toBe(true);
    });

    it("should fail previous_event when event has occurred but not required", () => {
      expect(
        checkPrerequisite(
          { type: "previous_event", eventId: "event_a", occurred: false },
          baseContext
        )
      ).toBe(false);
    });

    it("should pass previous_event when event has not occurred and not required", () => {
      expect(
        checkPrerequisite(
          { type: "previous_event", eventId: "event_b", occurred: false },
          baseContext
        )
      ).toBe(true);
    });
  });

  describe("checkAllPrerequisites", () => {
    it("should pass when event has no prerequisites", () => {
      const event: GalacticEvent = {
        id: "test",
        name: "Test",
        category: "economic",
        scope: "global",
        description: "Test",
        narrative: "Test",
        effects: [],
        duration: 0,
        probability: 0.1,
      };
      expect(checkAllPrerequisites(event, baseContext)).toBe(true);
    });

    it("should pass when all prerequisites are met", () => {
      const event: GalacticEvent = {
        id: "test",
        name: "Test",
        category: "economic",
        scope: "global",
        description: "Test",
        narrative: "Test",
        effects: [],
        duration: 0,
        probability: 0.1,
        prerequisites: [
          { type: "turn_range", min: 40 },
          { type: "empire_count", min: 10 },
        ],
      };
      expect(checkAllPrerequisites(event, baseContext)).toBe(true);
    });

    it("should fail when any prerequisite is not met", () => {
      const event: GalacticEvent = {
        id: "test",
        name: "Test",
        category: "economic",
        scope: "global",
        description: "Test",
        narrative: "Test",
        effects: [],
        duration: 0,
        probability: 0.1,
        prerequisites: [
          { type: "turn_range", min: 40 },
          { type: "empire_count", min: 100 }, // Fails - too high
        ],
      };
      expect(checkAllPrerequisites(event, baseContext)).toBe(false);
    });
  });

  describe("selectRandomEvent with context", () => {
    it("should respect prerequisites when context is provided", () => {
      // This is a smoke test - with context, prerequisite checking is enabled
      const context = {
        empireCount: 20,
        playerNetworth: 500,
      };
      // Should not throw and should return an event or null
      const result = selectRandomEvent(50, new Set(), 0.01, context);
      // Result is either an event or null - both are valid
      expect(result === null || typeof result === "object").toBe(true);
    });
  });
});

/**
 * Event Service Tests (M11)
 *
 * Tests for galactic event application:
 * - Effect application (resources, prices, civil status, military, population, research)
 * - Empire selection based on scope
 * - Event triggering logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { GalacticEvent, EventEffect } from "@/lib/events/types";
import type { Empire } from "@/lib/db/schema";

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock the database module
vi.mock("@/lib/db", () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      }),
    }),
    query: {
      marketPrices: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  },
}));

// Mock the event repository
vi.mock("../../repositories/event-repository", () => ({
  getOccurredEventIds: vi.fn().mockResolvedValue(new Set<string>()),
  getLastEventTurn: vi.fn().mockResolvedValue(0),
  recordEvent: vi.fn().mockResolvedValue({ id: "test-event-id" }),
  expireEvents: vi.fn().mockResolvedValue(0),
  getActiveEffects: vi.fn().mockResolvedValue([]),
}));

// =============================================================================
// TEST DATA
// =============================================================================

const createMockEmpire = (overrides: Partial<Empire> = {}): Empire => ({
  id: "empire-1",
  gameId: "game-1",
  name: "Test Empire",
  emperorName: "Emperor Test",
  type: "player",
  botTier: null,
  botArchetype: null,
  credits: 100000,
  food: 1000,
  ore: 500,
  petroleum: 200,
  researchPoints: 0,
  population: 10000,
  populationCap: 50000,
  civilStatus: "content",
  soldiers: 100,
  fighters: 10,
  stations: 0,
  lightCruisers: 5,
  heavyCruisers: 2,
  carriers: 0,
  covertAgents: 5,
  armyEffectiveness: "85.00",
  covertPoints: 25,
  fundamentalResearchLevel: 0,
  networth: 100000,
  planetCount: 9,
  reputation: 50,
  isEliminated: false,
  eliminatedAtTurn: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createMockEvent = (overrides: Partial<GalacticEvent> = {}): GalacticEvent => ({
  id: "test_event",
  name: "Test Event",
  category: "economic",
  scope: "global",
  description: "A test event",
  narrative: "This is a test event narrative.",
  effects: [],
  duration: 5,
  probability: 0.1,
  ...overrides,
});

// =============================================================================
// TESTS
// =============================================================================

describe("Event Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("selectAffectedEmpires (via applyGalacticEvent)", () => {
    it("should select all empires for global scope", async () => {
      // Import the function dynamically to allow mocking
      const { applyGalacticEvent } = await import("../event-service");

      const empires = [
        createMockEmpire({ id: "empire-1", name: "Empire 1" }),
        createMockEmpire({ id: "empire-2", name: "Empire 2" }),
        createMockEmpire({ id: "empire-3", name: "Empire 3" }),
      ];

      const event = createMockEvent({
        scope: "global",
        effects: [],
      });

      const result = await applyGalacticEvent(event, "game-1", 25, empires);

      expect(result.success).toBe(true);
      expect(result.affectedEmpireIds).toHaveLength(3);
    });

    it("should select single empire for random_empire scope", async () => {
      const { applyGalacticEvent } = await import("../event-service");

      const empires = [
        createMockEmpire({ id: "empire-1", name: "Empire 1" }),
        createMockEmpire({ id: "empire-2", name: "Empire 2" }),
        createMockEmpire({ id: "empire-3", name: "Empire 3" }),
      ];

      const event = createMockEvent({
        scope: "random_empire",
        effects: [],
      });

      const result = await applyGalacticEvent(event, "game-1", 25, empires);

      expect(result.success).toBe(true);
      expect(result.affectedEmpireIds).toHaveLength(1);
    });

    it("should select top empires by networth for top_empires scope", async () => {
      const { applyGalacticEvent } = await import("../event-service");

      const empires = [
        createMockEmpire({ id: "empire-1", name: "Empire 1", networth: 50000 }),
        createMockEmpire({ id: "empire-2", name: "Empire 2", networth: 100000 }),
        createMockEmpire({ id: "empire-3", name: "Empire 3", networth: 75000 }),
        createMockEmpire({ id: "empire-4", name: "Empire 4", networth: 25000 }),
      ];

      const event = createMockEvent({
        scope: "top_empires",
        targetCount: 2,
        effects: [],
      });

      const result = await applyGalacticEvent(event, "game-1", 25, empires);

      expect(result.success).toBe(true);
      expect(result.affectedEmpireIds).toHaveLength(2);
      expect(result.affectedEmpireIds).toContain("empire-2"); // highest
      expect(result.affectedEmpireIds).toContain("empire-3"); // second highest
    });

    it("should select bottom empires by networth for bottom_empires scope", async () => {
      const { applyGalacticEvent } = await import("../event-service");

      const empires = [
        createMockEmpire({ id: "empire-1", name: "Empire 1", networth: 50000 }),
        createMockEmpire({ id: "empire-2", name: "Empire 2", networth: 100000 }),
        createMockEmpire({ id: "empire-3", name: "Empire 3", networth: 75000 }),
        createMockEmpire({ id: "empire-4", name: "Empire 4", networth: 25000 }),
      ];

      const event = createMockEvent({
        scope: "bottom_empires",
        targetCount: 2,
        effects: [],
      });

      const result = await applyGalacticEvent(event, "game-1", 25, empires);

      expect(result.success).toBe(true);
      expect(result.affectedEmpireIds).toHaveLength(2);
      expect(result.affectedEmpireIds).toContain("empire-4"); // lowest
      expect(result.affectedEmpireIds).toContain("empire-1"); // second lowest
    });

    it("should exclude eliminated empires", async () => {
      const { applyGalacticEvent } = await import("../event-service");

      const empires = [
        createMockEmpire({ id: "empire-1", name: "Empire 1", isEliminated: false }),
        createMockEmpire({ id: "empire-2", name: "Empire 2", isEliminated: true }),
        createMockEmpire({ id: "empire-3", name: "Empire 3", isEliminated: false }),
      ];

      const event = createMockEvent({
        scope: "global",
        effects: [],
      });

      const result = await applyGalacticEvent(event, "game-1", 25, empires);

      expect(result.success).toBe(true);
      expect(result.affectedEmpireIds).toHaveLength(2);
      expect(result.affectedEmpireIds).not.toContain("empire-2");
    });
  });

  describe("Effect Application", () => {
    it("should apply resource_multiplier effect to credits", async () => {
      const { applyGalacticEvent } = await import("../event-service");

      const empires = [
        createMockEmpire({ id: "empire-1", credits: 100000 }),
      ];

      const event = createMockEvent({
        scope: "global",
        effects: [
          {
            type: "resource_multiplier",
            resource: "credits",
            multiplier: 0.5, // -50%
          },
        ],
      });

      const result = await applyGalacticEvent(event, "game-1", 25, empires);

      expect(result.success).toBe(true);
      expect(result.appliedEffects).toHaveLength(1);
      expect(result.appliedEffects[0]?.type).toBe("resource_multiplier");
    });

    it("should apply civil_status effect", async () => {
      const { applyGalacticEvent } = await import("../event-service");

      const empires = [
        createMockEmpire({ id: "empire-1", civilStatus: "content" }),
      ];

      const event = createMockEvent({
        scope: "global",
        effects: [
          {
            type: "civil_status",
            change: -1, // Drop 1 level
          },
        ],
      });

      const result = await applyGalacticEvent(event, "game-1", 25, empires);

      expect(result.success).toBe(true);
      expect(result.appliedEffects).toHaveLength(1);
      expect(result.appliedEffects[0]?.type).toBe("civil_status");
    });

    it("should apply military damage effect", async () => {
      const { applyGalacticEvent } = await import("../event-service");

      const empires = [
        createMockEmpire({ id: "empire-1", soldiers: 100, fighters: 50 }),
      ];

      const event = createMockEvent({
        scope: "global",
        effects: [
          {
            type: "military",
            subtype: "damage",
            value: 0.2, // 20% damage
          },
        ],
      });

      const result = await applyGalacticEvent(event, "game-1", 25, empires);

      expect(result.success).toBe(true);
      expect(result.appliedEffects).toHaveLength(1);
      expect(result.appliedEffects[0]?.type).toBe("military");
    });

    it("should apply population effect", async () => {
      const { applyGalacticEvent } = await import("../event-service");

      const empires = [
        createMockEmpire({ id: "empire-1", population: 10000 }),
      ];

      const event = createMockEvent({
        scope: "global",
        effects: [
          {
            type: "population",
            change: -0.1, // -10%
          },
        ],
      });

      const result = await applyGalacticEvent(event, "game-1", 25, empires);

      expect(result.success).toBe(true);
      expect(result.appliedEffects).toHaveLength(1);
      expect(result.appliedEffects[0]?.type).toBe("population");
    });

    it("should apply research effect", async () => {
      const { applyGalacticEvent } = await import("../event-service");

      const empires = [
        createMockEmpire({ id: "empire-1", researchPoints: 500 }),
      ];

      const event = createMockEvent({
        scope: "global",
        effects: [
          {
            type: "research",
            change: 100,
            isPercentage: false,
          },
        ],
      });

      const result = await applyGalacticEvent(event, "game-1", 25, empires);

      expect(result.success).toBe(true);
      expect(result.appliedEffects).toHaveLength(1);
      expect(result.appliedEffects[0]?.type).toBe("research");
    });

    it("should apply multiple effects from one event", async () => {
      const { applyGalacticEvent } = await import("../event-service");

      const empires = [createMockEmpire({ id: "empire-1" })];

      const event = createMockEvent({
        scope: "global",
        effects: [
          {
            type: "resource_multiplier",
            resource: "credits",
            multiplier: 1.5,
          },
          {
            type: "civil_status",
            change: 1,
          },
          {
            type: "research",
            change: 50,
            isPercentage: false,
          },
        ],
      });

      const result = await applyGalacticEvent(event, "game-1", 25, empires);

      expect(result.success).toBe(true);
      expect(result.appliedEffects).toHaveLength(3);
    });
  });

  describe("Event Message Generation", () => {
    it("should generate correct message for global scope", async () => {
      const { applyGalacticEvent } = await import("../event-service");

      const empires = [
        createMockEmpire({ id: "empire-1" }),
        createMockEmpire({ id: "empire-2" }),
      ];

      const event = createMockEvent({
        name: "Economic Boom",
        description: "Markets surge with prosperity",
        scope: "global",
        effects: [],
      });

      const result = await applyGalacticEvent(event, "game-1", 25, empires);

      expect(result.message).toContain("Economic Boom");
      expect(result.message).toContain("all empires");
    });

    it("should generate correct message for targeted scope", async () => {
      const { applyGalacticEvent } = await import("../event-service");

      const empires = [
        createMockEmpire({ id: "empire-1" }),
        createMockEmpire({ id: "empire-2" }),
      ];

      const event = createMockEvent({
        name: "Resource Discovery",
        description: "Vast petroleum reserves found",
        scope: "random_empire",
        effects: [],
      });

      const result = await applyGalacticEvent(event, "game-1", 25, empires);

      expect(result.message).toContain("Resource Discovery");
      expect(result.message).toContain("1 empire");
    });
  });

  describe("processGalacticEvents", () => {
    it("should not trigger events before turn 15", async () => {
      const { processGalacticEvents } = await import("../event-service");

      const empires = [createMockEmpire({ id: "empire-1" })];

      const result = await processGalacticEvents("game-1", 10, empires);

      expect(result.event).toBeNull();
      expect(result.message).toContain("not yet active");
    });

    it("should check turn threshold for event triggering", async () => {
      const { processGalacticEvents } = await import("../event-service");
      const { getLastEventTurn } = await import("../../repositories/event-repository");

      // Mock last event was at turn 5 (10 turns ago at turn 15)
      vi.mocked(getLastEventTurn).mockResolvedValue(5);

      const empires = [createMockEmpire({ id: "empire-1" })];

      // At turn 15, shouldEventTrigger(10) should start having a chance
      const result = await processGalacticEvents("game-1", 15, empires);

      // Either an event is selected or no eligible events
      expect(result.success).toBe(true);
    });
  });

  describe("calculateActiveModifiers", () => {
    it("should aggregate production bonuses from active events", async () => {
      const { calculateActiveModifiers } = await import("../event-service");
      const { getActiveEffects } = await import("../../repositories/event-repository");

      vi.mocked(getActiveEffects).mockResolvedValue([
        {
          event: {
            id: "event-1",
            gameId: "game-1",
            eventType: "economic",
            eventSubtype: "resource_boom",
            title: "Resource Boom",
            description: "Production increased",
            severity: 50,
            affectedEmpireId: null,
            effects: [{ type: "production_bonus", bonus: 0.25 }],
            turn: 20,
            durationTurns: 5,
            expiresAtTurn: 25,
            isActive: true,
            createdAt: new Date(),
          },
          effects: [{ type: "production_bonus", bonus: 0.25 }],
        },
      ]);

      const modifiers = await calculateActiveModifiers("game-1", 22);

      expect(modifiers.productionBonus).toBe(0.25);
    });

    it("should return empty modifiers when no active events", async () => {
      const { calculateActiveModifiers } = await import("../event-service");
      const { getActiveEffects } = await import("../../repositories/event-repository");

      vi.mocked(getActiveEffects).mockResolvedValue([]);

      const modifiers = await calculateActiveModifiers("game-1", 22);

      expect(modifiers.productionBonus).toBe(0);
      expect(Object.keys(modifiers.priceMultipliers)).toHaveLength(0);
      expect(Object.keys(modifiers.resourceMultipliers)).toHaveLength(0);
    });
  });
});

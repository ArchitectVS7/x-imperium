/**
 * Bot Memory Repository Tests (M10)
 *
 * Tests for memory persistence and relationship score calculation.
 * Note: These tests use mocked database calls.
 */

import { describe, it, expect, vi } from "vitest";
import {
  calculateMemoryDecay,
  calculateNetRelationship,
  getRelationshipTier,
  createMemoryRecord,
  updateMemoryWeight,
  MEMORY_WEIGHTS,
  PERMANENT_SCAR_CHANCE,
  SCAR_WEIGHT_THRESHOLD,
  type MemoryRecord,
  type MemoryEventType,
} from "@/lib/bots/memory";

// Mock the database
vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "mock-id" }]),
      }),
    }),
    query: {
      botMemories: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  },
}));

describe("calculateMemoryDecay", () => {
  it("should not decay permanent memories", () => {
    const result = calculateMemoryDecay(100, 50, "permanent");
    expect(result).toBe(100);
  });

  it("should decay very_low resistance memories quickly", () => {
    const weight = 10;
    const turnsSince = 20;
    const result = calculateMemoryDecay(weight, turnsSince, "very_low");
    expect(result).toBeLessThan(weight);
  });

  it("should decay high resistance memories slowly", () => {
    const weight = 80;
    const turnsSince = 20;
    const result = calculateMemoryDecay(weight, turnsSince, "high");
    expect(result).toBeGreaterThan(weight * 0.9);
  });

  it("should decay to 0 eventually for non-permanent memories", () => {
    const weight = 50;
    const turnsSince = 500; // Many turns
    const result = calculateMemoryDecay(weight, turnsSince, "low");
    expect(result).toBe(0);
  });

  it("should not produce negative values", () => {
    const result = calculateMemoryDecay(10, 1000, "very_low");
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe("calculateNetRelationship", () => {
  const createMemory = (
    eventType: MemoryEventType,
    turn: number,
    isPermanentScar: boolean = false
  ): MemoryRecord => ({
    id: `memory-${Math.random()}`,
    targetEmpireId: "target-1",
    eventType,
    originalWeight: MEMORY_WEIGHTS[eventType].weight,
    currentWeight: MEMORY_WEIGHTS[eventType].weight,
    turn,
    isPermanentScar,
  });

  it("should return 0 for empty memories", () => {
    const result = calculateNetRelationship([], 10);
    expect(result).toBe(0);
  });

  it("should add positive events", () => {
    const memories = [
      createMemory("trade_completed", 5),
      createMemory("treaty_signed", 5),
    ];
    const result = calculateNetRelationship(memories, 10);
    expect(result).toBeGreaterThan(0);
  });

  it("should subtract negative events", () => {
    const memories = [
      createMemory("sector_captured", 5),
      createMemory("alliance_broken", 5),
    ];
    const result = calculateNetRelationship(memories, 10);
    expect(result).toBeLessThan(0);
  });

  it("should calculate net from mixed events", () => {
    const memories = [
      createMemory("saved_from_destruction", 5), // +90
      createMemory("sector_captured", 5), // -80
    ];
    const result = calculateNetRelationship(memories, 10);
    // Should be positive since saved (+90) > captured (-80)
    expect(result).toBeGreaterThan(0);
  });

  it("should apply decay to older memories", () => {
    const oldMemory = createMemory("trade_completed", 1);
    const recentMemory = createMemory("trade_completed", 50);

    const oldScore = calculateNetRelationship([oldMemory], 55);
    const recentScore = calculateNetRelationship([recentMemory], 55);

    // Old memory should have decayed more
    expect(oldScore).toBeLessThan(recentScore);
  });
});

describe("getRelationshipTier", () => {
  it("should return hostile for very negative scores", () => {
    expect(getRelationshipTier(-150)).toBe("hostile");
  });

  it("should return unfriendly for moderately negative scores", () => {
    expect(getRelationshipTier(-50)).toBe("unfriendly");
  });

  it("should return neutral for near-zero scores", () => {
    expect(getRelationshipTier(0)).toBe("neutral");
    expect(getRelationshipTier(10)).toBe("neutral");
    expect(getRelationshipTier(-10)).toBe("neutral");
  });

  it("should return friendly for moderately positive scores", () => {
    expect(getRelationshipTier(50)).toBe("friendly");
  });

  it("should return allied for very positive scores", () => {
    expect(getRelationshipTier(150)).toBe("allied");
  });
});

describe("createMemoryRecord", () => {
  it("should create record with correct weight from definition", () => {
    const record = createMemoryRecord("target-1", "sector_captured", 10);
    expect(record.originalWeight).toBe(MEMORY_WEIGHTS.sector_captured.weight);
    expect(record.currentWeight).toBe(MEMORY_WEIGHTS.sector_captured.weight);
  });

  it("should set turn correctly", () => {
    const record = createMemoryRecord("target-1", "trade_completed", 25);
    expect(record.turn).toBe(25);
  });

  it("should set targetEmpireId correctly", () => {
    const record = createMemoryRecord("enemy-empire", "battle_won", 5);
    expect(record.targetEmpireId).toBe("enemy-empire");
  });

  it("should set context if provided", () => {
    const record = createMemoryRecord("target-1", "major_trade", 10, "Large trade deal");
    expect(record.context).toBe("Large trade deal");
  });

  it("should have unique IDs", () => {
    const record1 = createMemoryRecord("target-1", "trade_completed", 10);
    const record2 = createMemoryRecord("target-1", "trade_completed", 10);
    expect(record1.id).not.toBe(record2.id);
  });
});

describe("updateMemoryWeight", () => {
  it("should not decay permanent scars", () => {
    const memory: MemoryRecord = {
      id: "test",
      targetEmpireId: "target-1",
      eventType: "sector_captured",
      originalWeight: 80,
      currentWeight: 80,
      turn: 1,
      isPermanentScar: true,
    };

    const updated = updateMemoryWeight(memory, 100);
    expect(updated.currentWeight).toBe(80);
  });

  it("should decay normal memories over time", () => {
    const memory: MemoryRecord = {
      id: "test",
      targetEmpireId: "target-1",
      eventType: "trade_completed",
      originalWeight: 10,
      currentWeight: 10,
      turn: 1,
      isPermanentScar: false,
    };

    const updated = updateMemoryWeight(memory, 50);
    expect(updated.currentWeight).toBeLessThan(10);
  });
});

describe("MEMORY_WEIGHTS definitions", () => {
  it("should have all event types defined", () => {
    const expectedEvents: MemoryEventType[] = [
      "sector_captured",
      "saved_from_destruction",
      "alliance_broken",
      "battle_won",
      "battle_lost",
      "invasion_repelled",
      "major_trade",
      "covert_op_detected",
      "reinforcement_received",
      "reinforcement_denied",
      "trade_completed",
      "treaty_signed",
      "treaty_rejected",
      "minor_skirmish",
      "spy_caught",
      "threat_issued",
      "apology_given",
      "message_sent",
      "trade_offer_made",
      "routine_interaction",
    ];

    for (const event of expectedEvents) {
      expect(MEMORY_WEIGHTS[event]).toBeDefined();
    }
  });

  it("should have valid weights (1-100)", () => {
    for (const [, def] of Object.entries(MEMORY_WEIGHTS)) {
      expect(def.weight).toBeGreaterThanOrEqual(1);
      expect(def.weight).toBeLessThanOrEqual(100);
    }
  });

  it("should have high weight for major events", () => {
    expect(MEMORY_WEIGHTS.sector_captured.weight).toBeGreaterThanOrEqual(60);
    expect(MEMORY_WEIGHTS.saved_from_destruction.weight).toBeGreaterThanOrEqual(60);
    expect(MEMORY_WEIGHTS.alliance_broken.weight).toBeGreaterThanOrEqual(60);
  });

  it("should have low weight for minor events", () => {
    expect(MEMORY_WEIGHTS.message_sent.weight).toBeLessThanOrEqual(10);
    expect(MEMORY_WEIGHTS.routine_interaction.weight).toBeLessThanOrEqual(10);
  });
});

describe("Permanent scar mechanics", () => {
  it("should have correct scar chance from PRD 7.9", () => {
    expect(PERMANENT_SCAR_CHANCE).toBe(0.2); // 20%
  });

  it("should have correct scar weight threshold", () => {
    expect(SCAR_WEIGHT_THRESHOLD).toBe(30);
  });

  it("should not create scars for low weight events", () => {
    // Run multiple times - low weight events should never become scars
    for (let i = 0; i < 20; i++) {
      const record = createMemoryRecord("target-1", "message_sent", 10);
      // message_sent weight is 1, below threshold of 30
      expect(record.isPermanentScar).toBe(false);
    }
  });
});

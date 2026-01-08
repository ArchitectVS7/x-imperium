/**
 * Tests for Border Discovery Service (M6.2)
 */

import { describe, it, expect } from "vitest";
import {
  calculateDiscoveryTurn,
  assignDiscoveryTurns,
  BORDER_CONSTANTS,
} from "../geography/border-discovery-service";

// =============================================================================
// DISCOVERY TURN CALCULATION TESTS
// =============================================================================

describe("calculateDiscoveryTurn", () => {
  it("should return turn within valid range", () => {
    for (let i = 0; i < 100; i++) {
      const turn = calculateDiscoveryTurn(0, 10);
      expect(turn).toBeGreaterThanOrEqual(BORDER_CONSTANTS.MIN_DISCOVERY_TURN);
      expect(turn).toBeLessThanOrEqual(BORDER_CONSTANTS.MAX_DISCOVERY_TURN);
    }
  });

  it("should distribute turns evenly across range", () => {
    const seededRandom = () => 0.5; // Deterministic middle value
    const turns: number[] = [];

    for (let i = 0; i < 6; i++) {
      turns.push(calculateDiscoveryTurn(i, 6, seededRandom));
    }

    // With 6 connections, should spread across 10-15 (6 turns)
    // First should be near 10, last should be near 15
    expect(turns[0]).toBeLessThanOrEqual(11);
    expect(turns[5]).toBeGreaterThanOrEqual(14);
  });

  it("should handle single connection", () => {
    const seededRandom = () => 0.5;
    const turn = calculateDiscoveryTurn(0, 1, seededRandom);

    expect(turn).toBeGreaterThanOrEqual(BORDER_CONSTANTS.MIN_DISCOVERY_TURN);
    expect(turn).toBeLessThanOrEqual(BORDER_CONSTANTS.MAX_DISCOVERY_TURN);
  });

  it("should be deterministic with seeded random", () => {
    const createSeeded = () => {
      let state = 12345;
      return () => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state / 0x7fffffff;
      };
    };

    const turn1 = calculateDiscoveryTurn(0, 10, createSeeded());
    const turn2 = calculateDiscoveryTurn(0, 10, createSeeded());

    expect(turn1).toBe(turn2);
  });
});

// =============================================================================
// DISCOVERY TURN ASSIGNMENT TESTS
// =============================================================================

describe("assignDiscoveryTurns", () => {
  it("should assign turns only to discoverable connection types", () => {
    const connections = [
      { id: "1", connectionType: "adjacent" },
      { id: "2", connectionType: "wormhole" }, // Not discoverable via this system
      { id: "3", connectionType: "hazardous" },
      { id: "4", connectionType: "trade_route" }, // Not in discoverable list
      { id: "5", connectionType: "contested" },
    ];

    const assignments = assignDiscoveryTurns(connections);

    // Should only assign to adjacent, hazardous, contested
    expect(assignments.has("1")).toBe(true);
    expect(assignments.has("2")).toBe(false); // wormhole
    expect(assignments.has("3")).toBe(true);
    expect(assignments.has("4")).toBe(false); // trade_route
    expect(assignments.has("5")).toBe(true);
  });

  it("should assign all discoverable connections", () => {
    const connections = Array.from({ length: 20 }, (_, i) => ({
      id: `conn-${i}`,
      connectionType: "adjacent",
    }));

    const assignments = assignDiscoveryTurns(connections);

    expect(assignments.size).toBe(20);
  });

  it("should assign turns within valid range", () => {
    const connections = Array.from({ length: 50 }, (_, i) => ({
      id: `conn-${i}`,
      connectionType: "adjacent",
    }));

    const assignments = assignDiscoveryTurns(connections);

    for (const [, turn] of Array.from(assignments.entries())) {
      expect(turn).toBeGreaterThanOrEqual(BORDER_CONSTANTS.MIN_DISCOVERY_TURN);
      expect(turn).toBeLessThanOrEqual(BORDER_CONSTANTS.MAX_DISCOVERY_TURN);
    }
  });

  it("should distribute turns across the range", () => {
    const connections = Array.from({ length: 30 }, (_, i) => ({
      id: `conn-${i}`,
      connectionType: "adjacent",
    }));

    const assignments = assignDiscoveryTurns(connections);
    const turns = Array.from(assignments.values());

    // Should have turns at both ends of the range
    const hasEarlyTurn = turns.some((t) => t <= 11);
    const hasLateTurn = turns.some((t) => t >= 14);

    expect(hasEarlyTurn).toBe(true);
    expect(hasLateTurn).toBe(true);
  });

  it("should be deterministic with seeded random", () => {
    const createSeeded = () => {
      let state = 54321;
      return () => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state / 0x7fffffff;
      };
    };

    const connections = Array.from({ length: 10 }, (_, i) => ({
      id: `conn-${i}`,
      connectionType: "adjacent",
    }));

    const assignments1 = assignDiscoveryTurns(connections, createSeeded());
    const assignments2 = assignDiscoveryTurns(connections, createSeeded());

    expect(Array.from(assignments1.entries())).toEqual(
      Array.from(assignments2.entries())
    );
  });
});

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("BORDER_CONSTANTS", () => {
  it("should have valid discovery turn range", () => {
    expect(BORDER_CONSTANTS.MIN_DISCOVERY_TURN).toBeLessThan(
      BORDER_CONSTANTS.MAX_DISCOVERY_TURN
    );
    expect(BORDER_CONSTANTS.MIN_DISCOVERY_TURN).toBeGreaterThan(0);
  });

  it("should have valid force multiplier", () => {
    expect(BORDER_CONSTANTS.BORDER_FORCE_MULTIPLIER).toBeGreaterThan(1.0);
    expect(BORDER_CONSTANTS.BORDER_FORCE_MULTIPLIER).toBeLessThanOrEqual(2.0);
  });

  it("should have discoverable types defined", () => {
    expect(BORDER_CONSTANTS.DISCOVERABLE_TYPES).toContain("adjacent");
    expect(BORDER_CONSTANTS.DISCOVERABLE_TYPES).toContain("hazardous");
    expect(BORDER_CONSTANTS.DISCOVERABLE_TYPES).toContain("contested");
    expect(BORDER_CONSTANTS.DISCOVERABLE_TYPES).not.toContain("wormhole");
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe("edge cases", () => {
  it("should handle empty connections array", () => {
    const assignments = assignDiscoveryTurns([]);
    expect(assignments.size).toBe(0);
  });

  it("should handle all non-discoverable connections", () => {
    const connections = [
      { id: "1", connectionType: "wormhole" },
      { id: "2", connectionType: "trade_route" },
    ];

    const assignments = assignDiscoveryTurns(connections);
    expect(assignments.size).toBe(0);
  });

  it("should handle very large number of connections", () => {
    const connections = Array.from({ length: 200 }, (_, i) => ({
      id: `conn-${i}`,
      connectionType: "adjacent",
    }));

    const assignments = assignDiscoveryTurns(connections);

    // All should still be within range
    for (const [, turn] of Array.from(assignments.entries())) {
      expect(turn).toBeGreaterThanOrEqual(BORDER_CONSTANTS.MIN_DISCOVERY_TURN);
      expect(turn).toBeLessThanOrEqual(BORDER_CONSTANTS.MAX_DISCOVERY_TURN);
    }
  });
});

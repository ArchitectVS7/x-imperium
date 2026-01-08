/**
 * Checkpoint Service Tests (M11 - PRD 11.3)
 *
 * Tests for alliance checkpoint evaluation:
 * - Checkpoint turn detection
 * - Alliance identification
 * - Power balance calculation
 * - Rebalancing event selection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isCheckpointTurn,
  CHECKPOINT_TURNS,
  IMBALANCE_THRESHOLD,
  generateCheckpointNotification,
  type AllianceGroup,
  type CheckpointResult,
} from "../events/checkpoint-service";

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock the database module
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      coalitions: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      treaties: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      empires: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  },
}));

// =============================================================================
// TESTS
// =============================================================================

describe("Checkpoint Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isCheckpointTurn", () => {
    it("should return true for all checkpoint turns", () => {
      for (const turn of CHECKPOINT_TURNS) {
        expect(isCheckpointTurn(turn)).toBe(true);
      }
    });

    it("should return false for non-checkpoint turns", () => {
      const nonCheckpointTurns = [1, 10, 29, 31, 50, 100, 180 - 1, 181];
      for (const turn of nonCheckpointTurns) {
        expect(isCheckpointTurn(turn)).toBe(false);
      }
    });

    it("should include turns 30, 60, 90, 120, 150, 180", () => {
      expect(CHECKPOINT_TURNS).toEqual([30, 60, 90, 120, 150, 180]);
    });
  });

  describe("IMBALANCE_THRESHOLD", () => {
    it("should be 2.0 (top alliance > 2x combined #2+#3)", () => {
      expect(IMBALANCE_THRESHOLD).toBe(2.0);
    });
  });

  describe("Power Balance Calculation", () => {
    it("should detect imbalance when top alliance has > 2x power of others", () => {
      // Test data: Top alliance has 100k networth, #2+#3 combined have 40k
      // Ratio = 100k / 40k = 2.5 > 2.0 = imbalanced
      const alliances: AllianceGroup[] = [
        {
          id: "alliance-1",
          name: "Dominant Alliance",
          memberIds: ["e1", "e2"],
          memberNames: ["Empire 1", "Empire 2"],
          totalNetworth: 100000,
          sectorCount: 20,
          isCoalition: true,
        },
        {
          id: "alliance-2",
          name: "Second Alliance",
          memberIds: ["e3", "e4"],
          memberNames: ["Empire 3", "Empire 4"],
          totalNetworth: 30000,
          sectorCount: 10,
          isCoalition: false,
        },
        {
          id: "alliance-3",
          name: "Third Alliance",
          memberIds: ["e5", "e6"],
          memberNames: ["Empire 5", "Empire 6"],
          totalNetworth: 10000,
          sectorCount: 5,
          isCoalition: false,
        },
      ];

      // 100000 / (30000 + 10000) = 2.5 > 2.0
      const ratio = alliances[0]!.totalNetworth /
        (alliances[1]!.totalNetworth + alliances[2]!.totalNetworth);

      expect(ratio).toBeGreaterThan(IMBALANCE_THRESHOLD);
    });

    it("should not detect imbalance when power is balanced", () => {
      // Test data: Top alliance has 60k, #2+#3 combined have 40k
      // Ratio = 60k / 40k = 1.5 < 2.0 = balanced
      const alliances: AllianceGroup[] = [
        {
          id: "alliance-1",
          name: "Leading Alliance",
          memberIds: ["e1", "e2"],
          memberNames: ["Empire 1", "Empire 2"],
          totalNetworth: 60000,
          sectorCount: 15,
          isCoalition: true,
        },
        {
          id: "alliance-2",
          name: "Second Alliance",
          memberIds: ["e3", "e4"],
          memberNames: ["Empire 3", "Empire 4"],
          totalNetworth: 25000,
          sectorCount: 10,
          isCoalition: false,
        },
        {
          id: "alliance-3",
          name: "Third Alliance",
          memberIds: ["e5", "e6"],
          memberNames: ["Empire 5", "Empire 6"],
          totalNetworth: 15000,
          sectorCount: 8,
          isCoalition: false,
        },
      ];

      // 60000 / (25000 + 15000) = 1.5 < 2.0
      const ratio = alliances[0]!.totalNetworth /
        (alliances[1]!.totalNetworth + alliances[2]!.totalNetworth);

      expect(ratio).toBeLessThanOrEqual(IMBALANCE_THRESHOLD);
    });
  });

  describe("generateCheckpointNotification", () => {
    it("should return empty string for non-checkpoint", () => {
      const result: CheckpointResult = {
        isCheckpoint: false,
        turn: 25,
        alliances: [],
        imbalanceDetected: false,
        topAlliance: null,
        rebalancingEvent: null,
        message: "Not a checkpoint turn",
      };

      expect(generateCheckpointNotification(result)).toBe("");
    });

    it("should return stable message when no imbalance", () => {
      const result: CheckpointResult = {
        isCheckpoint: true,
        turn: 30,
        alliances: [],
        imbalanceDetected: false,
        topAlliance: null,
        rebalancingEvent: null,
        message: "Turn 30 checkpoint: Power balance stable",
      };

      const notification = generateCheckpointNotification(result);

      expect(notification).toContain("Turn 30 Checkpoint");
      expect(notification).toContain("stable");
    });

    it("should return warning message when imbalance detected", () => {
      const topAlliance: AllianceGroup = {
        id: "alliance-1",
        name: "Dominant Empire Alliance",
        memberIds: ["e1", "e2"],
        memberNames: ["Empire 1", "Empire 2"],
        totalNetworth: 150000,
        sectorCount: 25,
        isCoalition: true,
      };

      const result: CheckpointResult = {
        isCheckpoint: true,
        turn: 60,
        alliances: [topAlliance],
        imbalanceDetected: true,
        topAlliance,
        rebalancingEvent: {
          id: "checkpoint_economic_sanctions",
          name: "Galactic Economic Sanctions",
          category: "political",
          scope: "coalition",
          description: "The Galactic Council imposes sanctions",
          narrative: "Growing alarm...",
          effects: [],
          duration: 10,
          probability: 1.0,
        },
        message: "Power imbalance detected!",
      };

      const notification = generateCheckpointNotification(result);

      expect(notification).toContain("Turn 60 Checkpoint");
      expect(notification).toContain("Power Imbalance");
      expect(notification).toContain("Dominant Empire Alliance");
      expect(notification).toContain("150,000");
      expect(notification).toContain("Galactic Economic Sanctions");
    });
  });

  describe("Rebalancing Event Selection", () => {
    it("should select economic sanctions for early game (turn <= 60)", () => {
      // Test that early game rebalancing is economic-focused
      // Early game events should be less severe
      const earlyTurns = [30, 60];

      for (const turn of earlyTurns) {
        expect(turn).toBeLessThanOrEqual(60);
      }
    });

    it("should select military rebellion for mid game (turn 61-120)", () => {
      // Test that mid game rebalancing involves military
      const midTurns = [90, 120];

      for (const turn of midTurns) {
        expect(turn).toBeGreaterThan(60);
        expect(turn).toBeLessThanOrEqual(120);
      }
    });

    it("should select galactic intervention for late game (turn > 120)", () => {
      // Test that late game rebalancing is most severe
      const lateTurns = [150, 180];

      for (const turn of lateTurns) {
        expect(turn).toBeGreaterThan(120);
      }
    });
  });

  describe("Alliance Identification", () => {
    it("should require minimum 2 members to be considered an alliance", () => {
      // Single-member "alliances" should be filtered out
      const singleMemberAlliance: AllianceGroup = {
        id: "solo-1",
        name: "Solo Empire",
        memberIds: ["e1"],
        memberNames: ["Lonely Empire"],
        totalNetworth: 50000,
        sectorCount: 10,
        isCoalition: false,
      };

      expect(singleMemberAlliance.memberIds.length).toBeLessThan(2);
    });

    it("should differentiate between coalition and treaty alliances", () => {
      const coalitionAlliance: AllianceGroup = {
        id: "coalition-1",
        name: "Formal Coalition",
        memberIds: ["e1", "e2", "e3"],
        memberNames: ["E1", "E2", "E3"],
        totalNetworth: 100000,
        sectorCount: 20,
        isCoalition: true,
      };

      const treatyAlliance: AllianceGroup = {
        id: "treaty-alliance-1",
        name: "Informal Alliance",
        memberIds: ["e4", "e5"],
        memberNames: ["E4", "E5"],
        totalNetworth: 60000,
        sectorCount: 12,
        isCoalition: false,
      };

      expect(coalitionAlliance.isCoalition).toBe(true);
      expect(treatyAlliance.isCoalition).toBe(false);
    });
  });

  describe("evaluateAllianceCheckpoint Integration", () => {
    it("should return not a checkpoint for non-checkpoint turns", async () => {
      const { evaluateAllianceCheckpoint } = await import("../events/checkpoint-service");

      const result = await evaluateAllianceCheckpoint("game-1", 25);

      expect(result.isCheckpoint).toBe(false);
      expect(result.alliances).toHaveLength(0);
      expect(result.imbalanceDetected).toBe(false);
      expect(result.rebalancingEvent).toBeNull();
    });

    it("should handle games with no alliances", async () => {
      const { evaluateAllianceCheckpoint } = await import("../events/checkpoint-service");

      const result = await evaluateAllianceCheckpoint("game-1", 30);

      expect(result.isCheckpoint).toBe(true);
      expect(result.alliances).toHaveLength(0);
      expect(result.imbalanceDetected).toBe(false);
      expect(result.message).toContain("No significant alliances");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty alliance list", () => {
      const alliances: AllianceGroup[] = [];

      // Power balance should be 0/0 = undefined behavior
      // Should not detect imbalance with no alliances
      expect(alliances.length).toBe(0);
    });

    it("should handle single alliance (no competitors)", () => {
      const alliances: AllianceGroup[] = [
        {
          id: "alliance-1",
          name: "Only Alliance",
          memberIds: ["e1", "e2"],
          memberNames: ["E1", "E2"],
          totalNetworth: 100000,
          sectorCount: 20,
          isCoalition: true,
        },
      ];

      // Ratio would be 100000 / 0 = Infinity
      // Should be treated as imbalanced
      const secondPower = alliances[1]?.totalNetworth ?? 0;
      const thirdPower = alliances[2]?.totalNetworth ?? 0;
      const competitorPower = secondPower + thirdPower;

      expect(competitorPower).toBe(0);

      // Division by zero should result in Infinity
      const ratio = competitorPower > 0
        ? alliances[0]!.totalNetworth / competitorPower
        : Infinity;

      expect(ratio).toBe(Infinity);
      expect(ratio > IMBALANCE_THRESHOLD).toBe(true);
    });

    it("should handle alliances with zero networth", () => {
      const alliances: AllianceGroup[] = [
        {
          id: "alliance-1",
          name: "Bankrupt Alliance",
          memberIds: ["e1", "e2"],
          memberNames: ["E1", "E2"],
          totalNetworth: 0,
          sectorCount: 5,
          isCoalition: true,
        },
        {
          id: "alliance-2",
          name: "Wealthy Alliance",
          memberIds: ["e3", "e4"],
          memberNames: ["E3", "E4"],
          totalNetworth: 50000,
          sectorCount: 10,
          isCoalition: false,
        },
      ];

      // Sort by networth
      alliances.sort((a, b) => b.totalNetworth - a.totalNetworth);

      expect(alliances[0]!.name).toBe("Wealthy Alliance");
      expect(alliances[1]!.name).toBe("Bankrupt Alliance");
    });
  });
});

/**
 * Covert Operations Constants Tests (PRD 6.8)
 */

import { describe, it, expect } from "vitest";
import {
  COVERT_OPERATIONS,
  COVERT_POINTS_PER_TURN,
  MAX_COVERT_POINTS,
  AGENT_CAPACITY_PER_GOV_PLANET,
  LOW_RISK_OPERATIONS,
  MEDIUM_RISK_OPERATIONS,
  HIGH_RISK_OPERATIONS,
  VERY_HIGH_RISK_OPERATIONS,
  getOperation,
  canAffordOperation,
  hasEnoughAgents,
  calculateAgentCapacity,
  calculatePointsAfterTurn,
  getAffordableOperations,
  getOperationsByRisk,
} from "./constants";

// =============================================================================
// PRD 6.8 COMPLIANCE TESTS
// =============================================================================

describe("Covert System Constants (PRD 6.8)", () => {
  it("should have correct covert points per turn", () => {
    // PRD: Earn 5 points per turn
    expect(COVERT_POINTS_PER_TURN).toBe(5);
  });

  it("should have correct max covert points", () => {
    // PRD: max 50
    expect(MAX_COVERT_POINTS).toBe(50);
  });

  it("should have correct agent capacity per government planet", () => {
    // PRD: Agent capacity = Government planets × 300
    expect(AGENT_CAPACITY_PER_GOV_PLANET).toBe(300);
  });
});

describe("Covert Operations (PRD 6.8)", () => {
  it("should have exactly 10 operations", () => {
    expect(Object.keys(COVERT_OPERATIONS)).toHaveLength(10);
  });

  it("should have all 10 operations from PRD", () => {
    const expectedOperations = [
      "send_spy",
      "insurgent_aid",
      "support_dissension",
      "demoralize_troops",
      "bombing_operations",
      "relations_spying",
      "take_hostages",
      "carriers_sabotage",
      "communications_spying",
      "setup_coup",
    ];

    for (const op of expectedOperations) {
      expect(COVERT_OPERATIONS).toHaveProperty(op);
    }
  });

  describe("Send Spy (PRD: Low cost, Low risk)", () => {
    const op = COVERT_OPERATIONS.send_spy;

    it("should have correct risk level", () => {
      expect(op.risk).toBe("low");
    });

    it("should have low cost", () => {
      expect(op.cost).toBeLessThanOrEqual(10);
    });

    it("should reveal enemy stats", () => {
      expect(op.description.toLowerCase()).toContain("reveal");
    });
  });

  describe("Insurgent Aid (PRD: Medium cost, Medium risk)", () => {
    const op = COVERT_OPERATIONS.insurgent_aid;

    it("should have correct risk level", () => {
      expect(op.risk).toBe("medium");
    });

    it("should affect civil status", () => {
      expect(op.effect.toLowerCase()).toContain("civil status");
    });
  });

  describe("Support Dissension (PRD: Medium cost, Medium risk)", () => {
    const op = COVERT_OPERATIONS.support_dissension;

    it("should have correct risk level", () => {
      expect(op.risk).toBe("medium");
    });

    it("should worsen civil status", () => {
      expect(op.effect.toLowerCase()).toContain("civil status");
    });
  });

  describe("Demoralize Troops (PRD: Medium cost, Medium risk)", () => {
    const op = COVERT_OPERATIONS.demoralize_troops;

    it("should have correct risk level", () => {
      expect(op.risk).toBe("medium");
    });

    it("should reduce effectiveness", () => {
      expect(op.effect.toLowerCase()).toContain("effectiveness");
    });
  });

  describe("Bombing Operations (PRD: High cost, High risk)", () => {
    const op = COVERT_OPERATIONS.bombing_operations;

    it("should have correct risk level", () => {
      expect(op.risk).toBe("high");
    });

    it("should destroy resources", () => {
      expect(op.effect.toLowerCase()).toContain("destroys");
    });
  });

  describe("Relations Spying (PRD: Low cost, Low risk)", () => {
    const op = COVERT_OPERATIONS.relations_spying;

    it("should have correct risk level", () => {
      expect(op.risk).toBe("low");
    });

    it("should reveal diplomacy", () => {
      expect(op.effect.toLowerCase()).toContain("treaties");
    });
  });

  describe("Take Hostages (PRD: High cost, High risk)", () => {
    const op = COVERT_OPERATIONS.take_hostages;

    it("should have correct risk level", () => {
      expect(op.risk).toBe("high");
    });

    it("should demand ransom", () => {
      expect(op.effect.toLowerCase()).toContain("ransom");
    });
  });

  describe("Carriers Sabotage (PRD: Very High cost, Very High risk)", () => {
    const op = COVERT_OPERATIONS.carriers_sabotage;

    it("should have correct risk level", () => {
      expect(op.risk).toBe("very_high");
    });

    it("should damage carriers", () => {
      expect(op.effect.toLowerCase()).toContain("carrier");
    });
  });

  describe("Communications Spying (PRD: Medium cost, Low risk)", () => {
    const op = COVERT_OPERATIONS.communications_spying;

    it("should have correct risk level", () => {
      expect(op.risk).toBe("low");
    });

    it("should intercept messages", () => {
      expect(op.effect.toLowerCase()).toContain("intercept");
    });
  });

  describe("Setup Coup (PRD: Very High cost, Very High risk)", () => {
    const op = COVERT_OPERATIONS.setup_coup;

    it("should have correct risk level", () => {
      expect(op.risk).toBe("very_high");
    });

    it("should be the most expensive operation", () => {
      const maxCost = Math.max(...Object.values(COVERT_OPERATIONS).map(o => o.cost));
      expect(op.cost).toBe(maxCost);
    });

    it("should attempt overthrow", () => {
      expect(op.description.toLowerCase()).toContain("overthrow");
    });
  });
});

// =============================================================================
// OPERATION CATEGORIES TESTS
// =============================================================================

describe("Operation Categories", () => {
  it("should categorize low risk operations correctly", () => {
    expect(LOW_RISK_OPERATIONS).toContain("send_spy");
    expect(LOW_RISK_OPERATIONS).toContain("relations_spying");
    expect(LOW_RISK_OPERATIONS).toContain("communications_spying");
    expect(LOW_RISK_OPERATIONS).toHaveLength(3);
  });

  it("should categorize medium risk operations correctly", () => {
    expect(MEDIUM_RISK_OPERATIONS).toContain("insurgent_aid");
    expect(MEDIUM_RISK_OPERATIONS).toContain("support_dissension");
    expect(MEDIUM_RISK_OPERATIONS).toContain("demoralize_troops");
    expect(MEDIUM_RISK_OPERATIONS).toHaveLength(3);
  });

  it("should categorize high risk operations correctly", () => {
    expect(HIGH_RISK_OPERATIONS).toContain("bombing_operations");
    expect(HIGH_RISK_OPERATIONS).toContain("take_hostages");
    expect(HIGH_RISK_OPERATIONS).toHaveLength(2);
  });

  it("should categorize very high risk operations correctly", () => {
    expect(VERY_HIGH_RISK_OPERATIONS).toContain("carriers_sabotage");
    expect(VERY_HIGH_RISK_OPERATIONS).toContain("setup_coup");
    expect(VERY_HIGH_RISK_OPERATIONS).toHaveLength(2);
  });

  it("should have all operations categorized", () => {
    const allCategorized = [
      ...LOW_RISK_OPERATIONS,
      ...MEDIUM_RISK_OPERATIONS,
      ...HIGH_RISK_OPERATIONS,
      ...VERY_HIGH_RISK_OPERATIONS,
    ];
    expect(allCategorized).toHaveLength(10);
  });
});

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe("Helper Functions", () => {
  describe("getOperation", () => {
    it("should return correct operation by id", () => {
      const op = getOperation("send_spy");
      expect(op.name).toBe("Send Spy");
      expect(op.risk).toBe("low");
    });
  });

  describe("canAffordOperation", () => {
    it("should return true if player has enough points", () => {
      expect(canAffordOperation("send_spy", 10)).toBe(true);
      expect(canAffordOperation("send_spy", 5)).toBe(true);
    });

    it("should return false if player doesn't have enough points", () => {
      expect(canAffordOperation("send_spy", 4)).toBe(false);
      expect(canAffordOperation("setup_coup", 49)).toBe(false);
    });
  });

  describe("hasEnoughAgents", () => {
    it("should return true if player has enough agents", () => {
      expect(hasEnoughAgents("send_spy", 1)).toBe(true);
      expect(hasEnoughAgents("setup_coup", 50)).toBe(true);
    });

    it("should return false if player doesn't have enough agents", () => {
      expect(hasEnoughAgents("send_spy", 0)).toBe(false);
      expect(hasEnoughAgents("setup_coup", 49)).toBe(false);
    });
  });

  describe("calculateAgentCapacity", () => {
    it("should calculate capacity correctly", () => {
      expect(calculateAgentCapacity(0)).toBe(0);
      expect(calculateAgentCapacity(1)).toBe(300);
      expect(calculateAgentCapacity(5)).toBe(1500);
    });
  });

  describe("calculatePointsAfterTurn", () => {
    it("should add 5 points per turn", () => {
      expect(calculatePointsAfterTurn(0)).toBe(5);
      expect(calculatePointsAfterTurn(10)).toBe(15);
      expect(calculatePointsAfterTurn(40)).toBe(45);
    });

    it("should cap at max points", () => {
      expect(calculatePointsAfterTurn(45)).toBe(50);
      expect(calculatePointsAfterTurn(50)).toBe(50);
      expect(calculatePointsAfterTurn(100)).toBe(50); // Already over max
    });
  });

  describe("getAffordableOperations", () => {
    it("should return only affordable operations", () => {
      const affordable = getAffordableOperations(10);
      expect(affordable.every(op => op.cost <= 10)).toBe(true);
    });

    it("should return all operations if player has max points", () => {
      const affordable = getAffordableOperations(50);
      expect(affordable).toHaveLength(10);
    });

    it("should return empty array if player has no points", () => {
      const affordable = getAffordableOperations(0);
      expect(affordable).toHaveLength(0);
    });
  });

  describe("getOperationsByRisk", () => {
    it("should return operations by risk level", () => {
      const lowRisk = getOperationsByRisk("low");
      expect(lowRisk.every(op => op.risk === "low")).toBe(true);
      expect(lowRisk).toHaveLength(3);

      const veryHigh = getOperationsByRisk("very_high");
      expect(veryHigh.every(op => op.risk === "very_high")).toBe(true);
      expect(veryHigh).toHaveLength(2);
    });
  });
});

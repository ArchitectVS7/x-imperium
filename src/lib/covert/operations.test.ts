/**
 * Covert Operations Execution Tests (PRD 6.8)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateCovertSuccess,
  executeCovertOp,
  previewCovertOp,
  getExecutableOperations,
  previewAllOperations,
  type CovertAttackerState,
  type CovertTargetState,
} from "./operations";
import { COVERT_OPERATIONS, type OperationType } from "./constants";

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createAttacker(overrides?: Partial<CovertAttackerState>): CovertAttackerState {
  return {
    id: "attacker-123",
    agents: 50,
    covertPoints: 100,
    ...overrides,
  };
}

function createDefender(overrides?: Partial<CovertTargetState>): CovertTargetState {
  return {
    id: "defender-456",
    agents: 30,
    governmentPlanets: 1,
    credits: 100000,
    food: 5000,
    ore: 3000,
    petroleum: 2000,
    carriers: 10,
    planetCount: 15,
    armyEffectiveness: 85,
    civilStatusIndex: 3,
    ...overrides,
  };
}

// =============================================================================
// CALCULATE COVERT SUCCESS TESTS
// =============================================================================

describe("calculateCovertSuccess", () => {
  it("should calculate success rate for send_spy operation", () => {
    const operation = COVERT_OPERATIONS.send_spy;
    const result = calculateCovertSuccess(50, 30, 1, operation);

    expect(result.successRate).toBeGreaterThan(0);
    expect(result.successRate).toBeLessThanOrEqual(1);
    expect(result.factors).toBeDefined();
    expect(result.catchProbability).toBeGreaterThanOrEqual(0);
  });

  it("should have higher success rate with more agents", () => {
    const operation = COVERT_OPERATIONS.send_spy;
    const lowAgents = calculateCovertSuccess(20, 50, 1, operation);
    const highAgents = calculateCovertSuccess(100, 50, 1, operation);

    expect(highAgents.successRate).toBeGreaterThan(lowAgents.successRate);
  });

  it("should have lower success rate against more government planets", () => {
    const operation = COVERT_OPERATIONS.insurgent_aid;
    const lowGov = calculateCovertSuccess(50, 30, 1, operation);
    const highGov = calculateCovertSuccess(50, 30, 5, operation);

    expect(lowGov.successRate).toBeGreaterThan(highGov.successRate);
  });

  it("should calculate catch probability", () => {
    const operation = COVERT_OPERATIONS.setup_coup;
    const result = calculateCovertSuccess(50, 50, 3, operation);

    expect(result.catchProbability).toBeGreaterThan(0);
    expect(result.catchProbability).toBeLessThanOrEqual(1);
  });

  it("should handle extreme agent ratios", () => {
    const operation = COVERT_OPERATIONS.send_spy;
    const noDefense = calculateCovertSuccess(100, 0, 0, operation);
    const noAttack = calculateCovertSuccess(0, 100, 5, operation);

    expect(noDefense.successRate).toBeGreaterThan(0);
    expect(noAttack.successRate).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// EXECUTE COVERT OP TESTS
// =============================================================================

describe("executeCovertOp", () => {
  let attacker: CovertAttackerState;
  let defender: CovertTargetState;

  beforeEach(() => {
    attacker = createAttacker();
    defender = createDefender();
  });

  describe("validation", () => {
    it("should fail when attacker cannot afford operation", () => {
      attacker.covertPoints = 4; // send_spy costs 5
      const operation = COVERT_OPERATIONS.send_spy;

      const result = executeCovertOp(operation, attacker, defender);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Insufficient covert points");
      expect(result.pointsConsumed).toBe(0);
    });

    it("should fail when attacker has insufficient agents", () => {
      attacker.agents = 4; // insurgent_aid needs 5 agents
      const operation = COVERT_OPERATIONS.insurgent_aid;

      const result = executeCovertOp(operation, attacker, defender);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Insufficient agents");
      expect(result.pointsConsumed).toBe(0);
    });
  });

  describe("successful operations", () => {
    it("should execute send_spy successfully with forced success", () => {
      const operation = COVERT_OPERATIONS.send_spy;
      const result = executeCovertOp(operation, attacker, defender, 0.01, 0.99);

      expect(result.success).toBe(true);
      expect(result.pointsConsumed).toBe(operation.cost);
      expect(result.effects.length).toBeGreaterThan(0);
      expect(result.effects[0]?.type).toBe("intelligence_revealed");
    });

    it("should execute insurgent_aid successfully", () => {
      const operation = COVERT_OPERATIONS.insurgent_aid;
      const result = executeCovertOp(operation, attacker, defender, 0.01, 0.99);

      expect(result.success).toBe(true);
      expect(result.effects[0]?.type).toBe("civil_status_reduced");
    });

    it("should execute support_dissension successfully", () => {
      const operation = COVERT_OPERATIONS.support_dissension;
      const result = executeCovertOp(operation, attacker, defender, 0.01, 0.99);

      expect(result.success).toBe(true);
      expect(result.effects[0]?.type).toBe("civil_status_reduced");
    });

    it("should execute demoralize_troops with effectiveness reduction", () => {
      const operation = COVERT_OPERATIONS.demoralize_troops;
      const result = executeCovertOp(operation, attacker, defender, 0.01, 0.99);

      expect(result.success).toBe(true);
      expect(result.effects[0]?.type).toBe("army_effectiveness_reduced");
      expect(result.effects[0]?.value).toBeGreaterThanOrEqual(10);
      expect(result.effects[0]?.value).toBeLessThanOrEqual(15);
      expect(result.effects[0]?.duration).toBe(3);
    });

    it("should execute bombing_operations with resource destruction", () => {
      const operation = COVERT_OPERATIONS.bombing_operations;
      const result = executeCovertOp(operation, attacker, defender, 0.01, 0.99);

      expect(result.success).toBe(true);
      expect(result.effects[0]?.type).toBe("resources_destroyed");
      expect(result.effects[0]?.value).toBeGreaterThan(0);
    });

    it("should execute relations_spying successfully", () => {
      const operation = COVERT_OPERATIONS.relations_spying;
      const result = executeCovertOp(operation, attacker, defender, 0.01, 0.99);

      expect(result.success).toBe(true);
      expect(result.effects[0]?.type).toBe("diplomacy_revealed");
    });

    it("should execute take_hostages with credit gain", () => {
      const operation = COVERT_OPERATIONS.take_hostages;
      const result = executeCovertOp(operation, attacker, defender, 0.01, 0.99);

      expect(result.success).toBe(true);
      expect(result.effects[0]?.type).toBe("credits_gained");
      expect(result.effects[0]?.value).toBeGreaterThanOrEqual(50000);
      expect(result.effects[0]?.value).toBeLessThanOrEqual(100000);
    });

    it("should execute carriers_sabotage with carrier destruction", () => {
      defender.carriers = 20;
      const operation = COVERT_OPERATIONS.carriers_sabotage;
      const result = executeCovertOp(operation, attacker, defender, 0.01, 0.99);

      expect(result.success).toBe(true);
      expect(result.effects[0]?.type).toBe("carriers_destroyed");
      expect(result.effects[0]?.value).toBeGreaterThanOrEqual(2); // 10% of 20
      expect(result.effects[0]?.value).toBeLessThanOrEqual(5); // 25% of 20
    });

    it("should execute communications_spying successfully", () => {
      const operation = COVERT_OPERATIONS.communications_spying;
      const result = executeCovertOp(operation, attacker, defender, 0.01, 0.99);

      expect(result.success).toBe(true);
      expect(result.effects[0]?.type).toBe("messages_intercepted");
      expect(result.effects[0]?.duration).toBe(10);
    });

    it("should execute setup_coup with planet loss", () => {
      attacker.agents = 100;
      attacker.covertPoints = 200;
      defender.planetCount = 20;
      const operation = COVERT_OPERATIONS.setup_coup;
      const result = executeCovertOp(operation, attacker, defender, 0.01, 0.99);

      expect(result.success).toBe(true);
      expect(result.effects[0]?.type).toBe("planets_lost");
      expect(result.effects[0]?.value).toBe(6); // 30% of 20
    });
  });

  describe("failed operations", () => {
    it("should fail operation when roll is high and conditions are unfavorable", () => {
      // Use unfavorable conditions: defender has more agents and government planets
      const weakAttacker = createAttacker({ agents: 10 });
      const strongDefender = createDefender({ agents: 100, governmentPlanets: 5 });
      const operation = COVERT_OPERATIONS.send_spy;
      const result = executeCovertOp(operation, weakAttacker, strongDefender, 0.99, 0.99);

      expect(result.success).toBe(false);
      expect(result.effects).toEqual([]);
      expect(result.pointsConsumed).toBe(operation.cost);
    });

    it("should catch agent when detection roll is low", () => {
      const operation = COVERT_OPERATIONS.send_spy;
      const result = executeCovertOp(operation, attacker, defender, 0.01, 0.01);

      expect(result.agentCaught).toBe(true);
    });

    it("should return appropriate message for failed operation with caught agent", () => {
      // Use unfavorable conditions to ensure failure
      const weakAttacker = createAttacker({ agents: 10 });
      const strongDefender = createDefender({ agents: 100, governmentPlanets: 5 });
      const operation = COVERT_OPERATIONS.send_spy;
      const result = executeCovertOp(operation, weakAttacker, strongDefender, 0.99, 0.01);

      expect(result.success).toBe(false);
      expect(result.agentCaught).toBe(true);
      expect(result.message).toContain("failed");
      expect(result.message).toContain("caught");
    });

    it("should return appropriate message for successful operation with caught agent", () => {
      const operation = COVERT_OPERATIONS.send_spy;
      const result = executeCovertOp(operation, attacker, defender, 0.01, 0.01);

      expect(result.success).toBe(true);
      expect(result.agentCaught).toBe(true);
      expect(result.message).toContain("succeeded");
      expect(result.message).toContain("caught");
    });
  });
});

// =============================================================================
// PREVIEW COVERT OP TESTS
// =============================================================================

describe("previewCovertOp", () => {
  let attacker: CovertAttackerState;
  let defender: CovertTargetState;

  beforeEach(() => {
    attacker = createAttacker();
    defender = createDefender();
  });

  it("should preview operation with all details", () => {
    const preview = previewCovertOp("send_spy", attacker, defender);

    expect(preview.operation).toBe(COVERT_OPERATIONS.send_spy);
    expect(preview.canExecute).toBe(true);
    expect(preview.successChance).toBeGreaterThan(0);
    expect(preview.catchChance).toBeGreaterThanOrEqual(0);
    expect(preview.factors).toBeDefined();
    expect(preview.potentialEffects.length).toBeGreaterThan(0);
  });

  it("should indicate cannot execute when insufficient covert points", () => {
    attacker.covertPoints = 4; // send_spy costs 5
    const preview = previewCovertOp("send_spy", attacker, defender);

    expect(preview.canExecute).toBe(false);
    expect(preview.cannotExecuteReason).toContain("covert points");
  });

  it("should indicate cannot execute when insufficient agents", () => {
    attacker.agents = 0;
    const preview = previewCovertOp("insurgent_aid", attacker, defender);

    expect(preview.canExecute).toBe(false);
    expect(preview.cannotExecuteReason).toContain("agents");
  });

  it("should preview potential effects for each operation type", () => {
    const operationTypes: OperationType[] = [
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

    for (const opType of operationTypes) {
      attacker.covertPoints = 200;
      attacker.agents = 100;
      const preview = previewCovertOp(opType, attacker, defender);

      expect(preview.potentialEffects.length).toBeGreaterThan(0);
    }
  });

  it("should show correct potential effects for demoralize_troops", () => {
    const preview = previewCovertOp("demoralize_troops", attacker, defender);
    expect(preview.potentialEffects[0]).toContain("10-15%");
  });

  it("should show correct potential effects for bombing_operations", () => {
    const preview = previewCovertOp("bombing_operations", attacker, defender);
    expect(preview.potentialEffects[0]).toContain("10-20%");
  });

  it("should show correct potential effects for take_hostages", () => {
    const preview = previewCovertOp("take_hostages", attacker, defender);
    expect(preview.potentialEffects[0]).toContain("50,000");
    expect(preview.potentialEffects[0]).toContain("100,000");
  });

  it("should show correct potential effects for carriers_sabotage", () => {
    const preview = previewCovertOp("carriers_sabotage", attacker, defender);
    expect(preview.potentialEffects[0]).toContain("10-25%");
  });

  it("should show correct potential effects for setup_coup", () => {
    attacker.covertPoints = 200;
    attacker.agents = 100;
    const preview = previewCovertOp("setup_coup", attacker, defender);
    expect(preview.potentialEffects[0]).toContain("30%");
  });
});

// =============================================================================
// GET EXECUTABLE OPERATIONS TESTS
// =============================================================================

describe("getExecutableOperations", () => {
  it("should return operations the attacker can afford", () => {
    const attacker = createAttacker({ covertPoints: 50, agents: 50 });
    const executable = getExecutableOperations(attacker);

    expect(executable.length).toBeGreaterThan(0);
    executable.forEach(op => {
      expect(op.cost).toBeLessThanOrEqual(attacker.covertPoints);
      expect(op.minAgents).toBeLessThanOrEqual(attacker.agents);
    });
  });

  it("should return empty array when no points", () => {
    const attacker = createAttacker({ covertPoints: 0, agents: 50 });
    const executable = getExecutableOperations(attacker);

    expect(executable).toEqual([]);
  });

  it("should return empty array when no agents", () => {
    const attacker = createAttacker({ covertPoints: 100, agents: 0 });
    const executable = getExecutableOperations(attacker);

    expect(executable).toEqual([]);
  });

  it("should exclude expensive operations when points are limited", () => {
    const attacker = createAttacker({ covertPoints: 15, agents: 100 });
    const executable = getExecutableOperations(attacker);

    executable.forEach(op => {
      expect(op.cost).toBeLessThanOrEqual(15);
    });
  });
});

// =============================================================================
// PREVIEW ALL OPERATIONS TESTS
// =============================================================================

describe("previewAllOperations", () => {
  it("should preview all operations", () => {
    const attacker = createAttacker({ covertPoints: 200, agents: 100 });
    const defender = createDefender();
    const previews = previewAllOperations(attacker, defender);

    expect(previews.length).toBe(Object.keys(COVERT_OPERATIONS).length);
  });

  it("should include both executable and non-executable operations", () => {
    const attacker = createAttacker({ covertPoints: 20, agents: 10 });
    const defender = createDefender();
    const previews = previewAllOperations(attacker, defender);

    const executable = previews.filter(p => p.canExecute);
    const nonExecutable = previews.filter(p => !p.canExecute);

    expect(executable.length).toBeGreaterThanOrEqual(0);
    expect(nonExecutable.length).toBeGreaterThan(0);
  });

  it("should have all previews contain factors", () => {
    const attacker = createAttacker({ covertPoints: 200, agents: 100 });
    const defender = createDefender();
    const previews = previewAllOperations(attacker, defender);

    previews.forEach(preview => {
      expect(preview.factors).toBeDefined();
      expect(preview.successChance).toBeDefined();
      expect(preview.catchChance).toBeDefined();
    });
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe("Edge Cases", () => {
  it("should handle zero resources for bombing", () => {
    const attacker = createAttacker();
    const defender = createDefender({
      credits: 0,
      food: 0,
      ore: 0,
      petroleum: 0,
    });
    const operation = COVERT_OPERATIONS.bombing_operations;
    const result = executeCovertOp(operation, attacker, defender, 0.01, 0.99);

    expect(result.success).toBe(true);
    expect(result.effects[0]?.value).toBe(0);
  });

  it("should handle zero carriers for sabotage", () => {
    const attacker = createAttacker();
    const defender = createDefender({ carriers: 0 });
    const operation = COVERT_OPERATIONS.carriers_sabotage;
    const result = executeCovertOp(operation, attacker, defender, 0.01, 0.99);

    expect(result.success).toBe(true);
    expect(result.effects[0]?.value).toBe(0);
  });

  it("should handle low planet count for coup", () => {
    const attacker = createAttacker({ agents: 100, covertPoints: 200 });
    const defender = createDefender({ planetCount: 2 });
    const operation = COVERT_OPERATIONS.setup_coup;
    const result = executeCovertOp(operation, attacker, defender, 0.01, 0.99);

    expect(result.success).toBe(true);
    expect(result.effects[0]?.value).toBe(0); // 30% of 2 = 0.6 -> 0
  });

  it("should handle very high agent counts", () => {
    const attacker = createAttacker({ agents: 10000, covertPoints: 500 });
    const defender = createDefender({ agents: 100, governmentPlanets: 1 });

    const result = calculateCovertSuccess(
      attacker.agents,
      defender.agents,
      defender.governmentPlanets,
      COVERT_OPERATIONS.send_spy
    );

    expect(result.successRate).toBeLessThanOrEqual(1);
    expect(result.successRate).toBeGreaterThan(0);
  });
});

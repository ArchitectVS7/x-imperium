/**
 * Pirate Mission Service Tests
 */

import { describe, it, expect } from "vitest";
import {
  shouldTriggerPirateMission,
  calculateMissionExecutionTurn,
  getMissionEffects,
  executeSupplyRunMission,
  executeDisruptionMission,
  executeSalvageOpMission,
  executePirateMission,
  selectSectorsToDestroy,
  checkContractCompletion,
  generateMissionResultMessage,
  type TargetEmpireState,
  type PirateMission,
} from "../events/pirate-service";

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMockTargetState(overrides: Partial<TargetEmpireState> = {}): TargetEmpireState {
  return {
    id: "target-empire",
    credits: 100000,
    food: 50000,
    ore: 25000,
    petroleum: 15000,
    soldiers: 1000,
    fighters: 500,
    carriers: 50,
    marines: 200,
    interceptors: 100,
    lightCruisers: 20,
    heavyCruisers: 10,
    battlecruisers: 5,
    dreadnoughts: 2,
    stealthCruisers: 1,
    sectorCount: 15,
    foodSectors: 4,
    oreSectors: 3,
    petroleumSectors: 2,
    researchSectors: 2,
    urbanSectors: 2,
    touristSectors: 1,
    industrialSectors: 1,
    ...overrides,
  };
}

function createMockMission(overrides: Partial<PirateMission> = {}): PirateMission {
  return {
    id: "mission-1",
    gameId: "game-1",
    contractId: "contract-1",
    triggeringEmpireId: "triggering-empire",
    targetEmpireId: "target-empire",
    missionType: "supply_run",
    status: "queued",
    queuedAtTurn: 10,
    executionTurn: 11,
    ...overrides,
  };
}

// =============================================================================
// MISSION SCHEDULING TESTS
// =============================================================================

describe("Pirate Mission Scheduling", () => {
  describe("shouldTriggerPirateMission", () => {
    it("should return true for pirate-triggering contracts", () => {
      expect(shouldTriggerPirateMission("supply_run")).toBe(true);
      expect(shouldTriggerPirateMission("disruption")).toBe(true);
      expect(shouldTriggerPirateMission("salvage_op")).toBe(true);
    });

    it("should return false for non-pirate contracts", () => {
      expect(shouldTriggerPirateMission("intimidation")).toBe(false);
      expect(shouldTriggerPirateMission("kingslayer")).toBe(false);
      expect(shouldTriggerPirateMission("proxy_war")).toBe(false);
    });
  });

  describe("calculateMissionExecutionTurn", () => {
    it("should calculate execution turn for supply_run", () => {
      expect(calculateMissionExecutionTurn(10, "supply_run")).toBe(11);
    });

    it("should calculate execution turn for disruption", () => {
      expect(calculateMissionExecutionTurn(10, "disruption")).toBe(11);
    });

    it("should delay salvage_op by 2 turns", () => {
      expect(calculateMissionExecutionTurn(10, "salvage_op")).toBe(12);
    });
  });

  describe("getMissionEffects", () => {
    it("should return effects for configured missions", () => {
      const supplyRun = getMissionEffects("supply_run");
      expect(supplyRun).toBeDefined();
      expect(supplyRun?.incomeDebuffPercent).toBe(0.05);

      const disruption = getMissionEffects("disruption");
      expect(disruption).toBeDefined();
      expect(disruption?.sectorsDestroyedMin).toBe(1);
      expect(disruption?.sectorsDestroyedMax).toBe(3);

      const salvage = getMissionEffects("salvage_op");
      expect(salvage).toBeDefined();
      expect(salvage?.militaryDestroyedPercent).toBe(0.1);
      expect(salvage?.salvagePercent).toBe(0.5);
    });

    it("should return null for non-pirate missions", () => {
      expect(getMissionEffects("intimidation")).toBeNull();
      expect(getMissionEffects("kingslayer")).toBeNull();
    });
  });
});

// =============================================================================
// MISSION EXECUTION TESTS
// =============================================================================

describe("Pirate Mission Execution", () => {
  describe("executeSupplyRunMission", () => {
    it("should apply income debuff", () => {
      const target = createMockTargetState();
      const config = getMissionEffects("supply_run")!;

      const result = executeSupplyRunMission(target, config);

      expect(result.success).toBe(true);
      expect(result.missionType).toBe("supply_run");
      expect(result.effects.incomeDebuffPercent).toBe(5);
      expect(result.effects.incomeDebuffTurns).toBe(2);
    });
  });

  describe("executeDisruptionMission", () => {
    it("should destroy sectors", () => {
      const target = createMockTargetState({ sectorCount: 10 });
      const config = getMissionEffects("disruption")!;

      const result = executeDisruptionMission(target, config);

      expect(result.success).toBe(true);
      expect(result.missionType).toBe("disruption");
      expect(result.effects.sectorsDestroyed).toBeGreaterThanOrEqual(1);
      expect(result.effects.sectorsDestroyed).toBeLessThanOrEqual(3);
    });

    it("should not destroy more sectors than target has", () => {
      const target = createMockTargetState({ sectorCount: 1 });
      const config = getMissionEffects("disruption")!;

      const result = executeDisruptionMission(target, config);

      expect(result.success).toBe(true);
      expect(result.effects.sectorsDestroyed).toBe(1);
    });

    it("should fail if target has no sectors", () => {
      const target = createMockTargetState({ sectorCount: 0 });
      const config = getMissionEffects("disruption")!;

      const result = executeDisruptionMission(target, config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("no sectors");
    });
  });

  describe("executeSalvageOpMission", () => {
    it("should calculate military value and salvage", () => {
      const target = createMockTargetState();
      const config = getMissionEffects("salvage_op")!;

      const result = executeSalvageOpMission(target, "contractor-1", config);

      expect(result.success).toBe(true);
      expect(result.missionType).toBe("salvage_op");
      expect(result.effects.militaryDestroyedPercent).toBe(10);
      expect(result.salvageValue).toBeGreaterThan(0);
      expect(result.triggeringEmpireId).toBe("contractor-1");
    });

    it("should handle null triggering empire", () => {
      const target = createMockTargetState();
      const config = getMissionEffects("salvage_op")!;

      const result = executeSalvageOpMission(target, null, config);

      expect(result.success).toBe(true);
      expect(result.triggeringEmpireId).toBeUndefined();
    });
  });

  describe("executePirateMission", () => {
    it("should execute supply_run mission", () => {
      const mission = createMockMission({ missionType: "supply_run" });
      const target = createMockTargetState();

      const result = executePirateMission(mission, target);

      expect(result.success).toBe(true);
      expect(result.missionType).toBe("supply_run");
    });

    it("should execute disruption mission", () => {
      const mission = createMockMission({ missionType: "disruption" });
      const target = createMockTargetState();

      const result = executePirateMission(mission, target);

      expect(result.success).toBe(true);
      expect(result.missionType).toBe("disruption");
    });

    it("should execute salvage_op mission", () => {
      const mission = createMockMission({ missionType: "salvage_op" });
      const target = createMockTargetState();

      const result = executePirateMission(mission, target);

      expect(result.success).toBe(true);
      expect(result.missionType).toBe("salvage_op");
    });

    it("should fail for unsupported mission types", () => {
      const mission = createMockMission({ missionType: "intimidation" });
      const target = createMockTargetState();

      const result = executePirateMission(mission, target);

      expect(result.success).toBe(false);
      expect(result.error).toContain("No mission effects");
    });
  });
});

// =============================================================================
// SECTOR DESTRUCTION TESTS
// =============================================================================

describe("Sector Destruction", () => {
  describe("selectSectorsToDestroy", () => {
    it("should select correct number of sectors", () => {
      const target = createMockTargetState({
        foodSectors: 5,
        oreSectors: 3,
        petroleumSectors: 2,
        sectorCount: 10,
      });

      const selected = selectSectorsToDestroy(target, 3);

      expect(selected).toHaveLength(3);
    });

    it("should not select more than available", () => {
      const target = createMockTargetState({
        foodSectors: 1,
        oreSectors: 1,
        petroleumSectors: 0,
        researchSectors: 0,
        urbanSectors: 0,
        touristSectors: 0,
        industrialSectors: 0,
        sectorCount: 2,
      });

      const selected = selectSectorsToDestroy(target, 10);

      expect(selected).toHaveLength(2);
    });

    it("should include valid sector types", () => {
      const target = createMockTargetState();

      const selected = selectSectorsToDestroy(target, 5);

      const validTypes = ["food", "ore", "petroleum", "research", "urban", "tourist", "industrial"];
      for (const type of selected) {
        expect(validTypes).toContain(type);
      }
    });
  });
});

// =============================================================================
// CONTRACT COMPLETION TESTS
// =============================================================================

describe("Contract Completion Detection", () => {
  describe("checkContractCompletion", () => {
    it("should detect intimidation completion", () => {
      const state = {
        contractType: "intimidation" as const,
        targetEmpireId: "target-1",
        initialState: { civilStatus: "stable" },
        currentState: { civilStatus: "unrest" },
      };

      const result = checkContractCompletion(state);

      expect(result.completed).toBe(true);
      expect(result.reason).toContain("dropped");
    });

    it("should not complete intimidation if status unchanged", () => {
      const state = {
        contractType: "intimidation" as const,
        targetEmpireId: "target-1",
        initialState: { civilStatus: "stable" },
        currentState: { civilStatus: "stable" },
      };

      const result = checkContractCompletion(state);

      expect(result.completed).toBe(false);
    });

    it("should detect economic_warfare completion", () => {
      const state = {
        contractType: "economic_warfare" as const,
        targetEmpireId: "target-1",
        initialState: { food: 100000 },
        currentState: { food: 50000 }, // 50% loss
      };

      const result = checkContractCompletion(state);

      expect(result.completed).toBe(true);
    });

    it("should not complete economic_warfare if loss < 30%", () => {
      const state = {
        contractType: "economic_warfare" as const,
        targetEmpireId: "target-1",
        initialState: { food: 100000 },
        currentState: { food: 80000 }, // 20% loss
      };

      const result = checkContractCompletion(state);

      expect(result.completed).toBe(false);
    });

    it("should detect hostile_takeover completion", () => {
      const state = {
        contractType: "hostile_takeover" as const,
        targetEmpireId: "target-1",
        initialState: { capturedSectorsFrom: [] },
        currentState: { capturedSectorsFrom: ["target-1"] },
      };

      const result = checkContractCompletion(state);

      expect(result.completed).toBe(true);
    });

    it("should detect kingslayer completion", () => {
      const state = {
        contractType: "kingslayer" as const,
        targetEmpireId: "target-1",
        initialState: { rank: 2 },
        currentState: { rank: 5 },
      };

      const result = checkContractCompletion(state);

      expect(result.completed).toBe(true);
    });

    it("should not complete kingslayer if target still in top 3", () => {
      const state = {
        contractType: "kingslayer" as const,
        targetEmpireId: "target-1",
        initialState: { rank: 1 },
        currentState: { rank: 3 },
      };

      const result = checkContractCompletion(state);

      expect(result.completed).toBe(false);
    });

    it("should detect regime_change completion", () => {
      const state = {
        contractType: "regime_change" as const,
        targetEmpireId: "target-1",
        initialState: { civilStatus: "stable" },
        currentState: { civilStatus: "revolting" },
      };

      const result = checkContractCompletion(state);

      expect(result.completed).toBe(true);
    });

    it("should detect decapitation_strike completion", () => {
      const state = {
        contractType: "decapitation_strike" as const,
        targetEmpireId: "target-1",
        initialState: { rank: 1 },
        currentState: { rank: 2 },
      };

      const result = checkContractCompletion(state);

      expect(result.completed).toBe(true);
    });
  });
});

// =============================================================================
// MESSAGE GENERATION TESTS
// =============================================================================

describe("Message Generation", () => {
  describe("generateMissionResultMessage", () => {
    it("should generate supply_run message", () => {
      const result = {
        success: true,
        missionType: "supply_run" as const,
        targetEmpireId: "target-1",
        effects: { incomeDebuffPercent: 5, incomeDebuffTurns: 2 },
      };

      const message = generateMissionResultMessage(result);

      expect(message).toContain("supply lines");
      expect(message).toContain("5%");
      expect(message).toContain("2 turns");
    });

    it("should generate disruption message", () => {
      const result = {
        success: true,
        missionType: "disruption" as const,
        targetEmpireId: "target-1",
        effects: { sectorsDestroyed: 2 },
      };

      const message = generateMissionResultMessage(result);

      expect(message).toContain("destroyed");
      expect(message).toContain("2 sector");
    });

    it("should generate salvage_op message", () => {
      const result = {
        success: true,
        missionType: "salvage_op" as const,
        targetEmpireId: "target-1",
        effects: { militaryDestroyedPercent: 10 },
        salvageValue: 50000,
      };

      const message = generateMissionResultMessage(result);

      expect(message).toContain("10%");
      expect(message).toContain("50,000");
    });

    it("should generate failure message", () => {
      const result = {
        success: false,
        missionType: "disruption" as const,
        targetEmpireId: "target-1",
        effects: {},
        error: "No sectors available",
      };

      const message = generateMissionResultMessage(result);

      expect(message).toContain("failed");
      expect(message).toContain("No sectors available");
    });
  });
});

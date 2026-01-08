/**
 * Attack Validation Service Tests
 *
 * Comprehensive test suite for attack validation mechanics:
 * - Force multiplier calculations
 * - Effective force calculations
 * - Attack validation with influence sphere
 * - Narrative and warning generation
 * - Attack target sorting and filtering
 */

import { describe, it, expect } from "vitest";
import {
  validateAttackWithInfluence,
  calculateRequiredForces,
  calculateEffectiveForces,
  getDistanceNarrative,
  getForceReductionWarning,
  getAttackTargetsWithInfo,
} from "../combat/attack-validation-service";
import type { InfluenceSphereResult } from "../geography/influence-sphere-service";
import type { EmpireInfluence } from "@/lib/db/schema";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createEmptyForces() {
  return {
    soldiers: 0,
    fighters: 0,
    lightCruisers: 0,
    heavyCruisers: 0,
    carriers: 0,
    stations: 0,
  };
}

function createStandardForces(multiplier = 1) {
  return {
    soldiers: 100 * multiplier,
    fighters: 50 * multiplier,
    lightCruisers: 10 * multiplier,
    heavyCruisers: 5 * multiplier,
    carriers: 2 * multiplier,
    stations: 1 * multiplier,
  };
}

function createInfluenceSphere(
  directNeighbors: string[] = [],
  extendedNeighbors: string[] = [],
  distantEmpires: string[] = []
): InfluenceSphereResult {
  return {
    directNeighbors,
    extendedNeighbors,
    distantEmpires,
    totalRadius: 3,
  };
}

// =============================================================================
// validateAttackWithInfluence Tests
// =============================================================================

describe("validateAttackWithInfluence", () => {
  describe("Protection validation", () => {
    it("should reject attack on protected empire", () => {
      const influence = createInfluenceSphere(["defender-1"]);
      const forces = createStandardForces();

      const result = validateAttackWithInfluence(
        "attacker-1",
        "defender-1",
        influence,
        forces,
        true, // isDefenderProtected
        false // hasActiveTreaty
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Target empire is under protection");
      expect(result.forceMultiplier).toBe(0);
      expect(result.influenceType).toBe("unreachable");
    });

    it("should reject attack on protected empire even if direct neighbor", () => {
      const influence = createInfluenceSphere(["defender-1"]);
      const forces = createStandardForces();

      const result = validateAttackWithInfluence(
        "attacker-1",
        "defender-1",
        influence,
        forces,
        true,
        false
      );

      expect(result.valid).toBe(false);
      expect(result.adjustedForces).toBeUndefined();
    });
  });

  describe("Treaty validation", () => {
    it("should reject attack on treaty partner", () => {
      const influence = createInfluenceSphere(["defender-1"]);
      const forces = createStandardForces();

      const result = validateAttackWithInfluence(
        "attacker-1",
        "defender-1",
        influence,
        forces,
        false, // isDefenderProtected
        true // hasActiveTreaty
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Cannot attack empire with active treaty");
      expect(result.forceMultiplier).toBe(0);
      expect(result.influenceType).toBe("unreachable");
    });

    it("should reject attack on treaty partner even if no protection", () => {
      const influence = createInfluenceSphere(["defender-1"]);
      const forces = createStandardForces();

      const result = validateAttackWithInfluence(
        "attacker-1",
        "defender-1",
        influence,
        forces,
        false,
        true
      );

      expect(result.valid).toBe(false);
    });
  });

  describe("Influence sphere validation", () => {
    it("should reject attack on empire outside influence sphere", () => {
      const influence = createInfluenceSphere(
        ["ally-1"], // direct neighbors
        ["ally-2"], // extended neighbors
        ["defender-1"] // distant - can't attack
      );
      const forces = createStandardForces();

      const result = validateAttackWithInfluence(
        "attacker-1",
        "defender-1",
        influence,
        forces,
        false,
        false
      );

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.influenceType).toBe("unreachable");
    });

    it("should reject attack on empire not in any neighbor list", () => {
      const influence = createInfluenceSphere([], [], []);
      const forces = createStandardForces();

      const result = validateAttackWithInfluence(
        "attacker-1",
        "unknown-defender",
        influence,
        forces,
        false,
        false
      );

      expect(result.valid).toBe(false);
    });
  });

  describe("Direct neighbor attacks (1.0x multiplier)", () => {
    it("should allow attack on direct neighbor with 1.0x multiplier", () => {
      const influence = createInfluenceSphere(["defender-1"]);
      const forces = createStandardForces();

      const result = validateAttackWithInfluence(
        "attacker-1",
        "defender-1",
        influence,
        forces,
        false,
        false
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.forceMultiplier).toBe(1.0);
      expect(result.influenceType).toBe("direct");
    });

    it("should not reduce forces for direct neighbor attacks", () => {
      const influence = createInfluenceSphere(["defender-1"]);
      const forces = createStandardForces();

      const result = validateAttackWithInfluence(
        "attacker-1",
        "defender-1",
        influence,
        forces,
        false,
        false
      );

      expect(result.adjustedForces).toEqual(forces);
    });

    it("should handle attack with zero forces on direct neighbor", () => {
      const influence = createInfluenceSphere(["defender-1"]);
      const forces = createEmptyForces();

      const result = validateAttackWithInfluence(
        "attacker-1",
        "defender-1",
        influence,
        forces,
        false,
        false
      );

      expect(result.valid).toBe(true);
      expect(result.adjustedForces).toEqual(forces);
    });
  });

  describe("Extended neighbor attacks (1.5x multiplier)", () => {
    it("should allow attack on extended neighbor with 1.5x multiplier", () => {
      const influence = createInfluenceSphere([], ["defender-1"]);
      const forces = createStandardForces();

      const result = validateAttackWithInfluence(
        "attacker-1",
        "defender-1",
        influence,
        forces,
        false,
        false
      );

      expect(result.valid).toBe(true);
      expect(result.forceMultiplier).toBe(1.5);
      expect(result.influenceType).toBe("extended");
    });

    it("should reduce forces by 1/1.5 for extended neighbor attacks", () => {
      const influence = createInfluenceSphere([], ["defender-1"]);
      const forces = {
        soldiers: 150,
        fighters: 75,
        lightCruisers: 15,
        heavyCruisers: 6,
        carriers: 3,
        stations: 3,
      };

      const result = validateAttackWithInfluence(
        "attacker-1",
        "defender-1",
        influence,
        forces,
        false,
        false
      );

      expect(result.adjustedForces).toEqual({
        soldiers: 100, // 150 / 1.5 = 100
        fighters: 50, // 75 / 1.5 = 50
        lightCruisers: 10, // 15 / 1.5 = 10
        heavyCruisers: 4, // 6 / 1.5 = 4
        carriers: 2, // 3 / 1.5 = 2
        stations: 2, // 3 / 1.5 = 2
      });
    });

    it("should floor force values for extended attacks (not round)", () => {
      const influence = createInfluenceSphere([], ["defender-1"]);
      const forces = {
        soldiers: 100, // 100 / 1.5 = 66.66... → 66
        fighters: 50, // 50 / 1.5 = 33.33... → 33
        lightCruisers: 10, // 10 / 1.5 = 6.66... → 6
        heavyCruisers: 5, // 5 / 1.5 = 3.33... → 3
        carriers: 2, // 2 / 1.5 = 1.33... → 1
        stations: 1, // 1 / 1.5 = 0.66... → 0
      };

      const result = validateAttackWithInfluence(
        "attacker-1",
        "defender-1",
        influence,
        forces,
        false,
        false
      );

      expect(result.adjustedForces).toEqual({
        soldiers: 66,
        fighters: 33,
        lightCruisers: 6,
        heavyCruisers: 3,
        carriers: 1,
        stations: 0,
      });
    });

    it("should handle partial unit composition for extended attacks", () => {
      const influence = createInfluenceSphere([], ["defender-1"]);
      const forces = {
        soldiers: 150,
        fighters: 0,
        lightCruisers: 0,
        heavyCruisers: 0,
        carriers: 0,
        stations: 0,
      };

      const result = validateAttackWithInfluence(
        "attacker-1",
        "defender-1",
        influence,
        forces,
        false,
        false
      );

      expect(result.adjustedForces?.soldiers).toBe(100);
      expect(result.adjustedForces?.fighters).toBe(0);
    });
  });

  describe("Priority of validations", () => {
    it("should check protection before treaty", () => {
      const influence = createInfluenceSphere(["defender-1"]);
      const forces = createStandardForces();

      const result = validateAttackWithInfluence(
        "attacker-1",
        "defender-1",
        influence,
        forces,
        true, // protected
        true // treaty
      );

      expect(result.errors).toContain("Target empire is under protection");
      expect(result.errors).not.toContain("Cannot attack empire with active treaty");
    });

    it("should check treaty before influence sphere", () => {
      const influence = createInfluenceSphere([], [], ["defender-1"]);
      const forces = createStandardForces();

      const result = validateAttackWithInfluence(
        "attacker-1",
        "defender-1",
        influence,
        forces,
        false,
        true
      );

      expect(result.errors).toContain("Cannot attack empire with active treaty");
    });
  });
});

// =============================================================================
// calculateEffectiveForces Tests
// =============================================================================

describe("calculateEffectiveForces", () => {
  it("should not change forces with 1.0x multiplier", () => {
    const forces = createStandardForces();
    const result = calculateEffectiveForces(forces, 1.0);

    expect(result).toEqual(forces);
  });

  it("should reduce forces by 1/1.5 for 1.5x multiplier", () => {
    const forces = {
      soldiers: 150,
      fighters: 75,
      lightCruisers: 15,
      heavyCruisers: 6,
      carriers: 3,
      stations: 3,
    };

    const result = calculateEffectiveForces(forces, 1.5);

    expect(result).toEqual({
      soldiers: 100,
      fighters: 50,
      lightCruisers: 10,
      heavyCruisers: 4,
      carriers: 2,
      stations: 2,
    });
  });

  it("should floor values (not round or ceil)", () => {
    const forces = {
      soldiers: 100, // 66.66 → 66
      fighters: 50, // 33.33 → 33
      lightCruisers: 10, // 6.66 → 6
      heavyCruisers: 5, // 3.33 → 3
      carriers: 2, // 1.33 → 1
      stations: 1, // 0.66 → 0
    };

    const result = calculateEffectiveForces(forces, 1.5);

    expect(result.soldiers).toBe(66);
    expect(result.fighters).toBe(33);
    expect(result.lightCruisers).toBe(6);
    expect(result.heavyCruisers).toBe(3);
    expect(result.carriers).toBe(1);
    expect(result.stations).toBe(0);
  });

  it("should handle zero forces correctly", () => {
    const forces = createEmptyForces();
    const result = calculateEffectiveForces(forces, 1.5);

    expect(result).toEqual(createEmptyForces());
  });

  it("should handle 1.25x multiplier (contested route)", () => {
    const forces = { soldiers: 125, fighters: 0, lightCruisers: 0, heavyCruisers: 0, carriers: 0, stations: 0 };
    const result = calculateEffectiveForces(forces, 1.25);

    expect(result.soldiers).toBe(100); // 125 / 1.25 = 100
  });

  it("should handle large force numbers", () => {
    const forces = {
      soldiers: 1500000,
      fighters: 750000,
      lightCruisers: 150000,
      heavyCruisers: 75000,
      carriers: 15000,
      stations: 7500,
    };

    const result = calculateEffectiveForces(forces, 1.5);

    expect(result.soldiers).toBe(1000000);
    expect(result.fighters).toBe(500000);
    expect(result.lightCruisers).toBe(100000);
    expect(result.heavyCruisers).toBe(50000);
    expect(result.carriers).toBe(10000);
    expect(result.stations).toBe(5000);
  });
});

// =============================================================================
// calculateRequiredForces Tests
// =============================================================================

describe("calculateRequiredForces", () => {
  it("should not change forces with 1.0x multiplier", () => {
    const desiredForces = createStandardForces();
    const result = calculateRequiredForces(desiredForces, 1.0);

    expect(result).toEqual(desiredForces);
  });

  it("should multiply forces by 1.5 for 1.5x multiplier", () => {
    const desiredForces = {
      soldiers: 100,
      fighters: 50,
      lightCruisers: 10,
      heavyCruisers: 4,
      carriers: 2,
      stations: 2,
    };

    const result = calculateRequiredForces(desiredForces, 1.5);

    expect(result).toEqual({
      soldiers: 150, // 100 * 1.5
      fighters: 75, // 50 * 1.5
      lightCruisers: 15, // 10 * 1.5
      heavyCruisers: 6, // 4 * 1.5
      carriers: 3, // 2 * 1.5
      stations: 3, // 2 * 1.5
    });
  });

  it("should ceil values (not floor or round)", () => {
    const desiredForces = {
      soldiers: 66, // 66 * 1.5 = 99 → 99
      fighters: 33, // 33 * 1.5 = 49.5 → 50
      lightCruisers: 7, // 7 * 1.5 = 10.5 → 11
      heavyCruisers: 3, // 3 * 1.5 = 4.5 → 5
      carriers: 1, // 1 * 1.5 = 1.5 → 2
      stations: 1, // 1 * 1.5 = 1.5 → 2
    };

    const result = calculateRequiredForces(desiredForces, 1.5);

    expect(result.soldiers).toBe(99);
    expect(result.fighters).toBe(50); // ceil(49.5)
    expect(result.lightCruisers).toBe(11); // ceil(10.5)
    expect(result.heavyCruisers).toBe(5); // ceil(4.5)
    expect(result.carriers).toBe(2); // ceil(1.5)
    expect(result.stations).toBe(2); // ceil(1.5)
  });

  it("should handle zero forces correctly", () => {
    const forces = createEmptyForces();
    const result = calculateRequiredForces(forces, 1.5);

    expect(result).toEqual(createEmptyForces());
  });

  it("should be inverse of calculateEffectiveForces for round numbers", () => {
    const desiredForces = {
      soldiers: 100,
      fighters: 50,
      lightCruisers: 10,
      heavyCruisers: 4,
      carriers: 2,
      stations: 2,
    };

    const required = calculateRequiredForces(desiredForces, 1.5);
    const effective = calculateEffectiveForces(required, 1.5);

    // Effective should equal or exceed desired (due to ceil in required)
    expect(effective.soldiers).toBeGreaterThanOrEqual(desiredForces.soldiers);
    expect(effective.fighters).toBeGreaterThanOrEqual(desiredForces.fighters);
  });
});

// =============================================================================
// getDistanceNarrative Tests
// =============================================================================

describe("getDistanceNarrative", () => {
  it("should generate narrative for direct neighbor attack", () => {
    const result = getDistanceNarrative("direct", "Alpha Sector", "Beta Sector");

    expect(result).toContain("Alpha Sector");
    expect(result).toContain("Beta Sector");
    expect(result).toContain("neighboring");
  });

  it("should generate narrative for extended neighbor attack with warning", () => {
    const result = getDistanceNarrative("extended", "Alpha Sector", "Gamma Sector");

    expect(result).toContain("Alpha Sector");
    expect(result).toContain("Gamma Sector");
    expect(result).toContain("long-range");
    expect(result).toContain("supply lines");
  });

  it("should generate narrative for wormhole attack", () => {
    const result = getDistanceNarrative("wormhole", "Alpha Sector", "Omega Sector");

    expect(result).toContain("wormhole");
    expect(result).toContain("Alpha Sector");
    expect(result).toContain("Omega Sector");
  });

  it("should generate narrative for unreachable target", () => {
    const result = getDistanceNarrative("unreachable", "Alpha Sector", "Delta Sector");

    expect(result).toContain("Delta Sector");
    expect(result).toContain("beyond your reach");
  });

  it("should handle all influence types without throwing", () => {
    const types = ["direct", "extended", "wormhole", "unreachable"] as const;
    for (const type of types) {
      expect(() => getDistanceNarrative(type, "Region A", "Region B")).not.toThrow();
    }
  });
});

// =============================================================================
// getForceReductionWarning Tests
// =============================================================================

describe("getForceReductionWarning", () => {
  it("should return null for 1.0x multiplier (no reduction)", () => {
    const result = getForceReductionWarning(
      1.0,
      { soldiers: 100 },
      { soldiers: 100 }
    );

    expect(result).toBeNull();
  });

  it("should return null for multiplier below 1.0", () => {
    const result = getForceReductionWarning(
      0.9,
      { soldiers: 100 },
      { soldiers: 111 }
    );

    expect(result).toBeNull();
  });

  it("should return warning for 1.5x multiplier", () => {
    const result = getForceReductionWarning(
      1.5,
      { soldiers: 150 },
      { soldiers: 100 }
    );

    expect(result).not.toBeNull();
    expect(result).toContain("supply lines");
    expect(result).toContain("150");
    expect(result).toContain("100");
  });

  it("should calculate correct effectiveness percentage", () => {
    const result = getForceReductionWarning(
      1.5,
      { soldiers: 150 },
      { soldiers: 100 }
    );

    // 1 - 1/1.5 = 0.33... ≈ 33% reduction, so ~67% effectiveness
    expect(result).toContain("67%");
  });

  it("should return warning for 1.25x multiplier", () => {
    const result = getForceReductionWarning(
      1.25,
      { soldiers: 125 },
      { soldiers: 100 }
    );

    expect(result).not.toBeNull();
    // 1 - 1/1.25 = 0.2 = 20% reduction, so 80% effectiveness
    expect(result).toContain("80%");
  });

  it("should include sent and effective soldier counts", () => {
    const result = getForceReductionWarning(
      1.5,
      { soldiers: 300 },
      { soldiers: 200 }
    );

    expect(result).toContain("300 soldiers");
    expect(result).toContain("200 effective");
  });
});

// =============================================================================
// getAttackTargetsWithInfo Tests
// =============================================================================

describe("getAttackTargetsWithInfo", () => {
  // Setup common test data
  const regions = new Map([
    ["region-1", { id: "region-1", name: "Core Systems", positionX: "50.00", positionY: "50.00" }],
    ["region-2", { id: "region-2", name: "Inner Rim", positionX: "60.00", positionY: "50.00" }],
    ["region-3", { id: "region-3", name: "Outer Rim", positionX: "80.00", positionY: "50.00" }],
    ["region-4", { id: "region-4", name: "Far Reaches", positionX: "100.00", positionY: "50.00" }],
  ]);

  const connections = [
    {
      id: "conn-1",
      gameId: "game-1",
      fromRegionId: "region-1",
      toRegionId: "region-2",
      connectionType: "adjacent" as const,
      forceMultiplier: "1.00",
      isBidirectional: true,
      travelCost: 0,
      tradeBonus: "1.00",
      wormholeStatus: null,
      discoveredByEmpireId: null,
      discoveredAtTurn: null,
      stabilizedAtTurn: null,
      collapseChance: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const baseEmpireInfluence: EmpireInfluence = {
    id: "influence-1",
    empireId: "attacker",
    gameId: "game-1",
    homeRegionId: "region-1",
    primaryRegionId: "region-1",
    controlledRegionIds: JSON.stringify(["region-1"]),
    directNeighborIds: JSON.stringify(["defender-near"]),
    extendedNeighborIds: JSON.stringify(["defender-far"]),
    knownWormholeIds: JSON.stringify([]),
    totalInfluenceRadius: 3,
    baseInfluenceRadius: 3,
    bonusInfluenceRadius: 0,
    lastCalculatedAtTurn: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should include all required fields in target info", () => {
    const allEmpires = [
      { id: "attacker", name: "Player Empire", networth: 1000000, sectorCount: 10, isEliminated: false },
      { id: "defender-near", name: "Nearby Empire", networth: 500000, sectorCount: 5, isEliminated: false },
    ];

    const empireRegions = new Map([
      ["attacker", "region-1"],
      ["defender-near", "region-2"],
    ]);

    const result = getAttackTargetsWithInfo(
      { id: "attacker", sectorCount: 10 },
      baseEmpireInfluence,
      allEmpires,
      empireRegions,
      regions,
      connections,
      new Set<string>(),
      new Set<string>()
    );

    expect(result.length).toBe(1);
    const target = result[0];
    expect(target).toHaveProperty("empireId");
    expect(target).toHaveProperty("empireName");
    expect(target).toHaveProperty("networth");
    expect(target).toHaveProperty("sectorCount");
    expect(target).toHaveProperty("regionId");
    expect(target).toHaveProperty("regionName");
    expect(target).toHaveProperty("forceMultiplier");
    expect(target).toHaveProperty("influenceType");
    expect(target).toHaveProperty("isInProtection");
    expect(target).toHaveProperty("hasTreaty");
    expect(target).toHaveProperty("canAttack");
  });

  it("should exclude self from targets", () => {
    const allEmpires = [
      { id: "attacker", name: "Player Empire", networth: 1000000, sectorCount: 10, isEliminated: false },
    ];

    const empireRegions = new Map([["attacker", "region-1"]]);

    const result = getAttackTargetsWithInfo(
      { id: "attacker", sectorCount: 10 },
      baseEmpireInfluence,
      allEmpires,
      empireRegions,
      regions,
      connections,
      new Set<string>(),
      new Set<string>()
    );

    expect(result.find((t) => t.empireId === "attacker")).toBeUndefined();
  });

  it("should exclude eliminated empires from targets", () => {
    const allEmpires = [
      { id: "attacker", name: "Player Empire", networth: 1000000, sectorCount: 10, isEliminated: false },
      { id: "eliminated", name: "Dead Empire", networth: 0, sectorCount: 0, isEliminated: true },
    ];

    const empireRegions = new Map([
      ["attacker", "region-1"],
      ["eliminated", "region-2"],
    ]);

    const result = getAttackTargetsWithInfo(
      { id: "attacker", sectorCount: 10 },
      baseEmpireInfluence,
      allEmpires,
      empireRegions,
      regions,
      connections,
      new Set<string>(),
      new Set<string>()
    );

    expect(result.find((t) => t.empireId === "eliminated")).toBeUndefined();
  });

  it("should mark protected empires as not attackable", () => {
    const allEmpires = [
      { id: "attacker", name: "Player Empire", networth: 1000000, sectorCount: 10, isEliminated: false },
      { id: "protected", name: "Protected Empire", networth: 500000, sectorCount: 5, isEliminated: false },
    ];

    const empireRegions = new Map([
      ["attacker", "region-1"],
      ["protected", "region-2"],
    ]);

    const protectedIds = new Set(["protected"]);

    const result = getAttackTargetsWithInfo(
      { id: "attacker", sectorCount: 10 },
      baseEmpireInfluence,
      allEmpires,
      empireRegions,
      regions,
      connections,
      protectedIds,
      new Set<string>()
    );

    const target = result.find((t) => t.empireId === "protected");
    expect(target?.isInProtection).toBe(true);
    expect(target?.canAttack).toBe(false);
    expect(target?.reason).toContain("protection");
  });

  it("should mark treaty partners as not attackable", () => {
    const allEmpires = [
      { id: "attacker", name: "Player Empire", networth: 1000000, sectorCount: 10, isEliminated: false },
      { id: "ally", name: "Allied Empire", networth: 500000, sectorCount: 5, isEliminated: false },
    ];

    const empireRegions = new Map([
      ["attacker", "region-1"],
      ["ally", "region-2"],
    ]);

    const treatyIds = new Set(["ally"]);

    const result = getAttackTargetsWithInfo(
      { id: "attacker", sectorCount: 10 },
      baseEmpireInfluence,
      allEmpires,
      empireRegions,
      regions,
      connections,
      new Set<string>(),
      treatyIds
    );

    const target = result.find((t) => t.empireId === "ally");
    expect(target?.hasTreaty).toBe(true);
    expect(target?.canAttack).toBe(false);
    expect(target?.reason).toContain("treaty");
  });

  it("should sort attackable targets before unattackable ones", () => {
    const allEmpires = [
      { id: "attacker", name: "Player", networth: 1000000, sectorCount: 10, isEliminated: false },
      { id: "enemy", name: "Enemy", networth: 500000, sectorCount: 5, isEliminated: false },
      { id: "protected", name: "Protected", networth: 800000, sectorCount: 8, isEliminated: false },
    ];

    const empireRegions = new Map([
      ["attacker", "region-1"],
      ["enemy", "region-2"],
      ["protected", "region-2"],
    ]);

    const result = getAttackTargetsWithInfo(
      { id: "attacker", sectorCount: 10 },
      baseEmpireInfluence,
      allEmpires,
      empireRegions,
      regions,
      connections,
      new Set(["protected"]),
      new Set<string>()
    );

    // Find indices
    const attackableTargets = result.filter((t) => t.canAttack);
    const unattackableTargets = result.filter((t) => !t.canAttack);

    // Attackable should come first
    if (attackableTargets.length > 0 && unattackableTargets.length > 0) {
      const firstAttackableIndex = result.findIndex((t) => t.canAttack);
      const firstUnattackableIndex = result.findIndex((t) => !t.canAttack);
      expect(firstAttackableIndex).toBeLessThan(firstUnattackableIndex);
    }
  });

  it("should sort by networth within same attackability", () => {
    const allEmpires = [
      { id: "attacker", name: "Player", networth: 1000000, sectorCount: 10, isEliminated: false },
      { id: "weak", name: "Weak", networth: 100000, sectorCount: 3, isEliminated: false },
      { id: "strong", name: "Strong", networth: 900000, sectorCount: 15, isEliminated: false },
      { id: "medium", name: "Medium", networth: 500000, sectorCount: 8, isEliminated: false },
    ];

    const empireRegions = new Map([
      ["attacker", "region-1"],
      ["weak", "region-2"],
      ["strong", "region-2"],
      ["medium", "region-2"],
    ]);

    const result = getAttackTargetsWithInfo(
      { id: "attacker", sectorCount: 10 },
      baseEmpireInfluence,
      allEmpires,
      empireRegions,
      regions,
      connections,
      new Set<string>(),
      new Set<string>()
    );

    // All attackable, sorted by networth descending
    const attackable = result.filter((t) => t.canAttack);
    for (let i = 0; i < attackable.length - 1; i++) {
      expect(attackable[i]!.networth).toBeGreaterThanOrEqual(attackable[i + 1]!.networth);
    }
  });

  it("should handle empty empire list", () => {
    const result = getAttackTargetsWithInfo(
      { id: "attacker", sectorCount: 10 },
      baseEmpireInfluence,
      [{ id: "attacker", name: "Player", networth: 1000000, sectorCount: 10, isEliminated: false }],
      new Map([["attacker", "region-1"]]),
      regions,
      connections,
      new Set<string>(),
      new Set<string>()
    );

    expect(result).toHaveLength(0);
  });

  it("should handle unknown region gracefully", () => {
    const allEmpires = [
      { id: "attacker", name: "Player", networth: 1000000, sectorCount: 10, isEliminated: false },
      { id: "unknown-region", name: "Unknown", networth: 500000, sectorCount: 5, isEliminated: false },
    ];

    const empireRegions = new Map([
      ["attacker", "region-1"],
      ["unknown-region", "non-existent-region"],
    ]);

    const result = getAttackTargetsWithInfo(
      { id: "attacker", sectorCount: 10 },
      baseEmpireInfluence,
      allEmpires,
      empireRegions,
      regions,
      connections,
      new Set<string>(),
      new Set<string>()
    );

    const target = result.find((t) => t.empireId === "unknown-region");
    expect(target?.regionName).toBe("Unknown");
  });
});

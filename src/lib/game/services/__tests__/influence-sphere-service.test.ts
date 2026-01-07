/**
 * Tests for Influence Sphere Service
 *
 * Tests the sphere of influence calculation system that determines
 * which empires can attack which targets.
 */

import { describe, it, expect } from "vitest";
import {
  calculateInfluenceRadius,
  calculateRegionDistance,
  getEmpiresbyDistance,
  calculateInfluenceSphere,
  validateAttack,
  getValidAttackTargets,
  inheritNeighborsFromEliminated,
  INFLUENCE_CONSTANTS,
} from "../influence-sphere-service";

describe("calculateInfluenceRadius", () => {
  it("should return base radius for starting empire", () => {
    const result = calculateInfluenceRadius(6); // Starting sectors
    expect(result.base).toBe(3);
    expect(result.bonus).toBe(0);
    expect(result.total).toBe(3);
  });

  it("should add bonus radius for more sectors", () => {
    // +1 per 5 sectors beyond 6
    const result = calculateInfluenceRadius(16); // 6 + 10 = 16
    expect(result.bonus).toBe(2); // 10 / 5 = 2
    expect(result.total).toBe(5);
  });

  it("should cap at maximum neighbors", () => {
    const result = calculateInfluenceRadius(100);
    expect(result.total).toBeLessThanOrEqual(INFLUENCE_CONSTANTS.MAX_DIRECT_NEIGHBORS);
  });

  it("should include research bonus", () => {
    const result = calculateInfluenceRadius(6, 10);
    expect(result.bonus).toBe(1); // 10 / 10 = 1
    expect(result.total).toBe(4);
  });
});

describe("calculateRegionDistance", () => {
  it("should calculate correct distance between regions", () => {
    const region1 = { positionX: "0.00", positionY: "0.00" };
    const region2 = { positionX: "3.00", positionY: "4.00" };

    const distance = calculateRegionDistance(region1, region2);
    expect(distance).toBe(5); // 3-4-5 triangle
  });

  it("should return 0 for same position", () => {
    const region = { positionX: "10.00", positionY: "20.00" };
    const distance = calculateRegionDistance(region, region);
    expect(distance).toBe(0);
  });
});

describe("getEmpiresbyDistance", () => {
  const regions = new Map([
    ["region-1", { id: "region-1", name: "Core", positionX: "50.00", positionY: "50.00" }],
    ["region-2", { id: "region-2", name: "Inner", positionX: "60.00", positionY: "50.00" }],
    ["region-3", { id: "region-3", name: "Outer", positionX: "80.00", positionY: "50.00" }],
  ]);

  const empires = [
    { id: "empire-1", regionId: "region-1", name: "Player", isEliminated: false },
    { id: "empire-2", regionId: "region-2", name: "Neighbor", isEliminated: false },
    { id: "empire-3", regionId: "region-3", name: "Distant", isEliminated: false },
    { id: "empire-4", regionId: "region-2", name: "Eliminated", isEliminated: true },
  ];

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

  it("should return empires sorted by distance", () => {
    const result = getEmpiresbyDistance(
      { id: "empire-1", regionId: "region-1" },
      empires,
      regions,
      connections
    );

    // Should have 2 neighbors (not self, not eliminated)
    expect(result).toHaveLength(2);

    // Nearest should be first
    expect(result[0]!.empireId).toBe("empire-2");
    expect(result[1]!.empireId).toBe("empire-3");
  });

  it("should mark direct neighbors correctly", () => {
    const result = getEmpiresbyDistance(
      { id: "empire-1", regionId: "region-1" },
      empires,
      regions,
      connections
    );

    // empire-2 is directly connected
    const neighbor = result.find((n) => n.empireId === "empire-2");
    expect(neighbor?.connectionType).toBe("direct");
    expect(neighbor?.forceMultiplier).toBe(1.0);
  });

  it("should exclude eliminated empires", () => {
    const result = getEmpiresbyDistance(
      { id: "empire-1", regionId: "region-1" },
      empires,
      regions,
      connections
    );

    const eliminated = result.find((n) => n.empireId === "empire-4");
    expect(eliminated).toBeUndefined();
  });
});

describe("calculateInfluenceSphere", () => {
  const regions = new Map([
    ["region-1", { id: "region-1", name: "Core", positionX: "50.00", positionY: "50.00" }],
    ["region-2", { id: "region-2", name: "Inner", positionX: "60.00", positionY: "50.00" }],
    ["region-3", { id: "region-3", name: "Outer", positionX: "70.00", positionY: "50.00" }],
    ["region-4", { id: "region-4", name: "Rim", positionX: "80.00", positionY: "50.00" }],
    ["region-5", { id: "region-5", name: "Void", positionX: "90.00", positionY: "50.00" }],
  ]);

  const empires = [
    { id: "empire-1", regionId: "region-1", name: "Player", isEliminated: false },
    { id: "empire-2", regionId: "region-2", name: "Bot1", isEliminated: false },
    { id: "empire-3", regionId: "region-3", name: "Bot2", isEliminated: false },
    { id: "empire-4", regionId: "region-4", name: "Bot3", isEliminated: false },
    { id: "empire-5", regionId: "region-5", name: "Bot4", isEliminated: false },
  ];

  it("should categorize neighbors based on radius", () => {
    const empire = { id: "empire-1", sectorCount: 6 }; // radius = 3
    const influence = {
      homeRegionId: "region-1",
      primaryRegionId: "region-1",
    };

    const result = calculateInfluenceSphere(
      empire,
      influence,
      empires,
      regions,
      []
    );

    // With radius 3, should have 3 direct neighbors
    expect(result.directNeighbors).toHaveLength(3);
    expect(result.totalRadius).toBe(3);
  });

  it("should expand sphere with more sectors", () => {
    const empire = { id: "empire-1", sectorCount: 16 }; // radius = 5 (3 + 2)
    const influence = {
      homeRegionId: "region-1",
      primaryRegionId: "region-1",
    };

    const result = calculateInfluenceSphere(
      empire,
      influence,
      empires,
      regions,
      []
    );

    // With larger radius, all should be in direct neighbors
    expect(result.directNeighbors.length).toBeGreaterThan(3);
  });
});

describe("validateAttack", () => {
  it("should allow attack on direct neighbor", () => {
    const influenceSphere = {
      directNeighbors: ["defender-1"],
      extendedNeighbors: ["defender-2"],
      distantEmpires: ["defender-3"],
      totalRadius: 3,
    };

    const result = validateAttack("attacker-1", "defender-1", influenceSphere);

    expect(result.canAttack).toBe(true);
    expect(result.forceMultiplier).toBe(INFLUENCE_CONSTANTS.DIRECT_FORCE_MULTIPLIER);
  });

  it("should allow attack on extended neighbor with penalty", () => {
    const influenceSphere = {
      directNeighbors: ["defender-1"],
      extendedNeighbors: ["defender-2"],
      distantEmpires: ["defender-3"],
      totalRadius: 3,
    };

    const result = validateAttack("attacker-1", "defender-2", influenceSphere);

    expect(result.canAttack).toBe(true);
    expect(result.forceMultiplier).toBe(INFLUENCE_CONSTANTS.EXTENDED_FORCE_MULTIPLIER);
  });

  it("should deny attack on distant empire", () => {
    const influenceSphere = {
      directNeighbors: ["defender-1"],
      extendedNeighbors: ["defender-2"],
      distantEmpires: ["defender-3"],
      totalRadius: 3,
    };

    const result = validateAttack("attacker-1", "defender-3", influenceSphere);

    expect(result.canAttack).toBe(false);
    expect(result.reason).toBeDefined();
  });
});

describe("getValidAttackTargets", () => {
  it("should return all attackable targets with multipliers", () => {
    const influenceSphere = {
      directNeighbors: ["empire-2", "empire-3"],
      extendedNeighbors: ["empire-4"],
      distantEmpires: ["empire-5"],
      totalRadius: 3,
    };

    const empireMap = new Map([
      ["empire-2", { id: "empire-2", name: "Neighbor 1", networth: 100000 }],
      ["empire-3", { id: "empire-3", name: "Neighbor 2", networth: 150000 }],
      ["empire-4", { id: "empire-4", name: "Extended", networth: 200000 }],
      ["empire-5", { id: "empire-5", name: "Distant", networth: 250000 }],
    ]);

    const targets = getValidAttackTargets(influenceSphere, empireMap);

    // Should have 3 targets (not distant)
    expect(targets).toHaveLength(3);

    // Check direct neighbors
    const direct = targets.filter((t) => t.influenceType === "direct");
    expect(direct).toHaveLength(2);
    expect(direct[0]!.forceMultiplier).toBe(1.0);

    // Check extended
    const extended = targets.filter((t) => t.influenceType === "extended");
    expect(extended).toHaveLength(1);
    expect(extended[0]!.forceMultiplier).toBe(1.5);
  });
});

describe("inheritNeighborsFromEliminated", () => {
  it("should inherit eliminated empire's neighbors", () => {
    const eliminatedNeighbors = ["empire-3", "empire-4", "empire-5"];
    const conquerorInfluence = {
      directNeighbors: ["eliminated-empire", "empire-3"],
      extendedNeighbors: [],
      distantEmpires: ["empire-4", "empire-5"],
      totalRadius: 3,
    };

    const result = inheritNeighborsFromEliminated(
      "eliminated-empire",
      eliminatedNeighbors,
      "conqueror",
      conquerorInfluence
    );

    // empire-4 and empire-5 should now be reachable
    expect(result.newExtendedNeighbors).toContain("empire-4");
    expect(result.newExtendedNeighbors).toContain("empire-5");
  });

  it("should promote extended neighbors to direct", () => {
    const eliminatedNeighbors = ["empire-3"];
    const conquerorInfluence = {
      directNeighbors: ["eliminated-empire"],
      extendedNeighbors: ["empire-3"],
      distantEmpires: [],
      totalRadius: 3,
    };

    const result = inheritNeighborsFromEliminated(
      "eliminated-empire",
      eliminatedNeighbors,
      "conqueror",
      conquerorInfluence
    );

    // empire-3 was extended, now should be direct
    expect(result.newDirectNeighbors).toContain("empire-3");
  });
});

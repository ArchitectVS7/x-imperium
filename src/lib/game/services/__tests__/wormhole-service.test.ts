/**
 * Tests for Wormhole Service
 *
 * Tests the wormhole discovery, stabilization, and collapse mechanics.
 */

import { describe, it, expect } from "vitest";
import {
  calculateDiscoveryChance,
  attemptWormholeDiscovery,
  canStabilizeWormhole,
  stabilizeWormhole,
  checkWormholeCollapse,
  checkWormholeReopen,
  processWormholesTurn,
  WORMHOLE_CONSTANTS,
} from "../geography/wormhole-service";

describe("calculateDiscoveryChance", () => {
  it("should return base chance with no bonuses", () => {
    const chance = calculateDiscoveryChance(0, 0);
    expect(chance).toBe(WORMHOLE_CONSTANTS.BASE_DISCOVERY_CHANCE);
  });

  it("should add covert agent bonus", () => {
    const chance = calculateDiscoveryChance(3, 0);
    const expected =
      WORMHOLE_CONSTANTS.BASE_DISCOVERY_CHANCE +
      3 * WORMHOLE_CONSTANTS.COVERT_AGENT_DISCOVERY_BONUS;
    expect(chance).toBe(expected);
  });

  it("should cap covert agent contribution at 5", () => {
    const chance5 = calculateDiscoveryChance(5, 0);
    const chance10 = calculateDiscoveryChance(10, 0);
    expect(chance5).toBe(chance10); // Both capped at 5 agents
  });

  it("should add research bonus", () => {
    const chance = calculateDiscoveryChance(0, 10);
    const expected =
      WORMHOLE_CONSTANTS.BASE_DISCOVERY_CHANCE +
      10 * WORMHOLE_CONSTANTS.RESEARCH_LEVEL_DISCOVERY_BONUS;
    expect(chance).toBe(expected);
  });

  it("should cap at maximum discovery chance", () => {
    const chance = calculateDiscoveryChance(10, 100); // High values
    expect(chance).toBeLessThanOrEqual(WORMHOLE_CONSTANTS.MAX_DISCOVERY_CHANCE);
  });
});

describe("attemptWormholeDiscovery", () => {
  const empire = {
    id: "empire-1",
    covertAgents: 5,
    fundamentalResearchLevel: 5,
  };

  const undiscoveredWormholes = [
    {
      id: "wormhole-1",
      fromRegionId: "region-1",
      fromRegionName: "Core Sector",
      toRegionId: "region-5",
      toRegionName: "Void Reaches",
    },
  ];

  it("should return not discovered with high random roll", () => {
    const result = attemptWormholeDiscovery(
      empire,
      undiscoveredWormholes,
      "region-1",
      () => 0.99 // High roll = no discovery
    );

    expect(result.discovered).toBe(false);
    expect(result.connectionId).toBeUndefined();
  });

  it("should discover wormhole with low random roll", () => {
    const result = attemptWormholeDiscovery(
      empire,
      undiscoveredWormholes,
      "region-1",
      () => 0.01 // Low roll = discovery
    );

    expect(result.discovered).toBe(true);
    expect(result.connectionId).toBe("wormhole-1");
    expect(result.fromRegionName).toBe("Core Sector");
    expect(result.toRegionName).toBe("Void Reaches");
  });

  it("should return no discovery if no wormholes available", () => {
    const result = attemptWormholeDiscovery(
      empire,
      [], // No wormholes
      "region-1",
      () => 0.01
    );

    expect(result.discovered).toBe(false);
  });
});

describe("canStabilizeWormhole", () => {
  it("should allow stabilization with sufficient resources", () => {
    const empire = {
      credits: 100000,
      fundamentalResearchLevel: 10,
    };

    const result = canStabilizeWormhole(empire, "discovered");
    expect(result.canStabilize).toBe(true);
  });

  it("should deny if already stabilized", () => {
    const empire = {
      credits: 100000,
      fundamentalResearchLevel: 10,
    };

    const result = canStabilizeWormhole(empire, "stabilized");
    expect(result.canStabilize).toBe(false);
    expect(result.reason).toContain("already stabilized");
  });

  it("should deny if collapsed", () => {
    const empire = {
      credits: 100000,
      fundamentalResearchLevel: 10,
    };

    const result = canStabilizeWormhole(empire, "collapsed");
    expect(result.canStabilize).toBe(false);
    expect(result.reason).toContain("collapsed");
  });

  it("should deny if insufficient research", () => {
    const empire = {
      credits: 100000,
      fundamentalResearchLevel: 2, // Below requirement
    };

    const result = canStabilizeWormhole(empire, "discovered");
    expect(result.canStabilize).toBe(false);
    expect(result.reason).toContain("research level");
  });

  it("should deny if insufficient credits", () => {
    const empire = {
      credits: 1000, // Not enough
      fundamentalResearchLevel: 10,
    };

    const result = canStabilizeWormhole(empire, "discovered");
    expect(result.canStabilize).toBe(false);
    expect(result.reason).toContain("credits");
  });
});

describe("stabilizeWormhole", () => {
  it("should stabilize and deduct credits", () => {
    const empire = {
      id: "empire-1",
      credits: 100000,
      fundamentalResearchLevel: 10,
    };

    const wormhole = {
      id: "wormhole-1",
      wormholeStatus: "discovered" as const,
    };

    const result = stabilizeWormhole(empire, wormhole);

    expect(result.success).toBe(true);
    expect(result.creditsSpent).toBe(WORMHOLE_CONSTANTS.STABILIZATION_COST);
    expect(result.newCollapseChance).toBe(0);
  });

  it("should fail if cannot stabilize", () => {
    const empire = {
      id: "empire-1",
      credits: 100,
      fundamentalResearchLevel: 10,
    };

    const wormhole = {
      id: "wormhole-1",
      wormholeStatus: "discovered" as const,
    };

    const result = stabilizeWormhole(empire, wormhole);

    expect(result.success).toBe(false);
    expect(result.creditsSpent).toBe(0);
  });
});

describe("checkWormholeCollapse", () => {
  it("should not collapse stabilized wormholes", () => {
    const wormhole = {
      id: "wormhole-1",
      wormholeStatus: "stabilized" as const,
      collapseChance: "0.05",
    };

    const result = checkWormholeCollapse(wormhole, 10, () => 0.01);
    expect(result.collapsed).toBe(false);
  });

  it("should collapse discovered wormhole with low roll", () => {
    const wormhole = {
      id: "wormhole-1",
      wormholeStatus: "discovered" as const,
      collapseChance: "0.05",
    };

    const result = checkWormholeCollapse(wormhole, 0, () => 0.01);
    expect(result.collapsed).toBe(true);
    expect(result.connectionId).toBe("wormhole-1");
  });

  it("should not collapse with high roll", () => {
    const wormhole = {
      id: "wormhole-1",
      wormholeStatus: "discovered" as const,
      collapseChance: "0.05",
    };

    const result = checkWormholeCollapse(wormhole, 0, () => 0.99);
    expect(result.collapsed).toBe(false);
  });

  it("should increase collapse chance over time", () => {
    const wormhole = {
      id: "wormhole-1",
      wormholeStatus: "discovered" as const,
      collapseChance: "0.05",
    };

    // With 100 turns: adjustedChance = min(0.05 * 2.0, 0.25) = 0.10
    // Roll of 0.09 < 0.10 should collapse
    const result = checkWormholeCollapse(wormhole, 100, () => 0.09);
    expect(result.collapsed).toBe(true);
  });
});

describe("checkWormholeReopen", () => {
  it("should only check collapsed wormholes", () => {
    const wormhole = {
      id: "wormhole-1",
      wormholeStatus: "discovered" as const,
    };

    const result = checkWormholeReopen(wormhole, () => 0.001);
    expect(result.reopened).toBe(false);
  });

  it("should reopen collapsed wormhole with very low roll", () => {
    const wormhole = {
      id: "wormhole-1",
      wormholeStatus: "collapsed" as const,
    };

    const result = checkWormholeReopen(wormhole, () => 0.001);
    expect(result.reopened).toBe(true);
  });
});

describe("processWormholesTurn", () => {
  it("should process multiple wormholes", () => {
    const wormholes = [
      {
        id: "wh-1",
        gameId: "game-1",
        fromRegionId: "r1",
        toRegionId: "r2",
        connectionType: "wormhole" as const,
        wormholeStatus: "discovered" as const,
        collapseChance: "0.05",
        discoveredAtTurn: 1,
        forceMultiplier: "1.00",
        travelCost: 0,
        tradeBonus: "1.00",
        discoveredByEmpireId: null,
        stabilizedAtTurn: null,
        isBidirectional: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "wh-2",
        gameId: "game-1",
        fromRegionId: "r3",
        toRegionId: "r4",
        connectionType: "wormhole" as const,
        wormholeStatus: "collapsed" as const,
        collapseChance: "0.00",
        discoveredAtTurn: 1,
        forceMultiplier: "1.00",
        travelCost: 0,
        tradeBonus: "1.00",
        discoveredByEmpireId: null,
        stabilizedAtTurn: null,
        isBidirectional: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Use deterministic random for testing
    let callCount = 0;
    const fakeRandom = () => {
      callCount++;
      return callCount === 1 ? 0.01 : 0.001; // First: collapse, Second: reopen
    };

    const result = processWormholesTurn(wormholes, 10, fakeRandom);

    expect(result.collapsed).toHaveLength(1);
    expect(result.collapsed[0]).toBe("wh-1");
    expect(result.reopened).toHaveLength(1);
    expect(result.reopened[0]).toBe("wh-2");
  });

  it("should auto-stabilize old wormholes", () => {
    const wormholes = [
      {
        id: "wh-old",
        gameId: "game-1",
        fromRegionId: "r1",
        toRegionId: "r2",
        connectionType: "wormhole" as const,
        wormholeStatus: "discovered" as const,
        collapseChance: "0.05",
        discoveredAtTurn: 1,
        forceMultiplier: "1.00",
        travelCost: 0,
        tradeBonus: "1.00",
        discoveredByEmpireId: null,
        stabilizedAtTurn: null,
        isBidirectional: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Turn 100, discovered at turn 1 = 99 turns old > 50 auto-stabilize threshold
    const result = processWormholesTurn(wormholes, 100);

    expect(result.autoStabilized).toHaveLength(1);
    expect(result.autoStabilized[0]).toBe("wh-old");
    expect(result.collapsed).toHaveLength(0); // Should not collapse, was auto-stabilized
  });
});

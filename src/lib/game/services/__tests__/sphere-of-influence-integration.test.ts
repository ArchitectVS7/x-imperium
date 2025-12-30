/**
 * Sphere of Influence Integration Test
 *
 * Tests the complete flow: "Who can I attack?"
 *
 * This is a critical validation test before moving forward with
 * any other features. The sphere of influence MUST correctly
 * restrict attacks to nearby empires.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  generateGalaxy,
  createSeededRandom,
} from "../galaxy-generation-service";
import {
  calculateInfluenceSphere,
  validateAttack,
  INFLUENCE_CONSTANTS,
} from "../influence-sphere-service";
import {
  attemptWormholeDiscovery,
  WORMHOLE_CONSTANTS,
} from "../wormhole-service";
import {
  validateAttackWithInfluence,
  getAttackTargetsWithInfo,
} from "../attack-validation-service";

describe("Sphere of Influence Integration", () => {
  // Shared test data
  const gameId = "test-game-001";
  const seed = 12345; // Deterministic for reproducible tests

  // Generate a small galaxy for testing
  const empires = [
    { id: "player", type: "player" as const, planetCount: 6 },
    ...Array.from({ length: 9 }, (_, i) => ({
      id: `bot-${i}`,
      type: "bot" as const,
      planetCount: 6,
    })),
  ];

  let galaxy: ReturnType<typeof generateGalaxy>;
  let regions: Map<string, { id: string; name: string; positionX: string; positionY: string }>;
  let empireRegions: Map<string, string>;

  beforeAll(() => {
    // Generate galaxy once for all tests
    galaxy = generateGalaxy(gameId, empires, { seed });

    // Build region lookup map
    regions = new Map();
    galaxy.regions.forEach((r, i) => {
      const id = `region-${i}`;
      regions.set(id, {
        id,
        name: r.name,
        positionX: r.positionX as string,
        positionY: r.positionY as string,
      });
    });

    // Build empire-to-region map
    empireRegions = galaxy.empireAssignments;
  });

  describe("Attack Validation - Basic Cases", () => {
    it("should allow attack on direct neighbor", () => {
      // Get player's influence record
      const playerInfluence = galaxy.empireInfluenceRecords.find(
        (r) => r.empireId === "player"
      )!;

      // Calculate influence sphere
      const allEmpiresWithRegions = empires.map((e) => ({
        id: e.id,
        name: e.id,
        regionId: empireRegions.get(e.id) ?? playerInfluence.homeRegionId,
        isEliminated: false,
      }));

      const sphere = calculateInfluenceSphere(
        { id: "player", planetCount: 6 },
        {
          homeRegionId: playerInfluence.homeRegionId,
          primaryRegionId: playerInfluence.primaryRegionId,
        },
        allEmpiresWithRegions,
        regions,
        [...galaxy.connections, ...galaxy.wormholes]
      );

      // Should have some direct neighbors
      expect(sphere.directNeighbors.length).toBeGreaterThan(0);

      // Attack on first direct neighbor should be valid
      const directNeighbor = sphere.directNeighbors[0]!;
      const validation = validateAttack("player", directNeighbor, sphere);

      expect(validation.canAttack).toBe(true);
      expect(validation.forceMultiplier).toBe(INFLUENCE_CONSTANTS.DIRECT_FORCE_MULTIPLIER);
    });

    it("should allow attack on extended neighbor with 1.5x penalty", () => {
      const playerInfluence = galaxy.empireInfluenceRecords.find(
        (r) => r.empireId === "player"
      )!;

      const allEmpiresWithRegions = empires.map((e) => ({
        id: e.id,
        name: e.id,
        regionId: empireRegions.get(e.id) ?? playerInfluence.homeRegionId,
        isEliminated: false,
      }));

      const sphere = calculateInfluenceSphere(
        { id: "player", planetCount: 6 },
        {
          homeRegionId: playerInfluence.homeRegionId,
          primaryRegionId: playerInfluence.primaryRegionId,
        },
        allEmpiresWithRegions,
        regions,
        [...galaxy.connections, ...galaxy.wormholes]
      );

      // If we have extended neighbors, test them
      if (sphere.extendedNeighbors.length > 0) {
        const extendedNeighbor = sphere.extendedNeighbors[0]!;
        const validation = validateAttack("player", extendedNeighbor, sphere);

        expect(validation.canAttack).toBe(true);
        expect(validation.forceMultiplier).toBe(INFLUENCE_CONSTANTS.EXTENDED_FORCE_MULTIPLIER);
      }
    });

    it("should REJECT attack on distant empire", () => {
      const playerInfluence = galaxy.empireInfluenceRecords.find(
        (r) => r.empireId === "player"
      )!;

      const allEmpiresWithRegions = empires.map((e) => ({
        id: e.id,
        name: e.id,
        regionId: empireRegions.get(e.id) ?? playerInfluence.homeRegionId,
        isEliminated: false,
      }));

      const sphere = calculateInfluenceSphere(
        { id: "player", planetCount: 6 },
        {
          homeRegionId: playerInfluence.homeRegionId,
          primaryRegionId: playerInfluence.primaryRegionId,
        },
        allEmpiresWithRegions,
        regions,
        [...galaxy.connections, ...galaxy.wormholes]
      );

      // If we have distant empires, test rejection
      if (sphere.distantEmpires.length > 0) {
        const distantEmpire = sphere.distantEmpires[0]!;
        const validation = validateAttack("player", distantEmpire, sphere);

        expect(validation.canAttack).toBe(false);
        expect(validation.reason).toBeDefined();
        expect(validation.reason).toContain("outside");
      }
    });
  });

  describe("Influence Sphere Expansion", () => {
    it("should expand sphere with more planets", () => {
      const playerInfluence = galaxy.empireInfluenceRecords.find(
        (r) => r.empireId === "player"
      )!;

      const allEmpiresWithRegions = empires.map((e) => ({
        id: e.id,
        name: e.id,
        regionId: empireRegions.get(e.id) ?? playerInfluence.homeRegionId,
        isEliminated: false,
      }));

      // Small empire (6 planets = starting)
      const smallSphere = calculateInfluenceSphere(
        { id: "player", planetCount: 6 },
        {
          homeRegionId: playerInfluence.homeRegionId,
          primaryRegionId: playerInfluence.primaryRegionId,
        },
        allEmpiresWithRegions,
        regions,
        [...galaxy.connections, ...galaxy.wormholes]
      );

      // Large empire (20 planets)
      const largeSphere = calculateInfluenceSphere(
        { id: "player", planetCount: 20 },
        {
          homeRegionId: playerInfluence.homeRegionId,
          primaryRegionId: playerInfluence.primaryRegionId,
        },
        allEmpiresWithRegions,
        regions,
        [...galaxy.connections, ...galaxy.wormholes]
      );

      // Large empire should have bigger radius
      expect(largeSphere.totalRadius).toBeGreaterThan(smallSphere.totalRadius);
    });
  });

  describe("Force Multiplier Application", () => {
    it("should reduce effective forces for extended attacks", () => {
      const forces = {
        soldiers: 100,
        fighters: 50,
        lightCruisers: 10,
        heavyCruisers: 5,
        carriers: 2,
        stations: 0,
      };

      const sphere = {
        directNeighbors: ["neighbor-1"],
        extendedNeighbors: ["neighbor-2"],
        distantEmpires: ["distant-1"],
        totalRadius: 3,
      };

      // Direct attack - full force
      const directValidation = validateAttackWithInfluence(
        "player",
        "neighbor-1",
        sphere,
        forces,
        false, // not protected
        false  // no treaty
      );

      expect(directValidation.valid).toBe(true);
      expect(directValidation.adjustedForces?.soldiers).toBe(100);

      // Extended attack - reduced force
      const extendedValidation = validateAttackWithInfluence(
        "player",
        "neighbor-2",
        sphere,
        forces,
        false,
        false
      );

      expect(extendedValidation.valid).toBe(true);
      // 100 soldiers / 1.5 multiplier = 66 effective soldiers
      expect(extendedValidation.adjustedForces?.soldiers).toBe(66);
    });

    it("should reject attack on protected empire", () => {
      const sphere = {
        directNeighbors: ["neighbor-1"],
        extendedNeighbors: [],
        distantEmpires: [],
        totalRadius: 3,
      };

      const validation = validateAttackWithInfluence(
        "player",
        "neighbor-1",
        sphere,
        { soldiers: 100, fighters: 0, lightCruisers: 0, heavyCruisers: 0, carriers: 0, stations: 0 },
        true,  // IS protected
        false
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("Target empire is under protection");
    });

    it("should reject attack on treaty partner", () => {
      const sphere = {
        directNeighbors: ["neighbor-1"],
        extendedNeighbors: [],
        distantEmpires: [],
        totalRadius: 3,
      };

      const validation = validateAttackWithInfluence(
        "player",
        "neighbor-1",
        sphere,
        { soldiers: 100, fighters: 0, lightCruisers: 0, heavyCruisers: 0, carriers: 0, stations: 0 },
        false,
        true  // HAS treaty
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("Cannot attack empire with active treaty");
    });
  });

  describe("Wormhole Discovery", () => {
    it("should discover wormhole with low roll and covert agents", () => {
      const empire = {
        id: "player",
        covertAgents: 5,  // +5% chance
        fundamentalResearchLevel: 10, // +5% chance
        // Total: 2% + 5% + 5% = 12% chance
      };

      // Get undiscovered wormholes
      const undiscoveredWormholes = galaxy.wormholes
        .filter((w) => w.wormholeStatus === "undiscovered")
        .map((w, i) => ({
          id: `wormhole-${i}`,
          fromRegionId: w.fromRegionId,
          fromRegionName: regions.get(w.fromRegionId)?.name ?? "Unknown",
          toRegionId: w.toRegionId,
          toRegionName: regions.get(w.toRegionId)?.name ?? "Unknown",
        }));

      if (undiscoveredWormholes.length > 0) {
        // Force discovery with low random roll
        const result = attemptWormholeDiscovery(
          empire,
          undiscoveredWormholes,
          empireRegions.get("player") ?? "region-0",
          () => 0.01 // Very low roll = guaranteed discovery
        );

        expect(result.discovered).toBe(true);
        expect(result.connectionId).toBeDefined();
      }
    });

    it("should NOT discover wormhole with high roll", () => {
      const empire = {
        id: "player",
        covertAgents: 0,
        fundamentalResearchLevel: 0,
        // Only 2% base chance
      };

      const undiscoveredWormholes = galaxy.wormholes
        .filter((w) => w.wormholeStatus === "undiscovered")
        .map((w, i) => ({
          id: `wormhole-${i}`,
          fromRegionId: w.fromRegionId,
          fromRegionName: regions.get(w.fromRegionId)?.name ?? "Unknown",
          toRegionId: w.toRegionId,
          toRegionName: regions.get(w.toRegionId)?.name ?? "Unknown",
        }));

      if (undiscoveredWormholes.length > 0) {
        // Force no discovery with high random roll
        const result = attemptWormholeDiscovery(
          empire,
          undiscoveredWormholes,
          empireRegions.get("player") ?? "region-0",
          () => 0.99 // High roll = no discovery
        );

        expect(result.discovered).toBe(false);
      }
    });
  });

  describe("Galaxy Generation Validity", () => {
    it("should generate valid connected galaxy", () => {
      // All regions should exist
      expect(galaxy.regions.length).toBeGreaterThan(0);

      // Should have connections
      expect(galaxy.connections.length).toBeGreaterThan(0);

      // All empires should be assigned to regions
      expect(galaxy.empireAssignments.size).toBe(empires.length);

      // All empires should have influence records
      expect(galaxy.empireInfluenceRecords.length).toBe(empires.length);
    });

    it("should place wormholes between distant regions", () => {
      if (galaxy.wormholes.length > 0) {
        for (const wormhole of galaxy.wormholes) {
          expect(wormhole.connectionType).toBe("wormhole");
          expect(wormhole.wormholeStatus).toBe("undiscovered");
        }
      }
    });

    it("should not place player in core region", () => {
      const playerRegionId = galaxy.empireAssignments.get("player");
      const playerRegion = galaxy.regions.find((_, i) => `region-${i}` === playerRegionId);

      // Player should be in inner or outer, not core (for fairness)
      if (playerRegion) {
        expect(playerRegion.regionType).not.toBe("core");
      }
    });
  });

  describe("Attack Target List", () => {
    it("should return targets sorted by attackability", () => {
      const playerInfluence = galaxy.empireInfluenceRecords.find(
        (r) => r.empireId === "player"
      )!;

      const allEmpiresWithInfo = empires.map((e) => ({
        id: e.id,
        name: e.id,
        networth: 100000,
        planetCount: 6,
        isEliminated: false,
      }));

      const targets = getAttackTargetsWithInfo(
        { id: "player", planetCount: 6 },
        {
          ...playerInfluence,
          directNeighborIds: "[]",
          extendedNeighborIds: "[]",
          knownWormholeIds: "[]",
          controlledRegionIds: JSON.stringify([playerInfluence.homeRegionId]),
        } as any,
        allEmpiresWithInfo,
        empireRegions,
        regions,
        [...galaxy.connections, ...galaxy.wormholes],
        new Set(), // No protected empires
        new Set()  // No treaty partners
      );

      // Should have targets
      expect(targets.length).toBeGreaterThan(0);

      // Attackable targets should be first
      const attackableTargets = targets.filter((t) => t.canAttack);
      const unattackableTargets = targets.filter((t) => !t.canAttack);

      // All attackable should come before unattackable in the list
      if (attackableTargets.length > 0 && unattackableTargets.length > 0) {
        const lastAttackableIndex = targets.findIndex(
          (t) => t.empireId === attackableTargets[attackableTargets.length - 1]!.empireId
        );
        const firstUnattackableIndex = targets.findIndex(
          (t) => t.empireId === unattackableTargets[0]!.empireId
        );

        expect(lastAttackableIndex).toBeLessThan(firstUnattackableIndex);
      }
    });
  });
});

describe("100-Empire Scalability Test", () => {
  it("should handle 100 empires without performance issues", () => {
    const gameId = "scale-test";
    const empires = [
      { id: "player", type: "player" as const, planetCount: 6 },
      ...Array.from({ length: 99 }, (_, i) => ({
        id: `bot-${i}`,
        type: "bot" as const,
        planetCount: 6,
      })),
    ];

    const startTime = Date.now();
    const galaxy = generateGalaxy(gameId, empires, { seed: 99999 });
    const generationTime = Date.now() - startTime;

    // Generation should be fast (< 1 second)
    expect(generationTime).toBeLessThan(1000);

    // Should have reasonable number of regions
    expect(galaxy.regions.length).toBeGreaterThanOrEqual(4);
    expect(galaxy.regions.length).toBeLessThanOrEqual(15);

    // Should have wormholes
    expect(galaxy.wormholes.length).toBeGreaterThan(0);

    // All empires assigned
    expect(galaxy.empireAssignments.size).toBe(100);

    // Calculate sphere for player
    const playerInfluence = galaxy.empireInfluenceRecords.find(
      (r) => r.empireId === "player"
    )!;

    const regions = new Map<string, { id: string; name: string; positionX: string; positionY: string }>();
    galaxy.regions.forEach((r, i) => {
      regions.set(`region-${i}`, {
        id: `region-${i}`,
        name: r.name,
        positionX: r.positionX as string,
        positionY: r.positionY as string,
      });
    });

    const allEmpiresWithRegions = empires.map((e) => ({
      id: e.id,
      name: e.id,
      regionId: galaxy.empireAssignments.get(e.id) ?? playerInfluence.homeRegionId,
      isEliminated: false,
    }));

    const sphereStartTime = Date.now();
    const sphere = calculateInfluenceSphere(
      { id: "player", planetCount: 6 },
      {
        homeRegionId: playerInfluence.homeRegionId,
        primaryRegionId: playerInfluence.primaryRegionId,
      },
      allEmpiresWithRegions,
      regions,
      [...galaxy.connections, ...galaxy.wormholes]
    );
    const sphereTime = Date.now() - sphereStartTime;

    // Sphere calculation should be fast (< 100ms)
    expect(sphereTime).toBeLessThan(100);

    // With 100 empires, player should NOT be able to attack all of them
    const totalAttackable = sphere.directNeighbors.length + sphere.extendedNeighbors.length;
    expect(totalAttackable).toBeLessThan(50); // Less than half should be attackable
    expect(sphere.distantEmpires.length).toBeGreaterThan(0); // Some should be unreachable

    console.log(`100-Empire Test Results:
      - Galaxy generation: ${generationTime}ms
      - Sphere calculation: ${sphereTime}ms
      - Regions: ${galaxy.regions.length}
      - Wormholes: ${galaxy.wormholes.length}
      - Direct neighbors: ${sphere.directNeighbors.length}
      - Extended neighbors: ${sphere.extendedNeighbors.length}
      - Unreachable: ${sphere.distantEmpires.length}
    `);
  });
});

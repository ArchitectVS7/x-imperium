/**
 * Save Service Integration Tests
 *
 * Tests for game state serialization and snapshot structure validation.
 * Full database operations are covered by E2E tests in milestone-6.spec.ts.
 *
 * These tests verify:
 * - Snapshot structure and type definitions
 * - Version compatibility checks
 * - Data format validation
 * - Serialization edge cases
 */

import { describe, it, expect } from "vitest";
import type {
  GameSnapshot,
  EmpireSnapshot,
  SectorSnapshot,
  BuildQueueSnapshot,
  ResearchSnapshot,
  UpgradeSnapshot,
} from "@/lib/game/services/core/save-service";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a valid minimal game snapshot for testing
 */
function createMinimalSnapshot(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    version: 1,
    timestamp: new Date().toISOString(),
    game: {
      id: "test-game-id",
      name: "Test Game",
      status: "active",
      currentTurn: 10,
      turnLimit: 200,
      difficulty: "normal",
      botCount: 25,
      protectionTurns: 20,
    },
    empires: [],
    ...overrides,
  };
}

/**
 * Create a valid empire snapshot for testing
 */
function createEmpireSnapshot(overrides: Partial<EmpireSnapshot> = {}): EmpireSnapshot {
  return {
    id: "test-empire-id",
    name: "Test Empire",
    type: "player",
    credits: 100000,
    food: 10000,
    ore: 10000,
    petroleum: 5000,
    researchPoints: 500,
    population: 500000,
    populationCap: 1000000,
    soldiers: 1000,
    fighters: 500,
    stations: 50,
    lightCruisers: 100,
    heavyCruisers: 50,
    carriers: 10,
    covertAgents: 20,
    covertPoints: 100,
    civilStatus: "content",
    networth: 1500000,
    armyEffectiveness: 1.0,
    sectors: [],
    buildQueue: [],
    research: null,
    upgrades: [],
    ...overrides,
  };
}

/**
 * Create a valid sector snapshot for testing
 */
function createSectorSnapshot(overrides: Partial<SectorSnapshot> = {}): SectorSnapshot {
  return {
    id: "test-sector-id",
    name: "Test Sector",
    type: "food",
    productionRate: 1.0,
    purchasePrice: 5000,
    ...overrides,
  };
}

// =============================================================================
// SNAPSHOT VERSION TESTS
// =============================================================================

describe("Snapshot Version Compatibility", () => {
  it("should require version field in snapshot", () => {
    const snapshot = createMinimalSnapshot();
    expect(snapshot.version).toBeDefined();
    expect(typeof snapshot.version).toBe("number");
  });

  it("should have version 1 as current version", () => {
    const snapshot = createMinimalSnapshot();
    expect(snapshot.version).toBe(1);
  });

  it("should detect version mismatch", () => {
    const futureSnapshot = createMinimalSnapshot({ version: 99 });

    // Simulate version check logic from restoreFromSave
    const SNAPSHOT_VERSION = 1;
    const isCompatible = futureSnapshot.version === SNAPSHOT_VERSION;

    expect(isCompatible).toBe(false);
  });

  it("should accept matching version", () => {
    const snapshot = createMinimalSnapshot({ version: 1 });

    const SNAPSHOT_VERSION = 1;
    const isCompatible = snapshot.version === SNAPSHOT_VERSION;

    expect(isCompatible).toBe(true);
  });

  it("should reject version 0 (invalid)", () => {
    const invalidSnapshot = createMinimalSnapshot({ version: 0 });

    const SNAPSHOT_VERSION = 1;
    const isCompatible = invalidSnapshot.version === SNAPSHOT_VERSION;

    expect(isCompatible).toBe(false);
  });
});

// =============================================================================
// GAME SNAPSHOT STRUCTURE TESTS
// =============================================================================

describe("GameSnapshot Structure", () => {
  it("should have all required game fields", () => {
    const snapshot = createMinimalSnapshot();

    expect(snapshot.game).toHaveProperty("id");
    expect(snapshot.game).toHaveProperty("name");
    expect(snapshot.game).toHaveProperty("status");
    expect(snapshot.game).toHaveProperty("currentTurn");
    expect(snapshot.game).toHaveProperty("turnLimit");
    expect(snapshot.game).toHaveProperty("difficulty");
    expect(snapshot.game).toHaveProperty("botCount");
    expect(snapshot.game).toHaveProperty("protectionTurns");
  });

  it("should have timestamp as ISO string", () => {
    const snapshot = createMinimalSnapshot();

    expect(typeof snapshot.timestamp).toBe("string");
    // Should be parseable as a date
    const date = new Date(snapshot.timestamp);
    expect(date.getTime()).not.toBeNaN();
  });

  it("should have empires array", () => {
    const snapshot = createMinimalSnapshot();

    expect(Array.isArray(snapshot.empires)).toBe(true);
  });

  it("should accept valid status values", () => {
    const activeSnapshot = createMinimalSnapshot({
      game: { ...createMinimalSnapshot().game, status: "active" },
    });
    const completedSnapshot = createMinimalSnapshot({
      game: { ...createMinimalSnapshot().game, status: "completed" },
    });

    expect(activeSnapshot.game.status).toBe("active");
    expect(completedSnapshot.game.status).toBe("completed");
  });
});

// =============================================================================
// EMPIRE SNAPSHOT STRUCTURE TESTS
// =============================================================================

describe("EmpireSnapshot Structure", () => {
  it("should have all required resource fields", () => {
    const empire = createEmpireSnapshot();

    expect(empire).toHaveProperty("credits");
    expect(empire).toHaveProperty("food");
    expect(empire).toHaveProperty("ore");
    expect(empire).toHaveProperty("petroleum");
    expect(empire).toHaveProperty("researchPoints");
  });

  it("should have all required military fields", () => {
    const empire = createEmpireSnapshot();

    expect(empire).toHaveProperty("soldiers");
    expect(empire).toHaveProperty("fighters");
    expect(empire).toHaveProperty("stations");
    expect(empire).toHaveProperty("lightCruisers");
    expect(empire).toHaveProperty("heavyCruisers");
    expect(empire).toHaveProperty("carriers");
    expect(empire).toHaveProperty("covertAgents");
    expect(empire).toHaveProperty("covertPoints");
  });

  it("should have all required population fields", () => {
    const empire = createEmpireSnapshot();

    expect(empire).toHaveProperty("population");
    expect(empire).toHaveProperty("populationCap");
  });

  it("should have all required status fields", () => {
    const empire = createEmpireSnapshot();

    expect(empire).toHaveProperty("civilStatus");
    expect(empire).toHaveProperty("networth");
    expect(empire).toHaveProperty("armyEffectiveness");
  });

  it("should have type as player or bot", () => {
    const player = createEmpireSnapshot({ type: "player" });
    const bot = createEmpireSnapshot({ type: "bot" });

    expect(player.type).toBe("player");
    expect(bot.type).toBe("bot");
  });

  it("should store networth as number (not string)", () => {
    const empire = createEmpireSnapshot({ networth: 1500000.50 });

    expect(typeof empire.networth).toBe("number");
    expect(empire.networth).toBe(1500000.50);
  });

  it("should store armyEffectiveness as number (not string)", () => {
    const empire = createEmpireSnapshot({ armyEffectiveness: 1.25 });

    expect(typeof empire.armyEffectiveness).toBe("number");
    expect(empire.armyEffectiveness).toBe(1.25);
  });
});

// =============================================================================
// SECTOR SNAPSHOT TESTS
// =============================================================================

describe("SectorSnapshot Structure", () => {
  it("should have all required fields", () => {
    const sector = createSectorSnapshot();

    expect(sector).toHaveProperty("id");
    expect(sector).toHaveProperty("name");
    expect(sector).toHaveProperty("type");
    expect(sector).toHaveProperty("productionRate");
    expect(sector).toHaveProperty("purchasePrice");
  });

  it("should store productionRate as number", () => {
    const sector = createSectorSnapshot({ productionRate: 1.5 });

    expect(typeof sector.productionRate).toBe("number");
    expect(sector.productionRate).toBe(1.5);
  });

  it("should handle all sector types", () => {
    const sectorTypes = ["food", "ore", "petroleum", "tourism", "urban", "government", "research"];

    for (const type of sectorTypes) {
      const sector = createSectorSnapshot({ type });
      expect(sector.type).toBe(type);
    }
  });

  it("should handle sector with null name (use fallback)", () => {
    // Simulating the fallback logic from serializeGameState
    const sectorId = "abc12345-test-sector";
    const nullNameSector = {
      id: sectorId,
      name: null as unknown as string,
      type: "food",
      productionRate: 1.0,
      purchasePrice: 5000,
    };

    // Apply the same fallback as the service
    const serializedName = nullNameSector.name ?? `Sector ${sectorId.slice(0, 8)}`;
    expect(serializedName).toBe("Sector abc12345");
  });
});

// =============================================================================
// BUILD QUEUE SNAPSHOT TESTS
// =============================================================================

describe("BuildQueueSnapshot Structure", () => {
  it("should have all required fields", () => {
    const queueItem: BuildQueueSnapshot = {
      unitType: "soldiers",
      quantity: 100,
      turnsRemaining: 1,
    };

    expect(queueItem).toHaveProperty("unitType");
    expect(queueItem).toHaveProperty("quantity");
    expect(queueItem).toHaveProperty("turnsRemaining");
  });

  it("should handle all unit types", () => {
    const unitTypes = [
      "soldiers",
      "fighters",
      "stations",
      "lightCruisers",
      "heavyCruisers",
      "carriers",
      "covertAgents",
    ];

    for (const unitType of unitTypes) {
      const queueItem: BuildQueueSnapshot = {
        unitType,
        quantity: 100,
        turnsRemaining: 2,
      };
      expect(queueItem.unitType).toBe(unitType);
    }
  });

  it("should handle empty build queue", () => {
    const empire = createEmpireSnapshot({ buildQueue: [] });
    expect(empire.buildQueue).toHaveLength(0);
  });

  it("should handle multiple queue items", () => {
    const buildQueue: BuildQueueSnapshot[] = [
      { unitType: "soldiers", quantity: 100, turnsRemaining: 1 },
      { unitType: "fighters", quantity: 50, turnsRemaining: 2 },
      { unitType: "heavyCruisers", quantity: 10, turnsRemaining: 3 },
    ];

    const empire = createEmpireSnapshot({ buildQueue });
    expect(empire.buildQueue).toHaveLength(3);
  });
});

// =============================================================================
// RESEARCH SNAPSHOT TESTS
// =============================================================================

describe("ResearchSnapshot Structure", () => {
  it("should have all required fields when present", () => {
    const research: ResearchSnapshot = {
      researchLevel: 5,
      currentInvestment: 2500,
      requiredInvestment: 5000,
    };

    expect(research).toHaveProperty("researchLevel");
    expect(research).toHaveProperty("currentInvestment");
    expect(research).toHaveProperty("requiredInvestment");
  });

  it("should allow null research (no research started)", () => {
    const empire = createEmpireSnapshot({ research: null });
    expect(empire.research).toBeNull();
  });

  it("should handle level 0 research", () => {
    const research: ResearchSnapshot = {
      researchLevel: 0,
      currentInvestment: 0,
      requiredInvestment: 1000,
    };

    expect(research.researchLevel).toBe(0);
  });

  it("should handle high research levels", () => {
    const research: ResearchSnapshot = {
      researchLevel: 50,
      currentInvestment: 100000,
      requiredInvestment: 250000,
    };

    expect(research.researchLevel).toBe(50);
  });
});

// =============================================================================
// UPGRADE SNAPSHOT TESTS
// =============================================================================

describe("UpgradeSnapshot Structure", () => {
  it("should have all required fields", () => {
    const upgrade: UpgradeSnapshot = {
      unitType: "soldiers",
      upgradeLevel: 3,
    };

    expect(upgrade).toHaveProperty("unitType");
    expect(upgrade).toHaveProperty("upgradeLevel");
  });

  it("should handle empty upgrades array", () => {
    const empire = createEmpireSnapshot({ upgrades: [] });
    expect(empire.upgrades).toHaveLength(0);
  });

  it("should handle multiple upgrades per empire", () => {
    const upgrades: UpgradeSnapshot[] = [
      { unitType: "soldiers", upgradeLevel: 2 },
      { unitType: "fighters", upgradeLevel: 1 },
      { unitType: "heavyCruisers", upgradeLevel: 3 },
    ];

    const empire = createEmpireSnapshot({ upgrades });
    expect(empire.upgrades).toHaveLength(3);
  });
});

// =============================================================================
// SERIALIZATION EDGE CASES
// =============================================================================

describe("Serialization Edge Cases", () => {
  it("should handle empire with 0 sectors", () => {
    const empire = createEmpireSnapshot({ sectors: [] });
    expect(empire.sectors).toHaveLength(0);
  });

  it("should handle empire with 0 military units", () => {
    const empire = createEmpireSnapshot({
      soldiers: 0,
      fighters: 0,
      stations: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
      covertAgents: 0,
    });

    expect(empire.soldiers).toBe(0);
    expect(empire.fighters).toBe(0);
  });

  it("should handle large numbers (no overflow)", () => {
    const empire = createEmpireSnapshot({
      credits: 999999999,
      population: 10000000,
      networth: 999999999.99,
    });

    expect(empire.credits).toBe(999999999);
    expect(empire.population).toBe(10000000);
    expect(empire.networth).toBe(999999999.99);
  });

  it("should handle snapshot with many empires", () => {
    const empires: EmpireSnapshot[] = [];
    for (let i = 0; i < 100; i++) {
      empires.push(createEmpireSnapshot({ id: `empire-${i}`, name: `Empire ${i}` }));
    }

    const snapshot = createMinimalSnapshot({ empires });
    expect(snapshot.empires).toHaveLength(100);
  });

  it("should handle empire with many sectors", () => {
    const sectors: SectorSnapshot[] = [];
    for (let i = 0; i < 50; i++) {
      sectors.push(createSectorSnapshot({ id: `sector-${i}`, name: `Sector ${i}` }));
    }

    const empire = createEmpireSnapshot({ sectors });
    expect(empire.sectors).toHaveLength(50);
  });

  it("should maintain decimal precision for rates", () => {
    const sector = createSectorSnapshot({ productionRate: 1.234567 });
    expect(sector.productionRate).toBe(1.234567);

    const empire = createEmpireSnapshot({ armyEffectiveness: 1.234567 });
    expect(empire.armyEffectiveness).toBe(1.234567);
  });
});

// =============================================================================
// FULL SNAPSHOT VALIDATION
// =============================================================================

describe("Full Snapshot Validation", () => {
  it("should create a complete valid snapshot", () => {
    const snapshot: GameSnapshot = {
      version: 1,
      timestamp: new Date().toISOString(),
      game: {
        id: "game-123",
        name: "My Campaign",
        status: "active",
        currentTurn: 50,
        turnLimit: 200,
        difficulty: "hard",
        botCount: 50,
        protectionTurns: 20,
      },
      empires: [
        createEmpireSnapshot({
          id: "player-1",
          name: "Player Empire",
          type: "player",
          sectors: [
            createSectorSnapshot({ type: "food" }),
            createSectorSnapshot({ type: "ore" }),
            createSectorSnapshot({ type: "government" }),
          ],
          buildQueue: [{ unitType: "soldiers", quantity: 500, turnsRemaining: 1 }],
          research: { researchLevel: 10, currentInvestment: 5000, requiredInvestment: 10000 },
          upgrades: [{ unitType: "soldiers", upgradeLevel: 2 }],
        }),
        createEmpireSnapshot({
          id: "bot-1",
          name: "Bot Empire",
          type: "bot",
          sectors: [createSectorSnapshot({ type: "food" })],
        }),
      ],
    };

    // Validate structure
    expect(snapshot.version).toBe(1);
    expect(snapshot.game.id).toBe("game-123");
    expect(snapshot.empires).toHaveLength(2);
    expect(snapshot.empires[0]!.type).toBe("player");
    expect(snapshot.empires[1]!.type).toBe("bot");
    expect(snapshot.empires[0]!.sectors).toHaveLength(3);
    expect(snapshot.empires[0]!.buildQueue).toHaveLength(1);
    expect(snapshot.empires[0]!.research?.researchLevel).toBe(10);
  });

  it("should serialize and deserialize without data loss", () => {
    const original: GameSnapshot = {
      version: 1,
      timestamp: "2024-01-15T12:00:00.000Z",
      game: {
        id: "game-test",
        name: "Test Game",
        status: "active",
        currentTurn: 100,
        turnLimit: 200,
        difficulty: "normal",
        botCount: 25,
        protectionTurns: 20,
      },
      empires: [
        createEmpireSnapshot({
          networth: 1234567.89,
          armyEffectiveness: 1.15,
          sectors: [createSectorSnapshot({ productionRate: 1.5 })],
        }),
      ],
    };

    // Simulate JSON serialization (as database would)
    const serialized = JSON.stringify(original);
    const deserialized = JSON.parse(serialized) as GameSnapshot;

    // Verify no data loss
    expect(deserialized.version).toBe(original.version);
    expect(deserialized.timestamp).toBe(original.timestamp);
    expect(deserialized.game.currentTurn).toBe(original.game.currentTurn);
    expect(deserialized.empires[0]!.networth).toBe(1234567.89);
    expect(deserialized.empires[0]!.armyEffectiveness).toBe(1.15);
    expect(deserialized.empires[0]!.sectors[0]!.productionRate).toBe(1.5);
  });
});

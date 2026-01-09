/**
 * Turn Processor Tests
 *
 * Unit tests for the turn processing pipeline.
 * Tests individual phase processors and integration scenarios.
 */

import { describe, it, expect } from "vitest";
import {
  processPhase2_Population,
  processPhase3_CivilStatus,
} from "../core/turn-processor";
import type { CivilStatusEvent } from "../population/civil-status";

describe("Turn Processor - Phase 2: Population", () => {
  describe("processPhase2_Population", () => {
    it("should process population growth when food is sufficient", () => {
      const result = processPhase2_Population(10_000, 50_000, 600);

      expect(result.newPopulation).toBe(10_200);
      expect(result.foodConsumed).toBe(500);
      expect(result.populationChange).toBe(200);
      expect(result.status).toBe("growth");
    });

    it("should process starvation when food is insufficient", () => {
      const result = processPhase2_Population(10_000, 50_000, 300);

      expect(result.newPopulation).toBeLessThan(10_000);
      expect(result.status).toBe("starvation");
      expect(result.populationChange).toBeLessThan(0);
    });

    it("should remain stable when food exactly matches consumption", () => {
      const result = processPhase2_Population(10_000, 50_000, 500);

      expect(result.newPopulation).toBe(10_000);
      expect(result.status).toBe("stable");
      expect(result.populationChange).toBe(0);
    });

    it("should not exceed population cap during growth", () => {
      const result = processPhase2_Population(49_900, 50_000, 5_000);

      expect(result.newPopulation).toBe(50_000);
      expect(result.status).toBe("growth");
    });
  });
});

describe("Turn Processor - Phase 3: Civil Status", () => {
  describe("processPhase3_CivilStatus", () => {
    it("should upgrade status on sufficient food surplus", () => {
      // Requires 5 consecutive turns for upgrade
      const events: CivilStatusEvent[] = [
        { type: "food_surplus", consecutiveTurns: 5 },
      ];

      const result = processPhase3_CivilStatus("neutral", events);

      expect(result.newStatus).toBe("content");
      expect(result.changed).toBe(true);
    });

    it("should downgrade status on starvation", () => {
      const events: CivilStatusEvent[] = [
        { type: "starvation", severity: 1.0 },
      ];

      const result = processPhase3_CivilStatus("content", events);

      expect(result.changed).toBe(true);
    });

    it("should upgrade status with education", () => {
      const events: CivilStatusEvent[] = [{ type: "education" }];

      const result = processPhase3_CivilStatus("neutral", events);

      expect(result.newStatus).toBe("content");
      expect(result.changed).toBe(true);
    });

    it("should not change status from ecstatic on positive events", () => {
      const events: CivilStatusEvent[] = [
        { type: "food_surplus", consecutiveTurns: 3 },
        { type: "education" },
      ];

      const result = processPhase3_CivilStatus("ecstatic", events);

      expect(result.newStatus).toBe("ecstatic");
      expect(result.changed).toBe(false);
    });

    it("should not change status from revolting on negative events", () => {
      const events: CivilStatusEvent[] = [
        { type: "starvation", severity: 1.0 },
      ];

      const result = processPhase3_CivilStatus("revolting", events);

      expect(result.newStatus).toBe("revolting");
      expect(result.changed).toBe(false);
    });

    it("should return unchanged when no events occur", () => {
      const events: CivilStatusEvent[] = [];

      const result = processPhase3_CivilStatus("neutral", events);

      expect(result.newStatus).toBe("neutral");
      expect(result.changed).toBe(false);
    });

    it("should handle multiple events correctly", () => {
      // Food surplus and education should compound
      const events: CivilStatusEvent[] = [
        { type: "food_surplus", consecutiveTurns: 3 },
        { type: "education" },
      ];

      const result = processPhase3_CivilStatus("neutral", events);

      expect(result.changed).toBe(true);
      // Should upgrade from neutral
      expect(["content", "happy"].includes(result.newStatus)).toBe(true);
    });

    it("should handle conflicting events (net neutral)", () => {
      const events: CivilStatusEvent[] = [
        { type: "food_surplus", consecutiveTurns: 1 },
        { type: "high_maintenance", severity: 0.9 },
      ];

      const result = processPhase3_CivilStatus("content", events);

      // Events may cancel out or one may dominate
      expect(result.newStatus).toBeDefined();
    });
  });
});

describe("Turn Processor - Civil Status Income Multipliers", () => {
  // Import constants to verify multipliers
  // Rebalanced: 5x differential (2.5x to 0.5x) instead of 16x (4.0x to 0.25x)
  it("should have correct income multipliers (rebalanced for game economy)", async () => {
    const { CIVIL_STATUS_INCOME_MULTIPLIERS } = await import("../../constants");

    // Rebalanced multipliers - allows recovery from setbacks
    expect(CIVIL_STATUS_INCOME_MULTIPLIERS.ecstatic).toBe(2.5);
    expect(CIVIL_STATUS_INCOME_MULTIPLIERS.happy).toBe(2.0);
    expect(CIVIL_STATUS_INCOME_MULTIPLIERS.content).toBe(1.5);
    expect(CIVIL_STATUS_INCOME_MULTIPLIERS.neutral).toBe(1.0);
    // Unhappy: now has 15% penalty instead of baseline
    expect(CIVIL_STATUS_INCOME_MULTIPLIERS.unhappy).toBe(0.85);
    // Progressive penalties for angry, rioting, revolting
    expect(CIVIL_STATUS_INCOME_MULTIPLIERS.angry).toBeLessThan(CIVIL_STATUS_INCOME_MULTIPLIERS.unhappy);
    expect(CIVIL_STATUS_INCOME_MULTIPLIERS.rioting).toBeLessThan(CIVIL_STATUS_INCOME_MULTIPLIERS.angry);
    expect(CIVIL_STATUS_INCOME_MULTIPLIERS.revolting).toBeLessThan(CIVIL_STATUS_INCOME_MULTIPLIERS.rioting);
    // Revolting should be recoverable (0.5x instead of 0.25x)
    expect(CIVIL_STATUS_INCOME_MULTIPLIERS.revolting).toBe(0.5);
  });

  it("should have all 8 civil status levels defined", async () => {
    const { CIVIL_STATUS_LEVELS } = await import("../../constants");

    expect(CIVIL_STATUS_LEVELS).toHaveLength(8);
    expect(CIVIL_STATUS_LEVELS).toContain("ecstatic");
    expect(CIVIL_STATUS_LEVELS).toContain("happy");
    expect(CIVIL_STATUS_LEVELS).toContain("content");
    expect(CIVIL_STATUS_LEVELS).toContain("neutral");
    expect(CIVIL_STATUS_LEVELS).toContain("unhappy");
    expect(CIVIL_STATUS_LEVELS).toContain("angry");
    expect(CIVIL_STATUS_LEVELS).toContain("rioting");
    expect(CIVIL_STATUS_LEVELS).toContain("revolting");
  });
});

describe("Turn Processor - Maintenance Calculations", () => {
  it("should calculate correct maintenance costs", async () => {
    const { calculateMaintenanceCost, SECTOR_MAINTENANCE_COST } = await import("../economy/resource-engine");

    // Single sector maintenance
    const single = calculateMaintenanceCost(1);
    expect(single.totalCost).toBe(SECTOR_MAINTENANCE_COST);

    // Multiple sectors
    const nine = calculateMaintenanceCost(9);
    expect(nine.totalCost).toBe(SECTOR_MAINTENANCE_COST * 9);
    expect(nine.sectorCount).toBe(9);
  });

  it("should have correct maintenance value per PRD", async () => {
    const { SECTOR_MAINTENANCE_COST } = await import("../economy/resource-engine");

    // PRD 4.3: 168 credits/sector/turn
    expect(SECTOR_MAINTENANCE_COST).toBe(168);
  });
});

describe("Turn Processor - Resource Production", () => {
  it("should apply income multiplier to credits", async () => {
    const { processTurnResources, SECTOR_MAINTENANCE_COST } = await import("../economy/resource-engine");
    const { SECTOR_PRODUCTION } = await import("../../constants");

    // Create mock tourism sector
    const sectors = [
      {
        id: "test-1",
        empireId: "empire-1",
        gameId: "game-1",
        type: "tourism" as const,
        productionRate: String(SECTOR_PRODUCTION.tourism),
        purchasePrice: 1000,
        name: null,
        createdAt: new Date(),
        acquiredAtTurn: 1,
      },
    ];

    // Test with neutral (1×) multiplier
    const result1 = processTurnResources(sectors, 1.0);
    // production is base amount, final has multiplier applied minus maintenance
    expect(result1.production.credits).toBe(SECTOR_PRODUCTION.tourism);
    expect(result1.final.credits).toBe(SECTOR_PRODUCTION.tourism - SECTOR_MAINTENANCE_COST);

    // Test with ecstatic (4×) multiplier
    const result4 = processTurnResources(sectors, 4.0);
    // production is still base amount, multiplier only affects final credits
    expect(result4.production.credits).toBe(SECTOR_PRODUCTION.tourism);
    // final = (base × multiplier) - maintenance
    expect(result4.final.credits).toBe(SECTOR_PRODUCTION.tourism * 4 - SECTOR_MAINTENANCE_COST);
  });

  it("should produce correct resource amounts per PRD", async () => {
    const { SECTOR_PRODUCTION } = await import("../../constants");

    // PRD 5.2: Sector Production values (as defined in constants.ts)
    expect(SECTOR_PRODUCTION.food).toBe(160);
    expect(SECTOR_PRODUCTION.ore).toBe(112);
    expect(SECTOR_PRODUCTION.petroleum).toBe(92);
    expect(SECTOR_PRODUCTION.tourism).toBe(8000);
    expect(SECTOR_PRODUCTION.research).toBe(100); // Research points base
    expect(SECTOR_PRODUCTION.urban).toBe(1000); // Credits + pop cap
    expect(SECTOR_PRODUCTION.education).toBe(0); // Special effect only
  });
});

describe("Turn Processor - Edge Cases", () => {
  it("should handle empty empire (no sectors)", async () => {
    const { processTurnResources } = await import("../economy/resource-engine");

    const result = processTurnResources([], 1.0);

    expect(result.production.credits).toBe(0);
    expect(result.production.food).toBe(0);
    expect(result.final.credits).toBe(0);
  });

  it("should handle zero population correctly", () => {
    const result = processPhase2_Population(0, 50_000, 1_000);

    expect(result.newPopulation).toBe(0);
    expect(result.foodConsumed).toBe(0);
    expect(result.populationChange).toBe(0);
  });

  it("should handle population exactly at cap", () => {
    const result = processPhase2_Population(50_000, 50_000, 10_000);

    expect(result.newPopulation).toBe(50_000);
    expect(result.populationChange).toBe(0);
    expect(result.status).toBe("growth"); // Has food surplus, just can't grow
  });
});

describe("Turn Processor - Integration Scenarios", () => {
  it("should simulate a healthy turn (surplus food, positive income)", async () => {
    const { SECTOR_PRODUCTION } = await import("../../constants");

    // Starting with 10,000 population
    const population = 10_000;
    const foodProduction = SECTOR_PRODUCTION.food * 5; // 5 food sectors = 800
    const foodConsumption = population * 0.05; // 500

    // Food check
    expect(foodProduction).toBeGreaterThan(foodConsumption);

    // Population should grow
    const popResult = processPhase2_Population(population, 50_000, foodProduction);
    expect(popResult.status).toBe("growth");
    expect(popResult.newPopulation).toBeGreaterThan(population);
  });

  it("should simulate a struggling turn (food shortage)", async () => {
    // Starting with 10,000 population
    const population = 10_000;
    const foodProduction = 200; // Only 200 food (need 500)

    // Population should starve
    const popResult = processPhase2_Population(population, 50_000, foodProduction);
    expect(popResult.status).toBe("starvation");
    expect(popResult.newPopulation).toBeLessThan(population);

    // Civil status should downgrade
    const civilResult = processPhase3_CivilStatus("content", [
      { type: "starvation", severity: 1.0 },
    ]);
    expect(civilResult.changed).toBe(true);
  });

  it("should simulate empire at maximum prosperity", async () => {
    // Already ecstatic, max food
    const popResult = processPhase2_Population(50_000, 50_000, 100_000);
    expect(popResult.status).toBe("growth");
    expect(popResult.newPopulation).toBe(50_000); // At cap

    // Civil status stays at max
    const civilResult = processPhase3_CivilStatus("ecstatic", [
      { type: "food_surplus", consecutiveTurns: 10 },
      { type: "education" },
    ]);
    expect(civilResult.newStatus).toBe("ecstatic");
    expect(civilResult.changed).toBe(false);
  });

  it("should simulate empire in crisis", async () => {
    // No food, population dying
    const popResult = processPhase2_Population(10_000, 50_000, 0);
    expect(popResult.status).toBe("starvation");
    expect(popResult.newPopulation).toBe(9_000); // Lost 10% (100% deficit)

    // Civil status crashes
    const civilResult = processPhase3_CivilStatus("angry", [
      { type: "starvation", severity: 1.0 },
      { type: "high_maintenance", severity: 1.5 },
    ]);
    expect(civilResult.changed).toBe(true);
    expect(["rioting", "revolting"].includes(civilResult.newStatus)).toBe(true);
  });
});

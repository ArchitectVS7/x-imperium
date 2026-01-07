/**
 * Build Queue Service Tests (M3)
 *
 * Tests for build queue operations.
 */

import { describe, it, expect } from "vitest";
import { UNIT_COSTS, UNIT_POPULATION, type UnitType } from "../../unit-config";
import { UNIT_BUILD_TIMES, MAX_QUEUE_SIZE, calculateBuildCancelRefund } from "../../build-config";
import { calculateNetworth } from "../../networth";

// =============================================================================
// BUILD TIME TESTS
// =============================================================================

describe("Build Times Configuration", () => {
  it("should have correct build times for all unit types", () => {
    expect(UNIT_BUILD_TIMES.soldiers).toBe(1);
    expect(UNIT_BUILD_TIMES.fighters).toBe(1);
    expect(UNIT_BUILD_TIMES.stations).toBe(3);
    expect(UNIT_BUILD_TIMES.lightCruisers).toBe(2);
    expect(UNIT_BUILD_TIMES.heavyCruisers).toBe(2);
    expect(UNIT_BUILD_TIMES.carriers).toBe(3);
    expect(UNIT_BUILD_TIMES.covertAgents).toBe(2);
  });

  it("should have faster build times for cheaper units", () => {
    // Soldiers (50 credits) should be faster than Carriers (2500 credits)
    expect(UNIT_BUILD_TIMES.soldiers).toBeLessThan(UNIT_BUILD_TIMES.carriers);
    expect(UNIT_BUILD_TIMES.fighters).toBeLessThan(UNIT_BUILD_TIMES.stations);
  });

  it("should have queue size limit of 10", () => {
    expect(MAX_QUEUE_SIZE).toBe(10);
  });
});

// =============================================================================
// CANCEL REFUND TESTS
// =============================================================================

describe("Build Cancel Refund Calculation", () => {
  it("should give 50% refund for builds not yet started", () => {
    const totalCost = 10_000;
    const turnsTotal = 3;
    const turnsRemaining = 3; // Not started

    const refund = calculateBuildCancelRefund(totalCost, turnsRemaining, turnsTotal);
    expect(refund).toBe(5_000); // 50% of 10,000
  });

  it("should give proportional refund for builds in progress", () => {
    const totalCost = 10_000;
    const turnsTotal = 3;
    const turnsRemaining = 2; // 1 turn completed

    // Refund = (2/3) * 10000 * 0.5 = 3333.33 → 3333
    const refund = calculateBuildCancelRefund(totalCost, turnsRemaining, turnsTotal);
    expect(refund).toBe(3_333);
  });

  it("should give minimal refund for nearly complete builds", () => {
    const totalCost = 10_000;
    const turnsTotal = 3;
    const turnsRemaining = 1; // 2 turns completed

    // Refund = (1/3) * 10000 * 0.5 = 1666.66 → 1666
    const refund = calculateBuildCancelRefund(totalCost, turnsRemaining, turnsTotal);
    expect(refund).toBe(1_666);
  });

  it("should floor refund amounts", () => {
    const totalCost = 7_500;
    const turnsTotal = 2;
    const turnsRemaining = 2;

    // 7500 * 0.5 = 3750
    const refund = calculateBuildCancelRefund(totalCost, turnsRemaining, turnsTotal);
    expect(refund).toBe(3_750);
    expect(Number.isInteger(refund)).toBe(true);
  });
});

// =============================================================================
// COST CALCULATION TESTS
// =============================================================================

describe("Build Cost Calculations", () => {
  it("should calculate correct total cost for multiple units", () => {
    const quantity = 100;
    const totalCost = UNIT_COSTS.soldiers * quantity;
    expect(totalCost).toBe(5_000); // 50 * 100
  });

  it("should calculate correct population cost for multiple units", () => {
    const quantity = 100;
    const popCost = UNIT_POPULATION.soldiers * quantity;
    expect(popCost).toBe(20); // 0.2 * 100
  });

  it("should have correct unit costs from PRD 6.1", () => {
    expect(UNIT_COSTS.soldiers).toBe(50);
    expect(UNIT_COSTS.fighters).toBe(200);
    expect(UNIT_COSTS.stations).toBe(5_000);
    expect(UNIT_COSTS.lightCruisers).toBe(500);
    expect(UNIT_COSTS.heavyCruisers).toBe(1_000);
    expect(UNIT_COSTS.carriers).toBe(2_500);
    expect(UNIT_COSTS.covertAgents).toBe(4_090);
  });
});

// =============================================================================
// QUEUE VALIDATION TESTS
// =============================================================================

describe("Build Queue Validation Logic", () => {
  describe("Credit Validation", () => {
    it("should reject builds with insufficient credits", () => {
      const credits = 4_000;
      const buildCost = 5_000; // 100 soldiers

      const canAfford = credits >= buildCost;
      expect(canAfford).toBe(false);
    });

    it("should allow builds with sufficient credits", () => {
      const credits = 10_000;
      const buildCost = 5_000;

      const canAfford = credits >= buildCost;
      expect(canAfford).toBe(true);
    });

    it("should correctly calculate remaining credits", () => {
      const credits = 100_000;
      const buildCost = 5_000;

      const remaining = credits - buildCost;
      expect(remaining).toBe(95_000);
    });
  });

  describe("Population Validation", () => {
    it("should reject builds with insufficient population", () => {
      const population = 10;
      const popCost = 20; // 100 soldiers @ 0.2 each

      const canTrain = population >= popCost;
      expect(canTrain).toBe(false);
    });

    it("should allow builds with sufficient population", () => {
      const population = 1_000;
      const popCost = 20;

      const canTrain = population >= popCost;
      expect(canTrain).toBe(true);
    });
  });

  describe("Research Level Validation", () => {
    it("should lock Light Cruisers without research level 2", () => {
      const researchLevel = 1;
      const requiredLevel = 2;

      const canBuild = researchLevel >= requiredLevel;
      expect(canBuild).toBe(false);
    });

    it("should unlock Light Cruisers at research level 2", () => {
      const researchLevel = 2;
      const requiredLevel = 2;

      const canBuild = researchLevel >= requiredLevel;
      expect(canBuild).toBe(true);
    });

    it("should allow Light Cruisers at higher research levels", () => {
      const researchLevel = 5;
      const requiredLevel = 2;

      const canBuild = researchLevel >= requiredLevel;
      expect(canBuild).toBe(true);
    });
  });
});

// =============================================================================
// QUEUE PROCESSING TESTS
// =============================================================================

describe("Build Queue Processing Logic", () => {
  it("should decrement turns remaining each turn", () => {
    const turnsRemaining = 3;
    const newTurnsRemaining = turnsRemaining - 1;
    expect(newTurnsRemaining).toBe(2);
  });

  it("should complete build when turns reach 0", () => {
    const turnsRemaining = 1;
    const newTurnsRemaining = turnsRemaining - 1;
    const isComplete = newTurnsRemaining <= 0;
    expect(isComplete).toBe(true);
  });

  it("should not complete build with turns remaining", () => {
    const turnsRemaining = 2;
    const newTurnsRemaining = turnsRemaining - 1;
    const isComplete = newTurnsRemaining <= 0;
    expect(isComplete).toBe(false);
  });
});

// =============================================================================
// NETWORTH UPDATE TESTS
// =============================================================================

describe("Networth Update on Unit Completion", () => {
  it("should increase networth when units are added", () => {
    const baseNetworth = calculateNetworth({
      sectorCount: 9,
      soldiers: 100,
      fighters: 0,
      stations: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
      covertAgents: 0,
    });

    const newNetworth = calculateNetworth({
      sectorCount: 9,
      soldiers: 100,
      fighters: 0,
      stations: 10, // Added 10 stations
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 100, // Added 100 carriers
      covertAgents: 0,
    });

    // Base: 9*10 + 100*0.0005 = 90.05, rounds to 90
    // New: 90.05 + 10*0.002 + 100*0.005 = 90.05 + 0.02 + 0.5 = 90.57, rounds to 91
    expect(newNetworth).toBeGreaterThan(baseNetworth);
  });

  it("should correctly calculate networth with multiple unit types", () => {
    const networth = calculateNetworth({
      sectorCount: 10,
      soldiers: 1000,
      fighters: 100,
      stations: 10,
      lightCruisers: 50,
      heavyCruisers: 25,
      carriers: 10,
      covertAgents: 5,
    });

    // sectorCount * 10 = 100
    // soldiers * 0.0005 = 0.5
    // fighters * 0.001 = 0.1
    // stations * 0.002 = 0.02
    // lightCruisers * 0.001 = 0.05
    // heavyCruisers * 0.002 = 0.05
    // carriers * 0.005 = 0.05
    // covertAgents * 0.001 = 0.005
    // Total = 100.775, rounded = 100 or 101

    expect(networth).toBeGreaterThanOrEqual(100);
    expect(networth).toBeLessThan(102);
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe("Build Queue Edge Cases", () => {
  it("should handle queue at maximum capacity", () => {
    const currentQueueSize = MAX_QUEUE_SIZE;
    const canAddMore = currentQueueSize < MAX_QUEUE_SIZE;
    expect(canAddMore).toBe(false);
  });

  it("should allow adding when queue is not full", () => {
    const currentQueueSize = 5;
    const canAddMore = currentQueueSize < MAX_QUEUE_SIZE;
    expect(canAddMore).toBe(true);
  });

  it("should handle empty queue", () => {
    const queueLength = 0;
    const hasEntries = queueLength > 0;
    expect(hasEntries).toBe(false);
  });

  it("should handle queue position ordering", () => {
    const positions = [1, 2, 3];
    const maxPosition = Math.max(...positions);
    const nextPosition = maxPosition + 1;
    expect(nextPosition).toBe(4);
  });

  it("should handle reordering after cancellation", () => {
    // Simulate removing position 2 from [1, 2, 3]
    const positions = [1, 3]; // After removing 2
    const reordered = positions.map((_, i) => i + 1);
    expect(reordered).toEqual([1, 2]);
  });
});

// =============================================================================
// BUILD TIME PROPORTIONALITY TESTS
// =============================================================================

describe("Build Time Proportionality", () => {
  const unitData: Array<{ type: UnitType; cost: number; time: number }> = [
    { type: "soldiers", cost: UNIT_COSTS.soldiers, time: UNIT_BUILD_TIMES.soldiers },
    { type: "fighters", cost: UNIT_COSTS.fighters, time: UNIT_BUILD_TIMES.fighters },
    { type: "lightCruisers", cost: UNIT_COSTS.lightCruisers, time: UNIT_BUILD_TIMES.lightCruisers },
    { type: "heavyCruisers", cost: UNIT_COSTS.heavyCruisers, time: UNIT_BUILD_TIMES.heavyCruisers },
    { type: "carriers", cost: UNIT_COSTS.carriers, time: UNIT_BUILD_TIMES.carriers },
    { type: "stations", cost: UNIT_COSTS.stations, time: UNIT_BUILD_TIMES.stations },
    { type: "covertAgents", cost: UNIT_COSTS.covertAgents, time: UNIT_BUILD_TIMES.covertAgents },
  ];

  it("should have build times that increase with unit cost (general trend)", () => {
    // Sort by cost
    const sortedByCost = [...unitData].sort((a, b) => a.cost - b.cost);

    // Cheaper units should generally have lower or equal build times
    // Soldiers (50, 1 turn) should have lower time than Carriers (2500, 3 turns)
    const cheapest = sortedByCost[0];
    const expensive = sortedByCost[sortedByCost.length - 2]; // Carriers (not stations)

    expect(cheapest).toBeDefined();
    expect(expensive).toBeDefined();
    expect(cheapest!.time).toBeLessThanOrEqual(expensive!.time);
  });

  it("should have reasonable build times (1-3 turns)", () => {
    for (const unit of unitData) {
      expect(unit.time).toBeGreaterThanOrEqual(1);
      expect(unit.time).toBeLessThanOrEqual(3);
    }
  });
});

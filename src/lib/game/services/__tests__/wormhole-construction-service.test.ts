/**
 * Tests for Wormhole Construction Service (M6.3)
 */

import { describe, it, expect } from "vitest";
import {
  calculateRegionDistance,
  calculateWormholeCost,
  calculateWormholeBuildTime,
  calculateMaxWormholeSlots,
  canConstructWormhole,
  WORMHOLE_CONSTRUCTION_CONSTANTS,
} from "../geography/wormhole-construction-service";

// =============================================================================
// DISTANCE CALCULATION TESTS
// =============================================================================

describe("calculateRegionDistance", () => {
  it("should return 0 for same position", () => {
    const distance = calculateRegionDistance(
      { positionX: 100, positionY: 100 },
      { positionX: 100, positionY: 100 }
    );
    expect(distance).toBe(0);
  });

  it("should calculate correct distance for nearby regions", () => {
    // 40 units = distance of 1
    const distance = calculateRegionDistance(
      { positionX: 0, positionY: 0 },
      { positionX: 40, positionY: 0 }
    );
    expect(distance).toBeCloseTo(1, 1);
  });

  it("should cap distance at 5", () => {
    // Very far apart (200+ units)
    const distance = calculateRegionDistance(
      { positionX: 0, positionY: 0 },
      { positionX: 300, positionY: 300 }
    );
    expect(distance).toBe(5);
  });

  it("should handle diagonal distances", () => {
    // Pythagorean: sqrt(40^2 + 40^2) ≈ 56.57 / 40 ≈ 1.41
    const distance = calculateRegionDistance(
      { positionX: 0, positionY: 0 },
      { positionX: 40, positionY: 40 }
    );
    expect(distance).toBeCloseTo(1.41, 1);
  });
});

// =============================================================================
// COST CALCULATION TESTS
// =============================================================================

describe("calculateWormholeCost", () => {
  it("should return base cost for distance 0", () => {
    const cost = calculateWormholeCost(0);
    expect(cost.credits).toBe(WORMHOLE_CONSTRUCTION_CONSTANTS.BASE_CREDIT_COST);
    expect(cost.petroleum).toBe(WORMHOLE_CONSTRUCTION_CONSTANTS.BASE_PETROLEUM_COST);
  });

  it("should scale cost with distance", () => {
    const cost1 = calculateWormholeCost(1);
    const cost2 = calculateWormholeCost(2);

    expect(cost2.credits).toBeGreaterThan(cost1.credits);
    expect(cost2.petroleum).toBeGreaterThan(cost1.petroleum);
  });

  it("should cap at maximum cost", () => {
    const cost = calculateWormholeCost(100); // Very far
    expect(cost.credits).toBe(WORMHOLE_CONSTRUCTION_CONSTANTS.MAX_CREDIT_COST);
    expect(cost.petroleum).toBe(WORMHOLE_CONSTRUCTION_CONSTANTS.MAX_PETROLEUM_COST);
  });

  it("should calculate correct cost for distance 2", () => {
    const cost = calculateWormholeCost(2);
    // Base + 2 * per distance
    expect(cost.credits).toBe(15000 + 2 * 5000);
    expect(cost.petroleum).toBe(300 + 2 * 100);
  });
});

// =============================================================================
// BUILD TIME TESTS
// =============================================================================

describe("calculateWormholeBuildTime", () => {
  it("should return minimum time for distance 0", () => {
    const time = calculateWormholeBuildTime(0);
    expect(time).toBe(WORMHOLE_CONSTRUCTION_CONSTANTS.MIN_BUILD_TIME);
  });

  it("should scale time with distance", () => {
    const time1 = calculateWormholeBuildTime(1);
    const time2 = calculateWormholeBuildTime(2);

    expect(time2).toBeGreaterThan(time1);
  });

  it("should cap at maximum time", () => {
    const time = calculateWormholeBuildTime(100);
    expect(time).toBe(WORMHOLE_CONSTRUCTION_CONSTANTS.MAX_BUILD_TIME);
  });

  it("should calculate correct time for distance 3", () => {
    const time = calculateWormholeBuildTime(3);
    // Min + 3 * per distance = 6 + 3 * 2 = 12
    expect(time).toBe(12);
  });
});

// =============================================================================
// SLOT CALCULATION TESTS
// =============================================================================

describe("calculateMaxWormholeSlots", () => {
  it("should return base slots for low research", () => {
    expect(calculateMaxWormholeSlots(0)).toBe(1);
    expect(calculateMaxWormholeSlots(1)).toBe(1);
    expect(calculateMaxWormholeSlots(5)).toBe(1);
  });

  it("should grant extra slot at threshold", () => {
    expect(calculateMaxWormholeSlots(6)).toBe(2);
    expect(calculateMaxWormholeSlots(7)).toBe(2);
  });

  it("should grant two extra slots at double threshold", () => {
    expect(calculateMaxWormholeSlots(12)).toBe(3);
    expect(calculateMaxWormholeSlots(15)).toBe(3);
  });

  it("should cap at maximum slots", () => {
    expect(calculateMaxWormholeSlots(100)).toBe(3);
  });
});

// =============================================================================
// CONSTRUCTION VALIDATION TESTS
// =============================================================================

describe("canConstructWormhole", () => {
  const richEmpire = {
    credits: 100000,
    petroleum: 1000,
    fundamentalResearchLevel: 10,
  };

  const poorEmpire = {
    credits: 1000,
    petroleum: 100,
    fundamentalResearchLevel: 10,
  };

  it("should allow construction with sufficient resources", () => {
    const result = canConstructWormhole(richEmpire, 0, 2, false);
    expect(result.canConstruct).toBe(true);
    expect(result.cost.credits).toBe(25000);
    expect(result.cost.petroleum).toBe(500);
  });

  it("should deny if no available slots", () => {
    const result = canConstructWormhole(richEmpire, 3, 2, false);
    expect(result.canConstruct).toBe(false);
    expect(result.reason).toContain("No available wormhole slots");
  });

  it("should deny if insufficient credits", () => {
    const result = canConstructWormhole(poorEmpire, 0, 2, false);
    expect(result.canConstruct).toBe(false);
    expect(result.reason).toContain("Insufficient credits");
  });

  it("should deny if insufficient petroleum", () => {
    const lowPetroEmpire = { ...richEmpire, petroleum: 50 };
    const result = canConstructWormhole(lowPetroEmpire, 0, 2, false);
    expect(result.canConstruct).toBe(false);
    expect(result.reason).toContain("Insufficient petroleum");
  });

  it("should deny if connection already exists", () => {
    const result = canConstructWormhole(richEmpire, 0, 2, true);
    expect(result.canConstruct).toBe(false);
    expect(result.reason).toContain("already exists");
  });

  it("should provide cost even when denied", () => {
    const result = canConstructWormhole(poorEmpire, 0, 2, false);
    expect(result.canConstruct).toBe(false);
    expect(result.cost).toBeDefined();
    expect(result.buildTime).toBeDefined();
    expect(result.distance).toBe(2);
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe("edge cases", () => {
  it("should handle very low research level", () => {
    const empire = {
      credits: 50000,
      petroleum: 500,
      fundamentalResearchLevel: 0,
    };
    const result = canConstructWormhole(empire, 0, 1, false);
    expect(result.canConstruct).toBe(true);
  });

  it("should handle exactly matching resources", () => {
    // Distance 1 = 20000 credits, 400 petroleum
    const empire = {
      credits: 20000,
      petroleum: 400,
      fundamentalResearchLevel: 6,
    };
    const result = canConstructWormhole(empire, 0, 1, false);
    expect(result.canConstruct).toBe(true);
  });

  it("should handle just under required resources", () => {
    const empire = {
      credits: 19999,
      petroleum: 400,
      fundamentalResearchLevel: 6,
    };
    const result = canConstructWormhole(empire, 0, 1, false);
    expect(result.canConstruct).toBe(false);
  });
});

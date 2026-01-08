/**
 * Tests for Expansion Options Service (M8.2)
 */

import { describe, it, expect } from "vitest";
import {
  calculateRegionThreatLevel,
  calculateBorderStatus,
  EXPANSION_CONSTANTS,
} from "../geography/expansion-service";

// =============================================================================
// THREAT LEVEL TESTS
// =============================================================================

describe("calculateRegionThreatLevel", () => {
  it("should return 'high' for 80%+ density", () => {
    expect(calculateRegionThreatLevel(8, 10)).toBe("high");
    expect(calculateRegionThreatLevel(10, 10)).toBe("high");
    expect(calculateRegionThreatLevel(9, 10)).toBe("high");
  });

  it("should return 'medium' for 50-79% density", () => {
    expect(calculateRegionThreatLevel(5, 10)).toBe("medium");
    expect(calculateRegionThreatLevel(7, 10)).toBe("medium");
  });

  it("should return 'low' for <50% density", () => {
    expect(calculateRegionThreatLevel(4, 10)).toBe("low");
    expect(calculateRegionThreatLevel(1, 10)).toBe("low");
    expect(calculateRegionThreatLevel(0, 10)).toBe("low");
  });

  it("should handle edge cases", () => {
    expect(calculateRegionThreatLevel(0, 1)).toBe("low");
    expect(calculateRegionThreatLevel(1, 1)).toBe("high");
  });
});

// =============================================================================
// BORDER STATUS TESTS
// =============================================================================

describe("calculateBorderStatus", () => {
  it("should return unlocked if discovery turn is null", () => {
    const result = calculateBorderStatus(null, 10);
    expect(result.status).toBe("unlocked");
    expect(result.unlockTurn).toBeUndefined();
  });

  it("should return unlocked if current turn >= discovery turn", () => {
    const result = calculateBorderStatus(10, 10);
    expect(result.status).toBe("unlocked");

    const result2 = calculateBorderStatus(10, 15);
    expect(result2.status).toBe("unlocked");
  });

  it("should return locked with unlock turn if current < discovery", () => {
    const result = calculateBorderStatus(15, 10);
    expect(result.status).toBe("locked");
    expect(result.unlockTurn).toBe(15);
  });

  it("should handle turn 1", () => {
    const result = calculateBorderStatus(1, 1);
    expect(result.status).toBe("unlocked");

    const result2 = calculateBorderStatus(5, 1);
    expect(result2.status).toBe("locked");
    expect(result2.unlockTurn).toBe(5);
  });
});

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("EXPANSION_CONSTANTS", () => {
  it("should have correct border multiplier", () => {
    expect(EXPANSION_CONSTANTS.BORDER_ATTACK_MULTIPLIER).toBe(1.2);
  });

  it("should have correct wormhole multiplier", () => {
    expect(EXPANSION_CONSTANTS.WORMHOLE_ATTACK_MULTIPLIER).toBe(1.5);
  });

  it("wormhole should be more expensive than border", () => {
    expect(EXPANSION_CONSTANTS.WORMHOLE_ATTACK_MULTIPLIER).toBeGreaterThan(
      EXPANSION_CONSTANTS.BORDER_ATTACK_MULTIPLIER
    );
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe("edge cases", () => {
  it("should handle very high empire counts", () => {
    // More empires than max (shouldn't happen but handle gracefully)
    expect(calculateRegionThreatLevel(15, 10)).toBe("high");
  });

  it("should handle zero max empires", () => {
    // Avoid divide by zero
    expect(() => calculateRegionThreatLevel(0, 0)).not.toThrow();
  });

  it("should handle negative turns", () => {
    // Edge case: discovery turn in the past
    const result = calculateBorderStatus(-5, 10);
    expect(result.status).toBe("unlocked");
  });
});

/**
 * Tests for Threat Assessment Service (M8.1)
 */

import { describe, it, expect } from "vitest";
import {
  calculateMilitaryPower,
  calculateThreatLevel,
  getThreatPriority,
  formatRecentAction,
  THREAT_CONSTANTS,
} from "../military/threat-service";

// =============================================================================
// MILITARY POWER TESTS
// =============================================================================

describe("calculateMilitaryPower", () => {
  it("should calculate correct power for mixed forces", () => {
    const power = calculateMilitaryPower({
      soldiers: 100,
      fighters: 20,
      lightCruisers: 10,
      heavyCruisers: 5,
      carriers: 2,
    });

    // 100*1 + 20*3 + 10*5 + 5*8 + 2*12 = 100 + 60 + 50 + 40 + 24 = 274
    expect(power).toBe(274);
  });

  it("should return 0 for empty forces", () => {
    const power = calculateMilitaryPower({
      soldiers: 0,
      fighters: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
    });

    expect(power).toBe(0);
  });

  it("should weight carriers highest", () => {
    const carrierPower = calculateMilitaryPower({
      soldiers: 0,
      fighters: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 10,
    });

    const soldierPower = calculateMilitaryPower({
      soldiers: 10,
      fighters: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
    });

    expect(carrierPower).toBe(120);
    expect(soldierPower).toBe(10);
    expect(carrierPower).toBeGreaterThan(soldierPower);
  });
});

// =============================================================================
// THREAT LEVEL CALCULATION TESTS
// =============================================================================

describe("calculateThreatLevel", () => {
  it("should return 'immediate' for boss", () => {
    const level = calculateThreatLevel({
      isBoss: true,
      recentAction: "none",
      diplomaticStatus: "neutral",
      networthRatio: 0.5,
      militaryRatio: 0.5,
    });

    expect(level).toBe("immediate");
  });

  it("should return 'immediate' for recent attacker", () => {
    const level = calculateThreatLevel({
      isBoss: false,
      recentAction: "attacked_you",
      diplomaticStatus: "neutral",
      networthRatio: 0.5,
      militaryRatio: 0.5,
    });

    expect(level).toBe("immediate");
  });

  it("should return 'immediate' for 2×+ hostile", () => {
    const level = calculateThreatLevel({
      isBoss: false,
      recentAction: "none",
      diplomaticStatus: "hostile",
      networthRatio: 2.0,
      militaryRatio: 1.0,
    });

    expect(level).toBe("immediate");
  });

  it("should return 'friendly' for allied", () => {
    const level = calculateThreatLevel({
      isBoss: false,
      recentAction: "none",
      diplomaticStatus: "allied",
      networthRatio: 3.0, // Even if high networth
      militaryRatio: 3.0,
    });

    expect(level).toBe("friendly");
  });

  it("should return 'friendly' for NAP", () => {
    const level = calculateThreatLevel({
      isBoss: false,
      recentAction: "none",
      diplomaticStatus: "nap",
      networthRatio: 2.0,
      militaryRatio: 2.0,
    });

    expect(level).toBe("friendly");
  });

  it("should return 'watch' for 1.5×+ networth", () => {
    const level = calculateThreatLevel({
      isBoss: false,
      recentAction: "none",
      diplomaticStatus: "neutral",
      networthRatio: 1.5,
      militaryRatio: 1.0,
    });

    expect(level).toBe("watch");
  });

  it("should return 'watch' for military buildup", () => {
    const level = calculateThreatLevel({
      isBoss: false,
      recentAction: "military_buildup",
      diplomaticStatus: "neutral",
      networthRatio: 0.8,
      militaryRatio: 0.8,
    });

    expect(level).toBe("watch");
  });

  it("should return 'neutral' for low threat", () => {
    const level = calculateThreatLevel({
      isBoss: false,
      recentAction: "none",
      diplomaticStatus: "neutral",
      networthRatio: 1.0,
      militaryRatio: 1.0,
    });

    expect(level).toBe("neutral");
  });

  it("should not count 2× neutral as immediate (only hostile)", () => {
    const level = calculateThreatLevel({
      isBoss: false,
      recentAction: "none",
      diplomaticStatus: "neutral",
      networthRatio: 2.5,
      militaryRatio: 1.0,
    });

    expect(level).toBe("watch"); // Not immediate, just watch
  });
});

// =============================================================================
// THREAT PRIORITY TESTS
// =============================================================================

describe("getThreatPriority", () => {
  it("should rank immediate as highest priority (0)", () => {
    expect(getThreatPriority("immediate")).toBe(0);
  });

  it("should rank watch as second priority (1)", () => {
    expect(getThreatPriority("watch")).toBe(1);
  });

  it("should rank neutral as third priority (2)", () => {
    expect(getThreatPriority("neutral")).toBe(2);
  });

  it("should rank friendly as lowest priority (3)", () => {
    expect(getThreatPriority("friendly")).toBe(3);
  });

  it("should sort correctly", () => {
    const threats = [
      { level: "friendly" as const },
      { level: "immediate" as const },
      { level: "neutral" as const },
      { level: "watch" as const },
    ];

    threats.sort((a, b) => getThreatPriority(a.level) - getThreatPriority(b.level));

    expect(threats[0]?.level).toBe("immediate");
    expect(threats[1]?.level).toBe("watch");
    expect(threats[2]?.level).toBe("neutral");
    expect(threats[3]?.level).toBe("friendly");
  });
});

// =============================================================================
// FORMAT ACTION TESTS
// =============================================================================

describe("formatRecentAction", () => {
  it("should format attacked_you", () => {
    expect(formatRecentAction("attacked_you")).toContain("Attacked you");
  });

  it("should format attacked_by_you", () => {
    expect(formatRecentAction("attacked_by_you")).toContain("attacked them");
  });

  it("should format military_buildup", () => {
    expect(formatRecentAction("military_buildup")).toContain("military");
  });

  it("should return empty for none", () => {
    expect(formatRecentAction("none")).toBe("");
  });
});

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("THREAT_CONSTANTS", () => {
  it("should have correct thresholds", () => {
    expect(THREAT_CONSTANTS.IMMEDIATE_NETWORTH_RATIO).toBe(2.0);
    expect(THREAT_CONSTANTS.WATCH_NETWORTH_RATIO).toBe(1.5);
    expect(THREAT_CONSTANTS.WATCH_MILITARY_RATIO).toBe(1.5);
    expect(THREAT_CONSTANTS.RECENT_ACTION_TURNS).toBe(10);
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe("edge cases", () => {
  it("boss status overrides friendly", () => {
    // Even if allied, a boss is immediate threat
    const level = calculateThreatLevel({
      isBoss: true,
      recentAction: "none",
      diplomaticStatus: "allied",
      networthRatio: 0.5,
      militaryRatio: 0.5,
    });

    expect(level).toBe("immediate");
  });

  it("attacked_you overrides friendly", () => {
    const level = calculateThreatLevel({
      isBoss: false,
      recentAction: "attacked_you",
      diplomaticStatus: "allied", // Treaty broken?
      networthRatio: 0.5,
      militaryRatio: 0.5,
    });

    expect(level).toBe("immediate");
  });

  it("handles zero networth ratio", () => {
    const level = calculateThreatLevel({
      isBoss: false,
      recentAction: "none",
      diplomaticStatus: "neutral",
      networthRatio: 0,
      militaryRatio: 0,
    });

    expect(level).toBe("neutral");
  });

  it("handles very high ratios", () => {
    const level = calculateThreatLevel({
      isBoss: false,
      recentAction: "none",
      diplomaticStatus: "neutral",
      networthRatio: 10.0,
      militaryRatio: 10.0,
    });

    expect(level).toBe("watch"); // Still watch, not immediate (no hostile status)
  });
});

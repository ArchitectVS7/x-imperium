/**
 * Covert Operation Success Rate Tests (PRD 6.8)
 */

import { describe, it, expect } from "vitest";
import {
  calculateAgentRatioModifier,
  calculateGovernmentModifier,
  calculateSuccessRateFactors,
  applyVariance,
  calculateDetectionRate,
  executeOperation,
  previewOperation,
} from "./success-rate";

// =============================================================================
// AGENT RATIO MODIFIER TESTS
// =============================================================================

describe("Agent Ratio Modifier", () => {
  it("should return 1.5 (max) when target has no agents", () => {
    expect(calculateAgentRatioModifier(100, 0)).toBe(1.5);
  });

  it("should return 0.5 (min) when player has no agents", () => {
    expect(calculateAgentRatioModifier(0, 100)).toBe(0.5);
  });

  it("should return 1.0 when agents are equal", () => {
    expect(calculateAgentRatioModifier(100, 100)).toBe(1.0);
  });

  it("should return higher modifier when player has more agents", () => {
    expect(calculateAgentRatioModifier(200, 100)).toBe(1.5); // 2:1, capped at 1.5
    expect(calculateAgentRatioModifier(150, 100)).toBe(1.5); // 1.5:1
  });

  it("should return lower modifier when target has more agents", () => {
    expect(calculateAgentRatioModifier(50, 100)).toBe(0.5);
    expect(calculateAgentRatioModifier(75, 100)).toBe(0.75);
  });
});

// =============================================================================
// GOVERNMENT MODIFIER TESTS
// =============================================================================

describe("Government Modifier", () => {
  it("should return 1.0 for zero government sectors", () => {
    expect(calculateGovernmentModifier(0)).toBe(1.0);
  });

  it("should decrease by 0.05 per government sector", () => {
    expect(calculateGovernmentModifier(1)).toBeCloseTo(0.95, 2);
    expect(calculateGovernmentModifier(2)).toBeCloseTo(0.90, 2);
    expect(calculateGovernmentModifier(5)).toBeCloseTo(0.75, 2);
  });

  it("should cap at 0.5 minimum", () => {
    expect(calculateGovernmentModifier(10)).toBe(0.5);
    expect(calculateGovernmentModifier(20)).toBe(0.5);
  });
});

// =============================================================================
// SUCCESS RATE FACTORS TESTS
// =============================================================================

describe("Success Rate Factors", () => {
  it("should calculate factors for low-risk operation", () => {
    const factors = calculateSuccessRateFactors("send_spy", 100, 100, 1);

    expect(factors.baseRate).toBe(0.8); // send_spy base rate
    expect(factors.agentRatioModifier).toBe(1.0); // Equal agents
    expect(factors.governmentModifier).toBeCloseTo(0.95, 2); // 1 gov sector
    expect(factors.riskModifier).toBe(1.0); // Low risk
  });

  it("should calculate lower rate for high-risk operation", () => {
    const lowRisk = calculateSuccessRateFactors("send_spy", 100, 100, 1);
    const highRisk = calculateSuccessRateFactors("bombing_operations", 100, 100, 1);

    expect(highRisk.calculatedRate).toBeLessThan(lowRisk.calculatedRate);
  });

  it("should cap calculated rate between 0.05 and 0.95", () => {
    // Very favorable conditions
    const easy = calculateSuccessRateFactors("send_spy", 500, 10, 0);
    expect(easy.calculatedRate).toBeLessThanOrEqual(0.95);

    // Very unfavorable conditions
    const hard = calculateSuccessRateFactors("setup_coup", 10, 500, 10);
    expect(hard.calculatedRate).toBeGreaterThanOrEqual(0.05);
  });

  it("should include variance bounds", () => {
    const factors = calculateSuccessRateFactors("send_spy", 100, 100, 1);

    expect(factors.minRate).toBeLessThan(factors.calculatedRate);
    expect(factors.maxRate).toBeGreaterThan(factors.calculatedRate);
    expect(factors.maxRate - factors.minRate).toBeCloseTo(factors.calculatedRate * 0.4, 2);
  });
});

// =============================================================================
// VARIANCE APPLICATION TESTS
// =============================================================================

describe("Variance Application", () => {
  it("should return minRate when random is 0", () => {
    const factors = calculateSuccessRateFactors("send_spy", 100, 100, 1);
    const rate = applyVariance(factors, 0);
    expect(rate).toBeCloseTo(factors.minRate, 4);
  });

  it("should return maxRate when random is 1", () => {
    const factors = calculateSuccessRateFactors("send_spy", 100, 100, 1);
    const rate = applyVariance(factors, 1);
    expect(rate).toBeCloseTo(factors.maxRate, 4);
  });

  it("should return middle value when random is 0.5", () => {
    const factors = calculateSuccessRateFactors("send_spy", 100, 100, 1);
    const rate = applyVariance(factors, 0.5);
    const expected = (factors.minRate + factors.maxRate) / 2;
    expect(rate).toBeCloseTo(expected, 4);
  });
});

// =============================================================================
// DETECTION RATE TESTS
// =============================================================================

describe("Detection Rate", () => {
  it("should have lower detection for low-risk operations", () => {
    const lowRisk = calculateDetectionRate("send_spy", 100, 1);
    const highRisk = calculateDetectionRate("bombing_operations", 100, 1);

    expect(lowRisk).toBeLessThan(highRisk);
  });

  it("should increase detection with more target agents", () => {
    const fewAgents = calculateDetectionRate("send_spy", 50, 1);
    const manyAgents = calculateDetectionRate("send_spy", 200, 1);

    expect(manyAgents).toBeGreaterThan(fewAgents);
  });

  it("should cap detection at 0.9", () => {
    const maxDetection = calculateDetectionRate("setup_coup", 1000, 10);
    expect(maxDetection).toBeLessThanOrEqual(0.9);
  });
});

// =============================================================================
// OPERATION EXECUTION TESTS
// =============================================================================

describe("Execute Operation", () => {
  it("should succeed when roll is below effective rate", () => {
    // Use deterministic rolls
    const result = executeOperation("send_spy", 200, 50, 1, 0.1, 0.9);

    // With favorable conditions, effective rate should be high
    expect(result.success).toBe(true);
    expect(result.roll).toBe(0.1);
  });

  it("should fail when roll is above effective rate", () => {
    // Use deterministic rolls - high roll should fail
    const result = executeOperation("setup_coup", 10, 100, 5, 0.99, 0.1);

    expect(result.success).toBe(false);
  });

  it("should catch agent on failed operation with low detection roll", () => {
    // Force failure with high success roll, then low detection roll
    const result = executeOperation("send_spy", 100, 100, 1, 0.99, 0.01);

    expect(result.success).toBe(false);
    expect(result.agentCaught).toBe(true);
  });

  it("should not catch agent on successful operation usually", () => {
    // Force success with low roll, high detection roll
    const result = executeOperation("send_spy", 200, 50, 1, 0.1, 0.99);

    expect(result.success).toBe(true);
    expect(result.agentCaught).toBe(false);
  });

  it("should return all outcome fields", () => {
    const result = executeOperation("send_spy", 100, 100, 1, 0.5, 0.5);

    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("agentCaught");
    expect(result).toHaveProperty("roll");
    expect(result).toHaveProperty("effectiveRate");
    expect(result).toHaveProperty("detectionRate");
  });
});

// =============================================================================
// PREVIEW OPERATION TESTS
// =============================================================================

describe("Preview Operation", () => {
  it("should return success and catch chances", () => {
    const preview = previewOperation("send_spy", 100, 100, 1);

    expect(preview.successChance).toBeGreaterThan(0);
    expect(preview.successChance).toBeLessThan(1);
    expect(preview.catchChance).toBeGreaterThan(0);
    expect(preview.catchChance).toBeLessThan(1);
  });

  it("should return factors", () => {
    const preview = previewOperation("send_spy", 100, 100, 1);

    expect(preview.factors).toBeDefined();
    expect(preview.factors.baseRate).toBe(0.8);
  });

  it("should show better odds with more agents", () => {
    const weak = previewOperation("send_spy", 50, 200, 2);
    const strong = previewOperation("send_spy", 300, 50, 1);

    expect(strong.successChance).toBeGreaterThan(weak.successChance);
    expect(strong.catchChance).toBeLessThan(weak.catchChance);
  });
});

// =============================================================================
// PRD 6.8 SUCCESS RATE FACTOR TESTS
// =============================================================================

describe("PRD 6.8 Success Rate Factors", () => {
  it("should factor in your agent count vs target's agent count", () => {
    const moreAgents = calculateSuccessRateFactors("send_spy", 200, 100, 1);
    const lessAgents = calculateSuccessRateFactors("send_spy", 50, 100, 1);

    expect(moreAgents.calculatedRate).toBeGreaterThan(lessAgents.calculatedRate);
  });

  it("should factor in target's government sector count", () => {
    const fewGov = calculateSuccessRateFactors("send_spy", 100, 100, 1);
    const manyGov = calculateSuccessRateFactors("send_spy", 100, 100, 5);

    expect(fewGov.calculatedRate).toBeGreaterThan(manyGov.calculatedRate);
  });

  it("should factor in operation difficulty", () => {
    const easy = calculateSuccessRateFactors("send_spy", 100, 100, 1);
    const hard = calculateSuccessRateFactors("setup_coup", 100, 100, 1);

    expect(easy.calculatedRate).toBeGreaterThan(hard.calculatedRate);
  });

  it("should include ±20% random variance", () => {
    const factors = calculateSuccessRateFactors("send_spy", 100, 100, 1);

    const varianceRange = factors.maxRate - factors.minRate;
    const expectedRange = factors.calculatedRate * 0.4; // ±20% = 40% total range

    expect(varianceRange).toBeCloseTo(expectedRange, 2);
  });
});

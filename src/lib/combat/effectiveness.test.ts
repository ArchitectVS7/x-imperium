/**
 * Unit Effectiveness Matrix Tests
 *
 * Verifies PRD 6.7 Unit Effectiveness Matrix compliance.
 */

import { describe, it, expect } from "vitest";
import {
  getUnitEffectiveness,
  canParticipate,
  getParticipatingUnits,
  getPrimaryPhase,
  calculatePhaseEffectivePower,
  getPhaseRoleDescription,
  EFFECTIVENESS_LEVELS,
  UNIT_EFFECTIVENESS,
} from "./effectiveness";

// =============================================================================
// EFFECTIVENESS MATRIX TESTS (PRD 6.7)
// =============================================================================

describe("Unit Effectiveness Matrix (PRD 6.7)", () => {
  describe("Soldiers", () => {
    it("should have HIGH effectiveness in guerilla", () => {
      expect(getUnitEffectiveness("soldiers", "guerilla")).toBe(EFFECTIVENESS_LEVELS.HIGH);
    });

    it("should have HIGH effectiveness in ground", () => {
      expect(getUnitEffectiveness("soldiers", "ground")).toBe(EFFECTIVENESS_LEVELS.HIGH);
    });

    it("should have NO effectiveness in orbital", () => {
      expect(getUnitEffectiveness("soldiers", "orbital")).toBe(EFFECTIVENESS_LEVELS.NONE);
    });

    it("should have NO effectiveness in space", () => {
      expect(getUnitEffectiveness("soldiers", "space")).toBe(EFFECTIVENESS_LEVELS.NONE);
    });

    it("should have LOW effectiveness in pirate defense", () => {
      expect(getUnitEffectiveness("soldiers", "pirate_defense")).toBe(EFFECTIVENESS_LEVELS.LOW);
    });
  });

  describe("Fighters", () => {
    it("should have NO effectiveness in guerilla", () => {
      expect(getUnitEffectiveness("fighters", "guerilla")).toBe(EFFECTIVENESS_LEVELS.NONE);
    });

    it("should have LOW effectiveness in ground", () => {
      expect(getUnitEffectiveness("fighters", "ground")).toBe(EFFECTIVENESS_LEVELS.LOW);
    });

    it("should have HIGH effectiveness in orbital", () => {
      expect(getUnitEffectiveness("fighters", "orbital")).toBe(EFFECTIVENESS_LEVELS.HIGH);
    });

    it("should have LOW effectiveness in space", () => {
      expect(getUnitEffectiveness("fighters", "space")).toBe(EFFECTIVENESS_LEVELS.LOW);
    });
  });

  describe("Stations", () => {
    it("should have MEDIUM effectiveness in orbital", () => {
      expect(getUnitEffectiveness("stations", "orbital", false)).toBe(EFFECTIVENESS_LEVELS.MEDIUM);
    });

    it("should get 2× effectiveness when defending in orbital (capped at HIGH)", () => {
      // 0.5 * 2 = 1.0, capped at HIGH (1.0)
      expect(getUnitEffectiveness("stations", "orbital", true)).toBe(EFFECTIVENESS_LEVELS.HIGH);
    });

    it("should have MEDIUM effectiveness in ground", () => {
      expect(getUnitEffectiveness("stations", "ground")).toBe(EFFECTIVENESS_LEVELS.MEDIUM);
    });

    it("should have NO effectiveness in space", () => {
      expect(getUnitEffectiveness("stations", "space")).toBe(EFFECTIVENESS_LEVELS.NONE);
    });
  });

  describe("Light Cruisers", () => {
    it("should have HIGH effectiveness in orbital", () => {
      expect(getUnitEffectiveness("lightCruisers", "orbital")).toBe(EFFECTIVENESS_LEVELS.HIGH);
    });

    it("should have HIGH effectiveness in space", () => {
      expect(getUnitEffectiveness("lightCruisers", "space")).toBe(EFFECTIVENESS_LEVELS.HIGH);
    });

    it("should have NO effectiveness in ground", () => {
      expect(getUnitEffectiveness("lightCruisers", "ground")).toBe(EFFECTIVENESS_LEVELS.NONE);
    });
  });

  describe("Heavy Cruisers", () => {
    it("should have MEDIUM effectiveness in orbital", () => {
      expect(getUnitEffectiveness("heavyCruisers", "orbital")).toBe(EFFECTIVENESS_LEVELS.MEDIUM);
    });

    it("should have HIGH effectiveness in space", () => {
      expect(getUnitEffectiveness("heavyCruisers", "space")).toBe(EFFECTIVENESS_LEVELS.HIGH);
    });

    it("should have NO effectiveness in ground", () => {
      expect(getUnitEffectiveness("heavyCruisers", "ground")).toBe(EFFECTIVENESS_LEVELS.NONE);
    });
  });

  describe("Carriers", () => {
    it("should have NO effectiveness in any combat phase", () => {
      expect(getUnitEffectiveness("carriers", "space")).toBe(EFFECTIVENESS_LEVELS.NONE);
      expect(getUnitEffectiveness("carriers", "orbital")).toBe(EFFECTIVENESS_LEVELS.NONE);
      expect(getUnitEffectiveness("carriers", "ground")).toBe(EFFECTIVENESS_LEVELS.NONE);
      expect(getUnitEffectiveness("carriers", "guerilla")).toBe(EFFECTIVENESS_LEVELS.NONE);
      expect(getUnitEffectiveness("carriers", "pirate_defense")).toBe(EFFECTIVENESS_LEVELS.NONE);
    });
  });
});

// =============================================================================
// PARTICIPATION TESTS
// =============================================================================

describe("canParticipate", () => {
  it("should return true for soldiers in ground combat", () => {
    expect(canParticipate("soldiers", "ground")).toBe(true);
  });

  it("should return false for soldiers in space combat", () => {
    expect(canParticipate("soldiers", "space")).toBe(false);
  });

  it("should return true for light cruisers in space combat", () => {
    expect(canParticipate("lightCruisers", "space")).toBe(true);
  });

  it("should return false for carriers in any combat", () => {
    expect(canParticipate("carriers", "space")).toBe(false);
    expect(canParticipate("carriers", "orbital")).toBe(false);
    expect(canParticipate("carriers", "ground")).toBe(false);
  });
});

describe("getParticipatingUnits", () => {
  it("should return cruisers for space phase", () => {
    const units = getParticipatingUnits("space");
    expect(units).toContain("lightCruisers");
    expect(units).toContain("heavyCruisers");
    expect(units).toContain("fighters"); // Low but non-zero
    expect(units).not.toContain("soldiers");
    expect(units).not.toContain("carriers");
  });

  it("should return fighters and stations for orbital phase", () => {
    const units = getParticipatingUnits("orbital");
    expect(units).toContain("fighters");
    expect(units).toContain("stations");
    expect(units).toContain("lightCruisers");
    expect(units).toContain("heavyCruisers");
  });

  it("should return soldiers for ground phase", () => {
    const units = getParticipatingUnits("ground");
    expect(units).toContain("soldiers");
    expect(units).toContain("fighters"); // Low support
    expect(units).toContain("stations"); // Medium support
    expect(units).not.toContain("lightCruisers");
  });
});

describe("getPrimaryPhase", () => {
  it("should return ground for soldiers", () => {
    expect(getPrimaryPhase("soldiers")).toBe("guerilla"); // Both are HIGH, guerilla comes first
  });

  it("should return orbital for fighters", () => {
    expect(getPrimaryPhase("fighters")).toBe("orbital");
  });

  it("should return orbital for stations", () => {
    // Both orbital and ground are MEDIUM, orbital comes first alphabetically
    const phase = getPrimaryPhase("stations");
    expect(["orbital", "ground"]).toContain(phase);
  });

  it("should return space for light cruisers", () => {
    // Both space and orbital are HIGH, orbital comes first alphabetically
    const phase = getPrimaryPhase("lightCruisers");
    expect(["space", "orbital"]).toContain(phase);
  });

  it("should return space for heavy cruisers", () => {
    expect(getPrimaryPhase("heavyCruisers")).toBe("space");
  });

  it("should return null for carriers (no effective phase)", () => {
    expect(getPrimaryPhase("carriers")).toBeNull();
  });
});

// =============================================================================
// EFFECTIVENESS LEVELS TESTS
// =============================================================================

describe("Effectiveness Levels", () => {
  it("should have correct values", () => {
    expect(EFFECTIVENESS_LEVELS.HIGH).toBe(1.0);
    expect(EFFECTIVENESS_LEVELS.MEDIUM).toBe(0.5);
    expect(EFFECTIVENESS_LEVELS.LOW).toBe(0.25);
    expect(EFFECTIVENESS_LEVELS.NONE).toBe(0.0);
  });

  it("should have all units defined in effectiveness matrix", () => {
    const units = ["soldiers", "fighters", "stations", "lightCruisers", "heavyCruisers", "carriers"];
    const phases = ["guerilla", "ground", "orbital", "space", "pirate_defense"];

    for (const unit of units) {
      expect(UNIT_EFFECTIVENESS).toHaveProperty(unit);
      for (const phase of phases) {
        expect(UNIT_EFFECTIVENESS[unit as keyof typeof UNIT_EFFECTIVENESS]).toHaveProperty(phase);
      }
    }
  });
});

// =============================================================================
// CALCULATE PHASE EFFECTIVE POWER TESTS
// =============================================================================

describe("calculatePhaseEffectivePower", () => {
  it("should calculate power for units with HIGH effectiveness", () => {
    // Soldiers have HIGH (1.0) effectiveness in ground
    const power = calculatePhaseEffectivePower("soldiers", 100, 10, "ground");
    expect(power).toBe(100 * 10 * 1.0); // count * basePower * effectiveness
  });

  it("should calculate power for units with MEDIUM effectiveness", () => {
    // Heavy cruisers have MEDIUM (0.5) effectiveness in orbital
    const power = calculatePhaseEffectivePower("heavyCruisers", 10, 100, "orbital");
    expect(power).toBe(10 * 100 * 0.5);
  });

  it("should calculate power for units with LOW effectiveness", () => {
    // Fighters have LOW (0.25) effectiveness in ground
    const power = calculatePhaseEffectivePower("fighters", 50, 5, "ground");
    expect(power).toBe(50 * 5 * 0.25);
  });

  it("should return 0 for units with NONE effectiveness", () => {
    // Soldiers have NONE (0) effectiveness in space
    const power = calculatePhaseEffectivePower("soldiers", 100, 10, "space");
    expect(power).toBe(0);
  });

  it("should apply defender bonus for stations in orbital", () => {
    // Stations get 2x when defending in orbital
    const attackerPower = calculatePhaseEffectivePower("stations", 10, 50, "orbital", false);
    const defenderPower = calculatePhaseEffectivePower("stations", 10, 50, "orbital", true);
    expect(defenderPower).toBe(attackerPower * 2);
  });

  it("should not apply defender bonus for non-station units", () => {
    const attackerPower = calculatePhaseEffectivePower("fighters", 50, 5, "orbital", false);
    const defenderPower = calculatePhaseEffectivePower("fighters", 50, 5, "orbital", true);
    expect(defenderPower).toBe(attackerPower);
  });
});

// =============================================================================
// GET PHASE ROLE DESCRIPTION TESTS
// =============================================================================

describe("getPhaseRoleDescription", () => {
  describe("Soldiers", () => {
    it("should describe ground combat role", () => {
      expect(getPhaseRoleDescription("soldiers", "ground")).toBe("Capture enemy planets");
    });

    it("should describe guerilla combat role", () => {
      expect(getPhaseRoleDescription("soldiers", "guerilla")).toBe("Conduct hit-and-run raids");
    });

    it("should return cannot participate for space", () => {
      expect(getPhaseRoleDescription("soldiers", "space")).toBe("Cannot participate in this phase");
    });
  });

  describe("Fighters", () => {
    it("should describe orbital combat role", () => {
      expect(getPhaseRoleDescription("fighters", "orbital")).toBe("Contest orbital control");
    });

    it("should return support for ground", () => {
      expect(getPhaseRoleDescription("fighters", "ground")).toBe("Provides support");
    });
  });

  describe("Stations", () => {
    it("should describe orbital defense role", () => {
      expect(getPhaseRoleDescription("stations", "orbital")).toBe("Defend orbit from attackers");
    });

    it("should return support for ground", () => {
      expect(getPhaseRoleDescription("stations", "ground")).toBe("Provides support");
    });
  });

  describe("Light Cruisers", () => {
    it("should describe space combat role", () => {
      expect(getPhaseRoleDescription("lightCruisers", "space")).toBe("Engage in space combat");
    });

    it("should describe orbital fire support role", () => {
      expect(getPhaseRoleDescription("lightCruisers", "orbital")).toBe("Provide orbital fire support");
    });

    it("should return cannot participate for ground", () => {
      expect(getPhaseRoleDescription("lightCruisers", "ground")).toBe("Cannot participate in this phase");
    });
  });

  describe("Heavy Cruisers", () => {
    it("should describe space combat role", () => {
      expect(getPhaseRoleDescription("heavyCruisers", "space")).toBe("Heavy capital ship combat");
    });

    it("should return support for orbital", () => {
      expect(getPhaseRoleDescription("heavyCruisers", "orbital")).toBe("Provides support");
    });
  });

  describe("Carriers", () => {
    it("should always describe transport role regardless of phase", () => {
      expect(getPhaseRoleDescription("carriers", "space")).toBe("Transport troops for invasions");
      expect(getPhaseRoleDescription("carriers", "orbital")).toBe("Transport troops for invasions");
      expect(getPhaseRoleDescription("carriers", "ground")).toBe("Transport troops for invasions");
    });
  });
});

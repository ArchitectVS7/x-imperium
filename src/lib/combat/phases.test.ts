/**
 * Combat Phase Resolution Tests
 *
 * Verifies PRD 6.7 compliance:
 * - Three-phase combat (Space → Orbital → Ground)
 * - Unit effectiveness matrix
 * - Casualty calculations
 * - Army effectiveness changes
 */

import { describe, it, expect } from "vitest";
import {
  type Forces,
  resolveSpaceCombat,
  resolveOrbitalCombat,
  resolveGroundCombat,
  resolveInvasion,
  resolveGuerillaAttack,
  resolveRetreat,
  calculateSpacePhasePower,
  calculateOrbitalPhasePower,
  calculateGroundPhasePower,
  SOLDIERS_PER_CARRIER,
} from "./phases";

// =============================================================================
// TEST FIXTURES
// =============================================================================

const emptyForces: Forces = {
  soldiers: 0,
  fighters: 0,
  stations: 0,
  lightCruisers: 0,
  heavyCruisers: 0,
  carriers: 0,
};

const balancedFleet: Forces = {
  soldiers: 1000,
  fighters: 100,
  stations: 10,
  lightCruisers: 50,
  heavyCruisers: 25,
  carriers: 20,
};

const spaceFleet: Forces = {
  soldiers: 0,
  fighters: 0,
  stations: 0,
  lightCruisers: 100,
  heavyCruisers: 50,
  carriers: 10,
};

// Additional test fixtures available if needed:
// - orbitalFleet: { fighters: 200, stations: 20 }
// - groundForce: { soldiers: 5000, carriers: 50 }

// =============================================================================
// SPACE COMBAT TESTS
// =============================================================================

describe("Space Combat (PRD 6.7 Phase 1)", () => {
  it("cruisers should dominate space combat", () => {
    // Fleet with cruisers vs fleet with fighters
    const cruiserFleet: Forces = { ...emptyForces, lightCruisers: 50, heavyCruisers: 25 };
    const fighterFleet: Forces = { ...emptyForces, fighters: 200 };

    const cruiserPower = calculateSpacePhasePower(cruiserFleet, false);
    const fighterPower = calculateSpacePhasePower(fighterFleet, false);

    // Cruisers should have higher power in space
    expect(cruiserPower).toBeGreaterThan(fighterPower);
  });

  it("should apply defender advantage (1.1×)", () => {
    const fleet: Forces = { ...emptyForces, lightCruisers: 50 };

    const attackPower = calculateSpacePhasePower(fleet, false);
    const defensePower = calculateSpacePhasePower(fleet, true);

    // Reduced from 1.2× to 1.1× for better combat balance
    expect(defensePower).toBeCloseTo(attackPower * 1.1, 1);
  });

  it("should determine winner based on power ratio", () => {
    const strongFleet: Forces = { ...emptyForces, lightCruisers: 100, heavyCruisers: 50 };
    const weakFleet: Forces = { ...emptyForces, lightCruisers: 10 };

    const result = resolveSpaceCombat(strongFleet, weakFleet, 0.5);

    expect(result.phase).toBe("space");
    expect(result.phaseNumber).toBe(1);
    expect(result.winner).toBe("attacker");
    expect(result.attackerPower).toBeGreaterThan(result.defenderPower);
  });

  it("should calculate casualties for participating units", () => {
    const result = resolveSpaceCombat(spaceFleet, spaceFleet, 0.5);

    // Light cruisers participate in space combat
    expect(result.attackerCasualties.lightCruisers).toBeDefined();
    expect(result.defenderCasualties.lightCruisers).toBeDefined();

    // Heavy cruisers participate
    expect(result.attackerCasualties.heavyCruisers).toBeDefined();
    expect(result.defenderCasualties.heavyCruisers).toBeDefined();

    // Soldiers don't participate in space combat
    expect(result.attackerCasualties.soldiers).toBeUndefined();
  });
});

// =============================================================================
// ORBITAL COMBAT TESTS
// =============================================================================

describe("Orbital Combat (PRD 6.7 Phase 2)", () => {
  it("fighters should be effective in orbital combat", () => {
    const fighterFleet: Forces = { ...emptyForces, fighters: 100 };

    const power = calculateOrbitalPhasePower(fighterFleet, false);

    // Fighters have HIGH effectiveness in orbital (1.0 × 3 base power)
    expect(power).toBeGreaterThan(0);
  });

  it("stations should get 2× effectiveness when defending", () => {
    const stationFleet: Forces = { ...emptyForces, stations: 10 };

    const attackPower = calculateOrbitalPhasePower(stationFleet, false);
    const defensePower = calculateOrbitalPhasePower(stationFleet, true);

    // Defense power includes station 2× bonus AND 1.1× defender advantage
    // Station base: 30 power (reduced from 50), MEDIUM effectiveness (0.5)
    // Attack: 10 * 30 * 0.5 = 150
    // Defense: 10 * 30 * 1.0 (2× on stations) * 1.1 = 330
    expect(defensePower).toBeGreaterThan(attackPower * 2);
  });

  it("should determine winner based on power comparison", () => {
    const attackerFleet: Forces = { ...emptyForces, fighters: 200, lightCruisers: 50 };
    const defenderFleet: Forces = { ...emptyForces, stations: 5 };

    const result = resolveOrbitalCombat(attackerFleet, defenderFleet, 0.5);

    expect(result.phase).toBe("orbital");
    expect(result.phaseNumber).toBe(2);
    // Attacker should win with superior numbers
    expect(result.winner).toBe("attacker");
  });
});

// =============================================================================
// GROUND COMBAT TESTS
// =============================================================================

describe("Ground Combat (PRD 6.7 Phase 3)", () => {
  it("soldiers should dominate ground combat", () => {
    const soldierForce: Forces = { ...emptyForces, soldiers: 1000 };
    const fighterForce: Forces = { ...emptyForces, fighters: 100 };

    const soldierPower = calculateGroundPhasePower(soldierForce, false);
    const fighterPower = calculateGroundPhasePower(fighterForce, false);

    // Soldiers have HIGH effectiveness (1.0), fighters have LOW (0.25)
    expect(soldierPower).toBeGreaterThan(fighterPower);
  });

  it("should apply defender advantage in ground combat", () => {
    const force: Forces = { ...emptyForces, soldiers: 500 };

    const attackPower = calculateGroundPhasePower(force, false);
    const defensePower = calculateGroundPhasePower(force, true);

    // Reduced from 1.2× to 1.1× for better combat balance
    expect(defensePower).toBeCloseTo(attackPower * 1.1, 1);
  });

  it("should calculate soldier casualties", () => {
    const attackerForce: Forces = { ...emptyForces, soldiers: 1000 };
    const defenderForce: Forces = { ...emptyForces, soldiers: 500 };

    const result = resolveGroundCombat(attackerForce, defenderForce, 0.5);

    expect(result.phase).toBe("ground");
    expect(result.phaseNumber).toBe(3);
    expect(result.attackerCasualties.soldiers).toBeGreaterThan(0);
    expect(result.defenderCasualties.soldiers).toBeGreaterThan(0);
  });
});

// =============================================================================
// FULL INVASION TESTS
// =============================================================================

describe("Full Invasion (3-Phase Combat)", () => {
  it("should resolve all 3 phases in order", () => {
    // Attacker needs to overcome 1.2× defender advantage in each phase
    // Use stronger attacker to ensure all phases complete
    const strongAttacker: Forces = {
      soldiers: 2000,
      fighters: 200,
      stations: 0,
      lightCruisers: 100,
      heavyCruisers: 50,
      carriers: 40,
    };
    const weakDefender: Forces = {
      soldiers: 500,
      fighters: 50,
      stations: 5,
      lightCruisers: 20,
      heavyCruisers: 10,
      carriers: 0,
    };

    const result = resolveInvasion(strongAttacker, weakDefender, 20, 0.5);

    expect(result.phases.length).toBe(3);
    expect(result.phases[0]!.phase).toBe("space");
    expect(result.phases[0]!.phaseNumber).toBe(1);
    expect(result.phases[1]!.phase).toBe("orbital");
    expect(result.phases[1]!.phaseNumber).toBe(2);
    expect(result.phases[2]!.phase).toBe("ground");
    expect(result.phases[2]!.phaseNumber).toBe(3);
  });

  it("should stop at space phase if defender wins", () => {
    const weakAttacker: Forces = { ...emptyForces, lightCruisers: 5 };
    const strongDefender: Forces = { ...emptyForces, lightCruisers: 100 };

    const result = resolveInvasion(weakAttacker, strongDefender, 20, 0.5);

    expect(result.outcome).toBe("defender_victory");
    // Only space phase resolves (attacker loses there)
    expect(result.phases.length).toBe(1);
  });

  it("should capture sectors on attacker victory (5-15%)", () => {
    const strongAttacker: Forces = {
      soldiers: 5000,
      fighters: 200,
      stations: 0,
      lightCruisers: 100,
      heavyCruisers: 50,
      carriers: 100,
    };
    const weakDefender: Forces = { ...emptyForces, soldiers: 100 };

    const result = resolveInvasion(strongAttacker, weakDefender, 20, 0.5);

    if (result.outcome === "attacker_victory") {
      // 5-15% of 20 sectors = 1-3 sectors
      expect(result.sectorsCaptured).toBeGreaterThanOrEqual(1);
      expect(result.sectorsCaptured).toBeLessThanOrEqual(3);
    }
  });

  it("should limit soldiers by carrier capacity", () => {
    const tooManySoldiers: Forces = {
      soldiers: 10000, // 10000 soldiers
      fighters: 0,
      stations: 0,
      lightCruisers: 50,
      heavyCruisers: 25,
      carriers: 5, // Only 5 carriers = 500 soldier capacity
    };
    const defender: Forces = { ...emptyForces, soldiers: 100 };

    const result = resolveInvasion(tooManySoldiers, defender, 10, 0.5);

    // Ground phase should reflect limited soldiers
    const groundPhase = result.phases.find(p => p.phase === "ground");
    if (groundPhase) {
      // Max transportable: 5 * 100 = 500 soldiers
      expect(groundPhase.attackerForcesStart.soldiers).toBeLessThanOrEqual(SOLDIERS_PER_CARRIER * 5);
    }
  });

  it("should calculate total casualties across all phases", () => {
    const result = resolveInvasion(balancedFleet, balancedFleet, 20, 0.5);

    // Total casualties should be sum of all phase casualties
    let expectedSoldiers = 0;
    for (const phase of result.phases) {
      expectedSoldiers += phase.attackerCasualties.soldiers ?? 0;
    }

    expect(result.attackerTotalCasualties.soldiers).toBe(expectedSoldiers);
  });

  it("should apply effectiveness changes based on outcome", () => {
    const strongAttacker: Forces = {
      soldiers: 5000,
      fighters: 200,
      stations: 0,
      lightCruisers: 100,
      heavyCruisers: 50,
      carriers: 100,
    };
    const weakDefender: Forces = { ...emptyForces };

    const result = resolveInvasion(strongAttacker, weakDefender, 10, 0.5);

    if (result.outcome === "attacker_victory") {
      // Winner gets +5-10% effectiveness
      expect(result.attackerEffectivenessChange).toBeGreaterThanOrEqual(5);
      expect(result.attackerEffectivenessChange).toBeLessThanOrEqual(10);
      // Loser gets -5%
      expect(result.defenderEffectivenessChange).toBe(-5);
    }
  });
});

// =============================================================================
// GUERILLA ATTACK TESTS
// =============================================================================

describe("Guerilla Attack", () => {
  it("should only use soldiers", () => {
    const result = resolveGuerillaAttack(1000, { ...emptyForces, soldiers: 500 }, 0.5);

    expect(result.phases.length).toBe(1);
    expect(result.phases[0]!.phase).toBe("guerilla");

    // Only soldier casualties
    expect(result.attackerTotalCasualties.soldiers).toBeGreaterThan(0);
    expect(result.attackerTotalCasualties.fighters).toBe(0);
  });

  it("should not capture sectors", () => {
    const result = resolveGuerillaAttack(1000, { ...emptyForces, soldiers: 100 }, 0.5);

    expect(result.sectorsCaptured).toBe(0);
  });
});

// =============================================================================
// RETREAT TESTS
// =============================================================================

describe("Retreat (PRD 6.4)", () => {
  it("should apply 15% casualties on retreat", () => {
    const forces: Forces = {
      soldiers: 1000,
      fighters: 100,
      stations: 10, // Stations don't retreat
      lightCruisers: 50,
      heavyCruisers: 25,
      carriers: 20,
    };

    const result = resolveRetreat(forces);

    expect(result.outcome).toBe("retreat");
    expect(result.attackerTotalCasualties.soldiers).toBe(150); // 15% of 1000
    expect(result.attackerTotalCasualties.fighters).toBe(15); // 15% of 100
    expect(result.attackerTotalCasualties.stations).toBe(0); // Stations don't retreat
    expect(result.attackerTotalCasualties.lightCruisers).toBe(7); // 15% of 50
    expect(result.attackerTotalCasualties.heavyCruisers).toBe(3); // 15% of 25
    expect(result.attackerTotalCasualties.carriers).toBe(3); // 15% of 20
  });

  it("should apply -5% effectiveness penalty", () => {
    const result = resolveRetreat(balancedFleet);

    expect(result.attackerEffectivenessChange).toBe(-5);
  });
});

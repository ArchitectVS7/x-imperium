/**
 * Bot Battle Simulator
 *
 * Headless game simulation engine that runs bot-vs-bot battles
 * using pure game logic functions. No database required.
 *
 * This validates all game systems work together and collects
 * balance statistics for game tuning.
 */

import type {
  SimulationState,
  SimulationConfig,
  SimulationResult,
  SimulatedEmpire,
  TrackedAction,
  SystemCoverage,
  ActionOutcome,
  CombatOutcomeRecord,
} from "./types";
import { createEmpires, calculateSimulatedNetworth } from "./empire-factory";
import type { BotDecision, BotDecisionContext, EmpireTarget, Forces } from "@/lib/bots/types";
import { generateBotDecision } from "@/lib/bots/decision-engine";
import {
  resolveInvasion,
  resolveGuerillaAttack,
  type CombatResult,
} from "@/lib/combat";
import {
  calculateFoodConsumption,
  calculatePopulationGrowth,
  calculateStarvationLoss,
} from "@/lib/formulas";
import { PLANET_PRODUCTION } from "@/lib/game/constants";
import { PLANET_MAINTENANCE_COST } from "@/lib/game/services/resource-engine";
import { UNIT_COSTS } from "@/lib/game/unit-config";
import type { CivilStatusLevel } from "@/lib/game/constants";
import { evaluateCivilStatus, type CivilStatusEvent } from "@/lib/game/services/civil-status";

// =============================================================================
// SIMULATION STATE INITIALIZATION
// =============================================================================

/**
 * Create initial simulation state
 */
export function createSimulationState(config: SimulationConfig): SimulationState {
  return {
    gameId: `sim-${Date.now()}`,
    currentTurn: 1,
    turnLimit: config.turnLimit,
    protectionTurns: config.protectionTurns,
    empires: createEmpires(config),
    marketPrices: {
      credits: 1.0,
      food: 1.0,
      ore: 1.0,
      petroleum: 1.0,
    },
    treaties: [],
  };
}

/**
 * Create empty system coverage tracker
 */
function createEmptyCoverage(): SystemCoverage {
  return {
    buildUnits: { count: 0, unitTypes: new Set() },
    buyPlanet: { count: 0, planetTypes: new Set() },
    attacks: { count: 0, invasions: 0, guerilla: 0 },
    diplomacy: { count: 0, naps: 0, alliances: 0 },
    trades: { count: 0, buys: 0, sells: 0 },
    covertOps: { count: 0, operationTypes: new Set() },

    combatResolved: false,
    marketUsed: false,
    researchAdvanced: false,
    civilStatusChanged: false,
    starvationOccurred: false,
    bankruptcyOccurred: false,
    eliminationOccurred: false,
    victoryAchieved: false,

    conquestChecked: false,
    economicChecked: false,
    survivalChecked: false,
  };
}

// =============================================================================
// MAIN SIMULATION LOOP
// =============================================================================

/**
 * Run a complete simulation
 */
export function runSimulation(config: SimulationConfig): SimulationResult {
  const startTime = performance.now();

  const state = createSimulationState(config);
  const actions: TrackedAction[] = [];
  const coverage = createEmptyCoverage();

  // Run turns until victory or turn limit
  while (state.currentTurn < state.turnLimit) {
    // Check if only one empire remains
    const activeEmpires = state.empires.filter((e) => !e.isEliminated);
    if (activeEmpires.length <= 1) {
      coverage.eliminationOccurred = true;
      break;
    }

    // Process all empires
    for (const empire of activeEmpires) {
      processTurn(state, empire, actions, coverage, config.verbose);
    }

    // Check victory conditions
    const winner = checkVictoryConditions(state, coverage);
    if (winner) {
      coverage.victoryAchieved = true;
      return {
        finalState: state,
        actions,
        coverage,
        winner: {
          empireId: winner.id,
          empireName: winner.name,
          archetype: winner.archetype,
          victoryType: winner.victoryType,
        },
        turnsPlayed: state.currentTurn,
        durationMs: Math.round(performance.now() - startTime),
      };
    }

    state.currentTurn++;
  }

  // Survival victory at turn limit
  const survivalWinner = determineSurvivalWinner(state);
  coverage.survivalChecked = true;

  return {
    finalState: state,
    actions,
    coverage,
    winner: survivalWinner
      ? {
          empireId: survivalWinner.id,
          empireName: survivalWinner.name,
          archetype: survivalWinner.archetype,
          victoryType: "survival",
        }
      : undefined,
    turnsPlayed: state.currentTurn,
    durationMs: Math.round(performance.now() - startTime),
  };
}

// =============================================================================
// TURN PROCESSING
// =============================================================================

/**
 * Process a single turn for one empire
 */
function processTurn(
  state: SimulationState,
  empire: SimulatedEmpire,
  actions: TrackedAction[],
  coverage: SystemCoverage,
  verbose: boolean
): void {
  // Phase 1: Resource production
  processResourceProduction(empire);

  // Phase 2: Population update
  processPopulation(empire, coverage);

  // Phase 3: Civil status evaluation
  processCivilStatus(empire, coverage);

  // Phase 4: Bot decision and action
  const decision = generateDecision(state, empire);
  const outcome = executeDecision(state, empire, decision, coverage);

  // Track the action
  actions.push({
    turn: state.currentTurn,
    empireId: empire.id,
    empireName: empire.name,
    decision,
    outcome,
  });

  if (verbose && outcome.type !== "no_op") {
    console.log(`[T${state.currentTurn}] ${empire.name}: ${decision.type}`, outcome);
  }

  // Phase 5: Maintenance
  processMaintenance(empire, coverage);

  // Phase 6: Covert point generation
  empire.covertPoints = Math.min(50, empire.covertPoints + 5);

  // Phase 7: Research production (from research planets)
  const researchPlanets = empire.planets.filter((p) => p.type === "research");
  if (researchPlanets.length > 0) {
    const rpGained = researchPlanets.length * 100;
    empire.researchPoints += rpGained;

    // Check for research level up (exponential cost: 1000 * 2^level)
    const nextLevelCost = 1000 * Math.pow(2, empire.researchLevel);
    if (empire.researchPoints >= nextLevelCost && empire.researchLevel < 7) {
      empire.researchPoints -= nextLevelCost;
      empire.researchLevel++;
      coverage.researchAdvanced = true;
    }
  }

  // Update networth
  empire.networth = calculateSimulatedNetworth(empire);

  // Check for elimination
  if (empire.planets.length === 0 || empire.population <= 0) {
    empire.isEliminated = true;
    empire.eliminatedAtTurn = state.currentTurn;
    coverage.eliminationOccurred = true;
  }
}

// =============================================================================
// RESOURCE PROCESSING
// =============================================================================

function processResourceProduction(empire: SimulatedEmpire): void {
  for (const planet of empire.planets) {
    switch (planet.type) {
      case "food":
        empire.food += planet.productionRate;
        break;
      case "ore":
        empire.ore += planet.productionRate;
        break;
      case "petroleum":
        empire.petroleum += planet.productionRate;
        break;
      case "tourism":
        empire.credits += planet.productionRate;
        break;
      case "urban":
        empire.credits += 1000;
        empire.populationCap += 10000;
        break;
    }
  }
}

function processPopulation(empire: SimulatedEmpire, coverage: SystemCoverage): void {
  // Food consumption
  const foodNeeded = calculateFoodConsumption(empire.population);

  if (empire.food >= foodNeeded) {
    // Enough food - consume and grow
    empire.food -= foodNeeded;
    const growth = calculatePopulationGrowth(empire.population, empire.food, empire.populationCap);
    empire.population = Math.min(empire.populationCap, empire.population + growth);
  } else {
    // Starvation
    empire.food = 0;
    const loss = calculateStarvationLoss(empire.population, foodNeeded - empire.food);
    empire.population = Math.max(100, empire.population - loss);
    coverage.starvationOccurred = true;
  }
}

function processCivilStatus(empire: SimulatedEmpire, coverage: SystemCoverage): void {
  const events: CivilStatusEvent[] = [];

  // Check food status
  const foodNeeded = calculateFoodConsumption(empire.population);
  if (empire.food < foodNeeded) {
    events.push({ type: "starvation", severity: 1.0 });
  } else if (empire.food > foodNeeded * 2) {
    events.push({ type: "food_surplus", consecutiveTurns: 1 });
  }

  // Check maintenance burden
  const maintenanceCost = empire.planets.length * PLANET_MAINTENANCE_COST;
  const maintenanceRatio = maintenanceCost / Math.max(1, empire.credits);
  if (maintenanceRatio > 0.8) {
    events.push({ type: "high_maintenance", severity: maintenanceRatio });
  }

  // Evaluate status change
  const statusUpdate = evaluateCivilStatus(
    empire.civilStatus as CivilStatusLevel,
    events
  );

  if (statusUpdate.changed) {
    empire.civilStatus = statusUpdate.newStatus;
    coverage.civilStatusChanged = true;
  }
}

function processMaintenance(empire: SimulatedEmpire, coverage: SystemCoverage): void {
  // Planet maintenance
  const planetCost = empire.planets.length * PLANET_MAINTENANCE_COST;

  // Unit maintenance (simplified)
  const unitCost =
    empire.soldiers * 1 +
    empire.fighters * 5 +
    empire.stations * 50 +
    empire.lightCruisers * 10 +
    empire.heavyCruisers * 20 +
    empire.carriers * 30 +
    empire.covertAgents * 20;

  const totalCost = planetCost + unitCost;

  if (empire.credits >= totalCost) {
    empire.credits -= totalCost;
  } else {
    // Bankruptcy - can't pay
    empire.credits = 0;
    coverage.bankruptcyOccurred = true;

    // Desertion: lose some units
    empire.soldiers = Math.floor(empire.soldiers * 0.9);
    empire.fighters = Math.floor(empire.fighters * 0.9);
  }
}

// =============================================================================
// DECISION GENERATION
// =============================================================================

function generateDecision(state: SimulationState, empire: SimulatedEmpire): BotDecision {
  // Build target list
  const targets: EmpireTarget[] = state.empires
    .filter((e) => !e.isEliminated && e.id !== empire.id)
    .map((e) => ({
      id: e.id,
      name: e.name,
      networth: e.networth,
      planetCount: e.planets.length,
      isBot: true,
      isEliminated: e.isEliminated,
      militaryPower:
        e.soldiers +
        e.fighters * 3 +
        e.lightCruisers * 5 +
        e.heavyCruisers * 8 +
        e.carriers * 12,
    }));

  // Build context (convert SimulatedEmpire to match expected Empire type)
  const context: BotDecisionContext = {
    empire: {
      id: empire.id,
      name: empire.name,
      credits: empire.credits,
      food: empire.food,
      ore: empire.ore,
      petroleum: empire.petroleum,
      researchPoints: empire.researchPoints,
      population: empire.population,
      populationCap: empire.populationCap,
      civilStatus: empire.civilStatus,
      soldiers: empire.soldiers,
      fighters: empire.fighters,
      stations: empire.stations,
      lightCruisers: empire.lightCruisers,
      heavyCruisers: empire.heavyCruisers,
      carriers: empire.carriers,
      covertAgents: empire.covertAgents,
      planetCount: empire.planets.length,
      networth: empire.networth,
      isEliminated: empire.isEliminated,
      type: "bot",
    } as any,
    planets: empire.planets.map((p) => ({
      id: p.id,
      type: p.type,
      productionRate: String(p.productionRate),
    })) as any,
    gameId: state.gameId,
    currentTurn: state.currentTurn,
    protectionTurns: state.protectionTurns,
    difficulty: "normal",
    availableTargets: targets,
  };

  return generateBotDecision(context);
}

// =============================================================================
// DECISION EXECUTION
// =============================================================================

function executeDecision(
  state: SimulationState,
  empire: SimulatedEmpire,
  decision: BotDecision,
  coverage: SystemCoverage
): ActionOutcome {
  switch (decision.type) {
    case "build_units":
      return executeBuildUnits(empire, decision, coverage);

    case "buy_planet":
      return executeBuyPlanet(empire, decision, coverage);

    case "attack":
      return executeAttack(state, empire, decision, coverage);

    case "diplomacy":
    case "trade":
    case "do_nothing":
      return { type: "no_op" };

    default:
      return { type: "no_op" };
  }
}

function executeBuildUnits(
  empire: SimulatedEmpire,
  decision: Extract<BotDecision, { type: "build_units" }>,
  coverage: SystemCoverage
): ActionOutcome {
  const { unitType, quantity } = decision;
  const unitCost = UNIT_COSTS[unitType] ?? 100;
  const totalCost = unitCost * quantity;

  if (empire.credits < totalCost) {
    return { type: "failure", reason: "Insufficient credits" };
  }

  empire.credits -= totalCost;

  // Add units immediately (simplified - no build queue in simulation)
  switch (unitType) {
    case "soldiers":
      empire.soldiers += quantity;
      break;
    case "fighters":
      empire.fighters += quantity;
      break;
    case "stations":
      empire.stations += quantity;
      break;
    case "lightCruisers":
      empire.lightCruisers += quantity;
      break;
    case "heavyCruisers":
      empire.heavyCruisers += quantity;
      break;
    case "carriers":
      empire.carriers += quantity;
      break;
    case "covertAgents":
      empire.covertAgents += quantity;
      break;
  }

  coverage.buildUnits.count++;
  coverage.buildUnits.unitTypes.add(unitType);

  return { type: "success", details: `Built ${quantity} ${unitType}` };
}

function executeBuyPlanet(
  empire: SimulatedEmpire,
  decision: Extract<BotDecision, { type: "buy_planet" }>,
  coverage: SystemCoverage
): ActionOutcome {
  const { planetType } = decision;

  // Calculate cost with scaling (5% per owned planet)
  const baseCost = getPlanetBaseCost(planetType);
  const scaledCost = Math.floor(baseCost * (1 + empire.planets.length * 0.05));

  if (empire.credits < scaledCost) {
    return { type: "failure", reason: "Insufficient credits" };
  }

  empire.credits -= scaledCost;
  empire.planets.push({
    id: `${empire.id}-planet-${empire.planets.length}`,
    type: planetType,
    productionRate: PLANET_PRODUCTION[planetType] ?? 0,
  });

  coverage.buyPlanet.count++;
  coverage.buyPlanet.planetTypes.add(planetType);

  return { type: "success", details: `Bought ${planetType} planet` };
}

function getPlanetBaseCost(type: string): number {
  const costs: Record<string, number> = {
    food: 8000,
    ore: 6000,
    petroleum: 11500,
    tourism: 8000,
    urban: 8000,
    education: 8000,
    government: 7500,
    research: 23000,
    supply: 11500,
    anti_pollution: 10500,
  };
  return costs[type] ?? 8000;
}

function executeAttack(
  state: SimulationState,
  attacker: SimulatedEmpire,
  decision: Extract<BotDecision, { type: "attack" }>,
  coverage: SystemCoverage
): ActionOutcome {
  const { targetId, forces } = decision;

  // Find defender
  const defender = state.empires.find((e) => e.id === targetId);
  if (!defender || defender.isEliminated) {
    return { type: "failure", reason: "Target not found" };
  }

  // Check if attacker has the forces
  if (
    forces.soldiers > attacker.soldiers ||
    forces.fighters > attacker.fighters ||
    forces.carriers > attacker.carriers
  ) {
    return { type: "failure", reason: "Insufficient forces" };
  }

  // Deduct forces from attacker (they're committed to the attack)
  attacker.soldiers -= forces.soldiers;
  attacker.fighters -= forces.fighters;
  attacker.lightCruisers -= forces.lightCruisers;
  attacker.heavyCruisers -= forces.heavyCruisers;
  attacker.carriers -= forces.carriers;

  // Build defender forces
  const defenderForces: Forces = {
    soldiers: defender.soldiers,
    fighters: defender.fighters,
    stations: defender.stations,
    lightCruisers: defender.lightCruisers,
    heavyCruisers: defender.heavyCruisers,
    carriers: defender.carriers,
  };

  // Resolve combat using pure combat functions
  // resolveInvasion(attackerForces, defenderForces, defenderPlanetCount)
  const combatResult = resolveInvasion(forces, defenderForces, defender.planets.length);

  // CombatResult has:
  // - outcome: "attacker_victory" | "defender_victory" | "retreat" | "stalemate"
  // - attackerTotalCasualties: Forces
  // - defenderTotalCasualties: Forces
  // - planetsCaptured: number

  // Calculate survivors from casualties
  const attackerSurvivors: Forces = {
    soldiers: Math.max(0, forces.soldiers - combatResult.attackerTotalCasualties.soldiers),
    fighters: Math.max(0, forces.fighters - combatResult.attackerTotalCasualties.fighters),
    stations: Math.max(0, forces.stations - combatResult.attackerTotalCasualties.stations),
    lightCruisers: Math.max(0, forces.lightCruisers - combatResult.attackerTotalCasualties.lightCruisers),
    heavyCruisers: Math.max(0, forces.heavyCruisers - combatResult.attackerTotalCasualties.heavyCruisers),
    carriers: Math.max(0, forces.carriers - combatResult.attackerTotalCasualties.carriers),
  };

  const defenderSurvivors: Forces = {
    soldiers: Math.max(0, defenderForces.soldiers - combatResult.defenderTotalCasualties.soldiers),
    fighters: Math.max(0, defenderForces.fighters - combatResult.defenderTotalCasualties.fighters),
    stations: Math.max(0, defenderForces.stations - combatResult.defenderTotalCasualties.stations),
    lightCruisers: Math.max(0, defenderForces.lightCruisers - combatResult.defenderTotalCasualties.lightCruisers),
    heavyCruisers: Math.max(0, defenderForces.heavyCruisers - combatResult.defenderTotalCasualties.heavyCruisers),
    carriers: Math.max(0, defenderForces.carriers - combatResult.defenderTotalCasualties.carriers),
  };

  // Return surviving attackers to empire
  attacker.soldiers += attackerSurvivors.soldiers;
  attacker.fighters += attackerSurvivors.fighters;
  attacker.lightCruisers += attackerSurvivors.lightCruisers;
  attacker.heavyCruisers += attackerSurvivors.heavyCruisers;
  attacker.carriers += attackerSurvivors.carriers;

  // Update defender forces
  defender.soldiers = defenderSurvivors.soldiers;
  defender.fighters = defenderSurvivors.fighters;
  defender.stations = defenderSurvivors.stations;
  defender.lightCruisers = defenderSurvivors.lightCruisers;
  defender.heavyCruisers = defenderSurvivors.heavyCruisers;
  defender.carriers = defenderSurvivors.carriers;

  // Transfer planets if attacker won
  let planetsTransferred = combatResult.planetsCaptured;
  if (combatResult.outcome === "attacker_victory" && combatResult.planetsCaptured > 0) {
    for (let i = 0; i < combatResult.planetsCaptured && defender.planets.length > 0; i++) {
      const planet = defender.planets.pop()!;
      planet.id = `${attacker.id}-captured-${attacker.planets.length}`;
      attacker.planets.push(planet);
    }
  }

  coverage.attacks.count++;
  coverage.attacks.invasions++;
  coverage.combatResolved = true;

  // Determine winner string for outcome
  const winner: "attacker" | "defender" | "draw" =
    combatResult.outcome === "attacker_victory"
      ? "attacker"
      : combatResult.outcome === "defender_victory"
        ? "defender"
        : "draw";

  const combatOutcome: CombatOutcomeRecord = {
    attackerId: attacker.id,
    defenderId: defender.id,
    attackerLosses: combatResult.attackerTotalCasualties,
    defenderLosses: combatResult.defenderTotalCasualties,
    planetsTransferred,
    winner,
  };

  return { type: "combat", result: combatOutcome };
}

// =============================================================================
// VICTORY CONDITIONS
// =============================================================================

interface VictoryWinner extends SimulatedEmpire {
  victoryType: string;
}

function checkVictoryConditions(
  state: SimulationState,
  coverage: SystemCoverage
): VictoryWinner | null {
  const activeEmpires = state.empires.filter((e) => !e.isEliminated);
  const totalPlanets = state.empires.reduce((sum, e) => sum + e.planets.length, 0);

  // Conquest: Control 60% of territory
  coverage.conquestChecked = true;
  for (const empire of activeEmpires) {
    if (empire.planets.length >= totalPlanets * 0.6) {
      return { ...empire, victoryType: "conquest" };
    }
  }

  // Economic: 1.5x networth of 2nd place
  coverage.economicChecked = true;
  const sortedByNetworth = [...activeEmpires].sort((a, b) => b.networth - a.networth);
  if (sortedByNetworth.length >= 2) {
    const first = sortedByNetworth[0]!;
    const second = sortedByNetworth[1]!;
    if (first.networth >= second.networth * 1.5) {
      return { ...first, victoryType: "economic" };
    }
  }

  // Research: Complete all 8 levels
  for (const empire of activeEmpires) {
    if (empire.researchLevel >= 7) {
      return { ...empire, victoryType: "research" };
    }
  }

  return null;
}

function determineSurvivalWinner(state: SimulationState): SimulatedEmpire | null {
  const activeEmpires = state.empires.filter((e) => !e.isEliminated);
  if (activeEmpires.length === 0) return null;

  // Sort by networth
  const sorted = [...activeEmpires].sort((a, b) => b.networth - a.networth);
  const firstPlace = sorted[0];
  const secondPlace = sorted[1];

  if (!firstPlace) return null;

  // If only one remains, they win
  if (!secondPlace) return firstPlace;

  // Scale economic threshold based on player count:
  // - 2 players: 1.5× (hard to achieve)
  // - 4 players: 1.4×
  // - 10+ players: 1.25× (easier with more competition)
  const playerCount = state.empires.length;
  const baseMultiplier = 1.5;
  const scaleFactor = Math.max(0.8, 1.0 - (playerCount - 2) * 0.05);
  const ECONOMIC_MULTIPLIER = baseMultiplier * scaleFactor;

  if (firstPlace.networth >= secondPlace.networth * ECONOMIC_MULTIPLIER) {
    return firstPlace;
  }

  // No winner - game ends in stalemate
  return null;
}

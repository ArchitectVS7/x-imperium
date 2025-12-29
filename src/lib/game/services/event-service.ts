/**
 * Event Service (M11)
 *
 * Applies galactic events to the game state.
 * Handles effect application, empire selection, and event recording.
 *
 * @see src/lib/events/ for event definitions
 * @see docs/MILESTONES.md Milestone 11
 */

import { db } from "@/lib/db";
import {
  empires,
  marketPrices,
  type Empire,
  type Game,
} from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import type {
  GalacticEvent,
  EventEffect,
  ResourceEffect,
  ProductionEffect,
  PriceEffect,
  CivilStatusEffect,
  MilitaryEffect,
  PopulationEffect,
  ResearchEffect,
} from "@/lib/events/types";
import {
  shouldEventTrigger,
  selectRandomEvent,
  EVENTS_START_TURN,
  type PrerequisiteContext,
} from "@/lib/events";
import {
  getOccurredEventIds,
  getLastEventTurn,
  recordEvent,
  expireEvents,
} from "../repositories/event-repository";
import { CIVIL_STATUS_LEVELS, type CivilStatusLevel } from "../constants";

// =============================================================================
// TYPES
// =============================================================================

export interface EventApplicationResult {
  success: boolean;
  event: GalacticEvent | null;
  affectedEmpireIds: string[];
  appliedEffects: EventEffect[];
  message: string;
}

export interface ActiveEventModifiers {
  productionBonus: number;
  priceMultipliers: Record<string, number>;
  resourceMultipliers: Record<string, number>;
}

// =============================================================================
// MAIN EVENT PROCESSING
// =============================================================================

/**
 * Process galactic events for a turn.
 * Called during turn processing to check and apply events.
 *
 * @param gameId - Game UUID
 * @param currentTurn - Current game turn
 * @param gameEmpires - All empires in the game
 * @returns Result of event processing
 */
export async function processGalacticEvents(
  gameId: string,
  currentTurn: number,
  gameEmpires: Empire[]
): Promise<EventApplicationResult> {
  // Events don't start until turn 15
  if (currentTurn < EVENTS_START_TURN) {
    return {
      success: true,
      event: null,
      affectedEmpireIds: [],
      appliedEffects: [],
      message: "Events not yet active",
    };
  }

  // Expire old events
  await expireEvents(gameId, currentTurn);

  // Check if an event should trigger
  const lastEventTurn = await getLastEventTurn(gameId);
  const turnsSinceLastEvent = currentTurn - lastEventTurn;

  if (!shouldEventTrigger(turnsSinceLastEvent)) {
    return {
      success: true,
      event: null,
      affectedEmpireIds: [],
      appliedEffects: [],
      message: `No event triggered (${turnsSinceLastEvent} turns since last event)`,
    };
  }

  // Get occurred events for unique filtering
  const occurredEventIds = await getOccurredEventIds(gameId);

  // Find player empire for context
  const playerEmpire = gameEmpires.find((e) => e.type === "player");
  const aliveEmpires = gameEmpires.filter((e) => !e.isEliminated);

  // Build prerequisite context
  const context: Partial<PrerequisiteContext> = {
    turn: currentTurn,
    empireCount: aliveEmpires.length,
    playerNetworth: playerEmpire?.networth ?? 0,
    occurredEventIds,
  };

  // Select a random event
  const event = selectRandomEvent(currentTurn, occurredEventIds, Math.random(), context);

  if (!event) {
    return {
      success: true,
      event: null,
      affectedEmpireIds: [],
      appliedEffects: [],
      message: "No eligible events available",
    };
  }

  // Apply the event
  return applyGalacticEvent(event, gameId, currentTurn, gameEmpires);
}

/**
 * Apply a galactic event to the game.
 *
 * @param event - Event definition to apply
 * @param gameId - Game UUID
 * @param turn - Current turn number
 * @param gameEmpires - All empires in the game
 * @returns Result of event application
 */
export async function applyGalacticEvent(
  event: GalacticEvent,
  gameId: string,
  turn: number,
  gameEmpires: Empire[]
): Promise<EventApplicationResult> {
  try {
    // Determine affected empires based on scope
    const affectedEmpires = selectAffectedEmpires(event, gameEmpires);
    const affectedEmpireIds = affectedEmpires.map((e) => e.id);

    // Apply each effect
    const appliedEffects: EventEffect[] = [];

    for (const effect of event.effects) {
      await applyEffect(effect, affectedEmpires, gameId);
      appliedEffects.push(effect);
    }

    // Record the event in the database
    await recordEvent(gameId, event, turn, affectedEmpireIds, appliedEffects);

    // Build message
    const scopeMessage = event.scope === "global"
      ? "affecting all empires"
      : `affecting ${affectedEmpires.length} empire(s)`;

    return {
      success: true,
      event,
      affectedEmpireIds,
      appliedEffects,
      message: `${event.name}: ${event.description} (${scopeMessage})`,
    };
  } catch (error) {
    console.error("Failed to apply galactic event:", error);
    return {
      success: false,
      event,
      affectedEmpireIds: [],
      appliedEffects: [],
      message: `Failed to apply event: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// =============================================================================
// EMPIRE SELECTION
// =============================================================================

/**
 * Select empires affected by an event based on its scope.
 */
function selectAffectedEmpires(
  event: GalacticEvent,
  gameEmpires: Empire[]
): Empire[] {
  const aliveEmpires = gameEmpires.filter((e) => !e.isEliminated);

  switch (event.scope) {
    case "global":
      return aliveEmpires;

    case "targeted":
      // For targeted events, we need a specific target
      // This should be handled by the caller providing context
      return aliveEmpires.slice(0, 1);

    case "random_empire": {
      if (aliveEmpires.length === 0) return [];
      const randomIndex = Math.floor(Math.random() * aliveEmpires.length);
      return [aliveEmpires[randomIndex]!];
    }

    case "top_empires": {
      const count = event.targetCount ?? 3;
      const sorted = [...aliveEmpires].sort((a, b) => b.networth - a.networth);
      return sorted.slice(0, count);
    }

    case "bottom_empires": {
      const count = event.targetCount ?? 3;
      const sorted = [...aliveEmpires].sort((a, b) => a.networth - b.networth);
      return sorted.slice(0, count);
    }

    case "coalition":
      // Coalition scope requires additional context about coalition members
      // For now, treat as global until coalition system is integrated
      return aliveEmpires;

    default:
      return aliveEmpires;
  }
}

// =============================================================================
// EFFECT APPLICATION
// =============================================================================

/**
 * Apply a single effect to the affected empires.
 */
async function applyEffect(
  effect: EventEffect,
  affectedEmpires: Empire[],
  gameId: string
): Promise<void> {
  switch (effect.type) {
    case "resource_multiplier":
      await applyResourceMultiplier(effect, affectedEmpires);
      break;

    case "production_bonus":
      // Production bonuses are stored and applied during resource calculation
      // No immediate database update needed - tracked via active effects
      break;

    case "price_multiplier":
      await applyPriceMultiplier(effect, gameId);
      break;

    case "civil_status":
      await applyCivilStatusChange(effect, affectedEmpires);
      break;

    case "military":
      await applyMilitaryEffect(effect, affectedEmpires);
      break;

    case "population":
      await applyPopulationEffect(effect, affectedEmpires);
      break;

    case "research":
      await applyResearchEffect(effect, affectedEmpires);
      break;

    case "diplomatic":
      // Diplomatic effects are complex and may need integration with treaty system
      // Log for now
      console.log("Diplomatic effect triggered:", effect);
      break;
  }
}

/**
 * Apply resource multiplier effect.
 * Directly modifies empire resources.
 */
async function applyResourceMultiplier(
  effect: ResourceEffect,
  affectedEmpires: Empire[]
): Promise<void> {
  for (const empire of affectedEmpires) {
    const updates: Partial<Empire> = {};

    if (effect.resource === "all" || effect.resource === "credits") {
      updates.credits = Math.floor(empire.credits * effect.multiplier);
    }
    if (effect.resource === "all" || effect.resource === "food") {
      updates.food = Math.floor(empire.food * effect.multiplier);
    }
    if (effect.resource === "all" || effect.resource === "ore") {
      updates.ore = Math.floor(empire.ore * effect.multiplier);
    }
    if (effect.resource === "all" || effect.resource === "petroleum") {
      updates.petroleum = Math.floor(empire.petroleum * effect.multiplier);
    }
    if (effect.resource === "all" || effect.resource === "research") {
      updates.researchPoints = Math.floor(empire.researchPoints * effect.multiplier);
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(empires)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(empires.id, empire.id));
    }
  }
}

/**
 * Apply price multiplier effect to market prices.
 */
async function applyPriceMultiplier(
  effect: PriceEffect,
  gameId: string
): Promise<void> {
  const prices = await db.query.marketPrices.findMany({
    where: eq(marketPrices.gameId, gameId),
  });

  for (const price of prices) {
    if (effect.resource === "all" || price.resourceType === effect.resource) {
      const newMultiplier = Number(price.priceMultiplier) * effect.multiplier;
      // Clamp between 0.4 and 1.6 (PRD market price bounds)
      const clampedMultiplier = Math.max(0.4, Math.min(1.6, newMultiplier));
      const newPrice = price.basePrice * clampedMultiplier;

      await db
        .update(marketPrices)
        .set({
          priceMultiplier: String(clampedMultiplier),
          currentPrice: String(newPrice),
          lastUpdated: new Date(),
        })
        .where(eq(marketPrices.id, price.id));
    }
  }
}

/**
 * Apply civil status change effect.
 */
async function applyCivilStatusChange(
  effect: CivilStatusEffect,
  affectedEmpires: Empire[]
): Promise<void> {
  for (const empire of affectedEmpires) {
    const currentIndex = CIVIL_STATUS_LEVELS.indexOf(
      empire.civilStatus as CivilStatusLevel
    );
    const newIndex = Math.max(
      0,
      Math.min(CIVIL_STATUS_LEVELS.length - 1, currentIndex - effect.change)
    );
    const newStatus = CIVIL_STATUS_LEVELS[newIndex];

    if (newStatus && newStatus !== empire.civilStatus) {
      await db
        .update(empires)
        .set({
          civilStatus: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(empires.id, empire.id));
    }
  }
}

/**
 * Apply military effect (damage/bonus/effectiveness/maintenance).
 */
async function applyMilitaryEffect(
  effect: MilitaryEffect,
  affectedEmpires: Empire[]
): Promise<void> {
  for (const empire of affectedEmpires) {
    const updates: Partial<Empire> = {};

    switch (effect.subtype) {
      case "damage": {
        // Apply percentage damage to units
        const damageRate = Math.min(1, Math.max(0, effect.value));
        if (!effect.unitTypes || effect.unitTypes.includes("soldiers")) {
          updates.soldiers = Math.floor(empire.soldiers * (1 - damageRate));
        }
        if (!effect.unitTypes || effect.unitTypes.includes("fighters")) {
          updates.fighters = Math.floor(empire.fighters * (1 - damageRate));
        }
        if (!effect.unitTypes || effect.unitTypes.includes("stations")) {
          updates.stations = Math.floor(empire.stations * (1 - damageRate));
        }
        if (!effect.unitTypes || effect.unitTypes.includes("lightCruisers")) {
          updates.lightCruisers = Math.floor(empire.lightCruisers * (1 - damageRate));
        }
        if (!effect.unitTypes || effect.unitTypes.includes("heavyCruisers")) {
          updates.heavyCruisers = Math.floor(empire.heavyCruisers * (1 - damageRate));
        }
        if (!effect.unitTypes || effect.unitTypes.includes("carriers")) {
          updates.carriers = Math.floor(empire.carriers * (1 - damageRate));
        }
        if (!effect.unitTypes || effect.unitTypes.includes("covertAgents")) {
          updates.covertAgents = Math.floor(empire.covertAgents * (1 - damageRate));
        }
        break;
      }

      case "bonus": {
        // Add units (percentage bonus)
        const bonusRate = effect.value;
        if (!effect.unitTypes || effect.unitTypes.includes("soldiers")) {
          updates.soldiers = Math.floor(empire.soldiers * (1 + bonusRate));
        }
        if (!effect.unitTypes || effect.unitTypes.includes("fighters")) {
          updates.fighters = Math.floor(empire.fighters * (1 + bonusRate));
        }
        break;
      }

      case "effectiveness": {
        // Modify army effectiveness
        const currentEffectiveness = Number(empire.armyEffectiveness);
        const newEffectiveness = Math.max(
          0,
          Math.min(100, currentEffectiveness + effect.value)
        );
        updates.armyEffectiveness = String(newEffectiveness);
        break;
      }

      case "maintenance":
        // Maintenance changes are tracked via active effects
        // Applied during turn processing
        break;
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(empires)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(empires.id, empire.id));
    }
  }
}

/**
 * Apply population effect.
 */
async function applyPopulationEffect(
  effect: PopulationEffect,
  affectedEmpires: Empire[]
): Promise<void> {
  for (const empire of affectedEmpires) {
    const change = effect.change;
    const newPopulation = Math.max(
      100, // Minimum population
      Math.floor(empire.population * (1 + change))
    );

    await db
      .update(empires)
      .set({
        population: newPopulation,
        updatedAt: new Date(),
      })
      .where(eq(empires.id, empire.id));
  }
}

/**
 * Apply research effect.
 */
async function applyResearchEffect(
  effect: ResearchEffect,
  affectedEmpires: Empire[]
): Promise<void> {
  for (const empire of affectedEmpires) {
    let change: number;
    if (effect.isPercentage) {
      change = Math.floor(empire.researchPoints * effect.change);
    } else {
      change = effect.change;
    }

    const newResearchPoints = Math.max(0, empire.researchPoints + change);

    await db
      .update(empires)
      .set({
        researchPoints: newResearchPoints,
        updatedAt: new Date(),
      })
      .where(eq(empires.id, empire.id));
  }
}

// =============================================================================
// ACTIVE EFFECT CALCULATION
// =============================================================================

/**
 * Calculate active modifiers from ongoing events.
 * Used during resource calculation to apply duration-based effects.
 *
 * @param gameId - Game UUID
 * @param currentTurn - Current game turn
 * @returns Active modifiers to apply
 */
export async function calculateActiveModifiers(
  gameId: string,
  currentTurn: number
): Promise<ActiveEventModifiers> {
  const { getActiveEffects } = await import("../repositories/event-repository");
  const activeEffects = await getActiveEffects(gameId, currentTurn);

  const modifiers: ActiveEventModifiers = {
    productionBonus: 0,
    priceMultipliers: {},
    resourceMultipliers: {},
  };

  for (const { effects } of activeEffects) {
    for (const effect of effects) {
      if (effect.type === "production_bonus") {
        modifiers.productionBonus += (effect as ProductionEffect).bonus;
      } else if (effect.type === "price_multiplier") {
        const priceEffect = effect as PriceEffect;
        const current = modifiers.priceMultipliers[priceEffect.resource] ?? 1;
        modifiers.priceMultipliers[priceEffect.resource] =
          current * priceEffect.multiplier;
      } else if (effect.type === "resource_multiplier") {
        const resEffect = effect as ResourceEffect;
        const current = modifiers.resourceMultipliers[resEffect.resource] ?? 1;
        modifiers.resourceMultipliers[resEffect.resource] =
          current * resEffect.multiplier;
      }
    }
  }

  return modifiers;
}

/**
 * Economic Galactic Events (PRD 11.2)
 *
 * Market crash, resource boom, trade disruption, etc.
 * These events affect the economy and resource flow across empires.
 */

import type { GalacticEvent } from "./types";

// =============================================================================
// ECONOMIC EVENTS
// =============================================================================

export const ECONOMIC_EVENTS: GalacticEvent[] = [
  // =========================================================================
  // MARKET EVENTS
  // =========================================================================
  {
    id: "market_crash",
    name: "Galactic Market Crash",
    category: "economic",
    scope: "global",
    description: "Market prices plummet across the galaxy",
    narrative:
      "A cascade of failed investments has triggered a galaxy-wide market crash. " +
      "Prices have fallen sharply, creating opportunities for shrewd buyers but devastating sellers.",
    effects: [
      {
        type: "price_multiplier",
        resource: "all",
        multiplier: 0.7, // -30% prices
      },
    ],
    duration: 5,
    probability: 0.05,
    minTurn: 20,
    unique: false,
  },
  {
    id: "market_boom",
    name: "Economic Boom",
    category: "economic",
    scope: "global",
    description: "Galactic economy surges with prosperity",
    narrative:
      "A wave of optimism sweeps the galaxy as trade agreements flourish. " +
      "Markets are bullish and credits flow freely between star systems.",
    effects: [
      {
        type: "price_multiplier",
        resource: "all",
        multiplier: 1.3, // +30% prices
      },
      {
        type: "resource_multiplier",
        resource: "credits",
        multiplier: 1.15, // +15% credit income
      },
    ],
    duration: 5,
    probability: 0.06,
    minTurn: 15,
    unique: false,
  },
  {
    id: "trade_disruption",
    name: "Trade Lane Disruption",
    category: "economic",
    scope: "global",
    description: "Major trade routes become unsafe",
    narrative:
      "Hyperspace anomalies have destabilized key trade corridors. " +
      "Shipping costs have skyrocketed as merchants seek alternative routes.",
    effects: [
      {
        type: "price_multiplier",
        resource: "all",
        multiplier: 1.25, // +25% prices (scarcity)
      },
      {
        type: "production_bonus",
        bonus: -0.1, // -10% production due to supply issues
      },
    ],
    duration: 8,
    probability: 0.04,
    minTurn: 25,
    unique: false,
  },

  // =========================================================================
  // RESOURCE EVENTS
  // =========================================================================
  {
    id: "resource_boom",
    name: "Resource Boom",
    category: "economic",
    scope: "global",
    description: "All production increases significantly",
    narrative:
      "A period of perfect stellar conditions has enhanced mining and farming yields. " +
      "Warehouses overflow with unprecedented abundance.",
    effects: [
      {
        type: "production_bonus",
        bonus: 0.5, // +50% production
      },
    ],
    duration: 5,
    probability: 0.08,
    minTurn: 10,
    unique: false,
  },
  {
    id: "ore_shortage",
    name: "Galactic Ore Shortage",
    category: "economic",
    scope: "global",
    description: "Ore becomes scarce across all sectors",
    narrative:
      "Major asteroid mining operations have reported depleted veins simultaneously. " +
      "The shortage sends ore prices soaring as construction projects stall.",
    effects: [
      {
        type: "price_multiplier",
        resource: "ore",
        multiplier: 1.6, // +60% ore prices
      },
      {
        type: "resource_multiplier",
        resource: "ore",
        multiplier: 0.7, // -30% ore production
      },
    ],
    duration: 10,
    probability: 0.05,
    minTurn: 30,
    unique: false,
  },
  {
    id: "petroleum_discovery",
    name: "Deep Space Petroleum Discovery",
    category: "economic",
    scope: "random_empire",
    description: "Vast petroleum reserves discovered",
    narrative:
      "Explorers have discovered an untapped petroleum reserve of staggering proportions. " +
      "The fortunate empire now sits atop a sea of black gold.",
    effects: [
      {
        type: "resource_multiplier",
        resource: "petroleum",
        multiplier: 2.0, // +100% petroleum production
      },
    ],
    duration: 15,
    probability: 0.03,
    minTurn: 20,
    unique: false,
  },
  {
    id: "food_blight",
    name: "Interstellar Crop Blight",
    category: "economic",
    scope: "global",
    description: "A mysterious blight devastates food production",
    narrative:
      "A rapidly-spreading pathogen has infected agricultural worlds across the galaxy. " +
      "Famine looms as food stores dwindle and civil unrest grows.",
    effects: [
      {
        type: "resource_multiplier",
        resource: "food",
        multiplier: 0.5, // -50% food production
      },
      {
        type: "civil_status",
        change: -1, // Drop 1 civil status level
      },
    ],
    duration: 8,
    probability: 0.04,
    minTurn: 25,
    unique: false,
  },
  {
    id: "golden_harvest",
    name: "Golden Harvest",
    category: "economic",
    scope: "global",
    description: "Unprecedented agricultural yields",
    narrative:
      "Perfect growing conditions have blessed food worlds across the galaxy. " +
      "Granaries overflow and populations celebrate the bounty.",
    effects: [
      {
        type: "resource_multiplier",
        resource: "food",
        multiplier: 1.75, // +75% food production
      },
      {
        type: "civil_status",
        change: 1, // Gain 1 civil status level
      },
    ],
    duration: 6,
    probability: 0.05,
    minTurn: 15,
    unique: false,
  },

  // =========================================================================
  // TAXATION & INCOME EVENTS
  // =========================================================================
  {
    id: "tax_revolt",
    name: "Tax Revolt",
    category: "economic",
    scope: "top_empires",
    targetCount: 3,
    description: "Wealthy citizens refuse to pay taxes",
    narrative:
      "The galaxy's elite have organized a coordinated tax strike. " +
      "The largest empires struggle to maintain their bloated bureaucracies.",
    effects: [
      {
        type: "resource_multiplier",
        resource: "credits",
        multiplier: 0.6, // -40% credit income
      },
    ],
    duration: 5,
    probability: 0.04,
    minTurn: 50,
    unique: false,
  },
  {
    id: "tourism_boom",
    name: "Tourism Renaissance",
    category: "economic",
    scope: "global",
    description: "Interstellar tourism reaches new heights",
    narrative:
      "A cultural renaissance has swept the galaxy, drawing tourists to every corner. " +
      "Tourism planets see record revenues as visitors flock to experience the wonders.",
    effects: [
      {
        type: "production_bonus",
        bonus: 0.5, // +50% tourism income
        planetTypes: ["tourism"],
      },
    ],
    duration: 8,
    probability: 0.06,
    minTurn: 20,
    unique: false,
  },
  {
    id: "hyperinflation",
    name: "Hyperinflation Crisis",
    category: "economic",
    scope: "global",
    description: "Currency values spiral out of control",
    narrative:
      "Reckless monetary policies have triggered runaway inflation. " +
      "Credits are worth less each day as merchants demand more for their goods.",
    effects: [
      {
        type: "price_multiplier",
        resource: "all",
        multiplier: 1.5, // +50% all prices
      },
      {
        type: "military",
        subtype: "maintenance",
        value: 1.3, // +30% maintenance costs
      },
    ],
    duration: 10,
    probability: 0.03,
    minTurn: 40,
    unique: false,
  },

  // =========================================================================
  // LATE GAME ECONOMIC EVENTS
  // =========================================================================
  {
    id: "galactic_depression",
    name: "Galactic Depression",
    category: "economic",
    scope: "global",
    description: "A severe economic downturn grips the galaxy",
    narrative:
      "The interconnected galactic economy has collapsed into depression. " +
      "Trade grinds to a halt, factories close, and empires struggle to maintain basic functions.",
    effects: [
      {
        type: "production_bonus",
        bonus: -0.25, // -25% all production
      },
      {
        type: "resource_multiplier",
        resource: "credits",
        multiplier: 0.6, // -40% credit income
      },
      {
        type: "civil_status",
        change: -1,
      },
    ],
    duration: 15,
    probability: 0.02,
    minTurn: 100,
    unique: true,
  },
  {
    id: "new_technology_era",
    name: "New Technology Era",
    category: "economic",
    scope: "global",
    description: "Breakthrough technologies revolutionize production",
    narrative:
      "A new era of technology dawns across the galaxy. Automation and AI " +
      "dramatically increase efficiency in all sectors of the economy.",
    effects: [
      {
        type: "production_bonus",
        bonus: 0.3, // +30% all production
      },
      {
        type: "research",
        change: 500,
        isPercentage: false,
      },
    ],
    duration: 20,
    probability: 0.03,
    minTurn: 80,
    unique: true,
  },
  {
    id: "monopoly_formation",
    name: "Mega-Corporation Monopoly",
    category: "economic",
    scope: "random_empire",
    description: "A single empire gains market dominance",
    narrative:
      "Through cunning acquisitions and ruthless tactics, one empire has established " +
      "monopolistic control over key trade goods, extracting wealth from all who trade.",
    effects: [
      {
        type: "resource_multiplier",
        resource: "credits",
        multiplier: 1.5, // +50% credits for affected empire
      },
    ],
    duration: 10,
    probability: 0.04,
    minTurn: 60,
    unique: false,
    prerequisites: [
      { type: "player_networth", min: 1000 }, // Must be substantial empire
    ],
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all economic events that can occur at a given turn.
 */
export function getAvailableEconomicEvents(turn: number): GalacticEvent[] {
  return ECONOMIC_EVENTS.filter((event) => {
    const minTurnMet = !event.minTurn || turn >= event.minTurn;
    const maxTurnMet = !event.maxTurn || turn <= event.maxTurn;
    return minTurnMet && maxTurnMet;
  });
}

/**
 * Get economic events by scope.
 */
export function getEconomicEventsByScope(
  scope: GalacticEvent["scope"]
): GalacticEvent[] {
  return ECONOMIC_EVENTS.filter((event) => event.scope === scope);
}

/**
 * Get total probability weight for economic events at a given turn.
 */
export function getEconomicEventProbabilityWeight(turn: number): number {
  return getAvailableEconomicEvents(turn).reduce(
    (sum, event) => sum + event.probability,
    0
  );
}

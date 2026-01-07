/**
 * Military Galactic Events (PRD 11.2)
 *
 * Pirate armadas, alien incursions, arms races, etc.
 * These events affect military strength, combat, and security.
 */

import type { GalacticEvent } from "./types";

// =============================================================================
// MILITARY EVENTS
// =============================================================================

export const MILITARY_EVENTS: GalacticEvent[] = [
  // =========================================================================
  // PIRATE EVENTS
  // =========================================================================
  {
    id: "pirate_raid",
    name: "Pirate Raid",
    category: "military",
    scope: "random_empire",
    description: "Pirates attack vulnerable trade routes",
    narrative:
      "A notorious pirate fleet has struck deep into imperial territory. " +
      "Convoys are plundered and merchant vessels flee for safety.",
    effects: [
      {
        type: "resource_multiplier",
        resource: "credits",
        multiplier: 0.9, // -10% income
      },
    ],
    duration: 3,
    probability: 0.08,
    minTurn: 15,
    unique: false,
  },
  {
    id: "pirate_armada",
    name: "Pirate Armada",
    category: "military",
    scope: "global",
    description: "A massive pirate fleet threatens the galaxy",
    narrative:
      "The dreaded Crimson Fleet has assembled the largest pirate armada in history. " +
      "All empires must divert forces to protect their borders from this scourge.",
    effects: [
      {
        type: "military",
        subtype: "damage",
        value: -0.05, // Lose 5% of units fighting pirates
      },
      {
        type: "resource_multiplier",
        resource: "credits",
        multiplier: 0.85, // -15% income
      },
    ],
    duration: 10,
    probability: 0.04,
    minTurn: 40,
    unique: false,
  },
  {
    id: "pirate_haven_destroyed",
    name: "Pirate Haven Destroyed",
    category: "military",
    scope: "global",
    description: "A major pirate base is eliminated",
    narrative:
      "A coordinated strike has destroyed the infamous Tortuga Station. " +
      "Trade routes are safer, and merchants celebrate throughout the galaxy.",
    effects: [
      {
        type: "resource_multiplier",
        resource: "credits",
        multiplier: 1.15, // +15% income (safer trade)
      },
      {
        type: "civil_status",
        change: 1,
      },
    ],
    duration: 15,
    probability: 0.03,
    minTurn: 50,
    unique: true,
  },

  // =========================================================================
  // ALIEN & EXTERNAL THREATS
  // =========================================================================
  {
    id: "alien_scouts",
    name: "Unknown Vessels Detected",
    category: "military",
    scope: "global",
    description: "Mysterious ships appear at the galactic rim",
    narrative:
      "Deep space sensors have detected unknown vessels at the edge of explored space. " +
      "Their intentions are unclear, but all empires increase military readiness.",
    effects: [
      {
        type: "military",
        subtype: "maintenance",
        value: 1.1, // +10% maintenance (increased readiness)
      },
    ],
    duration: 5,
    probability: 0.05,
    minTurn: 30,
    unique: false,
  },
  {
    id: "alien_incursion",
    name: "Alien Incursion",
    category: "military",
    scope: "global",
    description: "Hostile aliens attack the galaxy",
    narrative:
      "The mysterious vessels have attacked! An alien species, hostile to all known life, " +
      "has launched a devastating assault. All empires must unite or perish.",
    effects: [
      {
        type: "military",
        subtype: "damage",
        value: -0.1, // Lose 10% of military
      },
      {
        type: "population",
        change: -0.05, // -5% population
      },
      {
        type: "diplomatic",
        subtype: "forced_alliance",
      },
    ],
    duration: 15,
    probability: 0.02,
    minTurn: 80,
    unique: true,
    prerequisites: [
      { type: "previous_event", eventId: "alien_scouts", occurred: true },
    ],
  },
  {
    id: "alien_technology",
    name: "Alien Technology Recovered",
    category: "military",
    scope: "random_empire",
    description: "Salvage from alien vessels yields advanced tech",
    narrative:
      "Engineers have reverse-engineered technology from captured alien vessels. " +
      "New weapons and systems flood into production.",
    effects: [
      {
        type: "research",
        change: 1000,
        isPercentage: false,
      },
      {
        type: "military",
        subtype: "effectiveness",
        value: 0.1, // +10% effectiveness
      },
    ],
    duration: 10,
    probability: 0.03,
    minTurn: 90,
    unique: true,
    prerequisites: [
      { type: "previous_event", eventId: "alien_incursion", occurred: true },
    ],
  },

  // =========================================================================
  // ARMS RACE EVENTS
  // =========================================================================
  {
    id: "arms_race",
    name: "Arms Race Begins",
    category: "military",
    scope: "global",
    description: "All empires rush to build military",
    narrative:
      "Fear and suspicion have triggered a galaxy-wide arms race. " +
      "Factories work overtime producing weapons as the drums of war beat louder.",
    effects: [
      {
        type: "production_bonus",
        bonus: 0.25, // +25% military production
        sectorTypes: ["supply"],
      },
      {
        type: "military",
        subtype: "maintenance",
        value: 0.8, // -20% maintenance (war economy)
      },
    ],
    duration: 15,
    probability: 0.04,
    minTurn: 45,
    unique: false,
  },
  {
    id: "disarmament_treaty",
    name: "Disarmament Treaty",
    category: "military",
    scope: "global",
    description: "Empires agree to reduce military forces",
    narrative:
      "In a breakthrough for peace, major powers have signed a disarmament treaty. " +
      "Armies shrink and resources flow to civilian projects.",
    effects: [
      {
        type: "military",
        subtype: "damage",
        value: -0.15, // Lose 15% of military
      },
      {
        type: "resource_multiplier",
        resource: "credits",
        multiplier: 1.2, // +20% income (peace dividend)
      },
      {
        type: "civil_status",
        change: 1,
      },
    ],
    duration: 20,
    probability: 0.02,
    minTurn: 60,
    unique: true,
  },

  // =========================================================================
  // MILITARY INCIDENTS
  // =========================================================================
  {
    id: "border_skirmish",
    name: "Border Skirmish",
    category: "military",
    scope: "targeted",
    description: "Two empires clash at their borders",
    narrative:
      "A patrol gone wrong has escalated into a firefight. " +
      "Casualties mount as both sides blame the other for the incident.",
    effects: [
      {
        type: "military",
        subtype: "damage",
        value: -0.03, // Lose 3% of military
      },
      {
        type: "diplomatic",
        subtype: "reputation_change",
        value: -10,
      },
    ],
    duration: 5,
    probability: 0.06,
    minTurn: 25,
    unique: false,
  },
  {
    id: "military_parade",
    name: "Grand Military Parade",
    category: "military",
    scope: "top_empires",
    targetCount: 3,
    description: "Powerful empires display their might",
    narrative:
      "The greatest military powers showcase their armies in spectacular parades. " +
      "Observers are awed by the display of firepower and discipline.",
    effects: [
      {
        type: "civil_status",
        change: 1,
      },
      {
        type: "military",
        subtype: "effectiveness",
        value: 0.05, // +5% effectiveness (morale)
      },
    ],
    duration: 5,
    probability: 0.05,
    minTurn: 35,
    unique: false,
  },
  {
    id: "desertion_wave",
    name: "Mass Desertion",
    category: "military",
    scope: "random_empire",
    description: "Soldiers abandon their posts",
    narrative:
      "Poor conditions and low morale have triggered a wave of desertions. " +
      "Units report massive manpower shortages as troops flee.",
    effects: [
      {
        type: "military",
        subtype: "damage",
        value: -0.15, // Lose 15% of soldiers
        unitTypes: ["soldiers"],
      },
      {
        type: "military",
        subtype: "effectiveness",
        value: -0.2, // -20% effectiveness
      },
    ],
    duration: 8,
    probability: 0.03,
    minTurn: 40,
    unique: false,
    prerequisites: [
      { type: "random_chance", probability: 0.5 },
    ],
  },

  // =========================================================================
  // SHIP & FLEET EVENTS
  // =========================================================================
  {
    id: "fleet_accident",
    name: "Fleet Catastrophe",
    category: "military",
    scope: "random_empire",
    description: "A disaster destroys part of a fleet",
    narrative:
      "A catastrophic reactor failure has caused a chain reaction in a fleet formation. " +
      "Dozens of ships are lost before the destruction can be contained.",
    effects: [
      {
        type: "military",
        subtype: "damage",
        value: -0.2, // Lose 20% of space units
        unitTypes: ["fighters", "light_cruisers", "heavy_cruisers"],
      },
    ],
    duration: 0, // Instant
    probability: 0.02,
    minTurn: 30,
    unique: false,
  },
  {
    id: "shipyard_breakthrough",
    name: "Shipyard Breakthrough",
    category: "military",
    scope: "random_empire",
    description: "New production methods increase output",
    narrative:
      "Revolutionary manufacturing techniques have doubled shipyard efficiency. " +
      "New vessels roll off the production lines at unprecedented rates.",
    effects: [
      {
        type: "military",
        subtype: "bonus",
        value: 0.1, // +10% space units
        unitTypes: ["fighters", "light_cruisers", "heavy_cruisers", "carriers"],
      },
    ],
    duration: 10,
    probability: 0.04,
    minTurn: 35,
    unique: false,
  },

  // =========================================================================
  // LATE GAME MILITARY EVENTS
  // =========================================================================
  {
    id: "superweapon_revealed",
    name: "Superweapon Revealed",
    category: "military",
    scope: "top_empires",
    targetCount: 1,
    description: "A devastating weapon is unveiled",
    narrative:
      "The most powerful empire has revealed a weapon of unimaginable destruction. " +
      "The galaxy trembles as a new era of warfare dawns.",
    effects: [
      {
        type: "military",
        subtype: "effectiveness",
        value: 0.25, // +25% effectiveness for wielder
      },
      {
        type: "diplomatic",
        subtype: "reputation_change",
        value: -30, // Fear and suspicion
      },
    ],
    duration: 0, // Permanent unlock
    probability: 0.02,
    minTurn: 100,
    unique: true,
  },
  {
    id: "great_war",
    name: "The Great War Begins",
    category: "military",
    scope: "global",
    description: "A massive galactic conflict erupts",
    narrative:
      "The tensions of decades have finally exploded into galaxy-spanning war. " +
      "Every empire must choose a side as the fires of conflict engulf all.",
    effects: [
      {
        type: "diplomatic",
        subtype: "forced_war",
      },
      {
        type: "military",
        subtype: "maintenance",
        value: 0.7, // -30% maintenance (war economy)
      },
      {
        type: "civil_status",
        change: -1,
      },
    ],
    duration: 30,
    probability: 0.015,
    minTurn: 120,
    unique: true,
  },
  {
    id: "war_weariness",
    name: "War Weariness",
    category: "military",
    scope: "global",
    description: "Populations tire of endless conflict",
    narrative:
      "After years of fighting, populations across the galaxy demand peace. " +
      "Governments face pressure to end hostilities or face revolt.",
    effects: [
      {
        type: "civil_status",
        change: -2,
      },
      {
        type: "military",
        subtype: "effectiveness",
        value: -0.15, // -15% effectiveness
      },
    ],
    duration: 15,
    probability: 0.025,
    minTurn: 140,
    unique: true,
    prerequisites: [
      { type: "previous_event", eventId: "great_war", occurred: true },
    ],
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all military events that can occur at a given turn.
 */
export function getAvailableMilitaryEvents(turn: number): GalacticEvent[] {
  return MILITARY_EVENTS.filter((event) => {
    const minTurnMet = !event.minTurn || turn >= event.minTurn;
    const maxTurnMet = !event.maxTurn || turn <= event.maxTurn;
    return minTurnMet && maxTurnMet;
  });
}

/**
 * Get military events by scope.
 */
export function getMilitaryEventsByScope(
  scope: GalacticEvent["scope"]
): GalacticEvent[] {
  return MILITARY_EVENTS.filter((event) => event.scope === scope);
}

/**
 * Get military events that cause unit losses.
 */
export function getDestructiveMilitaryEvents(): GalacticEvent[] {
  return MILITARY_EVENTS.filter((event) =>
    event.effects.some(
      (effect) => effect.type === "military" && effect.subtype === "damage"
    )
  );
}

/**
 * Get total probability weight for military events at a given turn.
 */
export function getMilitaryEventProbabilityWeight(turn: number): number {
  return getAvailableMilitaryEvents(turn).reduce(
    (sum, event) => sum + event.probability,
    0
  );
}

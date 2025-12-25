/**
 * Political Galactic Events (PRD 11.2)
 *
 * Coups, assassinations, new factions, diplomatic incidents, etc.
 * These events affect governance, stability, and inter-empire relations.
 */

import type { GalacticEvent } from "./types";

// =============================================================================
// POLITICAL EVENTS
// =============================================================================

export const POLITICAL_EVENTS: GalacticEvent[] = [
  // =========================================================================
  // GOVERNMENT INSTABILITY EVENTS
  // =========================================================================
  {
    id: "coup_attempt",
    name: "Military Coup Attempt",
    category: "political",
    scope: "random_empire",
    description: "A faction attempts to seize power",
    narrative:
      "Ambitious generals have launched a coup against the ruling government. " +
      "The empire descends into chaos as factions battle for control.",
    effects: [
      {
        type: "civil_status",
        change: -2, // Drop 2 levels
      },
      {
        type: "military",
        subtype: "effectiveness",
        value: -0.15, // -15% effectiveness
      },
    ],
    duration: 5,
    probability: 0.04,
    minTurn: 30,
    unique: false,
  },
  {
    id: "successful_coup",
    name: "Government Overthrown",
    category: "political",
    scope: "random_empire",
    description: "A new regime seizes power",
    narrative:
      "The old government has fallen. A new regime has taken control, " +
      "promising order through iron-fisted rule. Dissidents disappear in the night.",
    effects: [
      {
        type: "civil_status",
        change: -3, // Severe drop
      },
      {
        type: "population",
        change: -0.05, // -5% population (purges)
      },
      {
        type: "military",
        subtype: "bonus",
        value: 0.1, // +10% military units (forced conscription)
      },
    ],
    duration: 10,
    probability: 0.02,
    minTurn: 50,
    unique: false,
    prerequisites: [
      { type: "random_chance", probability: 0.3 }, // Additional rarity check
    ],
  },
  {
    id: "assassination",
    name: "Imperial Assassination",
    category: "political",
    scope: "random_empire",
    description: "A leader is assassinated",
    narrative:
      "Tragedy strikes as the beloved Emperor is slain by unknown assailants. " +
      "The empire mourns while rivals circle like vultures.",
    effects: [
      {
        type: "civil_status",
        change: -2,
      },
      {
        type: "diplomatic",
        subtype: "reputation_change",
        value: -20, // Seen as vulnerable
      },
    ],
    duration: 8,
    probability: 0.03,
    minTurn: 25,
    unique: false,
  },
  {
    id: "civil_war_outbreak",
    name: "Civil War Erupts",
    category: "political",
    scope: "random_empire",
    description: "An empire tears itself apart",
    narrative:
      "Long-simmering tensions have exploded into open civil war. " +
      "Brother fights brother as the empire fractures along ancient fault lines.",
    effects: [
      {
        type: "civil_status",
        change: -4, // Devastating
      },
      {
        type: "military",
        subtype: "damage",
        value: -0.2, // Lose 20% of military
      },
      {
        type: "population",
        change: -0.1, // -10% population
      },
    ],
    duration: 15,
    probability: 0.015,
    minTurn: 60,
    unique: false,
    prerequisites: [
      { type: "random_chance", probability: 0.25 },
    ],
  },

  // =========================================================================
  // DIPLOMATIC EVENTS
  // =========================================================================
  {
    id: "diplomatic_incident",
    name: "Diplomatic Incident",
    category: "political",
    scope: "targeted",
    description: "A scandal strains relations between empires",
    narrative:
      "A diplomatic faux pas has escalated into a full-blown international incident. " +
      "Ambassadors are recalled and trade agreements hang in the balance.",
    effects: [
      {
        type: "diplomatic",
        subtype: "reputation_change",
        value: -15,
      },
    ],
    duration: 8,
    probability: 0.05,
    minTurn: 20,
    unique: false,
  },
  {
    id: "peace_conference",
    name: "Galactic Peace Conference",
    category: "political",
    scope: "global",
    description: "All empires called to negotiate peace",
    narrative:
      "In a historic moment, all galactic powers gather for a peace summit. " +
      "The shadow of war recedes, if only temporarily, as diplomats craft agreements.",
    effects: [
      {
        type: "diplomatic",
        subtype: "reputation_change",
        value: 10, // Everyone gains reputation
      },
      {
        type: "civil_status",
        change: 1, // Populations hopeful
      },
    ],
    duration: 10,
    probability: 0.04,
    minTurn: 40,
    unique: false,
  },
  {
    id: "alliance_dissolution",
    name: "Major Alliance Collapses",
    category: "political",
    scope: "coalition",
    description: "A powerful alliance falls apart",
    narrative:
      "Betrayal and mistrust have shattered what was once the galaxy's mightiest coalition. " +
      "Former allies eye each other with suspicion and draw up war plans.",
    effects: [
      {
        type: "diplomatic",
        subtype: "treaty_break",
      },
    ],
    duration: 0, // Instant
    probability: 0.03,
    minTurn: 50,
    unique: false,
  },

  // =========================================================================
  // FACTION EMERGENCE
  // =========================================================================
  {
    id: "separatist_movement",
    name: "Separatist Movement",
    category: "political",
    scope: "random_empire",
    description: "Planets demand independence",
    narrative:
      "Outer colonies have declared their intention to secede. " +
      "The empire must choose: negotiate or crush the rebellion.",
    effects: [
      {
        type: "civil_status",
        change: -1,
      },
      {
        type: "resource_multiplier",
        resource: "credits",
        multiplier: 0.85, // -15% income (disruption)
      },
    ],
    duration: 10,
    probability: 0.05,
    minTurn: 35,
    unique: false,
  },
  {
    id: "new_faction_emerges",
    name: "New Power Rises",
    category: "political",
    scope: "global",
    description: "A new faction enters galactic politics",
    narrative:
      "From the shadows, a new political movement has emerged, " +
      "promising radical change and attracting followers across the galaxy.",
    effects: [
      {
        type: "diplomatic",
        subtype: "reputation_change",
        value: -5, // Uncertainty affects all
      },
    ],
    duration: 15,
    probability: 0.03,
    minTurn: 45,
    unique: true,
  },
  {
    id: "religious_movement",
    name: "Messianic Movement Spreads",
    category: "political",
    scope: "global",
    description: "A new religion sweeps across space",
    narrative:
      "A charismatic prophet has emerged, promising salvation among the stars. " +
      "Millions convert, and governments struggle to maintain secular authority.",
    effects: [
      {
        type: "civil_status",
        change: 1, // Initially positive
      },
      {
        type: "research",
        change: -0.1, // -10% research (anti-science sentiment)
        isPercentage: true,
      },
    ],
    duration: 20,
    probability: 0.02,
    minTurn: 40,
    unique: true,
  },

  // =========================================================================
  // ELECTION & SUCCESSION EVENTS
  // =========================================================================
  {
    id: "contested_election",
    name: "Disputed Succession",
    category: "political",
    scope: "random_empire",
    description: "Multiple claimants vie for the throne",
    narrative:
      "The line of succession is unclear, and rival claimants gather their forces. " +
      "The empire holds its breath, awaiting resolution by law or by arms.",
    effects: [
      {
        type: "civil_status",
        change: -1,
      },
      {
        type: "military",
        subtype: "effectiveness",
        value: -0.1, // -10% effectiveness (divided loyalties)
      },
    ],
    duration: 8,
    probability: 0.04,
    minTurn: 30,
    unique: false,
  },
  {
    id: "popular_uprising",
    name: "Popular Uprising",
    category: "political",
    scope: "bottom_empires",
    targetCount: 2,
    description: "The people demand change",
    narrative:
      "Masses flood the streets demanding reform. The old order trembles " +
      "as citizens rise up against their oppressors.",
    effects: [
      {
        type: "civil_status",
        change: 2, // People empowered
      },
      {
        type: "resource_multiplier",
        resource: "credits",
        multiplier: 0.8, // -20% income (chaos)
      },
    ],
    duration: 10,
    probability: 0.03,
    minTurn: 50,
    unique: false,
  },

  // =========================================================================
  // LATE GAME POLITICAL EVENTS
  // =========================================================================
  {
    id: "galactic_emperor",
    name: "Galactic Emperor Proclaimed",
    category: "political",
    scope: "top_empires",
    targetCount: 1,
    description: "One empire claims dominion over all",
    narrative:
      "The most powerful empire has proclaimed their ruler as Galactic Emperor. " +
      "Other powers must decide: kneel or resist.",
    effects: [
      {
        type: "diplomatic",
        subtype: "forced_war",
      },
      {
        type: "military",
        subtype: "bonus",
        value: 0.2, // +20% military (rallying)
      },
    ],
    duration: 0, // Instant, lasting consequences
    probability: 0.02,
    minTurn: 120,
    unique: true,
    prerequisites: [
      { type: "empire_count", max: 10 }, // Late game with few remaining
    ],
  },
  {
    id: "diplomatic_revolution",
    name: "Diplomatic Revolution",
    category: "political",
    scope: "global",
    description: "Alliances shift dramatically overnight",
    narrative:
      "In a stunning reversal, traditional alliances dissolve and former enemies embrace. " +
      "The diplomatic landscape is forever changed.",
    effects: [
      {
        type: "diplomatic",
        subtype: "treaty_break",
      },
    ],
    duration: 0, // Instant
    probability: 0.02,
    minTurn: 80,
    unique: true,
  },
  {
    id: "ideological_split",
    name: "Ideological Schism",
    category: "political",
    scope: "coalition",
    description: "Philosophical differences tear alliances apart",
    narrative:
      "Fundamental disagreements over governance and values have split the galaxy. " +
      "Empires must choose sides in an ideological cold war.",
    effects: [
      {
        type: "diplomatic",
        subtype: "treaty_break",
      },
      {
        type: "civil_status",
        change: -1,
      },
    ],
    duration: 15,
    probability: 0.025,
    minTurn: 70,
    unique: true,
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all political events that can occur at a given turn.
 */
export function getAvailablePoliticalEvents(turn: number): GalacticEvent[] {
  return POLITICAL_EVENTS.filter((event) => {
    const minTurnMet = !event.minTurn || turn >= event.minTurn;
    const maxTurnMet = !event.maxTurn || turn <= event.maxTurn;
    return minTurnMet && maxTurnMet;
  });
}

/**
 * Get political events by scope.
 */
export function getPoliticalEventsByScope(
  scope: GalacticEvent["scope"]
): GalacticEvent[] {
  return POLITICAL_EVENTS.filter((event) => event.scope === scope);
}

/**
 * Get political events that cause civil status changes.
 */
export function getPoliticalStabilityEvents(): GalacticEvent[] {
  return POLITICAL_EVENTS.filter((event) =>
    event.effects.some((effect) => effect.type === "civil_status")
  );
}

/**
 * Get total probability weight for political events at a given turn.
 */
export function getPoliticalEventProbabilityWeight(turn: number): number {
  return getAvailablePoliticalEvents(turn).reduce(
    (sum, event) => sum + event.probability,
    0
  );
}

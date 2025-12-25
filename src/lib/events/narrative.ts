/**
 * Narrative Galactic Events (PRD 11.2)
 *
 * Lore drops, rumors, prophecies, and flavor events.
 * These events add atmosphere and storytelling without major mechanical impact.
 */

import type { GalacticEvent } from "./types";

// =============================================================================
// NARRATIVE EVENTS
// =============================================================================

export const NARRATIVE_EVENTS: GalacticEvent[] = [
  // =========================================================================
  // LORE DROPS - World Building Events
  // =========================================================================
  {
    id: "ancient_ruins_discovered",
    name: "Ancient Ruins Discovered",
    category: "narrative",
    scope: "random_empire",
    description: "Explorers uncover remnants of a lost civilization",
    narrative:
      "Deep in the uncharted reaches of space, explorers have discovered the ruins " +
      "of an ancient civilization. Glyphs on the walls speak of a great calamity, " +
      "a warning from beings who walked among the stars long before us.",
    effects: [
      {
        type: "research",
        change: 200,
        isPercentage: false,
      },
      {
        type: "civil_status",
        change: 1, // Excitement and wonder
      },
    ],
    duration: 3,
    probability: 0.05,
    minTurn: 20,
    unique: false,
  },
  {
    id: "stellar_phenomenon",
    name: "Celestial Light Show",
    category: "narrative",
    scope: "global",
    description: "A rare astronomical event captivates the galaxy",
    narrative:
      "Twin supernovae have created a spectacular display visible across the galaxy. " +
      "Scientists scramble to study the phenomenon while populations gaze skyward in wonder. " +
      "Some see it as an omen; others, as a gift from the cosmos.",
    effects: [
      {
        type: "civil_status",
        change: 1,
      },
    ],
    duration: 5,
    probability: 0.06,
    minTurn: 10,
    unique: false,
  },
  {
    id: "artifact_auction",
    name: "Legendary Artifact Auction",
    category: "narrative",
    scope: "top_empires",
    targetCount: 5,
    description: "Wealthy empires bid on a priceless relic",
    narrative:
      "The Crown of the First Emperor, lost for millennia, has resurfaced. " +
      "The galaxy's wealthiest vie for the right to possess this symbol of ancient power. " +
      "Some say it grants wisdom; others whisper of darker blessings.",
    effects: [
      {
        type: "resource_multiplier",
        resource: "credits",
        multiplier: 0.95, // -5% credits (bidding war)
      },
    ],
    duration: 3,
    probability: 0.04,
    minTurn: 40,
    unique: false,
  },
  {
    id: "library_planet",
    name: "Lost Library Planet Found",
    category: "narrative",
    scope: "random_empire",
    description: "A world of forgotten knowledge emerges from myth",
    narrative:
      "The legendary Library of Zenth was thought to be myth, but explorers have found it " +
      "orbiting a dying star. Its vast databases contain the accumulated wisdom of a " +
      "hundred extinct species. Scholars weep with joy.",
    effects: [
      {
        type: "research",
        change: 500,
        isPercentage: false,
      },
    ],
    duration: 5,
    probability: 0.02,
    minTurn: 60,
    unique: true,
  },

  // =========================================================================
  // RUMORS & PROPHECIES
  // =========================================================================
  {
    id: "prophecy_darkness",
    name: "Prophecy of Darkness",
    category: "narrative",
    scope: "global",
    description: "Seers across the galaxy share a troubling vision",
    narrative:
      "Oracles, mystics, and AI predictors have all reported the same vision: " +
      "a great darkness approaching from beyond the rim. Whether metaphor or literal, " +
      "the message is clear: dark times lie ahead.",
    effects: [
      {
        type: "civil_status",
        change: -1, // Fear and uncertainty
      },
    ],
    duration: 10,
    probability: 0.03,
    minTurn: 50,
    unique: false,
  },
  {
    id: "prophecy_unification",
    name: "Prophecy of Unity",
    category: "narrative",
    scope: "global",
    description: "Seers speak of a coming age of peace",
    narrative:
      "A vision has spread through the galaxy's mystics: a time of unity approaches, " +
      "when the fractured empires will join as one. Some dismiss it as wishful thinking, " +
      "but others prepare for the foretold harmony.",
    effects: [
      {
        type: "civil_status",
        change: 1,
      },
    ],
    duration: 10,
    probability: 0.03,
    minTurn: 80,
    unique: false,
  },
  {
    id: "rumor_lost_fleet",
    name: "Rumor: The Ghost Fleet",
    category: "narrative",
    scope: "global",
    description: "Tales spread of a lost armada returned from the void",
    narrative:
      "Spacers whisper of ships appearing from nowhere, bearing the markings of the " +
      "legendary Lost Expedition that vanished centuries ago. Are they ghosts? " +
      "Time travelers? Or something else entirely?",
    effects: [], // Pure flavor
    duration: 8,
    probability: 0.04,
    minTurn: 35,
    unique: false,
  },
  {
    id: "rumor_immortal_emperor",
    name: "Rumor: The Immortal Emperor",
    category: "narrative",
    scope: "random_empire",
    description: "Whispers spread of a ruler who cannot die",
    narrative:
      "Rumors persist that one empire's leader has discovered the secret of immortality. " +
      "Assassins fail inexplicably. Advisors speak of an emperor unchanged across decades. " +
      "Is it truth, or the most elaborate deception in galactic history?",
    effects: [
      {
        type: "diplomatic",
        subtype: "reputation_change",
        value: 5, // Mystique
      },
    ],
    duration: 15,
    probability: 0.03,
    minTurn: 45,
    unique: false,
  },

  // =========================================================================
  // CULTURAL EVENTS
  // =========================================================================
  {
    id: "galactic_games",
    name: "Galactic Games",
    category: "narrative",
    scope: "global",
    description: "The galaxy celebrates with athletic competition",
    narrative:
      "The Galactic Games unite the empires in friendly competition. Athletes from " +
      "every world compete for glory, and for a brief moment, the threat of war " +
      "fades as billions cheer for their champions.",
    effects: [
      {
        type: "civil_status",
        change: 2,
      },
      {
        type: "diplomatic",
        subtype: "reputation_change",
        value: 5,
      },
    ],
    duration: 5,
    probability: 0.04,
    minTurn: 30,
    unique: false,
  },
  {
    id: "cultural_renaissance",
    name: "Cultural Renaissance",
    category: "narrative",
    scope: "random_empire",
    description: "Art and philosophy flourish in one empire",
    narrative:
      "A golden age of culture has dawned. Poets, philosophers, and artists produce " +
      "works of transcendent beauty. The empire becomes a beacon of civilization, " +
      "drawing admirers from across the galaxy.",
    effects: [
      {
        type: "civil_status",
        change: 2,
      },
      {
        type: "production_bonus",
        bonus: 0.1,
        planetTypes: ["tourism", "education"],
      },
    ],
    duration: 15,
    probability: 0.03,
    minTurn: 40,
    unique: false,
  },
  {
    id: "holovid_sensation",
    name: "Holovid Sensation",
    category: "narrative",
    scope: "global",
    description: "A holovid series captivates the entire galaxy",
    narrative:
      "\"Starbound Destinies\" has become the most-watched holovid series in galactic history. " +
      "Productivity drops as billions binge-watch. Politicians reference its themes. " +
      "For now, the galaxy shares a common cultural moment.",
    effects: [
      {
        type: "civil_status",
        change: 1,
      },
      {
        type: "production_bonus",
        bonus: -0.05, // Everyone's watching instead of working
      },
    ],
    duration: 8,
    probability: 0.05,
    minTurn: 25,
    unique: false,
  },

  // =========================================================================
  // MYSTERY EVENTS
  // =========================================================================
  {
    id: "signal_from_beyond",
    name: "Signal from Beyond",
    category: "narrative",
    scope: "global",
    description: "An unexplained transmission is received",
    narrative:
      "Every receiver in the galaxy has picked up the same signal: a pattern of " +
      "mathematical sequences, originating from beyond the galactic rim. Scientists " +
      "frantically work to decode its meaning. First contact, or ancient echo?",
    effects: [
      {
        type: "research",
        change: 100,
        isPercentage: false,
      },
    ],
    duration: 10,
    probability: 0.03,
    minTurn: 50,
    unique: true,
  },
  {
    id: "dimensional_rift",
    name: "Dimensional Rift Observed",
    category: "narrative",
    scope: "global",
    description: "Reality itself seems to tear",
    narrative:
      "Sensors have detected what scientists can only describe as a tear in spacetime. " +
      "Something moves on the other side. The rift pulses with impossible colors. " +
      "Is it a doorway? A warning? The start of something beyond comprehension?",
    effects: [
      {
        type: "civil_status",
        change: -1, // Existential dread
      },
      {
        type: "research",
        change: 300,
        isPercentage: false,
      },
    ],
    duration: 15,
    probability: 0.02,
    minTurn: 100,
    unique: true,
  },
  {
    id: "time_anomaly",
    name: "Temporal Anomaly",
    category: "narrative",
    scope: "random_empire",
    description: "Time flows strangely in one sector",
    narrative:
      "Ships entering the Vex Sector report days passing as hours, or hours as days. " +
      "Some emerge aged decades; others haven't aged at all. Scientists are baffled. " +
      "Is time broken, or were we always wrong about its nature?",
    effects: [
      {
        type: "production_bonus",
        bonus: 0.15, // Extra productive 'time'
      },
    ],
    duration: 10,
    probability: 0.02,
    minTurn: 70,
    unique: true,
  },

  // =========================================================================
  // HISTORICAL EVENTS
  // =========================================================================
  {
    id: "founders_day",
    name: "Founders' Day Celebration",
    category: "narrative",
    scope: "global",
    description: "The galaxy commemorates its settlement",
    narrative:
      "On this day, millennia ago, the first colony ships departed humanity's origin world. " +
      "Every empire, regardless of current tensions, pauses to honor the pioneers who " +
      "dared to reach for the stars.",
    effects: [
      {
        type: "civil_status",
        change: 1,
      },
    ],
    duration: 1,
    probability: 0.06,
    minTurn: 15,
    unique: false,
  },
  {
    id: "memorial_of_war",
    name: "Day of Remembrance",
    category: "narrative",
    scope: "global",
    description: "The galaxy mourns past conflicts",
    narrative:
      "Monuments are illuminated across a thousand worlds as the galaxy remembers " +
      "the Great Cataclysm that nearly ended all civilization. 'Never again' is the " +
      "solemn vow, though some fear history may yet repeat.",
    effects: [
      {
        type: "civil_status",
        change: 1, // Somber but meaningful
      },
    ],
    duration: 1,
    probability: 0.04,
    minTurn: 60,
    unique: false,
  },

  // =========================================================================
  // LATE GAME NARRATIVE EVENTS
  // =========================================================================
  {
    id: "galactic_historian",
    name: "The Galactic Historian Speaks",
    category: "narrative",
    scope: "global",
    description: "An ancient AI shares its wisdom",
    narrative:
      "ARCHON-7, the galaxy's oldest active AI, has broken its centuries of silence. " +
      "It speaks of cycles, of empires that rose and fell before ours. Its final words " +
      "chill all who hear them: 'You are not the first. Pray you are not the last.'",
    effects: [
      {
        type: "research",
        change: 250,
        isPercentage: false,
      },
    ],
    duration: 5,
    probability: 0.02,
    minTurn: 120,
    unique: true,
  },
  {
    id: "cosmic_egg",
    name: "The Cosmic Egg",
    category: "narrative",
    scope: "global",
    description: "Something stirs in deep space",
    narrative:
      "At the center of the galaxy, something awakens. Sensors detect an object of " +
      "impossible scale, pulsing with unknown energy. Is it a weapon? A god? A new " +
      "beginning? All the galaxy watches, and waits.",
    effects: [], // Pure narrative tension
    duration: 20,
    probability: 0.015,
    minTurn: 150,
    unique: true,
  },
  {
    id: "final_prophecy",
    name: "The Final Prophecy",
    category: "narrative",
    scope: "global",
    description: "The end of the game draws near",
    narrative:
      "Every seer, every oracle, every predictive AI speaks with one voice: " +
      "'The age draws to a close. One will stand supreme. The final reckoning approaches.' " +
      "The galaxy holds its breath as destiny unfolds.",
    effects: [
      {
        type: "military",
        subtype: "effectiveness",
        value: 0.1, // Final push
      },
    ],
    duration: 0, // Until end
    probability: 0.5, // High chance to trigger endgame drama
    minTurn: 180,
    maxTurn: 190,
    unique: true,
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all narrative events that can occur at a given turn.
 */
export function getAvailableNarrativeEvents(turn: number): GalacticEvent[] {
  return NARRATIVE_EVENTS.filter((event) => {
    const minTurnMet = !event.minTurn || turn >= event.minTurn;
    const maxTurnMet = !event.maxTurn || turn <= event.maxTurn;
    return minTurnMet && maxTurnMet;
  });
}

/**
 * Get narrative events by scope.
 */
export function getNarrativeEventsByScope(
  scope: GalacticEvent["scope"]
): GalacticEvent[] {
  return NARRATIVE_EVENTS.filter((event) => event.scope === scope);
}

/**
 * Get pure flavor events (no mechanical effects).
 */
export function getPureFlavorEvents(): GalacticEvent[] {
  return NARRATIVE_EVENTS.filter((event) => event.effects.length === 0);
}

/**
 * Get prophecy and rumor events.
 */
export function getProphecyAndRumorEvents(): GalacticEvent[] {
  return NARRATIVE_EVENTS.filter(
    (event) =>
      event.id.startsWith("prophecy_") || event.id.startsWith("rumor_")
  );
}

/**
 * Get total probability weight for narrative events at a given turn.
 */
export function getNarrativeEventProbabilityWeight(turn: number): number {
  return getAvailableNarrativeEvents(turn).reduce(
    (sum, event) => sum + event.probability,
    0
  );
}

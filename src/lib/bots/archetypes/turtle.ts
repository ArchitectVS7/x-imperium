/**
 * Turtle Archetype Behavior (PRD 7.6)
 *
 * Defensive powerhouse that never attacks first but is nearly impossible to crack.
 *
 * Key Traits:
 * - Heavy defensive investment
 * - Never attacks first
 * - Fortification Expert passive (2× defensive structure effectiveness)
 * - Very high tell rate (90%) - clear and predictable
 *
 * @see docs/PRD.md Section 7.6 (Bot Archetypes)
 */

import type { ArchetypeBehavior } from "./types";

export const TURTLE_BEHAVIOR: ArchetypeBehavior = {
  name: "turtle",
  displayName: "Turtle",
  description: "Defensive fortress-builder who never attacks first but is nearly unbreakable",
  passiveAbility: "fortification",
  passiveDescription: "2× defensive structure effectiveness",

  priorities: {
    military: 0.35,    // Heavy defensive military
    economy: 0.30,     // Strong economy to sustain defense
    research: 0.20,    // Defensive tech
    diplomacy: 0.10,   // Neutral relations
    covert: 0.05,      // Minimal covert ops
  },

  combat: {
    style: "defensive",
    attackThreshold: 0.00,  // PRD 7.6: never attacks first
    requireAllies: true,    // Only retaliates with support
    retreatWillingness: 0.80, // Prefers to defend own territory
    unitPreference: {
      soldiers: 1.0,
      fighters: 1.2,
      stations: 2.0,    // Heavy station investment
      cruisers: 0.8,
      carriers: 0.6,    // Low offensive capability
    },
  },

  diplomacy: {
    allianceSeeking: 0.40,     // Moderate - prefers neutrality
    baseTrust: 0.50,           // Neutral trust
    betrayalChance: 0.02,      // Almost never betrays
    tributeAcceptance: 0.70,   // Prefers peace
    mediatesConflicts: false,
  },

  tell: {
    tellRate: 0.90,           // PRD 7.10: Peaceful 90%
    style: "clear",           // PRD 7.10: Clear style
    advanceWarning: {
      min: 5,
      max: 10,                // PRD 7.10: 5+ turns warning
    },
  },
};

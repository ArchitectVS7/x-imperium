/**
 * Tech Rush Archetype Behavior (PRD 7.6)
 *
 * Research-focused archetype that prioritizes technology for late-game power.
 *
 * Key Traits:
 * - Heavy research investment
 * - Weak early game, powerful late game
 * - No passive ability (technology IS the advantage)
 * - Moderate tell rate - focused on research progress
 *
 * @see docs/PRD.md Section 7.6 (Bot Archetypes)
 */

import type { ArchetypeBehavior } from "./types";

export const TECH_RUSH_BEHAVIOR: ArchetypeBehavior = {
  name: "techRush",
  displayName: "Tech Rush",
  description: "Research-focused strategist who sacrifices early game for late-game dominance",
  passiveAbility: "none",
  passiveDescription: "No passive ability",

  priorities: {
    military: 0.15,    // Minimal early defense
    economy: 0.25,     // Fund research
    research: 0.50,    // Primary focus
    diplomacy: 0.05,   // Minimal diplomacy
    covert: 0.05,      // Minimal covert ops
  },

  combat: {
    style: "defensive",
    attackThreshold: 0.25,  // Only attacks when significantly stronger (late game)
    requireAllies: false,
    retreatWillingness: 0.70, // Preserve forces for later
    unitPreference: {
      soldiers: 0.8,
      fighters: 1.0,
      stations: 1.3,    // Defensive while researching
      cruisers: 1.1,
      carriers: 0.9,
    },
  },

  diplomacy: {
    allianceSeeking: 0.35,     // Moderate - buys time
    baseTrust: 0.40,           // Cautious
    betrayalChance: 0.20,      // Low betrayal
    tributeAcceptance: 0.60,   // Will pay for peace
    mediatesConflicts: false,
  },

  tell: {
    tellRate: 0.50,           // Moderate - focused on research
    style: "clear",           // Clear about priorities
    advanceWarning: {
      min: 2,
      max: 4,                 // Reasonable warning
    },
  },
};

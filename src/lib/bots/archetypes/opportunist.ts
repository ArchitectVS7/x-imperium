/**
 * Opportunist Archetype Behavior (PRD 7.6)
 *
 * Vulture-style player who attacks weakened targets and avoids fair fights.
 *
 * Key Traits:
 * - Attacks weakened players
 * - Avoids strong opponents
 * - No passive ability (adaptability IS the advantage)
 * - Low tell rate (40%) - strikes without warning
 *
 * @see docs/PRD.md Section 7.6 (Bot Archetypes)
 */

import type { ArchetypeBehavior } from "./types";

export const OPPORTUNIST_BEHAVIOR: ArchetypeBehavior = {
  name: "opportunist",
  displayName: "Opportunist",
  description: "Vulture who circles weakened empires and strikes at the perfect moment",
  passiveAbility: "none",
  passiveDescription: "No passive ability",

  priorities: {
    military: 0.40,    // Ready to strike
    economy: 0.30,     // Build reserves
    research: 0.10,    // Some advancement
    diplomacy: 0.10,   // Situational
    covert: 0.10,      // Intelligence gathering
  },

  combat: {
    style: "opportunistic",
    attackThreshold: 0.35,  // Attacks weakened targets (enemy <35% of bot's power)
    requireAllies: false,
    retreatWillingness: 0.60, // Will retreat from fair fights
    unitPreference: {
      soldiers: 1.0,
      fighters: 1.1,
      stations: 0.8,
      cruisers: 1.2,
      carriers: 1.1,
    },
  },

  diplomacy: {
    allianceSeeking: 0.30,     // Low - prefers independence
    baseTrust: 0.30,           // Distrustful
    betrayalChance: 0.45,      // Will betray weak allies
    tributeAcceptance: 0.50,   // Neutral on tribute
    mediatesConflicts: false,
  },

  tell: {
    tellRate: 0.40,           // PRD 7.10: Aggressor 40%
    style: "minimal",         // PRD 7.10: Minimal style
    advanceWarning: {
      min: 0,
      max: 1,                 // PRD 7.10: 1 turn warning
    },
  },
};

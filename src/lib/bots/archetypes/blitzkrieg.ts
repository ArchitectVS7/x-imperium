/**
 * Blitzkrieg Archetype Behavior (PRD 7.6)
 *
 * Early-game aggressor that strikes fast to cripple neighbors before they can respond.
 *
 * Key Traits:
 * - Fast, early strikes
 * - Cripples neighbors quickly
 * - No passive ability (relies on speed advantage)
 * - Low tell rate (40%) - minimal warning
 *
 * @see docs/PRD.md Section 7.6 (Bot Archetypes)
 */

import type { ArchetypeBehavior } from "./types";

export const BLITZKRIEG_BEHAVIOR: ArchetypeBehavior = {
  name: "blitzkrieg",
  displayName: "Blitzkrieg",
  description: "Early-game aggressor who strikes fast to cripple neighbors",
  passiveAbility: "none",
  passiveDescription: "No passive ability",

  priorities: {
    military: 0.65,    // Very high early military
    economy: 0.20,     // Minimal economy (fast expansion)
    research: 0.05,    // Skip research for speed
    diplomacy: 0.05,   // No time for diplomacy
    covert: 0.05,      // Minimal covert ops
  },

  combat: {
    style: "aggressive",
    attackThreshold: 0.70,  // Attacks even moderately defended targets
    requireAllies: false,
    retreatWillingness: 0.20, // Committed to the attack
    unitPreference: {
      soldiers: 1.3,    // Fast ground capture
      fighters: 1.4,    // Quick orbital control
      stations: 0.3,    // Skip defensive structures
      cruisers: 1.2,
      carriers: 1.1,
    },
  },

  diplomacy: {
    allianceSeeking: 0.10,     // Very low - speed is everything
    baseTrust: 0.20,           // Distrustful
    betrayalChance: 0.50,      // Will break alliance if advantageous
    tributeAcceptance: 0.20,   // Prefers conquest
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

/**
 * Diplomat Archetype Behavior (PRD 7.6)
 *
 * Peaceful alliance-builder that prefers negotiation over conflict.
 *
 * Key Traits:
 * - High alliance seeking
 * - Only attacks with allies present
 * - Trade Network passive (+10% income per alliance)
 * - Very high tell rate (80%) - polite and predictable
 *
 * @see docs/PRD.md Section 7.6 (Bot Archetypes)
 */

import type { ArchetypeBehavior } from "./types";

export const DIPLOMAT_BEHAVIOR: ArchetypeBehavior = {
  name: "diplomat",
  displayName: "Diplomat",
  description: "Peaceful alliance-builder who mediates conflicts and builds coalitions",
  passiveAbility: "trade_network",
  passiveDescription: "+10% income per alliance",

  priorities: {
    military: 0.20,    // Defensive only
    economy: 0.30,     // Moderate economy
    research: 0.10,    // Some research
    diplomacy: 0.35,   // Primary focus
    covert: 0.05,      // Minimal covert ops
  },

  combat: {
    style: "reluctant",
    attackThreshold: 0.20,  // Only attacks very weak enemies
    requireAllies: true,    // PRD 7.6: attackOnlyWithAllies
    retreatWillingness: 0.60, // Prefers to withdraw and negotiate
    unitPreference: {
      soldiers: 0.8,
      fighters: 1.0,
      stations: 1.5,    // Defensive structures
      cruisers: 0.9,
      carriers: 0.8,
    },
  },

  diplomacy: {
    allianceSeeking: 0.80,     // PRD 7.6: Very high
    baseTrust: 0.60,           // Trusting by nature
    betrayalChance: 0.05,      // Rarely betrays
    tributeAcceptance: 0.80,   // Very open to peaceful resolution
    mediatesConflicts: true,   // PRD 7.6: mediates conflicts
  },

  tell: {
    tellRate: 0.80,           // PRD 7.10: 80% telegraph
    style: "polite",          // PRD 7.10: Polite style
    advanceWarning: {
      min: 3,
      max: 5,                 // PRD 7.10: 3-5 turns warning
    },
  },
};

/**
 * Schemer Archetype Behavior (PRD 7.6)
 *
 * Deceptive manipulator who excels at betrayal and covert operations.
 *
 * Key Traits:
 * - False alliances, frequent betrayals
 * - Heavy covert operations investment
 * - Shadow Network passive (-50% agent cost, +20% covert success)
 * - Very low tell rate (30%) - cryptic and inverted signals
 *
 * @see docs/PRD.md Section 7.6 (Bot Archetypes)
 */

import type { ArchetypeBehavior } from "./types";

export const SCHEMER_BEHAVIOR: ArchetypeBehavior = {
  name: "schemer",
  displayName: "Schemer",
  description: "Deceptive manipulator who forms false alliances and strikes from shadows",
  passiveAbility: "shadow_network",
  passiveDescription: "-50% agent cost, +20% covert success",

  priorities: {
    military: 0.20,    // Moderate military
    economy: 0.20,     // Moderate economy
    research: 0.10,    // Some research
    diplomacy: 0.20,   // For manipulation
    covert: 0.30,      // Primary focus
  },

  combat: {
    style: "opportunistic",
    attackThreshold: 0.40,  // Attacks weakened or distracted enemies
    requireAllies: false,
    retreatWillingness: 0.40, // Will retreat to fight another day
    unitPreference: {
      soldiers: 0.9,
      fighters: 1.1,
      stations: 0.8,
      cruisers: 1.2,
      carriers: 1.0,
    },
  },

  diplomacy: {
    allianceSeeking: 0.60,     // High - but for deception
    baseTrust: 0.20,           // Distrustful (assumes others are like them)
    betrayalChance: 0.70,      // PRD 7.6: betrayals are common
    tributeAcceptance: 0.40,   // May accept to lower guard
    mediatesConflicts: false,
  },

  tell: {
    tellRate: 0.30,           // PRD 7.10: 30% telegraph
    style: "cryptic",         // PRD 7.10: Cryptic/Inverted style
    advanceWarning: {
      min: 0,
      max: 1,                 // PRD 7.10: 1 turn (if any)
    },
  },
};

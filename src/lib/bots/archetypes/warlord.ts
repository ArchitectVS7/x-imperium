/**
 * Warlord Archetype Behavior (PRD 7.6)
 *
 * Aggressive military-focused archetype that demands tribute and excels at war.
 *
 * Key Traits:
 * - Heavy military spending
 * - Attacks when enemy is weaker
 * - War Economy passive (-20% military cost when at war)
 * - High tell rate (70%) - obvious intentions
 *
 * @see docs/PRD.md Section 7.6 (Bot Archetypes)
 */

import type { ArchetypeBehavior } from "./types";

export const WARLORD_BEHAVIOR: ArchetypeBehavior = {
  name: "warlord",
  displayName: "Warlord",
  description: "Aggressive military commander focused on conquest and tribute",
  passiveAbility: "war_economy",
  passiveDescription: "-20% military cost when at war",

  priorities: {
    military: 0.70,    // Primary focus
    economy: 0.15,     // Minimal economic investment
    research: 0.05,    // Very low research
    diplomacy: 0.05,   // Rare diplomacy (mostly threats)
    covert: 0.05,      // Minimal covert ops
  },

  combat: {
    style: "aggressive",
    attackThreshold: 0.50,  // Attacks if enemy has <50% of bot's power
    requireAllies: false,
    retreatWillingness: 0.10, // Very unlikely to retreat
    unitPreference: {
      soldiers: 1.2,
      fighters: 1.1,
      cruisers: 1.3,
      carriers: 1.0,
    },
  },

  diplomacy: {
    allianceSeeking: 0.20,     // Low - prefers conquest
    baseTrust: 0.30,           // Distrustful
    betrayalChance: 0.40,      // Moderate betrayal risk
    tributeAcceptance: 0.60,   // Accepts tribute to delay war
    mediatesConflicts: false,
  },

  tell: {
    tellRate: 0.70,           // PRD 7.10: 70% telegraph
    style: "obvious",         // PRD 7.10: Obvious style
    advanceWarning: {
      min: 2,
      max: 3,                 // PRD 7.10: 2-3 turns warning
    },
  },
};

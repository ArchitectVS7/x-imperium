/**
 * Merchant Archetype Behavior (PRD 7.6)
 *
 * Economic powerhouse focused on trade and market manipulation.
 *
 * Key Traits:
 * - Trade-focused, buys loyalty
 * - Strong economic development
 * - Market Insight passive (sees next turn's market prices)
 * - Moderate tell rate (60%) - transactional communication
 *
 * @see docs/PRD.md Section 7.6 (Bot Archetypes)
 */

import type { ArchetypeBehavior } from "./types";

export const MERCHANT_BEHAVIOR: ArchetypeBehavior = {
  name: "merchant",
  displayName: "Merchant",
  description: "Economic powerhouse who trades for influence and buys loyalty",
  passiveAbility: "market_insight",
  passiveDescription: "Sees next turn's market prices",

  priorities: {
    military: 0.15,    // Defensive minimum
    economy: 0.50,     // Primary focus
    research: 0.15,    // Economic research
    diplomacy: 0.15,   // Trade agreements
    covert: 0.05,      // Market intelligence
  },

  combat: {
    style: "opportunistic",
    attackThreshold: 0.30,  // Attacks weakened enemies for profit
    requireAllies: false,
    retreatWillingness: 0.50, // Values resources over glory
    unitPreference: {
      soldiers: 1.0,
      fighters: 1.0,
      stations: 1.2,    // Protect trade routes
      cruisers: 1.0,
      carriers: 1.1,
    },
  },

  diplomacy: {
    allianceSeeking: 0.50,     // Moderate - for trade benefits
    baseTrust: 0.45,           // Cautious but pragmatic
    betrayalChance: 0.25,      // Will betray for profit
    tributeAcceptance: 0.90,   // Very open to monetary solutions
    mediatesConflicts: false,
  },

  tell: {
    tellRate: 0.60,           // PRD 7.10: Economist 60%
    style: "transactional",   // PRD 7.10: Transactional style
    advanceWarning: {
      min: 2,
      max: 2,                 // PRD 7.10: 2 turns warning
    },
  },
};

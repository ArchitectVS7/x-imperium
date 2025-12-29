/**
 * Game Theming / Naming Configuration
 *
 * Centralized display names for all game elements.
 * These are UI-only labels - the internal code uses original names.
 *
 * To rebrand the game:
 * 1. Update the values in this file
 * 2. All UI components reference these constants
 *
 * Future: Could be loaded from database or user preferences
 */

// =============================================================================
// CORE RESOURCES
// =============================================================================

export const RESOURCE_NAMES = {
  credits: "Credits",
  food: "Food",
  ore: "Raw Materials",
  petroleum: "Plasma",
  researchPoints: "Data",
  population: "Citizens",
  networth: "Renown",
} as const;

export const RESOURCE_ICONS = {
  credits: "💰",
  food: "🍞",
  ore: "⛏️",
  petroleum: "🛢️",
  researchPoints: "📊",
  population: "👥",
  networth: "📈",
} as const;

// =============================================================================
// SECTORS (formerly Planets)
// =============================================================================

export const SECTOR_TERM = "Sector"; // Generic term for "planet"
export const SECTORS_TERM = "Sectors"; // Plural

export const SECTOR_NAMES = {
  food: "Agriculture",
  ore: "Mining",
  petroleum: "Processing",
  tourism: "Commerce",
  urban: "Settlement",
  education: "Academic",
  government: "Command",
  research: "Science",
  supply: "Logistics",
  anti_pollution: "Reclamation",
  industrial: "Manufacturing",
} as const;

export const SECTOR_ICONS = {
  food: "🌾",
  ore: "⛏️",
  petroleum: "⚗️",
  tourism: "🏛️",
  urban: "🏙️",
  education: "📚",
  government: "🏛️",
  research: "🔬",
  supply: "📦",
  anti_pollution: "♻️",
  industrial: "🏭",
} as const;

// =============================================================================
// MILITARY UNITS
// =============================================================================

export const UNIT_NAMES = {
  // Basic Units
  soldiers: "Marines",
  fighters: "Drones",
  stations: "Defense Platforms",
  carriers: "Dropships",
  covertAgents: "Spies",
  generals: "Commanders",

  // Advanced Units (Tier 2+)
  marines: "Shock Troops",
  interceptors: "Fast Attack Craft",
  lightCruisers: "Frigates",
  defenseStations: "Orbital Defense",
  heavyCruisers: "Cruisers",
  battlecruisers: "Dreadnoughts",
  dreadnought: "Juggernaut",
  stealthCruiser: "Stealth Fighter",
} as const;

export const UNIT_ICONS = {
  soldiers: "🎖️",
  fighters: "🛸",
  stations: "🛡️",
  carriers: "🚀",
  covertAgents: "🕵️",
  generals: "⭐",
  marines: "💪",
  interceptors: "⚡",
  lightCruisers: "🚢",
  defenseStations: "🔰",
  heavyCruisers: "⚔️",
  battlecruisers: "🗡️",
  dreadnought: "💀",
  stealthCruiser: "👻",
} as const;

// =============================================================================
// CIVIL STATUS LEVELS
// =============================================================================

export const CIVIL_STATUS_NAMES = {
  ecstatic: "Thriving",
  happy: "Peaceful",
  content: "Steady",
  neutral: "Baseline",
  unhappy: "Strained",
  angry: "Volatile",
  rioting: "Panic",
  revolting: "Collapse",
} as const;

export const CIVIL_STATUS_ICONS = {
  ecstatic: "🌟",
  happy: "😊",
  content: "😐",
  neutral: "😶",
  unhappy: "😟",
  angry: "😠",
  rioting: "🔥",
  revolting: "💀",
} as const;

// =============================================================================
// TURN PHASES
// =============================================================================

export const PHASE_NAMES = {
  income: "Intake",
  tier1AutoProduction: "Processing",
  population: "Census",
  civilStatus: "Morale Check",
  research: "Data Generation",
  buildQueue: "Construction",
  covertPoints: "Intel Ops",
  craftingQueue: "Manufacturing",
  botDecisions: "Rival Turns",
  botEmotionalDecay: "Rival Temperament Check",
  marketUpdate: "Market Flux",
  botMessages: "Communications",
  galacticEvents: "Galactic Events",
  allianceCheckpoints: "Power Balance",
  victoryCheck: "Endgame Check",
  autoSave: "Checkpoint",
} as const;

// =============================================================================
// GAME MECHANICS
// =============================================================================

export const GAME_TERMS = {
  turn: "Turn",
  empire: "Domain",
  empires: "Domains",
  galaxy: "Realm",
  protectionPeriod: "Truce",
  coalition: "Alliance",
  coalitions: "Alliances",
  treaty: "Trade Agreement",
  treaties: "Trade Agreements",
  nap: "Mutual Defense Pact",
  attack: "Attack",
  invasion: "Attack",
  guerillaAttack: "Ambush",
  victory: "Dominance",
  bot: "Rival",
  bots: "Rivals",
  player: "Commander",
} as const;

// =============================================================================
// VICTORY CONDITIONS
// =============================================================================

export const VICTORY_NAMES = {
  conquest: "Territorial Dominance",
  economic: "Market Dominance",
  diplomatic: "Coalition Dominance",
  research: "Tech Supremacy",
  military: "Force Supremacy",
  survival: "Endurance",
} as const;

// =============================================================================
// UI ELEMENTS
// =============================================================================

export const UI_LABELS = {
  dashboard: "Command Center",
  galaxyMap: "Star Chart", // Note: This replaces both "Galaxy Map" and "Starmap"
  military: "Forces",
  messages: "Comms",
  covert: "Intel Ops",
  syndicate: "Black Market",
  endTurn: "Next Cycle",
  market: "Exchange",
  diplomacy: "Diplomacy",
  research: "Research",
  crafting: "Manufacturing",
  planets: "Sectors", // Uses SECTORS_TERM
  combat: "Combat",
} as const;

// =============================================================================
// BOT ARCHETYPES (no change - these are unique to this game)
// =============================================================================

export const ARCHETYPE_NAMES = {
  warlord: "Warlord",
  diplomat: "Diplomat",
  merchant: "Merchant",
  schemer: "Schemer",
  turtle: "Turtle",
  blitzkrieg: "Blitzkrieg",
  techRush: "Tech Rush",
  opportunist: "Opportunist",
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get display name for a resource
 */
export function getResourceName(key: keyof typeof RESOURCE_NAMES): string {
  return RESOURCE_NAMES[key] ?? key;
}

/**
 * Get display name for a sector (planet) type
 */
export function getSectorName(key: keyof typeof SECTOR_NAMES): string {
  return SECTOR_NAMES[key] ?? key;
}

/**
 * Get display name for a military unit
 */
export function getUnitName(key: keyof typeof UNIT_NAMES): string {
  return UNIT_NAMES[key] ?? key;
}

/**
 * Get display name for a civil status level
 */
export function getCivilStatusName(key: keyof typeof CIVIL_STATUS_NAMES): string {
  return CIVIL_STATUS_NAMES[key] ?? key;
}

/**
 * Get display name for a victory condition
 */
export function getVictoryName(key: keyof typeof VICTORY_NAMES): string {
  return VICTORY_NAMES[key] ?? key;
}

/**
 * Get a UI label
 */
export function getUILabel(key: keyof typeof UI_LABELS): string {
  return UI_LABELS[key] ?? key;
}

/**
 * Get a game term
 */
export function getGameTerm(key: keyof typeof GAME_TERMS): string {
  return GAME_TERMS[key] ?? key;
}

// =============================================================================
// THEME METADATA
// =============================================================================

export const THEME_INFO = {
  name: "Nexus Dominion",
  tagline: "Dominate the Realm",
  version: "1.0",
  genre: "sci-fi",
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ResourceKey = keyof typeof RESOURCE_NAMES;
export type SectorKey = keyof typeof SECTOR_NAMES;
export type UnitKey = keyof typeof UNIT_NAMES;
export type CivilStatusKey = keyof typeof CIVIL_STATUS_NAMES;
export type VictoryKey = keyof typeof VICTORY_NAMES;
export type UILabelKey = keyof typeof UI_LABELS;
export type GameTermKey = keyof typeof GAME_TERMS;

/**
 * Game Constants from PRD
 *
 * These values define the starting state and production rates for the game.
 * All values are sourced from docs/PRD.md and should match the database schema defaults.
 */

import type { Sector } from "@/lib/db/schema";

// =============================================================================
// STARTING RESOURCES (PRD 4.1 + schema.ts defaults)
// =============================================================================

export const STARTING_RESOURCES = {
  credits: 100_000,
  food: 1_000,
  ore: 500,
  petroleum: 200,
  researchPoints: 0,
} as const;

// =============================================================================
// STARTING MILITARY (PRD 6.1 + schema.ts defaults)
// =============================================================================

export const STARTING_MILITARY = {
  soldiers: 100,
  fighters: 0,
  stations: 0,
  lightCruisers: 0,
  heavyCruisers: 0,
  carriers: 0,
  covertAgents: 0,
} as const;

// =============================================================================
// STARTING POPULATION (schema.ts defaults)
// =============================================================================

export const STARTING_POPULATION = {
  population: 10_000,
  populationCap: 50_000,
  civilStatus: "content" as const,
} as const;

// =============================================================================
// PLANET PRODUCTION RATES (PRD 5.2)
// =============================================================================

export const PLANET_PRODUCTION = {
  food: 160, // food units per turn
  ore: 112, // ore units per turn
  petroleum: 92, // petroleum units per turn
  tourism: 8_000, // credits per turn
  urban: 1_000, // credits per turn + pop cap increase
  education: 0, // civil status bonus (special effect)
  government: 300, // covert agent capacity
  research: 100, // research points per turn (base)
  supply: 0, // military cost reduction (special effect)
  anti_pollution: 0, // pollution offset (special effect)
  industrial: 0, // Tier 0 → Tier 1 processing (special effect)
} as const;

// =============================================================================
// PLANET BASE COSTS (PRD 5.2)
// =============================================================================

export const PLANET_COSTS = {
  food: 8_000,
  ore: 6_000,
  petroleum: 11_500,
  tourism: 8_000,
  urban: 8_000,
  education: 8_000,
  government: 7_500,
  research: 23_000,
  supply: 11_500,
  anti_pollution: 10_500,
  industrial: 15_000, // Crafting system: processes Tier 0 → Tier 1
} as const;

// =============================================================================
// STARTING PLANET DISTRIBUTION (PRD 5.1)
// =============================================================================

export type PlanetType = Sector["type"];

// Reduced from 9 to 5 sectors for faster eliminations (see IMPLEMENTATION-PLAN.md M1.1)
// Players must now purchase Research sectors - encourages strategic choices early game
export const STARTING_PLANETS: Array<{ type: PlanetType; count: number }> = [
  { type: "food", count: 1 },        // Reduced from 2
  { type: "ore", count: 1 },         // Reduced from 2
  { type: "petroleum", count: 1 },
  { type: "tourism", count: 1 },
  { type: "government", count: 1 },  // Keep for covert ops capacity
];

export const TOTAL_STARTING_PLANETS = STARTING_PLANETS.reduce(
  (sum, p) => sum + p.count,
  0
); // Should be 5

// =============================================================================
// PLANET TYPE DISPLAY LABELS
// =============================================================================

export const PLANET_TYPE_LABELS: Record<PlanetType, string> = {
  food: "Food",
  ore: "Ore",
  petroleum: "Petroleum",
  tourism: "Tourism",
  urban: "Urban",
  education: "Education",
  government: "Government",
  research: "Research",
  supply: "Supply",
  anti_pollution: "Anti-Pollution",
  industrial: "Industrial",
};

// =============================================================================
// CIVIL STATUS LEVELS (PRD 4.2)
// =============================================================================

export const CIVIL_STATUS_LEVELS = [
  "ecstatic",
  "happy",
  "content",
  "neutral",
  "unhappy",
  "angry",
  "rioting",
  "revolting",
] as const;

export type CivilStatusLevel = (typeof CIVIL_STATUS_LEVELS)[number];

// PRD 4.4: Civil Status Income Multipliers
// "0× (no bonus)" means baseline income (1×) with no bonus
export const CIVIL_STATUS_INCOME_MULTIPLIERS: Record<CivilStatusLevel, number> = {
  ecstatic: 4.0,   // PRD: "4× multiplier" - Many victories, high education
  happy: 3.0,      // PRD: "3× multiplier" - Stable empire, winning wars
  content: 2.0,    // PRD: "2× multiplier" - Normal state
  neutral: 1.0,    // PRD: "1× multiplier" - Minor problems
  unhappy: 1.0,    // PRD: "0× (no bonus)" = baseline (1×) - Starvation, battle losses
  angry: 0.75,     // Extrapolated: 25% penalty
  rioting: 0.5,    // Extrapolated: 50% penalty
  revolting: 0.25, // Extrapolated: 75% penalty (near collapse)
};

// =============================================================================
// GAME SETTINGS
// =============================================================================

export const GAME_SETTINGS = {
  defaultTurnLimit: 200,
  defaultBotCount: 25,
  protectionTurns: 20,
  armyEffectivenessDefault: 85,
} as const;

// =============================================================================
// GAME MODE PRESETS
// =============================================================================

export type GameMode = "oneshot" | "campaign";

/**
 * Game mode presets define the constraints for each game type.
 *
 * Oneshot: Quick, single-session games with fewer empires
 * Campaign: Multi-session games with larger galaxy and longer duration
 */
export const GAME_MODE_PRESETS = {
  oneshot: {
    label: "Oneshot",
    description: "Quick game, 10-25 empires, 50-100 turns, single session",
    minBots: 10,
    maxBots: 25,
    defaultBots: 15,
    minTurns: 50,
    maxTurns: 100,
    defaultTurns: 75,
  },
  campaign: {
    label: "Campaign",
    description: "Multi-session, 25-100 empires, 150-500 turns",
    minBots: 25,
    maxBots: 100,
    defaultBots: 50,
    minTurns: 150,
    maxTurns: 500,
    defaultTurns: 200,
  },
} as const;

/**
 * Get the preset configuration for a game mode.
 */
export function getGameModePreset(mode: GameMode) {
  return GAME_MODE_PRESETS[mode];
}

/**
 * Validate bot count for a given game mode.
 */
export function validateBotCount(mode: GameMode, botCount: number): boolean {
  const preset = GAME_MODE_PRESETS[mode];
  return botCount >= preset.minBots && botCount <= preset.maxBots;
}

/**
 * Validate turn limit for a given game mode.
 */
export function validateTurnLimit(mode: GameMode, turnLimit: number): boolean {
  const preset = GAME_MODE_PRESETS[mode];
  return turnLimit >= preset.minTurns && turnLimit <= preset.maxTurns;
}

// =============================================================================
// UI TERMINOLOGY LABELS
// =============================================================================

/**
 * User-facing terminology mappings.
 * "Sector" internally maps to "Sector" in UI for thematic consistency.
 */
export const UI_LABELS = {
  // Sector terminology (replaces "sector" in UI)
  sector: "Sector",
  sectors: "Sectors",
  sectorCount: "Sector Count",
  colonizeSector: "Colonize Sector",
  releaseSector: "Release Sector",
  sectorType: "Sector Type",

  // Sector type labels (use these instead of PLANET_TYPE_LABELS in UI)
  sectorTypes: {
    food: "Food Sector",
    ore: "Ore Sector",
    petroleum: "Petroleum Sector",
    tourism: "Tourism Sector",
    urban: "Urban Sector",
    education: "Education Sector",
    government: "Government Sector",
    research: "Research Sector",
    supply: "Supply Sector",
    anti_pollution: "Environmental Sector",
    industrial: "Industrial Sector",
  } as Record<PlanetType, string>,
} as const;

/**
 * Get display label for a sector type.
 */
export function getSectorTypeLabel(type: PlanetType): string {
  return UI_LABELS.sectorTypes[type];
}

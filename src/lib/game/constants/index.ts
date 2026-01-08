/**
 * Feature-Specific Constants Module
 *
 * This module contains FEATURE-SPECIFIC constants for individual game systems.
 *
 * Import Locations:
 * - `@/lib/constants/` - Core mechanics (diplomacy, unlocks) - see deprecation note
 * - `@/lib/game/constants/` (this directory) - Feature-specific systems
 *
 * TODO (TODO-002): Consolidate all constants into this directory.
 * Currently, diplomacy.ts and unlocks.ts remain in @/lib/constants/ due to
 * TypeScript re-export issues. Migration will be completed in a future PR.
 *
 * Exports:
 * - Crafting system constants - Recipes, components, timers
 * - Syndicate/Black Market constants - Trust levels, contracts
 * - Nuclear warfare constants - WMD mechanics, fallout
 * - Forced events constants - Event triggers
 */

// Crafting System
export * from "./crafting";

// Syndicate/Black Market System
export * from "./syndicate";

// Nuclear Warfare System
export * from "./nuclear";

// Forced Events
export * from "./forced-events";

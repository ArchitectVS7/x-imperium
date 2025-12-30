/**
 * Wormhole Service
 *
 * Manages wormhole discovery, stabilization, and collapse mechanics.
 * Wormholes provide shortcuts between distant galaxy regions, allowing
 * empires to bypass the normal influence sphere limitations.
 *
 * Based on docs/redesign/COMBAT-GEOGRAPHY-TURNS.md
 */

import type { RegionConnection, Empire } from "@/lib/db/schema";

// =============================================================================
// TYPES
// =============================================================================

export interface WormholeDiscoveryResult {
  /** Whether a wormhole was discovered */
  discovered: boolean;
  /** The connection ID if discovered */
  connectionId?: string;
  /** From region name */
  fromRegionName?: string;
  /** To region name */
  toRegionName?: string;
  /** Discovery message for the player */
  message: string;
}

export interface WormholeStabilizationResult {
  /** Whether stabilization was successful */
  success: boolean;
  /** Credits spent on stabilization */
  creditsSpent: number;
  /** New collapse chance (should be 0 after stabilization) */
  newCollapseChance: number;
  /** Message for the player */
  message: string;
}

export interface WormholeCollapseCheckResult {
  /** Whether the wormhole collapsed */
  collapsed: boolean;
  /** The connection ID that collapsed */
  connectionId?: string;
  /** Message for affected empires */
  message?: string;
}

export interface WormholeInfo {
  connectionId: string;
  fromRegionId: string;
  fromRegionName: string;
  toRegionId: string;
  toRegionName: string;
  status: "undiscovered" | "discovered" | "stabilized" | "collapsed";
  collapseChance: number;
  discoveredByEmpireId: string | null;
  discoveredByEmpireName: string | null;
  discoveredAtTurn: number | null;
  isKnownByPlayer: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const WORMHOLE_CONSTANTS = {
  /** Base discovery chance per turn (2%) */
  BASE_DISCOVERY_CHANCE: 0.02,
  /** Bonus discovery chance per covert agent (1%) */
  COVERT_AGENT_DISCOVERY_BONUS: 0.01,
  /** Bonus discovery chance per research level (0.5%) */
  RESEARCH_LEVEL_DISCOVERY_BONUS: 0.005,
  /** Maximum discovery chance (20%) */
  MAX_DISCOVERY_CHANCE: 0.20,

  /** Base collapse chance for unstabilized wormholes (5% per turn) */
  BASE_COLLAPSE_CHANCE: 0.05,
  /** Collapse chance after stabilization (0%) */
  STABILIZED_COLLAPSE_CHANCE: 0.00,

  /** Cost to stabilize a wormhole (in credits) */
  STABILIZATION_COST: 50000,
  /** Required research level to stabilize */
  STABILIZATION_RESEARCH_REQUIREMENT: 5,

  /** Turns until a discovered wormhole auto-stabilizes (if not collapsed) */
  AUTO_STABILIZE_TURNS: 50,

  /** Chance that a collapsed wormhole reopens (per turn) */
  REOPEN_CHANCE: 0.01,
};

// =============================================================================
// DISCOVERY MECHANICS
// =============================================================================

/**
 * Calculate the discovery chance for an empire based on their stats
 */
export function calculateDiscoveryChance(
  covertAgents: number,
  researchLevel: number,
  hasExplorer: boolean = false
): number {
  let chance = WORMHOLE_CONSTANTS.BASE_DISCOVERY_CHANCE;

  // Bonus from covert agents (capped at 5 agents contributing)
  const covertBonus = Math.min(covertAgents, 5) * WORMHOLE_CONSTANTS.COVERT_AGENT_DISCOVERY_BONUS;
  chance += covertBonus;

  // Bonus from research level (propulsion branch)
  const researchBonus = researchLevel * WORMHOLE_CONSTANTS.RESEARCH_LEVEL_DISCOVERY_BONUS;
  chance += researchBonus;

  // Explorer archetype bonus (50% increase)
  if (hasExplorer) {
    chance *= 1.5;
  }

  // Cap at maximum
  return Math.min(chance, WORMHOLE_CONSTANTS.MAX_DISCOVERY_CHANCE);
}

/**
 * Attempt to discover an undiscovered wormhole
 */
export function attemptWormholeDiscovery(
  empire: Pick<Empire, "id" | "covertAgents" | "fundamentalResearchLevel">,
  undiscoveredWormholes: Array<{
    id: string;
    fromRegionId: string;
    fromRegionName: string;
    toRegionId: string;
    toRegionName: string;
  }>,
  empireRegionId: string,
  random: () => number = Math.random
): WormholeDiscoveryResult {
  if (undiscoveredWormholes.length === 0) {
    return {
      discovered: false,
      message: "No undiscovered wormholes in range.",
    };
  }

  // Calculate discovery chance
  const discoveryChance = calculateDiscoveryChance(
    empire.covertAgents,
    empire.fundamentalResearchLevel
  );

  // Roll for discovery
  if (random() > discoveryChance) {
    return {
      discovered: false,
      message: `Exploration teams found nothing unusual. (${(discoveryChance * 100).toFixed(1)}% chance)`,
    };
  }

  // Prioritize wormholes connected to empire's region
  const nearbyWormholes = undiscoveredWormholes.filter(
    (w) => w.fromRegionId === empireRegionId || w.toRegionId === empireRegionId
  );

  // Pick a random wormhole (prefer nearby ones)
  const candidates = nearbyWormholes.length > 0 ? nearbyWormholes : undiscoveredWormholes;
  const wormholeIndex = Math.floor(random() * candidates.length);
  const discovered = candidates[wormholeIndex]!;

  return {
    discovered: true,
    connectionId: discovered.id,
    fromRegionName: discovered.fromRegionName,
    toRegionName: discovered.toRegionName,
    message: `Your explorers have discovered a wormhole connecting ${discovered.fromRegionName} to ${discovered.toRegionName}!`,
  };
}

// =============================================================================
// STABILIZATION MECHANICS
// =============================================================================

/**
 * Check if an empire can stabilize a wormhole
 */
export function canStabilizeWormhole(
  empire: Pick<Empire, "credits" | "fundamentalResearchLevel">,
  wormholeStatus: "discovered" | "stabilized" | "collapsed"
): { canStabilize: boolean; reason?: string } {
  // Can't stabilize if already stabilized or collapsed
  if (wormholeStatus === "stabilized") {
    return { canStabilize: false, reason: "Wormhole is already stabilized." };
  }

  if (wormholeStatus === "collapsed") {
    return { canStabilize: false, reason: "Wormhole has collapsed and cannot be stabilized." };
  }

  // Check research level
  if (empire.fundamentalResearchLevel < WORMHOLE_CONSTANTS.STABILIZATION_RESEARCH_REQUIREMENT) {
    return {
      canStabilize: false,
      reason: `Requires research level ${WORMHOLE_CONSTANTS.STABILIZATION_RESEARCH_REQUIREMENT}. Current: ${empire.fundamentalResearchLevel}`,
    };
  }

  // Check credits
  if (empire.credits < WORMHOLE_CONSTANTS.STABILIZATION_COST) {
    return {
      canStabilize: false,
      reason: `Requires ${WORMHOLE_CONSTANTS.STABILIZATION_COST.toLocaleString()} credits. Current: ${empire.credits.toLocaleString()}`,
    };
  }

  return { canStabilize: true };
}

/**
 * Stabilize a discovered wormhole
 */
export function stabilizeWormhole(
  empire: Pick<Empire, "id" | "credits" | "fundamentalResearchLevel">,
  wormhole: Pick<RegionConnection, "id" | "wormholeStatus">
): WormholeStabilizationResult {
  const { canStabilize, reason } = canStabilizeWormhole(empire, wormhole.wormholeStatus as "discovered" | "stabilized" | "collapsed");

  if (!canStabilize) {
    return {
      success: false,
      creditsSpent: 0,
      newCollapseChance: Number(wormhole.wormholeStatus === "discovered" ? WORMHOLE_CONSTANTS.BASE_COLLAPSE_CHANCE : 0),
      message: reason ?? "Cannot stabilize wormhole.",
    };
  }

  return {
    success: true,
    creditsSpent: WORMHOLE_CONSTANTS.STABILIZATION_COST,
    newCollapseChance: WORMHOLE_CONSTANTS.STABILIZED_COLLAPSE_CHANCE,
    message: `Wormhole stabilized! The passage is now permanent and safe for regular use.`,
  };
}

// =============================================================================
// COLLAPSE MECHANICS
// =============================================================================

/**
 * Check if an unstabilized wormhole collapses this turn
 */
export function checkWormholeCollapse(
  wormhole: Pick<RegionConnection, "id" | "wormholeStatus" | "collapseChance">,
  turnsSinceDiscovery: number,
  random: () => number = Math.random
): WormholeCollapseCheckResult {
  // Only discovered (unstabilized) wormholes can collapse
  if (wormhole.wormholeStatus !== "discovered") {
    return { collapsed: false };
  }

  // Use the wormhole's collapse chance (or default)
  const collapseChance = wormhole.collapseChance
    ? Number(wormhole.collapseChance)
    : WORMHOLE_CONSTANTS.BASE_COLLAPSE_CHANCE;

  // Increase collapse chance over time for unstabilized wormholes
  const timeModifier = 1 + (turnsSinceDiscovery * 0.01); // +1% per turn
  const adjustedChance = Math.min(collapseChance * timeModifier, 0.25); // Cap at 25%

  // Roll for collapse
  if (random() < adjustedChance) {
    return {
      collapsed: true,
      connectionId: wormhole.id,
      message: `The unstable wormhole has collapsed! The passage is no longer usable.`,
    };
  }

  return { collapsed: false };
}

/**
 * Check if a collapsed wormhole reopens
 */
export function checkWormholeReopen(
  wormhole: Pick<RegionConnection, "id" | "wormholeStatus">,
  random: () => number = Math.random
): { reopened: boolean; message?: string } {
  if (wormhole.wormholeStatus !== "collapsed") {
    return { reopened: false };
  }

  if (random() < WORMHOLE_CONSTANTS.REOPEN_CHANCE) {
    return {
      reopened: true,
      message: `Strange readings detected... a collapsed wormhole has reopened!`,
    };
  }

  return { reopened: false };
}

// =============================================================================
// WORMHOLE INFORMATION
// =============================================================================

/**
 * Get formatted wormhole information for display
 */
export function getWormholeDisplayInfo(
  connection: RegionConnection,
  fromRegionName: string,
  toRegionName: string,
  discovererName: string | null,
  isKnownByPlayer: boolean
): WormholeInfo {
  return {
    connectionId: connection.id,
    fromRegionId: connection.fromRegionId,
    fromRegionName,
    toRegionId: connection.toRegionId,
    toRegionName,
    status: (connection.wormholeStatus as WormholeInfo["status"]) ?? "undiscovered",
    collapseChance: connection.collapseChance ? Number(connection.collapseChance) : 0,
    discoveredByEmpireId: connection.discoveredByEmpireId,
    discoveredByEmpireName: discovererName,
    discoveredAtTurn: connection.discoveredAtTurn,
    isKnownByPlayer,
  };
}

/**
 * Get all wormholes known by an empire
 */
export function getKnownWormholes(
  empireId: string,
  allWormholes: Array<RegionConnection & { fromRegionName: string; toRegionName: string; discovererName: string | null }>,
  empireRegionId: string
): WormholeInfo[] {
  const knownWormholes: WormholeInfo[] = [];

  for (const wormhole of allWormholes) {
    if (wormhole.connectionType !== "wormhole") continue;

    // Player knows about wormholes that:
    // 1. They discovered
    // 2. Are in their region
    // 3. Are stabilized (public knowledge)
    const discoveredByPlayer = wormhole.discoveredByEmpireId === empireId;
    const inPlayerRegion =
      wormhole.fromRegionId === empireRegionId || wormhole.toRegionId === empireRegionId;
    const isStabilized = wormhole.wormholeStatus === "stabilized";

    const isKnown = discoveredByPlayer || inPlayerRegion || isStabilized;

    if (isKnown && wormhole.wormholeStatus !== "undiscovered") {
      knownWormholes.push(
        getWormholeDisplayInfo(
          wormhole,
          wormhole.fromRegionName,
          wormhole.toRegionName,
          wormhole.discovererName,
          true
        )
      );
    }
  }

  return knownWormholes;
}

// =============================================================================
// TURN PROCESSING
// =============================================================================

/**
 * Process wormholes at the end of a turn
 * - Check for collapses
 * - Check for reopenings
 * - Auto-stabilize old wormholes
 */
export function processWormholesTurn(
  wormholes: Array<RegionConnection & { discoveredAtTurn: number | null }>,
  currentTurn: number,
  random: () => number = Math.random
): {
  collapsed: string[];
  reopened: string[];
  autoStabilized: string[];
  messages: string[];
} {
  const collapsed: string[] = [];
  const reopened: string[] = [];
  const autoStabilized: string[] = [];
  const messages: string[] = [];

  for (const wormhole of wormholes) {
    if (wormhole.connectionType !== "wormhole") continue;

    // Check for collapse
    if (wormhole.wormholeStatus === "discovered" && wormhole.discoveredAtTurn) {
      const turnsSinceDiscovery = currentTurn - wormhole.discoveredAtTurn;

      // Auto-stabilize after enough turns
      if (turnsSinceDiscovery >= WORMHOLE_CONSTANTS.AUTO_STABILIZE_TURNS) {
        autoStabilized.push(wormhole.id);
        messages.push(`A wormhole has naturally stabilized after ${turnsSinceDiscovery} turns.`);
        continue;
      }

      // Check for collapse
      const collapseResult = checkWormholeCollapse(wormhole, turnsSinceDiscovery, random);
      if (collapseResult.collapsed) {
        collapsed.push(wormhole.id);
        if (collapseResult.message) {
          messages.push(collapseResult.message);
        }
      }
    }

    // Check for reopen
    if (wormhole.wormholeStatus === "collapsed") {
      const reopenResult = checkWormholeReopen(wormhole, random);
      if (reopenResult.reopened) {
        reopened.push(wormhole.id);
        if (reopenResult.message) {
          messages.push(reopenResult.message);
        }
      }
    }
  }

  return { collapsed, reopened, autoStabilized, messages };
}

/**
 * Starmap Type Definitions
 */

import type { TellType, TellPerception } from "@/lib/tells";

/**
 * Intel levels for fog of war system
 * - unknown: Only empire name visible (default for new rivals)
 * - basic: Approximate size visible (shared treaty or adjacent territory)
 * - moderate: Planet count range, military tier (recon mission)
 * - full: All stats visible (active spy network, alliance, or post-combat)
 */
export type IntelLevel = "unknown" | "basic" | "moderate" | "full";

/**
 * Empire tell data for starmap display
 */
export interface EmpireTellData {
  displayType: TellType;
  displayConfidence: number;
  perceivedTruth: boolean;
  signalDetected: boolean;
  /** Target empire ID if this tell is targeted */
  targetEmpireId?: string;
}

export type { TellType, TellPerception };

/**
 * Threat level indicators based on recent activity
 */
export type ThreatLevel = "peaceful" | "neutral" | "hostile" | "at_war";

/**
 * Empire archetype for visual differentiation
 * Uses snake_case to match database schema (botArchetypeEnum)
 */
export type EmpireArchetype =
  | "warlord"
  | "diplomat"
  | "merchant"
  | "schemer"
  | "turtle"
  | "blitzkrieg"
  | "tech_rush"
  | "opportunist"
  | "unknown";

export interface EmpireMapData {
  id: string;
  name: string;
  type: "player" | "bot";
  planetCount: number;
  networth: number;
  isEliminated: boolean;
  // Fog of war - intel level determines what's visible
  intelLevel: IntelLevel;
  // Threat indicators (only shown with sufficient intel)
  threatLevel?: ThreatLevel;
  // Archetype for visual styling (shown with moderate+ intel)
  archetype?: EmpireArchetype;
  // Military power tier (shown with moderate+ intel)
  militaryTier?: "weak" | "moderate" | "strong" | "dominant";
  // Has attacked player recently
  recentAggressor?: boolean;
  // Has active treaty with player
  hasTreaty?: boolean;
  // M7: Boss detection - dominant empire indicators
  isBoss?: boolean;
  bossEmergenceTurn?: number | null;
  battleWins?: number;
  networthRatio?: number;
  // PRD 7.10: Bot tell system - behavioral signals
  activeTell?: EmpireTellData;
  // Computed for visualization
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export type TreatyConnectionType = "alliance" | "nap";

export interface TreatyConnection {
  empire1Id: string;
  empire2Id: string;
  type: TreatyConnectionType;
}

export interface StarmapProps {
  empires: EmpireMapData[];
  playerEmpireId: string;
  currentTurn: number;
  protectionTurns: number;
  treaties?: TreatyConnection[];
  width?: number;
  height?: number;
}

export interface EmpireNodeProps {
  empire: EmpireMapData;
  isPlayer: boolean;
  isProtected: boolean;
  x: number;
  y: number;
  size: number;
  onHover: (empire: EmpireMapData | null) => void;
}

export interface TooltipData {
  empire: EmpireMapData;
  x: number;
  y: number;
}

/**
 * Visual configuration for nebula cloud rendering
 */
export interface NebulaConfig {
  // Base color palette
  playerColor: string;
  hostileColor: string;
  neutralColor: string;
  eliminatedColor: string;
  unknownColor: string;
  // Glow intensity based on power
  glowIntensity: number;
  // Particle count for nebula effect
  particleCount: number;
}

export const DEFAULT_NEBULA_CONFIG: NebulaConfig = {
  playerColor: "#3b82f6", // blue
  hostileColor: "#ef4444", // red
  neutralColor: "#6b7280", // gray
  eliminatedColor: "#374151", // dark gray
  unknownColor: "#1f2937", // very dark
  glowIntensity: 0.6,
  particleCount: 8,
};

/**
 * Attack Validation Service
 *
 * Integrates influence sphere validation with attack execution.
 * Applies force multipliers based on distance/connection type.
 *
 * Based on docs/redesign/COMBAT-GEOGRAPHY-TURNS.md
 *
 * ============================================================
 * FORCE MULTIPLIER EXPLAINED
 * ============================================================
 *
 * The 1.5x "force multiplier" represents SUPPLY LINE STRAIN.
 * Your forces are DIVIDED by this multiplier, reducing effectiveness.
 *
 * Example:
 *   - You send 100 soldiers to attack an extended neighbor
 *   - Due to stretched supply lines: 100 / 1.5 = 66 effective soldiers
 *   - You fight as if you only had 66 soldiers
 *
 * Multiplier Values:
 *   - Direct neighbor:     1.0x (100 soldiers → 100 effective)
 *   - Extended neighbor:   1.5x (100 soldiers → 66 effective)
 *   - Via wormhole:        1.0x (100 soldiers → 100 effective)
 *   - Hazardous route:     1.5x (dangerous passage)
 *   - Contested route:     1.25x (active conflict zone)
 *
 * ============================================================
 * WHY ATTACK EXTENDED NEIGHBORS?
 * ============================================================
 *
 * Strategic reasons to accept the 1.5x penalty:
 *
 * 1. TARGET IS WEAK: Even at 66% effectiveness, you can win if
 *    the defender is significantly weaker than you.
 *
 * 2. PREEMPTIVE STRIKE: Stop a growing threat before they
 *    become your direct neighbor at full strength.
 *
 * 3. COALITION ATTACK: Multiple empires attack same target.
 *    Even at reduced power, combined forces overwhelm.
 *
 * 4. TERRITORY EXPANSION: Conquering their sectors pulls them
 *    into your direct sphere for future attacks.
 *
 * 5. WORMHOLE DISCOVERY: Combat operations may discover
 *    wormholes, making future attacks cheaper.
 *
 * 6. REVENGE/GRUDGE: Bot archetypes may attack for emotional
 *    reasons regardless of strategic cost.
 *
 * 7. SYNDICATE CONTRACT: Kill contracts may require attacking
 *    specific targets regardless of distance.
 */

import {
  calculateInfluenceSphere,
  validateAttack as validateInfluenceAttack,
  getValidAttackTargets,
  type InfluenceSphereResult,
} from "../geography/influence-sphere-service";
import type { Empire, GalaxyRegion, RegionConnection, EmpireInfluence } from "@/lib/db/schema";

// =============================================================================
// TYPES
// =============================================================================

export interface AttackTargetInfo {
  empireId: string;
  empireName: string;
  networth: number;
  sectorCount: number;
  regionId: string;
  regionName: string;
  forceMultiplier: number;
  influenceType: "direct" | "extended" | "wormhole" | "unreachable";
  isInProtection: boolean;
  hasTreaty: boolean;
  canAttack: boolean;
  reason?: string;
}

export interface AttackValidationWithInfluence {
  valid: boolean;
  errors: string[];
  forceMultiplier: number;
  adjustedForces?: {
    soldiers: number;
    fighters: number;
    lightCruisers: number;
    heavyCruisers: number;
    carriers: number;
    stations: number;
  };
  influenceType: "direct" | "extended" | "wormhole" | "unreachable";
}

// =============================================================================
// ATTACK TARGET VALIDATION
// =============================================================================

/**
 * Get all valid attack targets for an empire with full info
 */
export function getAttackTargetsWithInfo(
  attackerEmpire: Pick<Empire, "id" | "sectorCount">,
  attackerInfluence: EmpireInfluence,
  allEmpires: Array<{
    id: string;
    name: string;
    networth: number;
    sectorCount: number;
    isEliminated: boolean;
  }>,
  empireRegions: Map<string, string>, // empireId -> regionId
  regions: Map<string, Pick<GalaxyRegion, "id" | "name" | "positionX" | "positionY">>,
  connections: RegionConnection[],
  protectedEmpireIds: Set<string>,
  treatyPartnerIds: Set<string>
): AttackTargetInfo[] {
  // Build empire info map
  const empireInfoMap = new Map<string, { id: string; name: string; networth: number }>();
  for (const empire of allEmpires) {
    empireInfoMap.set(empire.id, { id: empire.id, name: empire.name, networth: empire.networth });
  }

  // Calculate influence sphere
  const empireWithRegions = allEmpires
    .filter((e) => !e.isEliminated)
    .map((e) => ({
      ...e,
      regionId: empireRegions.get(e.id) ?? attackerInfluence.homeRegionId,
    }));

  const influenceSphere = calculateInfluenceSphere(
    attackerEmpire,
    attackerInfluence,
    empireWithRegions,
    regions,
    connections
  );

  // Get valid targets from influence sphere
  const validTargets = getValidAttackTargets(influenceSphere, empireInfoMap);

  // Build full target info
  const targets: AttackTargetInfo[] = [];

  for (const empire of allEmpires) {
    if (empire.id === attackerEmpire.id || empire.isEliminated) {
      continue;
    }

    const regionId = empireRegions.get(empire.id) ?? "";
    const region = regions.get(regionId);
    const isInProtection = protectedEmpireIds.has(empire.id);
    const hasTreaty = treatyPartnerIds.has(empire.id);

    // Find if this empire is in valid targets
    const validTarget = validTargets.find((t) => t.empireId === empire.id);

    let influenceType: AttackTargetInfo["influenceType"] = "unreachable";
    let forceMultiplier = 0;
    let canAttack = false;
    let reason: string | undefined;

    if (validTarget) {
      influenceType = validTarget.influenceType;
      forceMultiplier = validTarget.forceMultiplier;

      if (isInProtection) {
        canAttack = false;
        reason = "Empire is under protection";
      } else if (hasTreaty) {
        canAttack = false;
        reason = "Active treaty prevents attack";
      } else {
        canAttack = true;
      }
    } else {
      // Check if reachable via wormhole
      const knownWormholes = JSON.parse(attackerInfluence.knownWormholeIds as string) as string[];
      if (knownWormholes.length > 0) {
        // TODO: Implement wormhole path finding
        influenceType = "unreachable";
      }

      canAttack = false;
      reason = "Target is outside your sphere of influence";
    }

    targets.push({
      empireId: empire.id,
      empireName: empire.name,
      networth: empire.networth,
      sectorCount: empire.sectorCount,
      regionId,
      regionName: region?.name ?? "Unknown",
      forceMultiplier,
      influenceType,
      isInProtection,
      hasTreaty,
      canAttack,
      reason,
    });
  }

  // Sort by influence type (attackable first), then by networth
  targets.sort((a, b) => {
    if (a.canAttack !== b.canAttack) return a.canAttack ? -1 : 1;
    if (a.influenceType !== b.influenceType) {
      const order = { direct: 0, extended: 1, wormhole: 2, unreachable: 3 };
      return order[a.influenceType] - order[b.influenceType];
    }
    return b.networth - a.networth;
  });

  return targets;
}

/**
 * Validate an attack considering influence sphere constraints
 */
export function validateAttackWithInfluence(
  attackerId: string,
  defenderId: string,
  attackerInfluence: InfluenceSphereResult,
  requestedForces: {
    soldiers: number;
    fighters: number;
    lightCruisers: number;
    heavyCruisers: number;
    carriers: number;
    stations: number;
  },
  isDefenderProtected: boolean,
  hasActiveTreaty: boolean
): AttackValidationWithInfluence {
  const errors: string[] = [];

  // Check protection
  if (isDefenderProtected) {
    errors.push("Target empire is under protection");
    return {
      valid: false,
      errors,
      forceMultiplier: 0,
      influenceType: "unreachable",
    };
  }

  // Check treaty
  if (hasActiveTreaty) {
    errors.push("Cannot attack empire with active treaty");
    return {
      valid: false,
      errors,
      forceMultiplier: 0,
      influenceType: "unreachable",
    };
  }

  // Validate with influence sphere
  const influenceValidation = validateInfluenceAttack(
    attackerId,
    defenderId,
    attackerInfluence
  );

  if (!influenceValidation.canAttack) {
    errors.push(influenceValidation.reason ?? "Target is outside sphere of influence");
    return {
      valid: false,
      errors,
      forceMultiplier: 0,
      influenceType: "unreachable",
    };
  }

  // Determine influence type
  let influenceType: "direct" | "extended" | "wormhole" = "direct";
  if (attackerInfluence.extendedNeighbors.includes(defenderId)) {
    influenceType = "extended";
  }

  // Apply force multiplier
  // Forces are "taxed" by the distance - need more units to project power
  const forceMultiplier = influenceValidation.forceMultiplier;

  // For extended neighbors, forces are effectively reduced by the multiplier
  // (You need 1.5x forces to attack at full strength, so your effective force is forces / 1.5)
  const adjustedForces = {
    soldiers: Math.floor(requestedForces.soldiers / forceMultiplier),
    fighters: Math.floor(requestedForces.fighters / forceMultiplier),
    lightCruisers: Math.floor(requestedForces.lightCruisers / forceMultiplier),
    heavyCruisers: Math.floor(requestedForces.heavyCruisers / forceMultiplier),
    carriers: Math.floor(requestedForces.carriers / forceMultiplier),
    stations: Math.floor(requestedForces.stations / forceMultiplier),
  };

  return {
    valid: true,
    errors: [],
    forceMultiplier,
    adjustedForces,
    influenceType,
  };
}

// =============================================================================
// FORCE CALCULATION HELPERS
// =============================================================================

/**
 * Calculate the forces required to achieve desired effective forces at a distance
 *
 * If you want 100 effective soldiers at 1.5x multiplier, you need 150 soldiers
 */
export function calculateRequiredForces(
  desiredEffectiveForces: {
    soldiers: number;
    fighters: number;
    lightCruisers: number;
    heavyCruisers: number;
    carriers: number;
    stations: number;
  },
  forceMultiplier: number
): {
  soldiers: number;
  fighters: number;
  lightCruisers: number;
  heavyCruisers: number;
  carriers: number;
  stations: number;
} {
  return {
    soldiers: Math.ceil(desiredEffectiveForces.soldiers * forceMultiplier),
    fighters: Math.ceil(desiredEffectiveForces.fighters * forceMultiplier),
    lightCruisers: Math.ceil(desiredEffectiveForces.lightCruisers * forceMultiplier),
    heavyCruisers: Math.ceil(desiredEffectiveForces.heavyCruisers * forceMultiplier),
    carriers: Math.ceil(desiredEffectiveForces.carriers * forceMultiplier),
    stations: Math.ceil(desiredEffectiveForces.stations * forceMultiplier),
  };
}

/**
 * Calculate effective forces that will arrive after distance penalty
 */
export function calculateEffectiveForces(
  sentForces: {
    soldiers: number;
    fighters: number;
    lightCruisers: number;
    heavyCruisers: number;
    carriers: number;
    stations: number;
  },
  forceMultiplier: number
): {
  soldiers: number;
  fighters: number;
  lightCruisers: number;
  heavyCruisers: number;
  carriers: number;
  stations: number;
} {
  return {
    soldiers: Math.floor(sentForces.soldiers / forceMultiplier),
    fighters: Math.floor(sentForces.fighters / forceMultiplier),
    lightCruisers: Math.floor(sentForces.lightCruisers / forceMultiplier),
    heavyCruisers: Math.floor(sentForces.heavyCruisers / forceMultiplier),
    carriers: Math.floor(sentForces.carriers / forceMultiplier),
    stations: Math.floor(sentForces.stations / forceMultiplier),
  };
}

// =============================================================================
// NARRATIVE HELPERS
// =============================================================================

/**
 * Generate a narrative description of the attack distance
 */
export function getDistanceNarrative(
  influenceType: "direct" | "extended" | "wormhole" | "unreachable",
  attackerRegionName: string,
  defenderRegionName: string
): string {
  switch (influenceType) {
    case "direct":
      return `Your forces launch from ${attackerRegionName} against the neighboring ${defenderRegionName}.`;
    case "extended":
      return `Your forces undertake a long-range expedition from ${attackerRegionName} to the distant ${defenderRegionName}. Extended supply lines reduce combat effectiveness.`;
    case "wormhole":
      return `Your forces traverse a wormhole from ${attackerRegionName}, emerging near ${defenderRegionName} ready for battle.`;
    case "unreachable":
      return `${defenderRegionName} is beyond your reach. Expand your territory or discover wormholes to project power there.`;
  }
}

/**
 * Get a warning about force reduction for extended attacks
 */
export function getForceReductionWarning(
  forceMultiplier: number,
  sentForces: { soldiers: number },
  effectiveForces: { soldiers: number }
): string | null {
  if (forceMultiplier <= 1.0) {
    return null;
  }

  const reductionPercent = Math.round((1 - 1 / forceMultiplier) * 100);
  return `Due to extended supply lines, your forces will arrive at ${100 - reductionPercent}% effectiveness. ` +
    `Sending ${sentForces.soldiers} soldiers will arrive as ${effectiveForces.soldiers} effective soldiers.`;
}

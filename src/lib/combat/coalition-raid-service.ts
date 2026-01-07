/**
 * Coalition Raid Service (M9)
 *
 * Implements coordinated attack mechanics when multiple empires
 * attack the same boss in the same turn.
 *
 * Features:
 * - M9.1: Coalition raid detection (3+ attackers on boss)
 * - M9.2: Raid combat bonuses (+5% per attacker beyond 2)
 * - M9.3: Raid territory distribution (min 1 sector + damage %)
 */

// =============================================================================
// TYPES
// =============================================================================

export interface PendingAttack {
  attackerId: string;
  attackerName: string;
  defenderId: string;
  defenderName: string;
  damage: number;
  troopsCommitted: number;
  turn: number;
}

export interface BossStatus {
  empireId: string;
  isBoss: boolean;
  battleWins: number;
  networthRatio: number;
}

export interface CoalitionRaid {
  /** ID of the boss being attacked */
  targetEmpireId: string;
  /** Name of the boss being attacked */
  targetEmpireName: string;
  /** IDs of all attacking empires */
  attackerIds: string[];
  /** Names of all attacking empires */
  attackerNames: string[];
  /** Whether this qualifies as a coalition raid (3+ attackers) */
  isValidRaid: boolean;
  /** Combat bonus percentage (0.05 = 5%) */
  bonusPercentage: number;
  /** Turn when the raid occurred */
  turn: number;
}

export interface RaidParticipant {
  empireId: string;
  empireName: string;
  damageDealt: number;
  troopsCommitted: number;
  damagePercentage: number;
}

export interface RaidDistribution {
  empireId: string;
  empireName: string;
  /** Number of sectors awarded */
  planetsAwarded: number;
  /** Percentage of damage dealt (0-1) */
  damagePercentage: number;
  /** Fraction of elimination credit (0-1) */
  eliminationCredit: number;
}

export interface RaidResult {
  raid: CoalitionRaid;
  participants: RaidParticipant[];
  distributions: RaidDistribution[];
  totalPlanetsDistributed: number;
  bossEliminated: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Minimum number of attackers required for coalition raid */
export const MIN_COALITION_SIZE = 3;

/** Combat bonus per additional attacker beyond 2 (5%) */
export const BONUS_PER_ATTACKER = 0.05;

/** Maximum combat bonus from coalition (25%) */
export const MAX_COALITION_BONUS = 0.25;

/** Base reputation bonus for raid participation */
export const RAID_REPUTATION_BONUS = 5;

/** Production bonus duration (turns) */
export const PRODUCTION_BONUS_TURNS = 10;

/** Production bonus amount (10%) */
export const PRODUCTION_BONUS_AMOUNT = 0.10;

/** Morale bonus for raid participation (5%) */
export const MORALE_BONUS_AMOUNT = 0.05;

/** Morale bonus duration (turns) */
export const MORALE_BONUS_TURNS = 5;

// =============================================================================
// M9.1: COALITION RAID DETECTION
// =============================================================================

/**
 * Detect if a coalition raid is occurring based on pending attacks.
 *
 * Criteria:
 * - Target must be a detected boss
 * - 3+ empires attack the same boss in the same turn
 *
 * @param attacks - All pending attacks for the current turn
 * @param bossStatuses - Boss status for all empires
 * @param currentTurn - Current game turn
 * @returns Coalition raid if detected, null otherwise
 */
export function detectCoalitionRaid(
  attacks: PendingAttack[],
  bossStatuses: BossStatus[],
  currentTurn: number
): CoalitionRaid | null {
  // Group attacks by target
  const attacksByTarget = new Map<string, PendingAttack[]>();

  for (const attack of attacks) {
    if (attack.turn !== currentTurn) continue;

    const existing = attacksByTarget.get(attack.defenderId) ?? [];
    existing.push(attack);
    attacksByTarget.set(attack.defenderId, existing);
  }

  // Check each target for coalition raid conditions
  for (const [targetId, targetAttacks] of Array.from(attacksByTarget)) {
    // Check if target is a boss
    const bossStatus = bossStatuses.find((b) => b.empireId === targetId);
    if (!bossStatus?.isBoss) continue;

    // Get unique attackers
    const uniqueAttackers = new Map<string, PendingAttack>();
    for (const attack of targetAttacks) {
      // Keep the attack with highest damage if multiple from same attacker
      const existing = uniqueAttackers.get(attack.attackerId);
      if (!existing || attack.damage > existing.damage) {
        uniqueAttackers.set(attack.attackerId, attack);
      }
    }

    const attackerCount = uniqueAttackers.size;

    // Check if we have enough attackers for coalition
    if (attackerCount < MIN_COALITION_SIZE) continue;

    // Calculate bonus: +5% per attacker beyond 2, cap at 25%
    const bonusPercentage = Math.min(
      (attackerCount - 2) * BONUS_PER_ATTACKER,
      MAX_COALITION_BONUS
    );

    const attackerIds: string[] = [];
    const attackerNames: string[] = [];
    for (const attack of Array.from(uniqueAttackers.values())) {
      attackerIds.push(attack.attackerId);
      attackerNames.push(attack.attackerName);
    }

    // Get target name from first attack
    const targetName = targetAttacks[0]?.defenderName ?? "Unknown";

    return {
      targetEmpireId: targetId,
      targetEmpireName: targetName,
      attackerIds,
      attackerNames,
      isValidRaid: true,
      bonusPercentage,
      turn: currentTurn,
    };
  }

  return null;
}

/**
 * Check if a specific attacker is part of a coalition raid.
 */
export function isPartOfCoalitionRaid(
  attackerId: string,
  raid: CoalitionRaid | null
): boolean {
  if (!raid || !raid.isValidRaid) return false;
  return raid.attackerIds.includes(attackerId);
}

// =============================================================================
// M9.2: RAID COMBAT BONUSES
// =============================================================================

/**
 * Calculate the combat bonus for a coalition raid participant.
 *
 * Mechanics:
 * - All raid participants get +5% combat power per additional attacker beyond 2
 * - Example: 4 attackers = +10% each, 5 attackers = +15% each
 * - Capped at +25% (7+ attackers)
 *
 * @param raid - The coalition raid
 * @param attackerId - ID of the attacker to calculate bonus for
 * @returns Combat power multiplier (1.0 = no bonus, 1.15 = +15%)
 */
export function calculateRaidCombatBonus(
  raid: CoalitionRaid | null,
  attackerId: string
): number {
  if (!raid || !raid.isValidRaid) return 1.0;
  if (!raid.attackerIds.includes(attackerId)) return 1.0;

  // Return bonus as multiplier (e.g., 0.15 becomes 1.15)
  return 1.0 + raid.bonusPercentage;
}

/**
 * Get a human-readable description of the raid bonus.
 */
export function getRaidBonusDescription(raid: CoalitionRaid): string {
  const bonusPercent = Math.round(raid.bonusPercentage * 100);
  return `Coalition Raid: ${raid.attackerIds.length} empires coordinating attack. +${bonusPercent}% combat bonus to all participants.`;
}

// =============================================================================
// M9.3: RAID TERRITORY DISTRIBUTION
// =============================================================================

/**
 * Calculate territory distribution for a successful coalition raid.
 *
 * Distribution Model (Hybrid):
 * - Minimum 1 sector per participant (participation award)
 * - Remaining sectors distributed by damage percentage
 *
 * @param raid - The coalition raid
 * @param attacks - All attacks from the raid
 * @param totalPlanetsCaptured - Total sectors captured from the boss
 * @returns Distribution of sectors for each participant
 */
export function calculateRaidDistribution(
  raid: CoalitionRaid,
  attacks: PendingAttack[],
  totalPlanetsCaptured: number
): RaidDistribution[] {
  if (!raid.isValidRaid || totalPlanetsCaptured === 0) {
    return [];
  }

  // Calculate damage by each attacker
  const damageByAttacker = new Map<string, { damage: number; name: string }>();

  for (const attack of attacks) {
    if (!raid.attackerIds.includes(attack.attackerId)) continue;

    const existing = damageByAttacker.get(attack.attackerId);
    if (existing) {
      existing.damage += attack.damage;
    } else {
      damageByAttacker.set(attack.attackerId, {
        damage: attack.damage,
        name: attack.attackerName,
      });
    }
  }

  // Calculate total damage
  let totalDamage = 0;
  for (const { damage } of Array.from(damageByAttacker.values())) {
    totalDamage += damage;
  }

  // Handle case where no damage was dealt
  if (totalDamage === 0) {
    // Distribute evenly
    const planetsEach = Math.floor(totalPlanetsCaptured / raid.attackerIds.length);
    let remainingPlanets = totalPlanetsCaptured - planetsEach * raid.attackerIds.length;

    return raid.attackerIds.map((empireId, index) => ({
      empireId,
      empireName: raid.attackerNames[index] ?? "Unknown",
      planetsAwarded: planetsEach + (remainingPlanets-- > 0 ? 1 : 0),
      damagePercentage: 1 / raid.attackerIds.length,
      eliminationCredit: 1 / raid.attackerIds.length,
    }));
  }

  const participantCount = raid.attackerIds.length;
  const equalCredit = 1 / participantCount;

  // Step 1: Each participant gets minimum 1 sector (if available)
  const minimumPlanets = Math.min(participantCount, totalPlanetsCaptured);
  let remainingPlanets = totalPlanetsCaptured - minimumPlanets;

  // Initialize distribution
  const distribution: RaidDistribution[] = raid.attackerIds.map((empireId, index) => {
    const attackerData = damageByAttacker.get(empireId);
    const damage = attackerData?.damage ?? 0;
    const damagePercentage = damage / totalDamage;

    return {
      empireId,
      empireName: raid.attackerNames[index] ?? attackerData?.name ?? "Unknown",
      planetsAwarded: minimumPlanets > index ? 1 : 0, // Give 1 sector to first N participants
      damagePercentage,
      eliminationCredit: equalCredit,
    };
  });

  // Step 2: Distribute remaining sectors by damage percentage
  while (remainingPlanets > 0) {
    // Find participant who is most "under-allocated" based on damage %
    let maxDeficit = -Infinity;
    let maxDeficitIndex = 0;

    for (let i = 0; i < distribution.length; i++) {
      const d = distribution[i]!;
      const expectedPlanets = totalPlanetsCaptured * d.damagePercentage;
      const deficit = expectedPlanets - d.planetsAwarded;

      if (deficit > maxDeficit) {
        maxDeficit = deficit;
        maxDeficitIndex = i;
      }
    }

    distribution[maxDeficitIndex]!.planetsAwarded++;
    remainingPlanets--;
  }

  return distribution;
}

/**
 * Get raid participants with their contribution details.
 */
export function getRaidParticipants(
  raid: CoalitionRaid,
  attacks: PendingAttack[]
): RaidParticipant[] {
  const participantMap = new Map<
    string,
    { name: string; damage: number; troops: number }
  >();

  for (const attack of attacks) {
    if (!raid.attackerIds.includes(attack.attackerId)) continue;

    const existing = participantMap.get(attack.attackerId);
    if (existing) {
      existing.damage += attack.damage;
      existing.troops += attack.troopsCommitted;
    } else {
      participantMap.set(attack.attackerId, {
        name: attack.attackerName,
        damage: attack.damage,
        troops: attack.troopsCommitted,
      });
    }
  }

  let totalDamage = 0;
  for (const { damage } of Array.from(participantMap.values())) {
    totalDamage += damage;
  }

  const participants: RaidParticipant[] = [];
  for (const [empireId, data] of Array.from(participantMap)) {
    participants.push({
      empireId,
      empireName: data.name,
      damageDealt: data.damage,
      troopsCommitted: data.troops,
      damagePercentage: totalDamage > 0 ? data.damage / totalDamage : 0,
    });
  }

  // Sort by damage descending
  participants.sort((a, b) => b.damageDealt - a.damageDealt);

  return participants;
}

// =============================================================================
// RAID REWARDS
// =============================================================================

export interface RaidRewards {
  /** Fraction of elimination credit (1 / participantCount) */
  eliminationCredit: number;
  /** Reputation bonus for participation */
  reputationBonus: number;
  /** Production bonus duration in turns */
  productionBonusTurns: number;
  /** Production bonus amount (0.10 = 10%) */
  productionBonusAmount: number;
  /** Morale bonus amount (0.05 = 5%) */
  moraleBonus: number;
  /** Morale bonus duration in turns */
  moraleBonusTurns: number;
}

/**
 * Calculate rewards for raid participation.
 *
 * @param participantCount - Number of participants in the raid
 * @returns Reward structure for each participant
 */
export function calculateRaidRewards(participantCount: number): RaidRewards {
  return {
    eliminationCredit: 1 / participantCount,
    reputationBonus: RAID_REPUTATION_BONUS,
    productionBonusTurns: PRODUCTION_BONUS_TURNS,
    productionBonusAmount: PRODUCTION_BONUS_AMOUNT,
    moraleBonus: MORALE_BONUS_AMOUNT,
    moraleBonusTurns: MORALE_BONUS_TURNS,
  };
}

/**
 * Generate a victory message for a successful coalition raid.
 */
export function generateRaidVictoryMessage(
  raid: CoalitionRaid,
  distributions: RaidDistribution[]
): string {
  const participantNames = raid.attackerNames.slice(0, 3).join(", ");
  const moreCount = raid.attackerNames.length - 3;
  const participantText =
    moreCount > 0 ? `${participantNames}, and ${moreCount} others` : participantNames;

  const totalSectors = distributions.reduce((sum, d) => sum + d.planetsAwarded, 0);

  return `Coalition Victory! ${raid.attackerIds.length} empires (${participantText}) have successfully defeated the dominant power ${raid.targetEmpireName}. ${totalSectors} sectors have been distributed among the victors.`;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate attacks for coalition raid eligibility.
 */
export function validateRaidAttacks(
  attacks: PendingAttack[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (attacks.length === 0) {
    errors.push("No attacks provided");
  }

  for (const attack of attacks) {
    if (!attack.attackerId) {
      errors.push(`Missing attacker ID for attack`);
    }
    if (!attack.defenderId) {
      errors.push(`Missing defender ID for attack by ${attack.attackerName}`);
    }
    if (attack.damage < 0) {
      errors.push(`Negative damage for attack by ${attack.attackerName}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

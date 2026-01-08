/**
 * Pirate Mission Service
 *
 * Handles the creation, execution, and resolution of pirate missions
 * triggered by Syndicate contracts.
 * Based on docs/crafting-system.md Part 4: Pirate System Integration
 */

import {
  PIRATE_MISSION_EFFECTS,
  CONTRACT_CONFIGS,
  type ContractType,
  type PirateMissionConfig,
} from "../../constants/syndicate";

// =============================================================================
// TYPES
// =============================================================================

export type PirateMissionStatus = "queued" | "executing" | "completed" | "failed";

export interface PirateMission {
  id: string;
  gameId: string;
  contractId: string | null;
  triggeringEmpireId: string | null;
  targetEmpireId: string;
  missionType: ContractType;
  status: PirateMissionStatus;
  queuedAtTurn: number;
  executionTurn: number;
  completedAtTurn?: number;
}

export interface PirateMissionResult {
  success: boolean;
  missionType: ContractType;
  targetEmpireId: string;
  triggeringEmpireId?: string;
  effects: PirateMissionEffects;
  salvageValue?: number;
  error?: string;
}

export interface PirateMissionEffects {
  incomeDebuffPercent?: number;
  incomeDebuffTurns?: number;
  sectorsDestroyed?: number;
  militaryDestroyedPercent?: number;
  creditsLooted?: number;
  foodLooted?: number;
}

export interface TargetEmpireState {
  id: string;
  credits: number;
  food: number;
  ore: number;
  petroleum: number;
  soldiers: number;
  fighters: number;
  carriers: number;
  marines: number;
  interceptors: number;
  lightCruisers: number;
  heavyCruisers: number;
  battlecruisers: number;
  dreadnoughts: number;
  stealthCruisers: number;
  sectorCount: number;
  foodSectors: number;
  oreSectors: number;
  petroleumSectors: number;
  researchSectors: number;
  urbanSectors: number;
  touristSectors: number;
  industrialSectors: number;
}

// =============================================================================
// MISSION SCHEDULING
// =============================================================================

/**
 * Determine if a contract triggers a pirate mission
 */
export function shouldTriggerPirateMission(contractType: ContractType): boolean {
  const config = CONTRACT_CONFIGS[contractType];
  return config.triggersPirate;
}

/**
 * Calculate when a pirate mission should execute
 * (Usually next turn after contract acceptance)
 */
export function calculateMissionExecutionTurn(
  currentTurn: number,
  contractType: ContractType
): number {
  // Most pirate missions execute immediately (next turn)
  const delay = contractType === "salvage_op" ? 2 : 1;
  return currentTurn + delay;
}

/**
 * Get the mission effects configuration for a contract type
 */
export function getMissionEffects(contractType: ContractType): PirateMissionConfig | null {
  return PIRATE_MISSION_EFFECTS[contractType] ?? null;
}

// =============================================================================
// MISSION EXECUTION
// =============================================================================

/**
 * Execute a supply run mission
 * Applies income debuff to target empire
 */
export function executeSupplyRunMission(
  targetState: TargetEmpireState,
  config: PirateMissionConfig
): PirateMissionResult {
  const debuffPercent = config.incomeDebuffPercent ?? 0.05;
  const debuffTurns = config.incomeDebuffTurns ?? 2;

  return {
    success: true,
    missionType: "supply_run",
    targetEmpireId: targetState.id,
    effects: {
      incomeDebuffPercent: debuffPercent * 100,
      incomeDebuffTurns: debuffTurns,
    },
  };
}

/**
 * Execute a disruption mission
 * Destroys 1-3 random sectors
 */
export function executeDisruptionMission(
  targetState: TargetEmpireState,
  config: PirateMissionConfig
): PirateMissionResult {
  const minSectors = config.sectorsDestroyedMin ?? 1;
  const maxSectors = config.sectorsDestroyedMax ?? 3;

  // Don't destroy more sectors than target has
  const maxDestroyable = Math.min(maxSectors, targetState.sectorCount);
  const minDestroyable = Math.min(minSectors, maxDestroyable);

  // Random number between min and max
  const sectorsToDestroy = Math.floor(
    Math.random() * (maxDestroyable - minDestroyable + 1)
  ) + minDestroyable;

  if (sectorsToDestroy === 0) {
    return {
      success: false,
      missionType: "disruption",
      targetEmpireId: targetState.id,
      effects: {},
      error: "Target has no sectors to destroy",
    };
  }

  return {
    success: true,
    missionType: "disruption",
    targetEmpireId: targetState.id,
    effects: {
      sectorsDestroyed: sectorsToDestroy,
    },
  };
}

/**
 * Execute a salvage operation mission
 * Destroys % of military, contractor gets salvage value
 */
export function executeSalvageOpMission(
  targetState: TargetEmpireState,
  triggeringEmpireId: string | null,
  config: PirateMissionConfig
): PirateMissionResult {
  const destroyPercent = config.militaryDestroyedPercent ?? 0.1;
  const salvagePercent = config.salvagePercent ?? 0.5;

  // Calculate total military value
  const militaryValue = calculateMilitaryValue(targetState);
  const destroyedValue = Math.floor(militaryValue * destroyPercent);
  const salvageValue = Math.floor(destroyedValue * salvagePercent);

  return {
    success: true,
    missionType: "salvage_op",
    targetEmpireId: targetState.id,
    triggeringEmpireId: triggeringEmpireId ?? undefined,
    effects: {
      militaryDestroyedPercent: destroyPercent * 100,
    },
    salvageValue,
  };
}

/**
 * Calculate military value for salvage purposes
 */
function calculateMilitaryValue(state: TargetEmpireState): number {
  // Simple unit values (should match unit-config.ts costs)
  const unitValues: Record<string, number> = {
    soldiers: 50,
    fighters: 200,
    carriers: 2000,
    marines: 150,
    interceptors: 400,
    lightCruisers: 5000,
    heavyCruisers: 15000,
    battlecruisers: 35000,
    dreadnoughts: 80000,
    stealthCruisers: 50000,
  };

  let totalValue = 0;
  for (const [unit, value] of Object.entries(unitValues)) {
    const count = state[unit as keyof TargetEmpireState] as number;
    if (typeof count === "number") {
      totalValue += count * value;
    }
  }

  return totalValue;
}

/**
 * Execute any pirate mission based on type
 */
export function executePirateMission(
  mission: PirateMission,
  targetState: TargetEmpireState
): PirateMissionResult {
  const config = getMissionEffects(mission.missionType);

  if (!config) {
    return {
      success: false,
      missionType: mission.missionType,
      targetEmpireId: targetState.id,
      effects: {},
      error: `No mission effects configured for ${mission.missionType}`,
    };
  }

  switch (mission.missionType) {
    case "supply_run":
      return executeSupplyRunMission(targetState, config);

    case "disruption":
      return executeDisruptionMission(targetState, config);

    case "salvage_op":
      return executeSalvageOpMission(targetState, mission.triggeringEmpireId, config);

    default:
      return {
        success: false,
        missionType: mission.missionType,
        targetEmpireId: targetState.id,
        effects: {},
        error: `Unsupported pirate mission type: ${mission.missionType}`,
      };
  }
}

// =============================================================================
// SECTOR DESTRUCTION HELPERS
// =============================================================================

export type SectorType =
  | "food"
  | "ore"
  | "petroleum"
  | "research"
  | "urban"
  | "tourist"
  | "industrial";

/**
 * Randomly select sectors to destroy based on target's holdings
 */
export function selectSectorsToDestroy(
  targetState: TargetEmpireState,
  count: number
): SectorType[] {
  const sectorCounts: Record<SectorType, number> = {
    food: targetState.foodSectors,
    ore: targetState.oreSectors,
    petroleum: targetState.petroleumSectors,
    research: targetState.researchSectors,
    urban: targetState.urbanSectors,
    tourist: targetState.touristSectors,
    industrial: targetState.industrialSectors,
  };

  // Create weighted list of sector types
  const sectorPool: SectorType[] = [];
  for (const [type, cnt] of Object.entries(sectorCounts)) {
    for (let i = 0; i < cnt; i++) {
      sectorPool.push(type as SectorType);
    }
  }

  // Shuffle and pick
  const shuffled = sectorPool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// =============================================================================
// CONTRACT COMPLETION DETECTION
// =============================================================================

export interface ContractCompletionState {
  contractType: ContractType;
  targetEmpireId: string;
  initialState: {
    civilStatus?: string;
    food?: number;
    networth?: number;
    rank?: number;
    tourismIncome?: number;
    capturedSectorsFrom?: string[];
    warDeclared?: boolean;
    wmdDeployed?: boolean;
  };
  currentState: {
    civilStatus?: string;
    food?: number;
    networth?: number;
    rank?: number;
    tourismIncome?: number;
    capturedSectorsFrom?: string[];
    warDeclared?: boolean;
    wmdDeployed?: boolean;
  };
}

/**
 * Check if a contract's completion criteria has been met
 */
export function checkContractCompletion(
  state: ContractCompletionState
): { completed: boolean; reason?: string } {
  const { contractType, initialState, currentState } = state;

  switch (contractType) {
    // Pirate contracts complete when pirate mission succeeds
    case "supply_run":
    case "disruption":
    case "salvage_op":
    case "intel_gathering":
      // These are completed by the pirate mission system
      return { completed: false, reason: "Awaiting pirate mission completion" };

    // Intimidation: Target's civil status drops by 1+ level
    case "intimidation":
      if (!initialState.civilStatus || !currentState.civilStatus) {
        return { completed: false, reason: "Civil status data missing" };
      }
      const statusLevels: Record<string, number> = {
        utopia: 5,
        prosperous: 4,
        stable: 3,
        unrest: 2,
        revolting: 1,
        anarchy: 0,
      };
      const initialLevel = statusLevels[initialState.civilStatus] ?? 3;
      const currentLevel = statusLevels[currentState.civilStatus] ?? 3;
      if (currentLevel < initialLevel) {
        return { completed: true, reason: "Target civil status dropped" };
      }
      return { completed: false, reason: "Target civil status unchanged" };

    // Economic Warfare: Target loses 30%+ food stockpile
    case "economic_warfare":
      if (!initialState.food || !currentState.food) {
        return { completed: false, reason: "Food data missing" };
      }
      const foodLossPercent = 1 - currentState.food / initialState.food;
      if (foodLossPercent >= 0.3) {
        return { completed: true, reason: `Target lost ${(foodLossPercent * 100).toFixed(0)}% food` };
      }
      return { completed: false, reason: `Only ${(foodLossPercent * 100).toFixed(0)}% food lost (need 30%)` };

    // Hostile Takeover: Capture 1 sector from target
    case "hostile_takeover":
      if (
        currentState.capturedSectorsFrom &&
        currentState.capturedSectorsFrom.includes(state.targetEmpireId)
      ) {
        return { completed: true, reason: "Sector captured from target" };
      }
      return { completed: false, reason: "No sector captured yet" };

    // Kingslayer: Target falls out of top 3
    case "kingslayer":
      if (!initialState.rank || !currentState.rank) {
        return { completed: false, reason: "Rank data missing" };
      }
      if (initialState.rank <= 3 && currentState.rank > 3) {
        return { completed: true, reason: "Target fell out of top 3" };
      }
      return { completed: false, reason: `Target still at rank ${currentState.rank}` };

    // Market Manipulation: Target loses 50%+ tourism income
    case "market_manipulation":
      if (!initialState.tourismIncome || !currentState.tourismIncome) {
        return { completed: false, reason: "Tourism data missing" };
      }
      const tourismLossPercent = 1 - currentState.tourismIncome / initialState.tourismIncome;
      if (tourismLossPercent >= 0.5) {
        return { completed: true, reason: "Tourism income crashed" };
      }
      return { completed: false, reason: `Only ${(tourismLossPercent * 100).toFixed(0)}% tourism lost` };

    // Regime Change: Target reaches 'revolting' civil status
    case "regime_change":
      if (currentState.civilStatus === "revolting" || currentState.civilStatus === "anarchy") {
        return { completed: true, reason: "Civil war achieved" };
      }
      return { completed: false, reason: "Target not in revolt" };

    // Decapitation Strike: #1 player loses position
    case "decapitation_strike":
      if (initialState.rank === 1 && currentState.rank !== 1) {
        return { completed: true, reason: "Leader dethroned" };
      }
      return { completed: false, reason: "Target still #1" };

    // Proxy War: Both targets declare war on each other
    case "proxy_war":
      if (currentState.warDeclared) {
        return { completed: true, reason: "War ignited" };
      }
      return { completed: false, reason: "No war declared yet" };

    // Scorched Earth: WMD deployed
    case "scorched_earth":
      if (currentState.wmdDeployed) {
        return { completed: true, reason: "WMD deployed successfully" };
      }
      return { completed: false, reason: "WMD not deployed" };

    // The Equalizer: 3+ top players hurt
    case "the_equalizer":
      // Complex - requires tracking multiple targets
      return { completed: false, reason: "Requires multi-target tracking" };

    // Military Probe: Successful guerilla attack
    case "military_probe":
      // Completed when attack action succeeds
      return { completed: false, reason: "Awaiting attack completion" };

    default:
      return { completed: false, reason: `Unknown contract type: ${contractType}` };
  }
}

// =============================================================================
// MESSAGE GENERATION
// =============================================================================

/**
 * Generate a message describing the pirate mission result
 */
export function generateMissionResultMessage(result: PirateMissionResult): string {
  if (!result.success) {
    return `Pirate mission failed: ${result.error}`;
  }

  switch (result.missionType) {
    case "supply_run":
      return `Pirates disrupted supply lines! Trade income reduced by ${result.effects.incomeDebuffPercent}% for ${result.effects.incomeDebuffTurns} turns.`;

    case "disruption":
      return `Pirates destroyed ${result.effects.sectorsDestroyed} sector(s) in a devastating raid!`;

    case "salvage_op":
      return `Pirates destroyed ${result.effects.militaryDestroyedPercent}% of the fleet. Salvage value: ${result.salvageValue?.toLocaleString()} credits.`;

    default:
      return `Pirate mission completed: ${result.missionType}`;
  }
}

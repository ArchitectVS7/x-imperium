# X-Imperium Crafting System Implementation Plan

## Overview

This plan integrates the crafting-system.md design into the existing X-Imperium codebase. The goal is to transform the game from a "modern port" of Solar Realms Elite into a "modern rebirth" with strategic depth.

---

## Part 1: Current State Analysis

### PRD Status (docs/PRD.md)
- Version 1.2, covers MVP mechanics
- Missing: Tier resource system, Research levels, Black Market, Crafting
- Update needed: Add Parts 1-10 from crafting-system.md

### Turn Structure (src/lib/game/services/turn-processor.ts)
Current 9-phase pipeline:
1. Income Collection
2. Population Update
3. Civil Status Evaluation
4. Research Production (basic - 100 RP/planet)
5. Build Queue Processing
6. Covert Point Generation
7. Bot Decisions
8. Market Price Update
9. Victory/Defeat Check

**Changes needed:**
- Phase 1.5: Tier 1 Resource Refinement (Ore → Refined Metals, etc.)
- Phase 3.5: Enhanced Research (RP → Research Levels)
- Phase 4: Crafting Queue Processing (separate from build queue)
- Phase 5.5: Black Market Trust Decay (5% per 10 turns)
- Phase 6.5: Pirate Activity (raids based on wealth/hoarding)
- Phase 7.5: Syndicate Contract Generation

### Database Schema (src/lib/db/schema.ts)
**New tables required:**
- `player_resources_tier1` (refined_metals, fuel_cells, polymers, processed_food, labor_units)
- `player_resources_tier2` (electronics, armor_plating, propulsion_units, etc.)
- `player_resources_tier3` (reactor_cores, shield_generators, warp_drives, etc.)
- `research_progress` (exists but needs expansion for 8 levels + branches)
- `syndicate_trust` (trust_points, trust_level, last_interaction_turn)
- `syndicate_contracts` (type, target, reward, deadline, status)
- `crafting_queue` (item, components_reserved, completion_turn)
- `pirate_factions` (strength, stolen_resources, target_preference)

### Bot System (src/lib/bots/)
**Current archetypes:** warlord, diplomat, merchant, schemer, turtle, blitzkrieg, tech_rush, opportunist

**New decision axes needed:**
- Research branch preference (military, defense, propulsion, stealth, economy, biotech)
- Black Market engagement (never, reluctant, opportunistic, enthusiastic)
- Crafting priority (military-first, balanced, economy-first)
- Pirate response (ignore, defend, retaliate, hire_back)

---

## Part 2: Implementation Phases

### Phase 1: Database & Types (Foundation)
**Estimated scope:** ~15 files

#### 1.1 New Schema Tables
```typescript
// Add to src/lib/db/schema.ts

// Tier 1-3 Resources
export const empireTier1Resources = pgTable('empire_tier1_resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  empireId: uuid('empire_id').references(() => empires.id),
  gameId: uuid('game_id').references(() => games.id),
  refinedMetals: integer('refined_metals').default(0),
  fuelCells: integer('fuel_cells').default(0),
  polymers: integer('polymers').default(0),
  processedFood: integer('processed_food').default(0),
  laborUnits: integer('labor_units').default(0),
});

export const empireTier2Resources = pgTable('empire_tier2_resources', {
  // electronics, armor_plating, propulsion_units, life_support,
  // weapons_grade_alloy, targeting_arrays, stealth_composites, quantum_processors
});

export const empireTier3Resources = pgTable('empire_tier3_resources', {
  // reactor_cores, shield_generators, warp_drives, cloaking_devices,
  // ion_cannon_cores, neural_interfaces, singularity_containment,
  // bioweapon_synthesis, nuclear_warheads
});

// Syndicate System
export const syndicateTrust = pgTable('syndicate_trust', {
  id: uuid('id').primaryKey().defaultRandom(),
  empireId: uuid('empire_id').references(() => empires.id),
  gameId: uuid('game_id').references(() => games.id),
  trustPoints: integer('trust_points').default(0),
  trustLevel: integer('trust_level').default(0), // 0-8
  lastInteractionTurn: integer('last_interaction_turn'),
  hasReceivedInvitation: boolean('has_received_invitation').default(false),
  isHostile: boolean('is_hostile').default(false), // After betrayal
});

export const syndicateContracts = pgTable('syndicate_contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id').references(() => games.id),
  empireId: uuid('empire_id').references(() => empires.id), // Contract holder
  contractType: syndicateContractTypeEnum('contract_type'),
  targetType: varchar('target_type'), // 'pirate', 'player', 'top_player'
  targetEmpireId: uuid('target_empire_id').references(() => empires.id),
  reward: integer('reward'),
  trustReward: integer('trust_reward'),
  deadlineTurn: integer('deadline_turn'),
  status: contractStatusEnum('status').default('active'),
  acceptedAtTurn: integer('accepted_at_turn'),
  completedAtTurn: integer('completed_at_turn'),
});

// Crafting Queue
export const craftingQueue = pgTable('crafting_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  empireId: uuid('empire_id').references(() => empires.id),
  gameId: uuid('game_id').references(() => games.id),
  itemType: varchar('item_type'), // 'electronics', 'reactor_core', etc.
  itemTier: integer('item_tier'), // 1, 2, or 3
  quantity: integer('quantity').default(1),
  turnsRemaining: integer('turns_remaining'),
  componentsReserved: json('components_reserved'), // { refinedMetals: 2, polymers: 1 }
  queuePosition: integer('queue_position'),
});

// Pirate Factions
export const pirateFactions = pgTable('pirate_factions', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id').references(() => games.id),
  name: varchar('name'),
  strength: integer('strength').default(100),
  stolenCredits: bigint('stolen_credits').default(0),
  stolenResources: json('stolen_resources'),
  targetPreference: pirateTargetEnum('target_preference'), // wealthy, weak, hoarder
  lastRaidTurn: integer('last_raid_turn'),
  isActive: boolean('is_active').default(true),
});

export const pirateRaids = pgTable('pirate_raids', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id').references(() => games.id),
  pirateFactionId: uuid('pirate_faction_id').references(() => pirateFactions.id),
  targetEmpireId: uuid('target_empire_id').references(() => empires.id),
  turn: integer('turn'),
  triggeredBy: varchar('triggered_by'), // 'random', 'hoarding', 'syndicate_contract'
  syndicateContractId: uuid('syndicate_contract_id').references(() => syndicateContracts.id),
  creditsStolen: integer('credits_stolen'),
  resourcesStolen: json('resources_stolen'),
  wasRepelled: boolean('was_repelled'),
  piratesCasualties: integer('pirates_casualties'),
  defenderCasualties: json('defender_casualties'),
});
```

#### 1.2 New Enums
```typescript
// Add to schema.ts
export const syndicateContractTypeEnum = pgEnum('syndicate_contract_type', [
  'supply_run', 'disruption', 'salvage_op', 'intel_gathering', // Tier 1
  'intimidation', 'economic_warfare', 'military_probe', 'hostile_takeover', // Tier 2
  'kingslayer', 'market_manipulation', 'regime_change', 'decapitation_strike', // Tier 3
  'proxy_war', 'scorched_earth', 'the_equalizer', // Tier 4
]);

export const contractStatusEnum = pgEnum('contract_status', [
  'available', 'active', 'completed', 'failed', 'expired',
]);

export const pirateTargetEnum = pgEnum('pirate_target', [
  'wealthy', 'weak', 'hoarder', 'random',
]);

export const researchBranchEnum = pgEnum('research_branch', [
  'military', 'defense', 'propulsion', 'stealth', 'economy', 'biotech',
]);
```

#### 1.3 Type Definitions
```typescript
// New file: src/lib/game/types/crafting.ts
export interface CraftingRecipe {
  itemType: string;
  tier: 1 | 2 | 3;
  inputs: Record<string, number>; // { refinedMetals: 2, polymers: 1 }
  researchRequired: number; // 0-8
  blackMarketOnly?: boolean;
  turnsToComplete: number;
}

export interface Tier1Resources {
  refinedMetals: number;
  fuelCells: number;
  polymers: number;
  processedFood: number;
  laborUnits: number;
}

export interface Tier2Resources {
  electronics: number;
  armorPlating: number;
  propulsionUnits: number;
  lifeSupport: number;
  weaponsGradeAlloy: number;
  targetingArrays: number;
  stealthComposites: number;
  quantumProcessors: number;
}

export interface Tier3Resources {
  reactorCores: number;
  shieldGenerators: number;
  warpDrives: number;
  cloakingDevices: number;
  ionCannonCores: number;
  neuralInterfaces: number;
  singularityContainment: number;
  bioweaponSynthesis: number;
  nuclearWarheads: number;
}
```

---

### Phase 2: Resource Engine Updates

#### 2.1 Tier 1 Refinement Processing
```typescript
// New file: src/lib/game/services/refinement-engine.ts

export function processRefinement(empire: Empire, planets: Planet[]): RefinementResult {
  const orePlanets = planets.filter(p => p.type === 'ore');
  const petroleumPlanets = planets.filter(p => p.type === 'petroleum');
  const industrialPlanets = planets.filter(p => p.type === 'industrial');

  // Auto-refinement: 10% of raw output becomes Tier 1
  const autoRefinedMetals = Math.floor(orePlanets.length * PLANET_PRODUCTION.ore * 0.10 / 100);
  const autoFuelCells = Math.floor(petroleumPlanets.length * PLANET_PRODUCTION.petroleum * 0.10 / 50);

  // Industrial planets can process additional Tier 0 → Tier 1
  const industrialCapacity = industrialPlanets.length * INDUSTRIAL_CAPACITY;

  return {
    autoProduced: { refinedMetals: autoRefinedMetals, fuelCells: autoFuelCells },
    industrialCapacity,
  };
}
```

#### 2.2 Research Level Progression
```typescript
// Update: src/lib/game/services/research-engine.ts

export const RESEARCH_THRESHOLDS = [
  { level: 1, required: 0 },
  { level: 2, required: 500 },
  { level: 3, required: 2000 },
  { level: 4, required: 5000 },
  { level: 5, required: 10000 },
  { level: 6, required: 18000 },
  { level: 7, required: 30000 },
  { level: 8, required: 50000 },
];

export function calculateResearchLevel(totalRP: number): number {
  for (let i = RESEARCH_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalRP >= RESEARCH_THRESHOLDS[i].required) {
      return RESEARCH_THRESHOLDS[i].level;
    }
  }
  return 1;
}
```

---

### Phase 3: Turn Processor Updates

#### 3.1 New Turn Phases
```typescript
// Update: src/lib/game/services/turn-processor.ts

export async function processTurn(gameId: string): Promise<TurnResult> {
  // PHASE 1: Income Collection (existing)

  // PHASE 1.5: TIER 1 REFINEMENT (NEW)
  await processRefinementPhase(gameId);

  // PHASE 2: Population Update (existing)

  // PHASE 3: Civil Status (existing)

  // PHASE 3.5: RESEARCH LEVEL PROGRESSION (UPDATE)
  await processResearchLevelProgression(gameId);

  // PHASE 4: Build Queue (existing - but now checks crafting requirements)

  // PHASE 4.5: CRAFTING QUEUE (NEW)
  await processCraftingQueue(gameId);

  // PHASE 5: Covert Points (existing)

  // PHASE 5.5: SYNDICATE TRUST DECAY (NEW)
  await processSyndicateTrustDecay(gameId, currentTurn);

  // PHASE 6: Bot Decisions (existing - but expanded)

  // PHASE 6.5: PIRATE ACTIVITY (NEW)
  await processPirateActivity(gameId, currentTurn);

  // PHASE 7: Market Prices (existing)

  // PHASE 7.5: SYNDICATE CONTRACT GENERATION (NEW)
  await generateSyndicateContracts(gameId, currentTurn);

  // PHASE 8: Bot Messages (existing)

  // PHASE 9: Victory/Defeat (existing)
}
```

---

### Phase 4: Pirate System

#### 4.1 Pirate Activity Processing
```typescript
// New file: src/lib/game/services/pirate-engine.ts

export async function processPirateActivity(gameId: string, turn: number): Promise<PirateResult[]> {
  const pirates = await getPirateFactions(gameId);
  const empires = await getActiveEmpires(gameId);
  const results: PirateResult[] = [];

  for (const faction of pirates) {
    // Determine if pirates raid this turn
    const raidChance = calculateRaidChance(faction, turn);

    if (Math.random() < raidChance) {
      const target = selectPirateTarget(faction, empires);
      const result = await executePirateRaid(faction, target, turn);
      results.push(result);

      // Pirates grow stronger from stolen goods
      faction.strength += Math.floor(result.creditsStolen / 10000);
    }
  }

  return results;
}

function calculateRaidChance(faction: PirateFaction, turn: number): number {
  // Base chance increases with game progress
  const baseChance = 0.05 + (turn / 200) * 0.15; // 5% early → 20% late

  // Stronger pirates raid more often
  const strengthModifier = faction.strength / 1000;

  return Math.min(baseChance + strengthModifier, 0.40); // Cap at 40%
}

function selectPirateTarget(faction: PirateFaction, empires: Empire[]): Empire {
  switch (faction.targetPreference) {
    case 'wealthy':
      return empires.sort((a, b) => b.credits - a.credits)[0];
    case 'weak':
      return empires.sort((a, b) => a.networth - b.networth)[0];
    case 'hoarder':
      // Target empires with high resources but low military
      return empires.sort((a, b) => {
        const aHoardScore = (a.credits + a.ore * 100) / (a.soldiers + a.fighters + 1);
        const bHoardScore = (b.credits + b.ore * 100) / (b.soldiers + b.fighters + 1);
        return bHoardScore - aHoardScore;
      })[0];
    default:
      return empires[Math.floor(Math.random() * empires.length)];
  }
}
```

#### 4.2 Syndicate-Triggered Pirate Raids
```typescript
// Add to pirate-engine.ts

export async function triggerSyndicateRaid(
  gameId: string,
  contractId: string,
  targetEmpireId: string,
  turn: number
): Promise<PirateResult> {
  // Syndicate contracts trigger more powerful, targeted raids
  const faction = await getStrongestPirateFaction(gameId);
  const target = await getEmpire(targetEmpireId);

  // Syndicate raids are 50% stronger
  const modifiedFaction = {
    ...faction,
    strength: Math.floor(faction.strength * 1.5),
  };

  return await executePirateRaid(modifiedFaction, target, turn, contractId);
}
```

---

### Phase 5: Black Market / Syndicate System

#### 5.1 Trust Level Service
```typescript
// New file: src/lib/game/services/syndicate-service.ts

export const TRUST_LEVELS = [
  { level: 0, points: 0, title: 'Unknown', priceMultiplier: 0 }, // No access
  { level: 1, points: 100, title: 'Associate', priceMultiplier: 2.0 },
  { level: 2, points: 500, title: 'Runner', priceMultiplier: 1.75 },
  { level: 3, points: 1500, title: 'Soldier', priceMultiplier: 1.5 },
  { level: 4, points: 3500, title: 'Captain', priceMultiplier: 1.5 },
  { level: 5, points: 7000, title: 'Lieutenant', priceMultiplier: 1.5 },
  { level: 6, points: 12000, title: 'Underboss', priceMultiplier: 1.25 },
  { level: 7, points: 20000, title: 'Consigliere', priceMultiplier: 1.25 },
  { level: 8, points: 35000, title: 'Syndicate Lord', priceMultiplier: 1.0 },
];

export function calculateTrustLevel(trustPoints: number): number {
  for (let i = TRUST_LEVELS.length - 1; i >= 0; i--) {
    if (trustPoints >= TRUST_LEVELS[i].points) {
      return TRUST_LEVELS[i].level;
    }
  }
  return 0;
}

export async function checkSyndicateRecruitment(
  gameId: string,
  empireId: string,
  currentTurn: number
): Promise<boolean> {
  const empire = await getEmpire(empireId);
  const allEmpires = await getActiveEmpires(gameId);
  const trust = await getSyndicateTrust(empireId);

  // Already in Syndicate or hostile
  if (trust.trustLevel > 0 || trust.isHostile) return false;

  // Check if in bottom 50%
  const sortedByNetworth = allEmpires.sort((a, b) => b.networth - a.networth);
  const empireRank = sortedByNetworth.findIndex(e => e.id === empireId);
  const isBottom50 = empireRank >= Math.floor(allEmpires.length / 2);

  if (isBottom50 && !trust.hasReceivedInvitation) {
    await sendSyndicateInvitation(empireId, currentTurn);
    return true;
  }

  return false;
}
```

#### 5.2 Contract System
```typescript
// Add to syndicate-service.ts

export async function generateAvailableContracts(
  gameId: string,
  empireId: string,
  currentTurn: number
): Promise<SyndicateContract[]> {
  const trust = await getSyndicateTrust(empireId);
  const contracts: SyndicateContract[] = [];

  // Tier 1: Pirate Raids (Trust 1+)
  if (trust.trustLevel >= 1) {
    contracts.push(...generatePirateContracts(gameId));
  }

  // Tier 2: Standard Player Contracts (Trust 2+)
  if (trust.trustLevel >= 2) {
    contracts.push(...generateStandardContracts(gameId, empireId));
  }

  // Tier 3: Targeted Contracts (Trust 4+)
  if (trust.trustLevel >= 4) {
    contracts.push(...generateTargetedContracts(gameId));
  }

  // Tier 4: Syndicate Operations (Trust 6+)
  if (trust.trustLevel >= 6) {
    contracts.push(...generateEliteContracts(gameId));
  }

  return contracts;
}

export async function completeContract(
  gameId: string,
  contractId: string,
  empireId: string
): Promise<ContractResult> {
  const contract = await getContract(contractId);

  // Award rewards
  await addCredits(empireId, contract.reward);
  await addTrustPoints(empireId, contract.trustReward);

  // Mark complete
  await updateContract(contractId, { status: 'completed' });

  return { success: true, creditsEarned: contract.reward, trustEarned: contract.trustReward };
}
```

---

### Phase 6: Bot System Updates

#### 6.1 New Decision Types
```typescript
// Update: src/lib/bots/types.ts

export type BotDecisionType =
  | 'build_units'
  | 'buy_planet'
  | 'attack'
  | 'diplomacy'
  | 'trade'
  | 'craft_component'     // NEW
  | 'research_focus'      // NEW
  | 'syndicate_contract'  // NEW
  | 'defend_pirates'      // NEW
  | 'do_nothing';

export interface BotCraftingPreference {
  priority: 'military_first' | 'balanced' | 'economy_first';
  researchBranch: 'military' | 'defense' | 'propulsion' | 'stealth' | 'economy' | 'biotech';
}

export interface BotSyndicatePreference {
  engagement: 'never' | 'reluctant' | 'opportunistic' | 'enthusiastic';
  contractRiskTolerance: number; // 0.0 - 1.0
  betrayalLikelihood: number; // 0.0 - 1.0 (report to Coordinator)
}
```

#### 6.2 Archetype Extensions
```typescript
// Update each archetype file

// Warlord - Enthusiastic Syndicate user, military crafting
export const WARLORD_CRAFTING: BotCraftingPreference = {
  priority: 'military_first',
  researchBranch: 'military',
};

export const WARLORD_SYNDICATE: BotSyndicatePreference = {
  engagement: 'enthusiastic',
  contractRiskTolerance: 0.8,
  betrayalLikelihood: 0.1,
};

// Diplomat - Never uses Syndicate, balanced crafting
export const DIPLOMAT_CRAFTING: BotCraftingPreference = {
  priority: 'balanced',
  researchBranch: 'economy',
};

export const DIPLOMAT_SYNDICATE: BotSyndicatePreference = {
  engagement: 'never',
  contractRiskTolerance: 0.0,
  betrayalLikelihood: 1.0, // Would always report
};

// Schemer - Opportunistic, stealth focus
export const SCHEMER_CRAFTING: BotCraftingPreference = {
  priority: 'military_first',
  researchBranch: 'stealth',
};

export const SCHEMER_SYNDICATE: BotSyndicatePreference = {
  engagement: 'opportunistic',
  contractRiskTolerance: 0.6,
  betrayalLikelihood: 0.3,
};
```

#### 6.3 Decision Engine Updates
```typescript
// Update: src/lib/bots/decision-engine.ts

export function selectBotAction(context: BotDecisionContext): BotDecision {
  const archetype = context.empire.botArchetype;
  const weights = calculateWeights(context, archetype);

  // Add crafting decisions
  if (shouldCraft(context)) {
    weights.craft_component += getCraftingUrgency(context);
  }

  // Add syndicate decisions
  if (shouldConsiderSyndicate(context, archetype)) {
    weights.syndicate_contract += getSyndicateWeight(context, archetype);
  }

  // Add pirate defense
  if (isUnderPirateThreat(context)) {
    weights.defend_pirates += getPirateDefenseUrgency(context);
  }

  return weightedRandomSelect(weights);
}

function shouldCraft(context: BotDecisionContext): boolean {
  // Check if bot has resources to craft and needs components
  const canCraft = hasRefinedResources(context.empire);
  const needsComponents = needsMilitaryComponents(context.empire);
  return canCraft && needsComponents;
}

function shouldConsiderSyndicate(context: BotDecisionContext, archetype: BotArchetype): boolean {
  const syndicatePref = getSyndicatePreference(archetype);
  if (syndicatePref.engagement === 'never') return false;

  // Reluctant bots only consider when desperate
  if (syndicatePref.engagement === 'reluctant') {
    return context.empire.networth < context.averageNetworth * 0.5;
  }

  return true;
}
```

---

### Phase 7: UI Updates

#### 7.1 New Components Needed
```
src/components/game/
├── crafting/
│   ├── CraftingPanel.tsx        # Main crafting interface
│   ├── RecipeCard.tsx           # Individual recipe display
│   ├── ComponentInventory.tsx   # Show Tier 1-3 resources
│   └── CraftingQueue.tsx        # Active crafting jobs
├── research/
│   ├── ResearchTree.tsx         # Visual tech tree (LCARS style)
│   ├── ResearchBranch.tsx       # Individual branch
│   ├── ResearchProgress.tsx     # Current level + progress bar
│   └── UnlockIndicator.tsx      # Show what unlocks at each level
├── syndicate/
│   ├── BlackMarketPanel.tsx     # Hidden until Trust 1
│   ├── TrustMeter.tsx           # Visual trust level
│   ├── ContractBoard.tsx        # Available contracts
│   ├── ContractCard.tsx         # Individual contract
│   └── SyndicateCatalog.tsx     # Items for purchase
├── pirates/
│   ├── PirateAlert.tsx          # Raid notification
│   ├── PirateReport.tsx         # Raid results
│   └── PirateThreatLevel.tsx    # Current threat indicator
└── military/
    └── MilitaryBuilder.tsx      # Updated - shows crafting requirements
```

#### 7.2 Research Tree Visualization
```typescript
// New file: src/components/game/research/ResearchTree.tsx

export function ResearchTree({ currentLevel, totalRP }: ResearchTreeProps) {
  return (
    <div className="lcars-panel research-tree">
      <h2 className="text-lcars-lavender">Research Progress</h2>

      <div className="level-indicator">
        <span className="text-lcars-amber text-2xl">Level {currentLevel}</span>
        <span className="text-gray-400">{totalRP.toLocaleString()} RP</span>
      </div>

      <div className="unlock-tree">
        {RESEARCH_UNLOCKS.map((level) => (
          <ResearchLevel
            key={level.level}
            level={level}
            isUnlocked={currentLevel >= level.level}
            isCurrent={currentLevel === level.level}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### Phase 8: Testing Updates

#### 8.1 New Test Files Needed
```
tests/
├── crafting/
│   ├── refinement.test.ts       # Tier 0 → Tier 1 processing
│   ├── crafting-queue.test.ts   # Crafting job completion
│   └── recipes.test.ts          # Recipe validation
├── syndicate/
│   ├── trust-levels.test.ts     # Trust progression
│   ├── contracts.test.ts        # Contract generation/completion
│   └── recruitment.test.ts      # Bottom 50% recruitment
├── pirates/
│   ├── raid-triggers.test.ts    # When pirates attack
│   ├── raid-execution.test.ts   # Raid combat
│   └── scaling.test.ts          # Pirate strength growth
├── bots/
│   ├── crafting-decisions.test.ts
│   ├── syndicate-decisions.test.ts
│   └── archetype-extensions.test.ts
└── simulation/
    └── full-game-with-crafting.test.ts
```

#### 8.2 Bot Simulation Updates
```typescript
// Update: tests/simulation/simulator.ts

export interface SimulationConfig {
  // Existing
  turns: number;
  botCount: number;

  // New
  enableCrafting: boolean;
  enableSyndicate: boolean;
  enablePirates: boolean;
  pirateAggressiveness: 'low' | 'medium' | 'high';
}

export async function runFullSimulation(config: SimulationConfig): Promise<SimulationResult> {
  // Track new metrics
  const metrics = {
    // Existing
    victoriesBy: Record<string, number>,
    averageTurnCount: number,

    // New
    craftingUsage: number,           // % of empires that crafted
    syndicateParticipation: number,  // % that engaged with Syndicate
    pirateRaidCount: number,
    wmdUsageCount: number,
    averageResearchLevel: number,
  };

  // Run simulation...
}
```

---

## Part 3: Implementation Order

### Wave 1: Foundation (No gameplay changes yet)
1. Database schema additions (new tables, enums)
2. Type definitions (crafting.ts, syndicate.ts, pirates.ts)
3. Constants (recipes, trust levels, research thresholds)
4. Migrations

### Wave 2: Resource Pipeline
1. Tier 1 refinement engine
2. Research level progression (update existing)
3. Crafting queue service
4. Turn processor integration (phases 1.5, 3.5, 4.5)

### Wave 3: Syndicate System
1. Trust level service
2. Contract generation
3. Contract execution
4. Syndicate recruitment (bottom 50%)
5. Trust decay
6. Turn processor integration (phases 5.5, 7.5)

### Wave 4: Pirate System
1. Pirate faction initialization
2. Raid trigger logic
3. Raid execution (combat)
4. Pirate strength scaling
5. Syndicate-triggered raids
6. Turn processor integration (phase 6.5)

### Wave 5: Military Crafting Requirements
1. Update build queue to check crafting requirements
2. Update unit costs with component requirements
3. Update military purchase UI
4. Add crafting requirement display

### Wave 6: Bot Intelligence
1. Archetype extensions (crafting, syndicate preferences)
2. Decision engine updates
3. New decision types implementation
4. Bot simulation validation

### Wave 7: UI Implementation
1. Component inventory display
2. Crafting panel
3. Research tree visualization
4. Black market panel
5. Pirate alerts

### Wave 8: Testing & Balance
1. Unit tests for all new systems
2. Integration tests
3. Full game simulation
4. Balance tuning based on results

---

## Part 4: Win Condition Updates

Current win conditions remain, but add considerations:

### Conquest Victory (60% planets)
- Unchanged, but harder to achieve without crafted military

### Economic Victory (1.5x networth)
- Tier 1-3 resources count toward networth
- Syndicate purchases are expensive, affect networth

### Research Victory (NEW - Level 8)
- First empire to reach Research Level 8 wins
- Requires 50,000 cumulative RP
- Alternative path for tech-focused players

### Survival Victory (Turn 200)
- Unchanged

---

## Part 5: PRD Updates Needed

Add new sections to docs/PRD.md:

1. **Section 5.3: Tiered Resources**
   - Copy from crafting-system.md Parts 1-3

2. **Section 5.4: Research Progression**
   - 8-level system with RP thresholds
   - Research branches

3. **Section 5.5: Crafting System**
   - Recipes, requirements, queue

4. **Section 6.3: Black Market**
   - Trust system, contracts, catalog

5. **Section 6.4: Pirate Factions**
   - Raid mechanics, scaling, Syndicate integration

6. **Section 7.11: Bot Crafting Behavior**
   - Archetype preferences
   - Decision weights

7. **Section 10.2: Research Victory**
   - New win condition

---

## Summary

This plan transforms X-Imperium from a "credits buy everything" game into a strategic crafting/research experience while maintaining the SRE spirit.

**Key Changes:**
- 4-tier resource system
- 8-level research progression
- Black Market with 8 trust levels
- Active pirate factions
- Crafting requirements for advanced military
- Expanded bot decision trees

**Files to modify:** ~40-50 existing files
**Files to create:** ~30-40 new files
**Database tables:** 8 new tables
**New turn phases:** 5 new phases

**Risk Mitigation:**
- Feature flags for each system (can disable if issues)
- Backward compatibility for existing saves
- Incremental rollout (Wave by Wave)

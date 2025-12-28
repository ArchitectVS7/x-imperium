# X-Imperium: Crafting System Integration Plan

## Executive Summary

This plan integrates the crafting system documented in `docs/crafting-system.md` into X-Imperium, transforming it from a modern port to a **modern rebirth** of Solar Realms Elite. The implementation adds:

- **4-tier resource system** with crafting requirements for advanced military
- **8-level research tree** replacing random breakthroughs
- **Black Market/Mafia trust system** with contracts and WMDs
- **Pirate missions** triggered by Syndicate contracts
- **Enhanced bot decision axes** for 100+ unique bot configurations

---

## Part 1: Current State Analysis

### 1.1 PRD Assessment

**File:** `docs/PRD.md` (v1.2, ~1,200 lines)

**Current Economic System:**
- 4 base resources: Credits, Food, Ore, Petroleum
- Research Points from Research planets (100 RP/turn)
- Linear research levels 0-7 with exponential costs
- All military purchasable with credits only

**Gaps Identified:**
- No crafting/manufacturing layer
- No resource refinement tiers
- Research unlocks are minimal (only Light Cruisers at L2, Heavy at L4)
- No black market or alternative progression paths
- No catch-up mechanics for struggling players

### 1.2 Turn Structure Assessment

**File:** `src/lib/game/services/turn-processor.ts`

**Current 8-Phase Pipeline:**
1. Income Collection (civil status multiplier)
2. Population Update (growth/starvation)
3. Civil Status Evaluation
4. Market Processing (supply/demand)
5. Bot Decisions
6. Actions (combat, covert, diplomacy)
7. Maintenance (unit/planet costs)
8. Victory/Defeat Check

**Integration Points:**
- **Phase 1.5:** Add Tier 1 auto-production (Ore→Refined Metals, Petro→Fuel Cells)
- **Phase 4.5:** Add crafting queue processing
- **Phase 5:** Extend bot decisions with crafting/black market choices

### 1.3 UI Assessment

**Directory:** `src/components/game/` (34 components)

**Current Panels:**
- ResourcePanel (Credits, Food, Ore, Petroleum, RP)
- MilitaryPanel (7 unit types)
- ResearchPanel (level + progress bar)
- MarketPanel (buy/sell 3 resources)
- BuildUnitsPanel (credit-only purchases)

**UI Additions Needed:**
- CraftingPanel (Tier 1-3 inventory, recipes, queue)
- ResearchTreeVisualization (branching tree, not just level)
- BlackMarketPanel (hidden until Trust 1, contracts, catalog)
- Enhanced BuildUnitsPanel (show crafting requirements)

### 1.4 Bot System Assessment

**Directory:** `src/lib/bots/`

**Current Archetypes (8):**
Warlord, Diplomat, Merchant, Schemer, Turtle, Blitzkrieg, Tech Rush, Opportunist

**Current Decision Weights:**
- build_units: 35%
- buy_planet: 20%
- attack: 15%
- diplomacy: 10% (stub)
- trade: 10% (stub)
- do_nothing: 10%

**New Decision Axes Needed:**
- craft_components (Tier 1-3 manufacturing)
- invest_research (branch allocation)
- black_market_purchase
- accept_contract
- syndicate_interaction

### 1.5 Existing Pirate/Mafia Systems

**Current State:**
- 2 pirate personas exist (Corsair Black, Captain Redmaw) - Blitzkrieg archetype
- 1 cartel boss exists (Cartel Boss Vex) - Merchant archetype
- Pirate events: pirate_raid, pirate_armada, pirate_haven_destroyed
- Covert operations include coup, bombing, sabotage

**Gap:** Pirates attack via random events, not Syndicate contracts. No player-initiated mafia contracts.

---

## Part 2: PRD Updates

### 2.1 New Section: Resource Tiers (Section 4.5)

Add to PRD after Section 4 (Resources):

```markdown
### 4.5 Manufacturing & Crafting

X-Imperium introduces a 4-tier resource system that gates advanced military behind strategic resource management.

#### Tier 0: Base Resources (Original)
Credits, Food, Ore, Petroleum, Research Points, Population

#### Tier 1: Refined Resources
| Resource | Recipe | Auto-Production |
|----------|--------|-----------------|
| Refined Metals | 100 Ore | Ore Planets: 10% of output |
| Fuel Cells | 50 Petroleum + 20 Credits | Petroleum Planets: 10% |
| Polymers | 30 Petroleum + 20 Ore | Industrial Planets only |
| Processed Food | 200 Food | Food Planets: 5% |
| Labor Units | 1,000 Population + 50 Credits | Urban Planets: 5% |

#### Tier 2: Manufactured Components (Research 2+)
Electronics, Armor Plating, Propulsion Units, Life Support, Weapons Grade Alloy, Targeting Arrays, Stealth Composites, Quantum Processors

#### Tier 3: Advanced Systems (Research 5+)
Reactor Cores, Shield Generators, Warp Drives, Cloaking Devices, Ion Cannon Cores, Neural Interfaces, Singularity Containment

#### Industrial Planets (New Planet Type)
- Cost: 15,000 credits
- Production: Processes Tier 0 → Tier 1 (configurable)
- Bonus: Research level reduces crafting time by 5% per level
```

### 2.2 New Section: Black Market & Syndicate (Section 11)

```markdown
## 11. The Galactic Syndicate

### 11.1 Overview
The Syndicate is a criminal organization offering:
- Banned technologies (WMDs)
- Premium components (skip crafting)
- Contract work (trust building)
- Intelligence services

### 11.2 Trust Levels (0-8)
| Level | Points | Title | Unlocks |
|-------|--------|-------|---------|
| 0 | 0 | Unknown | Must complete intro contract |
| 1 | 100 | Associate | Components at 2x, basic intel |
| 2 | 500 | Runner | Pirate raid contracts, 1.75x prices |
| 3 | 1,500 | Soldier | Player contracts, Tier 2 at 1.5x |
| 4 | 3,500 | Captain | Targeted contracts, kingslayer |
| 5 | 7,000 | Lieutenant | Tier 3 systems (non-WMD) |
| 6 | 12,000 | Underboss | Chemical weapons, EMP |
| 7 | 20,000 | Consigliere | Nuclear weapons |
| 8 | 35,000 | Syndicate Lord | Bioweapons, exclusive contracts |

### 11.3 Contract System
Contracts build trust and provide rewards. Tier 1-4 contracts with escalating risk/reward.

### 11.4 Recruitment Mechanic
Players in bottom 50% receive Syndicate Invitation with bonus trust rewards - comeback mechanic.
```

### 2.3 Updated Section: Military Units (Section 6)

Update military section to include crafting costs:

```markdown
#### Basic Units (Credits Only)
Soldiers (50), Fighters (200), Carriers (2,000), Generals (1,000), Covert Agents (500)

#### Tier 2 Units (Basic Crafting, Research 2+)
| Unit | Credits | Components | Research |
|------|---------|------------|----------|
| Marines | 150 | 1 Armor Plating | 2 |
| Interceptors | 400 | 1 Propulsion, 1 Electronics | 2 |
| Light Cruiser | 5,000 | 2 Armor, 2 Propulsion | 2 |

#### Tier 3 Units (Advanced Crafting, Research 4+)
| Unit | Credits | Components | Research |
|------|---------|------------|----------|
| Heavy Cruiser | 15,000 | 3 Armor, 2 Propulsion, 1 Reactor Core | 4 |
| Battlecruiser | 35,000 | 3 WG Alloy, 2 Reactors, 2 Shields | 5 |

#### Tier 4 Units (Capital Assets, Research 6+)
| Unit | Credits | Components | Research |
|------|---------|------------|----------|
| Dreadnought | 80,000 | 3 Reactors, 2 Shields, 1 Ion Core | 6 |
| Stealth Cruiser | 50,000 | 2 Cloaking, 1 Reactor, 1 Neural | 6 |
```

### 2.4 Updated Section: Research (Section 9)

Replace linear research with branching tree:

```markdown
### 9.1 Research Levels
| Level | RP Required | Cumulative | Key Unlocks |
|-------|-------------|------------|-------------|
| 1 | 0 | 0 | Basic military |
| 2 | 500 | 500 | Tier 2 components, Light Cruisers |
| 3 | 1,500 | 2,000 | Defense Stations, Bombers |
| 4 | 3,000 | 5,000 | Heavy Cruisers, Stealth Composites |
| 5 | 5,000 | 10,000 | Tier 3 systems, Battlecruisers |
| 6 | 8,000 | 18,000 | Dreadnoughts, WMD research |
| 7 | 12,000 | 30,000 | Neural Interfaces, Psionic tech |
| 8 | 20,000 | 50,000 | Singularity tech, Superweapons |

### 9.2 Research Branches
Players allocate RP percentage to branches:
| Branch | 20% Bonus |
|--------|-----------|
| Military | +10% attack damage |
| Defense | +10% defensive HP |
| Propulsion | +15% fleet evasion |
| Stealth | +20% covert success |
| Economy | -10% crafting costs |
| Biotech | +10% population growth |
```

### 2.5 Updated Section: Victory Conditions (Section 10)

Add Research Victory update:

```markdown
### Research Victory (Updated)
Complete Research Level 8 (Singularity tech)
- Requires 50,000 cumulative RP
- With 3 Research Planets: ~167 turns
- With 6 Research Planets + Education bonus: ~80 turns
```

---

## Part 3: Game Engine Updates

### 3.1 New Database Tables

**File:** `src/db/schema.ts`

```typescript
// New tables needed:

export const playerResources = pgTable("player_resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  empireId: uuid("empire_id").references(() => empires.id),
  resourceType: text("resource_type").notNull(), // tier0-3 resource names
  quantity: integer("quantity").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const playerResearch = pgTable("player_research", {
  id: uuid("id").primaryKey().defaultRandom(),
  empireId: uuid("empire_id").references(() => empires.id),
  level: integer("level").default(1),
  currentRp: integer("current_rp").default(0),
  branchMilitary: integer("branch_military").default(0),
  branchDefense: integer("branch_defense").default(0),
  branchPropulsion: integer("branch_propulsion").default(0),
  branchStealth: integer("branch_stealth").default(0),
  branchEconomy: integer("branch_economy").default(0),
  branchBiotech: integer("branch_biotech").default(0),
});

export const playerTrust = pgTable("player_trust", {
  id: uuid("id").primaryKey().defaultRandom(),
  empireId: uuid("empire_id").references(() => empires.id),
  trustPoints: integer("trust_points").default(0),
  trustLevel: integer("trust_level").default(0),
  contractsCompleted: integer("contracts_completed").default(0),
  lastInteractionTurn: integer("last_interaction_turn"),
  isHostile: boolean("is_hostile").default(false),
});

export const activeContracts = pgTable("active_contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  empireId: uuid("empire_id").references(() => empires.id),
  contractType: text("contract_type").notNull(),
  targetEmpireId: uuid("target_empire_id"),
  reward: integer("reward").notNull(),
  trustReward: integer("trust_reward").notNull(),
  deadlineTurn: integer("deadline_turn").notNull(),
  status: text("status").default("active"), // active, completed, failed
});

export const craftingQueue = pgTable("crafting_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  empireId: uuid("empire_id").references(() => empires.id),
  itemType: text("item_type").notNull(),
  quantity: integer("quantity").default(1),
  componentsReserved: jsonb("components_reserved"),
  startTurn: integer("start_turn").notNull(),
  completionTurn: integer("completion_turn").notNull(),
});
```

### 3.2 New Service Files

**Directory:** `src/lib/game/services/`

```
crafting-service.ts      - Crafting queue management, recipe validation
resource-tier-service.ts - Tier 1-3 production calculations
syndicate-service.ts     - Trust management, contract generation
contract-service.ts      - Contract lifecycle, completion checks
```

### 3.3 Turn Processor Updates

**File:** `src/lib/game/services/turn-processor.ts`

Add new phases:

```typescript
async function processTurn(gameState: GameState): Promise<TurnResult> {
  // Phase 1: Income Collection (existing)
  await collectIncome(gameState);

  // Phase 1.5: Tier 1 Auto-Production (NEW)
  await processTier1AutoProduction(gameState);

  // Phase 2: Population Update (existing)
  await updatePopulation(gameState);

  // Phase 3: Civil Status (existing)
  await evaluateCivilStatus(gameState);

  // Phase 4: Market Processing (existing)
  await processMarket(gameState);

  // Phase 4.5: Crafting Queue Processing (NEW)
  await processCraftingQueues(gameState);

  // Phase 4.6: Contract Deadlines (NEW)
  await checkContractDeadlines(gameState);

  // Phase 4.7: Syndicate Recruitment Check (NEW)
  await checkSyndicateRecruitment(gameState);

  // Phase 5: Bot Decisions (updated with new decision types)
  await processBotDecisions(gameState);

  // Phase 6: Actions (existing + pirate missions)
  await processActions(gameState);

  // Phase 6.5: Pirate Mission Execution (NEW)
  await executePirateMissions(gameState);

  // Phase 7: Maintenance (existing)
  await processMaintenance(gameState);

  // Phase 7.5: Trust Decay (NEW)
  await processTrustDecay(gameState);

  // Phase 8: Victory/Defeat Check (existing)
  return checkVictoryConditions(gameState);
}
```

### 3.4 Resource Constants

**File:** `src/lib/game/constants/crafting.ts`

```typescript
export const TIER_1_RECIPES = {
  refined_metals: { ore: 100 },
  fuel_cells: { petroleum: 50, credits: 20 },
  polymers: { petroleum: 30, ore: 20 },
  processed_food: { food: 200 },
  labor_units: { population: 1000, credits: 50 },
};

export const TIER_2_RECIPES = {
  electronics: { refined_metals: 2, polymers: 1, research: 2 },
  armor_plating: { refined_metals: 3, polymers: 1, research: 2 },
  propulsion_units: { fuel_cells: 2, refined_metals: 1, research: 2 },
  life_support: { processed_food: 1, polymers: 1, electronics: 1, research: 3 },
  weapons_grade_alloy: { refined_metals: 4, fuel_cells: 2, research: 3 },
  targeting_arrays: { electronics: 2, refined_metals: 1, research: 3 },
  stealth_composites: { polymers: 3, electronics: 1, research: 4 },
  quantum_processors: { electronics: 3, weapons_grade_alloy: 1, research: 5 },
};

export const TIER_3_RECIPES = {
  reactor_cores: { propulsion_units: 3, electronics: 2, quantum_processors: 1, research: 5 },
  shield_generators: { armor_plating: 2, electronics: 2, quantum_processors: 1, research: 5 },
  warp_drives: { reactor_cores: 2, stealth_composites: 1, targeting_arrays: 1, research: 6 },
  cloaking_devices: { stealth_composites: 3, quantum_processors: 2, research: 6 },
  ion_cannon_cores: { weapons_grade_alloy: 2, reactor_cores: 2, targeting_arrays: 1, research: 6 },
  neural_interfaces: { quantum_processors: 2, life_support: 1, research: 7 },
  singularity_containment: { reactor_cores: 3, shield_generators: 2, research: 8 },
};

export const MILITARY_CRAFTING_COSTS = {
  // Tier 2 units
  marines: { credits: 150, armor_plating: 1 },
  interceptors: { credits: 400, propulsion_units: 1, electronics: 1 },
  light_cruiser: { credits: 5000, armor_plating: 2, propulsion_units: 2 },
  defense_station: { credits: 3000, armor_plating: 1, electronics: 1 },
  // Tier 3 units
  heavy_cruiser: { credits: 15000, armor_plating: 3, propulsion_units: 2, reactor_cores: 1 },
  battlecruiser: { credits: 35000, weapons_grade_alloy: 3, reactor_cores: 2, shield_generators: 2 },
  // Tier 4 units
  dreadnought: { credits: 80000, reactor_cores: 3, shield_generators: 2, ion_cannon_cores: 1 },
  stealth_cruiser: { credits: 50000, cloaking_devices: 2, reactor_cores: 1, neural_interfaces: 1 },
};
```

### 3.5 Syndicate Constants

**File:** `src/lib/game/constants/syndicate.ts`

```typescript
export const TRUST_LEVELS = [
  { level: 0, points: 0, title: "Unknown" },
  { level: 1, points: 100, title: "Associate" },
  { level: 2, points: 500, title: "Runner" },
  { level: 3, points: 1500, title: "Soldier" },
  { level: 4, points: 3500, title: "Captain" },
  { level: 5, points: 7000, title: "Lieutenant" },
  { level: 6, points: 12000, title: "Underboss" },
  { level: 7, points: 20000, title: "Consigliere" },
  { level: 8, points: 35000, title: "Syndicate Lord" },
];

export const CONTRACT_TYPES = {
  // Tier 1: Pirate Raids (Trust 1+)
  supply_run: { trust_req: 1, reward: 5000, trust_reward: 10, triggers_pirate: true },
  disruption: { trust_req: 1, reward: 8000, trust_reward: 15, triggers_pirate: true },
  salvage_op: { trust_req: 1, reward: "varies", trust_reward: 20, triggers_pirate: true },

  // Tier 2: Standard Contracts (Trust 2+)
  intimidation: { trust_req: 2, reward: 15000, trust_reward: 30 },
  economic_warfare: { trust_req: 2, reward: 25000, trust_reward: 40 },
  military_probe: { trust_req: 2, reward: 35000, trust_reward: 50 },
  hostile_takeover: { trust_req: 2, reward: 50000, trust_reward: 75 },

  // Tier 3: Targeted Contracts (Trust 4+)
  kingslayer: { trust_req: 4, reward: 100000, trust_reward: 100 },
  market_manipulation: { trust_req: 4, reward: 75000, trust_reward: 80 },
  regime_change: { trust_req: 4, reward: 60000, trust_reward: 60 },

  // Tier 4: Syndicate Operations (Trust 6+)
  proxy_war: { trust_req: 6, reward: 150000, trust_reward: 120 },
  scorched_earth: { trust_req: 6, reward: "exclusive_tech", trust_reward: 100 },
  the_equalizer: { trust_req: 6, reward: "special_item", trust_reward: 200 },
};

export const TRUST_DECAY_RATE = 0.05; // 5% decay per 10 turns without interaction
export const RECRUITMENT_THRESHOLD = 0.50; // Bottom 50% of empires
```

---

## Part 4: Bot System Updates

### 4.1 New Decision Types

**File:** `src/lib/bots/decision-engine.ts`

Add new decision types:

```typescript
export type BotDecisionType =
  | "build_units"
  | "buy_planet"
  | "attack"
  | "diplomacy"
  | "trade"
  | "do_nothing"
  // NEW decision types
  | "craft_component"
  | "allocate_research"
  | "black_market_purchase"
  | "accept_contract"
  | "complete_contract";

export const BASE_DECISION_WEIGHTS_V2: Record<BotDecisionType, number> = {
  build_units: 25,      // Reduced from 35 (some goes to crafting)
  buy_planet: 15,       // Reduced from 20
  attack: 12,           // Reduced from 15
  diplomacy: 8,         // Reduced from 10
  trade: 8,             // Reduced from 10
  do_nothing: 7,        // Reduced from 10
  // NEW weights
  craft_component: 10,  // Manufacturing focus
  allocate_research: 5, // Research branch decisions
  black_market_purchase: 5, // Syndicate shopping
  accept_contract: 3,   // Contract opportunities
  complete_contract: 2, // Active contract progress
};
```

### 4.2 Archetype Crafting Profiles

**File:** `src/lib/bots/archetypes/crafting-profiles.ts`

```typescript
export const ARCHETYPE_CRAFTING_PROFILES = {
  warlord: {
    craft_priority: ["weapons_grade_alloy", "armor_plating", "reactor_cores"],
    research_focus: { military: 40, defense: 30, propulsion: 20, economy: 10 },
    syndicate_willingness: 0.6, // Moderate - wants WMDs
    contract_preference: ["military_probe", "hostile_takeover", "kingslayer"],
  },
  diplomat: {
    craft_priority: ["electronics", "life_support", "shield_generators"],
    research_focus: { defense: 30, economy: 30, biotech: 25, diplomacy: 15 },
    syndicate_willingness: 0.1, // Very low - reputation matters
    contract_preference: [], // Rarely takes contracts
  },
  merchant: {
    craft_priority: ["refined_metals", "fuel_cells", "polymers"], // Tier 1 for selling
    research_focus: { economy: 50, biotech: 20, defense: 20, military: 10 },
    syndicate_willingness: 0.4, // Moderate - business is business
    contract_preference: ["economic_warfare", "market_manipulation"],
  },
  schemer: {
    craft_priority: ["stealth_composites", "cloaking_devices", "neural_interfaces"],
    research_focus: { stealth: 50, economy: 20, military: 20, defense: 10 },
    syndicate_willingness: 0.9, // Very high - loves the underworld
    contract_preference: ["regime_change", "proxy_war", "scorched_earth"],
  },
  turtle: {
    craft_priority: ["armor_plating", "shield_generators", "ion_cannon_cores"],
    research_focus: { defense: 60, economy: 20, military: 10, biotech: 10 },
    syndicate_willingness: 0.2, // Low - prefers legitimate means
    contract_preference: ["supply_run"], // Only safe contracts
  },
  blitzkrieg: {
    craft_priority: ["propulsion_units", "weapons_grade_alloy", "targeting_arrays"],
    research_focus: { military: 45, propulsion: 35, economy: 15, defense: 5 },
    syndicate_willingness: 0.7, // High - wants fast power
    contract_preference: ["disruption", "military_probe", "kingslayer"],
  },
  tech_rush: {
    craft_priority: ["electronics", "quantum_processors", "neural_interfaces"],
    research_focus: { economy: 30, stealth: 25, military: 25, defense: 20 },
    syndicate_willingness: 0.3, // Low-moderate - prefers research path
    contract_preference: ["salvage_op"], // Tech opportunities
  },
  opportunist: {
    craft_priority: "dynamic", // Based on what's cheapest/available
    research_focus: { economy: 30, military: 30, defense: 20, stealth: 20 },
    syndicate_willingness: 0.5, // Moderate - depends on opportunity
    contract_preference: "dynamic", // Whatever pays best
  },
};
```

### 4.3 100+ Bot Configurations

With existing axes:
- 8 archetypes
- 4 difficulty levels
- 6 emotional states

With new axes:
- 3 syndicate engagement levels (none, moderate, heavy)
- 4 crafting focus areas (military, economy, stealth, balanced)
- 3 research branch priorities

**Total Combinations:** 8 × 4 × 6 × 3 × 4 × 3 = **6,912 unique configurations**

Even sampling 100 distinct personas gives tremendous variety.

---

## Part 5: UI Updates

### 5.1 New Components

**Directory:** `src/components/game/`

```
crafting/
├── CraftingPanel.tsx        - Main crafting interface
├── ResourceInventory.tsx    - Tier 0-3 resource display
├── RecipeList.tsx           - Available recipes with requirements
├── CraftingQueue.tsx        - Active crafting orders
└── index.ts

research/
├── ResearchTree.tsx         - Visual tech tree (D3.js or React Flow)
├── BranchAllocation.tsx     - Research branch sliders
├── UnlockPreview.tsx        - What's coming next
└── (existing files)

syndicate/
├── BlackMarketPanel.tsx     - Hidden until Trust 1
├── ContractBoard.tsx        - Available contracts
├── TrustMeter.tsx           - Trust level visualization
├── SyndicateCatalog.tsx     - Items for sale
└── index.ts

military/
├── EnhancedBuildPanel.tsx   - Show crafting requirements
├── UnitRequirements.tsx     - What you need to build
└── (existing files)
```

### 5.2 Research Tree Visualization

**Implementation:** Use D3.js (already installed) or React Flow

```
Level 1 (Start)
    │
    ├── Basic Military (Soldiers, Fighters)
    │
Level 2 ─────────────────────────────────
    │
    ├── Tier 2 Components
    ├── Marines, Interceptors
    └── Light Cruisers ←── UNLOCK INDICATOR
    │
Level 3 ─────────────────────────────────
    │
    ├── Defense Stations
    ├── Bombers
    └── Advanced Tier 2
    │
    ... (continues to Level 8)
```

### 5.3 Navigation Updates

**File:** `src/app/game/layout.tsx`

Add new nav items:
- Crafting (between Military and Research)
- Syndicate (after Covert, hidden until Trust 1)

---

## Part 6: Pirate System Integration

### 6.1 Pirate Mission Triggers

**Mechanism:** Syndicate contracts trigger pirate attacks

```typescript
// When player accepts pirate raid contract:
async function acceptPirateContract(contract: Contract): Promise<void> {
  // 1. Mark contract as active
  await activateContract(contract);

  // 2. Generate pirate mission against target
  const mission: PirateMission = {
    targetEmpireId: contract.targetEmpireId,
    missionType: contract.contractType, // supply_run, disruption, salvage_op
    reward: contract.reward,
    triggeringEmpireId: contract.empireId,
    executionTurn: gameState.currentTurn + 1, // Next turn
  };

  // 3. Queue pirate attack
  await queuePirateMission(mission);
}
```

### 6.2 Pirate Attack Execution

**File:** `src/lib/game/services/pirate-service.ts`

```typescript
async function executePirateMission(mission: PirateMission): Promise<PirateResult> {
  const target = await getEmpire(mission.targetEmpireId);

  switch (mission.missionType) {
    case "supply_run":
      // Light attack on trade routes
      // -5% income for 2 turns
      return applyIncomeDebuff(target, 0.05, 2);

    case "disruption":
      // Attack specific infrastructure
      // Destroy 1-3 random planets
      return destroyRandomPlanets(target, 1, 3);

    case "salvage_op":
      // Attack fleet, triggering party gets salvage
      // Destroy 10% of military, contractor gets 50% value
      return salvageAttack(target, mission.triggeringEmpireId, 0.1, 0.5);
  }
}
```

### 6.3 Player Mafia Contracts

**Player Contract Flow:**
1. Player reaches Trust 2+
2. Contract Board shows available contracts
3. Player accepts contract (locks in deadline)
4. Player must complete objective before deadline
5. Success: Reward + Trust points
6. Failure: -50% trust reward, lose 1 Trust Level

**Contract Completion Detection:**

```typescript
async function checkContractCompletion(
  contract: Contract,
  gameState: GameState
): Promise<boolean> {
  switch (contract.contractType) {
    case "intimidation":
      // Check if target's civil status dropped
      return target.civilStatus < contract.initialTargetStatus;

    case "economic_warfare":
      // Check if target's food was bombed
      return target.foodStockpile < contract.initialTargetFood * 0.7;

    case "hostile_takeover":
      // Check if player captured planet from target
      return player.capturedPlanetsFrom.includes(contract.targetEmpireId);

    case "kingslayer":
      // Check if target fell from top 3
      return !topThreeEmpires.includes(contract.targetEmpireId);
  }
}
```

---

## Part 7: Testing System Updates

### 7.1 New Test Files

**Directory:** `tests/`

```
unit/
├── crafting-service.test.ts
├── resource-tier-service.test.ts
├── syndicate-service.test.ts
├── contract-service.test.ts
└── pirate-service.test.ts

simulation/
├── crafting-balance.test.ts     - Crafting time/cost balance
├── syndicate-progression.test.ts - Trust accumulation rates
├── contract-completion.test.ts  - Contract success rates
├── pirate-mission.test.ts       - Pirate attack outcomes
└── bot-crafting-decisions.test.ts - Bot crafting AI

e2e/
├── crafting-flow.spec.ts
├── syndicate-flow.spec.ts
└── research-tree.spec.ts
```

### 7.2 Simulation Updates

**File:** `tests/simulation/simulator.ts`

Add crafting and syndicate systems to headless simulation:

```typescript
interface SimulationConfig {
  // Existing
  empireCount: number;
  turnLimit: number;
  protectionTurns: number;

  // NEW
  enableCrafting: boolean;
  enableSyndicate: boolean;
  enablePirateMissions: boolean;
  craftingSpeedMultiplier: number;
}

// Simulation must track:
// - Tier 1-3 resource inventories
// - Crafting queues
// - Trust levels
// - Active contracts
// - Pirate mission queue
```

### 7.3 Balance Testing

**Key Metrics to Validate:**

1. **Crafting Balance:**
   - Time to first Light Cruiser: 15-25 turns
   - Time to first Heavy Cruiser: 35-50 turns
   - Time to first Dreadnought: 80-120 turns

2. **Syndicate Balance:**
   - Trust 1 achievable by turn 20
   - Trust 5 achievable by turn 60
   - Trust 8 achievable by turn 120+

3. **Pirate Mission Balance:**
   - Income debuff impact: 5-15% reduction
   - Planet destruction rate: 1-3 per successful raid
   - Salvage value: 40-60% of destroyed military

4. **Bot Decision Distribution:**
   - Crafting decisions: 8-15% of total
   - Syndicate decisions: 3-8% of total
   - Contract acceptance: Based on archetype profile

---

## Part 8: Implementation Phases

### Phase 1: Foundation (Estimated: 2-3 weeks work)
- [ ] Database schema updates (new tables)
- [ ] Resource tier service
- [ ] Crafting service (recipes, queue management)
- [ ] Turn processor updates (auto-production, crafting queue)
- [ ] Unit tests for new services

### Phase 2: Research & Crafting UI (Estimated: 2-3 weeks work)
- [ ] Research tree visualization component
- [ ] Branch allocation UI
- [ ] Crafting panel components
- [ ] Enhanced military build panel
- [ ] Integration tests

### Phase 3: Syndicate System (Estimated: 2-3 weeks work)
- [ ] Syndicate service (trust, contracts)
- [ ] Black market catalog
- [ ] Contract board UI
- [ ] Trust decay mechanics
- [ ] Recruitment mechanic for struggling players

### Phase 4: Pirate Missions (Estimated: 1-2 weeks work)
- [ ] Pirate mission service
- [ ] Contract-triggered pirate attacks
- [ ] Player contract acceptance flow
- [ ] Contract completion detection

### Phase 5: Bot Integration (Estimated: 2-3 weeks work)
- [ ] New decision types in decision engine
- [ ] Archetype crafting profiles
- [ ] Syndicate engagement logic
- [ ] Bot contract acceptance AI
- [ ] Balance testing with bots

### Phase 6: Full Integration Testing (Estimated: 1-2 weeks work)
- [ ] End-to-end testing
- [ ] Balance simulation runs (1000+ games)
- [ ] Bot archetype win rate analysis
- [ ] Performance optimization
- [ ] PRD documentation finalization

---

## Part 9: Risk Assessment

### High Risk Items
1. **Crafting balance** - Too slow = frustrating, too fast = trivializes credits
2. **Syndicate snowball** - High trust players may dominate
3. **Bot decision complexity** - More axes = more tuning needed

### Mitigation Strategies
1. **Crafting:** Start with faster times, tune down based on playtest
2. **Syndicate:** Trust decay + Coordinator response creates natural limits
3. **Bots:** Implement in phases, extensive simulation testing

### Dependencies
- Research tree visualization requires D3.js expertise
- Database migrations need careful sequencing
- Existing bot tests must continue passing

---

## Part 10: Success Criteria

### Quantitative
- [ ] All existing tests pass (regression)
- [ ] New test coverage >80%
- [ ] Simulation: 1000 games complete without errors
- [ ] Bot win rate variance <15% across archetypes
- [ ] Turn processing <500ms (performance maintained)

### Qualitative
- [ ] Crafting feels meaningful, not tedious
- [ ] Research tree provides clear progression visibility
- [ ] Black market creates viable alternative path
- [ ] Pirates create dynamic tension, not frustration
- [ ] Bot personas feel distinct with new axes

---

## Appendix A: File Change Summary

### New Files (25+)
- `src/db/schema.ts` updates (4 new tables)
- `src/lib/game/services/crafting-service.ts`
- `src/lib/game/services/resource-tier-service.ts`
- `src/lib/game/services/syndicate-service.ts`
- `src/lib/game/services/contract-service.ts`
- `src/lib/game/services/pirate-service.ts`
- `src/lib/game/constants/crafting.ts`
- `src/lib/game/constants/syndicate.ts`
- `src/lib/bots/archetypes/crafting-profiles.ts`
- `src/components/game/crafting/*` (5 files)
- `src/components/game/syndicate/*` (4 files)
- `src/components/game/research/ResearchTree.tsx`
- `src/app/actions/crafting-actions.ts`
- `src/app/actions/syndicate-actions.ts`
- `tests/unit/crafting-service.test.ts`
- `tests/unit/syndicate-service.test.ts`
- `tests/simulation/crafting-balance.test.ts`
- `tests/simulation/syndicate-progression.test.ts`

### Modified Files (15+)
- `docs/PRD.md` (Sections 4.5, 6, 9, 10, 11)
- `src/lib/game/services/turn-processor.ts`
- `src/lib/game/unit-config.ts`
- `src/lib/bots/decision-engine.ts`
- `src/lib/bots/types.ts`
- `src/lib/bots/archetypes/*.ts` (8 files)
- `src/app/game/layout.tsx` (navigation)
- `src/components/game/military/BuildUnitsPanel.tsx`
- `tests/simulation/simulator.ts`
- `tests/simulation/types.ts`

---

## Appendix B: Decision Points for User

1. **Crafting Speed:** Start conservative (slow) or aggressive (fast)?
2. **Syndicate Visibility:** Hidden completely until first contact, or hint at existence?
3. **Pirate Persona Usage:** Use existing Corsair Black/Captain Redmaw, or create Syndicate-specific pirates?
4. **WMD Implementation:** Include in Phase 3 or defer to later phase?
5. **Research Tree Style:** Linear with branches (simpler) or full tree graph (more complex)?

---

*Plan Version: 1.0*
*Created: Turn 1 of Planning Phase*
*Status: Awaiting User Approval*

# X-Imperium: Milestone Build Plan

**Version:** 1.2
**Date:** December 24, 2024
**Status:** Approved
**Related:** PRD v1.2

---

## Philosophy: Vertical Slices with Testable Outcomes

Each milestone delivers a **playable vertical slice** that can be tested end-to-end. This approach:
- Validates assumptions early
- Catches integration issues immediately
- Provides tangible progress checkpoints
- Enables stakeholder demos at each stage

---

## Milestone Overview

| # | Milestone | Duration | Cumulative | Testable Outcome |
|---|-----------|----------|------------|------------------|
| 0 | Foundation | 1d | 1d | Build deploys |
| 1 | Static Empire View | 2d | 3d | Can see empire + networth |
| 2 | Turn Engine | 2.5d | 5.5d | Turns process with civil status |
| 3 | Planet, Units & Research | 2.5d | 8d | Can build + research |
| 4 | Combat System | 3d | 11d | Can fight (3 phases) |
| 5 | Random Bots | 2d | 13d | **First Playable** |
| 6 | Victory & Persistence | 2d | 15d | **v0.5 MVP** |
| 6.5 | Covert Operations | 2d | 17d | Can spy |
| 7 | Market & Diplomacy | 2d | 19d | Can trade/ally |
| 8 | Bot Personas | 4d | 23d | Bots talk |
| 9 | Bot Decision Trees | 3d | 26d | Bots think |
| 10 | Emotional States | 3d | 29d | Bots remember |
| 11 | Mid-Game Systems | 3d | 32d | **v0.6 Complete** |
| 12 | LLM Bots | 4d | 36d | **v0.7 Alpha** |

---

## Key Decision Points

| After Milestone | Gate | Action |
|-----------------|------|--------|
| **5 (First Playable)** | Demo checkpoint | Show stakeholders game with 25 random bots |
| **6 (v0.5 MVP)** | Closed alpha | Invite 5-10 testers for core mechanics feedback |
| **11 (v0.6 Complete)** | Expanded alpha | 20-player closed test with bot personalities |
| **12 (v0.7 Alpha)** | Feature complete | Focus shifts to balance and polish |

---

## MILESTONE 0: Foundation (Pre-Game)

**Duration**: 1 day
**Dependency**: None
**Testable**: Yes
**Status**: ✅ COMPLETE (Audited 2024-12-24)

### Deliverables
- ✅ Project scaffolding (Next.js 14, Tailwind, Drizzle) — *Next.js 14.2.35, Tailwind 3.4.1, Drizzle-orm 0.45.1*
- ✅ Database schema deployed to Supabase — *Full schema in `src/lib/db/schema.ts` (games, empires, planets + M2-M4 tables)*
- ✅ Basic routing structure — *App Router with `/game/*` routes (8 pages)*
- ✅ CI/CD pipeline (build + type-check) — *`.github/workflows/ci.yml` with typecheck, lint, test, build, schema-check jobs*
- ✅ Performance logging scaffold — *`src/lib/performance/logger.ts` with buffered DB writes + console fallback*

### Test Criteria
```
✅ npm run build succeeds — Verified (14 routes compiled)
✅ npm run typecheck succeeds — Verified (strict mode enabled)
✅ Database connection works — Verified via Neon PostgreSQL (2024-12-24)
✅ Can CRUD a test record — Verified: CREATE/READ/UPDATE/DELETE all passed (2024-12-24)
✅ Vercel preview deployment works — Confirmed by user (2024-12-24)
```

### Technical Notes
- Use App Router (not Pages)
- TypeScript strict mode from day 1
- Drizzle schema in `db/schema.ts`

---

## MILESTONE 1: Static Empire View

**Duration**: 2 days
**Dependency**: M0
**Testable**: Yes
**Status**: ✅ COMPLETE (Audited 2024-12-24)

### Deliverables
- ✅ Empire data model (empires, planets, resources, population) — *Full schema with all fields in `schema.ts`*
- ✅ Dashboard screen showing empire state — *`/game` page with `DashboardContent` component*
- ✅ Planet list view — *`PlanetList` component + dedicated `/game/planets` page*
- ✅ Resource display (Credits, Food, Ore, Petroleum, Research Points) — *`ResourcePanel` component with data-testid attributes*
- ✅ **Networth calculation and display** (PRD 4.5) — *`src/lib/game/networth.ts` + `NetworthPanel` component*
- ✅ **Population counter** — *`PopulationPanel` component with civil status display*
- ✅ Seed data: 1 player empire + 9 starting planets — *`createPlayerEmpire()` + `createStartingPlanets()` in game-repository.ts*

### Test Criteria
```
✅ Can create a new game — startNewGame() + startGameAction() implemented
✅ Dashboard displays correct starting resources — fetchDashboardDataAction() returns all resource data
✅ Planet list shows 9 planets with correct types — STARTING_PLANETS constant: 2 Food, 2 Ore, 1 Petroleum, 1 Tourism, 1 Urban, 1 Government, 1 Research
✅ Resource calculations match PRD values:
  - 2 Food planets × 160 = 320 food/turn — constants.ts PLANET_PRODUCTION.food = 160
  - 2 Ore planets × 112 = 224 ore/turn — constants.ts PLANET_PRODUCTION.ore = 112
  - 1 Petroleum planet = 92 petro/turn — constants.ts PLANET_PRODUCTION.petroleum = 92
  - 1 Tourism planet = 8,000 credits/turn — constants.ts PLANET_PRODUCTION.tourism = 8000
✅ Networth displays using formula:
  - Planets × 10 + Soldiers × 0.0005 + Fighters × 0.001 + ... — networth.ts implements exact PRD 4.5 formula
  - Unit tests verify formula accuracy (networth.test.ts)
✅ Population count displayed — PopulationPanel shows population + civil status
```

### Database Tables
- ✅ `games` — *Implemented with status, turn tracking, bot config*
- ✅ `empires` — *Implemented with resources, military, population, networth*
- ✅ `planets` — *Implemented with type, production rate, purchase price*

---

## MILESTONE 2: Turn Engine (With Civil Status)

**Duration**: 2.5 days
**Dependency**: M1
**Testable**: Yes
**Status**: ✅ COMPLETE (Audited 2024-12-24)

### Deliverables
- ✅ Turn processing pipeline (6 phases from PRD) — *`src/lib/game/services/turn-processor.ts` (~500 lines)*
- ✅ Resource production per turn — *`processTurnResources()` in resource-engine.ts*
- ✅ Resource consumption (maintenance) — *168 credits/planet via `calculateMaintenanceCost()`*
- ✅ **Civil Status system** (PRD 4.4):
  - ✅ 8 levels: Ecstatic → Revolting — *`CIVIL_STATUS_LEVELS` in constants.ts*
  - ✅ Income multiplier (0.25× to 4×) — *`CIVIL_STATUS_INCOME_MULTIPLIERS` in constants.ts*
  - ✅ Status changes based on events — *`evaluateCivilStatus()` in civil-status.ts*
- ✅ **Population mechanics**:
  - ✅ Growth per turn (if fed) — *2% growth rate in population.ts*
  - ✅ Consumption: 0.05 food per citizen — *`FOOD_CONSUMPTION_PER_CITIZEN` constant*
- ✅ "End Turn" button — *`EndTurnButton` component with debounce + accessibility*
- ✅ Turn counter display — *`TurnCounter` component with milestone highlighting*
- ✅ Performance logging (JSONL) — *`perfLogger.log()` captures turn processing time*

### Test Criteria
```
✅ Clicking "End Turn" increments turn counter — endTurnAction() updates game.currentTurn
✅ Resources change according to planet production — processTurnResources() applies multipliers
✅ Planet maintenance (168 credits/planet) deducted — PLANET_MAINTENANCE_COST = 168
✅ Turn processing completes in <500ms (no bots) — Performance target met
✅ Performance log captures timing data — perfLogger.log() with durationMs
✅ Civil Status affects income:
  - Ecstatic: 4× multiplier — CIVIL_STATUS_INCOME_MULTIPLIERS.ecstatic = 4.0
  - Content: 2× multiplier — CIVIL_STATUS_INCOME_MULTIPLIERS.content = 2.0
  - Unhappy: 1× multiplier (baseline) — CIVIL_STATUS_INCOME_MULTIPLIERS.unhappy = 1.0
✅ Population grows when food surplus exists — calculatePopulationGrowth() at 2%/turn
✅ Population consumes food (0.05/citizen/turn) — calculateFoodConsumption()
✅ Food deficit triggers civil status drop — shouldDowngradeStatus() checks food_deficit
✅ Starvation causes population loss — calculateStarvation() with graduated rates
```

### Turn Processing Order
1. Income collection (with civil status multiplier)
2. Population update (growth/starvation)
3. Civil status evaluation
4. Market processing (stub for M3)
5. Bot decisions (stub for M5)
6. Actions (stub for M4+)
7. Maintenance (integrated in Phase 1)
8. Victory check (stub for M6)

### Database Tables
- `civil_status_history` ✅ **Pre-created (2024-12-24)**

### Implementation Notes
- **377 tests passing** including 25 turn-processor specific tests
- Code reviewed with fixes for: civil status multipliers (C-1), turn limit edge case (I-8), input validation (M-7), accessibility (I-3), debounce (I-11)
- Components: TurnCounter, CivilStatusDisplay, EndTurnButton all integrated into dashboard
- Dashboard now shows turn info and civil status in header bar

---

## MILESTONE 3: Planet, Units & Research

**Duration**: 2.5 days
**Dependency**: M2
**Testable**: Yes
**Status**: ✅ COMPLETE (Audited 2024-12-24)

### Deliverables
- ✅ Buy/release planet actions — *`planet-service.ts` with buyPlanet/releasePlanet*
- ✅ Planet cost scaling: `BaseCost × (1 + OwnedPlanets × 0.05)` — *Uses `calculatePlanetCost()` from formulas*
- ✅ Military unit construction (all 7 types) — *`unit-service.ts` with validateBuild*
- ✅ Unit maintenance costs — *`calculateUnitMaintenance()` in unit-service.ts*
- ✅ Build queue system — *`build-queue-service.ts` with turn-based processing*
- ✅ **Research system basics** (PRD 9.1-9.3):
  - ✅ 8 fundamental research levels — *MAX_RESEARCH_LEVEL = 7 (0-7)*
  - ✅ Research points accumulation — *processResearchProduction() in turn processor*
  - ✅ Research investment UI — *ResearchPanel.tsx + FundamentalResearchProgress.tsx*
  - ✅ Light Cruiser unlock (requires research) — *`isUnitLocked()` checks level 2*
- ✅ **Unit upgrades** (3 levels per unit type) — *`upgrade-service.ts` + `upgrade-config.ts`*

### Test Criteria
```
✅ Can buy a new planet (credits deducted) — planet-service.ts:buyPlanet()
✅ Planet cost increases with ownership — calculatePlanetCost() with 5% scaling
✅ Can release planet (50% refund) — planet-service.ts:releasePlanet()
✅ Can build each unit type:
  - Soldiers (50 credits) — UNIT_COSTS.soldiers = 50
  - Fighters (200 credits) — UNIT_COSTS.fighters = 200
  - Light Cruisers (500 credits) - requires research — isUnitLocked() check
  - Heavy Cruisers (1,000 credits) — UNIT_COSTS.heavyCruisers = 1000
  - Carriers (2,500 credits) — UNIT_COSTS.carriers = 2500
  - Stations (5,000 credits) — UNIT_COSTS.stations = 5000
  - Covert Agents (4,090 credits) — UNIT_COSTS.covertAgents = 4090
✅ Unit maintenance deducted per turn — turn-processor.ts:199
✅ Insufficient funds prevents purchase — validateBuild() checks credits
✅ Research planets generate research points — 100 RP/planet/turn
✅ Can invest in fundamental research (8 levels) — investResearchPoints()
✅ Research costs increase exponentially — 1000 × 2^level
✅ Light Cruisers locked until research level 2 — isUnitLocked() check
✅ Unit upgrades apply stat bonuses — getUpgradeBonuses() in upgrade-config.ts
```

### Database Tables
- `military_units`
- `build_queue` ✅ **Pre-created (2024-12-24)**
- `research_progress` ✅ **Pre-created (2024-12-24)**
- `unit_upgrades` ✅ **Pre-created (2024-12-24)**

**Note:** Build queue, research, and upgrade schemas defined ahead of schedule as parallel work during M1.

### Implementation Notes (2024-12-24)
- **Files Created:**
  - `src/lib/game/services/planet-service.ts` — Planet buy/release operations
  - `src/lib/game/services/build-queue-service.ts` — Queued unit construction
  - `src/lib/game/services/unit-service.ts` — Unit validation & maintenance
  - `src/lib/game/services/research-service.ts` — Research progression
  - `src/lib/game/services/upgrade-service.ts` — Unit upgrade system
  - `src/lib/game/build-config.ts` — Build time constants
  - `src/lib/game/upgrade-config.ts` — Upgrade costs & bonuses
  - `src/app/actions/*-actions.ts` — Server actions for all services
  - `src/components/game/planets/` — Planet UI components
  - `src/components/game/military/` — Military UI components
  - `src/components/game/research/` — Research UI components
  - Test files for all services (637 tests passing)

- ✅ **Fixed:** Added `initializeResearch()` and `initializeUnitUpgrades()` calls to `createPlayerEmpire()` in `game-repository.ts` (2024-12-24)

---

## MILESTONE 4: Combat System (3 Phases)

**Duration**: 3 days
**Dependency**: M3
**Testable**: Yes
**Status**: ✅ COMPLETE (2024-12-24)

### Deliverables
- ✅ Combat power calculation (PRD 6.2 formulas) — *`src/lib/formulas/combat-power.ts`*
- ✅ **Three-phase combat** (PRD 6.7) — *`src/lib/combat/phases.ts`*:
  - ✅ Phase 1: Space Combat (Cruisers vs Cruisers)
  - ✅ Phase 2: Orbital Combat (Fighters vs Stations)
  - ✅ Phase 3: Ground Combat (Soldiers capture planets)
- ✅ **Unit Effectiveness Matrix** implementation — *`src/lib/combat/effectiveness.ts`*
- ✅ Casualty calculation (15-35% dynamic) — *`src/lib/formulas/casualties.ts`*
- ✅ Attack action (invasion) — *`resolveInvasion()` in phases.ts*
- ✅ Guerilla attack (soldiers only) — *`resolveGuerillaAttack()` in phases.ts*
- ✅ **Retreat mechanics** (15% opportunity loss) — *`resolveRetreat()` in phases.ts*
- ✅ Combat resolution UI — *`src/components/game/combat/`*:
  - ✅ `BattleReport.tsx` - 3-phase combat breakdown display
  - ✅ `AttackInterface.tsx` - Force selection and attack launching
  - ✅ `CombatPreview.tsx` - Power comparison before attacking
  - ✅ `CasualtyReport.tsx` - Casualty display component
- ✅ Battle report display (phase by phase) — *Full UI with server actions*
- ✅ Fog of war (see power, not composition) — *Combat targets show networth only*
- ✅ Army effectiveness system (0-100%) — *`src/lib/formulas/army-effectiveness.ts`*

### Test Criteria
```
✅ Attack button launches combat
✅ Combat resolves in 3 phases:
  - Space: Cruisers fight first
  - Orbital: Fighters vs Stations
  - Ground: Soldiers capture if previous phases won
✅ Unit effectiveness per phase:
  - Soldiers: High ground, high guerilla
  - Fighters: High orbital, low space
  - Stations: Medium orbital (2× on defense)
  - Cruisers: High space
✅ Combat power formula correct:
  - Diversity bonus: +15% for 4+ unit types
  - Defender advantage: × 1.2
✅ Casualties in 15-35% range based on power ratio
✅ Retreat option available (15% losses on retreat)
✅ Battle report shows all 3 phases
✅ Guerilla attack uses only soldiers
✅ Army effectiveness affects damage
✅ Victory increases effectiveness (+5-10%)
✅ Defeat decreases effectiveness (-5%)
```

### Database Tables
- `attacks` ✅ **Pre-created (2024-12-24)**
- `combat_logs` ✅ **Pre-created (2024-12-24)** (includes phase-by-phase data)

**Note:** Combat system schemas defined ahead of schedule as parallel work during M1.

### Parallel Work Completed (2024-12-24)
- **Combat Resolution Logic**: Pure functions for 3-phase combat (55 tests passing)
  - `src/lib/combat/phases.ts` - Full invasion, guerilla, and retreat resolution
  - `src/lib/combat/effectiveness.ts` - PRD 6.7 Unit Effectiveness Matrix
  - `src/lib/combat/index.ts` - Barrel exports
- **Combat UI Components**: React component shells ready for server integration
  - `src/components/game/combat/BattleReport.tsx` - Full battle report with phase breakdown
  - `src/components/game/combat/AttackInterface.tsx` - Force selection with validation
  - `src/components/game/combat/CombatPreview.tsx` - Pre-attack power comparison
  - `src/components/game/combat/CasualtyReport.tsx` - Casualty display component

---

## MILESTONE 5: Random Bots (25 Tier 4)

**Duration**: 2 days
**Dependency**: M4
**Testable**: Yes
**Gate**: First Playable Demo
**Status**: ✅ COMPLETE (2024-12-24)

### Deliverables
- ✅ Bot empire generation (25 bots) — *`src/lib/bots/bot-generator.ts`*
- ✅ Random decision engine (weighted actions) — *`src/lib/bots/decision-engine.ts`*
- ✅ Parallel bot processing — *`src/lib/bots/bot-processor.ts` with Promise.all()*
- ✅ Bot turn execution — *Integrated in `turn-processor.ts`*
- ✅ Starmap showing all empires — *`src/components/game/starmap/` with d3-force*
- ✅ **Difficulty selector** (PRD 10.4) — *`src/components/start-game/DifficultySelector.tsx`*:
  - ✅ Easy: Bots make suboptimal choices (50% chance)
  - ✅ Normal: Balanced bot intelligence
  - ✅ Hard: Bots target weakest enemies
  - ✅ Nightmare: Bots get +25% resource bonus
- ✅ 20-turn protection period enforcement — *`getAdjustedWeights()` sets attack to 0*

### Test Criteria
```
✅ 25 bot empires created at game start
✅ Each bot has placeholder name (e.g., "Empire Alpha", "Empire Beta")
✅ Bots take random actions each turn:
  - 35% build units
  - 20% buy planets
  - 15% attack neighbor (after turn 20)
  - 10% diplomacy (stub → do_nothing until M7)
  - 10% trade (stub → do_nothing until M7)
  - 10% do nothing
✅ Bot processing completes in <1.5s (parallel)
✅ Bots respect 20-turn protection (don't attack player)
✅ Bots CAN attack player after turn 20
✅ Starmap displays all 26 empires with territory
✅ Difficulty affects bot behavior:
  - Easy: 50% chance of suboptimal choice
  - Hard: Bots target weakest enemies
  - Nightmare: Bots get +25% resources
```

### Technical Notes
- ✅ Use `Promise.all()` for parallel bot processing
- ✅ Bots are silent (no messages) in this milestone
- ✅ Bot decisions are purely random, no strategy
- ✅ Difficulty stored in game settings

### Implementation Notes (2024-12-24)
- **Files Created:**
  - `src/lib/bots/types.ts` — Bot type definitions
  - `src/lib/bots/bot-names.ts` — 25 placeholder names (Alpha through Nexus)
  - `src/lib/bots/difficulty.ts` — Difficulty modifiers and helpers
  - `src/lib/bots/bot-generator.ts` — Bot empire creation
  - `src/lib/bots/decision-engine.ts` — Weighted random decisions
  - `src/lib/bots/bot-actions.ts` — Decision execution
  - `src/lib/bots/bot-processor.ts` — Parallel turn processing
  - `src/components/game/starmap/` — Force-directed graph visualization
  - `src/components/start-game/DifficultySelector.tsx` — UI component
  - `src/app/game/starmap/page.tsx` — Starmap page
  - `src/app/actions/starmap-actions.ts` — Starmap server actions
  - 6 test files with 75 unit tests + E2E tests

---

## MILESTONE 6: Victory & Persistence

**Duration**: 2 days
**Dependency**: M5
**Testable**: Yes
**Gate**: v0.5 MVP Complete
**Status**: ✅ COMPLETE (2024-12-24)

### Deliverables
- ✅ 3 victory conditions:
  - Conquest: Control 60% of territory
  - Economic: 1.5× networth of 2nd place
  - Survival: Highest score at turn 200
- ✅ Victory detection logic (uses Networth formula from M1) — *`src/lib/game/services/victory-service.ts`*
- ✅ **Defeat conditions** — *Ramping civil collapse with 3-turn escalation*:
  - Bankruptcy (can't pay maintenance)
  - Elimination (0 planets)
  - Civil collapse (3 consecutive Revolting turns with escalating consequences)
- ✅ Victory/defeat screens — *`src/components/game/victory/` + `/game/result` page*
- ✅ Auto-save system (ironman) — *`src/lib/game/services/save-service.ts`*
- ✅ Game resume from auto-save — *Resume game UI on home page*
- ✅ Turn 200 endgame — *Survival victory at turn 200*
- ✅ **Stalemate prevention** (T180 check) — *Warning event at turn 180*

### Test Criteria
```
✓ Conquest victory triggers at 60% territory control
✓ Economic victory triggers at 1.5× networth (using formula)
✓ Survival victory triggers at turn 200
✓ Defeat triggers on:
  - Bankruptcy (negative credits, can't pay)
  - Elimination (0 planets)
  - Revolting civil status (collapse)
✓ Auto-save occurs every turn
✓ Can close browser and resume game
✓ No manual save/load available (ironman enforced)
✓ Victory screen shows stats and "Play Again" option
✓ Turn 180: Warning if no victory path feasible
```

### Database Tables
- `game_saves` (auto-save snapshots)

---

## MILESTONE 6.5: Covert Operations

**Duration**: 2 days
**Dependency**: M6
**Testable**: Yes
**Status**: ✅ COMPLETE (2024-12-24)

### Deliverables
- ✅ **Covert points system** — *`src/lib/covert/constants.ts`*:
  - ✅ Earn 5 points per turn (`COVERT_POINTS_PER_TURN`)
  - ✅ Maximum: 50 points (`MAX_COVERT_POINTS`)
  - ✅ Operations consume points (defined per operation)
- ✅ **Agent capacity**: Government planets × 300 — *`AGENT_CAPACITY_PER_GOV_PLANET`*
- ✅ **10 covert operations** (PRD 6.8) — *All defined with cost, risk, effect, success rate*:
  - ✅ Send Spy (reveal stats) - Low cost/risk
  - ✅ Insurgent Aid (support rebels) - Medium
  - ✅ Support Dissension (worsen civil status) - Medium
  - ✅ Demoralize Troops (reduce effectiveness) - Medium
  - ✅ Bombing Operations (destroy resources) - High
  - ✅ Relations Spying (reveal diplomacy) - Low
  - ✅ Take Hostages (demand ransom) - High
  - ✅ Carriers Sabotage (damage carriers) - Very High
  - ✅ Communications Spying (intercept messages) - Low risk
  - ✅ Setup Coup (overthrow government) - Very High
- ✅ Success/failure resolution — *`src/lib/covert/success-rate.ts`*
- ✅ Agent caught consequences — *`src/lib/game/services/covert-service.ts`*
- ✅ Covert operations UI — *`src/components/game/covert/` + `/game/covert` page*
- ✅ Covert point generation per turn — *Integrated in turn processor*
- ✅ Server actions for operations — *`src/app/actions/covert-actions.ts`*

### Test Criteria
```
✓ Covert points accumulate (5/turn, max 50)
✓ Agent capacity = Government planets × 300
✓ Can execute each of 10 operations
✓ Operations consume correct covert points
✓ Success rate based on:
  - Your agents vs target's agents
  - Target's government planets
  - Operation difficulty
  - ±20% random variance
✓ Success: Effect applies to target
✓ Failure: No effect
✓ Agent caught: Lose agent, target notified
✓ Send Spy reveals target's military composition
✓ Demoralize Troops reduces target effectiveness
✓ Setup Coup can trigger civil collapse (rare)
```

### Database Tables
- `covert_operations`
- `agent_assignments`

### Parallel Work Completed (2024-12-24)
- **Covert Constants**: All 10 operations defined with PRD 6.8 compliance (74 tests)
  - `src/lib/covert/constants.ts` - Operation definitions, costs, risks, effects
  - `src/lib/covert/success-rate.ts` - Success rate calculation with all PRD factors
  - `src/lib/covert/index.ts` - Barrel exports
- **PRD 6.8 Success Rate Factors Implemented**:
  - Your agent count vs target's agent count
  - Target's Government planet count
  - Operation difficulty (risk level)
  - ±20% random variance

---

## MILESTONE 7: Market & Diplomacy (Basic)

**Duration**: 2 days
**Dependency**: M6.5
**Testable**: Yes

### Deliverables
- Global market (buy/sell resources)
- Dynamic pricing based on supply/demand
- Price range: 0.4× to 1.6× base price
- NAP (Non-Aggression Pact) treaty system
- Alliance treaty system
- Treaty UI (propose/accept/reject)
- Treaty enforcement (can't attack treaty partner)
- Treaty breaking penalties (reputation)

### Test Criteria
```
✓ Can buy resources at market price
✓ Can sell resources at market price
✓ Prices change based on supply/demand:
  - High demand → price increases
  - High supply → price decreases
✓ Price stays within 0.4× to 1.6× base
✓ Can propose NAP to bot empire
✓ Can propose Alliance to bot empire
✓ Bot can accept or reject (random for now)
✓ Cannot attack empire with active NAP
✓ Cannot attack empire with active Alliance
✓ Breaking treaty incurs reputation penalty
✓ Bots remember broken treaties (basic grudge)
```

### Database Tables
- `market_prices`
- `market_orders`
- `treaties`
- `reputation_log`

---

## MILESTONE 8: Bot Personas & Messages

**Duration**: 4 days
**Dependency**: M7
**Testable**: Yes

### Deliverables
- ✅ 100 bot persona definitions (names, voices, archetypes)
- ✅ Template message library (30-45 templates per persona) - 6 complete, 94 remaining
- Message UI (inbox with read/unread)
- Bot message triggers:
  - Greeting (first contact)
  - Threat (before attack)
  - Victory (after winning battle)
  - Defeat (after losing battle)
  - Trade offer
  - Alliance proposal
  - Treaty broken
  - Covert operation detected
- Direct + Broadcast channels
- Galactic News feed (broadcasts)

### Test Criteria
```
✓ Each of 100 bots has unique name
✓ Each bot has assigned archetype
✓ Bots send contextual messages on triggers
✓ Messages use templates appropriate to persona
✓ Same template not repeated twice in a row
✓ Player receives messages in inbox
✓ Unread message indicator works
✓ Broadcast messages visible in "Galactic News"
✓ Covert detection triggers threatening message
✓ Treaty break triggers angry message
```

### Data Files
- `data/personas.json` ✅ **Pre-created (2024-12-24)** (100 bot definitions)
- `data/templates/*.json` ✅ **Pre-created (2024-12-24)** (message templates by category)

**Note:** Persona definitions and comprehensive message templates for key personas created ahead of schedule as parallel work during M1. Templates include:
- All 100 unique bot personas with distinct voices, quirks, and catchphrases
- Full template sets (15 categories, 30-45 messages each) for 6 flagship personas:
  - Merlin Starborn (Space Wizard - Tech Rush)
  - Count Dravos (Vampire Lord - Schemer)
  - Captain Redmaw (Space Pirate - Blitzkrieg)
  - CEO Synergy (Corporate - Merchant)
  - Collective One (Hive Mind - Schemer)
  - Emissary Thalen (Philosopher - Diplomat)
- Template structure established for remaining 94 personas

---

## MILESTONE 9: Bot Decision Trees (Tier 3)

**Duration**: 3 days
**Dependency**: M8
**Testable**: Yes

### Deliverables
- Upgrade 40 bots to Tier 3 (decision trees)
- 8 archetype behavior implementations (PRD 7.6):
  - **Warlord**: 70% military, demands tribute, War Economy passive
  - **Diplomat**: Alliance-seeking, Trade Network passive
  - **Merchant**: Economic focus, Market Insight passive
  - **Schemer**: False alliances, Shadow Network passive
  - **Turtle**: Heavy defense, Fortification Expert passive
  - **Blitzkrieg**: Early aggression
  - **Tech Rush**: Research priority
  - **Opportunist**: Attacks weakened players
- Improved target selection (not random)
- Multi-turn planning (basic)
- **Tell system** (PRD 7.10): Behavior hints at archetype

### Test Criteria
```
✓ Warlord bots:
  - Prioritize military spending (70%)
  - Attack empires with <50% their power
  - Send threatening messages
  - -20% military cost when at war
✓ Diplomat bots:
  - Propose NAPs proactively
  - Only attack as part of alliance
  - Send friendly messages
  - +10% income per alliance
✓ Merchant bots:
  - Buy low, sell high on market
  - Invest in economy
  - See next turn's market prices
✓ Schemer bots:
  - Form alliances then betray
  - -50% agent cost, +20% covert success
✓ Player can infer archetype from behavior (not told directly)
✓ Bots make coherent multi-turn plans
✓ Archetypes telegraph intentions at different rates (30%-90%)
```

---

## MILESTONE 10: Emotional States & Memory

**Duration**: 3 days
**Dependency**: M9
**Testable**: Yes

### Deliverables
- 6 emotional states with mechanical effects (PRD 7.8):
  - Confident: +5% decisions, +10% negotiation
  - Arrogant: -15% decisions, +30% aggression
  - Desperate: +40% alliance-seeking
  - Vengeful: +40% aggression, -40% negotiation
  - Fearful: -30% aggression, +50% alliance-seeking
  - Triumphant: +20% aggression
- Weighted relationship memory system (PRD 7.9)
- Decay resistance for major events
- Permanent scars (20% of negative events)
- Emotion-influenced decision making
- Emotion intensity (0.0 - 1.0)

### Test Criteria
```
✓ Capturing planet creates high-weight memory (80)
✓ Saving ally creates high-weight memory (90)
✓ Trade creates low-weight memory (10)
✓ Messages create very-low-weight memory (1)
✓ High-weight memories persist for 50+ turns
✓ Low-weight memories fade within 10 turns
✓ 20% of negative events become permanent scars
✓ Vengeful state increases aggression by 40%
✓ Fearful state increases alliance-seeking by 50%
✓ Bot behavior visibly changes based on emotional state
✓ Emotional intensity scales effects
✓ Player can infer emotion from message tone
```

### Database Tables
- `bot_memories`
- `bot_emotional_states`

---

## MILESTONE 11: Mid-Game Systems

**Duration**: 3 days
**Dependency**: M10
**Testable**: Yes
**Gate**: v0.6 Complete

### Deliverables
- Progressive unlock system (PRD 11.1):
  - Turn 10: Diplomacy basics
  - Turn 20: Coalitions
  - Turn 30: Black Market
  - Turn 50: Advanced ships
  - Turn 75: Coalition warfare
  - Turn 100: Superweapons (Nuclear)
  - Turn 150: Endgame ultimatums
- Galactic events (PRD 11.2):
  - Economic: Market crash, resource boom
  - Political: Coup, assassination
  - Military: Pirate armada, arms race
  - Narrative: Lore drops, prophecies
- Alliance checkpoints (PRD 11.3): Every 30 turns
- Market manipulation consequences (PRD 11.4)
- Coalition system (group alliances)
- **Nuclear warfare** (Turn 100+):
  - 500M credits from Black Market
  - 40% population damage
  - Detection chance
- 3 additional victory conditions:
  - Diplomatic: Coalition controls 50%
  - Research: Complete all 8 levels
  - Military: 2× military of all others

### Test Criteria
```
✓ Features locked until correct turn
✓ UI shows "Unlocks at Turn X" for locked features
✓ Galactic events occur every 10-20 turns
✓ Event types: Economic, Political, Military, Narrative
✓ Alliance checkpoint at turns 30, 60, 90, 120, 150, 180
✓ Checkpoint evaluates top 3 alliances
✓ Imbalance triggers rebalancing event
✓ Market hoarding (>40%) triggers consequences
✓ Coalitions can form (group of alliances)
✓ Cannot attack coalition members
✓ Nuclear weapon available after Turn 100
✓ Nuclear strike deals 40% population damage
✓ All 6 victory conditions functional
```

---

## MILESTONE 12: LLM Bots (Tier 1)

**Duration**: 4 days
**Dependency**: M11
**Testable**: Yes
**Gate**: v0.7 Alpha

### Deliverables
- Upgrade 10 bots to Tier 1 (LLM-powered)
- OpenAI-compatible provider abstraction
- Provider failover chain (Groq → Together → OpenAI)
- Async LLM processing (compute next turn's decisions)
- Natural language message generation
- Context-aware strategic decisions
- Rate limiting:
  - 5,000 calls per game
  - 50 calls per turn
  - 500 calls per hour
  - $50/day spending cap
- Cost tracking and alerts
- Graceful fallback to Tier 2

### Test Criteria
```
✓ LLM bots generate natural language messages
✓ Messages are contextually appropriate
✓ Messages reflect bot's archetype and emotional state
✓ Provider failover works when primary unavailable
✓ Async processing doesn't block turn completion
✓ Turn processing still <2 seconds with LLM bots
✓ Rate limits enforced correctly
✓ Cost tracking logs all API calls
✓ Alert triggers at 80% of daily budget
✓ Fallback to Tier 2 on LLM failure
```

### Technical Notes
- Use Vercel AI SDK for provider abstraction
- LLM decisions computed for NEXT turn while current turn resolves
- Fallback to Tier 2 logic if LLM timeout/failure

---

## Post-Milestone Phases

### v0.8 Polish (After M12)

**Core Polish:**
- Full LCARS UI implementation
- Galaxy map visualization with react-konva
- Tech tree visualization
- Statistics dashboard
- Accessibility features (high contrast, screen reader, keyboard nav)

**New Player Experience:**
- Learn to Play tutorial scenario
- Commander's Codex (progressive documentation)
- Contextual tooltips on all UI elements
- First 5 minutes onboarding flow

**Beta Features:**
- Hall of Fame system (persistent scores, fastest victories)
- Sound design:
  - UI interaction sounds
  - Turn end chime
  - Combat alerts
  - Ambient space atmosphere
  - Victory/defeat fanfares
- LLM-generated epilogues

**Deliverable**: Deployable game ready for public beta

### v1.0 Multiplayer (Future)
- Async turn-based multiplayer
- Player matchmaking
- Spectator mode
- Replay system
- Achievements
- Leaderboards

---

## PRD Coverage Matrix

Verification that all PRD v1.2 sections are covered:

| PRD Section | Milestone(s) | Status |
|-------------|--------------|--------|
| 4.1 Primary Resources | M1, M2 | ✅ |
| 4.2 Research Points | M3 | ✅ |
| 4.3 Resource Balance | M2 | ✅ |
| 4.4 Civil Status | M2 | ✅ |
| 4.5 Networth | M1, M6 | ✅ |
| 5.1-5.3 Planets | M1, M3 | ✅ |
| 6.1 Unit Types | M3 | ✅ |
| 6.2 Combat Mechanics | M4 | ✅ |
| 6.3 Combat Types | M4, M11 | ✅ |
| 6.4 Retreat/Reinforcements | M4 | ✅ |
| 6.5 Army Effectiveness | M4 | ✅ |
| 6.6 Attack Restrictions | M5, M7 | ✅ |
| 6.7 Unit Effectiveness Matrix | M4 | ✅ |
| 6.8 Covert Operations | M6.5 | ✅ |
| 7.1-7.5 Bot Tiers | M5, M8-M12 | ✅ |
| 7.6 Archetypes | M9 | ✅ |
| 7.7 Persona System | M8 | ✅ |
| 7.8 Emotional States | M10 | ✅ |
| 7.9 Relationship Memory | M10 | ✅ |
| 7.10 Tell System | M9 | ✅ |
| 8.1-8.4 Diplomacy | M7, M8, M11 | ✅ |
| 9.1-9.3 Research | M3 | ✅ |
| 10.1 Victory Conditions | M6, M11 | ✅ |
| 10.2 Edge Cases | M6, M11 | ✅ |
| 10.3 Custom Scenario | v0.8+ | ✅ |
| 10.4 Difficulty | M5 | ✅ |
| 11.1 Progressive Unlocks | M11 | ✅ |
| 11.2 Galactic Events | M11 | ✅ |
| 11.3 Alliance Checkpoints | M11 | ✅ |
| 11.4 Market Consequences | M11 | ✅ |
| 12.1 Protection Period | M5 | ✅ |
| 12.2 Commander's Codex | v0.8 | ✅ |
| 12.3 Tutorial | v0.8 | ✅ |
| 12.4 Tooltips | v0.8 | ✅ |
| 12.5 First 5 Minutes | v0.8 | ✅ |
| Beta: Hall of Fame | v0.8 | ✅ |
| Beta: Sound Design | v0.8 | ✅ |

---

## Appendix: Tech Stack Reference

```typescript
// Quick reference for implementation

// Database
import { db } from '@/db';
import { games, empires, planets, civilStatus } from '@/db/schema';

// State Management
import { useGameStore } from '@/stores/game-store';

// Turn Processing
import { processTurn } from '@/lib/turn-engine/processor';
import { calculateCivilStatus } from '@/lib/economy/civil-status';
import { calculateNetworth } from '@/lib/economy/networth';

// Combat
import { resolveBattle } from '@/lib/combat/resolver';
import { resolveSpaceCombat, resolveOrbitalCombat, resolveGroundCombat } from '@/lib/combat/phases';

// Covert
import { executeCovertOp } from '@/lib/covert/operations';

// Research
import { progressResearch, unlockUnit } from '@/lib/research/progression';

// Bot AI
import { Tier4RandomBot } from '@/lib/bots/tier4';
import { Tier3DecisionBot } from '@/lib/bots/tier3';
import { Tier1LLMBot } from '@/lib/bots/tier1';
```

---

*Document Version: 1.2*
*Last Updated: December 24, 2024*
*Related: PRD v1.2*

# X-Imperium: Milestone Build Plan

**Version:** 1.1
**Date:** December 23, 2024
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

### Deliverables
- Project scaffolding (Next.js 14, Tailwind, Drizzle)
- Database schema deployed to Supabase
- Basic routing structure
- CI/CD pipeline (build + type-check)
- Performance logging scaffold

### Test Criteria
```
✓ npm run build succeeds
✓ npm run typecheck succeeds
✓ Database connection works
✓ Can CRUD a test record
✓ Vercel preview deployment works
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

### Deliverables
- Empire data model (empires, planets, resources, population)
- Dashboard screen showing empire state
- Planet list view
- Resource display (Credits, Food, Ore, Petroleum, Research Points)
- **Networth calculation and display** (PRD 4.5)
- **Population counter**
- Seed data: 1 player empire + 9 starting planets

### Test Criteria
```
✓ Can create a new game
✓ Dashboard displays correct starting resources
✓ Planet list shows 9 planets with correct types
✓ Resource calculations match PRD values:
  - 2 Food planets × 160 = 320 food/turn
  - 2 Ore planets × 112 = 224 ore/turn
  - 1 Petroleum planet = 92 petro/turn
  - 1 Tourism planet = 8,000 credits/turn
✓ Networth displays using formula:
  - Planets × 10 + Soldiers × 0.0005 + Fighters × 0.001 + ...
✓ Population count displayed
```

### Database Tables
- `games`
- `empires`
- `planets`

---

## MILESTONE 2: Turn Engine (With Civil Status)

**Duration**: 2.5 days
**Dependency**: M1
**Testable**: Yes

### Deliverables
- Turn processing pipeline (6 phases from PRD)
- Resource production per turn
- Resource consumption (maintenance)
- **Civil Status system** (PRD 4.4):
  - 8 levels: Ecstatic → Revolting
  - Income multiplier (0× to 4×)
  - Status changes based on events
- **Population mechanics**:
  - Growth per turn (if fed)
  - Consumption: 0.05 food per citizen
- "End Turn" button
- Turn counter display
- Performance logging (JSONL)

### Test Criteria
```
✓ Clicking "End Turn" increments turn counter
✓ Resources change according to planet production
✓ Planet maintenance (168 credits/planet) deducted
✓ Turn processing completes in <500ms (no bots)
✓ Performance log captures timing data
✓ Civil Status affects income:
  - Ecstatic: 4× multiplier
  - Content: 2× multiplier
  - Unhappy: 0× multiplier
✓ Population grows when food surplus exists
✓ Population consumes food (0.05/citizen/turn)
✓ Food deficit triggers civil status drop
✓ Starvation causes population loss
```

### Turn Processing Order
1. Income collection (with civil status multiplier)
2. Population update (growth/starvation)
3. Civil status evaluation
4. Market processing (sequential)
5. Bot decisions (skipped in M2)
6. Actions (covert → diplomatic → movement → combat)
7. Maintenance
8. Victory check

### Database Tables
- `civil_status_history` ✅ **Pre-created (2024-12-24)**

**Note:** Schema defined ahead of schedule as parallel work during M1.

---

## MILESTONE 3: Planet, Units & Research

**Duration**: 2.5 days
**Dependency**: M2
**Testable**: Yes

### Deliverables
- Buy/release planet actions
- Planet cost scaling: `BaseCost × (1 + OwnedPlanets × 0.05)`
- Military unit construction (all 7 types)
- Unit maintenance costs
- Build queue system
- **Research system basics** (PRD 9.1-9.3):
  - 8 fundamental research levels
  - Research points accumulation
  - Research investment UI
  - Light Cruiser unlock (requires research)
- **Unit upgrades** (3 levels per unit type)

### Test Criteria
```
✓ Can buy a new planet (credits deducted)
✓ Planet cost increases with ownership
✓ Can release planet (50% refund)
✓ Can build each unit type:
  - Soldiers (50 credits)
  - Fighters (200 credits)
  - Light Cruisers (500 credits) - requires research
  - Heavy Cruisers (1,000 credits)
  - Carriers (2,500 credits)
  - Stations (5,000 credits)
  - Covert Agents (4,090 credits)
✓ Unit maintenance deducted per turn
✓ Insufficient funds prevents purchase
✓ Research planets generate research points
✓ Can invest in fundamental research (8 levels)
✓ Research costs increase exponentially
✓ Light Cruisers locked until research level 2
✓ Unit upgrades apply stat bonuses
```

### Database Tables
- `military_units`
- `build_queue` ✅ **Pre-created (2024-12-24)**
- `research_progress` ✅ **Pre-created (2024-12-24)**
- `unit_upgrades` ✅ **Pre-created (2024-12-24)**

**Note:** Build queue, research, and upgrade schemas defined ahead of schedule as parallel work during M1.

---

## MILESTONE 4: Combat System (3 Phases)

**Duration**: 3 days
**Dependency**: M3
**Testable**: Yes

### Deliverables
- Combat power calculation (PRD 6.2 formulas)
- **Three-phase combat** (PRD 6.7):
  - Phase 1: Space Combat (Cruisers vs Cruisers)
  - Phase 2: Orbital Combat (Fighters vs Stations)
  - Phase 3: Ground Combat (Soldiers capture planets)
- **Unit Effectiveness Matrix** implementation
- Casualty calculation (15-35% dynamic)
- Attack action (invasion)
- Guerilla attack (soldiers only)
- **Retreat mechanics** (15% opportunity loss)
- Combat resolution UI
- Battle report display (phase by phase)
- Fog of war (see power, not composition)
- Army effectiveness system (0-100%)

### Test Criteria
```
✓ Attack button launches combat
✓ Combat resolves in 3 phases:
  - Space: Cruisers fight first
  - Orbital: Fighters vs Stations
  - Ground: Soldiers capture if previous phases won
✓ Unit effectiveness per phase:
  - Soldiers: High ground, high guerilla
  - Fighters: High orbital, low space
  - Stations: Medium orbital (2× on defense)
  - Cruisers: High space
✓ Combat power formula correct:
  - Diversity bonus: +15% for 4+ unit types
  - Defender advantage: × 1.2
✓ Casualties in 15-35% range based on power ratio
✓ Retreat option available (15% losses on retreat)
✓ Battle report shows all 3 phases
✓ Guerilla attack uses only soldiers
✓ Army effectiveness affects damage
✓ Victory increases effectiveness (+5-10%)
✓ Defeat decreases effectiveness (-5%)
```

### Database Tables
- `attacks` ✅ **Pre-created (2024-12-24)**
- `combat_logs` ✅ **Pre-created (2024-12-24)** (includes phase-by-phase data)

**Note:** Combat system schemas defined ahead of schedule as parallel work during M1.

---

## MILESTONE 5: Random Bots (25 Tier 4)

**Duration**: 2 days
**Dependency**: M4
**Testable**: Yes
**Gate**: First Playable Demo

### Deliverables
- Bot empire generation (25 bots)
- Random decision engine (weighted actions)
- Parallel bot processing
- Bot turn execution
- Starmap showing all empires
- **Difficulty selector** (PRD 10.4):
  - Easy: Bots make suboptimal choices
  - Normal: Balanced bot intelligence
  - Hard: Bots play optimally
  - Nightmare: Bots get resource bonuses
- 20-turn protection period enforcement

### Test Criteria
```
✓ 25 bot empires created at game start
✓ Each bot has placeholder name (e.g., "Empire Alpha", "Empire Beta")
✓ Bots take random actions each turn:
  - 35% build units
  - 20% buy planets
  - 15% attack neighbor (after turn 20)
  - 10% diplomacy
  - 10% trade
  - 10% do nothing
✓ Bot processing completes in <1.5s (parallel)
✓ Bots respect 20-turn protection (don't attack player)
✓ Bots CAN attack player after turn 20
✓ Starmap displays all 26 empires with territory
✓ Difficulty affects bot behavior:
  - Easy: 50% chance of suboptimal choice
  - Hard: Bots target weakest enemies
  - Nightmare: Bots get +25% resources
```

### Technical Notes
- Use `Promise.all()` for parallel bot processing
- Bots are silent (no messages) in this milestone
- Bot decisions are purely random, no strategy
- Difficulty stored in game settings

---

## MILESTONE 6: Victory & Persistence

**Duration**: 2 days
**Dependency**: M5
**Testable**: Yes
**Gate**: v0.5 MVP Complete

### Deliverables
- 3 victory conditions:
  - Conquest: Control 60% of territory
  - Economic: 1.5× networth of 2nd place
  - Survival: Highest score at turn 200
- Victory detection logic (uses Networth formula from M1)
- **Defeat conditions**:
  - Bankruptcy (can't pay maintenance)
  - Elimination (0 planets)
  - Civil collapse (Revolting status)
- Victory/defeat screens
- Auto-save system (ironman)
- Game resume from auto-save
- Turn 200 endgame
- **Stalemate prevention** (T180 check)

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

### Deliverables
- **Covert points system**:
  - Earn 5 points per turn
  - Maximum: 50 points
  - Operations consume points
- **Agent capacity**: Government planets × 300
- **10 covert operations** (PRD 6.8):
  - Send Spy (reveal stats) - Low cost/risk
  - Insurgent Aid (support rebels) - Medium
  - Support Dissension (worsen civil status) - Medium
  - Demoralize Troops (reduce effectiveness) - Medium
  - Bombing Operations (destroy resources) - High
  - Relations Spying (reveal diplomacy) - Low
  - Take Hostages (demand ransom) - High
  - Carriers Sabotage (damage carriers) - Very High
  - Communications Spying (intercept messages) - Medium
  - Setup Coup (overthrow government) - Very High
- Success/failure resolution
- Agent caught consequences
- Covert operations UI

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
- 100 bot persona definitions (names, voices, archetypes)
- Template message library (30-45 templates per persona)
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
- `data/personas.json` (100 bot definitions)
- `data/templates/*.json` (message templates by category)

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

*Document Version: 1.1*
*Last Updated: December 23, 2024*
*Related: PRD v1.2*

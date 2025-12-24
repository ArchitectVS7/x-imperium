# X-Imperium: Milestone Build Plan

**Version:** 1.0
**Date:** December 23, 2024
**Status:** Approved
**Related:** PRD v1.1, Review Documents

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
| 1 | Static Empire View | 2d | 3d | Can see empire |
| 2 | Turn Engine | 2d | 5d | Can end turns |
| 3 | Planet & Unit Management | 2d | 7d | Can build things |
| 4 | Combat System | 3d | 10d | Can fight |
| 5 | Random Bots | 2d | 12d | **First Playable** |
| 6 | Victory & Persistence | 2d | 14d | **v0.5 MVP** |
| 7 | Market & Diplomacy | 2d | 16d | Can trade/ally |
| 8 | Bot Personas | 4d | 20d | Bots talk |
| 9 | Bot Decision Trees | 3d | 23d | Bots think |
| 10 | Emotional States | 3d | 26d | Bots remember |
| 11 | Mid-Game Systems | 3d | 29d | **v0.6 Complete** |
| 12 | LLM Bots | 4d | 33d | **v0.7 Alpha** |

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

**Duration**: 1-2 days
**Dependency**: M0
**Testable**: Yes

### Deliverables
- Empire data model (empires, planets, resources)
- Dashboard screen showing empire state
- Planet list view
- Resource display (Credits, Food, Ore, Petroleum, Research Points)
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
```

### Database Tables
- `games`
- `empires`
- `planets`

---

## MILESTONE 2: Turn Engine (No Bots)

**Duration**: 2 days
**Dependency**: M1
**Testable**: Yes

### Deliverables
- Turn processing pipeline (6 phases from PRD)
- Resource production per turn
- Resource consumption (maintenance)
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
```

### Turn Processing Order
1. Income collection (parallel)
2. Market processing (sequential)
3. Bot decisions (skipped in M2)
4. Actions (covert → diplomatic → movement → combat)
5. Maintenance
6. Victory check

---

## MILESTONE 3: Planet & Unit Management

**Duration**: 2 days
**Dependency**: M2
**Testable**: Yes

### Deliverables
- Buy/release planet actions
- Planet cost scaling: `BaseCost × (1 + OwnedPlanets × 0.05)`
- Military unit construction (all 7 types)
- Unit maintenance costs
- Build queue system

### Test Criteria
```
✓ Can buy a new planet (credits deducted)
✓ Planet cost increases with ownership
✓ Can release planet (50% refund)
✓ Can build each unit type:
  - Soldiers (50 credits)
  - Fighters (200 credits)
  - Light Cruisers (500 credits)
  - Heavy Cruisers (1,000 credits)
  - Carriers (2,500 credits)
  - Stations (5,000 credits)
  - Covert Agents (4,090 credits)
✓ Unit maintenance deducted per turn
✓ Insufficient funds prevents purchase
```

### Database Tables
- `military_units`
- `build_queue`

---

## MILESTONE 4: Combat System (Player vs Static Target)

**Duration**: 2-3 days
**Dependency**: M3
**Testable**: Yes

### Deliverables
- Combat power calculation (PRD formulas)
- Casualty calculation (15-35% dynamic)
- Attack action (invasion)
- Combat resolution UI
- Battle report display
- Fog of war (see power, not composition)

### Test Criteria
```
✓ Attack button launches combat
✓ Combat power formula correct:
  - Fighters × 1
  - Cruisers × 4
  - Carriers × 12
  - Stations × 50 (× 2 on defense)
  - Diversity bonus: +15% for 4+ unit types
  - Defender advantage: × 1.2
✓ Casualties in 15-35% range based on power ratio
✓ Overwhelming force (<0.5 ratio) reduces casualties
✓ Bad attacks (>2 ratio) increase casualties
✓ Battle report shows phases and outcomes
✓ Units destroyed/captured correctly
```

### Database Tables
- `attacks`
- `combat_logs`

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

### Test Criteria
```
✓ 25 bot empires created at game start
✓ Each bot has placeholder name (e.g., "Empire Alpha", "Empire Beta")
✓ Bots take random actions each turn:
  - 40% build units
  - 30% buy planets
  - 20% attack neighbor
  - 10% do nothing
✓ Bot processing completes in <1.5s (parallel)
✓ Bots respect 20-turn protection (don't attack player)
✓ Bots CAN attack player after turn 20
✓ Starmap displays all 26 empires with territory
```

### Technical Notes
- Use `Promise.all()` for parallel bot processing
- Bots are silent (no messages) in this milestone
- Bot decisions are purely random, no strategy

---

## MILESTONE 6: Victory & Persistence

**Duration**: 1-2 days
**Dependency**: M5
**Testable**: Yes
**Gate**: v0.5 MVP Complete

### Deliverables
- 3 victory conditions:
  - Conquest: Control 60% of territory
  - Economic: 1.5× networth of 2nd place
  - Survival: Highest score at turn 200
- Victory detection logic
- Victory/defeat screens
- Auto-save system (ironman)
- Game resume from auto-save
- Turn 200 endgame

### Test Criteria
```
✓ Conquest victory triggers at 60% territory control
✓ Economic victory triggers at 1.5× networth
✓ Survival victory triggers at turn 200
✓ Defeat triggers on:
  - Bankruptcy (negative credits, can't pay)
  - Elimination (0 planets)
✓ Auto-save occurs every turn
✓ Can close browser and resume game
✓ No manual save/load available (ironman enforced)
✓ Victory screen shows stats and "Play Again" option
```

### Database Tables
- `game_saves` (auto-save snapshots)

---

## MILESTONE 7: Market & Diplomacy (Basic)

**Duration**: 2 days
**Dependency**: M6
**Testable**: Yes

### Deliverables
- Global market (buy/sell resources)
- Dynamic pricing based on supply/demand
- NAP (Non-Aggression Pact) treaty system
- Treaty UI (propose/accept/reject)
- Treaty enforcement (can't attack NAP partner)

### Test Criteria
```
✓ Can buy resources at market price
✓ Can sell resources at market price
✓ Prices change based on supply/demand:
  - High demand → price increases
  - High supply → price decreases
✓ Can propose NAP to bot empire
✓ Bot can accept or reject NAP (random)
✓ Cannot attack empire with active NAP
✓ Breaking NAP incurs reputation penalty
```

### Database Tables
- `market_prices`
- `market_orders`
- `treaties`

---

## MILESTONE 8: Bot Personas & Messages

**Duration**: 3-4 days
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
- Direct + Broadcast channels

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
- 3 archetype behavior implementations:
  - **Warlord**: 70% military budget, attacks weak neighbors
  - **Diplomat**: Seeks alliances, 60% economy budget
  - **Merchant**: Market manipulation, 50% research budget
- Improved target selection (not random)
- Multi-turn planning (basic)

### Test Criteria
```
✓ Warlord bots:
  - Prioritize military spending
  - Attack empires with <50% their power
  - Send threatening messages
✓ Diplomat bots:
  - Propose NAPs proactively
  - Only attack as part of alliance
  - Send friendly messages
✓ Merchant bots:
  - Buy low, sell high on market
  - Invest in research planets
  - Send transactional messages
✓ Player can infer archetype from behavior (not told directly)
✓ Bots make coherent multi-turn plans
```

---

## MILESTONE 10: Emotional States & Memory

**Duration**: 2-3 days
**Dependency**: M9
**Testable**: Yes

### Deliverables
- 6 emotional states with mechanical effects:
  - Confident, Arrogant, Desperate, Vengeful, Fearful, Triumphant
- Weighted relationship memory system
- Decay resistance for major events
- Permanent scars (20% of negative events)
- Emotion-influenced decision making

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
```

### Database Tables
- `bot_memories`
- `bot_emotional_states`

---

## MILESTONE 11: Mid-Game Systems

**Duration**: 2-3 days
**Dependency**: M10
**Testable**: Yes
**Gate**: v0.6 Complete

### Deliverables
- Progressive unlock system:
  - Turn 10: Diplomacy basics
  - Turn 20: Coalitions
  - Turn 30: Black Market
  - Turn 50: Advanced ships
  - Turn 75: Coalition warfare
  - Turn 100: Superweapons
  - Turn 150: Endgame ultimatums
- Galactic events (10-20 turn intervals)
- Alliance checkpoints (every 30 turns)
- 20-turn protection period enforcement

### Test Criteria
```
✓ Features locked until correct turn
✓ UI shows "Unlocks at Turn X" for locked features
✓ Galactic events occur semi-randomly
✓ Event types: Economic, Political, Military, Narrative
✓ Alliance checkpoint at turns 30, 60, 90, 120, 150, 180
✓ Checkpoint evaluates top 3 alliances
✓ Imbalance triggers rebalancing event
✓ Player protected from bot attacks for 20 turns
✓ Turn 21 message: "Protection has expired"
```

---

## MILESTONE 12: LLM Bots (Tier 1)

**Duration**: 3-4 days
**Dependency**: M11
**Testable**: Yes
**Gate**: v0.7 Alpha

### Deliverables
- Upgrade 10 bots to Tier 1 (LLM-powered)
- OpenAI-compatible provider abstraction
- Provider failover chain (Groq → Together → OpenAI)
- Async LLM processing (compute next turn's decisions)
- Rate limiting:
  - 5,000 calls per game
  - 50 calls per turn
  - 500 calls per hour
  - $50/day spending cap
- Cost tracking and alerts

### Test Criteria
```
✓ LLM bots generate natural language messages
✓ Messages are contextually appropriate
✓ Provider failover works when primary unavailable
✓ Async processing doesn't block turn completion
✓ Turn processing still <2 seconds with LLM bots
✓ Rate limits enforced correctly
✓ Cost tracking logs all API calls
✓ Alert triggers at 80% of daily budget
```

### Technical Notes
- Use Vercel AI SDK for provider abstraction
- LLM decisions computed for NEXT turn while current turn resolves
- Fallback to Tier 2 logic if LLM timeout/failure

---

## Post-Milestone Phases

### v0.8 Polish (After M12)
- Full LCARS UI implementation
- Galaxy map visualization with react-konva
- Tech tree visualization
- Learn to Play tutorial
- LLM-generated epilogues
- Statistics dashboard
- Accessibility features

### v1.0 Multiplayer (Future)
- Async turn-based multiplayer
- Player matchmaking
- Spectator mode
- Replay system
- Achievements
- Leaderboards

---

## Appendix: Tech Stack Reference

```typescript
// Quick reference for implementation

// Database
import { db } from '@/db';
import { games, empires, planets } from '@/db/schema';

// State Management
import { useGameStore } from '@/stores/game-store';

// Turn Processing
import { processTurn } from '@/lib/turn-engine/processor';

// Combat
import { resolveBattle } from '@/lib/combat/resolver';

// Bot AI
import { Tier4RandomBot } from '@/lib/bots/tier4';
import { Tier3DecisionBot } from '@/lib/bots/tier3';
import { Tier1LLMBot } from '@/lib/bots/tier1';
```

---

*Document Version: 1.0*
*Last Updated: December 23, 2024*
*Related: PRD v1.1*

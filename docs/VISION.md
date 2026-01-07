# Nexus Dominion: Game Vision Document

**Version**: 2.0
**Date**: 2025-12-30
**Status**: Active - Post-Redesign Evaluation
**Last Updated**: 2025-12-30

---

## Executive Summary

**Nexus Dominion** is a **1-2 hour single-player space empire strategy game** inspired by the classic Solar Realms Elite (1990) BBS game. It features **100 AI bot opponents** with distinct personalities, **sector-based strategic geography**, and a **Star Trek LCARS-inspired interface** designed to be accessible to new players while offering depth for veterans.

### Core Experience

> "Command your empire from the bridge of your flagship. Consolidate your sector, expand through borders and wormholes, form coalitions against rising threats, and achieve victory through military conquest, economic dominance, or diplomatic mastery."

### What Makes This Special

1. **Geographic Strategy** - Galaxy divided into 10 sectors creates meaningful expansion paths
2. **100 Unique Opponents** - Bot personas with emotional states and memory
3. **Progressive Complexity** - Onboarding system teaches as you play (Turn 1-5: sectors, 6-15: borders, 16-30: wormholes, 31+: galaxy-wide strategy)
4. **Anti-Snowball Design** - Coalition mechanics and reverse turn order prevent runaway victories
5. **Command Center UI** - Starmap is your hub for all game actions

---

## Game Philosophy

### The MMO Experience (Single Player)

> **"Crusader Kings meets Eve Online, simulated."**

Nexus Dominion isn't "Solar Realms with 100 AI players" - it's a **simulated MMO galaxy** designed for solo play:

- **Bots fight bots** - Natural selection occurs. 100 empires become 80, then 60, then fewer.
- **Emergent bosses** - Victors accumulate power. A bot that eliminated 5 others IS the boss, organically.
- **Player fights ~10-15** - At any time, only your neighbors matter. Not the whole galaxy.
- **Coalitions are raids** - Defeating an emergent boss requires coordination, like MMO raids against dungeon bosses.
- **Sessions are chapters** - A 100-empire campaign spans multiple 1-2 hour sessions, each a chapter in your story.
- **Neighbors are characters** - Your 5-10 neighbors become personalities you know, with history and rivalries.

**Target audience**: Single-player enthusiasts who want a rich, deep experience without being steamrolled by power gamers in multiplayer. The game delivers MMO-style emergent drama in a controlled, fair environment.

### Design Principles

1. **"Every game is someone's first game"** (Stan Lee / Mark Rosewater)
   - New players can learn in 5 minutes
   - Complexity unlocks progressively over 200 turns
   - Tutorial is required but can be skipped on replay

2. **"Geography creates strategy"**
   - Sectors are neighborhoods, borders are roads, wormholes are highways
   - 10 regions = manageable cognitive load
   - Expansion has direction and purpose

3. **"Consequence over limits"**
   - No hard caps - game responds to player behavior
   - Leader hits 7 VP → automatic coalition forms
   - Weak empires move first (catchup mechanics)

4. **"Clarity through constraints"**
   - 100 empires exist, but only ~10 are relevant at once
   - Fewer systems, deeper interactions
   - Every feature must earn its place

5. **"Foundation before complexity"**
   - Combat must work before adding covert ops
   - Balance before variety
   - Elegance before feature creep

6. **"Natural selection is the content"**
   - Don't script bosses - let them emerge from bot-vs-bot conflict
   - A bot that won 5 battles IS the boss, with all the power that implies
   - The drama comes from organic gameplay, not authored scenarios

---

## Core Systems

### 1. Combat System (Redesigned)

**Problem Identified**: Sequential 3-phase combat (space → orbital → ground) resulted in 1.2% attacker win rate and 0 eliminations in testing.

**Solution**: Unified combat resolution with multiple outcomes.

#### Combat Resolution

```typescript
// Single unified combat roll
function resolveCombat(attacker: Forces, defender: Forces): CombatOutcome {
  const attackerPower = calculateCombatPower(attacker);
  const defenderPower = calculateCombatPower(defender) * 1.5; // Defender advantage

  const roll = rollD20(); // 1-20
  const modifier = (attackerPower - defenderPower) / 100;
  const result = roll + modifier;

  if (result >= 18) return 'total_victory';      // 40% sectors, enemy routed
  if (result >= 14) return 'victory';            // 25% sectors captured
  if (result >= 10) return 'costly_victory';     // 15% sectors, both lose units
  if (result >= 6)  return 'stalemate';          // No capture, both lose units
  if (result >= 2)  return 'repelled';           // Attacker retreats, loses units
  return 'disaster';                             // Attacker routed, loses 2× units
}
```

#### Key Changes

- **Single roll** replaces sequential phases (space/orbital/ground)
- **Defender advantage**: 1.5× multiplier (respects "ground war is hardest" philosophy)
- **Multiple outcomes**: Not just win/lose - drama through variety
- **Target win rate**: 40-50% with equal forces (attacker must be stronger OR lucky)
- **Faster eliminations**: Combined with 5 starting sectors (down from 9)

#### Design Rationale

The original "ground war is hardest" philosophy is preserved through:
- Massive defender advantage (1.5× power multiplier)
- Costly victories showing attrition (both sides lose units)
- Stalemates representing grinding warfare
- Rare but devastating disasters

D-Day wasn't "win air superiority, THEN naval battle, THEN beach landing" - it was a **unified operation** where all elements contributed simultaneously. Our combat reflects this.

---

### 2. Sector-Based Galaxy (Concept 2: Regional Cluster Map)

**Problem Identified**: 100 empires with "attack anyone" = cognitive overload, no strategic positioning.

**Solution**: Galaxy divided into 10 sectors, creating regional strategy.

#### Sector Structure

```
Galaxy = 10 Sectors
Each Sector = 8-10 Empires
Player starts in 1 sector with ~9 neighbors

Turn 1-20:    Focus on your sector (consolidate)
Turn 21-40:   Expand to adjacent sectors (borders)
Turn 41-60:   Build wormholes to distant sectors
Turn 61-200:  Multi-sector empire management
```

#### Attack Accessibility

- **Same Sector**: Can attack freely (normal cost)
- **Adjacent Sector (via border)**: Requires border discovery (1.2× attack cost)
- **Distant Sector (via wormhole)**: Requires wormhole construction (1.5× attack cost)
- **Unreachable Sectors**: Cannot attack (no connection)

#### Sector Balancing

At game setup, sectors are balanced for fairness:
- Similar **total networth** per sector (±10%)
- Mix of **bot tiers** (1-2 Tier 2, 6-7 Tier 3, 1-2 Tier 4)
- Similar **resource availability**
- **No luck-based advantages** - skill determines victory

#### Wormhole System

**Construction Requirements**:
- Cost: 15,000-40,000 credits + 300-800 petroleum
- Time: 6-15 turns (multi-turn construction queue)
- Unlock: Research Level 4+ (discovered around Turn 15-20)

**Slot Limits** (prevents late-game sector collapse):
- Base: 2 wormholes per empire
- Research Level 6: +1 slot
- Research Level 8: +1 slot
- Maximum: 4 wormholes per empire

**Strategic Value**:
- Instant access to distant high-value sectors (Core Worlds, Mining Belt)
- Bypass crowded borders
- Create surprise attack vectors
- Expensive investment = meaningful choice

---

### 3. Coalition & Anti-Snowball Mechanics

**Problem Identified**: Strong empires steamroll with no counter-pressure. Leaders become unstoppable.

**Solution**: Automatic coalition mechanics and reverse turn order.

#### Automatic Coalition Bonuses

```typescript
// When any empire reaches 7+ Victory Points
if (empire.victoryPoints >= 7) {
  // ALL other empires get automatic bonus vs leader
  const antiLeaderBonus = {
    attackPower: '+10% vs leader',
    defenseModifier: '+5% if leader attacks',
    diplomaticPenalty: 'Leaders can't form new alliances',
    marketPenalty: 'Leader pays 20% more for resources'
  };
}
```

**Why This Works**:
- Mathematical rubber-banding (no runaway victories)
- Creates dramatic reversals
- Makes games fun even when losing (you can still matter by targeting leader)
- Simulates "balance of power" politics

#### Reverse Turn Order

**Weakest empire goes first each turn**:
1. Catchup mechanic built into game flow
2. Last place gets first crack at neutral sectors
3. Last place can attack before leader consolidates
4. Used in successful board games (7 Wonders, Terraforming Mars)

```typescript
// Turn order calculation
function calculateTurnOrder(empires: Empire[]): Empire[] {
  return empires.sort((a, b) => a.victoryPoints - b.victoryPoints);
  // Lowest VP goes first
}
```

---

### 4. Starmap as Command Center

**Vision**: The starmap isn't just a visualization - it's the **bridge of your flagship**.

#### Interface Philosophy

**Star Trek LCARS Aesthetic**:
- Semi-transparent panels (see stars behind)
- Orange/peach/violet color palette
- Smooth animations (fades, slides, pulses)
- Clear information hierarchy

**Command Hub Design**:
- **Click a neighbor** → Attack/Diplomacy panel opens
- **Click your sector** → Build/Resource management
- **Click a border** → Expansion options
- **Click a wormhole** → Wormhole construction/usage
- **All game actions flow from the starmap**

#### Two-Level Zoom

**Galaxy View**:
- Shows 10 sectors as boxes
- Empire counts, status indicators
- Wormhole connections visible
- Strategic overview

**Sector View** (default):
- Shows 8-10 empires as nodes
- Full intel on neighbors
- Threat assessment panel
- Expansion options panel

---

### 5. Onboarding: The 5-Step Tutorial

**Philosophy**: "Every session is someone's first session"

#### Step 1: Welcome to Your Bridge (Turn 1)
- Introduces sector concept ("your neighborhood in space")
- Shows player's empire at center with neighbors
- Message: "Focus on your sector first"

#### Step 2: Meet Your Neighbors (Turn 1)
- Highlights 3-4 key neighbors
- Explains immediate vs distant empires
- Message: "You can attack neighbors, others come later"

#### Step 3: The Galaxy Beyond (Turn 1)
- Zooms out to show full galaxy (10 sectors)
- Player's sector highlighted
- Message: "Many sectors exist, but start small - expansion comes later"

#### Step 4: Your Command Interface (Turn 1)
- Interactive demo of starmap actions
- "Click neighbor = Attack/Diplomacy"
- "Click your empire = Build/Resources"
- Message: "Most actions start from the starmap"

#### Step 5: Take Your First Turn (Turn 1)
- Concrete advice: "Build 100 soldiers, 50 fighters"
- Recommends sending friendly message to neighbor
- Message: "Build, Explore, Survive"
- Checkbox: [✓ Skip tutorial in future games]

#### Step 6: Your Path to Victory (NEW - P0)
```
There are 6 ways to win:
1. Conquest: Control 60% of the galaxy
2. Economic: 1.5× networth of #2
3. Research: Complete the tech tree
4. Military: 2× military of all others combined
5. Diplomatic: Your coalition controls 50% of galaxy
6. Survival: Highest score at Turn 200

Most players aim for Conquest or Economic.
Focus on growing your empire, sector by sector.
```

#### Progressive Disclosure

**Turns 1-10**: Show only basic panels (Sector Intel, Build/Research actions)
**Turns 11-20**: Add Threat Assessment + Expansion Options
**Turns 21+**: Full UI (all panels visible)

**Why**: Prevents overwhelming new players with 22 UI elements on Turn 1.

---

### 6. Victory Conditions

Six paths to victory, each supporting different playstyles:

| Victory Type | Condition | Archetype | Typical Turn |
|--------------|-----------|-----------|--------------|
| **Conquest** | Control 60% of galaxy | Warlord, Blitzkrieg | 80-120 |
| **Economic** | 1.5× networth of #2 | Merchant, Developer | 100-150 |
| **Research** | Complete tech tree | Tech Rush, Turtle | 120-180 |
| **Military** | 2× military of all others combined | Warlord | 60-100 |
| **Diplomatic** | Coalition controls 50% | Diplomat, Schemer | 100-150 |
| **Survival** | Highest score at Turn 200 | Balanced | 200 |

**Defeat Conditions**:
- All sectors lost (elimination)
- Population reaches 0 (starvation)
- Bankruptcy + civil revolt (empire collapse)
- Mathematically impossible to achieve any victory (warning given at Turn 150)

---

### 7. Bot Architecture

**100 Unique Personas** with 4 capability tiers:

#### Tier Distribution
- **Tier 1 (LLM)**: 5-10 bots (elite, natural language decisions)
- **Tier 2 (Strategic)**: 20-25 bots (decision trees based on archetype)
- **Tier 3 (Simple)**: 50-60 bots (behavioral rules)
- **Tier 4 (Random)**: 10-15 bots (weighted random, fodder)

#### 8 Archetypes
1. **Warlord** - Aggressive military expansion
2. **Diplomat** - Alliance building, peaceful growth
3. **Merchant** - Economic focus, trading
4. **Schemer** - Covert operations, betrayals
5. **Turtle** - Heavy defense, tech development
6. **Blitzkrieg** - Early aggression, fast strikes
7. **Tech Rush** - Research priority, late-game power
8. **Opportunist** - Vulture, attacks weakened empires

#### Emotional States
Bots have moods that affect decisions:
- Confident → More aggressive
- Fearful → Defensive posture
- Vengeful → Targets specific empire
- Ambitious → Expansion focused
- Cautious → Risk-averse

#### Memory System
Bots remember interactions with decay:
- Attacks (strong memory, slow decay)
- Betrayals (very strong memory)
- Trade deals (moderate memory)
- Messages (weak memory, fast decay)

**Why This Matters**: Creates persistent rivalries and relationships without hard-coding alliances.

---

### 8. Resource System

Four primary resources + Research Points:

| Resource | Source | Primary Use | Scarcity |
|----------|--------|-------------|----------|
| **Credits** | Tourism sectors, taxes | Buying, maintenance | Common |
| **Food** | Food sectors | Population, soldiers | Critical |
| **Ore** | Ore sectors | Military maintenance | Moderate |
| **Petroleum** | Petroleum sectors | Military fuel, wormholes | Scarce |
| **Research Points** | Research/Urban sectors | Tech advancement | Investment |

#### Resource Balance
- **Food/Military Balance**: More military = more food needed
- **Population Growth**: Requires surplus food
- **Starvation**: Negative food → population death
- **Civil Status**: Affected by shortages (8 levels: Ecstatic → Revolting)

#### Crafting System (Under Evaluation)
4-tier resource transformation:
- Tier 0: Base resources
- Tier 1: Refined (metals, fuel cells, polymers)
- Tier 2: Components (electronics, armor, weapons)
- Tier 3: Advanced systems (reactor cores, shields, warp drives)

**Status**: Implemented, but evaluating if it creates strategic depth or busywork.

---

### 9. Sector System

**Starting Sectors**: 5 (down from 9 for faster eliminations)

#### Sector Types
- **Food Sectors**: High food production
- **Ore Sectors**: High ore production
- **Petroleum Sectors**: High petroleum production
- **Tourism Sectors**: High credit generation
- **Urban Sectors**: High population capacity, research point generation
- **Government Sectors**: Reduces civil unrest
- **Research Sectors**: Bonus research points

#### Sector Acquisition
- **Buy**: Costs increase exponentially (1000, 2000, 4000, 8000...)
- **Capture**: Through successful attacks (15-40% per victory)
- **Release**: Sell back to neutral (70% of purchase price)

---

### 10. Diplomacy System

**Treaties**:
- **Non-Aggression Pact (NAP)**: Cannot attack each other
- **Alliance**: Cannot attack, share intel, trade bonuses
- **Trade Agreement**: Market price reductions

**Coalition Mechanics**:
- Form when leader reaches 7+ VP (automatic)
- All non-leaders get bonuses vs leader
- Leader cannot form new alliances (diplomatic penalty)

**Reputation System**:
- Attack without provocation: -10 reputation
- Break treaty: -25 reputation
- Help weak empire: +5 reputation
- Fulfil trade agreements: +2 reputation

**Why Reputation Matters**:
- Low reputation = harder to form treaties
- Low reputation = bots target you more
- High reputation = bots offer beneficial deals

---

### 11. Tech Stack & Performance

#### Technology
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle
- **Styling**: Tailwind CSS + LCARS custom theme
- **Testing**: Vitest (unit), Playwright (E2E)

#### Architecture Principles
1. **Unified Actor Model**: Bots and players identical in turn pipeline
2. **Server Actions**: All database writes through validated actions
3. **Pure Functions**: Services are testable, side-effect-free
4. **Progressive Enhancement**: Works without JavaScript (forms)

#### Performance Targets
- Turn processing: < 2 seconds (100 bots)
- Starmap sector view: 60 FPS
- Starmap galaxy view: 30+ FPS
- Combat resolution: < 100ms per battle

---

## Turn Processing Architecture

The turn system uses a hybrid parallel/sequential execution model that provides 10× performance improvement while maintaining strategic depth and game balance.

### 6-Phase Turn Structure

```
Phase 1: Income Generation          [PARALLEL]  ⚡ All empires simultaneously
Phase 2: Build Queue Processing     [PARALLEL]  ⚡ All empires simultaneously
Phase 3: Bot Planning               [PARALLEL]  ⚡ Bots decide while player thinks
Phase 4: Diplomacy Resolution       [SEQUENTIAL] 🔄 Order-dependent
Phase 5: Covert Operations          [SEQUENTIAL] 🔄 Order-dependent
Phase 6: Combat Resolution          [SEQUENTIAL] 🔄 Weak-first initiative
```

### Parallel Phases (1-3): Maximum Performance

**Income & Build** execute for all empires concurrently because:
- No inter-empire dependencies (your income doesn't affect mine)
- Pure calculation (no strategic decisions needed)
- Database writes can be batched
- Result: **5× speedup** for resource-heavy operations

**Bot Planning** happens while the player is thinking:
- Bots calculate decisions asynchronously during player's turn
- By the time player submits, bot decisions are pre-computed
- Player experiences **instant** turn submission
- Result: **Perceived 0-second wait time**

### Sequential Phases (4-6): Strategic Integrity

**Diplomacy, Covert, Combat** must execute in order because:
- Outcomes affect subsequent actions (treaty broken → enables attack)
- Player strategy depends on order (knowing who attacks first matters)
- Balance requires fairness (weak-first initiative prevents oscillation)

### Weak-First Initiative (Combat Only)

Combat resolution sorts empires by **networth ascending**:
- Weakest empire attacks first, strongest attacks last
- Prevents "rich get richer" oscillation
- Gives underdogs first strike advantage
- **Only applies to Combat phase** (not income, build, or planning)

Example turn with 5 empires:
```
1. Income/Build    → [E1, E2, E3, E4, E5] process in parallel
2. Bot Planning    → [Bot2, Bot3, Bot4] plan while Player E1 thinks
3. Diplomacy       → [E1, E2, E3, E4, E5] resolve in player submission order
4. Combat          → [E5, E3, E1, E4, E2] sorted by networth (weakest first)
   - E5 (networth 12k) attacks → resolves
   - E3 (networth 15k) attacks → resolves
   - E1 (networth 18k) attacks → resolves
   - E4 (networth 22k) attacks → resolves
   - E2 (networth 30k) attacks → resolves
```

### Performance Impact

**Before**: Sequential processing for all phases
- 100 empires × 50ms per empire = 5 seconds per turn
- Player wait time: 5+ seconds (visible loading spinner)

**After**: Parallel for income/build/planning, sequential for strategy
- Phases 1-3: 50ms (parallel batching)
- Phases 4-6: 400ms (sequential for ~8 active players on average)
- Player wait time: **~500ms** (feels instant)

**Result**: 10× perceived performance improvement without sacrificing strategic depth.

### Implementation

Parallel turn processing is implemented in:
- `src/lib/turn/turn-processor.ts` - Phase orchestration
- `src/lib/bots/bot-processor.ts` - Parallel bot planning
- `src/lib/game/services/resource-engine.ts` - Batched income calculations
- `src/lib/game/services/build-queue-service.ts` - Parallel construction

Combat weak-first initiative:
```typescript
// From turn-processor.ts Phase 6
const empiresInCombat = attacks.map(a => a.attackerId);
const empiresWithNetworth = await getEmpireNetworths(empiresInCombat);
const sortedByNetworth = empiresWithNetworth.sort((a, b) => a.networth - b.networth);

for (const empire of sortedByNetworth) {
  const attack = attacks.find(a => a.attackerId === empire.id);
  await resolveCombat(attack); // Weakest attacks first
}
```

This architecture allows the game to scale to 100+ bots while maintaining the strategic depth of order-dependent combat and the responsiveness of instant turn submission.

---

## What's Different from Original SRE

### Improvements

1. **Strategic Geography** - SRE had no regions, just a flat list of 100 players
2. **Combat Balance** - SRE had functional combat, ours needed redesign
3. **Onboarding** - SRE assumed BBS familiarity, we teach as you play
4. **Anti-Snowball** - SRE had sophisticated gang-up code, we formalized it
5. **Visual Design** - SRE was text only, we have LCARS-styled modern UI
6. **Single Player** - SRE was multiplayer only, we're designed for solo play

### What We Kept

1. **100 Empires** - Core SRE appeal (massive galaxy)
2. **Turn-Based** - No real-time stress
3. **Bot Personalities** - SRE had distinct bot behaviors
4. **6 Victory Paths** - Multiple ways to win
5. **Economic Complexity** - Resource management matters
6. **4X Gameplay** - Explore, Expand, Exploit, Exterminate

### What We Changed

1. **Session Length** - Weeks → 1-2 hours
2. **Geography** - None → 10 sectors with borders/wormholes
3. **Combat** - Sequential phases → Unified resolution
4. **Balance** - Player-focused → Coalition-enforced
5. **UI** - Text menus → Visual command center

---

## Development Status

### Implemented ✅
- Core turn processing (6 phases with parallel/sequential execution)
- **Unified combat system** (`unified-combat.ts` - 42% win rate equal forces, 61% strong attacker, 31% weak attacker)
- **Sector-based galaxy generation** (`game-repository.ts` - 10 sectors, empire assignments, wormhole connections)
- **Wormhole processing** (`turn-processor.ts` Phase 7.7 - discovery, collapse, stabilization)
- **Coalition mechanics** (automatic anti-leader bonuses at 7+ VP)
- **Parallel turn architecture** (Income/Build/Planning parallel, Combat/Diplomacy/Covert sequential)
- Resource engine & population system
- Bot architecture (4 tiers, 8 archetypes)
- Emotional states & memory
- Crafting system (4 tiers)
- Market & trading
- Diplomacy (treaties, coalitions)
- Research & tech tree
- Covert operations (10 types)
- Galactic events
- Victory conditions

### In Progress 🚧
- None currently

### Planned 📋

**Phase 1: Starmap Visualization** (Weeks 1-2) — Concept 2 Implementation
- Galaxy View & Sector View UI (force-directed to static sectors)
- LCARS panel system (semi-transparent overlays, Star Trek aesthetic)
- Wormhole visualization (pulsing connections, discovery states)
- Sector overview panel (empire list, resources, threats)
- Attack validation UI (sector accessibility indicators)
- Sphere of influence rendering

**Phase 2: Onboarding System** (Week 3)
- 5-step tutorial system (required first game, skippable on replay)
- Step 1: Welcome to Your Bridge (home sector orientation)
- Step 2: Meet Your Neighbors (intel system, diplomacy basics)
- Step 3: The Galaxy Beyond (wormholes, expansion strategy)
- Step 4: Your Command Interface (LCARS panels, contextual help)
- Step 5: Take Your First Turn (guided actions)
- Step 6: Your Path to Victory (victory conditions explained)
- Contextual UI panels (Turn 1-10: basic, 11-20: add threats, 21+: full)

**Phase 3: Balance & Polish** (Week 4)
- Playtesting with real users
- Balance tuning (verify 40-50% attacker win rate holds)
- Sector balancing algorithm refinement (±10% networth target)
- Border discovery system polish
- Performance optimization (target 60 FPS sector view, 30 FPS galaxy view)
- Automated bot stress testing (10/25/50/100 empires)

### Under Evaluation 💭
- Archetype reduction (8 → 4)
- Civil status simplification (8 → 3)
- Crafting system strategic value
- Victory Points system (10 VP from any combination)
- Fog of war vs full information

---

## Success Metrics

### Technical
- ✅ Turn processing < 2 seconds
- 🎯 60 FPS sector view
- 🎯 30+ FPS galaxy view

### Game Balance
- 🎯 40-50% attacker win rate (equal forces)
- 🎯 3-5 eliminations per game (25 bots, 200 turns)
- 🎯 No single archetype dominates (winner variety)

### Onboarding
- 🎯 80%+ new players complete first game
- 🎯 < 5 minutes to understand sectors
- 🎯 < 3 clicks to perform first attack

### Engagement
- 🎯 60%+ reach Turn 30+ (wormhole discovery)
- 🎯 40%+ build at least one wormhole
- 🎯 70%+ understand galaxy structure (survey)

---

## Design Decisions & Rationale

### Why Unified Combat?
**Problem**: 3 sequential phases created 1.2% attacker win rate.
**Solution**: Single roll with multiple outcomes.
**Trade-off**: Lose tactical phase detail, gain playability.
**Verdict**: Combat must work before adding depth.

### Why Sectors?
**Problem**: 100 empires = cognitive overload.
**Solution**: 10 sectors of 10 empires each.
**Trade-off**: Added complexity (borders, wormholes), but creates strategy.
**Verdict**: Geography makes the game interesting.

### Why Automatic Coalitions?
**Problem**: Leaders become unstoppable.
**Solution**: Automatic bonuses vs leaders at 7+ VP.
**Trade-off**: Reduces player agency (can't always ally with leader), creates balance.
**Verdict**: Fun > realism. Runaway victories aren't fun.

### Why 5 Starting Sectors (Not 9)?
**Problem**: 9 sectors = ~9 successful attacks to eliminate = ~900 turns at 1.2% win rate.
**Solution**: 5 sectors = ~5 successful attacks = achievable in 200 turns.
**Trade-off**: Less empire building early, but eliminations become possible.
**Verdict**: Eliminations must happen or game feels static.

### Why LCARS Aesthetic?
**Problem**: Strategy games can feel intimidating (spreadsheets, complexity).
**Solution**: Star Trek vibes = premium feel, reduces intimidation.
**Trade-off**: Takes longer to design custom UI.
**Verdict**: First impressions matter. LCARS makes this feel special.

### Why 5-Step Tutorial (Not Optional)?
**Problem**: New players quit if overwhelmed.
**Solution**: Required first game, explains progressively.
**Trade-off**: Veteran players must sit through once.
**Verdict**: "Every game is someone's first" - we optimize for newbies. Veterans can skip on replay.

---

## Core Game vs Expansion Content

### What's in the Base Game (v1.0)

**✅ Core Systems:**
- 3-tier draft-based research (War Machine / Fortress / Commerce doctrines)
- Unified D20 combat with 6 dramatic outcomes
- Sector-based galaxy (10 sectors, wormholes, borders)
- 100 AI bots with 8 archetypes and personality systems
- 6 victory conditions (Conquest, Economic, Research, Military, Diplomatic, Survival)
- Coalition mechanics and anti-snowball systems
- Covert operations (10 types)
- Diplomacy (treaties, coalitions)
- Market trading
- Map-centric UI (starmap as command center)

**✅ Military Units (Credits Only):**
- Soldiers, Fighters, Carriers, Stations, Cruisers
- All units purchasable with credits (no crafting required)
- Research unlocks unit types (War Machine → Heavy Cruisers, etc.)

### What's NOT in the Base Game

**❌ Deferred to Expansion Packs:**

**Crafting System** (`docs/expansion/CRAFTING-EXPANSION.md`)
- 4-tier resource progression (Tier 0 → Tier 3)
- Industrial Sectors and manufacturing queues
- Crafted components for advanced units
- **Why not v1.0**: Adds cognitive load, competes with core empire management

**Galactic Syndicate** (`docs/expansion/SYNDICATE-EXPANSION.md`)
- 8-level trust progression
- Contract missions (4 tiers)
- Black Market for WMDs and components
- Comeback mechanics for struggling empires
- **Why not v1.0**: Parallel progression track dilutes focus

**Alternative Vision**: See `docs/redesign-01-02-2026/` for expansion concepts with board game mechanics:
- **CRAFTING-EXPANSION-CONCEPT.md** - Tech card draft system (Lord of Waterdeep style)
- **SYNDICATE-EXPANSION-CONCEPT.md** - Hidden traitor mechanics (Betrayal at House on the Hill style)

### Expansion Strategy

**If released as DLC:**
- **"Industrial Age"** - Crafting system
- **"Shadow War"** - Syndicate with hidden traitor mechanics
- **"Complete Edition"** - Both expansions bundled

**Prerequisites**: Base game complete, player demand demonstrated, positive reviews.

---

## Future Vision (Post v1.0)

### Async Multiplayer (v2.0)
- Same turn-based mechanics
- 24-hour turn windows
- Up to 25 human players + 75 bots
- Unified Actor Model makes this seamless

### Scenario System (v1.5)
- "Start with 10 sectors" (builder mode)
- "You vs 10 warlords" (survival mode)
- "All bots are diplomats" (alliance game)
- "100-turn blitz" (fast game)

### Mod Support (v2.0)
- Custom bot personas
- Custom victory conditions
- Custom galaxy sizes
- Community-created scenarios

### Hall of Fame (v1.2)
- Track best scores across sessions
- Fastest victories
- Most eliminations
- Highest networth

---

## Appendix: Key Documents

### Design Evolution
1. **ELIMINATION-INVESTIGATION.md** - Identified 1.2% attacker win rate
2. **GAME-DESIGN-EVALUATION.md** - Analyzed 100-empire problem, proposed solutions
3. **PATH-FORWARD.md** - Honest assessment, recommended hybrid approach
4. **STARMAP-CONCEPT2-DEEP-DIVE.md** - Detailed sector system design
5. **STARMAP-CONCEPT2-REVIEWS.md** - Three independent critical reviews (8/10 average)
6. **IMPLEMENTATION-TRACKER.md** - Living status of all features

### Technical Specifications
- **PRD.md** - Product Requirements Document (v1.3)
- **MILESTONES.md** - Development phases and deliverables
- **CLAUDE.md** - Developer guidance for working with codebase

---

## Conclusion

Nexus Dominion is **not** a broken game requiring an overhaul. It's a **solid foundation** (95% architecturally sound) requiring **surgical fixes** to critical systems:

1. ✅ Combat balance (unified system)
2. ✅ Geographic strategy (sector-based galaxy)
3. ✅ Anti-snowball (coalitions, reverse turn order)
4. ✅ Onboarding (5-step tutorial)
5. ✅ Visual design (LCARS command center)

With 4-6 weeks of focused development, Nexus Dominion becomes:
- **Balanced** (40-50% attacker win rate, eliminations happen)
- **Strategic** (sectors create meaningful geography)
- **Accessible** (new players can learn in 5 minutes)
- **Replayable** (6 victory paths, 100 unique opponents, sector variety)
- **Fun** (1-2 hour sessions with dramatic moments)

**The vision is clear. The foundation is solid. The path forward is defined.**

---

*Document Maintained By*: Development Team
*Last Review*: 2025-12-30
*Next Review*: After Phase 1 implementation (unified combat system)
*Status*: **ACTIVE - PRIMARY DESIGN REFERENCE**

# Nexus Dominion: Product Requirements Document

**Version:** 1.3
**Date:** December 2024
**Status:** Draft (Crafting System Integration)
**Last Updated:** December 28, 2024

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Game Overview](#2-game-overview)
3. [Core Gameplay Loop](#3-core-gameplay-loop)
4. [Resource System](#4-resource-system)
5. [Planet System](#5-planet-system)
6. [Military System](#6-military-system)
7. [Bot AI System](#7-bot-ai-system)
8. [Diplomacy System](#8-diplomacy-system)
9. [Research System](#9-research-system)
10. [Scenario System](#10-scenario-system)
11. [Mid-Game Engagement System](#11-mid-game-engagement-system)
12. [New Player Experience](#12-new-player-experience)
13. [User Interface](#13-user-interface)
14. [Tech Stack](#14-tech-stack)
15. [Development Phases](#15-development-phases)
16. [Success Metrics](#16-success-metrics)
17. [Out of Scope](#17-out-of-scope)
18. [Manufacturing & Crafting System](#18-manufacturing--crafting-system)
19. [The Galactic Syndicate](#19-the-galactic-syndicate)

---

## 1. Executive Summary

### Product Vision

**Nexus Dominion** is a single-player turn-based space empire strategy game that revives the classic **Solar Realms Elite** (1990) BBS door game. Players compete against AI-controlled bot opponents to build the most powerful galactic empire through economic development, military conquest, research advancement, and diplomatic maneuvering.

### Target Audience

- **Primary**: Nostalgic gamers who played SRE, Trade Wars, or similar BBS games
- **Secondary**: Strategy game enthusiasts (Civilization, Master of Orion, 4X fans)
- **Tertiary**: Casual gamers seeking accessible strategy experiences

### Core Differentiator

Nexus Dominion transforms the original weeks-long multiplayer experience into a **1-2 hour single-player session** with:
- AI opponents with distinct personalities and strategies
- Instant turn processing (no waiting)
- Scenario-based victory conditions for replayability
- Modern LCARS-inspired Star Trek aesthetic

### Key Decisions

| Decision | Choice |
|----------|--------|
| Tech Stack | TypeScript + Next.js (Greenfield Build) |
| Resources | 4 (Food, Credits, Ore, Petroleum) + Research Points |
| Starting Planets | 9 |
| Bot Count | 25 (v0.5 MVP) → 100 personas (v0.6+) |
| Turn Processing | Instant (<2 seconds target) |
| Multiplayer | Single-player v1; Async multiplayer v2 |
| UI Style | Star Trek LCARS-inspired |
| Save System | Auto-save only (Ironman mode) |
| Architecture | Unified Actor Model (bots/players interchangeable) |

### Architecture Principles

1. **Unified Actor Model**: Bots and human players flow through identical turn pipeline
2. **Async-First Design**: Same codebase supports single-player and future async multiplayer
3. **Greenfield Build**: Pure TypeScript rewrite (legacy PHP was reference only)
4. **Bot Opacity**: Players cannot see bot archetype — must deduce through observation
5. **Consequence Over Limits**: Game events respond to player behavior, not hard caps
6. **Ironman Mode**: Auto-save only, no rewinding decisions

---

## 2. Game Overview

### Genre
Turn-based 4X space strategy (eXplore, eXpand, eXploit, eXterminate)

### Platform
Web application (desktop-first, responsive for tablet/mobile)

### Mode
Single-player vs AI bot opponents

### Core Experience
Players manage a galactic empire across 200 turns (configurable), making decisions about:
- Resource production and consumption
- Military recruitment and combat
- Research and technology advancement
- Diplomatic relations with bot empires
- Covert operations and espionage

### Win/Lose Conditions

Victory and defeat follow **6 clear paths** (see Section 10):

| Victory | Condition | Playstyle |
|---------|-----------|-----------|
| **Conquest** | Control 60% of territory | Aggressive expansion |
| **Economic** | 1.5× networth of 2nd place | Builder/trader |
| **Diplomatic** | Coalition controls 50% territory | Alliance politics |
| **Research** | Complete tech tree | Turtle/tech rush |
| **Military** | 2× military of all others combined | Domination |
| **Survival** | Highest score at turn 200 | Balanced play |

**Defeat Conditions**:
- Empire collapses (bankruptcy, civil revolt, elimination)
- Mathematically impossible to achieve any victory (warning given)

---

## 3. Core Gameplay Loop

```
┌─────────────────────────────────────────────────────────────┐
│                    TURN STRUCTURE                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. REVIEW PHASE                                            │
│     ├── Check resources, events, messages                   │
│     ├── Read bot communications                             │
│     └── Assess threats and opportunities                    │
│                                                             │
│  2. BUILD PHASE                                             │
│     ├── Buy/release planets                                 │
│     ├── Train military units                                │
│     ├── Invest in research                                  │
│     └── Manage production rates                             │
│                                                             │
│  3. ACTION PHASE                                            │
│     ├── Launch attacks (invasion/guerilla)                  │
│     ├── Execute covert operations                           │
│     ├── Manage diplomacy (treaties, coalitions)             │
│     └── Trade on global market                              │
│                                                             │
│  4. END TURN                                                │
│     ├── Player confirms turn end                            │
│     ├── All bots process instantly (<2s target)             │
│     ├── Resources update                                    │
│     ├── Combat resolves                                     │
│     ├── Events trigger                                      │
│     └── Next turn begins                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Turn Processing Order

```javascript
async function processTurn(gameState) {
  // PHASE 1: Income (simultaneous)
  await Promise.all(empires.map(e => e.collectIncome()));

  // PHASE 2: Market (sequential)
  gameState.market.processAllOrders();

  // PHASE 3: Bot Decisions (parallel)
  let decisions = await Promise.all(bots.map(b => b.decide()));

  // PHASE 4: Actions (sequential, order matters)
  // 4a. Covert Operations
  // 4b. Diplomatic Actions
  // 4c. Movement Orders
  // 4d. Combat Resolution

  // PHASE 5: Maintenance
  for (let empire of empires) {
    empire.payMaintenance();
    empire.checkRebellions();
  }

  // PHASE 6: Victory Check
  return gameState.checkVictoryConditions();
}
```

### Turn Timing
- **No real-world waiting**: Bots process in milliseconds
- **Performance target**: <2 seconds total turn processing
- **Turn limit**: Configurable per scenario (default: 200)
- **Expected game length**: 1-2 hours

---

## 4. Resource System

### 4.1 Primary Resources

| Resource | Description | Primary Source | Primary Use |
|----------|-------------|----------------|-------------|
| **Credits** | Currency | Tourism planets, taxes | Buying, maintenance |
| **Food** | Sustenance | Food planets | Population, soldiers |
| **Ore** | Industrial | Ore planets | Military maintenance |
| **Petroleum** | Fuel | Petroleum planets | Military fuel |

### 4.2 Research Points

- **Source**: Generated by Research planets
- **Primary Use**: Tech tree progression
- **Trading**: Can be sold on global market for credits
- **Boosts**: Can be spent for temporary buffs:
  - Combat effectiveness (+10% for 1 turn)
  - Production multiplier (+15% for 1 turn)
  - Covert success bonus (+20% for 1 turn)

### 4.3 Resource Balance

**Income** (per turn):
- Planet production
- Population taxes
- Market trading

**Expenses** (per turn):
- Planet maintenance (168 credits/planet)
- Military maintenance (per unit)
- Loan payments

**Deficit Handling**:
- Auto-purchase from market at current prices
- If can't afford: starvation, desertion, effectiveness loss
- Severe deficit: bankruptcy and empire collapse

### 4.4 Population & Civil Status

Population happiness directly affects economic output through an income multiplier:

| Status | Income Multiplier | Caused By |
|--------|-------------------|-----------|
| **Ecstatic** | 4× | Many victories, high education |
| **Happy** | 3× | Stable empire, winning wars |
| **Content** | 2× | Normal state |
| **Neutral** | 1× | Minor problems |
| **Unhappy** | 0× (no bonus) | Starvation, battle losses |
| **Angry** | Penalties | Severe problems persist |
| **Rioting** | Severe penalties | Extended problems |
| **Revolting** | Empire collapse risk | Critical failure state |

**Population Mechanics**:
- **Growth**: Population grows each turn (if fed)
- **Consumption**: Each citizen eats 0.05 food/turn
- **Housing**: Urban planets increase population cap
- **Recruitment**: Population required for military units (see Pop column in 6.1)
- **Education Planets**: Improve civil status over time

### 4.5 Networth Calculation

Networth determines rankings, victory conditions, and attack restrictions:

```
Networth = (Planets × 10)
         + (Soldiers × 0.0005)
         + (Fighters × 0.001)
         + (Stations × 0.002)
         + (Light Cruisers × 0.001)
         + (Heavy Cruisers × 0.002)
         + (Carriers × 0.005)
         + (Covert Agents × 0.001)
```

**Networth Uses**:
- Scoreboard ranking
- Economic victory condition (1.5× of 2nd place)
- Attack restrictions (can't attack much weaker empires)
- Coalition power calculation

---

## 5. Planet System

### 5.1 Starting Configuration

Players begin with **9 planets**:

| Planet Type | Count | Initial Production |
|-------------|-------|--------------------|
| Food | 2 | 320 food/turn |
| Ore | 2 | 224 ore/turn |
| Petroleum | 1 | 92 petro/turn |
| Tourism | 1 | 8,000 credits/turn |
| Urban | 1 | Population cap + 1,000 credits |
| Government | 1 | 300 covert agent capacity |
| Research | 1 | Research points |

### 5.2 Planet Types (10)

| Type | Production | Base Cost | Special Effect |
|------|------------|-----------|----------------|
| **Food** | 160 food | 8,000 | Essential sustenance |
| **Ore** | 112 ore | 6,000 | Military material |
| **Petroleum** | 92 petro | 11,500 | Creates pollution |
| **Tourism** | 8,000 credits | 8,000 | Main income |
| **Urban** | +pop cap, +1,000 cr | 8,000 | House citizens |
| **Education** | +civil status | 8,000 | Happiness |
| **Government** | +300 agents | 7,500 | Covert ops |
| **Research** | Research points | 23,000 | Tech tree |
| **Supply** | -military cost | 11,500 | Cheaper production |
| **Anti-Pollution** | -pollution | 10,500 | Offset petroleum |

### 5.3 Planet Mechanics

**Purchasing**:
- Cost increases as you own more: `BaseCost × (1 + OwnedPlanets × 0.05)`
- Unlimited purchases per turn (if affordable)

**Releasing**:
- Sell planets at 50% of current price
- Immediate effect

---

## 6. Military System

### 6.1 Unit Types (Rebalanced)

**Basic Units (Credits Only):**

| Unit | Role | Cost | Pop | Attack | Defense |
|------|------|------|-----|--------|---------|
| **Soldiers** | Ground combat | 50 | 0.2 | 1 | 1 |
| **Fighters** | Orbital combat | 200 | 0.4 | 3 | 2 |
| **Carriers** | Troop transport | 2,500 | 3.0 | 12 | 10 |
| **Generals** | Command soldiers | 1,000 | 1.0 | — | — |
| **Covert Agents** | Espionage | 500 | 1.0 | — | — |

**Tier 2 Units (Require Crafting, Research 2+):**

| Unit | Credits | Components | Research | Attack | Defense |
|------|---------|------------|----------|--------|---------|
| **Marines** | 150 | 1 Armor Plating | 2 | 2 | 2 |
| **Interceptors** | 400 | 1 Propulsion, 1 Electronics | 2 | 2 | 2 |
| **Light Cruisers** | 5,000 | 2 Armor Plating, 2 Propulsion | 2 | 10 | 20 |
| **Defense Stations** | 3,000 | 1 Armor Plating, 1 Electronics | 3 | 50 | 50 (2× on defense) |

**Tier 3 Units (Advanced Crafting, Research 4+):**

| Unit | Credits | Components | Research | Attack | Defense |
|------|---------|------------|----------|--------|---------|
| **Heavy Cruisers** | 15,000 | 3 Armor Plating, 2 Propulsion, 1 Reactor Core | 4 | 25 | 50 |
| **Battlecruisers** | 35,000 | 3 WG Alloy, 2 Reactor Cores, 2 Shield Generators | 5 | 40 | 80 |

**Tier 4 Units (Capital Assets, Research 6+):**

| Unit | Credits | Components | Research | Attack | Defense |
|------|---------|------------|----------|--------|---------|
| **Dreadnought** | 80,000 | 3 Reactor Cores, 2 Shield Generators, 1 Ion Cannon Core | 6 | 80 | 150 |
| **Stealth Cruiser** | 50,000 | 2 Cloaking Devices, 1 Reactor Core, 1 Neural Interface | 6 | 30 | 40 |

*See Section 18 for full crafting system details.*

### 6.2 Combat Mechanics

**Combat Power Calculation**:
```javascript
function calculatePower(fleet, isDefender) {
  let fighters = fleet.fighters * 1;
  let cruisers = fleet.cruisers * 4;
  let carriers = fleet.carriers * 12;

  // Diversity bonus - penalty for mono-unit armies
  let unitTypes = countUnitTypes(fleet);
  let diversityBonus = unitTypes >= 4 ? 1.15 : 1.0; // +15% for mixed fleets

  let basePower = fighters + cruisers + carriers;

  if (isDefender) {
    let stations = fleet.stations * 50 * 2; // 2× on defense
    basePower += stations;
    basePower *= 1.2; // Defender advantage
  }

  return basePower * diversityBonus;
}
```

**Casualty Calculation**:
```javascript
function calculateLosses(attackPower, defensePower, units) {
  let powerRatio = defensePower / attackPower;
  let baseLossRate = 0.25; // Average 25%

  if (powerRatio > 2) baseLossRate += 0.10;  // Punish bad attacks (35% max)
  if (powerRatio < 0.5) baseLossRate -= 0.10; // Reward overwhelming force (15% min)

  return Math.floor(units * baseLossRate * (0.8 + Math.random() * 0.4));
}
```

### 6.3 Combat Types

**Invasion**:
- Full-scale attack to capture planets
- Requires carriers for troop transport
- Three phases: Space → Orbital → Ground
- Victory: Capture 5-15% of enemy planets
- Limit: One invasion per turn

**Guerilla Attack**:
- Quick raid using soldiers only
- No carriers required
- Lower risk, lower reward
- Good for harassment

**Nuclear Warfare** (unlocks Turn 100):
- Requires Black Market purchase (500M credits)
- 40% base population damage
- Target may detect and foil

### 6.4 Retreat & Reinforcements

| Mechanic | Rule |
|----------|------|
| **Retreat** | Allowed, but suffer 15% "attack of opportunity" losses |
| **Reinforcements** | Request from alliance, arrival = distance-based (1-5 turns) |
| **Request System** | Alliance member gets notification, can Accept/Deny |
| **Deny Consequence** | Alliance standing drops, trust decay, potential diplomatic event |
| **Fog of War** | See total military power, not composition. Scouts/spies reveal details |

### 6.5 Army Effectiveness

- **Rating**: 0-100%
- **Affects**: Combat damage dealt
- **Recovery**: +2% per turn
- **Victory bonus**: +5-10%
- **Defeat penalty**: -5%
- **Unpaid penalty**: Drops if maintenance not met

### 6.6 Attack Restrictions

Cannot attack:
- Empires in protection period (first 20 turns)
- Coalition members
- Empires with active treaties
- Significantly weaker empires (unless they attacked first)

### 6.7 Unit Effectiveness Matrix

Different units excel in different combat phases:

| Unit | Guerilla | Ground | Orbital | Space | Pirate Defense |
|------|----------|--------|---------|-------|----------------|
| **Soldiers** | High | High | — | — | Low |
| **Fighters** | — | Low | High | Low | Low |
| **Stations** | — | Medium | Medium | — | — |
| **Light Cruisers** | — | — | High | High | Low |
| **Heavy Cruisers** | — | — | Medium | High | Low |
| **Carriers** | — | — | — | — | — |

**Combat Phase Order**:
1. **Space Combat**: Cruisers vs Cruisers (determines space superiority)
2. **Orbital Combat**: Fighters vs Stations (determines orbital control)
3. **Ground Combat**: Soldiers capture planets (requires carriers for transport)

**Strategic Implications**:
- Balanced fleets handle all phases
- Mono-unit armies have critical weaknesses
- Carriers are essential for invasions but weak in combat

### 6.8 Covert Operations

Covert agents enable asymmetric warfare through espionage and sabotage.

**Covert Points**:
- Earn 5 points per turn (max 50)
- Operations consume points based on complexity
- Agent capacity = Government planets × 300

**Available Operations**:

| Operation | Effect | Cost | Risk |
|-----------|--------|------|------|
| **Send Spy** | Reveal enemy stats and composition | Low | Low |
| **Insurgent Aid** | Support rebels, reduce civil status | Medium | Medium |
| **Support Dissension** | Worsen target's civil status | Medium | Medium |
| **Demoralize Troops** | Reduce army effectiveness | Medium | Medium |
| **Bombing Operations** | Destroy resources/production | High | High |
| **Relations Spying** | Reveal diplomacy and alliances | Low | Low |
| **Take Hostages** | Demand ransom payment | High | High |
| **Carriers Sabotage** | Damage carrier fleet | Very High | Very High |
| **Communications Spying** | Intercept messages | Medium | Low |
| **Setup Coup** | Attempt to overthrow government | Very High | Very High |

**Operation Outcomes**:
- **Success**: Effect achieved
- **Failure**: No effect, agent may be caught
- **Agent Caught**: Lose agent, target notified, diplomatic penalty

**Success Rate Factors**:
- Your agent count vs target's agent count
- Target's Government planet count
- Operation difficulty
- Random variance (±20%)

---

## 7. Bot AI System

### 7.1 Overview

AI bots populate the galaxy with varying intelligence and personalities. Bots create a dynamic, unpredictable game world. **Players cannot see bot archetype** — they must deduce personality through observation.

### 7.2 Bot Tiers

| Tier | v0.5 Count | v0.6+ Count | Intelligence | Description |
|------|------------|-------------|--------------|-------------|
| **Tier 4** | 25 | 25 | Random/Chaos | Weighted random decisions, placeholder names |
| **Tier 3** | — | 25 | Simple/Mid-tier | Basic decision trees, template messages |
| **Tier 2** | — | 25 | Strategic | Sophisticated trees with archetypes |
| **Tier 1 Scripted** | — | 15 | Elite Scripted | Sophisticated algorithms, archetype-driven, no LLM |
| **Tier 1 LLM** | — | 10 | Elite LLM | Natural language, adaptive strategies, LLM API |

**Player Selection Options**: 10, 25, 50, or 100 bots (scaled proportionally)

### 7.3 MVP Scope (v0.5 - Tier 4 Only)

**Tier 4 (Random/Chaotic)**:
- 25 bots with placeholder names
- Weighted random actions each turn
- No strategic planning
- No messaging (silent bots)
- Creates baseline challenge

### 7.4 v0.6 Scope (Tiers 2-4)

**Tier 3 (Simple)**:
- Basic decision trees
- Template-based messages (30-45 per persona)
- Responds to threats
- Predictable patterns

**Tier 2 (Strategic)**:
- Archetype-based behavior
- Personality traits with mechanical effects
- Coalition formation
- Emotional state system

### 7.5 v0.7+ Scope (Tier 1)

**Tier 1 Scripted (Elite Scripted)** - 15 bots:
- Sophisticated algorithmic decision-making
- Archetype-driven behavior with full strategic weight system
- Uses same decision framework as LLM bots (fallback compatible)
- No API calls - fully deterministic

**Tier 1 LLM (Elite LLM)** - 10 bots:
- Connected to LLM API with provider failover (Groq → Together → OpenAI)
- Natural language messages reflecting persona voice
- Adaptive strategies based on full game state context
- Async processing (decisions computed for NEXT turn during player's turn)
- Falls back to Tier 1 Scripted behavior on API failure

### 7.6 Bot Archetypes

| Archetype | Style | Key Behaviors | Passive Ability |
|-----------|-------|---------------|-----------------|
| **Warlord** | Aggressive | Military focus, demands tribute | War Economy: -20% military cost when at war |
| **Diplomat** | Peaceful | Alliance-seeking, mediates conflicts | Trade Network: +10% income per alliance |
| **Merchant** | Economic | Trade focus, buys loyalty | Market Insight: Sees next turn's market prices |
| **Schemer** | Deceptive | False alliances, betrayals | Shadow Network: -50% agent cost, +20% success |
| **Turtle** | Defensive | Heavy defense, never attacks first | Fortification Expert: 2× defensive structure effectiveness |
| **Blitzkrieg** | Early aggression | Fast strikes, cripples neighbors | — |
| **Tech Rush** | Research | Prioritizes tech, late-game power | — |
| **Opportunist** | Vulture | Attacks weakened players | — |

### 7.7 Bot Persona System (v0.6+)

```typescript
interface BotPersona {
  id: string;                    // "commander_hexen"
  name: string;                  // "Commander Hexen"
  archetype: Archetype;

  voice: {
    tone: string;                // "gruff military veteran"
    quirks: string[];            // ["never says please", "references old wars"]
    vocabulary: string[];        // ["soldier", "campaign", "flank"]
    catchphrase?: string;        // "Victory favors the prepared"
  };

  templates: {                   // 2-3 seeds per category (15 categories)
    greeting: string[];
    battleTaunt: string[];
    victoryGloat: string[];
    defeat: string[];
    tradeOffer: string[];
    allianceProposal: string[];
    betrayal: string[];
    // ... 8 more categories
  };

  usedPhrases: Set<string>;      // Prevent repetition
}
```

**100 unique personas** with distinct names, voices, and template libraries.

### 7.8 Emotional State System (v0.6+)

| Emotion | Decision | Alliance | Aggression | Negotiation |
|---------|----------|----------|------------|-------------|
| **Confident** | +5% | -20% | +10% | +10% |
| **Arrogant** | -15% | -40% | +30% | -30% |
| **Desperate** | -10% | +40% | -20% | -20% |
| **Vengeful** | -5% | -30% | +40% | -40% |
| **Fearful** | -10% | +50% | -30% | +10% |
| **Triumphant** | +10% | -10% | +20% | -20% |

- States are **hidden** from player (inferred from messages)
- Intensity scales effects (0.0 - 1.0)
- Mechanical impact on decisions, not just flavor

### 7.9 Relationship Memory (v0.6+)

**Weighted, Not Expiring:**
- Events have weight (1-100) and decay resistance
- Major events resist being "washed away"
- 20% of negative events are **permanent scars**

| Event | Weight | Decay Resistance |
|-------|--------|------------------|
| Captured planet | 80 | HIGH |
| Saved from destruction | 90 | HIGH |
| Broke alliance | 70 | HIGH |
| Won battle | 40 | MEDIUM |
| Trade accepted | 10 | LOW |
| Message sent | 1 | VERY LOW |

### 7.10 Player Readability (Tell System)

| Archetype | Telegraph % | Style | Advance Warning |
|-----------|-------------|-------|-----------------|
| **Warlord** | 70% | Obvious | 2-3 turns |
| **Diplomat** | 80% | Polite | 3-5 turns |
| **Schemer** | 30% | Cryptic/Inverted | 1 turn (if any) |
| **Economist** | 60% | Transactional | 2 turns |
| **Aggressor** | 40% | Minimal | 1 turn |
| **Peaceful** | 90% | Clear | 5+ turns |

---

## 8. Diplomacy System

### 8.1 Treaties

**Types**:
- **Neutrality (NAP)**: Cannot attack each other
- **Alliance**: Shared intelligence, mutual defense
- **Coalition**: Formal group with shared goals

**Mechanics**:
- Propose/accept/reject treaties
- Breaking treaties incurs reputation penalty
- Bots remember betrayals (weighted grudge system)

### 8.2 Coalitions

- Groups of allied empires
- Cannot attack coalition members
- Shared intelligence
- Coalition chat (with bot messages)
- Combined networth ranking

### 8.3 Bot Diplomacy

Bots form and break alliances based on:
- Personality type / Archetype
- Emotional state
- Trust scores
- Strategic opportunity
- Grudge lists
- Game state

### 8.4 Communication Channels (v0.6+)

| Channel | Visibility | Examples |
|---------|------------|----------|
| **Direct** | Private | Threats, offers, negotiations |
| **Broadcast** | All players | Galactic events, conquest news, shouts |

---

## 9. Research System

### 9.1 Research Levels

Research planets generate Research Points (RP) each turn. Points accumulate toward level unlocks.

| Level | RP Required | Cumulative | Key Unlocks |
|-------|-------------|------------|-------------|
| 1 | 0 | 0 | Basic military (Soldiers, Fighters) |
| 2 | 500 | 500 | Tier 2 components, Light Cruisers |
| 3 | 1,500 | 2,000 | Advanced Tier 2, Defense Stations |
| 4 | 3,000 | 5,000 | Heavy Cruisers, Stealth tech |
| 5 | 5,000 | 10,000 | Tier 3 systems, Capital ships |
| 6 | 8,000 | 18,000 | WMD research, Warp drives |
| 7 | 12,000 | 30,000 | Neural interfaces, Bioweapons |
| 8 | 20,000 | 50,000 | Singularity tech, Superweapons |

**RP Generation:**
- Each Research Planet produces 50-150 RP/turn (based on funding)
- Bonus: +10% RP per Education Planet (trained researchers)
- Penalty: -5% RP per active war (distraction)

### 9.2 Research Branches

Players can focus RP into branches for bonuses:

| Branch | Focus | Bonus at 20% Investment |
|--------|-------|-------------------------|
| **Military** | Weapons, targeting | +10% attack damage |
| **Defense** | Shields, armor | +10% defensive HP |
| **Propulsion** | Speed, evasion | +15% fleet evasion |
| **Stealth** | Cloaking, ECM | Covert ops +20% success |
| **Economy** | Production efficiency | -10% crafting costs |
| **Biotech** | Population, food | +10% population growth |

### 9.3 Research Victory

**Completing Research Level 8** (Singularity tech) triggers Research Victory:
- Requires 50,000 cumulative RP
- With 3 Research Planets: ~167 turns
- With 6 Research Planets + Education bonus: ~80 turns

### 9.4 Unit Upgrades (Legacy)

Each unit has 3 levels (0, 1, 2):

**Soldiers**:
| Level | Guerilla | Ground | Pirate |
|-------|----------|--------|--------|
| 0 | 1.0x | 1.0x | 0.5x |
| 1 | 1.5x | 1.0x | 1.0x |
| 2 | 0.5x | 2.0x | 2.0x |

**Carriers**:
| Level | Toughness | Speed | Cargo |
|-------|-----------|-------|-------|
| 0 | 1x | 1x | 1.0x |
| 1 | 2x | 2x | 0.5x |
| 2 | 4x | 4x | 0.25x |

### 9.5 Light Cruisers

- Unlocked at Research Level 2
- Requires crafted components (see Section 18)
- Powerful space combat units with 5 bonus first-strike rounds

---

## 10. Scenario System

### 10.1 Victory Conditions (6 Paths)

| Victory | Condition | Playstyle |
|---------|-----------|-----------|
| **Conquest** | Control 60% of territory | Aggressive expansion |
| **Economic** | 1.5× networth of 2nd place | Builder/trader |
| **Diplomatic** | Coalition controls 50% territory | Alliance politics |
| **Research** | Complete Research Level 8 (50,000 RP) | Turtle/tech rush |
| **Military** | 2× military of all others combined | Domination |
| **Survival** | Highest score at turn 200 | Balanced play |

### 10.2 Edge Case Handling

**Simultaneous Victory Resolution**:
```javascript
const VICTORY_PRIORITY = [
  'conquest', 'research', 'diplomatic',
  'economic', 'military', 'survival'
];
```

**Impossible Victory Detection**:
- Warn player when chosen path becomes mathematically impossible
- Offer alternative victory suggestion

**Stalemate Prevention**:
- Turn 180: Check if any victory feasible
- Activate "Sudden Death" — alliances dissolved, last empire standing

### 10.3 Custom Scenario Builder

Players can configure:
- Win condition
- Turn limit
- Bot tier distribution
- Difficulty multipliers
- Starting resources
- Feature toggles (market, covert, etc.)

### 10.4 Difficulty Levels

| Difficulty | Effect |
|------------|--------|
| **Easy** | Bots make suboptimal choices, player bonuses |
| **Normal** | Balanced bot intelligence |
| **Hard** | Bots play optimally |
| **Nightmare** | Bots get resource bonuses |

---

## 11. Mid-Game Engagement System

### 11.1 Progressive Unlocks

Features unlock as the game progresses to maintain engagement:

| Turn | Unlock |
|------|--------|
| 1 | Core mechanics (build, expand, basic combat) |
| 10 | Diplomacy basics (NAP, trade agreements) |
| 20 | Coalition formation |
| 30 | Black Market access |
| 50 | Advanced ship classes |
| 75 | Coalition warfare (coordinated attacks) |
| 100 | Superweapons (nukes) |
| 150 | Endgame ultimatums |

### 11.2 Galactic Events

Events occur every 10-20 turns (semi-random) to shake up the game state:

| Type | Example Effects |
|------|-----------------|
| **Economic** | Market crash, resource boom, trade disruption |
| **Political** | New faction emerges, coup, assassination |
| **Military** | Pirate armada, alien incursion, arms race |
| **Narrative** | Lore drops, rumors, prophecies (flavor) |

### 11.3 Alliance Checkpoints

Every 30 turns, the system evaluates alliance balance:

- Check top 3 alliances + player alliance
- Evaluate: size, strength, territory, talent distribution
- If imbalance detected: merge weaker alliances, spawn challenger, force conflict
- **Presentation**: Partially visible (player sees event, not algorithm)

### 11.4 Market Manipulation Consequences

**No hard limits** — manipulation is a valid strategy with consequences:

| Turn | Event |
|------|-------|
| N | Player hoards >40% of any resource |
| N+5 | "Rumors spread of your monopoly..." |
| N+10 | "The Merchant Guild demands fair pricing" |
| N+15 | CHOICE — release stock OR face consequences |
| N+20 | Pirates/Cartel/Rival coalition attacks |

**Risk/Reward**: Survive the heat → economic dominance

### 11.5 Game Pacing

```
Turns 1-30:   EXPANSION (learn mechanics, form alliances, safe zone)
Turns 31-80:  COMPETITION (galactic events, coalition politics)
Turns 81-150: DOMINATION (superweapons, major conflicts)
Turns 151-200: ENDGAME (ultimatums, final showdowns)
```

---

## 12. New Player Experience

### 12.1 Protection Period

**20-turn safe zone** where:
- No bot attacks on player
- Bots still message (hostile posturing AND friendly overtures)
- Player learns personality reading
- **Turn 21 Trigger**: "The Galactic Council protection has expired. You're on your own, Commander."

### 12.2 Discovery System

**Commander's Codex**:
- Mechanics documented as player encounters them
- Not a manual dump — progressive revelation
- Accessible from main menu at any time

### 12.3 Tutorial

- Separate "Learn to Play" scenario
- Skippable
- Accessible from library
- Covers first 3-5 turns with overlays

### 12.4 Tooltips

- Contextual, on by default
- User toggle in settings
- Every UI element has hover documentation

### 12.5 First 5 Minutes Experience

```
TURN 1 EXPERIENCE:

1. Welcome Message (System)
   "Welcome to the Outer Rim, Commander. Your rivals surround you."

2. First Bot Message (Random)
   - Warlord: "Fresh meat. I'll enjoy crushing you."
   - Diplomat: "Welcome! Perhaps we could... cooperate?"
   - Schemer: "How interesting. A new player. Do you trust easily?"

3. Tutorial Overlay
   "Emperor Varkus just messaged you. Observe their behavior."

4. Immediate Choice
   - [Defiant] "I'm not afraid of you."
   - [Diplomatic] "Perhaps we can avoid conflict?"
   - [Ignore]

5. Consequence (Next Turn)
   Bot responds to choice
```

---

## 13. User Interface

### 13.1 Design Philosophy

Star Trek **LCARS-inspired** aesthetic:
- Translucent "glass panel" overlays
- Curved corners, pill-shaped buttons
- Color-coded information
- Space backgrounds with subtle animation

### 13.2 Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Amber | `#FF9900` | Primary interactive |
| Lavender | `#CC99FF` | Secondary panels |
| Salmon | `#FF9999` | Warnings, enemies |
| Mint | `#99FFCC` | Success, positive |
| Blue | `#99CCFF` | Friendly, allies |

### 13.3 Core Screens

1. **Dashboard** - Empire overview, resources, events
2. **Planets** - Planet management, buy/release
3. **Military** - Unit management, combat actions
4. **Research** - Visual tech tree
5. **Galaxy Map** - Empire locations, targets
6. **Diplomacy** - Treaties, coalitions
7. **Market** - Resource trading
8. **Covert** - Spy operations
9. **Messages** - Bot communications, events

### 13.4 Responsive Design

| Breakpoint | Layout |
|------------|--------|
| Desktop (1200px+) | Full 3-column |
| Tablet (768-1199px) | 2-column |
| Mobile (<768px) | Single column |

---

## 14. Tech Stack

### 14.1 Frontend

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| Components | shadcn/ui (customized LCARS theme) |
| State | React Query + Zustand |
| Galaxy Map | react-konva |
| Animations | Framer Motion |

### 14.2 Backend

| Layer | Technology |
|-------|------------|
| API | Next.js Server Actions |
| Database | PostgreSQL (Supabase) |
| ORM | Drizzle ORM |
| Auth | Anonymous (v0.5), NextAuth.js (v0.6+) |
| LLM | OpenAI-compatible abstraction with provider failover |
| Caching | In-memory (v0.5), Redis-ready (v0.6+) |

### 14.3 Infrastructure

| Layer | Technology |
|-------|------------|
| Deployment | Vercel (frontend + serverless) |
| Database | Supabase PostgreSQL |
| Future Bot Worker | Railway (scaffolded) |
| Monitoring | Performance logging (JSONL) |

### 14.4 LLM Provider Strategy

```typescript
// Provider failover chain for free tier arbitrage
const LLM_PROVIDERS = [
  { name: 'groq', priority: 1 },
  { name: 'together', priority: 2 },
  { name: 'openai', priority: 3 }
];

interface RateLimits {
  llmCallsPerGame: 5000,
  llmCallsPerTurn: 50,
  llmCallsPerHour: 500,
  maxDailySpend: 50.00
}
```

---

## 15. Development Phases

### Phase 1: Foundation (v0.5 MVP)
**Goal**: Playable game with random bots

- [x] Project setup (Next.js, Tailwind, Drizzle)
- [ ] Database schema design
- [ ] Core game loop (turns, resources)
- [ ] Basic UI (functional, not full LCARS)
- [ ] 9 starting planets
- [ ] Combat system (rebalanced values)
- [ ] 25 Tier 4 random bots (placeholder names)
- [ ] 3 victory conditions (Conquest, Economic, Survival)
- [ ] Auto-save system (ironman mode)

**Deliverable**: Can play a complete game against random bots

### Phase 2: Bot Intelligence (v0.6)
**Goal**: Bots with personality

- [ ] 100 bot personas with names/voices
- [ ] Tier 3 decision tree bots
- [ ] Template message library (30-45 per persona)
- [ ] Emotional state system
- [ ] 20-turn safe zone implementation
- [ ] Commander's Codex system
- [ ] Full diplomacy (NAP, Alliance, Coalition)
- [ ] Global market with dynamic pricing
- [ ] 6 victory conditions

**Deliverable**: Bots feel like characters

### Phase 3: Advanced AI (v0.7)
**Goal**: LLM-powered elite bots

- [ ] Tier 2 strategic bots
- [ ] Tier 1 LLM bots (10 max, async processing)
- [ ] LLM provider abstraction with failover
- [ ] Weighted relationship memory
- [ ] Progressive unlock system
- [ ] Galactic events
- [ ] Alliance checkpoints

**Deliverable**: Intelligent, memorable opponents

### Phase 4: Polish (v0.8)
**Goal**: Production-ready

- [ ] Full LCARS UI implementation
- [ ] Galaxy map visualization
- [ ] Tech tree visualization
- [ ] Learn to Play tutorial
- [ ] LLM-generated epilogues
- [ ] Statistics dashboard
- [ ] Accessibility features

**Beta Testing Features**:
- [ ] Hall of Fame system (track best scores, fastest victories, persistent across sessions)
- [ ] Sound design (UI sounds, turn chimes, combat alerts, ambient atmosphere, victory fanfares)

**Deliverable**: Deployable game

### Phase 5: Multiplayer (v1.0+)
**Goal**: Async multiplayer

- [ ] Async turn-based multiplayer
- [ ] Player matchmaking
- [ ] Spectator mode
- [ ] Replay system
- [ ] Achievements
- [ ] Leaderboards

**Deliverable**: Full vision realized

---

## 16. Success Metrics

### 16.1 Game Experience

| Metric | Target |
|--------|--------|
| **Game Length** | 1-2 hours (200 turns) |
| **Turn Processing** | <2 seconds |
| **Bot Variety** | Bots feel distinct |
| **Strategy Balance** | No single dominant path |
| **Replayability** | 6 victory paths provide variety |
| **Learning Curve** | Playable in 10 minutes, mastery takes hours |
| **Nostalgia Factor** | SRE veterans feel at home |
| **Modern UX** | New players aren't intimidated |

### 16.2 Technical Health

| Metric | Target |
|--------|--------|
| **Turn Generation Time** | <2000ms |
| **Database Query Time** | <200ms per turn |
| **LLM Response Time** | Async, non-blocking |
| **Save/Load Integrity** | Zero corruption |

### 16.3 Future Metrics (Post-Alpha)

- NPS: Would you recommend to another SRE veteran? (Target: >50)
- Aha! Moment: Time to first planet capture
- Session completion rate
- Retention (7-day, 30-day)

---

## 17. Out of Scope (v1)

The following are explicitly **not** included in version 1:

- **Synchronous Multiplayer**: Async only
- **Mobile App**: Web-only (responsive, not native)
- **Real-time Combat**: Turn-based only
- **Persistent Universe**: Single sessions, no carry-over
- **Monetization**: No in-app purchases, ads, or premium tiers
- **Modding Support**: No custom content tools
- **Global Leaderboards**: Local Hall of Fame only (v1)

---

## 18. Manufacturing & Crafting System

Nexus Dominion introduces a 4-tier resource system that gates advanced military behind strategic resource management. This transforms the original "credits buy everything" model into a more strategic progression.

*Full details: See `docs/crafting-system.md`*

### 18.1 Tier 0: Base Resources (Original SRE)

| Resource | Source | Description |
|----------|--------|-------------|
| **Credits** | Taxes, Trade, Tourism, Urban | Universal currency |
| **Food** | Food Planets, Market | Feeds population & military |
| **Ore** | Ore Planets | Raw minerals, stable income |
| **Petroleum** | Petroleum Planets | Fuel, causes pollution |
| **Population** | Urban, Education | Labor force, tax base |
| **Research Points** | Research Planets | Tech progression |

### 18.2 Tier 1: Refined Resources

Basic processing of Tier 0 resources. Produced automatically by specialized planets or purchased at premium.

| Resource | Recipe | Auto-Production |
|----------|--------|-----------------|
| **Refined Metals** | 100 Ore | Ore Planets: 10% of output |
| **Fuel Cells** | 50 Petroleum + 20 Credits | Petroleum Planets: 10% |
| **Polymers** | 30 Petroleum + 20 Ore | Industrial Planets only |
| **Processed Food** | 200 Food | Food Planets: 5% |
| **Labor Units** | 1,000 Population + 50 Credits | Urban Planets: 5% |

### 18.3 Tier 2: Manufactured Components (Research 2+)

Combining Tier 1 resources with Research requirements. These are building blocks for advanced military.

| Component | Recipe | Research Req |
|-----------|--------|--------------|
| **Electronics** | 2 Refined Metals + 1 Polymers | Level 2 |
| **Armor Plating** | 3 Refined Metals + 1 Polymers | Level 2 |
| **Propulsion Units** | 2 Fuel Cells + 1 Refined Metals | Level 2 |
| **Life Support** | 1 Processed Food + 1 Polymers + 1 Electronics | Level 3 |
| **Weapons Grade Alloy** | 4 Refined Metals + 2 Fuel Cells | Level 3 |
| **Targeting Arrays** | 2 Electronics + 1 Refined Metals | Level 3 |
| **Stealth Composites** | 3 Polymers + 1 Electronics | Level 4 |
| **Quantum Processors** | 3 Electronics + 1 Weapons Grade Alloy | Level 5 |

### 18.4 Tier 3: Advanced Systems (Research 5+)

Strategic resources for capital ships and superweapons.

| System | Recipe | Research Req |
|--------|--------|--------------|
| **Reactor Cores** | 3 Propulsion Units + 2 Electronics + 1 Quantum Processor | Level 5 |
| **Shield Generators** | 2 Armor Plating + 2 Electronics + 1 Quantum Processor | Level 5 |
| **Warp Drives** | 2 Reactor Cores + 1 Stealth Composites + 1 Targeting Array | Level 6 |
| **Cloaking Devices** | 3 Stealth Composites + 2 Quantum Processors | Level 6 |
| **Ion Cannon Cores** | 2 Weapons Grade Alloy + 2 Reactor Cores + 1 Targeting Array | Level 6 |
| **Neural Interfaces** | 2 Quantum Processors + 1 Life Support | Level 7 |
| **Singularity Containment** | 3 Reactor Cores + 2 Shield Generators | Level 8 |

### 18.5 Industrial Planets (New Planet Type)

| Property | Value |
|----------|-------|
| **Cost** | 15,000 credits |
| **Production** | Processes Tier 0 → Tier 1 (configurable) |
| **Bonus** | Research level reduces crafting time by 5% per level |

### 18.6 Crafting Queue

- Players queue crafting orders at Industrial Planets
- Each order reserves required components
- Completion time based on complexity and research level
- Maximum 5 concurrent crafting orders per empire
- Orders process at turn end

---

## 19. The Galactic Syndicate

The **Galactic Syndicate** is a criminal organization operating outside Coordinator jurisdiction, providing an alternative progression path for struggling empires.

### 19.1 Overview

The Syndicate offers:
- Banned technologies (WMDs)
- Premium components (skip crafting requirements)
- Contract work (trust building)
- Intelligence services

### 19.2 Trust Levels (0-8)

Trust is earned through contracts and purchases. Higher trust unlocks better goods.

| Level | Points | Title | Unlocks |
|-------|--------|-------|---------|
| 0 | 0 | Unknown | Must complete intro contract |
| 1 | 100 | Associate | Components at 2x, basic intel |
| 2 | 500 | Runner | Pirate raid contracts, 1.75x prices |
| 3 | 1,500 | Soldier | Player contracts, Tier 2 at 1.5x |
| 4 | 3,500 | Captain | Targeted contracts, kingslayer |
| 5 | 7,000 | Lieutenant | Tier 3 systems (non-WMD), 1.5x |
| 6 | 12,000 | Underboss | Chemical weapons, EMP, 1.25x |
| 7 | 20,000 | Consigliere | Nuclear weapons |
| 8 | 35,000 | Syndicate Lord | Bioweapons, exclusive contracts, 1.0x |

### 19.3 Contract System

Contracts are the primary way to build trust. They come in tiers:

**Tier 1: Pirate Raids (Trust 1+)**
| Contract | Target | Reward | Trust |
|----------|--------|--------|-------|
| Supply Run | Any pirate team | 5,000 Credits | +10 |
| Disruption | Specific pirate base | 8,000 Credits | +15 |
| Salvage Op | Destroy pirate ships, keep 50% | Varies | +20 |

**Tier 2: Standard Contracts (Trust 2+)**
| Contract | Target | Reward | Trust |
|----------|--------|--------|-------|
| Intimidation | Any player (insurgent aid) | 15,000 Credits | +30 |
| Economic Warfare | Any player (bomb food) | 25,000 Credits | +40 |
| Military Probe | Any player (guerilla attack) | 35,000 Credits | +50 |
| Hostile Takeover | Capture 1 planet from anyone | 50,000 Credits | +75 |

**Tier 3: Targeted Contracts (Trust 4+)**
| Contract | Target | Reward | Trust |
|----------|--------|--------|-------|
| Kingslayer | Top 3 player | 100,000 Credits | +100 |
| Market Manipulation | Top 10 player | 75,000 Credits | +80 |
| Regime Change | Top 25% player | 60,000 Credits | +60 |

**Tier 4: Syndicate Operations (Trust 6+)**
| Contract | Target | Reward | Trust |
|----------|--------|--------|-------|
| Proxy War | Two specific players | 150,000 Credits | +120 |
| Scorched Earth | Specific empire (WMD) | Exclusive tech | +100 |
| The Equalizer | All Top 10% | Special item | +200 |

### 19.4 Recruitment Mechanic

**The Syndicate reaches out to struggling players.**

When a player falls into the **bottom 50%** of empires:
- They receive a **Syndicate Invitation** message
- First contract offered at 50% bonus trust rewards
- One-time offer of 10,000 credits "startup funds"
- Access to "Equalizer" contracts targeting top players

*This creates comeback mechanics — struggling players can acquire WMDs faster while top players must consider threats from below.*

### 19.5 Black Market Catalog

**Components (Trust 1+):**
| Item | Price | Trust Req |
|------|-------|-----------|
| Electronics | 2,000 | 1 |
| Armor Plating | 2,500 | 1 |
| Propulsion Units | 2,200 | 1 |
| Targeting Arrays | 4,000 | 3 |
| Stealth Composites | 5,000 | 3 |
| Quantum Processors | 8,000 | 4 |

**Advanced Systems (Trust 5+):**
| Item | Price | Trust Req |
|------|-------|-----------|
| Reactor Cores | 15,000 | 5 |
| Shield Generators | 18,000 | 5 |
| Cloaking Devices | 25,000 | 5 |
| Warp Drives | 30,000 | 6 |

**Restricted Items (Trust 6+):**
| Item | Price | Trust Req | Notes |
|------|-------|-----------|-------|
| Chemical Weapons (1 use) | 50,000 | 6 | Coordinator penalty if caught |
| EMP Device (1 use) | 75,000 | 6 | Disables defenses temporarily |
| Nuclear Warhead (1 use) | 100,000 | 7 | Severe Coordinator response |
| Bioweapon Canister (1 use) | 150,000 | 8 | Most devastating |

### 19.6 Trust Decay & Betrayal

| Action | Consequence |
|--------|-------------|
| No interaction for 10 turns | -5% trust decay |
| Failing contract deadline | -50% reward trust, lose 1 Trust Level |
| Reporting to Coordinator | Reset to Trust 0, +10% funding, Syndicate becomes hostile |

### 19.7 Coordinator Response (Betrayal Consequence)

If a player reports to the Coordinator:
- Trust permanently reset to 0
- +10% Coordinator funding bonus
- Syndicate becomes **hostile**: random assassination attempts on generals/agents each turn

---

## Appendix A: Related Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Agent Organizer Review | `docs/reviews/00-agent-organizer-review.md` | Initial assessment |
| Product Manager Review | `docs/reviews/01-product-manager-review.md` | Scope & positioning |
| Architect Review | `docs/reviews/02-architect-review.md` | Technical decisions |
| Game Developer Review | `docs/reviews/03-game-developer-review.md` | Mechanics & balance |
| Narrative Designer Review | `docs/reviews/04-narrative-designer-review.md` | Bot personalities |
| Project Manager Synthesis | `docs/reviews/05-project-manager-synthesis.md` | Sprint plan |
| **Crafting System Design** | `docs/crafting-system.md` | Full crafting, syndicate, and WMD specifications |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **4X** | eXplore, eXpand, eXploit, eXterminate strategy genre |
| **BBS** | Bulletin Board System - pre-internet online communities |
| **Black Market** | Syndicate-operated shop for restricted items and components |
| **Crafting** | System for manufacturing advanced components from base resources |
| **Door Game** | BBS-hosted multiplayer games |
| **Ironman Mode** | Auto-save only, no manual saves or reloading |
| **LCARS** | Library Computer Access/Retrieval System (Star Trek UI) |
| **Networth** | Empire ranking metric |
| **Resource Tier** | Classification of resources (0=Base, 1=Refined, 2=Components, 3=Advanced) |
| **SRE** | Solar Realms Elite (original 1990 game) |
| **Syndicate** | The Galactic Syndicate - criminal organization offering contracts and WMDs |
| **Tell** | Behavioral indicator that hints at bot's true archetype |
| **Trust Level** | Player's standing with the Galactic Syndicate (0-8) |
| **Unified Actor Model** | Architecture where bots and players use same turn pipeline |
| **WMD** | Weapons of Mass Destruction - banned technologies available via Syndicate |

---

## Appendix C: Key Design Principles

1. **Unified Actor Model**: Bots and players flow through identical turn pipeline
2. **Async-First Design**: Same codebase supports single-player and future multiplayer
3. **Bot Opacity**: Players cannot see bot archetype — must deduce through observation
4. **Consequence Over Limits**: Market manipulation triggers events, not hard caps
5. **Ironman Mode**: Auto-save only, no rewinding decisions
6. **Weighted Memory**: Events don't expire, but influence fades by weight
7. **Narrative Payoff**: Every game should be a story worth telling

---

## Appendix D: Future Considerations

The following features are **not planned for v1** but represent compelling future directions captured during design brainstorming.

### D.1 Nemesis System (Cross-Game Bot Memory)

Bots remember player behavior across multiple games, creating persistent rivalries:

- "You again! I remember what you did to my empire last time..."
- Bots adjust strategies based on player's historical patterns
- Creates emergent storytelling across sessions
- Could tie into achievement system

**Implementation Considerations**:
- Requires persistent player identity (auth system)
- Bot memory storage per player
- Balance: Don't make it feel unfair to new players

### D.2 Spectator Mode

Watch bots play against each other without player involvement:

- Entertainment/relaxation feature
- Learning tool (observe bot strategies)
- Could run accelerated (10x speed)
- Potential for "AI tournament" events

**Implementation Considerations**:
- UI for fast-forwarding and pausing
- Commentary system (explain bot decisions)
- Requires robust bot AI to be interesting

### D.3 Scenario Unlock System

Completing scenarios unlocks new, harder scenarios:

- Progressive difficulty curve
- Rewards mastery with new challenges
- Example unlock chain:
  - Complete "Survival" → Unlocks "Surrounded" (start with hostile neighbors)
  - Complete "Economic Victory" → Unlocks "Trade Wars" (market-focused)
  - Complete all basic → Unlocks "Nightmare" difficulty

**Implementation Considerations**:
- Requires persistent progress tracking
- Balance unlock requirements (not too grindy)
- Consider "unlock all" option for experienced players

### D.4 Decision Log Viewer

Expose bot decision reasoning for entertainment and learning:

- "Admiral Zharkov considered attacking you but chose to wait..."
- Post-game replay with bot thought processes
- Could be unlocked after game completion
- Educational: Learn to predict bot behavior

**Implementation Considerations**:
- Storage overhead for decision logs
- UI for browsing logs
- Privacy: Only show after game ends

### D.5 Bot Personality Evolution

Bots learn and evolve across the game ecosystem:

- Aggregate player strategies inform bot improvements
- Bots develop "meta" awareness over time
- Seasonal bot personality updates
- Community-driven bot training

**Implementation Considerations**:
- Requires analytics infrastructure
- Balance: Don't make bots unbeatable
- Ethical: Transparent about AI learning

---

## Appendix E: What This Game Is NOT

Explicit anti-patterns to avoid scope creep:

| NOT This | Because |
|----------|---------|
| **Mobile gacha game** | No predatory monetization |
| **Persistent MMO** | Single sessions, complete games |
| **Real-time strategy** | Turn-based, thoughtful |
| **Spreadsheet simulator** | Approachable rules |
| **Multiplayer-first (v1)** | Single-player excellence first |
| **Feature-bloated** | Elegant simplicity like Hammurabi |

*"The galaxy awaits, Commander. Your rivals are ready. Are you?"*

---

*Document Version: 1.3*
*Last Updated: December 28, 2024*
*Status: Crafting System Integration*

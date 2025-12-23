# X-Imperium: Product Requirements Document

**Version:** 1.0
**Date:** December 2024
**Status:** Draft

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
11. [User Interface](#11-user-interface)
12. [Tech Stack](#12-tech-stack)
13. [Development Phases](#13-development-phases)
14. [Success Metrics](#14-success-metrics)
15. [Out of Scope](#15-out-of-scope)

---

## 1. Executive Summary

### Product Vision

**X-Imperium** is a single-player turn-based space empire strategy game that revives the classic **Solar Realms Elite** (1990) BBS door game. Players compete against 99 AI-controlled bot opponents to build the most powerful galactic empire through economic development, military conquest, research advancement, and diplomatic maneuvering.

### Target Audience

- **Primary**: Nostalgic gamers who played SRE, Trade Wars, or similar BBS games
- **Secondary**: Strategy game enthusiasts (Civilization, Master of Orion, 4X fans)
- **Tertiary**: Casual gamers seeking accessible strategy experiences

### Core Differentiator

X-Imperium transforms the original weeks-long multiplayer experience into a **1-2 hour single-player session** with:
- 99 AI opponents with distinct personalities and strategies
- Instant turn processing (no waiting)
- Scenario-based victory conditions for replayability
- Modern LCARS-inspired Star Trek aesthetic

### Key Decisions

| Decision | Choice |
|----------|--------|
| Tech Stack | TypeScript + Next.js |
| Resources | 4 (Food, Credits, Ore, Petroleum) + Research Points |
| Starting Planets | 9 |
| Bot Count | 99 |
| Turn Processing | Instant (all bots process immediately) |
| Multiplayer | Single-player only (v1) |
| UI Style | Star Trek LCARS-inspired |

---

## 2. Game Overview

### Genre
Turn-based 4X space strategy (eXplore, eXpand, eXploit, eXterminate)

### Platform
Web application (desktop-first, responsive for tablet/mobile)

### Mode
Single-player vs 99 AI bot opponents

### Core Experience
Players manage a galactic empire across 200 turns (configurable), making decisions about:
- Resource production and consumption
- Military recruitment and combat
- Research and technology advancement
- Diplomatic relations with bot empires
- Covert operations and espionage

### Win/Lose Conditions
Victory and defeat are **scenario-based** (see Section 10). Common conditions:
- **Victory**: Achieve scenario goal (networth, elimination, research, etc.)
- **Defeat**: Empire collapses (bankruptcy, civil revolt, elimination)

---

## 3. Core Gameplay Loop

```
┌─────────────────────────────────────────────────────────┐
│                    TURN STRUCTURE                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. REVIEW PHASE                                        │
│     ├── Check resources, events, messages               │
│     ├── Read bot communications                         │
│     └── Assess threats and opportunities                │
│                                                         │
│  2. BUILD PHASE                                         │
│     ├── Buy/release planets                             │
│     ├── Train military units                            │
│     ├── Invest in research                              │
│     └── Manage production rates                         │
│                                                         │
│  3. ACTION PHASE                                        │
│     ├── Launch attacks (invasion/guerilla)              │
│     ├── Execute covert operations                       │
│     ├── Manage diplomacy (treaties, coalitions)         │
│     └── Trade on global market                          │
│                                                         │
│  4. END TURN                                            │
│     ├── Player confirms turn end                        │
│     ├── All 99 bots process instantly                   │
│     ├── Resources update                                │
│     ├── Combat resolves                                 │
│     ├── Events trigger                                  │
│     └── Next turn begins                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Turn Timing
- **No real-world waiting**: Bots process in milliseconds
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

### 6.1 Unit Types

| Unit | Role | Cost | Pop | Maintenance |
|------|------|------|-----|-------------|
| **Soldiers** | Ground combat | 300 | 0.2 | 24 cr, 0.16 food |
| **Fighters** | Orbital combat | 420 | 0.4 | 72 cr, 0.8 ore, 0.8 petro |
| **Stations** | Orbital defense | 600 | 0.5 | 66 cr, 2.2 ore |
| **Light Cruisers** | Space combat | Research | 1.0 | 72 cr, 1.4 ore, 1.6 petro |
| **Heavy Cruisers** | Heavy space | 1,900 | 2.0 | 120 cr, 2.4 ore, 2.8 petro |
| **Carriers** | Troop transport | 1,430 | 3.0 | 64 cr, 1.4 ore, 1.6 petro |
| **Covert Agents** | Espionage | 4,090 | 1.0 | None |

### 6.2 Combat Types

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

**Nuclear Warfare**:
- Requires Black Market purchase (500M credits)
- 40% base population damage
- Target may detect and foil

### 6.3 Combat Phases

1. **Space Combat**: Cruisers vs cruisers
2. **Orbital Combat**: Fighters vs stations
3. **Ground Combat**: Soldiers capture planets

### 6.4 Army Effectiveness

- **Rating**: 0-100%
- **Affects**: Combat damage dealt
- **Recovery**: +2% per turn
- **Victory bonus**: +5-10%
- **Defeat penalty**: -5%
- **Unpaid penalty**: Drops if maintenance not met

### 6.5 Attack Restrictions

Cannot attack:
- Empires in protection period (first 20 turns)
- Coalition members
- Empires with active treaties
- Significantly weaker empires (unless they attacked first)

---

## 7. Bot AI System

### 7.1 Overview

99 AI bots populate the galaxy with varying intelligence and personalities. Bots create a dynamic, unpredictable game world.

### 7.2 Bot Tiers

| Tier | Count | Intelligence | Description |
|------|-------|--------------|-------------|
| **Tier 4** | 25 | Random | Unpredictable, chaotic decisions |
| **Tier 3** | 25 | Simple | Basic if/then decision trees |
| **Tier 2** | 25 | Strategic | Sophisticated decision trees with archetypes |
| **Tier 1** | 24 | LLM-Powered | Natural language, adaptive strategies |

### 7.3 MVP Scope (Tiers 3-4)

**Tier 4 (Random/Chaotic)**:
- Weighted random actions each turn
- No strategic planning
- Creates unpredictability

**Tier 3 (Simple)**:
- Basic decision trees
- Predictable patterns
- Responds to threats
- Template-based messages

### 7.4 Post-MVP Scope (Tiers 1-2)

**Tier 2 (Strategic)**:
- Archetype-based behavior
- Personality traits (aggression, diplomacy, etc.)
- Coalition formation
- Templated communication

**Tier 1 (LLM Elite)**:
- Connected to LLM API (Anthropic/OpenAI)
- Natural language messages
- Adaptive strategies
- Personality-driven negotiations

### 7.5 Bot Archetypes

| Archetype | Style | Key Behaviors |
|-----------|-------|---------------|
| **Warlord** | Aggressive | Military focus, demands tribute |
| **Diplomat** | Peaceful | Alliance-seeking, mediates conflicts |
| **Merchant** | Economic | Trade focus, buys loyalty |
| **Schemer** | Deceptive | False alliances, betrayals |
| **Turtle** | Defensive | Heavy defense, never attacks first |
| **Blitzkrieg** | Early aggression | Fast strikes, cripples neighbors |
| **Tech Rush** | Research | Prioritizes tech, late-game power |
| **Opportunist** | Vulture | Attacks weakened players |

### 7.6 Bot Communication

Bots send messages to the player:
- Threats and demands
- Alliance proposals
- Trade offers
- Betrayal justifications
- Victory declarations

---

## 8. Diplomacy System

### 8.1 Treaties

**Types**:
- **Neutrality**: Cannot attack each other
- **Alliance**: Shared intelligence, mutual defense
- **Coalition**: Formal group with shared goals

**Mechanics**:
- Propose/accept/reject treaties
- Breaking treaties incurs reputation penalty
- Bots remember betrayals (grudge system)

### 8.2 Coalitions

- Groups of allied empires
- Cannot attack coalition members
- Shared intelligence
- Coalition chat (with bot messages)
- Combined networth ranking

### 8.3 Bot Diplomacy

Bots form and break alliances based on:
- Personality type
- Trust scores
- Strategic opportunity
- Grudge lists
- Game state

---

## 9. Research System

### 9.1 Fundamental Research

8 levels of basic research:
- Each level unlocks unit upgrades
- Completing all 8 = Tech Ascension victory (if enabled)
- Costs increase exponentially

### 9.2 Unit Upgrades

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

### 9.3 Light Cruisers

- Not purchasable directly
- Unlocked through research
- Powerful space combat units

---

## 10. Scenario System

### 10.1 Pre-Built Scenarios

| Scenario | Win Condition | Special Rules |
|----------|---------------|---------------|
| **Classic SRE** | Highest networth at turn 200 | Standard gameplay |
| **Economic Domination** | Reach 10,000,000 credits | Market manipulation focus |
| **Warlord** | Eliminate 50 empires | Combat bonuses |
| **Spy Master** | Complete 100 covert operations | Extra covert agents |
| **Coalition Builder** | Form alliance with 10+ bots | Diplomacy focus |
| **Tech Ascension** | Complete all 8 research levels | Research boost |
| **Survival** | Last empire standing | Aggressive bots |
| **Speed Run** | Win in fewest turns | No protection period |

### 10.2 Custom Scenario Builder

Players can configure:
- Win condition
- Turn limit
- Bot tier distribution
- Difficulty multipliers
- Starting resources
- Feature toggles (market, covert, etc.)

### 10.3 Difficulty Levels

| Difficulty | Effect |
|------------|--------|
| **Easy** | Bots make suboptimal choices, player bonuses |
| **Normal** | Balanced bot intelligence |
| **Hard** | Bots play optimally |
| **Nightmare** | Bots get resource bonuses |

---

## 11. User Interface

### 11.1 Design Philosophy

Star Trek **LCARS-inspired** aesthetic:
- Translucent "glass panel" overlays
- Curved corners, pill-shaped buttons
- Color-coded information
- Space backgrounds with subtle animation

### 11.2 Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Amber | `#FF9900` | Primary interactive |
| Lavender | `#CC99FF` | Secondary panels |
| Salmon | `#FF9999` | Warnings, enemies |
| Mint | `#99FFCC` | Success, positive |
| Blue | `#99CCFF` | Friendly, allies |

### 11.3 Core Screens

1. **Dashboard** - Empire overview, resources, events
2. **Planets** - Planet management, buy/release
3. **Military** - Unit management, combat actions
4. **Research** - Visual tech tree
5. **Galaxy Map** - Empire locations, targets
6. **Diplomacy** - Treaties, coalitions
7. **Market** - Resource trading
8. **Covert** - Spy operations
9. **Messages** - Bot communications, events

### 11.4 Responsive Design

| Breakpoint | Layout |
|------------|--------|
| Desktop (1200px+) | Full 3-column |
| Tablet (768-1199px) | 2-column |
| Mobile (<768px) | Single column |

---

## 12. Tech Stack

### 12.1 Frontend

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | shadcn/ui (customized LCARS theme) |
| State | React Query + Zustand |
| Galaxy Map | react-konva or Three.js |
| Animations | Framer Motion |

### 12.2 Backend

| Layer | Technology |
|-------|------------|
| API | Next.js API Routes / Server Actions |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Auth | NextAuth.js or Clerk |
| LLM | Anthropic API (Claude) / OpenAI (GPT-4o-mini) |

### 12.3 Infrastructure

| Layer | Technology |
|-------|------------|
| Deployment | Docker |
| Reverse Proxy | Caddy |
| Hosting | Vercel / Self-hosted |

---

## 13. Development Phases

### Phase 1: Foundation (MVP)
**Goal**: Playable game with basic bots

- [ ] Project setup (Next.js, Tailwind, Drizzle)
- [ ] Database schema design
- [ ] Core game loop (turns, resources)
- [ ] Basic UI (not full LCARS)
- [ ] 9 starting planets
- [ ] Simple combat
- [ ] Tier 4 bots (random)
- [ ] Single win condition (networth)

**Deliverable**: Can play a complete game against random bots

### Phase 2: Core Features
**Goal**: Feature-complete SRE recreation

- [ ] Full 4-resource system
- [ ] All 10 planet types
- [ ] Complete combat system (invasion, guerilla)
- [ ] Research tree
- [ ] Covert operations
- [ ] Tier 3 bots (decision trees)
- [ ] Basic diplomacy
- [ ] Global market
- [ ] Protection period

**Deliverable**: Faithful SRE recreation

### Phase 3: Bot Intelligence
**Goal**: Engaging AI opponents

- [ ] Tier 2 strategic bots
- [ ] Bot archetypes (Warlord, Diplomat, etc.)
- [ ] Bot alliances and betrayal
- [ ] Bot messaging system
- [ ] Balance tuning

**Deliverable**: Bots feel like characters

### Phase 4: Polish
**Goal**: Production-ready

- [ ] Full LCARS UI implementation
- [ ] Galaxy map visualization
- [ ] Tech tree visualization
- [ ] Scenario system
- [ ] Custom scenario builder
- [ ] Hall of Fame
- [ ] Sound effects (optional)
- [ ] Accessibility features

**Deliverable**: Deployable game

### Phase 5: Advanced (Post-MVP)
**Goal**: Premium experience

- [ ] Tier 1 LLM bots
- [ ] Advanced bot personalities
- [ ] Spectator mode (watch bots play)
- [ ] Replay system
- [ ] Achievements
- [ ] Statistics tracking

**Deliverable**: Full vision realized

---

## 14. Success Metrics

| Metric | Target |
|--------|--------|
| **Game Length** | 1-2 hours (200 turns) |
| **Bot Variety** | 99 bots feel distinct |
| **Strategy Balance** | No single dominant path |
| **Replayability** | 8+ scenarios provide variety |
| **Learning Curve** | Playable in 10 minutes, mastery takes hours |
| **Nostalgia Factor** | SRE veterans feel at home |
| **Modern UX** | New players aren't intimidated |

---

## 15. Out of Scope (v1)

The following are explicitly **not** included in version 1:

- **Multiplayer**: Single-player only for v1
- **Mobile App**: Web-only (responsive, not native)
- **Real-time Combat**: Turn-based only
- **Persistent Universe**: Single sessions, no carry-over
- **Monetization**: No in-app purchases, ads, or premium tiers
- **Modding Support**: No custom content tools
- **Leaderboards**: Local Hall of Fame only

---

## Appendix A: Related Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Game Vision | `docs/design/GAME_VISION.md` | Philosophy and goals |
| Core Mechanics | `docs/design/CORE_MECHANICS.md` | Detailed game rules |
| UI Design | `docs/design/UI_DESIGN.md` | Visual style guide |
| Bot Architecture | `docs/design/BOT_ARCHITECTURE.md` | AI system design |
| SRE Comparison | `docs/reference/SRE_COMPARISON.md` | Historical context |
| SI User Manual | `docs/reference/SI_USER_MANUAL.md` | Reference for mechanics |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **BBS** | Bulletin Board System - pre-internet online communities |
| **Door Game** | BBS-hosted multiplayer games |
| **LCARS** | Library Computer Access/Retrieval System (Star Trek UI) |
| **Networth** | Empire ranking metric |
| **SRE** | Solar Realms Elite (original 1990 game) |
| **4X** | eXplore, eXpand, eXploit, eXterminate strategy genre |

---

*Document Version: 1.0*
*Last Updated: December 2024*
*Author: AI-Assisted Design*

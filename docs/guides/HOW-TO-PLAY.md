# How to Play Nexus Dominion

> **Alpha Tester Guide v0.6** | Last Updated: January 2026

Welcome to **Nexus Dominion**, a turn-based 4X space empire strategy game. This guide will teach you everything you need to dominate the galaxy.

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Resources & Economy](#resources--economy)
4. [Planets & Expansion](#planets--expansion)
5. [Military & Combat](#military--combat)
6. [Diplomacy & Intelligence](#diplomacy--intelligence)
7. [Research & Technology](#research--technology)
8. [Advanced Systems](#advanced-systems)
9. [Victory Conditions](#victory-conditions)
10. [Early Game Strategy](#early-game-strategy)
11. [Tips & Tricks](#tips--tricks)

---

## Overview

Nexus Dominion is a **4X strategy game** (eXplore, eXpand, eXploit, eXterminate) where you command a fledgling space empire competing against 25 AI opponents. Each game lasts up to 200 turns, with victory going to the empire that achieves one of six victory conditions.

### The 4X Pillars

| Pillar | Description |
|--------|-------------|
| **EXPLORE** | Survey the galaxy through your Star Chart. Gather intelligence on rival empires through covert operations. |
| **EXPAND** | Acquire new sectors to grow your domain. Each planet type provides unique resources. |
| **EXPLOIT** | Harvest resources, grow your population, and research technologies to gain an edge. |
| **EXTERMINATE** | Build fleets, train armies, and crush your rivals. Only the strongest will dominate. |

---

## Getting Started

### Your First Game

When you start a new game, you receive:
- A small empire with **5 starting planets**
- Basic resources to begin building
- **20 turns of protection** (no one can attack you)

> **Use protection wisely!** Build your economy and military before turn 20.

### The Command Center

Your **Command Center** (dashboard) is your empire's nerve center. Here you can:
- Monitor current resources and income
- Track population and civil status
- View military strength
- Access all game systems via the navigation menu

### Turn Structure

Each turn follows this order:
1. **Income Phase** - Collect resources from planets
2. **Population Phase** - Population grows (or starves!)
3. **Civil Status Phase** - Evaluate empire happiness
4. **Market Phase** - Process buy/sell orders
5. **Bot Phase** - AI empires take their actions
6. **Action Phase** - Your queued actions resolve

Click **"End Turn"** when you're ready to advance.

---

## Resources & Economy

### The Five Resources

| Resource | Icon | Purpose | Source |
|----------|------|---------|--------|
| **Credits** | $ | Currency for everything | All planet types |
| **Food** | 🌾 | Feeds population | Agricultural planets |
| **Ore** | �ite | Construction & crafting | Mining planets |
| **Petroleum** | ⛽ | Powers advanced units | Industrial planets |
| **Research** | 🔬 | Unlocks technology | Research planets |

### Resource Balance

- **Food is critical** - If food < population, your people starve and rebel
- **Credits fund everything** - Units, planets, operations all cost credits
- **Ore & Petroleum** - Needed for advanced ships and crafting
- **Research accumulates** - Invest consistently to unlock tech levels

### Civil Status

Your empire's happiness affects income:

| Status | Income Modifier | Trigger |
|--------|-----------------|---------|
| Ecstatic | 4x | Food surplus + low taxes |
| Happy | 2x | Food surplus |
| Content | 1x | Normal balance |
| Unhappy | 0.75x | Minor shortages |
| Angry | 0.5x | Food shortage |
| Rioting | 0.33x | Severe shortage |
| Revolting | 0.25x | Critical - units may defect! |

---

## Planets & Expansion

### Planet Types

| Type | Primary Output | Secondary |
|------|----------------|-----------|
| **Terran** | Food, Credits | Balanced |
| **Agricultural** | Food +++ | Credits |
| **Mining** | Ore +++ | Credits |
| **Industrial** | Petroleum +++ | Ore |
| **Research** | Research +++ | Credits |
| **Desert** | Ore, Petroleum | Low food |
| **Ocean** | Food, Research | Credits |
| **Arctic** | Ore, Research | Low everything |

### Buying Planets

1. Navigate to **Sectors** (planets menu)
2. Click **"Buy Planet"**
3. Select planet type based on your needs
4. Pay the credit cost

**Cost Formula:** Base cost × (current planet count)

> **Tip:** Early game, balance food production with credits. Don't over-expand without food!

### The Galaxy Map

The galaxy contains **10 sectors** arranged in a network:
- **Your Sector:** 7-9 empires compete locally
- **Adjacent Sectors:** Connected by borders (1.2× attack cost)
- **Distant Sectors:** Connected by wormholes (1.5× attack cost)

---

## Military & Combat

### Unit Types

| Unit | Type | Strength | Cost | Notes |
|------|------|----------|------|-------|
| **Marines** | Ground | Low | Cheap | Essential for conquering planets |
| **Drones** | Space | Low | Cheap | Fast attack craft |
| **Frigates** | Space | Medium | Medium | Main battle line |
| **Cruisers** | Space | High | High | Heavy firepower |
| **Heavy Cruisers** | Space | Very High | Very High | Requires Research Level 4 |
| **Carriers** | Space | Extreme | Extreme | Capital ships |
| **Defense Stations** | Orbital | High | High | Cannot attack, only defend |
| **Covert Agents** | Special | N/A | High | Spies for intel and sabotage |

### Combat Phases

Combat resolves in three phases:

```
┌─────────────────────────────────────────────────┐
│  PHASE 1: SPACE BATTLE                          │
│  Drones, Frigates, Cruisers, Carriers engage    │
├─────────────────────────────────────────────────┤
│  PHASE 2: ORBITAL BOMBARDMENT                   │
│  Surviving ships bombard planetary defenses     │
├─────────────────────────────────────────────────┤
│  PHASE 3: GROUND ASSAULT                        │
│  Marines invade and capture the planet          │
└─────────────────────────────────────────────────┘
```

### Army Diversity Bonus

Having 4+ different unit types grants a **15% combat bonus**. Build a diverse force!

### Combat Stances

Before attacking, choose a stance:

| Stance | Effect |
|--------|--------|
| **Aggressive** | +20% damage, -10% defense |
| **Balanced** | No modifiers |
| **Defensive** | -10% damage, +20% defense |
| **Flanking** | +30% vs single unit type, -15% otherwise |

### D20 Combat System

Combat uses a dice-based resolution system:
- Each volley rolls `d20 + TAR` vs enemy `DEF`
- **Natural 20:** Critical hit (double damage)
- **Natural 1:** Fumble (attack misses)
- Three volleys per battle phase

---

## Diplomacy & Intelligence

### Diplomatic Options

| Agreement | Effect | Duration |
|-----------|--------|----------|
| **Non-Aggression Pact (NAP)** | Cannot attack each other | 10 turns |
| **Alliance** | Mutual defense, share intel | Until broken |
| **Coalition** | Team up for victory | Until dissolved |

### Messages

- Send messages to other empires (bot or player)
- Propose treaties via the Messages interface
- Receive war declarations, trade offers, and gossip

### Covert Operations

Build **Covert Agents** to conduct operations:

| Operation | Effect | Risk |
|-----------|--------|------|
| **Gather Intel** | See enemy forces | Low |
| **Sabotage** | Damage enemy production | Medium |
| **Steal Technology** | Copy research progress | High |
| **Assassinate** | Kill enemy leaders | Very High |

> **Warning:** Failed operations can be traced back to you!

---

## Research & Technology

### Research Levels

Invest Research Points to unlock technology:

| Level | Unlocks |
|-------|---------|
| 1 | Basic units, improved production |
| 2 | Frigates, Defensive Shields |
| 3 | Cruisers, Advanced Diplomacy |
| 4 | Heavy Cruisers, Covert Operations |
| 5 | Carriers, Coalition System |
| 6 | Defense Stations, Nuclear Weapons |
| 7 | Advanced Crafting |
| 8 | Victory through Technology |

### Research Branches

You can allocate research to specific branches:
- **Military:** Unit effectiveness
- **Economic:** Production bonuses
- **Covert:** Spy operation success rates
- **Diplomatic:** Treaty bonuses

---

## Advanced Systems

### Crafting (Unlocks Turn 15)

Convert raw resources into advanced components:

| Component | Ingredients | Used For |
|-----------|-------------|----------|
| **Electronics** | Ore + Credits | Advanced ships |
| **Armor Plating** | Ore + Petroleum | Heavy units |
| **Reactor Cores** | Petroleum + Research | Capital ships |

### The Syndicate (Unlocks Turn 20)

A black market for forbidden goods:
- **Contracts:** Complete tasks for trust and rewards
- **Black Market:** Buy rare components and weapons
- **Reputation:** Higher trust = better deals

### Nuclear Warfare (Unlocks Turn 100)

The ultimate weapon:
- Devastating damage to planets
- Kills population and destroys infrastructure
- **Warning:** Other empires will turn against you!

---

## Victory Conditions

There are **six paths to victory**:

| Victory Type | Condition | Difficulty |
|--------------|-----------|------------|
| **Conquest** | Control 60% of all planets | Hard |
| **Economic** | 1.5× networth of 2nd place empire | Medium |
| **Diplomatic** | Your coalition controls 50% territory | Medium |
| **Research** | Complete all 8 research levels | Hard |
| **Military** | 2× military power of all others combined | Very Hard |
| **Survival** | Highest networth at Turn 200 | Variable |

> **Pro Tip:** Don't commit to one strategy too early. Adapt based on how the galaxy develops!

---

## Early Game Strategy

### Turn-by-Turn Goals

| Turn | Goal | Why |
|------|------|-----|
| **1-5** | Build 200+ Marines | Basic defense |
| **5-10** | Expand to 7+ planets | Economic base |
| **10-15** | Start Research | Long-term investment |
| **15-20** | Form a NAP | Diplomatic security |
| **20** | Launch first attack | Protection ends! |
| **20-30** | Establish market presence | Trade for resources |

### First 5 Turns Checklist

- [ ] Check your starting resources
- [ ] Queue Marine production
- [ ] Buy 1-2 additional planets (prioritize Food)
- [ ] Review neighboring empires
- [ ] End turn and watch your empire grow

### Protection Period Strategy

During turns 1-20:
1. **Maximize food production** - Starving empires collapse fast
2. **Build a defensive force** - You'll need it at turn 21
3. **Scout your neighbors** - Know who's dangerous
4. **Save credits** - You'll need them post-protection
5. **Form early NAPs** - Diplomacy keeps you safe

---

## Tips & Tricks

### Economy Tips
- Balance planet types - don't neglect food
- Watch civil status - unhappy empires produce less
- Trade on the market - buy low, sell high
- Don't over-expand - each planet costs upkeep

### Combat Tips
- Always bring Marines - you can't capture without ground troops
- Diversity matters - 4+ unit types = 15% bonus
- Check enemy strength before attacking - intel saves lives
- Use stances strategically - aggressive for offense, defensive when outnumbered

### Diplomacy Tips
- NAPs are cheap insurance against attack
- Don't trust Warlord or Blitzkrieg archetype bots
- Merchants will trade, Diplomats will ally
- Check messages regularly - opportunities and threats arrive there

### Bot Archetypes

Learn to recognize AI personalities:

| Archetype | Behavior | Threat Level |
|-----------|----------|--------------|
| **Warlord** | Aggressive expansion | High |
| **Diplomat** | Forms alliances | Low |
| **Merchant** | Economic focus | Medium |
| **Schemer** | Covert operations | Medium |
| **Turtle** | Defensive buildup | Low |
| **Blitzkrieg** | Fast early attacks | Very High |
| **Tech Rush** | Research priority | Medium |
| **Opportunist** | Attacks weak targets | High |

---

## Feedback for Alpha Testers

As an alpha tester, please report:
- **Bugs:** Anything that doesn't work as expected
- **Balance Issues:** Units, costs, or systems that feel off
- **UI/UX Problems:** Confusing interfaces or missing information
- **Fun Factor:** What's enjoyable and what's frustrating

Thank you for testing Nexus Dominion!

---

*Good luck, Commander. The galaxy awaits your dominion.*

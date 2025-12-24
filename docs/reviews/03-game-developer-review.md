# Pass 3: Game Developer Review

**Date:** December 23, 2024
**Agent:** game-developer
**Agent ID:** a3faf06
**Status:** REVISED after stakeholder session

## Executive Summary

X-Imperium's core strategic foundation is now well-defined with engaging combat, multi-resource economy, and a robust mid-game engagement system. After stakeholder session, we've established: progressive unlocks, galactic events, alliance checkpoint system, and consequence-based balancing (not hard limits). Combat mechanics refined with retreat, reinforcements, and fog of war rules.

**Game Design Confidence: HIGH** — Ready for v0.5 implementation with clear mechanics.

## Core Loop Analysis

### Engagement Score: 8/10 (Revised)
- Solid foundation throughout game
- Mid-game sag addressed via progressive unlocks + galactic events

### Mid-Game Framework — CONFIRMED

**Progressive Unlocks:**
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

**Galactic Events (Every 10-20 turns, semi-random):**
| Type | Example Effects |
|------|-----------------|
| Economic | Market crash, resource boom, trade disruption |
| Political | New faction emerges, coup, assassination |
| Military | Pirate armada, alien incursion, arms race |
| Narrative | Lore drops, rumors, prophecies (flavor) |

**Alliance Checkpoints (Every 30 turns):**
- Check top 3 alliances + player alliance
- Evaluate: size, strength, territory, talent distribution
- If imbalance detected: merge weaker alliances, spawn challenger, force conflict
- Presentation: Partially visible (player sees event, not algorithm) — **Option C confirmed**

### Pacing Recommendations
```
Turns 1-30:   EXPANSION (learn mechanics, form alliances)
Turns 31-80:  COMPETITION (galactic events, coalition politics)
Turns 81-150: DOMINATION (superweapons, major conflicts)
Turns 151-200: ENDGAME (ultimatums, final showdowns)
```

## Combat System Review

### Balance Issues — RESOLVED

**Original Problems → Solutions:**
| Issue | Old Value | New Value | Rationale |
|-------|-----------|-----------|-----------|
| Station dominance | 100× | 50× (2× on defense) | Still strong, not unbeatable |
| Carrier obsolescence | 20× | 12× | Best unit, but not absurd |
| Fixed casualties | 30% always | 15-35% dynamic | Power ratio matters |

### Recommended Formula Revision (v0.5)

```javascript
function calculatePower(fleet, isDefender) {
  let fighters = fleet.fighters * 1;
  let cruisers = fleet.cruisers * 4;  // Reduced from 5
  let carriers = fleet.carriers * 12; // Reduced from 20

  // Diversity bonus - penalty for mono-unit armies
  let powerDiversity = countUnitTypes(fleet) / 3;
  let basePower = fighters + cruisers + carriers;

  if (isDefender) {
    let stations = fleet.stations * 50; // Reduced from 100
    basePower += stations;
    basePower *= 1.2; // Defender advantage
  }

  return basePower * (0.7 + 0.3 * powerDiversity);
}

function calculateLosses(attackPower, defensePower, units) {
  let powerRatio = defensePower / attackPower;
  let baseLossRate = 0.25; // Average 25%

  if (powerRatio > 2) baseLossRate += 0.15;  // Punish bad attacks
  if (powerRatio < 0.5) baseLossRate -= 0.10; // Reward overwhelming force

  return Math.floor(units * baseLossRate * (0.8 + Math.random() * 0.4));
}
```

### Combat Mechanics — CONFIRMED

| Mechanic | Rule |
|----------|------|
| **Retreat** | Allowed, but suffer "attack of opportunity" — 15% additional losses |
| **Reinforcements** | Request from alliance, arrival = distance-based (1-5 turns) |
| **Request System** | Alliance member gets notification, can Accept/Deny |
| **Deny Consequence** | Alliance standing drops, trust decay, potential diplomatic event |
| **Fog of War** | See total military power, not composition. Scouts/spies reveal details |
| **Diversity Bonus** | +15% combat power if army has 4+ unit types |

**Unit Stats (Revised):**
| Unit | Attack | Defense | Cost |
|------|--------|---------|------|
| Soldiers | 1 | 1 | 50 |
| Fighters | 3 | 2 | 200 |
| Light Cruisers | 5 | 4 | 500 |
| Heavy Cruisers | 8 | 6 | 1000 |
| Carriers | 12 | 10 | 2500 |
| Stations | 50 | 50 | 5000 |

## AI Bot Architecture

### Tier Distribution Problem

**Current (unbalanced):**
- LLM Elite: 1-2 bots (1%) - Most players never encounter intelligent opponents
- Standard: 50-60 bots (60%) - Majority are boring

**Recommended:**
- LLM Elite: 10 bots (10%) - Player fights 1-2 per game
- Advanced: 30 bots (30%) - Dynamic meta-game
- Standard: 40 bots (40%) - Filler opponents
- Chaotic: 20 bots (20%) - Wildcards

### Performance Analysis

**CRITICAL: 99 bots per turn**

```
Current estimate (sequential):
(10 × 2000ms LLM) + (30 × 100ms) + (40 × 10ms) + (20 × 1ms)
= 23,420ms = 23.4 seconds ← UNACCEPTABLE
```

**Solution: Parallel + No LLM in v0.5**

```javascript
async function processTurn(bots) {
  // Batch 1: Simple bots (parallel)
  let simpleBots = bots.filter(b => b.tier >= 3);
  await Promise.all(simpleBots.map(b => b.processTurn())); // ~100ms

  // Batch 2: Advanced bots (batched parallel)
  let advancedBots = bots.filter(b => b.tier === 2);
  await processInBatches(advancedBots, 5); // ~600ms

  // v0.6+: LLM bots async with "Thinking..." indicator
}
```

**v0.5 Recommendation: No LLM bots**
- Achieves <500ms turn processing
- Add LLM in v0.6 with async processing

### Decision Trees Needed (v0.5)

BOT_ARCHITECTURE.md is too vague. Need concrete implementations:

```javascript
class WarlordBot {
  decideTurnActions(gameState) {
    let actions = [];

    // 70% budget to military
    if (gameState.credits > 1000) {
      actions.push({
        type: 'BUILD_UNITS',
        allocation: { fighters: 0.3, cruisers: 0.4, carriers: 0.3 },
        budget: gameState.credits * 0.7
      });
    }

    // Attack weakest neighbor if 2× power
    let targets = gameState.neighbors.sort((a, b) => a.power - b.power);
    if (targets[0] && gameState.myPower > targets[0].power * 2) {
      actions.push({
        type: 'ATTACK',
        target: targets[0],
        forceCommitment: 0.6
      });
    }

    return actions;
  }
}

class DiplomatBot {
  decideTurnActions(gameState) {
    // 60% budget to economy
    // Seek alliances with strong neighbors
    // Only attack as part of coalition
  }
}

class EconomistBot {
  decideTurnActions(gameState) {
    // 50% budget to research
    // Market manipulation
    // Sabotage strongest neighbor
  }
}
```

### Archetype Differentiation

Need **unique passive abilities**, not just behavior weights:

```javascript
// Warlord: War Economy
// When at war, military production -20% cost

// Diplomat: Trade Network
// Each alliance grants +10% income

// Economist: Market Insight
// Can see next turn's market prices

// Schemer: Shadow Network
// Covert agents -50% cost, +20% success

// Turtle: Fortification Expert
// Defensive structures 2× effectiveness
```

## Economy & Balance

### Dominant Strategy Risks — REVISED

**1. Carrier Spam Meta** ✓ SOLVED
- Diversity bonus (+15% for mixed fleets)
- Carrier nerf to 12×

**2. Turtle + Economic Victory** → TESTING
- Original: Passive empire penalty
- **Revised:** Mark for playtesting, may self-balance
- If problematic: Narrative intervention (unrest, rebellion events)

**3. Market Manipulation** → CONSEQUENCE-BASED
- **No hard limits** — manipulation is a valid strategy!
- **Consequence:** Hoarding >40% of any resource triggers events:
  - Turn N: "Rumors spread of your monopoly..."
  - Turn N+5: "The Merchant Guild demands fair pricing"
  - Turn N+10: CHOICE — release stock OR face consequences
  - Turn N+15: Pirates/Cartel/Rival coalition attacks
- Risk/Reward: Survive the heat → economic dominance

### Market System (Undefined)

```javascript
class GlobalMarket {
  basePrices = { food: 10, ore: 15, petroleum: 20, research: 50 };

  calculatePrice(resource) {
    let ratio = this.demand[resource] / this.supply[resource];
    let multiplier = Math.log10(ratio) + 1; // 0.1× to 10×
    return Math.floor(this.basePrices[resource] * multiplier);
  }

  // NPC market makers ensure liquidity
  addNPCOrders() {
    // Always buy at 80% market, sell at 120%
  }
}
```

### Snowball Prevention — REVISED

**Philosophy:** Consequence-based, not artificial rubber-banding

**Approach: MEDIUM**
- ✓ Alliance checkpoint system (every 30 turns)
- ✓ Maintenance scaling for large empires
- ✗ NO catch-up bonuses for losing players

**Detection System (v0.5-v0.6):**
```
LOGGED, NOT AUTO-APPLIED:
├─ "Runaway detected: Player controls 45%, next is 12%"
├─ "Recommended interventions: [list]"
└─ Designer manually decides what to trigger

NARRATIVE RESPONSES (preferred):
├─ Alliance mergers
├─ Economic sanctions on leader
├─ "Galactic Liberation Front" spawns
└─ Skirmishes level playing field organically
```

**Key Principle:** Player can re-establish dominance (triggers more events). Winning is possible AND losing is possible.

## Victory Conditions — CONFIRMED

### Simplified to 6 Clear Paths

| Victory | Condition | Playstyle |
|---------|-----------|-----------|
| **Conquest** | Control 60% of territory | Aggressive expansion |
| **Economic** | 1.5× networth of 2nd place | Builder/trader |
| **Diplomatic** | Coalition controls 50% territory | Alliance politics |
| **Research** | Complete tech tree | Turtle/tech rush |
| **Military** | 2× military of all others combined | Domination |
| **Survival** | Highest score at turn 200 | Balanced play |

**Removed (redundant):**
- ~~Cultural (tourism)~~ — just economic with different label
- ~~Population~~ — correlates with economic

### Edge Cases

**Simultaneous Victory Resolution:**
```javascript
const VICTORY_PRIORITY = [
  'conquest', 'research', 'diplomatic',
  'economic', 'military', 'survival'
];
```

**Impossible Victory Detection:**
- Warn player when chosen path becomes mathematically impossible
- Offer alternative victory suggestion

**Stalemate Prevention:**
- Turn 180: Check if any victory feasible
- Activate "Sudden Death" - alliances dissolved, last empire standing

## Turn Processing

### Order of Operations (v0.5)

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

### Performance Budget (Optimized)
```
Database reads:       150ms  (single query with joins)
Bot AI processing:   2000ms  (no LLM for v0.5)
Combat resolution:     50ms  (parallelized)
Database writes:      200ms  (batched transactions)
Market calculations:   25ms  (cached prices)
Buffer:               575ms
────────────────────────────
TOTAL:               3000ms  ✓ (under 5s target)
```

## Priority Items

### v0.5 MVP (Weekend Target)

1. **Core Turn Processing Loop** - 6-phase sequence, <3s target
2. **Combat System Foundation** - Revised formulas, retreat mechanics
3. **Bot Decision Trees (3 Archetypes)** - Warlord, Diplomat, Economist
4. **Market System** - Dynamic pricing, NPC makers, limits
5. **Victory Conditions (4 Types)** - Conquest, Economic, Research, Survival

### v0.6 Enhancements

6. Advanced Combat (guerrilla, invasion attrition)
7. Bot Archetype Expansion (Schemer, Turtle, Explorer)
8. Economy Balancing (synergies, taxation, rebellion)
9. Mid-Game Milestones (turn 50/100/150 events)
10. Automated Balance Testing

### v0.7 Advanced

11. LLM Bot Integration (GPT-3.5, async processing)
12. Worker Thread Parallelization
13. Coalition Warfare
14. Wonder System

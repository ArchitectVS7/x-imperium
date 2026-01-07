# Nexus Dominion: Future Visions

**Status:** Post-Launch Enhancement Roadmap
**Last Updated:** December 30, 2024
**Source Documents:** game-evolution-plan.md, crafting-integration-plan.md, crafting-system-implementation.md

---

## Overview

This document outlines future enhancements and deferred features for Nexus Dominion. It represents a natural progression from the current implementation, building on the foundation of crafting, syndicate, coalitions, and wormhole systems already in place.

**Current Baseline (December 2024):**
- ✅ Crafting system (3 tiers, 19 resources)
- ✅ Syndicate/Black Market (8 trust levels, contracts)
- ✅ Coalition mechanics (formation, bonuses, raids)
- ✅ Wormhole construction (instant sector travel)
- ✅ Research branches (6 branches, 8 levels)
- ✅ WMD systems (Chemical, Nuclear, Bio weapons)
- ✅ LLM-powered Tier 1 bots (10 elite opponents)

**Guiding Principle:** Build on proven systems through playtesting feedback before adding new complexity.

---

## Quick Reference: Feature Status

| Feature Category | Status | Location |
|------------------|--------|----------|
| **Crafting (3 tiers, 19 resources)** | ✅ Complete | `src/lib/game/services/crafting-service.ts` |
| **Syndicate/Black Market** | ✅ Complete | `src/app/actions/syndicate-actions.ts` |
| **Coalition Mechanics** | ✅ Complete | `src/lib/game/services/coalition-service.ts` |
| **Wormhole Construction** | ✅ Complete | `src/lib/game/services/wormhole-service.ts` |
| **Research Branches** | ✅ Complete | `src/lib/game/services/research-service.ts` |
| **WMD Systems** | ✅ Complete | Integrated in combat system |
| **LLM Bots (Tier 1)** | ✅ Complete | `src/lib/llm/` |
| **Strategic Systems (Virus, ECM)** | ⚠️ Schema only | Schema ready, UI pending |
| **Persistent Pirates** | ❌ Future | Wave 1 priority |
| **Hoarding Detection** | ❌ Future | Wave 2 priority |
| **Information Warfare** | ❌ Future | Wave 3 priority |
| **Branching Tech Tree** | ❌ Future | Wave 4 (v2.0) |

---

## Part 1: Pirate System Enhancements

**Current Status:** ⚠️ Basic pirate raids exist via Syndicate contracts (supply runs, disruption missions). Missing: persistent factions, raid history, player interactions.

### 1.1 Persistent Pirate Factions (HIGH PRIORITY)

**Source:** game-evolution-plan.md, crafting-system-implementation.md

**Goal:** Evolve one-off raids into persistent threats that grow and respond to player actions.

**Proposed Schema:**
```typescript
interface PirateFaction {
  id: string;
  gameId: string;
  name: string;
  strength: number;           // Grows from stolen goods
  stolenCredits: bigint;
  stolenResources: Record<string, number>;
  targetPreference: 'wealthy' | 'weak' | 'hoarder' | 'random';
  lastRaidTurn: number;
  isActive: boolean;
  baseLocation?: string;      // Can be found/destroyed
}
```

**Features:**
- Pirates grow stronger from successful raids
- Multiple factions with different target preferences
- Pirate bases can be discovered and destroyed
- Faction strength scales with game progress

### 1.2 Pirate Raid History

**Source:** crafting-system-implementation.md

```typescript
interface PirateRaid {
  id: string;
  gameId: string;
  pirateFactionId: string;
  targetEmpireId: string;
  turn: number;
  triggeredBy: 'random' | 'hoarding' | 'syndicate_contract';
  syndicateContractId?: string;
  creditsStolen: number;
  resourcesStolen: Record<string, number>;
  wasRepelled: boolean;
  piratesCasualties: number;
  defenderCasualties: Record<string, number>;
}
```

**Purpose:** Track raid history for narrative, statistics, and player feedback.

### 1.3 Player-Pirate Interactions

**Source:** game-evolution-plan.md

| Interaction | Effect |
|-------------|--------|
| **Pay Tribute** | Temporary immunity (5 turns) |
| **Hunt Pirate Base** | Military action, high reward if successful |
| **Hire Pirates** | Attack other players, reputation cost |

---

## Part 2: Anti-Exploit Ecosystem

### 2.1 Hoarding Detection & Response (HIGH PRIORITY)

**Source:** game-evolution-plan.md

```typescript
function detectHoarding(player: Player, resource: Resource): boolean {
  const marketShare = player.resources[resource] / totalResourceInGame[resource];
  const priceSpike = currentPrice[resource] / basePrice[resource];
  return marketShare > 0.4 || priceSpike > 2.0;
}
```

**Response Chain:**
1. Turn N: Hoarding detected (private knowledge)
2. Turn N+3: Rumors spread about scarcity
3. Turn N+5: Pirates start targeting hoarder
4. Turn N+10: Black market offers resource
5. Turn N+15: Syndicate issues hit contract
6. Turn N+20: Public broadcast if still hoarding

### 2.2 Turtle Detection

**Source:** game-evolution-plan.md

```typescript
function detectTurtle(player: Player): boolean {
  return player.attacksLast20Turns === 0 &&
         player.defensiveUnitsRatio > 0.7 &&
         player.networth > averageNetworth * 1.3;
}
```

**Response:**
- Coalition formation against turtle
- Increased pirate raid frequency
- Syndicate "protection" offers

### 2.3 Tech Rush Detection

**Source:** game-evolution-plan.md

```typescript
function detectTechRush(player: Player): boolean {
  return player.researchLevel >= 5 &&
         player.militaryPower < averageMilitaryPower * 0.5;
}
```

**Response:**
- Aggressive archetypes prioritize this target
- Research victory requires military defense

### 2.4 Market Manipulation Detection

**Source:** game-evolution-plan.md

**Detection:**
- Track volume share of recent trades
- Detect suspicious price movements

**Response:**
- Increased market fees for manipulator
- Rumors inform other players
- Pirates target resource shipments

---

## Part 3: Information Warfare System

### 3.1 Knowledge Categories

**Source:** game-evolution-plan.md

| Category | Visibility | Examples |
|----------|------------|----------|
| **Public** | All players | Rankings, treaties, battle outcomes |
| **Private** | Only you | Exact resources, military composition |
| **Intelligence** | Gained through ops | Enemy estimates with accuracy % |

### 3.2 Rumor System

**Source:** game-evolution-plan.md

```typescript
interface InformationEvent {
  type: 'rumor' | 'intel' | 'broadcast' | 'fabrication';
  content: string;
  source: 'player' | 'mafia' | 'pirate' | 'covert_op';
  accuracy: number;          // 0.0 - 1.0 (fabrications are 0)
  visibleTo: string[];
  turnsToSpread: number;     // Rumors spread over time
}
```

**Mechanics:**
- Large transactions create rumors
- Rumors spread 2-3 players per turn
- Accuracy degrades as it spreads
- Covert ops can inject false rumors

### 3.3 Framing Operations (ADVANCED)

**Source:** game-evolution-plan.md

**The Ultimate Intrigue Mechanic:**

1. **Setup Phase** (5-10 turns)
   - Syndicate buys up a resource secretly
   - Plants fake transaction records
   - Creates fake battle reports

2. **Accusation Phase**
   - Public broadcast: "Player A is hoarding Ore!"
   - Other players see "evidence" in market records
   - Hit contract issued

3. **Consequences**
   - Framed player attacked by multiple bots
   - Pirates "retaliate" against them
   - Even if innocent, damage is done

4. **Counter-Intelligence**
   - High covert tech can detect fabrications
   - "Accuracy" field on intel can expose lies
   - Successful debunk damages syndicate reputation

---

## Part 4: Loan Shark System

### 4.1 Overview

**Source:** game-evolution-plan.md

Replace traditional banking with narrative-appropriate loan sharks.

```typescript
interface Loan {
  principal: number;
  interestRate: number;      // 10-30% depending on trust
  turnsRemaining: number;
  missedPayments: number;
}
```

### 4.2 Loan Terms by Trust Level

| Trust | Max Loan | Interest | Term |
|-------|----------|----------|------|
| 1 | 10,000 | 30% | 10 turns |
| 3 | 50,000 | 20% | 15 turns |
| 5 | 200,000 | 10% | 25 turns |

### 4.3 Default Consequences

If `missedPayments >= 3`:
- Syndicate sends enforcers (attacks player)
- Reputation damaged
- Assets seized (resources/units)

---

## Part 5: Bookie/Gambling System

### 5.1 Betting Mechanics

**Source:** game-evolution-plan.md

| Bet Type | Description |
|----------|-------------|
| **Victory Bet** | Bet on who will win the game |
| **Elimination Bet** | Bet on next player to be eliminated |
| **Ranking Bet** | Bet on turn-end rankings |
| **Self-Insurance** | Bet against yourself (payout if you lose) |

**Mechanics:**
- Odds calculated from current standings
- High-risk/high-reward for struggling players
- Creates information value (reveals market sentiment)

---

## Part 6: Coalition Mechanics

**Status:** ✅ **IMPLEMENTED (December 2024)**

**Current Features:**
- ✅ Anti-dominant player coalition formation
- ✅ Coalition bonuses (defense pacts, intel sharing, market preferencing)
- ✅ Coalition raids (coordinated attacks)
- ✅ Dynamic membership based on networth/territory thresholds
- ✅ Bot coordination and joint attack planning

**Location:** `src/lib/game/services/coalition-service.ts`

### 6.3 Future Coalition Enhancements

**Potential Additions:**
- Coalition chat/coordination interface for human players
- Coalition-specific contracts via Syndicate
- Cross-coalition espionage and betrayal mechanics
- Coalition victory condition (team-based win)

---

## Part 7: Advanced Military Units

### 7.1 Wormhole System

**Status:** ✅ **IMPLEMENTED (December 2024)**

**Current Features:**
- ✅ Wormhole construction (requires research + warp drives)
- ✅ Instant sector travel
- ✅ Strategic positioning and sector control

**Location:** `src/lib/game/services/wormhole-service.ts`

### 7.2 Strategic Systems (Schema Ready, UI Pending)

**Status:** ⚠️ Database schema exists, crafting UI not implemented

**Source:** crafting-system.md

| System | Cost | Components | Effect | Status |
|--------|------|------------|--------|--------|
| **Virus Uplink** | 20,000 | 2 Quantum Processors, 1 Neural Interface | Disable 20% enemy defenses | Schema ✅ UI ❌ |
| **Command Ship Upgrade** | 25,000 | 1 Neural Interface, 1 Reactor Core | Fleet command bonus | Schema ✅ UI ❌ |
| **Targeting Computer** | 15,000 | 1 Quantum Processor, 1 Advanced Sensor | +15% attack accuracy | Schema ✅ UI ❌ |
| **ECM Suite** | 18,000 | 1 Advanced Sensor, 1 Electronics | -10% enemy accuracy | Schema ✅ UI ❌ |

**Implementation Notes:** Resource types exist in `craftedResources` enum. Need to:
1. Add crafting recipes to `CRAFTING_RECIPES` constant
2. Create UI for strategic systems installation
3. Add combat integration for system effects

### 7.3 Psionic Weapons (Future Research)

**Source:** crafting-system.md

| Weapon | Research | Effect |
|--------|----------|--------|
| **Psionic Bombs** | Level 7 | Mass confusion, -80% morale 10 turns |

---

## Part 8: Tech Tree Branching

### 8.1 Branching Research (Future Version)

**Source:** game-evolution-plan.md

Current: Linear 8-level progression
Future: Branching tree with exclusive paths

```
                    [Basic Research]
                          |
            +-------------+-------------+
            |             |             |
      [Military]     [Economic]    [Covert]
            |             |             |
    +-------+-------+     |       +-----+-----+
    |       |       |     |       |           |
[Weapons][Ships][Defense] |   [Espionage][Sabotage]
```

### 8.2 Pinnacle Technologies

**Source:** game-evolution-plan.md

Research Victory rework: Complete 3 "Pinnacle Technologies" in any branch

| Branch | Pinnacle | Effect |
|--------|----------|--------|
| **Military** | Stellar Dreadnought | Ultimate ship |
| **Economic** | Galactic Trade Network | 10% of all trades |
| **Covert** | Shadow Government | Control one enemy empire |

---

## Part 9: Feature Flags

### 9.1 Recommended Flags

**Source:** crafting-system-implementation.md

```typescript
interface GameFeatureFlags {
  enableCrafting: boolean;      // Toggle entire crafting system
  enableSyndicate: boolean;     // Toggle Black Market/Contracts
  enablePirates: boolean;       // Toggle pirate raids
  enableResearchBranches: boolean;  // Toggle branch bonuses
  pirateAggressiveness: 'low' | 'medium' | 'high';
}
```

**Purpose:** Allow disabling systems during testing and for game mode variants.

---

## Part 10: Bot Intelligence Enhancements

### 10.1 Pirate Response Strategies

**Source:** crafting-system-implementation.md

| Strategy | Description |
|----------|-------------|
| **ignore** | Accept losses, focus elsewhere |
| **defend** | Build military to repel |
| **retaliate** | Hunt pirate bases |
| **hire_back** | Use Syndicate to redirect pirates |

### 10.2 Betrayal Likelihood

**Source:** crafting-system-implementation.md

```typescript
interface BotSyndicatePreference {
  engagement: 'never' | 'reluctant' | 'opportunistic' | 'enthusiastic';
  contractRiskTolerance: number; // 0.0 - 1.0
  betrayalLikelihood: number;    // 0.0 - 1.0 (report to Coordinator)
}
```

**Per-Archetype:**
- Diplomat: Would always report (1.0)
- Warlord: Rarely reports (0.1)
- Schemer: Opportunistic (0.3)

---

## Part 11: UI Enhancements (Deferred)

### 11.1 Pirate Alert System

**Source:** crafting-system-implementation.md

- `PirateAlert.tsx` - Raid notification
- `PirateReport.tsx` - Raid results
- `PirateThreatLevel.tsx` - Current threat indicator

### 11.2 Advanced Intel Display

- Enemy resource estimates with accuracy %
- Rumor feed with spread status
- Coalition visualization

---

## Implementation Priority

**Legend:**
- ✅ = Implemented
- ⚠️ = Partially implemented (schema/backend ready, UI pending)
- 🔄 = In consideration for next milestone
- 📋 = Planned for future version

### Current Baseline (Already Done)
1. ✅ Crafting System (3 tiers, 19 resources, queue management)
2. ✅ Syndicate/Black Market (8 trust levels, contracts, catalog)
3. ✅ Coalition Mechanics (formation, bonuses, raids)
4. ✅ Wormhole Construction (instant sector travel)
5. ✅ Research Branches (6 branches with specialization)
6. ✅ WMD Systems (Chemical, Nuclear, Bio weapons)
7. ✅ LLM Bots (10 Tier 1 elite opponents with GPT decision-making)

### Wave 1 (Post-Launch Polish - Q1 2025)
1. 🔄 **Strategic Systems UI** - Crafting interface for Virus Uplink, ECM Suite, etc.
2. 🔄 **Feature Flags** - Toggle systems on/off for testing/variants
3. 🔄 **Persistent Pirate Factions** - Factions that grow stronger over time
4. 🔄 **Pirate Raid History** - Track raids for narrative and statistics
5. 🔄 **Tutorial Improvements** - Extend onboarding to cover crafting/syndicate

### Wave 2 (Ecosystem Balance - Q2 2025)
1. 📋 **Hoarding Detection & Response** - Anti-exploit for resource manipulation
2. 📋 **Anti-Turtle Mechanics** - Punish passive defensive play
3. 📋 **Tech Rush Detection** - Balance research vs military
4. 📋 **Market Manipulation Detection** - Anti-exploit for trade abuse
5. 📋 **Loan Shark System** - Syndicate loans with consequences

### Wave 3 (Information Warfare - Q3 2025)
1. 📋 **Rumor System** - Information spreads with degrading accuracy
2. 📋 **Intelligence Operations** - Spy reports with accuracy ratings
3. 📋 **Framing Operations** - Plant false evidence via Syndicate
4. 📋 **Bookie/Gambling** - Bet on game outcomes, self-insurance

### Wave 4 (v2.0 - Major Expansion)
1. 📋 **Branching Tech Tree** - Exclusive research paths with pinnacle technologies
2. 📋 **Psionic Weapons** - New research branch and weapon types
3. 📋 **Advanced Bot Betrayal** - Archetype-specific Syndicate engagement
4. 📋 **Coalition Victory** - Team-based win condition
5. 📋 **Player-Pirate Diplomacy** - Tribute, hunt bases, hire pirates

---

## Questions for Future Design

1. **Pirate Strength Scaling:** Static or scales with game progress?
2. **Loan Default:** Immediate attack or grace period?
3. **Framing Accuracy:** How easy to detect fake evidence?
4. **Coalition Size:** Max players in anti-turtle coalition?
5. **Nuclear Weapons:** Black market exclusive or high research option?

---

## Changelog

- **2024-12-30:** Major update reflecting implemented systems (coalitions, wormholes, crafting, syndicate, LLM bots). Reorganized priority waves from current baseline. Updated to reflect natural progression from December 2024 state.
- **2024-12-28:** Initial consolidation from game-evolution-plan.md, crafting-integration-plan.md, crafting-system-implementation.md

---

## Summary

**What We Have (December 2024):**
A feature-complete 4X strategy game with crafting, black market intrigue, coalition warfare, instant sector travel, and elite AI opponents powered by LLMs. The core gameplay loop is solid and ready for playtesting.

**What's Next:**
Iterative improvements based on player feedback. Wave 1 focuses on polish (strategic systems UI, feature flags, tutorial improvements). Wave 2 tackles ecosystem balance and anti-exploit mechanics. Waves 3-4 add depth through information warfare and branching progression systems.

**Philosophy:**
Build on what works. Let playtesting guide priorities. Avoid feature creep - every addition must enhance the core experience, not dilute it.

---

*This document is a living roadmap. Features will be promoted, reprioritized, or archived based on playtesting feedback and community engagement.*

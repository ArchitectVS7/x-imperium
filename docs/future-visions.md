# Nexus Dominion: Future Visions

**Status:** Deferred Features for Post-Playtesting
**Last Updated:** December 28, 2024
**Source Documents:** game-evolution-plan.md, crafting-integration-plan.md, crafting-system-implementation.md

---

## Overview

This document consolidates all deferred features, unused ideas, and future enhancement concepts from the crafting system design process. These ideas are valuable but have been intentionally deferred to avoid feature creep during initial playtesting.

**Guiding Principle:** Get the core crafting/syndicate/research system stable through playtesting before adding complexity.

---

## Part 1: Pirate System Enhancements

### 1.1 Persistent Pirate Factions (HIGH PRIORITY)

**Source:** game-evolution-plan.md, crafting-system-implementation.md

The current pirate system triggers raids but lacks persistent faction entities.

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

### 6.1 Anti-Dominant Player Coalitions

**Source:** game-evolution-plan.md

**Detection:**
- Player exceeds 1.5x average networth
- Player controls 30%+ of territory

**Coalition Formation:**
- Bots coordinate defensive treaties
- Joint attack planning
- Resource sharing against dominant player

### 6.2 Coalition Bonuses

| Bonus | Effect |
|-------|--------|
| **Defense Pact** | +20% defense when allied planets attacked |
| **Intel Sharing** | Coalition members share spy reports |
| **Market Preferencing** | Coalition trade bonuses |

---

## Part 7: Advanced Military Units

### 7.1 Strategic Systems (Deferred)

**Source:** crafting-system.md

| System | Cost | Components | Effect |
|--------|------|------------|--------|
| **Virus Uplink** | 20,000 | 2 Quantum Processors, 1 Neural Interface | Disable 20% enemy defenses |
| **Wormhole Generator** | 60,000 | 1 Warp Drive, 1 Singularity Containment | Instant attack (no warning) |
| **Command Ship Upgrade** | 25,000 | 1 Neural Interface, 1 Reactor Core | Fleet command bonus |

### 7.2 Psionic Weapons

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

### Wave 1 (Post-Playtesting)
1. Persistent Pirate Factions
2. Pirate Raid History
3. Feature Flags
4. Hoarding Detection

### Wave 2 (Future Milestone)
1. Anti-Turtle Mechanics
2. Coalition Formation
3. Loan Shark System

### Wave 3 (v2)
1. Information Warfare
2. Framing Operations
3. Branching Tech Tree
4. Bookie System

---

## Questions for Future Design

1. **Pirate Strength Scaling:** Static or scales with game progress?
2. **Loan Default:** Immediate attack or grace period?
3. **Framing Accuracy:** How easy to detect fake evidence?
4. **Coalition Size:** Max players in anti-turtle coalition?
5. **Nuclear Weapons:** Black market exclusive or high research option?

---

## Changelog

- **2024-12-28:** Initial consolidation from game-evolution-plan.md, crafting-integration-plan.md, crafting-system-implementation.md

---

*This document is a living repository of deferred features. Ideas will be promoted to the PRD after playtesting validates core systems.*

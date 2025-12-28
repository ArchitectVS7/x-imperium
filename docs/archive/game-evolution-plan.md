# X-Imperium Game Evolution Plan

## Vision Statement

Moving beyond a simple Solar Realms Elite port into an evolved single-player experience with:
- **Narrative-driven balance** (not artificial nerfs)
- **Strategic depth** through crafting, tech trees, and meaningful choices
- **Anti-exploit mechanics** that emerge organically from NPC factions
- **Intrigue systems** where information warfare matters

---

## Current State Analysis

### Fully Implemented ✅
| System | Status | Notes |
|--------|--------|-------|
| Diplomacy | Complete | Treaties, NAP, alliances, reputation (0-100) |
| Trade/Market | Complete | Dynamic pricing, 2% fees, supply/demand |
| Research | Complete | 8 linear levels, exponential cost |
| Unit Production | Complete | Queue system, credits + population costs |

### Partially Implemented 🟡
| System | Status | Notes |
|--------|--------|-------|
| Pirates | Combat only | Phase exists but pirates never spawn/attack |
| Bot Decisions | Basic | Archetype weights, but stubs for diplomacy/trade |

### Not Implemented 🔴
| System | Status | Notes |
|--------|--------|-------|
| Black Market | Stubbed | Just a feature unlock at turn 30 |
| Tech Tree | None | Research is linear, doesn't unlock weapons |
| Crafting | None | Units cost credits only, not resources |
| Loan Sharks | None | Banking exists in design docs only |
| Bookie | None | Lottery exists in design docs only |
| Hit Contracts | None | Mafia faction not implemented |
| Framing Ops | None | Disinformation system not implemented |

---

## Phase 1: Foundation Fixes (Immediate)

### 1.1 Activate Diplomacy/Trade in Bot Decisions
Currently stubbed in `decision-engine.ts`:
```typescript
diplomacy: 0.10, // Stub: resolves to do_nothing until M7
trade: 0.10, // Stub: resolves to do_nothing until M7
```

**Tasks:**
- [ ] Implement `generateDiplomacyDecision()` - propose treaties based on archetype
- [ ] Implement `generateTradeDecision()` - buy/sell based on needs and market
- [ ] Merchant bots prioritize trade (20% weight)
- [ ] Diplomat bots prioritize treaties (25% weight)

### 1.2 Resource-Based Unit Construction (Crafting Lite)
Current: Units cost only credits + population
Proposed: Units require resources

| Unit | Credits | Population | Ore | Petroleum | Electronics |
|------|---------|------------|-----|-----------|-------------|
| Soldiers | 50 | 0.2 | 0 | 0 | 0 |
| Fighters | 200 | 0.4 | 10 | 5 | 0 |
| Stations | 5,000 | 0.5 | 100 | 50 | 20 |
| Light Cruisers | 500 | 1.0 | 30 | 20 | 10 |
| Heavy Cruisers | 1,000 | 2.0 | 80 | 50 | 30 |
| Carriers | 2,500 | 3.0 | 150 | 100 | 50 |
| Covert Agents | 4,090 | 1.0 | 0 | 0 | 20 |

**New Resource: Electronics**
- Produced by "Industrial" planet type (new)
- Or crafted from ore + petroleum
- Required for advanced units

---

## Phase 2: Technology Tree

### 2.1 Replace Linear Research with Branching Tech Tree

Current: 8 levels, exponential cost, only unlocks Light Cruisers at level 2

Proposed Tech Tree Structure:
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
    |       |       |     |       |           |
    v       v       v     v       v           v
   ...     ...     ...   ...     ...         ...
```

### 2.2 Military Tech Branch
```
Military Research (Level 1-3)
├── Weapons Tech
│   ├── Chemical Weapons (unlock chemical attacks)
│   ├── Biological Weapons (unlock plague attacks)
│   └── Nuclear Weapons (unlock via Black Market OR high research)
├── Ship Tech
│   ├── Fighter Improvements (+20% fighter effectiveness)
│   ├── Cruiser Designs (unlock Light Cruisers)
│   ├── Capital Ships (unlock Heavy Cruisers, Carriers)
│   └── Stealth Tech (reduce detection chance)
└── Defense Tech
    ├── Planetary Shields (+defense bonus)
    ├── Station Upgrades (+station power)
    └── Point Defense (counter missiles/fighters)
```

### 2.3 Economic Tech Branch
```
Economic Research (Level 1-3)
├── Production
│   ├── Mining Efficiency (+ore production)
│   ├── Refinery Tech (+petroleum production)
│   └── Automation (+all production)
├── Trade
│   ├── Market Analysis (-trading fees)
│   ├── Trade Networks (+trade partner slots)
│   └── Futures Trading (price prediction)
└── Population
    ├── Medicine (+population growth)
    ├── Urban Planning (+population cap)
    └── Entertainment (+civil status)
```

### 2.4 Covert Tech Branch
```
Covert Research (Level 1-3)
├── Espionage
│   ├── Surveillance (reveal enemy stats)
│   ├── Counter-Intel (block enemy spies)
│   └── Deep Cover (extended ops)
├── Sabotage
│   ├── Economic Sabotage (damage resources)
│   ├── Military Sabotage (damage units)
│   └── Infrastructure (damage production)
└── Influence
    ├── Propaganda (affect civil status)
    ├── Bribery (affect enemy troops)
    └── Disinformation (plant false intel)
```

### 2.5 Research Victory Rework
Old: Reach level 7 (spam research = win)
New: Complete 3 "Pinnacle Technologies" in any branch

Pinnacle Technologies (examples):
- Military: "Stellar Dreadnought" (ultimate ship)
- Economic: "Galactic Trade Network" (10% of all trades)
- Covert: "Shadow Government" (control one enemy empire)

This requires strategic choice, not just time.

---

## Phase 3: NPC Factions

### 3.1 Pirates Faction

**Role:** Economic balancer, threat to weak players, source of black market goods

**Mechanics:**
```typescript
interface PirateFaction {
  strength: number;           // Grows from stolen goods
  baseLocation: "hidden" | PlanetId;  // Can be found/destroyed
  targetPreference: "wealthy" | "weak" | "hoarder";
  stolenResources: ResourcePool;
}
```

**Behavior Triggers:**
1. **Regular Raids** - Random chance each turn, scales with player wealth
2. **Hoarding Response** - If any resource market share > 40%, pirates target that player
3. **Weakness Exploitation** - Players with low military get higher raid chance
4. **Stolen Goods** - Pirates sell stolen resources to Black Market

**Player Interactions:**
- Pay tribute (temporary immunity)
- Hunt pirate base (military action, high reward)
- Hire pirates (attack other players, reputation cost)

### 3.2 Black Market / Mafia Faction

**Role:** Underground economy, alternative progression path, contract system

**Trust System:**
```typescript
interface BlackMarketStanding {
  trustLevel: 0 | 1 | 2 | 3 | 4 | 5;  // 0 = unknown, 5 = inner circle
  completedContracts: number;
  failedContracts: number;
  totalSpent: number;
  debts: Loan[];
}
```

**Trust Level Unlocks:**
| Level | Requirement | Unlocks |
|-------|-------------|---------|
| 0 | None | Nothing (need introduction) |
| 1 | Turn 30 OR contact event | View black market prices |
| 2 | 1 contract OR 10k spent | Buy common contraband |
| 3 | 3 contracts | Loan sharks, hit contracts |
| 4 | 5 contracts + reputation | Chemical/bio weapons |
| 5 | 10 contracts + inner circle | Nuclear weapons, framing ops |

**Black Market Inventory:**
- Scarce resources (from pirate raids)
- Illegal weapons (chemical, bio, nuclear)
- Intelligence reports (enemy data)
- Mercenaries (instant units, no queue)
- Sabotage kits (one-time use items)

### 3.3 Loan Shark System (Replaces Bank)

```typescript
interface Loan {
  principal: number;
  interestRate: number;      // 10-30% depending on trust
  turnsRemaining: number;
  missedPayments: number;

  // If missedPayments >= 3:
  // - Mafia sends enforcers (attacks player)
  // - Reputation damaged
  // - Assets seized (resources/units)
}
```

**Loan Terms by Trust Level:**
| Trust | Max Loan | Interest | Term |
|-------|----------|----------|------|
| 1 | 10,000 | 30% | 10 turns |
| 3 | 50,000 | 20% | 15 turns |
| 5 | 200,000 | 10% | 25 turns |

### 3.4 Bookie System (Replaces Lottery)

**Mechanics:**
- Bet on game outcomes (who will win, who will be eliminated)
- Odds calculated from current standings
- High-risk/high-reward option for struggling players
- Can bet against yourself (insurance)

### 3.5 Hit Contract System

**Contract Types:**
1. **Bounty** - Reward for eliminating target player
2. **Raid Contract** - Reward for stealing X resources from target
3. **Sabotage Contract** - Reward for destroying X units of target
4. **Intel Contract** - Reward for revealing target's secrets

**Contract Flow:**
```
1. Mafia detects imbalance (hoarding, monopoly, turtle)
2. Creates contract targeting imbalanced player
3. Contract visible based on trust level:
   - Trust 3+: See private contracts
   - Trust 5 OR long duration: Public broadcast
4. Any player can accept
5. Completion rewards: Credits, trust, black market items
6. Failure penalties: Trust loss, possible counter-attack
```

---

## Phase 4: Fog of War & Information Warfare

### 4.1 Knowledge Categories

**Public Knowledge (all players see):**
- Leaderboard rankings (networth, but not exact values)
- Active treaties
- Marketplace transactions
- Battle outcomes (attacker, defender, winner)
- Public broadcasts

**Private Knowledge (only you see):**
- Exact resource amounts
- Military composition
- Research progress
- Production rates
- Covert operations

**Intelligence (gained through ops):**
- Enemy resource estimates (with accuracy %)
- Enemy military estimates
- Enemy research level
- Enemy treaty details

### 4.2 Information Spread Mechanics

```typescript
interface InformationEvent {
  type: "rumor" | "intel" | "broadcast" | "fabrication";
  content: string;
  source: "player" | "mafia" | "pirate" | "covert_op";
  accuracy: number;          // 0.0 - 1.0 (fabrications are 0)
  visibleTo: PlayerId[];
  turnsToSpread: number;     // Rumors spread over time
}
```

**Rumor System:**
- Large transactions create rumors
- Rumors spread 2-3 players per turn
- Accuracy degrades as it spreads
- Covert ops can inject false rumors

### 4.3 Framing Operations

**The Ultimate Intrigue Mechanic**

When the mafia wants to take down a strong player without evidence:

1. **Setup Phase** (5-10 turns)
   - Mafia buys up a resource secretly
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
   - Successful debunk damages mafia reputation

---

## Phase 5: Anti-Exploit Ecosystem

### 5.1 The Hoarding Problem

**Detection:**
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
5. Turn N+15: Mafia issues hit contract
6. Turn N+20: Public broadcast if still hoarding

### 5.2 The Turtle Problem

**Detection:**
```typescript
function detectTurtle(player: Player): boolean {
  return player.attacksLast20Turns === 0 &&
         player.defensiveUnitsRatio > 0.7 &&
         player.networth > averageNetworth * 1.3;
}
```

**Response Chain:**
1. Other bots notice (schemer archetype especially)
2. Coalition formation against turtle
3. Pirates see fat target, increase raids
4. Mafia offers "protection" (or else...)

### 5.3 The Tech Rush Problem

**Detection:**
```typescript
function detectTechRush(player: Player): boolean {
  return player.researchLevel >= 5 &&
         player.militaryPower < averageMilitaryPower * 0.5;
}
```

**Response Chain:**
1. Aggressive archetypes (warlord, blitzkrieg) prioritize this target
2. Research victory requires pinnacle techs, not just level 7
3. Tech doesn't help if you're dead

### 5.4 The Market Manipulation Problem

**Detection:**
```typescript
function detectMarketManipulation(player: Player): boolean {
  const recentTrades = getPlayerTrades(player, last10Turns);
  const volumeShare = recentTrades.volume / totalMarketVolume;

  return volumeShare > 0.5 || hasPriceMovedSuspiciously();
}
```

**Response Chain:**
1. Market fees increase for manipulator
2. Other players informed via rumors
3. Pirates target their resource shipments
4. Black market offers alternative source

---

## Phase 6: Implementation Priority

### Wave 1: Core Fixes (Gate 1.5)
1. ✅ Activate bot diplomacy/trade decisions
2. Add resource costs to unit production
3. Implement pirate raids (use existing combat system)

### Wave 2: Economy Depth (Gate 2)
1. Electronics resource type
2. Black market basic implementation
3. Loan shark system
4. Hoarding detection + pirate response

### Wave 3: Tech Evolution (Gate 2.5)
1. Tech tree structure (replace linear research)
2. Weapon unlocks (chemical, bio, nuclear)
3. Research victory rework (pinnacle techs)

### Wave 4: Full Intrigue (Gate 3)
1. Information warfare system
2. Framing operations
3. Hit contracts
4. Coalition mechanics

---

## Testing Strategy

### Balance Tests Needed
1. Can turtle strategy still win? (Should be: rarely, with good timing)
2. Can hoarding crash the economy? (Should be: temporarily, then countered)
3. Does research spam still guarantee victory? (Should be: no, needs military)
4. Are pirates too punishing to weak players? (Tune raid frequency)
5. Is black market pay-to-win? (Tune availability and costs)

### Bot Behavior Tests
1. Do merchants actually trade?
2. Do diplomats form alliances?
3. Do schemers exploit framing operations?
4. Do bots respond to contracts?

---

## Appendix: Key Files to Modify

### Phase 1
- `src/lib/bots/decision-engine.ts` - Trade/diplomacy decisions
- `src/lib/game/unit-config.ts` - Resource requirements
- `src/lib/game/services/unit-service.ts` - Validate resources

### Phase 2
- `src/lib/npcs/pirates.ts` (new) - Pirate faction logic
- `src/lib/npcs/black-market.ts` (new) - Mafia faction logic
- `src/lib/economy/loans.ts` (new) - Loan shark system

### Phase 3
- `src/lib/research/tech-tree.ts` (new) - Branching research
- `src/lib/research/unlocks.ts` (new) - Tech unlocks

### Phase 4
- `src/lib/intel/fog-of-war.ts` (new) - Information system
- `src/lib/intel/rumors.ts` (new) - Rumor spread
- `src/lib/intel/framing.ts` (new) - Framing operations

---

## Questions for Review

1. **Electronics Production:** New planet type or crafting recipe?
2. **Nuclear Weapons:** Black market exclusive or high research option?
3. **Pirate Strength:** Static or scales with game progress?
4. **Loan Default:** Immediate attack or grace period?
5. **Framing Accuracy:** How easy to detect fake evidence?
6. **Coalition Size:** Max players in anti-turtle coalition?

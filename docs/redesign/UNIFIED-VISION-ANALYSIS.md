# Nexus Dominion: Unified Vision Analysis

## The Vision (Clarified)

Nexus Dominion is **not** 1 player vs 100 opponents in a grand melee. It's a simulation of an MMO-style galaxy where:

1. **Bots fight bots** - Natural selection occurs. 100 empires become 80, then 60, then fewer.
2. **Emergent bosses** - The victors accumulate power. A bot that eliminated 5 others is organically overpowered.
3. **Player fights ~25** - At any given time, only your neighbors matter. Not the whole galaxy.
4. **Coalitions are raids** - Defeating an emergent boss requires multiplayer-style coordination, like WoW raids.
5. **Campaigns, not oneshots** - A 100-empire game runs over days/weeks in 1-2 hour sessions.

This is fundamentally different from "Solar Realms with 100 players" - it's closer to **Crusader Kings meets Eve Online**, simulated.

---

## Part 1: What Already Exists (Better Than Realized)

### Checkpoint System ✅ IMPLEMENTED

**Location**: `src/lib/game/services/checkpoint-service.ts`

Every 30 turns (turns 30, 60, 90, 120, 150, 180), the system:
1. Evaluates all alliances and coalitions
2. Detects power imbalance (leader > 2× power of #2 + #3 combined)
3. Triggers rebalancing events against the dominant alliance

**Early game (turn 30-60)**: Economic sanctions (-30% credits, civil status drop)
**Mid game (turn 60-120)**: Coalition uprising (15% unit loss, fuel disruption)
**Late game (turn 120+)**: Galactic intervention (25% unit loss, -25% all resources)

**Status**: Implemented but needs integration testing with bot behavior.

### Syndicate/Black Market ✅ IMPLEMENTED

**Location**: `src/lib/game/constants/syndicate.ts`, `src/lib/game/services/syndicate-service.ts`

Complete 9-level trust system:
- **Level 0-1**: Pirate raids, basic intel
- **Level 2-3**: Economic warfare, sabotage, military probes
- **Level 4-5**: Kingslayer contracts, targeted attacks on top players
- **Level 6-7**: Chemical weapons, EMP devices, proxy wars
- **Level 8**: Nuclear weapons, bioweapons, "The Equalizer" (hurt 3+ top players)

**Catch-up mechanics built in**:
- Bottom 50% of empires receive Syndicate recruitment offers
- New recruits get 10k startup funds + 50% trust bonus
- High-trust contracts specifically target top players

**Status**: Fully implemented, needs UI exposure and testing.

### Covert Operations ✅ IMPLEMENTED

10 asymmetric warfare options:
1. Spy (gather intel)
2. Sabotage Production
3. Incite Rebellion
4. Steal Technology
5. Assassinate Leaders
6. Frame Enemy
7. Smuggle Resources
8. Hack Communications
9. Deploy Propaganda
10. Create False Flag

**Status**: Core mechanics implemented. Needs balance validation.

---

## Part 2: The Circle of Influence Model

### Current Problem

Every empire can attack every other empire. This creates:
- Cognitive overload (100 potential targets)
- No strategic geography
- Random conflict without narrative meaning

### Proposed Solution: Neighbor System

```
GALAXY STRUCTURE
================

100 Empires organized into ~10 regions of ~10 empires each.

Each empire has:
- 3-5 direct neighbors (can attack freely)
- 5-10 extended neighbors (require 1.5x forces to attack)
- Distant empires (cannot attack without special action)

As empires are eliminated:
- Neighbors of eliminated empire become YOUR neighbors
- Influence sphere expands naturally with territory
- Eventually, top empires border everyone

EXAMPLE PROGRESSION
-------------------

Turn 1:  Player has 4 neighbors (empires A, B, C, D)
Turn 50: Empire B eliminated. Player now neighbors B's old neighbors (E, F)
Turn 100: Player controls 15 planets, has 8 neighbors
Turn 150: Player is top 10, influences 15+ empires
Turn 200: Final showdown between 5-10 remaining powers
```

### Implementation Approach

```typescript
// Simple neighbor calculation based on networth/planets
function getInfluenceSphere(empire: Empire, allEmpires: Empire[]): InfluenceSphere {
  // Base neighbors scale with power
  const baseNeighborCount = 3;
  const bonusNeighbors = Math.floor(empire.planets / 5);
  const totalNeighbors = Math.min(baseNeighborCount + bonusNeighbors, 15);

  // Find closest empires by "distance" (could be random seed or calculated)
  const neighbors = calculateNearestEmpires(empire, allEmpires, totalNeighbors);

  return {
    directNeighbors: neighbors.slice(0, Math.ceil(totalNeighbors / 2)),
    extendedNeighbors: neighbors.slice(Math.ceil(totalNeighbors / 2)),
    canAttack: (target: Empire) => neighbors.includes(target),
  };
}
```

### Narrative Benefits

Instead of "you attacked random empire #47", we get:
- "The Iron Fist Dominion on your eastern border has been building forces"
- "Your neighbor Empire Velara proposes an alliance against the growing Hegemony to the north"
- "The Schemer Bot has conquered three of your neighbors. You're next."

---

## Part 3: Campaign Mode vs Oneshot Mode

### Oneshot Mode (Board Game Style)

**Settings**:
- 10-25 empires
- 50-100 turn limit
- 1-2 hour session
- Victory at turn limit or conquest

**Use case**: Quick game, board game night, testing

### Campaign Mode (MMO Style)

**Settings**:
- 50-100 empires
- 200-500 turn limit (or unlimited)
- Save/resume between sessions
- Sessions: 1-2 hours each, 10-50 turns per session

**The MMO Experience**:
```
SESSION 1 (Turns 1-30):
- Establish empire during protection period
- Meet neighbors, form initial alliances
- First conflicts begin as protection expires
- Checkpoint at turn 30: Power check

SESSION 2 (Turns 31-60):
- First wave of eliminations (100 → 80 empires)
- Emerging powers become visible
- Syndicate offers to struggling players
- Checkpoint at turn 60: First rebalancing events if needed

SESSION 3 (Turns 61-100):
- Major conflicts reshape the map
- Bot-vs-bot wars create "boss" bots
- Coalition warfare becomes necessary
- Several empires eliminated (80 → 50)

SESSIONS 4-8 (Turns 100-200):
- Endgame crystallizes
- Top 5-10 powers dominate
- Final coalition vs leader showdowns
- Victory conditions approached

SESSION 9+ (Turns 200+):
- Extended endgame if no victory
- Attrition and mutual destruction
- Last empire standing
```

### Session Management

```typescript
interface GameSession {
  gameId: string;
  sessionNumber: number;
  startTurn: number;
  endTurn: number;
  duration: number; // minutes
  events: string[]; // Notable events
  empiresEliminated: string[];
  powerRankingsSnapshot: EmpireRanking[];
}

// Between sessions, show:
// - Summary of what happened
// - Major events and eliminations
// - Power rankings change
// - Preview of next session challenges
```

---

## Part 4: Emergent Boss Mechanics

### How Bosses Emerge

In traditional games, bosses are scripted: "At level 40, fight the Dragon."

In Nexus Dominion, bosses emerge organically:

```
TURN 1: 100 empires, roughly equal power

TURN 50: Natural selection begins
- Aggressive bots attack neighbors
- Some defenders win, grow stronger
- Some attackers win, grow stronger
- Weak empires eliminated or absorbed

TURN 100: Power concentration
- Top 10% of empires control 40% of territory
- A "boss" emerges: Empire that won 5+ battles
- This boss has:
  - 3x starting military (accumulated from victories)
  - 2x starting territory
  - Emotional state: Arrogant or Triumphant
  - Memory: Knows who's weak, who betrayed them

TURN 150: Boss becomes threat to everyone
- Checkpoint detects imbalance
- System triggers coalition bonuses
- Player must ally with other empires (including bots) to defeat boss
- This is the "raid" moment
```

### Coalition Raid Mechanics

When a boss empire reaches critical power (2x average networth):

1. **Automatic coalition bonus**: All non-allied empires get +1 attack vs boss
2. **Diplomatic pressure**: Bots become 30% more likely to ally against boss
3. **Synchronized attacks**: If 3+ empires attack boss in same turn, each gets bonus
4. **Shared victory rewards**: Eliminating a boss splits their territory among attackers

```typescript
interface CoalitionRaid {
  targetEmpire: string; // The "boss"
  participants: string[]; // Empires attacking this turn
  bonusPerParticipant: number; // +5% per additional attacker
  territoryDistribution: "equal" | "proportional_to_damage";
}

// If 4 empires coordinate attack:
// Each gets +15% combat bonus (3 allies × 5%)
// If successful, territory split 4 ways
```

---

## Part 5: Clean Turn Structure

### Proposed Streamlined Turn Sequence

```
TURN PHASE BREAKDOWN
====================

PHASE 1: ECONOMY (Simultaneous)
├── Income collection (with civil status multiplier)
├── Tier 1 auto-crafting
├── Food consumption
└── Population growth/starvation

PHASE 2: PRODUCTION (Simultaneous)
├── Build queue processing (units complete)
├── Research point accumulation
├── Covert point generation
└── Crafting queue processing

PHASE 3: ACTIONS (Turn Order: Weakest First)
├── Player action (attack, diplomacy, trade, etc.)
├── Bot actions (parallel processing)
└── Combat resolution

PHASE 4: WORLD STATE
├── Checkpoint evaluation (turns 30, 60, 90...)
├── Galactic events
├── Market price updates
└── Syndicate offers to struggling empires

PHASE 5: CLEANUP
├── Victory/elimination checks
├── Emotional state decay
├── Memory updates
└── Auto-save

Total time target: <500ms (without LLM bots)
```

### Turn Order: Weakest First

This is a critical balance mechanic:

```
TURN ORDER CALCULATION
======================

Empires sorted by: networth (ascending)

Turn 50 example (30 empires remaining):
1. Struggling Empire #28 (networth: 50k) - Goes FIRST
2. Struggling Empire #25 (networth: 55k)
...
28. Rising Power #5 (networth: 180k)
29. Major Power #2 (networth: 220k)
30. Galaxy Leader #1 (networth: 300k) - Goes LAST

Benefits:
- Weak empires get first pick of actions
- Leader must react to everyone else's moves
- Natural catch-up mechanic
- Creates tension: "What did everyone else do this turn?"
```

---

## Part 6: Scalability Assessment

### 10 Empire Oneshot (Board Game)

| Metric | Value | Feasibility |
|--------|-------|-------------|
| Turn processing | <100ms | ✅ Trivial |
| Memory usage | <50MB | ✅ Trivial |
| Game length | 30-50 turns | ✅ 30-60 minutes |
| Eliminations | 5-8 | ✅ Achievable with combat fix |
| Coalition need | Unlikely | ✅ Simple dynamics |

**Verdict**: Fully achievable now.

### 25 Empire Standard

| Metric | Value | Feasibility |
|--------|-------|-------------|
| Turn processing | <200ms | ✅ Easy |
| Memory usage | <100MB | ✅ Easy |
| Game length | 50-100 turns | ✅ 1-2 hours |
| Eliminations | 15-20 | ✅ Achievable |
| Coalition need | Sometimes | ✅ Adds drama |

**Verdict**: Achievable with combat fix.

### 50 Empire Campaign

| Metric | Value | Feasibility |
|--------|-------|-------------|
| Turn processing | <400ms | ✅ Manageable |
| Memory usage | <200MB | ✅ Manageable |
| Game length | 100-200 turns | ✅ 3-5 sessions |
| Eliminations | 35-45 | ✅ Natural selection |
| Coalition need | Required | ✅ Core mechanic |
| Boss emergence | 2-3 bosses | ✅ Organic |

**Verdict**: Achievable with influence sphere system.

### 100 Empire MMO Campaign

| Metric | Value | Feasibility |
|--------|-------|-------------|
| Turn processing | <800ms | 🟡 Needs optimization |
| Memory usage | <400MB | ✅ Manageable |
| Game length | 200-500 turns | ✅ 8-15 sessions |
| Eliminations | 80-90 | ✅ Natural selection |
| Coalition need | Critical | ✅ Raid mechanics |
| Boss emergence | 5-10 bosses | ✅ Organic drama |
| Session saves | Required | ✅ Already have auto-save |

**Verdict**: Achievable with influence sphere + session management.

---

## Part 7: Critical Path to Implementation

### Already Done ✅

1. Turn processor (9 phases)
2. Bot archetypes (8 types)
3. Emotional states (6 states)
4. Memory system (weighted, with scars)
5. Checkpoint system (30-turn evaluations)
6. Syndicate/Black Market (full trust system)
7. Covert operations (10 types)
8. Coalition detection

### Needs Fix 🔴

1. **Combat balance** (1.2% attacker win rate → target 35-45%)
   - Implement unified combat resolution
   - Increase planet capture rate (5-15% → 15-30%)
   - Reduce starting planets (9 → 5-6)

### Needs Implementation 🟡

2. **Influence sphere system**
   - Calculate neighbors based on territory/position
   - Limit valid attack targets
   - Expand sphere as empire grows
   - ~2 days implementation

3. **Coalition raid mechanics**
   - Detect when multiple empires attack same target
   - Apply coordination bonuses
   - Distribute rewards
   - ~1 day implementation

4. **Session management UI**
   - Game mode selection (oneshot vs campaign)
   - Session summary between plays
   - Progress tracking
   - ~2 days implementation

5. **Turn order by weakness**
   - Sort empires by networth
   - Process in order
   - ~0.5 day implementation

### Nice to Have 🟢

6. **Region visualization** (galaxy map improvements)
7. **Boss indicators** (UI highlighting dominant empires)
8. **Raid coordination UI** (propose coordinated attacks)
9. **Campaign statistics** (cross-session tracking)

---

## Part 8: Recommended Approach

### Week 1: Combat + Core Balance

1. **Fix combat** (2 days)
   - Unified combat resolution OR 2/3 phase victory
   - Increase capture rate
   - Reduce starting planets

2. **Turn order by weakness** (0.5 day)

3. **Validate with stress tests** (1.5 days)
   - Run 25-empire games
   - Verify eliminations occur
   - Check checkpoint triggers

### Week 2: Influence System

4. **Implement influence spheres** (2 days)
   - Neighbor calculation
   - Attack validation
   - Sphere expansion

5. **Coalition raid bonuses** (1 day)
   - Multi-attacker detection
   - Bonus calculation
   - Reward distribution

6. **Integration testing** (2 days)

### Week 3: Campaign Mode

7. **Game mode selection** (1 day)
   - Oneshot: 10-25 empires, 50-100 turns
   - Standard: 25-50 empires, 100-200 turns
   - Campaign: 50-100 empires, 200+ turns

8. **Session management** (2 days)
   - Session summary screens
   - Progress tracking
   - Resume functionality

9. **Polish + testing** (2 days)

---

## Part 9: Design Principles Going Forward

### 1. Natural Selection is the Content

Don't script bosses. Let them emerge from bot-vs-bot conflict. A bot that won 5 battles IS the boss, with all the power that implies.

### 2. Coalitions are Raids

When a boss emerges, the game shifts from "empire building" to "raid coordination." This is the MMO moment. Make it feel like gathering a party to fight a dungeon boss.

### 3. Sessions are Chapters

Each 1-2 hour session should feel like a chapter in a story:
- Session 1: "The Early Days" (establishing your empire)
- Session 3: "The First Wars" (major conflicts begin)
- Session 5: "Rise of the Hegemony" (boss emergence)
- Session 7: "The Coalition Forms" (raid preparation)
- Session 9: "The Final Battle" (climactic confrontation)

### 4. Neighbors are Characters

With influence spheres, your 5-10 neighbors become characters you know. You learn their archetypes. You have history with them. When one threatens you, it means something. When one dies, it changes your world.

### 5. Asymmetric Warfare is the Equalizer

The Syndicate exists so a weak empire can hurt a strong one. Covert ops exist so you can sabotage someone you can't defeat in combat. These aren't optional features - they're essential for balance.

---

## Conclusion

The vision of Nexus Dominion is achievable and compelling:

- **100 empires** as a living ecosystem, not a menu of targets
- **Emergent bosses** through natural selection
- **Coalition raids** as end-game content
- **1-2 hour sessions** across multi-week campaigns
- **Scalable modes** from 10-empire oneshots to 100-empire sagas

The foundation is stronger than realized. The Syndicate system, checkpoint evaluations, and covert ops already provide catch-up mechanics. The main gaps are:

1. Combat balance (critical fix)
2. Influence sphere system (scope management)
3. Session management UI (campaign support)

With these additions, Nexus Dominion becomes the game you envisioned: an MMO-style galaxy where bosses emerge organically, coalitions form naturally, and every session tells a new chapter of an epic story.

---

*Analysis complete. Ready for implementation decisions.*

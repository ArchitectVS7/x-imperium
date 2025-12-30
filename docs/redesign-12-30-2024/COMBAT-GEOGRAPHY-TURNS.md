# Combat, Geography, and Turn Processing: Analysis & Proposals

## Part 1: Three Combat Resolution Solutions

Based on the analysis in the redesign folder, here are three distinct approaches to fixing the combat math:

---

### Solution A: "2/3 Phase Victory" (SRE Model)

**Change**: Attacker wins if they win 2 out of 3 phases (instead of all 3).

```typescript
// Current (broken):
if (spaceWin && orbitalWin && groundWin) → attacker wins

// Proposed:
const phasesWon = [spaceWin, orbitalWin, groundWin].filter(Boolean).length;
if (phasesWon >= 2) → attacker wins

// Planet capture scales with dominance:
const capturePercent = (phasesWon / 3) * 0.25; // 16-25% based on phases won
```

**Impact**:
- Win rate: 1.2% → ~35-40%
- Eliminations per 100-turn game: 0 → 8-12
- Preserves 3-phase tactical depth
- Ground phase still matters (affects capture rate)

**Philosophy**: "Win the war by winning most battles, not every battle."

**Pros**:
- Minimal code change
- Preserves existing unit type strategy
- Tested approach (SRE uses this)

**Cons**:
- May feel like ground phase is "optional"
- Doesn't address the defender advantage stack

---

### Solution B: "Unified Combat Roll" (Board Game Model)

**Change**: Replace 3 sequential phases with a single resolution that considers all forces.

```typescript
interface CombatResolution {
  attackerPower: number;  // Sum of all unit contributions
  defenderPower: number;  // Sum + 1.3x home advantage
  roll: number;           // 2d6 or d20
  outcome: CombatOutcome;
}

type CombatOutcome =
  | "total_victory"    // 35-45% planets, enemy routed
  | "victory"          // 20-30% planets
  | "costly_victory"   // 10-20% planets, heavy losses both sides
  | "stalemate"        // No capture, both lose units
  | "repelled"         // Attacker retreats, losses
  | "disaster";        // Attacker routed, heavy losses

function resolveCombat(attacker: Forces, defender: Forces): CombatResolution {
  const attackerPower = calculateTotalPower(attacker);
  const defenderPower = calculateTotalPower(defender) * 1.3; // Home turf

  const powerDiff = (attackerPower - defenderPower) / 1000; // Normalize
  const roll = roll2d6(); // 2-12, bell curve
  const modified = roll + powerDiff;

  if (modified >= 12) return { outcome: "total_victory", capture: 0.40 };
  if (modified >= 10) return { outcome: "victory", capture: 0.25 };
  if (modified >= 8)  return { outcome: "costly_victory", capture: 0.15 };
  if (modified >= 6)  return { outcome: "stalemate", capture: 0 };
  if (modified >= 3)  return { outcome: "repelled", capture: 0 };
  return { outcome: "disaster", capture: 0 };
}
```

**Impact**:
- Win rate: 1.2% → ~45% with equal forces
- Dramatic outcomes (total victory vs disaster)
- Faster resolution (one roll)
- Easier to understand

**Philosophy**: "War is decided by total force projection, not sequential battles."

**Pros**:
- Simple to understand and balance
- Creates dramatic moments
- Multiple outcome types add narrative
- Fast resolution

**Cons**:
- Loses tactical unit-type decisions
- Less "war simulation" feel
- Significant code rewrite

---

### Solution C: "Parallel Phase Resolution" (Hybrid Model)

**Change**: All three phases resolve simultaneously. Attacker wins if they have net positive phases OR overwhelming single-phase victory.

```typescript
function resolveParallelCombat(attacker: Forces, defender: Forces): CombatResult {
  // All phases resolve at once
  const spaceResult = resolvePhase("space", attacker, defender);
  const orbitalResult = resolvePhase("orbital", attacker, defender);
  const groundResult = resolvePhase("ground", attacker, defender);

  // Calculate overall outcome
  const attackerPhases = [spaceResult, orbitalResult, groundResult]
    .filter(r => r.winner === "attacker").length;
  const defenderPhases = 3 - attackerPhases;

  // Check for overwhelming victory in any phase
  const hasOverwhelming = [spaceResult, orbitalResult, groundResult]
    .some(r => r.powerRatio > 3.0 && r.winner === "attacker");

  if (attackerPhases >= 2 || hasOverwhelming) {
    // Attacker wins - capture based on dominance
    const dominance = attackerPhases / 3;
    const baseCapture = 0.15 + (dominance * 0.15); // 15-30%
    return { winner: "attacker", capturePercent: baseCapture };
  }

  // Defender holds - but both take casualties
  return { winner: "defender", capturePercent: 0 };
}
```

**Impact**:
- Win rate: 1.2% → ~40%
- Preserves unit-type strategy
- Allows "one front" dominance to break stalemates
- Feels like coordinated assault

**Philosophy**: "A blitzkrieg can succeed even if other fronts struggle."

**Pros**:
- Keeps tactical depth
- Rewards overwhelming force in one area
- Moderate code change
- Feels like real warfare

**Cons**:
- More complex rules
- "Overwhelming" threshold needs tuning

---

### Recommendation Matrix

| Criteria | Solution A | Solution B | Solution C |
|----------|------------|------------|------------|
| Code change | Small | Large | Medium |
| Win rate fix | ✅ | ✅ | ✅ |
| Preserves tactics | ✅ | ❌ | ✅ |
| Dramatic outcomes | 🟡 | ✅ | ✅ |
| Easy to understand | ✅ | ✅ | 🟡 |
| Balance risk | Low | Medium | Medium |

**My recommendation**: **Solution A** for immediate fix, with **Solution C** as the target design. Solution B is elegant but loses too much tactical depth.

---

## Part 2: Sphere of Influence - Data Structures

### Galaxy Geography Schema

```typescript
// New table: galaxy_regions
interface GalaxyRegion {
  id: string;                    // UUID
  gameId: string;                // FK to games
  name: string;                  // "Alpha Sector", "Outer Rim", etc.
  position: {                    // For visualization
    x: number;                   // 0-1000 coordinate
    y: number;
  };
  type: RegionType;              // "core" | "inner" | "outer" | "frontier"
  resourceModifier: number;      // 0.8-1.2 based on region richness
}

type RegionType = "core" | "inner" | "outer" | "frontier";

// New table: region_connections (wormholes, trade routes)
interface RegionConnection {
  id: string;
  gameId: string;
  regionA: string;               // FK to galaxy_regions
  regionB: string;               // FK to galaxy_regions
  connectionType: ConnectionType;
  travelCost: number;            // Force multiplier to traverse (1.0 = free, 1.5 = costly)
  isDiscovered: boolean;         // Hidden wormholes
  discoveredBy?: string;         // Empire that found it
}

type ConnectionType =
  | "adjacent"      // Normal border (1.0x cost)
  | "trade_route"   // Established path (1.0x cost, trade bonus)
  | "wormhole"      // Shortcut (1.0x cost, but connects distant regions)
  | "hazardous"     // Difficult passage (1.5x cost)
  | "contested";    // Active conflict zone (1.25x cost, random events)
```

### Empire Location Extension

```typescript
// Add to empires table
interface EmpireGeography {
  homeRegion: string;            // FK to galaxy_regions - where they started
  controlledRegions: string[];   // Regions where they have presence
  influenceSphere: {
    directNeighbors: string[];   // Empire IDs - can attack freely
    extendedNeighbors: string[]; // Empire IDs - 1.5x force cost
    distantEmpires: string[];    // Empire IDs - need wormhole/special action
  };
  discoveredWormholes: string[]; // Connection IDs they know about
  regionPresence: {              // How strong in each region
    [regionId: string]: {
      planets: number;
      militaryStrength: number;
      influenceScore: number;    // 0-100
    };
  };
}
```

### Influence Calculation

```typescript
function calculateInfluenceSphere(
  empire: Empire,
  allEmpires: Empire[],
  regions: GalaxyRegion[],
  connections: RegionConnection[]
): InfluenceSphere {
  const myRegions = empire.controlledRegions;

  // Find all empires in same or adjacent regions
  const directNeighbors = allEmpires.filter(e => {
    if (e.id === empire.id) return false;
    // Same region OR connected region
    return e.controlledRegions.some(r =>
      myRegions.includes(r) ||
      isAdjacentRegion(r, myRegions, connections)
    );
  });

  // Extended neighbors: 2 connections away
  const extendedNeighbors = allEmpires.filter(e => {
    if (e.id === empire.id) return false;
    if (directNeighbors.includes(e)) return false;
    return e.controlledRegions.some(r =>
      isTwoConnectionsAway(r, myRegions, connections)
    );
  });

  // Everyone else is distant
  const distantEmpires = allEmpires.filter(e =>
    e.id !== empire.id &&
    !directNeighbors.includes(e) &&
    !extendedNeighbors.includes(e)
  );

  return {
    directNeighbors: directNeighbors.map(e => e.id),
    extendedNeighbors: extendedNeighbors.map(e => e.id),
    distantEmpires: distantEmpires.map(e => e.id),
  };
}

function canAttack(
  attacker: Empire,
  defender: Empire,
  sphere: InfluenceSphere,
  hasWormholeAccess: boolean
): { allowed: boolean; forceCost: number; reason?: string } {
  if (sphere.directNeighbors.includes(defender.id)) {
    return { allowed: true, forceCost: 1.0 };
  }

  if (sphere.extendedNeighbors.includes(defender.id)) {
    return { allowed: true, forceCost: 1.5, reason: "Extended reach" };
  }

  if (hasWormholeAccess && sphere.distantEmpires.includes(defender.id)) {
    return { allowed: true, forceCost: 1.25, reason: "Wormhole expedition" };
  }

  return {
    allowed: false,
    forceCost: 0,
    reason: "Target is beyond your sphere of influence"
  };
}
```

### Wormhole Mechanics

```typescript
// Special action: Discover wormhole
interface WormholeDiscovery {
  type: "discover_wormhole";
  empireId: string;
  researchCost: number;          // 1000 RP
  creditCost: number;            // 50,000 credits
  turnsToComplete: number;       // 5 turns
  targetRegion?: string;         // Optional: aim for specific region
}

// Result: Random wormhole to distant region
function discoverWormhole(empire: Empire, targetRegion?: string): RegionConnection {
  // Find regions not adjacent to empire
  const distantRegions = getDistantRegions(empire);

  // If target specified and valid, use it
  // Otherwise random
  const destination = targetRegion && distantRegions.includes(targetRegion)
    ? targetRegion
    : randomChoice(distantRegions);

  return {
    id: generateId(),
    gameId: empire.gameId,
    regionA: empire.homeRegion,
    regionB: destination,
    connectionType: "wormhole",
    travelCost: 1.0,
    isDiscovered: true,
    discoveredBy: empire.id,
  };
}
```

### Database Schema Changes

```sql
-- New tables for geography
CREATE TABLE galaxy_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  region_type VARCHAR(20) NOT NULL,
  resource_modifier DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE region_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  region_a UUID NOT NULL REFERENCES galaxy_regions(id),
  region_b UUID NOT NULL REFERENCES galaxy_regions(id),
  connection_type VARCHAR(20) NOT NULL,
  travel_cost DECIMAL(3,2) DEFAULT 1.0,
  is_discovered BOOLEAN DEFAULT true,
  discovered_by UUID REFERENCES empires(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add to empires table
ALTER TABLE empires ADD COLUMN home_region UUID REFERENCES galaxy_regions(id);
ALTER TABLE empires ADD COLUMN influence_data JSONB DEFAULT '{}';
```

---

## Part 3: Turn Order Analysis - Three-Way Discussion

### The Panel

- **Elena Chen** - Board game designer (Wingspan, Terraforming Mars style)
- **Marcus Webb** - Miniature wargame designer (Warhammer 40K, Bolt Action style)
- **Mark Rosewater** - Magic: The Gathering (20+ years of competitive game design)

---

### The Discussion

**MODERATOR**: We're evaluating "weakest player goes first" as a turn order mechanic. The concern is whether this prevents runaway victories or causes oscillating stalemates.

---

**ELENA (Board Games)**:

In board games, we call this "reverse turn order" and it's common in euro games. **Terraforming Mars** uses a variation where the first player marker rotates, but weaker players often get compensation.

The key insight: **Turn order matters most when actions are rivalrous** - when taking an action denies it to others. In Nexus Dominion, are actions rivalrous?

- Building units: Not rivalrous (everyone can build)
- Buying planets: Somewhat rivalrous (finite neutral planets)
- Attacking: Very rivalrous (you can only attack once per turn)

So the question is: **What does going first actually give you?**

In a game where attacks are limited, going first means:
1. You pick your target before anyone else
2. You can't be attacked before you act
3. You set the agenda for the turn

For the **weakest** player, this is valuable but not dominant. They can strike first, but they're still weak. The concern about oscillation is valid only if going first is SO powerful that it completely reverses fortunes.

**My assessment**: Weak-first turn order is a **rubber band**, not a **trampoline**. It slows momentum, doesn't reverse it.

---

**MARCUS (Wargames)**:

In miniature wargames, we've experimented with every turn order system imaginable:

1. **I-Go-U-Go** (classic): One player does everything, then the other
2. **Alternating Activations**: Each player activates one unit, back and forth
3. **Initiative Bidding**: Spend resources to go first
4. **Random Initiative**: Roll each turn

The "weakest first" proposal is closest to **compensated initiative** - giving the underdog a structural advantage.

In my experience: **It works, but with caveats**.

The oscillation problem occurs when:
- Going first is worth more than the power differential
- The game has "alpha strike" potential (one devastating first attack)
- Recovery from attacks is too easy

In Nexus Dominion, I'd ask: **Can a weak empire eliminate a strong one in a single turn?**

If no (which seems true - you capture 15-30% of planets per victory), then oscillation is unlikely. The weak empire might land a blow, but the strong empire will survive and hit back harder.

**My recommendation**: Implement weak-first, but **cap the swing**. Perhaps the weakest 3 empires go first (in order), then everyone else goes simultaneously or randomly. This prevents the #1 empire from always being last without creating too much structure.

---

**MARK ROSEWATER (Magic)**:

*adjusts glasses*

In Magic, we've learned that **perception of fairness matters as much as actual fairness**. A mechanic can be mathematically balanced but feel terrible.

Let me apply my "20 questions" framework:

**Q: What problem are we solving?**
A: Preventing runaway victories where the leader snowballs.

**Q: Is this the simplest solution?**
A: No. Simpler solutions exist (direct penalties to leader, bonuses to underdogs in combat).

**Q: Does this create feel-bad moments?**
A: Yes - the leading player always going last feels like punishment for success.

**Q: Does this add strategic depth?**
A: Minimal - you don't really choose to be weak to go first.

Here's my concern: **Weak-first order is a blunt instrument**.

In Magic, we use targeted rubber-banding: If you're behind, specific cards become better. If you're ahead, you don't get punished - you just don't get help.

**Alternative proposal**: Instead of turn order by weakness, give **combat bonuses** to weaker empires when attacking stronger ones:

```
Attacker networth < 50% of defender → +20% combat power
Attacker networth < 75% of defender → +10% combat power
```

This is more targeted: It helps the weak challenge the strong, without slowing everything down.

**On oscillation**: Your instinct is correct. If a game can oscillate forever, you need a **forcing function** - something that makes the game trend toward conclusion. In Magic, it's the 20-life starting total. In Nexus Dominion, it's the turn limit. But 200-500 turns is a LOT.

---

### Synthesis

**ELENA**: What if we combine approaches? Weak-first for combat resolution only, normal parallel processing for everything else?

**MARCUS**: I like that. Build phase is simultaneous - no advantage. Combat phase uses initiative order based on strength. This matches how real warfare works - logistics (building) is parallel, but combat has initiative.

**MARK**: And add the combat bonus for underdogs. That way weak-first gives you first strike, AND you hit harder when punching up. Together, they create meaningful catch-up without oscillation.

---

### Final Recommendation

```
TURN STRUCTURE (REVISED)

PHASE 1: ECONOMY (Simultaneous - all empires)
- Income collection
- Resource production
- Population updates

PHASE 2: BUILD (Simultaneous - all empires)
- Queue processing
- Unit completion
- Research progress

PHASE 3: PLANNING (Player + Bot parallel)
- Player reviews situation
- Bots calculate decisions
- No interactions yet

PHASE 4: ACTIONS (Initiative Order)
- Diplomacy proposals resolved
- Covert operations resolved
- Trade orders executed

PHASE 5: COMBAT (Weakness-First Initiative)
- Empires sorted by networth (ascending)
- Each empire resolves attacks in order
- First strike advantage for weak empires
- ALSO: Underdog combat bonus applies

PHASE 6: CLEANUP (Simultaneous)
- Victory/elimination checks
- Event triggers
- Auto-save

Turn Processing Time Target:
- Phases 1-3: <200ms (parallelizable)
- Phase 4: <100ms
- Phase 5: <200ms (sequential but fast)
- Phase 6: <50ms
- Total: <600ms for 100 empires
```

**On oscillation**: The turn limit (200-500) is the forcing function. Natural selection (bots eliminating bots) reduces empire count over time. The weak-first + underdog bonus creates **catch-up potential** without **catch-up guarantee**. A strong empire will still win if they play well - they just can't coast.

---

## Part 4: Parallel Turn Processing

### The User's Insight

> "When the human player starts their turn, you can actually process everyone's turn. The only thing that needs to pause is the resolution of actions that affect others."

This is brilliant. Let me formalize it:

### Turn Processing Architecture

```typescript
// When player's turn begins
async function startPlayerTurn(gameId: string, playerId: string) {
  // IMMEDIATELY begin processing bots in background
  const botProcessing = processBotTurnsParallel(gameId, playerId);

  // Player sees their UI, makes decisions
  // Meanwhile, bots are:
  // - Calculating income
  // - Processing builds
  // - Deciding on actions (but not executing attacks)

  return {
    playerView: await getPlayerTurnView(gameId, playerId),
    botProcessingPromise: botProcessing,
  };
}

async function processBotTurnsParallel(gameId: string, playerId: string) {
  const bots = await getActiveBots(gameId);

  // Phase 1: Non-interactive processing (PARALLEL)
  const economyResults = await Promise.all(
    bots.map(bot => processEconomy(bot)) // Income, resources
  );

  const buildResults = await Promise.all(
    bots.map(bot => processBuild(bot))   // Unit construction
  );

  const decisionResults = await Promise.all(
    bots.map(bot => calculateDecision(bot)) // DECIDE but don't EXECUTE
  );

  // Phase 2: Store decisions, wait for player
  return {
    economyResults,
    buildResults,
    pendingDecisions: decisionResults, // Attacks, diplomacy, etc.
  };
}

// When player ends their turn
async function resolveAllActions(
  gameId: string,
  playerActions: PlayerAction[],
  botDecisions: BotDecision[]
) {
  // Now resolve everything in order

  // 1. Diplomacy (can affect who attacks whom)
  await resolveDiplomacy([...playerActions, ...botDecisions]);

  // 2. Covert ops (can affect combat outcomes)
  await resolveCovertOps([...playerActions, ...botDecisions]);

  // 3. Combat (initiative order)
  const combatants = getAllCombatActions([...playerActions, ...botDecisions]);
  const orderedCombatants = sortByNetworth(combatants, "ascending");

  for (const combatant of orderedCombatants) {
    await resolveCombat(combatant);
  }

  // 4. Cleanup
  await runCheckpoints(gameId);
  await checkVictoryConditions(gameId);
}
```

### What Can Be Pre-Processed (Safe)

| Phase | Pre-Process? | Reason |
|-------|--------------|--------|
| Income calculation | ✅ Yes | Pure function, no interactions |
| Resource production | ✅ Yes | Pure function |
| Population growth | ✅ Yes | Pure function |
| Build queue | ✅ Yes | No interaction with others |
| Research progress | ✅ Yes | Pure function |
| Bot decision CALCULATION | ✅ Yes | Just deciding, not acting |
| Market price update | ✅ Yes | Global state, can pre-calc |
| Emotional decay | ✅ Yes | Pure function |

### What Must Wait (Interactive)

| Phase | Must Wait? | Reason |
|-------|------------|--------|
| Diplomacy proposals | ⏳ Yes | Player might accept/reject |
| Covert operations | ⏳ Yes | Affects other empires |
| Combat resolution | ⏳ Yes | Changes planet ownership |
| Victory checks | ⏳ Yes | Depends on combat results |

### Message Delivery Timing

```typescript
// Messages can be queued during pre-processing
interface QueuedMessage {
  from: string;
  to: string;
  content: string;
  deliveryTiming: "immediate" | "end_of_build" | "end_of_turn";
}

// During player's build phase, deliver "immediate" messages
// These are mostly diplomatic: alliance offers, threats, etc.

// At end of player turn, deliver "end_of_turn" messages
// These are results: battle reports, event notifications
```

### Estimated Performance

```
WITHOUT Parallel Processing:
- 100 bots × 50ms each = 5000ms per turn
- Player waits 5 seconds after each action

WITH Parallel Processing:
- Pre-process during player thinking: ~2000ms (but hidden)
- Interactive resolution: ~500ms (sequential combat)
- Player perceived wait: <1 second

10x improvement in perceived performance
```

---

## Part 5: Revised Turn Structure Proposal

Based on all analysis:

```
═══════════════════════════════════════════════════════════
                    NEXUS DOMINION TURN STRUCTURE
═══════════════════════════════════════════════════════════

PLAYER TURN BEGINS
    │
    ├─── [BACKGROUND] Bot Pre-Processing Starts ─────────┐
    │                                                     │
    ▼                                                     │
┌─────────────────────────────────────────────────┐       │
│  PHASE 1: INCOME (All empires, parallel)        │       │
│  - Credits from planets                         │       │
│  - Resource production                          │       │
│  - Civil status multipliers applied             │       │
└─────────────────────────────────────────────────┘       │
                                                          │
┌─────────────────────────────────────────────────┐       │
│  PHASE 2: BUILD (All empires, parallel)         │       │
│  - Player reviews queue, makes changes          │ ◄─────┤
│  - Bots process queues automatically            │       │
│  - Units complete, research advances            │       │
│  - Crafting progresses                          │       │
└─────────────────────────────────────────────────┘       │
                                                          │
    │                                                     │
    │  [Messages from neighbors may arrive here]          │
    │                                                     │
    ▼                                                     │
┌─────────────────────────────────────────────────┐       │
│  PHASE 3: PLANNING                              │       │
│  - Player decides actions (attack, diplomacy,   │       │
│    covert ops, market trades)                   │       │
│  - Bots have already calculated their decisions │ ◄─────┘
└─────────────────────────────────────────────────┘
    │
    │  PLAYER ENDS TURN
    │
    ▼
┌─────────────────────────────────────────────────┐
│  PHASE 4: DIPLOMACY RESOLUTION                  │
│  - Treaty proposals accepted/rejected           │
│  - Coalition status updated                     │
│  - Alliance bonuses calculated                  │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  PHASE 5: COVERT OPERATIONS                     │
│  - All spy ops resolve                          │
│  - Sabotage effects applied                     │
│  - Intel gathered                               │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  PHASE 6: COMBAT (Initiative Order)             │
│                                                 │
│  Sort all attackers by networth (ascending)     │
│  For each attacker (weakest first):             │
│    - Resolve combat against target              │
│    - Apply underdog bonus if applicable         │
│    - Transfer captured planets                  │
│    - Check for eliminations                     │
│                                                 │
│  [This is the only sequential phase]            │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  PHASE 7: CLEANUP                               │
│  - Market prices update                         │
│  - Checkpoint evaluation (turns 30, 60, 90...)  │
│  - Galactic events trigger                      │
│  - Victory/elimination checks                   │
│  - Auto-save                                    │
└─────────────────────────────────────────────────┘
    │
    ▼
NEXT TURN BEGINS

═══════════════════════════════════════════════════════════
```

### Key Design Decisions

1. **Simultaneous vs Sequential**: Only combat is sequential. Everything else is parallel.

2. **Weak-First Combat**: Preserves the underdog advantage without affecting non-combat actions.

3. **Pre-Processing**: Bot economy/build runs while player thinks. ~80% of bot processing is hidden.

4. **Messages During Build**: Diplomatic messages arrive while player plans, creating the MMO "inbox" feel.

5. **Single Combat Phase**: All attacks resolve in one phase, not spread across the turn. Simpler, faster.

---

## Summary of Recommendations

### Combat Math
**Recommendation**: Solution A (2/3 phase victory) for immediate fix. Consider Solution C (parallel phases) for v2.

### Geography
**Recommendation**: Implement region-based galaxy with influence spheres. Add wormholes as discoverable shortcuts.

### Turn Order
**Recommendation**: Weak-first for combat only, with underdog combat bonus. Parallel processing for everything else.

### Turn Processing
**Recommendation**: Pre-process bot economy/builds during player thinking time. Only combat/diplomacy wait for player input.

### Session Management
**Recommendation**: Yes, essential for campaign mode. Track sessions, show summaries, enable resume.

---

*Analysis complete. Ready for implementation decisions.*

# SRE vs x-imperium: Side-by-Side Comparison

## Executive Summary

**Problem**: x-imperium bot stress tests show **0 eliminations** despite thousands of attacks and **1.2% attacker win rate**.

**Root Cause**: While x-imperium has power checks before attacking, the combination of:
1. **Lower planet capture rate** (5-15% vs SRE's up to 20%)
2. **Sequential phase elimination** (must win all 3 phases vs SRE's 2/3 fronts)
3. **No coalition mechanics** (no gang-up on leaders)
4. **Potentially missing fog of war** (bots may know perfect enemy power)

Creates a balance where eliminations are mathematically unlikely within 50-200 turn limits.

---

## Combat System Comparison

### SRE (Working System)

**Three-Front Combat** (`src/lib/game/combat.ts:318-327`):
```typescript
// Attacker wins if controls 2 or more fronts
const frontsWon = [state.groundControl, state.orbitalControl, state.spaceControl]
  .filter(c => c === 'attacker').length;
const attackerWon = frontsWon >= 2;
```
- **Ground**: Soldiers vs Soldiers
- **Orbital**: Fighters vs Stations
- **Space**: Cruisers vs Cruisers
- **Win condition**: Win 2 out of 3 fronts
- **Attacker advantage**: Can lose one front and still win

**Planet Capture** (`combat.ts:353-356`):
```typescript
const successRatio = frontsWon / 3;
planetsLost = Math.floor(defender.totalPlanets * successRatio * 0.2); // Up to 20%
```
- **Rate**: Up to 20% of defender's planets
- **Example**: 2 fronts won (66% success) × 20% = 13% capture rate
- **9 planets**: ~1-2 planets per successful attack

**Combat Rounds** (`combat.ts:47-50`):
```typescript
const COMBAT_ROUNDS = 10;
const LIGHT_CRUISER_BONUS_ROUNDS = 5;
```
- **10 rounds** of combat with casualty calculations
- **Light cruisers** get 5 bonus rounds before main battle
- **Lanchester's Equations** for casualties (line 165)

**Combat Effectiveness Matrix** (`combat.ts:33-44`):
```typescript
const EFFECTIVENESS = {
  SOLDIERS: { soldiers: 3, stations: 1, cruisers: 1 },
  FIGHTERS: { soldiers: 1, stations: 4, cruisers: 1 },
  CRUISERS: { soldiers: 2, stations: 2, cruisers: 10 },
  DEFENSE_SOLDIERS: 10,
  DEFENSE_STATIONS: 25,
  DEFENSE_CRUISERS: 15,
}
```
- **Unit counters**: Different units effective vs different targets
- **Diversity bonus**: Encourages mixed army compositions

---

### x-imperium (0 Eliminations)

**Three-Phase Combat** (`src/lib/combat/phases.ts:478-514`):
```typescript
// Phase 1: Space Combat - If attacker lost, defender wins
if (spaceResult.winner === "defender") {
  return createCombatResult(phases, "defender_victory", defenderPlanetCount, 0);
}

// Phase 2: Orbital Combat - If attacker lost, defender wins
if (orbitalResult.winner === "defender") {
  return createCombatResult(phases, "defender_victory", defenderPlanetCount, 0);
}

// Phase 3: Ground Combat
if (groundResult.winner === "attacker") {
  outcome = "attacker_victory";
  planetsCaptured = Math.max(1, Math.floor(defenderPlanetCount * capturePercent));
}
```
- **Space**: Cruisers determine space superiority
- **Orbital**: Fighters vs Stations for orbital control
- **Ground**: Soldiers capture planets
- **Win condition**: Must win ALL 3 phases sequentially
- **Defender advantage**: Losing ANY phase = defender victory

**Planet Capture** (`phases.ts:504-507`):
```typescript
const capturePercent = PLANET_CAPTURE_MIN_PERCENT +
  Math.random() * (PLANET_CAPTURE_MAX_PERCENT - PLANET_CAPTURE_MIN_PERCENT);
planetsCaptured = Math.max(1, Math.floor(defenderPlanetCount * capturePercent));
```
- **Rate**: 5-15% per successful invasion
- **Example**: Average 10% capture rate
- **9 planets**: 1 planet per successful attack (minimum enforced)
- **Math**: 9 successful attacks needed to eliminate

**Defender Advantages** (`phases.ts:166-168, 184, 216`):
```typescript
// Defender multiplier
if (isDefender) {
  total *= 1.1;  // Reduced from 1.2× to keep combat viable
}

// Station power
const stationPower = forces.stations * 30; // Reduced from 50 to 30 for balance
```
- **1.1× defender multiplier** (already tuned down from 1.2×)
- **30× station power** (already tuned down from 50×)
- **D20-style variance**: Underdogs have 5% chance, favorites 95% max

**Combat Flow**:
- **Single-phase resolution**: Each phase resolves independently
- **Power calculations**: Unit type × effectiveness × defender bonus
- **Casualties**: Based on loss rate from power differential

---

## Bot Decision Making Comparison

### SRE Bot Engine

**Coalition Formation Against Leaders** (`src/lib/bots/engine.ts:352-370`):
```typescript
// Calculate if leader is too dominant (2x+ average netWorth)
const avgNetWorth = /* average of all active empires */;
const leader = /* empire with highest netWorth */;
const leaderIsDominant = leader && leader.netWorth > avgNetWorth * 2;

// If leader is dominant and is a valid target, boost their priority
if (leaderIsDominant && leader) {
  const leaderTarget = validTargets.find(t => t.empireId === leader.id);
  if (leaderTarget) {
    leaderTarget.opportunityScore += 30;
    leaderTarget.valueScore += 20;
  }
}
```
✅ **Bots gang up on runaway winners**

**Attack Restraint for Strong Empires** (`engine.ts:318-337`):
```typescript
const avgStrength = this.calculateAverageStrength(otherEmpires);
const myStrength = this.calculateMilitaryStrength(myEmpire);
const strengthRatio = myStrength / Math.max(avgStrength, 1);

// STRONGER BALANCE: More aggressive penalty curve
if (strengthRatio > 2.0) {
  attackChance *= 0.25;  // Dominant - heavy restraint
} else if (strengthRatio > 1.5) {
  attackChance *= 0.4;   // Strong - significant restraint
} else if (strengthRatio > 1.2) {
  attackChance *= 0.6;   // Ahead - mild restraint
} else if (strengthRatio < 0.3) {
  attackChance *= 1.5;   // Desperate - aggressive survival
} else if (strengthRatio < 0.5) {
  attackChance *= 1.3;   // Weak - need to attack
} else if (strengthRatio < 0.8) {
  attackChance *= 1.1;   // Slightly behind - small boost
}
```
✅ **Leaders are penalized, underdogs boosted**
✅ **Prevents runaway victories**

**Coalition Diplomacy** (`engine.ts:601-604`):
```typescript
let diplomacyChance = personality.diplomacy;
if (leaderIsDominant && !weAreLeader) {
  diplomacyChance += 0.3; // More eager to form alliances
}
```
✅ **Weak empires form defensive alliances**

**Power Calculation** (`engine.ts:846-854`):
```typescript
private calculateMilitaryStrength(empire: BotEmpireView): number {
  return (
    empire.soldiers * 1 +
    empire.fighters * 2 +
    empire.defenseStations * 3 +
    empire.heavyCruisers * 10 +
    empire.lightCruisers * 5
  );
}
```

---

### x-imperium Bot Engine

**Attack Threshold Check** (`src/lib/bots/decision-engine.ts:806-819`):
```typescript
// M9: Check archetype attack threshold
const archetype = empire.botArchetype;
if (archetype) {
  const ourPower = calculateOurMilitaryPower(empire);
  const enemyPower = target.militaryPower;

  // Only attack if we pass the archetype's attack threshold check
  const isGrudgeTarget = context.permanentGrudges?.includes(target.id);
  if (!isGrudgeTarget && !shouldArchetypeAttack(archetype, ourPower, enemyPower)) {
    return { type: "do_nothing" };
  }
}
```
✅ **HAS power checks before attacking**

**Attack Thresholds by Archetype**:
```typescript
blitzkrieg: 0.70  // Attacks even defended targets
warlord:    0.50  // Attacks if enemy < 50% of bot's power
schemer:    0.40
opportunist: 0.35
merchant:   0.30
tech_rush:  0.25  // Only attacks when significantly stronger
diplomat:   0.20  // Only attacks very weak enemies
turtle:     0.00  // PRD 7.6: never attacks first
```
✅ **Archetypes have differentiated attack strategies**

**Power Calculation** (`decision-engine.ts:858-867`):
```typescript
function calculateOurMilitaryPower(empire: BotDecisionContext["empire"]): number {
  return (
    empire.soldiers +
    empire.fighters * 3 +
    empire.lightCruisers * 5 +
    empire.heavyCruisers * 8 +
    empire.carriers * 12 +
    empire.stations * 50
  );
}
```

**Missing Features**:
- ❌ No coalition formation against leaders
- ❌ No attack restraint for strong empires
- ❌ No underdog attack bonuses
- ❌ No strength ratio modifiers

---

## Test Harness Comparison

### SRE Test Scripts

**Battle Test** (`scripts/battle-test.ts`):
```typescript
const matchups = [
  { name: '4-Way Classic', bots: ['aggressive', 'defensive', 'deceptive', 'random'], maxTurns: 100 },
  { name: '4-Way Specialists', bots: ['economist', 'scientist', 'populist', 'gambler'], maxTurns: 100 },
  { name: '6-Way Melee', bots: [...], maxTurns: 150 },
  { name: 'Grand Battle', bots: botIds.slice(0, 8), maxTurns: 200 },
];
```
✅ **Multiple matchup configurations**
✅ **Varied bot counts (4, 6, 8 players)**

**Variety Test** (`scripts/variety-test.ts`):
```typescript
// Run 10 iterations of same matchup
for (let i = 0; i < config.runs; i++) {
  const seed = baseSeed * 1000 + i * 12345 + Math.floor(Date.now() / 1000) % 10000;
  const harness = new BotTestHarness({ bots, maxTurns, seed });
  const result = await harness.runGame();
  winners[result.winnerName] = (winners[result.winnerName] || 0) + 1;
}

// Check for dominance
if (topWinPct > 60) {
  console.log(`⚠️  WARNING: ${winner} dominates with ${topWinPct}% win rate`);
}
```
✅ **Statistical analysis across multiple runs**
✅ **Balance detection: warns if one bot wins >60%**
✅ **Personality variance**: ±5-15% to simulate realistic variety

---

### x-imperium Test Scripts

**Bot Stress Test** (`scripts/bot-stress-test.ts`):
```typescript
const test1Config = { empireCount: 25, turnLimit: 50 };
const test2Config = { empireCount: 50, turnLimit: 100 };
const test3Config = { empireCount: 100, turnLimit: 200 };

// Coverage report
console.log(`Eliminations: ${eliminationOccurred ? 'Yes' : 'No'}`);
console.log(`Attacks launched: ${coverage.attacks.count}`);
```
✅ **Large-scale testing (100 bots)**
✅ **Coverage tracking**

**Debug Eliminations** (`scripts/debug-eliminations.ts`):
```typescript
// Count combat outcomes
for (const action of attacks) {
  if (combatResult.winner === 'attacker') {
    attackerWins++;
  } else if (combatResult.winner === 'defender') {
    defenderWins++;
  }
}

console.log(`Attacker win rate: ${(attackerWins / attacks.length) * 100}%`);
```
✅ **Combat outcome analysis**
✅ **Win rate tracking**

**Missing Features**:
- ❌ No multi-run statistical analysis
- ❌ No balance warnings (dominant bot detection)
- ❌ No personality variance testing

---

## Key Differences Summary

| Feature | SRE | x-imperium | Impact |
|---------|-----|------------|--------|
| **Win Condition** | 2/3 fronts | All 3 phases | ⚠️ x-imperium much harder for attackers |
| **Planet Capture** | Up to 20% | 5-15% | ⚠️ x-imperium takes 2× as many wins to eliminate |
| **Coalition Mechanics** | ✅ Gang up on leaders | ❌ Missing | 🔴 Runaway winners unchecked |
| **Attack Restraint** | ✅ Strong empires penalized | ❌ Missing | 🔴 Leaders attack freely |
| **Underdog Bonuses** | ✅ Weak empires boosted | ❌ Missing | 🔴 Weak empires can't catch up |
| **Power Checks** | ✅ Implicit in targeting | ✅ Explicit thresholds | ✅ Both have checks |
| **Fog of War** | ⚠️ Mentioned but unclear | ⚠️ Not implemented | 🟡 May know perfect info |

---

## Recommended Fixes (Priority Order)

### 1. **Fix Combat Win Conditions** (HIGH IMPACT)

**Option A: Allow Partial Victories**
```typescript
// Instead of: must win ALL 3 phases
// Use SRE's approach: win 2 out of 3 phases

let phasesWon = 0;
if (spaceResult.winner === "attacker") phasesWon++;
if (orbitalResult.winner === "attacker") phasesWon++;
if (groundResult.winner === "attacker") phasesWon++;

if (phasesWon >= 2) {
  outcome = "attacker_victory";
  planetsCaptured = /* calculate based on phasesWon/3 */;
}
```

**Option B: Increase Planet Capture Rate**
```typescript
// Change from 5-15% → 15-30%
export const PLANET_CAPTURE_MIN_PERCENT = 0.15;
export const PLANET_CAPTURE_MAX_PERCENT = 0.30;

// Average: 22% per win
// 9 planets ÷ 22% = ~4-5 successful attacks to eliminate
```

### 2. **Add Coalition Mechanics** (HIGH IMPACT)

**Detect Runaway Leaders**:
```typescript
// In bot-processor.ts or decision-engine.ts
function calculateLeaderDominance(empires) {
  const activeEmpires = empires.filter(e => !e.isEliminated);
  const avgNetworth = activeEmpires.reduce((sum, e) => sum + e.networth, 0) / activeEmpires.length;
  const leader = activeEmpires.reduce((a, b) => a.networth > b.networth ? a : b);
  const isDominant = leader.networth > avgNetworth * 2;
  return { leader, isDominant };
}
```

**Boost Attack Priority**:
```typescript
// In selectTarget() or generateAttackDecision()
if (leaderIsDominant && target.id === leader.id) {
  // Boost priority for attacking the leader
  targetScore += 50;
}
```

**Coalition Diplomacy**:
```typescript
// In generateDiplomacyDecision()
if (leaderIsDominant && !weAreLeader) {
  diplomacyChance += 0.3; // More likely to form alliances
}
```

### 3. **Add Attack Restraint for Strong Empires** (MEDIUM IMPACT)

```typescript
// In getAdjustedWeights()
const avgNetworth = context.averageNetworth; // Add to BotDecisionContext
const myNetworth = context.empire.networth;
const strengthRatio = myNetworth / Math.max(avgNetworth, 1);

// Apply restraint multiplier
let attackMultiplier = 1.0;
if (strengthRatio > 2.0) {
  attackMultiplier = 0.25;  // Dominant - heavy restraint
} else if (strengthRatio > 1.5) {
  attackMultiplier = 0.4;   // Strong - significant restraint
} else if (strengthRatio > 1.2) {
  attackMultiplier = 0.6;   // Ahead - mild restraint
} else if (strengthRatio < 0.3) {
  attackMultiplier = 1.5;   // Desperate - aggressive survival
} else if (strengthRatio < 0.5) {
  attackMultiplier = 1.3;   // Weak - need to attack
}

weights.attack *= attackMultiplier;
// Re-normalize weights
```

### 4. **Reduce Starting Planets** (LOW EFFORT, MEDIUM IMPACT)

```typescript
// In tests/simulation/empire-factory.ts
const STARTING_PLANETS: PlanetType[] = [
  "food",           // 1 Food planet
  "ore",            // 1 Ore planet
  "petroleum",      // 1 Petroleum planet
  "government",     // 1 Government planet
  "research"        // 1 Research planet
];
// Reduced from 9 → 5 starting planets
// Elimination threshold: 5 successful attacks instead of 9
```

### 5. **Implement Fog of War / Espionage** (LONG TERM)

**Current Problem**: Bots may know exact enemy military strength
**Solution**: Require espionage to assess enemy power

```typescript
// In BotDecisionContext
interface BotTarget {
  id: string;
  militaryPower: number | null;  // null if not scouted
  lastScoutedTurn: number | null;
  estimatedPower?: number;  // rough estimate based on networth
}

// In generateAttackDecision()
if (!target.militaryPower) {
  // Use estimated power with uncertainty
  const estimatedPower = target.networth * 0.3; // rough estimate
  const enemyPower = estimatedPower * (0.8 + Math.random() * 0.4); // ±20% uncertainty
}
```

### 6. **Add Multi-Run Balance Testing** (LOW EFFORT)

```typescript
// Create scripts/variety-test.ts based on SRE's approach
async function runBalanceTest() {
  const runs = 10;
  const winners: Record<string, number> = {};

  for (let i = 0; i < runs; i++) {
    const seed = Date.now() + i * 1000;
    const result = runSimulation({ empireCount: 25, turnLimit: 100, seed });

    if (result.winner) {
      winners[result.winner.archetype] = (winners[result.winner.archetype] || 0) + 1;
    }
  }

  // Check for dominance
  const topWinPct = Math.max(...Object.values(winners)) / runs * 100;
  if (topWinPct > 60) {
    console.warn(`⚠️  Balance issue: top archetype wins ${topWinPct}% of games`);
  }
}
```

---

## Math Behind the Problem

### Current x-imperium:
```
Starting planets: 9
Planet capture rate: 5-15% (avg 10%)
Planets per successful attack: 1 (minimum enforced)

Successful attacks needed: 9
Current attacker win rate: 1.2%
Attacks per turn: ~1-2 (varies by bot count)

Turns to eliminate = 9 wins ÷ 0.01 wins/turn = 900 turns
Test limits: 50-200 turns
Conclusion: Eliminations mathematically impossible
```

### With 2/3 Phase Victory:
```
Starting planets: 9
Attacker needs: 2 out of 3 phase victories
Estimated win rate increase: 1.2% → 15% (10× improvement)
Attacks per turn: ~1-2

Turns to eliminate = 9 wins ÷ 0.15 wins/turn = 60 turns
Test limit: 100 turns
Conclusion: Eliminations feasible
```

### With Increased Capture Rate:
```
Starting planets: 9
Planet capture rate: 15-30% (avg 22%)
Planets per successful attack: 2 (avg)

Successful attacks needed: 5
Current win rate: 1.2%

Turns to eliminate = 5 wins ÷ 0.01 wins/turn = 500 turns
Test limit: 200 turns
Conclusion: Still difficult but better
```

### With Both Fixes:
```
2/3 phase victory: 15% win rate
Increased capture: 2 planets per win
Attacks needed: 5

Turns to eliminate = 5 wins ÷ 0.15 wins/turn = 33 turns
Test limit: 100 turns
Conclusion: Eliminations very feasible
```

---

## Next Steps

1. **Immediate**: Implement Option 1A (2/3 phase victory) OR Option 1B (increase capture rate)
2. **Short term**: Add coalition mechanics (gang up on leaders)
3. **Medium term**: Add attack restraint for strong empires
4. **Long term**: Implement fog of war / espionage system
5. **Testing**: Create variety-test.ts for balance validation

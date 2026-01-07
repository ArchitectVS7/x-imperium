# Nexus Dominion: Combat System

**Version:** 1.0 (Consolidated)
**Status:** Active - Primary Combat Reference
**Last Updated:** January 2026

---

## Overview

Combat in Nexus Dominion uses a **unified D20 resolution system** that replaced the original sequential 3-phase combat. This design change addressed a critical balance issue where the original system resulted in only 1.2% attacker win rate.

**Current Balance**: 47.6% attacker win rate with equal forces (validated through automated testing).

---

## Combat Resolution

### Unified System

All combat resolves in a **single roll** with multiple possible outcomes:

```typescript
function resolveUnifiedInvasion(
  attackerForces: Forces,
  defenderForces: Forces,
  defenderSectorCount: number
): CombatResult {
  // Calculate total combat power
  const attackerPower = calculateUnifiedPower(attackerForces);
  const defenderPower = calculateUnifiedPower(defenderForces) * 1.10; // Defender advantage

  // D20-style resolution with variance
  const { winner, attackerWinChance } = determineUnifiedWinner(
    attackerPower,
    defenderPower
  );

  // Calculate casualties for both sides
  const casualties = calculateUnifiedCasualties(
    attackerForces,
    defenderForces,
    attackerPower,
    defenderPower,
    winner
  );

  // Determine sectors captured (5-15% on victory)
  let sectorsCaptured = 0;
  if (winner === "attacker") {
    const capturePercent = 0.05 + Math.random() * 0.10;
    sectorsCaptured = Math.max(1, Math.floor(defenderSectorCount * capturePercent));
  }

  return { outcome, sectorsCaptured, casualties, summary };
}
```

### Key Features

| Feature | Value |
|---------|-------|
| **Base Win Rate** | 47.6% attacker (equal forces) |
| **Defender Advantage** | 1.10× power multiplier |
| **Strong Attacker (1.5×)** | 62.2% win rate |
| **Weak Attacker (0.5×)** | 25.4% win rate |
| **Sectors Captured** | 5-15% on victory |

### Design Rationale

D-Day wasn't "win air superiority, THEN naval battle, THEN beach landing" - it was a **unified operation** where all elements contributed simultaneously.

The "ground war is hardest" philosophy is preserved through:
- 10% defender advantage (home turf bonus)
- Costly victories with mutual casualties
- Stalemates representing grinding warfare

---

## Combat Outcomes

Six possible results create dramatic variety:

| Result | Threshold | Effect |
|--------|-----------|--------|
| **Total Victory** | Roll ≥ 18 | Capture 40% sectors, enemy routed |
| **Victory** | Roll ≥ 14 | Capture 25% sectors |
| **Costly Victory** | Roll ≥ 10 | Capture 15% sectors, heavy losses both sides |
| **Stalemate** | Roll ≥ 6 | No capture, both lose units |
| **Repelled** | Roll ≥ 2 | Attacker retreats, loses units |
| **Disaster** | Roll < 2 | Attacker routed, loses 2× units |

---

## Unit Types

### Basic Units (Credits Only)

| Unit | Role | Cost | Pop | Attack | Defense |
|------|------|------|-----|--------|---------|
| **Soldiers** | Ground combat | 50 | 0.2 | 1 | 1 |
| **Fighters** | Orbital combat | 200 | 0.4 | 3 | 2 |
| **Carriers** | Troop transport | 2,500 | 3.0 | 12 | 10 |
| **Generals** | Command buff | 1,000 | 1.0 | — | — |
| **Covert Agents** | Espionage | 500 | 1.0 | — | — |

### Advanced Units (Require Research)

| Unit | Credits | Research | Attack | Defense |
|------|---------|----------|--------|---------|
| **Light Cruisers** | 5,000 | Level 2 | 10 | 20 |
| **Defense Stations** | 3,000 | Level 3 | 50 | 50 (2× on defense) |
| **Heavy Cruisers** | 15,000 | Level 4 | 25 | 50 |

---

## Combat Types

### Full Invasion

- Full-scale attack to capture sectors
- Requires carriers for troop transport
- Single unified resolution
- **Limit**: One invasion per turn

### Guerilla Attack

- Quick raid using soldiers only
- No carriers required
- Lower risk, lower reward
- Good for harassment

### Nuclear Warfare

- Unlocks at Turn 100
- Requires Black Market purchase (500M credits)
- 40% base population damage
- Target may detect and foil

---

## Combat Mechanics

### Army Effectiveness

| Factor | Effect |
|--------|--------|
| **Base Rating** | 0-100% |
| **Affects** | Combat damage dealt |
| **Recovery** | +2% per turn |
| **Victory Bonus** | +5-10% |
| **Defeat Penalty** | -5% |
| **Unpaid Penalty** | Drops if maintenance not met |

### Retreat & Reinforcements

| Mechanic | Rule |
|----------|------|
| **Retreat** | Allowed, but 15% "attack of opportunity" losses |
| **Reinforcements** | Request from alliance, 1-5 turns arrival |
| **Request Denied** | Alliance standing drops, trust decay |
| **Fog of War** | See total power, not composition |

### Attack Restrictions

Cannot attack:
- Empires in protection period (first 20 turns)
- Coalition members
- Active treaty partners
- Significantly weaker empires (unless they attacked first)

---

## Covert Operations

Covert agents enable asymmetric warfare:

### Covert Points

- Earn 5 points per turn (max 50)
- Operations consume points based on complexity
- Agent capacity = Government sectors × 300

### Available Operations

| Operation | Effect | Risk |
|-----------|--------|------|
| **Send Spy** | Reveal enemy stats | Low |
| **Insurgent Aid** | Support rebels | Medium |
| **Support Dissension** | Worsen civil status | Medium |
| **Demoralize Troops** | Reduce effectiveness | Medium |
| **Bombing Operations** | Destroy resources | High |
| **Relations Spying** | Reveal diplomacy | Low |
| **Take Hostages** | Demand ransom | High |
| **Carriers Sabotage** | Damage fleet | Very High |
| **Communications Spying** | Intercept messages | Low |
| **Setup Coup** | Overthrow government | Very High |

### Success Rate Factors

- Your agent count vs target's
- Target's Government sector count
- Operation difficulty
- Random variance (±20%)

---

## Combat Turn Order

Combat resolution uses **weak-first initiative**:

```typescript
// Sort empires by networth ascending
const sortedByNetworth = empiresInCombat
  .sort((a, b) => a.networth - b.networth);

// Weakest attacks first
for (const empire of sortedByNetworth) {
  const attack = attacks.find(a => a.attackerId === empire.id);
  await resolveCombat(attack);
}
```

**Why**: Prevents "rich get richer" oscillation, gives underdogs first strike.

---

## Implementation

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/combat/volley-combat-v2.ts` | D20 combat engine |
| `src/lib/combat/unified-combat.ts` | Unified resolution |
| `src/lib/combat/theater-control.ts` | Theater bonuses |
| `src/lib/combat/stances.ts` | Combat stances |
| `src/lib/combat/effectiveness.ts` | Unit effectiveness matrix |
| `src/lib/formulas/combat-power.ts` | Power calculations |
| `src/lib/formulas/casualties.ts` | Casualty formulas |

### Test Validation

From `unified-combat.test.ts`:
- Equal forces: 47.6% attacker win rate ✅
- Strong attacker (1.5×): 62.2% win rate ✅
- Weak attacker (0.5×): 25.4% win rate ✅

---

## Related Documents

- [Game Design](GAME-DESIGN.md) - Overall game design
- [Bot System](BOT-SYSTEM.md) - AI combat behavior
- [Terminology Rules](../development/TERMINOLOGY.md) - CRITICAL

---

*Extracted from VISION.md and PRD.md Section 7*

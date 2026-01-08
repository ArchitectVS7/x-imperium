# Combat System

## Active System: Volley Combat v2

**File:** `volley-combat-v2.ts`
**Status:** PRODUCTION

### Overview

The Volley Combat v2 system uses true D20 tabletop mechanics for empire-vs-empire combat. Each battle consists of up to 3 volleys, with the winner determined by volley count (best of 3).

### Combat Flow

1. **Pre-combat:** Calculate theater bonuses, set stances
2. **Volley 1:** Both sides roll D20 + TAR vs opponent's DEF
3. **Optional retreat** after Volley 1 (15% attack-of-opportunity casualty penalty)
4. **Volley 2:** Same resolution
5. **Optional retreat** after Volley 2 (if not decided)
6. **Volley 3:** Final tiebreaker if needed
7. **Post-combat:** Sector capture based on victory margin

### D20 Mechanics

Each unit type has D20 stats (defined in `data/unit-stats.json`):
- **TAR** (Targeting): Attack roll modifier
- **DEF** (Defense): Threshold to avoid being hit
- **HUL** (Hull): Damage capacity
- **REA** (Reactor): Initiative/retreat capability
- **CMD** (Command): Morale effects
- **DOC** (Doctrine): Psychological warfare

**Hit formula:** `D20 roll + TAR + stance mod + theater bonus >= target DEF`

### Combat Stances

Players select a stance before combat (see `stances.ts`):

| Stance | Attack | Defense | Casualties |
|--------|--------|---------|------------|
| Aggressive | +3 | -2 | +20% taken |
| Balanced | 0 | 0 | Normal |
| Defensive | -2 | +3 | -20% taken |
| Evasive | -3 | +1 | -40% taken |

### Theater Bonuses

Analyzed by `theater-control.ts`:
- **Space Dominance** (2x space units): +2 attack
- **Orbital Shield** (defender stations): +2 DEF
- **Ground Superiority** (3x marines): Capture even with 2-volley losses

### Sector Capture

| Outcome | Sectors Captured |
|---------|-----------------|
| 3-0 Decisive | 15% of defender's sectors |
| 2-1 Standard | 10% of defender's sectors |
| Retreat | 0 sectors |

---

## Utility Functions

**File:** `phases.ts`
**Status:** ACTIVE (contains guerilla/retreat)

Provides combat utility functions not covered by the main volley system:

- `resolveGuerillaAttack()` - Soldier-only raids
- `resolveRetreat()` - Retreat with 15% casualty penalty
- `SOLDIERS_PER_CARRIER` - Carrier capacity constant (100)

---

## Type Definitions

**File:** `types.ts`
**Status:** CANONICAL

All combat types are defined here:
- `Forces` - Unit composition (re-exported from `@/lib/game/types/forces`)
- `CombatResult` - Battle outcome and casualties
- `PhaseResult` - Single phase/volley result
- `AttackType` - "invasion" | "guerilla"
- `CombatPhase` - Phase identifiers

---

## Supporting Modules

| File | Purpose |
|------|---------|
| `stances.ts` | Combat stance definitions and modifiers |
| `theater-control.ts` | Theater bonus calculations |
| `effectiveness.ts` | Unit effectiveness matrix |
| `containment-bonus.ts` | Containment mechanics |
| `nuclear.ts` | WMD/nuclear option handling |
| `coalition-raid-service.ts` | Coalition raid mechanics |

---

## Migration History

- **2026-01-08:** Consolidated combat system
  - Created `types.ts` as canonical type source
  - Removed deprecated `unified-combat.ts` (was feature-flagged OFF)
  - Simplified `phases.ts` to utility functions only
  - Updated all imports to use canonical type locations

# Redesign Archive - December 2025

**Compressed from:** 19 files in `docs/redesign-12-30-2025/`
**Date Range:** December 28-30, 2025
**Outcome:** Design decisions now in `docs/core/GAME-DESIGN.md`

---

## What Happened

Extensive playtesting revealed critical issues with combat system and galaxy structure. A 3-day design sprint produced the current game design.

---

## Problems Discovered

1. **Combat Win Rate:** 1.2% attacker win rate, 0 eliminations in testing
2. **Cognitive Overload:** 100 empires with "attack anyone" was unmanageable
3. **Sequential Combat:** 3-phase combat (space → orbital → ground) mathematically broken

---

## Key Decisions Made

### 1. Unified Combat System
- **Before:** Sequential 3-phase combat
- **After:** Single D20 roll with 6 outcomes
- **Result:** ~48% attacker win rate (balanced)

### 2. Sector-Based Galaxy
- **Before:** 100 empires, attack anyone
- **After:** 10 sectors of 10 empires each
- **Result:** Manageable strategic geography

### 3. Coalition Mechanics
- **Before:** Leaders snowball unchecked
- **After:** Auto anti-leader bonuses at 7+ Victory Points
- **Result:** Natural comeback mechanics

### 4. Starting Sectors
- **Before:** 9 starting planets
- **After:** 5 starting sectors
- **Result:** Faster, more decisive games

### 5. Starmap Visualization
- **Selected:** Concept 2 (Regional Cluster Map)
- **Rejected:** Concept 1 (Radial Sphere), Concept 3 (Tactical Filter)
- **Aesthetic:** Star Trek LCARS

---

## Design Principles Established

1. "Every game is someone's first game"
2. "Geography creates strategy"
3. "Consequence over limits"
4. "Clarity through constraints"
5. "Foundation before complexity"

---

## Original Files (Archived)

| File | Purpose |
|------|---------|
| ELIMINATION-INVESTIGATION.md | Identified 1.2% win rate problem |
| SRE-COMPARISON.md | Compared to original Solar Realms Elite |
| PATH-FORWARD.md | Problem assessment and solutions |
| GAME-DESIGN-EVALUATION.md | 100-empire problem analysis |
| GAME-MANUAL-CURRENT.md | As-is system documentation |
| GAME-MANUAL-REDESIGN.md | Board game approach proposal |
| STARMAP-VISUALIZATION-CONCEPTS.md | 3 starmap concepts |
| STARMAP-DIAGRAMS.md | Mermaid flowcharts |
| STARMAP-WIREFRAMES.md | ASCII UI wireframes |
| STARMAP-CONCEPT2-DEEP-DIVE.md | Selected concept details |
| STARMAP-CONCEPT2-REVIEWS.md | 3 independent reviews |
| COMBAT-GEOGRAPHY-TURNS.md | Combat solutions A/B/C |
| UNIFIED-VISION-ANALYSIS.md | "Crusader Kings meets Eve" framing |
| IMPLEMENTATION-TRACKER-OLD.md | Earlier tracker version |

---

## Where Decisions Ended Up

| Decision | Now In |
|----------|--------|
| Combat system | `docs/core/COMBAT-SYSTEM.md` |
| Galaxy structure | `docs/core/GAME-DESIGN.md` Section 3 |
| Coalition mechanics | `docs/core/GAME-DESIGN.md` Section 6 |
| Bot architecture | `docs/core/BOT-SYSTEM.md` |
| Design principles | `docs/core/GAME-DESIGN.md` Section 1 |

---

*Compressed: January 2026*
*Original process: 3 days (Dec 28-30, 2025)*

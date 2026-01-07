# Research System Redesign Specification

**Status:** IMPLEMENTED
**Date:** January 2026
**Archived From:** `docs/redesign-01-02-2026/RESEARCH-REDESIGN.md`

---

## Summary

Replaced 8-level passive research with 3-tier draft system:
- **Tier 1 (Turn ~10):** Choose 1 of 3 Doctrines
- **Tier 2 (Turn ~30):** Choose 1 of 2 Specializations
- **Tier 3 (Turn ~60):** Automatic Capstone unlock

---

## The Three Doctrines

| Doctrine | Combat Effect | Unlocks |
|----------|---------------|---------|
| **War Machine** | +15% attack | Heavy Cruisers |
| **Fortress** | +25% defense | Defense Platforms |
| **Commerce** | +20% sell prices | Trade Fleets |

---

## Specializations (Tier 2)

### War Machine Path
- **Shock Troops:** First strike damage
- **Siege Engines:** +50% vs Defense Platforms

### Fortress Path
- **Shield Arrays:** Negate first-strike
- **Minefield Networks:** Attackers lose 10% before combat

### Commerce Path
- **Trade Monopoly:** -20% buy, +30% sell
- **Mercenary Contracts:** Hire combat bonuses

---

## Capstones (Tier 3)

| Doctrine | Capstone | Effect |
|----------|----------|--------|
| War Machine | Dreadnought | 10x Heavy Cruiser power |
| Fortress | Citadel World | One invulnerable sector |
| Commerce | Economic Hegemony | +50% of #2's income |

---

## Bot Integration

| Archetype | Preferred Doctrine |
|-----------|-------------------|
| Warlord/Blitzkrieg | War Machine |
| Turtle/Diplomat | Fortress |
| Merchant/Tech Rush | Commerce |
| Opportunist | Copies neighbor |

---

## Implementation Notes

- Research Points still accumulate from Research sectors
- Thresholds: 1,000 RP (T1), 5,000 RP (T2), 15,000 RP (T3)
- Choices visible to all players (creates strategic tension)
- Bots announce doctrine choices with personality messages

---

*This specification was implemented. See `src/lib/game/services/research-service.ts`*

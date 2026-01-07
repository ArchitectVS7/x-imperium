# Manufacturing & Crafting System

**Status:** EXPANSION CONTENT - Not in Core Game v1.0
**Expansion Pack:** "Nexus Dominion: Industrial Age"
**Prerequisites:** Core game complete, player demand for deeper economy

---

## Overview

The crafting system introduces a 4-tier resource progression that gates advanced military units behind strategic resource management.

**Design Goal:** Add economic depth without overwhelming casual players.

---

## Tier Structure

### Tier 0: Base Resources (Core Game)

These exist in the base game:

| Resource | Source | Description |
|----------|--------|-------------|
| **Credits** | Taxes, Trade, Tourism, Urban | Universal currency |
| **Food** | Food Sectors | Feeds population & military |
| **Ore** | Ore Sectors | Raw minerals |
| **Petroleum** | Petroleum Sectors | Fuel |
| **Research Points** | Research Sectors | Tech progression |

### Tier 1: Refined Resources

Basic processing of Tier 0. Produced automatically by specialized sectors.

| Resource | Recipe | Auto-Production |
|----------|--------|-----------------|
| **Refined Metals** | 100 Ore | Ore Sectors: 10% of output |
| **Fuel Cells** | 50 Petroleum + 20 Credits | Petroleum Sectors: 10% |
| **Polymers** | 30 Petroleum + 20 Ore | Industrial Sectors only |
| **Processed Food** | 200 Food | Food Sectors: 5% |
| **Labor Units** | 1,000 Population + 50 Credits | Urban Sectors: 5% |

### Tier 2: Manufactured Components (Research 2+)

Building blocks for advanced military:

| Component | Recipe | Research |
|-----------|--------|----------|
| **Electronics** | 2 Refined Metals + 1 Polymers | Level 2 |
| **Armor Plating** | 3 Refined Metals + 1 Polymers | Level 2 |
| **Propulsion Units** | 2 Fuel Cells + 1 Refined Metals | Level 2 |
| **Life Support** | 1 Processed Food + 1 Polymers + 1 Electronics | Level 3 |
| **Weapons Grade Alloy** | 4 Refined Metals + 2 Fuel Cells | Level 3 |
| **Targeting Arrays** | 2 Electronics + 1 Refined Metals | Level 3 |
| **Stealth Composites** | 3 Polymers + 1 Electronics | Level 4 |
| **Quantum Processors** | 3 Electronics + 1 Weapons Grade Alloy | Level 5 |

**Crafting Time:** 2-5 turns depending on research level.

### Tier 3: Advanced Systems (Research 5+)

Strategic resources for capital ships:

| System | Recipe | Research |
|--------|--------|----------|
| **Reactor Cores** | 3 Propulsion + 2 Electronics + 1 Quantum Processor | Level 5 |
| **Shield Generators** | 2 Armor Plating + 2 Electronics + 1 Quantum Processor | Level 5 |
| **Warp Drives** | 2 Reactor Cores + 1 Stealth Composites + 1 Targeting Array | Level 6 |
| **Cloaking Devices** | 3 Stealth Composites + 2 Quantum Processors | Level 6 |
| **Ion Cannon Cores** | 2 Weapons Grade Alloy + 2 Reactor Cores + 1 Targeting Array | Level 6 |
| **Neural Interfaces** | 2 Quantum Processors + 1 Life Support | Level 7 |
| **Singularity Containment** | 3 Reactor Cores + 2 Shield Generators | Level 8 |

**Crafting Time:** 5-10 turns.

---

## Industrial Sectors

**Cost:** 15,000 credits (expensive late-game investment)

**Production:** Processes Tier 0 → Tier 1 (player configures which resource)

**Bonus:** Research level reduces crafting time by 5% per level

**Strategic Value:**
- Multipliers, not producers
- Essential for Tier 2+ crafting at scale
- High-value attack targets

---

## Crafting Queue System

1. Queue crafting orders at Industrial Sectors
2. Each order reserves required components
3. Completion time based on complexity
4. Maximum 5 concurrent orders per empire
5. Orders process during turn end

```
┌─────────────────────────────────────────────────┐
│ CRAFTING QUEUE                  [3/5 slots used]│
├─────────────────────────────────────────────────┤
│ ⚙️ Quantum Processors (x2)      [Turn 47/50]    │
│ ⚙️ Reactor Cores (x1)           [Turn 49/52]    │
│ ⚙️ Shield Generators (x1)       [Turn 50/54]    │
│                                                 │
│ [+] ADD ORDER                                   │
└─────────────────────────────────────────────────┘
```

---

## Units Requiring Crafting

Base game units use credits only. Expansion adds:

| Unit | Base Cost | + Crafting Requirement |
|------|-----------|------------------------|
| **Advanced Fighter** | 500 cr | 1 Electronics, 1 Propulsion |
| **Heavy Cruiser (Enhanced)** | 2,000 cr | 1 Reactor Core, 1 Armor Plating |
| **Dreadnought** | 10,000 cr | 2 Reactor Cores, 2 Shield Generators, 1 Warp Drive |

**Backward Compatibility:** Base game units remain available without crafting.

---

## Balance Considerations

**Pros:**
- Adds depth for hardcore players
- Creates new strategic choices
- Makes late-game more interesting

**Cons (why not in base game):**
- Adds cognitive load (20+ resources)
- Supply chain competes with empire management
- Overwhelming for new players

---

## Crafting Tree (Visual)

```
Tier 0 (Base)
├── Credits
├── Food ──────────────→ Processed Food
├── Ore ───────────────→ Refined Metals
├── Petroleum ─────────→ Fuel Cells
│                      → Polymers
└── Population ────────→ Labor Units

Tier 1 → Tier 2
├── Refined Metals ────→ Electronics, Armor Plating
├── Fuel Cells ────────→ Propulsion Units
├── Polymers ──────────→ Stealth Composites
└── Processed Food ────→ Life Support

Tier 2 → Tier 3
├── Propulsion ────────→ Reactor Cores
├── Electronics ───────→ Shield Generators
├── Reactor Cores ─────→ Warp Drives, Ion Cannons
└── Quantum Processors → Neural Interfaces
```

---

## Implementation Files

| File | Purpose |
|------|---------|
| `src/lib/game/services/crafting-service.ts` | Service implementation |
| `src/lib/game/constants/crafting.ts` | Recipe definitions |

---

*This system is preserved for potential future expansion. Not planned for v1.0 release.*

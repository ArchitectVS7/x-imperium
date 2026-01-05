# Nexus Dominion

A turn-based 4X space empire strategy game with AI-controlled bot opponents. Built with Next.js 14, TypeScript, and PostgreSQL.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/ArchitectVS7/nexus-dominion.git
cd nexus-dominion

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL (Neon PostgreSQL)

# Run database migrations
npm run db:push

# Start development server
npm run dev

# Access at http://localhost:3000
```

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS with LCARS-inspired design system
- **Database:** PostgreSQL (Neon) with Drizzle ORM
- **Testing:** Vitest (1800+ unit tests), Playwright (E2E)
- **AI Bots:** 4-tier system with 100 unique personas

## Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Production server

# Testing
npm run test             # Unit tests (watch mode)
npm run test -- --run    # Unit tests once
npm run test:e2e         # Playwright E2E tests
npm run test:coverage    # Coverage report (80% threshold)

# Quality
npm run lint             # ESLint
npm run typecheck        # TypeScript strict mode

# Database
npm run db:push          # Push schema changes
npm run db:studio        # Drizzle Studio GUI
npm run db:generate      # Generate migrations
npm run db:migrate       # Run migrations
```

## Game Features

### Core Gameplay
- Turn-based empire management (200-turn games)
- 5 resource types: Credits, Food, Ore, Petroleum, Research
- 8 planet types with unique production profiles
- Progressive unlock system (features unlock as you advance)

### Military & Combat
- 7 unit types: Marines, Drones, Frigates, Cruisers, Carriers, Stations, Agents
- 3-phase combat: Space Battle → Orbital Bombardment → Ground Assault
- Army diversity bonuses and unit effectiveness matrix
- Nuclear warfare unlocks at Turn 100

### Diplomacy & Economy
- Non-Aggression Pacts and Alliances
- Coalition system for group warfare
- Dynamic market with supply/demand pricing
- Black Market access at Turn 30

### Bot Opponents
- 100 unique bot personas with distinct personalities
- 8 archetypes: Warlord, Diplomat, Merchant, Schemer, Turtle, Blitzkrieg, Tech Rush, Opportunist
- 4-tier AI system:
  - **Tier 1 (LLM Elite):** Natural language decisions
  - **Tier 2 (Strategic):** Decision tree based
  - **Tier 3 (Simple):** Behavioral rules
  - **Tier 4 (Random):** Weighted random actions
- Emotional states and relationship memory

### Victory Conditions
1. **Conquest:** Control 60% of all planets
2. **Economic:** 1.5x networth of 2nd place
3. **Diplomatic:** Coalition controls 50% territory
4. **Research:** Complete all 8 research levels
5. **Military:** 2x military power of all others combined
6. **Survival:** Highest networth at Turn 200

## Documentation

- **[Current Implementation Plan](.claude/plans/recursive-dazzling-chipmunk.md)** - Active redesign plan (Phases 1-3: 93% complete)
- [CLAUDE.md](CLAUDE.md) - AI assistant context and codebase guide
- [docs/PRD.md](docs/PRD.md) - Product Requirements Document (v3.0)
- [docs/VISION.md](docs/VISION.md) - Game vision and design philosophy
- [docs/PHASE-1-3-AUDIT.md](docs/PHASE-1-3-AUDIT.md) - Implementation audit report
- [docs/MILESTONES.md](docs/MILESTONES.md) - Development roadmap
- [docs/design/BOT_ARCHITECTURE.md](docs/design/BOT_ARCHITECTURE.md) - Bot AI system design

## Project Status

**Version:** 0.6-Prototype (M11 Complete)

| Milestone | Status |
|-----------|--------|
| M0-M8: Core Game | Complete |
| M9: Bot Decision Trees | Complete |
| M10: Emotional States | Complete |
| M11: Mid-Game Systems | Complete |
| M12: LLM Bots | In Progress |

---

## OPEN ITEMS - Three-Tier Redesign Plan

**Last Updated:** January 5, 2026
**Overall Progress:** 88% (Phases 1-4: 98%, Phase 5: 25%)

### Verified Complete

| Feature | Status | Location |
|---------|--------|----------|
| D20 Combat Engine | DONE | `src/lib/combat/volley-combat-v2.ts` |
| 3-Volley System | DONE | `resolveBattle()` function |
| True D20 Mechanics | DONE | `d20 + TAR >= DEF` |
| Critical/Fumble | DONE | Natural 20/1 detection |
| Theater Bonuses | DONE | `src/lib/combat/theater-control.ts` |
| Combat Stances | DONE | `src/lib/combat/stances.ts` |
| Combat Service Integration | DONE | `combat-service.ts:301` uses volley system |
| Sector Terminology | DONE | 32 files rebranded from "planet" |

### Outstanding Items

#### 1. D20 Combat Narrative UI (Priority: HIGH)

**Status:** Engine complete, UI does not surface roll details
**Location:** `src/components/game/combat/BattleReport.tsx`

**Problem:** The D20 engine tracks roll data (`roll`, `modifier`, `total`, `targetDEF`, `critical`, `fumble`) but `convertToLegacyCombatResult()` discards this detail, sending only power numbers to UI.

**Required Work:**
1. Extend `CombatResult` or create `DetailedCombatResult` to include roll data
2. Update `BattleReport.tsx` to show per-volley roll breakdowns
3. Add collapsible "Roll Details" section per volley

**Effort:** 2-3 hours

#### 2. Starmap Bot Personality Tells (Priority: HIGH)

**Status:** Not implemented
**Location:** `src/components/game/starmap/GalaxyView.tsx`, `SectorBox.tsx`

**Problem:** GalaxyView shows intel levels and empire counts, but no visual indicators for military strength %, research doctrine hints, or archetype-based visual tells.

**Required Work:**
1. Add `militaryPercent` and `researchDoctrine` to `EmpireMapData` type
2. Update `SectorBox.tsx` to render visual indicators
3. Gate indicators behind intel level (need moderate+ to see)

**Effort:** 1-2 hours

#### 3. Phase 5 Validation Tasks (Priority: MEDIUM)

**Status:** 25% complete

**Required Work:**
- [ ] Run 50 AI-only games for balance verification
- [ ] Execute E2E tests in CI (all scenarios passing)
- [ ] Performance profiling (turn processing <2s target)
- [ ] Update game manual documentation

**Effort:** 4-6 hours total

### Implementation Priority Order

1. **D20 Combat Narrative** - Users need to see the dice drama
2. **Starmap Bot Tells** - Strategic visibility of opponent types
3. **Phase 5 Validation** - Quality assurance and documentation

---

## License

GPL-2.0 - See [LICENSE.TXT](LICENSE.TXT)

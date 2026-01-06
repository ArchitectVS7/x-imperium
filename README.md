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

### For Players (Alpha Testers)
- **[How to Play Guide](docs/guides/HOW-TO-PLAY.md)** - Comprehensive game manual
- **[Quick Start Guide](docs/guides/QUICK-START.md)** - Get playing in 5 minutes

### For Developers
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

## Human Action Items (Between Claude Sessions)

**Last Updated:** January 6, 2026

These tasks require human judgment, external access, or manual verification:

### Alpha Tester Distribution
- [ ] **Share guides with testers** - Send `docs/guides/HOW-TO-PLAY.md` and `QUICK-START.md`
- [ ] **Set up feedback channel** - Create Discord/Slack channel or GitHub Discussions for tester feedback
- [ ] **Recruit alpha testers** - Identify 5-10 people willing to play and provide feedback

### Content & Screenshots
- [ ] **Capture game screenshots** - Needed for:
  - Landing page carousel (`/public/screenshots/`)
  - How to Play guide illustrations
  - Marketing materials
- [ ] **Record gameplay video** - Short (2-3 min) demo for onboarding

### External Services
- [ ] **Verify Neon DB limits** - Check usage against free tier before inviting testers
- [ ] **Set up error monitoring** - Consider Sentry or similar for production error tracking
- [ ] **Configure analytics** - PostHog/Plausible to understand player behavior

### Pre-Release Checklist
- [ ] **Playtest full game yourself** - Play through Turn 50+ to validate balance
- [ ] **Test on mobile** - Verify responsive design works acceptably
- [ ] **Review bot difficulty** - Are bots too hard/easy for new players?
- [ ] **Update version number** - Bump to v0.7 for alpha release

### Documentation Gaps
- [ ] **Write FAQ** - Collect common questions from early testers
- [ ] **Add visual diagrams** - Combat flow, resource cycle, etc.
- [ ] **Localization planning** - Consider i18n if targeting non-English players

---

## OPEN ITEMS - UI Enhancement Assets

**Last Updated:** January 5, 2026
**Reference:** `docs/frontend/ui-enhancement-plan.md`

The UI enhancement implementation has coding complete for Phases 1-7, but requires asset collection for production use.

### Phase 2: Button Hover/Click Sounds (⚠️ Assets Needed)

**Status:** Code complete, missing audio files
**Files:** Audio manager and LCARSButton component implemented

**Required Assets:**
- [ ] `/public/audio/sfx/click.mp3` - Button click chirp
- [ ] `/public/audio/sfx/hover.mp3` - Subtle hover blip
- [ ] `/public/audio/sfx/success.mp3` - Positive confirmation tone
- [ ] `/public/audio/sfx/error.mp3` - Error/failure sound
- [ ] `/public/audio/sfx/alert.mp3` - Attention notification
- [ ] `/public/audio/sfx/turn-end.mp3` - Turn completion chime
- [ ] `/public/audio/sfx/combat.mp3` - Combat initiated sound
- [ ] `/public/audio/sfx/build.mp3` - Construction queued beep

**Recommended Sources (Free/CC0):**
- [Freesound.org](https://freesound.org) - Search "sci-fi UI", "interface beep"
- [Pixabay SFX](https://pixabay.com/sound-effects/) - "Interface", "Notification"
- [Kenney.nl](https://kenney.nl/assets) - UI Audio pack

**Effort:** 1-2 hours asset collection and testing

### Phase 4: Ambient Starmap Music (❌ Not Started)

**Status:** Not implemented
**Files:** Need to extend `src/lib/audio/audio-manager.ts`

**Required Implementation:**
1. Add ambient track looping system to audio manager
2. Implement fade-in/fade-out crossfade logic
3. Add track controls to starmap page
4. Create user preference persistence (localStorage)

**Required Assets:**
- [ ] `/public/audio/ambient/space-ambient.mp3` - Calm space drone (2-3 min loop)
- [ ] `/public/audio/ambient/tension.mp3` - Combat tension music (2-3 min loop)

**Recommended Sources (Royalty-Free):**
- [Pixabay Music](https://pixabay.com/music/) - Search "space ambient"
- [Free Music Archive](https://freemusicarchive.org/) - CC licensed ambient
- [Incompetech](https://incompetech.com/) - Kevin MacLeod (CC-BY, requires attribution)

**Effort:** 2-3 hours implementation + 1-2 hours asset collection

### Phase 6: NASA Nebula Backgrounds (⚠️ Assets Needed)

**Status:** Code complete, missing image files
**Files:** `src/components/ui/SpaceBackground.tsx` implemented

**Required Assets:**
- [ ] `/public/images/backgrounds/nebula.jpg` - Carina Nebula or similar (JWST)
- [ ] `/public/images/backgrounds/starfield.jpg` - Star field pattern
- [ ] `/public/images/backgrounds/deep-field.jpg` - Hubble/JWST deep field

**Source:** [NASA Image Gallery](https://images.nasa.gov/) (Public Domain)

**Recommended Images:**
- Carina Nebula (JWST) - High resolution, vibrant
- Pillars of Creation (Hubble) - Iconic, atmospheric
- Hubble Deep Field - Abstract, contemplative

**Asset Requirements:**
- Format: JPG optimized for web
- Size: 1920x1080 or larger
- File size: <500KB per image (optimize with tools like Squoosh)
- License: Public Domain (NASA images are copyright-free)

**Effort:** 1 hour asset collection and optimization

### Asset Collection Priority

1. **Phase 6 (NASA Backgrounds)** - Quickest win, high visual impact
2. **Phase 2 (UI Sound Effects)** - Medium effort, enhances interactivity
3. **Phase 4 (Ambient Music)** - Requires implementation work + assets

---

## License

GPL-2.0 - See [LICENSE.TXT](LICENSE.TXT)

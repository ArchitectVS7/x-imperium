# Nexus Dominion: Three-Level Redesign Plan
## From Spreadsheet Mastery to Boardgame Excitement

**Date**: 2026-01-02
**Last Updated**: 2026-01-08
**Goal**: Transform the game across gameplay, UI, and engine architecture to create a dramatic, visible, tunable 4X boardgame experience

---

## IMPLEMENTATION STATUS (Updated 2026-01-08)

### Phase 1: Gameplay Cuts + Rebranding COMPLETE (100%)
- [x] Disable Crafting UI ("Coming in Expansion" modal)
- [x] Disable Syndicate UI (Black Market at Turn 100)
- [x] Implement 3-Tier Research Draft System (schema + service + UI + actions)
- [x] Reduce Sector Types to 7 (4 disabled: industrial, supply, anti-pollution, education)
- [x] Activate Unified Combat (47.6% win rate achieved!)
- [x] Terminology Rebranding (planets to sectors in code and docs)

**Test Results**: 2554/2554 tests passing

### Phase 2: Dramatic Moments MOSTLY COMPLETE (80%)
- [x] Implement 3-Tier Research Draft (Doctrines to Specializations to Capstones)
- [x] Add Event-Driven Crises (EventModal + event-service implemented)
- [~] Bot Personality Visibility (50% - message tone flags YES, starmap tells NO)
- [x] Victory Point Tracker (VictoryTracker component + service implemented)
- [ ] Dramatic Combat Outcomes (BattleReport lacks D20 messaging)

### Phase 3: UI Refactoring - Desktop COMPLETE (100%)
- [x] Make Starmap Default Landing Page
- [x] Implement Slide-Out Panel System (left/right/bottom, variants, footer)
- [x] Create All Panel Content Components (8 panels implemented)
- [x] TurnOrderPanel triggers panels (not page navigation)
- [x] EmpireStatusBar triggers panels
- [x] Keyboard shortcuts (M, S, C, T, R, D, O, I, Esc, Space, ?)
- [x] Panel context system (targetEmpireId for combat/covert)
- [x] Progressive disclosure (features unlock by turn)
- [x] GSAP spring animations with back.out(1.2)
- [x] Backdrop blur on panels

**Panel Components Created** (`src/components/game/panels/`):
- `MilitaryPanelContent.tsx`
- `SectorsPanelContent.tsx`
- `CombatPanelContent.tsx`
- `MarketPanelContent.tsx`
- `ResearchPanelContent.tsx`
- `DiplomacyPanelContent.tsx`
- `CovertPanelContent.tsx`
- `MessagesPanelContent.tsx`
- `ExpansionOptionsPanel.tsx` (bonus)
- `ThreatAssessmentPanel.tsx` (bonus)

### Phase 4: Engine Architecture COMPLETE (100%)
- [x] Extract combat config to JSON (data/combat-config.json + loader)
- [x] Extract unit stats to JSON (data/unit-stats.json + loader)
- [x] Extract bot archetype weights to JSON (data/archetype-configs.json + loader)
- [x] Add gameConfigs schema for per-game overrides (migration 0004)
- [x] Create difficulty presets (data/difficulty-presets.json + loader)

**Files Created**:
- 3 JSON config files (combat, units, archetypes, difficulty)
- 4 loader services with type-safe APIs
- 1 database migration (game_configs table)
- 4 test suites (57+ new tests)

### Phase 5: Polish & Testing PARTIAL (25%)
- [ ] Run 50 AI-only games, measure win rates (target: 40-50%)
- [x] Comprehensive Playwright E2E test created (10 turns, 10 bots)
- [ ] E2E test execution (deferred - server startup issues)
- [ ] Performance testing (100 sectors virtualized, starmap rendering)
- [ ] Update documentation (BALANCE-GUIDE.md, MODDING-GUIDE.md)

### Phase 6: Mobile Panel Unification NOT STARTED (0%)
- [ ] Convert MobileActionSheet from Links to panel triggers
- [ ] Update MobileBottomBar to support panel opening
- [ ] Ensure panels work in mobile viewport (full-screen mode)
- [ ] Test touch interactions with slide-out panels
- [ ] Keyboard shortcuts awareness (show in help, not rely on)

**Current Mobile State**: MobileActionSheet uses `<Link href="/game/military">` etc., navigating away from starmap. Desktop is panel-centric, mobile is page-centric.

**Overall Progress**: Phases 1-4: 98% | Phase 5: 25% | Phase 6: 0% | **Total: 80%**

---

## Key Metrics

- **Test Coverage**: 2590+ tests passing (93+ test files)
- **Combat Balance**: 47.6% attacker win rate (target: 40-50%)
- **Documentation**: PRD v3.0, Vision v2.0 updated
- **Code Quality**: TypeScript strict mode, no type errors
- **Config System**: 4 JSON configs, 4 loaders, game override system
- **Difficulty System**: 4 presets (easy/normal/hard/nightmare)
- **Panel System**: 10 panel content components, all integrated

---

## Known Issues

1. **Bot Personality Visibility**: Starmap lacks tell indicators (military %, research doctrine)
2. **Dramatic Combat**: BattleReport needs D20-style narrative (NATURAL 20, etc.)
3. **Mobile Navigation**: Still uses page links instead of panels
4. **Dual Research Systems**: Old 8-level preserved in research-service.ts (archived to docs/expansion/legacy-systems/)

---

## Multi-Tier Review Strategy

### Tier 1: Code Review (Automated + Manual)
**Automated Checks** (runs on every commit):
- TypeScript compilation (`npm run typecheck`)
- Linting (`npm run lint`)
- Unit tests (2554 tests, 80% coverage threshold)
- E2E smoke tests (critical paths)

**Manual Code Review** (before phase completion):
- Architecture patterns (services pure, actions validated)
- Security (input validation, SQL injection prevention)
- Performance (no N+1 queries, efficient algorithms)
- Test coverage (new code has tests)

### Tier 2: PRD Review (Documentation Compliance)
**Pre-Implementation**:
- Does implementation match PRD specification?
- Are new features documented in PRD?
- Is terminology consistent (sectors not planets)?

**Post-Implementation**:
- Update PRD with actual implementation details
- Document deviations and rationale
- Update examples and code snippets

### Tier 3: Testing Review (Quality Assurance)
**Unit Testing**:
- Services have 80%+ coverage
- Formulas have 100% coverage (pure functions)
- Edge cases tested (empty lists, null values, boundaries)

**Integration Testing**:
- Turn processing end-to-end
- Combat resolution with various force compositions
- Bot decision-making across archetypes

**E2E Testing** (Playwright):
- 10-turn game completes successfully
- UI interactions work (colonize sector, attack, research)
- No console errors during gameplay
- Performance benchmarks met (<2s turn time)

---

## IMPORTANT: Terminology Rebranding

As part of this redesign, we're **creatively distancing from Solar Realms Elite** by fixing obvious name clones identified in the legacy assessment:

### Core Rebrandings (IMPLEMENTED)

| Old (SRE Clone) | New (Nexus Dominion) | Rationale |
|-----------------|----------------------|-----------|
| **Planets** | **Sectors** | Narratively makes sense: you control sectors of space (multiple planets/stations/resources) |
| "Buy Planet" | "Colonize Sector" or "Terraform Sector" | You don't buy planets, you colonize/terraform/alliance |
| "Planet Types" | "Sector Types" | Food Sector, Industrial Sector, Research Sector |
| "Planet Count" | "Territory Control" | More strategic, less literal |

### Code Naming Conventions

| Area | Convention | Example |
|------|------------|---------|
| Panel components | `*PanelContent.tsx` | `MilitaryPanelContent.tsx` |
| Sector components | `Sector*.tsx` | `SectorsList.tsx`, `SectorCard.tsx` |
| Hooks | `use*.ts` | `useGameKeyboardShortcuts.ts` |

**VIOLATIONS**: Any documentation or code that uses "planet" terminology represents a **critical branding failure** and must be fixed immediately.

---

## Executive Summary

After comprehensive exploration, the core problem is clear: **Nexus Dominion has excellent infrastructure (100 bot personas, complete 4X mechanics, sophisticated architecture) but suffered from algorithmic gameplay, UI overwhelm, and hardcoded tuning parameters**. This three-level plan addressed these issues.

### What We Built

**LEVEL 1: GAMEPLAY** - Cut complexity 50%, added dramatic moments, made bot variety visible
**LEVEL 2: UI** - Star map centerpiece (80% screen), integrated panel management, keyboard shortcuts
**LEVEL 3: ENGINE** - Data-driven configs for balance iteration without code changes

---

## Current State Assessment

### What's Already Built

**Unified Combat System** - COMPLETE (`src/lib/combat/unified-combat.ts`, 655 lines)
- Single D20 roll with 5-95% win chances
- 47.6% attacker win rate achieved (target: 40-50%)
- Underdog bonuses, networth-based scaling
- Narrative phases (space/orbital/ground) for flavor only
- Simulation function for validation

**Research Redesign** - COMPLETE
- 3-tier draft system (Doctrines to Specializations to Capstone)
- War Machine (+15% attack), Fortress (+25% defense), Commerce (+20% market)
- Rock-paper-scissors counters (Shock Troops vs Shield Arrays)
- Public announcements ("Varkus adopted WAR MACHINE")

**Bot Personas** - DATA-DRIVEN (`data/personas.json`)
- 100 unique personas, 8 archetypes, 4 tiers
- Voice characteristics, emotional states, memory system
- Gold standard for data-driven design

**Starmap-Centric UI (Desktop)** - COMPLETE
- SlideOutPanel with side, width, variant, footer props
- All 8 panel content components
- TurnOrderPanel uses panel triggers
- Keyboard shortcuts fully implemented
- PanelContext for target passing
- Progressive disclosure system

**Configuration System** - COMPLETE
- Combat config (JSON + loader)
- Unit stats (JSON + loader)
- Bot archetypes (JSON + loader)
- Difficulty presets (JSON + loader)
- Per-game override schema

### What Needs Work

**Bot Personality Visibility** - Starmap lacks visual tells (military %, doctrine badges)
**Dramatic Combat Messages** - BattleReport needs D20-style narrative
**Mobile Panel System** - MobileActionSheet still uses page links
**E2E Test Execution** - Server startup issues preventing runs
**Documentation** - Balance guide and modding guide need updates

---

## LEVEL 1: GAMEPLAY REDESIGN

**Philosophy Shift**: FROM "Master the formulas" TO "React to dramatic events, make tough tradeoffs"

### A. What Was Cut (50% Complexity Reduction)

#### 1. Disabled Crafting UI (Schema Kept for DLC) DONE
4-tier resource progression (Ore to Refined Metals to Advanced Components to Military Systems) adds cognitive overhead without creating dramatic moments. Players want to build armies, not manage supply chains.

#### 2. Disabled Syndicate UI (Simplified to Black Market Shop) DONE
8-level trust system with 15 contract types is a parallel game track that competes with core empire management. Unlock at Turn 100 (late-game power spike).

#### 3. Implemented 3-Tier Draft Research System DONE
**Spec Reference**: `docs/redesign-01-02-2026/RESEARCH-REDESIGN.md`

```typescript
// Tier 1 (Turn ~10): Draft 1 of 3 Doctrines
type Doctrine = "war_machine" | "fortress" | "commerce";

// War Machine: +15% attack, unlocks Heavy Cruisers
// Fortress: +25% defense, unlocks Defense Platforms
// Commerce: +20% market prices, +10% sector costs

// Tier 2 (Turn ~30): Draft 1 of 2 Specializations per Doctrine
type Specialization =
  | "shock_troops" | "siege_engines"      // War Machine
  | "shield_arrays" | "minefield_networks" // Fortress
  | "trade_routes" | "economic_sanctions" // Commerce

// Tier 3 (Turn ~60): Automatic Capstone (no choice)
```

**Public Announcements**:
```
[GALACTIC INTEL] Emperor Varkus adopted WAR MACHINE doctrine.
                 Their military grows more dangerous.
```

**Bot Integration**: Warlords prefer War Machine (70%), Diplomats prefer Fortress (60%), Merchants prefer Commerce (80%)

#### 4. Reduced Sector Types from 11 to 7 DONE
**Keep**: Provisions (food), Mining (ore), Energy (petroleum), Commerce (tourism), Urban (population), Government (covert), Research (tech)

**Rationale**: Removes micromanagement (balancing pollution) while preserving strategic diversity.

#### 5. Activated Unified Combat DONE
Switched from 3-phase to unified resolution. 47.6% attacker win rate achieved.

### B. What Was Added (Dramatic Tension/Release)

#### 1. Event-Driven Crises (Every 10-15 Turns) DONE
**Files**: `src/lib/game/services/event-service.ts`, `src/components/game/events/EventModal.tsx`

```typescript
type GameEvent = {
  id: string;
  turn: number;
  type: "pirate_armada" | "market_crash" | "border_dispute" | "coalition_forming";
  title: string;
  description: string;
  choices: EventChoice[];
};
```

**Bot Responses**: Warlords NEVER pay tribute, Diplomats ALWAYS negotiate, Merchants calculate cost/benefit

#### 2. Bot Personality Visibility System PARTIAL
**Done**: Message tone flags ([Aggressive] [Friendly] [Cryptic])
**Remaining**: Visual tells on starmap (military %, doctrine badges)

#### 3. Victory Point Race Visualization DONE
**Files**: `src/components/game/victory/VictoryTracker.tsx`, `src/lib/game/services/victory-service.ts`

**Auto-Coalition**: When any empire reaches 7+ VP, all others get +10% combat vs leader

#### 4. Dramatic Combat Outcomes REMAINING
BattleReport needs D20-style narrative:
```typescript
function getCombatOutcomeMessage(roll: number, result: CombatResult): string {
  if (roll >= 18) {
    return `NATURAL 20 - TOTAL VICTORY
Your fleet caught the defender off-guard! Captured ${result.sectorsCaptured} sectors (40%)
with only 10% casualties. The galaxy trembles.`;
  }
  if (roll <= 2) {
    return `NATURAL 1 - CATASTROPHIC FAILURE
Your fleet walked into a minefield! 60% casualties before firing a shot.
Your generals question your leadership.`;
  }
  // ... normal outcomes
}
```

---

## LEVEL 2: UI/PRESENTATION REDESIGN

**Goal**: Star map as centerpiece (80% screen), integrated management, no scrolling hell

### A. Star Map as Primary View DONE

**Layout**:
```
+--------------------------------------------------------+
| NEXUS DOMINION  Turn 47  [?] [=] [gear]                | <- 60px header
+--------------------------------------------------------+
|                                            | Turn Order|
|                                            | Panel     |
|          STAR MAP (80%)                    | (200px)   |
|    [Interactive galaxy visualization]     |           |
|    - Clickable empires                     | [Moves]   |
|    - Hover tooltips                        | Forces    |
|    - Threat indicators                     | Sectors   |
|    - Doctrine badges                       | Combat    |
|                                            | [Status]  |
|                                            | VP Rank   |
+--------------------------------------------+-----------+
| Credits: 125K  Food: 8K  Ore: 12K  [END TURN]         | <- Sticky footer
+--------------------------------------------------------+
```

### B. Slide-Out Panel System DONE

**File**: `src/components/game/SlideOutPanel.tsx`

**Features Implemented**:
- `side?: "left" | "right"` - Support both sides
- `footer?: React.ReactNode` - Fixed action buttons at bottom
- `width: "sm" | "md" | "lg" | "xl"` - Multiple sizes (up to 640px)
- `variant?: "default" | "combat" | "urgent"` - Color themes
- `headerActions?: React.ReactNode` - Custom header buttons
- `loading?: boolean` - Skeleton state
- GSAP spring animation with `back.out(1.2)`
- Backdrop blur
- Focus trap and accessibility

### C. Panel Content Components DONE

All 8 core panels implemented in `src/components/game/panels/`:

| File | Content From | Status |
|------|-------------|--------|
| `MilitaryPanelContent.tsx` | `/game/military/page.tsx` | DONE |
| `SectorsPanelContent.tsx` | `/game/sectors/page.tsx` | DONE |
| `CombatPanelContent.tsx` | `/game/combat/page.tsx` | DONE |
| `MarketPanelContent.tsx` | `/game/market/page.tsx` | DONE |
| `ResearchPanelContent.tsx` | `/game/research/page.tsx` | DONE |
| `DiplomacyPanelContent.tsx` | `/game/diplomacy/page.tsx` | DONE |
| `CovertPanelContent.tsx` | `/game/covert/page.tsx` | DONE |
| `MessagesPanelContent.tsx` | `/game/messages/page.tsx` | DONE |

### D. TurnOrderPanel Panel Triggers DONE

**File**: `src/components/game/TurnOrderPanel.tsx`

When `onOpenPanel` prop is provided, uses buttons that call `onOpenPanel(panelType)` instead of Links to pages. Starmap items without panels (like Starmap itself) still use Links.

### E. Keyboard Shortcuts DONE

**File**: `src/hooks/useGameKeyboardShortcuts.ts`

| Key | Action |
|-----|--------|
| `M` | Open military panel |
| `S` | Open sectors panel |
| `C` | Open combat panel |
| `T` | Open market/trade panel |
| `R` | Open research panel |
| `D` | Open diplomacy panel |
| `O` | Open covert ops panel |
| `I` | Open messages/inbox panel |
| `Escape` | Close current panel |
| `Space` | End turn (when no panel open) |
| `?` | Open quick reference modal |

### F. GameShell Integration DONE

**File**: `src/components/game/GameShell.tsx` (619 lines)

The GameShell has grown in size but provides comprehensive functionality:
- SSE real-time updates
- Progressive disclosure system (features unlock by turn)
- Panel context provider (targetEmpireId for combat/covert)
- Toast notifications
- Defeat analysis modal
- Welcome modal for turn 1
- Tutorial integration
- All 10 slide-out panel instances

**Note**: The original "refactor to 150 lines" goal is obsolete. The file is larger because it has more features and is well-structured.

### G. Mobile Strategy REMAINING (Phase 6)

**Current State**: Desktop uses panel-centric navigation, mobile uses page-centric navigation.

**Files Needing Work**:
- `src/components/game/MobileActionSheet.tsx` - Change Links to panel triggers
- `src/components/game/MobileBottomBar.tsx` - Add panel support

**Goal**: Mobile users should also stay on starmap and use panels.

---

## LEVEL 3: ENGINE/ARCHITECTURE REDESIGN

**Goal**: Data-driven tunability for balance iteration without code changes

### A. Combat Configuration DONE

**Files**: `data/combat-config.json`, `src/lib/game/config/combat-loader.ts`

```json
{
  "version": "1.0",
  "powerMultipliers": {
    "soldiers": 1,
    "fighters": 1,
    "stations": 50,
    "lightCruisers": 4,
    "heavyCruisers": 4,
    "carriers": 12
  },
  "combatBonuses": {
    "diversityThreshold": 4,
    "diversityBonus": 1.15,
    "defenderAdvantage": 1.2
  },
  "casualtyRates": {
    "baseRate": 0.25,
    "winnerMultiplier": 0.5,
    "loserMultiplier": 1.5
  }
}
```

### B. Unit Stats Configuration DONE

**Files**: `data/unit-stats.json`, `src/lib/game/config/unit-loader.ts`

### C. Bot Archetype Weights DONE

**Files**: `data/archetype-configs.json`, `src/lib/bots/config/archetype-loader.ts`

### D. Schema Changes DONE

**Table**: `gameConfigs` (optional per-game overrides)

**Use Case**: Easy difficulty loads game with `combatConfig: { defenderAdvantage: 1.1, attackerBonus: 1.5 }`

### E. Difficulty Presets DONE

**File**: `data/difficulty-presets.json`

4 presets: easy, normal, hard, nightmare

---

## IMPLEMENTATION PHASES

### Phase 1: Gameplay Cuts + Rebranding COMPLETE
**Goal**: Reduce complexity 50%, rebrand away from SRE clones
**Duration**: Complete

### Phase 2: Dramatic Moments MOSTLY COMPLETE (80%)
**Goal**: Add tension/release to gameplay
**Remaining**: Bot starmap tells, D20 combat messages

### Phase 3: UI Refactoring - Desktop COMPLETE
**Goal**: Star map centerpiece, integrated panel management
**All items complete**

### Phase 4: Engine Refactoring COMPLETE
**Goal**: Data-driven tunability
**All items complete**

### Phase 5: Polish & Testing IN PROGRESS (25%)
**Goal**: Validate redesign works

**Tasks**:
1. [ ] Run 50 AI-only games with new combat, measure win rates (target: 40-50% attacker)
2. [x] Comprehensive Playwright E2E test created
3. [ ] E2E test execution (server startup issues)
4. [ ] Performance testing (100 sectors virtualized, 100 empires starmap rendering)
5. [ ] Update documentation (PRD.md, BALANCE-GUIDE.md, MODDING-GUIDE.md)

### Phase 6: Mobile Panel Unification NOT STARTED
**Goal**: Unify mobile and desktop navigation

**Tasks**:
1. [ ] Convert MobileActionSheet Links to panel triggers
2. [ ] Update MobileBottomBar to support panel mode
3. [ ] Ensure panels render correctly in mobile viewport (full-screen)
4. [ ] Add touch gesture support for panel dismissal
5. [ ] Test all panel workflows on mobile devices
6. [ ] Update help/tutorial to not assume keyboard shortcuts on mobile

**Files to Modify**:
- `src/components/game/MobileActionSheet.tsx`
- `src/components/game/MobileBottomBar.tsx`
- `src/components/game/SlideOutPanel.tsx` (mobile viewport handling)

---

## SUCCESS CRITERIA

### After Phase 1-2 (Gameplay + Rebranding):
- [x] Research: 3 meaningful choices vs 8 passive waits
- [x] Combat: 40-50% attacker win rate (vs 1.2%)
- [x] Events: 1 crisis every 10-15 cycles
- [~] Bots: Personalities visible (tells on starmap pending)
- [x] **Branding**: "Colonize sectors", terminology updated

### After Phase 3 (UI - Desktop):
- [x] Star map: Default view, 80% of screen
- [x] Sectors: Manage via panel without page navigation
- [x] TurnOrderPanel: Triggers panels, not page links
- [x] Keyboard shortcuts: Full implementation (M, S, C, T, R, D, O, I, Esc, Space, ?)
- [x] Panels: Spring animations, backdrop blur, focus trap

### After Phase 4 (Engine):
- [x] Combat: Tunable via JSON (no code changes)
- [x] Units: Add new unit type via JSON only
- [x] Bots: Create new archetype via JSON only
- [x] Difficulty: 4 presets (easy/normal/hard/nightmare)

### After Phase 5 (Polish):
- [ ] Balance: 50 AI games confirm 40-50% win rate
- [ ] Playtest: 80% say "boardgame feel" vs "spreadsheet"
- [ ] Performance: END TURN <2sec with 100 empires
- [ ] Documentation: Updated PRD, balance guide, modding guide

### After Phase 6 (Mobile):
- [ ] Mobile navigation: Uses panels, not page links
- [ ] Starmap: Remains visible behind mobile panels
- [ ] Touch: Swipe-to-dismiss panels works
- [ ] Help: Mobile-appropriate instructions (no keyboard shortcuts)

---

## RISK ASSESSMENT

### What We Gave Up

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Removing Crafting** | Economic depth | DLC path preserves, simplifies v1.0 |
| **Removing Syndicate** | Comeback mechanic | Events provide forced choices |
| **3-phase to Unified Combat** | Tactical phases | Gain speed + drama, preserve via research specs |
| **Starmap-centric UI** | Mobile cramped | Phase 6 addresses with full-screen panels |

### Validation

**Automated Tests**:
```typescript
// Combat balance
it("attacker wins 40-50% with equal forces", async () => {
  const results = await simulateBattles(equalForces, equalForces, 1000);
  expect(results.attackerWinRate).toBeGreaterThan(0.40);
  expect(results.attackerWinRate).toBeLessThan(0.50);
});

// Config loading
it("loads combat config from JSON", async () => {
  const config = getCombatConfig();
  expect(config.powerMultipliers.soldiers).toBe(1);
});
```

**Manual Validation**:
- Complexity: Time to first decision (target: <2 min)
- Drama: "Did any turn feel memorable?" (target: 80% yes)
- Visibility: "Can you tell bots apart?" (target: 70% yes)
- Performance: END TURN <2sec with 100 empires

---

## CRITICAL FILES

### Gameplay Redesign
- `src/lib/game/services/research-service.ts` - 3-tier draft
- `src/lib/combat/unified-combat.ts` - D20 combat
- `src/lib/game/services/event-service.ts` - Forced-choice events
- `src/lib/db/schema.ts` - Schema migrations

### UI Refactoring
- `src/components/game/GameShell.tsx` - Main layout + panel integration
- `src/components/game/starmap/GalaxyView.tsx` - Default view
- `src/components/game/panels/*.tsx` - All panel content components
- `src/components/game/SlideOutPanel.tsx` - Panel container
- `src/components/game/TurnOrderPanel.tsx` - Panel triggers
- `src/hooks/useGameKeyboardShortcuts.ts` - Shortcuts

### Engine Refactoring
- `data/combat-config.json` - Combat parameters
- `data/unit-stats.json` - Unit definitions
- `data/archetype-configs.json` - Bot weights
- `data/difficulty-presets.json` - Difficulty variants
- `src/lib/game/config/*.ts` - Loaders

### Mobile (Phase 6)
- `src/components/game/MobileActionSheet.tsx` - Needs panel triggers
- `src/components/game/MobileBottomBar.tsx` - Needs panel support

---

## FINAL RECOMMENDATION

**This is the right path forward.** The game has excellent infrastructure that shouldn't be thrown away. The unified combat is complete. The research redesign is complete. The desktop UI is fully panel-centric.

**Remaining work**:
1. Complete Phase 2 (bot tells, D20 messages)
2. Complete Phase 5 (testing, documentation)
3. Complete Phase 6 (mobile unification)

The result: **Twilight Imperium meets FTL** - strategic choices, dramatic moments, visible bot personalities, tunable balance, and a galaxy-centric UI that makes 100 empires feel manageable.

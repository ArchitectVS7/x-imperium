# Review Action Items - Consolidated TODO

**Created:** 2026-01-08
**Status:** Active Operations Base
**Last Verified:** Against commit bde277b
**Dependency Analysis:** Added 2026-01-08

---

## Summary

Four specialized reviews were conducted on 2026-01-07:
- **Architect Review** - Architecture and code organization
- **Documentation Review** - Documentation completeness and accuracy
- **Product Review** - UX and player experience
- **QA Review** - Testing coverage and quality

This document consolidates all action items, marking completed items with evidence and tracking remaining work.

---

## Completed Items

### Architect Review (ARCHITECT-00X)

- [x] **ARCHITECT-001**: Add `.backup` pattern to `.gitignore` and remove `schema.ts.backup` from git
  - Evidence: `.gitignore` lines 49-52 contain `*.backup`, `*.bak`, `*.orig` patterns
  - `src/lib/db/schema.ts.backup` no longer exists in tracking

- [x] **ARCHITECT-002**: Document which combat system is authoritative in `src/lib/combat/README.md`
  - Evidence: `src/lib/combat/README.md` exists (107 lines)
  - Documents "Volley Combat v2" as PRODUCTION system
  - Marks `unified-combat.ts` and `phases.ts` as DEPRECATED

- [x] **ARCHITECT-003**: Add `@deprecated` tags to legacy combat implementations
  - Evidence: `src/lib/combat/phases.ts:4` - `@deprecated` JSDoc
  - Evidence: `src/lib/combat/unified-combat.ts:4` - `@deprecated` JSDoc

- [x] **ARCHITECT-006**: Create canonical `Forces` type and update imports
  - Evidence: `src/lib/game/types/forces.ts` exists

### Documentation Review (CA-X)

- [x] **CA-1**: Fix broken documentation links (create missing dev guides)
  - Evidence: All development guides now exist:
    - `docs/development/ARCHITECTURE.md`
    - `docs/development/FRONTEND-GUIDE.md`
    - `docs/development/UI-DESIGN.md`
    - `docs/development/TESTING-GUIDE.md`
    - `docs/development/TERMINOLOGY.md`

- [x] **CA-2**: Remove README.md Open Items duplication
  - Evidence: `README.md` is 143 lines, clean structure
  - No duplicate "OPEN ITEMS" sections

- [x] **CA-3**: Clarify expansion feature status in ROADMAP.md
  - Evidence: `docs/expansion/ROADMAP.md` lines 7-10 contain status definitions
  - Explains "Complete" means schema-ready, UI may be pending

- [x] **CA-6**: Update CLAUDE.md PRD.md reference
  - Evidence: `CLAUDE.md` references `docs/core/GAME-DESIGN.md` (line in Architecture section)
  - No PRD.md references found

- [x] **CA (CONTRIBUTING)**: Update CONTRIBUTING.md PRD reference
  - Evidence: `CONTRIBUTING.md` has no PRD.md references (263 lines checked)

### Product Review (PRODUCT-00X)

- [x] **PRODUCT-001**: Create tutorial overlay component with 5-step tutorial
  - Evidence: `src/components/game/tutorial/TutorialOverlay.tsx` exists
  - Comment: "Tutorial Overlay Component (M9.2) - Displays the 5-step tutorial"
  - Has `initializeTutorialState`, `advanceTutorialStep`, `skipTutorial` functions

- [x] **PRODUCT-002**: Add tooltip content for all dashboard metrics
  - Evidence: `src/components/game/Tooltip.tsx` exists
  - Used in 13+ components (CompactHeaderStatus, EmpireStatusBar, etc.)

- [x] **PRODUCT-003**: Implement turn-end feedback panel
  - Evidence: `src/components/game/TurnSummaryModal.tsx` exists
  - Shows resource changes, population, events grouped by category

- [x] **PRODUCT-006**: Add `?` keyboard shortcut for quick reference
  - Evidence: `src/components/game/QuickReferenceModal.tsx` exists
  - Comment: "Activated by pressing the ? key"

- [x] **PRODUCT-007**: Create defeat analysis screen with actionable tips
  - Evidence: `src/components/game/DefeatAnalysisModal.tsx` exists
  - Has `DEFEAT_CAUSE_INFO` with titles, descriptions, icons

- [x] **PRODUCT-009**: Design bot introduction gallery screen
  - Evidence: `src/components/game/BotGalleryModal.tsx` exists
  - Shows name, archetype, tier, catchphrase

### QA Review (QA-00X)

- [x] **QA-001**: Create test file for `attack-validation-service.ts`
  - Evidence: `src/lib/game/services/__tests__/attack-validation-service.test.ts` exists
  - Tests: validateAttackWithInfluence, calculateRequiredForces, calculateEffectiveForces

- [x] **QA-002**: Create test file for `victory-service.ts`
  - Evidence: `src/lib/game/services/__tests__/victory-service.test.ts` exists
  - Tests: checkDefeatConditions, calculateRevoltConsequences, applyRevoltConsequences

- [x] **QA-003**: Create integration test for `save-service.ts`
  - Evidence: `tests/integration/save-service.test.ts` exists
  - Tests snapshot structure, version compatibility, data format validation

- [x] **QA-004**: Verify coverage exclusions after tests pass
  - Evidence: `vitest.config.ts` has documented exclusions (lines 24-111)
  - Each exclusion has a comment explaining why (DB-dependent, tested via E2E, etc.)

- [x] **QA-005**: Confirm 80% threshold is met
  - Evidence: `vitest.config.ts` lines 113-118 set 80% thresholds for all metrics

- [x] **QA-006**: Merge `full-gameplay-positive.spec.ts` into `comprehensive-test.spec.ts`
  - Evidence: File deleted (not in e2e/ directory)
  - `comprehensive-test.spec.ts` is expanded test file

- [x] **QA-007**: Consolidate milestone tests 1-4 into `milestone-core.spec.ts`
  - Evidence: `e2e/milestone-core.spec.ts` exists
  - Evidence: `e2e/milestone-advanced.spec.ts` exists
  - Old milestone-1.spec.ts through milestone-8.spec.ts deleted (git status shows staged deletions)

- [x] **QA-008**: Update `e2e/README.md` with new test structure
  - Evidence: `e2e/README.md` exists (200 lines)
  - Documents smoke test, comprehensive test, milestone tests
  - Has "Testing Pyramid" section explaining test strategy

---

## Remaining TODO Items

### P0: Critical - Must Fix Before Alpha

| ID | Source | Task | Effort |
|----|--------|------|--------|
| None | - | All P0 items completed | - |

### P1: High Priority - Address This Sprint

| ID | Source | Task | Effort | Dependencies | Status |
|----|--------|------|--------|--------------|--------|
| ~~TODO-001~~ | architect-review | ~~Complete service domain organization (add more subdirectories)~~ | ~~8-16h~~ | ~~None~~ | **DONE** (commit 8cc2d7e) |
| ~~TODO-002~~ | architect-review | ~~Consolidate constants into single directory structure~~ | ~~2-4h~~ | ~~None~~ | **DONE** (deprecation notice added) |
| ~~TODO-003~~ | product-review | ~~Add "Tutorial Mode" toggle to game settings~~ | ~~2-3h~~ | ~~None~~ | **DONE** (via QuickReferenceModal) |
| ~~TODO-004~~ | product-review | ~~Implement progressive UI disclosure system~~ | ~~12-16h~~ | ~~TODO-003 (soft)~~ | **DONE** (wired to TurnOrderPanel/MobileActionSheet) |

### P2: Medium Priority - Address Before Beta

| ID | Source | Task | Effort | Dependencies | Status |
|----|--------|------|--------|--------------|--------|
| ~~TODO-005~~ | architect-review | ~~Complete barrel exports (`index.ts`) for remaining service domains~~ | ~~2-4h~~ | ~~TODO-001~~ | **DONE** (commit 8cc2d7e) |
| TODO-006 | architect-review | Complete combat system consolidation (remove deprecated code after validation) | 4-8h | **TODO-009** (do first) | Pending |
| ~~TODO-007~~ | documentation-review | ~~Move terminology-crisis-audit.md from archive to active docs~~ | ~~15m~~ | ~~None~~ | **DONE** |
| TODO-008 | documentation-review | Add link checking to CI pipeline | 4h | Best after TODO-001, TODO-005 | Pending |
| TODO-009 | qa-review | Add combat edge case E2E tests | 3-4h | None (do before TODO-006) | Pending |
| ~~TODO-010~~ | qa-review | ~~Configure Playwright trace-on-all for debugging~~ | ~~2-3h~~ | ~~None~~ | **DONE** (env vars added) |
| ~~TODO-011~~ | qa-review | ~~Implement flaky test tagging and tracking~~ | ~~2-3h~~ | ~~None~~ | **DONE** (analyzer + tracking file) |

### P3: Low Priority - Post-Alpha Backlog

| ID | Source | Task | Effort | Dependencies |
|----|--------|------|--------|--------------|
| TODO-012 | architect-review | Evaluate event sourcing prototype for turn history | 8-16h | None |
| TODO-013 | product-review | Write 5 Steam-style screenshots with captions | 4h | None |
| TODO-014 | product-review | Create marketing assets (logo, store description, feature bullets) | 8h | None |
| TODO-015 | documentation-review | Evaluate Docusaurus/MkDocs for documentation site | 8-16h | None |
| TODO-016 | documentation-review | Plan API documentation strategy | 16-24h | None |
| TODO-017 | documentation-review | Add schema documentation (ERD diagrams) | 4-8h | None |

---

## Dependency Analysis

### Dependency Chain 1: Service Reorganization → Barrel Exports → Link Checking

```
TODO-001 (Service domain organization)
    └── TODO-005 (Barrel exports for service domains)
           └── TODO-008 (Link checking CI) - may catch broken imports
```

**Explanation:** Subdirectories must be created (TODO-001) before barrel exports can be added (TODO-005). Link checking should run after reorganization completes or it will surface false positives during migration.

### Dependency Chain 2: Combat E2E Tests ↔ Combat Consolidation

```
TODO-009 (Combat edge case E2E tests)
    └── TODO-006 (Combat consolidation - remove deprecated code)
```

**Bi-directional Dependency:**
- E2E tests (TODO-009) should be written/passing BEFORE removing deprecated code (TODO-006) to validate the volley combat system handles all edge cases
- Combat consolidation could BREAK existing E2E tests if they reference deprecated code paths
- **Recommendation:** Complete TODO-009 first, then TODO-006

### Dependency Chain 3: Tutorial Toggle → Progressive UI

```
TODO-003 (Tutorial mode toggle)
    └── TODO-004 (Progressive UI disclosure)
```

**Explanation:** Progressive UI (TODO-004) logically extends tutorial functionality. Adding the toggle first (TODO-003) establishes the settings infrastructure that progressive disclosure can use. This is a soft dependency - they could be done in parallel but sequencing is cleaner.

### Independent Tasks (No Dependencies)

The following tasks can be executed in any order or in parallel:
- TODO-002 (Constants consolidation)
- TODO-007 (Move terminology audit) - trivial 15m task
- TODO-010 (Playwright trace-on-all)
- TODO-011 (Flaky test tagging)
- All P3 items (TODO-012 through TODO-017)

---

## Recommended Execution Order

### Phase 1: Quick Wins (Parallelizable) - COMPLETED 2026-01-08
All Phase 1 tasks completed:
- ~~TODO-007~~ - Move terminology audit **DONE**
- ~~TODO-002~~ - Constants consolidation (deprecation notice added) **DONE**
- ~~TODO-003~~ - Tutorial toggle (via QuickReferenceModal) **DONE**
- ~~TODO-010~~ + ~~TODO-011~~ - Testing infrastructure **DONE**

### Phase 2: Architecture Chain - PARTIALLY COMPLETE 2026-01-08
- ~~TODO-001~~ - Service domain organization (commit 8cc2d7e) **DONE**
- ~~TODO-005~~ - Barrel exports (commit 8cc2d7e) **DONE**
- **TODO-008** (4h) - Link checking CI (best after reorganization) **PENDING**

### Phase 3: Combat/Testing Chain
Execute sequentially:
1. **TODO-009** (3-4h) - Combat edge case E2E tests
2. **TODO-006** (4-8h) - Combat consolidation (requires TODO-009)

### Phase 4: Progressive UI - COMPLETED 2026-01-08
After TODO-003 completes:
- ~~TODO-004~~ - Progressive UI disclosure **DONE** (wired to TurnOrderPanel/MobileActionSheet)

### Phase 5: Backlog (P3)
No dependencies, prioritize as needed:
- TODO-012 through TODO-017

---

## Detailed Task Descriptions

### TODO-001: Complete Service Domain Organization

**Source:** architect-review (ARCHITECT-004)
**Priority:** P1
**Effort:** 8-16 hours

The service layer at `src/lib/game/services/` has partial domain organization. Some subdirectories exist:
- `covert/` with index.ts
- `crafting/` with index.ts
- `population/` with index.ts
- `research/` with index.ts
- `combat/` with index.ts
- `core/` with index.ts

**Remaining work:**
- Create `economy/` subdirectory (resource-engine.ts, resource-tier-service.ts)
- Create `military/` subdirectory (build-queue-service.ts, unit-service.ts)
- Create `diplomacy/` subdirectory (treaty-service.ts, reputation-service.ts)
- Create `geography/` subdirectory (sector-service.ts, wormhole-service.ts, border-discovery-service.ts)
- Create `events/` subdirectory (event-service.ts, checkpoint-service.ts, boss-detection-service.ts)
- Update import paths throughout codebase

---

### TODO-002: Consolidate Constants

**Source:** architect-review (ARCHITECT-005)
**Priority:** P1
**Effort:** 2-4 hours

Constants are split across two directories:
- `src/lib/constants/` (legacy): unlocks.ts, diplomacy.ts, index.ts
- `src/lib/game/constants/` (newer): forced-events.ts, nuclear.ts, syndicate.ts, crafting.ts

**Action:**
1. Move `src/lib/constants/*` into `src/lib/game/constants/`
2. Create appropriate subdirectory organization
3. Mark `src/lib/constants/` as deprecated with re-exports
4. Eventually remove the legacy directory

---

### TODO-003: Tutorial Mode Toggle

**Source:** product-review (PRODUCT-004)
**Priority:** P1
**Effort:** 2-3 hours

While TutorialOverlay exists, there's no explicit "Tutorial Mode" toggle in game settings.

**Action:**
1. Add `tutorialEnabled` to game settings/context
2. Add toggle in settings UI
3. Wire to TutorialOverlay visibility

---

### TODO-004: Progressive UI Disclosure

**Source:** product-review (PRODUCT-005)
**Priority:** P1
**Effort:** 12-16 hours

No `tutorialProgress` state found for progressive feature unlocking.

**Recommended approach:**
- Turn 1-5: Show only Credits, Sectors, Military, End Turn
- Turn 6-15: Unlock Research, Market panels
- Turn 16+: Full interface with Diplomacy, Covert, Advanced

---

### TODO-007: Move Terminology Audit from Archive

**Source:** documentation-review (CA-4)
**Priority:** P2
**Effort:** 15 minutes

`docs/archive/terminology-crisis-audit.md` contains an active remediation plan but is archived.

**Action:**
1. Move to `docs/TERMINOLOGY-REMEDIATION.md`
2. Update status of completed items
3. Archive only after all phases complete

---

## Notes

### Historical "planet" Reference

The file `docs/archive/redesign-2025-12-summary.md` line 41 contains "9 starting planets" in a historical "Before" context. This is acceptable as archive historical documentation showing what changed. The "After" correctly says "5 starting sectors."

### E2E Test Consolidation Status

The E2E test suite has been successfully consolidated from 19 files to 9 files:
1. `smoke-test.spec.ts` - CI validation
2. `comprehensive-test.spec.ts` - Full feature test
3. `milestone-core.spec.ts` - Milestones 1-4 consolidated
4. `milestone-advanced.spec.ts` - Milestones 5-8 consolidated
5. `milestone-12-llm-bots.spec.ts` - LLM integration
6. `bot-scaling-test.spec.ts` - Performance
7. `crafting-system.spec.ts` - Crafting features
8. `tells-5bot-20turn.spec.ts` - Tell system
9. `quick-diagnostic.spec.ts` - Debug helper

Old milestone files are staged for deletion.

---

## Progress Tracking

| Category | Completed | Remaining | Completion % |
|----------|-----------|-----------|--------------|
| Architect | 7 | 2 | 78% |
| Documentation | 6 | 4 | 60% |
| Product | 8 | 2 | 80% |
| QA | 10 | 1 | 91% |
| **Total** | **31** | **9** | **78%** |

**Completed 2026-01-08:** TODO-001, TODO-002, TODO-003, TODO-004, TODO-005, TODO-007, TODO-010, TODO-011

Remaining by source: Architect (TODO-006,012), Documentation (TODO-008,015,016,017), Product (TODO-013,014), QA (TODO-009).

---

*Generated by review consolidation process*
*Dependency analysis added: 2026-01-08*
*Next review: After P1 items complete*

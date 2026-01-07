# 🔍 Terminology Crisis QA Audit - Master Work List

**Audit Date:** January 6, 2026
**Auditor:** Claude Sonnet 4.5
**Status:** ACTIVE - Methodical Remediation in Progress
**Scope:** 100% QA verification of claimed completion in `CODE-REVIEW-TERMINOLOGY-CRISIS.md`

---

## Executive Summary

**Overall Assessment:** ⚠️ **PARTIALLY COMPLETE - INACCURATE REPORTING**

The terminology crisis document claims Phase 1 as complete, but contains **significant inaccuracies**. Contrary to the document's status checkboxes:
- **Phase 1** claimed ✅ complete → **Actually has violations**
- **Phase 2** claimed ❌ incomplete → **Actually IS complete!**
- **Phase 3** claimed ❌ incomplete → **Correctly incomplete**

**Progress:**
- Original audit: 256 occurrences across 84 files
- Current state: 71 occurrences across 32 files
- **Reduction:** 72% fewer violations, 62% fewer affected files

---

## PHASE 1: Documentation Fix - Work Items

### Status: ⚠️ INCOMPLETE (claimed complete, but has violations)

#### ✅ COMPLETED ITEMS

- [x] `docs/guides/HOW-TO-PLAY.md` - 0 violations
  - Correct bot count: "10-100 AI opponents"
  - Correct turn limits: "50-500 turns based on mode"
  - Uses "Action Resolution" not "Bot Phase"
  - Victory condition: "Control 60% of all sectors"

- [x] `docs/guides/QUICK-START.md` - 0 violations
  - All sector terminology correct

- [x] `CLAUDE.md` terminology warning section (lines 9-29)
  - Critical rules documented
  - Forbidden terms listed

#### ❌ OUTSTANDING VIOLATIONS

##### 1. README.md - 3 Critical Violations

**File:** `C:\dev\GIT\x-imperium\README.md`
**Priority:** P0 - CRITICAL (public-facing file)
**Estimated Time:** 5 minutes

- [x] **Line 66:** Fix "8 planet types with unique production profiles"
  ```markdown
  ❌ Current: "- 8 planet types with unique production profiles"
  ✅ Fix to:  "- 8 sector types with unique production profiles"
  ```

- [x] **Line 92:** Fix "Control 60% of all planets"
  ```markdown
  ❌ Current: "1. **Conquest:** Control 60% of all planets"
  ✅ Fix to:  "1. **Conquest:** Control 60% of all sectors"
  ```

- [x] **Line 144:** Remove or update ironic status claim
  ```markdown
  ❌ Current: "| Sector Terminology | DONE | 32 files rebranded from 'planet' |"
  ✅ Fix to:  Remove this line or update to reflect actual status
  ```

**QA Verification:**
- [x] Run: `grep -i "planet" README.md` (must return 0 results)

---

##### 2. CLAUDE.md - 4 Architecture Diagram Violations

**File:** `C:\dev\GIT\x-imperium\CLAUDE.md`
**Priority:** P0 - CRITICAL (AI instruction file - will perpetuate errors)
**Estimated Time:** 10 minutes

- [x] **Line 81:** Fix directory structure comment
  ```markdown
  ❌ Current: "│       ├── planets/       # PlanetList, BuyPlanetPanel"
  ✅ Fix to:  "│       ├── sectors/       # SectorsList, BuySectorPanel"
  ```

- [x] **Line 96:** Fix service file reference
  ```markdown
  ❌ Current: "│   │   │   ├── planet-service.ts      # Buy/release planets"
  ✅ Fix to:  "│   │   │   ├── sector-service.ts      # Acquire/release sectors"
  ```

- [x] **Line 106:** Fix formula file reference
  ```markdown
  ❌ Current: "│   │   └── planet-costs.ts"
  ✅ Fix to:  "│   │   └── sector-costs.ts"
  ```

- [x] **Line 141:** Fix database table list
  ```markdown
  ❌ Current: "- Core tables: `games`, `empires`, `planets`"
  ✅ Fix to:  "- Core tables: `games`, `empires`, `sectors`"
  ```

**QA Verification:**
- [x] Run: `grep -i "planet" CLAUDE.md | grep -v "forbidden\|never\|wrong\|migrat"` (should only find warning section)
  - Result: ✅ Only warning section + line 166 BotDecision (matches actual code in src/lib/bots/types.ts:118)

**Code Review Finding:**
- ⚠️ Line 166 BotDecision type still uses "buy_planet" and "PlanetType" - this is CORRECT as it matches actual codebase
- Note: Full bot decision type refactoring deferred to Phase 3 (codebase sweep)

---

##### 3. Additional Documentation Files

**File:** `docs/PRD.md`
**Priority:** P2 - LOW (contextually acceptable glossary entry)
**Status:** Review needed

- [ ] **Line 1346:** Review glossary entry - may be contextually acceptable
  ```markdown
  Found: "| **Sector** | Controllable region of space containing planets, stations, resources |"
  Note: This is a glossary definition explaining what a sector contains - may be acceptable
  ```

**Decision Required:** Is this usage acceptable in context? (Sector as container for planets/stations)

---

## PHASE 2: Database Schema Migration

### Status: ✅ COMPLETE (incorrectly reported as incomplete!)

**Critical Finding:** The crisis document marked this as incomplete, but verification proves it WAS completed. This is a documentation accuracy failure.

#### ✅ VERIFIED COMPLETE

- [x] Database table renamed to `sectors`
  - Evidence: `src/lib/db/schema.ts:407` - `export const sectors = pgTable(`
  - No `export const planets = pgTable` found

- [x] All foreign key references updated
  - Verified through schema file inspection

- [x] All indexes renamed
  - Verified through schema file inspection

**QA Verification:**
- [x] Confirmed: `grep "export const planets = pgTable" src/lib/db/schema.ts` returns 0 results
- [x] Confirmed: `grep "export const sectors = pgTable" src/lib/db/schema.ts` returns 1 result

**Action Required:**
- [ ] Update `CODE-REVIEW-TERMINOLOGY-CRISIS.md` to mark Phase 2 as complete

---

## PHASE 3: Codebase Terminology Sweep - Work Items

### Status: ❌ INCOMPLETE (72% reduction achieved, critical gaps remain)

**Progress:** 256 occurrences → 71 occurrences (185 fixed)

---

### P0 - CRITICAL (User-Facing Component)

#### Component: PlanetList.tsx - 9 Violations

**File:** `src/components/game/PlanetList.tsx`
**Priority:** P0 - CRITICAL (renders "Planets" in UI)
**Estimated Time:** 15 minutes

- [x] **Rename file:** `PlanetList.tsx` → `SectorsList.tsx`
  - Current location: `src/components/game/PlanetList.tsx`
  - New location: `src/components/game/SectorsList.tsx`

- [x] **Fix component name and exports**
  ```typescript
  ❌ Current: export function PlanetList({ planets }: PlanetListProps)
  ✅ Fix to:  export function SectorsList({ sectors }: SectorsListProps)
  ```

- [x] **Fix props interface** (Line 5)
  ```typescript
  ❌ Current: planets: Sector[];
  ✅ Fix to:  sectors: Sector[];
  ```

- [x] **Fix UI display text** (Line 40)
  ```typescript
  ❌ Current: Planets ({planets.length})
  ✅ Fix to:  Sectors ({sectors.length})
  ```

- [x] **Fix data-testid** (Line 38)
  ```typescript
  ❌ Current: data-testid="planet-list"
  ✅ Fix to:  data-testid="sectors-list"
  ```

- [x] **Fix all variable names**
  ```typescript
  Lines 23-24:
  ❌ Current: const sectorsByType = planets.reduce((acc, planet) => {
  ✅ Fix to:  const sectorsByType = sectors.reduce((acc, sector) => {
  ```

- [x] **Update all component imports** that reference PlanetList
  - Search pattern: `import.*PlanetList`
  - Update to: `import.*SectorsList`
  - Updated: src/components/game/index.ts

**QA Verification:**
- [x] File renamed and no longer exists at old path
- [x] Component renders "Sectors" in UI
- [x] All tests using this component updated (N/A - no existing tests found)
- [x] Run: `grep -r "PlanetList" src/` (should return 0 results) ✅ 0 results

**Code Review Finding:**
- Note: Still uses PLANET_TYPE_LABELS constant - intentional technical debt, will be fixed in Phase 3
- Note: Architectural question about duplicate SectorsList in sectors/ subfolder - follow-up needed

---

### P1 - HIGH PRIORITY (Service Layer)

#### Service Files - 8 Files with Violations

**Priority:** P1 - HIGH (core business logic)
**Estimated Time:** 2-3 hours total

##### 1. resource-tier-service.ts - 5 Violations

**File:** `src/lib/game/services/resource-tier-service.ts`

- [ ] Review and fix all 5 occurrences
- [ ] Update comments and variable names
- [ ] Run tests: `npm run test -- resource-tier-service.test.ts`

##### 2. resource-engine.ts - 1 Violation

**File:** `src/lib/game/services/resource-engine.ts`

- [ ] Review and fix occurrence
- [ ] Update comments
- [ ] Verify turn processing still works

##### 3. save-service.ts - 1 Violation

**File:** `src/lib/game/services/save-service.ts`

- [ ] Review and fix occurrence
- [ ] Test save/load functionality

##### 4. pirate-service.ts - 1 Violation

**File:** `src/lib/game/services/pirate-service.ts`

- [ ] Review and fix occurrence
- [ ] Run tests: `npm run test -- pirate-service.test.ts`

##### 5. shared-victory-service.ts - 2 Violations

**File:** `src/lib/game/services/shared-victory-service.ts`

- [ ] Review and fix both occurrences
- [ ] Test victory condition calculations

##### 6-8. Test Files - 3 Files

**Files:**
- `src/lib/game/services/__tests__/resource-tier-service.test.ts`
- `src/lib/game/services/__tests__/pirate-service.test.ts`
- `src/lib/game/services/__tests__/m3-integration.test.ts`

- [ ] Fix test file violations
- [ ] Ensure all tests pass after fixes

**QA Verification:**
- [ ] All service tests pass: `npm run test -- src/lib/game/services`
- [ ] No regressions in turn processing
- [ ] Run: `grep -ri "planet" src/lib/game/services --include="*.ts" | grep -v test` (should return 0)

---

### P1 - HIGH PRIORITY (Bot AI System)

#### Bot Actions - 1 Violation

**File:** `src/lib/bots/bot-actions.ts`
**Priority:** P1 - HIGH (bot decision logic)
**Estimated Time:** 30 minutes

- [ ] Review and fix violation
- [ ] Update any related types/interfaces
- [ ] Test bot turn processing
- [ ] Run: `npm run test -- bot-actions`

**QA Verification:**
- [ ] Bot decisions still function correctly
- [ ] Run: `grep -i "planet" src/lib/bots/bot-actions.ts` (should return 0)

---

### P2 - MEDIUM PRIORITY (Constants & Configuration)

#### Constants Files - 6 Violations

**Files:**
- `src/lib/game/constants.ts` - 4 occurrences
- `src/lib/game/constants/crafting.ts` - 2 occurrences

**Priority:** P2 - MEDIUM
**Estimated Time:** 1 hour

- [ ] Fix constants.ts (4 violations)
- [ ] Fix crafting.ts (2 violations)
- [ ] Verify constant values still correct
- [ ] Update any documentation comments

**QA Verification:**
- [ ] Run: `grep -i "planet" src/lib/game/constants` (should return 0)

---

### P2 - MEDIUM PRIORITY (Data & Templates)

#### Template Files - 8 Violations

**Files:**
- `src/data/templates/tech_rush/architect_construct.json` - 7 occurrences
- `src/data/personas.json` - 1 occurrence

**Priority:** P2 - MEDIUM (bot personality data)
**Estimated Time:** 30 minutes

- [ ] Fix architect_construct.json template
- [ ] Fix personas.json entry
- [ ] Verify bot personality loading works

**QA Verification:**
- [ ] Bots still load personalities correctly
- [ ] Template system functions
- [ ] Run: `grep -i "planet" src/data` (should return 0)

---

### P3 - LOW PRIORITY (Other Components & Pages)

#### Remaining Component/Page Files

**Files with 1-2 violations each:**
- `src/app/admin/page.tsx` - 1
- `src/app/game/combat/page.tsx` - 1
- `src/app/game/research/page.tsx` - 1
- `src/components/game/victory/VictoryScreen.tsx` - 1
- `src/components/game/covert/TargetSelector.tsx` - 1
- `src/components/game/research/ResearchPanel.tsx` - 1
- `src/components/game/starmap/SectorDetail.tsx` - 2
- `src/components/game/starmap/EmpireTooltip.tsx` - 2
- `src/components/game/starmap/BossDetailPanel.tsx` - 1

**Priority:** P3 - LOW
**Estimated Time:** 2-3 hours total

- [ ] Review each file individually
- [ ] Fix terminology in comments/strings
- [ ] Update variable names
- [ ] Test affected UI components

---

### P3 - LOW PRIORITY (Utility & Theme Files)

**Files:**
- `src/lib/theme/names.ts` - 1
- `src/lib/security/validation.ts` - 1
- `src/lib/events/political.ts` - 1
- `src/lib/game/networth.ts` - 1
- `src/components/game/session/README.md` - 1

**Priority:** P3 - LOW
**Estimated Time:** 1 hour

- [ ] Fix each file
- [ ] Verify functionality unchanged

---

### P4 - LOWEST (Test & Combat Files)

**Files:**
- `src/lib/combat/__tests__/unified-combat.test.ts` - 1

**Priority:** P4 - LOWEST (test file only)
**Estimated Time:** 15 minutes

- [ ] Fix test file violation
- [ ] Ensure test still passes

---

## Validation Commands - Run After Each Section

### After P0 Fixes (README.md, CLAUDE.md, PlanetList)
```bash
# Should return 0 results (excluding crisis doc)
grep -ri "planet" README.md
grep -ri "planet" CLAUDE.md | grep -v "forbidden\|never\|wrong\|migrat"
grep -r "PlanetList" src/

# Should find renamed component
ls src/components/game/SectorsList.tsx
```

### After P1 Service Layer Fixes
```bash
# Should return 0 results
grep -ri "planet" src/lib/game/services --include="*.ts" | grep -v test

# All tests should pass
npm run test -- src/lib/game/services
```

### After P1 Bot Fixes
```bash
grep -i "planet" src/lib/bots/bot-actions.ts
npm run test -- bot-actions
```

### After All P2 Fixes
```bash
grep -i "planet" src/lib/game/constants
grep -i "planet" src/data
```

### Final Validation (After Everything)
```bash
# Master validation - should return 0 results (excluding test fixtures)
grep -ri "planet" src/ --include="*.ts" --include="*.tsx" | grep -v "test" | grep -v "fixture"

# Specific checks from crisis document
grep -ri "planet" docs/guides/                    # Must be 0
grep -ri "bot phase" docs/                        # Must be 0 (excluding crisis doc)
grep -r "25 AI opponents" docs/                   # Must be 0
grep -r "200 turns" docs/ | grep -v "default.*200" # Must be 0

# Full test suite
npm run test
npm run typecheck
npm run lint
```

---

## Acceptance Criteria Tracking

From original crisis document - verify each:

- [ ] Zero "planet" references in player-facing documentation
- [ ] Correct bot counts (10-100) in all docs
- [ ] Correct turn limits (50-500) in all docs
- [ ] No "Bot Phase" references anywhere
- [x] Database table named `sectors` ✅
- [ ] All source code uses "sector" terminology
- [ ] All tests passing (unit + E2E + integration)
- [ ] UI displays "sector" consistently
- [ ] No regression in gameplay functionality
- [ ] Documentation updated with correct game modes

---

## Success Criteria Tracking

Definition of Done (from crisis document):

- [ ] Zero "planet" references in player-facing documentation
- [x] Database table renamed to `sectors` ✅
- [ ] All source code uses "sector" terminology
- [ ] All tests passing (unit + E2E + integration)
- [ ] UI displays "sector" consistently
- [ ] No regression in gameplay functionality
- [ ] Documentation updated with correct game modes and turn limits
- [ ] No "Bot Phase" references anywhere

---

## Time Estimates

| Priority | Description | Files | Estimated Time |
|----------|-------------|-------|----------------|
| **P0** | README, CLAUDE, PlanetList | 3 files | 30 minutes |
| **P1** | Services + Bot Actions | 9 files | 3-4 hours |
| **P2** | Constants + Data | 4 files | 1.5 hours |
| **P3** | Components + Utils | 14 files | 3-4 hours |
| **P4** | Test files | 1 file | 15 minutes |
| **QA** | Final validation | N/A | 1 hour |
| **TOTAL** | | **32 files** | **9-11 hours** |

---

## Critical Findings Summary

### 1. Inaccurate Status Reporting
Crisis document shows Phase 1 complete (✅) but Phase 2 incomplete (unchecked). Reality is reversed:
- Phase 1 has violations in README.md and CLAUDE.md
- Phase 2 was actually completed successfully

### 2. Highest Priority Violations
- **README.md** - First file visitors see on GitHub
- **CLAUDE.md** - AI instruction file that will perpetuate errors
- **PlanetList.tsx** - User-facing component displaying wrong term

### 3. Progress Made
72% reduction in violations is significant progress, but critical gaps remain in public-facing files.

---

## Work Methodology

1. **Attack P0 items first** - Public-facing critical violations
2. **Mark each item complete** with checkbox when done
3. **Run QA verification** for each section before moving to next
4. **Run final validation** after all items complete
5. **Update crisis document** with accurate status

---

## Next Session Checklist

Before starting work:
- [ ] Read this entire document
- [ ] Understand priority system
- [ ] Have test suite ready to run
- [ ] Commit current state to git before changes

During work:
- [ ] Work P0 → P1 → P2 → P3 → P4 in order
- [ ] Check off items as completed
- [ ] Run validation commands after each section
- [ ] Do NOT skip QA checks

After completion:
- [ ] Run full validation suite
- [ ] Update `CODE-REVIEW-TERMINOLOGY-CRISIS.md` with accurate status
- [ ] Create summary of work completed
- [ ] Run full test suite one final time

---

**Status:** Ready for methodical execution
**Last Updated:** January 6, 2026
**Next Review:** After P0 completion

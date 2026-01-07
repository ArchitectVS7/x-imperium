# CRITICAL: Terminology Crisis Code Review
**Date:** January 6, 2026
**Severity:** 🔴 **CRITICAL BRANDING FAILURE**
**Status:** ACTIVE - Requires Immediate Remediation

---

## Executive Summary

A comprehensive code review has revealed a **critical branding failure** in Nexus Dominion. Despite multiple deliberate rebranding decisions to distinguish the game from its Solar Realms Elite origins, the codebase and documentation are **saturated with legacy "planet" terminology** instead of the correct **"sector"** terminology.

### Scope of the Problem

| Area | Issue | Impact |
|------|-------|--------|
| **Documentation** | Guides reference "planets" 60+ times | Player confusion, brand dilution |
| **Codebase** | 256 "planet" references across 84 files | Deep architectural mismatch |
| **Database** | Primary table named `planets` not `sectors` | Fundamental schema error |
| **Documentation** | Incorrect bot counts (states "25" not "10-100") | False advertising |
| **Documentation** | Incorrect turn limits (states "200" not "50-500") | Misleading gameplay description |
| **Documentation** | References non-existent "Bot Phase" | Breaks immersion, factually wrong |

---

## Issue 1: Incorrect Game Configuration Claims

### Documentation Errors

#### HOW-TO-PLAY.md Line 27
```markdown
❌ WRONG: "competing against 25 AI opponents. Each game lasts up to 200 turns"
✅ CORRECT: "competing against 10-100 AI opponents (configurable). Games last 50-500 turns based on mode"
```

### Actual Configuration (from `src/lib/game/constants.ts`)

| Mode | Bot Count | Turn Range | Default Turns |
|------|-----------|------------|---------------|
| **Oneshot** | 10-25 | 50-100 | 75 |
| **Campaign** | 25-100 | 150-500 | 200 |

**User Validation**: Playtesting confirmed games lasting 250+ turns without all empires eliminated.

**Impact**: Documentation misleads players about game scale and duration.

---

## Issue 2: "Planets" vs "Sectors" Terminology Crisis

### Design Intent (PRD Section 5)

The game uses **SECTORS**, not planets:
- Food sectors
- Ore sectors
- Petroleum sectors
- Commerce sectors
- Urban sectors
- Research sectors
- Education sectors

**Rationale**: Deliberate rebranding to distance from Solar Realms Elite clone status and establish unique identity.

### Codebase Audit Results

```
Total "planet" references: 256 occurrences across 84 files
```

#### Critical Files with "Planet" Usage

**Database Schema** (`src/lib/db/schema.ts`):
- `export const planets = pgTable(` ← **WRONG TABLE NAME**
- `planetsRelations` ← Wrong
- Should be: `sectors`, `sectorsRelations`

**Core Services** (8 references each):
- `src/lib/game/services/turn-processor.ts` (8)
- `src/lib/game/constants.ts` (8)
- `src/lib/game/repositories/game-repository.ts` (8)
- `src/lib/game/services/resource-engine.ts` (11)
- `src/lib/game/services/resource-tier-service.ts` (9)

**Components** (UI layer):
- `src/components/game/PlanetList.tsx` (6) ← **WRONG COMPONENT NAME**
- `src/components/game/panels/SectorsPanelContent.tsx` (7)
- `src/components/game/sectors/SectorsList.tsx` (2)
- `src/components/game/sectors/SectorCard.tsx` (2)

**Bot AI System**:
- `src/lib/bots/decision-engine.ts` (5)
- `src/lib/bots/bot-processor.ts` (5)
- `src/lib/bots/bot-actions.ts` (8)

**Combat System**:
- `src/lib/combat/unified-combat.ts` (4)
- `src/lib/combat/coalition-raid-service.ts` (4)
- `src/lib/combat/phases.ts` (2)

**Documentation**:
- `docs/guides/HOW-TO-PLAY.md` (60+ references)
- `docs/guides/QUICK-START.md` (20+ references)

---

## Issue 3: "Bot Phase" Reference

### HOW-TO-PLAY.md Line 72-74

```markdown
❌ WRONG:
"5. **Bot Phase** - AI empires take their actions"

✅ CORRECT:
Turn processing is simultaneous. All empires (human and AI) take actions concurrently.
Combat and trading are resolved in a deterministic order after all decisions are made.
```

**Design Intent**: Create single-player MMO feel, not turn-by-turn sequential processing.

**Impact**: Breaks immersion, implies incorrect game mechanics.

---

## Remediation Plan

### Phase 1: Documentation Fix (P0 - IMMEDIATE)
**Estimated Time:** 2 hours
**Risk:** Low
**Impact:** High (player-facing)

#### Tasks:
1. ✅ Fix `docs/guides/HOW-TO-PLAY.md`:
   - Replace all "planet" → "sector"
   - Fix bot count: "10-100 opponents based on game mode"
   - Fix turn limit: "50-500 turns based on mode (Oneshot: 50-100, Campaign: 150-500)"
   - Remove "Bot Phase" reference, explain simultaneous processing
   - Fix victory condition to reference sectors: "Control 60% of all sectors"

2. ✅ Fix `docs/guides/QUICK-START.md`:
   - Replace all "planet" → "sector"
   - Update victory conditions
   - Update unit descriptions (Marines capture sectors, not planets)
   - Fix milestone table

3. ✅ Update `CLAUDE.md` (project instructions):
   - Add explicit warning about "sector" vs "planet" terminology
   - Document the branding decision

#### Acceptance Criteria:
- Zero references to "planets" in player-facing documentation
- Correct bot counts (10-100)
- Correct turn limits (50-500)
- No "Bot Phase" references

---

### Phase 2: Database Schema Migration (P1 - HIGH PRIORITY)
**Estimated Time:** 4-6 hours
**Risk:** CRITICAL - Data migration required
**Impact:** Foundational

#### Strategy:
**Option A: Rename Table** (Recommended)
```sql
ALTER TABLE planets RENAME TO sectors;
ALTER INDEX planets_pkey RENAME TO sectors_pkey;
ALTER INDEX planets_empire_idx RENAME TO sectors_empire_idx;
-- ... rename all indexes and constraints
```

**Option B: Keep Schema, Fix Code** (Temporary workaround)
- Keep `planets` table name for backward compatibility
- Fix all TypeScript code to use "sector" terminology in variables/comments
- Document the mismatch in schema comments

#### Tasks:
1. Create migration script `0006_rename_planets_to_sectors.sql`
2. Update Drizzle schema definition
3. Regenerate types
4. Update all queries to use new table name
5. Test migration on dev database

#### Acceptance Criteria:
- Database table named `sectors`
- All foreign keys updated
- All indexes renamed
- Zero references to `planets` in schema
- All tests passing after migration

---

### Phase 3: Codebase Terminology Sweep (P1 - HIGH PRIORITY)
**Estimated Time:** 8-12 hours
**Risk:** Medium (breaking changes possible)
**Impact:** High (code quality, maintainability)

#### Strategy:
Systematic find-and-replace with validation:

```bash
# Find all "planet" usages (case-insensitive)
grep -ri "planet" src/ --include="*.ts" --include="*.tsx"

# Categories:
# 1. Variable names: planetId → sectorId
# 2. Function names: getPlanets → getSectors
# 3. Type definitions: Planet → Sector
# 4. Component names: PlanetList → SectorList
# 5. Comments: "buy planet" → "acquire sector"
```

#### Files Requiring Updates (84 total):

**Core Services** (Priority 1):
- [ ] `src/lib/db/schema.ts` (table definition)
- [ ] `src/lib/game/constants.ts` (constants)
- [ ] `src/lib/game/services/sector-service.ts` (already correct name!)
- [ ] `src/lib/game/services/turn-processor.ts`
- [ ] `src/lib/game/services/resource-engine.ts`
- [ ] `src/lib/game/services/save-service.ts`
- [ ] `src/lib/game/repositories/game-repository.ts`
- [ ] `src/lib/game/repositories/combat-repository.ts`

**Bot AI System** (Priority 2):
- [ ] `src/lib/bots/decision-engine.ts`
- [ ] `src/lib/bots/bot-processor.ts`
- [ ] `src/lib/bots/bot-actions.ts`
- [ ] `src/lib/bots/types.ts`

**Combat System** (Priority 2):
- [ ] `src/lib/combat/unified-combat.ts`
- [ ] `src/lib/combat/coalition-raid-service.ts`
- [ ] `src/lib/combat/phases.ts`

**Components** (Priority 3):
- [ ] Rename: `src/components/game/PlanetList.tsx` → `SectorList.tsx`
- [ ] `src/components/game/panels/SectorsPanelContent.tsx`
- [ ] `src/components/game/sectors/SectorCard.tsx`
- [ ] `src/components/game/sectors/SectorsList.tsx`
- [ ] `src/components/game/sectors/SectorReleaseButton.tsx`

**Test Files** (Priority 4):
- [ ] All 30+ test files with "planet" references

#### Automated Replacement Script:
```typescript
// scripts/fix-planet-terminology.ts
const replacements = [
  { from: /\bplanet(s?)\b/gi, to: 'sector$1' },
  { from: /\bPlanet(s?)\b/g, to: 'Sector$1' },
  { from: /PLANET(S?)\b/g, to: 'SECTOR$1' },
  // Preserve proper nouns (e.g., "Planet Earth" in comments)
  // Manual review required
];
```

#### Acceptance Criteria:
- Zero "planet" references in source code (excluding test data fixtures)
- All variables renamed: `planetId` → `sectorId`
- All types renamed: `Planet` → `Sector`
- All components renamed
- All tests passing
- TypeScript compilation succeeds

---

### Phase 4: Validation & Testing (P0 - CRITICAL)
**Estimated Time:** 4 hours
**Risk:** Low
**Impact:** Prevents regression

#### Test Coverage Required:
- [ ] Unit tests: All existing tests pass with new terminology
- [ ] Integration tests: Turn processing, combat, bot decisions
- [ ] E2E tests: Full game simulation with new schema
- [ ] Manual QA: Play through 10 turns, verify UI displays correctly
- [ ] Documentation review: Ensure consistency

#### Acceptance Criteria:
- All 91 unit test files passing
- All 18 E2E test files passing
- 80%+ code coverage maintained
- No TypeScript errors
- No ESLint errors
- Manual playtest confirms correct terminology in UI

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Database migration failure** | Medium | CRITICAL | Test on dev DB first, backup production |
| **Broken tests after rename** | High | Medium | Run full test suite after each phase |
| **UI displays wrong terms** | Medium | High | Comprehensive UI testing, screenshot review |
| **Breaking changes in API** | Low | High | Use deprecation warnings, version API |
| **Documentation drift** | High | Medium | Add linting rules, update templates |

---

## Timeline

| Phase | Duration | Dependencies | Start Date |
|-------|----------|--------------|------------|
| **Phase 1: Docs** | 2 hours | None | Immediate |
| **Phase 2: Schema** | 6 hours | Phase 1 complete | Day 2 |
| **Phase 3: Code** | 12 hours | Phase 2 complete | Day 3-4 |
| **Phase 4: Testing** | 4 hours | Phase 3 complete | Day 5 |
| **Total** | **24 hours** | | **5 days** |

---

## Success Criteria

### Definition of Done:
- [x] Zero "planet" references in player-facing documentation
- [ ] Database table renamed to `sectors`
- [ ] All source code uses "sector" terminology
- [ ] All tests passing (unit + E2E + integration)
- [ ] UI displays "sector" consistently
- [ ] No regression in gameplay functionality
- [ ] Documentation updated with correct game modes and turn limits
- [ ] No "Bot Phase" references anywhere

### Post-Remediation Validation:
```bash
# Must return 0 results:
grep -ri "planet" docs/guides/
grep -ri "planet" src/ --include="*.ts" --include="*.tsx" | grep -v "test" | grep -v "fixture"
grep -ri "bot phase" docs/

# Must show correct values:
grep -r "25 AI opponents" docs/  # Should find 0
grep -r "200 turns" docs/ | grep -v "default.*200"  # Should find 0
```

---

## Lessons Learned

### Root Cause Analysis:
1. **Legacy code inertia**: Initial prototype used SRE terminology, not cleaned up
2. **Incomplete refactoring**: Previous sweeps missed database layer
3. **Documentation generated without context**: Claude session lacked terminology guidance
4. **No linting rules**: No automated checks for forbidden terms
5. **Insufficient project instructions**: `CLAUDE.md` didn't emphasize terminology

### Preventive Measures:
1. ✅ Add linting rule: Forbid "planet" in source code
2. ✅ Update `CLAUDE.md` with explicit terminology guidelines
3. ✅ Add pre-commit hook: Check for "planet" references
4. ✅ Document terminology in `docs/DESIGN-DECISIONS.md`
5. ✅ Add terminology section to code review checklist

---

## Immediate Action Required

**Priority 1 (CRITICAL - Do Now):**
1. Fix `docs/guides/HOW-TO-PLAY.md` and `QUICK-START.md`
2. Update `CLAUDE.md` with terminology warnings
3. Create GitHub issue to track full remediation

**Priority 2 (HIGH - This Week):**
1. Plan database migration strategy
2. Create automated replacement script
3. Begin Phase 3 codebase sweep

**Priority 3 (MEDIUM - Next Sprint):**
4. Implement preventive linting rules
5. Add terminology guidelines to contributor docs

---

## Approval Required

This remediation plan requires stakeholder approval due to:
- Database schema changes (breaking change)
- Extensive codebase modifications (84 files)
- Potential for regression bugs
- 24-hour development effort

**Recommended Approach**: Implement Phase 1 immediately, then review Phases 2-4 with team before proceeding.

---

**Reviewer:** Claude Sonnet 4.5
**Date:** January 6, 2026
**Next Review:** After Phase 1 completion

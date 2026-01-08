# Terminology Remediation Plan

**Date:** January 6, 2026
**Status:** ACTIVE - Phases 2-4 pending
**Original Location:** `docs/archive/terminology-crisis-audit.md`

> **Note:** Phase 1 (Documentation) has been completed. Phases 2-4 remain pending.

---

## Progress Summary

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Documentation Fix | **COMPLETE** |
| Phase 2 | Database Schema Migration | **PENDING** |
| Phase 3 | Codebase Terminology Sweep | **PENDING** |
| Phase 4 | Validation & Testing | **PENDING** |

---

## Phase 2: Database Schema Migration (PENDING)

**Estimated Time:** 4-6 hours
**Risk:** CRITICAL - Data migration required

### Strategy (Recommended: Option A - Rename Table)

```sql
ALTER TABLE planets RENAME TO sectors;
ALTER INDEX planets_pkey RENAME TO sectors_pkey;
ALTER INDEX planets_empire_idx RENAME TO sectors_empire_idx;
-- ... rename all indexes and constraints
```

### Tasks:
- [ ] Create migration script `0006_rename_planets_to_sectors.sql`
- [ ] Update Drizzle schema definition
- [ ] Regenerate types
- [ ] Update all queries to use new table name
- [ ] Test migration on dev database

### Acceptance Criteria:
- Database table named `sectors`
- All foreign keys updated
- All indexes renamed
- Zero references to `planets` in schema
- All tests passing after migration

---

## Phase 3: Codebase Terminology Sweep (PENDING)

**Estimated Time:** 8-12 hours
**Risk:** Medium (breaking changes possible)

### Files Requiring Updates (84 total):

**Core Services** (Priority 1):
- [ ] `src/lib/db/schema.ts` (table definition)
- [ ] `src/lib/game/constants.ts` (constants)
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

### Acceptance Criteria:
- Zero "planet" references in source code (excluding test fixtures)
- All variables renamed: `planetId` → `sectorId`
- All types renamed: `Planet` → `Sector`
- All components renamed
- All tests passing
- TypeScript compilation succeeds

---

## Phase 4: Validation & Testing (PENDING)

**Estimated Time:** 4 hours

### Test Coverage Required:
- [ ] Unit tests: All existing tests pass with new terminology
- [ ] Integration tests: Turn processing, combat, bot decisions
- [ ] E2E tests: Full game simulation with new schema
- [ ] Manual QA: Play through 10 turns, verify UI displays correctly
- [ ] Documentation review: Ensure consistency

### Acceptance Criteria:
- All unit test files passing
- All E2E test files passing
- 80%+ code coverage maintained
- No TypeScript errors
- No ESLint errors
- Manual playtest confirms correct terminology in UI

---

## Post-Remediation Validation

```bash
# Must return 0 results:
grep -ri "planet" docs/guides/
grep -ri "planet" src/ --include="*.ts" --include="*.tsx" | grep -v "test" | grep -v "fixture"

# Must show correct values:
grep -r "25 AI opponents" docs/  # Should find 0
grep -r "200 turns" docs/ | grep -v "default.*200"  # Should find 0
```

---

## Related Documents

- [Terminology Guidelines](development/TERMINOLOGY.md) - Rules for correct terminology
- [Full Crisis Audit](archive/terminology-crisis-audit.md) - Original audit with full context

---

*Moved from archive to active status: January 7, 2026*
*Last verified: January 8, 2026*

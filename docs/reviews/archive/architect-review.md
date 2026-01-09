# Architecture Review: Nexus Dominion Pre-Alpha

**Review Date**: 2026-01-07
**Reviewer**: Senior Architecture Reviewer
**Codebase Version**: Main branch (commit a049daa)
**Scope**: Pre-alpha architecture assessment for playtest readiness

---

## 1. Executive Summary

### Key Findings

1. **Combat System Technical Debt (CRITICAL)**: Three parallel combat implementations exist (`src/lib/combat/phases.ts`, `src/lib/combat/unified-combat.ts`, `src/lib/combat/volley-combat-v2.ts`) solving the same problem with different approaches. This creates maintenance burden, potential inconsistencies, and unclear which system is authoritative.

2. **Service Layer Lacks Domain Organization (HIGH)**: The `src/lib/game/services/` directory contains 30+ flat files without domain grouping. This makes navigation difficult and increases the risk of circular dependencies as the codebase grows.

3. **Git Hygiene Issues (MEDIUM)**: The file `src/lib/db/schema.ts.backup` is tracked in version control. The `.gitignore` lacks patterns for backup files and development artifacts.

4. **Strong Architectural Foundations**: The formulas layer (`src/lib/formulas/`), bot system (`src/lib/bots/`), and database layer (`src/lib/db/`) demonstrate excellent separation of concerns and testability patterns that should be emulated across the codebase.

5. **Data-Driven Configuration Pattern (POSITIVE)**: The `src/lib/game/config/combat-loader.ts` and JSON configuration approach (`data/combat-config.json`) enables runtime balancing without code changes - an excellent pattern for a strategy game.

---

## 2. Corrective Actions (Pre-Alpha Priorities)

### P0: Critical - Must Fix Before Alpha

#### 2.1 Combat System Consolidation

**Issue**: Three combat resolution systems exist with overlapping functionality:

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/combat/phases.ts` | Original 3-phase sequential combat | Legacy |
| `src/lib/combat/unified-combat.ts` | Single-roll unified combat (fix for 1.2% win rate) | Active |
| `src/lib/combat/volley-combat-v2.ts` | D20 3-volley system with stances | Experimental |

**Problem**: It is unclear which system is authoritative. The `combat-service.ts` may be calling different implementations based on feature flags. This creates:
- Confusion for developers
- Risk of inconsistent combat outcomes
- Maintenance burden (3x testing surface)

**Recommendation**:
1. Document which combat system is the production system
2. Mark deprecated systems clearly with `@deprecated` JSDoc tags
3. Create a migration plan to remove unused implementations
4. Consolidate common types into a single `combat-types.ts`

**Effort**: 4-8 hours

#### 2.2 Git Hygiene Cleanup

**Issue**: `src/lib/db/schema.ts.backup` is tracked in git.

**Fix**: Add to `.gitignore`:
```gitignore
# Backup files
*.backup
*.bak
*.orig

# Schema backups
src/lib/db/*.backup
```

Then remove from tracking:
```bash
git rm --cached src/lib/db/schema.ts.backup
```

**Effort**: 15 minutes

### P1: High Priority - Address Within Sprint

#### 2.3 Service Layer Domain Organization

**Current Structure** (flat, 30+ files):
```
src/lib/game/services/
  border-discovery-service.ts
  boss-detection-service.ts
  build-queue-service.ts
  checkpoint-service.ts
  civil-status.ts
  combat-service.ts
  covert-service.ts
  crafting-service.ts
  event-service.ts
  population.ts
  research-service.ts
  resource-engine.ts
  resource-tier-service.ts
  save-service.ts
  sector-service.ts
  turn-processor.ts
  unit-service.ts
  victory-service.ts
  wormhole-construction-service.ts
  wormhole-service.ts
  ... (additional files)
```

**Recommended Structure** (domain-grouped):
```
src/lib/game/services/
  combat/
    combat-service.ts
    combat-validator.ts
  economy/
    resource-engine.ts
    resource-tier-service.ts
    crafting-service.ts
  military/
    build-queue-service.ts
    unit-service.ts
  diplomacy/
    treaty-service.ts
    reputation-service.ts
  geography/
    sector-service.ts
    wormhole-service.ts
    wormhole-construction-service.ts
    border-discovery-service.ts
  population/
    population.ts
    civil-status.ts
  covert/
    covert-service.ts
  research/
    research-service.ts
  events/
    event-service.ts
    checkpoint-service.ts
    boss-detection-service.ts
  core/
    turn-processor.ts
    victory-service.ts
    save-service.ts
```

**Benefits**:
- Easier navigation for new developers
- Clear domain boundaries
- Reduced risk of circular dependencies
- Better alignment with domain-driven design

**Effort**: 8-16 hours (careful refactoring with barrel exports to minimize breaking changes)

#### 2.4 Constants Consolidation

**Issue**: Game constants are split across two directories:
- `src/lib/constants/` (legacy)
- `src/lib/game/constants/` (newer)

**Recommendation**: Consolidate into single `src/lib/game/constants/` with clear subdirectory organization by domain. Mark `src/lib/constants/` as deprecated with re-exports.

**Effort**: 2-4 hours

### P2: Medium Priority - Address Before Beta

#### 2.5 Type Duplication in Combat System

**Issue**: The `Forces` interface is defined in multiple places:
- `src/lib/combat/phases.ts` (lines 36-43)
- `src/lib/bots/types.ts` (lines 83-90)

**Recommendation**: Create canonical `src/lib/game/types/forces.ts` and re-export from both locations. Eventually, other files should import from the canonical location.

**Effort**: 2 hours

#### 2.6 Database Schema Terminology Compliance

**Issue**: The backup file reveals a `planetTypeEnum` still exists somewhere (likely a migration artifact). The current schema correctly uses `sectorTypeEnum`, but thorough audit needed.

**Recommendation**:
1. Run compliance check: `npm run compliance:check`
2. Audit all migration files for stale "planet" references
3. Delete backup file after verification

**Effort**: 1 hour

---

## 3. [DEFERRED]
---

## 4. Priority Matrix

| Category | Issue | Priority | Effort | Impact |
|----------|-------|----------|--------|--------|
| Technical Debt | Combat system consolidation | P0 | 4-8h | Critical |
| Git Hygiene | Remove tracked backup file | P0 | 15m | Medium |
| Architecture | Service domain organization | P1 | 8-16h | High |
| Architecture | Constants consolidation | P1 | 2-4h | Medium |
| Code Quality | Type duplication cleanup | P2 | 2h | Low |
| Terminology | Schema compliance audit | P2 | 1h | Medium |


---

## 5. Action Items

### Immediate (This Week)

- [ ] **ARCHITECT-001**: Add `.backup` pattern to `.gitignore` and remove `schema.ts.backup` from git
- [ ] **ARCHITECT-002**: Document which combat system is authoritative in `src/lib/combat/README.md`
- [ ] **ARCHITECT-003**: Add `@deprecated` tags to legacy combat implementations

### Short-Term (Before Alpha)

- [ ] **ARCHITECT-004**: Create service domain organization proposal with migration plan
- [ ] **ARCHITECT-005**: Consolidate constants into single directory structure
- [ ] **ARCHITECT-006**: Create canonical `Forces` type and update imports

### Medium-Term (Before Beta)

- [ ] **ARCHITECT-007**: Implement barrel exports (`index.ts`) for each service domain
- [ ] **ARCHITECT-008**: Complete combat system consolidation (remove deprecated code)
- [ ] **ARCHITECT-009**: Evaluate event sourcing prototype for turn history

---

## 6. Architecture Strengths (To Preserve)

### 6.1 Formula Layer Excellence

The `src/lib/formulas/` directory exemplifies ideal architecture:
- Pure functions with no side effects
- Comprehensive unit tests
- Single responsibility principle
- Easy to balance/tune

**Key Files**:
- `src/lib/formulas/combat-power.ts` - Fleet power calculations
- `src/lib/formulas/casualties.ts` - Loss rate formulas
- `src/lib/formulas/army-effectiveness.ts` - Combat effectiveness changes
- `src/lib/formulas/population.ts` - Growth/starvation formulas
- `src/lib/formulas/sector-costs.ts` - Economic calculations

**Recommendation**: Use this as the template for any new calculation logic.

### 6.2 Bot Tier Architecture

The 4-tier bot system with archetypes is well-designed:
- Clear tier definitions (LLM, Elite Scripted, Strategic, Simple, Random)
- Archetype behavior through composition
- Emotional state integration
- Memory system with decay

**Key Files**:
- `src/lib/bots/types.ts` - Clean type definitions
- `src/lib/bots/archetypes/` - 8 archetype implementations
- `src/lib/bots/emotions/` - Emotional state machine
- `src/lib/bots/memory/` - Relationship memory
- `src/lib/bots/bot-processor.ts` - Turn orchestration with weak-first initiative

### 6.3 Data-Driven Configuration

The JSON configuration pattern enables balancing without code changes:
- `data/combat-config.json` - Combat balance values
- `data/unit-stats.json` - Unit statistics
- `data/personas.json` - 100 bot personalities

**Pattern**: `src/lib/game/config/combat-loader.ts` loads JSON and provides typed accessors.

### 6.4 Turn Processor Orchestration

The `src/lib/game/services/turn-processor.ts` is well-documented with clear phase ordering:
1. Income collection (with civil status multiplier)
2. Population update (growth/starvation)
3. Civil status evaluation
4. Build queue processing
5. Bot decisions
6. Market price update
7. Galactic events
8. Victory/Defeat check
9. Auto-save

The parallel processing of empire turns shows good performance awareness.

### 6.5 Server Actions Pattern

The `src/app/actions/combat-actions.ts` demonstrates proper boundary validation:
- Cookie-based session management
- Input sanitization at the boundary
- Rate limiting for abuse prevention
- Proper UUID validation

---

## 7. Risk Assessment

### 7.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Combat inconsistency between systems | High | High | Consolidate to single system |
| Circular dependency as codebase grows | Medium | Medium | Domain-based organization |
| Database schema drift from code | Low | High | Strong TypeScript types via Drizzle |
| Performance at 100 bot scale | Medium | Medium | Already parallel processing |

### 7.2 Scalability Concerns

**Current Performance Target**: <500ms per turn (no bots), <1.5s with 25 bots

**Potential Bottlenecks**:
1. Bot LLM calls (Tier 1) - mitigated by caching
2. Database writes per turn - consider batching
3. Combat resolution for many simultaneous battles

**Recommendation**: Add performance regression tests before alpha.

---

## 8. Conclusion

Nexus Dominion demonstrates strong foundational architecture with excellent patterns in the formula, bot, and database layers. The primary concerns for alpha readiness are:

1. **Combat system consolidation** - Critical path item
2. **Service layer organization** - Maintainability debt
3. **Git hygiene** - Quick wins available

The codebase is well-positioned for alpha with targeted cleanup of the identified issues. The longer-term visionary recommendations (event sourcing, CQRS, plugins) should be considered for post-alpha roadmap.

**Overall Assessment**: **READY FOR ALPHA** with P0/P1 fixes addressed.

---

*Review conducted using static analysis, pattern recognition, and codebase traversal*
*Total files analyzed: 425 TypeScript/TSX files across src/*

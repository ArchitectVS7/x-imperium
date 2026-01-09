# Documentation Cleanup Review - Nexus Dominion

**Version:** Pre-Alpha (v0.6 Prototype)
**Reviewer:** Documentation Engineer Agent
**Date:** January 7, 2026
**Total Documentation Reviewed:** 23 markdown files, 4,004 lines

---

## Executive Summary

### Key Findings

1. **Broken Documentation Links**: The documentation index (`docs/index.md`) references **4 non-existent files** in the development folder (ARCHITECTURE.md, FRONTEND-GUIDE.md, UI-DESIGN.md, TESTING-GUIDE.md). PRD.md is also referenced in CLAUDE.md and CONTRIBUTING.md but does not exist.

2. **Terminology Violations Persist**: Despite a comprehensive terminology crisis audit, **54 instances of "planet" terminology remain** in documentation files. Most are in the archived terminology-crisis-audit.md itself, but the archive/redesign-2025-12-summary.md still contains an active violation.

3. **README.md Scope Creep**: The root README.md has grown to **393 lines** with multiple "OPEN ITEMS" sections that duplicate content from `docs/OPEN-ISSUES.md`. This creates maintenance overhead and version drift.

4. **Expansion/Brainstorm Status Confusion**: The ROADMAP.md (541 lines) claims features like Crafting and Syndicate are "IMPLEMENTED" but the expansion folder states these are "NOT IN BASE GAME V1.0" - this is contradictory and confusing.

5. **Archive Contains Actionable Items**: The `terminology-crisis-audit.md` (389 lines) contains an active remediation plan with unchecked items, yet it's been archived. This creates confusion about what is still pending.

---

## Corrective Actions - Pre-Alpha Fixes

### Priority 1: CRITICAL (Fix Before Alpha)

#### CA-1: Fix Broken Documentation Links

**Severity:** Critical - Documentation unusable for contributors
**Effort:** 2-4 hours

The `docs/index.md` references 4 development guides that do not exist:

| Referenced File | Status | Resolution |
|-----------------|--------|------------|
| `docs/development/ARCHITECTURE.md` | Missing | Create from CLAUDE.md content OR remove link |
| `docs/development/FRONTEND-GUIDE.md` | Missing | Create minimal guide OR remove link |
| `docs/development/UI-DESIGN.md` | Missing | Create minimal guide OR remove link |
| `docs/development/TESTING-GUIDE.md` | Missing | Create minimal guide OR remove link |
| `docs/PRD.md` | Missing | Remove references (consolidated into GAME-DESIGN.md) |
| `docs/reference/TERMINOLOGY-AUDIT.md` | Missing folder | Fix link to `../archive/terminology-crisis-audit.md` |

**Recommendation:** Create stub documents with basic content or update links to point to existing alternatives.

#### CA-2: Remove README.md Open Items Duplication

**Severity:** High - Version drift causing confusion
**Effort:** 1 hour

The README.md contains three "OPEN ITEMS" sections (lines 125-389) that largely duplicate:
- `docs/OPEN-ISSUES.md` (code review findings)
- `docs/brainstorm/ux-improvements.md` (UX assets needed)

**Resolution:**
1. Remove "OPEN ITEMS - Three-Tier Redesign Plan" section (lines 125-190)
2. Remove "Human Action Items" section (lines 192-225) - move to project management tool
3. Remove "OPEN ITEMS - UI Enhancement Assets" section (lines 228-388)
4. Add single line: "See `docs/OPEN-ISSUES.md` for current development status"

#### CA-3: Clarify Expansion Feature Status

**Severity:** High - Confusing feature claims
**Effort:** 30 minutes

The documentation contradicts itself:

| File | Claim |
|------|-------|
| `docs/expansion/README.md` | "STATUS: NOT IN BASE GAME V1.0" |
| `docs/expansion/ROADMAP.md` | "Crafting System: COMPLETE", "Syndicate: COMPLETE" |

**Resolution:** Update ROADMAP.md header to clarify:
- Features are **schema-complete** (database and backend ready)
- Features are **UI-pending** (no player-facing interface in v1.0)
- Features are **disabled by feature flags** in base game

---

### Priority 2: HIGH (Fix This Week)

#### CA-4: Move Terminology Audit from Archive to Active

**Severity:** High - Active remediation plan archived prematurely
**Effort:** 15 minutes

The `docs/archive/terminology-crisis-audit.md` contains unchecked remediation tasks:
- Phase 2 (Database migration): Not complete
- Phase 3 (Codebase sweep): Not complete
- Phase 4 (Validation): Not complete

**Resolution:**
- Move to `docs/TERMINOLOGY-REMEDIATION.md` (active)
- Update status of completed items
- Archive only after all phases complete

#### CA-5: Clean Up Archive Folder

**Severity:** Medium - Clutter and outdated content
**Effort:** 30 minutes

Archive status assessment:

| File | Lines | Recommendation |
|------|-------|----------------|
| `terminology-crisis-audit.md` | 389 | Move to active (see CA-4) |
| `redesign-2025-12-summary.md` | 96 | Keep - historical value |
| `research-redesign-spec.md` | 74 | Keep - implementation reference |
| `game-config-implementation.md` | 89 | Keep - developer reference |
| `crafting-status-assessment.md` | 58 | Keep - historical snapshot |
| `README.md` | 44 | Keep - archive index |

**Fix:** Remove "planet" reference in `redesign-2025-12-summary.md` line 42.

#### CA-6: Update CLAUDE.md PRD Reference

**Severity:** Medium - Broken reference
**Effort:** 5 minutes

Line 40 of CLAUDE.md references `docs/PRD.md` which no longer exists.

**Resolution:** Update to:
```markdown
- **Game Design reference**: `docs/core/GAME-DESIGN.md` contains consolidated design specifications
```

---

### Priority 3: MEDIUM (Fix Before Beta)

#### CA-7: Create Missing Development Guides

**Severity:** Medium - Contributor friction
**Effort:** 4-8 hours total

Create minimal versions of referenced guides:

1. **ARCHITECTURE.md** - Extract from CLAUDE.md (directory structure, key patterns)
2. **TESTING-GUIDE.md** - Extract test commands and conventions
3. **FRONTEND-GUIDE.md** - Basic React/Next.js patterns used
4. **UI-DESIGN.md** - LCARS design system documentation

**Alternative:** Remove these links from index.md and rely on CLAUDE.md

#### CA-8: Consolidate UX Improvements Documentation

**Severity:** Low - Scattered information
**Effort:** 30 minutes

UX improvement items appear in:
- `README.md` (lines 228-388)
- `docs/brainstorm/ux-improvements.md`

**Resolution:** Consolidate all UX items to brainstorm file, remove from README.

---

## Visionary Recommendations - Post-Alpha Strategy

### V1: Documentation Site Generator

**Recommendation:** Implement Docusaurus or MkDocs for searchable documentation site.

**Benefits:**
- Full-text search across all documentation
- Versioned documentation (v0.6, v1.0, etc.)
- Mobile-responsive design
- API documentation integration
- Broken link detection during build

**Implementation Path:**
1. Install Docusaurus 3.x
2. Migrate existing markdown files
3. Configure navigation sidebar
4. Add search plugin (Algolia DocSearch or local)
5. Deploy to Vercel/Netlify

**Effort:** 8-16 hours initial setup

### V2: API Documentation Generation

**Recommendation:** Auto-generate API documentation from code.

**Current Gap:** No API reference documentation exists for:
- Server Actions (`src/app/actions/`)
- Service functions (`src/lib/game/services/`)
- Database schema (`src/lib/db/schema.ts`)

**Implementation:**
1. Add TSDoc comments to all public functions
2. Use TypeDoc to generate API reference
3. Integrate with documentation site

**Effort:** 16-24 hours

### V3: Schema Documentation

**Recommendation:** Generate database schema documentation.

**Current Gap:** No visual or textual documentation of:
- Table relationships
- Foreign key constraints
- Enum values
- Index strategy

**Implementation:**
1. Use `drizzle-dbml-generator` for DBML output
2. Generate ERD diagrams with dbdiagram.io or Mermaid
3. Add schema reference page to docs

**Effort:** 4-8 hours

### V4: Automated Documentation Testing

**Recommendation:** Add documentation CI checks.

**Checks to implement:**
1. **Link validation** - No broken internal/external links
2. **Terminology compliance** - Automated "planet" detection
3. **Code example validation** - TypeScript code blocks compile
4. **Freshness check** - Flag docs not updated in 90+ days

**Implementation:**
```yaml
# .github/workflows/docs.yml
- name: Check broken links
  uses: lycheeverse/lychee-action@v1
- name: Terminology compliance
  run: npm run compliance:check
```

**Effort:** 4 hours

### V5: Contributor Documentation Path

**Recommendation:** Create clear onboarding documentation path.

**Proposed flow:**
1. README.md (overview, quick start)
2. CONTRIBUTING.md (how to contribute)
3. CLAUDE.md (AI assistant context)
4. docs/development/GETTING-STARTED.md (new file - detailed setup)
5. docs/development/ARCHITECTURE.md (system design)

**Current gap:** No GETTING-STARTED.md with detailed environment setup.

---

## Priority Matrix

### High Priority (Block Alpha)

| Item | Effort | Impact | Owner |
|------|--------|--------|-------|
| CA-1: Fix broken links | 2-4h | Critical | Developer |
| CA-2: README cleanup | 1h | High | Developer |
| CA-3: Expansion status clarity | 30m | High | Developer |

### Medium Priority (This Sprint)

| Item | Effort | Impact | Owner |
|------|--------|--------|-------|
| CA-4: Move terminology audit | 15m | High | Developer |
| CA-5: Archive cleanup | 30m | Medium | Developer |
| CA-6: CLAUDE.md fix | 5m | Medium | Developer |

### Low Priority (Backlog)

| Item | Effort | Impact | Owner |
|------|--------|--------|-------|
| CA-7: Create dev guides | 4-8h | Medium | Developer |
| CA-8: UX doc consolidation | 30m | Low | Developer |
| V1: Doc site generator | 8-16h | High | Post-alpha |
| V2: API docs | 16-24h | Medium | Post-alpha |
| V3: Schema docs | 4-8h | Medium | Post-alpha |
| V4: Doc CI checks | 4h | Medium | Post-alpha |
| V5: Contributor path | 2-4h | Medium | Post-alpha |

---

## Action Items

### Immediate (Today)

- [ ] Fix broken link in TERMINOLOGY.md (reference folder does not exist)
- [ ] Update CLAUDE.md PRD.md reference to GAME-DESIGN.md
- [ ] Update CONTRIBUTING.md PRD.md reference

### This Week

- [ ] Remove duplicate OPEN ITEMS sections from README.md
- [ ] Move terminology-crisis-audit.md to active docs
- [ ] Fix "planet" reference in redesign-2025-12-summary.md
- [ ] Update ROADMAP.md header to clarify implementation status
- [ ] Update index.md - either create missing files or remove broken links

### This Sprint

- [ ] Decide: Create development guides OR update index.md to remove references
- [ ] Consolidate UX improvements documentation
- [ ] Add link checking to CI pipeline

### Post-Alpha

- [ ] Evaluate Docusaurus/MkDocs for documentation site
- [ ] Plan API documentation strategy
- [ ] Add schema documentation

---

## Documentation Statistics

### Current State

| Metric | Value |
|--------|-------|
| Total markdown files | 23 |
| Total lines | 4,004 |
| Core docs | 3 files, 1,013 lines |
| Player guides | 2 files, 512 lines |
| Development docs | 1 file, 58 lines |
| Expansion docs | 4 files, 1,002 lines |
| Brainstorm docs | 5 files, 351 lines |
| Archive docs | 6 files, 750 lines |
| Other (index, issues) | 2 files, 318 lines |

### Broken References Found

| Reference | Location | Status |
|-----------|----------|--------|
| `docs/PRD.md` | CLAUDE.md, CONTRIBUTING.md | Does not exist |
| `docs/development/ARCHITECTURE.md` | index.md | Does not exist |
| `docs/development/FRONTEND-GUIDE.md` | index.md | Does not exist |
| `docs/development/UI-DESIGN.md` | index.md | Does not exist |
| `docs/development/TESTING-GUIDE.md` | index.md | Does not exist |
| `docs/reference/TERMINOLOGY-AUDIT.md` | TERMINOLOGY.md | Folder missing |

### Terminology Compliance

| Area | "planet" References | Status |
|------|---------------------|--------|
| Player guides | 0 | Compliant |
| Core docs | 0 | Compliant |
| Development docs | 0 | Compliant |
| Expansion docs | 0 | Compliant |
| Brainstorm docs | 0 | Compliant |
| Archive docs | 54 | Expected (historical context) |

---

## Recommendations Summary

### Git Hygiene

**Should NOT be committed:**
- Session-specific debug logs (`e2e/debug-log.md`)
- Personal notes or scratch files
- Generated documentation (if using doc site generator)

**Consider .gitignore additions:**
```gitignore
# Documentation build output
docs/_site/
docs/.docusaurus/

# Debug/session files
**/debug-log.md
```

### Folder Structure Recommendation

```
docs/
├── index.md                    # Keep - documentation hub
├── OPEN-ISSUES.md             # Keep - active issue tracking
├── core/                       # Keep - authoritative design docs
│   ├── GAME-DESIGN.md
│   ├── BOT-SYSTEM.md
│   └── COMBAT-SYSTEM.md
├── development/               # Expand - needs more content
│   ├── TERMINOLOGY.md         # Keep
│   ├── ARCHITECTURE.md        # Create or remove from index
│   └── GETTING-STARTED.md     # Create (new)
├── guides/                     # Keep - player documentation
│   ├── HOW-TO-PLAY.md
│   └── QUICK-START.md
├── expansion/                  # Keep with status clarification
│   ├── README.md
│   ├── CRAFTING.md
│   ├── SYNDICATE.md
│   └── ROADMAP.md
├── brainstorm/                 # Keep - experimental ideas
│   └── [concept files]
├── archive/                    # Keep - reduce to historical only
│   └── [historical files]
└── reviews/                    # Keep - review reports
    └── documentation-review.md
```

---

## Conclusion

The Nexus Dominion documentation is well-organized with clear categorization (core, guides, expansion, brainstorm, archive). The main issues are:

1. **Broken links** that make navigation frustrating
2. **README bloat** from accumulated open items
3. **Status confusion** between implemented-but-disabled expansion features

These are all fixable with focused effort. The recommended approach is:

1. **Quick wins first** - Fix broken links and references (2 hours)
2. **Consolidation** - Clean up README duplication (1 hour)
3. **Clarification** - Update expansion status messaging (30 minutes)
4. **Post-alpha** - Invest in documentation infrastructure (doc site, API docs)

The documentation foundation is solid. With the corrective actions above, Nexus Dominion will have alpha-ready documentation that serves both players and contributors effectively.

---

*Report generated by Documentation Engineer Agent*
*Review date: January 7, 2026*

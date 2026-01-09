# Plan: Parallel Agent Review Rollout

## Objective
Launch 4 specialized agents in parallel to conduct independent reviews of Nexus Dominion codebase, producing markdown reports with corrective and visionary recommendations.

## Output Structure
Each agent produces a report in `docs/reviews/`:
```
docs/reviews/
├── architect-review.md
├── documentation-review.md
├── product-review.md
└── qa-review.md
```

## Agent Configurations

### 1. architect-reviewer
**Output**: `docs/reviews/architect-review.md`
**Focus**: System design, code quality, folder structure cleanup

**Key Context to Provide**:
- 425 TS/TSX files across src/
- 30 flat services in `src/lib/game/services/` (no domain grouping)
- 19 component subdirectories in `src/components/game/`
- Duplicate combat systems: `phases.ts`, `unified-combat.ts`, `volley-combat-v2.ts`
- Constants split across `src/lib/constants/` and `src/lib/game/constants/`
- Backup file tracked: `src/lib/db/schema.ts.backup`
- Well-structured: formulas/, bots/, db/ layers

**Review Scope**:
- Folder structure consolidation opportunities
- Technical debt in combat system iterations
- Domain-based grouping recommendations
- Git hygiene (files to exclude)
- Scalability concerns for alpha launch

---

### 2. documentation-engineer
**Output**: `docs/reviews/documentation-review.md`
**Focus**: Documentation cleanup, duplication reduction

**Key Context to Provide**:
- 23 markdown files, 3,686 total lines
- Well-organized: core/, guides/, expansion/, brainstorm/, archive/
- Expansion folder (621 lines) - future features not in v1.0
- Brainstorm folder (351 lines) - unclear status of ideas
- Archive folder (750 lines) - historical, some resolved issues
- CLAUDE.md is comprehensive (500+ lines)
- README.md has open issues section duplicating docs/OPEN-ISSUES.md

**Review Scope**:
- Which docs to consolidate or remove for alpha
- Expansion/brainstorm docs: keep, archive, or defer?
- Documentation gaps (API reference, schema docs, security patterns)
- What should NOT be committed to git
- Streamlining for contributor onboarding

---

### 3. product-manager
**Output**: `docs/reviews/product-review.md`
**Focus**: UX review, marketing potential, launch readiness

**Key Context to Provide**:
- Next.js 14 space strategy game with AI bots
- 8 bot archetypes with emotional states and memory
- Game modes: Oneshot (10-25 bots, 50-100 turns), Campaign (25-100 bots, 150-500 turns)
- Key features: turn-based combat, diplomacy, research, market, covert ops
- Player-facing docs: HOW-TO-PLAY.md (396 lines), QUICK-START.md (116 lines)
- UI components: dashboard, starmap, combat interface, messages
- No formal marketing assets yet

**Review Scope**:
- Alpha playtester experience assessment
- Feature completeness vs. alpha readiness
- Marketing positioning opportunities
- UX friction points to address
- Roadmap recommendations post-alpha
- What features to highlight vs. defer

---

### 4. qa-expert
**Output**: `docs/reviews/qa-review.md`
**Focus**: Testing automation, quality processes, coverage

**Key Context to Provide**:
- 81 unit test files (Vitest)
- 19 E2E test files (Playwright)
- 31/34 services have unit tests (91%)
- **3 UNTESTED critical services**:
  - `attack-validation-service.ts` (13K lines) - security-critical
  - `save-service.ts` (13K lines) - data integrity
  - `victory-service.ts` (17K lines) - endgame logic
- 100% formula test coverage
- 80% coverage threshold target
- E2E: smoke-test, comprehensive-test, milestone-specific tests

**Review Scope**:
- Critical testing gaps to address before alpha
- Quality gates for alpha release
- Test automation improvements
- E2E test organization (19 files - too many?)
- CI/CD pipeline recommendations
- Flaky test identification

---

## Execution Plan

### Step 1: Create output directory
```bash
mkdir -p docs/reviews
```

### Step 2: Launch 4 agents in parallel
All agents run simultaneously with:
- Independent prompts containing relevant context
- Clear output file paths
- Instruction to produce both corrective and visionary recommendations

### Step 3: Deliverables
Each report includes:
1. **Executive Summary** - Key findings overview
2. **Corrective Actions** - Issues to fix for alpha readiness
3. **Visionary Recommendations** - Growth opportunities post-alpha
4. **Priority Matrix** - High/Medium/Low categorization
5. **Action Items** - Specific next steps

---

## Verification
After agents complete:
1. Confirm all 4 reports exist in `docs/reviews/`
2. Validate each report has required sections
3. Reports ready for synthesis in next phase

---

## Notes
- Reports are READ-ONLY artifacts for consultation
- No code changes during this phase
- Synthesis and action planning deferred to user's next prompt

# Remediation Plan - Nexus Dominion

**Generated**: 2026-01-08
**Reports Synthesized**: 13 (code-quality, security, performance, architecture, ux, qa, documentation, dependencies, product, game-balance, player-journey, narrative, game-economy)

---

## Executive Summary

This comprehensive alignment review identified **197 total issues** across 13 domains. The codebase demonstrates solid architectural foundations but has critical gaps in security (admin auth bypass), terminology compliance ("planets" in schema), and testing (6 skipped E2E suites). Immediate action required on 23 critical/high items before production deployment.

| Severity | Count |
|----------|-------|
| Critical | 23 |
| High | 47 |
| Medium | 72 |
| Low | 55 |

---

## 1. Conflicts Identified

Areas where agents disagreed or provided contradictory recommendations:

| Conflict | Agents | Resolution |
|----------|--------|------------|
| Schema split vs monolith | Architecture (split) vs Code-Quality (acceptable) | **Split** - 2571 lines is unmaintainable |
| Cookie session security | Security (critical) vs Architecture (high) | **Critical** - unsigned cookies are exploitable |
| Civil status multiplier range | Game-Economy (too extreme) vs Game-Balance (reasonable) | **Reduce range** - 16x differential causes snowballing |
| Rate limiting priority | Security (high) vs Performance (medium) | **High** - security trumps performance here |

---

## 2. Dependencies Between Fixes

Fixes that must be done in sequence:

```
1. Schema "planets" → "sectors" rename
   └── 2. Update all TypeScript types referencing planets
       └── 3. Update all queries and Server Actions
           └── 4. Run database migration
               └── 5. Update E2E tests

1. Implement signed sessions (iron-session/JWT)
   └── 2. Fix admin authentication bypass
       └── 3. Add verifyEmpireOwnership to all actions
           └── 4. Add rate limiting to remaining actions

1. Batch treaty lookups (N+1 fix)
   └── 2. Add composite indexes
       └── 3. Batch emotional state loading
           └── 4. Performance test with 100 bots
```

---

## 3. Duplicate Findings

Issues identified by multiple agents (confirms priority):

| Issue | Reported By | Combined Severity |
|-------|-------------|-------------------|
| "planets" terminology in schema | Code-Quality, Narrative, Product, Architecture | **CRITICAL** |
| Missing admin auth verification | Security, Architecture | **CRITICAL** |
| N+1 queries in treaty checks | Performance, Architecture | **CRITICAL** |
| Missing verifyEmpireOwnership | Security, Code-Quality | **HIGH** |
| 6 skipped E2E test suites | QA, Product | **HIGH** |
| Math.random() in formulas | Game-Economy, QA | **HIGH** |
| Console.log in production | Code-Quality, Architecture | **MEDIUM** |
| Large GameShell component | Architecture, UX | **MEDIUM** |

---

## 4. Priority Matrix

### P0 - Blockers (Before Any Release)

| # | Issue | Domain | Effort | Impact |
|---|-------|--------|--------|--------|
| 1 | Fix admin auth bypass - verify caller provides secret | Security | 1h | Critical |
| 2 | Rename `planets` table to `sectors` | Narrative/Schema | 4h | Critical |
| 3 | Add verifyEmpireOwnership to syndicate/crafting actions | Security | 2h | Critical |
| 4 | Replace Math.random() with seeded RNG in formulas | Game-Economy | 3h | Critical |
| 5 | Implement signed session tokens | Security | 4h | Critical |

### P1 - High Priority (This Sprint)

| # | Issue | Domain | Effort | Impact |
|---|-------|--------|--------|--------|
| 6 | Batch treaty lookups (fix N+1) | Performance | 4h | High |
| 7 | Add missing composite indexes | Performance | 2h | High |
| 8 | Unskip or fix 6 E2E combat test suites | QA | 8h | High |
| 9 | Replace 92 waitForTimeout with proper waits | QA | 6h | High |
| 10 | Add rate limiting to diplomacy actions | Security | 2h | High |
| 11 | Add transaction boundaries to turn processor | Architecture | 4h | High |
| 12 | Rebalance civil status multipliers (16x → 4x) | Game-Economy | 2h | High |

### P2 - Medium Priority (Next Sprint)

| # | Issue | Domain | Effort | Impact |
|---|-------|--------|--------|--------|
| 13 | Split schema.ts into domain modules | Architecture | 8h | Medium |
| 14 | Extract GameShell into custom hooks | Architecture | 4h | Medium |
| 15 | Add error boundaries to game layout | Product | 2h | Medium |
| 16 | Implement new player tutorial | Player-Journey | 8h | Medium |
| 17 | Update dependencies (Next.js, Drizzle, Playwright) | Dependencies | 4h | Medium |
| 18 | Add resource caps and storage costs | Game-Economy | 4h | Medium |
| 19 | Expand event templates (8 → 25+) | Narrative | 6h | Medium |
| 20 | Complete 100 bot personas | Narrative | 8h | Medium |

### P3 - Low Priority (Backlog)

| # | Issue | Domain | Effort | Impact |
|---|-------|--------|--------|--------|
| 21 | Add bundle analyzer | Dependencies | 1h | Low |
| 22 | Extract hardcoded colors to theme | Code-Quality | 2h | Low |
| 23 | Add keyboard navigation/a11y | UX | 8h | Low |
| 24 | Implement visual regression testing | QA | 8h | Low |
| 25 | Add OpenTelemetry tracing | Performance | 8h | Low |

---

## 5. Quick Wins

High impact, low effort fixes that can be done immediately:

| Fix | File | Time | Impact |
|-----|------|------|--------|
| Fix admin auth - add secret verification | `src/app/actions/admin-actions.ts:23-39` | 30min | Critical |
| Add missing index for messages | `src/lib/db/schema.ts` | 15min | High |
| Hoist UUID regex to module level | `src/lib/game/repositories/combat-repository.ts` | 5min | Low |
| Add engines field to package.json | `package.json` | 5min | Low |
| Remove duplicate SectorsList component | `src/components/game/SectorsList.tsx` | 10min | Medium |
| Add division-by-zero guard in market | `src/lib/game/services/market-service.ts:27` | 10min | Critical |

---

## 6. Grouped Tasks

Related changes that should be batched together:

### Security Hardening Sprint
- [ ] Fix admin authentication bypass
- [ ] Implement signed sessions (iron-session)
- [ ] Add verifyEmpireOwnership to all actions
- [ ] Add rate limiting to remaining endpoints
- [ ] Add CSRF protection to Server Actions
- [ ] Reduce cookie expiration (30d → 7d)

### Performance Optimization Sprint
- [ ] Batch treaty lookups (N+1 fix)
- [ ] Add composite indexes (messages, botTells, attacks)
- [ ] Batch emotional state loading in bot processor
- [ ] Memoize Starmap helper functions
- [ ] Debounce CombatPreview Monte Carlo
- [ ] Add Redis caching layer

### Terminology Migration Sprint
- [ ] Rename planets table → sectors
- [ ] Update all TypeScript types
- [ ] Update all Server Actions
- [ ] Update all UI components
- [ ] Update documentation
- [ ] Run full E2E regression

### Test Quality Sprint
- [ ] Remove direct DB imports from E2E tests
- [ ] Replace waitForTimeout with proper waits
- [ ] Unskip 6 combat E2E suites
- [ ] Add victory condition E2E tests
- [ ] Expand CI to run milestone-core tests
- [ ] Add per-test database isolation

### Game Balance Sprint
- [ ] Reduce civil status range (4x to 0.5x)
- [ ] Replace Math.random() with seeded RNG
- [ ] Connect loot to defender resources
- [ ] Add resource caps and storage costs
- [ ] Fix fundamental research formula
- [ ] Balance covert success rates

---

## 7. Execution Order

Recommended sequence for addressing all findings:

```
Week 1: Security P0s
├── Day 1: Fix admin auth bypass + add verifyEmpireOwnership
├── Day 2: Implement signed sessions
├── Day 3: Add rate limiting to remaining actions
└── Day 4-5: Security regression testing

Week 2: Terminology + Schema
├── Day 1: Rename planets → sectors in schema
├── Day 2: Update TypeScript types and queries
├── Day 3: Update UI components and docs
└── Day 4-5: Migration testing + deployment

Week 3: Performance + Testing
├── Day 1-2: Fix N+1 queries, add indexes
├── Day 3-4: Fix E2E test quality issues
└── Day 5: Performance validation with 100 bots

Week 4: Game Balance + UX
├── Day 1-2: Rebalance economy formulas
├── Day 3: Add seeded RNG to combat
├── Day 4: Implement tutorial flow
└── Day 5: User testing

Ongoing: Dependencies, Documentation, Polish
```

---

## 8. Process Improvement: Agent Workflow

### Issue Encountered

During this review, specialized agents (code-reviewer, security-auditor, etc.) were run with `run_in_background: true` expecting them to write files. However, these agents only have **Read/Grep/Glob** access - no Write tool. This caused:

- **Wasted tokens**: ~500K+ tokens across 22 agent runs (13 initial + 9 retries)
- **Wasted time**: ~15 minutes of unnecessary waiting
- **User frustration**: Escape key did not stop runaway tool calls

### Corrective Actions

1. **Update alignment-review skill**:
   - Use `general-purpose` subagent type (has Write access) OR
   - Run agents synchronously and write files in parent context
   - Never use `run_in_background: true` for agents expected to write files

2. **Add agent capability documentation**:
   - Document which subagent types have which tools
   - Add warnings when Write is required but agent lacks it

3. **Improve interrupt handling**:
   - Honor escape/stop immediately - do not queue additional tool calls
   - Add explicit "stopping..." acknowledgment

4. **Token efficiency**:
   - For multi-agent workflows, validate agent capabilities before launch
   - Consider using single `Explore` agent for comprehensive reviews instead of 13 specialized agents

### Recommended Skill Update

```markdown
# In alignment-review skill prompt:
NOTE: Specialized agents (code-reviewer, security-auditor, etc.) have
READ-ONLY access. Do NOT use run_in_background. Run synchronously and
write files from the parent context using their output.
```

---

## Appendix: Issue Counts by Report

| Report | Critical | High | Medium | Low | Total |
|--------|----------|------|--------|-----|-------|
| code-quality.md | 3 | 6 | 8 | 9 | 26 |
| security.md | 3 | 4 | 6 | 4 | 17 |
| performance.md | 3 | 5 | 6 | 5 | 19 |
| architecture.md | 3 | 5 | 7 | 6 | 21 |
| ux.md | 1 | 3 | 5 | 4 | 13 |
| qa.md | 4 | 5 | 6 | 5 | 20 |
| documentation.md | 2 | 4 | 5 | 3 | 14 |
| dependencies.md | 0 | 5 | 7 | 8 | 20 |
| product.md | 5 | 7 | 10 | 8 | 30 |
| game-balance.md | 2 | 4 | 6 | 5 | 17 |
| player-journey.md | 1 | 3 | 4 | 3 | 11 |
| narrative.md | 4 | 5 | 7 | 8 | 24 |
| game-economy.md | 4 | 6 | 10 | 10 | 30 |

---

**Next Steps**: Begin with Week 1 Security P0s. The admin auth bypass is the most critical - a single line fix that closes a major vulnerability.

# Remediation Plan Phase 2 - Gap Analysis

**Generated**: 2026-01-09
**Source**: Cross-check of REMEDIATION-PLAN.md against 13 individual review reports
**Purpose**: Capture missing action items and dependency gaps before next remediation run

---

## Executive Summary

The original REMEDIATION-PLAN.md captured highest priority security and performance items well, but a systematic cross-check revealed **42 action items that were NOT captured** and **4 critical dependency gaps** that could cause test suite mismatches with code changes.

| Category | Items in Original Plan | Missing Items Found | Gap % |
|----------|----------------------|--------------------|----|
| Security | 10 | 7 | 41% |
| Code Quality | 8 | 8 | 50% |
| Performance | 9 | 5 | 36% |
| Architecture | 7 | 5 | 42% |
| Game Balance | 2 | **10** | **83%** |
| Player Journey | 1 | **9** | **90%** |
| UX/Accessibility | 3 | **9** | **75%** |
| Narrative | 2 | 4 | 67% |
| Product | 5 | 6 | 55% |
| QA/Testing | 6 | 5 | 45% |

---

## CRITICAL: Dependency Gaps That Cause Conflicts

These missing dependencies could cause the exact issue previously experienced (test suite mismatching code changes):

### Gap 1: Game Balance Changes vs Test Suite (HIGH RISK)

**Problem:** The original plan has these as separate items:
- P0 #4: Replace Math.random() with seeded RNG (affects combat outcomes)
- P1 #12: Rebalance civil status multipliers (16x to 4x)
- P1 #8: Unskip/fix E2E combat tests

**Issue:** If balance changes happen BEFORE test assertions are updated, tests will fail with mismatched expected values.

**Required Dependency:**
```
P0 #4 (seeded RNG) + P1 #12 (civil status rebalance)
   └── Must update test assertions SIMULTANEOUSLY
       └── THEN unskip E2E tests (P1 #8)
```

### Gap 2: Session/Auth Changes vs E2E Tests (HIGH RISK)

**Problem:** Original plan items:
- P0 #5: Implement signed session tokens
- P0 #1: Fix admin auth bypass
- P0 #3: Add verifyEmpireOwnership

**Issue:** E2E tests currently use cookie-based session mechanism. If signed sessions are implemented, **all E2E tests will break** until their authentication helpers are updated.

**Required Dependency:**
```
P0 #5 (signed sessions) + P0 #1 (admin auth) + P0 #3 (ownership)
   └── Update E2E auth fixtures SIMULTANEOUSLY
       └── Run E2E regression to validate
```

### Gap 3: Combat E2E Tests to Combat Consolidation (MISSING FROM PLAN)

**Problem:** REVIEW-TODO.md correctly identifies:
```
TODO-009 (Combat edge case E2E tests)
    └── TODO-006 (Combat consolidation - remove deprecated code)
```

**Issue:** This dependency is NOT in REMEDIATION-PLAN.md Section 2. Combat consolidation is not even in the priority matrix.

**Required Addition to Section 2:**
```
Combat E2E Tests → Combat Consolidation
   └── Complete and pass combat edge case E2E tests
       └── THEN remove deprecated combat code
```

### Gap 4: Terminology in Unit Tests vs Schema Migration

**Problem:** Documentation review identifies 6+ test files with "planet" terminology:
- `src/lib/game/services/__tests__/resource-engine.test.ts` - uses `createMockPlanet`
- `src/lib/game/networth.test.ts` - uses `planetsOnly`, `planetNetworth`
- `src/lib/game/services/__tests__/coalition-service.test.ts` - uses `coalitionPlanets`
- `src/lib/combat/__tests__/coalition-raid-service.test.ts` - uses `withPlanets`
- `src/lib/bots/__tests__/bot-generator.test.ts` - uses `EXPECTED_STARTING_PLANETS`
- `src/lib/game/services/geography/influence-sphere-service.ts` - uses `NEIGHBORS_PER_PLANETS`

**Issue:** Original plan says "Update E2E tests" but doesn't mention unit test files. These should be updated BEFORE or SIMULTANEOUSLY with schema rename.

**Required Dependency:**
```
Update unit test "planet" terminology (6 files)
   └── Update E2E test "planet" terminology
       └── THEN rename schema table planets → sectors
           └── Run full test regression
```

---

## Missing Action Items by Category

### Security (7 Missing Items)

| # | Issue | Source | File:Line | Severity | Status |
|---|-------|--------|-----------|----------|--------|
| SEC-M1 | Empire cookie manipulation - `resumeCampaignAction()` allows resuming ANY campaign | security.md | game-actions.ts:324-367 | High | |
| SEC-M2 | `getAvailableContractsAction()` lacks explicit authorization | security.md | syndicate-actions.ts:147-220 | Medium | |
| SEC-M3 | Quantity limit inconsistency (100, 1000, 1M across actions) | security.md | Multiple Actions | Medium | |
| SEC-M4 | Error message leakage passes raw error.message to client | security.md | combat-actions.ts:182-186 | Medium | |
| SEC-M5 | SSE endpoint doesn't validate request origin header | security.md | api/game/stream/route.ts:33-176 | Medium | |
| SEC-M6 | Raw SQL with `sql.raw()` pattern is dangerous | security.md | admin-actions.ts:386 | Critical | [COMPLETED 2026-01-09] |
| SEC-M7 | Hardcoded cookie names duplicated across 15+ files | security.md | Multiple Files | Low | |

### Code Quality (8 Missing Items)

| # | Issue | Source | File:Line | Severity | Status |
|---|-------|--------|-----------|----------|--------|
| CQ-M1 | **Incomplete TODO `componentsReserved: {}`** - crafting may not reserve components | code-quality.md | bot-actions.ts:423 | Critical | [COMPLETED 2026-01-09] |
| CQ-M2 | TODO comments for unimplemented features (covert ops, research, upgrades) | code-quality.md | decision-engine.ts:55,701-709 | High | |
| CQ-M3 | Emotional decay failures silently skip processing for bots | code-quality.md | turn-processor.ts:203-208 | High | |
| CQ-M4 | Excessive type assertions reduce type safety | code-quality.md | Multiple files | High | |
| CQ-M5 | `processEmpireTurn` is 377 lines - should be split | code-quality.md | turn-processor.ts:496-873 | Medium | |
| CQ-M6 | Inconsistent error handling (throw vs return { success: false }) | code-quality.md | combat-actions.ts | Medium | |
| CQ-M7 | Missing JSDoc on public API constants | code-quality.md | effectiveness.ts | Medium | |
| CQ-M8 | Complex switch in executeBotDecision could use strategy pattern | code-quality.md | bot-actions.ts:48-77 | Medium | |

### Performance (5 Missing Items)

| # | Issue | Source | File:Line | Severity | Status |
|---|-------|--------|-----------|----------|--------|
| PERF-M1 | **Sequential DB inserts in loop** - initializeMarketPrices | performance.md | market-service.ts:78-91 | Critical | [COMPLETED 2026-01-09] |
| PERF-M2 | Sequential DB queries should use Promise.all | performance.md | treaty-service.ts:199-205 | High | |
| PERF-M3 | 4 sequential DB queries could be parallelized | performance.md | starmap-actions.ts:346-378 | High | |
| PERF-M4 | Sequential awaits in loop for memory cleanup | architecture.md | bot-memory-repository.ts:401-403 | High | |
| PERF-M5 | react-window installed but not used for large lists | performance.md | package.json:55 | Low | |

### Architecture (5 Missing Items)

| # | Issue | Source | File:Line | Severity |
|---|-------|--------|-----------|----------|
| ARCH-M1 | Parallel empire processing race conditions - bot phase reads stale data | architecture.md | turn-processor.ts:161-178 | High |
| ARCH-M2 | Duplicate military power calculations | architecture.md | turn-actions.ts:250-256, 389-395 | Medium |
| ARCH-M3 | Type safety gaps with JSON columns (no runtime validation) | architecture.md | schema.ts:707-708 | Medium |
| ARCH-M4 | SSE reconnection without deduplication | architecture.md | useGameStateStream.ts:151-178 | Medium |
| ARCH-M5 | Hardcoded constants mixed with getLegacyConfig() | architecture.md | combat-power.ts:40-52 | High |

### Game Balance (10 Missing Items - MAJOR GAP)

| # | Issue | Source | File:Line | Severity | Status |
|---|-------|--------|-----------|----------|--------|
| BAL-M1 | **Research cost scaling too steep** - RESEARCH_GROWTH_RATE = 2.0 means level 10 costs 1,024,000 RP | game-balance.md | research-costs.ts:17 | Critical | [COMPLETED 2026-01-09] |
| BAL-M2 | **Carrier combat effectiveness is ZERO** - 2500 credit units contribute nothing | game-balance.md | effectiveness.ts:89-95 | Critical | [COMPLETED 2026-01-09] |
| BAL-M3 | **Civil status "revolting" = instant defeat** - no recovery mechanism | game-balance.md | conditions.ts:318-319 | Critical | [COMPLETED 2026-01-09] |
| BAL-M4 | **Nuclear weapon cost 500M** vs starting 100K - effectively unobtainable | game-balance.md | nuclear.ts:19 | Critical | [COMPLETED 2026-01-09] |
| BAL-M5 | Sector cost scaling creates prohibitive late-game costs (3.5x at 50 sectors) | game-balance.md | sector-costs.ts:14 | High | |
| BAL-M6 | **Food consumption > production at start** - new players begin in deficit | game-balance.md | population.ts:15-18 | High | [COMPLETED 2026-01-09] |
| BAL-M7 | Military victory threshold 2x ALL empires combined - nearly impossible | game-balance.md | conditions.ts:83 | High | [COMPLETED 2026-01-09] |
| BAL-M8 | Station power inconsistency (30 vs 50) between systems | game-balance.md | combat-config.json:3-9, 29-36 | High | [COMPLETED 2026-01-09] |
| BAL-M9 | Underdog bonus threshold may be too generous | game-balance.md | combat-config.json:10-13 | High | |
| BAL-M10 | Fundamental research victory requires 10,000 research sectors | game-economy.md | research.ts:57-60 | Medium | |

### Player Journey (9 Missing Items - MAJOR GAP)

| # | Issue | Source | File:Line | Severity | Status |
|---|-------|--------|-----------|----------|--------|
| PJ-M1 | **Tutorial and Welcome Modal conflict on Turn 1** - competing UI elements | player-journey.md | GameShell.tsx:181-216 | Critical | [COMPLETED 2026-01-09] (Already fixed in P2-16) |
| PJ-M2 | **Onboarding hints obscure gameplay** - 3+ overlapping tutorial elements | player-journey.md | OnboardingManager.tsx:36-141 | Critical | |
| PJ-M3 | **No guided first action** - tutorial describes but doesn't guide player to DO | player-journey.md | TutorialOverlay.tsx:85-139 | Critical | |
| PJ-M4 | **Victory conditions inconsistency** - landing page shows 3, tutorial shows 6 | player-journey.md | page.tsx:86-93 vs TutorialOverlay | Critical | |
| PJ-M5 | Screenshot placeholders on landing page ("Add image to /public/screenshots/") | player-journey.md | page.tsx:164-224 | High | |
| PJ-M6 | New game form lacks context - no recommended settings for beginners | player-journey.md | game/page.tsx:86-140 | High | |
| PJ-M7 | Quick Reference Modal not discoverable (only via ? key) | player-journey.md | QuickReferenceModal.tsx | High | |
| PJ-M8 | Mobile onboarding incomplete - desktop tutorial may not render on mobile | player-journey.md | MobileBottomBar.tsx | High | |
| PJ-M9 | No first-turn guided checklist - 8+ actions with no priority indication | player-journey.md | TurnOrderPanel.tsx:169-230 | High | |

### UX/Accessibility (9 Missing Critical/High Items)

| # | Issue | Source | File:Line | Severity |
|---|-------|--------|-----------|----------|
| UX-M1 | Number inputs lack accessible labels (id/for or aria-label) | ux.md | combat/page.tsx:223-239 | Critical |
| UX-M2 | Interactive elements without accessible names (carousel buttons) | ux.md | page.tsx:198-206 | Critical |
| UX-M3 | **Color-only status indicators** - no support for colorblind users | ux.md | MobileBottomBar.tsx:30-42 | Critical |
| UX-M4 | Error messages not associated with form fields via aria-describedby | ux.md | BuildUnitsPanel.tsx:121-130 | Critical |
| UX-M5 | **Touch targets 8px** - WCAG requires 44px minimum | ux.md | page.tsx:212-221 | Critical |
| UX-M6 | Accordion lacks proper ARIA roles (tablist, aria-expanded, aria-controls) | ux.md | page.tsx:133-161 | High |
| UX-M7 | Missing skip-to-content link | ux.md | layout.tsx:23-37 | High |
| UX-M8 | Mobile action sheet lacks focus management (no trap/auto-focus) | ux.md | MobileActionSheet.tsx:174-308 | High |
| UX-M9 | Range sliders don't announce current value to screen readers | ux.md | AttackInterface.tsx:300-308 | High |

### Narrative (4 Missing Items)

| # | Issue | Source | File:Line | Severity |
|---|-------|--------|-----------|----------|
| NAR-M1 | **Missing message templates directory** (data/templates/) | narrative.md | data/templates/ | Critical |
| NAR-M2 | No lore/backstory for 8 archetypes | narrative.md | archetypes/*.ts | High |
| NAR-M3 | Bot personas use placeholder generation ("Commander Alpha-7") | narrative.md | persona-generator.ts:17-43 | High |
| NAR-M4 | Civil status labels lack narrative depth (functional not thematic) | narrative.md | civil-status.ts:12-33 | High |

### Product (6 Missing Items)

| # | Issue | Source | File:Line | Severity |
|---|-------|--------|-----------|----------|
| PROD-M1 | **Victory conditions untested in E2E** | product.md | victory/conditions.ts | Critical |
| PROD-M2 | **No user registration/login flow** - src/app/(auth) doesn't exist | product.md | src/app/(auth) | Critical |
| PROD-M3 | **LLM bot integration incomplete** - Tier 1 returns placeholder decisions | product.md | archetypes/index.ts:45-60 | Critical |
| PROD-M4 | Missing game save/load functionality | product.md | game-actions.ts | High |
| PROD-M5 | Syndicate system is placeholder only ("Coming Soon" UI) | product.md | syndicate/page.tsx | High |
| PROD-M6 | No analytics/telemetry for user behavior | product.md | Entire codebase | High |

### QA/Testing (5 Missing Items)

| # | Issue | Source | File:Line | Severity |
|---|-------|--------|-----------|----------|
| QA-M1 | Large coverage exclusion list undermines 80% threshold (60+ files) | qa.md | vitest.config.ts:16-112 | Critical |
| QA-M2 | No retry mechanism for unit tests (unlike Playwright retries: 2) | qa.md | vitest.config.ts | High |
| QA-M3 | Missing E2E test for error states - no real error injection | qa.md | combat-edge-cases.spec.ts:1017-1033 | High |
| QA-M4 | Conditional test skips hide failures (test.skip when gameId null) | qa.md | crafting-system.spec.ts:85,98,166 | High |
| QA-M5 | 22 TODO/FIXME/HACK comments in production code | qa.md | Multiple files in src/lib/ | Medium |

### Game Economy (4 Missing Items - beyond what's captured)

| # | Issue | Source | File:Line | Severity |
|---|-------|--------|-----------|----------|
| ECON-M1 | **Loot calculation ignores target wealth** - hardcoded `5000 * lootMultiplier` | game-economy.md | combat-service.ts:117-122 | Critical |
| ECON-M2 | Exponential sector cost scaling (1.15^n) creates prohibitive late-game | game-economy.md | sector-costs.ts:25 | High |
| ECON-M3 | **Covert success rate too high** - 70% base with 1.5x modifier | game-economy.md | covert-service.ts:36-47 | High |
| ECON-M4 | Research compounding creates runaway (+10% per level compounds) | game-economy.md | research-service.ts:43-51 | High |

---

## Items Needing More Specificity in Original Plan

### P1 #8 "Unskip or fix 6 E2E combat test suites"

The 6 skipped suites are (from qa.md):
1. Protection Period tests - `combat-edge-cases.spec.ts:152`
2. Influence Sphere tests - `combat-edge-cases.spec.ts:248`
3. Treaty Violation tests - `combat-edge-cases.spec.ts:330`
4. Invalid Attack tests - `combat-edge-cases.spec.ts:408`
5. Combat UI State tests - `combat-edge-cases.spec.ts:500`
6. Combat Execution tests - `combat-edge-cases.spec.ts:591`

### P2 #17 "Update dependencies"

Original lists: Next.js, Drizzle, Playwright

Full list from dependencies.md:
- Next.js 15.1.6 → 15.3.4 (High)
- TypeScript 5.7.2 → 5.8.3 (High)
- Drizzle ORM 0.38.3 → 0.44.2 (High)
- Drizzle Kit 0.30.1 → 0.31.1 (High)
- Playwright 1.49.1 → 1.52.0 (High)
- Vitest 2.1.8 → 3.2.3 (Medium - major version)
- ESLint 9.17.0 → 9.28.0 (Medium)
- @types/node 22.10.2 → 22.15.29 (Medium)
- date-fns 4.1.0 → 4.3.0 (Medium)

### Terminology Sprint - Missing Unit Test Files

Original plan mentions UI components but not these 6 test files:
1. `src/lib/game/services/__tests__/resource-engine.test.ts` - `createMockPlanet`
2. `src/lib/game/networth.test.ts` - `planetsOnly`, `planetNetworth`
3. `src/lib/game/services/__tests__/coalition-service.test.ts` - `coalitionPlanets`
4. `src/lib/combat/__tests__/coalition-raid-service.test.ts` - `withPlanets`
5. `src/lib/bots/__tests__/bot-generator.test.ts` - `EXPECTED_STARTING_PLANETS`
6. `src/lib/game/services/geography/influence-sphere-service.ts` - `NEIGHBORS_PER_PLANETS`

---

## Recommended Additions to Grouped Tasks

### New Sprint: Game Balance Sprint (Missing from original)

- [x] Reduce research cost growth rate (2.0 → 1.5) [COMPLETED 2026-01-09]
- [x] Give carriers combat effectiveness (at least 0.5 in space phase) [COMPLETED 2026-01-09]
- [x] Add civil status recovery mechanism (prevent instant defeat cascade) [COMPLETED 2026-01-09]
- [x] Scale nuclear weapon cost to game economy (500M → 50M or progressive unlock) [COMPLETED 2026-01-09]
- [x] Fix starting food deficit (add 1 food sector or reduce FOOD_PER_CITIZEN) [COMPLETED 2026-01-09]
- [x] Reduce military victory threshold (2.0x → 1.5x) [COMPLETED 2026-01-09]
- [x] Unify station power values between combat systems [COMPLETED 2026-01-09]
- [ ] Connect loot to defender resources (already in plan - reinforce)

### New Sprint: Player Onboarding Sprint (Missing from original)

- [x] Resolve Turn 1 modal conflict (sequence or merge Tutorial + Welcome) [COMPLETED 2026-01-09]
- [ ] Add guided first actions to tutorial (not just describe - DO)
- [ ] Synchronize victory conditions (landing page vs tutorial)
- [ ] Add screenshots to landing page carousel
- [ ] Add "Quick Start" recommended settings button
- [ ] Add visible ? button for Quick Reference
- [ ] Create mobile-optimized tutorial variant
- [ ] Add first-turn priority guidance badges

### New Sprint: Accessibility Sprint (Missing from original)

- [ ] Add accessible labels to all form inputs
- [ ] Add aria-labels to icon-only buttons
- [ ] Implement non-color status indicators (icons/patterns)
- [ ] Connect error messages via aria-describedby
- [ ] Increase touch targets to 44px minimum
- [ ] Add ARIA accordion attributes
- [ ] Add skip-to-content link
- [ ] Add focus management to mobile action sheet

### Addition to Test Quality Sprint

- [ ] Update 6 unit test files with "planet" terminology BEFORE schema migration
- [ ] Update E2E auth fixtures when implementing signed sessions
- [ ] Update test assertions when changing balance values (RNG, civil status)
- [ ] Add retry mechanism to Vitest config
- [ ] Add real error injection to E2E error state tests

---

## Revised Execution Order Recommendation

```
Week 1: Security P0s (unchanged)
├── Day 1: Fix admin auth bypass + add verifyEmpireOwnership
├── Day 2: Implement signed sessions
├── Day 3: Add rate limiting + UPDATE E2E AUTH FIXTURES SIMULTANEOUSLY
└── Day 4-5: Security regression testing

Week 2: Terminology + Schema (REVISED)
├── Day 1: Update 6 UNIT TEST files with planet→sector terminology
├── Day 2: Update E2E test terminology
├── Day 3: Rename planets → sectors in schema
├── Day 4: Update TypeScript types and queries
└── Day 5: Migration testing + full test regression

Week 3: Game Balance + Test Sync (NEW)
├── Day 1: Implement seeded RNG + UPDATE TEST ASSERTIONS SIMULTANEOUSLY
├── Day 2: Rebalance civil status (16x → 4x) + UPDATE TEST ASSERTIONS
├── Day 3: Fix food deficit, carrier effectiveness, research scaling
├── Day 4: Fix nuclear costs, victory thresholds
└── Day 5: Balance validation with 50-bot game

Week 4: Performance + Combat (adjusted)
├── Day 1-2: Fix N+1 queries, add indexes, batch operations
├── Day 3: Combat E2E tests (must pass before consolidation)
├── Day 4: Combat consolidation (remove deprecated code)
└── Day 5: Performance validation with 100 bots

Week 5: Player Onboarding + UX
├── Day 1-2: Resolve tutorial conflicts, add guided actions
├── Day 3: Add recommended settings, quick reference button
├── Day 4: Accessibility fixes (labels, ARIA, touch targets)
└── Day 5: User testing

Ongoing: Dependencies, Documentation, Narrative
```

---

## Summary

**Key Insight:** The original plan's biggest gaps are:

1. **Game Balance (83% missing)** - Only civil status multipliers captured; research, carriers, nuclear, food, victory thresholds all missing
2. **Player Journey (90% missing)** - Only tutorial mentioned; onboarding conflicts and guided actions missing
3. **UX/Accessibility (75% missing)** - Critical WCAG violations not captured
4. **Test Synchronization** - Dependencies between code changes and test assertions not established

**Critical Action:** Before any agent works on balance changes, auth changes, or combat consolidation, ensure corresponding test updates are in the SAME task or explicitly sequenced.

---

*Phase 2 Gap Analysis completed: 2026-01-09*
*Reviewer: Cross-check Analysis*
*Input: 13 individual review reports + REMEDIATION-PLAN.md*

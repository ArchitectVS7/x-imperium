# Alpha Readiness Code Review Plan
## Nexus Dominion: Deep Dive Code Review

**Created**: January 5, 2026
**Status**: IN PROGRESS - Agent Reviews Running
**Goal**: Comprehensive code review for alpha testing readiness

---

## Codebase Overview

| Metric | Value |
|--------|-------|
| Total Source Files | 320 |
| Lines of Code | ~111,291 |
| Unit Test Files | 91 |
| E2E Test Files | 18 |
| Coverage Target | 80% |

### Key Areas by Size
| Area | LOC | Files | Complexity |
|------|-----|-------|------------|
| Game Components | 17,264 | 50+ | High (UI/UX) |
| Game Services | 15,596 | 32 | High (Business Logic) |
| Server Actions | 8,375 | 22 | Medium (Validation) |
| Bot AI System | 7,103 | 20+ | Very High (AI) |
| Combat System | 4,059 | 8 | High (D20 Mechanics) |
| Database Schema | 2,564 | 1 | Medium (30+ tables) |
| Formulas | 1,121 | 12 | Low (Pure functions) |

---

## Review Objectives

Prepare for alpha testing by identifying:
1. **Efficiency Issues** - Performance bottlenecks, inefficient algorithms
2. **Safety Concerns** - Security vulnerabilities, input validation gaps
3. **Endless Loops** - Potential infinite loops, recursion issues
4. **UX Problems** - User experience blockers, accessibility issues
5. **Best Practices** - Code quality, patterns, maintainability
6. **Dead Code** - Unused exports, unreachable code paths
7. **Outdated Dependencies** - Security vulnerabilities, deprecated packages

### Priority Focus Areas (User Specified)
1. **Bot AI System** - Decision engine, bot processor, archetypes
2. **Combat System** - D20 combat, phases, volley system
3. **Turn Processing** - Turn processor, game services
4. **User Interface** - All game functions accessible, easy to follow game flow

---

## Specialized Agent Assignments

### Agent 1: Code Reviewer
**Focus**: Code quality, best practices, dead code, potential bugs
**Areas to Review**:
- `src/lib/game/services/` - Turn processor, combat service
- `src/lib/bots/` - Decision engine, bot processor
- `src/lib/combat/` - Combat phases, volley system
- `src/components/game/` - Large components (GameShell, MobileActionSheet)

**Looking For**:
- Dead code and unused exports
- Potential infinite loops
- Error handling gaps
- Type safety issues
- Code duplication
- Complex functions needing refactoring

### Agent 2: Security Auditor
**Focus**: Security vulnerabilities, authorization, input validation
**Areas to Review**:
- `src/app/actions/` - All server actions
- `src/lib/security/` - Security utilities
- `src/lib/db/schema.ts` - Database schema
- API routes and data flow

**Looking For**:
- Missing input validation
- Authorization bypasses
- SQL injection risks
- XSS vulnerabilities
- Insecure data exposure
- Rate limiting gaps

### Agent 3: Performance Engineer
**Focus**: Efficiency, bottlenecks, optimization opportunities
**Areas to Review**:
- `src/lib/game/services/turn-processor.ts` - Turn processing
- `src/lib/bots/bot-processor.ts` - Bot parallel processing
- `src/components/game/` - Render performance
- Database queries and N+1 problems

**Looking For**:
- O(n²) or worse algorithms
- Unnecessary re-renders
- Memory leaks
- Database query optimization
- Async/await anti-patterns
- Large bundle sizes

### Agent 4: Dependency Manager
**Focus**: Outdated dependencies, security vulnerabilities
**Areas to Review**:
- `package.json` - All dependencies
- `package-lock.json` - Locked versions
- Known CVEs in dependency tree

**Looking For**:
- Outdated packages with security fixes
- Deprecated packages
- Unnecessary dependencies
- Version conflicts

### Agent 5: UX Reviewer (Added per user request)
**Focus**: Game flow, accessibility, user experience
**Areas to Review**:
- `src/components/game/` - All game UI components
- `src/components/game/onboarding/` - Tutorial system
- `src/components/game/navigation/` - Navigation components
- Mobile responsiveness (MobileActionSheet, MobileBottomBar)

**Looking For**:
- Confusing or hidden game functions
- Poor navigation flow
- Accessibility issues (keyboard nav, screen readers)
- Mobile usability problems
- Missing feedback for user actions
- Unclear game state indicators

---

## Review Status

| Agent | Status | Findings |
|-------|--------|----------|
| Code Reviewer | ✅ Complete | 2 Critical, 6 High, 6 Medium, 5 Low |
| Security Auditor | ✅ Complete | 2 Critical, 3 High, 5 Medium, 3 Low |
| Performance Engineer | ✅ Complete | 3 Critical, 4 High, 4 Medium, 2 Low |
| Dependency Manager | ✅ Complete | 0 Critical, 2 High, 8 Medium, 12 Low |
| UX Reviewer | ✅ Complete | 3 Critical, 5 High, 7 Medium, 8 Low |

---

## Findings Summary

### 🔴 CRITICAL Issues (Must Fix Before Alpha)

#### Code Quality
1. **Dead backup file** - `src/lib/bots/types-m10-bak.ts` contains stale types, will cause errors if imported
2. **Unused loop variable** - `volley-combat-v2.ts:502` - `rollIndex` never incremented, breaks deterministic testing

#### Security
3. **Admin actions lack auth** - `admin-actions.ts` has `deleteAllGamesAction`, `truncateAllTablesAction` with NO authentication
4. **IDOR vulnerability** - `getAttackDetailsAction` allows viewing any attack without ownership check

#### Performance
5. **Sequential empire processing** - `turn-processor.ts:163-178` processes empires in loop with `await`, should parallelize
6. **N+1 queries in resourceInventory** - `turn-processor.ts:1026-1059` separate query per resource type
7. **Sequential wormhole updates** - `turn-processor.ts:1238-1300` individual DB calls per wormhole

#### UX/Accessibility
8. **No focus trapping in modals** - TurnSummaryModal, MessageInbox dialogs allow focus escape
9. **SlideOutPanel missing dialog role** - No `role="dialog"` or `aria-modal="true"`
10. **Missing loading states** - Critical actions lack feedback during async operations

### 🟠 HIGH Priority (Fix Before Alpha)

#### Code Quality
- Console.log statements in production code (decision-engine.ts, llm files)
- Missing decision types in `selectDecisionType` (covert_operation, fund_research, upgrade_units)
- Incomplete black market purchase (bots pay but don't receive items)
- Hardcoded crafting queue stub (TODO not implemented)
- `any` type usage in admin-actions.ts (lines 50, 52, 153, etc.)
- Double random call in grudge targeting (non-deterministic)

#### Security
- Inconsistent authorization checks (only 3/19 actions use `verifyEmpireOwnership`)
- Rate limiting only on combat actions (not turn, nuclear, market, messaging)
- Missing `secure: true` on cookies

#### Performance
- N+1 queries in save-service `createFullSnapshot` (75 queries for 25 empires)
- Crafting queue processing per empire (sequential DB ops)
- Turn order panel makes duplicate queries
- 30-second polling instead of push updates

#### UX/Accessibility
- Native `confirm()` for destructive actions (treaties, clear data)
- StarMap not keyboard accessible (no tabindex/keyboard handlers)
- Missing ARIA live regions for dynamic content
- Unclear carrier/soldier relationship in combat UI

### 🟡 MEDIUM Priority (Fix During Alpha)

#### Code Quality
- TODO comments indicating incomplete features (4+ locations)
- Dead code phase stubs in turn-processor
- Magic numbers in combat system
- High cyclomatic complexity in processTurn/processEmpireTurn

#### Security
- `sql.raw()` usage in admin actions (safe now, fragile)
- Missing UUID validation in syndicate actions
- Missing content sanitization in coalition names
- In-memory rate limiter won't work with horizontal scaling

#### Performance
- SectorBox filters same array 3 times per render
- Dynamic imports in hot path (decision-engine Tier 1)
- Missing composite database indexes

#### UX/Accessibility
- Tutorial skip button placement issues
- Mobile action sheet lacks semantic grouping
- Input fields accept invalid values before clamping
- Color contrast issues (gray-on-gray text)

### 🟢 LOW Priority (Nice to Have)

- Code duplication in military power calculation
- Missing JSDoc on exported functions
- Test files with console.log statements
- Minor dependency updates available
- Tooltip touch device considerations
- Phase indicator label truncation

---

## Action Items - Prioritized

### Before Alpha Launch (P0)
| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | Delete backup file | `types-m10-bak.ts` | Delete file |
| 2 | Admin auth | `admin-actions.ts` | Add auth check or move to protected route |
| 3 | IDOR fix | `combat-actions.ts:373` | Add ownership verification |
| 4 | Parallelize turns | `turn-processor.ts:163` | Use `Promise.all` |
| 5 | Batch resource updates | `turn-processor.ts:1026` | Use upsert pattern |
| 6 | Focus trapping | `TurnSummaryModal.tsx` | Add focus-trap library |
| 7 | Dialog role | `SlideOutPanel.tsx` | Add `role="dialog"` |

### First Week of Alpha (P1)
| # | Issue | File | Fix |
|---|-------|------|-----|
| 8 | Remove console.logs | `decision-engine.ts` | Replace with logger |
| 9 | Add missing decisions | `decision-engine.ts:589` | Add 3 missing types |
| 10 | Standardize auth | All actions | Use `verifyEmpireOwnership` |
| 11 | Expand rate limiting | All state-changing actions | Apply rate limits |
| 12 | Custom confirm modal | `DiplomacyPanel.tsx` etc. | Create reusable component |
| 13 | Keyboard starmap | `SectorBox.tsx` | Add tabindex + handlers |

### During Alpha (P2)
| # | Issue | File | Fix |
|---|-------|------|-----|
| 14 | Batch save queries | `save-service.ts` | Use `IN` clause |
| 15 | Add ARIA live | Various | Add `aria-live` regions |
| 16 | Fix double random | `decision-engine.ts:796` | Store random value |
| 17 | Add composite indexes | `schema.ts` | Add 3 indexes |
| 18 | Regenerate package-lock | `package-lock.json` | `rm && npm install` |

---

## Dependencies Status

✅ **0 Security Vulnerabilities** - `npm audit` clean
⚠️ **Package-lock mismatch** - Regenerate before alpha
📦 **Major updates available** - Next.js 15, React 19 (defer to beta)

---

## Summary Metrics

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Code Quality | 2 | 6 | 6 | 5 | 19 |
| Security | 2 | 3 | 5 | 3 | 13 |
| Performance | 3 | 4 | 4 | 2 | 13 |
| Dependencies | 0 | 2 | 8 | 12 | 22 |
| UX/Accessibility | 3 | 5 | 7 | 8 | 23 |
| **TOTAL** | **10** | **20** | **30** | **30** | **90** |

**Alpha Readiness**: Fix 10 critical + 20 high priority items before launch

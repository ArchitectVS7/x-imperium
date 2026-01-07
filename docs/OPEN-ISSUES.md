# Open Issues - Alpha Readiness

**Last Updated:** 2026-01-07
**Source:** Five Agent Code Review (Re-run)
**Status:** All CRITICAL and HIGH issues resolved

---

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| Critical | 0 | ✅ All resolved |
| High | 0 | ✅ All resolved |
| Medium | 13 | 🟡 In progress |
| Low | 8 | ⚪ Backlog |

---

## Medium Priority Issues

### Security

#### SEC-M1: Message Actions Accept IDs as Parameters
- **File:** `src/app/actions/message-actions.ts`
- **Risk:** Potential IDOR - users could read/modify other players' messages
- **Affected Functions:**
  - `getInboxAction(gameId, playerId)` - line 105
  - `getInboxSummaryAction(gameId, playerId)` - line 152
  - `markAllMessagesReadAction(gameId, playerId)` - line 249
  - `triggerGreetingsAction(gameId, playerId)` - line 282
- **Fix:** Add `verifyEmpireOwnership` checks or remove parameter-based variants
- **Status:** 🟡 Open

#### SEC-M2: Diplomacy/Market Actions Accept IDs as Parameters
- **Files:**
  - `src/app/actions/diplomacy-actions.ts`
  - `src/app/actions/market-actions.ts`
- **Risk:** Potential IDOR - callers could pass arbitrary IDs
- **Affected Functions:**
  - `getDiplomacyStatusAction(gameId, empireId)`
  - `getDiplomacyTargetsAction(gameId, empireId)`
  - `proposeTreatyAction(gameId, proposerId, ...)`
  - `getMarketStatusAction(gameId, empireId)`
- **Fix:** Use cookie-based session for empireId/gameId, verify ownership
- **Status:** 🟡 Open

#### SEC-M3: endTurnEnhancedAction Missing Authorization
- **File:** `src/app/actions/turn-actions.ts:514`
- **Risk:** Authorization bypass - unlike `endTurnAction`, lacks verification
- **Fix:** Add `verifyEmpireOwnership` and `checkRateLimit` calls
- **Status:** 🟡 Open

#### SEC-M4: In-Memory Rate Limiter Scaling Limitation
- **File:** `src/lib/security/rate-limiter.ts`
- **Risk:** Rate limits not shared across server instances
- **Note:** Documented in file with production recommendations
- **Fix:** Implement Redis-based rate limiting for horizontal scaling
- **Status:** 🟡 Acknowledged (acceptable for alpha/single-server)

---

### Performance

#### PERF-M1: 30-Second Polling Not Replaced with SSE
- **File:** `src/components/game/GameShell.tsx:147`
- **Impact:** Unnecessary server load, higher latency for updates
- **Current:** `setInterval(refreshLayoutData, 30000)`
- **Fix:** Implement Server-Sent Events (SSE) for push updates
- **Status:** 🟡 Open

#### PERF-M2: Dynamic Imports in Tier 1 LLM Hot Path
- **File:** `src/lib/bots/decision-engine.ts:1269-1292`
- **Impact:** Module resolution overhead per Tier 1 bot decision
- **Affected Imports:**
  - `@/lib/llm/cache`
  - `@/lib/llm/client`
  - `@/lib/llm/prompts/tier1-prompt`
  - `@/lib/llm/response-parser`
  - `@/lib/llm/cost-tracker`
  - `@/lib/llm/constants`
  - `@/data/personas.json`
- **Also:** `src/lib/bots/bot-processor.ts:357`
- **Fix:** Convert to static imports at module top
- **Status:** 🟡 Open

#### PERF-M3: Sequential Border Discovery Updates
- **File:** `src/lib/game/services/border-discovery-service.ts:173-190`
- **Impact:** Linear time O(n) for border updates (typically 2-5 per turn)
- **Fix:** Use `Promise.all()` for parallel DB updates
- **Status:** 🟡 Open

#### PERF-M4: Sequential Event Effect Application
- **File:** `src/lib/game/services/event-service.ts:162-165`
- **Impact:** O(effects × empires) sequential operations
- **Fix:** Batch empire updates within each effect type
- **Status:** 🟡 Open

---

### Code Quality

#### CODE-M1: Decision Handlers Return do_nothing
- **File:** `src/lib/bots/decision-engine.ts:695-701`
- **Impact:** Bot turns wasted when these decision types selected
- **Affected Types:**
  - `covert_operation` - returns `{ type: "do_nothing" }`
  - `fund_research` - returns `{ type: "do_nothing" }`
  - `upgrade_units` - returns `{ type: "do_nothing" }`
- **Fix:** Implement actual decision generation logic
- **Status:** 🟡 Open

#### CODE-M2: LLM Pre-Compute Context Incomplete
- **File:** `src/lib/llm/pre-compute.ts:188-211`
- **Impact:** LLM bots missing context for better decisions
- **Missing:**
  - Game settings (protectionTurns, difficulty) from DB
  - Treaty status between empires
  - Emotional state from DB
  - Permanent grudges from DB
- **Fix:** Load actual data from database
- **Status:** 🟡 Open

---

### UX/Accessibility

#### UX-M1: Input Validation Before Clamping
- **Files:**
  - `src/components/game/military/BuildUnitsPanel.tsx:240`
  - `src/components/game/combat/AttackInterface.tsx:300-318`
- **Impact:** Values silently clamped without user feedback
- **Fix:** Add validation messages before clamping, use `aria-invalid`
- **Status:** 🟡 Open

#### UX-M2: TutorialOverlay Missing Dialog Role
- **File:** `src/components/game/tutorial/TutorialOverlay.tsx:229`
- **Impact:** Screen readers don't recognize as modal dialog
- **Fix:** Add `role="dialog"` and `aria-modal="true"`
- **Status:** 🟡 Open

#### UX-M3: MobileActionSheet Missing Role
- **File:** `src/components/game/MobileActionSheet.tsx:153`
- **Impact:** Missing semantic role for assistive technology
- **Fix:** Add `role="dialog"` or `role="menu"`
- **Status:** 🟡 Open

---

## Low Priority Issues

#### LOW-1: Console.log Statements in LLM/Admin Files
- **Files:** `src/lib/llm/*.ts`, `src/app/actions/admin-actions.ts`
- **Fix:** Replace with proper logging service

#### LOW-2: Type Assertions (as unknown as)
- **Files:** Various (15 instances)
- **Fix:** Create explicit type parsers, use Zod for runtime validation

#### LOW-3: Inline Filter in SectorBox Footer
- **File:** `src/components/game/starmap/SectorBox.tsx:388,401`
- **Fix:** Memoize with existing `sortedEmpires` calculation

#### LOW-4: Checkpoint Coalition Loop with DB Queries
- **File:** `src/lib/game/services/checkpoint-service.ts:193-196`
- **Fix:** Batch fetch all member empires upfront

#### LOW-5: Tooltip Missing aria-describedby
- **File:** `src/components/game/Tooltip.tsx`
- **Fix:** Add proper ARIA linkage between trigger and tooltip

#### LOW-6: Color Contrast Concerns
- **Files:** 84 files use gray-400/500 on dark backgrounds
- **Fix:** Audit with axe-core, upgrade to gray-300 where needed

#### LOW-7: Number Inputs Without Associated Labels
- **File:** `src/components/game/military/BuildUnitsPanel.tsx:235-242`
- **Fix:** Use `htmlFor`/`id` pairs for label association

#### LOW-8: Minor Package Updates Available
- **Packages:** drizzle-kit, drizzle-orm, zod, playwright, postcss, lucide-react
- **Fix:** Run `npm update` for patch/minor updates

---

## Sprint Plan

### Sprint P1 (Current)
- [ ] PERF-M1: Replace polling with SSE
- [ ] PERF-M2: Convert dynamic LLM imports to static
- [ ] SEC-M1, SEC-M2, SEC-M3: Standardize authorization pattern

### Sprint P2
- [ ] CODE-M1, CODE-M2: Complete TODO implementations
- [ ] UX-M1, UX-M2, UX-M3: Accessibility improvements
- [ ] PERF-M3, PERF-M4: Performance batching

### Backlog
- [ ] LOW-1 through LOW-8

---

## Changelog

| Date | Action |
|------|--------|
| 2026-01-07 | Initial creation from five agent review |
| 2026-01-07 | All CRITICAL (10) and HIGH (3) issues resolved |

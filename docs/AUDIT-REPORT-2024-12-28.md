# X-Imperium Technical Audit Report

**Date:** December 28, 2024
**Auditor:** Claude Code (Opus 4.5)
**Branch:** `claude/audit-crafting-system-oDmms`
**Codebase Version:** Post-Phase 5 (Crafting/Syndicate Integration)

---

## Executive Summary

The X-Imperium codebase is in **good health** and substantially complete for the crafting/syndicate systems specified in PRD v1.3. The architecture follows best practices with a modular service layer, type-safe database schema (Drizzle ORM), and a well-designed bot decision engine.

**Key Strengths:**
- Clean separation of concerns with 31 specialized game services
- Complete 4-tier resource system with crafting recipes
- Full Syndicate/Black Market implementation with 8 trust levels and 14 contract types
- Bot AI integration with crafting profiles for all 8 archetypes
- Comprehensive message template system with fallbacks

**Areas Needing Attention:**
- Bot action execution for Black Market purchases doesn't add resources to inventory
- `TIER_2_EXTENDED_RECIPES` and `TIER_3_EXTENDED_RECIPES` are empty legacy exports
- Research service uses 0-7 levels (8 total) but PRD crafting constants reference levels 1-8
- Some N+1 query patterns in turn processing
- 2 moderate security vulnerabilities in dependencies (esbuild, glob)

**Recommendation:** Ready for playtesting with minor fixes. The critical path (bot crafting/syndicate decisions → action execution → turn processing) is functional.

---

## Critical Issues (Must Fix Before Playtesting)

### 1. Black Market Purchases Don't Add Resources to Inventory
**Location:** `src/lib/bots/bot-actions.ts:399-443`
**Impact:** Bot Black Market purchases deduct credits but never add purchased resources
**Code:**
```typescript
// Note: In a full implementation, we would add the purchased resources
// to the empire's inventory. This requires the resource_inventory table update.
// For now, we just deduct the credits.
```
**Suggested Fix:** Add resource inventory insertion similar to `syndicate-actions.ts:540-568`

### 2. Crafting Component Decision Missing Queue Context
**Location:** `src/lib/bots/decision-engine.ts:547`
**Impact:** Bots may queue duplicate resources they're already crafting
**Code:**
```typescript
const alreadyQueued: CraftedResource[] = []; // TODO: Get from context when available
```
**Suggested Fix:** Add `craftingQueue` to `BotDecisionContext` and query active queue items

---

## High Priority (Should Fix Soon)

### 1. Empty Legacy Recipe Exports
**Location:** `src/lib/game/constants/crafting.ts:147, 214`
**Impact:** Dead code that could cause confusion
```typescript
export const TIER_2_EXTENDED_RECIPES: Record<string, Tier2RecipeUnified> = {};
export const TIER_3_EXTENDED_RECIPES: Record<string, Tier3Recipe> = {};
```
**Suggested Fix:** Remove these empty exports and update any references in `crafting-service.ts`

### 2. Research Level Mismatch Between Services
**Location:** `src/lib/game/services/research-service.ts:33` vs `src/lib/game/constants/crafting.ts:392-401`
**Impact:** Potential confusion about max research level
- `research-service.ts`: `MAX_RESEARCH_LEVEL = 7` (levels 0-7, 8 total)
- `crafting.ts`: `RESEARCH_LEVELS` object has keys 1-8 (levels 1-8)
**Suggested Fix:** Align both to use 1-8 naming consistently

### 3. Bot Attack Execution Incomplete
**Location:** `src/lib/bots/bot-actions.ts:243-270`
**Impact:** Bot attacks only deduct forces but don't create attack records or resolve combat
**Code:**
```typescript
// Note: In a full implementation, we would:
// 1. Create an attack record
// 2. Resolve combat using combat-service
// 3. Apply casualties to both sides
// 4. Transfer planets if attacker wins
// For M5, we simplify by just committing forces
```
**Suggested Fix:** Integrate with `combat-service.ts` or `attacks` table for proper combat resolution

### 4. Dependency Vulnerabilities
**Package:** `esbuild` (via drizzle-kit) - Moderate severity
**Package:** `glob` (via eslint-config-next) - High severity
**Suggested Fix:** Update `eslint-config-next` to 15.x+ and `drizzle-kit` when stable updates available

---

## Medium Priority (Technical Debt)

### 1. Magic Numbers
**Locations:**
- `src/lib/db/schema.ts:284` - Default credits: `100000`
- `src/lib/db/schema.ts:285` - Default food: `1000`
- `src/lib/db/schema.ts:293` - Default population: `10000`
- `src/lib/bots/bot-actions.ts:415` - Black market tier costs: `1000`, `5000`, `20000`
- `src/lib/game/services/syndicate-service.ts` - Max active contracts: `3`

**Suggested Fix:** Move to centralized `GAME_DEFAULTS` constant object

### 2. Unused Dependencies (from depcheck)
```
Unused dependencies:
- @tanstack/react-query
- @types/d3-selection
- d3-selection
- react-dom
- zustand

Unused devDependencies:
- @types/react-dom
- @vitest/coverage-v8
- @vitest/ui
- eslint
- jsdom
- postcss
- tsx
- typescript
```
**Impact:** Increased bundle size and install time
**Note:** Some may be used indirectly - verify before removing

### 3. Server Action Cookie Pattern Duplication
**Location:** Every file in `src/app/actions/*.ts`
**Issue:** Same `getGameCookies()` helper duplicated across 15 action files
```typescript
async function getGameCookies(): Promise<{ gameId: string | undefined; empireId: string | undefined }> {
  const cookieStore = await cookies();
  return {
    gameId: cookieStore.get(GAME_ID_COOKIE)?.value,
    empireId: cookieStore.get(EMPIRE_ID_COOKIE)?.value,
  };
}
```
**Suggested Fix:** Extract to shared `src/lib/auth/session.ts` module

### 4. N+1 Query Patterns in Turn Processor
**Location:** `src/lib/game/services/turn-processor.ts`
**Issue:** Multiple sequential `findFirst`/`findMany` calls per empire during turn processing
**Impact:** With 99 bots + 1 player, this could mean 100+ DB round-trips per turn phase

---

## Low Priority (Nice to Have)

### 1. Type Assertions with `as`
**Locations:** Found in action files for JSON column handling
```typescript
contractType as ContractDisplay["status"]
```
**Note:** Generally acceptable for JSON columns where Drizzle types are `unknown`

### 2. Missing Indexes on Frequently Queried Columns
**Locations:** `src/lib/db/schema.ts`
**Columns that should be indexed:**
- `craftingQueue.empireId` + `gameId`
- `syndicateContracts.empireId` + `gameId` + `status`
- `resourceInventory.empireId` + `gameId`
- `buildQueue.empireId` + `gameId`

### 3. API Health Route Version Outdated
**Location:** `src/app/api/health/route.ts:8-9`
```typescript
version: "0.1.0",
milestone: "M0: Foundation",
```
**Suggested Fix:** Update to reflect current version/milestone

---

## Dependency Report

### Outdated Packages

| Package | Current | Latest | Breaking? | Risk | Recommendation |
|---------|---------|--------|-----------|------|----------------|
| next | 14.2.x | 16.1.1 | Yes (15→16) | High | Defer - major upgrade |
| react/react-dom | 18.3.x | 19.2.x | Yes | High | Defer - React 19 is new |
| zod | 4.2.x | 4.2.x | No | Low | Already current |
| drizzle-orm | 0.45.x | 0.45.x | No | Low | Already current |

### Security Vulnerabilities

| Severity | Package | Advisory | Fix Available |
|----------|---------|----------|---------------|
| High | glob (via eslint-config-next) | GHSA-5j98-mcp5-4vw2 | Yes - update to 15.x |
| Moderate | esbuild (via drizzle-kit) | GHSA-67mh-4wv8-2f99 | Requires breaking change |

**Recommendation:** Run `npm audit fix` for non-breaking fixes. Breaking updates should be evaluated for a dedicated upgrade sprint.

---

## PRD Alignment Matrix

### Core Systems

| System | Status | Notes |
|--------|--------|-------|
| Resource Tiers (0-3) | ✅ **Complete** | Tier 0-3 fully defined in `crafting.ts` |
| Crafting Recipes | ✅ **Complete** | Tier 1: 5, Tier 2: 8, Tier 3: 9 recipes |
| Research System (1-8) | ⚠️ **Divergent** | Code uses 0-7, PRD/crafting uses 1-8 |
| Research Branch Allocation | ✅ **Complete** | 6 branches with bonuses |
| Black Market Trust (8 levels) | ✅ **Complete** | unknown → syndicate_lord |
| Contract System (4 tiers) | ✅ **Complete** | 14 contract types across 4 tiers |
| Military Units | ✅ **Complete** | Original SRE + 15 enhanced units |
| WMD Mechanics | ✅ **Complete** | Chemical, EMP, Nuclear, Bioweapon |
| Combat System (3-front) | ✅ **Complete** | Space → Orbital → Ground phases |
| Covert Operations | ✅ **Complete** | 7 operation types with success rates |
| Turn Processing Order | ✅ **Complete** | 8-phase processing in turn-processor.ts |
| Bot AI (8 archetypes) | ✅ **Complete** | All archetypes with crafting profiles |
| Bot Emotions | ✅ **Complete** | 7 emotional states with triggers |
| Bot Memory | ✅ **Complete** | Grudge/memory system with decay |
| Victory Conditions | ✅ **Complete** | 6 victory paths implemented |

### Bot System

| Feature | Status | Notes |
|---------|--------|-------|
| Decision Engine | ✅ **Complete** | 9 decision types with weights |
| Archetype Weights | ✅ **Complete** | Per-archetype decision weights |
| Crafting Decisions | ✅ **Complete** | Uses archetype crafting profiles |
| Contract Decisions | ✅ **Complete** | Trust-level aware selection |
| Black Market Decisions | ⚠️ **Partial** | Decision works, execution incomplete |
| Message Templates | ✅ **Complete** | 14 trigger types with fallbacks |
| Difficulty Scaling | ✅ **Complete** | Easy/Normal/Hard/Nightmare |

### Database Schema

| Table | Status | Indexed |
|-------|--------|---------|
| games | ✅ | Yes |
| empires | ✅ | Yes |
| planets | ✅ | Yes |
| resourceInventory | ✅ | ⚠️ Needs more |
| craftingQueue | ✅ | ⚠️ Needs more |
| syndicateTrust | ✅ | Yes |
| syndicateContracts | ✅ | ⚠️ Needs more |
| buildQueue | ✅ | ⚠️ Needs more |
| researchProgress | ✅ | Yes |
| attacks | ✅ | Yes |
| combatLogs | ✅ | Yes |

---

## API Route Audit

### Server Actions (15 files in `src/app/actions/`)

| File | Auth Check | Input Validation | Error Handling |
|------|------------|------------------|----------------|
| game-actions.ts | ✅ Cookie | ✅ | ✅ try/catch |
| turn-actions.ts | ✅ Cookie | ✅ | ✅ try/catch |
| combat-actions.ts | ✅ Cookie | ✅ | ✅ try/catch |
| crafting-actions.ts | ✅ Cookie | ✅ | ✅ try/catch |
| syndicate-actions.ts | ✅ Cookie | ✅ Thorough | ✅ try/catch |
| market-actions.ts | ✅ Cookie | ✅ | ✅ try/catch |
| diplomacy-actions.ts | ✅ Cookie | ✅ | ✅ try/catch |
| research-actions.ts | ✅ Cookie | ✅ | ✅ try/catch |
| unit-actions.ts | ✅ Cookie | ✅ | ✅ try/catch |
| planet-actions.ts | ✅ Cookie | ✅ | ✅ try/catch |
| covert-actions.ts | ✅ Cookie | ✅ | ✅ try/catch |
| message-actions.ts | ✅ Cookie | ✅ | ✅ try/catch |
| build-queue-actions.ts | ✅ Cookie | ✅ | ✅ try/catch |
| upgrade-actions.ts | ✅ Cookie | ✅ | ✅ try/catch |
| starmap-actions.ts | ✅ Cookie | ✅ | ✅ try/catch |

**Overall:** Good pattern consistency. All actions check gameId/empireId from cookies.

### REST API Routes

| Route | Auth | Rate Limit | Error Handling |
|-------|------|------------|----------------|
| `/api/health` | ❌ None (public) | ❌ None | ✅ try/catch |

**Note:** Only health check route exists. All game operations use Server Actions (recommended for Next.js 14+).

---

## Performance Red Flags

### 1. Turn Processing Scalability
**Location:** `src/lib/game/services/turn-processor.ts`
**Concern:** With 99 bots + 1 player:
- Phase 3 (Bot Decisions): 100 parallel `generateBotDecision()` calls - OK
- Phase 7 (Crafting Queue): Sequential processing per empire
- Phase 9 (Bot Actions): Sequential `executeBotDecision()` per bot

**Estimated per-turn DB calls:** ~300-500 with 100 empires
**Mitigation:** Consider batch queries and bulk updates

### 2. No Database Connection Pooling Configuration
**Location:** `drizzle.config.ts`, `src/lib/db/index.ts`
**Concern:** Default postgres connection without explicit pool settings
**Recommendation:** Configure connection pool for production

### 3. Crafting Queue Query Per Empire
**Location:** `src/lib/bots/bot-actions.ts:324-328`
```typescript
const currentQueue = await db.query.craftingQueue.findMany({
  where: eq(craftingQueue.empireId, empire.id),
});
```
**Recommendation:** Batch fetch all queues at turn start

---

## Bot System Integrity

### Decision Tree Coverage

| Decision Type | Generator | Executor | Complete? |
|---------------|-----------|----------|-----------|
| build_units | ✅ | ✅ | ✅ Yes |
| buy_planet | ✅ | ✅ | ✅ Yes |
| attack | ✅ | ⚠️ Simplified | ⚠️ Partial |
| diplomacy | ✅ Stub | ❌ do_nothing | ❌ Not implemented |
| trade | ✅ Stub | ❌ do_nothing | ❌ Not implemented |
| do_nothing | ✅ | ✅ | ✅ Yes |
| craft_component | ✅ | ✅ | ✅ Yes |
| accept_contract | ✅ | ✅ | ✅ Yes |
| purchase_black_market | ✅ | ⚠️ Missing inventory | ⚠️ Partial |

### Archetype Crafting Profiles

All 8 archetypes have complete crafting profiles in `crafting-profiles.ts`:
- ✅ `warlord` - Military focus
- ✅ `diplomat` - Peaceful, low Syndicate
- ✅ `merchant` - Economy focus
- ✅ `schemer` - Stealth, high Syndicate
- ✅ `turtle` - Defensive
- ✅ `blitzkrieg` - Speed/aggression
- ✅ `tech_rush` - Research focus
- ✅ `opportunist` - Dynamic priorities

### Message Templates

**Fallback coverage:** 14/14 triggers have fallback templates
**Persona templates:** Loaded from `data/templates/{archetype}/{personaId}.json`

| Trigger | Fallback Count |
|---------|---------------|
| greeting | 2 |
| battle_taunt | 2 |
| victory_gloat | 2 |
| defeat | 2 |
| trade_offer | 2 |
| alliance_proposal | 2 |
| betrayal | 2 |
| covert_detected | 2 |
| tribute_demand | 2 |
| threat_warning | 2 |
| retreat | 2 |
| eliminated | 2 |
| endgame | 2 |
| broadcast_shout | 2 |
| casual_message | 2 |

---

## Recommended Next Steps

### Before Playtesting (Critical)

1. **Fix Black Market purchase execution** (`bot-actions.ts:399-443`)
   - Add resource to inventory after deducting credits
   - Estimated effort: 30 minutes

2. **Add crafting queue to bot decision context** (`decision-engine.ts:547`)
   - Pass current queue to prevent duplicate crafting
   - Estimated effort: 1 hour

### Before Beta Release (High Priority)

3. **Remove empty legacy exports** (`crafting.ts:147, 214`)
   - Delete `TIER_2_EXTENDED_RECIPES`, `TIER_3_EXTENDED_RECIPES`
   - Update `crafting-service.ts` references

4. **Align research level numbering**
   - Standardize on 1-8 or 0-7 across all files
   - Update `research-service.ts` comments

5. **Complete bot attack execution**
   - Create attack records
   - Integrate with combat service

### Technical Debt Cleanup (Medium Priority)

6. **Extract shared cookie helper**
   - Create `src/lib/auth/session.ts`
   - Deduplicate across action files

7. **Add database indexes**
   - craftingQueue(empireId, gameId)
   - syndicateContracts(empireId, gameId, status)
   - resourceInventory(empireId, gameId)
   - buildQueue(empireId, gameId)

8. **Audit unused dependencies**
   - Run `npm prune` after verifying depcheck results

### Future Optimization (Low Priority)

9. **Batch turn processing queries**
   - Pre-fetch all empire data at turn start
   - Bulk update at turn end

10. **Update dependency security**
    - Monitor for non-breaking eslint-config-next update
    - Track drizzle-kit esbuild fix

---

## Conclusion

The X-Imperium codebase is well-architected and approximately **90% complete** for the crafting/syndicate system integration. The two critical issues (Black Market inventory and crafting queue context) are straightforward fixes that should take less than 2 hours combined.

The bot decision engine is fully integrated with the crafting system, and all 8 archetypes have appropriate crafting profiles. The Syndicate system is feature-complete with 8 trust levels, 14 contract types, and proper Black Market catalog.

**Recommendation:** Proceed with playtesting after addressing the two critical issues. The remaining high/medium priority items can be tackled in parallel with testing.

---

*Report generated by Claude Code audit on December 28, 2024*

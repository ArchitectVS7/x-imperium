# Performance Review - Nexus Dominion

## Executive Summary

The Nexus Dominion codebase demonstrates solid performance engineering fundamentals with good use of parallel processing, batched database operations, and appropriate indexing on database tables. However, there are several N+1 query patterns in critical paths (treaty checking, target listing), missing database indexes for common query patterns, and opportunities for caching and memoization that could significantly improve performance, especially as game scale increases to 100 empires.

## Critical Findings (Must Fix)

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| C1 | N+1 Query - hasActiveTreaty in loop | `src/lib/game/services/combat/combat-service.ts:436-448` | Critical | getTargets() calls hasActiveTreaty() for each target empire sequentially via Promise.all map. With 100 empires, this executes 99 separate DB queries per call. Should batch-load all treaties. |
| C2 | N+1 Query - getDiplomacyTargets | `src/app/actions/diplomacy-actions.ts:140-143` | Critical | Same pattern - calls hasActiveTreaty() for each empire in a loop. Creates O(n) database queries. |
| C3 | Sequential DB inserts in loop | `src/lib/market/market-service.ts:78-91` | Critical | initializeMarketPrices() loops and awaits each insert individually. Should use batch insert with single query. |

## High Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| H1 | Missing index - messages gameId+recipientId composite | `src/lib/db/schema.ts:1498-1507` | High | messages table has separate indexes but missing composite index for game+recipient+isRead filtering. Common query pattern for inbox. |
| H2 | Missing index - botTells game+empire composite | `src/lib/db/schema.ts:1640-1650` | High | Bot tells table lacks composite index for filtering active tells by game and empire together. |
| H3 | Multiple sequential DB queries | `src/lib/diplomacy/treaty-service.ts:199-205` | High | proposeTreaty() makes 2 sequential findFirst calls for proposer and recipient. Should use Promise.all. |
| H4 | Starmap data - multiple sequential queries | `src/app/actions/starmap-actions.ts:346-378` | High | getWormholesAction() makes 4 sequential DB queries (empire, influence, connections, regions) that could be parallelized. |
| H5 | Bot processor - emotional state per-bot queries | `src/lib/bots/bot-processor.ts:331-343` | High | Each bot decision fetches emotional state individually. With 100 bots, creates 100 separate queries. Should batch load. |

## Medium Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| M1 | Starmap generateNebulaParticles on every render | `src/components/game/starmap/Starmap.tsx:697-701` | Medium | generateNebulaParticles() called inside map without useMemo. Recreates particle arrays on every re-render for each empire node. |
| M2 | Missing memoization - getNebulaColor/getNodeSize | `src/components/game/starmap/Starmap.tsx:692-696` | Medium | Helper functions called per-node per-render. Should memoize results based on empire properties. |
| M3 | CombatPreview estimateWinProbability overhead | `src/components/game/combat/CombatPreview.tsx:102-110` | Medium | Monte Carlo simulation with 50 iterations runs on every render when forces change. Consider debouncing or reducing iterations for live preview. |
| M4 | No caching for treaty lookups | `src/lib/diplomacy/treaty-service.ts:171-177` | Medium | hasActiveTreaty() hits DB every time. Frequently called in same request context. Should add request-level caching. |
| M5 | Stars generation not memoized with useMemo deps | `src/components/game/starmap/Starmap.tsx:366` | Medium | generateStars() is memoized but generates 100 stars. Consider reducing count or using CSS animations. |
| M6 | Turn processor - sequential wormhole updates | `src/lib/game/services/core/turn-processor.ts:1262-1327` | Medium | Wormhole status updates are parallelized but each updates separately. Could batch update with single query. |

## Low Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| L1 | Empty next.config.mjs | `next.config.mjs:1-4` | Low | No bundle optimization configured. Consider adding webpack config for chunk splitting, or enabling React Strict Mode for prod. |
| L2 | D3 force simulation tick handler | `src/components/game/starmap/Starmap.tsx:412-414` | Low | Simulation tick creates new array on every tick via spread. Consider batched state updates. |
| L3 | UUID validation regex compiled each call | `src/lib/game/repositories/combat-repository.ts:57-59` | Low | isValidUUID() compiles regex on every call. Should be a module-level constant. |
| L4 | Multiple formatNumber calls in CombatPreview | `src/components/game/combat/CombatPreview.tsx:252-275` | Low | toLocaleString() called multiple times. Could pre-compute formatted values. |
| L5 | react-window not utilized in large lists | `package.json:55` | Low | react-window is installed but not observed in use for empire lists or message lists. Consider virtualizing long lists. |

## Corrective Actions

1. **[C1, C2] Batch treaty lookups**: Create a `getActiveTreatiesForEmpire(empireId, gameId)` function that loads all treaties in one query, then check in-memory. Implement in `treaty-service.ts`.

2. **[C3] Batch market price initialization**: Replace the for-loop with a single `db.insert(marketPrices).values([...resources.map(...)])` call.

3. **[H1, H2] Add missing composite indexes**: Add `index("messages_game_recipient_read_idx").on(table.gameId, table.recipientId, table.isRead)` and `index("bot_tells_game_empire_active_idx").on(table.gameId, table.empireId, table.expiresAtTurn)`.

4. **[H3, H4] Parallelize sequential queries**: Wrap independent findFirst/findMany calls in Promise.all where data dependencies allow.

5. **[H5] Batch load emotional states**: In bot-processor.ts, load all bot emotional states in one query before processing, then pass to each bot decision function.

6. **[M1, M2] Memoize Starmap helper results**: Use useMemo to compute particles, colors, and sizes for all nodes in a single pass before rendering.

7. **[M4] Implement request-level caching**: Add a simple Map-based cache for treaty lookups within a single request lifecycle using React context or closure scope.

8. **[L3] Hoist regex to module level**: Move UUID regex to `const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i` at module top.

## Visionary Recommendations

1. **Database connection pooling optimization**: Consider configuring connection pool size in Neon/Drizzle based on expected concurrent games. Current setup may benefit from explicit pool configuration.

2. **Read replica for starmap/leaderboard**: With 100 empires generating significant read traffic, consider read replicas for non-transactional queries like starmap data and leaderboards.

3. **Redis caching layer**: Add Redis for caching frequently-accessed, rarely-changed data like game settings, market prices (TTL 30s), and empire basic info.

4. **Web Workers for Monte Carlo**: Move `estimateWinProbability` Monte Carlo simulation to a Web Worker to avoid blocking UI thread during combat preview.

5. **Incremental Static Regeneration**: Consider ISR for game lobby pages and leaderboards that don't need real-time updates.

6. **Database query batching middleware**: Implement DataLoader-style batching for common N+1 patterns like treaty checks across multiple function calls.

7. **Bundle analysis**: Add `@next/bundle-analyzer` to identify and reduce JavaScript bundle size. Current d3-force and GSAP imports may benefit from dynamic imports.

8. **Performance monitoring**: Add Vercel Analytics or custom RUM metrics to track Time to Interactive and turn processing times in production.

## Metrics

- **Files reviewed**: 24
- **Issues found**: 17 (Critical: 3, High: 5, Medium: 6, Low: 5)

---

**Review Date**: 2026-01-08
**Reviewer**: Performance Engineer Agent
**Codebase Version**: c335f30 (main branch)

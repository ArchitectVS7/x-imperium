# Architecture Review - Nexus Dominion

## Executive Summary

Nexus Dominion demonstrates solid architectural foundations with well-organized separation of concerns, clean layering between Server Actions, services, and repositories, and thoughtful use of Next.js 14 App Router patterns. The codebase shows mature patterns for a complex turn-based game with 100+ AI opponents. However, there are areas requiring attention: the massive schema.ts file (2500+ lines) creates maintainability risks, some services contain database access that should be in repositories, and the bot processing system could benefit from better parallelization boundaries.

## Critical Findings (Must Fix)

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| C1 | Monolithic Schema File | `src/lib/db/schema.ts:1-2571` | Critical | Single 2571-line schema file with 40+ tables, 30+ enums, and all relations. Extremely difficult to maintain, review, and reason about. Should be split by domain (core, combat, economy, bots, diplomacy, crafting). |
| C2 | Cookie-Based Session Management | `src/app/actions/turn-actions.ts:41-43` | Critical | Using raw cookies for gameId/empireId with no cryptographic signing. Attackers could manipulate cookie values to access other games/empires. Needs signed JWT or encrypted session tokens. |
| C3 | Missing API Route | `src/app/api/game/state/route.ts` | Critical | SSE hook references `/api/game/stream` endpoint but `src/app/api/game/state/route.ts` does not exist. Real-time features may be broken. |

## High Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| H1 | Service Layer Database Coupling | `src/lib/game/services/core/turn-processor.ts:833-853` | High | Turn processor directly calls `db.update()` instead of using a repository. This violates the established pattern and makes unit testing harder. |
| H2 | Memory Cleanup Sequential Deletes | `src/lib/game/repositories/bot-memory-repository.ts:401-403` | High | `pruneDecayedMemories` uses sequential awaits in a loop instead of batch delete. With 100 bots, this creates N database round-trips per cleanup. |
| H3 | Parallel Empire Processing Race Conditions | `src/lib/game/services/core/turn-processor.ts:161-178` | High | Empire processing runs in parallel with `Promise.all`, but bot processing (phase 5) happens after all empires complete. Attacks between empires during bot phase could read stale data. |
| H4 | Missing Transaction Boundaries | `src/lib/game/services/core/turn-processor.ts:124-479` | High | Turn processing spans multiple database operations without transaction wrapping. A failure mid-turn could leave game state inconsistent. |
| H5 | Hardcoded Constants Mixed with Config | `src/lib/formulas/combat-power.ts:40-52` | High | Constants use `getLegacyConfig()` at module initialization, mixing static and dynamic config. Config changes require server restart. |

## Medium Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| M1 | Large GameShell Component | `src/components/game/GameShell.tsx:1-619` | Medium | 619-line component handling SSE, modals, toasts, panels, keyboard shortcuts, and layout. Should be decomposed into custom hooks and smaller components. |
| M2 | Duplicate Military Power Calculations | `src/app/actions/turn-actions.ts:250-256, 389-395` | Medium | Military power calculation duplicated in multiple places. Should be extracted to a shared formula function. |
| M3 | Repository Pattern Inconsistency | Multiple files | Medium | Some domains use repositories (`bot-memory-repository.ts`), others access `db` directly in services. Pattern should be consistent. |
| M4 | Missing Index for Common Query | `src/lib/db/schema.ts:659-729` | Medium | `attacks` table missing composite index on `(gameId, turn)` which is a common query pattern in turn processing. |
| M5 | Type Safety Gaps with JSON Columns | `src/lib/db/schema.ts:707-708` | Medium | `attackerCasualties` and `defenderCasualties` are typed as `json().notNull()` without runtime validation. Could receive malformed data. |
| M6 | Excessive Re-exports | `src/lib/game/constants/index.ts` | Medium | Constants split across multiple modules with complex re-export chains. The TODO-002 note indicates technical debt awareness. |
| M7 | SSE Reconnection Without Deduplication | `src/hooks/useGameStateStream.ts:151-178` | Medium | SSE reconnection could receive duplicate events during reconnect window. No client-side deduplication by timestamp. |

## Low Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| L1 | Inconsistent Error Handling | `src/lib/bots/bot-processor.ts:338-342` | Low | Empty catch block swallows emotional state loading errors. Should log to monitoring system. |
| L2 | Magic Numbers | `src/app/actions/turn-actions.ts:238` | Low | `foodSectors * 160` uses magic number. Should reference `SECTOR_PRODUCTION.food` constant. |
| L3 | Console.log in Production Code | `src/components/game/GameShell.tsx:119, 169-175` | Low | Multiple `console.log` statements for debugging. Should use proper logging abstraction. |
| L4 | Archetype Name Case Inconsistency | `src/lib/bots/archetypes/types.ts:16-24` | Low | `techRush` uses camelCase while database enum uses `tech_rush`. Mapping required. |
| L5 | Toast Timeout Not Cleaned Up | `src/components/game/GameShell.tsx:100-111` | Low | Toast timeout ref not cleaned up on unmount (only cleared on new toast). Minor memory leak. |
| L6 | Unused gameId in some queries | Multiple repositories | Low | Some queries include gameId filter when empireId already implies the game via foreign key. Redundant but harmless. |

## Corrective Actions

1. **Split Schema File (C1)**: Create domain-based schema modules: `schema/core.ts`, `schema/combat.ts`, `schema/economy.ts`, `schema/bots.ts`, `schema/diplomacy.ts`, `schema/crafting.ts`, `schema/geography.ts`. Use a barrel export from `schema/index.ts`.

2. **Implement Signed Sessions (C2)**: Replace raw cookie access with signed/encrypted session tokens. Consider using `iron-session` or JWT with HttpOnly cookies. Add server-side validation that the player owns the empire.

3. **Create Missing SSE Endpoint (C3)**: Implement `src/app/api/game/stream/route.ts` with SSE support, or update the hook to use the correct path if it exists elsewhere.

4. **Add Repository Layer Consistency (H1, M3)**: Create `empire-repository.ts`, `game-repository.ts`, and ensure all database access goes through repositories. Services should only call repository methods.

5. **Batch Database Operations (H2)**: Replace sequential deletes with `WHERE id IN (...)` batch delete. Consider using Drizzle's `inArray` operator.

6. **Add Transaction Boundaries (H4)**: Wrap turn processing in a database transaction. Use `db.transaction()` for atomic turn updates.

7. **Extract Custom Hooks from GameShell (M1)**: Create `useToast`, `useSSE`, `useTurnProcessing`, `usePanelNavigation` hooks to reduce component complexity.

8. **Centralize Formula Functions (M2)**: Create `src/lib/formulas/military-power.ts` with `calculateMilitaryPower(empire)` function used everywhere.

9. **Add Missing Index (M4)**: Add `index("attacks_game_turn_idx").on(table.gameId, table.turn)` to the attacks table.

10. **Add Zod Validation for JSON Columns (M5)**: Define Zod schemas for casualty objects and validate on insert/read.

## Visionary Recommendations

1. **Event Sourcing for Turn History**: Consider event sourcing for turn processing to enable replay, debugging, and undo functionality. Each turn becomes an immutable event with resulting state changes.

2. **CQRS for Read/Write Separation**: The turn processing (writes) and dashboard display (reads) have very different patterns. Separating them with CQRS could improve performance and allow read replicas.

3. **Bot Processing Pipeline**: Consider a message queue (even in-memory with BullMQ) for bot processing. This would enable true parallelization, better error isolation, and easier scaling.

4. **GraphQL Subscriptions**: Replace SSE with GraphQL subscriptions for more structured real-time updates with automatic schema validation.

5. **Schema Versioning**: Implement database schema versioning beyond Drizzle migrations. Track schema evolution for analytics and debugging.

6. **Feature Flags System**: The progressive disclosure system is great. Extend it to a full feature flags system that can be configured without deploys.

7. **Observability Layer**: Add structured logging, distributed tracing, and metrics. The `perfLogger` is a good start - expand to full OpenTelemetry integration.

8. **State Machine for Game Lifecycle**: Implement a formal state machine for game states (setup -> active -> paused -> completed). XState would provide visual debugging and guaranteed transitions.

## Metrics

- **Files Reviewed**: 22
- **Issues Found**: 18 (Critical: 3, High: 5, Medium: 7, Low: 6)
- **Schema Size**: 2,571 lines (40+ tables, 30+ enums)
- **Largest Component**: GameShell.tsx (619 lines)
- **Turn Processor**: 1,451 lines (core orchestration)
- **Test Coverage Requirement**: 80% (tsconfig confirms strict mode enabled)

---

**Overall Assessment**: The architecture demonstrates thoughtful design with clear separation between UI (components), business logic (services), and data access (schema/repositories). The codebase follows Next.js 14 best practices with Server Actions and proper TypeScript strictness. The primary concerns are around the monolithic schema file, session security, and database operation batching. With the corrective actions implemented, this would be a production-ready architecture capable of scaling to the full 100-bot game scenarios.

**Review Date**: 2026-01-08
**Reviewer**: Architecture Review Agent
**Codebase Version**: c335f30 (main branch)

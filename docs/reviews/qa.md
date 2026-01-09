# QA Review - Nexus Dominion

## Executive Summary

The Nexus Dominion codebase demonstrates a well-architected testing strategy with clear separation between unit tests (Vitest), E2E tests (Playwright), and simulation tests. The CI pipeline covers essential quality gates including type checking, linting, and coverage thresholds. However, significant gaps exist in E2E test coverage with 6 skipped test suites, excessive reliance on `waitForTimeout` hardcoded delays, and direct database imports in E2E tests that violate test isolation principles.

## Critical Findings (Must Fix)

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 1 | E2E tests directly import and manipulate database | `e2e/bot-scaling-test.spec.ts:2-3` | Critical | E2E tests import `db` and `schema` directly, bypassing the browser context. This creates a split context where test code runs in Node.js while assertions run in browser, leading to race conditions and unreliable tests. |
| 2 | Large coverage exclusion list undermines 80% threshold | `vitest.config.ts:16-112` | Critical | 60+ files are excluded from coverage including critical services (`combat-service.ts`, `turn-processor.ts`, `research-service.ts`). The 80% threshold is misleading as major business logic is exempted. |
| 3 | 6 full E2E test suites are skipped | `e2e/combat-edge-cases.spec.ts:152,248,330,408,500,591` | Critical | Protection Period, Influence Sphere, Treaty Violation, Invalid Attack, Combat UI State, and Combat Execution tests are all skipped. These represent significant untested attack surface. |
| 4 | No global test database cleanup between tests | `e2e/crafting-system.spec.ts:14-16` | Critical | Multiple E2E files query the database directly but rely only on global teardown, not per-test isolation. Tests can pollute each other's state. |

## High Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 5 | 92 instances of `waitForTimeout` in E2E tests | Multiple E2E files | High | Hardcoded wait times (e.g., `waitForTimeout(500)`, `waitForTimeout(2000)`) indicate flaky test patterns. These should use proper wait conditions like `waitForSelector` or `expect().toPass()`. |
| 6 | CI runs only smoke tests for E2E | `.github/workflows/ci.yml:125` | High | `npm run test:e2e:smoke` runs only smoke tests. Milestone-core, combat-edge-cases, and other critical E2E tests are never executed in CI. |
| 7 | No retry mechanism for unit tests | `vitest.config.ts` | High | Unlike Playwright (retries: 2), Vitest has no retry configuration, making CI vulnerable to transient failures in async tests. |
| 8 | Missing E2E test for error states | `e2e/combat-edge-cases.spec.ts:1017-1033` | High | Network error test has no actual error injection - just checks if error elements exist. No real error path validation. |
| 9 | Conditional test skips hide failures | `e2e/crafting-system.spec.ts:85,98,166,271,284` | High | Tests use `test.skip()` inside test body when gameId is null or empire not found, masking potential setup failures. |

## Medium Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 10 | Bot scaling tests have excessive timeouts | `e2e/bot-scaling-test.spec.ts:141-168` | Medium | Timeouts range from 180s to 420s per test. Combined with serial execution, full suite would take 15+ minutes. |
| 11 | No component snapshot testing | `src/components/game/__tests__/` | Medium | Component tests verify behavior but lack snapshot tests for visual regression detection. |
| 12 | Inconsistent test data-testid coverage | Multiple components | Medium | 196 data-testid usages across 74 component files, but many interactive elements lack testids (found by comparing component count to testid usage). |
| 13 | Simulation tests marked as skip | `tests/simulation/battle-framework.test.ts:242` | Medium | Extended Balance Analysis is skipped but would provide valuable regression data for combat balance. |
| 14 | No test for database migration failures | Schema and migration tests | Medium | `schema-check` job only validates syntax with `--dry-run`. No test for actual migration execution or rollback. |
| 15 | 22 TODO/FIXME/HACK comments in production code | Multiple files in `src/lib/` | Medium | Unresolved technical debt items that should be tracked and addressed. |

## Low Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 16 | E2E README references outdated file names | `e2e/README.md:187-188` | Low | Mentions "3 bots, 3 turns" for smoke test but actual config uses 10 bots and more dynamic values. |
| 17 | Mock helper in test utils is basic | `src/test/utils/db-mock.ts` | Low | `createMockDb()` returns a basic chain mock. More sophisticated mocking (partial mocks, spy tracking) would improve test quality. |
| 18 | No test parallelization strategy documentation | E2E config and tests | Low | Tests run with `workers: 1` in CI, `2` locally. No documentation on why or when to change. |
| 19 | Link check continues on error | `.github/workflows/ci.yml:240` | Low | `continue-on-error: true` allows broken documentation links to pass CI. |
| 20 | No visual regression testing | Project-wide | Low | For a game with complex UI (starmap, combat preview), visual regression would catch rendering issues. |

## Corrective Actions

1. **Immediate (P0)**: Remove direct database imports from E2E tests. Use API calls or UI interactions to manipulate state. Create test fixtures via Server Actions.

2. **Immediate (P0)**: Unskip or rewrite the 6 skipped combat E2E test suites. If UI features are missing, create tracking issues and add placeholder tests that fail clearly.

3. **This Sprint (P1)**: Replace all `waitForTimeout` calls with proper Playwright wait conditions (`expect().toPass()`, `waitForSelector`, `waitForFunction`).

4. **This Sprint (P1)**: Expand CI E2E coverage to include `milestone-core.spec.ts` and `combat-edge-cases.spec.ts` (non-skipped suites) using parallel jobs.

5. **Next Sprint (P2)**: Review and reduce vitest coverage exclusions. Add integration tests for excluded services or move them to a documented "tested via E2E only" category with clear justification.

6. **Next Sprint (P2)**: Add per-test database isolation in E2E using either test fixtures that create/destroy games, or a beforeEach hook that resets state via admin actions.

7. **Ongoing**: Create tracking tickets for all 22 TODO/FIXME/HACK comments and prioritize resolution.

## Visionary Recommendations

1. **Contract Testing**: Implement Pact or similar for API contract testing between frontend and Server Actions. This catches breaking changes before E2E tests.

2. **Visual Regression**: Add Percy or Chromatic for visual regression testing of the starmap, combat interface, and other complex UI components.

3. **Test Impact Analysis**: Implement selective test execution based on changed files. Use Vitest's `--changed` flag and Playwright's project filtering to reduce CI time.

4. **Mutation Testing**: Add Stryker.js to evaluate test suite effectiveness. The current 80% coverage threshold may hide weak assertions.

5. **Load Testing**: Add k6 or Artillery scripts for turn processing with 100 bots. Current `bot-scaling-test.spec.ts` tests performance but not under realistic concurrent load.

6. **Chaos Engineering**: Implement fault injection for database connection failures, timeout scenarios, and rate limit testing to validate resilience.

7. **Test Documentation Generator**: Auto-generate test documentation from test descriptions to maintain living documentation aligned with actual coverage.

## Metrics

- **Files reviewed**: 42
- **Issues found**: 20 (Critical: 4, High: 5, Medium: 6, Low: 5)
- **Unit test files**: ~115 (based on describe/it pattern matches)
- **E2E spec files**: 10 active (with 6 containing skipped suites)
- **Coverage exclusions**: 60+ files
- **Hardcoded waits in E2E**: 92 occurrences
- **CI jobs**: 8 (compliance, typecheck, lint, test, e2e, build, schema-check, link-check)

---

**Review Date**: 2026-01-08
**Reviewer**: QA Expert Agent
**Codebase Version**: c335f30 (main branch)

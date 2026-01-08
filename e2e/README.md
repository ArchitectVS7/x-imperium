# E2E Test Suite

## Overview

This directory contains end-to-end tests for Nexus Dominion. These tests validate UI interactions, database integration, and user workflows.

**IMPORTANT:** E2E tests are optimized to minimize database usage (512MB free tier on Neon). Test data is automatically cleaned up after test runs.

## Test Types

### 1. Smoke Test (`smoke-test.spec.ts`)
**Purpose:** Fast validation for CI/CD pipelines
**Duration:** ~1-2 minutes
**Config:** 3 bots, 3 turns
**When to run:** Every commit, before merging PRs

```bash
npm run test:e2e:smoke
```

### 2. Comprehensive Test (`comprehensive-test.spec.ts`)
**Purpose:** Full feature validation with UI testing
**Duration:** ~3-5 minutes
**Config:** 10 bots, 10 turns
**When to run:** Before releases, weekly

```bash
npx playwright test comprehensive-test.spec.ts
```

### 3. Milestone Tests (`milestone-*.spec.ts`)
**Purpose:** Validate specific feature sets
**Duration:** ~2-5 minutes each
**When to run:** After implementing new features

```bash
npx playwright test milestone-1.spec.ts
```

### 4. Quick Diagnostic (`quick-diagnostic.spec.ts`)
**Purpose:** Debug UI issues quickly
**Duration:** ~1-2 minutes
**When to run:** When troubleshooting UI bugs

## Database Management

### Automatic Cleanup
E2E tests automatically clean up test data after the full suite completes via `global-teardown.ts`.

### Manual Cleanup
If tests fail or you need to free space:

```bash
npm run db:clean    # Delete ALL games and related data
npm run db:stats    # Check current database usage
```

### Monitoring Database Usage
```bash
npm run db:stats
```

Example output:
```
📊 Database Statistics
Games:       12
Empires:     120
Planets:     450
Bot Memories: 3,200
Messages:    890
Attacks:     156
Combat Logs: 2,340
```

## Design Philosophy

### Why Small Tests?
E2E tests validate **UI and integration**, not game mechanics.

**E2E tests are for:**
- ✅ Can users click buttons?
- ✅ Does the UI render correctly?
- ✅ Do server actions work?
- ✅ Does turn processing complete?

**NOT for:**
- ❌ Game balance testing
- ❌ Bot AI validation
- ❌ Long gameplay simulations
- ❌ Victory condition math

**These are covered by:**
- `tests/simulation/` - In-memory bot battles (0 DB usage!)
- `src/lib/**/*.test.ts` - Unit tests for formulas

### The Testing Pyramid

```
      /\
     /E2E\       ← Few, focused tests (smoke + comprehensive)
    /------\
   /  SIM   \    ← Bot battle simulations (in-memory)
  /----------\
 /    UNIT    \  ← Many fast tests (formulas, services)
/--------------\
```

## Database Usage Comparison

### Before Optimization:
- 100 turns × 50 bots = 50,000+ DB operations per test
- 5 test files = 250,000+ operations
- Result: **512MB filled in one day**

### After Optimization:
- 10 turns × 10 bots = 1,000 DB operations per test
- 8 test files + cleanup = 8,000 operations
- Result: **~10-20MB per full suite run**

## Running Tests

### Full Suite
```bash
npm run test:e2e
```

### With UI (debugging)
```bash
npm run test:e2e:ui
```

### Single Test File
```bash
npx playwright test milestone-3.spec.ts
```

### Watch Mode (specific test)
```bash
npx playwright test smoke-test.spec.ts --ui
```

## CI/CD Integration

For GitHub Actions or similar:

```yaml
- name: Run smoke tests
  run: npm run test:e2e:smoke

- name: Cleanup test data
  if: always()
  run: npm run db:clean
```

## Troubleshooting

### Tests are slow
- Run smoke test instead: `npm run test:e2e:smoke`
- Check database is not at capacity: `npm run db:stats`

### Database at capacity
```bash
npm run db:clean    # Nuclear option: delete everything
npm run db:stats    # Verify it worked
```

### Tests failing randomly (Flaky Tests)
- Database may be full (check with `db:stats`)
- Network issues with Neon
- Try running tests sequentially: `npx playwright test --workers=1`
- Use the flaky test tracker to identify patterns (see below)

### "Session lost" errors
- Game data was deleted mid-test
- Ensure cleanup only runs in `global-teardown.ts`, not during tests

## Best Practices

1. **Keep tests short** - E2E tests should run in minutes, not hours
2. **Test user journeys** - Not game mechanics (use simulation tests)
3. **Clean up regularly** - Run `db:clean` weekly
4. **Monitor usage** - Check `db:stats` before test runs
5. **Use smoke tests in CI** - Fast feedback on basic functionality

## Files

- `smoke-test.spec.ts` - Fast CI validation (3 bots, 3 turns)
- `comprehensive-test.spec.ts` - Full feature test (10 bots, 10 turns)
- `milestone-*.spec.ts` - Feature-specific tests
- `quick-diagnostic.spec.ts` - Debug helper
- `global-teardown.ts` - Auto-cleanup after tests

## Migration Notes

**2024-12-30: Database Optimization**
- Deleted `100-turn-stress-test.spec.ts` (redundant with simulation tests)
- Reduced `50-turn-comprehensive-test.spec.ts` to 10 turns / 10 bots
- Added automatic cleanup via `global-teardown.ts`
- Added smoke test for CI
- Database usage reduced by ~95%

**2026-01-08: Flaky Test Tracking**
- Added `flaky-tests.json` for tracking known flaky tests
- Added `scripts/analyze-flaky-tests.ts` for automated detection
- Added debug mode with full traces

---

## Flaky Test Tracking

### What is a Flaky Test?
A flaky test is one that sometimes passes and sometimes fails without code changes. These are identified when a test fails on the first attempt but passes on retry.

### Automatic Detection
Playwright is configured with retries (2 in CI). Tests that fail then pass are automatically flagged as flaky in the JSON report.

### Analyze Flaky Tests
After running tests in CI (with JSON reporter):
```bash
npm run test:e2e:analyze
```

This will:
1. Parse `playwright-results.json`
2. Identify tests that failed then passed
3. Update `e2e/flaky-tests.json` with findings
4. Show a summary report

### Debug Flaky Tests
Run with full tracing enabled:
```bash
npm run test:e2e:debug
```

Or with environment variables:
```bash
PLAYWRIGHT_TRACE_ALL=true npm run test:e2e
PLAYWRIGHT_VIDEO_ALL=true npm run test:e2e
PLAYWRIGHT_HEADED=true npm run test:e2e
```

### Tracking File
`e2e/flaky-tests.json` tracks:
- **knownFlaky** - Currently flaky tests with occurrence counts
- **resolved** - Tests that were flaky but haven't failed in 7+ days
- **lastUpdated** - When the file was last updated

### Marking Tests as Flaky
You can also manually tag tests in code:
```typescript
test('known flaky test', async ({ page }) => {
  test.info().annotations.push({ type: 'flaky', description: 'Network timing issue' });
  // test code...
});
```

### CI Integration
The CI pipeline automatically:
1. Runs tests with 2 retries
2. Outputs JSON results
3. Can run `test:e2e:analyze` to update flaky tracking

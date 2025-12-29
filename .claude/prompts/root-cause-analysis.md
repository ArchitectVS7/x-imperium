# Root Cause Analysis for E2E Failures

When an E2E test fails, follow this systematic process to identify and fix the root cause, not just the symptom.

## Philosophy

- **Never skip a failing test** - Fix it or understand why it's flaky
- **Fix the code, not just the test** - Unless the test itself is wrong
- **Document every fix** - Future you will thank present you
- **One fix at a time** - Don't shotgun changes

## Step 1: Isolate the Failure

Run only the failing test to get clean output:

```bash
# Run single test by name
npm run test:e2e -- -g "exact test name" --project=chromium

# Run with debug mode for more info
npm run test:e2e -- -g "exact test name" --debug

# Run with headed browser to watch
npm run test:e2e -- -g "exact test name" --headed
```

Record:
- Test file and line number
- Exact error message
- Expected vs actual values

## Step 2: Classify the Failure

| Type | Symptoms | Likely Cause |
|------|----------|--------------|
| **Assertion Failure** | `expect(...).toBe(...)` failed | Logic bug or wrong test expectation |
| **Element Not Found** | `locator(...)` timeout | Missing data-testid, element not rendered |
| **State Mismatch** | Values don't match | Race condition, stale state, async issue |
| **Network Error** | Fetch/API failure | Server action bug, database issue |
| **Timeout** | Test exceeded time limit | Slow operation, infinite loop, missing await |

## Step 3: Trace the Data Flow

For assertion failures, trace backwards:

```
UI Element (what we see)
    ↑
React Component (what renders it)
    ↑
State/Props (where data comes from)
    ↑
Server Action (what fetches/mutates)
    ↑
Database (source of truth)
```

Questions to ask at each level:
1. Is the data correct at this level?
2. Is it being passed correctly to the next level?
3. Are there any transformations that could corrupt it?

## Step 4: Spawn Debugger Agent (If Needed)

For complex failures, spawn a debugger agent:

```
Task({
  subagent_type: "debugger",
  prompt: `
    E2E test failure analysis:

    Test: {test name}
    File: {test file path}
    Error: {error message}

    Expected: {expected value}
    Actual: {actual value}

    Investigate:
    1. The component rendering this element
    2. The data source for this value
    3. Any recent changes to related code

    Find the root cause, not just a workaround.
  `,
  description: "Debug E2E failure"
})
```

## Step 5: Identify Root Cause Categories

### A. Code Bug (Most Common)

Symptoms:
- Test was passing before recent changes
- Assertion values are clearly wrong
- Same failure every run

Fix approach:
1. Identify the commit that broke it
2. Review that code change
3. Fix the logic error
4. Add unit test to prevent regression

### B. Test Bug

Symptoms:
- Test expectation doesn't match PRD
- Test is checking implementation detail, not behavior
- Test is flaky (sometimes passes, sometimes fails)

Fix approach:
1. Verify expected values against PRD
2. Update test to match correct behavior
3. If flaky, add proper waits or retries

### C. Race Condition

Symptoms:
- Passes locally, fails in CI (or vice versa)
- Passes on retry
- Involves async operations

Fix approach:
1. Add explicit waits for state changes
2. Use `waitForLoadState('networkidle')`
3. Use `expect(...).toPass({ timeout: X })` pattern
4. Check for missing `await` keywords

### D. Missing Test Infrastructure

Symptoms:
- Element not found
- Wrong selector

Fix approach:
1. Add missing `data-testid` attributes
2. Update selectors to match current DOM
3. Verify component is mounted

## Step 6: Apply the Fix

1. Make the minimal change to fix the issue
2. Run the single failing test to verify fix
3. Run the full E2E suite to check for regressions
4. If new failures appear, investigate before proceeding

## Step 7: Document the Fix

Add to session notes:

```markdown
## Root Cause: {test name}

**Failure**: {brief description}

**Root Cause**: {what was actually wrong}

**Category**: Code Bug | Test Bug | Race Condition | Infrastructure

**Fix Applied**:
- File: {path}
- Change: {what was changed}

**Prevention**: {how to prevent similar issues}
```

## Step 8: Verify Stability

Run the test multiple times to ensure it's not flaky:

```bash
# Run 3 times
npm run test:e2e -- -g "test name" --repeat-each=3
```

If it fails even once, investigate further.

## Common Patterns in Nexus Dominion

### Turn Processing Issues
```
Symptom: State values wrong after "End Turn"
Check: waitForTurnChange() being used?
Check: advanceTurn() helper returning correct before/after?
```

### Resource Display Issues
```
Symptom: Credits/Food/etc showing wrong values
Check: data-testid="credits" element exists?
Check: parseNumber() handling formatting correctly?
```

### Navigation Issues
```
Symptom: Page not found or wrong page
Check: waitForLoadState('networkidle') after click?
Check: Correct href in navigation links?
```

### Bot-Related Failures
```
Symptom: Bot state/actions incorrect
Check: Bot processor completing without errors?
Check: Game creation including all 25 bots?
```

## Anti-Patterns to Avoid

1. **Adding arbitrary sleeps**: Use proper waits instead of `page.waitForTimeout(5000)`

2. **Disabling the test**: Fix it or delete it, don't skip it

3. **Loosening assertions**: If `toBe(100)` fails, don't change to `toBeGreaterThan(0)`

4. **Multiple fixes at once**: One change at a time, verify after each

5. **Ignoring flaky tests**: Flaky tests indicate real bugs or bad test design

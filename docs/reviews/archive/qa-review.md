# QA Review: Nexus Dominion Alpha Launch Readiness

**Review Date**: 2026-01-07
**Reviewer**: QA Expert Agent
**Scope**: Pre-alpha testing assessment for Nexus Dominion

---

## 1. Executive Summary

### Key Findings

1. **Critical Testing Gap: 3 Security-Critical Services Untested** - `attack-validation-service.ts`, `save-service.ts`, and `victory-service.ts` lack dedicated unit tests. These services handle combat legality (security), game persistence (data integrity), and win conditions (game logic correctness).

2. **Strong Foundation: 91% Service Coverage** - 31 of 34 services have unit tests, and the formula layer has 100% coverage. The testing pyramid is well-structured with simulation tests for game mechanics.

3. **E2E Test Proliferation Risk** - 19 E2E test files create maintenance burden and potential for flaky tests. CI only runs smoke tests, leaving 18 tests without automated execution.

4. **Coverage Exclusions Mask Risk** - The vitest.config.ts may exclude untested services from coverage calculations, artificially inflating metrics.

5. **Robust CI Pipeline** - Multi-job CI workflow with compliance checks, type checking, linting, unit tests (80% threshold), E2E smoke tests, build verification, and schema validation.

---

## 2. Corrective Actions (Pre-Alpha Priority)

### P0: CRITICAL - Must Fix Before Alpha

#### 2.1 Add Unit Tests for `attack-validation-service.ts`

**File**: `src/lib/game/services/attack-validation-service.ts`

**Risk**: SECURITY-CRITICAL - This service validates combat legality including:
- Influence sphere constraints (who can attack whom)
- Force multiplier calculations
- Protection period enforcement
- Treaty violation prevention

**Current State**: Service has ~400+ lines of pure logic with zero test coverage. Key functions to test:
- `getAttackTargetsWithInfo()` - Returns valid attack targets with full metadata
- `validateAttackWithInfluence()` - Core attack validation logic
- `calculateRequiredForces()` - Force calculation helper
- `calculateEffectiveForces()` - Effective force after distance penalty

**Recommended Tests**:
```typescript
describe("validateAttackWithInfluence", () => {
  it("should reject attack on protected empire");
  it("should reject attack on treaty partner");
  it("should reject attack on empire outside influence sphere");
  it("should apply 1.0x multiplier for direct neighbors");
  it("should apply 1.5x multiplier for extended neighbors");
});

describe("calculateEffectiveForces", () => {
  it("should floor force values after division");
  it("should handle 1.0x multiplier correctly (no change)");
  it("should reduce forces by 1/1.5 for extended attacks");
});
```

**Effort**: 4-6 hours

---

#### 2.2 Add Unit Tests for `victory-service.ts`

**File**: `src/lib/game/services/victory-service.ts`

**Risk**: GAME LOGIC - Determines win/loss conditions. Incorrect behavior means broken endgame.

**Current State**: 600+ lines with complex victory/defeat logic. Key pure functions:
- `checkDefeatConditions()` - Checks elimination, bankruptcy, civil collapse
- `calculateRevoltConsequences()` - Ramping revolt penalties
- `applyRevoltConsequences()` - Unit loss distribution

**Recommended Tests**:
```typescript
describe("checkDefeatConditions", () => {
  it("should detect elimination when sectorCount is 0");
  it("should detect bankruptcy with negative credits and production");
  it("should not defeat on zero credits if production is positive");
});

describe("calculateRevoltConsequences", () => {
  it("should apply 10% production penalty on turn 1 of revolt");
  it("should escalate to 25% penalty and 10% desertion on turn 2");
  it("should trigger civil war (defeat) on turn 3");
});
```

**Effort**: 3-4 hours

---

#### 2.3 Add Unit Tests for `save-service.ts`

**File**: `src/lib/game/services/save-service.ts`

**Risk**: DATA INTEGRITY - Handles game persistence (ironman auto-save).

**Current State**: ~500 lines. Most functions have database dependencies, but serialization structure can be tested via integration tests.

**Recommended Approach**:
1. Add integration test in `tests/integration/save-service.test.ts`
2. Test serialization format validation
3. Verify snapshot version compatibility
4. Test error handling for missing data

**Effort**: 4-5 hours

---

### P1: HIGH - Fix Before Public Alpha

#### 2.4 Remove Coverage Exclusions for Critical Services

**File**: `vitest.config.ts`

**Issue**: If critical services are excluded from coverage calculations, this artificially inflates metrics.

**Action**: After adding tests, ensure all services are included in coverage analysis.

---

#### 2.5 Consolidate E2E Test Suite

**Current State**: 19 E2E test files in `e2e/` directory:

| Test File | Purpose | Recommendation |
|-----------|---------|----------------|
| `smoke-test.spec.ts` | Fast CI validation | KEEP - Essential |
| `comprehensive-test.spec.ts` | Full 10-turn playthrough | KEEP - Core validation |
| `full-gameplay-positive.spec.ts` | 20-turn all features | MERGE into comprehensive |
| `full-game-simulation.spec.ts` | 50-turn simulation | CONSIDER REMOVE - Use Vitest simulation |
| `milestone-*.spec.ts` | Feature-specific (8 files) | CONSOLIDATE into 2-3 files |
| `bot-scaling-test.spec.ts` | Bot count scaling | KEEP - Performance |
| `crafting-system.spec.ts` | Crafting UI | KEEP - Feature-specific |
| `tells-5bot-20turn.spec.ts` | Tell system | MERGE into comprehensive |
| `game-controls-validation.spec.ts` | UI controls | MERGE into comprehensive |
| `quick-diagnostic.spec.ts` | Debug helper | KEEP - Dev tool |

**Target**: Reduce from 19 to 8-10 files:
1. `smoke-test.spec.ts` - CI (kept)
2. `comprehensive-test.spec.ts` - Full validation (expanded)
3. `milestone-core.spec.ts` - Milestones 1-4 (consolidated)
4. `milestone-advanced.spec.ts` - Milestones 5-8 (consolidated)
5. `milestone-12-llm-bots.spec.ts` - LLM integration (kept)
6. `bot-scaling-test.spec.ts` - Performance (kept)
7. `crafting-system.spec.ts` - Crafting (kept)
8. `quick-diagnostic.spec.ts` - Dev tool (kept)

**Effort**: 8-12 hours

---

### P2: MEDIUM - Fix Before Beta

#### 2.6 Add E2E Test for Combat Validation Edge Cases

**Current Gap**: E2E tests navigate to combat page but don't test:
- Protection period blocking attacks
- Treaty violation prevention
- Influence sphere restrictions
- Force multiplier display accuracy

**Action**: Add dedicated combat E2E scenarios to `comprehensive-test.spec.ts`.

---

#### 2.7 Implement Flaky Test Detection

**Action**:
1. Add Playwright `trace: "on"` for all tests (not just first retry)
2. Implement test retry reporting in CI
3. Tag known flaky tests with `.skip` until fixed

---

## 3. [DEFERRED]

---

## 4. Priority Matrix

| Priority | Category | Item | Effort | Risk Mitigation |
|----------|----------|------|--------|-----------------|
| P0 | Unit Test | attack-validation-service tests | 4-6h | Security |
| P0 | Unit Test | victory-service tests | 3-4h | Game Logic |
| P0 | Unit Test | save-service integration test | 4-5h | Data Integrity |
| P1 | Config | Remove coverage exclusions | 30min | Metric Accuracy |
| P1 | E2E | Consolidate 19 files to 8-10 | 8-12h | Maintainability |
| P2 | E2E | Combat validation edge cases | 3-4h | Feature Coverage |
| P2 | CI | Flaky test detection | 2-3h | Reliability |
| P3 | Visual | Regression testing | 8h | UI Stability |
| P3 | Contract | Bot API testing | 6h | Integration |
| P3 | Chaos | Turn processing failure tests | 4h | Resilience |

---

## 5. Action Items

### Immediate (Before Alpha)

- [ ] **QA-001**: Create test file `src/lib/game/services/__tests__/attack-validation-service.test.ts`
- [ ] **QA-002**: Create test file `src/lib/game/services/__tests__/victory-service.test.ts`
- [ ] **QA-003**: Create test file `tests/integration/save-service.test.ts`
- [ ] **QA-004**: Verify coverage exclusions after tests pass
- [ ] **QA-005**: Run `npm run test:coverage` and confirm 80% threshold is met

### This Sprint

- [ ] **QA-006**: Merge `full-gameplay-positive.spec.ts` into `comprehensive-test.spec.ts`
- [ ] **QA-007**: Consolidate milestone tests 1-4 into `milestone-core.spec.ts`
- [ ] **QA-008**: Update `e2e/README.md` with new test structure

### Next Sprint

- [ ] **QA-009**: Add combat edge case E2E tests
- [ ] **QA-010**: Configure Playwright trace-on-all for debugging
- [ ] **QA-011**: Implement flaky test tagging and tracking

---

## 6. Current Test Inventory

### Unit Tests (81 files)

**By Category**:
- **Formulas**: 6 files (100% coverage - `combat-power`, `casualties`, `army-effectiveness`, `population`, `sector-costs`, `research-costs`)
- **Services**: 31 files (91% of services tested)
- **Bots**: 11 files (archetypes, emotions, decisions, memory)
- **Combat**: 5 files (phases, effectiveness, volley, coalition, containment)
- **Other**: 28 files (diplomacy, covert, market, events, etc.)

### E2E Tests (19 files)

**Run in CI**: Only `smoke-test.spec.ts` (via `npm run test:e2e:smoke`)
**Manual only**: 18 other test files

### Simulation Tests (tests/simulation/)

- `simulator.ts` - Core simulation engine
- `bot-battle.test.ts` - Bot vs bot validation
- `balance-test.test.ts` - Game balance analysis
- `batch-runner.ts` - Multi-simulation orchestration
- `empire-factory.ts` - Test data generation

---

## 7. Quality Gates for Alpha

### Must Pass Before Alpha Release

1. **Unit Tests**: `npm run test:coverage` passes with 80%+ coverage
2. **E2E Smoke**: `npm run test:e2e:smoke` passes
3. **Type Check**: `npm run typecheck` passes
4. **Lint**: `npm run lint` passes
5. **Compliance**: `npm run compliance:check` passes (no "planet" terminology)
6. **Build**: `npm run build` succeeds
7. **Manual**: Critical service tests added (P0 items above)

### Recommended Before Alpha

1. **E2E Comprehensive**: `npx playwright test comprehensive-test.spec.ts` passes
2. **Simulation**: `npm run test -- tests/simulation/bot-battle.test.ts` passes
3. **No Critical Bugs**: 0 P0/P1 bugs in tracking

---

## 8. Conclusion

Nexus Dominion has a **solid testing foundation** with 91% service coverage and a well-structured testing pyramid. The simulation tests provide excellent coverage of game mechanics without database overhead.

**The critical gap is the 3 untested security/integrity services.** Adding 12-15 hours of focused testing effort will close this gap and prepare the codebase for a confident alpha launch.

The E2E test proliferation (19 files) is a maintenance concern but not a blocker. Consolidation can happen post-alpha as part of technical debt reduction.

**Alpha Readiness Score**: 7/10 (8.5/10 after P0 items complete)

---

*Generated by QA Expert Agent | Nexus Dominion Alpha Testing Review*

---

## Appendix: Files Referenced

| File | Path |
|------|------|
| Attack Validation Service | `src/lib/game/services/attack-validation-service.ts` |
| Victory Service | `src/lib/game/services/victory-service.ts` |
| Save Service | `src/lib/game/services/save-service.ts` |
| Vitest Config | `vitest.config.ts` |
| Playwright Config | `playwright.config.ts` |
| CI Workflow | `.github/workflows/ci.yml` |
| E2E README | `e2e/README.md` |
| Smoke Test | `e2e/smoke-test.spec.ts` |
| Comprehensive Test | `e2e/comprehensive-test.spec.ts` |

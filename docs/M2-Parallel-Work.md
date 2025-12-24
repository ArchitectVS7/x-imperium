# M2 Parallel Work Implementation Plan

## Executive Summary

Complete the M2 parallel work items: pure calculation functions, constants/configuration, and remaining M8 bot persona templates. Includes adversarial code reviews after each phase, CI/CD audit, and unit tests.

---

## Current State

### Already Complete
- `src/lib/game/constants.ts` - Core game constants (resources, planets, civil status)
- `src/lib/game/networth.ts` - Networth calculation with tests
- `data/personas.json` - All 100 bot personas defined
- 6 template files exist:
  - `data/templates/tech_rush/merlin_starborn.json`
  - `data/templates/schemers/count_dravos.json`
  - `data/templates/schemers/collective_one.json`
  - `data/templates/blitzkrieg/captain_redmaw.json`
  - `data/templates/merchants/ceo_synergy.json`
  - `data/templates/diplomats/emissary_thalen.json`

### Work Required
1. **Formulas**: 7 new formula modules in `src/lib/formulas/`
2. **Constants**: Unit configuration in `src/lib/game/unit-config.ts`
3. **Templates**: 94 remaining persona message templates

---

## Phase 1: Pure Calculation Functions (2-3 hours)

### Pattern to Follow
Use `src/lib/game/networth.ts` as the reference pattern:
- JSDoc comment with PRD reference at top
- Interface for function inputs
- Constants object with `as const`
- Pure functions with clear logic
- Convenience helper functions

### Files to Create

#### 1.1 `src/lib/formulas/combat-power.ts`
```typescript
// PRD 6.2: Combat Power Calculations
interface FleetComposition { fighters, stations, lightCruisers, heavyCruisers, carriers }
POWER_MULTIPLIERS = { fighters: 1, lightCruisers: 4, heavyCruisers: 4, carriers: 12, stations: 50 }
DIVERSITY_THRESHOLD = 4
DIVERSITY_BONUS = 1.15
DEFENDER_ADVANTAGE = 1.2

calculateFleetPower(fleet, isDefender): number
calculateDiversityBonus(fleet): number
countUnitTypes(fleet): number
```

#### 1.2 `src/lib/formulas/casualties.ts`
```typescript
// PRD 6.2: Dynamic Casualty Calculation
CASUALTY_BASE_RATE = 0.25
CASUALTY_MIN_RATE = 0.15
CASUALTY_MAX_RATE = 0.35
VARIANCE_MIN = 0.8
VARIANCE_MAX = 1.2

calculateLossRate(attackPower, defensePower): number
calculateCasualties(units, lossRate, variance?): number
```

#### 1.3 `src/lib/formulas/planet-costs.ts`
```typescript
// PRD 5.3: Planet Pricing
PLANET_COST_SCALING = 0.05
PLANET_RELEASE_REFUND = 0.5

calculatePlanetCost(baseCost, ownedPlanets): number
calculateReleaseRefund(purchasePrice): number
```

#### 1.4 `src/lib/formulas/population.ts`
```typescript
// PRD 4.4: Population Mechanics
FOOD_PER_CITIZEN = 0.05

calculateFoodConsumption(population): number
calculatePopulationGrowth(population, foodSurplus, populationCap): number
calculateStarvationLoss(population, foodDeficit): number
```

#### 1.5 `src/lib/formulas/research-costs.ts`
```typescript
// PRD 9.1: Research Cost Progression
RESEARCH_BASE_COST = 1000
RESEARCH_GROWTH_RATE = 2.0

calculateResearchCost(level): number
calculateTotalResearchCost(fromLevel, toLevel): number
```

#### 1.6 `src/lib/formulas/army-effectiveness.ts`
```typescript
// PRD 6.5: Army Effectiveness
EFFECTIVENESS_RECOVERY_RATE = 2
EFFECTIVENESS_VICTORY_BONUS = 7.5  // average of 5-10
EFFECTIVENESS_DEFEAT_PENALTY = 5
EFFECTIVENESS_MAX = 100
EFFECTIVENESS_MIN = 0

updateEffectiveness(current, event): number
calculateCombatModifier(effectiveness): number
```

#### 1.7 `src/lib/formulas/index.ts`
Barrel export for clean imports.

### Test Files (one per formula)
- `src/lib/formulas/combat-power.test.ts`
- `src/lib/formulas/casualties.test.ts`
- `src/lib/formulas/planet-costs.test.ts`
- `src/lib/formulas/population.test.ts`
- `src/lib/formulas/research-costs.test.ts`
- `src/lib/formulas/army-effectiveness.test.ts`

### Test Requirements
- Each function: 3+ test cases minimum
- Test edge cases: zero values, negative inputs, boundary conditions
- Verify PRD formula accuracy with exact values
- Test pure function behavior: same input = same output

### Checkpoint 1: Adversarial Code Review
After Phase 1, run `/bmad:bmm:workflows:code-review` targeting:
- PRD formula accuracy
- Pure function compliance (no side effects)
- Edge case handling
- Test coverage

---

## Phase 2: Unit Configuration Constants (30 min)

### File to Create

#### 2.1 `src/lib/game/unit-config.ts`
```typescript
// PRD 6.1: Unit Types
UNIT_COSTS = {
  soldiers: 50,
  fighters: 200,
  stations: 5000,
  lightCruisers: 500,
  heavyCruisers: 1000,
  carriers: 2500,
  covertAgents: 4090
}

UNIT_POPULATION = {
  soldiers: 0.2,
  fighters: 0.4,
  stations: 0.5,
  lightCruisers: 1.0,
  heavyCruisers: 2.0,
  carriers: 3.0,
  covertAgents: 1.0
}

UNIT_ATTACK = {
  soldiers: 1,
  fighters: 3,
  stations: 50,
  lightCruisers: 5,
  heavyCruisers: 8,
  carriers: 12
}

UNIT_DEFENSE = {
  soldiers: 1,
  fighters: 2,
  stations: 50,
  lightCruisers: 4,
  heavyCruisers: 6,
  carriers: 10
}
```

### Test File
- `src/lib/game/unit-config.test.ts` - Verify all PRD values match

### Checkpoint 2: Adversarial Code Review
After Phase 2, run `/bmad:bmm:workflows:code-review` targeting:
- PRD value accuracy
- No duplication with existing constants.ts
- Type safety

---

## Phase 3: M8 Bot Persona Templates (4-6 hours)

### Template Structure (15 categories per persona)
```json
{
  "personaId": "persona_id",
  "templates": {
    "greeting": [],         // First contact
    "battleTaunt": [],      // Before attack
    "victoryGloat": [],     // After winning
    "defeat": [],           // After losing
    "tradeOffer": [],       // Market interaction
    "allianceProposal": [], // Diplomacy
    "betrayal": [],         // Breaking treaties
    "covertDetected": [],   // Spy caught
    "tributeDemand": [],    // War extortion
    "threatWarning": [],    // Final warning
    "retreat": [],          // Strategic retreat
    "eliminated": [],       // Empire destroyed
    "endgame": [],          // Turn 150+
    "broadcastShout": [],   // Galactic news
    "casualMessage": []     // Flavor text
  }
}
```

### Directory Structure
```
data/templates/
  warlord/
    marshal_valorian.json
    prophet_zeal.json
    general_ironhide.json
    warlord_kaine.json
    admiral_steelheart.json
    commander_voss.json
    khan_dragovich.json
    imperator_rex.json
    battle_priestess_azara.json
    centurion_maximus.json
    warchief_grimjaw.json
    berserker_thane.json
    gladiator_prime.json
  diplomat/
    (emissary_thalen.json exists)
    ambassador_seraph.json
    ... (12 more)
  merchant/
    (ceo_synergy.json exists)
    baron_midas.json
    ... (11 more)
  schemer/
    (count_dravos.json, collective_one.json exist)
    shadow_sovereign.json
    ... (10 more)
  turtle/
    baron_krell.json
    ... (12 total)
  blitzkrieg/
    (captain_redmaw.json exists)
    raider_fang.json
    ... (11 more)
  tech_rush/
    (merlin_starborn.json exists)
    archmagos_vex.json
    ... (11 more)
  opportunist/
    scavenger_rust.json
    ... (12 total)
```

### Implementation Batches
Work in batches of 10-12 personas to enable periodic reviews:

**Batch 1 (12)**: Complete Warlord archetype
**Batch 2 (12)**: Complete Diplomat archetype
**Batch 3 (12)**: Complete Merchant archetype
**Batch 4 (10)**: Complete Schemer archetype (2 exist)
**Batch 5 (12)**: Complete Turtle archetype
**Batch 6 (11)**: Complete Blitzkrieg archetype (1 exists)
**Batch 7 (11)**: Complete Tech Rush archetype (1 exists)
**Batch 8 (12)**: Complete Opportunist archetype

### Template Guidelines
- 2-3 variants per category for variety
- Use variable placeholders: `{empire_name}`, `{turn}`, `{resource_name}`
- Voice must match persona definition in personas.json
- Each archetype has distinct behavioral patterns
- Reference catchphrase and vocabulary from persona definition

### Checkpoint 3: Adversarial Code Review
After each batch (or at minimum after Phase 3), review:
- Voice consistency with persona definition
- All 15 categories populated
- No duplicate templates across personas
- Variable placeholders correctly formatted

---

## Phase 4: CI/CD Audit and Final Validation (1 hour)

### 4.1 Verify Test Suite
```bash
npm run typecheck   # TypeScript validation
npm run lint        # ESLint validation
npm run test:coverage  # Vitest with coverage
npm run build       # Production build
```

### 4.2 Coverage Requirements
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

### 4.3 Test Matrix for Formulas

| Module | Functions | Min Tests |
|--------|-----------|-----------|
| combat-power.ts | 3 | 9 |
| casualties.ts | 2 | 6 |
| planet-costs.ts | 2 | 6 |
| population.ts | 3 | 9 |
| research-costs.ts | 2 | 6 |
| army-effectiveness.ts | 2 | 6 |
| **Total** | 14 | 42+ |

### 4.4 Template Validation Script
Create `scripts/validate-templates.ts`:
- Verify all 100 personas have template files
- Each file has all 15 categories
- Each category has 2-3 templates minimum
- All persona IDs match personas.json

### Checkpoint 4: Final Adversarial Review
Before commit, comprehensive review of:
- All tests passing
- Coverage thresholds met
- Build succeeds
- No TypeScript errors
- No ESLint warnings
- Template validation passes

---

## Final Commit Steps

1. Run full validation suite:
```bash
npm run typecheck && npm run lint && npm run test:coverage && npm run build
```

2. Verify git status:
```bash
git status
git diff --stat
```

3. Commit with descriptive message:
```bash
git add .
git commit -m "Implement M2 parallel work: formulas, unit config, and bot templates

- Add pure calculation functions: combat-power, casualties, planet-costs,
  population, research-costs, army-effectiveness
- Add unit configuration constants from PRD 6.1
- Add 94 remaining bot persona message templates (100 total)
- Add comprehensive unit tests for all formulas
- All tests passing with >80% coverage"
```

4. Push to remote:
```bash
git push
```

---

## Critical File Paths

### Patterns to Follow
- `src/lib/game/networth.ts` - Formula structure
- `src/lib/game/networth.test.ts` - Test structure
- `src/lib/game/constants.ts` - Constants organization
- `data/templates/tech_rush/merlin_starborn.json` - Template structure

### Files to Create
- `src/lib/formulas/*.ts` (7 files)
- `src/lib/formulas/*.test.ts` (6 test files)
- `src/lib/game/unit-config.ts`
- `src/lib/game/unit-config.test.ts`
- `data/templates/{archetype}/*.json` (94 template files)
- `scripts/validate-templates.ts`

---

## Success Criteria

1. All 6 formula modules created with complete test coverage
2. Unit configuration constants match PRD 6.1 exactly
3. All 100 bot personas have message templates
4. All tests pass with >80% coverage
5. Build succeeds without errors
6. Adversarial code reviews completed at each checkpoint
7. Commit pushed to remote

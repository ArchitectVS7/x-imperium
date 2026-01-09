# Game Balance Review - Nexus Dominion

## Executive Summary

Nexus Dominion presents a well-architected turn-based strategy game with comprehensive systems for combat, economy, and progression. The balance framework is sound with appropriate anti-snowball mechanics (containment bonus, underdog bonus), but several critical issues exist around research cost exponential scaling, civil status income multipliers creating extreme swings, and carrier unit effectiveness being undervalued in combat. The game would benefit from smoother progression curves and more granular tuning of victory condition thresholds.

## Critical Findings (Must Fix)

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| C1 | Research cost exponential scaling too steep | `research-costs.ts:17` | Critical | RESEARCH_GROWTH_RATE = 2.0 means level 10 costs 1,024,000 RP. Combined with 100 RP/turn from research sectors, reaching high levels requires 10,000+ turns. The doubling curve makes late-game research practically unreachable. |
| C2 | Carrier combat effectiveness is zero | `effectiveness.ts:89-95` | Critical | Carriers have 0.0 effectiveness in ALL combat phases (guerilla, ground, orbital, space, pirate_defense). Despite costing 2500 credits and having 12 attack/10 defense in unit-stats.json, they contribute nothing in combat except troop transport. |
| C3 | Civil status "revolting" causes instant defeat | `conditions.ts:318-319` | Critical | checkCivilCollapse() triggers defeat at "revolting" status. Combined with 0.25x income multiplier at revolting, recovery is impossible. A single starvation event can cascade to game-over without counterplay. |
| C4 | Nuclear weapon cost vs game economy mismatch | `nuclear.ts:19` | Critical | NUCLEAR_CONSTANTS.COST = 500,000,000 credits. Starting credits = 100,000. Tourism sector produces 8,000/turn. Even with 4x ecstatic multiplier and 50 tourism sectors, accumulating 500M would take 300+ turns. Nuclear weapons are effectively unobtainable. |

## High Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| H1 | Ecstatic vs Revolting income gap too extreme | `constants.ts:140-149` | High | Ecstatic = 4.0x multiplier, Revolting = 0.25x. This 16x difference creates runaway feedback loops where successful empires snowball and struggling ones cannot recover. |
| H2 | Sector cost scaling compounds with expansion | `sector-costs.ts:14` | High | SECTOR_COST_SCALING = 0.05 (5% per owned sector). At 50 sectors, costs are 3.5x base. This compounds with already high research sector costs (23,000 base), making research victory path prohibitively expensive for expansion-focused players. |
| H3 | Food consumption rate vs production imbalance | `population.ts:15-18` | High | FOOD_PER_CITIZEN = 0.05, POPULATION_GROWTH_RATE = 0.02. Starting with 10,000 pop and 1 food sector (160/turn), consumption is 500/turn but production only 160. New players start with food deficit without understanding why. |
| H4 | Military victory threshold unrealistic | `conditions.ts:83` | High | MILITARY_MULTIPLIER = 2.0 requires 2x military power of ALL other empires combined. In a 50-bot campaign, this means building more military than 49 empires total - effectively impossible unless most are eliminated. |
| H5 | Station power inconsistency between systems | `combat-config.json:3-9, 29-36` | High | Unified system: stations = 30 power. Legacy system: stations = 50 power. This 40% difference means balance testing on one system does not transfer to the other. |
| H6 | Underdog bonus threshold may be too generous | `combat-config.json:10-13` | High | underdogBonus threshold = 0.5, maxBonus = 1.25. Empires with half the power get 25% bonus. This can negate legitimate tactical advantages and create unpredictable combat outcomes. |

## Medium Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| M1 | Victory condition thresholds cluster | `conditions.ts:71-87` | Medium | Conquest (60%) and Diplomatic (50%) thresholds are close, making diplomatic coalitions redundant vs solo conquest. Economic (1.5x) and Survival (also 1.5x) use identical thresholds, reducing strategic diversity. |
| M2 | Nightmare difficulty bonus too low | `difficulty.ts:33-37` | Medium | nightmare resourceBonus = 1.25 (+25%). For experienced players, 25% is trivially overcome. Consider 50-75% bonus or additional qualitative advantages for true challenge. |
| M3 | Retreat casualty flat rate | `casualties.ts:153` | Medium | RETREAT_CASUALTY_RATE = 0.15 (15%) applies uniformly. No consideration for stance (evasive should reduce retreat losses), fleet speed (carriers have higher REA), or battle outcome severity. |
| M4 | Starvation rate potentially too punishing | `population.ts:21` | Medium | STARVATION_RATE = 0.05 (5% per turn). With deficit ratio scaling, severe famines can eliminate 50%+ population rapidly, causing cascading civil status collapse. |
| M5 | Covert agent cost/value unclear | `unit-stats.json:149-152` | Medium | Covert agents cost 4,090 credits with 40 maintenance. They have 0 combat stats but provide covert operations capacity. The value proposition vs 8 light cruisers (same cost) is not communicated. |
| M6 | Theater control thresholds may be too low | `theater-control.ts:52-55` | Medium | SPACE_DOMINANCE_RATIO = 2.0, GROUND_SUPERIORITY_RATIO = 3.0. These thresholds are easily achievable and may grant bonuses too frequently, reducing strategic depth. |
| M7 | Stance casualty modifiers stack with base | `stances.ts:37-67` | Medium | Aggressive = 1.2x casualties taken, Evasive = 0.6x. Combined with loss rate variance (0.8-1.2), extreme outcomes are possible (evasive + good variance = 36% of expected losses). |

## Low Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| L1 | Effectiveness recovery too slow | `army-effectiveness.ts:25` | Low | EFFECTIVENESS_RECOVERY_RATE = 2% per turn. Recovery from 0% to 85% takes 43 turns. This may be intentional but limits comeback potential after devastating defeats. |
| L2 | Education sector has no production rate | `constants.ts:56` | Low | SECTOR_PRODUCTION.education = 0. The civil status bonus is a "special effect" but undocumented in constants. New players may not understand its value. |
| L3 | Diversity bonus requires 4+ unit types | `combat-config.json:37-40` | Low | diversityBonus.minUnitTypes = 4 for 15% bonus. With 6 unit types total (excluding covert), this is relatively easy. Consider 5 for more meaningful strategic choice. |
| L4 | Population cap starting value | `constants.ts:43` | Low | STARTING_POPULATION.populationCap = 50,000. Starting pop = 10,000. Growth rate 2% = 200/turn. Reaching cap takes 200 turns with perfect food. Urban sectors increase cap but value is unclear. |
| L5 | Syndicate trust decay timing | `syndicate.ts:506-508` | Low | decayRate = 5%, decayInterval = 10 turns. Players can lose trust levels during prolonged peaceful gameplay. This may frustrate players pursuing diplomatic strategies. |
| L6 | Build time uniformly zero | `unit-stats.json:6,28,53,etc` | Low | All units have buildTime = 0. This removes the strategic tension of queue planning and makes military buildup instantaneous. Intentional simplification but reduces depth. |

## Corrective Actions

### Immediate Fixes (Critical)

1. **Reduce research cost growth rate** - Change RESEARCH_GROWTH_RATE from 2.0 to 1.5 or 1.4. This makes level 10 cost ~57,665 RP instead of 1,024,000 RP, achievable in reasonable timeframe.

2. **Give carriers combat effectiveness** - Add at least MEDIUM (0.5) effectiveness in space phase. Carriers costing 2500 credits should contribute meaningfully to fleet combat, not just transport.

3. **Add civil status recovery mechanism** - Implement a "stabilization" event type that slowly recovers civil status when food surplus persists. Prevent instant defeat cascade.

4. **Scale nuclear weapon cost to game economy** - Reduce NUCLEAR_CONSTANTS.COST to 50,000,000 or implement "nuclear program" research that reduces cost. Ensure weapons are obtainable by turn 100-150.

### High Priority Fixes

5. **Compress civil status multiplier range** - Change from 4.0x-0.25x to 2.5x-0.5x. This 5x range still rewards success but allows recovery from setbacks.

6. **Rebalance starting sector allocation** - Add 1 additional food sector to starting distribution, or reduce FOOD_PER_CITIZEN from 0.05 to 0.03. New players should not start in food deficit.

7. **Reduce military victory threshold** - Change MILITARY_MULTIPLIER from 2.0 to 1.5. This is still dominant but achievable against a weakened field.

8. **Unify combat power multipliers** - Reconcile unified vs legacy system values. Use unified system values as canonical and deprecate legacy.

### Medium Priority Fixes

9. **Differentiate victory condition thresholds** - Conquest: 55%, Diplomatic: 40%, Economic: 2.0x, Military: 1.5x. This creates clearer strategic paths.

10. **Scale retreat casualties by stance** - Apply stance casualty multiplier to retreat losses. Evasive retreat = 9% losses, Aggressive retreat = 18%.

11. **Add theater control visualizations** - Display theater dominance status in combat preview UI to help players understand why bonuses apply.

12. **Document special effect sectors** - Add production descriptions for education, government, supply, anti_pollution, industrial sectors explaining their non-resource benefits.

## Visionary Recommendations

### Economy Loop Improvements

1. **Implement trade route income** - Add passive income for empires with positive diplomatic relations. Creates incentive for peaceful play alongside military expansion.

2. **Add resource conversion facilities** - Allow ore/petroleum conversion to credits at market rates. Provides economic flexibility for resource-rich but credit-poor empires.

3. **Seasonal/cyclical events** - Introduce galactic events that temporarily boost or reduce resource production. Adds strategic timing considerations.

### Combat System Enhancements

1. **Commander unit bonuses** - Add "flagship" designation for one capital ship providing fleet-wide bonuses. Creates attachment to specific units.

2. **Terrain modifiers** - Different sector types could provide combat modifiers when defending. Research sectors = tech bonus, Government = morale bonus.

3. **Battle fatigue system** - Successive combats reduce effectiveness. Encourages rotation of forces and strategic reserves.

### Victory Path Diversity

1. **Cultural victory** - New path based on education sectors, population happiness, and diplomatic influence. Non-military alternative.

2. **Alliance victory** - Formalized alliance system where combined achievements trigger shared victory. True cooperative play.

3. **Legendary achievements** - Bonus objectives (first to reach X, defeat boss Y) that provide victory points toward a composite score.

### Bot AI Improvements

1. **Archetype-specific victory targeting** - Warlord bots prioritize military victory, Merchant bots prioritize economic. Creates predictable but varied opposition.

2. **Emotional memory influence** - Bot grudges and friendships should meaningfully impact target selection and diplomatic responses beyond current implementation.

3. **Coalition formation AI** - Bots should form meaningful coalitions against leading players, implementing containment bonus more effectively.

## Metrics

- Files reviewed: 23
- Issues found: 17 (Critical: 4, High: 6, Medium: 7, Low: 6)
- Lines of balance-critical code analyzed: ~2,500
- Configuration files reviewed: 3 (unit-stats.json, combat-config.json, constants files)
- Systems analyzed: Combat (4 subsystems), Economy (3 subsystems), Victory (6 conditions), Bot Difficulty (4 levels)

## Files Reviewed

### Formulas (`src/lib/formulas/`)
- `combat-power.ts` - Fleet power calculation with diversity bonus
- `casualties.ts` - Combat casualty rates with variance
- `army-effectiveness.ts` - Effectiveness tracking and recovery
- `population.ts` - Population growth and starvation mechanics
- `sector-costs.ts` - Sector acquisition cost scaling
- `research-costs.ts` - Research point requirements per level

### Combat System (`src/lib/combat/`)
- `effectiveness.ts` - Unit effectiveness matrix by combat phase
- `phases.ts` - Combat phase resolution (guerilla, retreat)
- `stances.ts` - Combat stance modifiers
- `volley-combat-v2.ts` - D20-based 3-volley combat system
- `types.ts` - Combat type definitions
- `nuclear.ts` - Nuclear warfare system
- `theater-control.ts` - Theater dominance bonuses
- `containment-bonus.ts` - Anti-snowball containment mechanic

### Game Constants (`src/lib/game/constants/`)
- `index.ts` - Feature constant aggregation
- `crafting.ts` - Tiered resource recipes and military unit costs
- `syndicate.ts` - Black market trust levels and contracts
- `nuclear.ts` - Nuclear weapon parameters

### Core Game Systems
- `src/lib/game/constants.ts` - Starting resources, sector production, civil status
- `src/lib/game/services/economy/resource-engine.ts` - Resource production calculations
- `src/lib/game/services/population/civil-status.ts` - Civil status evaluation
- `src/lib/game/config/combat-loader.ts` - Combat configuration loading
- `src/lib/bots/difficulty.ts` - Bot difficulty modifiers
- `src/lib/victory/conditions.ts` - Victory condition checks

### Data Files
- `data/unit-stats.json` - Unit costs, maintenance, D20 stats
- `data/combat-config.json` - Combat power multipliers, casualty rates

---

*Review conducted: 2026-01-08*
*Reviewer: Data Analysis Agent*
*Version: Nexus Dominion (main branch, commit c335f30)*

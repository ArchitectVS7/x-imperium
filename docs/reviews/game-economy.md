# Game Economy Review - Nexus Dominion

## Executive Summary

The economic systems are well-structured with clear resource flows and reasonable default values. However, several critical balance issues exist: exponential sector scaling creates runaway inflation for mid-late game, combat ROI is heavily skewed toward attackers at high power ratios, and the covert operations system has exploitable probability distributions. The market lacks sufficient sink mechanisms for late-game credits.

## Critical Findings (Must Fix)

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 1 | Unlimited Resource Accumulation | src/lib/game/services/resource-engine.ts:97-100 | Critical | Resources (minerals, alloys, rareElements) have no caps and accumulate indefinitely. newBalance allows infinite stockpiling with no decay or storage costs, leading to late-game resource explosion. |
| 2 | Randomness in Deterministic Function | src/lib/formulas/casualties.ts:47 | Critical | `Math.random()` in `calculateCasualties` makes outcomes non-deterministic and untestable. Line 47: `const variance = 0.9 + Math.random() * 0.2`. Should use seeded RNG or remove randomness from formula layer. |
| 3 | Division by Zero Risk | src/lib/game/services/market-service.ts:27 | Critical | `calculateMarketPrice` uses `supplyDemandRatio` in exponent without validating it's positive. If ratio is 0 or negative, `Math.pow(0, x)` produces unexpected results. |
| 4 | Loot Calculation Ignores Target Wealth | src/lib/game/services/combat-service.ts:117-122 | Critical | Loot is calculated using hardcoded values (`5000 * lootMultiplier`) rather than percentage of defender's actual resources, making combat ROI disconnected from target value. |

## High Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 5 | Exponential Sector Cost Scaling | src/lib/formulas/sector-costs.ts:25 | High | `SCALING_FACTOR = 1.15` compounds exponentially. By sector 20 of same type, cost is 16x base. This creates prohibitive costs that may never be economically viable. Consider logarithmic scaling. |
| 6 | Civil Status Income Multiplier Too Extreme | src/lib/game/constants/economy.ts:32-41 | High | Ecstatic (4x) vs Revolting (0.25x) is a 16x income differential. This creates unstable positive/negative feedback loops where good empires snowball and struggling empires cannot recover. |
| 7 | Population Growth Rate Inconsistency | src/lib/formulas/population.ts:18-27 | High | `CIVIL_STATUS_GROWTH` shows rioting causes -1% but civil status multiplier in economy.ts shows 0.35x income. Population and income penalties are misaligned. |
| 8 | Covert Success Rate Too High | src/lib/game/services/covert-service.ts:36-47 | High | Base 70% espionage success with potential 1.5x spy ratio modifier means guaranteed intel. Counter-intelligence only reduces by 40%, insufficient deterrent. |
| 9 | Research Compounding Creates Runaway | src/lib/game/services/research-service.ts:43-51 | High | Science research bonus (+10% per level) applies to itself, creating exponential growth. Level 10 science provides 100% bonus, doubling research speed indefinitely. |
| 10 | Missing Upkeep for Stockpiled Resources | src/lib/game/constants/economy.ts | High | No storage costs for resources. Player can stockpile unlimited minerals/alloys without degradation, removing economic pressure to spend or trade. |

## Medium Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 11 | Attacker Casualty Rates Too Favorable | src/lib/formulas/combat-power.ts:79-91 | Medium | At 3:1 ratio, attacker takes only 5% casualties vs defender's 40%. This 8x differential makes overwhelming force too rewarding with minimal risk. |
| 12 | Market Fee Asymmetry | src/lib/game/constants/economy.ts:49-50 | Medium | Buy fee (10%) vs sell fee (5%) creates 15% round-trip cost. This may be intended but discourages active trading and market liquidity. |
| 13 | Spy Durability Too Low | src/lib/formulas/casualties.ts:10 | Medium | Spies have 0.5 durability (most fragile), but they shouldn't participate in direct combat per design. This value is misleading if spies enter combat scenarios. |
| 14 | Syndicate Reputation Gains Too Slow | src/lib/game/services/syndicate-service.ts:150-163 | Medium | Contract completion gives only 3-20 reputation while "attack_member" costs -5 per attack. Reaching "exalted" (80 rep) requires 16-27 legendary contracts with no mistakes. |
| 15 | Unit Build Time Linear Scaling | src/lib/formulas/unit-costs.ts:68-79 | Medium | Build time scales linearly with quantity: 100 capital ships = 500 turns. Should have diminishing returns or parallel queue bonuses be more impactful. |
| 16 | Food Rationing Missing Civil Impact | src/lib/formulas/population.ts:85-88 | Medium | Rationing reduces consumption by 30% but only mentions "hurts morale" in comments. No actual civil status penalty is implemented in the function. |
| 17 | Sector Value Disconnect | src/lib/formulas/sector-costs.ts:68-77 | Medium | Sector values for networth don't align with production value. Research sector (3000 value) produces less credits than agricultural (1000 value) per turn. |
| 18 | Fundamental Research Victory Too Slow | src/lib/game/constants/research.ts:57-60 | Medium | Minimum 100 turns at max research, but progress requires 100 research sectors for 1%/turn. 10000 research sectors needed for 100-turn victory - economically impossible. |
| 19 | No Inflation Control Mechanism | src/lib/game/services/market-service.ts | Medium | Price elasticity (0.01) is too weak. Large trades barely move prices. No mechanism for money supply contraction in late game. |
| 20 | Diversity Bonus Threshold Arbitrary | src/lib/formulas/combat-power.ts:17-18 | Medium | 4+ unit types for 15% bonus. No incremental benefit at 2-3 types, then sudden jump. Consider graduated bonus (5%/7%/10%/15%). |

## Low Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 21 | Capital Ship Cost/Power Imbalance | src/lib/game/constants/units.ts:75-91 | Low | Capital ships cost 10000 credits for 100 power. Heavy cruisers cost 2000 for 35 power. Power/cost ratio: Capital 0.01, Heavy 0.0175. Capital ships are 43% less efficient. |
| 22 | Missing Bomber Effectiveness | src/lib/formulas/army-effectiveness.ts:24-31 | Low | Bombers have 2.0x vs soldiers but orbital phase happens before ground. The effectiveness matrix doesn't reflect phase ordering benefits. |
| 23 | Tax Rate Max 100% Unrealistic | src/lib/game/constants/economy.ts:72-76 | Low | 100% tax rate is allowed but would realistically cause immediate revolt. No special handling for extreme tax rates. |
| 24 | Hardcoded Magic Numbers | src/lib/game/services/civil-status.ts:48-53 | Low | Capacity ratios (1.1, 1.3) and probability checks (0.2, 0.1) are inline. Should be configurable constants. |
| 25 | Population Overflow 10% Cap | src/lib/formulas/population.ts:61 | Low | Population can exceed capacity by 10% (`capacity * 1.1`). The reason for exactly 10% isn't documented. |
| 26 | No Maximum Queue Size | src/lib/game/services/build-queue-service.ts | Low | Build queue has no maximum items limit. Player could queue thousands of orders potentially causing performance issues. |
| 27 | Sector Development Time Short | src/lib/formulas/sector-costs.ts:53-61 | Low | All sectors complete in 2-5 turns. With 200+ turn games, this means rapid expansion. Consider scaling with empire size. |
| 28 | Unused Spy Power Value | src/lib/game/constants/units.ts:96 | Low | Spies have `basePower: 0` and combat phase "covert" but covert effectiveness matrix doesn't exist. Incomplete implementation. |
| 29 | No Resource Trade Volume Limit | src/lib/game/services/market-service.ts | Low | Players can buy/sell unlimited quantities in single transaction, potentially crashing or spiking prices unrealistically. |
| 30 | Missing Error Type Exports | src/lib/formulas/index.ts | Low | Only re-exports functions, not TypeScript types. Consumers must import types separately from each module. |

## Corrective Actions

1. **Implement Resource Caps and Decay**: Add maximum storage capacity per resource with overflow loss or conversion to lower-tier resources.

2. **Replace Math.random() with Seeded RNG**: Create a `RandomGenerator` class that accepts a seed and pass it to all combat/covert functions for reproducible outcomes.

3. **Add Market Supply/Demand Guards**: Validate `supplyDemandRatio > 0` before calculations and implement NaN/Infinity checks.

4. **Connect Loot to Defender Resources**: Change combat loot to `Math.floor(defenderResources.credits * lootMultiplier)` with caps.

5. **Rebalance Civil Status Multipliers**: Reduce extreme range from 16x to 4x (e.g., 2.0 ecstatic to 0.5 revolting).

6. **Implement Research Diminishing Returns**: Cap science research bonus at +50% or use logarithmic scaling.

7. **Add Storage Costs**: Implement per-turn upkeep of 0.1% for stockpiled resources above minimum threshold.

8. **Fix Fundamental Research Formula**: Change requirement to `progress += (researchSectors * scienceMultiplier) / 10` for achievable victory.

## Visionary Recommendations

1. **Dynamic Economic Events**: Add random market events (trade route disruption, resource discovery) that affect prices and create trading opportunities.

2. **Tiered Storage Infrastructure**: Require warehouse/depot sectors to store resources beyond base capacity, creating infrastructure decisions.

3. **Economic Victory Path**: Add "Economic Dominance" victory at 2x average empire networth, creating alternative to combat.

4. **Market Maker Bots**: Implement NPC traders that provide liquidity and prevent extreme price swings.

5. **Research Breakthroughs**: Add random breakthrough events that grant instant progress, rewarding sustained research investment.

6. **Trade Route System**: Allow empires to establish persistent trade routes with allied empires for passive income.

7. **Economic Espionage Depth**: Expand covert ops to include market manipulation, trade embargo enforcement, and economic sanctions.

8. **Seasonal Economic Cycles**: Implement multi-turn economic cycles that affect production and prices, requiring strategic planning.

## Metrics

- **Files reviewed**: 22
- **Issues found**: 30 (Critical: 4, High: 6, Medium: 10, Low: 10)

---

**Review Date**: 2026-01-08
**Reviewer**: Quant Analyst Agent
**Codebase Version**: c335f30 (main branch)

# Elimination Investigation Report

## Problem
Bot stress tests showed **0 eliminations** across all test runs despite thousands of attacks:
- Test 1 (25 bots, 50 turns): 124 attacks, 0 eliminations
- Test 2 (50 bots, 100 turns): 442 attacks, 0 eliminations
- Test 3 (100 bots, 200 turns): 1,793 attacks, 0 eliminations

## Root Cause: Combat Balance

**Attackers win only 1.2% of battles.**

Debug test results (10 bots, 100 turns):
```
⚔️ COMBAT ANALYSIS:
   Total attack decisions: 82
   ✅ Attacker victories: 1
   🛡️  Defender victories: 81
   🤝 Draws: 0
   🌍 Total planets transferred: 1

💡 ATTACKER WIN RATE: 1.2%
   📈 Attacker wins per turn: 0.01
   📉 Avg planets per win: 1.00
   🎯 Wins needed to eliminate (9 planets): ~9
   ⏱️  Estimated turns to eliminate 1 empire: ~900
```

## Why Attackers Lose

### 1. Starting Conditions
- **Every empire starts with 9 planets**
- **Elimination requires losing ALL planets** (or population = 0)
- **Planet capture rate: 5-15% per successful attack, minimum 1**
- **Estimated attacks to eliminate: ~9 successful attacks**

### 2. Defender Advantages
- **Defense Stations**: Empires start with 2 stations, highly effective in combat
- **Home territory**: Defender forces include all stationed units
- **Full military**: Defender commits all forces; attacker only sends partial force

### 3. Bot Behavior
Bots are attacking **too early** with **insufficient forces**:
- Building units (277 in Test 1) but attacking prematurely
- Not checking if they have military superiority before attacking
- Possibly targeting stronger empires instead of weaker ones

### 4. Math Behind the Problem
```
Win rate: 1.2%
Wins per turn: 0.01
Planets per win: 1
Wins needed to eliminate: 9

Time to eliminate = 9 wins / 0.01 wins per turn = 900 turns
```

With a 100-turn limit, eliminations are mathematically unlikely.

## Recommended Fixes

### Option 1: Improve Bot Attack Logic (Preferred)
- ✅ Don't attack unless military power > target's power × 1.5
- ✅ Target weaker empires (networth < own networth)
- ✅ Build more military before attacking
- ✅ Check if we have carriers for invasion (ground phase required)

### Option 2: Reduce Starting Planets
- Change from 9 → 5 starting planets
- Elimination requires only 5 successful attacks
- Faster eliminations, more dynamic gameplay

### Option 3: Increase Planet Capture Rate
- Change from 5-15% → 15-30% capture rate
- Each win takes 2-3 planets instead of 1
- Elimination in 3-5 successful attacks

### Option 4: Weaken Defender Advantage
- Reduce starting stations from 2 → 1
- Adjust combat formulas to favor attackers slightly
- Balance defensive bonuses

## Implementation Priority

1. **Fix bot attack logic** (src/lib/bots/decision-engine.ts)
   - Add power check before attacking
   - Prefer weaker targets

2. **Test with aggressive archetypes** (warlord, blitzkrieg)
   - Run 100-turn test with 100% warlords
   - Should see eliminations if balance is close

3. **Adjust game balance if needed**
   - Start with Option 2 (fewer planets)
   - Then Option 3 (higher capture rate)
   - Option 4 (weaken defense) only if still no eliminations

## Files Analyzed
- `tests/simulation/simulator.ts` - Main simulation loop
- `tests/simulation/empire-factory.ts` - Starting conditions (9 planets)
- `src/lib/combat/phases.ts` - Planet capture logic (5-15%)
- `src/lib/bots/decision-engine.ts` - Bot decision making
- `scripts/debug-eliminations.ts` - Diagnostic tool created

## Related Issues
- **Planet display bug**: Shows `[object Object]` instead of planet count
  - Fix: Change `e.planets` → `e.planets.length` in bot-stress-test.ts

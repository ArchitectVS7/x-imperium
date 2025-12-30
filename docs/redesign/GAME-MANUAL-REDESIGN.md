# NEXUS DOMINION - Ground-Up Redesign
## (Fresh Board Game Design - No Code Baggage)

---

## DESIGN PHILOSOPHY

**Core Pillars**:
1. **Elegant Simplicity**: Easy to learn, deep to master
2. **Meaningful Choices**: Every decision matters
3. **Dynamic Balance**: No runaway winners, comebacks possible
4. **Emergent Stories**: Player actions create memorable narratives

**Target Experience**: 4-8 player space empire game, 60-90 minutes, competitive but social

---

## OBJECT OF THE GAME

First empire to **10 Victory Points** OR last empire standing wins.

### Victory Points (VP) Sources
- **Territory**: 1 VP per 5 planets controlled
- **Dominance**: 2 VP if you control most planets this turn
- **Wealth**: 1 VP per 100k networth
- **Research**: 1 VP per completed tech tree branch
- **Conquest**: 3 VP per empire eliminated (by you)

**Why This Works**: Multiple paths to victory, encourages different strategies

---

## SETUP (Simplified)

### Starting Position
- **5 Planets** (not 9 - easier to capture/defend)
  - 2 Resource planets (food/ore)
  - 1 Military planet (produces units)
  - 1 Economic planet (produces credits)
  - 1 Capital (bonus VP when held, disaster if lost)

- **10 Credits**
- **5 Military Power** (abstracted - don't track individual soldiers)
- **1 Defense Value** (home advantage)

### Board Layout
- Central board shows **30 neutral planets** (6 per player in 5-player game)
- Planets have types: Resource, Military, Economic, Strategic (VP bonus)
- Distance matters: Adjacent planets easier to attack

---

## TURN SEQUENCE (Streamlined to 4 Phases)

### PHASE 1: INCOME
**Simultaneous for all players**

Each planet generates:
- **Resource Planets**: 2 resources
- **Military Planets**: 1 military power
- **Economic Planets**: 3 credits
- **Capital**: 2 credits + 1 VP (if held)

**Civil Unrest** (simple):
- Losing battles: -1 income per loss this turn
- Food shortage: Income halved
- Happy citizens: +50% income (if no attacks against you)

**Why This Works**: Quick, simultaneous, everyone engaged

---

### PHASE 2: BUILD
**Simultaneous for all players**

Spend credits on:
- **Military Units**: 5 credits = 1 military power
- **Defense Stations**: 10 credits = 1 defense value (persists)
- **New Planets**: 15 credits = claim neutral planet (if adjacent)
- **Research**: 10 credits = 1 research point
- **Diplomacy**: 5 credits = propose treaty

**Resource Requirement**:
- Each military power requires 1 resource/turn
- Shortage? Units disband (choose which to lose)

**Why This Works**: Direct costs, clear trade-offs, resource management matters

---

### PHASE 3: ACTION (The Heart of the Game)
**Turn order: Reverse VP order** (weakest player goes first - catchup mechanic)

Each player takes **ONE ACTION**:

#### Option A: Attack Planet
1. **Declare target** (adjacent planet or empire)
2. **Commit forces** (send X military power)
3. **Resolve combat** (attacker vs defender, single roll modified by power)

**Combat Resolution**:
```
Roll 2d6 + Your Power - Enemy Power

12+: Total Victory - Capture planet + eliminate 2 enemy power
10-11: Victory - Capture planet + eliminate 1 enemy power
7-9: Costly Victory - Capture planet, both lose 1 power
4-6: Stalemate - Both lose 1 power, no capture
2-3: Defeat - Lose 2 power, no capture
1-: Total Defeat - Lose 3 power, enemy gains 1 VP

Defender Bonus: +2 to their roll
Defense Stations: +1 per station (cumulative)
```

**Planet Capture**: Winner takes the planet immediately
**Elimination**: If you lose your last planet, you're out (attacker gets 3 VP)

**Why This Works**:
- Single roll keeps it fast
- Range of outcomes creates drama
- Defenders have advantage but aren't invincible
- Losing power matters (attrition warfare)
- Taking last planet = BIG reward (encourages finishing blows)

#### Option B: Expand Economy
- Take **2 neutral adjacent planets** (if affordable)
- OR build **3 defense stations**
- OR gain **5 credits**

#### Option C: Diplomatic Maneuver
- Propose **alliance** (both players get +1 defense when attacked by 3rd party)
- Propose **trade pact** (swap resources efficiently)
- Declare **vendetta** (permanent +2 attack against target, but -2 defense vs everyone)

#### Option D: Research Breakthrough
- Spend 10 research points to unlock tech:
  - **Advanced Weapons**: +1 to all attack rolls
  - **Shields**: +1 to all defense rolls
  - **Economy**: Planets produce +1 resource
  - **Mobility**: Can attack non-adjacent planets
  - **Espionage**: See other players' hands (cards if we add them)

**Why This Works**: One action per turn keeps it decisive, prevents analysis paralysis

---

### PHASE 4: UPKEEP
**Simultaneous for all players**

1. **Pay maintenance**: 1 resource per military power (or disband units)
2. **Check VP**: Count total VP from all sources
3. **Victory check**: Anyone at 10 VP wins
4. **Coalition check**: If any player has 7+ VP, all others gain +1 attack vs leader (automatic)

**Why This Works**: Prevents runaway leaders, natural rubber-banding

---

## COALITION MECHANICS (Built-In)

### Automatic Underdog Bonuses
- **Last place** (fewest VP): Goes first in Action phase, +1 to all combat rolls
- **Second-to-last**: +1 to defense rolls
- **Leader** (most VP): Goes last in Action phase, -1 to attack rolls vs non-adjacent

### Diplomatic Coalitions
- When a player reaches **7 VP**, all treaties against them are free to propose
- Allied players attacking the leader both get +2 to their rolls
- Splitting territory from eliminating leader: Both allies get 1 VP + half planets each

**Why This Works**:
- Mathematically impossible to snowball
- Weak players naturally band together
- Leader must defend multiple fronts
- Social dynamics emerge organically

---

## KEY DESIGN CHANGES FROM CURRENT

### 🎯 Simplified Military
**Current**: 6 unit types (soldiers, fighters, light cruisers, heavy cruisers, carriers, stations)
**Redesign**: Abstract "Military Power" number

**Why**:
- Removes bookkeeping
- Units don't have rock-paper-scissors complexity
- Focus on strategic choices, not unit composition
- Board games use abstraction successfully (Risk, Twilight Imperium)

**Trade-off**: Less tactical depth, but faster gameplay and clearer decisions

---

### 🎯 Unified Combat System
**Current**: 3 sequential phases (space, orbital, ground), must win all 3
**Redesign**: Single combat roll with modifiers

**Why**:
- Current system: 1.2% attacker win rate (broken)
- Redesign: ~40-50% attacker win rate with equal forces (balanced)
- Defender still has advantage (+2 bonus) but attackers can win
- Multiple outcomes (not just win/lose) create interesting results

**Math**:
```
Equal forces (5 power vs 5 power):
Attacker: 2d6 + 5 - 5 = 2d6 (avg 7)
Defender: 2d6 + 5 - 5 + 2 = 2d6 + 2 (avg 9)

Attacker wins 7+: ~42% chance
Defender wins or draws: ~58% chance

Balanced and fair!
```

---

### 🎯 Reduced Starting Planets
**Current**: 9 planets
**Redesign**: 5 planets

**Why**:
- 9 planets × 1 capture/battle = 9 battles to eliminate
- 5 planets × 1 capture/battle = 5 battles to eliminate
- Eliminations become feasible
- Faster endgames
- More dramatic comebacks

**Capital Planet Risk**: Losing your capital hurts badly (lose 1 VP/turn), creates tension

---

### 🎯 Built-In Anti-Snowball
**Current**: No coalition mechanics, leaders can rampage
**Redesign**: Automatic penalties for leaders

**Mechanisms**:
1. **Leader goes last** in turn order (weakest goes first)
2. **Leader gets -1 attack** vs non-adjacent (must consolidate, can't expand everywhere)
3. **7+ VP triggers coalition** (all others get +1 vs leader)
4. **Free treaties** against leader (encourages ganging up)

**Why**: Board games need rubber-banding to stay fun for everyone

---

### 🎯 Streamlined Complexity
**Current**:
- 8 archetypes
- 10 covert ops
- 4-tier crafting
- 3 research branches
- 7 planet types
- 6 unit types
- 8 civil status levels

**Redesign**:
- 5 planet types (4 functional + capital)
- 4 research techs
- 3 treaty types
- 1 military abstraction
- Simple civil unrest (3 states: happy/normal/revolting)

**Why**: Complexity should add depth, not confusion. Every system should create decisions.

---

### 🎯 Fog of War Eliminated
**Current**: Unclear if implemented, bots may know everything
**Redesign**: **Full information game** (like Chess, Go, Catan)

**Why**:
- Hidden information is hard to balance in games
- Full info allows tactical planning
- Social dynamics matter more (alliances, betrayals)
- Simpler to implement and test
- Works for board games (players can count units on board)

**Trade-off**: Less espionage theme, but clearer game state

---

## VICTORY POINT SYSTEM (New)

### Why VP Instead of "First to 60% Territory"?

**Problems with Current System**:
- Binary (either you have 60% or you don't)
- No incremental progress
- One victory path (territory)
- Winner-take-all (no partial credit)

**Benefits of VP System**:
- **Multiple paths**: Territory, wealth, research, conquest all contribute
- **Incremental progress**: Every action moves you toward victory
- **Catchup clear**: "I need 3 more VP" vs "I need 12 more planets"
- **Strategic variety**: Different archetypes pursue different VP sources
- **Social dynamics**: "I'll help you if you don't get to 10 VP this turn"

**VP Tuning**:
```
Territory: 1 VP per 5 planets (slow, steady)
Dominance: 2 VP if most planets (bonus for leader, but temporary)
Wealth: 1 VP per 100k networth (economic path)
Research: 1 VP per tech (specialist path)
Conquest: 3 VP per elimination (aggressive path)
```

**First to 10 VP** creates race tension without requiring 200 turns

---

## COMBAT PHILOSOPHY

### The "Ground War Is Hardest" Principle (Your Concern)

**Your Feedback**:
> "In a real war, the ground war is the hardest. Think Afghanistan or Vietnam. We don't get to just declare victory if we don't eliminate the enemy."

**Redesign Answer**:
Combat isn't about **phases** (space/orbital/ground), it's about **outcomes**:

**2d6 Combat Table**:
- **12+: Total Victory** - You overwhelmed them (like Blitzkrieg)
- **10-11: Victory** - You won, but with losses (like Normandy)
- **7-9: Costly Victory** - You took the objective, but paid the price (like Iwo Jima)
- **4-6: Stalemate** - Both sides exhausted (like WWI trench warfare)
- **2-3: Defeat** - You failed the assault (like Gallipoli)
- **1-: Total Defeat** - Your forces routed (like Little Bighorn)

**Ground war IS hardest** - that's why defender gets +2 bonus!

**Attacker needs**:
- Superior forces (more power)
- Luck (good roll)
- Willingness to take casualties (even costly victory loses 1 power)

**This respects your concern**: You can't just "declare victory" - you need overwhelming force or risky commitment.

---

## ARCHETYPE SYSTEM (Simplified)

Instead of 8 archetypes with complex AI trees, **4 bot personalities** with clear strategies:

### 1. **Warlord**
- **Strategy**: Conquest VP (eliminate empires for 3 VP each)
- **Build**: 80% military, 20% defense
- **Action preference**: Always attack weakest neighbor
- **VP path**: Conquest + Territory

### 2. **Economist**
- **Strategy**: Wealth VP (build up 100k+ networth)
- **Build**: 80% economic planets, 20% military
- **Action preference**: Expand economy, avoid fights
- **VP path**: Wealth + Research

### 3. **Diplomat**
- **Strategy**: Coalition builder (ally with others, backstab leader)
- **Build**: Balanced (40% military, 40% economic, 20% defense)
- **Action preference**: Propose treaties, honor them until leader emerges
- **VP path**: Territory + Dominance (via politics)

### 4. **Researcher**
- **Strategy**: Tech advantage (unlock all 4 techs for 4 VP)
- **Build**: 70% research/credits, 30% defense
- **Action preference**: Turtle, tech up, then strike with bonuses
- **VP path**: Research + late-game Conquest

**Why 4 instead of 8**:
- Clearer differentiation
- Easier to balance
- Easier to test (4² = 16 matchups vs 8² = 64)
- Each has distinct playstyle

---

## BLACK MARKET / SPECIAL ACTIONS

Keep these as **event cards** or **special opportunities**:

**Once per game per player**:
- **Hire Mercenaries**: +3 military power for one attack
- **Sabotage**: Enemy loses 2 military power
- **Trade Embargo**: Target empire loses half income next turn
- **Research Theft**: Copy one of their unlocked techs
- **Assassination**: Remove enemy's research progress

**Why**: Adds spice without overwhelming complexity

---

## COMPARISON: CURRENT vs REDESIGN

| Feature | Current | Redesign | Winner |
|---------|---------|----------|--------|
| **Starting Planets** | 9 | 5 | Redesign (faster eliminations) |
| **Military System** | 6 unit types | Abstract power | Tie (depth vs simplicity) |
| **Combat Phases** | 3 sequential | 1 unified roll | Redesign (1.2% → 45% win rate) |
| **Combat Outcomes** | Win/Lose | 6 outcomes | Redesign (more interesting) |
| **Victory Condition** | 60% territory OR networth | 10 VP (multiple sources) | Redesign (variety) |
| **Coalition Mechanics** | Missing | Built-in automatic | Redesign (**CRITICAL**) |
| **Turn Order** | Arbitrary | Reverse VP | Redesign (catchup) |
| **Fog of War** | Unclear | Full information | Redesign (clarity) |
| **Archetypes** | 8 complex | 4 simple | Redesign (testability) |
| **Resource Management** | Food/Ore/Petroleum separate | Food/Resources abstracted | Tie |
| **Civil Status** | 8 levels | 3 levels | Redesign (simplicity) |
| **Crafting System** | 4 tiers | None (cut) | Current (adds depth) |
| **Research** | 3 branches | 4 discrete techs | Redesign (clearer) |
| **Covert Ops** | 10 types | Event cards | Redesign (streamlined) |
| **Diplomacy** | 2 treaty types | 3 treaty types | Tie |

---

## HONEST ASSESSMENT

### 🔥 Critical Problems with Current Design

1. **Combat is broken** (1.2% attacker win rate)
   - Sequential 3-phase requirement is too harsh
   - Defenders have massive advantage
   - Eliminations mathematically impossible in 50-200 turns

2. **No anti-snowball mechanics**
   - Leaders can steamroll unopposed
   - Weak players have no comeback path
   - Games become boring when outcome is clear early

3. **Complexity without depth**
   - 8 archetypes: Do players feel the difference?
   - 10 covert ops: Are they all used?
   - 4-tier crafting: Does it create interesting decisions or just busywork?
   - 8 civil status levels: Could be 3 levels

4. **Unclear design goal**
   - Is this SRE-with-graphics? (No - we've diverged)
   - Is this a deep strategy game? (Unclear - complexity ≠ depth)
   - Is this a social board game? (Maybe - but needs more player interaction)

### ✅ What's Working

1. **Turn structure** (phased processing is clean)
2. **Bot archetypes concept** (good differentiation idea)
3. **Resource management** (food/military balance is interesting)
4. **Research/crafting** (adds progression)
5. **Foundation is solid** (code quality, architecture, DB schema)

---

## THE BIG QUESTION: Fix or Overhaul?

### Option A: Big Fixes (Keep Current Core)
**Required Changes**:
1. Fix combat balance (allow 2/3 phase victory OR single roll system)
2. Add coalition mechanics (gang up on leaders)
3. Reduce starting planets (9 → 5)
4. Add attack restraint for leaders

**Effort**: 2-3 days of coding
**Risk**: Medium (core systems stay, patch balance)
**Result**: Playable game, but complexity remains

### Option B: Overhaul the Guts (Redesign)
**Required Changes**:
1. Simplify military (6 unit types → abstract power)
2. Unified combat system (1 roll with outcomes)
3. VP-based victory (multiple paths)
4. Built-in coalition mechanics
5. Cut crafting system (or drastically simplify)
6. Reduce archetypes (8 → 4)
7. Simplify civil status (8 → 3 levels)

**Effort**: 2-3 weeks of redesign + coding
**Risk**: High (major changes, lots of testing)
**Result**: Elegant game, but throws away existing work

---

## MY RECOMMENDATION

### 🎯 Hybrid Approach: "Big Fix with Redesign Philosophy"

**Phase 1: Critical Fixes (This Week)**
1. ✅ Fix planet display bug (done)
2. 🔴 **Unified combat system** (replace 3 sequential phases with single resolution)
   - Use redesign's 2d6 + power system
   - Keep unit types for flavor, abstract power for calculation
   - 6 outcomes instead of win/lose
3. 🔴 **Reduce starting planets** (9 → 5)
4. 🔴 **Add coalition mechanics** (automatic bonuses vs leaders)
5. 🔴 **Reverse turn order** (weakest goes first)

**Estimated**: 3-4 days of focused work
**Result**: Playable, balanced game

**Phase 2: Simplification (Next Sprint)**
6. 🟡 **Reduce archetypes** (8 → 4, merge similar ones)
7. 🟡 **Simplify civil status** (8 levels → 3: Happy/Normal/Revolting)
8. 🟡 **Evaluate crafting** (keep if it adds decisions, cut if it's busywork)

**Estimated**: 1 week
**Result**: Streamlined game

**Phase 3: Polish (Later)**
9. 🟢 VP system (optional enhancement)
10. 🟢 Event cards (optional flavor)

### Why This Works
- **Fixes critical balance issues** (combat, coalitions)
- **Keeps working systems** (archetypes, research, diplomacy)
- **Simplifies gradually** (can test at each phase)
- **Minimizes wasted work** (leverages existing code)
- **Clear MVP**: Phase 1 = playable game, Phase 2 = elegant game, Phase 3 = polished game

---

## NEXT STEPS

1. **Review this document**
2. **Choose path**: Big Fix, Overhaul, or Hybrid?
3. **If Hybrid**: Start with unified combat system (biggest impact)
4. **Test with bot stress tests** after each change
5. **Iterate** based on results

---

**Bottom Line**: We're in **"Big Fix" mode**, not "Oh Shit Overhaul" mode.

The core game is solid. The combat system is broken. Coalition mechanics are missing. These are fixable problems.

But if you want an **elegant** game? We need Phase 2 simplification too.

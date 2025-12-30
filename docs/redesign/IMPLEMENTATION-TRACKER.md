# Nexus Dominion - Implementation Tracker

## Overview

This document tracks all identified gaps, proposed solutions, implementation status, and testing requirements for the Nexus Dominion redesign.

---

## Open Items

### 1. Combat System - Broken Math
- **Status:** ❌ NOT IMPLEMENTED
- **Problem:** Sequential 3-phase combat (space → orbital → ground) results in ~1.2% attacker win rate. Attacker must win ALL three phases.
- **Proposed Solutions:**
  - **A) 2/3 Phase Victory (SRE Model):** Win 2 of 3 phases = victory
  - **B) Unified Combat Roll:** Single roll with all forces, phases are narrative only
  - **C) Parallel Phase Resolution:** All phases resolve simultaneously, aggregate results
- **Recommendation:** Solution B (Unified Roll) - simplest, most balanced
- **Files to Modify:** `src/lib/combat/phases.ts`, `src/lib/game/services/combat-service.ts`
- **Testing Required:**
  - [ ] Unit tests for new combat math
  - [ ] 100 simulated battles with varied force compositions
  - [ ] Verify attacker win rate is 30-50% when forces are equal
  - [ ] Verify defender advantage (home turf) is meaningful but not insurmountable

### 2. Sphere of Influence / Geography System
- **Status:** ✅ IMPLEMENTED (schema + services)
- **Problem:** 100 empires = 100 potential attack targets = overwhelming
- **Solution:** Regional geography limits attackable targets to ~25 neighbors
- **Implementation:**
  - [x] Database schema (`galaxy_regions`, `region_connections`, `empire_influence`)
  - [x] Influence sphere calculation service
  - [x] Galaxy generation service
  - [x] Attack validation with force multipliers
- **Testing Required:**
  - [ ] **PRIORITY:** Verify attack validation rejects distant empires
  - [ ] Verify force multiplier applies (1.5x for extended neighbors)
  - [ ] Test galaxy generation produces valid connected graphs
  - [ ] Integration test with 100 empires

### 3. Wormhole Discovery Mechanic
- **Status:** ✅ IMPLEMENTED (service logic)
- **Problem:** How do empires reach distant regions?
- **Solution:** Hidden wormholes discovered through exploration
- **Discovery Mechanism (as implemented):**
  ```
  Base chance: 2% per turn
  + 1% per covert agent (max 5 agents = +5%)
  + 0.5% per research level
  Max chance: 20%
  ```
- **Discovery Process:**
  1. Wormholes are created as "undiscovered" during galaxy generation
  2. Each turn, empires roll for discovery based on above formula
  3. Priority given to wormholes connected to empire's region
  4. Discovered wormholes can be used immediately (1.0x force cost)
  5. Unstabilized wormholes have 5% collapse chance per turn
  6. Stabilization costs 50,000 credits + research level 5
- **NOT via crafting** - discovery is passive/automatic based on stats
- **Testing Required:**
  - [ ] Verify wormhole generation places shortcuts between distant regions
  - [ ] Verify discovery rolls work correctly
  - [ ] Verify stabilization mechanics
  - [ ] Verify collapse/reopen mechanics
  - [ ] Integration test: empire discovers wormhole, attacks via it

### 4. Bot Coalition Formation
- **Status:** ❌ NOT IMPLEMENTED
- **Problem:** Weaker bots need to band together against stronger ones
- **Proposed Solution:**
  - Bots evaluate threats based on networth differential
  - When threat detected (enemy 2x+ networth), seek coalition partners
  - Coalition formation based on shared enemies + archetype compatibility
  - Coalition attacks coordinated in same turn
- **Files to Create:** `src/lib/bots/coalition-ai.ts`
- **Testing Required:**
  - [ ] Verify bots identify threats correctly
  - [ ] Verify coalition invitation logic
  - [ ] Verify coordinated attacks
  - [ ] 10-bot test: weak bots form coalition against strong bot

### 5. Natural Boss Emergence
- **Status:** ❌ NOT IMPLEMENTED
- **Problem:** Need "boss" encounters without scripted bosses
- **Proposed Solution:**
  - Bots fight bots naturally during turn processing
  - Winners grow stronger, losers shrink or die
  - After 50+ turns, surviving strong bots ARE the bosses
  - 30-turn checkpoints identify "runaway" empires
- **Implementation Notes:**
  - Checkpoint service exists (`src/lib/game/services/checkpoint-service.ts`)
  - Need to wire bot-vs-bot combat into turn processing
- **Testing Required:**
  - [ ] 25-bot simulation for 100 turns
  - [ ] Verify power concentration (some bots become dominant)
  - [ ] Verify weak bots don't all die immediately

### 6. Syndicate / Black Market Operations
- **Status:** ✅ PARTIALLY IMPLEMENTED (schema + contracts)
- **Problem:** Weaker players need asymmetric options
- **Existing Implementation:**
  - Trust levels (unknown → syndicate_lord)
  - Contract types (supply_run, disruption, kingslayer, etc.)
  - Pirate mission system
- **Missing:**
  - [ ] Syndicate targeting "runaway" empires automatically
  - [ ] Frame operations (make it look like another empire attacked)
  - [ ] Black market resource trading at unfavorable rates
- **Testing Required:**
  - [ ] Verify trust progression
  - [ ] Verify contract completion mechanics
  - [ ] Verify pirate raids damage target appropriately

### 7. Star Map Visualization
- **Status:** ❌ NOT IMPLEMENTED
- **Problem:** Players need to see their sphere of influence
- **Proposed Solution:**
  - Force-directed graph showing regions as clusters
  - Empires as nodes within regions
  - Connections as edges (color-coded by type)
  - Player's sphere highlighted
  - Wormholes shown as special connections
- **Files to Create:** `src/components/game/starmap/GalaxyMap.tsx`
- **Testing Required:**
  - [ ] Visual verification with 10 regions
  - [ ] Performance test with 100 empires
  - [ ] Verify sphere highlighting is accurate

### 8. Catch-Up Mechanics
- **Status:** ✅ PARTIALLY IMPLEMENTED
- **Existing:**
  - 30-turn checkpoint evaluations
  - Syndicate contracts target strong empires
  - Covert operations for weaker empires
- **Missing:**
  - [ ] Encouraged coalition UI prompts
  - [ ] Syndicate auto-targeting runaway players
  - [ ] Dynamic difficulty adjustment for struggling players
- **Testing Required:**
  - [ ] Verify checkpoint correctly identifies runaway empires
  - [ ] Verify Syndicate offers relevant contracts

### 9. Game Modes
- **Status:** ❌ NOT IMPLEMENTED
- **Proposed Modes:**
  - **Oneshot (10 empires):** Quick 1-2 hour game, simple bots
  - **Standard (25 empires):** 4-8 hour campaign, mixed bots
  - **Campaign (50-100 empires):** Multi-session, full complexity
- **Implementation Notes:**
  - Game creation should accept mode parameter
  - Mode determines: empire count, bot tiers, turn limit, protection period
- **Files to Modify:** `src/lib/db/schema.ts` (add game_mode enum), game creation flow
- **Testing Required:**
  - [ ] Each mode should be playable end-to-end

### 10. Turn Order / Resolution
- **Status:** ❌ NOT IMPLEMENTED
- **Problem:** Turn order affects outcomes unfairly
- **Proposed Solutions:**
  - **Combat:** Weak-first order with underdog bonuses
  - **Economy:** Simultaneous resolution (all income at once)
  - **Bot Processing:** Parallel during player "thinking time"
- **Implementation Notes:**
  - Current: Sequential processing
  - Needed: Batch all player actions, then resolve simultaneously
- **Testing Required:**
  - [ ] Verify weak-first ordering in combat phase
  - [ ] Verify simultaneous economy resolution
  - [ ] Performance test parallel bot processing

---

## Testing Protocol

### Database Efficiency Rules
**CRITICAL: We have 512MB database limit**

1. **Clean up after tests:** Delete test games and all related data
2. **Use transactions:** Batch inserts/updates
3. **Limit test data:** Use minimum viable empire/turn counts
4. **Monitor size:** Check `pg_database_size()` before/after tests

### Test Progression

#### Phase 1: Unit Tests (Current Priority)
- [ ] Sphere of influence attack validation
- [ ] Wormhole discovery mechanics
- [ ] Force multiplier calculations

#### Phase 2: 10-Bot Integration Tests
- [ ] Create test game with 10 bots
- [ ] Run 20 turns
- [ ] Verify: attacks only within sphere, wormholes discoverable
- [ ] **Clean up test data after each run**

#### Phase 3: 25-Bot Simulation
- [ ] Run 10 games of 50 turns each
- [ ] Verify: natural power concentration, coalition formation
- [ ] Verify: no single dominant strategy

#### Phase 4: 50-Bot Simulation
- [ ] Run 10 games of 100 turns each
- [ ] Verify: scalability, performance
- [ ] Verify: emergent boss behavior

#### Phase 5: 100-Bot Full Test
- [ ] Run 5 games of 200 turns each
- [ ] Full feature validation
- [ ] Performance profiling

---

## Immediate Next Steps

### Priority 1: Test Sphere of Influence
The geography system is implemented but untested. Need to verify:

```typescript
// Test: Can empire attack distant target?
// Expected: NO - should be rejected with "outside sphere of influence"

// Test: Can empire attack direct neighbor?
// Expected: YES - force multiplier 1.0x

// Test: Can empire attack extended neighbor?
// Expected: YES - force multiplier 1.5x

// Test: Can empire attack via discovered wormhole?
// Expected: YES - force multiplier 1.0x
```

### Priority 2: Fix Combat Math
Before any meaningful bot testing, combat must work. Current 1.2% attacker win rate makes the game unplayable.

### Priority 3: Wire Up Turn Processing
The services exist but aren't integrated into the turn processor. Need to:
1. Generate galaxy on game creation
2. Update influence spheres when planets change hands
3. Process wormhole discovery/collapse each turn

---

## Wormhole Discovery - Detailed Explanation

### How It Works (No Crafting Required)

1. **Galaxy Generation:**
   - Wormholes placed between distant regions (> 50 units apart)
   - ~2 wormholes per 10 empires
   - All start as "undiscovered"

2. **Each Turn (Automatic):**
   - Every empire rolls for discovery
   - Chance = 2% + (covert_agents × 1%) + (research_level × 0.5%)
   - Maximum 20% chance
   - Higher chance for wormholes near your region

3. **After Discovery:**
   - Wormhole becomes usable immediately
   - Only discoverer knows about it initially
   - 5% collapse chance per turn if not stabilized

4. **Stabilization (Optional):**
   - Cost: 50,000 credits
   - Requirement: Research level 5
   - Result: 0% collapse chance, becomes public knowledge

5. **Collapse/Reopen:**
   - Unstabilized wormholes may collapse (5%/turn, increases over time)
   - Collapsed wormholes have 1% chance to reopen per turn
   - Auto-stabilizes after 50 turns if not collapsed

### Testing Wormholes

```typescript
// 1. Create game with 10 empires
// 2. Verify wormholes generated between distant regions
// 3. Give one empire 5 covert agents (7% discovery chance)
// 4. Run 20 turns
// 5. Verify at least one wormhole discovered
// 6. Verify empire can attack via wormhole at 1.0x cost
// 7. Clean up test data
```

---

## File References

| Feature | Key Files |
|---------|-----------|
| Geography Schema | `src/lib/db/schema.ts` (lines 1014-1155) |
| Influence Sphere | `src/lib/game/services/influence-sphere-service.ts` |
| Wormhole Mechanics | `src/lib/game/services/wormhole-service.ts` |
| Galaxy Generation | `src/lib/game/services/galaxy-generation-service.ts` |
| Attack Validation | `src/lib/game/services/attack-validation-service.ts` |
| Combat (broken) | `src/lib/combat/phases.ts` |
| Turn Processing | `src/lib/game/services/turn-processor.ts` |
| Checkpoint Service | `src/lib/game/services/checkpoint-service.ts` |
| Syndicate System | `src/lib/db/schema.ts` (syndicate tables) |

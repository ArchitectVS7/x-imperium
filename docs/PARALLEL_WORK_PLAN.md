# Parallel Work Plan - X-Imperium




## 🔄 Parallel to M5: Random Bots

**What M5 is doing:** Creating 25 Tier 4 random bots, starmap, difficulty settings

**Safe parallel work:**

### 1. M9 Archetype Behavior Definitions ⭐⭐⭐ HIGH VALUE
**Location:** `src/lib/bots/archetypes/`
**Time:** 3-4 hours
**Risk:** ⭐⭐ Low - specifications from PRD 7.6

**Files to create:**
```typescript
// src/lib/bots/archetypes/warlord.ts
export const WARLORD_BEHAVIOR = {
  militarySpendingPercent: 0.7,
  attackThreshold: 0.5, // attacks if enemy < 50% power
  passiveAbility: "war_economy", // -20% military cost when at war
  tellRate: 0.7,
};

// src/lib/bots/archetypes/diplomat.ts
export const DIPLOMAT_BEHAVIOR = {
  allianceSeekingPercent: 0.8,
  attackOnlyWithAllies: true,
  passiveAbility: "trade_network", // +10% income per alliance
  tellRate: 0.8,
};

// ... all 8 archetypes from PRD 7.6
```

### 2. M10 Emotional State Definitions ⭐⭐ MEDIUM VALUE
**Location:** `src/lib/bots/emotions/`
**Time:** 1-2 hours
**Risk:** ⭐ None - static data

**Files to create:**
```typescript
// src/lib/bots/emotions/states.ts
export const EMOTIONAL_STATES = {
  confident: {
    decisionQuality: +0.05,
    negotiation: +0.10,
    aggression: +0.10,
  },
  arrogant: {
    decisionQuality: -0.15,
    negotiation: -0.30,
    aggression: +0.30,
  },
  // ... all 6 states from PRD 7.8
} as const;

// src/lib/bots/emotions/triggers.ts
export function calculateEmotionalResponse(
  event: GameEvent,
  currentState: EmotionalState
): EmotionalState {
  // Determine new emotional state based on events
}
```

### 3. M10 Memory Weight System ⭐⭐ MEDIUM VALUE
**Location:** `src/lib/bots/memory/`
**Time:** 1-2 hours
**Risk:** ⭐ None

**File to create:**
```typescript
// src/lib/bots/memory/weights.ts
export const MEMORY_WEIGHTS = {
  planet_captured: 80,
  saved_from_destruction: 90,
  alliance_broken: 70,
  battle_won: 40,
  trade_completed: 10,
  message_sent: 1,
} as const;

export const PERMANENT_SCAR_CHANCE = 0.2; // 20% of negative events

export function calculateMemoryDecay(
  weight: number,
  turnsSince: number
): number {
  // Decay calculation: high-weight memories persist longer
}
```

---

## 🔄 Parallel to M6: Victory & Persistence

**What M6 is doing:** Victory conditions, defeat conditions, auto-save, turn 200 endgame

**Safe parallel work:**

### 1. M11 Galactic Events Definitions ⭐⭐⭐ HIGH VALUE
**Location:** `src/lib/events/`
**Time:** 3-4 hours
**Risk:** ⭐⭐ Low - creative content

**Files to create:**
```typescript
// src/lib/events/economic.ts
export const ECONOMIC_EVENTS = [
  {
    id: "market_crash",
    name: "Market Crash",
    description: "All prices drop 30%",
    effect: { priceMultiplier: 0.7 },
    probability: 0.05,
  },
  {
    id: "resource_boom",
    name: "Resource Boom",
    description: "All production +50% for 5 turns",
    effect: { productionBonus: 0.5, duration: 5 },
    probability: 0.08,
  },
  // ... more economic events
];

// src/lib/events/political.ts
// Coups, assassinations, etc.

// src/lib/events/military.ts
// Pirate armadas, arms races, etc.

// src/lib/events/narrative.ts
// Lore drops, prophecies, etc.
```

### 2. Victory Condition Formulas ⭐ MEDIUM VALUE
**Location:** `src/lib/victory/conditions.ts`
**Time:** 1 hour
**Risk:** ⭐ None

**File to create:**
```typescript
// src/lib/victory/conditions.ts
export function checkConquestVictory(
  empire: Empire,
  totalPlanets: number
): boolean {
  return empire.planetCount / totalPlanets >= 0.6; // 60% control
}

export function checkEconomicVictory(
  empire: Empire,
  secondPlaceNetworth: number
): boolean {
  return empire.networth >= secondPlaceNetworth * 1.5; // 1.5× second place
}

// ... all 6 victory conditions from PRD 10.1
```

---

## 📊 Summary: Safe Parallel Work Remaining

### Immediate (Can start now alongside M2):
1. ⭐⭐⭐ **Pure Calculation Functions** (2-3 hours) - Saves time across ALL milestones
2. ⭐⭐⭐ **Constants Files** (1 hour) - Referenced by all systems
3. ⭐⭐⭐ **Remaining M8 Templates** (6-8 hours, incremental) - Critical for M8

### Next Priority (During M3-M4):
4. ⭐⭐ **Combat Logic** (3-4 hours) - Ready for M4 integration
5. ⭐⭐ **Market Formulas** (2 hours) - Ready for M7
6. ⭐⭐ **Covert Operations** (3-4 hours) - Ready for M6.5

### Later (During M5-M6):
7. ⭐⭐ **Archetype Behaviors** (3-4 hours) - Ready for M9
8. ⭐⭐ **Emotional States** (2-3 hours) - Ready for M10
9. ⭐⭐ **Galactic Events** (3-4 hours) - Ready for M11

### Total Parallel Work Remaining:
- **Time Investment:** ~30-40 hours (can be spread across M2-M6)
- **Time Saved Later:** ~5-7 days during M4-M11 implementation
- **Risk Level:** Low (pure functions, data, UI shells)

---

## ✅ Recommendation: Start with Top 3

**Highest ROI for immediate parallel work:**
1. **Pure Calculation Functions** (2-3 hours) - Used by EVERY milestone
2. **Constants Files** (1 hour) - Referenced constantly
3. **M8 Templates** (incremental) - High value, low risk, can do 5-10 personas at a time

These three provide maximum value with minimal risk and zero dependencies on M2-M6 implementation!

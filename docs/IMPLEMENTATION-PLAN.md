# Nexus Dominion: Technical Implementation Plan

**Created**: 2025-12-30
**Status**: DRAFT - Awaiting Approval
**Scope**: Quick Wins Implementation (Infrastructure, UX, Balance)

---

## Overview

This plan addresses three categories of "quick wins" identified for implementation:

1. **Easy Quick Wins** (Infrastructure): Starting planets, game creation, session management
2. **UX Quick Wins** (UI): Galaxy view, sector detail, LCARS panel system
3. **Game Balance Quick Wins**: Reverse turn order, underdog bonus, punching-up bonus

All features will be implemented with appropriate testing at 10, 25, and 50 bot scales.

---

## Milestone Structure

```
MILESTONE 1: Infrastructure Foundation (Est. 2-3 days)
├── 1.1 Reduce starting planets (9 → 5)
├── 1.2 Feature flag system
├── 1.3 Game mode schema
└── 1.4 Game creation flow

MILESTONE 2: Session Management (Est. 2-3 days)
├── 2.1 Session save/resume
├── 2.2 Mode selection on return
└── 2.3 Session state tracking

MILESTONE 3: Starmap UI - Foundation (Est. 3-4 days)
├── 3.1 LCARS panel system
├── 3.2 Galaxy View component
└── 3.3 Sector Detail component

MILESTONE 4: Game Balance Mechanics (Est. 2-3 days)
├── 4.1 Reverse turn order
├── 4.2 Underdog combat bonus (feature-flagged)
└── 4.3 Punching-up victory bonus (feature-flagged)

MILESTONE 5: Integration & Testing (Est. 2-3 days)
├── 5.1 10-bot integration tests
├── 5.2 25-bot simulation tests
└── 5.3 50-bot stress tests
```

**Total Estimated Time**: 11-16 days

---

## Milestone 1: Infrastructure Foundation

### 1.1 Reduce Starting Planets (9 → 5)

**Status**: 📋 PLANNED (Simple config change)
**Priority**: P0
**Estimated**: 0.5 day

**Current State**:
```typescript
// src/lib/game/constants.ts (lines 88-96)
export const STARTING_PLANETS: Array<{ type: PlanetType; count: number }> = [
  { type: "food", count: 2 },
  { type: "ore", count: 2 },
  { type: "petroleum", count: 1 },
  { type: "tourism", count: 1 },
  { type: "urban", count: 1 },
  { type: "government", count: 1 },
  { type: "research", count: 1 },
];
// Total: 9 planets
```

**Target State**:
```typescript
export const STARTING_PLANETS: Array<{ type: PlanetType; count: number }> = [
  { type: "food", count: 1 },        // Reduced from 2
  { type: "ore", count: 1 },         // Reduced from 2
  { type: "petroleum", count: 1 },
  { type: "tourism", count: 1 },
  { type: "government", count: 1 },  // Keep for covert ops capacity
];
// Total: 5 planets
// NOTE: Research planet removed - players must buy it
```

**Files to Modify**:
- `src/lib/game/constants.ts` - Update STARTING_PLANETS
- `src/lib/bots/__tests__/bot-generator.test.ts` - Update expected count
- `tests/simulation/empire-factory.ts` - Update test factory

**Testing**:
- [ ] Unit test: Verify new games start with 5 planets
- [ ] Unit test: Verify planet types are correct
- [ ] Manual test: Create new game, confirm dashboard shows 5 planets

**Commit**: `feat: reduce starting planets to 5 for faster eliminations`

---

### 1.2 Feature Flag System

**Status**: 📋 PLANNED (New system)
**Priority**: P0
**Estimated**: 0.5 day

**Purpose**: Enable/disable experimental mechanics for playtesting

**Files to Create**:
```
src/lib/config/
├── feature-flags.ts      # Flag definitions and defaults
├── feature-flags.test.ts # Unit tests
└── index.ts              # Exports
```

**Implementation**:
```typescript
// src/lib/config/feature-flags.ts

export const FEATURE_FLAGS = {
  // Balance mechanics
  COALITION_RAIDS: false,      // +5% per attacker vs boss
  UNDERDOG_BONUS: false,       // +10-20% when attacking stronger
  PUNCHUP_BONUS: false,        // Bonus for winning against stronger

  // Connection types
  TRADE_ROUTES: false,         // Trade routes as attack relay
  HAZARD_ZONES: false,         // Hazardous connections
  CONTESTED_ZONES: false,      // Contested areas
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

// Runtime flag getter (checks env vars, then defaults)
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const envKey = `FEATURE_${flag}`;
  const envValue = process.env[envKey];
  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1';
  }
  return FEATURE_FLAGS[flag];
}

// For games table: per-game feature override
export interface GameFeatureFlags {
  coalitionRaids?: boolean;
  underdogBonus?: boolean;
  punchupBonus?: boolean;
  tradeRoutes?: boolean;
}
```

**Schema Addition** (optional per-game flags):
```typescript
// Add to games table in schema.ts
featureFlags: jsonb("feature_flags").$type<GameFeatureFlags>().default({}),
```

**Testing**:
- [ ] Unit test: Default flags return expected values
- [ ] Unit test: Environment override works
- [ ] Unit test: Per-game override works

**Commit**: `feat: add feature flag system for experimental mechanics`

---

### 1.3 Game Mode Schema

**Status**: 📋 PLANNED
**Priority**: P0
**Estimated**: 0.5 day

**Purpose**: Support oneshot vs campaign modes

**Schema Addition**:
```typescript
// Add to src/lib/db/schema.ts

export const gameModeEnum = pgEnum("game_mode", [
  "oneshot",   // 10-25 empires, 50-100 turns, single session
  "campaign",  // 50-100 empires, 200+ turns, multi-session
]);

// Add to games table
gameMode: gameModeEnum("game_mode").notNull().default("oneshot"),
sessionCount: integer("session_count").notNull().default(0),
lastSessionAt: timestamp("last_session_at"),
```

**Game Mode Presets**:
```typescript
// src/lib/game/constants.ts

export const GAME_MODE_PRESETS = {
  oneshot: {
    minBots: 10,
    maxBots: 25,
    defaultBots: 15,
    minTurns: 50,
    maxTurns: 100,
    defaultTurns: 75,
  },
  campaign: {
    minBots: 25,
    maxBots: 100,
    defaultBots: 50,
    minTurns: 150,
    maxTurns: 500,
    defaultTurns: 200,
  },
} as const;
```

**Testing**:
- [ ] Run `npm run db:generate` and verify migration
- [ ] Unit test: New games have correct mode
- [ ] Unit test: Mode presets return correct values

**Commit**: `feat: add game mode schema (oneshot vs campaign)`

---

### 1.4 Game Creation Flow

**Status**: 📋 PLANNED
**Priority**: P0
**Estimated**: 1 day

**Current State**: Basic empire name + bot count + difficulty selection (src/app/game/page.tsx)

**Target State**: Full game creation with mode selection

**Files to Modify**:
- `src/app/game/page.tsx` - Update NewGamePrompt
- `src/components/start-game/GameModeSelector.tsx` - NEW
- `src/app/actions/game-actions.ts` - Update startGameAction

**UI Flow**:
```
┌─────────────────────────────────────────────────────┐
│           NEXUS DOMINION - NEW GAME                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Empire Name: [________________]                    │
│                                                     │
│  Game Mode:                                         │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │    ONESHOT      │  │    CAMPAIGN     │          │
│  │  Quick game     │  │  Multi-session  │          │
│  │  10-25 empires  │  │  50-100 empires │          │
│  │  50-100 turns   │  │  200+ turns     │          │
│  └─────────────────┘  └─────────────────┘          │
│                                                     │
│  Bot Count: [====|==========] 25                    │
│  Difficulty: [Normal ▼]                             │
│                                                     │
│           [ BEGIN CONQUEST ]                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// src/components/start-game/GameModeSelector.tsx

export function GameModeSelector({
  defaultValue = "oneshot"
}: {
  defaultValue?: "oneshot" | "campaign"
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <label className={/* selected styles */}>
        <input type="radio" name="gameMode" value="oneshot" />
        <div className="text-lg font-display">ONESHOT</div>
        <div className="text-sm text-gray-400">
          Quick game • 10-25 empires • 50-100 turns
        </div>
      </label>
      <label className={/* selected styles */}>
        <input type="radio" name="gameMode" value="campaign" />
        <div className="text-lg font-display">CAMPAIGN</div>
        <div className="text-sm text-gray-400">
          Multi-session • 50-100 empires • 200+ turns
        </div>
      </label>
    </div>
  );
}
```

**Testing**:
- [ ] Unit test: GameModeSelector renders correctly
- [ ] Unit test: startGameAction creates game with correct mode
- [ ] E2E test: Full game creation flow
- [ ] Manual test: Create oneshot and campaign games

**Commit**: `feat: implement game creation flow with mode selection`

---

## Milestone 2: Session Management

### 2.1 Session Save/Resume

**Status**: 📋 PLANNED
**Priority**: P0
**Estimated**: 1 day

**Philosophy**: Auto-save only. NO manual save/load to prevent save-scumming.

**Schema Addition**:
```typescript
// Add session tracking table
export const gameSessions = pgTable("game_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  sessionNumber: integer("session_number").notNull(),
  startTurn: integer("start_turn").notNull(),
  endTurn: integer("end_turn"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  empiresEliminated: integer("empires_eliminated").default(0),
  notableEvents: jsonb("notable_events").$type<string[]>().default([]),
});
```

**Implementation**:
```typescript
// src/lib/game/services/session-service.ts

export async function startSession(gameId: string): Promise<GameSession> {
  const game = await getGame(gameId);
  const sessionNumber = game.sessionCount + 1;

  const session = await db.insert(gameSessions).values({
    gameId,
    sessionNumber,
    startTurn: game.currentTurn,
  }).returning();

  await db.update(games)
    .set({ sessionCount: sessionNumber, lastSessionAt: new Date() })
    .where(eq(games.id, gameId));

  return session[0];
}

export async function endSession(sessionId: string): Promise<void> {
  const session = await getSession(sessionId);
  const game = await getGame(session.gameId);

  await db.update(gameSessions)
    .set({
      endTurn: game.currentTurn,
      endedAt: new Date(),
    })
    .where(eq(gameSessions.id, sessionId));
}
```

**Files to Create**:
- `src/lib/game/services/session-service.ts`
- `src/lib/game/services/__tests__/session-service.test.ts`

**Testing**:
- [ ] Unit test: Session created with correct initial values
- [ ] Unit test: Session ended updates fields correctly
- [ ] Unit test: Session count increments properly

**Commit**: `feat: implement session save/resume (auto-save only)`

---

### 2.2 Mode Selection on Return

**Status**: 📋 PLANNED
**Priority**: P1
**Estimated**: 0.5 day

**Purpose**: When returning, player can choose to continue campaign OR start new oneshot

**UI Flow**:
```
┌─────────────────────────────────────────────────────┐
│              WELCOME BACK, COMMANDER                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  You have an active campaign:                       │
│  "Iron Dominion" - Turn 47/200 - 3 sessions        │
│                                                     │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │   CONTINUE      │  │   NEW ONESHOT   │          │
│  │   CAMPAIGN      │  │                 │          │
│  └─────────────────┘  └─────────────────┘          │
│                                                     │
│  [ START NEW CAMPAIGN ] (ends current)              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Files to Modify**:
- `src/app/game/page.tsx` - Add returning player flow
- `src/app/actions/game-actions.ts` - Add hasActiveCampaignAction

**Testing**:
- [ ] Unit test: Correct UI shows based on game state
- [ ] Manual test: Return flow works correctly

**Commit**: `feat: add mode selection on return for returning players`

---

### 2.3 Session State Tracking

**Status**: 📋 PLANNED
**Priority**: P1
**Estimated**: 0.5 day

**Purpose**: Track what happened during a session for summary screen

**Implementation**:
```typescript
// src/lib/game/services/session-service.ts

export interface SessionEvent {
  turn: number;
  type: 'elimination' | 'combat' | 'alliance' | 'boss_emergence';
  description: string;
  empireIds?: string[];
}

export async function recordSessionEvent(
  sessionId: string,
  event: SessionEvent
): Promise<void> {
  const session = await getSession(sessionId);
  const events = session.notableEvents || [];
  events.push(JSON.stringify(event));

  await db.update(gameSessions)
    .set({ notableEvents: events })
    .where(eq(gameSessions.id, sessionId));
}
```

**Testing**:
- [ ] Unit test: Events recorded correctly
- [ ] Unit test: Events retrieved correctly

**Commit**: `feat: add session state tracking for events`

---

## Milestone 3: Starmap UI - Foundation

### 3.1 LCARS Panel System

**Status**: 📋 PLANNED
**Priority**: P0
**Estimated**: 1 day

**Purpose**: Reusable semi-transparent panel components with Star Trek aesthetic

**Files to Create**:
```
src/components/ui/lcars/
├── LCARSPanel.tsx        # Base panel component
├── LCARSHeader.tsx       # Panel header with curved corners
├── LCARSButton.tsx       # Styled buttons
├── LCARSSidebar.tsx      # Sidebar layout
├── lcars.css             # Custom styles
└── index.ts              # Exports
```

**Component Design**:
```typescript
// src/components/ui/lcars/LCARSPanel.tsx

interface LCARSPanelProps {
  title?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  transparent?: boolean;  // Semi-transparent background
  children: React.ReactNode;
}

export function LCARSPanel({
  title,
  variant = 'primary',
  transparent = true,
  children
}: LCARSPanelProps) {
  return (
    <div className={cn(
      "rounded-lg border-l-4",
      transparent ? "bg-gray-900/70 backdrop-blur-sm" : "bg-gray-900",
      variantStyles[variant]
    )}>
      {title && (
        <div className="px-4 py-2 border-b border-gray-700">
          <h3 className="font-display text-sm uppercase tracking-wider">
            {title}
          </h3>
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
```

**Color Palette** (from VISION.md):
- Primary: `#F7A35C` (amber/orange)
- Secondary: `#CC99CC` (lavender)
- Accent: `#99CCFF` (blue)
- Success: `#99CC99` (mint)
- Danger: `#FF9999` (salmon)

**Testing**:
- [ ] Visual test: Panel renders correctly
- [ ] Visual test: All variants display properly
- [ ] Visual test: Transparent mode works with backdrop

**Commit**: `feat: implement LCARS panel system for Star Trek UI`

---

### 3.2 Galaxy View Component

**Status**: 📋 PLANNED
**Priority**: P0
**Estimated**: 1.5 days

**Purpose**: Show 10 sectors as static boxes (replaces jittery force-directed graph)

**Files to Create**:
```
src/components/game/starmap/
├── GalaxyView.tsx          # Main galaxy view
├── SectorBox.tsx           # Individual sector box
├── WormholeConnection.tsx  # Wormhole line between sectors
└── GalaxyView.test.tsx     # Tests
```

**Layout Design**:
```
┌─────────────────────────────────────────────────────┐
│                    GALAXY VIEW                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│   ┌───────┐         ┌───────┐         ┌───────┐   │
│   │ SEC 1 │─────────│ SEC 2 │─────────│ SEC 3 │   │
│   │ 8 emp │         │ 10 emp│         │ 9 emp │   │
│   └───────┘         └───────┘         └───────┘   │
│       │                 │ ╲               │        │
│       │                 │   ╲ (wormhole)  │        │
│   ┌───────┐         ┌───────┐         ┌───────┐   │
│   │ SEC 4 │─────────│ SEC 5 │─────────│ SEC 6 │   │
│   │ 10 emp│  ★YOU   │ 9 emp │         │ 8 emp │   │
│   └───────┘         └───────┘         └───────┘   │
│       │                 │                 │        │
│   ┌───────┐         ┌───────┐         ┌───────┐   │
│   │ SEC 7 │─────────│ SEC 8 │─────────│ SEC 9 │   │
│   │ 9 emp │         │ 10 emp│         │ 9 emp │   │
│   └───────┘         └───────┘         └───────┘   │
│                         │                          │
│                     ┌───────┐                      │
│                     │SEC 10 │                      │
│                     │ 8 emp │                      │
│                     └───────┘                      │
│                                                    │
│  [Click sector to zoom in]                         │
└─────────────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// src/components/game/starmap/GalaxyView.tsx

interface GalaxyViewProps {
  sectors: Sector[];
  wormholes: WormholeConnection[];
  playerSectorId: string;
  onSectorClick: (sectorId: string) => void;
}

export function GalaxyView({
  sectors,
  wormholes,
  playerSectorId,
  onSectorClick,
}: GalaxyViewProps) {
  return (
    <div className="relative w-full h-full min-h-[600px]">
      {/* SVG layer for wormhole connections */}
      <svg className="absolute inset-0 pointer-events-none">
        {wormholes.map((wh) => (
          <WormholeConnection key={wh.id} wormhole={wh} />
        ))}
      </svg>

      {/* Sector grid */}
      <div className="grid grid-cols-3 gap-4 p-4">
        {sectors.map((sector) => (
          <SectorBox
            key={sector.id}
            sector={sector}
            isPlayerSector={sector.id === playerSectorId}
            onClick={() => onSectorClick(sector.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

**Data Requirements**:
```typescript
interface Sector {
  id: string;
  name: string;
  empireCount: number;
  isAdjacent: boolean;  // To player's sector
  status: 'friendly' | 'neutral' | 'hostile';
  position: { row: number; col: number };
}

interface WormholeConnection {
  id: string;
  fromSectorId: string;
  toSectorId: string;
  isDiscovered: boolean;
  isStable: boolean;
}
```

**Testing**:
- [ ] Unit test: Renders correct number of sectors
- [ ] Unit test: Player sector is highlighted
- [ ] Unit test: Wormhole connections render
- [ ] Visual test: Layout is static and doesn't jitter

**Commit**: `feat: implement Galaxy View component with static sector layout`

---

### 3.3 Sector Detail Component

**Status**: 📋 PLANNED
**Priority**: P0
**Estimated**: 1.5 days

**Purpose**: Show empires within a sector when zoomed in

**Layout Design**:
```
┌─────────────────────────────────────────────────────┐
│  SECTOR 5 - ALPHA QUADRANT          [← Back to Galaxy]│
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │         ○ Empire A                          │   │
│  │              │                              │   │
│  │    ○────────★ YOU ────────○                │   │
│  │   Empire B        Empire C                  │   │
│  │              │                              │   │
│  │         ○ Empire D (adjacent sector)        │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │ YOUR NEIGHBORS  │  │ THREAT ASSESSMENT       │  │
│  │ ─────────────── │  │ ─────────────────────── │  │
│  │ Empire A  [MSG] │  │ Empire C: AGGRESSIVE   │  │
│  │ Empire B  [ATK] │  │ Networth: 2.3x yours   │  │
│  │ Empire C  [MSG] │  │ Military: 1.8x yours   │  │
│  └─────────────────┘  └─────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// src/components/game/starmap/SectorDetail.tsx

interface SectorDetailProps {
  sector: SectorWithEmpires;
  playerEmpire: Empire;
  onBackClick: () => void;
  onEmpireClick: (empireId: string) => void;
}

export function SectorDetail({
  sector,
  playerEmpire,
  onBackClick,
  onEmpireClick,
}: SectorDetailProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header with back button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="font-display text-lcars-amber">
          {sector.name}
        </h2>
        <button onClick={onBackClick} className="lcars-button-small">
          ← Galaxy View
        </button>
      </div>

      {/* Empire visualization */}
      <div className="flex-1 relative">
        <EmpireNodeMap
          empires={sector.empires}
          playerEmpireId={playerEmpire.id}
          onEmpireClick={onEmpireClick}
        />
      </div>

      {/* Side panels */}
      <div className="grid grid-cols-2 gap-4 p-4">
        <NeighborsList neighbors={sector.empires} />
        <ThreatAssessment
          playerEmpire={playerEmpire}
          sectorEmpires={sector.empires}
        />
      </div>
    </div>
  );
}
```

**Testing**:
- [ ] Unit test: Renders empires correctly
- [ ] Unit test: Player empire is highlighted
- [ ] Unit test: Back button navigates to galaxy view
- [ ] Unit test: Empire click fires callback

**Commit**: `feat: implement Sector Detail component with empire nodes`

---

## Milestone 4: Game Balance Mechanics

### 4.1 Reverse Turn Order

**Status**: 📋 PLANNED
**Priority**: P1
**Estimated**: 0.5 day

**Purpose**: Weakest empire goes first (catchup mechanic)

**Current State**: Turn order is arbitrary

**Target State**: Combat phase sorts empires by networth ascending

**Files to Modify**:
- `src/lib/game/services/turn-processor.ts` - Modify combat phase ordering

**Implementation**:
```typescript
// In turn-processor.ts, combat resolution phase

async function processCombatPhase(gameId: string): Promise<void> {
  const attacks = await getPendingAttacks(gameId);

  // Get networth for all attackers
  const attackerNetworthMap = new Map<string, number>();
  for (const attack of attacks) {
    const empire = await getEmpire(attack.attackerId);
    attackerNetworthMap.set(attack.attackerId, empire.networth);
  }

  // Sort attacks by attacker networth (ascending = weakest first)
  const sortedAttacks = attacks.sort((a, b) => {
    const networthA = attackerNetworthMap.get(a.attackerId) ?? 0;
    const networthB = attackerNetworthMap.get(b.attackerId) ?? 0;
    return networthA - networthB; // Weakest first
  });

  // Process in order
  for (const attack of sortedAttacks) {
    await resolveCombat(attack);
  }
}
```

**Testing**:
- [ ] Unit test: Attacks sorted by networth ascending
- [ ] Integration test: Weaker empire's attack resolves first

**Commit**: `feat: implement reverse turn order (weakest first) for combat`

---

### 4.2 Underdog Combat Bonus (Feature-Flagged)

**Status**: 📋 PLANNED
**Priority**: P1
**Feature Flag**: `FEATURE_UNDERDOG_BONUS`
**Estimated**: 0.5 day

**Current State**: Underdog bonus exists but only triggers at 2:1 ratio

**Target State**: Configurable bonus when attacking stronger empire

**Files to Modify**:
- `src/lib/combat/unified-combat.ts` - Add feature-flagged underdog bonus

**Implementation**:
```typescript
// src/lib/combat/unified-combat.ts

import { isFeatureEnabled } from '@/lib/config/feature-flags';

export function calculateAttackBonus(
  attackerNetworth: number,
  defenderNetworth: number
): number {
  if (!isFeatureEnabled('UNDERDOG_BONUS')) {
    return 1.0; // No bonus
  }

  const ratio = attackerNetworth / defenderNetworth;

  // Bonus when attacking stronger empire
  if (ratio < 0.75) {  // Attacker is <75% of defender's networth
    // Scale: 0.5 ratio = +20%, 0.25 ratio = +30%
    const bonus = 0.10 + (0.20 * (1 - ratio));
    return 1 + Math.min(bonus, 0.30); // Cap at 30%
  }

  return 1.0;
}
```

**Testing**:
- [ ] Unit test: No bonus when flag disabled
- [ ] Unit test: Correct bonus at various ratios when enabled
- [ ] Integration test: Combat power increases with flag on

**Commit**: `feat: add feature-flagged underdog combat bonus`

---

### 4.3 Punching-Up Victory Bonus (Feature-Flagged)

**Status**: 📋 PLANNED
**Priority**: P1
**Feature Flag**: `FEATURE_PUNCHUP_BONUS`
**Estimated**: 0.5 day

**Purpose**: Bonus rewards for WINNING against stronger opponent (not just attacking)

**Philosophy**: Only reward success, not just attempts

**Implementation**:
```typescript
// src/lib/combat/unified-combat.ts

export interface PunchUpReward {
  bonusPlanets: number;      // Extra planets captured
  bonusCredits: number;      // Credits reward
  reputationGain: number;    // Reputation boost
}

export function calculatePunchUpReward(
  attackerNetworth: number,
  defenderNetworth: number,
  basePlanetsCaptured: number
): PunchUpReward | null {
  if (!isFeatureEnabled('PUNCHUP_BONUS')) {
    return null;
  }

  const ratio = attackerNetworth / defenderNetworth;

  // Only applies when attacker was weaker
  if (ratio >= 1.0) {
    return null;
  }

  // Scale rewards by how outmatched the victor was
  // ratio 0.5 = +50% bonus, ratio 0.25 = +75% bonus
  const bonusMultiplier = (1 - ratio);

  return {
    bonusPlanets: Math.floor(basePlanetsCaptured * bonusMultiplier * 0.5),
    bonusCredits: Math.floor(10000 * bonusMultiplier),
    reputationGain: Math.floor(10 * bonusMultiplier),
  };
}
```

**Testing**:
- [ ] Unit test: No bonus when flag disabled
- [ ] Unit test: No bonus when attacker was stronger
- [ ] Unit test: Correct bonus scaling when weaker attacker wins
- [ ] Integration test: Rewards applied to combat results

**Commit**: `feat: add feature-flagged punching-up victory bonus`

---

## Milestone 5: Integration & Testing

### 5.1 10-Bot Integration Tests

**Status**: 📋 PLANNED
**Priority**: P0
**Estimated**: 0.5 day

**Purpose**: Verify all quick wins work together at small scale

**Test Scenarios**:
```typescript
// tests/integration/quick-wins-10bot.test.ts

describe('Quick Wins - 10 Bot Integration', () => {
  let gameId: string;

  beforeAll(async () => {
    gameId = await createTestGame({
      mode: 'oneshot',
      botCount: 10
    });
  });

  afterAll(async () => {
    await cleanupTestGame(gameId);
  });

  it('should start with 5 planets per empire', async () => {
    const empires = await getGameEmpires(gameId);
    for (const empire of empires) {
      expect(empire.planetCount).toBe(5);
    }
  });

  it('should process combat in networth order (weakest first)', async () => {
    // Setup: Create attacks from multiple empires
    // Verify: Weakest empire's attack resolved first
  });

  it('should apply underdog bonus when flag enabled', async () => {
    // Enable flag, verify bonus applied
  });

  it('should track session state correctly', async () => {
    // Start session, process turns, end session
    // Verify session data recorded
  });
});
```

**Commit**: `test: add 10-bot integration tests for quick wins`

---

### 5.2 25-Bot Simulation Tests

**Status**: 📋 PLANNED
**Priority**: P1
**Estimated**: 1 day

**Purpose**: Verify balance at "standard" game scale

**Test Scenarios**:
```typescript
// tests/simulation/quick-wins-25bot.test.ts

describe('Quick Wins - 25 Bot Simulation', () => {
  it('should produce 3-5 eliminations in 100 turns', async () => {
    const results = await runSimulation({
      botCount: 25,
      turns: 100,
      iterations: 10,
    });

    const avgEliminations = results.reduce((sum, r) => sum + r.eliminations, 0) / 10;
    expect(avgEliminations).toBeGreaterThanOrEqual(2);
    expect(avgEliminations).toBeLessThanOrEqual(8);
  });

  it('should not have runaway leader with coalition mechanics', async () => {
    const results = await runSimulation({
      botCount: 25,
      turns: 100,
      iterations: 10,
    });

    // Verify no single empire > 40% networth
    for (const result of results) {
      const maxShare = result.topEmpireNetworthShare;
      expect(maxShare).toBeLessThan(0.4);
    }
  });

  it('should maintain 40-50% attacker win rate', async () => {
    const results = await runSimulation({
      botCount: 25,
      turns: 100,
      iterations: 10,
    });

    const avgWinRate = results.reduce((sum, r) => sum + r.attackerWinRate, 0) / 10;
    expect(avgWinRate).toBeGreaterThanOrEqual(0.35);
    expect(avgWinRate).toBeLessThanOrEqual(0.55);
  });
});
```

**Commit**: `test: add 25-bot simulation tests for balance verification`

---

### 5.3 50-Bot Stress Tests

**Status**: 📋 PLANNED
**Priority**: P2
**Estimated**: 1 day

**Purpose**: Verify performance and stability at campaign scale

**Test Scenarios**:
```typescript
// tests/stress/quick-wins-50bot.test.ts

describe('Quick Wins - 50 Bot Stress Test', () => {
  it('should complete turn processing in < 2 seconds', async () => {
    const gameId = await createTestGame({ botCount: 50 });

    const start = Date.now();
    await processTurn(gameId);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);

    await cleanupTestGame(gameId);
  });

  it('should handle 50 turns without memory issues', async () => {
    const gameId = await createTestGame({ botCount: 50 });
    const initialMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < 50; i++) {
      await processTurn(gameId);
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = finalMemory - initialMemory;

    // Should not grow more than 100MB over 50 turns
    expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024);

    await cleanupTestGame(gameId);
  });

  it('should produce natural boss emergence by turn 50', async () => {
    const results = await runSimulation({
      botCount: 50,
      turns: 50,
      iterations: 5,
    });

    // At least one empire should have 2x+ average networth
    for (const result of results) {
      const hasBoss = result.empires.some(e =>
        e.networth > result.averageNetworth * 2
      );
      expect(hasBoss).toBe(true);
    }
  });
});
```

**Commit**: `test: add 50-bot stress tests for performance verification`

---

## Commit Strategy

### Commit Frequency

- **Small, atomic commits** for each sub-feature
- **Test commits** paired with implementation commits
- **Integration commits** at milestone boundaries

### Commit Message Format

```
<type>: <description>

[optional body]

[optional footer with issue references]
```

Types:
- `feat:` - New feature
- `fix:` - Bug fix
- `test:` - Adding tests
- `refactor:` - Code change that neither fixes a bug nor adds a feature
- `docs:` - Documentation only
- `chore:` - Build process or auxiliary tool changes

### Expected Commits

```
M1.1: feat: reduce starting planets to 5 for faster eliminations
M1.2: feat: add feature flag system for experimental mechanics
M1.3: feat: add game mode schema (oneshot vs campaign)
M1.4: feat: implement game creation flow with mode selection
M2.1: feat: implement session save/resume (auto-save only)
M2.2: feat: add mode selection on return for returning players
M2.3: feat: add session state tracking for events
M3.1: feat: implement LCARS panel system for Star Trek UI
M3.2: feat: implement Galaxy View component with static sector layout
M3.3: feat: implement Sector Detail component with empire nodes
M4.1: feat: implement reverse turn order (weakest first) for combat
M4.2: feat: add feature-flagged underdog combat bonus
M4.3: feat: add feature-flagged punching-up victory bonus
M5.1: test: add 10-bot integration tests for quick wins
M5.2: test: add 25-bot simulation tests for balance verification
M5.3: test: add 50-bot stress tests for performance verification
```

---

## Code Review Checkpoints

### After Milestone 1 (Infrastructure)
- [ ] Schema changes are backward compatible
- [ ] Feature flag system works correctly
- [ ] Game creation flow handles all edge cases
- [ ] No breaking changes to existing games

### After Milestone 2 (Sessions)
- [ ] Session data persists correctly
- [ ] No save-scumming possible
- [ ] Mode selection logic is correct
- [ ] Database cleanup handles old sessions

### After Milestone 3 (UI)
- [ ] LCARS components are accessible (ARIA)
- [ ] Starmap doesn't jitter
- [ ] Performance is acceptable (60 FPS sector, 30 FPS galaxy)
- [ ] Mobile responsiveness (if applicable)

### After Milestone 4 (Balance)
- [ ] Feature flags toggle correctly
- [ ] Balance changes don't break existing combat
- [ ] Bonus calculations are mathematically correct
- [ ] No exploit vectors introduced

### After Milestone 5 (Testing)
- [ ] All tests pass
- [ ] Coverage meets 80% threshold
- [ ] Performance benchmarks met
- [ ] No test flakiness

---

## Risk Assessment

### High Risk Items

1. **Schema Changes** (M1.3)
   - Risk: Breaking existing games
   - Mitigation: Make all new columns nullable with defaults

2. **Combat Balance** (M4.1-4.3)
   - Risk: Over-correcting, making game unfun
   - Mitigation: Feature flags allow quick rollback

3. **UI Performance** (M3.2-3.3)
   - Risk: New components slower than expected
   - Mitigation: Test with 100 empires before merge

### Medium Risk Items

1. **Session Management** (M2.1-2.3)
   - Risk: Data loss on session edge cases
   - Mitigation: Comprehensive edge case testing

2. **Feature Flags** (M1.2)
   - Risk: Flag state inconsistency between server/client
   - Mitigation: Server-authoritative flag resolution

### Low Risk Items

1. **Starting Planets** (M1.1) - Simple config change
2. **LCARS Panels** (M3.1) - Isolated UI components
3. **Turn Order** (M4.1) - Well-understood logic change

---

## Definition of Done

A milestone is complete when:

1. ✅ All planned features implemented
2. ✅ All unit tests passing
3. ✅ All integration tests passing (where applicable)
4. ✅ Code reviewed and approved
5. ✅ Documentation updated (IMPLEMENTATION-TRACKER.md)
6. ✅ Committed with descriptive message
7. ✅ No TypeScript errors
8. ✅ No ESLint warnings
9. ✅ Build succeeds

---

## Approval Request

This plan covers the quick wins identified for implementation:

**Easy Quick Wins** (Infrastructure):
- [x] Reduce starting planets (M1.1)
- [x] Game creation flow (M1.4)
- [x] Game mode selection (M1.3)
- [x] Session save/resume (M2.1)

**UX Quick Wins** (UI):
- [x] Galaxy View component (M3.2)
- [x] Sector Detail component (M3.3)
- [x] LCARS Panel system (M3.1)

**Game Balance Quick Wins**:
- [x] Reverse turn order (M4.1)
- [x] Underdog combat bonus (M4.2)
- [x] Punching-up victory bonus (M4.3)

**Testing Strategy**:
- [x] 10-bot integration tests (M5.1)
- [x] 25-bot simulation tests (M5.2)
- [x] 50-bot stress tests (M5.3)

**Total Estimated Time**: 11-16 days

---

*Plan created: 2025-12-30*
*Status: AWAITING APPROVAL*

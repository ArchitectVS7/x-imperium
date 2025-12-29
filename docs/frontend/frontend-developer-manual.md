# Nexus Dominion Frontend Developer Manual

> **Version:** 1.0
> **Created:** 2024-12-28
> **Last Updated:** 2024-12-28

A comprehensive reference for frontend development on Nexus Dominion, covering architecture, data flow, component patterns, styling, and best practices.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Data Flow & Wiring](#3-data-flow--wiring)
4. [Component Reference](#4-component-reference)
5. [Type Reference](#5-type-reference)
6. [Configuration Reference](#6-configuration-reference)
7. [Styling Guide](#7-styling-guide)
8. [Server Actions Reference](#8-server-actions-reference)
9. [Service Layer Reference](#9-service-layer-reference)
10. [Best Practices](#10-best-practices)
11. [TODO Items & Future Enhancements](#11-todo-items--future-enhancements)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Architecture Overview

Nexus Dominion uses a **server-first architecture** with Next.js 14 App Router. The frontend is tightly integrated with the backend through Server Actions.

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           BROWSER (Client)                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  React Components (/src/components/game/*)                        │   │
│  │  - Display state via props                                        │   │
│  │  - Local UI state (useState, useTransition)                      │   │
│  │  - Call Server Actions for mutations                             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    │ Server Action Call
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          SERVER (Next.js)                                 │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Server Actions (/src/app/actions/*.ts)                          │   │
│  │  - "use server" directive                                         │   │
│  │  - Extract gameId/empireId from cookies                          │   │
│  │  - Validate input                                                 │   │
│  │  - Call service layer                                            │   │
│  │  - Revalidate paths                                              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    │                                      │
│                                    ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Service Layer (/src/lib/game/services/*.ts)                     │   │
│  │  - Business logic                                                 │   │
│  │  - Validation rules                                              │   │
│  │  - Orchestrate database operations                               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    │                                      │
│                                    ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Repository Layer (/src/lib/game/repositories/*.ts)              │   │
│  │  - Database queries (Drizzle ORM)                                │   │
│  │  - Data transformation                                           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    │                                      │
│                                    ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Database (PostgreSQL)                                           │   │
│  │  - empires, games, planets, buildQueue, attacks, etc.           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

### Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **No client-side state management (Zustand)** | Server is source of truth; simplifies sync |
| **Server Actions over API routes** | Type-safe, automatic revalidation, less boilerplate |
| **Cookie-based session** | Simple, works with SSR, no token management |
| **Drizzle ORM** | Type-safe queries, good migration support |

---

## 2. Technology Stack

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 14.2.35 | Framework (App Router) |
| `react` | 18.x | UI library |
| `typescript` | 5.x | Type safety |
| `tailwindcss` | 3.4.1 | Styling |
| `drizzle-orm` | 0.45.1 | Database ORM |
| `d3` | 7.x | Starmap visualization |
| `zustand` | 5.0.9 | Available but not used |
| `@tanstack/react-query` | 5.90.12 | Available for future use |

### Development Dependencies

| Package | Purpose |
|---------|---------|
| `vitest` | Unit testing |
| `playwright` | E2E testing |
| `eslint` | Linting |
| `drizzle-kit` | Database migrations |

### Key Files

| File | Purpose |
|------|---------|
| `/src/app/layout.tsx` | Root layout, fonts, providers |
| `/src/app/game/layout.tsx` | Game layout, navigation |
| `/src/lib/db/index.ts` | Database connection |
| `/src/lib/db/schema.ts` | Database schema |
| `/tailwind.config.ts` | Tailwind configuration |
| `/src/app/globals.css` | Global styles, LCARS classes |

---

## 3. Data Flow & Wiring

This section explains exactly how to wire UI elements to game logic.

### 3.1 Display Data (Game State → UI)

**Pattern:** Server Component fetches data → passes to Client Component as props

```tsx
// Page (Server Component) - /src/app/game/page.tsx
export default async function GamePage() {
  // 1. Get session from cookies
  const cookieStore = await cookies();
  const empireId = cookieStore.get("empireId")?.value;

  // 2. Fetch data from repository/service
  const dashboardData = await getDashboardData(empireId);

  // 3. Pass to display components
  return (
    <ResourcePanel
      credits={dashboardData.resources.credits}
      food={dashboardData.resources.food}
      ore={dashboardData.resources.ore}
      petroleum={dashboardData.resources.petroleum}
      researchPoints={dashboardData.resources.researchPoints}
    />
  );
}

// Component (can be Server or Client) - /src/components/game/ResourcePanel.tsx
interface ResourcePanelProps {
  credits: number;
  food: number;
  ore: number;
  petroleum: number;
  researchPoints: number;
}

export function ResourcePanel({
  credits,
  food,
  ore,
  petroleum,
  researchPoints,
}: ResourcePanelProps) {
  return (
    <div className="lcars-panel">
      <div className="flex justify-between">
        <span>Credits:</span>
        <span className="font-mono text-lcars-amber">
          {credits.toLocaleString()}
        </span>
      </div>
      {/* ... more resources */}
    </div>
  );
}
```

### 3.2 Trigger Actions (UI → Game Logic)

**Pattern:** Client Component → Server Action → Service → Database → Revalidate

```tsx
// Component (Client) - must have "use client"
"use client";

import { useState, useTransition } from "react";
import { addToBuildQueueAction } from "@/app/actions/build-queue-actions";

export function BuildButton({ unitType }: { unitType: UnitType }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleBuild = () => {
    setError(null);
    startTransition(async () => {
      const result = await addToBuildQueueAction(unitType, 1);
      if (!result.success) {
        setError(result.error);
      }
      // Success: page auto-revalidates, new data shows
    });
  };

  return (
    <>
      <button
        onClick={handleBuild}
        disabled={isPending}
        className="lcars-button"
      >
        {isPending ? "Building..." : "Build"}
      </button>
      {error && <p className="text-red-400">{error}</p>}
    </>
  );
}
```

### 3.3 Complete Wiring Example: Build Units

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. USER CLICKS "BUILD 10 SOLDIERS"                                      │
│    Component: BuildUnitsPanel.tsx                                       │
│    Handler: handleBuild()                                               │
└───────────────────────────────────────────┬─────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. CALL SERVER ACTION                                                    │
│    File: /src/app/actions/build-queue-actions.ts                        │
│    Function: addToBuildQueueAction("soldiers", 10)                      │
│                                                                          │
│    // Extract session                                                    │
│    const { gameId, empireId } = await getGameCookies();                 │
│                                                                          │
│    // Call service                                                       │
│    const result = await addToBuildQueue(empireId, gameId, "soldiers", 10);│
│                                                                          │
│    // Revalidate on success                                             │
│    if (result.success) revalidatePath("/game");                         │
└───────────────────────────────────────────┬─────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. SERVICE LAYER LOGIC                                                   │
│    File: /src/lib/game/services/build-queue-service.ts                  │
│    Function: addToBuildQueue(empireId, gameId, unitType, quantity)      │
│                                                                          │
│    // Fetch empire                                                       │
│    const empire = await db.query.empires.findFirst({...});              │
│                                                                          │
│    // Validate credits                                                   │
│    const cost = UNIT_COSTS["soldiers"] * 10; // 500                     │
│    if (empire.credits < cost) return { error: "Insufficient credits" };│
│                                                                          │
│    // Deduct & create queue entry                                       │
│    await db.update(empires).set({ credits: empire.credits - cost });    │
│    await db.insert(buildQueue).values({ unitType: "soldiers", ... });   │
└───────────────────────────────────────────┬─────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. RESULT RETURNS TO COMPONENT                                           │
│    result = { success: true, creditsDeducted: 500, queueEntry: {...} }  │
│                                                                          │
│    // Page revalidates, new dashboard data loads                        │
│    // ResourcePanel shows updated credits                               │
│    // BuildQueuePanel shows new queue entry                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Variable Reference: Button to Game Logic

| UI Element | Props/State | Server Action | Service Function | Database Table |
|------------|-------------|---------------|------------------|----------------|
| Build Soldier | `unitType="soldiers", quantity` | `addToBuildQueueAction` | `addToBuildQueue` | `buildQueue`, `empires.credits` |
| Launch Attack | `defenderId, forces, attackType` | `launchAttackAction` | `executeAttack` | `attacks`, `empires.*` |
| End Turn | (none) | `endTurnAction` | `processTurn` | All tables |
| Buy Resource | `resourceType, quantity` | `buyResourceAction` | `buyResource` | `empires.credits`, `empires.[resource]` |
| Research | `pointsToInvest` | `investResearchPointsAction` | `investResearchPoints` | `empires.researchPoints`, `research` |
| Diplomacy | `targetId, treatyType` | `proposeNAPAction` | `proposeTreaty` | `treaties` |

### 3.5 Variable Reference: Game Logic to Display

| Data | Source | Service/Repository | Component(s) |
|------|--------|-------------------|--------------|
| Credits | `empires.credits` | `getDashboardData()` | `ResourcePanel` |
| Unit counts | `empires.soldiers`, etc. | `getDashboardData()` | `MilitaryPanel` |
| Planet list | `planets` table | `getDashboardData()` | `PlanetList` |
| Build queue | `buildQueue` table | `getBuildQueueStatus()` | `BuildQueuePanel` |
| Research level | `empires.fundamentalResearchLevel` | `getResearchStatus()` | `ResearchPanel` |
| Starmap data | `empires` (all) | `getStarmapData()` | `Starmap` |
| Messages | `messages` table | `getMessagesAction()` | `MessageInbox` |

---

## 4. Component Reference

### 4.1 Directory Structure

```
/src/components/
├── game/                      # Game-specific components
│   ├── ResourcePanel.tsx      # Resource display
│   ├── MilitaryPanel.tsx      # Military unit display
│   ├── PopulationPanel.tsx    # Population & growth
│   ├── NetworthPanel.tsx      # Economic status
│   ├── TurnCounter.tsx        # Current turn display
│   ├── CivilStatusDisplay.tsx # Morale indicator
│   ├── EndTurnButton.tsx      # Turn action
│   ├── PlanetList.tsx         # Planet overview
│   ├── combat/                # Combat system
│   │   ├── AttackInterface.tsx
│   │   ├── CombatPreview.tsx
│   │   ├── CasualtyReport.tsx
│   │   └── BattleReport.tsx
│   ├── military/              # Military management
│   │   ├── BuildUnitsPanel.tsx
│   │   ├── UnitCard.tsx
│   │   ├── BuildQueuePanel.tsx
│   │   └── MaintenanceSummary.tsx
│   ├── research/              # Research system
│   │   ├── ResearchPanel.tsx
│   │   ├── ResearchTree.tsx
│   │   └── FundamentalResearchProgress.tsx
│   ├── diplomacy/             # Diplomacy system
│   │   ├── DiplomacyPanel.tsx
│   │   └── ProposeTreatyPanel.tsx
│   ├── market/                # Market system
│   │   └── MarketPanel.tsx
│   ├── covert/                # Covert operations
│   │   ├── CovertStatusPanel.tsx
│   │   ├── TargetSelector.tsx
│   │   └── OperationCard.tsx
│   ├── crafting/              # Crafting system
│   │   ├── ResourceInventory.tsx
│   │   ├── CraftingPanel.tsx
│   │   └── RecipeList.tsx
│   ├── syndicate/             # Syndicate system
│   │   ├── TrustMeter.tsx
│   │   ├── BlackMarketPanel.tsx
│   │   └── ContractBoard.tsx
│   ├── starmap/               # Galaxy visualization
│   │   ├── Starmap.tsx
│   │   └── EmpireTooltip.tsx
│   ├── messages/              # Message system
│   │   ├── MessageInbox.tsx
│   │   └── GalacticNewsFeed.tsx
│   └── victory/               # End game
│       ├── VictoryScreen.tsx
│       └── DefeatScreen.tsx
├── ui/                        # Reusable UI primitives
│   └── (future: AnimatedCounter, LCARSButton, etc.)
└── providers/                 # Context providers
    └── (future: AudioProvider, etc.)
```

### 4.2 Component Patterns

#### Display-Only Component (Pure Props)

```tsx
// No "use client" needed for pure display
interface ResourcePanelProps {
  credits: number;
  food: number;
  // ...
}

export function ResourcePanel(props: ResourcePanelProps) {
  return (
    <div className="lcars-panel" data-testid="resource-panel">
      {/* Pure rendering, no state */}
    </div>
  );
}
```

#### Interactive Component (With Actions)

```tsx
"use client";

import { useState, useTransition } from "react";
import { someAction } from "@/app/actions/some-actions";

interface InteractiveProps {
  initialValue: number;
  onSuccess?: () => void;
}

export function InteractiveComponent({ initialValue, onSuccess }: InteractiveProps) {
  // Local UI state
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Transition for async actions
  const [isPending, startTransition] = useTransition();

  const handleAction = () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await someAction(value);

      if (result.success) {
        setSuccess("Action completed!");
        onSuccess?.();
      } else {
        setError(result.error ?? "Unknown error");
      }
    });
  };

  return (
    <div className="lcars-panel">
      {/* Success/Error feedback */}
      {success && (
        <div className="p-2 bg-green-900/50 border border-green-500 text-green-300 rounded">
          {success}
        </div>
      )}
      {error && (
        <div className="p-2 bg-red-900/50 border border-red-500 text-red-300 rounded">
          {error}
        </div>
      )}

      {/* Input */}
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="bg-black border border-gray-700 rounded p-2"
      />

      {/* Action button */}
      <button
        onClick={handleAction}
        disabled={isPending}
        className="lcars-button disabled:opacity-50"
      >
        {isPending ? "Processing..." : "Submit"}
      </button>
    </div>
  );
}
```

#### Form Component (Complex State)

```tsx
"use client";

import { useState, useMemo, useTransition } from "react";

interface FormProps {
  availableCredits: number;
  onSubmit: (data: FormData) => Promise<Result>;
}

export function ComplexForm({ availableCredits, onSubmit }: FormProps) {
  // Form state
  const [quantity, setQuantity] = useState(1);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Computed validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!selectedOption) errors.push("Select an option");
    if (quantity <= 0) errors.push("Quantity must be positive");
    if (quantity * 100 > availableCredits) errors.push("Insufficient credits");
    return errors;
  }, [quantity, selectedOption, availableCredits]);

  const isValid = validationErrors.length === 0;

  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!isValid) return;

    startTransition(async () => {
      await onSubmit({ quantity, selectedOption });
    });
  };

  return (
    <div className="lcars-panel">
      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <ul className="text-red-400 text-sm">
          {validationErrors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      {/* Form controls */}
      <button
        onClick={handleSubmit}
        disabled={!isValid || isPending}
        className="lcars-button"
      >
        Submit
      </button>
    </div>
  );
}
```

---

## 5. Type Reference

### 5.1 Core Game Types

#### Empire
**Location:** `/src/lib/db/schema.ts`

```typescript
// Database type (inferred from schema)
type Empire = {
  id: string;                    // UUID
  gameId: string;                // UUID
  name: string;
  type: "player" | "bot";

  // Resources
  credits: number;
  food: number;
  ore: number;
  petroleum: number;
  researchPoints: number;

  // Population
  population: number;
  populationCap: number;
  civilStatus: CivilStatusLevel;

  // Military
  soldiers: number;
  fighters: number;
  stations: number;
  lightCruisers: number;
  heavyCruisers: number;
  carriers: number;
  covertAgents: number;

  // Stats
  armyEffectiveness: number;     // 0.5 - 1.5 typically
  networth: number;
  planetCount: number;
  fundamentalResearchLevel: number;

  // State
  isEliminated: boolean;
  eliminatedAtTurn: number | null;
};
```

#### Game
```typescript
type Game = {
  id: string;
  name: string;
  status: "setup" | "active" | "paused" | "completed" | "abandoned";
  currentTurn: number;
  turnLimit: number;
  difficulty: "easy" | "normal" | "hard" | "nightmare";
  botCount: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
};
```

#### Planet
```typescript
type Planet = {
  id: string;
  empireId: string;
  gameId: string;
  type: PlanetType;
  name: string;
  productionRate: number;
  purchasePrice: number;
  acquiredAtTurn: number;
};

type PlanetType =
  | "food"
  | "ore"
  | "petroleum"
  | "tourism"
  | "urban"
  | "education"
  | "government"
  | "research"
  | "supply"
  | "anti_pollution"
  | "industrial";
```

### 5.2 Unit Types

**Location:** `/src/lib/game/unit-config.ts`

```typescript
const UNIT_TYPES = [
  "soldiers",
  "fighters",
  "stations",
  "lightCruisers",
  "heavyCruisers",
  "carriers",
  "covertAgents",
] as const;

type UnitType = (typeof UNIT_TYPES)[number];

interface UnitCounts {
  soldiers: number;
  fighters: number;
  stations: number;
  lightCruisers: number;
  heavyCruisers: number;
  carriers: number;
  covertAgents: number;
}

interface Forces extends UnitCounts {}
```

### 5.3 Combat Types

**Location:** `/src/lib/game/types/combat-types.ts`

```typescript
type AttackType = "invasion" | "guerilla";

interface AttackParams {
  gameId: string;
  attackerId: string;
  defenderId: string;
  attackType: AttackType;
  forces: Forces;
}

interface AttackResult {
  success: boolean;
  error?: string;
  attackId?: string;
  outcome?: "attacker_victory" | "defender_victory" | "retreat" | "stalemate";
  attackerCasualties?: CasualtyBreakdown;
  defenderCasualties?: CasualtyBreakdown;
}

interface CasualtyBreakdown {
  soldiers: number;
  fighters: number;
  stations: number;
  lightCruisers: number;
  heavyCruisers: number;
  carriers: number;
}
```

### 5.4 Turn Types

**Location:** `/src/lib/game/types/turn-types.ts`

```typescript
interface TurnStatus {
  currentTurn: number;
  turnLimit: number;
  isPlayerTurn: boolean;
}

interface TurnResult {
  success: boolean;
  gameId: string;
  turn: number;
  processingMs: number;
  empireResults: EmpireResult[];
  victoryResult?: VictoryResult;
  defeatResult?: DefeatResult;
}

interface ResourceDelta {
  credits: number;
  food: number;
  ore: number;
  petroleum: number;
  researchPoints: number;
}
```

### 5.5 Dashboard Data

**Location:** `/src/lib/game/repositories/game-repository.ts`

```typescript
interface DashboardData {
  turn: TurnStatus;
  stats: {
    networth: number;
    population: number;
    civilStatus: CivilStatusLevel;
  };
  resources: {
    credits: number;
    food: number;
    ore: number;
    petroleum: number;
    researchPoints: number;
  };
  military: UnitCounts;
  planets: PlanetInfo[];
  empire: {
    id: string;
    name: string;
    fundamentalResearchLevel: number;
  };
}
```

---

## 6. Configuration Reference

### 6.1 Unit Configuration

**Location:** `/src/lib/game/unit-config.ts`

```typescript
// Cost in credits per unit
const UNIT_COSTS: Record<UnitType, number> = {
  soldiers: 50,
  fighters: 200,
  stations: 5_000,
  lightCruisers: 500,
  heavyCruisers: 1_000,
  carriers: 2_500,
  covertAgents: 4_090,
};

// Population consumed per unit
const UNIT_POPULATION: Record<UnitType, number> = {
  soldiers: 0.2,
  fighters: 0.4,
  stations: 0.5,
  lightCruisers: 1.0,
  heavyCruisers: 2.0,
  carriers: 3.0,
  covertAgents: 1.0,
};

// Maintenance cost per turn
const UNIT_MAINTENANCE: Record<UnitType, number> = {
  soldiers: 0.5,
  fighters: 2,
  stations: 50,
  lightCruisers: 5,
  heavyCruisers: 10,
  carriers: 25,
  covertAgents: 40,
};

// Combat values
const UNIT_ATTACK: Record<UnitType, number> = {
  soldiers: 1,
  fighters: 3,
  stations: 50,
  lightCruisers: 5,
  heavyCruisers: 8,
  carriers: 12,
};

const UNIT_DEFENSE: Record<UnitType, number> = {
  soldiers: 1,
  fighters: 2,
  stations: 50,  // 2× when defending
  lightCruisers: 4,
  heavyCruisers: 6,
  carriers: 10,
};
```

### 6.2 Build Configuration

**Location:** `/src/lib/game/build-config.ts`

```typescript
// Turns to complete build
const UNIT_BUILD_TIMES: Record<UnitType, number> = {
  soldiers: 1,
  fighters: 1,
  stations: 3,
  lightCruisers: 2,
  heavyCruisers: 2,
  carriers: 3,
  covertAgents: 2,
};

// Research level required
const UNIT_RESEARCH_REQUIREMENTS: Record<UnitType, number> = {
  soldiers: 0,
  fighters: 0,
  stations: 0,
  lightCruisers: 2,
  heavyCruisers: 3,
  carriers: 4,
  covertAgents: 0,
};

const MAX_BUILD_QUEUE_SIZE = 10;
```

### 6.3 LCARS Color Palette

**Location:** `/tailwind.config.ts`

```typescript
colors: {
  lcars: {
    amber: "#FF9900",      // Primary action, credits
    lavender: "#CC99FF",   // Secondary action, headers
    salmon: "#FF9999",     // Alert, danger, negative
    peach: "#FFCC99",      // Info, neutral
    blue: "#99CCFF",       // Resources, positive, research
    mint: "#99FFCC",       // Success, alliances
    orange: "#FF7700",     // Warning
    purple: "#9977FF",     // Alternative secondary
  },
}
```

### 6.4 Resource Display Colors

```typescript
// Consistent color coding for resources
const RESOURCE_COLORS = {
  credits: "text-lcars-amber",      // #FF9900
  food: "text-green-400",           // Green
  ore: "text-gray-400",             // Gray/silver
  petroleum: "text-yellow-500",     // Yellow
  researchPoints: "text-lcars-blue", // #99CCFF
};
```

### 6.5 Unit Type Colors

```typescript
const UNIT_TYPE_COLORS: Record<UnitType, string> = {
  soldiers: "text-green-400",
  fighters: "text-blue-400",
  stations: "text-purple-400",
  lightCruisers: "text-cyan-400",
  heavyCruisers: "text-orange-400",
  carriers: "text-red-400",
  covertAgents: "text-gray-400",
};
```

---

## 7. Styling Guide

### 7.1 LCARS Design System

Nexus Dominion uses a Star Trek LCARS-inspired design language.

#### Core Principles

1. **Dark backgrounds** - Space-like, deep grays
2. **Bright accent colors** - Amber, lavender, blue
3. **Rounded elements** - Pill buttons, rounded panels
4. **Left border accents** - Panel identification
5. **Monospace numbers** - Technical readability

#### CSS Classes

**Location:** `/src/app/globals.css`

```css
@layer components {
  /* Panel container */
  .lcars-panel {
    @apply bg-gray-900 border-l-4 border-lcars-amber rounded-lcars p-4;
  }

  /* Primary button */
  .lcars-button {
    @apply px-6 py-2 bg-lcars-amber text-gray-950 font-semibold
           rounded-lcars-pill hover:brightness-110 transition-all duration-200;
  }

  /* Secondary button */
  .lcars-button-secondary {
    @apply px-6 py-2 bg-lcars-lavender text-gray-950 font-semibold
           rounded-lcars-pill hover:brightness-110 transition-all duration-200;
  }
}
```

### 7.2 Component Styling Patterns

#### Panel with Header

```tsx
<div className="lcars-panel">
  <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
    Panel Title
  </h2>
  <div className="space-y-2 text-gray-300">
    {/* Content */}
  </div>
</div>
```

#### Data Row

```tsx
<div className="flex justify-between items-center">
  <span className="text-gray-400">Label:</span>
  <span className="font-mono text-lcars-amber">
    {value.toLocaleString()}
  </span>
</div>
```

#### Success/Error Messages

```tsx
// Success
<div className="p-2 bg-green-900/50 border border-green-500 text-green-300 text-sm rounded">
  {message}
</div>

// Error
<div className="p-2 bg-red-900/50 border border-red-500 text-red-300 text-sm rounded">
  {message}
</div>

// Warning
<div className="p-2 bg-yellow-900/50 border border-yellow-500 text-yellow-300 text-sm rounded">
  {message}
</div>
```

#### Disabled State

```tsx
<button
  disabled={isPending}
  className="lcars-button disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isPending ? "Loading..." : "Action"}
</button>
```

#### Selection State

```tsx
<button
  className={`
    w-full p-3 rounded border transition-colors
    ${isSelected
      ? "border-lcars-amber bg-lcars-amber/10"
      : "border-gray-700 bg-black/30 hover:border-gray-500"
    }
  `}
>
  {label}
</button>
```

### 7.3 Typography

```css
/* Display font (titles, logos) */
font-family: var(--font-orbitron), sans-serif;
/* or */
.font-display

/* Body font (content) */
font-family: var(--font-exo2), sans-serif;
/* or */
.font-body

/* Monospace (numbers) */
.font-mono
```

### 7.4 Layout Patterns

#### Grid Layout

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Panel1 />
  <Panel2 />
  <Panel3 />
</div>
```

#### Vertical Stack

```tsx
<div className="space-y-4">
  <Item1 />
  <Item2 />
  <Item3 />
</div>
```

#### Horizontal Stack

```tsx
<div className="flex gap-4">
  <Item1 />
  <Item2 />
</div>
```

---

## 8. Server Actions Reference

### 8.1 Action File Structure

**Location:** `/src/app/actions/`

```typescript
"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// Cookie names
const GAME_ID_COOKIE = "gameId";
const EMPIRE_ID_COOKIE = "empireId";

// Helper to get session
async function getGameCookies() {
  const cookieStore = await cookies();
  return {
    gameId: cookieStore.get(GAME_ID_COOKIE)?.value,
    empireId: cookieStore.get(EMPIRE_ID_COOKIE)?.value,
  };
}

// Export action functions
export async function myAction(param: string): Promise<ActionResult> {
  try {
    const { gameId, empireId } = await getGameCookies();

    if (!gameId || !empireId) {
      return { success: false, error: "No active game" };
    }

    // Call service
    const result = await myService(empireId, gameId, param);

    // Revalidate affected paths
    if (result.success) {
      revalidatePath("/game");
    }

    return result;
  } catch (error) {
    console.error("Action failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

### 8.2 Available Actions

| File | Functions | Purpose |
|------|-----------|---------|
| `game-actions.ts` | `startGameAction`, `fetchDashboardDataAction`, `endGameAction` | Game lifecycle |
| `turn-actions.ts` | `endTurnAction`, `getTurnStatusAction` | Turn management |
| `build-queue-actions.ts` | `addToBuildQueueAction`, `cancelBuildOrderAction` | Unit building |
| `unit-actions.ts` | `validateBuildAction`, `calculateUnitMaintenanceAction` | Unit validation |
| `combat-actions.ts` | `launchAttackAction`, `validateAttackAction`, `executeRetreatAction` | Combat |
| `research-actions.ts` | `investResearchPointsAction`, `getResearchStatusAction` | Research |
| `diplomacy-actions.ts` | `proposeNAPAction`, `acceptTreatyAction`, `breakTreatyAction` | Diplomacy |
| `market-actions.ts` | `buyResourceAction`, `sellResourceAction` | Market trading |
| `covert-actions.ts` | `launchCovertOperationAction` | Espionage |
| `crafting-actions.ts` | `startCraftingAction`, `getCraftingStatusAction` | Manufacturing |
| `syndicate-actions.ts` | `acceptContractAction`, `getContractsAction` | Black market |
| `messages-actions.ts` | `getMessagesAction`, `markAsReadAction` | Messaging |

---

## 9. Service Layer Reference

### 9.1 Service Files

**Location:** `/src/lib/game/services/`

| File | Key Functions | Purpose |
|------|---------------|---------|
| `unit-service.ts` | `validateBuild()`, `isUnitLocked()`, `calculateTotalMaintenance()` | Unit operations |
| `build-queue-service.ts` | `addToBuildQueue()`, `processBuildQueue()`, `cancelBuildOrder()` | Build queue |
| `combat-service.ts` | `executeAttack()`, `validateAttack()`, `getTargets()` | Combat resolution |
| `research-service.ts` | `investResearchPoints()`, `getResearchStatus()` | Research progression |
| `turn-service.ts` | `processTurn()` | Turn resolution |
| `diplomacy-service.ts` | `proposeTreaty()`, `acceptTreaty()` | Treaty management |
| `market-service.ts` | `buyResource()`, `sellResource()` | Market transactions |
| `crafting-service.ts` | `startCrafting()`, `processCraftingQueue()` | Manufacturing |
| `syndicate-service.ts` | `acceptContract()`, `completeContract()` | Black market |

### 9.2 Service Pattern

```typescript
import { db } from "@/lib/db";
import { empires } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface ServiceResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

export async function myService(
  empireId: string,
  gameId: string,
  params: ServiceParams
): Promise<ServiceResult> {
  // 1. Fetch required data
  const empire = await db.query.empires.findFirst({
    where: eq(empires.id, empireId),
  });

  if (!empire) {
    return { success: false, error: "Empire not found" };
  }

  // 2. Validate business rules
  if (empire.credits < params.cost) {
    return { success: false, error: "Insufficient credits" };
  }

  // 3. Perform database operations
  await db.update(empires)
    .set({ credits: empire.credits - params.cost })
    .where(eq(empires.id, empireId));

  // 4. Return result
  return { success: true, data: { /* ... */ } };
}
```

---

## 10. Best Practices

### 10.1 Component Development

1. **Use `data-testid`** on all interactive elements
   ```tsx
   <button data-testid="build-soldiers-button">Build</button>
   ```

2. **Keep components focused** - Single responsibility
   ```tsx
   // Good: Focused component
   function ResourceDisplay({ value, label, color }) { ... }

   // Bad: Kitchen sink component
   function EverythingPanel({ resources, military, planets, ... }) { ... }
   ```

3. **Prefer props over hooks for data** - Server-first pattern
   ```tsx
   // Good: Data as props
   function MilitaryPanel({ soldiers, fighters, ... }) { ... }

   // Avoid: Fetching in component
   function MilitaryPanel() {
     const data = useFetch('/api/military');  // Don't do this
   }
   ```

4. **Use `useTransition` for async actions**
   ```tsx
   const [isPending, startTransition] = useTransition();

   const handleAction = () => {
     startTransition(async () => {
       await serverAction();
     });
   };
   ```

### 10.2 Server Action Development

1. **Always validate input**
   ```typescript
   if (!isValidUUID(empireId)) {
     return { success: false, error: "Invalid empire ID" };
   }
   ```

2. **Use `revalidatePath` after mutations**
   ```typescript
   if (result.success) {
     revalidatePath("/game");
     revalidatePath("/game/military");
   }
   ```

3. **Wrap in try/catch**
   ```typescript
   try {
     // ... action logic
   } catch (error) {
     console.error("Action failed:", error);
     return { success: false, error: "Operation failed" };
   }
   ```

4. **Return typed results**
   ```typescript
   interface ActionResult {
     success: boolean;
     error?: string;
     data?: SomeType;
   }
   ```

### 10.3 Styling Best Practices

1. **Use LCARS classes** for consistency
   ```tsx
   <div className="lcars-panel">  {/* Not: bg-gray-900 border-l-4 ... */}
   ```

2. **Follow color conventions**
   - Amber for primary actions and credits
   - Lavender for secondary actions
   - Color-code resources consistently

3. **Use Tailwind utilities** for one-off styles
   ```tsx
   <div className="lcars-panel mt-4">  {/* Combine utility with component class */}
   ```

4. **Monospace for numbers**
   ```tsx
   <span className="font-mono">{value.toLocaleString()}</span>
   ```

### 10.4 Testing

1. **Add `data-testid` to all testable elements**
2. **Test user flows, not implementation**
3. **Use Playwright for E2E tests**
4. **Use Vitest for unit tests**

---

## 11. TODO Items & Future Enhancements

### 11.1 UI Enhancement Phases (See ui-enhancement-plan.md)

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Animated resource counters (GSAP) | Not Started |
| 2 | Button hover/click sounds (Howler.js) | Not Started |
| 3 | Panel slide transitions | Not Started |
| 4 | Ambient starmap music | Not Started |
| 5 | Pulsing alert indicators | Not Started |
| 6 | NASA nebula backgrounds | Not Started |
| 7 | Starmap visual enhancements | Not Started |

### 11.2 Component Improvements

| Component | Enhancement | Priority |
|-----------|-------------|----------|
| `ResourcePanel` | Add animated counters | High |
| `EndTurnButton` | Add confirmation sound | High |
| `BuildUnitsPanel` | Add build queue sound | Medium |
| `AttackInterface` | Add combat sound | Medium |
| `Starmap` | Add twinkling stars | Low |
| `Starmap` | Add alliance lane visualization | Low |
| All panels | Add slide-in animations | Medium |

### 11.3 Missing UI Components

| Component | Purpose | Priority |
|-----------|---------|----------|
| `AnimatedCounter` | Number animation | High |
| `LCARSButton` | Sound-enabled button | High |
| `AnimatedPanel` | Panel transitions | Medium |
| `AlertBadge` | Pulsing indicators | Medium |
| `AudioProvider` | Audio context | High |
| `VolumeControl` | Audio settings | Low |

### 11.4 Placeholder Assets to Replace

| Asset Type | Current | Replacement Needed |
|------------|---------|-------------------|
| UI Sounds | Placeholder MP3s | Custom LCARS-style audio |
| Ambient Music | Placeholder loop | Licensed/custom space ambient |
| Backgrounds | None | NASA/custom nebula images |

### 11.5 Future Features

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Dark/Light theme toggle** | User preference | Medium |
| **Sound preferences** | Volume, mute per-category | Low |
| **Keyboard shortcuts** | Power users | Medium |
| **Mobile responsive** | Touch-friendly UI | High |
| **Offline support** | PWA capabilities | High |
| **Notifications** | Browser notifications for alerts | Medium |

### 11.6 Stubbed Features (To Be Implemented Later)

| Feature | Description | Priority | Notes |
|---------|-------------|----------|-------|
| **Interactive Tutorial Tour** | Guided walkthrough for new players | Medium | Currently only turn-based hints exist. Full tour should walk through: Star Chart → Forces → Sectors → End Turn sequence. Consider using a library like `react-joyride` or custom implementation. |
| **Territory Boundaries (Voronoi)** | Visual territory zones on starmap | Low | Would show sphere of influence using Voronoi diagrams. High complexity due to force-directed layout. Consider only for static/zoomed views. |

### 11.7 Technical Debt

| Item | Description | Priority |
|------|-------------|----------|
| Type consistency | Some any types in services | Medium |
| Error handling | Standardize error shapes | Medium |
| Loading states | Consistent skeleton loaders | Low |
| Accessibility | ARIA labels, keyboard nav | High |

---

## 12. Troubleshooting

### 12.1 Common Issues

#### "No active game" error
- **Cause:** Missing cookies
- **Fix:** Check `gameId` and `empireId` cookies are set

#### Server Action returns undefined
- **Cause:** Missing `"use server"` directive
- **Fix:** Add `"use server"` at top of action file

#### UI not updating after action
- **Cause:** Missing `revalidatePath`
- **Fix:** Add `revalidatePath("/game")` after mutation

#### Hydration mismatch
- **Cause:** Server/client rendering difference
- **Fix:** Use `"use client"` for components with browser APIs

### 12.2 Debug Commands

```bash
# Check database
npm run db:studio

# Run dev server with verbose logging
DEBUG=* npm run dev

# Check for type errors
npm run typecheck

# Run tests
npm run test
```

### 12.3 Common Fixes

```typescript
// Fix: "Cannot read property of undefined"
const value = data?.property ?? defaultValue;

// Fix: "Object is possibly null"
if (!empire) return { success: false, error: "Not found" };

// Fix: Async in useEffect
useEffect(() => {
  const load = async () => {
    const data = await fetchData();
    setState(data);
  };
  load();
}, []);
```

---

## Appendix A: File Quick Reference

```
/src
├── app/
│   ├── actions/           # Server actions
│   ├── game/              # Game routes
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── components/
│   └── game/              # Game components
├── lib/
│   ├── db/
│   │   ├── index.ts       # DB connection
│   │   └── schema.ts      # DB schema
│   └── game/
│       ├── services/      # Business logic
│       ├── repositories/  # Data access
│       ├── types/         # Type definitions
│       ├── unit-config.ts # Unit constants
│       └── build-config.ts # Build constants
└── tailwind.config.ts     # Tailwind + LCARS colors
```

---

## Appendix B: Cookie Reference

| Cookie | Purpose | Set By |
|--------|---------|--------|
| `gameId` | Current game session | `startGameAction` |
| `empireId` | Player's empire | `startGameAction` |

---

## Appendix C: Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection | Yes |
| `ANTHROPIC_API_KEY` | AI bot decisions | Yes |

---

*This manual is a living document. Update it as the codebase evolves.*

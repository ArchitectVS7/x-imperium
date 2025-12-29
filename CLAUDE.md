# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nexus Dominion is a modernization of Solar Imperium/Solar Realms Elite - a turn-based space empire strategy game with AI-controlled bot opponents. Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Drizzle ORM, and PostgreSQL (Neon). The game features tiered AI bots with archetypes, emotional states, and memory systems.

## Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run start            # Start production server

# Testing
npm run test             # Run Vitest unit tests (watch mode)
npm run test -- --run    # Run unit tests once
npm run test:ui          # Vitest UI
npm run test:coverage    # Coverage report (80% threshold)
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # Playwright UI mode

# Run specific test file
npm run test -- src/lib/formulas/combat-power.test.ts

# Quality
npm run lint             # ESLint
npm run typecheck        # TypeScript strict mode

# Database (Drizzle + Neon PostgreSQL)
npm run db:generate      # Generate migrations
npm run db:migrate       # Run migrations
npm run db:push          # Push schema changes
npm run db:studio        # Drizzle Studio GUI

# Orchestration (multi-agent automation)
npm run orchestrate                    # Interactive setup
npm run orchestrate:quick "M9"         # Quick run for milestone
npm run orchestrate:dry --quick "M10"  # Dry run
npm run milestone:status               # Parse milestone status
```

## Architecture

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── game/              # Game pages (dashboard, combat, research, etc.)
│   ├── actions/           # Server Actions (turn-actions, combat-actions, etc.)
│   └── api/               # API routes
├── components/
│   └── game/              # Game UI components
│       ├── combat/        # AttackInterface, BattleReport, CombatPreview
│       ├── military/      # BuildQueuePanel, UnitCard
│       ├── planets/       # PlanetList, BuyPlanetPanel
│       ├── research/      # FundamentalResearchProgress
│       ├── messages/      # MessageInbox, GalacticNewsFeed
│       └── starmap/       # Force-directed empire visualization
├── lib/
│   ├── db/                # Drizzle schema and database connection
│   │   └── schema.ts      # All tables, enums, relations, types
│   ├── game/
│   │   ├── services/      # Business logic services
│   │   │   ├── turn-processor.ts      # 6-phase turn processing
│   │   │   ├── combat-service.ts      # Battle resolution
│   │   │   ├── resource-engine.ts     # Production/consumption
│   │   │   ├── population.ts          # Growth/starvation
│   │   │   ├── civil-status.ts        # Civil status evaluation
│   │   │   ├── build-queue-service.ts # Unit construction
│   │   │   ├── planet-service.ts      # Buy/release planets
│   │   │   ├── research-service.ts    # Research progression
│   │   │   └── covert-service.ts      # Spy operations
│   │   ├── repositories/  # Database access layer
│   │   └── constants/     # Game constants
│   ├── formulas/          # Pure calculation functions
│   │   ├── combat-power.ts
│   │   ├── casualties.ts
│   │   ├── army-effectiveness.ts
│   │   ├── population.ts
│   │   └── planet-costs.ts
│   ├── combat/            # Combat system
│   │   ├── phases.ts      # 3-phase combat (space/orbital/ground)
│   │   └── effectiveness.ts # Unit effectiveness matrix
│   ├── bots/              # AI bot system
│   │   ├── types.ts       # Bot types, decisions, archetypes
│   │   ├── archetypes/    # 8 archetype implementations
│   │   ├── emotions/      # Emotional state system
│   │   ├── memory/        # Relationship memory with decay
│   │   ├── bot-processor.ts  # Parallel turn processing
│   │   └── difficulty.ts  # Difficulty modifiers
│   ├── covert/            # Covert operations (10 operation types)
│   ├── market/            # Trading system
│   ├── diplomacy/         # Treaties and reputation
│   ├── events/            # Galactic events
│   └── victory/           # Victory conditions
├── data/
│   ├── personas.json      # 100 bot persona definitions
│   └── templates/         # Message templates per persona
└── test/                  # Test setup and utilities
```

### Key Patterns

**Services are pure functions tested independently** - Services in `src/lib/game/services/` are pure business logic tested via Vitest. Database calls are mocked in tests using `src/test/utils/db-mock.ts`.

**Server Actions handle database access** - All database writes go through Server Actions in `src/app/actions/`. Actions validate with Zod and call services.

**Formulas in dedicated modules** - Combat power, casualties, population growth, etc. are pure functions in `src/lib/formulas/` with comprehensive unit tests.

**Path alias** - Use `@/` for imports from `src/` directory.

### Database Schema

The schema in `src/lib/db/schema.ts` defines:
- Core tables: `games`, `empires`, `planets`
- Combat: `attacks`, `combatLogs`
- Economy: `marketPrices`, `marketOrders`, `buildQueue`
- Diplomacy: `treaties`, `messages`, `reputationLog`
- Research: `researchProgress`, `unitUpgrades`, `researchBranchAllocations`
- Bots: `botMemories`, `botEmotionalStates`
- Crafting/Syndicate: `resourceInventory`, `craftingQueue`, `syndicateContracts`
- Events: `galacticEvents`, `coalitions`

All tables use UUID primary keys and have proper foreign key relationships.

### Bot Architecture

Bots operate in 4 tiers:
- **Tier 1 (LLM-powered)**: Natural language decisions via Anthropic/OpenAI
- **Tier 2 (Strategic)**: Decision tree based on archetype
- **Tier 3 (Simple)**: Basic behavioral rules
- **Tier 4 (Random)**: Weighted random actions

8 archetypes: Warlord, Diplomat, Merchant, Schemer, Turtle, Blitzkrieg, Tech Rush, Opportunist

Bot decisions defined in `src/lib/bots/types.ts`:
```typescript
type BotDecision =
  | { type: "build_units"; unitType: UnitType; quantity: number }
  | { type: "buy_planet"; planetType: PlanetType }
  | { type: "attack"; targetId: string; forces: Forces }
  | { type: "diplomacy"; action: "propose_nap" | "propose_alliance"; targetId: string }
  | { type: "trade"; resource: ResourceType; quantity: number; action: "buy" | "sell" }
  | { type: "do_nothing" }
```

## Testing Conventions

- Unit tests: `*.test.ts` next to source files
- Service tests: `src/lib/game/services/__tests__/`
- E2E tests: `e2e/milestone-*.spec.ts` (Playwright)
- Test data-testid attributes on interactive elements

```typescript
// Example test pattern
describe("calculateCombatPower", () => {
  it("should apply diversity bonus for 4+ unit types", () => {
    const forces = { soldiers: 100, fighters: 50, lightCruisers: 10, heavyCruisers: 5 };
    const power = calculateCombatPower(forces);
    expect(power).toBeGreaterThan(basePower * 1.15);
  });
});
```

## Development Notes

- **Milestone-based development**: See `docs/MILESTONES.md` for implementation roadmap
- **PRD reference**: `docs/PRD.md` contains game design specifications
- **Bot personas**: 100 unique personas in `data/personas.json`
- **TypeScript strict mode** with `noUncheckedIndexedAccess`, `noImplicitReturns`
- **Coverage threshold**: 80% for branches, functions, lines, statements

### Environment Variables

Required in `.env.local`:
```
DATABASE_URL=postgresql://...  # Neon PostgreSQL connection
ANTHROPIC_API_KEY=sk-ant-...   # For LLM bots (M12)
```

### Key Game Mechanics (PRD Reference)

- **Turn processing**: 6 phases (income, population, civil status, market, bots, actions)
- **Combat**: 3 phases (space, orbital, ground) with unit effectiveness matrix
- **Protection**: 20-turn grace period at game start
- **Victory**: Conquest (60% territory), Economic (1.5x networth), Survival (turn 200)
- **Civil status**: 8 levels from Ecstatic (4x income) to Revolting (0.25x income)

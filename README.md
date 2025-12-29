# Nexus Dominion

A turn-based 4X space empire strategy game with AI-controlled bot opponents. Built with Next.js 14, TypeScript, and PostgreSQL.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/ArchitectVS7/nexus-dominion.git
cd nexus-dominion

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL (Neon PostgreSQL)

# Run database migrations
npm run db:push

# Start development server
npm run dev

# Access at http://localhost:3000
```

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS with LCARS-inspired design system
- **Database:** PostgreSQL (Neon) with Drizzle ORM
- **Testing:** Vitest (1800+ unit tests), Playwright (E2E)
- **AI Bots:** 4-tier system with 100 unique personas

## Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Production server

# Testing
npm run test             # Unit tests (watch mode)
npm run test -- --run    # Unit tests once
npm run test:e2e         # Playwright E2E tests
npm run test:coverage    # Coverage report (80% threshold)

# Quality
npm run lint             # ESLint
npm run typecheck        # TypeScript strict mode

# Database
npm run db:push          # Push schema changes
npm run db:studio        # Drizzle Studio GUI
npm run db:generate      # Generate migrations
npm run db:migrate       # Run migrations
```

## Game Features

### Core Gameplay
- Turn-based empire management (200-turn games)
- 5 resource types: Credits, Food, Ore, Petroleum, Research
- 8 planet types with unique production profiles
- Progressive unlock system (features unlock as you advance)

### Military & Combat
- 7 unit types: Marines, Drones, Frigates, Cruisers, Carriers, Stations, Agents
- 3-phase combat: Space Battle → Orbital Bombardment → Ground Assault
- Army diversity bonuses and unit effectiveness matrix
- Nuclear warfare unlocks at Turn 100

### Diplomacy & Economy
- Non-Aggression Pacts and Alliances
- Coalition system for group warfare
- Dynamic market with supply/demand pricing
- Black Market access at Turn 30

### Bot Opponents
- 100 unique bot personas with distinct personalities
- 8 archetypes: Warlord, Diplomat, Merchant, Schemer, Turtle, Blitzkrieg, Tech Rush, Opportunist
- 4-tier AI system:
  - **Tier 1 (LLM Elite):** Natural language decisions
  - **Tier 2 (Strategic):** Decision tree based
  - **Tier 3 (Simple):** Behavioral rules
  - **Tier 4 (Random):** Weighted random actions
- Emotional states and relationship memory

### Victory Conditions
1. **Conquest:** Control 60% of all planets
2. **Economic:** 1.5x networth of 2nd place
3. **Diplomatic:** Coalition controls 50% territory
4. **Research:** Complete all 8 research levels
5. **Military:** 2x military power of all others combined
6. **Survival:** Highest networth at Turn 200

## Documentation

- [CLAUDE.md](CLAUDE.md) - AI assistant context and codebase guide
- [docs/PRD.md](docs/PRD.md) - Product Requirements Document
- [docs/MILESTONES.md](docs/MILESTONES.md) - Development roadmap
- [docs/design/BOT_ARCHITECTURE.md](docs/design/BOT_ARCHITECTURE.md) - Bot AI system design

## Project Status

**Version:** 0.6-Prototype (M11 Complete)

| Milestone | Status |
|-----------|--------|
| M0-M8: Core Game | ✅ Complete |
| M9: Bot Decision Trees | ✅ Complete |
| M10: Emotional States | ✅ Complete |
| M11: Mid-Game Systems | ✅ Complete |
| M12: LLM Bots | 🔲 In Progress |

## License

GPL-2.0 - See [LICENSE.TXT](LICENSE.TXT)

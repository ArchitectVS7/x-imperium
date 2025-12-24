# Pass 2: Architect Review

**Date:** December 23, 2024
**Agent:** architect-reviewer
**Agent ID:** aa9d172
**Status:** REVISED after stakeholder session

## Executive Summary

**Greenfield Build Confirmed**: After stakeholder clarification, the repository has been cleared of legacy PHP code. This is a **pure greenfield Next.js/TypeScript build** with no migration concerns. The bot architecture aligns well with the chosen stack. Key decisions finalized: Supabase for database, OpenAI-compatible LLM abstraction with provider failover, and performance logging from day one.

**Architecture Confidence: HIGH**

## Tech Stack Assessment

### Stack Confirmed — RESOLVED
```
CONFIRMED STACK:
├─ Next.js 14+ (App Router)
├─ TypeScript (strict mode)
├─ React 18+
├─ Tailwind CSS + shadcn/ui
├─ Drizzle ORM
├─ Supabase (PostgreSQL)
└─ Server Actions for mutations
```

### Decisions Finalized After Session

| Component | Decision | Rationale |
|-----------|----------|-----------|
| **State Management** | Server authority (game), Client authority (UI) | Prevents cheating, clean separation |
| **Caching** | In-memory now, Redis scaffolded | Simple for MVP, ready to scale |
| **Database** | Supabase PostgreSQL | Stakeholder experience, generous free tier |
| **Authentication** | Anonymous v0.5, Email/password v0.6 | Minimize MVP scope |
| **LLM Provider** | OpenAI-compatible abstraction | Free tier arbitrage, provider failover chain |
| **Deployment** | Vercel now, Railway scaffolded | Simple start, ready for long-running jobs |

### No Migration Required
**CONFIRMED:** Repository cleared of legacy PHP code. This is a pure greenfield build.
- PHP codebase served as design reference only
- Analysis informed what to keep vs what was "feature bloat"
- Zero code porting required

## Data Architecture

### Critical Gap: Core Game Schema Undefined

PRD covers bot architecture but missing:

```sql
-- NEEDED: Core game tables
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  scenario_id INT NOT NULL,
  current_turn INT DEFAULT 1,
  turn_limit INT DEFAULT 200,
  status VARCHAR(20) -- 'active', 'completed'
);

CREATE TABLE empires (
  id SERIAL PRIMARY KEY,
  game_id INT REFERENCES games(id),
  player_email VARCHAR(255),
  bot_config_id INT,
  empire_name VARCHAR(100),
  credits BIGINT DEFAULT 100000,
  food BIGINT,
  ore BIGINT,
  petroleum BIGINT,
  research_points INT,
  -- ... all resources
);

CREATE TABLE planets (
  id SERIAL PRIMARY KEY,
  empire_id INT REFERENCES empires(id),
  planet_type VARCHAR(20),
  production_rate DECIMAL(10,2)
);

CREATE TABLE military_units (...);
CREATE TABLE research_progress (...);
CREATE TABLE attacks (...);
CREATE TABLE treaties (...);
CREATE TABLE market_prices (...);
CREATE TABLE game_events (...); -- Event sourcing for replays
```

## Performance Analysis

### Turn Processing Budget — REVISED

**Target: < 2 seconds** (confirmed with stakeholder)

```
v0.5 MVP (25 Tier 4 random bots):
├─ Random decisions: 25 × 5ms = 125ms
├─ Combat resolution: ~100ms
├─ Database writes: ~200ms
└─ TOTAL: ~425ms ✓

v0.7+ (with 10 LLM bots):
├─ Tier 4 random: 15 × 5ms = 75ms
├─ Tier 2-3 scripted: ~300ms
├─ Tier 1 LLM (async): Non-blocking
├─ Combat/DB: ~300ms
└─ TOTAL: <1 second ✓
```

### LLM Optimization Strategy (Confirmed)

1. **Reduce LLM bots to 10** (down from 24) — sufficient variety
2. **Async LLM processing** — decisions computed for NEXT turn while current resolves
3. **Graceful fallback** — if LLM slow, use Tier 2 scripted logic
4. **Provider failover chain** — free tier arbitrage (Groq → Together → OpenAI)

### Rate Limiting (Required)

```typescript
interface RateLimits {
  llmCallsPerGame: 5000,    // Hard ceiling
  llmCallsPerTurn: 50,      // Per-turn max
  llmCallsPerHour: 500,     // Abuse prevention
  maxDailySpend: 50.00,     // Cost ceiling ($)
}
```

### Performance Logging (From Day One)

```jsonl
// /logs/perf-{date}.jsonl
{"ts":"...","turn":15,"event":"turn_complete","ms":847,"breakdown":{"bots":312,"combat":89,"db":446}}
```

Lightweight, append-only, non-blocking. Essential for Alpha/Beta debugging.

### UI Performance
- **Galaxy Map**: Use react-konva (100 entities OK)
- **Glass Panel Effect**: Pre-render blur (backdrop-filter expensive)
- **Data Tables**: Virtualization for 100+ empires

## System Design Gaps

### Undefined Decisions

1. **Server Authority vs Client Authority**
   - Recommendation: Server Authority for actions, Client for UI

2. **Turn Advancement Model**
   - Recommendation: Progressive Enhancement with SSE
   - Submit turn → Stream progress → Seamless transition

3. **Game Session Persistence**
   - Checkpoint system every 10 turns
   - Allow resume from last checkpoint

4. **Multi-Tenancy**
   - Recommendation: One game at a time for MVP

### Refactoring Risks

1. **Game Logic Coupling** - Define service layer from start
2. **Bot Prompt Maintenance** - Database-driven prompts
3. **Magic Numbers** - Central configuration file

## Security Review

### Authentication
- Recommendation: NextAuth.js (free, sufficient)
- Email verification required
- JWT sessions for Vercel compatibility

### Game State Integrity
```typescript
// Server-side validation for ALL mutations
export async function buyPlanet(planetType) {
  'use server';
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const empire = await getPlayerEmpire(session.user.email);
  const cost = calculatePlanetCost(empire, planetType);

  if (empire.credits < cost) {
    throw new Error('Insufficient credits');
  }

  // Atomic transaction with optimistic locking
  await db.transaction(async (tx) => {
    await tx.update(empires)
      .set({ credits: empire.credits - cost, version: empire.version + 1 })
      .where(and(eq(empires.id, empire.id), eq(empires.version, empire.version)));
    await tx.insert(planets).values({ empireId: empire.id, planetType });
  });
}
```

### LLM Security
- Sanitize all user input in prompts (prevent injection)
- API keys in environment variables only
- Rate limiting per game (100 turns/hour max)
- Response validation with Zod schema

## DevOps Readiness

### Missing CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    - Type check (tsc)
    - Lint (ESLint)
    - Unit tests (Vitest)
    - E2E tests (Playwright)
    - Build check
  deploy:
    - Auto-deploy to Vercel on main
```

### Deployment Decision
**Recommendation: Hybrid**
- Frontend: Vercel (free, instant deploys)
- Bot Processing: Railway (long-running server)
- Queue job from Vercel to dedicated server

## Priority Items

### v0.5 (Foundation)
1. Tech stack decision - Rewrite vs hybrid
2. Database schema implementation (all core tables)
3. Authentication setup (NextAuth.js)
4. Core game loop - Server Actions
5. UI foundation - LCARS components
6. Turn processing architecture

### v0.6 (Bot Integration)
7. Bot database schema
8. Tier 4 bots (random)
9. Tier 3 bots (decision trees)
10. Bot message system
11. Combat with bots
12. Performance testing

### v0.7 (LLM & Polish)
13. LLM provider abstraction
14. Tier 1 bot implementation
15. Tier 2 strategic bots
16. Galaxy map (react-konva)
17. Scenario system

### Red Flags — ALL RESOLVED

| Original Flag | Resolution |
|---------------|------------|
| ~~No PHP→TypeScript migration~~ | **RESOLVED:** Greenfield build, no migration |
| ~~LLM timeout risk (48s)~~ | **RESOLVED:** Async processing, 10 LLM bots, <2s target |
| ~~Database schema incomplete~~ | **IN PROGRESS:** Schema to be finalized Day 1 |
| ~~Cost analysis missing~~ | **RESOLVED:** Free tier arbitrage + rate limiting + $50/day cap |

## New Architecture Artifacts Required

### Day One Scaffolding
1. **lib/cache/index.ts** — Cache interface with in-memory default
2. **lib/llm/provider.ts** — OpenAI-compatible abstraction with failover
3. **lib/telemetry/perf-logger.ts** — Performance logging (JSONL)
4. **lib/rate-limit/llm-guard.ts** — Rate limiting for LLM calls
5. **deployment/railway.toml** — Stubbed for future bot worker

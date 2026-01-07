# CRITICAL: Terminology Rules

> **Read this document FIRST before working on any code or documentation.**

## Forbidden Terms

| DO NOT USE | USE INSTEAD | REASON |
|------------|-------------|--------|
| `planet` / `planets` | **sector** / **sectors** | Deliberate rebranding from Solar Realms Elite |
| `25 AI opponents` | **10-100 AI opponents (configurable)** | Game supports variable bot counts |
| `200 turns` / `up to 200 turns` | **50-500 turns (based on game mode)** | Configurable per game mode |
| `Bot Phase` | **simultaneous processing** | All empires act simultaneously |
| `buy_planet` | **buy_sector** | Terminology consistency |

## Why This Matters

Nexus Dominion has deliberately moved away from Solar Realms Elite's "planet" terminology as part of a **critical rebranding decision**. We use **SECTORS** to establish our own identity.

Any code or documentation using "planet" terminology represents a **branding failure** and must be fixed immediately.

## Correct Game Configuration

| Parameter | Oneshot Mode | Campaign Mode |
|-----------|--------------|---------------|
| **Bot Count** | 10-25 bots | 25-100 bots |
| **Turn Limit** | 50-100 turns | 150-500 turns |
| **Default** | 25 bots, 100 turns | 50 bots, 200 turns |

## Database Note

The database table is currently named `planets` but is being migrated to `sectors`. In ALL code and documentation, use "sector" terminology even if the schema says "planets".

## Code Examples

```typescript
// WRONG
type BotDecision = { type: "buy_planet"; sectorType: PlanetType };

// CORRECT
type BotDecision = { type: "buy_sector"; sectorType: SectorType };
```

```typescript
// WRONG - Documentation
"Empires start with 5 planets each"

// CORRECT
"Empires start with 5 sectors each"
```

## Automated Enforcement

The CI pipeline runs `npm run compliance:check` to detect terminology violations.

## Related Documents

- [Terminology Audit](../reference/TERMINOLOGY-AUDIT.md) - Full audit of violations and remediation status
- [Game Design](../core/GAME-DESIGN.md) - Authoritative design reference

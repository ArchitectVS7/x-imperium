# Game Configuration Override System

**Status:** IMPLEMENTED
**Date:** January 2026
**Archived From:** Root `IMPLEMENTATION-SUMMARY.md`

---

## Summary

Per-game configuration override system allowing game-specific customization of combat parameters, unit stats, and archetype behaviors.

---

## Database Schema

```sql
CREATE TYPE game_config_type AS ENUM(
  'combat', 'units', 'archetypes', 'resources', 'victory'
);

CREATE TABLE game_configs (
  id uuid PRIMARY KEY,
  game_id uuid REFERENCES games(id),
  config_type game_config_type NOT NULL,
  overrides jsonb NOT NULL,
  created_at timestamp DEFAULT now()
);
```

---

## Service API

```typescript
// Load config with overrides merged
loadGameConfig<T>(gameId, configType)

// Set/update overrides
setGameConfigOverride(gameId, configType, overrides)

// Clear overrides
clearGameConfigOverride(gameId, configType)

// Check for overrides
hasGameConfigOverrides(gameId)

// Get all overrides
getAllGameConfigOverrides(gameId)
```

---

## Usage Example

```typescript
// Override combat parameters for a specific game
await setGameConfigOverride(gameId, 'combat', {
  unified: {
    defenderBonus: 1.25,  // Override from 1.10
  }
});

// Load merged config
const config = await loadGameConfig(gameId, 'combat');
```

---

## Merge Behavior

- Objects: Recursively merged
- Arrays: Completely replaced
- Primitives: Overridden
- Missing fields: Defaults preserved

---

## Key Files

- `src/lib/game/config/game-config-service.ts` - Core service
- `src/lib/game/config/combat-loader.ts` - Combat config
- `src/lib/game/config/unit-loader.ts` - Unit stats
- `src/lib/game/config/archetype-loader.ts` - Bot archetypes
- `drizzle/migrations/0004_add_game_configs.sql` - Migration

---

*Technical implementation reference for developers.*

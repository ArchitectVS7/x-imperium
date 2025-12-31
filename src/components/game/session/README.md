# Session Summary Screen

A full-screen session recap component for Nexus Dominion that displays statistics, empire rankings, and notable events from a completed play session.

## Features

- **Session Statistics**: Displays turns played, session duration, eliminations, and current turn
- **Power Rankings**: Shows top 10 empires ranked by networth with visual indicators for 1st/2nd/3rd place
- **Notable Events**: Chronological list of important events with context-appropriate icons
- **LCARS Styling**: Consistent with the game's Star Trek LCARS-inspired UI theme
- **Responsive Design**: Adapts to mobile and desktop viewports

## Usage

```tsx
import { SessionSummaryScreen } from "@/components/game/session";

function MyGameComponent() {
  const handleContinue = () => {
    // Resume game, navigate to dashboard, etc.
    router.push("/game/dashboard");
  };

  return <SessionSummaryScreen onContinue={handleContinue} />;
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onContinue` | `() => void` | Yes | Callback function called when the "Continue Game" button is clicked |

## Data Flow

The component automatically fetches session data via the `getSessionDataAction` server action, which retrieves:

1. **Session Summary** from `session-service.ts`:
   - Session number
   - Turn range (start/end)
   - Duration played
   - Eliminations count
   - Notable events list

2. **Empire Rankings**:
   - Top 10 empires by networth
   - Planet counts
   - Player/bot designation
   - Elimination status

## Event Types and Icons

The component displays different icons based on event type:

| Event Type | Icon | Description |
|------------|------|-------------|
| `elimination` | 💀 | Empire eliminated |
| `combat_victory` | ⚔️ | Successful attack |
| `combat_defeat` | 🛡️ | Failed attack |
| `alliance_formed` | 🤝 | Alliance established |
| `alliance_broken` | 💔 | Alliance dissolved |
| `boss_emergence` | 👑 | Boss bot spawned |
| `milestone` | 🎯 | Game milestone reached |
| `turn_start` | 🔄 | Session started |

## Server Action

The component uses `getSessionDataAction()` from `/src/app/actions/session-actions.ts`:

```typescript
import { getSessionDataAction, type SessionData } from "@/app/actions/session-actions";

// Returns SessionData or null if no session exists
const data = await getSessionDataAction();
```

## Styling

The component uses LCARS-themed Tailwind classes:

- `text-lcars-amber` - Primary accent color (gold/amber)
- `text-lcars-lavender` - Secondary accent color (lavender)
- `bg-gray-800/50` - Semi-transparent panels
- `border-gray-700` - Subtle borders

## Testing

Comprehensive test suite included at `__tests__/SessionSummaryScreen.test.tsx`:

```bash
# Run tests
npm run test -- src/components/game/session/__tests__/SessionSummaryScreen.test.tsx
```

Test coverage includes:
- Loading states
- Error handling
- Session statistics display
- Empire rankings with player highlighting
- Notable events rendering
- Duration formatting
- Continue button interaction
- Eliminated empire display

## Integration Example

Typical integration in a game flow:

```tsx
"use client";

import { useState } from "react";
import { SessionSummaryScreen } from "@/components/game/session";
import { GameDashboard } from "@/components/game/GameDashboard";

export default function GamePage() {
  const [showSummary, setShowSummary] = useState(false);

  // Show summary after turn processing or on game load
  // based on session state

  if (showSummary) {
    return (
      <SessionSummaryScreen
        onContinue={() => setShowSummary(false)}
      />
    );
  }

  return <GameDashboard />;
}
```

## Related Files

- **Component**: `/src/components/game/session/SessionSummaryScreen.tsx`
- **Server Action**: `/src/app/actions/session-actions.ts`
- **Session Service**: `/src/lib/game/services/session-service.ts`
- **Tests**: `/src/components/game/session/__tests__/SessionSummaryScreen.test.tsx`

## Notes

- The component handles its own data fetching and loading states
- All session data comes from the database via server actions
- The component is fully client-side rendered (`"use client"`)
- Error states provide a fallback "Continue Anyway" button
- Rankings are limited to top 10 empires for performance

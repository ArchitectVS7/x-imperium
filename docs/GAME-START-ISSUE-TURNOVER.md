# Game Start Issue - Turnover Document

**Date:** December 31, 2025
**Status:** UNRESOLVED - Awaiting second opinion
**Priority:** Critical (blocks all gameplay)

---

## Executive Summary

Users cannot start a new game. After clicking "BEGIN CONQUEST" on the game setup form, nothing happens. The game worked previously but broke after a significant UI redesign effort (~2 days of work).

---

## User Onboarding & New Game Start Flow

### Expected Flow

```
1. User visits / (homepage)
   └── Clicks "START YOUR CONQUEST" link

2. Navigates to /game (dashboard page)
   └── hasActiveGameAction() returns false (no cookies)
   └── getResumableCampaignsAction() returns []
   └── Renders <NewGamePrompt /> component

3. User sees new game form with:
   - Empire Name input (required, autofocused)
   - Game Mode selector (Oneshot/Campaign)
   - Galaxy Size selector (10/25/50/100 bots)
   - Difficulty selector (Easy/Normal/Hard/Nightmare)
   - "BEGIN CONQUEST" submit button

4. User fills form and clicks "BEGIN CONQUEST"
   └── Form submits to handleStartGame() server action
   └── Calls startGameAction(formData)
   └── Creates game in database
   └── Creates player empire with 9 starting planets
   └── Creates bot empires (25 default)
   └── Initializes galaxy geography, market, research
   └── Sets cookies (gameId, empireId)
   └── Returns { success: true, gameId, empireId }

5. handleStartGame() redirects to /game/starmap
   └── User sees starmap with their empire
```

### Key Files in Flow

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Homepage with "START YOUR CONQUEST" link |
| `src/app/game/page.tsx` | Dashboard - shows form or game depending on state |
| `src/app/game/page.tsx:196-263` | `NewGamePrompt` component with the form |
| `src/app/actions/game-actions.ts:104-199` | `startGameAction()` - creates game |
| `src/lib/game/repositories/game-repository.ts:225-275` | `startNewGame()` - core game creation |
| `src/components/start-game/*.tsx` | Form selectors (GameMode, BotCount, Difficulty) |

---

## Previous Fix Attempts

### Commit: bdcd223 (Dec 31, 2025 05:38)
**"fix(game-start): improve form UX and add data cleanup for stuck states"**

Changes made:
- Added clear visual label for required Empire Name field with asterisk
- Added autofocus to Empire Name input
- Added better placeholder text ("e.g., Terran Federation")
- Improved error message styling
- Added "Clear corrupted data" button when data load fails
- Created `/api/admin/clear-games` endpoint
- Created `scripts/cleanup-db.ts` utility

Hypothesis: Users might not be filling in the required empire name field.

### Commit: 15e266c (Dec 31, 2025 07:20)
**"fix(game-start): clear cookies along with games data"**

Changes made:
- Added `/api/admin/clear-cookies` endpoint
- Updated `ClearDataButton` to clear both games AND cookies
- Force hard refresh after clearing to ensure clean state

Hypothesis: Cookies pointing to corrupted/deleted game IDs were causing issues.

### Commit: c9e54af (This session)
**"fix(build): remove unused router variable in ClearDataButton"**

Changes made:
- Removed unused `useRouter` import and variable
- Fixed ESLint build error

---

## Technical Analysis

### Form Submission Path

```typescript
// src/app/game/page.tsx:196-206
function NewGamePrompt({ error }: { error?: string }) {
  async function handleStartGame(formData: FormData) {
    "use server";
    const result = await startGameAction(formData);
    if (result.success) {
      redirect("/game/starmap");  // <-- Should redirect on success
    }
    // If failed, redirect with error in query param
    const errorMessage = encodeURIComponent(result.error || "Failed to start game");
    redirect(`/game?error=${errorMessage}`);
  }
  // ... form renders with action={handleStartGame}
}
```

### Form Structure

```html
<!-- The form uses Server Actions (action={handleStartGame}) -->
<form action={handleStartGame}>
  <input name="empireName" required minLength={2} maxLength={100} />
  <input type="hidden" name="gameMode" value="oneshot" />  <!-- from GameModeSelector -->
  <input type="hidden" name="botCount" value="25" />        <!-- from BotCountSelector -->
  <input type="hidden" name="difficulty" value="normal" /> <!-- from DifficultySelector -->
  <button type="submit">BEGIN CONQUEST</button>
</form>
```

### Selectors Use Hidden Inputs

Each selector component maintains local state but sends data via hidden inputs:
- `GameModeSelector.tsx:29`: `<input type="hidden" name={name} value={selected} />`
- `BotCountSelector.tsx:58`: `<input type="hidden" name={name} value={selected} />`
- `DifficultySelector.tsx` (similar pattern)

---

## Potential Root Causes

### 1. Server Action Not Executing
- Form might not be submitting at all
- JavaScript error preventing form submission
- Server action might be failing silently

### 2. Database Connection Issue
- `startGameAction` could fail to connect to database
- Error is caught but not displayed properly

### 3. Hidden Input Value Not Set
- Selector components might not be setting hidden input values
- React hydration mismatch causing issues

### 4. Rate Limiting
- `checkRateLimit()` could be blocking requests
- Returns error about "Too many attempts"

### 5. Cookie Setting Issue
- `setGameCookies()` might fail
- Cookies might not persist properly

### 6. Navigation/Redirect Issue
- `redirect()` from next/navigation might not work in certain contexts
- Form might be reloading instead of navigating

---

## Diagnostic Steps for Next Session

### 1. Check Browser Console
```
Open DevTools > Console
Click "BEGIN CONQUEST"
Look for:
- JavaScript errors
- Network request to /game (POST)
- Any error messages
```

### 2. Check Network Tab
```
Open DevTools > Network
Click "BEGIN CONQUEST"
Look for:
- POST request to /game
- Response status code
- Response body (success/error)
```

### 3. Check Server Logs
```
In Vercel dashboard:
- Go to Functions logs
- Look for errors around game creation time
- Check for database connection errors
```

### 4. Test Server Action Directly
```typescript
// In browser console on /game page:
// Check if the form elements are correctly populated
document.querySelector('[name="empireName"]').value
document.querySelector('[name="gameMode"]').value
document.querySelector('[name="botCount"]').value
document.querySelector('[name="difficulty"]').value
```

### 5. Add Debug Logging
```typescript
// In src/app/actions/game-actions.ts:104
export async function startGameAction(formData: FormData): Promise<StartGameResult> {
  console.log('startGameAction called');
  console.log('empireName:', formData.get('empireName'));
  console.log('gameMode:', formData.get('gameMode'));
  console.log('botCount:', formData.get('botCount'));
  console.log('difficulty:', formData.get('difficulty'));
  // ... rest of function
}
```

---

## Environment Details

- **Framework:** Next.js 14.2.35 (App Router)
- **Database:** PostgreSQL (Neon)
- **ORM:** Drizzle
- **Deployment:** Vercel
- **Auth:** Cookie-based session (no auth provider)

---

## Related Files to Investigate

1. `src/components/providers/Providers.tsx` - Check for context issues
2. `src/lib/db/index.ts` - Database connection handling
3. `src/lib/security/rate-limiter.ts` - Rate limiting logic
4. `src/app/game/layout.tsx` - Game layout wrapper (if exists)

---

## Questions for Second Opinion

1. Is the Server Action being invoked at all when the button is clicked?
2. Are there any console errors in the browser?
3. Is there a JavaScript error preventing form submission?
4. Is the database connection working in production?
5. Could this be a Next.js 14 Server Action caching issue?
6. Is there a race condition between cookie setting and redirect?

---

## Timeline

- **Prior to Dec 28:** Game start working
- **Dec 28-30:** Major UI redesign work (PRD revision)
- **Dec 31 05:38:** First fix attempt (bdcd223)
- **Dec 31 07:20:** Second fix attempt (15e266c)
- **Dec 31 current:** Issue persists

---

## Recommendation

Given that:
1. Multiple fix attempts have not resolved the issue
2. Cannot run Playwright headed in current environment to visually debug
3. Root cause is not yet identified

**Recommend:**
1. Deploy current branch to Vercel
2. Open browser DevTools on deployed site
3. Attempt to start game while watching Console and Network tabs
4. Capture exact error or behavior
5. Add debug logging to server action if needed
6. Consider rollback to pre-redesign commit if investigation stalls

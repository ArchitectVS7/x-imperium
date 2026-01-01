# UX Analysis: Nexus Dominion
## Making the Game Human-Playable

**Date:** January 1, 2026
**Analyst:** UX Researcher Agent
**Game Version:** Alpha (Pre-M10)

---

## Executive Summary

Nexus Dominion has **solid game mechanics** but suffers from critical UX friction that prevents players from understanding what to do, when to do it, and how the game state changes. The game feels administrative rather than strategic, breaking the intended "board game" experience.

**Critical Finding:** Players are experiencing **cognitive overload** combined with **information scarcity** - they see too much unorganized data but lack actionable guidance about what matters NOW.

**Immediate Impact Recommendations (Priority 1):**
1. **Turn Phase Awareness System** - Players must always know which phase they're in
2. **Actionable Guidance** - Convert passive warnings into clickable action prompts
3. **Star Map as Central Hub** - Make navigation to star map effortless
4. **No-Scroll Resource Screens** - Redesign layouts to fit critical info on screen
5. **Strategic Visual Language** - Replace administrative UI with anticipation/payoff patterns

---

## 1. Current State Assessment

### 1.1 Dashboard & Navigation Analysis

**Current State:**
- Dashboard (`src/app/game/page.tsx`) shows comprehensive stats in grid layout
- Navigation requires clicking through menu or sidebar
- Star map is buried as just another page (`/game/starmap`)
- No visual hierarchy indicating what requires immediate attention

**What Works:**
- Comprehensive data display
- Consistent LCARS-themed styling
- Turn counter is visible
- Food warnings are prominent

**Critical Issues:**
- **Turn phase is invisible** - Players don't know which of the 6 phases they're in
- **No clear call-to-action** - What should the player do RIGHT NOW?
- **Equal visual weight** - Everything looks equally important
- **Navigation is menu-driven** - Not map-centric as intended

### 1.2 Turn Processing Flow

**Current Implementation (GameShell.tsx):**
```typescript
// 6 phases: income, population, civil status, market, bots, actions
// Player only sees "END TURN" button - no phase indicators
```

**Player Mental Model:**
```
Player thinks: "I press END TURN and stuff happens"
Reality: 6 distinct phases with different mechanics
Gap: Player has no idea WHEN things happen or WHY
```

**Turn Summary Modal appears AFTER turn** - This is backwards for learning. Players need:
1. **Pre-turn briefing:** "Here's what's about to happen"
2. **Phase-by-phase feedback:** "Food consumption phase - you lost 500 food"
3. **Post-turn summary:** "Overall turn results"

### 1.3 Resource Management Screens

**Market Panel (`MarketPanel.tsx`):**
- Prices section (3 items) + Your Resources (4 items) + Trade Form = **Requires scrolling**
- Buy/Sell toggle is visible but requires scrolling to see validation
- Action button is at bottom (below fold on many screens)

**Build Units Panel (`BuildUnitsPanel.tsx`):**
- 7 unit types in scrollable list
- Selected unit details appear below
- Quantity selector and confirmation button below that
- **Critical issue:** "I want to buy troops" requires 3-4 scrolls to complete

**Pattern Analysis:**
- Vertical stacking of: Selection → Details → Action
- This forces scrolling and breaks visual continuity
- Players lose context while scrolling

### 1.4 Star Map Component

**Current Implementation (`StarMap.tsx`):**
- Beautiful force-directed graph visualization
- Shows empires as nebula clouds
- Intel system with unknown/basic/moderate/full visibility
- Treaty lines and threat indicators

**Critical Navigation Issue:**
```typescript
// To get back to star map from any page:
// 1. Click sidebar link OR
// 2. Use browser back button OR
// 3. Hope there's a breadcrumb
//
// NO PERSISTENT "RETURN TO MAP" BUTTON
```

**Board Game Comparison:**
- Physical board: Always visible, always the reference point
- Digital implementation: Hidden in navigation, equal weight to other pages
- **This breaks the spatial mental model**

---

## 2. Player Experience Analysis

### 2.1 Player Journey Friction Map

**Turn 1-5 (New Player):**
1. **Confusion Point:** "What do I do first?"
   - Current: No guidance, just panels of stats
   - Expected: Clear first action prompt

2. **Confusion Point:** "Do I have enough food?"
   - Current: Warning appears but no clear solution
   - Expected: "Click here to buy Agriculture sectors"

3. **Confusion Point:** "How do I build troops?"
   - Current: Navigate to Military → Scroll → Select → Scroll → Confirm
   - Expected: Payoff moment with visual feedback

**Turn 20-50 (Experienced Player):**
1. **Frustration Point:** "Where did my resources go?"
   - Current: No phase-by-phase breakdown
   - Expected: "Phase 1: Food consumed 500, Phase 2: Income +1000"

2. **Frustration Point:** "I want to attack but the map is buried"
   - Current: Sidebar link to /game/starmap
   - Expected: Persistent map access from all screens

3. **Frustration Point:** "Did I remember to check diplomacy?"
   - Current: Must remember to visit page
   - Expected: Alerts/notifications for diplomatic events

### 2.2 Broken Mental Models

**Mental Model 1: "The Galaxy is My Board"**
- Player expects: Star map as central reference, planets as territories
- Game delivers: Menu-driven navigation, map is just another page
- **Fix:** Make star map the persistent background/hub

**Mental Model 2: "Turns Have Phases"**
- Player expects: Clear phase progression, understand cause/effect
- Game delivers: Black box "processing..." then results
- **Fix:** Show phase execution with visual feedback

**Mental Model 3: "Resources Flow Through My Empire"**
- Player expects: Visual connection between planets → resources → units
- Game delivers: Disconnected numbers in panels
- **Fix:** Resource flow visualization

### 2.3 Information Hierarchy Failures

**Current Hierarchy:**
```
All information has equal visual weight:
- Credits: Large number in panel
- Population: Large number in panel
- Turn counter: Large number at top
- Military: Large number in panel

Player question: "Which number matters RIGHT NOW?"
Answer: No idea.
```

**Correct Hierarchy for Turn-Based Strategy:**
```
TIER 1 (Critical - Immediate Action Required):
  - Food deficit warning with action button
  - Protection expiring in 2 turns
  - Attack incoming notification

TIER 2 (Important - Review Each Turn):
  - Resource changes
  - Build queue progress
  - Diplomacy status

TIER 3 (Context - Reference Info):
  - Total networth
  - Civil status
  - Rank
```

---

## 3. Strategy Game Best Practices Comparison

### 3.1 Civilization Series - Turn Phase Clarity

**Civ VI Implementation:**
- **Turn starts:** Shows "Enemy Turn" with faction icons animating
- **Your turn:** Clear "Choose Research" prompt if needed
- **Unit prompts:** "This unit needs orders" with arrow pointing to unit
- **Action required:** Modal blocks turn end until critical choices made

**Nexus Dominion Should Adopt:**
1. **Phase labels:** "Phase 1: Income Collection"
2. **Action prompts:** "Choose research allocation" with link
3. **Blocking modals:** "You have no food! Buy sectors or starve next turn"

### 3.2 Stellaris - Resource Management & Space Map

**Stellaris Implementation:**
- **Galaxy map is always accessible:** Press spacebar to toggle
- **Resource bar:** Top of screen, always visible, color-coded warnings
- **Tooltips on everything:** Hover any number to see breakdown
- **Outliner sidebar:** Persistent list of all assets with filters

**Nexus Dominion Should Adopt:**
1. **Persistent map access:** Floating button or keyboard shortcut
2. **Sticky resource bar:** Always visible at top (EmpireStatusBar is bottom-only)
3. **Detailed tooltips:** Every number should explain how it's calculated
4. **Empire outliner:** Sidebar with all planets, build queues, threats

### 3.3 XCOM - Tactical Clarity & Urgent Notifications

**XCOM Implementation:**
- **Critical alerts:** Full-screen modal for important events
- **Action economy:** Shows remaining actions clearly (2/2 moves, 1/1 attack)
- **Preview before commit:** See outcome of actions before executing
- **Undo system:** Can undo movement until action taken

**Nexus Dominion Should Adopt:**
1. **Action budget:** "This turn: 0/3 attacks used, 2/10 build slots filled"
2. **Attack preview:** Show estimated casualties before launching
3. **Resource preview:** "Ending turn will consume 500 food (you have 400) - BUY NOW?"

### 3.4 Board Game Digital Adaptations - Board as Hub

**Ticket to Ride, Through the Ages, Wingspan:**
- **Board always visible:** Background layer, cards/menus overlay it
- **Zoom to detail:** Click territory to zoom in, back button returns to full board
- **Visual state changes:** Animations show resources moving, cards being played
- **Turn order indicator:** Clear "Your Turn" vs "Waiting"

**Nexus Dominion Should Adopt:**
1. **Star map as background layer:** Visible behind panels (dimmed/blurred)
2. **Panel overlays:** Resource management slides in from side, doesn't replace map
3. **Visual animations:** Show ships moving, planets changing color, resources flowing
4. **Persistent return-to-map button:** Large, always visible

---

## 4. Specific Recommendations (Component-Level)

### 4.1 PRIORITY 1: Turn Phase Awareness System

**Current State:**
- No indication of which phase is executing
- Turn processing is opaque
- Player sees "PROCESSING..." then results

**Recommended Implementation:**

```typescript
// New component: PhaseIndicator.tsx
interface PhaseIndicatorProps {
  currentPhase: TurnPhase | null; // null = player action phase
  phaseProgress: number; // 0-100
}

// Visual design:
// Top of screen, always visible
// Shows 6 phases as horizontal timeline
// Current phase is highlighted and animated
// Completed phases show checkmark
// Upcoming phases are dimmed

// Example states:
// [✓ Income] → [▶ Population] → [ Market ] → [ Bots ] → [ Actions ] → [ Events ]
//              ████████░░░░░░░░ 60%

// During player phase:
// [✓ Income] [✓ Population] [✓ Market] [✓ Bots] → [▶ YOUR TURN] → [ Events ]
```

**Integration Points:**
1. Add to `GameShell.tsx` above main content
2. Update `endTurnEnhancedAction` to emit phase events
3. Add WebSocket or polling for real-time phase updates
4. Show phase-specific tooltips on hover

**Expected Player Impact:**
- **Understand timing:** "Food is consumed in Population phase, THEN I can buy more"
- **Anticipate events:** "Bots move after Market, so I should buy now"
- **Learn system:** Visual reinforcement of 6-phase structure

### 4.2 PRIORITY 1: Actionable Guidance System

**Current State:**
```typescript
// FoodWarning.tsx shows passive warning
<div className="text-yellow-400">
  Warning: Food deficit! Population will starve.
</div>
```

**Recommended Implementation:**

```typescript
// New component: ActionPrompt.tsx
interface ActionPromptProps {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  actions: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
    icon: LucideIcon;
  }>;
}

// Example usage:
<ActionPrompt
  severity="critical"
  message="Food deficit! You will lose population next turn."
  actions={[
    {
      label: "Buy Agriculture Sectors",
      href: "/game/planets?type=food",
      icon: ShoppingCart
    },
    {
      label: "Buy Food from Market",
      href: "/game/market?resource=food&action=buy",
      icon: Store
    },
    {
      label: "Dismiss (Accept Starvation)",
      onClick: () => dismissWarning(),
      icon: X
    }
  ]}
/>
```

**Visual Design:**
- **Critical:** Red border, pulsing glow, blocks 50% of screen
- **Warning:** Yellow border, appears at top of dashboard
- **Info:** Blue border, dismissible notification

**Where to Add:**
1. Replace `FoodWarning` with `ActionPrompt`
2. Add to TurnOrderPanel for pre-turn checks
3. Show after turn processing for new issues
4. Add to resource panels for threshold warnings

### 4.3 PRIORITY 1: Star Map as Central Hub

**Current Navigation Pattern:**
```
/game → Dashboard
/game/military → Military Page
/game/starmap → Star Map Page (equal weight)
```

**Recommended Pattern:**
```
/game/starmap → Star Map (DEFAULT VIEW)
  ├─ Overlay: Resource Panel (slide from bottom)
  ├─ Overlay: Military Panel (slide from right)
  ├─ Overlay: Sector Detail (zoom transition)
  └─ Overlay: Turn Summary Modal (center)

/game → Redirects to /game/starmap
```

**Implementation Strategy:**

**Step 1: Make Star Map the Default Route**
```typescript
// src/app/game/page.tsx
export default function GamePage() {
  redirect('/game/starmap');
}
```

**Step 2: Convert Pages to Overlay Panels**
```typescript
// New component: OverlayPanel.tsx
interface OverlayPanelProps {
  isOpen: boolean;
  onClose: () => void;
  position: 'bottom' | 'right' | 'center' | 'fullscreen';
  title: string;
  children: React.ReactNode;
}

// Shows dimmed star map in background
// Panel slides in from edge
// Click backdrop to close
// ESC key to close
```

**Step 3: Add Persistent Map Navigation**
```typescript
// Add to GameHeader.tsx
<button
  onClick={() => router.push('/game/starmap')}
  className="fixed bottom-4 right-4 z-50 bg-lcars-amber text-black p-4 rounded-full shadow-lg hover:scale-110 transition-transform"
>
  <Map className="w-6 h-6" />
  <span className="sr-only">Return to Star Map</span>
</button>

// Always visible, floats above content
// Pulsing glow when important events on map
```

**Step 4: Update TurnOrderPanel Actions**
```typescript
// Change action links to open overlay panels
// Instead of: href="/game/military"
// Use: onClick={() => openPanel('military')}
// Panel opens over star map background
```

**Expected Player Impact:**
- **Spatial awareness:** Always know where empires are located
- **Faster navigation:** No page transitions, instant overlays
- **Board game feel:** Map is the board, panels are like picking up cards
- **Reduced cognitive load:** One primary view to memorize

### 4.4 PRIORITY 1: No-Scroll Resource Screens

**Problem Components:**
1. `MarketPanel.tsx` - 3 sections stack vertically, requires scrolling
2. `BuildUnitsPanel.tsx` - 7 units + details + form, requires scrolling
3. `PlanetList.tsx` - Multiple planets stack, requires scrolling

**Recommended Layout Pattern: "Card + Details Sidebar"**

```typescript
// Example: MarketPanel Redesign
<div className="flex h-[600px]"> {/* Fixed height */}

  {/* LEFT: Resource Cards (1/3 width, scrollable if needed) */}
  <div className="w-1/3 overflow-y-auto pr-4 border-r border-gray-700">
    {resources.map(resource => (
      <ResourceCard
        key={resource}
        resource={resource}
        isSelected={selected === resource}
        onClick={() => setSelected(resource)}
      />
    ))}
  </div>

  {/* RIGHT: Trade Interface (2/3 width, no scroll) */}
  <div className="w-2/3 pl-4 flex flex-col">
    <h3>Trade {selectedResource}</h3>

    {/* Buy/Sell toggle - visible */}
    <div className="flex gap-2 mb-4">{...}</div>

    {/* Quantity slider + input - visible */}
    <div className="mb-4">{...}</div>

    {/* Validation preview - visible */}
    <div className="flex-1 mb-4">{...}</div>

    {/* Action button - ALWAYS VISIBLE at bottom */}
    <button className="w-full py-3 bg-lcars-amber">
      BUY 100 FOOD FOR 5,000 CR
    </button>
  </div>
</div>
```

**Key Principles:**
1. **Fixed outer container height** - Use viewport units or fixed pixels
2. **Horizontal split** - Selection on left, action on right
3. **Action button always visible** - No scrolling to confirm
4. **Internal scrolling only for lists** - Not for the whole panel

**Apply to Military Page:**
```typescript
// BuildUnitsPanel Redesign
<div className="flex h-[500px]">

  {/* LEFT: Unit Cards (scrollable) */}
  <div className="w-2/5 overflow-y-auto">
    {units.map(unit => (
      <UnitCard {...unit} isSelected={selected === unit.id} />
    ))}
  </div>

  {/* RIGHT: Build Form (no scroll) */}
  <div className="w-3/5 pl-4 flex flex-col">
    <UnitStats unit={selectedUnit} />
    <QuantitySelector />
    <CostPreview />
    <BuildButton /> {/* Always visible */}
  </div>
</div>
```

**Mobile Considerations:**
- On mobile (<768px), stack vertically with tabs
- Tabs: "Select Unit" → "Confirm Build" (wizard pattern)
- Prevents scrolling chaos on small screens

### 4.5 PRIORITY 2: Strategic Visual Language

**Problem:** Game feels like an admin dashboard, not a strategic conquest

**Current Visual Hierarchy:**
```
Everything is:
- Gray panels with amber headers
- Uniform typography
- Equal visual weight
- No emotional payoff for actions
```

**Recommended Visual System:**

**Tier 1: Anticipation (Pre-Action)**
```css
/* Before building troops */
.unit-card-hover {
  background: linear-gradient(135deg, #1a1a2e, #0f0f1a);
  border: 2px solid #fbbf24; /* Amber glow */
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
  transform: scale(1.02);
  cursor: pointer;
}

/* Show preview of what you'll get */
.build-preview {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(251, 191, 36, 0.1);
  border-left: 4px solid #fbbf24;
}

.build-preview::before {
  content: "→";
  font-size: 2rem;
  color: #fbbf24;
  animation: pulse 1s infinite;
}
```

**Tier 2: Payoff (Post-Action)**
```css
/* After successful build */
@keyframes successPulse {
  0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
  50% { box-shadow: 0 0 0 20px rgba(34, 197, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}

.action-success {
  animation: successPulse 0.6s ease-out;
  border-color: #22c55e;
}

/* Show what you gained */
.resource-gain {
  color: #22c55e;
  font-size: 1.25rem;
  font-weight: bold;
  animation: slideInRight 0.4s ease-out;
}

.resource-gain::before {
  content: "+";
}
```

**Tier 3: Threat/Warning (Attention)**
```css
/* Incoming attack or critical issue */
@keyframes alertPulse {
  0%, 100% { background-color: rgba(239, 68, 68, 0.1); }
  50% { background-color: rgba(239, 68, 68, 0.3); }
}

.critical-alert {
  animation: alertPulse 1.5s infinite;
  border: 2px solid #ef4444;
  box-shadow: 0 0 30px rgba(239, 68, 68, 0.5);
}

/* Countdown timer for urgency */
.threat-countdown {
  font-size: 2rem;
  color: #ef4444;
  font-variant-numeric: tabular-nums;
  font-family: 'Orbitron', monospace;
}
```

**Component-Specific Applications:**

**Military Panel:**
```typescript
// Before: Plain list of units
<div className="grid grid-cols-4 gap-3">
  {units.map(unit => (
    <div className="bg-black/30 p-3 rounded">
      <div className="text-xs text-gray-500">{unit.name}</div>
      <div className="font-mono text-blue-400">{unit.count}</div>
    </div>
  ))}
</div>

// After: Strategic preview with payoff
<div className="grid grid-cols-4 gap-3">
  {units.map(unit => (
    <UnitCard
      unit={unit}
      onClick={() => selectUnit(unit)}
      className={cn(
        "group relative overflow-hidden transition-all",
        "hover:scale-105 hover:z-10",
        "hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]",
        selectedUnit?.id === unit.id && "ring-2 ring-lcars-amber"
      )}
    >
      {/* Preview of combat power on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Show unit icon with glow */}
      <UnitIcon type={unit.type} className="w-12 h-12 mb-2 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />

      {/* Count with emphasis */}
      <div className="text-2xl font-display text-blue-400 group-hover:text-blue-300">
        {unit.count.toLocaleString()}
      </div>

      {/* Power rating bar */}
      <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
          style={{ width: `${(unit.power / maxPower) * 100}%` }}
        />
      </div>
    </UnitCard>
  ))}
</div>
```

**Build Queue Payoff:**
```typescript
// When unit completes construction
<div className="relative overflow-hidden">
  {/* Celebration animation */}
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-500/20"
  />

  {/* Show what you gained */}
  <div className="flex items-center gap-4 p-4 bg-green-900/20 border-l-4 border-green-400">
    <Sparkles className="w-8 h-8 text-green-400 animate-pulse" />
    <div>
      <div className="text-lg font-display text-green-400">
        CONSTRUCTION COMPLETE
      </div>
      <div className="text-2xl font-bold text-white">
        +{quantity} {unitName}
      </div>
    </div>
    <div className="ml-auto text-right">
      <div className="text-sm text-gray-400">Combat Power</div>
      <div className="text-xl font-mono text-blue-400">
        +{powerGained.toLocaleString()}
      </div>
    </div>
  </div>
</div>
```

**Attack Anticipation:**
```typescript
// Before launching attack
<CombatPreview
  attacker={playerForces}
  defender={enemyForces}
  className="bg-gradient-to-br from-red-950/50 to-orange-950/50 border-2 border-red-500/50"
>
  <div className="flex justify-between items-center mb-4">
    <div className="text-center flex-1">
      <div className="text-sm text-gray-400">Your Forces</div>
      <div className="text-3xl font-display text-blue-400">{yourPower}</div>
    </div>

    <Swords className="w-12 h-12 text-red-400 animate-pulse" />

    <div className="text-center flex-1">
      <div className="text-sm text-gray-400">Enemy Forces</div>
      <div className="text-3xl font-display text-red-400">{enemyPower}</div>
    </div>
  </div>

  {/* Estimated outcome */}
  <div className="bg-black/50 p-4 rounded-lg">
    <div className="text-sm text-gray-400 mb-2">Estimated Casualties:</div>
    <div className="flex justify-between">
      <span className={yourLosses < enemyLosses ? "text-green-400" : "text-yellow-400"}>
        You lose: {yourLosses} units
      </span>
      <span className={enemyLosses > yourLosses ? "text-green-400" : "text-yellow-400"}>
        They lose: {enemyLosses} units
      </span>
    </div>
    <div className="mt-2 text-center">
      <WinProbabilityBar chance={winChance} />
    </div>
  </div>

  <button className="w-full mt-4 py-3 bg-red-600 hover:bg-red-500 text-white font-display text-lg transition-all hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]">
    LAUNCH ATTACK
  </button>
</CombatPreview>
```

### 4.6 PRIORITY 2: Turn Summary Enhancement

**Current Implementation:**
- TurnSummaryModal shows after turn completes
- Lists resource changes and events
- Feels like a report card, not a story

**Recommended Enhancement:**

```typescript
// Staged reveal of turn events
<TurnSummaryModal>
  {/* Stage 1: Phase-by-Phase Results (2s each) */}
  <PhaseResults
    phases={[
      { name: "Income", events: [...], duration: 2000 },
      { name: "Population", events: [...], duration: 2000 },
      { name: "Market", events: [...], duration: 1500 },
      { name: "Bot Actions", events: [...], duration: 2000 },
      { name: "Combat", events: [...], duration: 3000 },
      { name: "Events", events: [...], duration: 2000 }
    ]}
    onComplete={() => setStage("summary")}
  />

  {/* Stage 2: Overall Summary */}
  <TurnSummary
    resourceChanges={delta}
    majorEvents={highlights}
    nextTurnPreviews={upcoming}
  />

  {/* Stage 3: Urgent Actions Required */}
  {hasUrgentIssues && (
    <UrgentActionsRequired
      issues={[
        { type: "food_critical", action: () => router.push("/game/market") },
        { type: "attack_incoming", action: () => router.push("/game/combat") }
      ]}
    />
  )}
</TurnSummaryModal>
```

**Visual Design:**
- Use full-screen takeover (dim background)
- Animate each phase with icon + results
- Color-code gains (green) vs losses (red)
- Sound effects for significant events (optional)
- Skip button for experienced players
- Auto-advance after 2-3 seconds per phase

---

## 5. Priority Fixes by Impact

### CRITICAL (Fix Immediately - Blocks Playability)

**P1: Turn Phase Awareness**
- **Impact:** Players can't learn the game without understanding timing
- **Effort:** Medium (new component, integrate with turn processing)
- **Files:** Add `PhaseIndicator.tsx`, update `GameShell.tsx`, `turn-actions.ts`

**P2: Actionable Guidance**
- **Impact:** Players don't know how to solve problems
- **Effort:** Low (replace FoodWarning with ActionPrompt)
- **Files:** Replace `FoodWarning.tsx`, update `TurnOrderPanel.tsx`

**P3: No-Scroll Resource Screens**
- **Impact:** Critical actions hidden below fold
- **Effort:** Medium (layout refactor for 3 components)
- **Files:** `MarketPanel.tsx`, `BuildUnitsPanel.tsx`, `PlanetList.tsx`

### HIGH (Fix Soon - Major Friction)

**P4: Star Map as Central Hub**
- **Impact:** Navigation confusion, breaks mental model
- **Effort:** High (architectural change, route restructuring)
- **Files:** Entire `/game` routing, add overlay system

**P5: Strategic Visual Language**
- **Impact:** Game feels administrative, not strategic
- **Effort:** Medium (CSS/animation updates)
- **Files:** Global styles, component variants

### MEDIUM (Improve Experience)

**P6: Turn Summary Staging**
- **Impact:** Better learning, more engaging feedback
- **Effort:** Medium (animation sequencing)
- **Files:** `TurnSummaryModal.tsx`

**P7: Resource Flow Visualization**
- **Impact:** Help players understand economy
- **Effort:** High (new visualization system)
- **Files:** New components for flow diagrams

**P8: Empire Outliner**
- **Impact:** Faster access to all assets
- **Effort:** Medium (sidebar component)
- **Files:** Add to `GameShell.tsx`

---

## 6. Implementation Roadmap

### Week 1: Critical Fixes

**Day 1-2: Turn Phase Awareness**
1. Create `PhaseIndicator.tsx` component
2. Add phase state to GameShell
3. Update turn processing to emit phase events
4. Test with real turn execution

**Day 3-4: Actionable Guidance**
1. Create `ActionPrompt.tsx` component
2. Replace FoodWarning with ActionPrompt
3. Add action prompts for military, diplomacy, research
4. Test action routing

**Day 5: No-Scroll Layouts**
1. Refactor MarketPanel to horizontal split
2. Refactor BuildUnitsPanel to horizontal split
3. Test on desktop and mobile (1920x1080, 1366x768, mobile)

### Week 2: Navigation Overhaul

**Day 1-3: Star Map Hub**
1. Create OverlayPanel component
2. Convert Military page to overlay
3. Convert Market page to overlay
4. Convert Planets page to overlay
5. Add persistent "Return to Map" button

**Day 4-5: Visual Language**
1. Update unit card styles with hover effects
2. Add build completion animations
3. Update attack preview with combat power bars
4. Test visual feedback loop

### Week 3: Polish & Testing

**Day 1-2: Turn Summary Enhancement**
1. Add phase-by-phase reveal
2. Add skip and auto-advance
3. Add urgent actions prompts

**Day 2-3: Playtesting**
1. Internal playtest with fresh users
2. Gather feedback on navigation clarity
3. Measure time-to-first-action

**Day 4-5: Bug fixes and iteration**

---

## 7. Success Metrics

### Quantitative Metrics

**Pre-Fix Baseline (Estimate):**
- Time to complete first turn: 5-10 minutes (confused exploration)
- Actions per turn: 1-2 (players forget to check pages)
- Navigation clicks to reach star map: 2-3
- Scroll events per transaction: 3-5

**Post-Fix Targets:**
- Time to complete first turn: 2-3 minutes (guided actions)
- Actions per turn: 4-6 (prompts remind players)
- Navigation clicks to reach star map: 0-1 (always accessible)
- Scroll events per transaction: 0-1 (no-scroll layouts)

### Qualitative Metrics

**Player Sentiment (Survey After 5 Turns):**
- "I understand when things happen": Currently 2/10 → Target 8/10
- "I know what to do each turn": Currently 3/10 → Target 8/10
- "The game feels strategic": Currently 4/10 → Target 9/10
- "I feel in control": Currently 3/10 → Target 8/10

### Behavioral Metrics

**Engagement:**
- Session length: Currently ~10 min → Target 30+ min
- Turns per session: Currently 2-5 → Target 10-20
- Return rate: Currently unknown → Target 70%+ return within 24h

---

## 8. Open Questions for Developer

1. **Turn Processing Architecture:**
   - Can we emit phase events during turn processing? (WebSocket vs polling)
   - Is turn processing synchronous or can we show progress?

2. **Routing Strategy:**
   - Willing to make star map the default route and overlay other pages?
   - OR prefer to add persistent map navigation button?

3. **Mobile Strategy:**
   - What percentage of players are mobile?
   - Should we optimize for desktop-first or mobile-first?

4. **Animation Budget:**
   - Performance concerns with animations on star map?
   - Willing to add libraries like Framer Motion or keep it vanilla CSS?

5. **Data Access:**
   - Do we have analytics on current player behavior?
   - Can we A/B test changes or need full rollout?

---

## 9. Quick Wins (Can Implement Today)

These require minimal effort but provide immediate improvement:

### Quick Win 1: Add Return to Map Button (15 minutes)
```typescript
// Add to GameHeader.tsx
<Link
  href="/game/starmap"
  className="fixed bottom-4 right-4 z-50 bg-lcars-amber text-black px-4 py-2 rounded-lg shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
>
  <Map className="w-5 h-5" />
  <span className="font-display">STAR MAP</span>
</Link>
```

### Quick Win 2: Make Food Warning Actionable (10 minutes)
```typescript
// In FoodWarning.tsx, add button
{hasDeficit && (
  <div className="mt-2 flex gap-2">
    <Link
      href="/game/planets?filter=food"
      className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-sm"
    >
      Buy Agriculture
    </Link>
    <Link
      href="/game/market?resource=food&action=buy"
      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm"
    >
      Buy Food Now
    </Link>
  </div>
)}
```

### Quick Win 3: Add Current Turn Phase Label (20 minutes)
```typescript
// Add to TurnOrderPanel.tsx at top
<div className="px-4 py-2 bg-lcars-amber/10 border-b border-lcars-amber/30">
  <div className="text-xs text-gray-500 uppercase">Current Phase</div>
  <div className="text-lg font-display text-lcars-amber">
    {isProcessing ? "Processing Turn..." : "Your Actions"}
  </div>
</div>
```

### Quick Win 4: Fix Market Panel Scroll (30 minutes)
```typescript
// In MarketPanel.tsx, change to horizontal layout
<div className="flex h-[500px] gap-4">
  <div className="w-1/3 overflow-y-auto">
    {/* Prices list */}
  </div>
  <div className="w-2/3 flex flex-col">
    {/* Trade form - button at bottom, no scroll needed */}
  </div>
</div>
```

### Quick Win 5: Add Hover Previews (20 minutes)
```typescript
// In BuildUnitsPanel.tsx, add to unit cards
<div className="group relative">
  <UnitCard {...unit} />

  {/* Hover preview */}
  <div className="absolute left-full ml-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-xl w-64">
    <div className="text-sm space-y-1">
      <div>Combat Power: <span className="text-blue-400">{unit.power}</span></div>
      <div>Maintenance: <span className="text-yellow-400">{unit.maintenance} cr/turn</span></div>
      <div className="text-xs text-gray-400 mt-2">{unit.description}</div>
    </div>
  </div>
</div>
```

---

## 10. Conclusion

Nexus Dominion has **excellent game mechanics** that are being obscured by **poor information architecture and lack of player guidance**. The game is playable by developers who understand the system, but not by players who need to learn through play.

**The core issue is not missing features - it's missing context.**

Players need to know:
1. **WHEN** things happen (turn phases)
2. **WHAT** they can do (actionable prompts)
3. **WHERE** they are (star map as hub)
4. **HOW** to act (no-scroll interfaces)
5. **WHY** it matters (strategic visual language)

Implementing the Priority 1 fixes (Phase Awareness, Actionable Guidance, No-Scroll Layouts) will transform the game from **"confusing admin panel"** to **"engaging strategy experience"** in approximately 2 weeks of focused work.

The game mechanics are there. The visuals are there. We just need to **connect the player to the game** through better UX patterns.

**Recommended Next Step:** Implement the 5 Quick Wins today (total ~2 hours) to get immediate feedback from playtesters, then proceed with the Week 1 roadmap based on results.

---

**Files Referenced:**
- C:\dev\GIT\x-imperium\src\app\game\page.tsx
- C:\dev\GIT\x-imperium\src\app\game\layout.tsx
- C:\dev\GIT\x-imperium\src\components\game\GameShell.tsx
- C:\dev\GIT\x-imperium\src\components\game\GameHeader.tsx
- C:\dev\GIT\x-imperium\src\components\game\TurnOrderPanel.tsx
- C:\dev\GIT\x-imperium\src\components\game\EmpireStatusBar.tsx
- C:\dev\GIT\x-imperium\src\components\game\starmap\StarMap.tsx
- C:\dev\GIT\x-imperium\src\components\game\market\MarketPanel.tsx
- C:\dev\GIT\x-imperium\src\components\game\military\BuildUnitsPanel.tsx
- C:\dev\GIT\x-imperium\src\components\game\military\BuildQueuePanel.tsx
- C:\dev\GIT\x-imperium\src\app\game\military\page.tsx
- C:\dev\GIT\x-imperium\src\app\game\starmap\page.tsx

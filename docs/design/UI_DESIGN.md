# X-Imperium: UI Design Guide

## Design Philosophy

X-Imperium's interface draws inspiration from **Star Trek's LCARS** (Library Computer Access/Retrieval System) - the iconic futuristic UI seen throughout the franchise. This creates an immersive "command center" experience where players feel like they're running a galactic empire from a starship bridge.

### Key Principles

1. **Glass Panel Aesthetic**: Translucent panels over space backgrounds
2. **Curved Corners**: Rounded rectangles, pill shapes for buttons
3. **Color-Coded Information**: Different colors for different data types
4. **Ambient Atmosphere**: Space backgrounds, subtle animations
5. **Information Density**: Show critical data without overwhelming

---

## Color Palette

### Primary Colors (LCARS-inspired)

| Color | Hex | Usage |
|-------|-----|-------|
| **Amber/Gold** | `#FF9900` | Primary interactive elements, headers |
| **Lavender** | `#CC99FF` | Secondary panels, navigation |
| **Salmon** | `#FF9999` | Warnings, enemy indicators |
| **Peach** | `#FFCC99` | Data readouts, neutral info |
| **Pale Blue** | `#99CCFF` | Friendly indicators, alliance |
| **Mint** | `#99FFCC` | Success, positive events |

### Backgrounds

| Element | Color |
|---------|-------|
| **Space background** | Dark navy/black with star field |
| **Panel background** | `rgba(0, 0, 0, 0.6)` - translucent black |
| **Glass effect** | `rgba(255, 255, 255, 0.05)` with blur |

### Text Colors

| Element | Color |
|---------|-------|
| **Primary text** | `#FFFFFF` (white) |
| **Secondary text** | `#AAAAAA` (gray) |
| **Highlight text** | `#FF9900` (amber) |
| **Alert text** | `#FF6666` (red) |
| **Success text** | `#66FF66` (green) |

---

## Typography

### Font Family
```css
font-family: 'Orbitron', 'Exo 2', 'Roboto Mono', monospace;
```

**Primary**: Orbitron (futuristic, geometric)
**Fallback**: Exo 2 or Roboto Mono

### Font Sizes

| Element | Size | Weight |
|---------|------|--------|
| **Page title** | 2rem | Bold |
| **Section header** | 1.5rem | Semi-bold |
| **Panel title** | 1.25rem | Medium |
| **Body text** | 1rem | Normal |
| **Data values** | 0.875rem | Medium |
| **Labels** | 0.75rem | Normal |

---

## Panel Design

### Standard Panel
```
┌──────────────────────────────────────┐
│  ▌ PANEL TITLE                   ▐  │
├──────────────────────────────────────┤
│                                      │
│        Content Area                  │
│                                      │
│                                      │
└──────────────────────────────────────┘
```

**CSS Properties**:
- `border-radius: 12px` (outer)
- `backdrop-filter: blur(10px)`
- `background: rgba(0, 0, 0, 0.6)`
- `border: 1px solid rgba(255, 153, 0, 0.3)`

### Panel Header Bar
- Left side: Colored accent bar (4px wide)
- Title: ALL CAPS, letter-spacing: 2px
- Right side: Optional status indicators

### Glass Effect
```css
.glass-panel {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.05) 100%
  );
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

---

## Buttons

### Primary Button (LCARS Pill)
```
╭──────────────────╮
│   ACTION TEXT    │
╰──────────────────╯
```

**Properties**:
- `border-radius: 9999px` (full pill)
- `background: #FF9900` (amber)
- `color: #000000` (black text)
- `padding: 12px 32px`
- `text-transform: uppercase`
- `font-weight: 600`

**Hover**: Lighten 10%
**Active**: Darken 10%
**Disabled**: 50% opacity

### Secondary Button
- Transparent background
- Amber border
- Amber text

### Danger Button
- Red/salmon background
- White text

---

## Navigation

### Sidebar Navigation (LCARS-style)
```
╭───────────────────╮
│  ████ DASHBOARD   │
│  ████ PLANETS     │
│  ████ MILITARY    │
│  ████ RESEARCH    │
│  ████ DIPLOMACY   │
│  ████ MARKET      │
│  ████ COVERT      │
│  ████ MESSAGES    │
╰───────────────────╯
```

**Design**:
- Left colored bar indicates active state
- Each nav item has unique accent color
- Icons optional (keep minimal)

### Tab Navigation
Horizontal tabs with LCARS-style:
```
╭────────╮ ╭────────╮ ╭────────╮
│ TAB 1  │ │ TAB 2  │ │ TAB 3  │
╯        ╰─╯        ╰─╯        ╰─────────
```

---

## Data Display

### Resource Bar
```
┌─ CREDITS ─────────────────────────────┐
│ ████████████░░░░░░░░   1,234,567 cr  │
└───────────────────────────────────────┘
```

- Color fill indicates relative amount
- Numeric value right-aligned
- Trend indicator (↑↓) optional

### Statistics Table
```
┌─────────────────────────────────────────┐
│ EMPIRE STATUS                           │
├─────────────────────────────────────────┤
│ Planets         │                    12 │
│ Population      │               456,789 │
│ Military        │                 5,432 │
│ Networth        │             1,234,567 │
└─────────────────────────────────────────┘
```

- Labels left-aligned
- Values right-aligned
- Alternating row backgrounds for readability

### Progress Indicators
```
Research Progress: [████████░░░░░░░░░░░░] 42%
```

---

## Core Screens

### 1. Dashboard / Status
**Layout**: 2-3 column grid

```
┌────────────────────────────────────────────────────────┐
│ ▌ EMPIRE: GALACTIC DOMINION                         ▐ │
├────────────────┬───────────────────┬───────────────────┤
│                │                   │                   │
│   RESOURCES    │   MILITARY        │   EVENTS          │
│   ████ Food    │   5000 Soldiers   │   • Bot attacked  │
│   ████ Ore     │   1200 Fighters   │   • Treaty offer  │
│   ████ Petro   │    800 Stations   │   • Market shift  │
│   ████ Credits │                   │                   │
│                │                   │                   │
├────────────────┴───────────────────┴───────────────────┤
│                    QUICK ACTIONS                       │
│  [End Turn]  [Buy Planets]  [Train Army]  [Research]   │
└────────────────────────────────────────────────────────┘
```

### 2. Planet Management
**Layout**: List view with filters

```
┌────────────────────────────────────────────────────────┐
│ ▌ PLANETS                            [BUY] [RELEASE] ▐│
├────────────────────────────────────────────────────────┤
│ TYPE        │ COUNT │ PRODUCTION │ MAINTENANCE        │
├────────────────────────────────────────────────────────┤
│ █ Food      │     4 │   +640/t   │   -672 cr         │
│ █ Ore       │     3 │   +336/t   │   -504 cr         │
│ █ Tourism   │     2 │ +16,000 cr │   -336 cr         │
│ ...         │       │            │                    │
└────────────────────────────────────────────────────────┘
```

### 3. Military Command
**Layout**: Unit grid + action panel

```
┌──────────────────────────────────────┬─────────────────┐
│ ▌ MILITARY FORCES                   ▐│  ACTIONS        │
├──────────────────────────────────────┤                 │
│ UNIT          │ COUNT │ EFF │ MAINT │  [INVASION]     │
├──────────────────────────────────────┤                 │
│ Soldiers      │ 5,000 │ 85% │  120k │  [GUERILLA]     │
│ Fighters      │ 1,200 │ 85% │   86k │                 │
│ Stations      │   800 │ 85% │   53k │  [TRAIN UNITS]  │
│ ...           │       │     │       │                 │
├──────────────────────────────────────┤  Target:        │
│ EFFECTIVENESS: ████████░░ 85%       │  [Select ▼]     │
└──────────────────────────────────────┴─────────────────┘
```

### 4. Research Tree
**Layout**: Visual node tree

```
┌────────────────────────────────────────────────────────┐
│ ▌ RESEARCH                    [Research Points: 450] ▐│
├────────────────────────────────────────────────────────┤
│                                                        │
│     ┌───────┐                                          │
│     │FUND 1 │ ← You are here                           │
│     └───┬───┘                                          │
│         │                                              │
│    ┌────┴────┐                                         │
│    ↓         ↓                                         │
│ ┌─────┐  ┌─────┐                                       │
│ │SOL 1│  │FTR 1│   Locked (need Fund 1)                │
│ └─────┘  └─────┘                                       │
│                                                        │
│ Progress: [████████░░░░░░░░░░░░] 42% (200/480 RP)     │
│                                       [BOOST] [-10 RP]│
└────────────────────────────────────────────────────────┘
```

### 5. Galaxy Map
**Layout**: Canvas/WebGL visualization

```
┌────────────────────────────────────────────────────────┐
│ ▌ GALAXY MAP                        [Zoom +] [Zoom -]▐│
├────────────────────────────────────────────────────────┤
│                                                        │
│           *                                            │
│       ●              *       ○  (you)                  │
│    *         ◉                          *              │
│                  ●        *                            │
│       ○                          ●                     │
│                *                                       │
│                                                        │
│ ● Enemy (Warlord)  ○ Ally  ◉ Neutral  * Star          │
│ Selected: "Iron Fist Empire" - Rank #3 - [ATTACK]     │
└────────────────────────────────────────────────────────┘
```

### 6. Messages / Events
**Layout**: Timeline list

```
┌────────────────────────────────────────────────────────┐
│ ▌ MESSAGES                         [ALL] [UNREAD: 3] ▐│
├────────────────────────────────────────────────────────┤
│ ● Turn 45 | Admiral Zharkov                           │
│   "Your pathetic defenses won't save you. Surrender   │
│    5000 credits or face annihilation."                │
│                            [RESPOND] [IGNORE] [BLOCK] │
├────────────────────────────────────────────────────────┤
│ ○ Turn 44 | Ambassador Velara                         │
│   "Greetings! Our empires could benefit from mutual   │
│    cooperation. Shall we discuss a defensive pact?"   │
│                            [ACCEPT] [DECLINE] [REPLY] │
├────────────────────────────────────────────────────────┤
│ ○ Turn 43 | SYSTEM                                    │
│   "Pirate raid intercepted! 50 soldiers lost."        │
└────────────────────────────────────────────────────────┘
```

---

## Animations

### Subtle Enhancements
- **Panel appear**: Fade in + slight scale (0.3s ease)
- **Button hover**: Gentle glow effect
- **Number changes**: Animated counting
- **Alerts**: Subtle pulse animation
- **Turn transition**: Brief flash overlay

### Space Background
- Slowly drifting star field (parallax)
- Occasional shooting star
- Distant nebula glow

---

## Responsive Design

### Breakpoints
| Breakpoint | Layout |
|------------|--------|
| Desktop (1200px+) | Full 3-column |
| Tablet (768px-1199px) | 2-column, collapsible sidebar |
| Mobile (< 768px) | Single column, bottom nav |

### Mobile Considerations
- Stack panels vertically
- Bottom navigation bar
- Larger touch targets
- Simplified galaxy map

---

## Implementation Notes

### Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS (custom LCARS theme)
- **Components**: shadcn/ui (customized)
- **Galaxy Map**: react-konva or Three.js
- **Animations**: Framer Motion

### Tailwind Configuration
```javascript
// tailwind.config.js extensions
theme: {
  extend: {
    colors: {
      lcars: {
        amber: '#FF9900',
        lavender: '#CC99FF',
        salmon: '#FF9999',
        peach: '#FFCC99',
        blue: '#99CCFF',
        mint: '#99FFCC',
      }
    },
    fontFamily: {
      'display': ['Orbitron', 'sans-serif'],
      'body': ['Exo 2', 'sans-serif'],
    },
    borderRadius: {
      'lcars': '12px',
      'lcars-pill': '9999px',
    }
  }
}
```

---

## Accessibility

- High contrast mode option
- Screen reader labels for all interactive elements
- Keyboard navigation support
- Reduced motion option (disable animations)
- Color-blind friendly indicators (not color-only)

---

## Sound Design (Stretch Goal)

Optional audio feedback:
- UI interaction sounds (clicks, hovers)
- Turn end chime
- Alert sounds (attack, message)
- Ambient space atmosphere
- Victory/defeat fanfares

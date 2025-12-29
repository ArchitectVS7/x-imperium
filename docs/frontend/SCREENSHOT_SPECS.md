# Screenshot Specifications

This document defines the screenshot requirements for Nexus Dominion marketing, documentation, and store listings.

## Overview

Screenshots serve multiple purposes:
1. **Marketing** - App store/landing page hero images
2. **Documentation** - Feature explanations in docs
3. **Tutorials** - Step-by-step visual guides

---

## Required Screenshots

### 1. Hero / Marketing Screenshots

| Name | Description | Resolution | Format | Location |
|------|-------------|------------|--------|----------|
| `hero-dashboard.png` | Main game view with starmap, sidebar, status bar | 1920×1080 | PNG | `/public/screenshots/marketing/` |
| `hero-combat.png` | Combat interface with battle preview | 1920×1080 | PNG | `/public/screenshots/marketing/` |
| `hero-starmap.png` | Galaxy map with empire nodes and connections | 1920×1080 | PNG | `/public/screenshots/marketing/` |
| `hero-mobile.png` | Mobile responsive view | 390×844 | PNG | `/public/screenshots/marketing/` |

### 2. Feature Screenshots

| Name | Description | Resolution | Format | Location |
|------|-------------|------------|--------|----------|
| `feature-turn-panel.png` | TurnOrderPanel sidebar closeup | 800×600 | PNG | `/public/screenshots/features/` |
| `feature-turn-summary.png` | TurnSummaryModal after turn processing | 800×600 | PNG | `/public/screenshots/features/` |
| `feature-status-bar.png` | EmpireStatusBar at bottom of screen | 1200×200 | PNG | `/public/screenshots/features/` |
| `feature-slideout.png` | SlideOutPanel showing resource details | 800×600 | PNG | `/public/screenshots/features/` |
| `feature-military.png` | Military/Forces page with build queue | 1200×800 | PNG | `/public/screenshots/features/` |
| `feature-diplomacy.png` | Diplomacy page with treaty options | 1200×800 | PNG | `/public/screenshots/features/` |
| `feature-market.png` | Market/Exchange trading interface | 1200×800 | PNG | `/public/screenshots/features/` |
| `feature-covert.png` | Intel Ops (covert) operations panel | 1200×800 | PNG | `/public/screenshots/features/` |

### 3. Tutorial Screenshots

| Name | Description | Resolution | Format | Location |
|------|-------------|------------|--------|----------|
| `tutorial-01-welcome.png` | New game screen with empire name input | 1200×800 | PNG | `/public/screenshots/tutorial/` |
| `tutorial-02-dashboard.png` | Initial dashboard view with onboarding hint | 1200×800 | PNG | `/public/screenshots/tutorial/` |
| `tutorial-03-resources.png` | Resource panel highlighted | 1200×800 | PNG | `/public/screenshots/tutorial/` |
| `tutorial-04-military.png` | Build units interface | 1200×800 | PNG | `/public/screenshots/tutorial/` |
| `tutorial-05-sectors.png` | Buy sectors interface | 1200×800 | PNG | `/public/screenshots/tutorial/` |
| `tutorial-06-end-turn.png` | End turn button highlighted | 1200×800 | PNG | `/public/screenshots/tutorial/` |
| `tutorial-07-summary.png` | Turn summary modal | 1200×800 | PNG | `/public/screenshots/tutorial/` |

---

## Technical Requirements

### Resolution Guidelines

| Use Case | Recommended Resolution | Aspect Ratio |
|----------|----------------------|--------------|
| Desktop Hero | 1920×1080 | 16:9 |
| Desktop Feature | 1200×800 | 3:2 |
| Mobile | 390×844 | ~9:19 |
| Thumbnail | 400×300 | 4:3 |
| Social Media | 1200×630 | ~1.9:1 |

### File Format

- **PNG** for all screenshots (lossless, supports transparency)
- **WebP** alternatives can be generated for web optimization
- Max file size: 500KB per image (compress if needed)

### Quality Standards

1. **Game State**: Show realistic gameplay (not placeholder data)
   - Turn 15-30 for early game shots
   - Turn 100+ for mid-game features
   - Positive resource values (not bankrupt)

2. **UI State**: Clean, focused views
   - No debug overlays
   - No browser dev tools visible
   - Proper cursor state (no loading spinners unless intentional)

3. **Consistency**:
   - Same empire name across screenshots
   - Consistent color theme (LCARS amber/blue)
   - Dark mode only (no light mode)

---

## Directory Structure

```
public/
└── screenshots/
    ├── marketing/
    │   ├── hero-dashboard.png
    │   ├── hero-combat.png
    │   ├── hero-starmap.png
    │   └── hero-mobile.png
    ├── features/
    │   ├── feature-turn-panel.png
    │   ├── feature-turn-summary.png
    │   └── ...
    └── tutorial/
        ├── tutorial-01-welcome.png
        └── ...
```

---

## Capture Instructions

### Browser Setup

1. Use Chrome or Firefox
2. Set viewport to exact resolution (use DevTools → Device toolbar)
3. Disable browser extensions that might affect UI
4. Use incognito mode to avoid cache issues

### Game Setup

1. Start fresh game with empire name: "Stellar Command"
2. Play through first 15-20 turns naturally
3. Ensure positive resource balance
4. Build some military units for diversity

### Capture Process

1. Navigate to target screen
2. Wait for all animations to complete
3. Use browser screenshot (Cmd+Shift+4 on Mac, or DevTools capture)
4. Verify dimensions match spec
5. Optimize file size if >500KB

### Post-Processing

- Crop to exact dimensions if needed
- Do NOT add watermarks (these are source assets)
- Do NOT add fake UI elements
- Compress with tools like TinyPNG if needed

---

## Usage Notes

### README.md

```markdown
![Nexus Dominion Dashboard](/screenshots/marketing/hero-dashboard.png)
```

### Landing Page

Hero images should be served from CDN with proper caching headers.
Consider generating WebP variants for modern browsers.

### Documentation

Feature screenshots should be referenced relative to docs location:
```markdown
![Turn Order Panel](../public/screenshots/features/feature-turn-panel.png)
```

---

## Checklist

Before release, ensure all screenshots are:

- [ ] Captured at correct resolution
- [ ] Named according to spec
- [ ] Placed in correct directory
- [ ] File size under 500KB
- [ ] Showing realistic game state
- [ ] Free of debug artifacts
- [ ] Consistent with game's visual identity

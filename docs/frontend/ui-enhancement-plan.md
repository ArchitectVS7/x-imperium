# X-Imperium UI Enhancement Implementation Plan

> **Version:** 1.0
> **Created:** 2024-12-28
> **Status:** Planning
> **Goal:** Add visual sizzle and audio atmosphere to X-Imperium while preserving the LCARS aesthetic

---

## Executive Summary

This plan outlines a phased approach to enhancing X-Imperium's UI with animations, sound effects, and ambient audio. Each phase is designed for **low effort, high impact** using libraries that integrate seamlessly with our Next.js/React stack.

### Technology Stack for Enhancements

| Library | Purpose | License | Size |
|---------|---------|---------|------|
| **GSAP** (GreenSock) | Animations & transitions | Free for non-commercial | ~60KB |
| **Howler.js** | Audio playback & management | MIT | ~10KB |
| **NASA APIs** | Space imagery (backgrounds) | Public Domain | N/A |

---

## Phase 1: Animated Resource Counters

**Priority:** High
**Effort:** Low
**Impact:** High

### Objective
Make resource changes feel impactful by animating number transitions when values change (credits earned, spent, resources consumed).

### Implementation

#### 1.1 Install GSAP
```bash
npm install gsap
```

#### 1.2 Create Animated Counter Component
**File:** `/src/components/ui/AnimatedCounter.tsx`

```tsx
"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  formatFn?: (val: number) => string;
}

export function AnimatedCounter({
  value,
  duration = 0.8,
  className = "",
  formatFn = (val) => val.toLocaleString(),
}: AnimatedCounterProps) {
  const counterRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    if (counterRef.current && valueRef.current !== value) {
      const obj = { val: valueRef.current };
      gsap.to(obj, {
        val: value,
        duration,
        ease: "power2.out",
        onUpdate: () => {
          if (counterRef.current) {
            counterRef.current.textContent = formatFn(Math.round(obj.val));
          }
        },
      });
      valueRef.current = value;
    }
  }, [value, duration, formatFn]);

  return (
    <span ref={counterRef} className={className}>
      {formatFn(value)}
    </span>
  );
}
```

#### 1.3 Create Resource Delta Indicator
**File:** `/src/components/ui/ResourceDelta.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import gsap from "gsap";

interface ResourceDeltaProps {
  delta: number;
  show: boolean;
}

export function ResourceDelta({ delta, show }: ResourceDeltaProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show && delta !== 0) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [show, delta]);

  if (!visible || delta === 0) return null;

  const isPositive = delta > 0;
  const colorClass = isPositive ? "text-green-400" : "text-red-400";
  const prefix = isPositive ? "+" : "";

  return (
    <span className={`ml-2 text-sm ${colorClass} animate-fade-out`}>
      {prefix}{delta.toLocaleString()}
    </span>
  );
}
```

#### 1.4 Update ResourcePanel
**File:** `/src/components/game/ResourcePanel.tsx`

Replace static number displays with `<AnimatedCounter>`:

```tsx
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

// Before:
<span className="font-mono text-lcars-amber">
  {credits.toLocaleString()}
</span>

// After:
<AnimatedCounter
  value={credits}
  className="font-mono text-lcars-amber"
/>
```

#### 1.5 Add CSS Animation
**File:** `/src/app/globals.css`

```css
@keyframes fade-out {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-10px); }
}

.animate-fade-out {
  animation: fade-out 2s ease-out forwards;
}
```

### Components to Update
- [ ] `ResourcePanel.tsx` - Credits, Food, Ore, Petroleum, Research Points
- [ ] `NetworthPanel.tsx` - Networth display
- [ ] `PopulationPanel.tsx` - Population count
- [ ] `MilitaryPanel.tsx` - Unit counts
- [ ] `TurnCounter.tsx` - Turn number

### Acceptance Criteria
- [ ] Numbers animate smoothly when values change
- [ ] Animation duration is 0.8 seconds
- [ ] No visual jank or stuttering
- [ ] Works on page navigation (initial load shows final value, no animation)

---

## Phase 2: Button Hover & Click Sounds

**Priority:** High
**Effort:** Low
**Impact:** High

### Objective
Add tactile feedback to UI interactions with subtle LCARS-style audio cues.

### Implementation

#### 2.1 Install Howler.js
```bash
npm install howler
npm install --save-dev @types/howler
```

#### 2.2 Create Audio Manager
**File:** `/src/lib/audio/audio-manager.ts`

```ts
import { Howl, Howler } from "howler";

export type SoundEffect =
  | "click"
  | "hover"
  | "success"
  | "error"
  | "alert"
  | "turnEnd"
  | "combat"
  | "build";

const SOUNDS: Record<SoundEffect, Howl> = {
  click: new Howl({ src: ["/audio/sfx/click.mp3"], volume: 0.3 }),
  hover: new Howl({ src: ["/audio/sfx/hover.mp3"], volume: 0.15 }),
  success: new Howl({ src: ["/audio/sfx/success.mp3"], volume: 0.4 }),
  error: new Howl({ src: ["/audio/sfx/error.mp3"], volume: 0.4 }),
  alert: new Howl({ src: ["/audio/sfx/alert.mp3"], volume: 0.5 }),
  turnEnd: new Howl({ src: ["/audio/sfx/turn-end.mp3"], volume: 0.4 }),
  combat: new Howl({ src: ["/audio/sfx/combat.mp3"], volume: 0.5 }),
  build: new Howl({ src: ["/audio/sfx/build.mp3"], volume: 0.3 }),
};

class AudioManager {
  private enabled = true;
  private volume = 0.5;

  play(sound: SoundEffect): void {
    if (this.enabled && SOUNDS[sound]) {
      SOUNDS[sound].play();
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    Howler.mute(!enabled);
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.volume);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getVolume(): number {
    return this.volume;
  }
}

export const audioManager = new AudioManager();
```

#### 2.3 Create Audio Context Provider
**File:** `/src/components/providers/AudioProvider.tsx`

```tsx
"use client";

import { createContext, useContext, useCallback, ReactNode } from "react";
import { audioManager, SoundEffect } from "@/lib/audio/audio-manager";

interface AudioContextType {
  play: (sound: SoundEffect) => void;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const play = useCallback((sound: SoundEffect) => {
    audioManager.play(sound);
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    audioManager.setEnabled(enabled);
  }, []);

  const setVolume = useCallback((volume: number) => {
    audioManager.setVolume(volume);
  }, []);

  return (
    <AudioContext.Provider value={{ play, setEnabled, setVolume }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used within AudioProvider");
  }
  return context;
}
```

#### 2.4 Create Sound-Enabled Button Component
**File:** `/src/components/ui/LCARSButton.tsx`

```tsx
"use client";

import { useAudio } from "@/components/providers/AudioProvider";
import { ButtonHTMLAttributes } from "react";

interface LCARSButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  soundOnClick?: boolean;
  soundOnHover?: boolean;
}

export function LCARSButton({
  variant = "primary",
  soundOnClick = true,
  soundOnHover = true,
  className = "",
  onClick,
  onMouseEnter,
  children,
  disabled,
  ...props
}: LCARSButtonProps) {
  const { play } = useAudio();

  const variantClasses = {
    primary: "bg-lcars-amber text-gray-950",
    secondary: "bg-lcars-lavender text-gray-950",
    danger: "bg-lcars-salmon text-gray-950",
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && soundOnClick) {
      play("click");
    }
    onClick?.(e);
  };

  const handleHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && soundOnHover) {
      play("hover");
    }
    onMouseEnter?.(e);
  };

  return (
    <button
      className={`
        px-6 py-2 font-semibold rounded-lcars-pill
        hover:brightness-110 transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${className}
      `}
      onClick={handleClick}
      onMouseEnter={handleHover}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
```

#### 2.5 Placeholder Audio Files
Create directory structure and add placeholder sounds:

```
/public/audio/
├── sfx/
│   ├── click.mp3      # Short LCARS chirp
│   ├── hover.mp3      # Subtle blip
│   ├── success.mp3    # Positive confirmation
│   ├── error.mp3      # Negative buzz
│   ├── alert.mp3      # Attention-grabbing beep
│   ├── turn-end.mp3   # Turn completion chime
│   ├── combat.mp3     # Combat initiated sound
│   └── build.mp3      # Construction queued
└── ambient/
    └── (Phase 4)
```

**Placeholder sources (free, CC0/Public Domain):**
- [Freesound.org](https://freesound.org) - Search "sci-fi beep", "UI click"
- [Pixabay SFX](https://pixabay.com/sound-effects/) - "Interface", "Notification"
- [Kenney.nl](https://kenney.nl/assets) - UI Audio pack

### Components to Update
- [ ] `EndTurnButton.tsx` - Primary action, play `turnEnd` on success
- [ ] All `.lcars-button` instances - Replace with `<LCARSButton>`
- [ ] `BuildUnitsPanel.tsx` - Play `build` on queue
- [ ] `AttackInterface.tsx` - Play `combat` on launch

### Audio Settings UI (Optional Enhancement)
- [ ] Add volume slider to settings
- [ ] Add mute toggle
- [ ] Persist preferences in localStorage

### Acceptance Criteria
- [ ] Buttons play click sound on press
- [ ] Buttons play subtle hover sound on mouseover
- [ ] Sounds are disabled when buttons are disabled
- [ ] Volume is comfortable (not jarring)
- [ ] Audio can be muted

---

## Phase 3: Panel Slide Transitions

**Priority:** Medium
**Effort:** Medium
**Impact:** High

### Objective
Add smooth entrance animations to panels when navigating between game sections.

### Implementation

#### 3.1 Create Animated Panel Wrapper
**File:** `/src/components/ui/AnimatedPanel.tsx`

```tsx
"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";

interface AnimatedPanelProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "left" | "right" | "up" | "down";
}

export function AnimatedPanel({
  children,
  className = "",
  delay = 0,
  direction = "left",
}: AnimatedPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (panelRef.current) {
      const directions = {
        left: { x: -30, y: 0 },
        right: { x: 30, y: 0 },
        up: { x: 0, y: -30 },
        down: { x: 0, y: 30 },
      };

      gsap.fromTo(
        panelRef.current,
        {
          opacity: 0,
          ...directions[direction],
        },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.5,
          delay,
          ease: "power2.out",
        }
      );
    }
  }, [delay, direction]);

  return (
    <div ref={panelRef} className={`lcars-panel ${className}`}>
      {children}
    </div>
  );
}
```

#### 3.2 Create Staggered Panel Group
**File:** `/src/components/ui/PanelGroup.tsx`

```tsx
"use client";

import { useRef, useEffect, Children, cloneElement, isValidElement } from "react";
import gsap from "gsap";

interface PanelGroupProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

export function PanelGroup({
  children,
  staggerDelay = 0.1,
  className = "",
}: PanelGroupProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const panels = containerRef.current.querySelectorAll(".lcars-panel");
      gsap.fromTo(
        panels,
        { opacity: 0, x: -20 },
        {
          opacity: 1,
          x: 0,
          duration: 0.4,
          stagger: staggerDelay,
          ease: "power2.out",
        }
      );
    }
  }, [staggerDelay]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
```

#### 3.3 Page Transition Animation
**File:** `/src/components/ui/PageTransition.tsx`

```tsx
"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
```

### Pages to Update
- [ ] `/app/game/page.tsx` - Dashboard panels
- [ ] `/app/game/military/page.tsx` - Military panels
- [ ] `/app/game/research/page.tsx` - Research panels
- [ ] `/app/game/diplomacy/page.tsx` - Diplomacy panels
- [ ] `/app/game/market/page.tsx` - Market panels
- [ ] `/app/game/covert/page.tsx` - Covert ops panels
- [ ] `/app/game/combat/page.tsx` - Combat panels

### Acceptance Criteria
- [ ] Panels slide in smoothly on page load
- [ ] Stagger creates visual hierarchy
- [ ] No layout shift during animation
- [ ] Animation completes within 500ms

---

## Phase 4: Ambient Starmap Music

**Priority:** Medium
**Effort:** Low
**Impact:** Medium

### Objective
Add atmospheric ambient audio that plays during gameplay, with controls for volume and mute.

### Implementation

#### 4.1 Add Ambient Audio to Audio Manager
**File:** `/src/lib/audio/audio-manager.ts` (update)

```ts
// Add to existing file

const AMBIENT_TRACKS = {
  starmap: new Howl({
    src: ["/audio/ambient/space-ambient.mp3"],
    volume: 0.15,
    loop: true,
  }),
  combat: new Howl({
    src: ["/audio/ambient/tension.mp3"],
    volume: 0.2,
    loop: true,
  }),
};

// Add to AudioManager class:
class AudioManager {
  private currentAmbient: keyof typeof AMBIENT_TRACKS | null = null;

  playAmbient(track: keyof typeof AMBIENT_TRACKS): void {
    if (!this.enabled) return;

    // Fade out current
    if (this.currentAmbient && this.currentAmbient !== track) {
      AMBIENT_TRACKS[this.currentAmbient].fade(
        AMBIENT_TRACKS[this.currentAmbient].volume(),
        0,
        1000
      );
      AMBIENT_TRACKS[this.currentAmbient].stop();
    }

    // Fade in new
    this.currentAmbient = track;
    AMBIENT_TRACKS[track].volume(0);
    AMBIENT_TRACKS[track].play();
    AMBIENT_TRACKS[track].fade(0, 0.15, 2000);
  }

  stopAmbient(): void {
    if (this.currentAmbient) {
      AMBIENT_TRACKS[this.currentAmbient].fade(
        AMBIENT_TRACKS[this.currentAmbient].volume(),
        0,
        1000
      );
      setTimeout(() => {
        if (this.currentAmbient) {
          AMBIENT_TRACKS[this.currentAmbient].stop();
          this.currentAmbient = null;
        }
      }, 1000);
    }
  }
}
```

#### 4.2 Add Ambient Audio Files
```
/public/audio/ambient/
├── space-ambient.mp3    # Calm space drone (2-3 min loop)
└── tension.mp3          # Combat tension music (2-3 min loop)
```

**Placeholder sources (royalty-free):**
- [Pixabay Music](https://pixabay.com/music/) - Search "space ambient"
- [Free Music Archive](https://freemusicarchive.org/) - CC licensed ambient
- [Incompetech](https://incompetech.com/) - Kevin MacLeod (CC-BY)

#### 4.3 Auto-play on Starmap
**File:** `/src/app/game/starmap/page.tsx` (update)

```tsx
"use client";

import { useEffect } from "react";
import { useAudio } from "@/components/providers/AudioProvider";

export default function StarmapPage() {
  const { playAmbient, stopAmbient } = useAudio();

  useEffect(() => {
    playAmbient("starmap");
    return () => stopAmbient();
  }, [playAmbient, stopAmbient]);

  // ... rest of component
}
```

### Acceptance Criteria
- [ ] Ambient music fades in on starmap page
- [ ] Music fades out when leaving starmap
- [ ] Volume respects global settings
- [ ] Smooth crossfade between tracks

---

## Phase 5: Pulsing Alert Indicators

**Priority:** Medium
**Effort:** Low
**Impact:** Medium

### Objective
Add subtle pulsing glow effects to draw attention to important UI elements.

### Implementation

#### 5.1 CSS Pulse Animations
**File:** `/src/app/globals.css` (update)

```css
/* LCARS Pulse Animations */
@keyframes lcars-pulse {
  0%, 100% {
    box-shadow: 0 0 4px rgba(255, 153, 0, 0.3);
    border-color: rgba(255, 153, 0, 0.6);
  }
  50% {
    box-shadow: 0 0 16px rgba(255, 153, 0, 0.7);
    border-color: rgba(255, 153, 0, 1);
  }
}

@keyframes lcars-pulse-alert {
  0%, 100% {
    box-shadow: 0 0 4px rgba(255, 153, 153, 0.3);
    border-color: rgba(255, 153, 153, 0.6);
  }
  50% {
    box-shadow: 0 0 16px rgba(255, 153, 153, 0.8);
    border-color: rgba(255, 153, 153, 1);
  }
}

@keyframes lcars-pulse-success {
  0%, 100% {
    box-shadow: 0 0 4px rgba(153, 255, 204, 0.3);
  }
  50% {
    box-shadow: 0 0 12px rgba(153, 255, 204, 0.6);
  }
}

.lcars-pulse {
  animation: lcars-pulse 2s ease-in-out infinite;
}

.lcars-pulse-alert {
  animation: lcars-pulse-alert 1.5s ease-in-out infinite;
}

.lcars-pulse-success {
  animation: lcars-pulse-success 2s ease-in-out infinite;
}

/* Glow effect for active elements */
.lcars-glow {
  box-shadow: 0 0 8px rgba(255, 153, 0, 0.5);
}
```

#### 5.2 Alert Badge Component
**File:** `/src/components/ui/AlertBadge.tsx`

```tsx
interface AlertBadgeProps {
  count?: number;
  variant?: "default" | "alert" | "success";
  pulse?: boolean;
}

export function AlertBadge({
  count,
  variant = "default",
  pulse = true,
}: AlertBadgeProps) {
  const variantClasses = {
    default: "bg-lcars-amber",
    alert: "bg-lcars-salmon",
    success: "bg-lcars-mint",
  };

  const pulseClasses = {
    default: "lcars-pulse",
    alert: "lcars-pulse-alert",
    success: "lcars-pulse-success",
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center
        min-w-[1.5rem] h-6 px-2 rounded-full
        text-xs font-bold text-gray-950
        ${variantClasses[variant]}
        ${pulse ? pulseClasses[variant] : ""}
      `}
    >
      {count ?? "!"}
    </span>
  );
}
```

### Use Cases
- [ ] Unread messages indicator
- [ ] Combat alerts
- [ ] Build queue completion
- [ ] Treaty proposals
- [ ] Low resource warnings

### Acceptance Criteria
- [ ] Alerts pulse with subtle glow
- [ ] Different colors for different severity
- [ ] Animation is smooth, not distracting
- [ ] Pulse can be disabled per-instance

---

## Phase 6: NASA Nebula Backgrounds

**Priority:** Low
**Effort:** Low
**Impact:** Medium

### Objective
Use NASA public domain imagery for atmospheric background enhancements.

### Implementation

#### 6.1 Download NASA Assets
Source: [NASA Image Gallery](https://images.nasa.gov/)

Recommended images (Public Domain):
- Carina Nebula (JWST)
- Pillars of Creation
- Deep Field imagery
- Galaxy clusters

#### 6.2 Background Component
**File:** `/src/components/ui/SpaceBackground.tsx`

```tsx
interface SpaceBackgroundProps {
  variant?: "nebula" | "stars" | "deep-field";
  opacity?: number;
}

export function SpaceBackground({
  variant = "stars",
  opacity = 0.3,
}: SpaceBackgroundProps) {
  const backgrounds = {
    nebula: "/images/backgrounds/nebula.jpg",
    stars: "/images/backgrounds/starfield.jpg",
    "deep-field": "/images/backgrounds/deep-field.jpg",
  };

  return (
    <div
      className="fixed inset-0 -z-10 bg-cover bg-center"
      style={{
        backgroundImage: `url(${backgrounds[variant]})`,
        opacity,
      }}
    />
  );
}
```

#### 6.3 Asset Directory
```
/public/images/backgrounds/
├── nebula.jpg       # Carina Nebula or similar
├── starfield.jpg    # Star field pattern
└── deep-field.jpg   # Hubble/JWST deep field
```

### Acceptance Criteria
- [ ] Backgrounds load quickly (optimized file size)
- [ ] Opacity is subtle, doesn't distract from UI
- [ ] Images are properly credited (even public domain)

---

## Phase 7: Starmap Visual Enhancements

**Priority:** Low
**Effort:** Medium
**Impact:** Medium

### Objective
Enhance the existing D3-based starmap with additional visual effects.

### Implementation

#### 7.1 Animated Star Twinkling
Add CSS animation for background stars:

```css
@keyframes twinkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

.star {
  animation: twinkle var(--duration, 3s) ease-in-out infinite;
  animation-delay: var(--delay, 0s);
}
```

#### 7.2 Empire Node Pulse
Add pulse effect to player's empire node:

```tsx
// In Starmap.tsx - add pulse to player node
if (empire.isPlayer) {
  nodeGroup
    .append("circle")
    .attr("r", radius + 4)
    .attr("class", "lcars-pulse")
    .attr("fill", "none")
    .attr("stroke", "#99CCFF");
}
```

#### 7.3 Hyperspace Lane Visualization
Draw lines between allied empires:

```tsx
// Draw alliance connections
treaties.forEach((treaty) => {
  if (treaty.type === "alliance") {
    svg
      .append("line")
      .attr("x1", empirePositions[treaty.empire1].x)
      .attr("y1", empirePositions[treaty.empire1].y)
      .attr("x2", empirePositions[treaty.empire2].x)
      .attr("y2", empirePositions[treaty.empire2].y)
      .attr("stroke", "#99FFCC")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4")
      .attr("opacity", 0.5);
  }
});
```

### Acceptance Criteria
- [ ] Stars twinkle subtly in background
- [ ] Player empire node has unique visual indicator
- [ ] Alliance connections are visible but not cluttering

---

## Implementation Timeline

| Phase | Description | Dependencies | Status |
|-------|-------------|--------------|--------|
| 1 | Animated Resource Counters | GSAP | Not Started |
| 2 | Button Hover/Click Sounds | Howler.js, Audio files | Not Started |
| 3 | Panel Slide Transitions | GSAP, Phase 1 | Not Started |
| 4 | Ambient Starmap Music | Howler.js, Audio files | Not Started |
| 5 | Pulsing Alert Indicators | CSS only | Not Started |
| 6 | NASA Nebula Backgrounds | Image assets | Not Started |
| 7 | Starmap Visual Enhancements | D3.js (existing) | Not Started |

---

## Audio Asset Checklist

### Sound Effects (Phase 2)
- [ ] `click.mp3` - Button click chirp
- [ ] `hover.mp3` - Subtle hover blip
- [ ] `success.mp3` - Positive confirmation
- [ ] `error.mp3` - Error/failure sound
- [ ] `alert.mp3` - Attention notification
- [ ] `turn-end.mp3` - Turn completion chime
- [ ] `combat.mp3` - Combat initiated
- [ ] `build.mp3` - Construction queued

### Ambient Audio (Phase 4)
- [ ] `space-ambient.mp3` - Calm space drone loop
- [ ] `tension.mp3` - Combat tension loop

### Recommended Sources (Free/CC0)
1. **Freesound.org** - Search terms: "sci-fi UI", "interface beep", "space ambient"
2. **Pixabay** - Both SFX and music
3. **Kenney.nl** - UI Audio pack
4. **Incompetech** - Royalty-free music (requires attribution)

---

## Testing Checklist

### Performance
- [ ] Animations don't cause frame drops
- [ ] Audio doesn't delay UI interactions
- [ ] Page load time not significantly impacted
- [ ] Memory usage stable (no audio leaks)

### Accessibility
- [ ] Audio can be muted
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Visual indicators have non-animated fallbacks

### Cross-Browser
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

---

## Future Enhancements (Post-MVP)

### Advanced Animations
- Victory/defeat screen cinematics
- Combat resolution animations
- Research breakthrough effects

### Advanced Audio
- Procedural audio with Tone.js
- Dynamic music that responds to game state
- Voice announcements for major events

### 3D Elements (Long-term)
- Three.js tactical battle viewer
- 3D rotating planet previews
- WebGL particle effects for combat

---

## Notes

- All placeholder assets should be replaced with custom/licensed audio before production
- Consider hiring a sound designer for cohesive audio identity
- GSAP is free for personal/non-commercial use; check license for commercial
- Test with users for "annoyance factor" on sounds

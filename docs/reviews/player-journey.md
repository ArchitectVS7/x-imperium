# Player Journey Review - Nexus Dominion

## Executive Summary

Nexus Dominion implements a multi-layered onboarding system with progressive UI disclosure, a 5-step tutorial overlay, and turn-based contextual hints spanning the first 20 turns. While the foundational architecture for new player guidance is robust, there are notable friction points including information overload at game start, lack of interactive guidance, and inconsistent help discoverability that could significantly impact first-time user retention.

## Critical Findings (Must Fix)

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 1 | Tutorial and Welcome Modal conflict on Turn 1 | src/components/game/GameShell.tsx:181-216 | Critical | TutorialOverlay and Turn Summary Modal both display on first turn, creating competing UI elements that confuse new players. The welcome modal triggers at turn 1 showing resources, while the tutorial starts with "Welcome to Nexus Dominion" - redundant and overwhelming. |
| 2 | Onboarding hints obscure gameplay | src/components/game/onboarding/OnboardingManager.tsx:36-141 | Critical | Turn 1 shows 2 hints simultaneously ("Welcome" and "Turn Order Panel"), both positioned fixed on screen. Combined with tutorial modal, new player sees 3+ overlapping tutorial elements. |
| 3 | No guided first action | src/components/game/tutorial/TutorialOverlay.tsx:85-139 | Critical | Tutorial describes mechanics but never guides player to actually DO anything except "End Turn". Player learns about expansion, military, resources but has no hands-on practice before being left alone. |
| 4 | Victory conditions inconsistency | Multiple files | Critical | Landing page (src/app/page.tsx:86-93) shows 3 victory types, TutorialOverlay (line 93-129) shows 6 victory types. This inconsistency creates confusion about actual win conditions. |

## High Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 5 | Screenshot carousel shows placeholders | src/app/page.tsx:164-224 | High | "See the Galaxy" section shows placeholder boxes with "Screenshot placeholder - Add image to /public/screenshots/". Poor first impression for potential players viewing landing page. |
| 6 | New game form lacks context | src/app/game/page.tsx:86-140 | High | Player must choose Empire Name, Game Mode, Bot Count, and Difficulty without understanding implications. No tooltips, no recommended settings for beginners, no explanation of "Oneshot" vs "Campaign" before selection. |
| 7 | Protection period not prominently explained | Multiple components | High | 20-turn protection mentioned in TurnOrderPanel (line 160-165) and onboarding hints, but not clearly visible during initial game setup. New players may not understand strategic importance. |
| 8 | Quick Reference Modal not discoverable | src/components/game/QuickReferenceModal.tsx | High | Excellent resource containing keyboard shortcuts, victory conditions, and tips, but only accessible via "?" key. No visible button or menu item hints at its existence. |
| 9 | Mobile onboarding incomplete | src/components/game/MobileBottomBar.tsx | High | Mobile users see compressed status bar but no mobile-optimized tutorial flow. Desktop tutorial elements may not render correctly on mobile viewport. |
| 10 | No first-turn guided checklist | src/components/game/TurnOrderPanel.tsx:169-230 | High | Actions checklist exists but doesnt guide priority. New player sees 8+ action options with no indication of what to do first. |

## Medium Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 11 | Progressive disclosure too slow | src/lib/constants/unlocks.ts:54-63 | Medium | Diplomacy unlocks at Turn 10, Market at Turn 51. New players may feel restricted. Alternative: show locked features with "unlocks at Turn X" messaging earlier. |
| 12 | Sector terminology transition incomplete | src/app/page.tsx:26-27 | Medium | Landing page correctly uses "sectors" but database and some internal references use "planets". Player may encounter inconsistent terminology. |
| 13 | Combat page overwhelming for beginners | src/app/game/combat/page.tsx:137-366 | Medium | Full combat interface shown with target selection, attack types, force allocation, and combat preview. No simplified "beginner mode" or guided first attack. |
| 14 | Research page lacks progression context | src/app/game/research/page.tsx:17-35 | Medium | Research system explanation mentions "Level 2 unlocks Light Cruisers" but no visual roadmap showing full research tree or time estimates. |
| 15 | Turn Summary Modal information density | src/components/game/TurnSummaryModal.tsx:173-356 | Medium | Shows 6 categories (Income, Population, Military, Diplomacy, Galaxy, Alerts) every turn. Early turns often have minimal events but same complex UI. |
| 16 | No contextual help on individual UI elements | Throughout codebase | Medium | Panels, buttons, and stats lack tooltips. Player must figure out meaning of "Civil Status", "Networth", "Threats" through trial and error. |
| 17 | Tutorial skip button poorly positioned | src/components/game/onboarding/OnboardingManager.tsx:187-195 | Medium | "Skip all tutorials" button at bottom-right with small text. Experienced players may not find it; new players may accidentally click it. |
| 18 | No game pace explanation | src/components/start-game/GameModeSelector.tsx | Medium | Oneshot (50-100 turns) vs Campaign (150-500 turns) explained, but no indication of typical session length in real-time. |

## Low Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 19 | "How to Play" accordion default open | src/app/page.tsx:134 | Low | First accordion section opens by default (index 0), which is good, but no progress indicator showing which sections user has read. |
| 20 | No audio/visual feedback on key actions | General | Low | No sound effects or animations for critical moments (attack success, new message, protection ending). Reduces engagement feeling. |
| 21 | Turn goals not visible in main UI | src/lib/tutorial/types.ts:247-302 | Low | TURN_GOALS defined (Build 200 soldiers by T5, Own 7 sectors by T10) but no visible progress tracking in gameplay UI. |
| 22 | Bot Gallery Modal not integrated | src/components/game/BotGalleryModal.tsx | Low | Component exists but not accessible from main game flow. Could help players understand opponents. |
| 23 | Keyboard shortcuts not shown in panels | src/hooks/useGameKeyboardShortcuts.ts | Low | Shortcuts work (M for Military, S for Sectors, etc.) but no visual hints in panel headers or buttons. |
| 24 | No "recommended" indicator on difficulty | src/components/start-game/DifficultySelector.tsx | Low | Four difficulty options shown equally. No "Recommended for new players" badge on Normal or Easy. |
| 25 | Landing page footer shows old version | src/app/page.tsx:348 | Low | Shows "v0.6-Prototype" and "M11 Complete" - outdated version info may confuse returning players. |

## Corrective Actions

1. **Resolve Turn 1 modal conflict (Critical)**: Implement a sequenced onboarding flow where TutorialOverlay appears first, then dismisses before welcome modal. Or merge both into a single cohesive "First Turn" experience.

2. **Add interactive tutorial steps (Critical)**: Modify tutorial to include guided actions like "Click Sectors to colonize your first sector" with element highlighting and validation before proceeding.

3. **Synchronize victory conditions (Critical)**: Update landing page How to Play section to match the 6 victory conditions shown in TutorialOverlay and QuickReferenceModal.

4. **Add landing page screenshots (High)**: Capture actual gameplay screenshots for the carousel. Remove placeholder content before production release.

5. **Add beginner-friendly game setup (High)**: Include "Quick Start" option that auto-selects recommended settings (Oneshot, 25 bots, Normal difficulty) with single "Start Game" button.

6. **Improve Quick Reference discoverability (High)**: Add a "?" icon button in GameHeader that opens QuickReferenceModal. Add hint on first game: "Press ? anytime for help".

7. **Create mobile tutorial variant (High)**: Design mobile-optimized onboarding that uses full-screen tutorial cards instead of overlay hints.

8. **Add first-turn priority guidance (High)**: Highlight "Colonize Sectors" and "Build Military" in TurnOrderPanel with "Start Here" badges during protection period.

9. **Add tooltips throughout (Medium)**: Implement tooltip system for all resource icons, status indicators, and panel buttons explaining their purpose.

10. **Implement turn goal progress tracking (Low)**: Add small "Current Goal" widget showing next milestone (e.g., "Goal: Own 7 sectors - 3/7").

## Visionary Recommendations

1. **Interactive Tutorial Mode**: Create an optional "Commander Academy" that walks new players through a scripted 5-turn scenario with guaranteed outcomes, teaching each mechanic hands-on before launching into real gameplay.

2. **Adaptive Onboarding**: Track which features players use and show contextual tips only when approaching unused features. Player who builds units but never colonizes gets a "tip: expand your empire" prompt.

3. **Replay First Game Option**: Offer players the ability to restart their first game after Turn 5 with knowledge gained, reducing frustration from early mistakes.

4. **Video Tutorials Integration**: Add short (30-60 second) video clips for complex systems like Combat and Research, accessible from respective pages.

5. **Community Strategy Guides**: Integrate link to community wiki or strategy guides for players who want deeper learning without spoiling discovery.

6. **Onboarding Analytics**: Implement tracking of tutorial completion rates, skip rates, and time-to-first-action to continuously improve onboarding flow.

7. **Persona-Based Onboarding**: Different tutorial paths for "I want to conquer" (military focus), "I want to build" (economic focus), or "I want to explore" (diplomacy focus) play styles.

8. **Progressive Complexity Mode**: Option to start with only core mechanics visible (sectors, basic units) and unlock advanced features through gameplay achievements rather than turn count.

## Metrics

- Files reviewed: 28
- Issues found: 25 (Critical: 4, High: 6, Medium: 8, Low: 7)
- Components analyzed:
  - Landing page and game setup flow
  - Tutorial system (TutorialOverlay, OnboardingManager, OnboardingHint)
  - Progressive disclosure system (unlocks.ts, useProgressiveDisclosure.ts)
  - Core gameplay pages (Starmap, Sectors, Military, Combat, Research)
  - UI shell components (GameShell, GameHeader, TurnOrderPanel)
  - Mobile experience (MobileBottomBar, MobileActionSheet)
  - Help systems (QuickReferenceModal, TurnSummaryModal)

---

*Review conducted: 2026-01-08*
*Reviewer: UX Research Agent*
*Focus: New player onboarding, tutorial flow, friction points, information overload, learning curve, first-time user experience*

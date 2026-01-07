# Nexus Dominion Documentation

Welcome to the Nexus Dominion documentation. This hub provides navigation to all project documentation.

---

## Quick Links

| Document | Audience | Description |
|----------|----------|-------------|
| [Quick Start](guides/QUICK-START.md) | Players | 5-minute intro to playing |
| [CLAUDE.md](../CLAUDE.md) | Developers | Start here for coding |
| [Terminology](development/TERMINOLOGY.md) | Everyone | CRITICAL term rules |

---

## For Players

### Getting Started
- [Quick Start Guide](guides/QUICK-START.md) - Get playing in 5 minutes
- [How to Play](guides/HOW-TO-PLAY.md) - Complete game manual

### Understanding the Game
- [Game Design](core/GAME-DESIGN.md) - Vision, mechanics, systems overview
- [Combat System](core/COMBAT-SYSTEM.md) - D20 unified combat explained
- [Bot System](core/BOT-SYSTEM.md) - AI opponent behaviors

---

## For Developers

### Getting Started
- [../CLAUDE.md](../CLAUDE.md) - AI coding assistant guide (start here)
- [Terminology](development/TERMINOLOGY.md) - CRITICAL: Terms to use/avoid

### Technical Documentation
- [Architecture](development/ARCHITECTURE.md) - Tech stack, directory structure
- [Frontend Guide](development/FRONTEND-GUIDE.md) - React/Next.js patterns
- [UI Design](development/UI-DESIGN.md) - LCARS aesthetic, components
- [Testing Guide](development/TESTING-GUIDE.md) - Vitest, Playwright patterns

### Game Systems
- [Game Design](core/GAME-DESIGN.md) - Core mechanics reference
- [Bot System](core/BOT-SYSTEM.md) - 4-tier AI architecture
- [Combat System](core/COMBAT-SYSTEM.md) - Combat formulas, outcomes

---

## Future Content

### Expansion (Not in v1.0)
- [Expansion Overview](expansion/README.md) - What's planned
- [Crafting System](expansion/CRAFTING.md) - Resource tiers, Syndicate
- [Roadmap](expansion/ROADMAP.md) - DLC timeline

### Experimental Ideas
- [Brainstorm](brainstorm/README.md) - Ideas under evaluation
- Includes: Tech card drafts, hidden traitor mode, D20 research

---

## Historical

- [Archive](archive/README.md) - Historical docs, design sprint notes

---

## Document Structure

```
docs/
├── index.md           ← You are here
├── core/              ← Game design docs
│   ├── GAME-DESIGN.md
│   ├── BOT-SYSTEM.md
│   └── COMBAT-SYSTEM.md
├── development/       ← Developer docs
│   ├── TERMINOLOGY.md   ← CRITICAL
│   ├── ARCHITECTURE.md
│   ├── FRONTEND-GUIDE.md
│   ├── UI-DESIGN.md
│   └── TESTING-GUIDE.md
├── guides/            ← Player guides
│   ├── QUICK-START.md
│   └── HOW-TO-PLAY.md
├── expansion/         ← Future DLC
│   ├── README.md
│   ├── CRAFTING.md
│   └── ROADMAP.md
├── brainstorm/        ← Experimental ideas
│   └── [concept files]
└── archive/           ← Historical docs
    └── [archived files]
```

---

## Key Terminology

| DO NOT USE | USE INSTEAD |
|------------|-------------|
| planet(s) | **sector(s)** |
| 25 AI opponents | **10-100 AI opponents (configurable)** |
| 200 turns | **50-500 turns (based on game mode)** |

See [Terminology](development/TERMINOLOGY.md) for complete rules.

---

*Last updated: January 2026*

# Nexus Dominion: Game Vision

## The Legacy

Nexus Dominion revives **Solar Realms Elite** (SRE), the beloved 1990 BBS door game created by Amit Patel. SRE itself descended from a legendary lineage:

```
The Sumerian Game (1964) - Mabel Addis
  ↓
Kingdom/Hammurabi (1968-1978) - David Ahl
  ↓
Space Empire Elite (1986) - Jon Radoff
  ↓
Solar Realms Elite (1990-1994) - Amit Patel
  ↓
Nexus Dominion (2026) - The Revival
```

This heritage matters. **Hammurabi fit in 4KB of memory** because it was designed with elegant constraints. The best strategy games achieve depth through interaction, not feature bloat.

---

## The Problem We're Solving

The original SRE was a **multiplayer BBS game** where players dialed in, took turns, and waited days or weeks for a game to conclude. This created two barriers:

1. **Time commitment**: Games took weeks to complete
2. **Player dependency**: Required other active players

Solar Imperium (2007-2009) attempted to modernize SRE for the web but suffered from **feature creep**:
- 24 starting planets (vs SRE's 6)
- 4 resource types with complex supply/demand markets
- Convoys with real travel time
- 89,000 lines of tangled PHP code

The original Solar Imperium developer himself wrote in 2010: *"The game must be a lot simpler! 2.7 codebase is too complex for the result it produces."*

---

## Our Vision

**Nexus Dominion transforms a weeks-long multiplayer experience into a 1-2 hour single-player strategy game** while preserving what made SRE special.

### Core Philosophy

1. **Elegant Simplicity**: Like Hammurabi, every feature must earn its place. Depth comes from meaningful choices, not complexity.

2. **AI Opponents, Not Empty Servers**: 99 bot players with distinct personalities create a living galaxy. No waiting for human players.

3. **Instant Gratification**: When you take your turn, all 99 bots respond immediately. No waiting days for results.

4. **Strategic Depth Through Interaction**: Bot alliances, betrayals, and messages create emergent narratives. The Warlord threatens you. The Diplomat offers peace. The Schemer plots your downfall.

5. **Scenario Variety**: Pre-built scenarios with different win conditions (economic domination, military conquest, spy master) plus a custom scenario builder ensure replayability.

---

## What We Keep From SRE

| Feature | Why It Matters |
|---------|----------------|
| **Turn-based gameplay** | Thoughtful strategy, not twitch reflexes |
| **10 planet types** | Clear roles, meaningful choices |
| **Multi-phase combat** | Space → Orbital → Ground creates tactical depth |
| **Covert operations** | Asymmetric warfare options |
| **Research progression** | Long-term planning rewards |
| **Protection turns (20)** | New players can establish before fighting |

## What We Add

| Feature | Why It Matters |
|---------|----------------|
| **99 AI bots** | Always a populated galaxy |
| **Bot personalities** | Warlord, Diplomat, Schemer, etc. create drama |
| **LLM-powered elite bots** | Natural language messages, strategic depth |
| **Scenario system** | Different win conditions, replayability |
| **LCARS-inspired UI** | Modern, futuristic, immersive |
| **Instant turns** | Complete games in hours, not weeks |

## What We Simplify

| Original | Nexus Dominion | Reason |
|----------|------------|--------|
| 24 starting planets | 9 starting planets | Manageable scale |
| Convoy travel time | Instant combat | No waiting |
| Complex supply/demand | Simpler market | Approachable |
| Multiplayer-first | Single-player focus | Always playable |

---

## Target Experience

### The First 5 Minutes
1. Choose a scenario (or customize)
2. Name your empire and emperor
3. See your 9 starting planets on a galaxy map
4. Receive welcome message from a Diplomat bot offering alliance
5. Receive threat from a Warlord bot demanding tribute

### The Core Loop
1. **Review**: Check resources, events, messages
2. **Build**: Buy planets, train military, research tech
3. **Expand**: Attack weak bots, defend against threats
4. **Diplomate**: Form alliances, betray enemies (or be betrayed)
5. **End Turn**: Watch 99 bots respond, see results

### The Endgame
- Scenario win condition achieved (networth, conquest, research, etc.)
- Hall of Fame entry
- Unlocks for future scenarios (stretch goal)

---

## Design Principles

### 1. Clarity Over Complexity
Every screen should be scannable in 5 seconds. Critical information prominent. Details available but not overwhelming.

### 2. Meaningful Choices
No dominant strategy. Economic focus, military expansion, covert operations, and diplomatic manipulation should all be viable paths to victory.

### 3. Bot Personality
Bots should feel like characters, not algorithms. The Warlord should consistently behave aggressively. The Schemer should betray at the worst moment. Players should learn to read bot behavior.

### 4. Narrative Emergence
The best game stories aren't scripted. They emerge from systems interacting. "The Diplomat saved me from the Warlord, but then the Schemer turned them both against me."

### 5. Respect for Time
A complete game should be playable in 1-2 hours. No mobile-game manipulation. No artificial waiting. Player's time is valuable.

---

## Success Criteria

| Metric | Target |
|--------|--------|
| **Game length** | 1-2 hours (200 turns) |
| **Bot variety** | 99 bots feel distinct |
| **Strategy balance** | No single dominant path |
| **Replayability** | 8+ scenarios with different challenges |
| **Learning curve** | Playable in 10 minutes, mastery takes hours |
| **Nostalgia factor** | SRE veterans feel at home |
| **Modern UX** | New players aren't intimidated |

---

## What This Is NOT

- **Not a mobile gacha game**: No predatory monetization
- **Not a persistent MMO**: Single sessions, complete games
- **Not a real-time strategy**: Turn-based, thoughtful
- **Not a simulation**: Approachable rules, not spreadsheets
- **Not multiplayer (v1)**: Focus on single-player excellence first

---

## The Name

**Nexus Dominion** honors the lineage:
- "Dominion" = Sovereign territory, domain of control (SRE heritage)
- "Nexus" = Connection point, hub of the galaxy
- Works as spiritual successor without trademark concerns

---

*"The galaxy awaits, Commander. Your rivals are ready. Are you?"*

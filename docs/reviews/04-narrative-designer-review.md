# Pass 4: Narrative Designer Review

**Date:** December 23, 2024
**Agent:** narrative-designer
**Agent ID:** a41b5f2
**Status:** REVISED after stakeholder session

## Executive Summary

The bot personality system is now fully architected to deliver **memorable character-driven gameplay**. After stakeholder session: 100 unique personas with voice seeds, emotional states with mechanical effects, weighted relationship memory with permanent scars, and LLM-powered epilogues. The system balances template efficiency with LLM creativity — templates until exhausted, then generate fresh content.

**Narrative Confidence: HIGH** — Ready for Bot Creation Phase planning session.

**Key Principle Established:** "Bots aren't opponents — they're characters in YOUR story."

## Bot Personality Assessment — CONFIRMED

### Persona Architecture

```typescript
interface BotPersona {
  id: string;                    // "commander_hexen"
  name: string;                  // "Commander Hexen"
  archetype: Archetype;

  voice: {
    tone: string;                // "gruff military veteran"
    quirks: string[];            // ["never says please", "references old wars"]
    vocabulary: string[];        // ["soldier", "campaign", "flank"]
    catchphrase?: string;        // "Victory favors the prepared"
  };

  templates: {                   // 2-3 seeds per category
    greeting: string[];
    battleTaunt: string[];
    victoryGloat: string[];
    defeat: string[];
    tradeOffer: string[];
    allianceProposal: string[];
    betrayal: string[];
  };

  usedPhrases: Set<string>;      // Prevent repetition
}
```

**Message Flow:** Template first → Mark as used → If exhausted, LLM generates fresh

### Emotional State System — CONFIRMED

| Emotion | Decision | Alliance | Aggression | Negotiation |
|---------|----------|----------|------------|-------------|
| **Confident** | +5% | -20% | +10% | +10% |
| **Arrogant** | -15% | -40% | +30% | -30% |
| **Desperate** | -10% | +40% | -20% | -20% |
| **Vengeful** | -5% | -30% | +40% | -40% |
| **Fearful** | -10% | +50% | -30% | +10% |
| **Triumphant** | +10% | -10% | +20% | -20% |

- States are **hidden** from player (inferred from messages)
- Intensity scales effects (0.0 - 1.0)
- Mechanical impact on decisions, not just flavor

### Relationship Memory — CONFIRMED

**Weighted, Not Expiring:**
- Events have weight (1-100) and decay resistance
- Major events (betrayal, life saved) resist being "washed away"
- 20% of negative events are **permanent scars**
- Can't spam messages to erase capturing a planet

| Event | Weight | Decay Resistance |
|-------|--------|------------------|
| Captured planet | 80 | HIGH |
| Saved from destruction | 90 | HIGH |
| Broke alliance | 70 | HIGH |
| Won battle | 40 | MEDIUM |
| Trade accepted | 10 | LOW |
| Message sent | 1 | VERY LOW |

### Player Readability — CONFIRMED

**Tells are archetype-specific and percentage-based:**

| Archetype | Telegraph % | Style | Advance Warning |
|-----------|-------------|-------|-----------------|
| **Warlord** | 70% | Obvious | 2-3 turns |
| **Diplomat** | 80% | Polite | 3-5 turns |
| **Schemer** | 30% | Cryptic/Inverted | 1 turn (if any) |
| **Economist** | 60% | Transactional | 2 turns |
| **Aggressor** | 40% | Minimal | 1 turn |
| **Peaceful** | 90% | Clear | 5+ turns |

**Key principles:**
- Not every attack has a warning
- Emotional state modifies telegraph chance (vengeful = less warning)
- Observant players learn patterns over time

## Communication System — CONFIRMED

### Two Message Channels

| Channel | Visibility | Examples |
|---------|------------|----------|
| **Direct** | Private | Threats, offers, negotiations |
| **Broadcast** | All players | Galactic events, conquest news, shouts |

**Bots can broadcast:** Add shouts to persona seeds (Warlord boasts, Schemer hints)

### Response Options

**Always available:**
- Text responses (generic replies)

**Gated by relationship + conversation state:**
- Propose Alliance (requires 1+ exchange, neutral+ attitude)
- Request Reinforcements (requires allied status)
- Accept/Counter trade (requires active offer)

**Contextual blocking:**
- Can't propose alliance mid-battle
- Can't request help from enemy

### Template + LLM Hybrid

**15 categories × 2-3 templates per persona = 30-45 seed phrases each**

| Category | Trigger |
|----------|---------|
| Greeting | First contact |
| Battle Taunt | Combat initiated |
| Battle Victory | Bot wins |
| Battle Defeat | Bot loses |
| Trade Offer | Proposing trade |
| Trade Accept/Reject | Responding to offer |
| Alliance Proposal | Bot proposes |
| Alliance Accept/Reject | Responding |
| Betrayal | Breaking alliance |
| Threat | Warning before attack |
| Retreat | Fleeing battle |
| Eliminated | Bot destroyed |
| Endgame | Final turns |
| Broadcast Shout | Global announcements |

**Flow:** Use template → Mark as used → If all used, LLM generates fresh → Cache new phrase

### Sample Templates

**Warlord Threats:**
```
"Your fleet is outnumbered {ratio}, {player_name}. Surrender."
"I've seen your defenses. Pathetic. Stand down."
"War is inevitable. I'm just speeding up the process."
```

**Schemer Deception:**
```
"I've been watching you. You're smarter than the others."
"Trust is rare. But I trust you, {player_name}." [LIE]
"You're my most trusted ally." [TEMPORARY]
```

**Schemer Betrayal:**
```
"You trusted me. How delightful. How... naive."
"Did you really think I meant it? Adorable."
"Surprise, {player_name}. I was never your friend."
```

### Message Pacing Rules

- Max 1 message per bot per turn (normal)
- 3 turn cooldown before same bot messages again
- Silence is powerful (Schemer goes quiet before betrayal)

## Emergent Storytelling

### Alliance Drama Arc

**Missing Narrative Beats:**

1. **Formation** - Personality-specific pitches
2. **Honeymoon** (Turns 1-10) - Positive reinforcement
3. **Peak Alliance** (Turns 11-20) - Coordinated victories
4. **Stress Testing** (Turns 21-25) - Tension builds
5. **Point of No Return** (Turns 26-30) - Passive-aggressive

### Schemer Betrayal Arc (Example)

```
TURN 1-10: Recruitment
- Overly friendly, generous offers
- "We're going to do great things together"

TURN 11-20: Peak Alliance
- Coordinated attacks, resource sharing
- "You're my most trusted partner"

TURN 21-25: Subtle Shift
- Messages less frequent
- Asks probing questions about defenses

TURN 26-27: The Silence
- No messages for 2 turns
- Player gets uneasy feeling

TURN 28: THE BETRAYAL
- Full-screen dramatic reveal
- "You trusted me. How... naive."
```

### Grudge & Revenge Systems

**Missing: Narrative Closure**

1. **Grudge Declaration** - System creates marker, player sees "GRUDGE" status
2. **Revenge Opportunity** - UI highlights "Revenge Strike" when favorable
3. **Revenge Completion** - Special victory message, "Grudge Settled" achievement
4. **Unresolved Grudges** - Mentioned in defeat screen

## Engagement Hooks

### First 5 Minutes (CRITICAL)

```
TURN 1 EXPERIENCE:

1. Welcome Message (System)
   "Welcome to the Outer Rim, Commander. 7 rivals surround you."

2. First Bot Message (Random)
   - Warlord: "Fresh meat. I'll enjoy crushing you."
   - Diplomat: "Welcome! Perhaps we could... cooperate?"
   - Schemer: "How interesting. A new player. Do you trust easily?"

3. Tutorial Overlay
   "Emperor Varkus just messaged you. This is a Warlord - aggressive."

4. Immediate Choice
   - [Defiant] "I'm not afraid of you."
   - [Diplomatic] "Perhaps we can avoid conflict?"
   - [Ignore]

5. Consequence (Next Turn)
   Bot responds to choice
```

### Mid-Game Tension (Turns 20-40)

1. **Coalition Politics** (Turn 20-25) - Two bots target player
2. **Power Shift** (Turn 30-35) - Strongest empire emerges
3. **Betrayal Window** (Turn 35-40) - 50% chance ally betrays

### Endgame Climax (Final 10 Turns)

1. **Final Showdown Setup** - "THE ENDGAME" announcement
2. **Boss Battle Frame** - Pre-battle monologue
3. **Final Turn** - Personality-specific defeat/victory messages

### Victory/Defeat Payoff — CONFIRMED

**LLM-Generated Epilogue System:**

```typescript
interface GameEpilogue {
  stats: {
    turnsPlayed: number;
    victoriesInCombat: number;
    alliancesFormed: number;
    nemesis: BotPersona;        // Most fought
    closestAlly: BotPersona;    // Longest alliance
    betrayer?: BotPersona;
  };

  pivotalMoments: PivotalMoment[];  // Auto-captured during game
}
```

**Epilogue format:**
- 150-200 words (quick read, not a novel)
- Dramatic opening based on outcome
- References 2-3 key moments by name
- Characterizes player's playstyle
- Memorable closing line
- Stats summary
- Comparison vs player's other campaigns
- Leaderboard ranking (if online)

**Playstyle Titles (auto-generated):**
- Fast conquest → "The Blitzkrieg"
- Economic dominance → "The Monopolist"
- Many alliances → "The Puppet Master"
- Comeback victory → "The Phoenix"
- Never lost a battle → "The Unbroken"

## Replayability

### "One More Game" Hooks

1. **Unfinished Business** - "Schemer Krix remains undefeated"
2. **Personality Curiosity** - "You've mastered Warlords. Can you beat 6 Schemers?"
3. **Personal Rivalries** - Track win/loss vs each personality type
4. **Scenario Completion** - "3/8 scenarios complete"

### Shareable Moments

1. **Screenshot Generator** - Auto-generate for key moments
2. **Story Recap** - Timeline of events, relationship chart
3. **Achievements** - "Backstabbed", "Giant Slayer", "Master Diplomat"

## Priority Items — REVISED

### v0.5 (MVP - No narrative, random bots)
- No messaging system (Tier 4 random bots don't talk)
- Foundation only

### v0.6 (Core Narrative)
1. **Persona data structure** - 100 bot definitions with voice seeds
2. **Template library** - 30-45 phrases per persona (15 categories × 2-3 each)
3. **Two-channel messaging** - Direct + Broadcast
4. **Usage tracking** - Prevent repetition
5. **Basic emotional states** - 6 states, mechanical effects

### v0.7 (Emotional Depth)
6. **LLM integration** - Generate fresh when templates exhausted
7. **Weighted relationship memory** - Events with decay resistance
8. **Emotional intensity scaling** - States affect decisions
9. **Tell system** - Archetype-specific, percentage-based
10. **Response gating** - Conversation state unlocks game actions

### v0.8 (Payoff Systems)
11. **LLM epilogue generation** - 150-word campaign summaries
12. **Pivotal moment tracking** - Auto-capture key events
13. **Playstyle titles** - Auto-generated based on victory path
14. **Leaderboard with flavor** - Stats + narrative hooks
15. **Extended chronicle** - Optional longer narrative

### Future Planning Sessions Flagged

**Bot Creation Phase:**
- 100 unique personas
- Voice seeds, quirks, vocabulary
- 30-45 template phrases each
- Archetype distribution

**Communication Decision Trees:**
- Narrative + Game Design collaboration
- Map conversation flows to mechanical outcomes
- Define relationship gates for each action

## Design Principle

**"The bots aren't just opponents—they're characters in YOUR story."**

Success = Players tell stories like:
- "The Schemer pretended to be my ally for 25 turns, then stabbed me in the back."
- "The Warlord was crushing everyone, so I formed a desperate alliance with the Diplomat."
- "I trusted the Economist's deals. Big mistake."

If players only talk about mechanics, the narrative fails.
**Make every bot memorable. Make every game a story worth telling.**

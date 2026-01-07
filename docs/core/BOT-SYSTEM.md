# Nexus Dominion: Bot AI System

**Version:** 1.0 (Consolidated)
**Status:** Active - Primary Bot Reference
**Last Updated:** January 2026

---

## Overview

Nexus Dominion features 10-100 AI bot opponents with varying intelligence, personalities, and strategies. Bots create a dynamic, unpredictable game world where players must read behavior, form alliances, and anticipate betrayals.

**Key Principle**: Players cannot see bot archetype - they must deduce personality through observation.

---

## 4-Tier Intelligence System

### Tier Distribution (100 bots)

| Tier | Count | Intelligence | Description |
|------|-------|--------------|-------------|
| **Tier 1 (LLM)** | 5-10 | Elite | Natural language decisions via LLM API |
| **Tier 2 (Strategic)** | 20-25 | Sophisticated | Archetype-based decision trees |
| **Tier 3 (Simple)** | 50-60 | Mid-tier | Basic behavioral rules |
| **Tier 4 (Random)** | 10-15 | Chaotic | Weighted random, adds unpredictability |

### Tier 1: LLM-Powered Elite

Connected to LLM API (Groq → Together → OpenAI fallback chain):
- Natural language messages reflecting persona voice
- Adaptive strategies based on game state
- Async processing (decisions computed during player's turn)
- Falls back to Tier 1 Scripted on API failure

### Tier 2: Strategic Bots

Rule-based with sophisticated decision trees:
- Archetype-driven behavior
- Personality traits with mechanical effects
- Coalition formation logic
- Template-based messages (30-45 per persona)

### Tier 3: Simple Behavioral

Basic decision trees with predictable patterns:
- Responds to threats
- Minimal communication
- Balanced, Reactive, or Builder subtypes

### Tier 4: Chaotic/Random

Unpredictable behavior that adds chaos:
- Weighted random decisions
- Suboptimal choices (some intentionally)
- Creates baseline challenge

---

## 8 Archetypes

| Archetype | Style | Key Behaviors | Passive Ability |
|-----------|-------|---------------|-----------------|
| **Warlord** | Aggressive | Military focus, demands tribute | War Economy: -20% military cost when at war |
| **Diplomat** | Peaceful | Alliance-seeking, mediates | Trade Network: +10% income per alliance |
| **Merchant** | Economic | Trade focus, buys loyalty | Market Insight: Sees next turn prices |
| **Schemer** | Deceptive | False alliances, betrayals | Shadow Network: -50% agent cost |
| **Turtle** | Defensive | Never attacks first | Fortification: 2× defensive structure power |
| **Blitzkrieg** | Early rush | Fast strikes, cripples neighbors early | — |
| **Tech Rush** | Research | Tech priority, late-game power | — |
| **Opportunist** | Vulture | Attacks weakened empires | — |

### Decision Priority Matrix

| Action | Warlord | Diplomat | Merchant | Turtle | Schemer |
|--------|---------|----------|----------|--------|---------|
| **Attack** | 0.9 | 0.2 | 0.3 | 0.1 | 0.6 |
| **Defense** | 0.5 | 0.6 | 0.4 | 0.95 | 0.3 |
| **Alliance** | 0.3 | 0.95 | 0.7 | 0.5 | 0.8* |
| **Economy** | 0.4 | 0.5 | 0.95 | 0.7 | 0.5 |
| **Covert** | 0.5 | 0.2 | 0.4 | 0.3 | 0.9 |

*Schemer uses alliances for deception

---

## Emotional State System

Bots have moods that mechanically affect decisions:

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

---

## Relationship Memory

Bots remember interactions with **weighted decay**:

| Event | Weight | Decay Resistance |
|-------|--------|------------------|
| Captured sector | 80 | HIGH |
| Saved from destruction | 90 | HIGH |
| Broke alliance | 70 | HIGH |
| Won battle | 40 | MEDIUM |
| Trade accepted | 10 | LOW |
| Message sent | 1 | VERY LOW |

**Key Features:**
- Events have weight (1-100) and decay resistance
- Major events resist being "washed away"
- 20% of negative events are **permanent scars**
- Creates persistent rivalries without hard-coded alliances

---

## Bot Decision Engine

### Core Decision Loop

```
1. GATHER STATE
   ├── Own empire status (resources, military, sectors)
   ├── Relationship data (allies, enemies, neutrals)
   ├── Global game state (rankings, market prices)
   └── Recent events (attacks, messages, treaties)

2. ASSESS SITUATION
   ├── Threat analysis (who can attack us?)
   ├── Opportunity analysis (who is weak?)
   ├── Economic position (are we growing?)
   └── Alliance health (are allies reliable?)

3. STRATEGIC DECISION (varies by tier)
   ├── Tier 1: LLM analysis with personality prompt
   ├── Tier 2: Decision tree with weighted priorities
   ├── Tier 3: Simple if/then rules
   └── Tier 4: Random with constraints

4. EXECUTE ACTIONS
   ├── Military: Attack, defend, produce units
   ├── Economic: Buy/sell, adjust production
   ├── Diplomatic: Propose/accept/break treaties
   ├── Research: Choose tech path
   └── Communication: Send messages

5. LOG & LEARN
   ├── Record decision reasoning
   ├── Update relationship scores
   └── Adjust strategy if needed
```

### Bot Decision Types

```typescript
type BotDecision =
  | { type: "build_units"; unitType: UnitType; quantity: number }
  | { type: "buy_sector"; sectorType: SectorType }
  | { type: "attack"; targetId: string; forces: Forces }
  | { type: "diplomacy"; action: "propose_nap" | "propose_alliance"; targetId: string }
  | { type: "trade"; resource: ResourceType; quantity: number; action: "buy" | "sell" }
  | { type: "do_nothing" }
```

---

## Player Readability (Tell System)

Each archetype has different telegraph patterns:

| Archetype | Telegraph % | Style | Advance Warning |
|-----------|-------------|-------|-----------------|
| **Warlord** | 70% | Obvious | 2-3 turns |
| **Diplomat** | 80% | Polite | 3-5 turns |
| **Schemer** | 30% | Cryptic/Inverted | 1 turn (if any) |
| **Merchant** | 60% | Transactional | 2 turns |
| **Blitzkrieg** | 40% | Minimal | 1 turn |
| **Turtle** | 90% | Clear | 5+ turns |

---

## Coalition Behavior

### Formation Logic

```
IF no coalition AND game_turn > 10:
  ├── Diplomat: Seek allies (trust_score > 30)
  ├── Warlord: Only ally with strong (top 20% networth)
  ├── Merchant: Ally with trade partners
  ├── Schemer: Join any coalition (plan betrayal)
  ├── Turtle: Join defensive coalitions only
  └── Random: 30% chance to propose/accept

IF in coalition:
  ├── Honor defense pacts (loyalty > 0.5)
  ├── Coordinate attacks on shared enemies
  ├── Share intelligence via coalition chat
  └── Consider betrayal IF:
      ├── Schemer: Always after 20 turns
      └── Others: Only if trust_score < -50

LEAVE coalition IF:
  ├── Coalition attacks us
  ├── Leader is eliminated
  └── Better opportunity exists (risk_tolerance > 0.7)
```

---

## Communication System

### Message Types by Archetype

**Warlord:**
```
THREAT: "Your pathetic defenses won't save you.
        Surrender 5000 credits or face annihilation."
```

**Diplomat:**
```
PROPOSAL: "Greetings! I believe our empires could benefit
          from mutual cooperation. Shall we discuss?"
```

**Schemer:**
```
FALSE: "You seem reasonable. Let's form an alliance -
       together we can dominate!"
       [Internal: Mark as future target]
```

**Merchant:**
```
OFFER: "I have 10,000 ore at competitive rates.
       Interested in a trade agreement?"
```

### Endgame Drama

LLM bots send dramatic global messages:

```
// Entering top 3
"The galaxy will learn to fear the name {empire}!"

// Major alliance
"Let it be known: {coalition} now controls 40%.
Choose your side wisely."

// Before major attack
"To {target}: Your time has come. Prepare your defenses."

// Victory declaration
"The war is over. {empire} stands supreme."
```

---

## 100 Unique Personas

Each persona has:

```typescript
interface BotPersona {
  id: string;                    // "commander_hexen"
  name: string;                  // "Commander Hexen"
  archetype: Archetype;

  voice: {
    tone: string;                // "gruff military veteran"
    quirks: string[];            // ["never says please"]
    vocabulary: string[];        // ["soldier", "campaign"]
    catchphrase?: string;        // "Victory favors the prepared"
  };

  templates: {
    greeting: string[];
    battleTaunt: string[];
    victoryGloat: string[];
    defeat: string[];
    tradeOffer: string[];
    allianceProposal: string[];
    betrayal: string[];
    // ... more categories
  };

  usedPhrases: Set<string>;      // Prevent repetition
}
```

Personas stored in `data/personas.json`.

---

## Sample Personas

### Admiral Zharkov - The Warlord

```
BACKGROUND: Rose through conquered empire ranks,
overthrew own leaders. Respects only strength.

PERSONALITY:
- Aggressive but calculating
- Respects worthy opponents
- Despises cowardice
- Honors combat agreements

SPEAKING STYLE:
- Direct, commanding tone
- Military metaphors
- Addresses others by rank
- Never apologizes
```

### Ambassador Velara - The Diplomat

```
BACKGROUND: From small empire that survived by
making itself indispensable to larger powers.

PERSONALITY:
- Patient and thoughtful
- Genuinely values relationships
- Avoids violence when possible
- Believes in win-win solutions

SPEAKING STYLE:
- Formal and polite
- Uses "we" more than "I"
- Proposes compromises
- Warns rather than threatens
```

### The Broker - The Schemer

```
BACKGROUND: Nobody knows real name. Built and
destroyed empires from shadows.

PERSONALITY:
- Outwardly charming
- Views relationships as transactions
- Betrayal is just business
- Never reveals true intentions

SPEAKING STYLE:
- Warm, too friendly (red flag)
- "Between you and me..."
- Plants seeds of doubt
- "Nothing personal, just business"
```

---

## Implementation

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/bots/types.ts` | Bot types, decisions, archetypes |
| `src/lib/bots/archetypes/` | 8 archetype implementations |
| `src/lib/bots/emotions/` | Emotional state system |
| `src/lib/bots/memory/` | Relationship memory with decay |
| `src/lib/bots/bot-processor.ts` | Parallel turn processing |
| `src/lib/bots/difficulty.ts` | Difficulty modifiers |
| `data/personas.json` | 100 bot persona definitions |
| `data/templates/` | Message templates per persona |

### LLM Provider Chain

```typescript
const LLM_PROVIDERS = [
  { name: 'groq', priority: 1 },
  { name: 'together', priority: 2 },
  { name: 'openai', priority: 3 }
];

// Rate limits
const RATE_LIMITS = {
  llmCallsPerGame: 5000,
  llmCallsPerTurn: 50,
  llmCallsPerHour: 500,
  maxDailySpend: 50.00
};
```

---

## Related Documents

- [Game Design](GAME-DESIGN.md) - Overall game design
- [Combat System](COMBAT-SYSTEM.md) - Battle resolution
- [Terminology Rules](../development/TERMINOLOGY.md) - CRITICAL

---

*Consolidated from BOT_ARCHITECTURE.md, VISION.md Section 7, and PRD.md Section 8*

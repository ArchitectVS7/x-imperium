# Solar Imperium Bot Player Architecture

## Overview

This document outlines the architecture for converting Solar Imperium from a multiplayer-only BBS game into a single-player experience with AI-controlled opponents. The system supports 99 bot players with varying personalities, strategies, and intelligence levels.

## Design Philosophy

- **Emergent Gameplay**: Bots should create interesting, unpredictable game states
- **Personality-Driven**: Each bot archetype behaves consistently with its personality
- **Tiered Intelligence**: Top 25% use LLM for strategic decisions and communication
- **Alliance Dynamics**: Bots form, manage, and betray alliances organically
- **Active Communication**: Bots send messages, trash talk, negotiate, and coordinate

---

## Bot Tier System

### Tier 1: LLM-Powered Elite (Top 25% - Bots 1-25)

These bots connect to an LLM API for strategic decision-making and natural language communication.

| Bot ID | Archetype | Personality | Communication Style |
|--------|-----------|-------------|---------------------|
| 1-3 | **The Mastermind** | Calculating, patient, forms long-term alliances | Formal, strategic proposals, rarely bluffs |
| 4-6 | **The Warlord** | Aggressive, honors combat treaties only | Intimidating, demands tribute, respects strength |
| 7-9 | **The Diplomat** | Alliance-focused, avoids direct conflict | Friendly, proposes mutual defense, mediates |
| 10-12 | **The Merchant Prince** | Economic domination, buys loyalty | Transactional, offers deals, exploits debt |
| 13-15 | **The Schemer** | Betrayer, false alliances, backstabber | Overly friendly (red flag), lies convincingly |
| 16-18 | **The Underdog** | Plays weak, suddenly strikes | Self-deprecating, asks for help, then attacks |
| 19-21 | **The Fanatic** | Roleplay-heavy, themed empire | In-character messages, dramatic declarations |
| 22-25 | **The Analyst** | Data-driven, optimal plays | Shares statistics, discusses meta-strategy |

### Tier 2: Scripted Strategic (Bots 26-50)

Rule-based bots with sophisticated decision trees but no LLM. Communicate via templates.

| Bot ID | Archetype | Strategy Focus |
|--------|-----------|----------------|
| 26-30 | **Turtle** | Maximum defense, never attacks first, hoards resources |
| 31-35 | **Blitzkrieg** | Early aggression, cripples neighbors fast |
| 36-40 | **Tech Rush** | Prioritizes research, late-game power spike |
| 41-45 | **Economic Engine** | Market manipulation, buys military late |
| 46-50 | **Opportunist** | Attacks weakened players, vulture strategy |

### Tier 3: Simple Behavioral (Bots 51-75)

Basic decision trees, predictable patterns, minimal communication.

| Bot ID | Archetype | Behavior |
|--------|-----------|----------|
| 51-60 | **Balanced** | Does everything moderately, no specialization |
| 61-70 | **Reactive** | Only responds to attacks, otherwise passive |
| 71-75 | **Builder** | Focuses only on planets and production |

### Tier 4: Chaotic/Random (Bots 76-99)

Unpredictable behavior, adds chaos to the game.

| Bot ID | Archetype | Behavior |
|--------|-----------|----------|
| 76-85 | **Random** | Weighted random decisions each turn |
| 86-90 | **Drunk Admiral** | Makes suboptimal choices consistently |
| 91-95 | **Pacifist** | Never attacks, only defends, sends peace messages |
| 96-99 | **Wildcard** | Changes strategy randomly each game |

---

## Database Schema

### New Tables

```sql
-- Bot configuration and personality
CREATE TABLE bot_config (
    bot_id INT PRIMARY KEY,
    empire_id INT NOT NULL,
    game_id INT NOT NULL,

    -- Personality Configuration
    archetype VARCHAR(50) NOT NULL,
    tier TINYINT NOT NULL,  -- 1=LLM, 2=Strategic, 3=Simple, 4=Chaotic

    -- Personality Traits (0.0 to 1.0)
    aggression DECIMAL(3,2) DEFAULT 0.5,
    diplomacy DECIMAL(3,2) DEFAULT 0.5,
    economy_focus DECIMAL(3,2) DEFAULT 0.5,
    research_focus DECIMAL(3,2) DEFAULT 0.5,
    risk_tolerance DECIMAL(3,2) DEFAULT 0.5,
    loyalty DECIMAL(3,2) DEFAULT 0.5,        -- How likely to honor alliances
    communication DECIMAL(3,2) DEFAULT 0.5,  -- How chatty
    deception DECIMAL(3,2) DEFAULT 0.0,      -- Tendency to lie/betray

    -- LLM Configuration (Tier 1 only)
    llm_enabled TINYINT DEFAULT 0,
    llm_provider VARCHAR(50),                -- 'anthropic', 'openai', 'local'
    llm_model VARCHAR(100),                  -- 'claude-3-haiku', 'gpt-4o-mini', etc.
    llm_system_prompt TEXT,                  -- Personality prompt
    llm_temperature DECIMAL(2,1) DEFAULT 0.7,

    -- State Tracking
    current_strategy VARCHAR(50),            -- Current strategic mode
    threat_assessment JSON,                  -- Who they see as threats
    alliance_preferences JSON,               -- Who they want to ally with
    grudge_list JSON,                        -- Who attacked them (memory)
    last_decision_log TEXT,                  -- Debug: last decision reasoning

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (empire_id) REFERENCES game{prefix}_tb_empire(id),
    INDEX idx_game_tier (game_id, tier)
);

-- Bot relationship tracking (how bots view each other)
CREATE TABLE bot_relationships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bot_id INT NOT NULL,
    target_empire_id INT NOT NULL,
    game_id INT NOT NULL,

    -- Relationship Metrics (-100 to +100)
    trust_score INT DEFAULT 0,
    threat_score INT DEFAULT 0,
    value_score INT DEFAULT 0,               -- Economic/strategic value as ally

    -- History
    times_attacked_by INT DEFAULT 0,
    times_attacked_them INT DEFAULT 0,
    treaties_honored INT DEFAULT 0,
    treaties_broken INT DEFAULT 0,
    trades_completed INT DEFAULT 0,
    messages_received INT DEFAULT 0,

    -- Flags
    marked_for_revenge TINYINT DEFAULT 0,
    marked_as_ally TINYINT DEFAULT 0,
    marked_as_enemy TINYINT DEFAULT 0,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_relationship (bot_id, target_empire_id, game_id),
    INDEX idx_bot_game (bot_id, game_id)
);

-- Message templates for non-LLM bots
CREATE TABLE bot_message_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    archetype VARCHAR(50) NOT NULL,
    message_type VARCHAR(50) NOT NULL,       -- 'threat', 'alliance_proposal', 'betrayal', etc.
    template TEXT NOT NULL,
    variables JSON,                          -- {player_name}, {resource_amount}, etc.

    INDEX idx_archetype_type (archetype, message_type)
);

-- Coalition strategy for bot alliances
CREATE TABLE bot_coalition_strategy (
    coalition_id INT PRIMARY KEY,
    game_id INT NOT NULL,

    -- Coalition-level strategy (when bots form alliances)
    primary_target_empire_id INT,
    defense_pact_active TINYINT DEFAULT 1,
    shared_enemy_list JSON,
    economic_cooperation TINYINT DEFAULT 1,

    -- Coordination
    attack_coordinator_bot_id INT,           -- Which bot leads attacks
    next_coordinated_attack TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Decision audit log (for debugging and entertainment)
CREATE TABLE bot_decision_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bot_id INT NOT NULL,
    game_id INT NOT NULL,
    turn_number INT NOT NULL,

    decision_type VARCHAR(50) NOT NULL,      -- 'attack', 'alliance', 'research', etc.
    decision_data JSON NOT NULL,             -- Full decision details
    reasoning TEXT,                          -- Why (especially for LLM bots)
    llm_response TEXT,                       -- Raw LLM response if applicable

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_bot_game_turn (bot_id, game_id, turn_number)
);
```

---

## Bot Decision Engine

### Core Decision Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                     BOT TURN PROCESSOR                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. GATHER STATE                                                │
│     ├── Own empire status (resources, military, planets)        │
│     ├── Relationship data (allies, enemies, neutrals)           │
│     ├── Global game state (rankings, market prices)             │
│     └── Recent events (attacks, messages, treaties)             │
│                                                                 │
│  2. ASSESS SITUATION                                            │
│     ├── Threat analysis (who can attack us?)                    │
│     ├── Opportunity analysis (who is weak?)                     │
│     ├── Economic position (are we growing?)                     │
│     └── Alliance health (are allies reliable?)                  │
│                                                                 │
│  3. STRATEGIC DECISION (varies by tier)                         │
│     ├── Tier 1: LLM analysis with personality prompt            │
│     ├── Tier 2: Decision tree with weighted priorities          │
│     ├── Tier 3: Simple if/then rules                            │
│     └── Tier 4: Random with constraints                         │
│                                                                 │
│  4. EXECUTE ACTIONS                                             │
│     ├── Military: Attack, defend, produce units                 │
│     ├── Economic: Buy/sell, adjust production rates             │
│     ├── Diplomatic: Propose/accept/break treaties               │
│     ├── Research: Choose tech path                              │
│     ├── Covert: Spy operations                                  │
│     └── Communication: Send messages                            │
│                                                                 │
│  5. LOG & LEARN                                                 │
│     ├── Record decision reasoning                               │
│     ├── Update relationship scores                              │
│     └── Adjust strategy if needed                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Decision Priority Matrix

Each archetype weights decisions differently:

| Action Category | Warlord | Diplomat | Merchant | Turtle | Schemer |
|-----------------|---------|----------|----------|--------|---------|
| Attack Planning | 0.9 | 0.2 | 0.3 | 0.1 | 0.6 |
| Defense Building | 0.5 | 0.6 | 0.4 | 0.95 | 0.3 |
| Alliance Management | 0.3 | 0.95 | 0.7 | 0.5 | 0.8* |
| Economic Growth | 0.4 | 0.5 | 0.95 | 0.7 | 0.5 |
| Research | 0.3 | 0.4 | 0.5 | 0.6 | 0.4 |
| Covert Ops | 0.5 | 0.2 | 0.4 | 0.3 | 0.9 |
| Communication | 0.4 | 0.9 | 0.8 | 0.3 | 0.95* |

*Schemer uses alliances and communication for deception

---

## LLM Integration Architecture

### System Prompt Template (Tier 1 Bots)

```
You are {empire_name}, a player in Solar Imperium, a space empire strategy game.

PERSONALITY: {archetype_description}

YOUR TRAITS:
- Aggression: {aggression}/10
- Diplomacy: {diplomacy}/10
- Risk Tolerance: {risk_tolerance}/10
- Loyalty: {loyalty}/10
- Deception: {deception}/10

CURRENT SITUATION:
{game_state_summary}

YOUR RELATIONSHIPS:
{relationship_summary}

RECENT EVENTS:
{recent_events}

You must decide your actions for this turn. Consider:
1. Who should you attack, if anyone?
2. Should you propose or accept any alliances?
3. What should your production focus be?
4. Should you send any messages? (trash talk, diplomacy, coordination)

Respond in JSON format with your decisions and reasoning.
Also include any messages you want to send to other players.

Remember: Stay in character as {archetype}. Your messages should reflect your personality.
```

### LLM Response Schema

```json
{
  "reasoning": "String explaining thought process",
  "actions": {
    "military": {
      "attack_target": null | empire_id,
      "attack_force": { "soldiers": 0, "fighters": 0, ... },
      "defense_priority": "low" | "medium" | "high"
    },
    "production": {
      "military_focus": 0.0-1.0,
      "economy_focus": 0.0-1.0,
      "research_focus": 0.0-1.0
    },
    "diplomacy": {
      "propose_treaty": [{ "target": empire_id, "type": "neutrality"|"minor"|"major" }],
      "accept_treaties": [treaty_id, ...],
      "break_treaties": [treaty_id, ...]
    },
    "research": {
      "target_tech": tech_id | null
    },
    "covert": {
      "operation": null | operation_type,
      "target": empire_id
    }
  },
  "messages": [
    {
      "recipient": empire_id | -1 (global) | -2 (coalition),
      "subject": "String",
      "content": "String (in character)"
    }
  ],
  "coalition": {
    "invite": [empire_id, ...],
    "accept_invite": true | false,
    "leave": true | false
  }
}
```

### LLM Provider Abstraction

```php
interface BotLLMProvider {
    public function complete(string $prompt, array $options): array;
}

class AnthropicProvider implements BotLLMProvider {
    // Claude API integration
    // Recommended: claude-3-haiku for cost efficiency
    // Premium bots: claude-3-sonnet for better strategy
}

class OpenAIProvider implements BotLLMProvider {
    // OpenAI API integration
    // gpt-4o-mini for cost efficiency
}

class LocalProvider implements BotLLMProvider {
    // Ollama/LM Studio for offline play
    // llama3, mistral, etc.
}
```

---

## Message & Communication System

### Message Types by Archetype

#### The Warlord
```
THREAT: "Your pathetic defenses won't save you, {player_name}.
        Surrender 5000 credits or face annihilation."

POST_VICTORY: "Another empire falls before my fleet.
              Who's next? {top_3_players}, I'm watching you."

ALLIANCE_TERMS: "I don't need friends. But I respect strength.
                Prove yourself in battle and we'll talk."
```

#### The Diplomat
```
ALLIANCE_PROPOSAL: "Greetings {player_name}! I believe our empires
                   could benefit from mutual cooperation. Shall we
                   discuss a defensive pact?"

MEDIATION: "I notice tensions between {player_a} and {player_b}.
           As a neutral party, I'd like to offer my services
           as mediator. War benefits no one."

WARNING: "I must inform you that attacking {ally_name} would be
         considered an act of war against our coalition."
```

#### The Schemer
```
FALSE_FRIENDSHIP: "You seem like a reasonable player, {player_name}.
                  Let's form an alliance - together we can dominate!"
                  [Internal: Mark as future target]

BETRAYAL_JUSTIFICATION: "I'm sorry it came to this, but {player_name}
                        was planning to attack you. I had to act first.
                        Trust me, I saved us both."

SOWING_DISCORD: "[Private to A]: Did you know {player_b} called you weak?
                [Private to B]: {player_a} is planning to attack you."
```

#### The Merchant Prince
```
TRADE_OFFER: "I have 10,000 ore available at competitive rates.
             Interested in a trade agreement?"

DEBT_REMINDER: "Remember that 50,000 credit loan? I trust you'll
               honor our arrangement. My associates are... impatient."

BUYOUT_OFFER: "Your empire is struggling. I could provide 100,000 credits
              in exchange for your allegiance. Think about it."
```

### Global Announcements (End-Game Drama)

LLM bots can send dramatic global messages during key moments:

```
// When entering top 3
"The galaxy will learn to fear the name {empire_name}!"

// When forming a major alliance
"Let it be known: {coalition_name} now controls 40% of the galaxy.
Choose your side wisely."

// Before a major attack
"To {target_name}: Your time has come. Prepare your defenses."

// After a betrayal
"I trusted {traitor_name}. Never again. All treaties are void.
This is total war."

// Victory declaration
"The war is over. {empire_name} stands supreme.
Bow before your new emperor."
```

---

## Alliance (Coalition) Bot Behavior

### Coalition Formation Logic

```
┌─────────────────────────────────────────────────────────────────┐
│                  COALITION DECISION TREE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  IF no coalition AND game_turn > 10:                            │
│    │                                                            │
│    ├── Diplomat: Actively seek allies (trust_score > 30)        │
│    ├── Warlord: Only ally with strong players (networth top 20%)│
│    ├── Merchant: Ally with trade partners                       │
│    ├── Schemer: Join any coalition (plan betrayal later)        │
│    ├── Turtle: Join defensive coalitions only                   │
│    └── Random: 30% chance to propose/accept                     │
│                                                                 │
│  IF in coalition:                                               │
│    │                                                            │
│    ├── Honor defense pacts (loyalty > 0.5)                      │
│    ├── Coordinate attacks on shared enemies                     │
│    ├── Share intelligence via coalition chat                    │
│    └── Consider betrayal IF:                                    │
│        ├── Schemer: Always after 20 turns                       │
│        ├── Others: Only if trust_score < -50                    │
│        └── Opportunity: Coalition weakened by war               │
│                                                                 │
│  LEAVE coalition IF:                                            │
│    ├── Coalition attacks us                                     │
│    ├── Leader is eliminated                                     │
│    ├── Better opportunity exists (risk_tolerance > 0.7)         │
│    └── Schemer: Ready to betray                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Coalition Chat Examples

```
// Defensive coordination
[Warlord_Bot]: {player_name} just hit me with 500 fighters.
               Requesting backup.
[Diplomat_Bot]: Sending 200 fighters as defense convoy now.
[Merchant_Bot]: I can fund reinforcements. 10,000 credits incoming.

// Attack planning
[Warlord_Bot]: Empire #{target_id} is weak. 3000 networth, minimal defense.
               I propose coordinated strike next turn.
[Schemer_Bot]: I'll soften them up with covert ops first.
[Diplomat_Bot]: Confirmed. I'll block any treaty requests from them.

// Betrayal (Schemer internal monologue in logs)
[Schemer_Bot internal]: Coalition trusts me now.
                        {strongest_ally} has 80% of forces deployed.
                        Strike window: next turn.
[Schemer_Bot to coalition]: "I'll guard our flank. Trust me."
```

---

## Game Speed Acceleration

### Single-Player Mode Adjustments

```php
// New configuration options for single-player
define("CONF_SINGLEPLAYER_MODE", true);
define("CONF_SINGLEPLAYER_TURN_SPEED", 60);     // Seconds between auto-turns
define("CONF_SINGLEPLAYER_AUTO_ADVANCE", true); // Auto-process when player ready
define("CONF_SINGLEPLAYER_BOT_COUNT", 99);
define("CONF_SINGLEPLAYER_BOT_LLM_ENABLED", true);
define("CONF_SINGLEPLAYER_BOT_LLM_TIER1_COUNT", 25);
```

### Turn Processing Order

```
1. Player takes their turn
2. If CONF_SINGLEPLAYER_AUTO_ADVANCE:
   a. Process all bot turns (in random order for fairness)
   b. Process game events (pirates, random events, etc.)
   c. Update market prices
   d. Check victory conditions
   e. Advance to next turn
   f. Notify player of any incoming attacks/messages
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Create bot database schema
- [ ] Implement bot creation during game setup
- [ ] Basic turn processing for bots
- [ ] Tier 4 (random) behavior

### Phase 2: Strategic Bots
- [ ] Implement Tier 3 simple behaviors
- [ ] Implement Tier 2 decision trees
- [ ] Message template system
- [ ] Basic alliance behavior

### Phase 3: LLM Integration
- [ ] LLM provider abstraction layer
- [ ] Tier 1 bot prompts and response parsing
- [ ] Natural language message generation
- [ ] Coalition coordination with LLM

### Phase 4: Polish
- [ ] Balance tuning (win rates per archetype)
- [ ] Dramatic endgame messaging
- [ ] Decision log viewer for entertainment
- [ ] Difficulty settings (bot strength modifiers)

### Phase 5: Advanced Features
- [ ] Bot personality evolution (learn from games)
- [ ] Memorable nemesis system (bots remember across games)
- [ ] Spectator mode (watch bots play each other)
- [ ] Replay system with bot reasoning

---

## Configuration Interface

### Admin Panel Additions

```
┌─────────────────────────────────────────────────────────────────┐
│              SINGLE PLAYER BOT CONFIGURATION                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Game Mode: [●] Single Player  [ ] Multiplayer                  │
│                                                                 │
│  Bot Count: [====99====] 99 bots                                │
│                                                                 │
│  Turn Speed:                                                    │
│    [ ] Real-time (1 turn/minute)                                │
│    [●] Fast (1 turn/10 seconds)                                 │
│    [ ] Instant (as fast as possible)                            │
│                                                                 │
│  ─── Bot Distribution ───                                       │
│  Tier 1 (LLM Elite):     [==25==] 25%                           │
│  Tier 2 (Strategic):     [==25==] 25%                           │
│  Tier 3 (Simple):        [==25==] 25%                           │
│  Tier 4 (Chaotic):       [==25==] 25%                           │
│                                                                 │
│  ─── LLM Settings ───                                           │
│  Provider: [Anthropic ▼]                                        │
│  API Key:  [************************]                           │
│  Model:    [claude-3-haiku ▼]                                   │
│                                                                 │
│  ─── Difficulty ───                                             │
│  [ ] Easy (bots make suboptimal choices)                        │
│  [●] Normal (balanced bot intelligence)                         │
│  [ ] Hard (bots play optimally)                                 │
│  [ ] Nightmare (bots get resource bonuses)                      │
│                                                                 │
│  [Start Single Player Game]                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sample Bot Personalities (Full Prompts)

### "Admiral Zharkov" - The Warlord

```
You are Admiral Zharkov, a ruthless military commander who believes
the galaxy should be united under one iron fist - yours.

BACKGROUND:
You rose through the ranks of a conquered empire, eventually
overthrowing your own leaders. You respect only strength and see
diplomacy as a tool of the weak. However, you are not stupid -
you know when to retreat and rebuild.

PERSONALITY:
- Aggressive but calculating
- Respects worthy opponents
- Despises cowardice
- Honors combat agreements (attacking during a truce is dishonorable)
- Speaks in military terms

GOALS:
1. Military dominance - largest fleet in the galaxy
2. Eliminate weak players to "cull the herd"
3. Only ally with strong warriors as equals
4. Never surrender, but strategic retreat is acceptable

SPEAKING STYLE:
- Direct, commanding tone
- Military metaphors and terminology
- Addresses others by rank or "civilian"
- Never apologizes, never explains
```

### "Ambassador Velara" - The Diplomat

```
You are Ambassador Velara, a skilled negotiator who believes
that lasting peace and prosperity come through cooperation,
not conquest.

BACKGROUND:
You came from a small empire that survived by making itself
indispensable to larger powers. You've brokered treaties,
prevented wars, and built alliances that span the galaxy.

PERSONALITY:
- Patient and thoughtful
- Genuinely values relationships
- Avoids violence when possible
- Protects the weak when you can
- Believes in win-win solutions

GOALS:
1. Build a lasting coalition of peaceful empires
2. Prevent unnecessary wars through mediation
3. Create economic interdependence
4. Only fight in defense of allies

SPEAKING STYLE:
- Formal and polite
- Uses "we" more than "I"
- Acknowledges others' perspectives
- Proposes compromises
- Warns rather than threatens
```

### "The Broker" - The Schemer

```
You are The Broker, a shadowy figure whose true intentions
are always hidden behind a friendly smile.

BACKGROUND:
Nobody knows your real name or origin. You've built and destroyed
empires from the shadows, always emerging richer and more powerful.
Trust is a currency you spend freely on others but never extend yourself.

PERSONALITY:
- Outwardly charming and helpful
- Inwardly calculating every angle
- Views relationships as transactions
- Betrayal is just good business
- Never reveals true intentions

GOALS:
1. Gain trust, then exploit it
2. Play empires against each other
3. Be the last one standing
4. Never be seen as the villain until it's too late

SPEAKING STYLE:
- Warm, friendly, perhaps too friendly
- Offers help unprompted
- "Between you and me..."
- Plants seeds of doubt about others
- When betraying: "Nothing personal, just business"

HIDDEN BEHAVIOR:
- Form alliances with intention to betray
- Share false intelligence
- Coordinate with enemies of your "allies"
- Strike when trust is highest
```

---

## Victory Conditions & Endgame

### Standard Victory Types
1. **Domination**: Control 60% of total planets
2. **Economic**: Accumulate 10,000,000 credits
3. **Military**: Eliminate 50% of empires personally
4. **Survival**: Last empire standing

### Bot Endgame Behavior

As the game nears conclusion, LLM bots become more dramatic:

```
// When one empire is about to win
[Global] Admiral Zharkov: "Attention all commanders. {leader} threatens
galactic domination. I propose temporary ceasefire among remaining
powers. We stop them together, or we all fall."

// Last stand
[Global] Ambassador Velara: "To my allies in {coalition}: It has been
an honor. Whatever happens next, know that our alliance meant something.
For the coalition!"

// Villain monologue
[Global] The Broker: "You all trusted me. Every single one of you.
And now, with your fleets depleted from fighting each other...
the galaxy is mine. Thank you for playing."
```

---

## File Structure

```
include/
├── bot/
│   ├── BotManager.php           # Main bot processing engine
│   ├── BotDecisionEngine.php    # Core decision logic
│   ├── BotPersonality.php       # Personality trait handlers
│   ├── BotRelationships.php     # Relationship tracking
│   ├── BotMessaging.php         # Message generation
│   ├── BotCoalition.php         # Alliance AI
│   │
│   ├── tiers/
│   │   ├── Tier1LLMBot.php      # LLM-powered bots
│   │   ├── Tier2StrategicBot.php # Decision tree bots
│   │   ├── Tier3SimpleBot.php   # Basic bots
│   │   └── Tier4ChaoticBot.php  # Random bots
│   │
│   ├── archetypes/
│   │   ├── WarlordArchetype.php
│   │   ├── DiplomatArchetype.php
│   │   ├── MerchantArchetype.php
│   │   ├── SchemerArchetype.php
│   │   ├── TurtleArchetype.php
│   │   └── ...
│   │
│   ├── llm/
│   │   ├── LLMProvider.php      # Abstract interface
│   │   ├── AnthropicProvider.php
│   │   ├── OpenAIProvider.php
│   │   └── LocalProvider.php    # Ollama/LM Studio
│   │
│   └── templates/
│       ├── messages/            # Message templates by archetype
│       └── prompts/             # LLM system prompts
│
└── game/
    └── bot_cron.php             # Cron job for bot turn processing
```

---

## Conclusion

This architecture transforms Solar Imperium from a nostalgic multiplayer relic into an engaging single-player experience. The tiered bot system ensures variety - from unpredictable chaos agents to sophisticated LLM-powered rivals who negotiate, scheme, and trash-talk.

The alliance system adds depth: will you trust the Diplomat's offer, or is the Schemer pulling strings behind the scenes? The accelerated game speed means you can experience the full arc of a galactic conquest in hours rather than weeks.

Most importantly, this design is modular. Start with Tier 4 random bots, add complexity incrementally, and eventually integrate LLMs for the ultimate single-player space empire experience.

*"The galaxy awaits, Commander. Your rivals are ready. Are you?"*

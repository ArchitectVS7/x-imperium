# Narrative Review - Nexus Dominion

## Executive Summary

The codebase demonstrates strong narrative foundations with well-designed bot archetypes, emotion systems, and faction structures. However, the critical "planet" terminology violation persists in the database schema (table named `planets` instead of `sectors`), creating a branding inconsistency. The bot persona system lacks the promised 100 personas in `data/personas.json` - this file appears incomplete. Message templates need expansion for bot personality distinctiveness.

## Critical Findings (Must Fix)

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 1 | Database table named "planets" instead of "sectors" | src/lib/db/schema.ts:76 | Critical | `export const planets = pgTable("planets", ...)` violates core terminology rules. The table name and variable must be renamed to `sectors`. |
| 2 | Variable and export uses "planets" terminology | src/lib/db/schema.ts:76-102 | Critical | All references to `planets` table need migration to `sectors` throughout schema. |
| 3 | Missing/incomplete personas.json file | data/personas.json | Critical | CLAUDE.md references "100 bot persona definitions" but the file needs completion with full persona data. |
| 4 | Missing message templates directory | data/templates/ | Critical | CLAUDE.md references "Message templates per persona" but `data/templates/` directory needs population. |

## High Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 1 | No lore/backstory for 8 archetypes | src/lib/bots/archetypes/*.ts | High | Each archetype (Warlord, Diplomat, etc.) has mechanics but lacks narrative flavor text explaining their faction/origin in the game world. |
| 2 | Event templates lack variety | src/lib/events/templates.ts:1-50 | High | Only 8 galactic event templates defined. For 200+ turn campaigns, players will see repetitive events. Need 25+ templates minimum. |
| 3 | Bot personas use placeholder generation | src/lib/bots/persona-generator.ts:17-43 | High | Persona generator creates generic names like "Commander Alpha-7" instead of using the promised 100 unique personas with distinct personalities. |
| 4 | Missing faction lore in schema | src/lib/db/schema.ts:1-400 | High | No faction/civilization tables or lore fields. Empires have `name` but no `backstory`, `origin`, or `faction_affiliation` fields. |
| 5 | Civil status labels lack narrative depth | src/lib/game/services/civil-status.ts:12-33 | High | Civil status names (Ecstatic, Happy, Content, etc.) are functional but lack in-universe flavor. Could be "Fervent Unity", "Harmonious", "Stable Order" etc. |

## Medium Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 1 | Covert ops lack narrative descriptions | src/lib/covert/operations.ts:1-120 | Medium | Operations defined mechanically without flavor text for player immersion. "Sabotage" could describe "deploying nanovirus payloads". |
| 2 | Research branches need lore | src/lib/game/constants/index.ts:35-55 | Medium | RESEARCH_BRANCHES is a simple array. Each branch (Military, Economy, etc.) needs in-universe research institution names. |
| 3 | GalacticNewsFeed template variety | src/components/game/messages/GalacticNewsFeed.tsx:1-80 | Medium | News feed component exists but templates are minimal. Needs more dynamic headline generation. |
| 4 | Victory condition announcements | src/lib/victory/conditions.ts:1-60 | Medium | Victory types defined but no narrative victory announcement templates. Conquest win should have dramatic galactic domination text. |
| 5 | Treaty types lack diplomatic flavor | src/lib/diplomacy/types.ts:1-40 | Medium | Treaty types are mechanical (NAP, Alliance, Trade). Could add "Pact of Non-Aggression", "Stellar Compact", "Commerce Accord". |
| 6 | Unit names are generic | src/lib/game/constants/index.ts:1-30 | Medium | Units (Soldiers, Fighters, LightCruisers) lack the cyberpunk/space opera naming expected. "Shadow Operatives", "Interceptor Wings", "Dreadnought Class". |
| 7 | Starmap lacks location naming | src/components/game/starmap/Starmap.tsx:1-150 | Medium | Starmap shows empire positions but sectors/regions lack named locations for narrative anchor points. |

## Low Priority Findings

| # | Issue | File:Line | Severity | Description |
|---|-------|-----------|----------|-------------|
| 1 | Bot emotions use clinical names | src/lib/bots/emotions/index.ts:1-60 | Low | Emotions like "aggressive", "fearful" are functional but could have in-universe names like "War Fever", "Paranoid Vigilance". |
| 2 | Memory system lacks narrative hooks | src/lib/bots/memory/index.ts:1-80 | Low | Memory records events but doesn't generate narrative callbacks like "They still remember the Battle of Sector 7". |
| 3 | Market page lacks trader flavor | src/app/game/market/page.tsx:1-50 | Low | Market interface is functional but could have "Galactic Exchange" branding with trader NPC flavor. |
| 4 | Syndicate missions generic | src/app/game/syndicate/page.tsx:1-50 | Low | Syndicate contracts could have noir/underworld naming conventions. "Shadow Contract", "Void Run", "Silent Acquisition". |
| 5 | Research progress lacks milestone names | src/components/game/research/FundamentalResearchProgress.tsx:1-100 | Low | Progress shown as percentages. Could have named breakthrough tiers: "Theoretical", "Applied", "Mastered". |
| 6 | Crafting queue lacks recipe lore | src/app/game/crafting/page.tsx:1-50 | Low | Crafting items could have blueprint origin stories or artifact discovery narratives. |
| 7 | Dashboard lacks empire motto/tagline | src/app/game/dashboard/page.tsx:1-80 | Low | Empire display shows stats but no customizable motto or faction tagline for player identity. |
| 8 | Combat preview lacks tactical narrative | src/components/game/combat/CombatPreview.tsx:1-150 | Low | Combat shows odds but could add brief tactical assessment text like "Overwhelming force advantage". |

## Corrective Actions

1. **IMMEDIATE**: Rename `planets` table to `sectors` in `src/lib/db/schema.ts` and run database migration.
2. **IMMEDIATE**: Complete `data/personas.json` with 100 unique bot personas including names, backstories, speech patterns, and archetype affinities.
3. **IMMEDIATE**: Populate `data/templates/` directory with message templates for each persona category (aggressive, diplomatic, mysterious, etc.).
4. **HIGH PRIORITY**: Add `flavor_text` and `lore_description` fields to archetype definitions in `src/lib/bots/archetypes/*.ts`.
5. **HIGH PRIORITY**: Expand `src/lib/events/templates.ts` to 25+ galactic event templates with varied narrative hooks.
6. **HIGH PRIORITY**: Add `backstory` field to empires table in schema for player/bot empire narratives.
7. **MEDIUM**: Create `src/lib/narrative/` module with:
   - `faction-lore.ts` - Faction descriptions and history
   - `unit-flavor.ts` - Narrative names and descriptions for military units
   - `victory-announcements.ts` - Victory condition narrative templates
   - `region-names.ts` - Named sectors and star systems for starmap
8. **MEDIUM**: Update civil status names to in-universe equivalents throughout the codebase.
9. **MEDIUM**: Add flavor text generator for covert operations outcomes.
10. **LOW**: Create optional "Galactic Chronicle" system that generates narrative recaps of significant game events.

## Visionary Recommendations

1. **Procedural Lore Generation**: Implement a system that generates unique backstories for bot empires based on their archetype, starting position, and early-game decisions.
2. **Dynamic News Headlines**: The GalacticNewsFeed could generate procedural news stories about battles, treaties, and market fluctuations with journalistic flair.
3. **Terminal Personality System**: Each archetype could have a distinct "terminal voice" for their communications - the Schemer speaks in riddles, the Warlord in threats, the Diplomat in flowery language.
4. **Historical Event Naming**: Major battles could be auto-named ("The Siege of Nexus Prime", "The Economic Collapse of Turn 87") for player memory and replay value.
5. **Faction Codex**: Create an in-game encyclopedia that unlocks lore entries as players interact with different empires, discover technologies, or witness events.
6. **Bot Grudge Narratives**: Expand the bot memory system to generate narrative explanations for actions ("The Crimson Fleet attacks you, seeking revenge for the Sector 12 Massacre").
7. **Endgame Narration**: Generate a procedural "History of the Galaxy" document at game end summarizing the rise and fall of empires.
8. **Sector Naming Conventions**: Develop a sector naming system (Greek letters + Numbers like "Alpha-7", or mythological names like "Olympus Sector") for geographic narrative anchoring.

## Metrics

- **Files reviewed**: 127 (94 TypeScript/TSX source files, 33 documentation/config files)
- **Issues found**: 23 (Critical: 4, High: 5, Medium: 7, Low: 8)
- **Terminology violations**: 2 (both in schema.ts involving "planets")
- **Missing narrative assets**: 2 (personas.json completion, templates directory)
- **World-building gaps**: 8 (factions, unit names, victory narration, etc.)
- **Event template coverage**: 32% (8 of recommended 25+ templates)

---

**Review Date**: 2026-01-08
**Reviewer**: Narrative Designer Agent
**Codebase Version**: c335f30 (main branch)

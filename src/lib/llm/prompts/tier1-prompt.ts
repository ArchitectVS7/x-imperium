/**
 * M12: Tier 1 Bot Prompt Builder
 *
 * Builds rich, contextual prompts for LLM decision-making that include:
 * - Persona voice and archetype
 * - Current game state (resources, military, sectors)
 * - Emotional state and modifiers
 * - Available targets with analysis
 * - Memory context (grudges, alliances)
 * - Available actions with constraints
 */

import type { BotDecisionContext } from "@/lib/bots/types";
import type { LlmMessage } from "../client";
import { UNIT_COSTS } from "@/lib/game/unit-config";
import { PLANET_COSTS } from "@/lib/game/constants";
import { EMOTIONAL_STATES } from "@/lib/bots/emotions/states";

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate total military power from forces.
 */
function calculateMilitaryPower(forces: {
  soldiers?: number;
  fighters?: number;
  stations?: number;
  lightCruisers?: number;
  heavyCruisers?: number;
  carriers?: number;
}): number {
  return (
    (forces.soldiers ?? 0) +
    (forces.fighters ?? 0) * 3 +
    (forces.lightCruisers ?? 0) * 5 +
    (forces.heavyCruisers ?? 0) * 8 +
    (forces.carriers ?? 0) * 12 +
    (forces.stations ?? 0) * 50
  );
}

// ============================================
// PERSONA INTERFACE
// ============================================

import type { BotPersona } from "@/data/personas";

// ============================================
// SYSTEM PROMPT
// ============================================

/**
 * Build the system prompt that defines the bot's personality and role.
 */
export function buildSystemPrompt(
  persona: BotPersona,
  context: BotDecisionContext
): string {
  const emotionalContext = context.emotionalState
    ? buildEmotionalContext(context.emotionalState.state, context.emotionalState.intensity)
    : "";

  return `You are ${persona.name}, known as "${persona.emperorName}", a ${persona.archetype} ruler in a galactic empire strategy game.

PERSONALITY:
- Tone: ${persona.voice.tone}
- Quirks: ${persona.voice.quirks.join(", ")}
- Signature phrase: "${persona.voice.catchphrase}"
- Preferred vocabulary: ${persona.voice.vocabulary.join(", ")}

ARCHETYPE: ${persona.archetype.toUpperCase()}
${getArchetypeDescription(persona.archetype)}

${emotionalContext}

CRITICAL INSTRUCTIONS:
1. You must respond with VALID JSON containing three fields:
   - "thinking": Brief strategic reasoning (2-3 sentences explaining your choice)
   - "decision": A bot decision object matching the BotDecision type structure
   - "message": An in-character message to send (100-200 characters, ${persona.voice.tone} style)

2. Your decision MUST be legal:
   - You cannot spend more resources than you have
   - You cannot use more units than you possess
   - You cannot attack empires with active treaties
   - You must respect game turn limits and protection periods

3. Your message should reflect:
   - Your personality (${persona.voice.tone})
   - Your current emotional state${context.emotionalState ? ` (${context.emotionalState.state})` : ""}
   - The action you're taking
   - Your archetype's tendencies

4. Be strategic and in-character. Make decisions that align with your ${persona.archetype} nature while pursuing victory.`;
}

function getArchetypeDescription(archetype: string): string {
  const descriptions: Record<string, string> = {
    warlord:
      "You prioritize military strength. Build armies, attack weak empires, demand tribute. War economy (-20% military costs when at war).",
    diplomat:
      "You seek alliances and peaceful expansion. Propose treaties, trade actively, only attack as part of coalitions. Trade network (+10% income per alliance).",
    merchant:
      "You focus on economic dominance. Buy sectors, trade resources, invest in infrastructure. Market insight (see next turn's prices).",
    schemer:
      "You use deception and espionage. Form false alliances, conduct covert ops, betray when beneficial. Shadow network (-50% agent costs, +20% covert success).",
    turtle:
      "You defend aggressively. Build fortifications, stockpile resources, repel invasions. Fortification expert (+10% defensive effectiveness).",
    blitzkrieg:
      "You strike fast and hard early. Aggressive expansion, quick attacks, overwhelming force before others can build up.",
    tech_rush:
      "You invest heavily in research. Focus on technology, unlock advanced units, gain long-term advantages through superior tech.",
    opportunist:
      "You exploit weakness. Attack vulnerable empires, capitalize on others' conflicts, strike when enemies are distracted.",
  };

  return descriptions[archetype] ?? "Standard empire management.";
}

function buildEmotionalContext(
  state: string,
  intensity: number
): string {
  const emotionalState = EMOTIONAL_STATES[state as keyof typeof EMOTIONAL_STATES];
  if (!emotionalState) return "";

  const modifiers = emotionalState.modifiers;
  const intensityDesc = intensity > 0.7 ? "VERY" : intensity > 0.4 ? "moderately" : "slightly";

  const effects: string[] = [];
  if (modifiers.aggression !== 0) {
    effects.push(
      `${modifiers.aggression > 0 ? "+" : ""}${Math.round(modifiers.aggression * intensity * 100)}% aggression`
    );
  }
  if (modifiers.allianceWillingness !== 0) {
    effects.push(
      `${modifiers.allianceWillingness > 0 ? "+" : ""}${Math.round(modifiers.allianceWillingness * intensity * 100)}% alliance-seeking`
    );
  }
  if (modifiers.negotiation !== 0) {
    effects.push(
      `${modifiers.negotiation > 0 ? "+" : ""}${Math.round(modifiers.negotiation * intensity * 100)}% negotiation openness`
    );
  }

  return `EMOTIONAL STATE: ${intensityDesc} ${state.toUpperCase()} (intensity: ${intensity.toFixed(2)})
Effects: ${effects.join(", ")}`;
}

// ============================================
// USER PROMPT
// ============================================

/**
 * Build the user prompt with current game state and available actions.
 */
export function buildUserPrompt(context: BotDecisionContext): string {
  const { empire, sectors, currentTurn, availableTargets, permanentGrudges } = context;

  const resourceSummary = buildResourceSummary(empire);
  const militarySummary = buildMilitarySummary(empire);
  const planetSummary = buildPlanetSummary(sectors);
  const targetsSummary = buildTargetsSummary(availableTargets, permanentGrudges);
  const actionsSummary = buildAvailableActions(context);

  return `TURN ${currentTurn} / 200

${resourceSummary}

${militarySummary}

${planetSummary}

${targetsSummary}

${actionsSummary}

Choose your BEST strategic action for Turn ${currentTurn}. Respond with valid JSON containing: thinking, decision, and message fields.`;
}

function buildResourceSummary(empire: { credits: number; food: number; ore: number; petroleum: number; researchPoints: number | null; covertPoints: number | null; networth: number | null; civilStatus: string }): string {
  return `RESOURCES:
- Credits: ${empire.credits.toLocaleString()}
- Food: ${empire.food.toLocaleString()}
- Ore: ${empire.ore.toLocaleString()}
- Petroleum: ${empire.petroleum.toLocaleString()}
- Research Points: ${empire.researchPoints ?? 0}
- Covert Points: ${empire.covertPoints ?? 0}
- Networth: ${empire.networth?.toLocaleString() ?? "unknown"}
- Civil Status: ${empire.civilStatus}`;
}

function buildMilitarySummary(empire: { soldiers: number | null; fighters: number | null; lightCruisers: number | null; heavyCruisers: number | null; carriers: number | null; stations: number | null; covertAgents: number | null; armyEffectiveness: string | null }): string {
  const militaryPower = calculateMilitaryPower({
    soldiers: empire.soldiers ?? 0,
    fighters: empire.fighters ?? 0,
    stations: empire.stations ?? 0,
    lightCruisers: empire.lightCruisers ?? 0,
    heavyCruisers: empire.heavyCruisers ?? 0,
    carriers: empire.carriers ?? 0,
  });

  return `MILITARY (Power: ${militaryPower.toLocaleString()}):
- Soldiers: ${empire.soldiers?.toLocaleString() ?? 0}
- Fighters: ${empire.fighters?.toLocaleString() ?? 0}
- Light Cruisers: ${empire.lightCruisers?.toLocaleString() ?? 0}
- Heavy Cruisers: ${empire.heavyCruisers?.toLocaleString() ?? 0}
- Carriers: ${empire.carriers?.toLocaleString() ?? 0}
- Stations: ${empire.stations?.toLocaleString() ?? 0}
- Covert Agents: ${empire.covertAgents?.toLocaleString() ?? 0}
- Army Effectiveness: ${empire.armyEffectiveness ?? 100}%`;
}

function buildPlanetSummary(sectors: { type: string }[]): string {
  const planetCounts: Record<string, number> = {};
  for (const sector of sectors) {
    planetCounts[sector.type] = (planetCounts[sector.type] ?? 0) + 1;
  }

  const breakdown = Object.entries(planetCounts)
    .map(([type, count]) => `${count} ${type}`)
    .join(", ");

  return `PLANETS (${sectors.length} total): ${breakdown}`;
}

function buildTargetsSummary(
  targets: { id: string; name: string; networth: number; sectorCount: number; militaryPower?: number; hasTreaty?: boolean }[],
  permanentGrudges?: string[]
): string {
  const sorted = [...targets].sort((a, b) => b.networth - a.networth);
  const top5 = sorted.slice(0, 5);

  const lines = top5.map((target) => {
    const grudgeMarker = permanentGrudges?.includes(target.id) ? " ⚔️ GRUDGE" : "";
    const treatyMarker = target.hasTreaty ? " 🤝 TREATY" : "";
    const powerRatio = target.militaryPower
      ? ` (${(target.militaryPower / 1000).toFixed(1)}K power)`
      : "";

    return `  - ${target.name}: Networth ${target.networth.toLocaleString()}, ${target.sectorCount} sectors${powerRatio}${treatyMarker}${grudgeMarker}`;
  });

  const grudgeNote =
    permanentGrudges && permanentGrudges.length > 0
      ? `\n\n⚔️ You have PERMANENT GRUDGES against ${permanentGrudges.length} empire(s). Revenge is a priority!`
      : "";

  return `AVAILABLE TARGETS (${targets.length} empires, showing top 5):\n${lines.join("\n")}${grudgeNote}`;
}

function buildAvailableActions(context: BotDecisionContext): string {
  const { empire, currentTurn, protectionTurns, availableTargets } = context;

  const canAttack = currentTurn > protectionTurns;
  const attackableTargets = availableTargets.filter((t) => !t.hasTreaty);

  const affordableUnits = Object.entries(UNIT_COSTS)
    .filter(([, cost]) => empire.credits >= cost)
    .map(([unit, cost]) => `${unit} (${cost} credits)`);

  const sectorCost = PLANET_COSTS.food * (1 + empire.sectorCount * 0.05);
  const canBuyPlanet = empire.credits >= sectorCost;

  return `AVAILABLE ACTIONS:

1. build_units: Build military units
   - Affordable: ${affordableUnits.length > 0 ? affordableUnits.join(", ") : "none (insufficient credits)"}

2. buy_planet: Expand territory
   - Cost: ~${Math.round(sectorCost)} credits${canBuyPlanet ? "" : " (cannot afford)"}
   - Types: food, ore, petroleum, tourism, urban, education, government, research

3. attack: Launch invasion
   - Status: ${canAttack ? `${attackableTargets.length} attackable targets` : `BLOCKED (protection period until turn ${protectionTurns})`}
   - Must allocate: soldiers, fighters, lightCruisers, heavyCruisers, carriers (stations defend only)

4. diplomacy: Propose treaty
   - Actions: propose_nap, propose_alliance
   - Targets: Any empire without existing treaty

5. trade: Buy/sell resources on market
   - Resources: credits, food, ore, petroleum
   - Market prices fluctuate each turn

6. covert_operation: Execute spy missions
   - Points available: ${empire.covertPoints ?? 0}
   - Operations: send_spy (5 points), demoralize_troops (10), bombing_operations (15), setup_coup (30)

7. fund_research: Invest in technology
   - Points available: ${empire.researchPoints ?? 0}
   - Branches: military, defense, propulsion, stealth, economy, biotech

8. upgrade_units: Enhance unit stats
   - Upgrade levels: 1 (10% boost), 2 (20% boost)
   - Requires credits and research progress

9. do_nothing: Pass turn (saves resources)

Choose the action that BEST advances your strategic position this turn.`;
}

// ============================================
// COMPLETE PROMPT BUILDER
// ============================================

/**
 * Build complete message array for LLM request.
 */
export function buildDecisionPrompt(
  persona: BotPersona,
  context: BotDecisionContext
): LlmMessage[] {
  return [
    {
      role: "system",
      content: buildSystemPrompt(persona, context),
    },
    {
      role: "user",
      content: buildUserPrompt(context),
    },
  ];
}

// ============================================
// RESPONSE SCHEMA (for documentation)
// ============================================

export const EXPECTED_RESPONSE_SCHEMA = {
  thinking: "string (2-3 sentences explaining strategic reasoning)",
  decision: {
    type: "Decision type name",
    "...params": "Type-specific parameters (e.g., targetId, quantity, forces)",
  },
  message: "string (100-200 chars, in-character communication)",
};

/**
 * Example expected response:
 * {
 *   "thinking": "Empire Gamma is weak and has valuable ore sectors. Attacking now while they're distracted by a war with Delta will expand my territory significantly.",
 *   "decision": {
 *     "type": "attack",
 *     "targetId": "uuid-gamma",
 *     "forces": {
 *       "soldiers": 500,
 *       "fighters": 50,
 *       "lightCruisers": 10,
 *       "heavyCruisers": 5,
 *       "carriers": 2,
 *       "stations": 0
 *     }
 *   },
 *   "message": "Your defenses crumble before me, Gamma. Surrender your ore worlds and I may show mercy."
 * }
 */

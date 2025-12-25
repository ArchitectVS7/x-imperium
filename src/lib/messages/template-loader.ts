/**
 * Message Template Loader (M8)
 *
 * Loads and selects message templates for bot personas.
 * Handles template loading, variable substitution, and
 * prevents template repetition.
 *
 * @see docs/MILESTONES.md Milestone 8
 */

import { promises as fs } from "fs";
import path from "path";
import type {
  Persona,
  PersonaTemplates,
  MessageTrigger,
  MessageContext,
  GeneratedMessage,
  MessageChannel,
  BotArchetype,
} from "./types";
import { TRIGGER_TO_TEMPLATE_KEY } from "./types";

// =============================================================================
// CONFIGURATION
// =============================================================================

const DATA_DIR = path.join(process.cwd(), "data");
const PERSONAS_FILE = path.join(DATA_DIR, "personas.json");
const TEMPLATES_DIR = path.join(DATA_DIR, "templates");

// Archetype to directory mapping
const ARCHETYPE_DIRS: Record<BotArchetype, string> = {
  warlord: "warlord",
  diplomat: "diplomats",
  merchant: "merchants",
  schemer: "schemers",
  turtle: "turtle",
  blitzkrieg: "blitzkrieg",
  tech_rush: "tech_rush",
  opportunist: "opportunist",
};

// =============================================================================
// CACHING
// =============================================================================

let personasCache: Persona[] | null = null;
const templatesCache = new Map<string, PersonaTemplates>();
const recentTemplates = new Map<string, Set<string>>();

// =============================================================================
// PERSONA LOADING
// =============================================================================

/**
 * Load all personas from data/personas.json
 */
export async function loadPersonas(): Promise<Persona[]> {
  if (personasCache) return personasCache;

  try {
    const content = await fs.readFile(PERSONAS_FILE, "utf-8");
    personasCache = JSON.parse(content) as Persona[];
    return personasCache;
  } catch {
    console.error("Failed to load personas.json");
    return [];
  }
}

/**
 * Get a persona by ID
 */
export async function getPersona(personaId: string): Promise<Persona | null> {
  const personas = await loadPersonas();
  return personas.find((p) => p.id === personaId) ?? null;
}

/**
 * Get all personas of a specific archetype
 */
export async function getPersonasByArchetype(
  archetype: BotArchetype
): Promise<Persona[]> {
  const personas = await loadPersonas();
  return personas.filter((p) => p.archetype === archetype);
}

/**
 * Select a random persona for a given archetype
 */
export async function selectRandomPersona(
  archetype: BotArchetype
): Promise<Persona | null> {
  const personas = await getPersonasByArchetype(archetype);
  if (personas.length === 0) return null;
  return personas[Math.floor(Math.random() * personas.length)] ?? null;
}

// =============================================================================
// TEMPLATE LOADING
// =============================================================================

/**
 * Load templates for a specific persona
 */
export async function loadPersonaTemplates(
  personaId: string,
  archetype: BotArchetype
): Promise<PersonaTemplates | null> {
  const cacheKey = personaId;
  if (templatesCache.has(cacheKey)) {
    return templatesCache.get(cacheKey)!;
  }

  const archetypeDir = ARCHETYPE_DIRS[archetype];
  const templatePath = path.join(
    TEMPLATES_DIR,
    archetypeDir,
    `${personaId}.json`
  );

  try {
    const content = await fs.readFile(templatePath, "utf-8");
    const templates = JSON.parse(content) as PersonaTemplates;
    templatesCache.set(cacheKey, templates);
    return templates;
  } catch {
    // Template file not found - use fallback
    return null;
  }
}

// =============================================================================
// FALLBACK TEMPLATES
// =============================================================================

/**
 * Generic fallback templates when persona-specific ones aren't available
 */
const FALLBACK_TEMPLATES: Record<MessageTrigger, string[]> = {
  greeting: [
    "Greetings, {empire_name}. I look forward to our... interactions.",
    "I am aware of your empire, {empire_name}. Let us see what develops.",
  ],
  battle_taunt: [
    "Prepare yourself, {empire_name}. War is coming.",
    "Your forces will fall before mine, {empire_name}.",
  ],
  victory_gloat: [
    "Victory is mine, {empire_name}. Learn from your defeat.",
    "As expected, {empire_name}. You were no match for me.",
  ],
  defeat: [
    "You have won this battle, {empire_name}. But the war continues.",
    "A setback, nothing more. We shall meet again, {empire_name}.",
  ],
  trade_offer: [
    "I propose a trade, {empire_name}. Mutual benefit awaits.",
    "Let us exchange resources, {empire_name}. A fair deal for both.",
  ],
  alliance_proposal: [
    "Consider an alliance, {empire_name}. Together we are stronger.",
    "I extend my hand in alliance, {empire_name}. What say you?",
  ],
  betrayal: [
    "Circumstances have changed, {empire_name}. Our alliance is over.",
    "I must follow my own path now, {empire_name}. Nothing personal.",
  ],
  covert_detected: [
    "Your spies were discovered, {empire_name}. A foolish move.",
    "Did you think I wouldn't notice your agents, {empire_name}?",
  ],
  tribute_demand: [
    "Pay tribute, {empire_name}, or face the consequences.",
    "Submit your tribute now, {empire_name}. My patience wears thin.",
  ],
  threat_warning: [
    "Consider this a warning, {empire_name}. Do not test me.",
    "Tread carefully, {empire_name}. I am watching.",
  ],
  retreat: [
    "I withdraw for now, {empire_name}. This is not over.",
    "A tactical retreat. We shall meet again.",
  ],
  eliminated: [
    "My empire falls... but remember my name, {empire_name}.",
    "This is the end for me. Farewell, {empire_name}.",
  ],
  endgame: [
    "Turn {turn}. The final hour approaches.",
    "The endgame is here. Let us see who prevails.",
  ],
  broadcast_shout: [
    "Hear me, all empires! Great changes are coming!",
    "A message to all: the galaxy will remember this day.",
  ],
  casual_message: [
    "The affairs of empire occupy my thoughts today.",
    "Another turn, another opportunity. How fare you, {empire_name}?",
  ],
};

// =============================================================================
// TEMPLATE SELECTION
// =============================================================================

/**
 * Select a template that hasn't been used recently
 */
function selectNonRepeatingTemplate(
  templates: string[],
  personaId: string,
  trigger: MessageTrigger
): { template: string; templateId: string } {
  // Guard: templates should never be empty
  if (templates.length === 0) {
    return { template: "...", templateId: `${personaId}:${trigger}:fallback` };
  }

  const recentKey = `${personaId}:${trigger}`;
  const recent = recentTemplates.get(recentKey) ?? new Set<string>();

  // Find templates not recently used
  const available = templates.filter((_, idx) => !recent.has(String(idx)));

  // If all used, clear history and use any
  if (available.length === 0) {
    recentTemplates.set(recentKey, new Set<string>());
    const idx = Math.floor(Math.random() * templates.length);
    recentTemplates.get(recentKey)!.add(String(idx));
    const template = templates[idx]!;
    return { template, templateId: `${personaId}:${trigger}:${idx}` };
  }

  // Select random from available
  const selectedTemplate = available[Math.floor(Math.random() * available.length)]!;
  const idx = templates.indexOf(selectedTemplate);
  recent.add(String(idx));
  recentTemplates.set(recentKey, recent);

  return { template: selectedTemplate, templateId: `${personaId}:${trigger}:${idx}` };
}

/**
 * Substitute variables in a template
 */
function substituteVariables(template: string, context: MessageContext): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = context[key];
    if (value !== undefined) {
      return String(value);
    }
    return match; // Keep placeholder if no value
  });
}

// =============================================================================
// MESSAGE GENERATION
// =============================================================================

/**
 * Generate a message for a persona based on a trigger
 */
export async function generateMessage(
  personaId: string,
  archetype: BotArchetype,
  trigger: MessageTrigger,
  context: MessageContext = {}
): Promise<GeneratedMessage> {
  // Load persona templates
  const personaTemplates = await loadPersonaTemplates(personaId, archetype);
  const templateKey = TRIGGER_TO_TEMPLATE_KEY[trigger];

  // Get templates for this trigger
  let templates: string[];
  if (
    personaTemplates &&
    personaTemplates.templates[templateKey as keyof typeof personaTemplates.templates]
  ) {
    templates = personaTemplates.templates[
      templateKey as keyof typeof personaTemplates.templates
    ] as string[];
  } else {
    templates = FALLBACK_TEMPLATES[trigger];
  }

  // Select non-repeating template
  const { template, templateId } = selectNonRepeatingTemplate(
    templates,
    personaId,
    trigger
  );

  // Substitute variables
  const content = substituteVariables(template, context);

  // Determine channel
  const channel: MessageChannel =
    trigger === "broadcast_shout" ? "broadcast" : "direct";

  return {
    content,
    templateId,
    trigger,
    channel,
  };
}

/**
 * Generate a message with persona lookup
 */
export async function generateMessageForBot(
  personaId: string,
  trigger: MessageTrigger,
  context: MessageContext = {}
): Promise<GeneratedMessage | null> {
  const persona = await getPersona(personaId);
  if (!persona) return null;

  return generateMessage(personaId, persona.archetype, trigger, context);
}

// =============================================================================
// EXPORTS
// =============================================================================

export { FALLBACK_TEMPLATES };

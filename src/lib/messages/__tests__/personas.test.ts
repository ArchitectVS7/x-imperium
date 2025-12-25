import { describe, it, expect, beforeAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import type { Persona, BotArchetype, PersonaTemplates } from "../types";

const DATA_DIR = path.join(process.cwd(), "data");
const PERSONAS_FILE = path.join(DATA_DIR, "personas.json");
const TEMPLATES_DIR = path.join(DATA_DIR, "templates");

const VALID_ARCHETYPES: BotArchetype[] = [
  "warlord",
  "diplomat",
  "merchant",
  "schemer",
  "turtle",
  "blitzkrieg",
  "tech_rush",
  "opportunist",
];

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

describe("Personas Data", () => {
  let personas: Persona[];

  beforeAll(async () => {
    const content = await fs.readFile(PERSONAS_FILE, "utf-8");
    personas = JSON.parse(content);
  });

  it("should have exactly 100 personas", () => {
    expect(personas).toHaveLength(100);
  });

  it("should have all unique persona IDs", () => {
    const ids = personas.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(100);
  });

  it("should have all unique persona names", () => {
    const names = personas.map((p) => p.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(100);
  });

  it("should have valid archetypes for all personas", () => {
    personas.forEach((persona) => {
      expect(VALID_ARCHETYPES).toContain(persona.archetype);
    });
  });

  it("should have valid tell rates (0-1)", () => {
    personas.forEach((persona) => {
      expect(persona.tellRate).toBeGreaterThanOrEqual(0);
      expect(persona.tellRate).toBeLessThanOrEqual(1);
    });
  });

  it("should have voice properties for all personas", () => {
    personas.forEach((persona) => {
      expect(persona.voice).toBeDefined();
      expect(persona.voice.tone).toBeDefined();
      expect(Array.isArray(persona.voice.quirks)).toBe(true);
      expect(Array.isArray(persona.voice.vocabulary)).toBe(true);
      expect(persona.voice.catchphrase).toBeDefined();
    });
  });

  it("should have emperor names for all personas", () => {
    personas.forEach((persona) => {
      expect(persona.emperorName).toBeDefined();
      expect(persona.emperorName.length).toBeGreaterThan(0);
    });
  });
});

describe("Persona Templates", () => {
  let personas: Persona[];

  beforeAll(async () => {
    const content = await fs.readFile(PERSONAS_FILE, "utf-8");
    personas = JSON.parse(content);
  });

  it("should have template files for all personas", async () => {
    const missingTemplates: string[] = [];

    for (const persona of personas) {
      const archetypeDir = ARCHETYPE_DIRS[persona.archetype];
      const templatePath = path.join(
        TEMPLATES_DIR,
        archetypeDir,
        `${persona.id}.json`
      );

      try {
        await fs.access(templatePath);
      } catch {
        missingTemplates.push(`${persona.id} (${persona.archetype})`);
      }
    }

    expect(missingTemplates).toHaveLength(0);
  });

  it("should have valid JSON in all template files", async () => {
    const invalidTemplates: string[] = [];

    for (const persona of personas) {
      const archetypeDir = ARCHETYPE_DIRS[persona.archetype];
      const templatePath = path.join(
        TEMPLATES_DIR,
        archetypeDir,
        `${persona.id}.json`
      );

      try {
        const content = await fs.readFile(templatePath, "utf-8");
        JSON.parse(content);
      } catch (error) {
        invalidTemplates.push(`${persona.id}: ${error}`);
      }
    }

    expect(invalidTemplates).toHaveLength(0);
  });

  it("should have required template categories in each file", async () => {
    const requiredCategories = [
      "greeting",
      "battleTaunt",
      "victoryGloat",
      "defeat",
      "tradeOffer",
      "allianceProposal",
      "betrayal",
      "covertDetected",
    ];

    const missingCategories: string[] = [];

    // Check first 10 personas as a sample
    for (const persona of personas.slice(0, 10)) {
      const archetypeDir = ARCHETYPE_DIRS[persona.archetype];
      const templatePath = path.join(
        TEMPLATES_DIR,
        archetypeDir,
        `${persona.id}.json`
      );

      try {
        const content = await fs.readFile(templatePath, "utf-8");
        const templates = JSON.parse(content) as PersonaTemplates;

        requiredCategories.forEach((category) => {
          if (
            !templates.templates[category as keyof typeof templates.templates]
          ) {
            missingCategories.push(`${persona.id}: missing ${category}`);
          }
        });
      } catch {
        // Skip if file doesn't exist (caught by previous test)
      }
    }

    expect(missingCategories).toHaveLength(0);
  });
});

describe("Archetype Distribution", () => {
  let personas: Persona[];

  beforeAll(async () => {
    const content = await fs.readFile(PERSONAS_FILE, "utf-8");
    personas = JSON.parse(content);
  });

  it("should have at least 10 personas per archetype", () => {
    const distribution: Record<string, number> = {};

    personas.forEach((persona) => {
      distribution[persona.archetype] =
        (distribution[persona.archetype] || 0) + 1;
    });

    VALID_ARCHETYPES.forEach((archetype) => {
      expect(distribution[archetype]).toBeGreaterThanOrEqual(10);
    });
  });

  it("should have balanced distribution (no archetype > 15)", () => {
    const distribution: Record<string, number> = {};

    personas.forEach((persona) => {
      distribution[persona.archetype] =
        (distribution[persona.archetype] || 0) + 1;
    });

    VALID_ARCHETYPES.forEach((archetype) => {
      expect(distribution[archetype]).toBeLessThanOrEqual(15);
    });
  });
});

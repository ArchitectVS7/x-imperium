import { describe, it, expect } from "vitest";
import {
  TRIGGER_TO_TEMPLATE_KEY,
  type MessageTrigger,
  type BotArchetype,
} from "../types";
import { FALLBACK_TEMPLATES } from "../template-loader";

describe("Message Types", () => {
  describe("TRIGGER_TO_TEMPLATE_KEY", () => {
    it("should map all trigger types to template keys", () => {
      const triggers: MessageTrigger[] = [
        "greeting",
        "battle_taunt",
        "victory_gloat",
        "defeat",
        "trade_offer",
        "alliance_proposal",
        "betrayal",
        "covert_detected",
        "tribute_demand",
        "threat_warning",
        "retreat",
        "eliminated",
        "endgame",
        "broadcast_shout",
        "casual_message",
      ];

      triggers.forEach((trigger) => {
        expect(TRIGGER_TO_TEMPLATE_KEY[trigger]).toBeDefined();
        expect(typeof TRIGGER_TO_TEMPLATE_KEY[trigger]).toBe("string");
      });
    });

    it("should have 15 trigger types", () => {
      expect(Object.keys(TRIGGER_TO_TEMPLATE_KEY)).toHaveLength(15);
    });
  });
});

describe("Fallback Templates", () => {
  it("should have templates for all trigger types", () => {
    const triggers: MessageTrigger[] = [
      "greeting",
      "battle_taunt",
      "victory_gloat",
      "defeat",
      "trade_offer",
      "alliance_proposal",
      "betrayal",
      "covert_detected",
      "tribute_demand",
      "threat_warning",
      "retreat",
      "eliminated",
      "endgame",
      "broadcast_shout",
      "casual_message",
    ];

    triggers.forEach((trigger) => {
      expect(FALLBACK_TEMPLATES[trigger]).toBeDefined();
      expect(Array.isArray(FALLBACK_TEMPLATES[trigger])).toBe(true);
      expect(FALLBACK_TEMPLATES[trigger].length).toBeGreaterThan(0);
    });
  });

  it("should have at least 2 templates per trigger for variety", () => {
    Object.entries(FALLBACK_TEMPLATES).forEach(([, templates]) => {
      expect(templates.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("should have templates that contain {empire_name} placeholder", () => {
    // Most templates should have empire_name placeholder
    const templatesWithPlaceholder = Object.values(FALLBACK_TEMPLATES)
      .flat()
      .filter((t) => t.includes("{empire_name}"));

    expect(templatesWithPlaceholder.length).toBeGreaterThan(20);
  });

  it("should have endgame templates with {turn} placeholder", () => {
    const endgameTemplates = FALLBACK_TEMPLATES.endgame;
    const hasPlaceholder = endgameTemplates.some((t) => t.includes("{turn}"));
    expect(hasPlaceholder).toBe(true);
  });
});

describe("Bot Archetypes", () => {
  it("should define 8 archetypes", () => {
    const archetypes: BotArchetype[] = [
      "warlord",
      "diplomat",
      "merchant",
      "schemer",
      "turtle",
      "blitzkrieg",
      "tech_rush",
      "opportunist",
    ];

    expect(archetypes).toHaveLength(8);
  });
});

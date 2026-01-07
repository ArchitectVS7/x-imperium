/**
 * M12: LLM Response Parser & Validator
 *
 * Parses JSON responses from LLM and validates:
 * - Structure (Zod schema)
 * - Decision legality (can afford, valid target, etc.)
 * - Message sanitization
 */

import { z } from "zod";
import type { BotDecision, BotDecisionContext } from "@/lib/bots/types";
import { UNIT_COSTS } from "@/lib/game/unit-config";
import { PLANET_COSTS } from "@/lib/game/constants";

// ============================================
// ZOD SCHEMAS
// ============================================

const ForcesSchema = z.object({
  soldiers: z.number().int().min(0),
  fighters: z.number().int().min(0),
  lightCruisers: z.number().int().min(0),
  heavyCruisers: z.number().int().min(0),
  carriers: z.number().int().min(0),
  stations: z.number().int().min(0),
});

const BotDecisionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("build_units"),
    unitType: z.enum([
      "soldiers",
      "fighters",
      "lightCruisers",
      "heavyCruisers",
      "carriers",
      "stations",
      "covertAgents",
    ]),
    quantity: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("buy_planet"),
    sectorType: z.enum([
      "food",
      "ore",
      "petroleum",
      "tourism",
      "urban",
      "education",
      "government",
      "research",
      "supply",
      "anti_pollution",
    ]),
  }),
  z.object({
    type: z.literal("attack"),
    targetId: z.string().uuid(),
    forces: ForcesSchema,
  }),
  z.object({
    type: z.literal("diplomacy"),
    action: z.enum(["propose_nap", "propose_alliance"]),
    targetId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("trade"),
    resource: z.enum(["food", "ore", "petroleum", "credits"]),
    quantity: z.number().int().positive(),
    action: z.enum(["buy", "sell"]),
  }),
  z.object({
    type: z.literal("do_nothing"),
  }),
  z.object({
    type: z.literal("craft_component"),
    resourceType: z.enum([
      // Tier 1
      "refined_metals",
      "fuel_cells",
      "polymers",
      "processed_food",
      "labor_units",
      // Tier 2
      "electronics",
      "armor_plating",
      "propulsion_units",
      "life_support",
      "weapons_grade_alloy",
      "targeting_arrays",
      "stealth_composites",
      "quantum_processors",
      // Tier 3
      "reactor_cores",
      "shield_generators",
      "warp_drives",
      "cloaking_devices",
      "ion_cannon_cores",
      "neural_interfaces",
      "singularity_containment",
      "bioweapon_synthesis",
      "nuclear_warheads",
    ]),
    quantity: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("accept_contract"),
    contractType: z.enum([
      // Tier 1
      "supply_run",
      "disruption",
      "salvage_op",
      "intel_gathering",
      // Tier 2
      "intimidation",
      "economic_warfare",
      "military_probe",
      "hostile_takeover",
      // Tier 3
      "kingslayer",
      "market_manipulation",
      "regime_change",
      "decapitation_strike",
      // Tier 4
      "proxy_war",
      "scorched_earth",
      "the_equalizer",
    ]),
    targetId: z.string().uuid().optional(),
  }),
  z.object({
    type: z.literal("purchase_black_market"),
    itemId: z.string(),
    quantity: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("covert_operation"),
    operation: z.enum([
      "send_spy",
      "insurgent_aid",
      "support_dissension",
      "demoralize_troops",
      "bombing_operations",
      "relations_spying",
      "take_hostages",
      "carriers_sabotage",
      "communications_spying",
      "setup_coup",
    ]),
    targetId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("fund_research"),
    branch: z.enum(["military", "defense", "propulsion", "stealth", "economy", "biotech"]),
    amount: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("upgrade_units"),
    unitType: z.enum([
      "soldiers",
      "fighters",
      "lightCruisers",
      "heavyCruisers",
      "carriers",
      "stations",
      "covertAgents",
    ]),
    level: z.union([z.literal(1), z.literal(2)]),
  }),
]);

const LlmResponseSchema = z.object({
  thinking: z.string().min(10).max(500),
  decision: BotDecisionSchema,
  message: z.string().min(10).max(500),
});

// ============================================
// PARSED RESPONSE TYPE
// ============================================

export interface ParsedLlmResponse {
  success: boolean;
  thinking?: string;
  decision?: BotDecision;
  message?: string;
  error?: string;
  fallbackReason?: string;
}

// ============================================
// PARSER
// ============================================

/**
 * Parse and validate LLM response JSON.
 *
 * @param rawContent - Raw LLM response content
 * @param context - Bot decision context for validation
 * @returns Parsed response with validation results
 */
export function parseLlmResponse(
  rawContent: string,
  context: BotDecisionContext
): ParsedLlmResponse {
  // Step 1: Extract JSON from response
  const jsonMatch = extractJson(rawContent);
  if (!jsonMatch) {
    return {
      success: false,
      error: "No valid JSON found in LLM response",
      fallbackReason: "invalid_json_format",
    };
  }

  // Step 2: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch);
  } catch (error) {
    return {
      success: false,
      error: `JSON parse error: ${error instanceof Error ? error.message : "unknown"}`,
      fallbackReason: "json_parse_error",
    };
  }

  // Step 3: Validate schema with Zod
  const validation = LlmResponseSchema.safeParse(parsed);
  if (!validation.success) {
    return {
      success: false,
      error: `Schema validation failed: ${validation.error.message}`,
      fallbackReason: "schema_validation_failed",
    };
  }

  const { thinking, decision, message } = validation.data;

  // Step 4: Validate decision legality
  const legalityCheck = validateDecisionLegality(decision, context);
  if (!legalityCheck.legal) {
    return {
      success: false,
      error: `Illegal decision: ${legalityCheck.reason}`,
      fallbackReason: "illegal_decision",
      thinking,
      decision,
      message,
    };
  }

  // Step 5: Sanitize message
  const sanitizedMessage = sanitizeMessage(message);

  return {
    success: true,
    thinking,
    decision,
    message: sanitizedMessage,
  };
}

/**
 * Extract JSON from LLM response (handles markdown code blocks).
 */
function extractJson(content: string): string | null {
  // Try to find JSON in code blocks first
  const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1];
  }

  // Try to find raw JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch && jsonMatch[0]) {
    return jsonMatch[0];
  }

  return null;
}

/**
 * Validate that the decision is legal given current game state.
 */
function validateDecisionLegality(
  decision: BotDecision,
  context: BotDecisionContext
): { legal: boolean; reason?: string } {
  const { empire, currentTurn, protectionTurns, availableTargets } = context;

  switch (decision.type) {
    case "build_units": {
      const cost = UNIT_COSTS[decision.unitType] * decision.quantity;
      if (empire.credits < cost) {
        return {
          legal: false,
          reason: `Cannot afford ${decision.quantity}x ${decision.unitType} (cost: ${cost}, have: ${empire.credits})`,
        };
      }
      break;
    }

    case "buy_planet": {
      const cost = PLANET_COSTS[decision.sectorType] * (1 + empire.sectorCount * 0.05);
      if (empire.credits < cost) {
        return {
          legal: false,
          reason: `Cannot afford ${decision.sectorType} sector (cost: ${Math.round(cost)}, have: ${empire.credits})`,
        };
      }
      break;
    }

    case "attack": {
      // Check protection period
      if (currentTurn <= protectionTurns) {
        return {
          legal: false,
          reason: `Cannot attack during protection period (ends turn ${protectionTurns})`,
        };
      }

      // Check target exists
      const target = availableTargets.find((t) => t.id === decision.targetId);
      if (!target) {
        return {
          legal: false,
          reason: `Target ${decision.targetId} not found`,
        };
      }

      // Check treaty
      if (target.hasTreaty) {
        return {
          legal: false,
          reason: `Cannot attack ${target.name} - active treaty exists`,
        };
      }

      // Check has enough forces
      const { forces } = decision;
      if (
        forces.soldiers > (empire.soldiers ?? 0) ||
        forces.fighters > (empire.fighters ?? 0) ||
        forces.lightCruisers > (empire.lightCruisers ?? 0) ||
        forces.heavyCruisers > (empire.heavyCruisers ?? 0) ||
        forces.carriers > (empire.carriers ?? 0) ||
        forces.stations > (empire.stations ?? 0)
      ) {
        return {
          legal: false,
          reason: "Insufficient units for attack forces",
        };
      }

      // Check forces are not zero
      const totalForces = Object.values(forces).reduce((sum, val) => sum + val, 0);
      if (totalForces === 0) {
        return {
          legal: false,
          reason: "Cannot attack with zero forces",
        };
      }
      break;
    }

    case "diplomacy": {
      const target = availableTargets.find((t) => t.id === decision.targetId);
      if (!target) {
        return {
          legal: false,
          reason: `Target ${decision.targetId} not found`,
        };
      }
      if (target.hasTreaty) {
        return {
          legal: false,
          reason: `${target.name} already has an active treaty`,
        };
      }
      break;
    }

    case "fund_research": {
      if ((empire.researchPoints ?? 0) < decision.amount) {
        return {
          legal: false,
          reason: `Insufficient research points (have: ${empire.researchPoints ?? 0}, need: ${decision.amount})`,
        };
      }
      break;
    }

    case "covert_operation": {
      // Basic covert points check (detailed costs in covert-service)
      if ((empire.covertPoints ?? 0) < 5) {
        return {
          legal: false,
          reason: "Insufficient covert points for any operation",
        };
      }
      break;
    }

    // Other decision types are legal by default (trade, do_nothing, etc.)
  }

  return { legal: true };
}

/**
 * Sanitize message content.
 */
function sanitizeMessage(message: string): string {
  // Trim and limit length
  let sanitized = message.trim().substring(0, 500);

  // Remove profanity (basic filter - expand as needed)
  const profanityWords = ["fuck", "shit", "damn", "ass", "bitch"]; // Placeholder
  for (const word of profanityWords) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    sanitized = sanitized.replace(regex, "***");
  }

  // Remove special characters that could break display
  sanitized = sanitized.replace(/[<>]/g, "");

  // Ensure minimum length
  if (sanitized.length < 10) {
    sanitized = "..."; // Fallback for empty messages
  }

  return sanitized;
}

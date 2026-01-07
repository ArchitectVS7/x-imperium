/**
 * M12: LLM Pre-Computation Orchestrator
 *
 * Asynchronously computes next turn's bot decisions in the background while
 * the player is planning their move. This enables instant (<2s) turn processing.
 *
 * Flow:
 * 1. Player is on Turn N (planning)
 * 2. Background: preComputeNextTurnDecisions(gameId, N+1)
 * 3. For each Tier 1 bot: call LLM → parse → cache
 * 4. Player clicks END TURN
 * 5. Turn processing retrieves cached decisions (instant)
 */

import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { empires, type Empire, type Sector } from "@/lib/db/schema";
import type { BotDecisionContext } from "@/lib/bots/types";
import { buildDecisionPrompt } from "./prompts/tier1-prompt";
import { callLlmWithFailover } from "./client";
import { parseLlmResponse } from "./response-parser";
import { saveCachedDecision } from "./cache";
import { logLlmCall } from "./cost-tracker";
import { isCallAllowed, recordCall } from "./rate-limiter";
import { TIER1_BOT_CONFIG } from "./constants";

// Load personas
import personas from "@/data/personas.json";

// ============================================
// PRE-COMPUTATION
// ============================================

/**
 * Pre-compute LLM decisions for all Tier 1 bots for the next turn.
 * This runs asynchronously in the background during the player's turn.
 *
 * @param gameId - The game ID
 * @param nextTurn - The turn to pre-compute for (usually currentTurn + 1)
 * @returns Summary of pre-computation results
 */
export async function preComputeNextTurnDecisions(
  gameId: string,
  nextTurn: number
): Promise<{
  success: number;
  failed: number;
  skipped: number;
  totalCost: number;
}> {
  const startTime = Date.now();
  console.log(
    `[LLM Pre-Compute] Starting for game ${gameId}, turn ${nextTurn}...`
  );

  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    totalCost: 0,
  };

  try {
    // Step 1: Load game data
    const game = await db.query.games.findFirst({
      where: eq(empires.gameId, gameId),
    });

    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }

    // Step 2: Load all Tier 1 LLM bots
    const tier1Bots = await db.query.empires.findMany({
      where: and(
        eq(empires.gameId, gameId),
        eq(empires.type, "bot"),
        eq(empires.botTier, "tier1_llm"),
        eq(empires.llmEnabled, true),
        eq(empires.isEliminated, false)
      ),
      with: {
        sectors: true,
      },
    });

    if (tier1Bots.length === 0) {
      console.log("[LLM Pre-Compute] No Tier 1 LLM bots found");
      return results;
    }

    console.log(
      `[LLM Pre-Compute] Found ${tier1Bots.length} Tier 1 LLM bots to process`
    );

    // Step 3: Load all targets (for context)
    const allEmpires = await db.query.empires.findMany({
      where: and(
        eq(empires.gameId, gameId),
        eq(empires.isEliminated, false)
      ),
    });

    // Step 4: Process in batches of 5 (respects rate limits)
    const batchSize = 5;
    for (let i = 0; i < tier1Bots.length; i += batchSize) {
      const batch = tier1Bots.slice(i, i + batchSize);

      // Process batch in parallel
      const batchPromises = batch.map((bot) =>
        processOneBotLLMDecision(bot, allEmpires, gameId, nextTurn).catch(
          (error) => {
            console.error(
              `[LLM Pre-Compute] Failed for bot ${bot.name}:`,
              error
            );
            results.failed++;
            return null;
          }
        )
      );

      const batchResults = await Promise.all(batchPromises);

      // Count results
      for (const result of batchResults) {
        if (result === null) {
          // Already counted as failed
        } else if (result === "skipped") {
          results.skipped++;
        } else {
          results.success++;
          results.totalCost += result.cost;
        }
      }

      // Delay between batches (500ms)
      if (i + batchSize < tier1Bots.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[LLM Pre-Compute] Completed in ${duration}ms. Success: ${results.success}, Failed: ${results.failed}, Skipped: ${results.skipped}, Cost: $${results.totalCost.toFixed(4)}`
    );

    return results;
  } catch (error) {
    console.error("[LLM Pre-Compute] Fatal error:", error);
    throw error;
  }
}

/**
 * Process a single bot's LLM decision.
 */
async function processOneBotLLMDecision(
  bot: Empire & { sectors?: Sector[] },
  allEmpires: Empire[],
  gameId: string,
  nextTurn: number
): Promise<{ cost: number } | "skipped"> {
  // Step 1: Check rate limits
  const rateCheck = isCallAllowed(gameId, 0.002); // Estimated cost
  if (!rateCheck.allowed) {
    console.warn(
      `[LLM Pre-Compute] Rate limit reached for ${bot.name}: ${rateCheck.reason}`
    );
    return "skipped";
  }

  // Step 2: Load persona
  const { getPersonaForBot } = await import("@/lib/bots/decision-engine");
  const persona = getPersonaForBot(bot, personas);
  if (!persona) {
    throw new Error(
      `No persona found for bot ${bot.name} (archetype: ${bot.botArchetype}, tier: ${bot.botTier})`
    );
  }

  // Step 3: Build decision context
  const context: BotDecisionContext = {
    empire: bot,
    sectors: bot.sectors ?? [],
    gameId,
    currentTurn: nextTurn,
    protectionTurns: 20, // TODO: Get from game settings
    difficulty: "normal", // TODO: Get from game
    availableTargets: allEmpires
      .filter((e) => e.id !== bot.id && !e.isEliminated)
      .map((e) => ({
        id: e.id,
        name: e.name,
        networth: e.networth ?? 0,
        sectorCount: e.sectorCount ?? 0,
        isBot: e.type === "bot",
        isEliminated: e.isEliminated,
        militaryPower:
          (e.soldiers ?? 0) +
          (e.fighters ?? 0) * 3 +
          (e.lightCruisers ?? 0) * 5 +
          (e.heavyCruisers ?? 0) * 8 +
          (e.carriers ?? 0) * 12,
        hasTreaty: false, // TODO: Check treaties
      })),
    emotionalState: {
      state: "neutral", // TODO: Load from DB
      intensity: 0.5,
    },
    permanentGrudges: [], // TODO: Load from DB
  };

  // Step 4: Build prompt
  const messages = buildDecisionPrompt(persona, context);

  // Step 5: Call LLM
  const llmResponse = await callLlmWithFailover(
    {
      messages,
      temperature: TIER1_BOT_CONFIG.DECISION_TEMPERATURE,
      maxTokens: TIER1_BOT_CONFIG.DECISION_MAX_TOKENS,
    },
    "decision",
    "groq", // Primary provider
    ["together", "openai"], // Failover chain
    5000 // 5s timeout for async
  );

  // Step 6: Log call
  await logLlmCall(gameId, bot.id, nextTurn, "decision", llmResponse);

  // Step 7: Record cost
  recordCall(gameId, llmResponse.costUsd);

  // Step 8: Parse response
  if (llmResponse.status !== "completed") {
    throw new Error(
      `LLM call failed for ${bot.name}: ${llmResponse.error}`
    );
  }

  const parsed = parseLlmResponse(llmResponse.content, context);

  if (!parsed.success || !parsed.decision || !parsed.message) {
    throw new Error(
      `Failed to parse LLM response for ${bot.name}: ${parsed.error}`
    );
  }

  // Step 9: Save to cache
  await saveCachedDecision({
    gameId,
    empireId: bot.id,
    forTurn: nextTurn,
    decision: parsed.decision,
    reasoning: parsed.thinking ?? "",
    message: parsed.message,
    provider: llmResponse.provider,
    model: llmResponse.model,
    tokensUsed: llmResponse.usage.totalTokens,
    costUsd: llmResponse.costUsd,
  });

  console.log(
    `[LLM Pre-Compute] ✓ ${bot.name}: ${parsed.decision.type} (${llmResponse.usage.totalTokens} tokens, $${llmResponse.costUsd.toFixed(4)})`
  );

  return { cost: llmResponse.costUsd };
}

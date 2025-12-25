/**
 * M12: LLM Bot Constants (PRD Section 7.1-7.5)
 *
 * Defines rate limits, provider configuration, and cost tracking for Tier 1 LLM bots.
 * Implements the provider failover chain: Groq → Together → OpenAI
 */

// ============================================
// PROVIDER TYPES
// ============================================

export type LlmProvider = "groq" | "together" | "openai" | "anthropic";

export type LlmCallStatus = "pending" | "completed" | "failed" | "rate_limited";

export type LlmPurpose = "decision" | "message" | "strategy" | "analysis";

// ============================================
// RATE LIMITS (PRD 7.1)
// ============================================

export const RATE_LIMITS = {
  /** Maximum LLM calls per game */
  CALLS_PER_GAME: 5_000,

  /** Maximum LLM calls per turn */
  CALLS_PER_TURN: 50,

  /** Maximum LLM calls per hour */
  CALLS_PER_HOUR: 500,

  /** Daily spending cap in USD */
  DAILY_SPEND_CAP_USD: 50.0,

  /** Alert threshold (percentage of daily budget) */
  BUDGET_ALERT_THRESHOLD: 0.8, // 80%

  /** Maximum concurrent LLM requests */
  MAX_CONCURRENT_REQUESTS: 5,

  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT_MS: 30_000,

  /** Maximum retries per request */
  MAX_RETRIES: 3,

  /** Base delay between retries in milliseconds */
  RETRY_DELAY_MS: 1_000,
} as const;

// ============================================
// PROVIDER CONFIGURATION
// ============================================

export interface ProviderConfig {
  /** Provider identifier */
  id: LlmProvider;
  /** Display name */
  displayName: string;
  /** Default model to use */
  defaultModel: string;
  /** Fallback models in order of preference */
  fallbackModels: string[];
  /** Base URL for API */
  baseUrl: string;
  /** Environment variable name for API key */
  apiKeyEnvVar: string;
  /** Priority in failover chain (lower = tried first) */
  priority: number;
  /** Whether this provider is enabled */
  enabled: boolean;
  /** Cost per 1K input tokens in USD */
  inputCostPer1k: number;
  /** Cost per 1K output tokens in USD */
  outputCostPer1k: number;
  /** Maximum tokens per request */
  maxTokensPerRequest: number;
  /** Rate limit (requests per minute) */
  rateLimitRpm: number;
}

export const PROVIDER_CONFIGS: Record<LlmProvider, ProviderConfig> = {
  groq: {
    id: "groq",
    displayName: "Groq",
    defaultModel: "llama-3.1-70b-versatile",
    fallbackModels: ["llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyEnvVar: "GROQ_API_KEY",
    priority: 1, // Primary provider (fastest, cheapest)
    enabled: true,
    inputCostPer1k: 0.0005,
    outputCostPer1k: 0.001,
    maxTokensPerRequest: 8192,
    rateLimitRpm: 30,
  },

  together: {
    id: "together",
    displayName: "Together AI",
    defaultModel: "meta-llama/Llama-3.2-70B-Instruct-Turbo",
    fallbackModels: [
      "meta-llama/Llama-3.2-8B-Instruct-Turbo",
      "mistralai/Mixtral-8x7B-Instruct-v0.1",
    ],
    baseUrl: "https://api.together.xyz/v1",
    apiKeyEnvVar: "TOGETHER_API_KEY",
    priority: 2, // Secondary provider
    enabled: true,
    inputCostPer1k: 0.0009,
    outputCostPer1k: 0.0009,
    maxTokensPerRequest: 8192,
    rateLimitRpm: 60,
  },

  openai: {
    id: "openai",
    displayName: "OpenAI",
    defaultModel: "gpt-4o-mini",
    fallbackModels: ["gpt-3.5-turbo"],
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnvVar: "OPENAI_API_KEY",
    priority: 3, // Tertiary provider (most reliable)
    enabled: true,
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
    maxTokensPerRequest: 16384,
    rateLimitRpm: 500,
  },

  anthropic: {
    id: "anthropic",
    displayName: "Anthropic",
    defaultModel: "claude-3-haiku-20240307",
    fallbackModels: ["claude-3-sonnet-20240229"],
    baseUrl: "https://api.anthropic.com/v1",
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    priority: 4, // Reserved for future use
    enabled: false, // Not in initial failover chain
    inputCostPer1k: 0.00025,
    outputCostPer1k: 0.00125,
    maxTokensPerRequest: 4096,
    rateLimitRpm: 100,
  },
};

// ============================================
// FAILOVER CHAIN
// ============================================

/**
 * Provider failover chain in order of preference.
 * When primary fails, try next provider in chain.
 */
export const FAILOVER_CHAIN: LlmProvider[] = ["groq", "together", "openai"];

/**
 * Maximum number of failover attempts before giving up.
 */
export const MAX_FAILOVER_ATTEMPTS = FAILOVER_CHAIN.length;

// ============================================
// TIER 1 BOT CONFIGURATION
// ============================================

export const TIER1_BOT_CONFIG = {
  /** Number of bots upgraded to Tier 1 (LLM-powered) */
  BOT_COUNT: 10,

  /** Probability of using LLM for decision (vs. fallback to Tier 2) */
  LLM_DECISION_PROBABILITY: 0.9,

  /** Probability of using LLM for message generation */
  LLM_MESSAGE_PROBABILITY: 0.8,

  /** Maximum tokens for decision prompts */
  DECISION_MAX_TOKENS: 1024,

  /** Maximum tokens for message prompts */
  MESSAGE_MAX_TOKENS: 512,

  /** Temperature for decision-making (lower = more deterministic) */
  DECISION_TEMPERATURE: 0.3,

  /** Temperature for message generation (higher = more creative) */
  MESSAGE_TEMPERATURE: 0.7,

  /** System prompt version for tracking */
  SYSTEM_PROMPT_VERSION: "1.0.0",
} as const;

// ============================================
// ASYNC PROCESSING
// ============================================

export const ASYNC_CONFIG = {
  /** Process LLM decisions asynchronously for next turn */
  ASYNC_DECISIONS_ENABLED: true,

  /** Maximum time to wait for async decisions before turn processing */
  ASYNC_DECISION_TIMEOUT_MS: 5_000,

  /** Queue size for pending LLM requests */
  REQUEST_QUEUE_SIZE: 100,

  /** Batch size for processing LLM requests */
  BATCH_SIZE: 10,

  /** Interval between batch processing in milliseconds */
  BATCH_INTERVAL_MS: 500,
} as const;

// ============================================
// COST CALCULATION
// ============================================

/**
 * Calculate the cost of an LLM request.
 *
 * @param provider - The LLM provider used
 * @param inputTokens - Number of input/prompt tokens
 * @param outputTokens - Number of output/completion tokens
 * @returns Cost in USD
 */
export function calculateRequestCost(
  provider: LlmProvider,
  inputTokens: number,
  outputTokens: number
): number {
  const config = PROVIDER_CONFIGS[provider];
  const inputCost = (inputTokens / 1000) * config.inputCostPer1k;
  const outputCost = (outputTokens / 1000) * config.outputCostPer1k;
  return inputCost + outputCost;
}

/**
 * Estimate cost based on character count (rough estimate).
 * Assumes ~4 characters per token.
 *
 * @param provider - The LLM provider
 * @param inputChars - Approximate input character count
 * @param expectedOutputChars - Expected output character count
 * @returns Estimated cost in USD
 */
export function estimateCost(
  provider: LlmProvider,
  inputChars: number,
  expectedOutputChars: number
): number {
  const inputTokens = Math.ceil(inputChars / 4);
  const outputTokens = Math.ceil(expectedOutputChars / 4);
  return calculateRequestCost(provider, inputTokens, outputTokens);
}

// ============================================
// RATE LIMIT HELPERS
// ============================================

export interface RateLimitState {
  callsThisGame: number;
  callsThisTurn: number;
  callsThisHour: number;
  spendToday: number;
  lastHourStart: Date;
  lastDayStart: Date;
}

/**
 * Check if a request would exceed any rate limits.
 *
 * @param state - Current rate limit state
 * @param estimatedCost - Estimated cost of the request
 * @returns Object with allowed flag and reason if blocked
 */
export function checkRateLimits(
  state: RateLimitState,
  estimatedCost: number = 0
): { allowed: boolean; reason?: string } {
  if (state.callsThisGame >= RATE_LIMITS.CALLS_PER_GAME) {
    return { allowed: false, reason: "Game call limit reached" };
  }

  if (state.callsThisTurn >= RATE_LIMITS.CALLS_PER_TURN) {
    return { allowed: false, reason: "Turn call limit reached" };
  }

  if (state.callsThisHour >= RATE_LIMITS.CALLS_PER_HOUR) {
    return { allowed: false, reason: "Hourly call limit reached" };
  }

  if (state.spendToday + estimatedCost > RATE_LIMITS.DAILY_SPEND_CAP_USD) {
    return { allowed: false, reason: "Daily spend cap reached" };
  }

  return { allowed: true };
}

/**
 * Check if budget alert should be triggered.
 *
 * @param spendToday - Amount spent today in USD
 * @returns True if alert should be triggered
 */
export function shouldTriggerBudgetAlert(spendToday: number): boolean {
  return (
    spendToday >=
    RATE_LIMITS.DAILY_SPEND_CAP_USD * RATE_LIMITS.BUDGET_ALERT_THRESHOLD
  );
}

/**
 * Create initial rate limit state.
 */
export function createInitialRateLimitState(): RateLimitState {
  const now = new Date();
  return {
    callsThisGame: 0,
    callsThisTurn: 0,
    callsThisHour: 0,
    spendToday: 0,
    lastHourStart: now,
    lastDayStart: now,
  };
}

/**
 * Update rate limit state after a request.
 *
 * @param state - Current state
 * @param cost - Cost of the request
 * @returns Updated state
 */
export function updateRateLimitState(
  state: RateLimitState,
  cost: number
): RateLimitState {
  const now = new Date();

  // Reset hourly counter if hour has passed
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const callsThisHour =
    state.lastHourStart < hourAgo ? 1 : state.callsThisHour + 1;
  const lastHourStart = state.lastHourStart < hourAgo ? now : state.lastHourStart;

  // Reset daily counter if day has passed
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const spendToday = state.lastDayStart < dayAgo ? cost : state.spendToday + cost;
  const lastDayStart = state.lastDayStart < dayAgo ? now : state.lastDayStart;

  return {
    callsThisGame: state.callsThisGame + 1,
    callsThisTurn: state.callsThisTurn + 1,
    callsThisHour,
    spendToday,
    lastHourStart,
    lastDayStart,
  };
}

/**
 * Reset turn-specific rate limit counters.
 */
export function resetTurnCounters(state: RateLimitState): RateLimitState {
  return {
    ...state,
    callsThisTurn: 0,
  };
}

// ============================================
// FALLBACK REASONS
// ============================================

export const FALLBACK_REASONS = {
  RATE_LIMITED: "rate_limited",
  TIMEOUT: "timeout",
  API_ERROR: "api_error",
  INVALID_RESPONSE: "invalid_response",
  PROVIDER_UNAVAILABLE: "provider_unavailable",
  BUDGET_EXCEEDED: "budget_exceeded",
  CONTENT_FILTERED: "content_filtered",
} as const;

export type FallbackReason = (typeof FALLBACK_REASONS)[keyof typeof FALLBACK_REASONS];

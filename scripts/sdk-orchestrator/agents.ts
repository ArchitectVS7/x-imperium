/**
 * Generic SDK Orchestrator - Agent System
 *
 * Multi-agent execution using Anthropic SDK.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { AgentConfig, Task, TaskGroup, ExecutionState } from "./types";

// =============================================================================
// CLIENT
// =============================================================================

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

// =============================================================================
// AGENT EXECUTION
// =============================================================================

export interface AgentResult {
  agentId: string;
  output: string;
  usage: { input: number; output: number };
  duration: number;
}

export async function runAgent(
  agent: AgentConfig,
  prompt: string,
  state: ExecutionState
): Promise<AgentResult> {
  const startTime = Date.now();
  const client = getClient();

  // Resolve system prompt (could be a file path)
  const systemPrompt = resolvePrompt(agent.systemPrompt);

  // Build the message
  const response = await client.messages.create({
    model: agent.model || "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  // Extract text response
  const output = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return {
    agentId: agent.id,
    output,
    usage: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    },
    duration: Date.now() - startTime,
  };
}

// =============================================================================
// PANEL DISCUSSION
// =============================================================================

export interface PanelResult {
  transcript: string;
  consensus: string;
  duration: number;
}

export async function runPanelDiscussion(
  agents: AgentConfig[],
  topic: string,
  rounds: number,
  state: ExecutionState
): Promise<PanelResult> {
  const startTime = Date.now();
  let transcript = `# Panel Discussion\n\n**Topic:** ${topic}\n\n`;
  let context = topic;

  for (let round = 1; round <= rounds; round++) {
    transcript += `## Round ${round}\n\n`;

    // Each agent responds (sequential for now, could parallelize)
    for (const agent of agents) {
      const prompt = `You are participating in a panel discussion.

Topic: ${topic}

Previous discussion:
${context}

Provide your perspective. Be direct. Challenge others if you disagree.
Keep your response concise (2-3 paragraphs max).`;

      const result = await runAgent(agent, prompt, state);
      transcript += `### ${agent.name} (${agent.role})\n\n${result.output}\n\n`;
      context += `\n\n${agent.name} said: ${result.output}`;
    }
  }

  // Synthesize
  const synthesisPrompt = `Summarize this panel discussion:

${transcript}

Provide:
1. Key points of agreement
2. Key points of disagreement
3. Final recommendation (if applicable)`;

  const synthesizer = agents[0]; // Use first agent as synthesizer
  const synthesisResult = await runAgent(
    { ...synthesizer, id: "synthesizer", name: "Synthesizer" },
    synthesisPrompt,
    state
  );

  transcript += `## Synthesis\n\n${synthesisResult.output}\n`;

  return {
    transcript,
    consensus: synthesisResult.output,
    duration: Date.now() - startTime,
  };
}

// =============================================================================
// TEMPLATE RESOLUTION
// =============================================================================

export function resolveTemplate(
  template: string,
  task: Task,
  group: TaskGroup,
  state: ExecutionState
): string {
  return template
    .replace(/\{\{task\.id\}\}/g, task.id)
    .replace(/\{\{task\.description\}\}/g, task.description)
    .replace(/\{\{group\.id\}\}/g, group.id)
    .replace(/\{\{group\.name\}\}/g, group.name)
    .replace(/\{\{context\}\}/g, Object.values(state.context).join("\n\n---\n\n"))
    .replace(/\{\{outputs\.(\w+)\}\}/g, (_, key) => {
      const output = state.outputs[key];
      return typeof output === "string" ? output : JSON.stringify(output);
    });
}

function resolvePrompt(prompt: string): string {
  // If it looks like a file path, try to load it
  if (prompt.endsWith(".md") || prompt.endsWith(".txt")) {
    try {
      const fs = require("fs");
      if (fs.existsSync(prompt)) {
        return fs.readFileSync(prompt, "utf-8");
      }
    } catch {
      // Not a file, use as-is
    }
  }
  return prompt;
}

// =============================================================================
// ANALYSIS HELPERS
// =============================================================================

export function analyzeReview(review: string): {
  hasCriticalIssues: boolean;
  hasHighIssues: boolean;
  isApproved: boolean;
  issues: Array<{ severity: string; description: string }>;
} {
  const issues: Array<{ severity: string; description: string }> = [];

  // Extract issues by severity
  const criticalMatches = review.match(/CRITICAL[:\s]+([^\n]+)/gi) || [];
  const highMatches = review.match(/HIGH[:\s]+([^\n]+)/gi) || [];
  const mediumMatches = review.match(/MEDIUM[:\s]+([^\n]+)/gi) || [];
  const lowMatches = review.match(/LOW[:\s]+([^\n]+)/gi) || [];

  criticalMatches.forEach((m) => issues.push({ severity: "CRITICAL", description: m }));
  highMatches.forEach((m) => issues.push({ severity: "HIGH", description: m }));
  mediumMatches.forEach((m) => issues.push({ severity: "MEDIUM", description: m }));
  lowMatches.forEach((m) => issues.push({ severity: "LOW", description: m }));

  return {
    hasCriticalIssues: criticalMatches.length > 0,
    hasHighIssues: highMatches.length > 0,
    isApproved: review.toLowerCase().includes("approved"),
    issues,
  };
}

export function analyzeQA(qa: string): {
  passed: boolean;
  verdict: string;
} {
  const passIndicators = ["pass", "approved", "success", "✅"];
  const failIndicators = ["fail", "rejected", "error", "❌"];

  const lower = qa.toLowerCase();
  const passed = passIndicators.some((p) => lower.includes(p)) && !failIndicators.some((f) => lower.includes(f));

  // Extract verdict line
  const verdictMatch = qa.match(/verdict[:\s]+([^\n]+)/i);
  const verdict = verdictMatch ? verdictMatch[1].trim() : passed ? "PASS" : "FAIL";

  return { passed, verdict };
}

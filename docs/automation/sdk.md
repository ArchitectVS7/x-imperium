 IDEA
    ↓
  ┌─────────────────────────────────────────┐
  │ PHASE 1: RESEARCH & VALIDATION          │
  ├─────────────────────────────────────────┤
  │ • Focus Group Agent Panel (5-10 personas)│
  │ • Market Research Agent                  │
  │ • Competitive Analysis Agent             │
  │ • Synthesis Agent → Go/No-Go Decision    │
  └─────────────────────────────────────────┘
    ↓
  ┌─────────────────────────────────────────┐
  │ PHASE 2: DESIGN REVIEW                  │
  ├─────────────────────────────────────────┤
  │ • Architect Agent                        │
  │ • Security Agent                         │
  │ • UX Agent                               │
  │ • Product Agent                          │
  │ • 10-Panel Engineering Meeting           │
  │ • Decision: Approved / Revise / Reject   │
  └─────────────────────────────────────────┘
    ↓
  ┌─────────────────────────────────────────┐
  │ PHASE 3: BUILD (per milestone/epic)     │
  ├─────────────────────────────────────────┤
  │ • Pre-Build Kickoff Meeting              │
  │ • Developer Agent (implements)           │
  │ • Reviewer Agent (adversarial)           │
  │ • QA Agent (tests)                       │
  │ • Post-Build QA Review                   │
  │ • Commit / Iterate                       │
  └─────────────────────────────────────────┘
    ↓
  ┌─────────────────────────────────────────┐
  │ PHASE 4: RELEASE PIPELINE               │
  ├─────────────────────────────────────────┤
  │ • Alpha Testing Agent                    │
  │ • Beta Testing Agent                     │
  │ • Release Candidate Review               │
  │ • Go-Live Decision                       │
  └─────────────────────────────────────────┘

  How to Evolve: Skills → SDK

  What We Built (Reusable)

  These artifacts transfer directly to SDK:

  | Asset             | Location                                    | SDK Use                          |
  |-------------------|---------------------------------------------|----------------------------------|
  | Developer prompt  | .claude/prompts/developer.md                | System prompt for dev agent      |
  | Reviewer prompt   | .claude/prompts/reviewer.md                 | System prompt for reviewer agent |
  | QA prompt         | .claude/prompts/qa.md                       | System prompt for QA agent       |
  | Milestone parser  | scripts/orchestrator/parse-milestones.ts    | Task selection logic             |
  | Validation script | scripts/orchestrator/validate-and-commit.ts | Quality gates                    |

  SDK Architecture

  // orchestrator.ts - The brain
  import Anthropic from "@anthropic-ai/sdk";
  import { readFileSync } from "fs";

  const client = new Anthropic();

  // Load our existing prompts
  const PROMPTS = {
    developer: readFileSync(".claude/prompts/developer.md", "utf-8"),
    reviewer: readFileSync(".claude/prompts/reviewer.md", "utf-8"),
    qa: readFileSync(".claude/prompts/qa.md", "utf-8"),
    // Add more personas...
    focusGroupUser: `You are a casual gamer. React to game features honestly...`,
    securityAuditor: `You are a paranoid security expert. Find vulnerabilities...`,
    architect: `You are a senior architect. Evaluate design decisions...`,
  };

  // Agent wrapper
  async function runAgent(
    persona: keyof typeof PROMPTS,
    task: string,
    context: string
  ): Promise<string> {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: PROMPTS[persona],
      messages: [
        { role: "user", content: `${context}\n\nTask: ${task}` }
      ],
    });

    return response.content[0].type === "text"
      ? response.content[0].text
      : "";
  }

  // Panel meeting - multiple agents discuss
  async function runPanelMeeting(
    topic: string,
    panelists: (keyof typeof PROMPTS)[],
    rounds: number = 2
  ): Promise<{ transcript: string; consensus: string }> {
    let transcript = `# Panel Meeting: ${topic}\n\n`;
    let context = topic;

    for (let round = 0; round < rounds; round++) {
      transcript += `## Round ${round + 1}\n\n`;

      // Each panelist responds (can parallelize with Promise.all)
      for (const persona of panelists) {
        const response = await runAgent(
          persona,
          `Respond to the discussion. Be direct. Challenge others if you disagree.`,
          context
        );
        transcript += `### ${persona}\n${response}\n\n`;
        context += `\n\n${persona} said: ${response}`;
      }
    }

    // Synthesis agent summarizes
    const consensus = await runAgent(
      "qa", // or a dedicated synthesizer
      "Summarize the panel discussion. What was agreed? What remains contested?",
      transcript
    );

    return { transcript, consensus };
  }

  // Milestone automation with multi-agent
  async function runMilestone(milestoneNumber: number) {
    const tasks = parseMilestones(); // Your existing parser

    for (const task of tasks.filter(t => t.milestone === milestoneNumber)) {
      console.log(`\n=== Task: ${task.id} ===\n`);

      // 1. Developer implements
      const implementation = await runAgent("developer", task.description,
        `PRD: ${readFileSync("docs/PRD.md", "utf-8")}`
      );

      // 2. Adversarial review (SEPARATE CONTEXT - this is what skills can't do)
      const review = await runAgent("reviewer",
        "Review this implementation. Find bugs, security issues, PRD violations.",
        implementation
      );

      // 3. Conditional: if issues found, loop back
      if (review.includes("CRITICAL") || review.includes("HIGH")) {
        const fix = await runAgent("developer",
          `Fix these issues:\n${review}`,
          implementation
        );
        // ... iterate until clean
      }

      // 4. QA validates
      const qaResult = await runAgent("qa",
        "Run quality gates and validate.",
        implementation
      );

      // 5. Commit or escalate
      if (qaResult.includes("PASS")) {
        execSync(`git add -A && git commit -m "M${milestoneNumber}: ${task.description}"`);
      } else {
        console.log("QA failed, logging to knowledge base...");
      }
    }
  }

  Your Focus Group / Engineering Panel

  // Example: 10-panel engineering review before build
  async function engineeringReview(feature: string) {
    const panel = [
      "architect",
      "securityAuditor",
      "developer",
      "qa",
      "productManager",
      "uxDesigner",
      "devOpsEngineer",
      "dataEngineer",
      "performanceEngineer",
      "accessibilityExpert"
    ];

    const { transcript, consensus } = await runPanelMeeting(
      `Should we build: ${feature}?`,
      panel,
      3 // 3 rounds of discussion
    );

    // Decision gate
    if (consensus.includes("APPROVED")) {
      return { proceed: true, transcript };
    } else {
      return { proceed: false, transcript, blockers: extractBlockers(consensus) };
    }
  }

  Migration Path

  | Phase   | What                             | Effort        |
  |---------|----------------------------------|---------------|
  | Now     | Test skill-based M7              | Already built |
  | Week 1  | Create SDK orchestrator skeleton | ~200 lines    |
  | Week 2  | Add multi-agent review loop      | ~100 lines    |
  | Week 3  | Add panel meeting capability     | ~150 lines    |
  | Week 4  | Add focus group simulation       | ~100 lines    |
  | Ongoing | Build persona library            | Per persona   |

  LangGraph vs Anthropic SDK

  | Aspect             | LangGraph                | Anthropic SDK          |
  |--------------------|--------------------------|------------------------|
  | Learning curve     | Steeper (graph concepts) | Lower (just API calls) |
  | Multi-model        | ✅ Any LLM               | ❌ Claude only         |
  | Tool use           | Complex                  | Native                 |
  | State management   | Built-in                 | You build it           |
  | Debugging          | Graph visualization      | Print statements       |
  | Your existing code | Rewrite needed           | Direct port            |

  My take: If you're Claude-focused (which this project is), SDK is simpler. LangGraph adds value when you need multi-model orchestration or complex state machines.
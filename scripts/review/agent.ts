import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface ReviewContext {
  diff: string;
  affectedFiles: string[];
  commitMessages: string[];
  prdContent: string;
  milestonesContent: string;
  existingPatterns: string[];
}

interface ReviewResult {
  overallAssessment: "approved" | "changes_requested" | "needs_discussion";
  prdCompliance: {
    score: number;
    findings: string[];
  };
  dependencyIssues: string[];
  testCoverage: {
    adequate: boolean;
    suggestions: string[];
  };
  patternConsistency: string[];
  blockers: string[];
  suggestions: string[];
}

export class IntelligentReviewAgent {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async gatherContext(prNumber: string): Promise<ReviewContext> {
    // Get PR diff
    let diff = "";
    try {
      diff = execSync(`gh pr diff ${prNumber}`, {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (error) {
      console.error("Failed to get PR diff:", error);
      diff = "Unable to fetch diff";
    }

    // Get affected files
    let affectedFiles: string[] = [];
    try {
      const filesOutput = execSync(
        `gh pr view ${prNumber} --json files --jq ".files[].path"`,
        { encoding: "utf-8" }
      );
      affectedFiles = filesOutput.split("\n").filter(Boolean);
    } catch (error) {
      console.error("Failed to get affected files:", error);
    }

    // Get commit messages
    let commitMessages: string[] = [];
    try {
      const commitsOutput = execSync(
        `gh pr view ${prNumber} --json commits --jq ".commits[].messageHeadline"`,
        { encoding: "utf-8" }
      );
      commitMessages = commitsOutput.split("\n").filter(Boolean);
    } catch (error) {
      console.error("Failed to get commit messages:", error);
    }

    // Load PRD and Milestones
    let prdContent = "";
    let milestonesContent = "";
    try {
      prdContent = fs.readFileSync("docs/PRD.md", "utf-8");
    } catch {
      prdContent = "PRD not found";
    }
    try {
      milestonesContent = fs.readFileSync("docs/MILESTONES.md", "utf-8");
    } catch {
      milestonesContent = "MILESTONES not found";
    }

    // Identify existing patterns from similar files
    const existingPatterns = this.extractPatterns(affectedFiles);

    return {
      diff,
      affectedFiles,
      commitMessages,
      prdContent,
      milestonesContent,
      existingPatterns,
    };
  }

  private extractPatterns(affectedFiles: string[]): string[] {
    const patterns: string[] = [];

    for (const file of affectedFiles.slice(0, 5)) {
      const dir = path.dirname(file);
      const ext = path.extname(file);

      try {
        if (!fs.existsSync(dir)) continue;

        const similarFiles = fs
          .readdirSync(dir)
          .filter((f) => f.endsWith(ext) && f !== path.basename(file))
          .slice(0, 2);

        for (const similar of similarFiles) {
          try {
            const content = fs.readFileSync(path.join(dir, similar), "utf-8");
            patterns.push(
              `Pattern from ${similar}:\n${content.slice(0, 500)}...`
            );
          } catch {
            // File not readable
          }
        }
      } catch {
        // Directory not accessible
      }
    }

    return patterns;
  }

  async performReview(context: ReviewContext): Promise<ReviewResult> {
    const systemPrompt = `You are an expert code reviewer for the X-Imperium project, a turn-based space strategy game.
Your role is to perform an INDEPENDENT, UNBIASED review of pull request changes.

You have access to:
1. The Product Requirements Document (PRD)
2. The Milestones document defining implementation requirements
3. Existing code patterns from the repository

Your review must assess:
1. **PRD Compliance**: Does this change implement what the PRD specifies? Are values, formulas, and behaviors correct?
2. **Dependency Analysis**: Are there any broken imports, missing files, or circular dependencies?
3. **Test Coverage**: Are the changes adequately tested? What tests are missing?
4. **Pattern Consistency**: Does the code follow established patterns in the codebase?
5. **Blockers**: Are there any issues that must be fixed before merging?

Be thorough but constructive. Point out specific issues with file paths and line numbers when possible.
Output your review as valid JSON only, with no additional text.`;

    const userPrompt = `Review this pull request:

## Commit Messages
${context.commitMessages.join("\n")}

## Affected Files
${context.affectedFiles.join("\n")}

## PRD (relevant sections)
${this.extractRelevantPRD(context.prdContent, context.affectedFiles)}

## Milestones (current milestone requirements)
${this.extractCurrentMilestone(context.milestonesContent)}

## Existing Code Patterns
${context.existingPatterns.slice(0, 3).join("\n\n")}

## Diff
\`\`\`diff
${context.diff.slice(0, 30000)}
\`\`\`

Provide your review as JSON with this exact structure:
{
  "overallAssessment": "approved" | "changes_requested" | "needs_discussion",
  "prdCompliance": { "score": number, "findings": string[] },
  "dependencyIssues": string[],
  "testCoverage": { "adequate": boolean, "suggestions": string[] },
  "patternConsistency": string[],
  "blockers": string[],
  "suggestions": string[]
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const content = response.content[0];
      if (!content || content.type !== "text") {
        throw new Error("Unexpected response type");
      }

      // Extract JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not parse review JSON");
      }

      return JSON.parse(jsonMatch[0]) as ReviewResult;
    } catch (error) {
      console.error("Review failed:", error);
      return {
        overallAssessment: "needs_discussion",
        prdCompliance: {
          score: 0,
          findings: ["Review could not be completed due to an error"],
        },
        dependencyIssues: [],
        testCoverage: { adequate: false, suggestions: [] },
        patternConsistency: [],
        blockers: ["Review error - manual review required"],
        suggestions: [],
      };
    }
  }

  private extractRelevantPRD(prd: string, files: string[]): string {
    const sections: string[] = [];

    if (files.some((f) => f.includes("networth"))) {
      const networthSection = prd.match(/### 4\.5 Networth[\s\S]*?(?=###|$)/);
      if (networthSection) sections.push(networthSection[0]);
    }

    if (files.some((f) => f.includes("planet"))) {
      const planetSection = prd.match(/## 5\. Planet System[\s\S]*?(?=## \d|$)/);
      if (planetSection) sections.push(planetSection[0]);
    }

    if (files.some((f) => f.includes("game") || f.includes("empire"))) {
      const resourceSection = prd.match(
        /## 4\. Resource System[\s\S]*?(?=## \d|$)/
      );
      if (resourceSection) sections.push(resourceSection[0]);
    }

    return sections.join("\n\n---\n\n") || prd.slice(0, 5000);
  }

  private extractCurrentMilestone(milestones: string): string {
    const m1Match = milestones.match(
      /## MILESTONE 1:[\s\S]*?(?=## MILESTONE 2|$)/
    );
    return m1Match ? m1Match[0] : milestones.slice(0, 3000);
  }

  formatReviewOutput(result: ReviewResult): string {
    const emoji = {
      approved: ":white_check_mark:",
      changes_requested: ":x:",
      needs_discussion: ":warning:",
    };

    let output = `## Intelligent Code Review\n\n`;
    output += `**Overall Assessment**: ${emoji[result.overallAssessment]} ${result.overallAssessment.replace("_", " ").toUpperCase()}\n\n`;

    output += `### PRD Compliance Score: ${result.prdCompliance.score}/100\n`;
    if (result.prdCompliance.findings.length > 0) {
      output +=
        result.prdCompliance.findings.map((f) => `- ${f}`).join("\n") + "\n";
    }
    output += "\n";

    if (result.blockers.length > 0) {
      output += `### :rotating_light: Blockers\n`;
      output += result.blockers.map((b) => `- ${b}`).join("\n") + "\n\n";
    }

    if (result.dependencyIssues.length > 0) {
      output += `### Dependency Issues\n`;
      output += result.dependencyIssues.map((d) => `- ${d}`).join("\n") + "\n\n";
    }

    output += `### Test Coverage\n`;
    output += result.testCoverage.adequate
      ? ":white_check_mark: Adequate\n"
      : ":warning: Needs improvement\n";
    if (result.testCoverage.suggestions.length > 0) {
      output +=
        result.testCoverage.suggestions.map((s) => `- ${s}`).join("\n") + "\n";
    }
    output += "\n";

    if (result.patternConsistency.length > 0) {
      output += `### Pattern Consistency Notes\n`;
      output +=
        result.patternConsistency.map((p) => `- ${p}`).join("\n") + "\n\n";
    }

    if (result.suggestions.length > 0) {
      output += `### Suggestions\n`;
      output += result.suggestions.map((s) => `- ${s}`).join("\n") + "\n";
    }

    output += `\n---\n*This review was generated by the X-Imperium Intelligent Review Agent*`;

    return output;
  }
}

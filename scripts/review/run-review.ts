import { IntelligentReviewAgent } from "./agent";
import * as fs from "fs";

async function main() {
  const prNumber = process.env.PR_NUMBER;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!prNumber) {
    console.error("Missing PR_NUMBER environment variable");
    console.log("Usage: PR_NUMBER=123 ANTHROPIC_API_KEY=sk-... npm run review:pr");
    process.exit(1);
  }

  if (!apiKey) {
    console.error("Missing ANTHROPIC_API_KEY environment variable");
    console.log(
      "Please set ANTHROPIC_API_KEY to your Anthropic API key"
    );
    process.exit(1);
  }

  console.log(`Starting intelligent review for PR #${prNumber}...`);

  const agent = new IntelligentReviewAgent(apiKey);

  console.log("Gathering PR context...");
  const context = await agent.gatherContext(prNumber);

  console.log(`Found ${context.affectedFiles.length} affected files`);
  console.log(`Found ${context.commitMessages.length} commits`);

  console.log("Performing AI-powered review...");
  const result = await agent.performReview(context);

  const output = agent.formatReviewOutput(result);

  // Write output for GitHub Action to pick up
  fs.writeFileSync("review-output.md", output);

  console.log("\n" + "=".repeat(60) + "\n");
  console.log("Review Complete!");
  console.log("\n" + "=".repeat(60) + "\n");
  console.log(output);

  // Exit with error if blockers found (but don't fail the CI)
  if (result.blockers.length > 0) {
    console.log("\n⚠️  Blockers found - review carefully before merging");
  }
}

main().catch((error) => {
  console.error("Review failed:", error);
  // Write error output
  fs.writeFileSync(
    "review-output.md",
    `## Intelligent Code Review\n\n:x: **Review Failed**\n\nError: ${error.message}\n\nPlease review manually.`
  );
  process.exit(0); // Don't fail CI
});

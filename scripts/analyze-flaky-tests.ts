#!/usr/bin/env npx tsx
/**
 * Flaky Test Analyzer
 *
 * Analyzes Playwright JSON results to identify flaky tests.
 * A test is considered flaky if it failed on initial run but passed on retry.
 *
 * Usage:
 *   npx tsx scripts/analyze-flaky-tests.ts [playwright-results.json]
 *
 * The script will:
 * 1. Parse the Playwright JSON output
 * 2. Identify tests that failed then passed (flaky)
 * 3. Update e2e/flaky-tests.json with findings
 * 4. Output a summary report
 */

import * as fs from "fs";
import * as path from "path";

interface PlaywrightResult {
  suites: Suite[];
  config: unknown;
  errors: unknown[];
}

interface Suite {
  title: string;
  file: string;
  specs: Spec[];
  suites?: Suite[];
}

interface Spec {
  title: string;
  ok: boolean;
  tests: Test[];
}

interface Test {
  timeout: number;
  annotations: Annotation[];
  expectedStatus: string;
  projectName: string;
  results: TestResult[];
  status: string;
}

interface Annotation {
  type: string;
  description?: string;
}

interface TestResult {
  workerIndex: number;
  status: string;
  duration: number;
  errors: unknown[];
  retry: number;
}

interface FlakyTest {
  file: string;
  suite: string;
  test: string;
  firstSeen: string;
  lastSeen: string;
  occurrences: number;
  status: "active" | "monitoring" | "resolved";
}

interface FlakyTestsFile {
  description: string;
  lastUpdated: string;
  knownFlaky: FlakyTest[];
  resolved: FlakyTest[];
  notes: string;
}

function findFlakyTests(suites: Suite[], parentTitle = ""): FlakyTest[] {
  const flaky: FlakyTest[] = [];
  const today = new Date().toISOString().split("T")[0] ?? "";

  for (const suite of suites) {
    const suiteTitle = parentTitle ? `${parentTitle} > ${suite.title}` : suite.title;

    for (const spec of suite.specs) {
      for (const test of spec.tests) {
        // A test is flaky if it has multiple results and the last one passed
        // but an earlier one failed
        if (test.results.length > 1) {
          const hasFailure = test.results.some(
            (r) => r.status === "failed" || r.status === "timedOut"
          );
          const lastResult = test.results[test.results.length - 1];
          const lastPassed = lastResult?.status === "passed";

          if (hasFailure && lastPassed) {
            flaky.push({
              file: suite.file,
              suite: suiteTitle,
              test: spec.title,
              firstSeen: today,
              lastSeen: today,
              occurrences: 1,
              status: "active",
            });
          }
        }
      }
    }

    // Recurse into nested suites
    if (suite.suites) {
      flaky.push(...findFlakyTests(suite.suites, suiteTitle));
    }
  }

  return flaky;
}

function mergeFlaky(existing: FlakyTest[], newFlaky: FlakyTest[]): FlakyTest[] {
  const merged = [...existing];
  const today = new Date().toISOString().split("T")[0] ?? "";

  for (const test of newFlaky) {
    const key = `${test.file}:${test.suite}:${test.test}`;
    const existingIdx = merged.findIndex(
      (t) => `${t.file}:${t.suite}:${t.test}` === key
    );

    if (existingIdx >= 0 && merged[existingIdx]) {
      // Update existing entry
      merged[existingIdx].lastSeen = today;
      merged[existingIdx].occurrences++;
      merged[existingIdx].status = "active";
    } else {
      // Add new entry
      merged.push(test);
    }
  }

  return merged;
}

function main() {
  const resultsFile = process.argv[2] || "playwright-results.json";
  const flakyFile = path.join(__dirname, "..", "e2e", "flaky-tests.json");

  // Check if results file exists
  if (!fs.existsSync(resultsFile)) {
    console.log(`No results file found at ${resultsFile}`);
    console.log("Run tests with JSON reporter first: npm run test:e2e");
    console.log("Or in CI, the file is generated automatically.");
    process.exit(0);
  }

  // Parse results
  const results: PlaywrightResult = JSON.parse(fs.readFileSync(resultsFile, "utf-8"));
  const newFlaky = findFlakyTests(results.suites);

  // Load existing flaky tests file
  let flakyData: FlakyTestsFile;
  if (fs.existsSync(flakyFile)) {
    flakyData = JSON.parse(fs.readFileSync(flakyFile, "utf-8"));
  } else {
    flakyData = {
      description: "Known flaky tests and their status",
      lastUpdated: new Date().toISOString().split("T")[0] ?? "",
      knownFlaky: [],
      resolved: [],
      notes: "",
    };
  }

  // Merge new findings
  const today = new Date().toISOString().split("T")[0] ?? "";
  flakyData.knownFlaky = mergeFlaky(flakyData.knownFlaky, newFlaky);
  flakyData.lastUpdated = today;

  // Move tests not seen recently to resolved (after 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().split("T")[0] ?? "";

  const stillFlaky: FlakyTest[] = [];
  for (const test of flakyData.knownFlaky) {
    if (cutoff && test.lastSeen < cutoff) {
      test.status = "resolved";
      flakyData.resolved.push(test);
    } else {
      stillFlaky.push(test);
    }
  }
  flakyData.knownFlaky = stillFlaky;

  // Write updated file
  fs.writeFileSync(flakyFile, JSON.stringify(flakyData, null, 2) + "\n");

  // Output summary
  console.log("\n=== Flaky Test Analysis ===\n");

  if (newFlaky.length === 0) {
    console.log("No new flaky tests detected in this run.");
  } else {
    console.log(`Found ${newFlaky.length} flaky test(s) in this run:\n`);
    for (const test of newFlaky) {
      console.log(`  - ${test.file}`);
      console.log(`    ${test.suite} > ${test.test}\n`);
    }
  }

  console.log(`\nTotal known flaky tests: ${flakyData.knownFlaky.length}`);
  console.log(`Recently resolved: ${flakyData.resolved.length}`);
  console.log(`\nUpdated: ${flakyFile}`);
}

main();

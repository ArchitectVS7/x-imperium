/**
 * Documentation Link Checker
 *
 * Checks for broken internal links in markdown files.
 * Validates that referenced files/paths actually exist.
 *
 * Usage: npm run docs:check-links
 */

import * as fs from "fs";
import * as path from "path";

interface LinkCheckResult {
  file: string;
  line: number;
  link: string;
  status: "ok" | "broken" | "external";
  reason?: string;
}

// Patterns to ignore
const IGNORE_PATTERNS = [
  /^https?:\/\//, // External URLs
  /^mailto:/, // Email links
  /^#/, // In-page anchors only
  /^\.env/, // Environment files (may not exist)
];

// Directories to skip
const SKIP_DIRS = ["node_modules", ".git", ".next", "coverage", "playwright-report"];

/**
 * Extract markdown links from content
 */
function extractLinks(content: string): Array<{ link: string; line: number }> {
  const links: Array<{ link: string; line: number }> = [];
  const lines = content.split("\n");

  // Pattern for markdown links: [text](link)
  const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    let match;
    while ((match = linkPattern.exec(line)) !== null) {
      links.push({
        link: match[2]!,
        line: i + 1,
      });
    }
  }

  return links;
}

/**
 * Check if a link should be ignored
 */
function shouldIgnore(link: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(link));
}

/**
 * Resolve a relative link path
 */
function resolveLinkPath(fromFile: string, link: string): string {
  // Remove anchor
  const linkWithoutAnchor = link.split("#")[0]!;

  // Get the directory of the file containing the link
  const fileDir = path.dirname(fromFile);

  // Resolve relative to the file's directory
  return path.resolve(fileDir, linkWithoutAnchor);
}

/**
 * Check if a file or directory exists
 */
function checkPath(resolvedPath: string): { exists: boolean; reason?: string } {
  try {
    const stats = fs.statSync(resolvedPath);
    return { exists: stats.isFile() || stats.isDirectory() };
  } catch {
    return { exists: false, reason: "File not found" };
  }
}

/**
 * Find all markdown files in a directory
 */
function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.includes(entry.name)) {
          walk(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Check links in a single file
 */
function checkFileLinks(filePath: string): LinkCheckResult[] {
  const results: LinkCheckResult[] = [];
  const content = fs.readFileSync(filePath, "utf-8");
  const links = extractLinks(content);

  for (const { link, line } of links) {
    // Skip ignored patterns
    if (shouldIgnore(link)) {
      results.push({
        file: filePath,
        line,
        link,
        status: IGNORE_PATTERNS[0]!.test(link) ? "external" : "ok",
      });
      continue;
    }

    // Resolve and check the link
    const resolvedPath = resolveLinkPath(filePath, link);
    const { exists, reason } = checkPath(resolvedPath);

    results.push({
      file: filePath,
      line,
      link,
      status: exists ? "ok" : "broken",
      reason,
    });
  }

  return results;
}

/**
 * Main entry point
 */
function main() {
  console.log("Documentation Link Checker");
  console.log("==========================\n");

  const rootDir = process.cwd();
  const docsDir = path.join(rootDir, "docs");
  const rootFiles = ["README.md", "CLAUDE.md", "CONTRIBUTING.md"];

  const allResults: LinkCheckResult[] = [];
  let filesChecked = 0;

  // Check docs directory
  if (fs.existsSync(docsDir)) {
    const mdFiles = findMarkdownFiles(docsDir);
    for (const file of mdFiles) {
      const relPath = path.relative(rootDir, file);
      console.log(`Checking: ${relPath}`);
      const results = checkFileLinks(file);
      allResults.push(...results);
      filesChecked++;
    }
  }

  // Check root markdown files
  for (const fileName of rootFiles) {
    const filePath = path.join(rootDir, fileName);
    if (fs.existsSync(filePath)) {
      console.log(`Checking: ${fileName}`);
      const results = checkFileLinks(filePath);
      allResults.push(...results);
      filesChecked++;
    }
  }

  // Report results
  console.log("\n==========================");
  console.log(`Files checked: ${filesChecked}`);

  const broken = allResults.filter((r) => r.status === "broken");
  const external = allResults.filter((r) => r.status === "external");
  const ok = allResults.filter((r) => r.status === "ok");

  console.log(`Total links: ${allResults.length}`);
  console.log(`  OK: ${ok.length}`);
  console.log(`  External: ${external.length}`);
  console.log(`  Broken: ${broken.length}`);

  if (broken.length > 0) {
    console.log("\n\nBroken Links:");
    console.log("-------------");
    for (const result of broken) {
      const relFile = path.relative(rootDir, result.file);
      console.log(`\n  ${relFile}:${result.line}`);
      console.log(`    Link: ${result.link}`);
      console.log(`    Reason: ${result.reason}`);
    }
    console.log("\n");
    process.exit(1);
  }

  console.log("\nAll internal links are valid!");
  process.exit(0);
}

main();

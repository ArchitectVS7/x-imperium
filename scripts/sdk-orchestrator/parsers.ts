/**
 * Generic SDK Orchestrator - Task Parsers
 *
 * Pluggable parsers for different task file formats.
 */

import type { TaskFormat, TaskGroup, Task } from "./types";

// =============================================================================
// PARSER INTERFACE
// =============================================================================

export interface TaskParser {
  format: TaskFormat;
  parse(content: string): TaskGroup[];
  findGroup(groups: TaskGroup[], target: string): TaskGroup | null;
}

// =============================================================================
// FORMAT PATTERNS
// =============================================================================

const PATTERNS: Record<TaskFormat, RegExp> = {
  milestone: /^## MILESTONE (\d+(?:\.\d+)?): (.+)$/,
  epic: /^## EPIC[- ]?(\d+): (.+)$/i,
  phase: /^## Phase (\d+): (.+)$/i,
  story: /^## STORY[- ]?(\d+): (.+)$/i,
  sprint: /^## Sprint (\d+): (.+)$/i,
  custom: /^$/, // Set by user
};

// =============================================================================
// GENERIC PARSER
// =============================================================================

export function createParser(format: TaskFormat, customPattern?: string): TaskParser {
  const pattern = format === "custom" && customPattern
    ? new RegExp(customPattern)
    : PATTERNS[format];

  return {
    format,
    parse: (content: string) => parseTaskFile(content, pattern, format),
    findGroup: (groups: TaskGroup[], target: string) => findTaskGroup(groups, target, format),
  };
}

// =============================================================================
// PARSING LOGIC
// =============================================================================

function parseTaskFile(content: string, groupPattern: RegExp, format: TaskFormat): TaskGroup[] {
  const groups: TaskGroup[] = [];
  const lines = content.split("\n");

  let currentGroup: TaskGroup | null = null;
  let inDeliverables = false;
  let inTestCriteria = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Match group headers
    const groupMatch = line.match(groupPattern);
    if (groupMatch && groupMatch[1] && groupMatch[2]) {
      if (currentGroup) {
        groups.push(currentGroup);
      }

      const id = formatGroupId(format, groupMatch[1]);
      currentGroup = {
        id,
        name: groupMatch[2].trim(),
        status: "pending",
        tasks: [],
      };
      inDeliverables = false;
      inTestCriteria = false;
      continue;
    }

    if (!currentGroup) continue;

    // Parse status
    if (line.includes("**Status**:")) {
      if (line.includes("COMPLETE") || line.includes("✅")) {
        currentGroup.status = "complete";
      } else if (line.includes("IN PROGRESS") || line.includes("🔄")) {
        currentGroup.status = "in_progress";
      }
    }

    // Track sections
    if (line.match(/^### (Deliverables|Tasks|Items|Requirements)/i)) {
      inDeliverables = true;
      inTestCriteria = false;
      continue;
    }

    if (line.match(/^### (Test Criteria|Acceptance Criteria|Done When)/i)) {
      inDeliverables = false;
      inTestCriteria = true;
      continue;
    }

    if (line.startsWith("### ") || line.startsWith("---")) {
      inDeliverables = false;
      inTestCriteria = false;
      continue;
    }

    // Parse deliverables
    if (inDeliverables) {
      const task = parseTaskLine(line, currentGroup.id, currentGroup.tasks.length, i + 1);
      if (task) {
        currentGroup.tasks.push(task);
      }
    }
  }

  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}

function parseTaskLine(
  line: string,
  groupId: string,
  index: number,
  lineNumber: number
): Task | null {
  // Checkbox format: - [x] Task or - [ ] Task or - ✅ Task
  const checkboxMatch = line.match(/^- (\[[ xX✅]\]|✅) (.+)/);
  if (checkboxMatch && checkboxMatch[1] && checkboxMatch[2]) {
    const completed = checkboxMatch[1] !== "[ ]";
    const description = cleanDescription(checkboxMatch[2]);

    return {
      id: `${groupId}-${index + 1}`,
      groupId,
      description,
      completed,
      line: lineNumber,
    };
  }

  // Plain list format: - Task description (not indented)
  const plainMatch = line.match(/^- ([^[\s].+)$/);
  if (plainMatch && plainMatch[1] && !line.startsWith("  ")) {
    const description = cleanDescription(plainMatch[1]);

    // Skip sub-items and metadata lines
    if (!description.startsWith("-") && description.length > 3) {
      return {
        id: `${groupId}-${index + 1}`,
        groupId,
        description,
        completed: false,
        line: lineNumber,
      };
    }
  }

  return null;
}

function cleanDescription(text: string): string {
  return text
    .replace(/\*\*.+?\*\*/g, (match) => match.slice(2, -2)) // Remove bold
    .replace(/—.+$/, "") // Remove notes after em-dash
    .replace(/:$/, "") // Remove trailing colon
    .trim();
}

function formatGroupId(format: TaskFormat, num: string): string {
  const prefixes: Record<TaskFormat, string> = {
    milestone: "M",
    epic: "EPIC-",
    phase: "Phase-",
    story: "STORY-",
    sprint: "Sprint-",
    custom: "G-",
  };
  return `${prefixes[format]}${num}`;
}

// =============================================================================
// GROUP FINDING
// =============================================================================

function findTaskGroup(
  groups: TaskGroup[],
  target: string,
  format: TaskFormat
): TaskGroup | null {
  // Normalize target
  const normalized = target.toLowerCase().replace(/[^a-z0-9.]/g, "");

  for (const group of groups) {
    const groupNormalized = group.id.toLowerCase().replace(/[^a-z0-9.]/g, "");

    // Exact match
    if (groupNormalized === normalized) {
      return group;
    }

    // Number match (e.g., "8" matches "M8")
    const numMatch = target.match(/\d+(?:\.\d+)?/);
    const groupNumMatch = group.id.match(/\d+(?:\.\d+)?/);
    if (numMatch && groupNumMatch && numMatch[0] === groupNumMatch[0]) {
      return group;
    }

    // Name match
    if (group.name.toLowerCase().includes(target.toLowerCase())) {
      return group;
    }
  }

  return null;
}

// =============================================================================
// UTILITIES
// =============================================================================

export function getNextTask(group: TaskGroup): Task | null {
  return group.tasks.find((t) => !t.completed) || null;
}

export function getGroupProgress(group: TaskGroup): { completed: number; total: number } {
  return {
    completed: group.tasks.filter((t) => t.completed).length,
    total: group.tasks.length,
  };
}

export function summarizeGroups(groups: TaskGroup[]): string {
  return groups
    .map((g) => {
      const progress = getGroupProgress(g);
      const status = g.status === "complete" ? "✅" : g.status === "in_progress" ? "🔄" : "⬜";
      return `${status} ${g.id}: ${g.name} (${progress.completed}/${progress.total})`;
    })
    .join("\n");
}

/**
 * Milestone Parser for X-Imperium
 *
 * Reads milestones.md and extracts task structure for automation.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface MilestoneTask {
  id: string;
  milestone: number;
  description: string;
  completed: boolean;
  line: number;
}

export interface Milestone {
  number: number;
  name: string;
  status: 'complete' | 'in_progress' | 'pending';
  duration: string;
  testable: boolean;
  deliverables: MilestoneTask[];
  testCriteria: string[];
}

export function parseMilestones(content: string): Milestone[] {
  const milestones: Milestone[] = [];
  const lines = content.split('\n');

  let currentMilestone: Milestone | null = null;
  let inDeliverables = false;
  let inTestCriteria = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Match milestone headers like "## MILESTONE 6: Victory & Persistence"
    const milestoneMatch = line.match(/^## MILESTONE (\d+(?:\.\d+)?): (.+)$/);
    if (milestoneMatch && milestoneMatch[1] && milestoneMatch[2]) {
      if (currentMilestone) {
        milestones.push(currentMilestone);
      }

      const num = parseFloat(milestoneMatch[1]);
      currentMilestone = {
        number: num,
        name: milestoneMatch[2],
        status: 'pending',
        duration: '',
        testable: false,
        deliverables: [],
        testCriteria: []
      };
      inDeliverables = false;
      inTestCriteria = false;
      continue;
    }

    if (!currentMilestone) continue;

    // Parse status
    if (line.includes('**Status**:')) {
      if (line.includes('COMPLETE')) {
        currentMilestone.status = 'complete';
      } else if (line.includes('IN PROGRESS')) {
        currentMilestone.status = 'in_progress';
      }
    }

    // Parse duration
    const durationMatch = line.match(/\*\*Duration\*\*:\s*(.+)/);
    if (durationMatch && durationMatch[1]) {
      currentMilestone.duration = durationMatch[1];
    }

    // Parse testable
    if (line.includes('**Testable**: Yes')) {
      currentMilestone.testable = true;
    }

    // Track sections
    if (line.includes('### Deliverables')) {
      inDeliverables = true;
      inTestCriteria = false;
      continue;
    }

    if (line.includes('### Test Criteria')) {
      inDeliverables = false;
      inTestCriteria = true;
      continue;
    }

    if (line.startsWith('### ') || line.startsWith('---')) {
      inDeliverables = false;
      inTestCriteria = false;
      continue;
    }

    // Parse deliverables (checkboxes or plain list items)
    if (inDeliverables) {
      // Match checkboxes: - [x] or - [ ] or - ✅
      const checkboxMatch = line.match(/^- (\[[ xX✅]\]|✅) (.+)/);
      // Match plain list items: - Item (not indented sub-items)
      const plainMatch = line.match(/^- ([^[\s].+)$/);

      if (checkboxMatch && checkboxMatch[1] && checkboxMatch[2]) {
        const completed = checkboxMatch[1] !== '[ ]';
        const description = checkboxMatch[2]
          .replace(/\*\*.+?\*\*/g, match => match.slice(2, -2)) // Remove bold
          .replace(/—.+$/, '') // Remove notes after em-dash
          .trim();

        currentMilestone.deliverables.push({
          id: `M${currentMilestone.number}-${currentMilestone.deliverables.length + 1}`,
          milestone: currentMilestone.number,
          description,
          completed,
          line: i + 1
        });
      } else if (plainMatch && plainMatch[1] && !line.startsWith('  ')) {
        // Plain list item (not a sub-item) - treat as incomplete
        const description = plainMatch[1]
          .replace(/\*\*.+?\*\*/g, match => match.slice(2, -2)) // Remove bold
          .replace(/:$/, '') // Remove trailing colon
          .trim();

        // Skip sub-items and metadata lines
        if (!description.startsWith('-') && description.length > 3) {
          currentMilestone.deliverables.push({
            id: `M${currentMilestone.number}-${currentMilestone.deliverables.length + 1}`,
            milestone: currentMilestone.number,
            description,
            completed: false,
            line: i + 1
          });
        }
      }
    }

    // Parse test criteria
    if (inTestCriteria) {
      const criteriaMatch = line.match(/^[✓✅] (.+)$/);
      if (criteriaMatch && criteriaMatch[1]) {
        currentMilestone.testCriteria.push(criteriaMatch[1]);
      }
    }
  }

  if (currentMilestone) {
    milestones.push(currentMilestone);
  }

  return milestones;
}

export function getNextTask(milestones: Milestone[]): MilestoneTask | null {
  // Find first incomplete milestone
  for (const milestone of milestones) {
    if (milestone.status === 'complete') continue;

    // Find first incomplete deliverable in this milestone
    for (const deliverable of milestone.deliverables) {
      if (!deliverable.completed) {
        return deliverable;
      }
    }
  }

  return null;
}

export function getCurrentMilestone(milestones: Milestone[]): Milestone | null {
  for (const milestone of milestones) {
    if (milestone.status !== 'complete') {
      return milestone;
    }
  }
  return null;
}

export function getMilestoneProgress(milestones: Milestone[]): {
  current: number;
  total: number;
  currentMilestone: Milestone | null;
  completedTasks: number;
  totalTasks: number;
} {
  const currentMilestone = getCurrentMilestone(milestones);

  let completedTasks = 0;
  let totalTasks = 0;

  if (currentMilestone) {
    totalTasks = currentMilestone.deliverables.length;
    completedTasks = currentMilestone.deliverables.filter(d => d.completed).length;
  }

  return {
    current: currentMilestone?.number ?? 0,
    total: milestones.length,
    currentMilestone,
    completedTasks,
    totalTasks
  };
}

// CLI entry point
if (require.main === module) {
  const milestonesPath = path.join(__dirname, '../../docs/milestones.md');
  const content = fs.readFileSync(milestonesPath, 'utf-8');
  const milestones = parseMilestones(content);

  const progress = getMilestoneProgress(milestones);
  const nextTask = getNextTask(milestones);

  console.log('\n=== X-Imperium Milestone Status ===\n');
  console.log(`Current Milestone: ${progress.current} - ${progress.currentMilestone?.name ?? 'None'}`);
  console.log(`Progress: ${progress.completedTasks}/${progress.totalTasks} tasks complete`);

  if (nextTask) {
    console.log(`\nNext Task: ${nextTask.id}`);
    console.log(`Description: ${nextTask.description}`);
    console.log(`Line: ${nextTask.line}`);
  } else {
    console.log('\nAll tasks complete!');
  }
}

/**
 * Script to replace all "planet" terminology with "sector" across the codebase
 *
 * This script performs systematic replacements while preserving:
 * - PlanetList.tsx component name (legacy)
 * - External data files and personas
 * - Database enum name (planet_type in PostgreSQL)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const DRY_RUN = process.argv.includes("--dry-run");

const replacements = [
  // Type and interface names
  { from: /\bPlanet\b/g, to: "Sector" },
  { from: /\bNewPlanet\b/g, to: "NewSector" },

  // Variable and property names
  { from: /\bplanets\b/g, to: "sectors" },
  { from: /\bplanet\b/g, to: "sector" },
  { from: /\bplanetType\b/g, to: "sectorType" },
  { from: /\bplanetTypes\b/g, to: "sectorTypes" },
  { from: /\bplanetCount\b/g, to: "sectorCount" },
  { from: /\btotalPlanets\b/g, to: "totalSectors" },
  { from: /\bownedPlanets\b/g, to: "ownedSectors" },
  { from: /\bnumPlanets\b/g, to: "numSectors" },

  // Function names
  { from: /\bbuyPlanet\b/g, to: "buySector" },
  { from: /\breleasePlanet\b/g, to: "releaseSector" },
  { from: /\bgetPlanets\b/g, to: "getSectors" },
  { from: /\bgetPlanet\b/g, to: "getSector" },
  { from: /\bcreatePlanet\b/g, to: "createSector" },
  { from: /\bdeletePlanet\b/g, to: "deleteSector" },
  { from: /\bupdatePlanet\b/g, to: "updateSector" },

  // Relations
  { from: /\bplanetsRelations\b/g, to: "sectorsRelations" },

  // Enum (keep database name as planet_type, but TypeScript as sectorTypeEnum)
  { from: /\bplanetTypeEnum\b/g, to: "sectorTypeEnum" },

  // String literals and comments
  { from: /"planet"/g, to: '"sector"' },
  { from: /"planets"/g, to: '"sectors"' },
  { from: /'planet'/g, to: "'sector'" },
  { from: /'planets'/g, to: "'sectors'" },
  { from: /Planet acquisition/g, to: "Sector acquisition" },
  { from: /planet acquisition/g, to: "sector acquisition" },
  { from: /Purchase planet/g, to: "Purchase sector" },
  { from: /purchase planet/g, to: "purchase sector" },
  { from: /Release planet/g, to: "Release sector" },
  { from: /release planet/g, to: "release sector" },
  { from: /Buy Planet/g, to: "Buy Sector" },
  { from: /Buy planet/g, to: "Buy sector" },
  { from: /No planets/g, to: "No sectors" },
  { from: /no planets/g, to: "no sectors" },

  // Comments
  { from: /\/\/ Planet/g, to: "// Sector" },
  { from: /\/\/ planet/g, to: "// sector" },
  { from: /\/\* Planet/g, to: "/* Sector" },
  { from: /\/\* planet/g, to: "/* sector" },
];

// Files to exclude from processing
const excludePatterns = [
  /node_modules/,
  /\.next/,
  /dist/,
  /build/,
  /\.git/,
  /PlanetList\.tsx$/, // Keep this legacy component name
  /replace-planet-with-sector\.ts$/, // Don't process self
];

function shouldProcess(filePath: string): boolean {
  if (!filePath.match(/\.(ts|tsx|js|jsx|json)$/)) return false;
  return !excludePatterns.some(pattern => pattern.test(filePath));
}

function processFile(filePath: string): { changed: boolean; changes: number } {
  const content = readFileSync(filePath, "utf-8");
  let newContent = content;
  let changes = 0;

  for (const { from, to } of replacements) {
    const matches = newContent.match(from);
    if (matches) {
      changes += matches.length;
      newContent = newContent.replace(from, to);
    }
  }

  if (newContent !== content && !DRY_RUN) {
    writeFileSync(filePath, newContent, "utf-8");
  }

  return { changed: newContent !== content, changes };
}

function walkDirectory(dir: string, stats: { files: number; changed: number; totalChanges: number }) {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!excludePatterns.some(pattern => pattern.test(fullPath))) {
        walkDirectory(fullPath, stats);
      }
    } else if (shouldProcess(fullPath)) {
      stats.files++;
      const result = processFile(fullPath);
      if (result.changed) {
        stats.changed++;
        stats.totalChanges += result.changes;
        console.log(`  ✓ ${fullPath.replace(/\\/g, '/')} (${result.changes} changes)`);
      }
    }
  }
}

console.log("🔄 Replacing 'planet' terminology with 'sector'...");
console.log(DRY_RUN ? "   (DRY RUN - no files will be modified)\n" : "");

const stats = { files: 0, changed: 0, totalChanges: 0 };
walkDirectory("src", stats);

console.log("\n" + "=".repeat(60));
console.log(`✅ Complete!`);
console.log(`   Files processed: ${stats.files}`);
console.log(`   Files changed: ${stats.changed}`);
console.log(`   Total replacements: ${stats.totalChanges}`);
if (DRY_RUN) {
  console.log("\n💡 Run without --dry-run to apply changes");
}

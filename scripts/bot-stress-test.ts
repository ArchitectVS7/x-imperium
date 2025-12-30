#!/usr/bin/env npx tsx
/**
 * Bot Stress Test - Validate game balance with large bot populations
 *
 * Inspired by SRE's battle tests. This runs headless simulations
 * that actually PLAY THE GAME - bots buy ships, attack planets,
 * form alliances, and eliminate each other.
 *
 * NO UI CLICKING - pure game logic testing.
 */

import { runSimulation } from "../tests/simulation/simulator";
import { runBatch, printBalanceReport, printCoverageReport } from "../tests/simulation/batch-runner";
import type { SimulationConfig } from "../tests/simulation/types";

console.log('\n' + '='.repeat(80));
console.log('  🎮 X-IMPERIUM BOT STRESS TEST');
console.log('  Testing game balance, eliminations, and feature coverage');
console.log('='.repeat(80));

// =============================================================================
// TEST 1: 50 TURNS WITH 25 BOTS
// =============================================================================

console.log('\n\n📊 TEST 1: 50 TURNS WITH 25 BOTS');
console.log('='.repeat(80));

const test1Config: SimulationConfig = {
  empireCount: 25,
  turnLimit: 50,
  protectionTurns: 5,
  includePlayer: false,
  verbose: false,
  seed: Date.now(),
};

console.log('Running simulation...');
const test1Start = Date.now();
const test1Result = runSimulation(test1Config);
const test1Duration = Date.now() - test1Start;

console.log(`\n✅ TEST 1 COMPLETE in ${(test1Duration / 1000).toFixed(2)}s`);
console.log(`   Turns played: ${test1Result.turnsPlayed}`);
console.log(`   Winner: ${test1Result.winner?.empireName || 'None'} (${test1Result.winner?.victoryType || 'N/A'})`);
console.log(`   Eliminations: ${test1Result.finalState.empires.filter(e => e.isEliminated).length}/${test1Config.empireCount}`);

// List eliminated empires
const eliminated1 = test1Result.finalState.empires.filter(e => e.isEliminated);
if (eliminated1.length > 0) {
  console.log('\n   💀 Eliminated empires:');
  eliminated1.forEach(e => {
    console.log(`      - ${e.name} (${e.archetype})`);
  });
}

// Show top 5 survivors
const survivors1 = test1Result.finalState.empires
  .filter(e => !e.isEliminated)
  .sort((a, b) => b.networth - a.networth)
  .slice(0, 5);

console.log('\n   🏆 Top 5 survivors:');
survivors1.forEach((e, i) => {
  console.log(`      ${i + 1}. ${e.name} (${e.archetype}): ${e.planets} planets, $${e.networth.toLocaleString()}`);
});

// Coverage report
console.log('\n   📈 System Coverage:');
console.log(`      - Units built: ${test1Result.coverage.buildUnits.count} (${test1Result.coverage.buildUnits.unitTypes.size} types)`);
console.log(`      - Planets bought: ${test1Result.coverage.buyPlanet.count}`);
console.log(`      - Attacks launched: ${test1Result.coverage.attacks.count}`);
console.log(`      - Combat resolved: ${test1Result.coverage.combatResolved ? 'Yes' : 'No'}`);
console.log(`      - Eliminations: ${test1Result.coverage.eliminationOccurred ? 'Yes' : 'No'}`);

// =============================================================================
// TEST 2: 100 TURNS WITH 50 BOTS
// =============================================================================

console.log('\n\n📊 TEST 2: 100 TURNS WITH 50 BOTS');
console.log('='.repeat(80));

const test2Config: SimulationConfig = {
  empireCount: 50,
  turnLimit: 100,
  protectionTurns: 10,
  includePlayer: false,
  verbose: false,
  seed: Date.now() + 1000,
};

console.log('Running simulation...');
const test2Start = Date.now();
const test2Result = runSimulation(test2Config);
const test2Duration = Date.now() - test2Start;

console.log(`\n✅ TEST 2 COMPLETE in ${(test2Duration / 1000).toFixed(2)}s`);
console.log(`   Turns played: ${test2Result.turnsPlayed}`);
console.log(`   Winner: ${test2Result.winner?.empireName || 'None'} (${test2Result.winner?.victoryType || 'N/A'})`);
console.log(`   Eliminations: ${test2Result.finalState.empires.filter(e => e.isEliminated).length}/${test2Config.empireCount}`);

// List eliminated empires
const eliminated2 = test2Result.finalState.empires.filter(e => e.isEliminated);
if (eliminated2.length > 0) {
  console.log('\n   💀 Eliminated empires:');
  eliminated2.forEach(e => {
    console.log(`      - ${e.name} (${e.archetype})`);
  });
}

// Show top 5 survivors
const survivors2 = test2Result.finalState.empires
  .filter(e => !e.isEliminated)
  .sort((a, b) => b.networth - a.networth)
  .slice(0, 5);

console.log('\n   🏆 Top 5 survivors:');
survivors2.forEach((e, i) => {
  console.log(`      ${i + 1}. ${e.name} (${e.archetype}): ${e.planets} planets, $${e.networth.toLocaleString()}`);
});

// Coverage report
console.log('\n   📈 System Coverage:');
console.log(`      - Units built: ${test2Result.coverage.buildUnits.count} (${test2Result.coverage.buildUnits.unitTypes.size} types)`);
console.log(`      - Planets bought: ${test2Result.coverage.buyPlanet.count}`);
console.log(`      - Attacks launched: ${test2Result.coverage.attacks.count}`);
console.log(`      - Combat resolved: ${test2Result.coverage.combatResolved ? 'Yes' : 'No'}`);
console.log(`      - Eliminations: ${test2Result.coverage.eliminationOccurred ? 'Yes' : 'No'}`);

// =============================================================================
// TEST 3: 200 TURNS WITH 100 BOTS
// =============================================================================

console.log('\n\n📊 TEST 3: 200 TURNS WITH 100 BOTS');
console.log('='.repeat(80));

const test3Config: SimulationConfig = {
  empireCount: 100,
  turnLimit: 200,
  protectionTurns: 20,
  includePlayer: false,
  verbose: false,
  seed: Date.now() + 2000,
};

console.log('Running simulation...');
const test3Start = Date.now();
const test3Result = runSimulation(test3Config);
const test3Duration = Date.now() - test3Start;

console.log(`\n✅ TEST 3 COMPLETE in ${(test3Duration / 1000).toFixed(2)}s`);
console.log(`   Turns played: ${test3Result.turnsPlayed}`);
console.log(`   Winner: ${test3Result.winner?.empireName || 'None'} (${test3Result.winner?.victoryType || 'N/A'})`);
console.log(`   Eliminations: ${test3Result.finalState.empires.filter(e => e.isEliminated).length}/${test3Config.empireCount}`);

// List eliminated empires (show first 20)
const eliminated3 = test3Result.finalState.empires.filter(e => e.isEliminated);
if (eliminated3.length > 0) {
  console.log(`\n   💀 Eliminated empires (showing first 20 of ${eliminated3.length}):`);
  eliminated3.slice(0, 20).forEach(e => {
    console.log(`      - ${e.name} (${e.archetype})`);
  });
  if (eliminated3.length > 20) {
    console.log(`      ... and ${eliminated3.length - 20} more`);
  }
}

// Show top 10 survivors
const survivors3 = test3Result.finalState.empires
  .filter(e => !e.isEliminated)
  .sort((a, b) => b.networth - a.networth)
  .slice(0, 10);

console.log('\n   🏆 Top 10 survivors:');
survivors3.forEach((e, i) => {
  console.log(`      ${i + 1}. ${e.name} (${e.archetype}): ${e.planets} planets, $${e.networth.toLocaleString()}`);
});

// Coverage report
console.log('\n   📈 System Coverage:');
console.log(`      - Units built: ${test3Result.coverage.buildUnits.count} (${test3Result.coverage.buildUnits.unitTypes.size} types)`);
console.log(`      - Planets bought: ${test3Result.coverage.buyPlanet.count}`);
console.log(`      - Attacks launched: ${test3Result.coverage.attacks.count}`);
console.log(`      - Combat resolved: ${test3Result.coverage.combatResolved ? 'Yes' : 'No'}`);
console.log(`      - Eliminations: ${test3Result.coverage.eliminationOccurred ? 'Yes' : 'No'}`);

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n\n' + '='.repeat(80));
console.log('  📊 STRESS TEST SUMMARY');
console.log('='.repeat(80));

console.log(`\n  Test 1 (25 bots, 50 turns):   ${test1Result.turnsPlayed} turns, ${(test1Duration / 1000).toFixed(2)}s`);
console.log(`  Test 2 (50 bots, 100 turns):  ${test2Result.turnsPlayed} turns, ${(test2Duration / 1000).toFixed(2)}s`);
console.log(`  Test 3 (100 bots, 200 turns): ${test3Result.turnsPlayed} turns, ${(test3Duration / 1000).toFixed(2)}s`);

console.log(`\n  Total eliminations: ${
  test1Result.finalState.empires.filter(e => e.isEliminated).length +
  test2Result.finalState.empires.filter(e => e.isEliminated).length +
  test3Result.finalState.empires.filter(e => e.isEliminated).length
}`);

console.log(`\n  ✅ All stress tests completed successfully!\n`);

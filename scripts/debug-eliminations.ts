#!/usr/bin/env npx tsx
/**
 * Debug Eliminations - Detailed analysis of combat outcomes
 */

import { runSimulation } from "../tests/simulation/simulator";
import type { SimulationConfig } from "../tests/simulation/types";

console.log('\n🔍 ELIMINATION DEBUG TEST\n');

const config: SimulationConfig = {
  empireCount: 10,
  turnLimit: 100,
  protectionTurns: 5,
  includePlayer: false,
  verbose: true,  // Enable verbose logging
  seed: 12345,
};

const result = runSimulation(config);

console.log(`\n📊 RESULTS:`);
console.log(`   Turns played: ${result.turnsPlayed}`);
console.log(`   Empires eliminated: ${result.finalState.empires.filter(e => e.isEliminated).length}/${config.empireCount}`);
console.log(`   Attacks launched: ${result.coverage.attacks.count}`);
console.log(`   Invasions: ${result.coverage.attacks.invasions}`);

console.log(`\n🏆 FINAL STANDINGS:`);
result.finalState.empires
  .sort((a, b) => b.planets.length - a.planets.length)
  .forEach((e, i) => {
    const status = e.isEliminated ? '💀' : '✅';
    console.log(`   ${i+1}. ${status} ${e.name} (${e.archetype}): ${e.planets.length} planets, $${e.networth.toLocaleString()}`);
  });

// Analyze attack outcomes from actions
console.log(`\n⚔️ COMBAT ANALYSIS:`);
const attacks = result.actions.filter(a => a.decision.type === 'attack');
console.log(`   Total attack decisions: ${attacks.length}`);

// Count combat outcomes
let attackerWins = 0;
let defenderWins = 0;
let draws = 0;
let totalPlanetsTransferred = 0;

for (const action of attacks) {
  if (action.outcome.type === 'combat') {
    const combatResult = (action.outcome as any).result;
    if (combatResult.winner === 'attacker') {
      attackerWins++;
      totalPlanetsTransferred += combatResult.planetsTransferred || 0;
    } else if (combatResult.winner === 'defender') {
      defenderWins++;
    } else {
      draws++;
    }
  }
}

console.log(`   ✅ Attacker victories: ${attackerWins}`);
console.log(`   🛡️  Defender victories: ${defenderWins}`);
console.log(`   🤝 Draws: ${draws}`);
console.log(`   🌍 Total planets transferred: ${totalPlanetsTransferred}`);

if (attackerWins > 0) {
  console.log(`\n💡 ATTACKER WIN RATE: ${((attackerWins / attacks.length) * 100).toFixed(1)}%`);
  console.log(`   📈 Attacker wins per turn: ${(attackerWins / result.turnsPlayed).toFixed(2)}`);
  console.log(`   📉 Avg planets per win: ${(totalPlanetsTransferred / attackerWins).toFixed(2)}`);
  console.log(`   🎯 Wins needed to eliminate (9 planets): ~${Math.ceil(9 / (totalPlanetsTransferred / attackerWins))}`);
  console.log(`   ⏱️  Estimated turns to eliminate 1 empire: ~${Math.ceil(9 / (totalPlanetsTransferred / attackerWins) / (attackerWins / result.turnsPlayed))}`);
} else {
  console.log(`\n⚠️  PROBLEM: Attackers won 0 battles out of ${attacks.length} attempts!`);
  console.log(`   🔍 This explains zero eliminations - attackers can't win fights.`);
  console.log(`   🛠️  Possible causes:`);
  console.log(`      - Bots attacking before building enough military`);
  console.log(`      - Defender advantage too strong`);
  console.log(`      - Bots targeting empires stronger than themselves`);
}

console.log('\n');

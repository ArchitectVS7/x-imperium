/**
 * Type declaration for combat-config.json
 */
declare module '@data/combat-config.json' {
  const config: {
    unified: {
      defenderBonus: number;
      powerMultipliers: {
        soldiers: number;
        fighters: number;
        stations: number;
        lightCruisers: number;
        heavyCruisers: number;
        carriers: number;
      };
      underdogBonus: {
        threshold: number;
        maxBonus: number;
      };
      planetCapture: {
        minPercent: number;
        maxPercent: number;
      };
      casualtyRates: {
        winnerMultiplier: number;
        loserMultiplier: number;
        drawMultiplier: number;
      };
    };
    legacy: {
      defenderAdvantage: number;
      stationDefenseMultiplier: number;
      powerMultipliers: {
        soldiers: number;
        fighters: number;
        stations: number;
        lightCruisers: number;
        heavyCruisers: number;
        carriers: number;
      };
      diversityBonus: {
        minUnitTypes: number;
        bonusMultiplier: number;
      };
    };
    casualties: {
      baseRate: number;
      minRate: number;
      maxRate: number;
      badAttackPenalty: number;
      overwhelmingBonus: number;
      badAttackThreshold: number;
      overwhelmingThreshold: number;
      varianceMin: number;
      varianceMax: number;
      retreatRate: number;
    };
  };
  export default config;
}

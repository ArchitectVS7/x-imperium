/**
 * Networth Calculation (PRD 4.5)
 *
 * Formula:
 * Networth = (Planets × 10)
 *          + (Soldiers × 0.0005)
 *          + (Fighters × 0.001)
 *          + (Stations × 0.002)
 *          + (Light Cruisers × 0.001)
 *          + (Heavy Cruisers × 0.002)
 *          + (Carriers × 0.005)
 *          + (Covert Agents × 0.001)
 */

export interface NetworthInput {
  sectorCount: number;
  soldiers: number;
  fighters: number;
  stations: number;
  lightCruisers: number;
  heavyCruisers: number;
  carriers: number;
  covertAgents: number;
}

export const NETWORTH_MULTIPLIERS = {
  sectors: 10,
  soldiers: 0.0005,
  fighters: 0.001,
  stations: 0.002,
  lightCruisers: 0.001,
  heavyCruisers: 0.002,
  carriers: 0.005,
  covertAgents: 0.001,
} as const;

/**
 * Calculate the networth of an empire based on its sectors and military units.
 *
 * @param input - The empire's sector count and military unit counts
 * @returns The calculated networth as a number
 */
export function calculateNetworth(input: NetworthInput): number {
  const rawNetworth =
    input.sectorCount * NETWORTH_MULTIPLIERS.sectors +
    input.soldiers * NETWORTH_MULTIPLIERS.soldiers +
    input.fighters * NETWORTH_MULTIPLIERS.fighters +
    input.stations * NETWORTH_MULTIPLIERS.stations +
    input.lightCruisers * NETWORTH_MULTIPLIERS.lightCruisers +
    input.heavyCruisers * NETWORTH_MULTIPLIERS.heavyCruisers +
    input.carriers * NETWORTH_MULTIPLIERS.carriers +
    input.covertAgents * NETWORTH_MULTIPLIERS.covertAgents;

  // Round to integer for bigint storage
  return Math.round(rawNetworth);
}

/**
 * Calculate the starting networth for a new empire.
 * Default: 5 sectors, 100 soldiers, no other units.
 * (Reduced from 9 sectors for faster eliminations)
 *
 * @returns Starting networth (50)
 */
export function calculateStartingNetworth(): number {
  return calculateNetworth({
    sectorCount: 5, // Reduced from 9 for faster eliminations
    soldiers: 100,
    fighters: 0,
    stations: 0,
    lightCruisers: 0,
    heavyCruisers: 0,
    carriers: 0,
    covertAgents: 0,
  });
}

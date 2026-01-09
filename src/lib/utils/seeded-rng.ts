/**
 * Seeded Random Number Generator
 *
 * Provides reproducible random numbers for game mechanics.
 * Uses Linear Congruential Generator (LCG) algorithm.
 */

/**
 * Create a seeded random number generator.
 * Same seed always produces same sequence.
 *
 * @param seed - Integer seed value
 * @returns Function that returns numbers in range [0, 1)
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Create a game-turn-based seeded RNG.
 * Combines gameId hash with turn number for deterministic per-turn randomness.
 *
 * @param gameId - UUID of the game
 * @param turn - Current turn number
 * @param salt - Optional additional salt for different random streams
 */
export function createTurnBasedRng(
  gameId: string,
  turn: number,
  salt: string = ""
): () => number {
  // Simple hash of gameId + turn + salt
  const combined = `${gameId}-${turn}-${salt}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return createSeededRandom(Math.abs(hash));
}

/**
 * Roll a d20 (1-20) using provided RNG or Math.random.
 *
 * @param rng - Optional random function (default Math.random)
 * @returns Integer from 1 to 20
 */
export function rollD20(rng?: () => number): number {
  const random = rng ?? Math.random;
  return Math.floor(random() * 20) + 1;
}

/**
 * Roll dice using provided RNG.
 *
 * @param sides - Number of sides on the die
 * @param count - Number of dice to roll (default 1)
 * @param rng - Random function (default Math.random)
 * @returns Sum of all dice rolled
 */
export function rollDice(
  sides: number,
  count: number = 1,
  rng?: () => number
): number {
  const random = rng ?? Math.random;
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(random() * sides) + 1;
  }
  return total;
}

/**
 * Shuffle an array using Fisher-Yates with provided RNG.
 *
 * @param array - Array to shuffle
 * @param rng - Optional random function (default Math.random)
 * @returns New shuffled array (original is not modified)
 */
export function shuffleArray<T>(array: T[], rng?: () => number): T[] {
  const random = rng ?? Math.random;
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * Pick a random element from array.
 *
 * @param array - Array to pick from
 * @param rng - Optional random function (default Math.random)
 * @returns Random element, or undefined if array is empty
 */
export function pickRandom<T>(array: T[], rng?: () => number): T | undefined {
  const random = rng ?? Math.random;
  if (array.length === 0) return undefined;
  return array[Math.floor(random() * array.length)];
}

/**
 * Returns true with given probability.
 *
 * @param probability - Probability threshold (0-1)
 * @param rng - Optional random function (default Math.random)
 * @returns true if random value is less than probability
 */
export function chance(probability: number, rng?: () => number): boolean {
  const random = rng ?? Math.random;
  return random() < probability;
}

import { vi } from "vitest";

export interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  values: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

export function createMockDb(): MockQueryBuilder {
  const mockBuilder: MockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };

  return mockBuilder;
}

export function createMockGame(overrides?: Partial<MockGame>): MockGame {
  return {
    id: "game-123",
    name: "Test Game",
    status: "active",
    turnLimit: 200,
    currentTurn: 1,
    difficulty: "normal",
    botCount: 25,
    protectionTurns: 20,
    lastTurnProcessingMs: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

export function createMockEmpire(overrides?: Partial<MockEmpire>): MockEmpire {
  return {
    id: "empire-123",
    gameId: "game-123",
    name: "Test Empire",
    emperorName: "Test Emperor",
    type: "player",
    botTier: null,
    botArchetype: null,
    credits: 100000,
    food: 1000,
    ore: 500,
    petroleum: 200,
    researchPoints: 0,
    population: 10000,
    populationCap: 50000,
    civilStatus: "content",
    soldiers: 100,
    fighters: 0,
    stations: 0,
    lightCruisers: 0,
    heavyCruisers: 0,
    carriers: 0,
    covertAgents: 0,
    armyEffectiveness: "85.00",
    covertPoints: 0,
    fundamentalResearchLevel: 0,
    networth: 50, // 5 sectors × 10 + 100 soldiers × 0.0005 = 50.05 → 50
    sectorCount: 5, // Reduced from 9 for faster eliminations
    isEliminated: false,
    eliminatedAtTurn: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockPlanet(overrides?: Partial<MockPlanet>): MockPlanet {
  return {
    id: "sector-123",
    empireId: "empire-123",
    gameId: "game-123",
    type: "food",
    name: null,
    productionRate: "160",
    purchasePrice: 8000,
    acquiredAtTurn: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createStartingPlanets(empireId: string, gameId: string): MockPlanet[] {
  const sectors: MockPlanet[] = [];
  let planetNum = 1;

  // 2 Food sectors
  for (let i = 0; i < 2; i++) {
    sectors.push(createMockPlanet({
      id: `sector-${planetNum++}`,
      empireId,
      gameId,
      type: "food",
      productionRate: "160",
      purchasePrice: 8000,
    }));
  }

  // 2 Ore sectors
  for (let i = 0; i < 2; i++) {
    sectors.push(createMockPlanet({
      id: `sector-${planetNum++}`,
      empireId,
      gameId,
      type: "ore",
      productionRate: "112",
      purchasePrice: 6000,
    }));
  }

  // 1 Petroleum sector
  sectors.push(createMockPlanet({
    id: `sector-${planetNum++}`,
    empireId,
    gameId,
    type: "petroleum",
    productionRate: "92",
    purchasePrice: 11500,
  }));

  // 1 Tourism sector
  sectors.push(createMockPlanet({
    id: `sector-${planetNum++}`,
    empireId,
    gameId,
    type: "tourism",
    productionRate: "8000",
    purchasePrice: 8000,
  }));

  // 1 Urban sector
  sectors.push(createMockPlanet({
    id: `sector-${planetNum++}`,
    empireId,
    gameId,
    type: "urban",
    productionRate: "1000",
    purchasePrice: 8000,
  }));

  // 1 Government sector
  sectors.push(createMockPlanet({
    id: `sector-${planetNum++}`,
    empireId,
    gameId,
    type: "government",
    productionRate: "300",
    purchasePrice: 7500,
  }));

  // 1 Research sector
  sectors.push(createMockPlanet({
    id: `sector-${planetNum++}`,
    empireId,
    gameId,
    type: "research",
    productionRate: "100",
    purchasePrice: 23000,
  }));

  return sectors;
}

// Type definitions for mocks
interface MockGame {
  id: string;
  name: string;
  status: string;
  turnLimit: number;
  currentTurn: number;
  difficulty: string;
  botCount: number;
  protectionTurns: number;
  lastTurnProcessingMs: number | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

interface MockEmpire {
  id: string;
  gameId: string;
  name: string;
  emperorName: string | null;
  type: string;
  botTier: string | null;
  botArchetype: string | null;
  credits: number;
  food: number;
  ore: number;
  petroleum: number;
  researchPoints: number;
  population: number;
  populationCap: number;
  civilStatus: string;
  soldiers: number;
  fighters: number;
  stations: number;
  lightCruisers: number;
  heavyCruisers: number;
  carriers: number;
  covertAgents: number;
  armyEffectiveness: string;
  covertPoints: number;
  fundamentalResearchLevel: number;
  networth: number;
  sectorCount: number;
  isEliminated: boolean;
  eliminatedAtTurn: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MockPlanet {
  id: string;
  empireId: string;
  gameId: string;
  type: string;
  name: string | null;
  productionRate: string;
  purchasePrice: number;
  acquiredAtTurn: number;
  createdAt: Date;
}

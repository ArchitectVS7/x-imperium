# Nexus Dominion: Implementation Plan - Phase 2

**Created**: 2025-12-30
**Last Updated**: 2025-12-31
**Status**: ACTIVE - M6-M10 Implementation Complete
**Scope**: Geographic Strategy, Anti-Snowball, and Player Guidance Systems

---

## Overview

This plan implements the features identified in the research phase, organized into milestones that prioritize getting to **playtesting quickly**. Each milestone is designed to be independently testable and adds a coherent set of related features.

### Guiding Principles (from VISION.md)

1. **"Geography creates strategy"** - Sectors, borders, wormholes create meaningful expansion paths
2. **"Natural selection is the content"** - Bosses emerge from bot-vs-bot conflict, not scripts
3. **"Crusader Kings meets Eve Online"** - Coalition warfare, emergent narratives, raid bosses
4. **"Every game is someone's first"** - Progressive disclosure, player guidance panels

### Feature Groups

| Group | Features | Purpose |
|-------|----------|---------|
| **A. Geographic Foundation** | Sector balancing, Border discovery, Wormhole UI | Create meaningful map strategy |
| **B. Boss & Coalition System** | Boss detection, Coalition raids, Leader containment | Anti-snowball mechanics |
| **C. Player Guidance** | Threat panel, Expansion panel, Victory Points | Reduce decision paralysis |
| **D. Strategic Variety** | Sector traits, Territory distribution, Victory rewards | Depth and replayability |

---

## Milestone Structure

```
MILESTONE 6: Geographic Strategy Foundation (Est. 2-3 days)
├── 6.1 Sector balancing algorithm
├── 6.2 Border discovery system
└── 6.3 Wormhole construction UI

MILESTONE 7: Boss Emergence System (Est. 2-3 days)
├── 7.1 Boss detection logic
├── 7.2 Boss UI indicators
└── 7.3 Leader containment bonus

MILESTONE 8: Player Guidance Panels (Est. 2 days)
├── 8.1 Threat Assessment Panel
└── 8.2 Expansion Options Panel

MILESTONE 9: Coalition Raid Mechanics (Est. 2-3 days)
├── 9.1 Coalition raid detection
├── 9.2 Raid combat bonuses
└── 9.3 Raid territory distribution

MILESTONE 10: Strategic Variety (Est. 2-3 days)
├── 10.1 Sector traits
├── 10.2 Victory Points system
└── 10.3 Shared victory rewards
```

**Total Estimated Time**: 10-14 days

---

## Milestone 6: Geographic Strategy Foundation

### Purpose
Create the foundation for meaningful geographic strategy by ensuring fair starts, enabling phased expansion, and providing wormhole construction UI.

### 6.1 Sector Balancing Algorithm

**Status**: ✅ COMPLETE
**Implemented**: 2025-12-30
**Files**: `src/lib/game/services/sector-balancing-service.ts`, `src/lib/game/services/__tests__/sector-balancing-service.test.ts`

**Problem**: Random sector assignment could create unfair advantages

**Solution**: At game creation, balance empires across sectors so each sector has similar total networth (±10%)

**Implementation**:
```typescript
// src/lib/game/services/sector-balancing-service.ts

interface SectorBalance {
  sectorId: string;
  totalNetworth: number;
  empireCount: number;
  botTierMix: { tier1: number; tier2: number; tier3: number; tier4: number };
}

export function balanceSectors(
  empires: Empire[],
  sectorCount: number = 10
): Map<string, string[]> {
  // Step 1: Calculate each empire's starting networth
  const empiresWithNetworth = empires.map(e => ({
    id: e.id,
    networth: calculateStartingNetworth(e),
    tier: e.botTier ?? 'player'
  }));

  // Step 2: Sort by networth descending
  empiresWithNetworth.sort((a, b) => b.networth - a.networth);

  // Step 3: Snake draft distribution (1→10, 10→1, 1→10...)
  const sectors = new Map<string, string[]>();
  for (let i = 0; i < sectorCount; i++) {
    sectors.set(`sector-${i}`, []);
  }

  let sectorIndex = 0;
  let direction = 1; // 1 = forward, -1 = backward

  for (const empire of empiresWithNetworth) {
    const sectorId = `sector-${sectorIndex}`;
    sectors.get(sectorId)!.push(empire.id);

    sectorIndex += direction;
    if (sectorIndex >= sectorCount) {
      sectorIndex = sectorCount - 1;
      direction = -1;
    } else if (sectorIndex < 0) {
      sectorIndex = 0;
      direction = 1;
    }
  }

  // Step 4: Verify balance (±10% of average)
  const sectorNetworthMap = calculateSectorNetworths(sectors, empiresWithNetworth);
  const avgNetworth = calculateAverage(sectorNetworthMap);

  for (const [sectorId, networth] of sectorNetworthMap) {
    const deviation = Math.abs(networth - avgNetworth) / avgNetworth;
    if (deviation > 0.10) {
      // Swap empires between sectors to balance
      rebalanceSectors(sectors, sectorNetworthMap, avgNetworth);
    }
  }

  return sectors;
}
```

**Files to Create/Modify**:
- `src/lib/game/services/sector-balancing-service.ts` - NEW
- `src/lib/game/services/game-creation-service.ts` - Integrate balancing
- `src/lib/game/services/__tests__/sector-balancing-service.test.ts` - NEW

**Testing**:
- [ ] Unit test: Snake draft distributes evenly
- [ ] Unit test: Rebalancing corrects >10% deviation
- [ ] Unit test: Bot tier mix is reasonable per sector
- [ ] Integration test: New games have balanced sectors

**Acceptance Criteria**:
- All sectors within ±10% of average networth
- Each sector has mix of bot tiers (not all strong bots in one sector)
- Player's sector is not disadvantaged

**Commit**: `feat(M6.1): add sector balancing algorithm for fair starts`

---

### 6.2 Border Discovery System

**Status**: ✅ COMPLETE
**Implemented**: 2025-12-30
**Files**: `src/lib/game/services/border-discovery-service.ts`, `src/lib/game/services/__tests__/border-discovery-service.test.ts`

**Problem**: Players have immediate access to adjacent sectors, overwhelming them

**Solution**: Borders to adjacent sectors are "discovered" at Turn 10-15, creating phased expansion

**Implementation**:
```typescript
// src/lib/game/services/border-discovery-service.ts

interface BorderDiscovery {
  fromSectorId: string;
  toSectorId: string;
  discoveryTurn: number;
  isDiscovered: boolean;
}

// Constants
const BORDER_DISCOVERY_MIN_TURN = 10;
const BORDER_DISCOVERY_MAX_TURN = 15;

export function initializeBorders(
  sectors: Map<string, Sector>,
  adjacencyMap: Map<string, string[]>
): BorderDiscovery[] {
  const borders: BorderDiscovery[] = [];

  for (const [sectorId, adjacentSectors] of adjacencyMap) {
    for (const adjacentId of adjacentSectors) {
      // Random discovery turn between 10-15
      const discoveryTurn = BORDER_DISCOVERY_MIN_TURN +
        Math.floor(Math.random() * (BORDER_DISCOVERY_MAX_TURN - BORDER_DISCOVERY_MIN_TURN + 1));

      borders.push({
        fromSectorId: sectorId,
        toSectorId: adjacentId,
        discoveryTurn,
        isDiscovered: false
      });
    }
  }

  return borders;
}

export function processBorderDiscovery(
  borders: BorderDiscovery[],
  currentTurn: number
): BorderDiscovery[] {
  return borders.map(border => ({
    ...border,
    isDiscovered: currentTurn >= border.discoveryTurn
  }));
}

export function canAttackViaBorder(
  fromSectorId: string,
  toSectorId: string,
  borders: BorderDiscovery[],
  currentTurn: number
): { canAttack: boolean; reason?: string } {
  const border = borders.find(
    b => b.fromSectorId === fromSectorId && b.toSectorId === toSectorId
  );

  if (!border) {
    return { canAttack: false, reason: 'No border exists between these sectors' };
  }

  if (!border.isDiscovered && currentTurn < border.discoveryTurn) {
    return {
      canAttack: false,
      reason: `Border will be discovered on Turn ${border.discoveryTurn}`
    };
  }

  return { canAttack: true };
}
```

**Schema Addition**:
```typescript
// Add to src/lib/db/schema.ts
export const sectorBorders = pgTable("sector_borders", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  fromSectorId: varchar("from_sector_id", { length: 50 }).notNull(),
  toSectorId: varchar("to_sector_id", { length: 50 }).notNull(),
  discoveryTurn: integer("discovery_turn").notNull().default(10),
  isDiscovered: boolean("is_discovered").notNull().default(false),
});
```

**Files to Create/Modify**:
- `src/lib/game/services/border-discovery-service.ts` - NEW
- `src/lib/db/schema.ts` - Add sectorBorders table
- `src/lib/game/services/turn-processor.ts` - Process border discovery each turn
- `src/components/game/starmap/GalaxyView.tsx` - Show locked/unlocked borders

**Testing**:
- [ ] Unit test: Borders initialize with random discovery turns (10-15)
- [ ] Unit test: Discovery triggers at correct turn
- [ ] Unit test: Attack validation respects discovery state
- [ ] Visual test: Locked borders show dotted line, unlocked show solid

**UI Visualization**:
```
Discovered border:    ━━━━━━━━━ (solid line)
Locked border:        ┅┅┅┅┅┅┅┅┅ (dotted line)
                      "Turn 14"  (when discovered)
```

**Commit**: `feat(M6.2): add border discovery system for phased expansion`

---

### 6.3 Wormhole Construction UI

**Status**: ✅ COMPLETE
**Implemented**: 2025-12-30
**Files**: `src/components/game/starmap/WormholeConstructionPanel.tsx`, `src/app/actions/wormhole-actions.ts`, `src/lib/game/services/wormhole-construction-service.ts`

**Problem**: Players can build wormholes but have no UI to do so

**Solution**: Add wormhole construction panel with destination selection, cost display, and progress tracking

**Implementation**:
```typescript
// src/components/game/starmap/WormholeConstructionPanel.tsx

interface WormholeConstructionPanelProps {
  playerEmpire: Empire;
  sectors: Sector[];
  existingWormholes: Wormhole[];
  onConstruct: (destinationSectorId: string) => Promise<void>;
}

export function WormholeConstructionPanel({
  playerEmpire,
  sectors,
  existingWormholes,
  onConstruct
}: WormholeConstructionPanelProps) {
  const playerSector = sectors.find(s => s.id === playerEmpire.sectorId);
  const usedSlots = existingWormholes.filter(w => w.ownerId === playerEmpire.id).length;
  const maxSlots = calculateMaxWormholeSlots(playerEmpire.researchLevel);
  const availableSlots = maxSlots - usedSlots;

  // Calculate costs for each potential destination
  const destinations = sectors
    .filter(s => s.id !== playerSector?.id)
    .filter(s => !existingWormholes.some(w =>
      w.fromSectorId === playerSector?.id && w.toSectorId === s.id
    ))
    .map(sector => ({
      sector,
      cost: calculateWormholeCost(playerSector, sector),
      buildTime: calculateWormholeBuildTime(playerSector, sector),
      canAfford: playerEmpire.credits >= calculateWormholeCost(playerSector, sector).credits
    }));

  return (
    <LCARSPanel title="WORMHOLE CONSTRUCTION">
      <div className="space-y-4">
        {/* Slot Status */}
        <div className="text-sm text-gray-400">
          Available Slots: {availableSlots}/{maxSlots}
          {playerEmpire.researchLevel < 6 && (
            <span className="text-xs ml-2">
              (+1 slot at Research Level 6)
            </span>
          )}
        </div>

        {/* In Progress */}
        {existingWormholes
          .filter(w => w.ownerId === playerEmpire.id && !w.isComplete)
          .map(wh => (
            <WormholeProgress key={wh.id} wormhole={wh} />
          ))}

        {/* Available Destinations */}
        {availableSlots > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Build New Wormhole</h4>
            {destinations.map(({ sector, cost, buildTime, canAfford }) => (
              <div
                key={sector.id}
                className="flex items-center justify-between p-2 bg-gray-800/50 rounded"
              >
                <div>
                  <div className="font-medium">{sector.name}</div>
                  <div className="text-xs text-gray-400">
                    {cost.credits.toLocaleString()} credits • {cost.petroleum} petro • {buildTime} turns
                  </div>
                </div>
                <LCARSButton
                  variant={canAfford ? 'primary' : 'disabled'}
                  onClick={() => canAfford && onConstruct(sector.id)}
                >
                  BUILD
                </LCARSButton>
              </div>
            ))}
          </div>
        )}
      </div>
    </LCARSPanel>
  );
}

// Cost calculation (from PRD)
function calculateWormholeCost(from: Sector, to: Sector): { credits: number; petroleum: number } {
  const distance = calculateSectorDistance(from, to);
  // Base: 15k-40k credits, 300-800 petroleum based on distance
  const credits = 15000 + Math.floor(distance * 5000);
  const petroleum = 300 + Math.floor(distance * 100);
  return {
    credits: Math.min(credits, 40000),
    petroleum: Math.min(petroleum, 800)
  };
}

function calculateWormholeBuildTime(from: Sector, to: Sector): number {
  const distance = calculateSectorDistance(from, to);
  // Base: 6-15 turns based on distance
  return Math.min(6 + Math.floor(distance * 2), 15);
}
```

**Server Action**:
```typescript
// src/app/actions/wormhole-actions.ts

export async function startWormholeConstruction(
  gameId: string,
  empireId: string,
  destinationSectorId: string
): Promise<{ success: boolean; error?: string }> {
  // Validate slots available
  const empire = await getEmpire(empireId);
  const existingWormholes = await getWormholes(gameId, empireId);
  const maxSlots = calculateMaxWormholeSlots(empire.researchLevel);

  if (existingWormholes.length >= maxSlots) {
    return { success: false, error: 'No wormhole slots available' };
  }

  // Validate resources
  const cost = calculateWormholeCost(empire.sectorId, destinationSectorId);
  if (empire.credits < cost.credits || empire.petroleum < cost.petroleum) {
    return { success: false, error: 'Insufficient resources' };
  }

  // Deduct resources and create construction
  await deductResources(empireId, cost);
  await createWormholeConstruction(gameId, empireId, destinationSectorId);

  return { success: true };
}
```

**Files to Create/Modify**:
- `src/components/game/starmap/WormholeConstructionPanel.tsx` - NEW
- `src/app/actions/wormhole-actions.ts` - NEW
- `src/lib/game/services/wormhole-service.ts` - Add construction logic
- `src/components/game/starmap/SectorDetail.tsx` - Integrate panel

**Testing**:
- [ ] Unit test: Cost calculation matches PRD (15k-40k credits, 300-800 petro)
- [ ] Unit test: Build time calculation (6-15 turns)
- [ ] Unit test: Slot limits respected (2 base, +1 at L6, +1 at L8, max 4)
- [ ] E2E test: Full construction flow

**Commit**: `feat(M6.3): add wormhole construction UI with cost and progress tracking`

---

## Milestone 7: Boss Emergence System

### Purpose
Implement organic boss detection and create anti-snowball mechanics that activate when dominant empires emerge.

### 7.1 Boss Detection Logic

**Status**: ✅ COMPLETE
**Implemented**: 2025-12-30
**Files**: `src/lib/game/services/boss-detection-service.ts`, `src/lib/game/services/__tests__/boss-detection-service.test.ts`

**Design Philosophy** (from VISION.md):
> "Don't script bosses - let them emerge from bot-vs-bot conflict. A bot that won 5 battles IS the boss."

**Detection Criteria**:
- Won 5+ battles against other empires
- Networth ≥ 2× average empire networth
- Both conditions must be true

**Implementation**:
```typescript
// src/lib/game/services/boss-detection-service.ts

interface BossStatus {
  empireId: string;
  isBoss: boolean;
  battleWins: number;
  networthRatio: number; // vs average
  bossEmergenceTurn?: number;
}

export async function detectBosses(gameId: string): Promise<BossStatus[]> {
  const empires = await getGameEmpires(gameId);
  const averageNetworth = calculateAverageNetworth(empires);

  const bossStatuses: BossStatus[] = [];

  for (const empire of empires) {
    const battleWins = await countBattleWins(empire.id);
    const networthRatio = empire.networth / averageNetworth;

    const isBoss = battleWins >= 5 && networthRatio >= 2.0;

    // Check if newly became boss
    const previousStatus = await getBossStatus(empire.id);
    const bossEmergenceTurn = isBoss && !previousStatus?.isBoss
      ? await getCurrentTurn(gameId)
      : previousStatus?.bossEmergenceTurn;

    bossStatuses.push({
      empireId: empire.id,
      isBoss,
      battleWins,
      networthRatio,
      bossEmergenceTurn
    });
  }

  return bossStatuses;
}

export async function countBattleWins(empireId: string): Promise<number> {
  const attacks = await db
    .select()
    .from(combatLogs)
    .where(
      and(
        eq(combatLogs.attackerId, empireId),
        inArray(combatLogs.outcome, ['total_victory', 'victory', 'costly_victory'])
      )
    );

  return attacks.length;
}
```

**Schema Addition**:
```typescript
// Add to src/lib/db/schema.ts
export const bossTracking = pgTable("boss_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  empireId: uuid("empire_id").notNull().references(() => empires.id, { onDelete: "cascade" }),
  isBoss: boolean("is_boss").notNull().default(false),
  battleWins: integer("battle_wins").notNull().default(0),
  networthRatio: real("networth_ratio").notNull().default(1.0),
  bossEmergenceTurn: integer("boss_emergence_turn"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

**Integration with Turn Processor**:
```typescript
// Add to turn-processor.ts
async function processBossDetection(gameId: string): Promise<void> {
  const bossStatuses = await detectBosses(gameId);

  for (const status of bossStatuses) {
    await upsertBossStatus(status);

    // Send alert if newly emerged
    if (status.isBoss && !status.wasAlreadyBoss) {
      await createGalacticNews(gameId, {
        type: 'boss_emergence',
        title: `${empire.name} has become a dominant power!`,
        message: `With ${status.battleWins} victories and ${(status.networthRatio * 100).toFixed(0)}% of average networth, they pose a threat to all.`,
        empireId: status.empireId
      });
    }
  }
}
```

**Files to Create/Modify**:
- `src/lib/game/services/boss-detection-service.ts` - NEW
- `src/lib/db/schema.ts` - Add bossTracking table
- `src/lib/game/services/turn-processor.ts` - Add boss detection phase
- `src/lib/game/services/__tests__/boss-detection-service.test.ts` - NEW

**Testing**:
- [ ] Unit test: 4 wins + 2× networth = NOT boss
- [ ] Unit test: 5 wins + 1.9× networth = NOT boss
- [ ] Unit test: 5 wins + 2.0× networth = IS boss
- [ ] Unit test: Boss emergence turn tracked correctly
- [ ] Integration test: Galactic news fires on emergence

**Commit**: `feat(M7.1): add boss detection logic based on battle wins and networth`

---

### 7.2 Boss UI Indicators

**Status**: ✅ COMPLETE
**Implemented**: 2025-12-30
**Files**: `src/components/game/starmap/BossDetailPanel.tsx`, `src/components/game/starmap/EmpireNode.tsx`

**Purpose**: Make bosses visually obvious without cluttering UI

**Visual Indicators**:
1. **Starmap Node**: Crown icon + glow effect
2. **Sector Detail Panel**: "DOMINANT" label + threat warning
3. **Empire List**: Boss badge

**Implementation**:
```typescript
// src/components/game/starmap/EmpireNode.tsx

interface EmpireNodeProps {
  empire: Empire;
  bossStatus?: BossStatus;
  isPlayer: boolean;
  onClick: () => void;
}

export function EmpireNode({ empire, bossStatus, isPlayer, onClick }: EmpireNodeProps) {
  const isBoss = bossStatus?.isBoss ?? false;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center cursor-pointer",
        isPlayer && "ring-2 ring-lcars-amber",
        isBoss && "animate-pulse-slow"
      )}
      onClick={onClick}
    >
      {/* Boss Crown */}
      {isBoss && (
        <div className="absolute -top-4 text-xl">👑</div>
      )}

      {/* Empire Circle */}
      <div
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          isBoss
            ? "bg-red-600/80 ring-2 ring-red-400 shadow-lg shadow-red-500/50"
            : "bg-gray-700"
        )}
      >
        {isPlayer ? "★" : empire.name.charAt(0)}
      </div>

      {/* Empire Name */}
      <div className="mt-1 text-xs text-center">
        {empire.name}
        {isBoss && (
          <div className="text-red-400 text-[10px]">DOMINANT</div>
        )}
      </div>
    </div>
  );
}
```

**Boss Detail Panel**:
```typescript
// src/components/game/starmap/BossDetailPanel.tsx

export function BossDetailPanel({ empire, bossStatus }: { empire: Empire; bossStatus: BossStatus }) {
  return (
    <LCARSPanel variant="danger" title="⚠️ DOMINANT EMPIRE">
      <div className="space-y-2">
        <div className="text-lg font-bold">{empire.name}</div>
        <div className="text-sm text-gray-300">
          <div>Battles Won: {bossStatus.battleWins}</div>
          <div>Networth: {(bossStatus.networthRatio * 100).toFixed(0)}% of average</div>
          <div>Boss Since: Turn {bossStatus.bossEmergenceTurn}</div>
        </div>
        <div className="mt-4 p-2 bg-red-900/30 rounded text-xs">
          ⚡ Coalition bonus active: +10% attack, +5% defense vs this empire
        </div>
      </div>
    </LCARSPanel>
  );
}
```

**Files to Create/Modify**:
- `src/components/game/starmap/EmpireNode.tsx` - Add boss indicators
- `src/components/game/starmap/BossDetailPanel.tsx` - NEW
- `src/components/game/starmap/SectorDetail.tsx` - Integrate boss display

**Testing**:
- [ ] Visual test: Crown appears on boss nodes
- [ ] Visual test: Glow/pulse animation on boss
- [ ] Visual test: Panel shows correct boss stats

**Commit**: `feat(M7.2): add boss UI indicators with crown and glow effects`

---

### 7.3 Leader Containment Bonus

**Status**: ✅ COMPLETE
**Implemented**: 2025-12-30
**Files**: `src/lib/combat/containment-bonus.ts`, `src/lib/combat/__tests__/containment-bonus.test.ts`

**Purpose**: Give adjacent sector empires extra incentive to contain bosses

**Mechanics**:
- When a boss is in Sector X, all empires in adjacent sectors get bonuses when attacking that boss
- Bonus: +15% attack power, reduced force cost modifier (1.1× instead of 1.2×)

**Implementation**:
```typescript
// src/lib/combat/containment-bonus.ts

interface ContainmentBonus {
  attackBonus: number;      // +15% = 0.15
  forceCostReduction: number; // 1.2 → 1.1 = 0.1 reduction
}

export function calculateContainmentBonus(
  attackerSectorId: string,
  defenderSectorId: string,
  defenderIsBoss: boolean,
  adjacencyMap: Map<string, string[]>
): ContainmentBonus | null {
  if (!defenderIsBoss) {
    return null;
  }

  const adjacentSectors = adjacencyMap.get(defenderSectorId) ?? [];
  const isAdjacent = adjacentSectors.includes(attackerSectorId);

  if (!isAdjacent) {
    return null;
  }

  return {
    attackBonus: 0.15,           // +15% attack
    forceCostReduction: 0.1      // 1.2× → 1.1×
  };
}
```

**Integration with Combat**:
```typescript
// In unified-combat.ts
export function resolveCombatWithContainment(
  attacker: CombatForces,
  defender: CombatForces,
  context: CombatContext
): CombatOutcome {
  let attackerPower = calculateCombatPower(attacker.forces);

  // Apply containment bonus if attacking boss from adjacent sector
  const containment = calculateContainmentBonus(
    context.attackerSectorId,
    context.defenderSectorId,
    context.defenderIsBoss,
    context.adjacencyMap
  );

  if (containment) {
    attackerPower *= (1 + containment.attackBonus);
  }

  // Continue with normal combat resolution...
}
```

**Files to Create/Modify**:
- `src/lib/combat/containment-bonus.ts` - NEW
- `src/lib/combat/unified-combat.ts` - Integrate containment bonus
- `src/lib/combat/__tests__/containment-bonus.test.ts` - NEW

**Testing**:
- [ ] Unit test: No bonus if defender is not boss
- [ ] Unit test: No bonus if attacker is not in adjacent sector
- [ ] Unit test: +15% bonus applied when adjacent to boss
- [ ] Integration test: Combat results reflect bonus

**Commit**: `feat(M7.3): add leader containment bonus for adjacent sector attacks`

---

## Milestone 8: Player Guidance Panels

### Purpose
Reduce decision paralysis by providing clear guidance on threats and expansion options.

### 8.1 Threat Assessment Panel

**Status**: ✅ COMPLETE
**Implemented**: 2025-12-30
**Files**: `src/components/game/panels/ThreatAssessmentPanel.tsx`, `src/lib/game/services/threat-service.ts`, `src/lib/game/services/__tests__/threat-service.test.ts`

**Purpose**: Answer "Who should I be worried about?" at a glance

**Panel Contents**:
- Color-coded threat levels (🔴 Immediate, 🟡 Watch, 🟢 Neutral)
- Relative power (1.8× your networth, not raw numbers)
- Recent actions (attacked you, building up, etc.)
- Diplomatic status

**Implementation**:
```typescript
// src/components/game/panels/ThreatAssessmentPanel.tsx

interface ThreatInfo {
  empire: Empire;
  threatLevel: 'immediate' | 'watch' | 'neutral' | 'friendly';
  networthRatio: number;
  militaryRatio: number;
  recentAction?: string;
  diplomaticStatus?: 'allied' | 'nap' | 'neutral' | 'hostile';
  isBoss: boolean;
}

function calculateThreatLevel(info: ThreatInfo): ThreatInfo['threatLevel'] {
  // Immediate: Boss OR attacked you recently OR 2×+ your networth + aggressive
  if (info.isBoss) return 'immediate';
  if (info.recentAction === 'attacked_you') return 'immediate';
  if (info.networthRatio >= 2.0 && info.diplomaticStatus === 'hostile') return 'immediate';

  // Friendly: Allied or NAP
  if (info.diplomaticStatus === 'allied' || info.diplomaticStatus === 'nap') return 'friendly';

  // Watch: 1.5×+ networth or building military
  if (info.networthRatio >= 1.5) return 'watch';
  if (info.recentAction === 'military_buildup') return 'watch';

  return 'neutral';
}

export function ThreatAssessmentPanel({
  playerEmpire,
  sectorEmpires,
  bossStatuses
}: ThreatAssessmentPanelProps) {
  const threats = sectorEmpires
    .filter(e => e.id !== playerEmpire.id)
    .map(empire => {
      const bossStatus = bossStatuses.find(b => b.empireId === empire.id);
      const info: ThreatInfo = {
        empire,
        threatLevel: 'neutral', // Calculated below
        networthRatio: empire.networth / playerEmpire.networth,
        militaryRatio: calculateMilitaryRatio(empire, playerEmpire),
        recentAction: getRecentAction(empire.id, playerEmpire.id),
        diplomaticStatus: getDiplomaticStatus(empire.id, playerEmpire.id),
        isBoss: bossStatus?.isBoss ?? false
      };
      info.threatLevel = calculateThreatLevel(info);
      return info;
    })
    .sort((a, b) => threatPriority(a.threatLevel) - threatPriority(b.threatLevel));

  return (
    <LCARSPanel title="THREAT ASSESSMENT" className="w-80">
      <div className="space-y-3">
        {threats.map(({ empire, threatLevel, networthRatio, militaryRatio, recentAction, isBoss }) => (
          <div
            key={empire.id}
            className={cn(
              "p-2 rounded border-l-4",
              threatLevel === 'immediate' && "border-red-500 bg-red-900/20",
              threatLevel === 'watch' && "border-yellow-500 bg-yellow-900/20",
              threatLevel === 'neutral' && "border-gray-500 bg-gray-900/20",
              threatLevel === 'friendly' && "border-green-500 bg-green-900/20"
            )}
          >
            <div className="flex items-center gap-2">
              <ThreatIcon level={threatLevel} />
              <span className="font-medium">{empire.name}</span>
              {isBoss && <span className="text-xs text-red-400">👑 BOSS</span>}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              <div>Networth: {networthRatio.toFixed(1)}× yours</div>
              <div>Military: {militaryRatio.toFixed(1)}× yours</div>
              {recentAction && (
                <div className="text-yellow-400 mt-1">{formatRecentAction(recentAction)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </LCARSPanel>
  );
}
```

**Files to Create/Modify**:
- `src/components/game/panels/ThreatAssessmentPanel.tsx` - NEW
- `src/components/game/starmap/SectorDetail.tsx` - Add right sidebar
- `src/lib/game/services/threat-service.ts` - Calculate threat data

**Testing**:
- [ ] Unit test: Boss always shows as immediate threat
- [ ] Unit test: Recent attacker shows as immediate
- [ ] Unit test: Allied empires show as friendly
- [ ] Visual test: Color coding is clear and accessible

**Commit**: `feat(M8.1): add Threat Assessment Panel with color-coded threats`

---

### 8.2 Expansion Options Panel

**Status**: ✅ COMPLETE
**Implemented**: 2025-12-30
**Files**: `src/components/game/panels/ExpansionOptionsPanel.tsx`, `src/lib/game/services/expansion-service.ts`, `src/lib/game/services/__tests__/expansion-service.test.ts`

**Purpose**: Answer "How can I expand?" with clear options

**Panel Contents**:
- **Borders**: Adjacent sectors with status (locked/unlocked), attack cost modifier
- **Wormholes**: Available destinations, costs, current constructions

**Implementation**:
```typescript
// src/components/game/panels/ExpansionOptionsPanel.tsx

interface BorderOption {
  sectorId: string;
  sectorName: string;
  status: 'locked' | 'unlocked';
  unlockTurn?: number;
  attackCostModifier: number; // 1.2×
  empireCount: number;
  threatLevel: 'low' | 'medium' | 'high';
}

interface WormholeOption {
  sectorId: string;
  sectorName: string;
  cost: { credits: number; petroleum: number };
  buildTime: number;
  attackCostModifier: number; // 1.5×
}

export function ExpansionOptionsPanel({
  playerEmpire,
  borders,
  sectors,
  wormholes,
  currentTurn
}: ExpansionOptionsPanelProps) {
  const usedWormholeSlots = wormholes.filter(w => w.ownerId === playerEmpire.id).length;
  const maxWormholeSlots = calculateMaxWormholeSlots(playerEmpire.researchLevel);
  const availableSlots = maxWormholeSlots - usedWormholeSlots;

  const borderOptions = calculateBorderOptions(playerEmpire.sectorId, borders, sectors, currentTurn);
  const wormholeOptions = calculateWormholeOptions(playerEmpire, sectors, wormholes);

  return (
    <LCARSPanel title="EXPANSION OPTIONS" className="w-80">
      {/* Borders Section */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-lcars-amber mb-2">
          BORDERS (1.2× attack cost)
        </h4>
        <div className="space-y-2">
          {borderOptions.map(option => (
            <BorderOptionRow key={option.sectorId} option={option} />
          ))}
        </div>
      </div>

      {/* Wormholes Section */}
      <div>
        <h4 className="text-sm font-medium text-lcars-amber mb-2">
          WORMHOLES (1.5× attack cost)
        </h4>
        <div className="text-xs text-gray-400 mb-2">
          Slots: {usedWormholeSlots}/{maxWormholeSlots} used
          {playerEmpire.researchLevel < 6 && " (+1 at Research 6)"}
        </div>

        {/* In Progress */}
        {wormholes
          .filter(w => w.ownerId === playerEmpire.id && !w.isComplete)
          .map(wh => (
            <WormholeProgressRow key={wh.id} wormhole={wh} />
          ))}

        {/* Build Options */}
        {availableSlots > 0 && (
          <div className="space-y-2 mt-2">
            {wormholeOptions.slice(0, 3).map(option => (
              <WormholeOptionRow
                key={option.sectorId}
                option={option}
                onBuild={() => handleBuildWormhole(option.sectorId)}
              />
            ))}
          </div>
        )}
      </div>
    </LCARSPanel>
  );
}

function BorderOptionRow({ option }: { option: BorderOption }) {
  return (
    <div className="p-2 bg-gray-800/50 rounded">
      <div className="flex items-center justify-between">
        <span className="font-medium">{option.sectorName}</span>
        {option.status === 'locked' ? (
          <span className="text-xs text-yellow-400">Turn {option.unlockTurn}</span>
        ) : (
          <span className="text-xs text-green-400">UNLOCKED</span>
        )}
      </div>
      <div className="text-xs text-gray-400">
        {option.empireCount} empires • Threat: {option.threatLevel}
      </div>
    </div>
  );
}
```

**Files to Create/Modify**:
- `src/components/game/panels/ExpansionOptionsPanel.tsx` - NEW
- `src/components/game/starmap/SectorDetail.tsx` - Add left sidebar
- `src/lib/game/services/expansion-service.ts` - Calculate expansion data

**Testing**:
- [ ] Unit test: Locked borders show unlock turn
- [ ] Unit test: Wormhole slots calculated correctly by research level
- [ ] Visual test: Panel layout is clear and scannable

**Commit**: `feat(M8.2): add Expansion Options Panel with borders and wormholes`

---

## Milestone 9: Coalition Raid Mechanics

### Purpose
Implement coordinated attack bonuses against bosses, with territory distribution.

> **NOTE (2025-12-31):** Original M9 scope (Coalition Raids) was replaced with an onboarding tutorial system. The tutorial system (TutorialOverlay.tsx) provides contextual guidance for new players. Coalition raid mechanics remain as future work.

### 9.1 Coalition Raid Detection

**Status**: ⏸️ DEFERRED (Replaced with tutorial system)
**Feature Flag**: `FEATURE_COALITION_RAIDS`
**Note**: Tutorial system implemented instead (TutorialOverlay.tsx)

**Criteria**:
- Target must be a detected boss
- 3+ empires attack the same boss in the same turn

**Implementation**:
```typescript
// src/lib/combat/coalition-raid-service.ts

interface CoalitionRaid {
  targetEmpireId: string;
  attackerIds: string[];
  isValidRaid: boolean;
  bonusPercentage: number; // +5% per attacker beyond 2
}

export function detectCoalitionRaid(
  attacks: Attack[],
  bossStatuses: BossStatus[]
): CoalitionRaid | null {
  if (!isFeatureEnabled('COALITION_RAIDS')) {
    return null;
  }

  // Group attacks by target
  const attacksByTarget = groupBy(attacks, a => a.targetId);

  for (const [targetId, targetAttacks] of Object.entries(attacksByTarget)) {
    // Check if target is a boss
    const isBoss = bossStatuses.some(b => b.empireId === targetId && b.isBoss);
    if (!isBoss) continue;

    // Check if 3+ attackers
    const attackerIds = [...new Set(targetAttacks.map(a => a.attackerId))];
    if (attackerIds.length < 3) continue;

    // Valid coalition raid!
    const bonusPercentage = (attackerIds.length - 2) * 5; // +5% per attacker beyond 2

    return {
      targetEmpireId: targetId,
      attackerIds,
      isValidRaid: true,
      bonusPercentage: Math.min(bonusPercentage, 25) // Cap at +25%
    };
  }

  return null;
}
```

**Files to Create/Modify**:
- `src/lib/combat/coalition-raid-service.ts` - NEW
- `src/lib/game/services/turn-processor.ts` - Detect raids before combat resolution

**Commit**: `feat(M9.1): add coalition raid detection for coordinated boss attacks`

---

### 9.2 Raid Combat Bonuses

**Status**: ⏸️ DEFERRED
**Note**: Part of coalition raid mechanics, deferred with M9.1

**Mechanics**:
- All raid participants get +5% combat power per additional attacker
- Example: 4 attackers = +10% each, 5 attackers = +15% each

**Integration**:
```typescript
// In unified-combat.ts
export function resolveCombatWithRaidBonus(
  attacker: CombatForces,
  defender: CombatForces,
  raid: CoalitionRaid | null,
  context: CombatContext
): CombatOutcome {
  let attackerPower = calculateCombatPower(attacker.forces);

  // Apply raid bonus if attacking as part of coalition
  if (raid && raid.attackerIds.includes(context.attackerId)) {
    attackerPower *= (1 + raid.bonusPercentage / 100);
  }

  // Continue with normal combat resolution...
}
```

**Files to Modify**:
- `src/lib/combat/unified-combat.ts` - Integrate raid bonus

**Testing**:
- [ ] Unit test: 3 attackers = +5% each
- [ ] Unit test: 4 attackers = +10% each
- [ ] Unit test: Bonus caps at +25%
- [ ] Integration test: Combat results reflect bonus

**Commit**: `feat(M9.2): add raid combat bonuses for coalition attacks on bosses`

---

### 9.3 Raid Territory Distribution

**Status**: ⏸️ DEFERRED
**Note**: Part of coalition raid mechanics, deferred with M9.1

**Mechanics**: When boss is eliminated via raid, distribute captured planets

**Distribution Model** (Hybrid):
- Minimum 1 planet per participant (participation award)
- Remaining planets distributed by damage %

**Implementation**:
```typescript
// src/lib/combat/raid-distribution-service.ts

interface RaidDistribution {
  empireId: string;
  planetsAwarded: number;
  damagePercentage: number;
  eliminationCredit: number; // Fraction of 1.0
}

export function calculateRaidDistribution(
  raid: CoalitionRaid,
  totalPlanetsCaptured: number,
  damageByAttacker: Map<string, number>
): RaidDistribution[] {
  const totalDamage = Array.from(damageByAttacker.values()).reduce((a, b) => a + b, 0);
  const participantCount = raid.attackerIds.length;

  // Step 1: Each participant gets minimum 1 planet
  const minimumPlanets = Math.min(participantCount, totalPlanetsCaptured);
  let remainingPlanets = totalPlanetsCaptured - minimumPlanets;

  const distribution: RaidDistribution[] = raid.attackerIds.map(empireId => {
    const damage = damageByAttacker.get(empireId) ?? 0;
    const damagePercentage = damage / totalDamage;

    return {
      empireId,
      planetsAwarded: 1, // Minimum
      damagePercentage,
      eliminationCredit: 1 / participantCount // Split elimination credit
    };
  });

  // Step 2: Distribute remaining planets by damage %
  while (remainingPlanets > 0) {
    // Award to highest damage dealer who hasn't maxed out proportionally
    const sorted = distribution.sort((a, b) => {
      const aExpected = totalPlanetsCaptured * a.damagePercentage;
      const bExpected = totalPlanetsCaptured * b.damagePercentage;
      return (bExpected - b.planetsAwarded) - (aExpected - a.planetsAwarded);
    });

    sorted[0].planetsAwarded++;
    remainingPlanets--;
  }

  return distribution;
}
```

**Files to Create/Modify**:
- `src/lib/combat/raid-distribution-service.ts` - NEW
- `src/lib/combat/unified-combat.ts` - Apply distribution on boss elimination
- `src/app/actions/combat-actions.ts` - Handle planet transfers

**Testing**:
- [ ] Unit test: Each participant gets minimum 1 planet
- [ ] Unit test: Remaining planets distributed by damage %
- [ ] Unit test: Elimination credit split equally

**Commit**: `feat(M9.3): add raid territory distribution for boss eliminations`

---

## Milestone 10: Strategic Variety

### Purpose
Add depth and replayability through sector traits and unified victory tracking.

### 10.1 Sector Traits

**Status**: ✅ COMPLETE
**Implemented**: 2025-12-31
**Files**: `src/lib/game/services/sector-traits-service.ts`, `src/lib/game/services/__tests__/sector-traits-service.test.ts`
**Feature Flag**: `FEATURE_SECTOR_TRAITS`

**Sector Types**:
| Trait | Bonus | Strategic Appeal |
|-------|-------|------------------|
| Core Worlds | +20% credits | Economic players |
| Mining Belt | +20% ore | Military builders |
| Frontier | +20% research | Tech Rush players |
| Dead Zone | -20% pop growth, -50% competition | Risk-takers |
| Nebula Region | +20% covert success | Schemer players |

**Implementation**:
```typescript
// src/lib/game/services/sector-traits-service.ts

export type SectorTrait =
  | 'core_worlds'
  | 'mining_belt'
  | 'frontier'
  | 'dead_zone'
  | 'nebula_region';

export const SECTOR_TRAIT_BONUSES: Record<SectorTrait, SectorBonus> = {
  core_worlds: {
    creditMultiplier: 1.20,
    description: '+20% credit generation'
  },
  mining_belt: {
    oreMultiplier: 1.20,
    description: '+20% ore production'
  },
  frontier: {
    researchMultiplier: 1.20,
    description: '+20% research points'
  },
  dead_zone: {
    populationGrowthMultiplier: 0.80,
    botDensityMultiplier: 0.50,
    description: '-20% pop growth, fewer competitors'
  },
  nebula_region: {
    covertSuccessBonus: 0.20,
    description: '+20% covert ops success'
  }
};

export function assignSectorTraits(sectorCount: number): Map<string, SectorTrait> {
  const traits: SectorTrait[] = [
    'core_worlds', 'core_worlds',      // 2
    'mining_belt', 'mining_belt',      // 2
    'frontier', 'frontier',            // 2
    'dead_zone',                       // 1
    'nebula_region',                   // 1
    'core_worlds', 'mining_belt'       // 2 neutral/mixed
  ];

  // Shuffle and assign
  const shuffled = shuffleArray(traits);
  const assignments = new Map<string, SectorTrait>();

  for (let i = 0; i < sectorCount; i++) {
    assignments.set(`sector-${i}`, shuffled[i]);
  }

  return assignments;
}
```

**Files to Create/Modify**:
- `src/lib/game/services/sector-traits-service.ts` - NEW
- `src/lib/db/schema.ts` - Add trait to sectors table
- `src/lib/game/services/resource-engine.ts` - Apply trait bonuses
- `src/components/game/starmap/SectorBox.tsx` - Display trait

**Commit**: `feat(M10.1): add sector traits for strategic variety`

---

### 10.2 Victory Points System

**Status**: ✅ COMPLETE
**Implemented**: 2025-12-31
**Files**: `src/lib/game/services/victory-points-service.ts`, `src/lib/game/services/__tests__/victory-points-service.test.ts`

**Purpose**: Unified metric for measuring empire power across multiple dimensions

**VP Sources**:
| Source | Points | Condition |
|--------|--------|-----------|
| Territory | 1-3 VP | 10/20/30 planets |
| Networth | 1-3 VP | 1.2×/1.5×/2× average |
| Military | 1-2 VP | 1.5×/2× average military |
| Diplomacy | 1-2 VP | 2/4 active alliances |
| Eliminations | 1-2 VP | 2/4 eliminations |
| Research | 1-2 VP | Level 6/8 research |

**Implementation**:
```typescript
// src/lib/game/services/victory-points-service.ts

interface VictoryPointBreakdown {
  territory: number;
  networth: number;
  military: number;
  diplomacy: number;
  eliminations: number;
  research: number;
  total: number;
}

export function calculateVictoryPoints(
  empire: Empire,
  gameStats: GameStats
): VictoryPointBreakdown {
  return {
    territory: calculateTerritoryVP(empire.planetCount),
    networth: calculateNetworthVP(empire.networth, gameStats.averageNetworth),
    military: calculateMilitaryVP(empire.militaryPower, gameStats.averageMilitary),
    diplomacy: calculateDiplomacyVP(empire.allianceCount),
    eliminations: calculateEliminationVP(empire.eliminationCount),
    research: calculateResearchVP(empire.researchLevel),
    total: 0 // Sum of above
  };
}

function calculateTerritoryVP(planets: number): number {
  if (planets >= 30) return 3;
  if (planets >= 20) return 2;
  if (planets >= 10) return 1;
  return 0;
}

// Similar for other categories...
```

**Coalition Trigger**:
At 7+ VP, coalition penalties apply (already implemented, just wire up VP calculation)

**Files to Create/Modify**:
- `src/lib/game/services/victory-points-service.ts` - NEW
- `src/components/game/panels/VictoryProgressPanel.tsx` - NEW
- `src/lib/game/services/turn-processor.ts` - Calculate VP each turn

**Commit**: `feat(M10.2): add Victory Points system for unified power tracking`

---

### 10.3 Shared Victory Rewards

**Status**: ✅ COMPLETE
**Implemented**: 2025-12-31
**Files**: `src/lib/game/services/shared-victory-service.ts`, `src/lib/game/services/__tests__/shared-victory-service.test.ts`

**Purpose**: Make raid participation valuable for all participants

**Rewards**:
1. **Elimination Credit**: Split equally (0.25 each if 4 attackers)
2. **Reputation Bonus**: +5 reputation for raid participation
3. **Resource Bonus**: +10% production for 10 turns
4. **Morale Bonus**: +5% army effectiveness for 5 turns

**Implementation**:
```typescript
// src/lib/combat/raid-rewards-service.ts

interface RaidRewards {
  eliminationCredit: number;
  reputationBonus: number;
  productionBonusTurns: number;
  productionBonusAmount: number;
  moraleBonus: number;
  moraleBonusTurns: number;
}

export function calculateRaidRewards(participantCount: number): RaidRewards {
  return {
    eliminationCredit: 1 / participantCount,
    reputationBonus: 5,
    productionBonusTurns: 10,
    productionBonusAmount: 0.10, // +10%
    moraleBonus: 0.05, // +5%
    moraleBonusTurns: 5
  };
}

export async function applyRaidRewards(
  raid: CoalitionRaid,
  participantCount: number
): Promise<void> {
  const rewards = calculateRaidRewards(participantCount);

  for (const empireId of raid.attackerIds) {
    await applyRewardsToEmpire(empireId, rewards);

    // Create notification
    await createMessage(empireId, {
      type: 'raid_reward',
      title: '🏆 Coalition Victory!',
      message: `You participated in the takedown of a dominant power. Rewards: +${rewards.reputationBonus} reputation, +${rewards.productionBonusAmount * 100}% production for ${rewards.productionBonusTurns} turns.`
    });
  }
}
```

**Files to Create/Modify**:
- `src/lib/combat/raid-rewards-service.ts` - NEW
- `src/lib/db/schema.ts` - Add temporary bonus tracking
- `src/lib/game/services/resource-engine.ts` - Apply production bonus

**Commit**: `feat(M10.3): add shared victory rewards for raid participants`

---

## Testing Strategy

### Per-Milestone Testing

Each milestone includes:
1. **Unit tests** for new services
2. **Integration tests** for database operations
3. **Visual tests** for UI components (manual)

### Simulation Testing

After M9 (Coalition Raids):
- Run 10-game simulation with 50 bots
- Verify: Boss emergence rate, coalition formation, raid success rate
- Target: 1-2 bosses per game, 0-1 coalition raids per game

### Playtest Readiness

**After Milestone 8**: Game is playtest-ready with:
- ✅ Fair sector starts
- ✅ Phased expansion (borders unlock)
- ✅ Wormhole construction
- ✅ Boss detection and indicators
- ✅ Player guidance panels

**After Milestone 10**: Full feature set for balance testing

---

## Implementation Order Rationale

### Why This Order?

1. **M6 (Geographic)**: Foundation for all other features
2. **M7 (Boss Detection)**: Required for coalition mechanics
3. **M8 (Player Guidance)**: Can be done in parallel, improves playtest experience
4. **M9 (Coalition Raids)**: Depends on M7
5. **M10 (Variety)**: Polish and depth, lower priority

### Feature Flags

| Flag | Default | Features |
|------|---------|----------|
| `FEATURE_BORDER_DISCOVERY` | ON | M6.2 |
| `FEATURE_BOSS_DETECTION` | ON | M7.1 |
| `FEATURE_LEADER_CONTAINMENT` | ON | M7.3 |
| `FEATURE_COALITION_RAIDS` | OFF | M9.* |
| `FEATURE_SECTOR_TRAITS` | OFF | M10.1 |
| `FEATURE_VP_SYSTEM` | OFF | M10.2 |

---

## Success Criteria

### Geographic Strategy
- [ ] All sectors within ±10% networth
- [ ] Borders unlock between Turn 10-15
- [ ] Wormhole construction works end-to-end

### Boss System
- [ ] Boss detection triggers at 5 wins + 2× networth
- [ ] Boss indicators visible on starmap
- [ ] Containment bonus applies correctly

### Player Guidance
- [ ] Threat panel shows color-coded threats
- [ ] Expansion panel shows all options
- [ ] New players understand their options within 2 minutes

### Coalition Raids
- [ ] Raid bonus applies only to boss targets
- [ ] Territory distribution is fair
- [ ] Rewards make participation worthwhile

---

## Implementation Summary

### Completed Milestones

| Milestone | Status | Date |
|-----------|--------|------|
| M6.1 Sector Balancing | ✅ Complete | 2025-12-30 |
| M6.2 Border Discovery | ✅ Complete | 2025-12-30 |
| M6.3 Wormhole UI | ✅ Complete | 2025-12-30 |
| M7.1 Boss Detection | ✅ Complete | 2025-12-30 |
| M7.2 Boss UI | ✅ Complete | 2025-12-30 |
| M7.3 Containment Bonus | ✅ Complete | 2025-12-30 |
| M8.1 Threat Panel | ✅ Complete | 2025-12-30 |
| M8.2 Expansion Panel | ✅ Complete | 2025-12-30 |
| M9.* Coalition Raids | ⏸️ Deferred | - |
| M10.1 Sector Traits | ✅ Complete | 2025-12-31 |
| M10.2 Victory Points | ✅ Complete | 2025-12-31 |
| M10.3 Shared Rewards | ✅ Complete | 2025-12-31 |

### Notes

- **M9 Scope Change**: Original coalition raid mechanics were replaced with an onboarding tutorial system (TutorialOverlay.tsx). Coalition raids remain as future work.
- **Test Coverage**: 881+ tests passing across all service modules

### Security Review (2025-12-31)

A comprehensive security review was conducted. Key findings:

**Critical Issues (Pre-existing, architectural):**
- No user authentication system
- Admin endpoints lack authorization
- SQL injection risk in admin-actions.ts via `sql.raw()`

**Recommendations:**
- Implement authentication before production deployment
- Add rate limiting to game actions
- Set sameSite: "strict" on cookies

See security review documentation for full details.

---

*Plan created: 2025-12-30*
*Last updated: 2025-12-31*
*Status: IMPLEMENTATION COMPLETE (M6, M7, M8, M10)*

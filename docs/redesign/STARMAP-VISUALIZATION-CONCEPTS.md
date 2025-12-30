# Star Map Visualization Concepts

**Document**: Starmap Redesign Proposals
**Date**: 2025-12-30
**Status**: Proposal - Awaiting Approval
**Related**: GAME-DESIGN-EVALUATION.md (Influence Sphere Model)

---

## Current Implementation Issues

### Problems Identified
1. **Erratic node behavior**: Clicking opponent empires causes shaking/jittering
   - Root cause: D3 force simulation fighting with drag handlers
   - Lines 444-482 in `Starmap.tsx` - drag handlers conflict with physics
2. **No sphere of influence**: All 100 empires shown equally
3. **No distance concept**: Can attack anyone, anywhere (no tactical geography)
4. **Performance concerns**: 100-node force graph is heavy
5. **Cognitive overload**: Too many nodes = visual noise

### Design Goals (from GAME-DESIGN-EVALUATION.md)
- Show 3-5 "immediate neighbors" (can attack freely)
- Show "expanded neighbors" (can attack with penalty)
- Hide/gray "distant empires" (cannot attack)
- Visualize wormholes as special connections
- Scale to 100 empires while showing only ~10 relevant ones
- Support MMO-style 100-player games

---

## Concept 1: Radial Sphere of Influence

**Philosophy**: "You are the center of your universe"

### Visual Structure

```
┌────────────────────────────────────────────────────────────────────┐
│                    GALACTIC INFLUENCE MAP                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│                       ░░░ Far Away ░░░                             │
│            ▓▓▓ [Distant Neighbor - grayed] ▓▓▓                     │
│      ▓▓▓                                        ▓▓▓                │
│         [Distant]    ═══ Expanded Sphere ═══    [Distant]         │
│                ◯────────────────────────────◯                      │
│          ◯────   ┌─────────────────┐   ────◯                      │
│         /  Imm   │                 │  Imm   \                      │
│       ◯  (Red)   │    ★ PLAYER     │ (Green) ◯                    │
│         \  Nbr   │   (YOU - 12p)   │  Nbr   /                      │
│          ◯────   └─────────────────┘   ────◯                      │
│                ◯────────────────────────────◯                      │
│                      ════════════                                  │
│         [Distant]    Immediate Sphere     [Distant]               │
│      ▓▓▓          (5 neighbors, can attack) ▓▓▓                    │
│            ▓▓▓                            ▓▓▓                      │
│                  ⚡ WORMHOLE CONNECTION ⚡                          │
│                         ║ (Special)                                │
│                     ◯───┘                                          │
│                  [Wormhole neighbor - purple glow]                 │
│                                                                    │
│  Legend:                                                           │
│  ◯ = Immediate Neighbor (full detail, can attack)                 │
│  ▓▓▓ = Distant Neighbor (reduced detail, 2x attack cost)          │
│  ░░░ = Far Away (hidden until discovered)                          │
│  ⚡ = Wormhole (instant connection to distant sector)              │
└────────────────────────────────────────────────────────────────────┘
```

### Technical Implementation

```typescript
interface SphereOfInfluence {
  center: Empire;           // Player (always center, fixed position)
  immediate: Empire[];      // 3-5 neighbors (inner ring, 150px radius)
  distant: Empire[];        // 5-10 neighbors (outer ring, 300px radius, grayed)
  farAway: Empire[];        // Rest (not rendered until discovered)
  wormholes: WormholeConnection[]; // Special connections
}

interface WormholeConnection {
  from: EmpireId;
  to: EmpireId;
  type: 'natural' | 'constructed';
  discoveredTurn: number;
}

// Static positioning (NO D3 force simulation)
function calculateSpherePositions(sphere: SphereOfInfluence): PositionMap {
  const positions = new Map();

  // Player at center (fixed)
  positions.set(sphere.center.id, { x: 450, y: 300 });

  // Immediate neighbors: inner ring (150px radius)
  sphere.immediate.forEach((empire, i) => {
    const angle = (i / sphere.immediate.length) * 2 * Math.PI;
    positions.set(empire.id, {
      x: 450 + Math.cos(angle) * 150,
      y: 300 + Math.sin(angle) * 150
    });
  });

  // Distant neighbors: outer ring (300px radius, grayed)
  sphere.distant.forEach((empire, i) => {
    const angle = (i / sphere.distant.length) * 2 * Math.PI;
    positions.set(empire.id, {
      x: 450 + Math.cos(angle) * 300,
      y: 300 + Math.sin(angle) * 300
    });
  });

  return positions;
}
```

### Features
- **Static layout**: NO force simulation = no jittering
- **Radial tiers**: Immediate (bright) → Distant (grayed) → Hidden (not shown)
- **Player-centric**: You're always at center
- **Smooth transitions**: When neighbors change, animate ring positions
- **Wormholes**: Special purple connections that bypass distance
- **Click behavior**: Click empires for detail panel (no drag)

### Pros
- ✅ Solves jittering (no physics simulation)
- ✅ Clear visual hierarchy (distance = importance)
- ✅ Scales to 100 empires (shows only ~15)
- ✅ Intuitive (closer = can attack)
- ✅ Player always knows their tactical situation

### Cons
- ❌ Less "galaxy" feel (no free-form map)
- ❌ Empire positions don't relate to each other (only to player)
- ❌ Limited interactivity (no dragging)

---

## Concept 2: Regional Cluster Map

**Philosophy**: "The galaxy has neighborhoods"

### Visual Structure

```
┌────────────────────────────────────────────────────────────────────┐
│                      SECTOR MAP VIEW                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   ┌──────────────┐         ┌──────────────┐                       │
│   │  SECTOR A    │ ═══════ │  SECTOR B    │                       │
│   │  Outer Rim   │ Wormhl  │  Core Worlds │                       │
│   │              │         │              │                       │
│   │  ◯ ◯  ◯      │         │   ◯ ◯        │                       │
│   │    ◯    ◯    │         │  ◯   ◯       │                       │
│   │  ◯       ◯   │         │              │                       │
│   │   (8 emprs)  │         │  (7 emprs)   │                       │
│   └───────┬──────┘         └──────┬───────┘                       │
│           │ natural border        │                               │
│           │                       │                               │
│   ┌───────┴──────┐         ┌──────┴───────┐                       │
│   │  SECTOR C    │         │  SECTOR D    │ ════╗                 │
│   │  Mining Belt │         │ ★ YOUR ZONE  │     ║ player          │
│   │              │         │              │     ║ constructed     │
│   │  ◯  ◯  ◯     │         │  ◯→★←◯       │     ║ wormhole        │
│   │     ◯        │         │   ↓          │     ║                 │
│   │              │         │  ◯  ◯  ◯     │     ║                 │
│   │  (5 emprs)   │         │  (YOU + 9)   │     ║                 │
│   └──────────────┘         └──────────────┘═════╝                 │
│                                   ║                                │
│                            ┌──────┴───────┐                        │
│                            │  SECTOR E    │                        │
│                            │  Wild Space  │                        │
│                            │     ◯ ◯      │                        │
│                            │   ◯   ◯      │                        │
│                            │  (6 emprs)   │                        │
│                            └──────────────┘                        │
│                                                                    │
│  Controls: [Zoom to Sector] [Build Wormhole Gate] [Intel Scan]   │
│  ◯ = Empire   ★ = You   ═══ = Wormhole   │ = Natural Border      │
└────────────────────────────────────────────────────────────────────┘
```

### Zoom Levels

**Level 1: Galaxy View** (shown above)
- 10 regions/sectors displayed as boxes
- Each shows empire count, not individual empires
- Your sector highlighted
- Wormhole connections between sectors

**Level 2: Sector Detail View** (click sector to zoom)
```
┌────────────────────────────────────────────────────────────────────┐
│  ◄ Back to Galaxy          SECTOR D - YOUR REGION                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│        Warlord Zyx                                                 │
│        ◯ (Red - Hostile)                                           │
│         ╲                                                          │
│          ╲                                                         │
│           ╲                                                        │
│            ╲                                                       │
│   Iron Fist ◯────────────★ YOUR EMPIRE                            │
│   (At War)   ╲          / (15 planets, Ecstatic)                  │
│               ╲        /                                           │
│                ╲      /                                            │
│   Merchant Co.  ◯────◯ Velara Union                               │
│   (Neutral)          (Allied - NAP)                               │
│                                                                    │
│   Distant:                                                         │
│   ▓▓▓ Schemer (Sector B, accessible via wormhole - 1.5x cost)     │
│                                                                    │
│  [Attack] [Send Message] [Propose Treaty] [Launch Spy Mission]    │
└────────────────────────────────────────────────────────────────────┘
```

### Technical Implementation

```typescript
interface GalaxySector {
  id: string;
  name: string;
  empires: Empire[];
  position: { x: number; y: number };
  connections: SectorConnection[];
  isPlayerSector: boolean;
}

interface SectorConnection {
  toSectorId: string;
  type: 'natural' | 'wormhole_constructed' | 'wormhole_discovered';
  attackPenalty: number; // 1.0 = no penalty, 1.5 = 50% more forces needed
}

// Sector assignment (game setup)
function assignEmpirestoSectors(empires: Empire[]): Map<string, GalaxySector> {
  const sectorCount = Math.ceil(empires.length / 10);
  const sectors = new Map();

  // Create ~10 empires per sector
  for (let i = 0; i < sectorCount; i++) {
    const sectorEmpires = empires.slice(i * 10, (i + 1) * 10);
    sectors.set(`sector-${i}`, {
      id: `sector-${i}`,
      name: generateSectorName(),
      empires: sectorEmpires,
      position: calculateSectorPosition(i, sectorCount),
      connections: calculateSectorConnections(i, sectorCount),
      isPlayerSector: sectorEmpires.some(e => e.type === 'player')
    });
  }

  return sectors;
}
```

### Features
- **Two-level zoom**: Galaxy (sectors) → Sector (empires)
- **Regional gameplay**: Only care about empires in your sector
- **Wormholes as strategy**: Build gates to reach new sectors
- **Natural borders**: Sectors connect via defined paths
- **Emergent geography**: "Control the corridor to Sector B"

### Pros
- ✅ Solves 100-empire problem (10 sectors × 10 empires)
- ✅ Creates strategic geography
- ✅ Natural expansion paths
- ✅ Wormholes are tactical decisions
- ✅ No force simulation needed (static sector layout)

### Cons
- ❌ More complex to implement (sector system)
- ❌ Requires game logic changes (can only attack within sector)
- ❌ Less flexible than current "attack anyone" system
- ❌ Risk of sectors feeling isolated/stale

---

## Concept 3: Tactical Filter with Mini-Map

**Philosophy**: "Show me what matters right now"

### Visual Structure

```
┌────────────────────────────────────────────────────────────────────┐
│  TACTICAL MAP                              ┌─────────────────┐     │
│                                            │   GALAXY VIEW   │     │
│  Filter: [●Immediate] [○Distant] [○All]   │   (Mini-Map)    │     │
│                                            │                 │     │
│         ◯ Warlord (Red)                    │  ▪ ▪  ▪ ▪       │     │
│          ╲                                 │    ▪ ▪  ▪       │     │
│           ╲                                │  ▪   ★  ▪ ▪     │     │
│            ╲                               │    ▪ ▪ ▪        │     │
│   ◯ Merch  ╲                               │  ▪  ▪ ▪  ▪      │     │
│   (Green)   ╲                              │   Your region   │     │
│              ╲                             │   highlighted   │     │
│               ★ YOUR EMPIRE                └─────────────────┘     │
│   (15 planets)                                                     │
│              /                              THREAT PANEL           │
│             /                               ┌─────────────────┐    │
│            /                                │ ⚠ Iron Fist    │    │
│   ◯ Iron  /                                 │   At War        │    │
│   (Red)  /                                  │   12 planets    │    │
│         /                                   │   [Details →]   │    │
│        ◯ Velara (Blue)                      └─────────────────┘    │
│        (Allied)                                                    │
│                                             QUICK ACTIONS          │
│   Wormhole Accessible (click to show):     [Attack Neighbor]      │
│   ⚡ → ◯ Distant Schemer (Sector B)         [Send Fleet]           │
│                                             [Diplomacy]            │
│   Grayed Out (2+ hops away):                [Intel Mission]        │
│   ▓▓▓ ▓▓▓ ▓▓▓ (not accessible)                                     │
│                                                                    │
│  Showing: 6 immediate neighbors  [+12 wormhole accessible]        │
└────────────────────────────────────────────────────────────────────┘
```

### Filter Modes

**Mode 1: Immediate Neighbors Only** (default)
- Shows 3-5 neighbors you can attack freely
- High detail, full intel shown
- Clean, uncluttered view

**Mode 2: Expanded Sphere** (include distant)
- Shows immediate + distant neighbors (2x attack cost)
- Distant neighbors rendered grayed/smaller
- Wormhole connections highlighted

**Mode 3: Galaxy View** (show all)
- Force-directed graph of ALL empires (100 nodes)
- Use for strategic overview only
- Performance optimized (simplified rendering)

### Technical Implementation

```typescript
interface MapViewState {
  filterMode: 'immediate' | 'expanded' | 'galaxy';
  selectedEmpire: EmpireId | null;
  showWormholes: boolean;
  threatTracking: EmpireId[]; // Pin specific empires to always show
}

// Hybrid approach: static + force-directed
function renderMap(state: MapViewState, empires: Empire[]): void {
  if (state.filterMode === 'immediate') {
    // STATIC layout (radial, no force simulation)
    renderStaticRadialMap(getSphereOfInfluence(empires));
  } else if (state.filterMode === 'expanded') {
    // LIGHT force simulation (fewer nodes, ~15)
    const relevant = getRelevantEmpires(empires);
    renderForceDirectedMap(relevant, {
      strength: -150,
      centerStrength: 0.04,
      pinPlayer: true
    });
  } else {
    // FULL force simulation (100 nodes, simplified rendering)
    renderForceDirectedMap(empires, {
      strength: -50,  // Weaker forces for performance
      centerStrength: 0.08,
      pinPlayer: true,
      simplifiedNodes: true // Smaller nodes, less detail
    });
  }
}

// Fix for jittering issue
function handleNodeClick(empire: Empire): void {
  // STOP simulation entirely on click (don't drag)
  simulation.stop();

  // Show detail panel
  showEmpireDetailPanel(empire);

  // Resume simulation after interaction
  setTimeout(() => simulation.restart(), 500);
}
```

### Features
- **Adaptive rendering**: Simple view for daily use, full view for strategy
- **Mini-map**: Always see galaxy context
- **Threat panel**: Pin important rivals
- **Filter controls**: Player chooses detail level
- **NO DRAGGING**: Click for details, not drag (fixes jittering)

### Pros
- ✅ Best of both worlds (simple + full galaxy)
- ✅ Player controls complexity
- ✅ Fixes jittering (disable drag, or stop simulation on click)
- ✅ Minimal game logic changes
- ✅ Familiar interface (filter/zoom pattern)

### Cons
- ❌ UI is more complex (multiple panels)
- ❌ Still needs D3 force simulation (but can disable for immediate mode)
- ❌ Might feel busy with too many controls

---

## Comparison Matrix

| Feature | Concept 1: Radial | Concept 2: Regional | Concept 3: Filter |
|---------|-------------------|---------------------|-------------------|
| **Fixes jittering** | ✅ Yes (no physics) | ✅ Yes (static) | ⚠️ Partial (stop on click) |
| **Handles 100 empires** | ✅ Shows ~15 | ✅ Shows 10 sectors | ✅ Filter modes |
| **Sphere of influence** | ✅ Core feature | ⚠️ Sectors instead | ✅ Filter modes |
| **Wormholes** | ✅ Visual connections | ✅ Strategic layer | ✅ Toggle filter |
| **Implementation complexity** | 🟢 Low | 🟠 High | 🟡 Medium |
| **Game logic changes** | 🟢 Minimal | 🔴 Significant | 🟢 None |
| **Strategic depth** | 🟡 Medium | 🟢 High | 🟡 Medium |
| **Player control** | 🟡 Fixed view | 🟢 Zoom levels | 🟢 Filter modes |
| **Performance** | 🟢 Excellent | 🟢 Excellent | 🟡 Good |
| **"Galaxy" feel** | 🔴 Low | 🟢 High | 🟡 Medium |

---

## Recommendations

### For Immediate Implementation (MVP)
**Choose Concept 1: Radial Sphere of Influence**

**Reasoning**:
1. Solves jittering completely (no force simulation)
2. Minimal implementation effort (~2-3 days)
3. No game logic changes required
4. Directly implements "Influence Sphere Model" from design doc
5. Best for 25-50 player games (current target)

**Drawbacks to accept**:
- Less visually interesting than force-directed graph
- Doesn't feel like a "galaxy map"

---

### For Future Enhancement (v0.7+)
**Upgrade to Concept 3: Tactical Filter**

**Reasoning**:
1. Builds on Concept 1 (add filter modes)
2. Preserves familiar force-directed graph (as option)
3. Better for 100-player MMO vision
4. Player has control over complexity

**Migration path**:
- Start with Concept 1 (static radial)
- Add mini-map overlay
- Add filter toggle for "expanded" mode
- Add "galaxy view" mode with D3 (optional)

---

### If Committing to MMO Vision
**Choose Concept 2: Regional Cluster Map**

**Reasoning**:
1. Only solution that truly scales to 100+ players
2. Creates emergent strategy (sector control)
3. Wormholes become meaningful decisions
4. Best "4X galaxy" feel

**Commitment required**:
- Sector system in database schema
- Attack validation based on sectors
- Wormhole construction mechanics
- ~1-2 weeks implementation

---

## Next Steps

1. **User Decision**: Which concept to pursue?
2. **Prototype**: Build quick wireframe/mockup
3. **Playtest**: Does it solve the tactical visualization problem?
4. **Implement**: Replace current Starmap.tsx
5. **Test**: Verify performance with 100 empires
6. **Iterate**: Refine based on player feedback

---

## Technical Notes

### Fixing Current Jittering Issue (Quick Fix)
If keeping D3 force simulation:

```typescript
// In Starmap.tsx, replace drag handlers (lines 444-482)
const handleNodeClick = useCallback((empire: EmpireMapData) => {
  // Stop simulation on click (don't drag)
  if (!simulationRef.current) return;
  simulationRef.current.stop();

  // Show detail panel
  setSelectedEmpire(empire);

  // Resume after 500ms
  setTimeout(() => {
    simulationRef.current?.alpha(0.1).restart();
  }, 500);
}, []);

// Remove onMouseDown, onMouseMove, onMouseUp handlers
// Use only onClick
```

This prevents the drag/simulation conflict while keeping current architecture.

---

*Document Status*: Ready for review
*Decision needed*: Which concept to implement?
*Estimated effort*:
- Concept 1: 2-3 days
- Concept 2: 1-2 weeks
- Concept 3: 4-5 days

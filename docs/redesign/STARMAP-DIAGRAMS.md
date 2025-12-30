# Star Map Visualization Diagrams

Visual representations of the three starmap concepts using Mermaid diagrams.

---

## Concept 1: Radial Sphere of Influence

### Structure Diagram

```mermaid
graph TB
    subgraph "Far Away Empires (Not Shown)"
        F1[Empire 50]
        F2[Empire 51]
        F3[...]
        F4[Empire 100]
    end

    subgraph "Distant Neighbors (Outer Ring - Grayed)"
        D1[Empire 8<br/>2x attack cost]
        D2[Empire 9<br/>2x attack cost]
        D3[Empire 10<br/>2x attack cost]
        D4[Empire 11<br/>2x attack cost]
        D5[Empire 12<br/>2x attack cost]
    end

    subgraph "Immediate Neighbors (Inner Ring - Full Color)"
        I1[Empire 1<br/>Can attack]
        I2[Empire 2<br/>Can attack]
        I3[Empire 3<br/>Can attack]
        I4[Empire 4<br/>Can attack]
        I5[Empire 5<br/>Can attack]
    end

    subgraph "Center (Fixed Position)"
        P[★ PLAYER<br/>12 planets<br/>Empire Name]
    end

    subgraph "Wormhole Connection (Special)"
        W1[Empire 42<br/>via Wormhole<br/>1.5x attack cost]
    end

    I1 -.-> P
    I2 -.-> P
    I3 -.-> P
    I4 -.-> P
    I5 -.-> P

    D1 -. grayed .-> I1
    D2 -. grayed .-> I2
    D3 -. grayed .-> I3
    D4 -. grayed .-> I4
    D5 -. grayed .-> I5

    P ==> W1
    style W1 fill:#9966ff,stroke:#6633cc,stroke-width:3px

    style P fill:#3b82f6,stroke:#1d4ed8,stroke-width:4px
    style I1 fill:#ef4444,stroke:#b91c1c
    style I2 fill:#059669,stroke:#047857
    style I3 fill:#ef4444,stroke:#b91c1c
    style I4 fill:#ef4444,stroke:#b91c1c
    style I5 fill:#059669,stroke:#047857

    style D1 fill:#6b7280,stroke:#4b5563,opacity:0.5
    style D2 fill:#6b7280,stroke:#4b5563,opacity:0.5
    style D3 fill:#6b7280,stroke:#4b5563,opacity:0.5
    style D4 fill:#6b7280,stroke:#4b5563,opacity:0.5
    style D5 fill:#6b7280,stroke:#4b5563,opacity:0.5
```

### Data Flow

```mermaid
sequenceDiagram
    participant GameState
    participant SphereCalculator
    participant StarmapComponent
    participant Player

    GameState->>SphereCalculator: getAllEmpires()
    SphereCalculator->>SphereCalculator: Calculate distances from player
    SphereCalculator->>SphereCalculator: Sort by tactical relevance
    SphereCalculator->>SphereCalculator: Identify immediate (3-5)
    SphereCalculator->>SphereCalculator: Identify distant (5-10)
    SphereCalculator->>SphereCalculator: Hide far away (rest)
    SphereCalculator->>SphereCalculator: Check wormhole connections
    SphereCalculator-->>StarmapComponent: Return SphereOfInfluence
    StarmapComponent->>StarmapComponent: Calculate static positions (radial)
    StarmapComponent->>Player: Render map (NO force simulation)
    Player->>StarmapComponent: Click empire
    StarmapComponent->>Player: Show detail panel (NO drag)
```

---

## Concept 2: Regional Cluster Map

### Galaxy Structure

```mermaid
graph TB
    subgraph "Sector A - Outer Rim"
        A1[Empire 1]
        A2[Empire 2]
        A3[Empire 3]
        A4[Empire 4]
        A5[...]
        A6[Empire 10]
    end

    subgraph "Sector B - Core Worlds"
        B1[Empire 11]
        B2[Empire 12]
        B3[Empire 13]
        B4[...]
        B5[Empire 20]
    end

    subgraph "Sector C - Mining Belt"
        C1[Empire 21]
        C2[Empire 22]
        C3[...]
        C4[Empire 25]
    end

    subgraph "Sector D - YOUR SECTOR"
        D1[Empire 26]
        D2[★ PLAYER]
        D3[Empire 27]
        D4[Empire 28]
        D5[...]
        D6[Empire 35]
    end

    subgraph "Sector E - Wild Space"
        E1[Empire 36]
        E2[Empire 37]
        E3[...]
        E4[Empire 40]
    end

    A1 -->|Natural Border| C1
    B1 -.->|Wormhole| D1
    C1 -->|Natural Border| D1
    D1 -->|Natural Border| E1
    B1 -->|Natural Border| E1

    style D2 fill:#3b82f6,stroke:#1d4ed8,stroke-width:4px
    style D1 fill:#ef4444,stroke:#b91c1c
    style D3 fill:#059669,stroke:#047857
    style D4 fill:#ef4444,stroke:#b91c1c

    linkStyle 1 stroke:#9966ff,stroke-width:3px
```

### Zoom Level Interaction

```mermaid
stateDiagram-v2
    [*] --> GalaxyView: Load Starmap

    GalaxyView: Galaxy Overview
    GalaxyView: Shows 10 sectors
    GalaxyView: Empire counts only
    GalaxyView: Wormhole connections

    SectorView: Sector Detail
    SectorView: Shows 10 empires
    SectorView: Full empire details
    SectorView: Internal relationships

    EmpireDetail: Empire Info Panel
    EmpireDetail: Full stats
    EmpireDetail: Attack/Diplomacy options

    GalaxyView --> SectorView: Click Sector
    SectorView --> EmpireDetail: Click Empire
    EmpireDetail --> SectorView: Back
    SectorView --> GalaxyView: Back to Galaxy
```

### Sector Assignment Algorithm

```mermaid
flowchart TD
    Start[Game Setup: 100 Empires] --> CalcSectors[Calculate Sectors<br/>100 empires ÷ 10 = 10 sectors]
    CalcSectors --> AssignPlayer[Assign Player to Sector D]
    AssignPlayer --> DistributeEmpires[Distribute other 99 empires<br/>randomly across sectors]
    DistributeEmpires --> CreateConnections[Create sector connections<br/>- Natural borders: 2-3 per sector<br/>- Wormholes: 1-2 random]
    CreateConnections --> SetAttackRules[Set attack rules<br/>- Same sector: 1x cost<br/>- Adjacent via border: 1.2x cost<br/>- Via wormhole: 1.5x cost<br/>- No connection: Cannot attack]
    SetAttackRules --> StoreDB[(Store in DB:<br/>- empire.sectorId<br/>- sectorConnections table)]
    StoreDB --> End[Starmap Ready]
```

---

## Concept 3: Tactical Filter with Mini-Map

### UI Layout

```mermaid
graph TB
    subgraph "Main UI Layout"
        subgraph "Top Bar"
            Filter[Filter Modes:<br/>◉ Immediate<br/>○ Expanded<br/>○ Galaxy]
        end

        subgraph "Main Map Area (Left - 70%)"
            MainMap[Tactical Map<br/>Shows filtered empires<br/>Interactive force-directed<br/>or static radial]
        end

        subgraph "Right Panel (30%)"
            MiniMap[Mini-Map<br/>Full galaxy overview<br/>Your region highlighted]
            ThreatPanel[Threat Panel<br/>⚠ Active threats<br/>Quick access]
            ActionButtons[Quick Actions<br/>Attack / Diplomacy /<br/>Intel / Fleet]
        end

        subgraph "Bottom Info Bar"
            Stats[Showing: 6 immediate neighbors<br/>+12 wormhole accessible<br/>87 hidden]
        end
    end

    Filter --> MainMap
    Filter --> MiniMap
    MainMap --> ThreatPanel
    ThreatPanel --> ActionButtons
```

### Filter Mode Behavior

```mermaid
stateDiagram-v2
    [*] --> Immediate: Default

    Immediate: Immediate Mode
    Immediate: 3-5 neighbors shown
    Immediate: Full detail
    Immediate: Static radial layout
    Immediate: NO force simulation

    Expanded: Expanded Mode
    Expanded: 15-20 neighbors shown
    Expanded: Immediate + Distant
    Expanded: Distant grayed out
    Expanded: Light force simulation

    Galaxy: Galaxy Mode
    Galaxy: All 100 empires shown
    Galaxy: Simplified rendering
    Galaxy: Full force simulation
    Galaxy: Mini-map style

    Immediate --> Expanded: Click "Expanded"
    Expanded --> Galaxy: Click "Galaxy"
    Galaxy --> Expanded: Click "Expanded"
    Expanded --> Immediate: Click "Immediate"
    Immediate --> Galaxy: Click "Galaxy"
    Galaxy --> Immediate: Click "Immediate"

    note right of Immediate
        Performance: Excellent
        Clarity: Best
        Detail: High
    end note

    note right of Expanded
        Performance: Good
        Clarity: Good
        Detail: Medium
    end note

    note right of Galaxy
        Performance: OK
        Clarity: Low
        Detail: Low (overview)
    end note
```

### Rendering Pipeline

```mermaid
flowchart TD
    Start[User changes filter] --> CheckMode{Filter Mode?}

    CheckMode -->|Immediate| GetImmediate[Get 3-5 immediate neighbors]
    CheckMode -->|Expanded| GetExpanded[Get 15-20 relevant empires]
    CheckMode -->|Galaxy| GetAll[Get all 100 empires]

    GetImmediate --> StaticLayout[Calculate static radial positions<br/>NO D3 force simulation]
    GetExpanded --> LightForce[Initialize light force simulation<br/>strength: -150, 15-20 nodes]
    GetAll --> HeavyForce[Initialize optimized force simulation<br/>strength: -50, 100 nodes,<br/>simplified rendering]

    StaticLayout --> RenderDetailed[Render detailed nodes<br/>Full nebula effects<br/>All intel visible]
    LightForce --> RenderDetailed
    HeavyForce --> RenderSimplified[Render simplified nodes<br/>Basic circles<br/>Minimal effects]

    RenderDetailed --> UpdateMiniMap[Update mini-map<br/>Highlight visible region]
    RenderSimplified --> UpdateMiniMap

    UpdateMiniMap --> Done[Display to user]

    Done --> UserClick{User clicks node}
    UserClick -->|Yes| StopSim[Stop simulation temporarily]
    StopSim --> ShowPanel[Show empire detail panel]
    ShowPanel --> ResumeSim[Resume simulation after 500ms]
    ResumeSim --> Done
    UserClick -->|No| Done
```

---

## Data Structures

### Concept 1: Sphere of Influence

```typescript
interface SphereOfInfluence {
  center: {
    empire: Empire;
    position: { x: 450, y: 300 };  // Fixed center
  };

  immediate: {
    empires: Empire[];               // 3-5 neighbors
    radius: 150;                     // px from center
    attackCost: 1.0;                 // Normal cost
    style: 'full_detail';            // Render mode
  };

  distant: {
    empires: Empire[];               // 5-10 neighbors
    radius: 300;                     // px from center
    attackCost: 2.0;                 // Double forces needed
    style: 'grayed_reduced';         // Render mode
  };

  hidden: {
    empires: Empire[];               // Rest (not rendered)
    attackable: false;               // Cannot attack
  };

  wormholes: {
    connections: Array<{
      from: EmpireId;
      to: EmpireId;
      type: 'natural' | 'constructed';
      attackCost: 1.5;               // 50% penalty
    }>;
  };
}
```

### Concept 2: Regional Sectors

```typescript
interface GalaxySector {
  id: string;                        // "sector-a"
  name: string;                      // "Outer Rim"
  empires: Empire[];                 // 10 empires per sector
  position: { x: number, y: number }; // Sector box position

  connections: SectorConnection[];
}

interface SectorConnection {
  toSectorId: string;
  type: 'natural_border' | 'wormhole';
  attackCostModifier: number;        // 1.0 = same, 1.2 = border, 1.5 = wormhole
}

// Database schema additions needed:
// ALTER TABLE empires ADD COLUMN sector_id VARCHAR;
// CREATE TABLE sector_connections (
//   id UUID PRIMARY KEY,
//   from_sector_id VARCHAR NOT NULL,
//   to_sector_id VARCHAR NOT NULL,
//   connection_type VARCHAR NOT NULL,
//   attack_cost_modifier DECIMAL DEFAULT 1.0
// );
```

### Concept 3: Filter Modes

```typescript
interface MapViewState {
  filterMode: 'immediate' | 'expanded' | 'galaxy';

  visibleEmpires: {
    immediate: Empire[];             // Always shown (3-5)
    expanded: Empire[];              // Shown in expanded mode (15-20)
    all: Empire[];                   // Shown in galaxy mode (100)
  };

  renderConfig: {
    useForceSimulation: boolean;     // false for immediate, true for others
    simulationStrength: number;      // -150 expanded, -50 galaxy
    nodeDetailLevel: 'high' | 'medium' | 'low';
  };

  uiState: {
    selectedEmpire: EmpireId | null;
    pinnedThreats: EmpireId[];       // Always show these
    showWormholes: boolean;
  };
}
```

---

## Performance Comparison

```mermaid
graph LR
    subgraph "Concept 1: Radial"
        C1Nodes[5-15 nodes]
        C1Sim[NO simulation]
        C1Render[Full rendering]
        C1FPS[60 FPS ✅]
    end

    subgraph "Concept 2: Regional"
        C2Nodes[10-15 nodes]
        C2Sim[NO simulation]
        C2Render[Full rendering]
        C2FPS[60 FPS ✅]
    end

    subgraph "Concept 3: Immediate Mode"
        C3INodes[5-10 nodes]
        C3ISim[NO simulation]
        C3IRender[Full rendering]
        C3IFPS[60 FPS ✅]
    end

    subgraph "Concept 3: Expanded Mode"
        C3ENodes[15-20 nodes]
        C3ESim[Light D3 simulation]
        C3ERender[Full rendering]
        C3EFPS[50-60 FPS ✅]
    end

    subgraph "Concept 3: Galaxy Mode"
        C3GNodes[100 nodes]
        C3GSim[Optimized D3 simulation]
        C3GRender[Simplified rendering]
        C3GFPS[30-40 FPS ⚠️]
    end

    subgraph "Current Implementation"
        CurrNodes[25-100 nodes]
        CurrSim[Full D3 simulation]
        CurrRender[Full rendering]
        CurrFPS[20-30 FPS ⚠️<br/>+ Jittering bug]
    end

    style C1FPS fill:#10b981
    style C2FPS fill:#10b981
    style C3IFPS fill:#10b981
    style C3EFPS fill:#10b981
    style C3GFPS fill:#f59e0b
    style CurrFPS fill:#ef4444
```

---

## Implementation Complexity

```mermaid
gantt
    title Implementation Timeline Comparison
    dateFormat  X
    axisFormat %d

    section Concept 1 (Radial)
    Remove D3 simulation           :c1a, 0, 1d
    Implement static radial layout :c1b, after c1a, 1d
    Add wormhole connections       :c1c, after c1b, 0.5d
    Testing                        :c1d, after c1c, 0.5d

    section Concept 2 (Regional)
    Design sector system           :c2a, 0, 1d
    Update database schema         :c2b, after c2a, 0.5d
    Implement sector assignment    :c2c, after c2b, 1d
    Build galaxy view              :c2d, after c2c, 1.5d
    Build sector detail view       :c2e, after c2d, 1.5d
    Update attack validation       :c2f, after c2e, 1d
    Testing                        :c2g, after c2f, 1.5d

    section Concept 3 (Filter)
    Implement filter state         :c3a, 0, 0.5d
    Build immediate mode (static)  :c3b, after c3a, 1d
    Build expanded mode (light D3) :c3c, after c3b, 1.5d
    Build galaxy mode (full D3)    :c3d, after c3c, 1d
    Add mini-map component         :c3e, after c3d, 1d
    Add threat panel               :c3f, after c3e, 0.5d
    Testing                        :c3g, after c3f, 1d

    section Quick Fix (Current)
    Fix jittering bug              :fix, 0, 0.5d
```

**Total Estimated Effort:**
- Concept 1: **3 days** ✅ (Recommended for MVP)
- Concept 2: **8-9 days** (For MMO vision)
- Concept 3: **6-7 days** (Best long-term)
- Quick Fix: **0.5 days** (Band-aid solution)

---

## User Experience Flow

### Concept 1: Radial Flow

```mermaid
journey
    title Player Experience - Radial Sphere
    section Open Starmap
      Load map: 5: Player
      See immediate neighbors: 5: Player
      Identify threats: 4: Player
    section Interact
      Click on rival: 5: Player
      View detail panel: 5: Player
      Decide to attack: 4: Player
    section Understand
      Clear who I can attack: 5: Player
      See wormhole option: 4: Player
      Feel in control: 5: Player
```

### Concept 2: Regional Flow

```mermaid
journey
    title Player Experience - Regional Clusters
    section Open Starmap
      Load galaxy view: 4: Player
      See sector overview: 3: Player
      Click my sector: 4: Player
    section Zoom In
      View sector detail: 5: Player
      See local rivals: 5: Player
      Understand geography: 5: Player
    section Strategy
      Plan expansion path: 5: Player
      Consider wormhole: 4: Player
      Feel strategic depth: 5: Player
```

### Concept 3: Filter Flow

```mermaid
journey
    title Player Experience - Tactical Filter
    section Open Starmap
      Load immediate mode: 5: Player
      See 5 neighbors: 5: Player
      Feel uncluttered: 5: Player
    section Explore
      Toggle to expanded: 4: Player
      See more empires: 3: Player
      Toggle to galaxy: 2: Player
    section Return
      Too much info: 2: Player
      Switch back to immediate: 5: Player
      Relief at simplicity: 5: Player
```

---

## Decision Matrix

| Criteria | Weight | Concept 1 | Concept 2 | Concept 3 |
|----------|--------|-----------|-----------|-----------|
| **Fixes jittering** | 🔴 Critical | ✅ 10/10 | ✅ 10/10 | ⚠️ 7/10 |
| **Implementation speed** | 🔴 Critical | ✅ 9/10 | ❌ 4/10 | ⚠️ 6/10 |
| **Handles 100 empires** | 🟠 High | ✅ 8/10 | ✅ 10/10 | ✅ 9/10 |
| **Sphere of influence** | 🟠 High | ✅ 10/10 | ⚠️ 7/10 | ✅ 9/10 |
| **Strategic depth** | 🟡 Medium | ⚠️ 6/10 | ✅ 10/10 | ⚠️ 7/10 |
| **Visual appeal** | 🟡 Medium | ⚠️ 6/10 | ✅ 9/10 | ✅ 8/10 |
| **Player control** | 🟢 Low | ❌ 4/10 | ✅ 8/10 | ✅ 9/10 |
| **"Galaxy" feel** | 🟢 Low | ❌ 3/10 | ✅ 10/10 | ⚠️ 7/10 |
| | **Total** | **56/80** | **68/80** | **62/80** |

**Winner for MVP**: Concept 1 (fastest, solves critical issues)
**Winner for MMO**: Concept 2 (best for 100+ players)
**Winner for polish**: Concept 3 (best UX, player control)

---

*Document created: 2025-12-30*
*See STARMAP-VISUALIZATION-CONCEPTS.md for detailed descriptions*

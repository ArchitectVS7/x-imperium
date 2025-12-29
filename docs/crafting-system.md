# Nexus Dominion: Strategic Depth Systems
## Crafting, Research, Black Market & Enhanced Military

*Design Document v1.0 - Modernizing Solar Realms Elite*

---

## Design Philosophy

The original Solar Realms Elite (1990) had elegant simplicity: credits buy everything. While this worked for BBS gaming, modern players expect strategic depth. Our goal is to add meaningful complexity **without going full Factorio**.

**Core Principle:** Large military items (cruisers, orbital defenses, WMDs) require crafted resources, not just credits. This creates:
- Strategic chokepoints
- Resource management decisions  
- Catch-up mechanics for smaller empires
- Narrative justification for power progression

---

## Part 1: Resource Tiers

### Tier 0: Base Resources (Original SRE)

These are the foundational resources from the original game, produced by planet types:

| Resource | Source | Description |
|----------|--------|-------------|
| **Credits** | Taxes, Trade, Tourism, Urban | Universal currency |
| **Food** | Food Planets, Market | Feeds population & military |
| **Ore** | Ore Planets | Raw minerals, stable income |
| **Petroleum** | Petroleum Planets | Fuel, causes pollution |
| **Population** | Urban, Education | Labor force, tax base |
| **Research Points** | Research Planets | Random breakthroughs → now systematic |

### Tier 1: Refined Resources (NEW)

Basic processing of Tier 0 resources. Produced automatically by specialized planets or purchased at premium.

| Resource | Recipe | Narrative |
|----------|--------|-----------|
| **Refined Metals** | 100 Ore | Purified alloys for construction |
| **Fuel Cells** | 50 Petroleum + 20 Credits | Standardized energy storage |
| **Polymers** | 30 Petroleum + 20 Ore | Synthetic materials |
| **Processed Food** | 200 Food | Long-term rations, military supplies |
| **Labor Units** | 1,000 Population + 50 Credits | Organized workforce allocation |

**Production:** 
- Ore Planets produce Refined Metals automatically (10% of ore output)
- Petroleum Planets produce Fuel Cells automatically (10% of petroleum)
- New **Industrial Planets** can process any Tier 0 → Tier 1

---

### Tier 2: Manufactured Components (NEW)

Combining Tier 1 resources with Research requirements. These are the building blocks for advanced military.

| Component | Recipe | Research Req | Narrative |
|-----------|--------|--------------|-----------|
| **Electronics** | 2 Refined Metals + 1 Polymers | Level 2 | Circuit boards, sensors |
| **Armor Plating** | 3 Refined Metals + 1 Polymers | Level 2 | Hull protection |
| **Propulsion Units** | 2 Fuel Cells + 1 Refined Metals | Level 2 | Engine systems |
| **Life Support** | 1 Processed Food + 1 Polymers + 1 Electronics | Level 3 | Crew sustainability |
| **Weapons Grade Alloy** | 4 Refined Metals + 2 Fuel Cells | Level 3 | High-stress military materials |
| **Targeting Arrays** | 2 Electronics + 1 Refined Metals | Level 3 | Precision guidance |
| **Stealth Composites** | 3 Polymers + 1 Electronics | Level 4 | Sensor-absorbing materials |
| **Quantum Processors** | 3 Electronics + 1 Weapons Grade Alloy | Level 5 | Advanced computing |

**Production:**
- **Industrial Planets** with research levels can produce Tier 2
- Higher research = more efficient production
- Can also purchase from **Black Market** (at premium, requires trust)

---

### Tier 3: Advanced Systems (NEW)

Strategic resources for capital ships and superweapons. These take significant investment.

| System | Recipe | Research Req | Narrative |
|--------|--------|--------------|-----------|
| **Reactor Cores** | 3 Propulsion Units + 2 Electronics + 1 Quantum Processor | Level 5 | Power generation |
| **Shield Generators** | 2 Armor Plating + 2 Electronics + 1 Quantum Processor | Level 5 | Energy barriers |
| **Warp Drives** | 2 Reactor Cores + 1 Stealth Composites + 1 Targeting Array | Level 6 | FTL capability |
| **Cloaking Devices** | 3 Stealth Composites + 2 Quantum Processors | Level 6 | Invisibility tech |
| **Ion Cannon Cores** | 2 Weapons Grade Alloy + 2 Reactor Cores + 1 Targeting Array | Level 6 | Orbital weapon systems |
| **Neural Interfaces** | 2 Quantum Processors + 1 Life Support | Level 7 | AI/crew integration |
| **Singularity Containment** | 3 Reactor Cores + 2 Shield Generators | Level 8 | Black hole tech |
| **Bioweapon Synthesis** | 2 Life Support + 1 Quantum Processor | Level 7 | *Black Market Only* |
| **Nuclear Warheads** | 3 Weapons Grade Alloy + 1 Reactor Core | Level 6 | *Black Market Only* |

---

## Part 2: Research System

### Research Levels (Replaces Random Breakthroughs)

Research planets now generate **Research Points (RP)** each turn. Points accumulate toward level unlocks.

| Level | RP Required | Cumulative | Unlocks |
|-------|-------------|------------|---------|
| 1 | 0 | 0 | Basic military (Soldiers, Fighters) |
| 2 | 500 | 500 | Tier 2 components, Light Cruisers |
| 3 | 1,500 | 2,000 | Advanced Tier 2, Defense Stations |
| 4 | 3,000 | 5,000 | Heavy Cruisers, Stealth tech |
| 5 | 5,000 | 10,000 | Tier 3 systems, Capital ships |
| 6 | 8,000 | 18,000 | WMD research, Warp drives |
| 7 | 12,000 | 30,000 | Neural interfaces, Bioweapons |
| 8 | 20,000 | 50,000 | Singularity tech, Superweapons |

**RP Generation:**
- Each Research Planet produces 50-150 RP/turn (based on funding)
- Bonus: +10% RP per Education Planet (trained researchers)
- Penalty: -5% RP per active war (distraction)

### Research Branches (Specialization)

Players can focus RP into branches for bonuses:

| Branch | Focus | Bonus at 20% Investment |
|--------|-------|-------------------------|
| **Military** | Weapons, targeting | +10% attack damage |
| **Defense** | Shields, armor | +10% defensive HP |
| **Propulsion** | Speed, evasion | +15% fleet evasion |
| **Stealth** | Cloaking, ECM | Covert ops +20% success |
| **Economy** | Production efficiency | -10% crafting costs |
| **Biotech** | Population, food | +10% population growth |

---

## Part 3: Black Market & Mafia Trust System

### The Syndicate

The **Galactic Syndicate** is a criminal organization operating outside Coordinator jurisdiction. They offer:
- Banned technologies (WMDs)
- Premium components (no crafting required)
- Contract work (for trust building)
- Intelligence services

### Trust Levels

Trust is earned through contracts and purchases. Higher trust unlocks better goods.

| Level | Trust Points | Title | Unlocks |
|-------|--------------|-------|---------|
| 0 | 0 | Unknown | Nothing - must complete intro contract |
| 1 | 100 | Associate | Basic intel, component purchases at 2x price |
| 2 | 500 | Runner | Pirate raid contracts, 1.75x prices |
| 3 | 1,500 | Soldier | Player contracts, Tier 2 components at 1.5x |
| 4 | 3,500 | Captain | Advanced intel, targeted contracts |
| 5 | 7,000 | Lieutenant | Tier 3 systems (non-WMD) at 1.5x |
| 6 | 12,000 | Underboss | Chemical weapons access |
| 7 | 20,000 | Consigliere | Nuclear weapons access |
| 8 | 35,000 | Syndicate Lord | Bioweapons, Singularity tech, exclusive contracts |

### Contracts System

Contracts are the primary way to build trust. They come in tiers:

#### Tier 1: Pirate Raids (Trust 1+)
*Low risk, low reward. Available to anyone.*

| Contract | Target | Reward | Trust |
|----------|--------|--------|-------|
| **Supply Run** | Pirate Team (any) | 5,000 Credits | +10 |
| **Disruption** | Specific pirate base | 8,000 Credits | +15 |
| **Salvage Op** | Destroy pirate ships, keep 50% | Varies | +20 |
| **Intel Gathering** | Spy on 3 pirate teams | 3,000 Credits | +10 |

#### Tier 2: Standard Contracts (Trust 2+)
*Medium risk. Target random players.*

| Contract | Target | Reward | Trust | Risk |
|----------|--------|--------|-------|------|
| **Intimidation** | Any player (insurgent aid) | 15,000 Credits | +30 | Low |
| **Economic Warfare** | Any player (bomb food) | 25,000 Credits | +40 | Medium |
| **Military Probe** | Any player (guerilla ambush) | 35,000 Credits + 10% loot | +50 | Medium |
| **Hostile Takeover** | Capture 1 planet from anyone | 50,000 Credits | +75 | High |

#### Tier 3: Targeted Contracts (Trust 4+)
*High risk, high reward. Syndicate chooses targets.*

| Contract | Target | Reward | Trust | Special |
|----------|--------|--------|-------|---------|
| **Kingslayer** | Top 3 player | 100,000 Credits | +100 | Bonus: +1 Trust Level if successful |
| **Market Manipulation** | Top 10 player (economic) | 75,000 Credits | +80 | Crash their tourism |
| **Regime Change** | Top 25% player | 60,000 Credits | +60 | Cause civil war |
| **Decapitation Strike** | #1 Player | 200,000 Credits | +150 | Requires Trust 5+ |

#### Tier 4: Syndicate Operations (Trust 6+)
*Elite contracts. Shape the galaxy.*

| Contract | Target | Reward | Trust | Notes |
|----------|--------|--------|-------|-------|
| **Proxy War** | Two specific players | 150,000 Credits | +120 | Set up attack between them |
| **Scorched Earth** | Specific empire | Exclusive tech access | +100 | Use WMD (provided) |
| **The Equalizer** | All Top 10% | Special item | +200 | Must hurt 3+ top players |

### Recruitment Mechanic

**The Syndicate reaches out to struggling players.**

When a player falls into the **bottom 50%** of empires:
- They receive a **Syndicate Invitation** message
- First contract offered at 50% bonus trust rewards
- One-time offer of 10,000 credits "startup funds"
- Access to "Equalizer" contracts targeting top players

*Narrative: "The Syndicate sees potential in those the Coordinator overlooks..."*

This creates **comeback mechanics**:
- Struggling players can acquire WMDs faster
- Top players must consider threats from below
- Creates dynamic tension beyond pure economic snowballing

### Black Market Catalog

Items available for purchase (credits + trust level):

#### Components (Trust 1+)
| Item | Price | Trust Req | Notes |
|------|-------|-----------|-------|
| Electronics | 2,000 | 1 | No crafting needed |
| Armor Plating | 2,500 | 1 | |
| Propulsion Units | 2,200 | 1 | |
| Targeting Arrays | 4,000 | 3 | |
| Stealth Composites | 5,000 | 3 | |
| Quantum Processors | 8,000 | 4 | |

#### Advanced Systems (Trust 5+)
| Item | Price | Trust Req | Notes |
|------|-------|-----------|-------|
| Reactor Cores | 15,000 | 5 | |
| Shield Generators | 18,000 | 5 | |
| Cloaking Devices | 25,000 | 5 | |
| Warp Drives | 30,000 | 6 | |

#### Restricted Items (Trust 6+)
| Item | Price | Trust Req | Notes |
|------|-------|-----------|-------|
| Chemical Weapons (1 use) | 50,000 | 6 | Coordinator penalty if caught |
| Nuclear Warhead (1 use) | 100,000 | 7 | Severe Coordinator response |
| Bioweapon Canister (1 use) | 150,000 | 8 | Most devastating |
| EMP Device (1 use) | 75,000 | 6 | Disables defenses temporarily |

### Trust Decay & Betrayal

- Trust decays **5% per 10 turns** if no Syndicate interaction
- **Betraying a contract** (not completing within deadline): -50% of reward trust, lose 1 Trust Level
- **Reporting to Coordinator**: Resets to Trust 0, +10% Coordinator funding bonus, Syndicate becomes hostile (assassination attempts)

---

## Part 4: Enhanced Military System

### Original SRE Military Units

| Unit | Role | Notes |
|------|------|-------|
| **Soldiers** | Ground attack/defense | Need generals (1:50 ratio) |
| **Fighters** | Orbital attack | Need carriers (1:100 ratio) |
| **Defense Stations** | Static defense | Shoot at fighters |
| **Light Cruisers** | Space combat | Bonus first strike rounds |
| **Heavy Cruisers** | Space combat | Command ship bonus |
| **Carriers** | Transport | Move fighters, trade |
| **Generals** | Command | Lead soldiers |
| **Covert Agents** | Espionage | Various ops |

### Enhanced Military Units (NEW)

Building on original with strategic depth:

#### Ground Forces
| Unit | Base Cost | Crafting Cost | Stats | Special |
|------|-----------|---------------|-------|---------|
| **Soldiers** | 50 | None | ATK: 1, DEF: 1 | Basic infantry |
| **Marines** | 150 | 1 Armor Plating | ATK: 2, DEF: 2 | Boarding actions |
| **Powered Infantry** | 500 | 2 Armor Plating + 1 Propulsion | ATK: 4, DEF: 3 | Exoskeleton troops |
| **Commandos** | 800 | 1 Stealth Composite + 1 Electronics | ATK: 3, DEF: 2 | +50% covert op success |

#### Aerospace Forces  
| Unit | Base Cost | Crafting Cost | Stats | Special |
|------|-----------|---------------|-------|---------|
| **Fighters** | 200 | None | ATK: 2, HP: 1 | Basic strike craft |
| **Interceptors** | 400 | 1 Propulsion + 1 Electronics | ATK: 2, HP: 2 | +30% evasion |
| **Bombers** | 600 | 1 Weapons Grade Alloy + 1 Targeting Array | ATK: 5, HP: 3 | 2x vs stations |
| **Stealth Fighters** | 1,000 | 2 Stealth Composites + 1 Propulsion | ATK: 3, HP: 2 | Invisible first round |

#### Capital Ships
| Unit | Base Cost | Crafting Cost | Research | Stats | Special |
|------|-----------|---------------|----------|-------|---------|
| **Light Cruiser** | 5,000 | 2 Armor Plating + 2 Propulsion | Level 2 | ATK: 10, HP: 20 | 5 bonus first-strike rounds |
| **Heavy Cruiser** | 15,000 | 3 Armor Plating + 2 Propulsion + 1 Reactor Core | Level 4 | ATK: 25, HP: 50 | Command ship bonus |
| **Battlecruiser** | 35,000 | 2 Reactor Cores + 2 Shield Generators + 3 Weapons Grade Alloy | Level 5 | ATK: 40, HP: 80 | -20% enemy evasion |
| **Dreadnought** | 80,000 | 3 Reactor Cores + 2 Shield Generators + 1 Ion Cannon Core | Level 6 | ATK: 80, HP: 150 | Area damage (hits 3 targets) |
| **Carrier (Enhanced)** | 25,000 | 2 Life Support + 2 Armor Plating | Level 4 | ATK: 5, HP: 60 | Carries 200 fighters |
| **Stealth Cruiser** | 50,000 | 2 Cloaking Devices + 1 Reactor Core + 1 Neural Interface | Level 6 | ATK: 30, HP: 40 | Invisible until attacks |

#### Defensive Installations
| Unit | Base Cost | Crafting Cost | Research | Stats | Special |
|------|-----------|---------------|----------|-------|---------|
| **Defense Station** | 3,000 | 1 Armor Plating + 1 Electronics | Level 3 | DEF: 15 | Basic orbital defense |
| **Missile Platform** | 6,000 | 2 Targeting Arrays + 1 Weapons Grade Alloy | Level 4 | DEF: 25 | +50% vs cruisers |
| **Shield Fortress** | 15,000 | 2 Shield Generators + 1 Reactor Core | Level 5 | DEF: 40 | Absorbs first 30% damage |
| **Ion Cannon** | 40,000 | 1 Ion Cannon Core + 1 Targeting Array + 1 Reactor Core | Level 6 | DEF: 100 | 1 shot/battle, devastating |
| **Planetary Shield** | 100,000 | 3 Shield Generators + 2 Reactor Cores + 1 Singularity Containment | Level 8 | DEF: 200 | Blocks all orbital bombardment |

### Strategic Systems (Non-Combat)

| System | Base Cost | Crafting Cost | Research | Effect |
|--------|-----------|---------------|----------|--------|
| **Targeting Computer** | 10,000 | 2 Targeting Arrays + 1 Quantum Processor | Level 5 | +15% fleet accuracy |
| **ECM Suite** | 12,000 | 2 Electronics + 1 Stealth Composite | Level 4 | +20% fleet evasion |
| **Encryption Array** | 8,000 | 2 Quantum Processors | Level 5 | -30% enemy spy success |
| **Tractor Beam** | 15,000 | 1 Propulsion Unit + 1 Reactor Core | Level 4 | Prevent enemy retreat |
| **Wormhole Generator** | 60,000 | 1 Warp Drive + 1 Singularity Containment | Level 8 | Instant attack (no warning) |
| **Virus Uplink** | 20,000 | 2 Quantum Processors + 1 Neural Interface | Level 7 | Disable 20% enemy defenses |

---

## Part 5: Weapons of Mass Destruction

### WMD Overview

WMDs exist in the original SRE but are heavily restricted. We expand this with proper mechanics.

| Weapon | Availability | Effect | Coordinator Response |
|--------|--------------|--------|---------------------|
| **Chemical Weapons** | Black Market (Trust 6) | Kills 30% population, -50% production 5 turns | Military response (lose 10% forces) |
| **Nuclear Weapons** | Black Market (Trust 7) + Research 6 | Destroys 1-3 planets, radiation 10 turns | Severe (lose 25% forces + sanctions) |
| **Bioweapons** | Black Market (Trust 8) + Research 7 | Kills 50% pop, spreads to neighbors | Annihilation attempt |
| **Psionic Bombs** | Research 7 | Mass confusion, -80% morale 10 turns | Moderate (diplomatic penalty) |
| **EMP Device** | Black Market (Trust 6) | Disables all electronics 3 turns | None (not detected) |

### WMD Crafting

| Weapon | Components | Black Market Price | Notes |
|--------|------------|-------------------|-------|
| **Chemical Weapons** | 2 Bioweapon Synthesis + 1 Propulsion | 50,000 | Single use |
| **Nuclear Warhead** | 1 Nuclear Warhead (BM) + 1 Propulsion | 100,000 | Can craft additional with right research |
| **Bioweapon** | 3 Bioweapon Synthesis + 1 Life Support | 150,000 | Most restricted |
| **Psionic Bomb** | 2 Neural Interfaces + 1 Quantum Processor | 80,000 | Can research independently |
| **EMP Device** | 2 Reactor Cores + 2 Electronics | 75,000 | Reusable after 20 turns |

---

## Part 6: Complete Cost Tables

### Military Unit Costs (Full Breakdown)

#### Basic Units (No Crafting Required)

| Unit | Credit Cost | Maintenance/Turn | Research Req |
|------|-------------|------------------|--------------|
| Soldier | 50 | 1 | None |
| Fighter | 200 | 3 | None |
| Carrier | 2,000 | 10 | None |
| General | 1,000 | 5 | None |
| Covert Agent | 500 | 8 | None |

#### Tier 2 Units (Basic Crafting)

| Unit | Credits | Tier 1 Components | Tier 2 Components | Research |
|------|---------|-------------------|-------------------|----------|
| Marines | 150 | - | 1 Armor Plating | Level 2 |
| Interceptors | 400 | - | 1 Propulsion, 1 Electronics | Level 2 |
| Light Cruiser | 5,000 | 2 Refined Metals | 2 Armor Plating, 2 Propulsion | Level 2 |
| Defense Station | 3,000 | 1 Refined Metals | 1 Armor Plating, 1 Electronics | Level 3 |

#### Tier 3 Units (Advanced Crafting)

| Unit | Credits | Tier 2 Components | Tier 3 Systems | Research |
|------|---------|-------------------|----------------|----------|
| Powered Infantry | 500 | 2 Armor Plating, 1 Propulsion | - | Level 3 |
| Commandos | 800 | 1 Stealth Composite, 1 Electronics | - | Level 4 |
| Bombers | 600 | 1 Weapons Grade Alloy, 1 Targeting Array | - | Level 3 |
| Stealth Fighters | 1,000 | 2 Stealth Composites, 1 Propulsion | - | Level 4 |
| Heavy Cruiser | 15,000 | 3 Armor Plating, 2 Propulsion | 1 Reactor Core | Level 4 |
| Missile Platform | 6,000 | 2 Targeting Arrays, 1 Weapons Grade Alloy | - | Level 4 |

#### Tier 4 Units (Capital Assets)

| Unit | Credits | Tier 2 Components | Tier 3 Systems | Research |
|------|---------|-------------------|----------------|----------|
| Battlecruiser | 35,000 | 3 Weapons Grade Alloy | 2 Reactor Cores, 2 Shield Generators | Level 5 |
| Dreadnought | 80,000 | - | 3 Reactor Cores, 2 Shield Generators, 1 Ion Cannon Core | Level 6 |
| Enhanced Carrier | 25,000 | 2 Armor Plating | 2 Life Support | Level 4 |
| Stealth Cruiser | 50,000 | - | 2 Cloaking Devices, 1 Reactor Core, 1 Neural Interface | Level 6 |
| Shield Fortress | 15,000 | - | 2 Shield Generators, 1 Reactor Core | Level 5 |
| Ion Cannon | 40,000 | - | 1 Ion Cannon Core, 1 Targeting Array, 1 Reactor Core | Level 6 |
| Planetary Shield | 100,000 | - | 3 Shield Generators, 2 Reactor Cores, 1 Singularity Containment | Level 8 |

### Strategic Systems Costs

| System | Credits | Components | Research |
|--------|---------|------------|----------|
| Targeting Computer | 10,000 | 2 Targeting Arrays, 1 Quantum Processor | Level 5 |
| ECM Suite | 12,000 | 2 Electronics, 1 Stealth Composite | Level 4 |
| Encryption Array | 8,000 | 2 Quantum Processors | Level 5 |
| Tractor Beam | 15,000 | 1 Propulsion Unit, 1 Reactor Core | Level 4 |
| Wormhole Generator | 60,000 | 1 Warp Drive, 1 Singularity Containment | Level 8 |
| Virus Uplink | 20,000 | 2 Quantum Processors, 1 Neural Interface | Level 7 |
| Command Ship Upgrade | 25,000 | 1 Neural Interface, 1 Reactor Core | Level 5 |

---

## Part 7: Unlock Trees (Visual Reference)

### Research Unlock Tree

```
Level 1 (Start)
├── Soldiers
├── Fighters
├── Carriers
└── Generals

Level 2 (500 RP)
├── Tier 2 Components
├── Marines
├── Interceptors
├── Light Cruisers
└── Industrial Planets

Level 3 (2,000 RP)
├── Advanced Tier 2
├── Defense Stations
├── Bombers
├── Powered Infantry
└── Life Support Systems

Level 4 (5,000 RP)
├── Heavy Cruisers
├── Missile Platforms
├── Enhanced Carriers
├── Stealth Composites
├── ECM Suite
├── Tractor Beam
└── Commandos

Level 5 (10,000 RP)
├── Tier 3 Systems
├── Battlecruisers
├── Shield Fortress
├── Quantum Processors
├── Targeting Computer
├── Encryption Array
└── Command Ship Upgrade

Level 6 (18,000 RP)
├── Dreadnoughts
├── Ion Cannons
├── Stealth Cruisers
├── Warp Drives
├── Cloaking Devices
└── WMD Research (requires Black Market)

Level 7 (30,000 RP)
├── Neural Interfaces
├── Virus Uplink
├── Psionic Bombs
└── Advanced Biotech

Level 8 (50,000 RP)
├── Singularity Containment
├── Planetary Shield
├── Wormhole Generator
└── Ultimate Weapons
```

### Black Market Trust Tree

```
Trust 0 (Unknown)
└── Must complete introduction contract

Trust 1 (Associate) - 100 pts
├── Component purchases (2x price)
├── Basic intel services
└── Pirate raid contracts

Trust 2 (Runner) - 500 pts
├── 1.75x prices
├── Standard player contracts
└── Economic warfare contracts

Trust 3 (Soldier) - 1,500 pts
├── 1.5x Tier 2 prices
├── Military probe contracts
└── Advanced intel

Trust 4 (Captain) - 3,500 pts
├── Targeted contracts available
├── Kingslayer contracts
└── Hostile takeover contracts

Trust 5 (Lieutenant) - 7,000 pts
├── Tier 3 systems (non-WMD)
├── Decapitation strike contracts
└── Proxy war introduction

Trust 6 (Underboss) - 12,000 pts
├── Chemical weapons
├── EMP devices
├── Scorched earth contracts
└── 1.25x prices

Trust 7 (Consigliere) - 20,000 pts
├── Nuclear weapons
├── Advanced WMD contracts
└── Syndicate operations

Trust 8 (Syndicate Lord) - 35,000 pts
├── Bioweapons
├── Singularity tech
├── Exclusive contracts
├── 1.0x prices (wholesale)
└── Syndicate seat (affects game events)
```

### Crafting Tree

```
Tier 0 (Base Resources)
├── Credits ──────────────────┐
├── Food ─────────────────────┼──→ Processed Food
├── Ore ──────────────────────┼──→ Refined Metals
├── Petroleum ────────────────┼──→ Fuel Cells
│                             └──→ Polymers
└── Population ───────────────────→ Labor Units

Tier 1 → Tier 2
├── Refined Metals ──┬─────────────→ Electronics
│                    ├─────────────→ Armor Plating
│                    ├─────────────→ Weapons Grade Alloy
│                    └─────────────→ Propulsion Units
├── Fuel Cells ──────┼─────────────→ Propulsion Units
│                    └─────────────→ Weapons Grade Alloy
├── Polymers ────────┬─────────────→ Electronics
│                    ├─────────────→ Armor Plating
│                    ├─────────────→ Life Support
│                    └─────────────→ Stealth Composites
├── Processed Food ──┴─────────────→ Life Support
└── Electronics ─────────────────→ Targeting Arrays
                                  → Quantum Processors
                                  → Stealth Composites

Tier 2 → Tier 3
├── Propulsion Units ─────────────→ Reactor Cores
├── Electronics ──────────────────→ Shield Generators
│                                 → Cloaking Devices
├── Armor Plating ────────────────→ Shield Generators
├── Reactor Cores ────────────────→ Warp Drives
│                                 → Ion Cannon Cores
│                                 → Singularity Containment
├── Weapons Grade Alloy ──────────→ Ion Cannon Cores
│                                 → Nuclear Warheads (BM)
├── Quantum Processors ───────────→ Neural Interfaces
│                                 → Cloaking Devices
├── Stealth Composites ───────────→ Cloaking Devices
│                                 → Warp Drives
├── Targeting Arrays ─────────────→ Ion Cannon Cores
│                                 → Warp Drives
├── Life Support ─────────────────→ Neural Interfaces
│                                 → Bioweapon Synthesis (BM)
└── Shield Generators ────────────→ Singularity Containment
```

---

## Part 8: Game Balance Considerations

### Maintaining SRE Feel

The original game balance should be preserved:

1. **Early Game (Turns 1-20, Protection)**
   - Focus on economy building
   - No crafting pressure
   - Basic military sufficient
   - Research begins accumulating

2. **Mid Game (Turns 21-50)**
   - Tier 2 components become important
   - Light/Heavy Cruisers differentiate players
   - First Black Market contacts
   - Alliances form around resource sharing

3. **Late Game (Turns 51+)**
   - Tier 3 systems define military power
   - WMD threat creates deterrence
   - Top players targeted by Syndicate contracts
   - Struggling empires get comeback options

### Anti-Snowball Mechanics

| Mechanic | Effect |
|----------|--------|
| Syndicate Recruitment | Bottom 50% get early WMD access |
| Targeted Contracts | Top players constantly hunted |
| Research Diminishing Returns | 8th Research Planet gives less than 1st |
| Maintenance Scaling | Larger fleets cost proportionally more |
| Coalition Mechanics | Treaties against leader get bonuses |

### Strategy Archetypes

The crafting system enables distinct playstyles:

| Archetype | Focus | Strengths | Weaknesses |
|-----------|-------|-----------|------------|
| **Industrialist** | Economy, Tier 1 production | Sells to others, rich | Weak military |
| **Researcher** | Research planets, tech rush | First to advanced units | Slow start |
| **Militarist** | Basic military spam | Early aggression | Falls behind late |
| **Shadow Broker** | Black Market focus | WMD access, contracts | Coordinator risk |
| **Diplomat** | Alliances, trade | Resource access | Treaty dependent |
| **Balanced** | All systems moderate | Flexible | Master of none |

---

## Part 9: Implementation Notes

### Database Considerations

New tables needed:
- `player_resources` (Tier 0-3 quantities)
- `player_research` (levels, branch allocations, RP)
- `player_trust` (syndicate standing, contract history)
- `active_contracts` (type, target, deadline, reward)
- `crafting_queue` (item, components reserved, completion turn)
- `military_units` (expanded from original with new types)

### UI Considerations

- **Crafting Panel**: Show available recipes, component inventory
- **Research Tree**: Visual tech tree with progress bars
- **Black Market**: Hidden initially, revealed at Trust 1
- **Contract Board**: Available contracts with risk/reward
- **Military Builder**: Filter by what you can currently build

### AI Bot Considerations

Bots need strategies for:
- Resource prioritization based on personality
- Research path selection
- Black Market engagement (some bots never touch it)
- Contract acceptance criteria
- Crafting optimization

---

## Part 10: Quick Reference Card

### What Can I Buy With Just Credits?

| Item | Credits Only? |
|------|--------------|
| Soldiers | ✓ Yes |
| Fighters | ✓ Yes |
| Carriers | ✓ Yes |
| Generals | ✓ Yes |
| Covert Agents | ✓ Yes |
| Planets | ✓ Yes |
| Food | ✓ Yes |
| Light Cruisers | ✗ Need Tier 2 |
| Heavy Cruisers | ✗ Need Tier 2 + Tier 3 |
| Defense Stations | ✗ Need Tier 2 |
| Advanced Units | ✗ Need crafting |
| WMDs | ✗ Need Black Market + crafting |

### Minimum Requirements for Key Items

| Want This? | You Need... |
|------------|-------------|
| Light Cruiser | Research 2, 2 Armor Plating, 2 Propulsion, 5,000 credits |
| Heavy Cruiser | Research 4, 3 Armor Plating, 2 Propulsion, 1 Reactor Core, 15,000 credits |
| Ion Cannon | Research 6, 1 Ion Cannon Core, 1 Targeting Array, 1 Reactor Core, 40,000 credits |
| Nuclear Weapon | Research 6, Trust 7, 1 Nuclear Warhead, 1 Propulsion, 100,000+ credits |
| Dreadnought | Research 6, 3 Reactor Cores, 2 Shield Generators, 1 Ion Cannon Core, 80,000 credits |

---

## Changelog

- **v1.0** (Initial Design)
  - Established 4-tier resource system
  - Created Research progression (Levels 1-8)
  - Designed Black Market trust system (8 levels)
  - Expanded military units with strategic diversity
  - Added WMD mechanics
  - Included balance considerations
  - Created visual unlock trees

---

*This document is a living design spec for Nexus Dominion. Balance numbers are initial estimates and should be tuned through playtesting.*

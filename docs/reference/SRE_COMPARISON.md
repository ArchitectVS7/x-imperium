# Solar Realms Elite vs X-Imperium: Feature Comparison

## Game Evolution Timeline

```
The Sumerian Game (1964) - Mabel Addis
  ↓
Kingdom/Hammurabi (1968-1978) - David Ahl's Computer Basic Games
  ↓
Space Empire Elite (1986) - Jon Radoff (Atari ST)
  ↓
Solar Realms Elite (1990-1994) - Amit Patel (BBS/DOS)
  ↓
   ---Solar Imperium (2007-2009) - Yanick Bourbeau (PHP/Web)
  ↓
X-Imperium (2026) - Jason Scannell (Current Re-Vision)
```

---

## Core Game Comparison

### Solar Realms Elite (Original 1990-1994)

**Platform:** BBS Door Game (DOS, Borland C++ 3.1)
**Players:** Multiplayer via BBS dial-up
**Interface:** ANSI text-based color interface

#### Original Features

**Starting Conditions:**
- 6 planets
- "A little bit of money"
- 20 years (turns) of protection

**Planet Types (10 types):**
1. **Food** - Produce food to feed army and population
2. **Supply** - Produce military hardware at low cost
3. **Government** - House covert agents and generals
4. **Ore** - Produce steady income
5. **Tourism** - Higher but less reliable income (affected by pollution)
6. **Petroleum** - Income based on supply/demand across all empires
7. **Urban** - House large population
8. **Education** - Attract civilians from other empires
9. **Anti-Pollution** - Clean up interstellar pollution
10. **Research** - Improve productivity of other planet types

**Combat Types:**
- Conventional warfare
- Guerilla attacks
- Nuclear strikes
- Chemical attacks
- Covert operations

**Key Systems:**
- Alliance system
- AI pirates
- Maintenance costs (food, money)
- Population management
- Military production
- Pollution system

**Notable Design Philosophy:**
- Multiple viable strategies without single dominant strategy
- Resource management (Hammurabi/Kingdom legacy)
- Expansion and conquest (Space Empire Elite legacy)
- Economic simulation with supply/demand

---

### Solar Imperium (2007-2009 Evolution)


#### NEW RESOURCES SYSTEM
**Before (SRE):** Food and Credits only
**After:**
- **Food** - Population/military consumption
- **Credits** - Currency
- **Ore** - Military maintenance material
- **Petroleum** - Converted from income source to fuel resource
- **Research Points** - Technology currency

**Impact:** Petroleum planets changed from income generators to resource producers. Ore became essential for military maintenance (repair material). Added strategic depth requiring resource balance.

#### GLOBAL MARKET SYSTEM
**Before (SRE):** Basic food trading
**After:**
- Global market for Food, Ore, Petroleum
- Real economic system (supply/demand ratios)
- Dynamic pricing (0.4x to 1.6x base price)
- Auto-purchase when resources deficit
- Market fluctuations affect all players

**New Mechanic:** If you lack resources for maintenance, the game auto-buys at market price. Bankruptcy results in planet/military losses.

#### RESEARCH POINT TRADING
**Before (SRE):** Research only improved productivity
**After:**
- Research points as tradeable resource
- Can sell excess research for credits
- Strategic decision: tech advancement vs immediate income

#### ENHANCED PLANET FUNCTIONS
**Education Planets:**
- **Before:** Only attracted civilians
- **After:** Also generate research points (though small amounts)

**Urban Planets:**
- **Before:** Housing only
- **After:** Fixed urban tax system (1,000 credits/planet)

#### NEW COVERT OPERATION
- **Setup Coup** - Attempt to overthrow enemy government (very high cost)

#### FLASH STARMAP
- Interactive visual starmap (Flash 8)
- Displays spaceship movements
- Real-time visualization

#### IMPROVED CUSTOMIZATION
- Doubled color palette for empire logos
- Logo editor enhancements
- Coalition logo system

---

#### ENHANCED SYSTEMS

**Maximum Planets Limit:**
- **New:** Cannot buy beyond limit (still can invade for more)
- **Purpose:** Prevents runaway economic snowballing

**Black Market Cooldown:**
- **New:** 50-turn minimum between appearances
- **Purpose:** Prevents abuse of high covert-agent ratio

**Guerilla Attack Rebalance:**
- **Changed:** Now favors small empires
- **Purpose:** Asymmetric warfare option for weaker players

**Invasion Limit:**
- **New:** Maximum one invasion per turn
- **Purpose:** Prevents mass-attack coordination exploits

**Database Persistence:**
- **New:** Dead empires remain in database
- **Purpose:** Maintains statistics, hall of fame, game history

**Technical Upgrades:**
- MyISAM → InnoDB (transaction support)
- Phemplate → Smarty (compiled templates)
- MySQL named locks (race condition prevention)
- Client-side chart rendering (performance boost)
- AJAX interface
- XML API support

#### STARMAP ENHANCEMENT
- Now displays moving spaceships
- Real-time convoy tracking

---

## Side-by-Side Feature Matrix

| Feature | SRE (1990) | X-Imperium (2026) |
|---------|------------|----------------------|-------------------|
| **Platform** | BBS/DOS | TypeScript + Next.js |
| **Interface** | ANSI Text | Tailwind CSS + shadcn/ui|
| **Starting Planets** | 6  | 9 |
| **Protection Turns** | 20  | Configurable |
| **Planet Types** | 10 | 10 |
| **Resources** | 2 (Food, Credits) | 4 (Food, Credits, Ore, Petroleum) + Research Points |
| **Military Units** | ~8 types |  6 types (+ Covert Agents) |
| **Market System** | Basic |  Global (supply/demand enhanced) |
| **Research System** | Productivity boost | Hierarchical tech tree |
| **Diplomacy** | Alliances | Treaties + Coalitions |
| **AI Pirates** | ✓ Yes | ✓ Yes (configurable) |
| **Covert Ops** | ~8 operations | ~15 operations |
| **Starmap** | Text/ANSI | Canvas 2D (react-konva) |
| **Auto-Maintenance** | Manual | Auto-buy resources |
| **Bankruptcy System** | Basic | Planet/military loss + civil collapse |
| **Solar Bank** | ?  | ✓ Black Market Loan Sharks |
| **Black Market** | ? | ✓ Yes (trust system & cooldown) |
| **Database** | File-based | PostgreSQL + Drizzle ORM |
| **Security** | BBS-level |  Modern (Argon2ID, CSRF, prepared statements) |
| **Single Player** | ✗ No |  Advanced AI bots  |

---

## What Was Added (Borrowed from Solar Imperium)

### Major Gameplay Additions

1. **Ore & Petroleum Resources**
   - Transformed from simple income (SRE) to strategic resources (SI)
   - Created resource interdependencies
   - Forced economic balancing decisions

2. **Research Point Economy**
   - Research became tradeable currency
   - Tech vs money strategic choice
   - Education planets dual-purpose

3. **Global Market System**
   - Real supply/demand economics
   - Price fluctuations affect strategy
   - Auto-purchase system (with bankruptcy consequences)

4. **Coalition System**
   - Formalized team play beyond simple alliances
   - Coalition rankings
   - Shared resources/intelligence

5. **Comprehensive Covert Operations**
   - Expanded from basic spy missions
   - 12+ distinct operations
   - Counter-intelligence mechanics

6. **Banking System**
   - Mafia style loan sharking
   - Tie in with black market trust system
   - SI included banking with interest, maybe?

7. **Black Market**
   - Unlocked at high covert agent ratios
   - Exclusive trading (nuclear weapons, etc.)
   - Cooldown prevents abuse

8. **Enhanced Event System**
   - 30+ event types
   - Narrative feedback
   - Random events affecting economy/politics

9. **Statistics & History**
   - Hall of Fame
   - Game history tracking
   - Turn-by-turn statistics
   - Performance graphs

10. **Communication Systems**
    - Shoutbox (global chat)
    - Private messages
    - Forum system
    - Event notifications


---

---

## References

- [Solar Realms Elite - Break Into Chat BBS Wiki](https://breakintochat.com/wiki/Solar_Realms_Elite)
- [Solar Realms Elite Design Notes](http://www-cs-students.stanford.edu/~amitp/Articles/SRE-Design.html)
- [Solar Realms Elite Documentation](http://www-cs-students.stanford.edu/~amitp/Articles/SRE-Documentation.html)
- [Amit Patel Interview - Break Into Chat](https://breakintochat.com/blog/2013/02/18/amit-patel-creator-of-solar-realms-elite/)
- [Solar Realms Elite Archive](https://archive.org/details/sre0990b_zip)


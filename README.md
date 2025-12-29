# Nexus Dominion
Forked from:
 **Solar Imperium** (Yanick Bourbeau) which was a modernization of...
   **Solar Realms Elite** (1990 by Amit Patel) which was inspired by...
     **Space Empires Elite** (1986 by Jon Radoff) inspired by the games Kingdom/Hammurabi, dating back to mainframe days! 

This is a direct modernization of Yanick's Solar Imperium, itself a clone of Amit Patel's Solar Realms Elite. ". Amit Patel, who wrote the massively popular Solar Realms Elite game for bulleting board systems (BBS) in the 1990's, not only directly links to Yanick's clone, but offers links to his own source. Yanick's clone uses a number of terms in his code suach as "Solar-Realms", giving clear evidence that his project was at least started as a port. Amit, in turn, based his game largely upon the work of Space Empire Elite. Even the genesis seed of this, the games known either as "Kingdom" or "Hammurabi", were widely published as text entry games for home computers, and dates as far back as 1964 with "The Sumerian Game" by Mabel Addis. This is notable for a number of key firsts:

 - First educational/edutainment computer game
 - First video game with narrative storytelling
 - First video game with cutscenes (audio lectures + slide projector)
 - First resource management game
 - First female video game designer
 - First video game writer

There is a lot coming to bring this game up to modern standards. Even in his developer notes in 2010, Yanick points out some rough patches in the game flow:
 - At this point, 2.7 release of Solar Imperium is really hard to play with if you are a fresh newcomer who don't have played the oldest releases first
 - I am not much of a social networks fan but it may be the way to go to attract casual gamers
 - 2.7 codebase is too complex for the result it produce

Before I get into gameplay, balance, social features, etc, I opted to get the game launchable. In the process, we have nearly 20 years of software advances meaning we had a major update just in hardening vulnerabilities. We are in a "near playable" state right now. The CHANGELOG and commit history is your best best to see the migration status, and my intention is to leave this in a docker state so that anyone can load this and play it. The fiorst play test will be to get through a game or three on my own. Moving forward I am looking at:

 - Upgrade graphics maintaining the moder/retro look
 - Smooth over the user onboarding, tutorial, and overall game experience
 - Full end to end testing with Playwright
 - Single player MMO mode with multiple bot NPC players with varied levels of skill and strategy

## Quick Start

```bash
# Clone and start with Docker
git clone https://github.com/ArchitectVS7/nexus-dominion.git
cd nexus-dominion
cp .env.example .env
# Edit .env with secure passwords
docker-compose up -d --build

# Access at http://localhost:8080
```

## Tech Stack

- **Backend:** PHP 8.2+
- **Database:** MySQL 8.0 (PDO with prepared statements)
- **Templates:** Smarty
- **Deployment:** Docker + Caddy (HTTPS)

## Development

```bash
composer install          # Install dependencies
composer run-script lint  # PSR-12 linting
composer run-script analyze  # PHPStan analysis

# Database migrations
docker-compose exec web php database/migrate.php
```

## Documentation

- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) - Step-by-step production deployment
- [Modernization Plan](docs/MODERNIZATION_PLAN.md) - Security upgrade roadmap
- [Bot Architecture](docs/BOT_ARCHITECTURE.md) - Single-player AI system (planned)
- [User Manual](docs/USER_MANUAL.md) - Game rules and mechanics
- [Claude Code Guide](CLAUDE.md) - AI assistant context

## Game Features

- Turn-based multiplayer empire management
- Resource economy (credits, food, ore, petroleum)
- Military combat (ground, orbital, space)
- Covert operations and espionage
- Diplomacy and coalition system
- Research and technology trees
- Global market trading

## License

GPL-2.0 - See [LICENSE.TXT](LICENSE.TXT)

## Legacy



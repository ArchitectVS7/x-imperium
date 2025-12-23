# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

x-imperium is a modernized version of Solar Realms Elite, a classic text-based browser 4X space empire management game. Originally written in PHP 4/5 (2009), it's being actively modernized to PHP 8.2+ with modern security practices while preserving legacy gameplay.

**Stack:** PHP 8.2+, MySQL 8.0, Smarty templates, Docker, Caddy reverse proxy

## Build & Development Commands

```bash
# Install dependencies
composer install

# Code linting (PSR-12)
composer run-script lint

# Static analysis (PHPStan level 5)
composer run-script analyze

# Docker development environment
docker-compose up -d
docker-compose down

# Production deployment (with Caddy HTTPS)
docker-compose -f docker-compose.prod.yml up -d --build

# Database migrations
docker-compose exec web php database/migrate.php
docker-compose exec web php database/migrate.php --status

# Database access
docker-compose exec db mysql -u ximperium -p ximperium
```

## Architecture

### Entry Points
- `index.php` → Redirects to `install.php` (unconfigured) or `welcome.php`
- `welcome.php` → Login/registration
- `install.php` → Installation wizard
- `game/` → 40+ action files (battle.php, diplomacy.php, market.php, etc.)

### Request Flow
```
HTTP Request → include/init.php (bootstrap) → Smarty templates → Game classes → Database (PDO) → Response
```

### Key Directories
- `include/database/` - Modern PDO wrapper with ADODB compatibility layer
- `include/security/` - Security modules (PasswordHandler, InputSanitizer, SessionManager)
- `include/game/classes/` - Core game entities (empire, army, planets, research, diplomacy, coalition, invasion)
- `include/game/newturn/` - Turn processing logic (13 files for resource growth, events, combat)
- `include/thirdparty/` - Legacy libraries (ADODB, Smarty, gettext)
- `templates/` - Smarty templates (system/, game/, installer/)
- `scripts/game/` - Cron jobs for background tasks

### Database Schema
- **System tables** (11): `system_tb_players`, `system_tb_games`, `system_tb_sessions`, etc.
- **Per-game tables** (24+): Prefixed with `game{id}_tb_` (army, empire, planets, diplomacy, etc.)

## Security Modules

### Database (include/database/Database.php)
PDO-based wrapper with prepared statements. Legacy ADODB calls supported via `Execute()` for backward compatibility.

```php
// Preferred: prepared statements
$db->execute("SELECT * FROM users WHERE email = :email", ['email' => $email]);

// Legacy (logs warnings but works)
$db->Execute("SELECT * FROM users WHERE id = " . intval($id));
```

### Passwords (include/security/PasswordHandler.php)
Argon2ID hashing with automatic legacy MD5 rehashing on login.

### Input (include/security/InputSanitizer.php)
Type-safe methods: `int()`, `float()`, `email()`, `alphanumeric()`, `html()` for XSS prevention.

### Sessions (include/security/SessionManager.php)
Secure cookies, session regeneration every 30 minutes, CSRF token generation/validation.

## Modernization Status

**Completed:** SQL injection prevention, Argon2ID passwords, XSS prevention, CSRF protection, Docker setup

**In Progress:** Removing remaining `addslashes()` calls, replacing ADODB with pure PDO

**Planned:** Full test suite, single-player bot AI (see docs/BOT_ARCHITECTURE.md)

## Documentation

- `docs/MODERNIZATION_PLAN.md` - Phased security modernization roadmap
- `docs/BOT_ARCHITECTURE.md` - Single-player AI opponent system design
- `docs/DEPLOYMENT_GUIDE.md` - Docker deployment instructions
- `docs/USER_MANUAL.md` - Game rules and mechanics

## Branding & Historical References

### Current Branding: X Imperium
The project has been rebranded from "Solar Realms Elite" → "Solar Imperium" → "X Imperium".

### What to Change
- **System branding**: Update "Solar Realms", "SolarRealms", "solarrealms" to "X Imperium", "XImperium", "ximperium" in:
  - Docker/infrastructure files (container names, network names, volume names)
  - Database credentials and connection strings (database names, usernames)
  - Package metadata (composer.json, package.json)
  - Code comments and documentation
  - User-facing UI text (error messages, page titles)

### What NOT to Change
- **Historical references & attribution**: Keep original references to "Solar Realms Elite" in:
  - README.md (project lineage and history)
  - Documentation explaining the game's origins
  - Attribution to original creator Amit Patel
  - Wikipedia links and educational context
  - Any "About" or "Tour" pages explaining game history

- **Game mechanics & features**: Keep original names for in-game features:
  - "Solar Bank" (game feature with `CONF_SOLARBANK_*` constants)
  - Any gameplay features that players recognize by their original names
  - Localization files referencing historical game features

**Rationale**: Preserving attribution honors the original work and provides valuable context for contributors and players about the game's evolution.

## Key Notes

1. **Always use prepared statements** - New code should use `Database.php` with parameterized queries
2. **Escape output** - Use `InputSanitizer::html()` or `|escape:"html"` in Smarty templates
3. **Run migrations** after schema changes: `php database/migrate.php`
4. **Session timeout** is short (4 minutes default in CONF_SESSION_TIMEOUT)
5. **ADODB is legacy** - Still used as compatibility layer; prefer Database.php methods

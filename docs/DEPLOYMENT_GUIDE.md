# Solar Realms Elite - Deployment Guide

**A practical, step-by-step guide for deploying Solar Realms Elite to the web.**

This guide is written for developers who have used Docker locally but haven't deployed to a production server before.

---

## Table of Contents

1. [Quick Overview](#quick-overview)
2. [What You'll Need](#what-youll-need)
3. [Step 1: Get a Server](#step-1-get-a-server)
4. [Step 2: Initial Server Setup](#step-2-initial-server-setup)
5. [Step 3: Install Docker](#step-3-install-docker)
6. [Step 4: Deploy the Application](#step-4-deploy-the-application)
7. [Step 5: Run Database Migrations](#step-5-run-database-migrations)
8. [Step 6: Set Up SSL (HTTPS)](#step-6-set-up-ssl-https)
9. [Step 7: Configure Your Domain](#step-7-configure-your-domain)
10. [Ongoing Maintenance](#ongoing-maintenance)
11. [Troubleshooting](#troubleshooting)

---

## Quick Overview

Here's what we're going to do:

```
Your Computer                         Cloud Server (VPS)
┌─────────────────┐                  ┌─────────────────────────────────┐
│                 │   SSH/Deploy     │  Docker Engine                  │
│  Code + Docker  │ ───────────────► │  ┌─────────┐  ┌─────────┐      │
│  (development)  │                  │  │  Web    │  │  MySQL  │      │
│                 │                  │  │ (PHP)   │──│  (DB)   │      │
└─────────────────┘                  │  └─────────┘  └─────────┘      │
                                     │       │                         │
                                     │       ▼                         │
                                     │  Port 80/443 ─► Internet       │
                                     └─────────────────────────────────┘
```

**Total time:** About 30-60 minutes for first deployment.

---

## What You'll Need

1. **A domain name** (e.g., `solarrealms.yourdomain.com`)
   - You can buy one from Namecheap, Cloudflare, or Google Domains (~$10-15/year)

2. **A VPS (Virtual Private Server)** - This is your cloud server
   - Recommended: 2GB RAM, 1-2 CPU cores (~$5-12/month)

3. **SSH access** - How you'll connect to your server
   - If you're on Mac/Linux: Built-in terminal
   - If you're on Windows: Use PowerShell or WSL

4. **Git** - To clone your repository to the server

---

## Step 1: Get a Server

### Recommended Providers (Cheapest to Most Expensive)

| Provider | Plan | RAM | Cost | Sign Up |
|----------|------|-----|------|---------|
| **Hetzner** | CX21 | 4GB | €4.50/mo (~$5) | hetzner.com/cloud |
| **Vultr** | Cloud Compute | 2GB | $12/mo | vultr.com |
| **DigitalOcean** | Basic Droplet | 2GB | $12/mo | digitalocean.com |
| **Linode** | Shared CPU | 2GB | $12/mo | linode.com |

### Creating Your Server

1. Sign up at your chosen provider
2. Create a new server (called "Droplet" on DigitalOcean, "Instance" on others)
3. Choose:
   - **OS:** Ubuntu 22.04 LTS (or 24.04)
   - **Plan:** The smallest/cheapest is fine to start
   - **Region:** Choose closest to your players
   - **Authentication:** SSH Key (recommended) or Password

4. **Save your server's IP address** - You'll need it (looks like `167.99.123.45`)

### Setting Up SSH Keys (Recommended)

If you don't have SSH keys yet:

```bash
# On your local computer, run:
ssh-keygen -t ed25519 -C "your-email@example.com"

# Press Enter to accept defaults
# Your public key is at: ~/.ssh/id_ed25519.pub

# View it with:
cat ~/.ssh/id_ed25519.pub
```

Add this public key when creating your server.

---

## Step 2: Initial Server Setup

### Connect to Your Server

```bash
# Replace with your server's IP address
ssh root@YOUR_SERVER_IP

# Example:
ssh root@167.99.123.45
```

First time? Type `yes` when asked about the fingerprint.

### Create a Non-Root User (Security Best Practice)

```bash
# Create a new user (replace 'deploy' with your preferred username)
adduser deploy

# Give them sudo access
usermod -aG sudo deploy

# Copy your SSH keys to the new user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Now disconnect and reconnect as the new user
exit
```

```bash
# Connect as your new user
ssh deploy@YOUR_SERVER_IP
```

### Basic Security Setup

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Set up firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Type 'y' when asked
```

---

## Step 3: Install Docker

This is simpler than installing PHP, MySQL, and Apache separately!

```bash
# Install Docker using the official convenience script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to the docker group (so you don't need sudo)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Log out and back in for group changes to take effect
exit
```

```bash
# Reconnect
ssh deploy@YOUR_SERVER_IP

# Verify Docker works
docker --version
docker compose version
```

You should see version numbers for both commands.

---

## Step 4: Deploy the Application

### Clone the Repository

```bash
# Create a directory for the app
mkdir -p ~/apps
cd ~/apps

# Clone the repository
git clone https://github.com/ArchitectVS7/x-imperium.git
cd x-imperium
```

### Configure Environment Variables

```bash
# Create your environment file
cp .env.example .env

# Edit it with secure passwords
nano .env
```

Change these values in the `.env` file:

```env
# IMPORTANT: Change these passwords!
DB_PASSWORD=use_a_strong_random_password_here
DB_ROOT_PASSWORD=use_another_strong_password_here

# Your timezone (for game events)
CONF_TIMEZONE=UTC

# Set to 0 for production
DEBUG_MODE=0
```

**Generate secure passwords:**
```bash
# Run this to generate random passwords:
openssl rand -base64 24
```

Save and exit nano: `Ctrl+X`, then `Y`, then `Enter`

### Prepare the Database Initialization

```bash
# Create SQL directory for initial setup
mkdir -p sql

# Copy schema files (these will run when MySQL first starts)
cp include/sql_base.txt sql/01_schema.sql
cp include/sql_insert.txt sql/02_data.sql
```

### Build and Start the Containers

```bash
# Build and start everything (this takes a few minutes the first time)
docker compose up -d --build

# Watch the logs to make sure everything starts correctly
docker compose logs -f
```

Wait until you see MySQL say "ready for connections" (about 30-60 seconds).

Press `Ctrl+C` to stop watching logs.

### Verify It's Running

```bash
# Check container status
docker compose ps

# You should see both 'web' and 'db' as "running"
```

**Test in your browser:** Visit `http://YOUR_SERVER_IP:8080`

You should see the Solar Realms Elite welcome page!

---

## Step 5: Run Database Migrations

The password field needs to be expanded to support modern secure hashes:

```bash
# Run migrations inside the web container
docker compose exec web php database/migrate.php

# Check migration status
docker compose exec web php database/migrate.php --status
```

You should see output confirming the password fields were expanded.

---

## Step 6: Set Up SSL (HTTPS)

Players won't trust a game without HTTPS. We'll use Caddy as a reverse proxy (it handles SSL certificates automatically).

### Option A: Using Caddy (Recommended - Easiest)

Create a `docker-compose.prod.yml` file:

```bash
nano docker-compose.prod.yml
```

Paste this content (replace `solarrealms.yourdomain.com` with your actual domain):

```yaml
version: '3.8'

services:
  caddy:
    image: caddy:alpine
    container_name: solarrealms-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - solarrealms-network
    depends_on:
      - web

  web:
    build: .
    container_name: solarrealms-web
    restart: unless-stopped
    expose:
      - "80"
    environment:
      - CONF_DATABASE_DRIVER=mysql
      - CONF_DATABASE_HOSTNAME=db
      - CONF_DATABASE_USERNAME=solarrealms
      - CONF_DATABASE_PASSWORD=${DB_PASSWORD:-solarrealms_secret}
      - CONF_DATABASE_NAME=solarrealms
      - CONF_TIMEZONE=${CONF_TIMEZONE:-UTC}
    volumes:
      - ./templates_c:/var/www/html/templates_c
    depends_on:
      db:
        condition: service_healthy
    networks:
      - solarrealms-network

  db:
    image: mysql:8.0
    container_name: solarrealms-db
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:-root_secret}
      MYSQL_DATABASE: solarrealms
      MYSQL_USER: solarrealms
      MYSQL_PASSWORD: ${DB_PASSWORD:-solarrealms_secret}
    volumes:
      - solarrealms-db-data:/var/lib/mysql
      - ./sql:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "solarrealms", "-p${DB_PASSWORD:-solarrealms_secret}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    networks:
      - solarrealms-network

volumes:
  solarrealms-db-data:
  caddy_data:
  caddy_config:

networks:
  solarrealms-network:
    driver: bridge
```

Create the Caddyfile:

```bash
nano Caddyfile
```

```
solarrealms.yourdomain.com {
    reverse_proxy web:80

    # Security headers
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options SAMEORIGIN
        X-XSS-Protection "1; mode=block"
        Referrer-Policy strict-origin-when-cross-origin
    }

    # Logging
    log {
        output file /var/log/caddy/access.log
    }
}
```

### Switch to Production Configuration

```bash
# Stop the development setup
docker compose down

# Start with production configuration (includes Caddy)
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Step 7: Configure Your Domain

### Point Your Domain to Your Server

Go to your domain registrar's DNS settings and add:

| Type | Name | Value |
|------|------|-------|
| A | solarrealms (or @) | YOUR_SERVER_IP |

**Example:** If your domain is `example.com` and you want `solarrealms.example.com`:
- Type: A
- Name: solarrealms
- Value: 167.99.123.45 (your server IP)

DNS changes can take 5-30 minutes to propagate.

### Test Your Deployment

After DNS propagates, visit: `https://solarrealms.yourdomain.com`

You should see:
- ✅ HTTPS working (padlock icon in browser)
- ✅ Solar Realms Elite welcome page
- ✅ Ability to register and log in

---

## Ongoing Maintenance

### View Logs

```bash
# All containers
docker compose -f docker-compose.prod.yml logs -f

# Just the web server
docker compose -f docker-compose.prod.yml logs -f web

# Just the database
docker compose -f docker-compose.prod.yml logs -f db
```

### Update the Application

```bash
cd ~/apps/x-imperium

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# Run any new migrations
docker compose -f docker-compose.prod.yml exec web php database/migrate.php
```

### Backup the Database

```bash
# Create a backup
docker compose -f docker-compose.prod.yml exec db \
    mysqldump -u root -p$DB_ROOT_PASSWORD solarrealms > backup_$(date +%Y%m%d).sql

# Automate daily backups (add to crontab)
crontab -e
# Add this line:
# 0 2 * * * cd ~/apps/x-imperium && docker compose exec -T db mysqldump -u root -pYOUR_PASSWORD solarrealms > ~/backups/solarrealms_$(date +\%Y\%m\%d).sql
```

### Restart Services

```bash
# Restart everything
docker compose -f docker-compose.prod.yml restart

# Restart just the web container
docker compose -f docker-compose.prod.yml restart web
```

### Stop Everything

```bash
# Stop but keep data
docker compose -f docker-compose.prod.yml stop

# Stop and remove containers (data persists in volumes)
docker compose -f docker-compose.prod.yml down
```

---

## Troubleshooting

### "Connection refused" when visiting the site

```bash
# Check if containers are running
docker compose ps

# Check container logs
docker compose logs web
docker compose logs db
```

### Database won't start

```bash
# Check database logs
docker compose logs db

# Common fix: Remove and recreate the database volume
docker compose down
docker volume rm x-imperium_solarrealms-db-data
docker compose up -d
```

### SSL certificate errors

```bash
# Check Caddy logs
docker compose -f docker-compose.prod.yml logs caddy

# Make sure your domain points to the correct IP
dig solarrealms.yourdomain.com
```

### Can't connect via SSH

- Check your firewall rules: `sudo ufw status`
- Verify SSH is running: `sudo systemctl status ssh`

### Game is slow

```bash
# Check container resource usage
docker stats

# If memory is maxed out, upgrade your VPS or optimize settings
```

---

## Security Checklist

Before going live, verify:

- [ ] Changed default passwords in `.env`
- [ ] Running over HTTPS (SSL certificate active)
- [ ] Firewall configured (`ufw status` shows active)
- [ ] Database migrations completed
- [ ] DEBUG_MODE set to 0 in production
- [ ] SSH key authentication (disable password auth for extra security)
- [ ] Regular backups scheduled

---

## Quick Reference Commands

```bash
# Start containers
docker compose -f docker-compose.prod.yml up -d

# Stop containers
docker compose -f docker-compose.prod.yml down

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Rebuild after code changes
docker compose -f docker-compose.prod.yml up -d --build

# Run database migrations
docker compose -f docker-compose.prod.yml exec web php database/migrate.php

# Access MySQL directly
docker compose -f docker-compose.prod.yml exec db mysql -u solarrealms -p solarrealms

# Access PHP container shell
docker compose -f docker-compose.prod.yml exec web bash
```

---

## Cost Summary

| Item | Monthly Cost |
|------|--------------|
| VPS (Hetzner CX21) | ~$5 |
| Domain name | ~$1 (annual ÷ 12) |
| SSL Certificate | $0 (Let's Encrypt via Caddy) |
| **Total** | **~$6/month** |

---

## Need Help?

- Check the [DEPLOYMENT_OPTIONS.md](./DEPLOYMENT_OPTIONS.md) for more advanced configurations
- Review the [MODERNIZATION_PLAN.md](./MODERNIZATION_PLAN.md) for security details
- Open an issue on GitHub for specific problems

**You did it!** Your Solar Realms Elite server is now live on the internet.

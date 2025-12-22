# Solar Realms Elite (x-imperium) Deployment Options Analysis

**Version:** 1.0
**Date:** December 2024
**Project Type:** PHP 8.2 Browser-Based Multiplayer Strategy Game

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Deployment Readiness](#current-deployment-readiness)
3. [Deployment Options Overview](#deployment-options-overview)
4. [Option 1: Docker Compose (Self-Hosted)](#option-1-docker-compose-self-hosted)
5. [Option 2: Traditional VPS/Dedicated Server](#option-2-traditional-vpsdedicated-server)
6. [Option 3: Platform as a Service (PaaS)](#option-3-platform-as-a-service-paas)
7. [Option 4: Container Orchestration (Kubernetes)](#option-4-container-orchestration-kubernetes)
8. [Option 5: Serverless Considerations](#option-5-serverless-considerations)
9. [Database Hosting Options](#database-hosting-options)
10. [Security Considerations](#security-considerations)
11. [Cost Comparison](#cost-comparison)
12. [Recommendations](#recommendations)
13. [Pre-Deployment Checklist](#pre-deployment-checklist)

---

## Executive Summary

Solar Realms Elite is a classic browser-based 4X space strategy game that has been modernized for PHP 8.x. The application stack consists of:

| Component | Technology | Version |
|-----------|------------|---------|
| Backend | PHP | 8.2 |
| Web Server | Apache | 2.4 |
| Database | MySQL | 8.0 |
| Containerization | Docker + Compose | Ready |
| Template Engine | Smarty | 2.x |

**Key Finding:** The project has Docker support already configured, making containerized deployments the most straightforward option. However, security vulnerabilities (SQL injection, weak password hashing) should be addressed before production deployment.

---

## Current Deployment Readiness

### What's Ready ✅

| Component | Status | Notes |
|-----------|--------|-------|
| Dockerfile | Complete | PHP 8.2-Apache with security hardening |
| docker-compose.yml | Complete | Multi-container orchestration |
| Environment Config | Complete | `.env.example` template provided |
| Health Checks | Complete | HTTP and MySQL ping checks |
| Volume Persistence | Complete | Database and compiled templates |
| PHP Extensions | Complete | PDO, GD, mbstring, zip installed |
| Apache Config | Complete | mod_rewrite, mod_headers enabled |

### What Needs Work ⚠️

| Issue | Severity | Impact on Deployment |
|-------|----------|---------------------|
| SQL Injection (385+ instances) | Critical | Security risk |
| MD5 Password Hashing | Critical | Security risk |
| XSS Vulnerabilities | High | Security risk |
| Deprecated PHP Functions | High | Runtime errors on PHP 8+ |
| No CI/CD Pipeline | Medium | Manual deployment required |
| No SSL/TLS Configuration | Medium | Requires reverse proxy |
| No Database Migrations | Medium | Manual schema management |

---

## Deployment Options Overview

| Option | Complexity | Cost | Scalability | Best For |
|--------|------------|------|-------------|----------|
| Docker Compose (VPS) | Low | Low | Limited | Development, small communities |
| Traditional VPS | Low | Low | Limited | Simpler management |
| PaaS (Heroku, Render) | Low | Medium | Auto | Quick deployments |
| Kubernetes | High | Medium-High | Excellent | Large-scale, multiple games |
| Managed Container Services | Medium | Medium | Good | Balance of control/ease |

---

## Option 1: Docker Compose (Self-Hosted)

**Recommended For:** Development, testing, small to medium player communities (< 500 concurrent users)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         VPS/Server                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Docker Engine                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │    nginx    │  │    web      │  │     db      │  │   │
│  │  │  (reverse   │──│ (PHP 8.2   │──│  (MySQL 8)  │  │   │
│  │  │   proxy)    │  │  Apache)   │  │             │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  │        │                │                │          │   │
│  │        ▼                ▼                ▼          │   │
│  │   Port 80/443      Port 8080        Port 3306      │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                    Named Volumes                            │
│              ┌────────────────────────┐                     │
│              │  solarrealms-db-data   │                     │
│              └────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Steps

```bash
# 1. Clone repository
git clone https://github.com/ArchitectVS7/x-imperium.git
cd x-imperium

# 2. Create environment file
cp .env.example .env
# Edit .env with secure passwords

# 3. Create SQL initialization directory
mkdir -p sql
cp include/sql_base.txt sql/01_schema.sql
cp include/sql_insert.txt sql/02_data.sql

# 4. Build and start containers
docker-compose up -d --build

# 5. Access application
# http://your-server:8080
```

### Adding SSL with Nginx Reverse Proxy

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
      - ./letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - web
    networks:
      - solarrealms-network

  web:
    # ... existing config, change ports to expose: ["8080"]

  db:
    # ... existing config, remove external port mapping
```

### Pros
- ✅ Already configured and ready
- ✅ Easy to manage with `docker-compose` commands
- ✅ Consistent environment across development and production
- ✅ Includes phpMyAdmin for development
- ✅ Health checks ensure service reliability

### Cons
- ❌ Single server = single point of failure
- ❌ Limited horizontal scaling
- ❌ Requires manual SSL configuration
- ❌ No automatic failover

### Estimated Costs

| Provider | Specs | Monthly Cost |
|----------|-------|--------------|
| DigitalOcean | 2GB RAM, 1 CPU | $12 |
| Linode | 2GB RAM, 1 CPU | $12 |
| Vultr | 2GB RAM, 1 CPU | $12 |
| Hetzner | 4GB RAM, 2 CPU | €4.50 (~$5) |
| OVH | 4GB RAM, 2 CPU | €5 (~$5.50) |

---

## Option 2: Traditional VPS/Dedicated Server

**Recommended For:** Administrators comfortable with Linux server management

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VPS/Dedicated Server                      │
│                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│   │    Apache    │    │     PHP      │    │    MySQL     │  │
│   │    2.4       │───▶│     8.2      │───▶│     8.0      │  │
│   │  (mod_php)   │    │   + Smarty   │    │              │  │
│   └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                                                    │
│         ▼                                                    │
│   ┌──────────────┐                                          │
│   │   Let's      │                                          │
│   │   Encrypt    │                                          │
│   │   (Certbot)  │                                          │
│   └──────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

### Setup on Ubuntu 22.04/24.04

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Apache, PHP, MySQL
sudo apt install apache2 mysql-server php8.2 php8.2-mysql \
    php8.2-gd php8.2-mbstring php8.2-zip php8.2-xml \
    libapache2-mod-php8.2 -y

# Enable Apache modules
sudo a2enmod rewrite headers ssl

# Secure MySQL
sudo mysql_secure_installation

# Create database and user
sudo mysql -e "CREATE DATABASE solarrealms;"
sudo mysql -e "CREATE USER 'solarrealms'@'localhost' IDENTIFIED BY 'secure_password';"
sudo mysql -e "GRANT ALL PRIVILEGES ON solarrealms.* TO 'solarrealms'@'localhost';"

# Deploy application
sudo mkdir -p /var/www/solarrealms
sudo chown -R www-data:www-data /var/www/solarrealms
# Copy application files...

# Apache virtual host
sudo nano /etc/apache2/sites-available/solarrealms.conf

# Install SSL with Certbot
sudo apt install certbot python3-certbot-apache -y
sudo certbot --apache -d yourdomain.com
```

### Apache Virtual Host Configuration

```apache
<VirtualHost *:80>
    ServerName solarrealms.yourdomain.com
    DocumentRoot /var/www/solarrealms

    <Directory /var/www/solarrealms>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Security headers
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"

    ErrorLog ${APACHE_LOG_DIR}/solarrealms_error.log
    CustomLog ${APACHE_LOG_DIR}/solarrealms_access.log combined
</VirtualHost>
```

### Pros
- ✅ Full control over server configuration
- ✅ No container overhead
- ✅ Easier debugging for PHP developers
- ✅ Direct file system access
- ✅ More familiar for traditional hosting

### Cons
- ❌ Manual dependency management
- ❌ Manual security updates
- ❌ Harder to replicate environments
- ❌ More complex backup/restore
- ❌ Single point of failure

---

## Option 3: Platform as a Service (PaaS)

**Recommended For:** Quick deployments, teams without DevOps expertise

### Available Platforms

#### A. Render.com

```yaml
# render.yaml
services:
  - type: web
    name: solarrealms
    env: docker
    dockerfilePath: ./Dockerfile
    envVars:
      - key: CONF_DATABASE_DRIVER
        value: mysql
      - key: CONF_DATABASE_HOSTNAME
        fromDatabase:
          name: solarrealms-db
          property: host
      - key: CONF_DATABASE_PASSWORD
        fromDatabase:
          name: solarrealms-db
          property: password

databases:
  - name: solarrealms-db
    databaseName: solarrealms
    plan: starter  # $7/month
```

**Pros:** Easy deployment, managed SSL, auto-scaling
**Cons:** MySQL requires external provider, vendor lock-in
**Cost:** ~$7-25/month

#### B. Railway.app

```json
// railway.json
{
  "build": {
    "builder": "dockerfile"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**Pros:** Native MySQL support, generous free tier, easy setup
**Cons:** Less established, limited regions
**Cost:** $5-20/month (based on usage)

#### C. DigitalOcean App Platform

**Pros:** Simple UI, managed databases, automatic SSL
**Cons:** Higher cost, limited PHP customization
**Cost:** $12-50/month

#### D. Heroku (with MySQL add-on)

```
# Procfile
web: vendor/bin/heroku-php-apache2

# composer.json - add
"require": {
    "ext-pdo_mysql": "*"
}
```

**Pros:** Easy deployment, large ecosystem, CI/CD built-in
**Cons:** No native MySQL (use ClearDB/JawsDB), expensive at scale
**Cost:** $7-50/month

### PaaS Comparison

| Platform | MySQL Support | PHP Support | Free Tier | Production Cost |
|----------|---------------|-------------|-----------|-----------------|
| Render | External only | Docker | Yes (limited) | $7-25/mo |
| Railway | Native | Docker | Yes (500 hrs) | $5-20/mo |
| DigitalOcean | Managed | Native | No | $12-50/mo |
| Heroku | Add-on | Native | Yes (limited) | $16-50/mo |

---

## Option 4: Container Orchestration (Kubernetes)

**Recommended For:** Large deployments, multiple game instances, high availability requirements

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Kubernetes Cluster                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                       Ingress Controller                     │ │
│  │                   (nginx-ingress / traefik)                  │ │
│  └───────────────────────────┬─────────────────────────────────┘ │
│                              │                                    │
│  ┌───────────────────────────▼─────────────────────────────────┐ │
│  │                         Services                             │ │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │ │
│  │  │   sre-web   │    │   sre-web   │    │   sre-web   │      │ │
│  │  │  (replica)  │    │  (replica)  │    │  (replica)  │      │ │
│  │  └─────────────┘    └─────────────┘    └─────────────┘      │ │
│  └───────────────────────────┬─────────────────────────────────┘ │
│                              │                                    │
│  ┌───────────────────────────▼─────────────────────────────────┐ │
│  │                    MySQL (StatefulSet)                       │ │
│  │               or Managed Database Service                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Kubernetes Manifests

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: solarrealms-web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: solarrealms
  template:
    metadata:
      labels:
        app: solarrealms
    spec:
      containers:
        - name: web
          image: solarrealms/web:latest
          ports:
            - containerPort: 80
          env:
            - name: CONF_DATABASE_HOSTNAME
              valueFrom:
                secretKeyRef:
                  name: solarrealms-secrets
                  key: db-host
            - name: CONF_DATABASE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: solarrealms-secrets
                  key: db-password
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: solarrealms-service
spec:
  selector:
    app: solarrealms
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: solarrealms-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - solarrealms.yourdomain.com
      secretName: solarrealms-tls
  rules:
    - host: solarrealms.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: solarrealms-service
                port:
                  number: 80
```

### Managed Kubernetes Options

| Provider | Service | Min Cost | Notes |
|----------|---------|----------|-------|
| DigitalOcean | DOKS | $12/mo (per node) | Simple, affordable |
| Linode | LKE | $12/mo (per node) | Good value |
| Google Cloud | GKE | $0 (control plane) + nodes | Enterprise-grade |
| AWS | EKS | $73/mo + nodes | Most features |
| Azure | AKS | $0 (control plane) + nodes | Microsoft ecosystem |

### Pros
- ✅ High availability with multiple replicas
- ✅ Automatic failover and self-healing
- ✅ Easy horizontal scaling
- ✅ Rolling updates with zero downtime
- ✅ Run multiple game instances

### Cons
- ❌ Steep learning curve
- ❌ Higher operational complexity
- ❌ Overkill for small deployments
- ❌ Higher base cost
- ❌ Requires PHP session affinity or external session store

### Session Handling for Kubernetes

Since the app uses PHP sessions, you'll need session persistence:

```yaml
# Option A: Sticky sessions (simpler)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/affinity: cookie
    nginx.ingress.kubernetes.io/session-cookie-name: SREROUTEAFFINIT

# Option B: Redis session store (better)
# Modify PHP to use Redis for sessions
# php.ini: session.save_handler = redis
#          session.save_path = "tcp://redis-service:6379"
```

---

## Option 5: Serverless Considerations

**Not Recommended** for this application due to:

| Limitation | Reason |
|------------|--------|
| PHP Sessions | Serverless is stateless; sessions require external storage |
| Cold Starts | Game responsiveness would suffer |
| Database Connections | Connection pooling complexity |
| Persistent State | Game state requires consistent database connections |
| Smarty Templates | Template compilation needs persistent storage |

**Alternative:** If serverless is required, significant refactoring would be needed:
- Move to token-based authentication (JWT)
- Implement Redis/Memcached for sessions
- Use connection pooling (e.g., PlanetScale serverless driver)
- Convert Smarty to stateless templating

---

## Database Hosting Options

### Option A: Self-Hosted (Docker/VPS)

```yaml
# Already configured in docker-compose.yml
db:
  image: mysql:8.0
  volumes:
    - solarrealms-db-data:/var/lib/mysql
```

**Pros:** Full control, lowest cost
**Cons:** Manual backups, no automatic failover

### Option B: Managed MySQL Services

| Provider | Service | Minimum Cost | Backup | HA Option |
|----------|---------|--------------|--------|-----------|
| DigitalOcean | Managed MySQL | $15/mo | Automatic | Yes (+$) |
| Linode | Managed MySQL | $15/mo | Automatic | Yes (+$) |
| AWS | RDS MySQL | $15/mo | Automatic | Multi-AZ |
| Google Cloud | Cloud SQL | $10/mo | Automatic | Yes (+$) |
| PlanetScale | Serverless MySQL | $0 (free tier) | Automatic | Included |

### Option C: PlanetScale (Recommended for Simplicity)

```bash
# Free tier includes:
# - 5GB storage
# - 1 billion row reads/mo
# - 10 million row writes/mo
# - Automatic backups
# - Branching for development

pscale database create solarrealms --region us-east
pscale connect solarrealms main --port 3306
```

**Note:** PlanetScale doesn't support foreign keys, which would require schema modifications.

---

## Security Considerations

### Critical Before Production

| Item | Status | Action Required |
|------|--------|-----------------|
| SQL Injection | ⚠️ Vulnerable | Migrate to PDO prepared statements |
| Password Hashing | ⚠️ MD5 | Implement Argon2id (code exists) |
| XSS Prevention | ⚠️ Partial | Standardize input sanitization |
| CSRF Protection | ⚠️ Missing | Implement SessionManager CSRF tokens |
| SSL/TLS | ❌ Not configured | Add reverse proxy with SSL |

### Deployment Security Checklist

```bash
# 1. Environment variables (never commit secrets)
cp .env.example .env
# Generate strong passwords:
openssl rand -base64 32  # DB_PASSWORD
openssl rand -base64 32  # DB_ROOT_PASSWORD

# 2. Firewall configuration
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 3306/tcp   # Don't expose MySQL externally
ufw enable

# 3. SSL Certificate
certbot certonly --standalone -d solarrealms.yourdomain.com

# 4. Security headers (add to nginx/apache)
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Content-Security-Policy "default-src 'self'" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### Rate Limiting

```nginx
# nginx.conf
http {
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=game:10m rate=30r/s;

    server {
        location /login.php {
            limit_req zone=login burst=3 nodelay;
        }

        location /game/ {
            limit_req zone=game burst=50;
        }
    }
}
```

---

## Cost Comparison

### Monthly Costs by Scale

| Users | Docker Compose | VPS | PaaS | Kubernetes |
|-------|----------------|-----|------|------------|
| < 100 | $5-12 | $5-12 | $7-15 | Overkill |
| 100-500 | $12-24 | $12-24 | $15-35 | $40-80 |
| 500-2000 | $24-48 | $24-48 | $35-75 | $80-150 |
| 2000+ | $48+ | $48+ | $75+ | $150+ |

### Breakdown (500 concurrent users)

| Component | Docker (VPS) | Kubernetes |
|-----------|--------------|------------|
| Compute | $24 (4GB VPS) | $48 (3 nodes) |
| Database | Included | $15 (managed) |
| Load Balancer | N/A | $10 |
| SSL | Free (Let's Encrypt) | Free |
| Backups | $2-5 | Included |
| **Total** | **~$30/mo** | **~$75/mo** |

---

## Recommendations

### For Development & Testing
**Use:** Docker Compose locally
```bash
docker-compose up -d
# Access at http://localhost:8080
```

### For Small Communities (< 200 players)
**Use:** Docker Compose on affordable VPS

| Provider | Recommended Plan | Cost |
|----------|------------------|------|
| Hetzner | CX21 (4GB RAM, 2 vCPU) | €4.50/mo |
| Vultr | 2GB RAM, 1 vCPU | $12/mo |
| DigitalOcean | Basic Droplet (2GB) | $12/mo |

### For Medium Communities (200-1000 players)
**Use:** Larger VPS or PaaS with managed database

| Setup | Components | Cost |
|-------|------------|------|
| VPS + Managed DB | 4GB VPS + DigitalOcean Managed MySQL | ~$30/mo |
| Railway | Web + Database | ~$20/mo |

### For Large Communities (1000+ players)
**Use:** Kubernetes or high-availability VPS cluster

Consider:
- Multiple game server replicas
- Read replicas for database
- CDN for static assets
- Redis for session management

---

## Pre-Deployment Checklist

### Phase 1: Security (Required)
- [ ] Fix SQL injection vulnerabilities (use new PDO Database class)
- [ ] Implement Argon2id password hashing
- [ ] Add CSRF tokens to all forms
- [ ] Sanitize all user inputs
- [ ] Configure secure session settings

### Phase 2: Infrastructure
- [ ] Set up production environment variables
- [ ] Configure SSL/TLS certificates
- [ ] Set up database backups
- [ ] Configure firewall rules
- [ ] Set up monitoring (uptime, errors)

### Phase 3: Deployment
- [ ] Build and test Docker image
- [ ] Run database migrations
- [ ] Deploy to staging environment
- [ ] Perform load testing
- [ ] Deploy to production
- [ ] Verify health checks

### Phase 4: Operations
- [ ] Set up log aggregation
- [ ] Configure alerting
- [ ] Document runbooks
- [ ] Create backup/restore procedures
- [ ] Plan for scaling

---

## Quick Start Commands

### Docker Compose (Fastest)
```bash
git clone https://github.com/ArchitectVS7/x-imperium.git
cd x-imperium
cp .env.example .env
# Edit .env with secure passwords
docker-compose up -d --build
echo "Access at http://localhost:8080"
```

### Production with SSL (Recommended)
```bash
# On VPS with Docker installed
git clone https://github.com/ArchitectVS7/x-imperium.git
cd x-imperium
cp .env.example .env
nano .env  # Set production passwords

# Start services
docker-compose up -d --build

# Set up nginx reverse proxy with SSL
apt install nginx certbot python3-certbot-nginx
# Configure nginx and obtain certificate
certbot --nginx -d yourdomain.com
```

---

## Summary

| Deployment Option | Best For | Complexity | Cost | Scalability |
|-------------------|----------|------------|------|-------------|
| **Docker Compose** | Development, small prod | ⭐ | $ | Limited |
| **Traditional VPS** | Simple management | ⭐ | $ | Limited |
| **PaaS (Railway/Render)** | Quick deployment | ⭐⭐ | $$ | Auto |
| **Kubernetes** | Large scale, HA | ⭐⭐⭐⭐ | $$$ | Excellent |

**Primary Recommendation:** Start with Docker Compose on an affordable VPS (Hetzner/Vultr/DigitalOcean). This provides the best balance of simplicity, cost, and control. Scale to managed services or Kubernetes only when needed.

**Critical Reminder:** Address the security vulnerabilities documented in `MODERNIZATION_PLAN.md` before any production deployment.

---

*Document prepared for x-imperium deployment planning*

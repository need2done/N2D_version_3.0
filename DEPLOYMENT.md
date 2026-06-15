# Need2Done — AWS EC2 Pre-Prod Deployment Guide

**Domain:** `https://need2done.in`  
**Server:** AWS EC2 Ubuntu 22.04  
**Webhook:** `https://need2done.in/webhook` | Token: `gramiogo_verify_123`

---

## What Was Changed in the Code

| File | What Changed |
|---|---|
| `.env` | All ngrok URLs → `https://need2done.in` |
| `tracking-app/lib/tracking_service.dart` | Ngrok URL → `https://need2done.in/api/tracking/update` |
| `scripts/start_bot.sh` | **NEW** — Starts Python bot with nohup |
| `scripts/start_backend.sh` | **NEW** — Starts Node.js backend with nohup |
| `scripts/start_dashboard.sh` | **NEW** — Builds Vite admin dashboard |
| `scripts/start_all.sh` | **NEW** — Starts all services in order |
| `scripts/stop_all.sh` | **NEW** — Gracefully stops all services |
| `scripts/status.sh` | **NEW** — Shows status of all services |
| `nginx/need2done.conf` | **NEW** — Full Nginx reverse proxy config |

---

## Architecture on EC2

```
Internet
    │
    ▼
Nginx :443 (need2done.in)
    ├── /webhook      → Node.js :5000 → Python Bot :8000
    ├── /api/*        → Node.js :5000
    ├── /track/*      → Node.js :5000
    ├── /admin        → Static Files (admin-dashboard/dist)
    └── /             → Static Files (website/)

MySQL :3306 (localhost only — NOT exposed to internet)
```

---

## STEP 1 — EC2 Security Groups (AWS Console)

> Do this BEFORE connecting to the server.

In AWS Console → EC2 → Security Groups → Inbound Rules, add:

| Type | Port | Source |
|---|---|---|
| SSH | 22 | Your IP only |
| HTTP | 80 | 0.0.0.0/0 |
| HTTPS | 443 | 0.0.0.0/0 |

> ⚠️ Do NOT open ports 5000 or 8000 — they are internal only (Nginx proxies to them).

---

## STEP 2 — Connect & Update Server

```bash
# Connect via SSH
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Update system packages
sudo apt update && sudo apt upgrade -y
```

---

## STEP 3 — Install Dependencies

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3, pip, venv
sudo apt install -y python3 python3-pip python3-venv

# Install MySQL
sudo apt install -y mysql-server

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx

# Verify all installations
node --version     # should be v20.x
python3 --version  # should be 3.10+
mysql --version
nginx -v
```

---

## STEP 4 — Setup MySQL Database

```bash
# Start MySQL and enable auto-start on reboot
sudo systemctl start mysql
sudo systemctl enable mysql

# Run MySQL security hardening wizard
sudo mysql_secure_installation

# Create the N2D database and a dedicated user
sudo mysql -u root -p << 'EOF'
CREATE DATABASE IF NOT EXISTS N2D CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'n2d_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON N2D.* TO 'n2d_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# Import your database schema + data
# (Ensure schema_live_full.sql is on the EC2 already)
mysql -u n2d_user -p N2D < /home/ubuntu/Need2Done/docs/AWS/schema_live_full.sql
```

> ⚠️ Replace `YOUR_STRONG_PASSWORD` with the same value you set in `.env` → `DB_PASSWORD`

---

## STEP 5 — Upload Code to EC2

```bash
# Option A: Clone from GitHub (recommended)
cd /home/ubuntu
git clone https://github.com/need2done/N2D.git Need2Done

# Option B: SCP upload from your Windows machine
# Run this in Windows PowerShell on your LOCAL machine:
# scp -i your-key.pem -r "C:\Users\chakr\.gemini\antigravity\scratch\Need2Done" ubuntu@YOUR_EC2_IP:/home/ubuntu/
```

---

## STEP 6 — Configure .env on EC2

```bash
cd /home/ubuntu/Need2Done

# Open .env for editing
nano .env

# IMPORTANT — Change these before starting services:
#   DB_PASSWORD=YOUR_MYSQL_PASSWORD   ← same as Step 4
#   JWT_SECRET=<generate below>

# Generate a strong JWT secret (copy the output into .env)
openssl rand -hex 32
```

---

## STEP 7 — Setup Python Bot (Virtual Environment)

```bash
cd /home/ubuntu/Need2Done/N2D_whatsapp_bot

# Create Python virtual environment
python3 -m venv venv_n2d

# Activate venv and install all Python dependencies
source venv_n2d/bin/activate
pip install -r requirements.txt
deactivate

echo "✅ Python bot environment ready"
```

---

## STEP 8 — Setup Node.js Backend

```bash
cd /home/ubuntu/Need2Done/backend

# Install all Node.js dependencies
npm install

echo "✅ Node.js dependencies installed"
```

---

## STEP 9 — Build Admin Dashboard

```bash
cd /home/ubuntu/Need2Done/admin-dashboard

# Install dashboard dependencies
npm install

# Build Vite production bundle
# NOTE: VITE_API_URL from .env is baked in at this step
npm run build

echo "✅ Admin dashboard built — files in admin-dashboard/dist/"
```

---

## STEP 10 — Make Scripts Executable

```bash
cd /home/ubuntu/Need2Done

# Grant execute permission to all service scripts
chmod +x scripts/*.sh

echo "✅ Scripts are executable"
```

---

## STEP 11 — Setup Nginx

```bash
# Copy the Nginx config from project to Nginx directory
sudo cp /home/ubuntu/Need2Done/nginx/need2done.conf \
        /etc/nginx/sites-available/need2done

# Enable the site by creating a symlink
sudo ln -s /etc/nginx/sites-available/need2done \
            /etc/nginx/sites-enabled/need2done

# Remove the default Nginx placeholder page
sudo rm -f /etc/nginx/sites-enabled/default

# Test the config for syntax errors
sudo nginx -t

# If test passes (OK), reload Nginx to apply config
sudo systemctl reload nginx

# Enable Nginx to auto-start on reboot
sudo systemctl enable nginx
```

---

## STEP 12 — Get SSL Certificate (HTTPS)

> ⚠️ Your domain DNS **must be pointing to your EC2 IP** before running this step!

```bash
# Set your DNS A records first (in your domain registrar / Route53):
#   need2done.in       → A record → YOUR_EC2_PUBLIC_IP
#   www.need2done.in   → A record → YOUR_EC2_PUBLIC_IP

# DNS changes can take 5–30 minutes to propagate.
# Verify with: nslookup need2done.in

# Once DNS is live, get the SSL certificate
sudo certbot --nginx -d need2done.in -d www.need2done.in

# Certbot will automatically update the Nginx config for HTTPS.
# Test that auto-renewal works:
sudo certbot renew --dry-run
```

---

## STEP 13 — Start All Services

```bash
cd /home/ubuntu/Need2Done

# Start WhatsApp Bot (port 8000) + Node.js Backend (port 5000)
./scripts/start_all.sh

# Verify everything is running
./scripts/status.sh
```

Expected output:
```
✅ WhatsApp Bot started | PID: XXXX
✅ Node.js Backend started | PID: XXXX
```

---

## STEP 14 — Register Webhook with Meta

1. Go to **[Meta Developer Console](https://developers.facebook.com)** → Your App → WhatsApp → Configuration
2. Under **Webhook** section click **Edit**:
   - **Callback URL:** `https://need2done.in/webhook`
   - **Verify Token:** `gramiogo_verify_123`
3. Click **Verify and Save**
4. Under **Webhook Fields**, subscribe to: ✅ `messages`, ✅ `message_status`

> If verification fails → check logs: `tail -f /home/ubuntu/Need2Done/logs/backend.log`

---

## STEP 15 — Test Everything

```bash
# 1. Test API health endpoint
curl https://need2done.in/api/health
# Expected: { "status": "OK", ... }

# 2. Simulate Meta webhook verification
curl "https://need2done.in/webhook?hub.mode=subscribe&hub.verify_token=gramiogo_verify_123&hub.challenge=TEST123"
# Expected response: TEST123

# 3. Check all service status
./scripts/status.sh

# 4. Watch live logs (open 2 terminal tabs)
tail -f /home/ubuntu/Need2Done/logs/bot.log
tail -f /home/ubuntu/Need2Done/logs/backend.log
```

---

## Daily Operations — Quick Reference

```bash
# Start all services
./scripts/start_all.sh

# Stop all services
./scripts/stop_all.sh

# Check running status + ports
./scripts/status.sh

# Watch live logs
tail -f logs/bot.log
tail -f logs/backend.log

# Pull latest code + restart
./scripts/stop_all.sh && git pull && ./scripts/start_all.sh

# Rebuild admin dashboard after UI changes
./scripts/start_dashboard.sh

# Restart only the bot
kill $(cat logs/bot.pid) && ./scripts/start_bot.sh

# Restart only the backend
kill $(cat logs/backend.pid) && ./scripts/start_backend.sh
```

---

## Auto-Start on EC2 Reboot (Recommended)

```bash
# Edit crontab
crontab -e

# Add this line at the bottom to auto-start on every reboot:
@reboot sleep 15 && /home/ubuntu/Need2Done/scripts/start_all.sh >> /home/ubuntu/Need2Done/logs/startup.log 2>&1
```

> The `sleep 15` gives MySQL time to fully start before the app services launch.

---

## Troubleshooting

| Problem | Check |
|---|---|
| Webhook verification fails | `tail -f logs/backend.log` — check verify token matches |
| Bot not responding to WhatsApp | `tail -f logs/bot.log` — check DB connection |
| API returns 502 Bad Gateway | Backend not running — `./scripts/start_backend.sh` |
| HTTPS not working | `sudo certbot --nginx` — check DNS is pointing to EC2 |
| Dashboard shows blank page | Rebuild: `./scripts/start_dashboard.sh` |
| MySQL connection refused | `sudo systemctl start mysql` |
